<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '#lib/api';
	import type { Client } from '#lib/types';
	import 'leaflet/dist/leaflet.css';
	import type * as Leaflet from 'leaflet';

	// Leaflet requiere `window`: se importa dinámicamente en onMount para no romper el SSR.
	let leaflet: typeof Leaflet;

	let clients = $state<Client[]>([]);
	let loading = $state(true);
	let search = $state('');
	let selected = $state<Client | null>(null);
	let draftLat = $state('');
	let draftLng = $state('');
	let saving = $state(false);
	let locating = $state(false);
	let error = $state('');
	let notice = $state('');

	let mapEl: HTMLDivElement;
	let map: Leaflet.Map | undefined;
	let layer: Leaflet.LayerGroup | undefined;
	let tempMarker: Leaflet.Marker | null = null;

	const filtered = $derived(
		search
			? clients.filter((c) =>
					`${c.name} ${c.legal_name ?? ''} ${c.address ?? ''} ${c.tax_id ?? ''}`
						.toLowerCase()
						.includes(search.toLowerCase())
				)
			: clients
	);

	const locatedCount = $derived(clients.filter(hasCoords).length);

	function hasCoords(c: Client | null | undefined): c is Client {
		return !!c && c.lat != null && c.lng != null && !Number.isNaN(Number(c.lat));
	}

	function esc(s: string): string {
		return s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));
	}

	function pinIcon(color: string): Leaflet.DivIcon {
		return leaflet.divIcon({
			className: 'client-pin',
			html: `<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>`,
			iconSize: [22, 22],
			iconAnchor: [11, 21],
			popupAnchor: [0, -12]
		});
	}

	async function load() {
		loading = true;
		clients = await api<Client[]>('/clients');
		loading = false;
		renderMarkers();
	}

	function renderMarkers() {
		if (!layer) return;
		layer.clearLayers();
		for (const c of clients) {
			if (!hasCoords(c)) continue;
			const lat = Number(c.lat);
			const lng = Number(c.lng);
			const popup =
				`<strong>${esc(c.name)}</strong><br>` +
				`${esc(c.address ?? 'Sin dirección')}${c.address ? '<br>' : ''}` +
				`<span style="color:#64748b;font-size:.75rem">${lat.toFixed(5)}, ${lng.toFixed(5)}</span><br>` +
				`<a href="/clients/${c.id}">Ver cliente →</a>`;
			leaflet.marker([lat, lng], { icon: pinIcon('#e8b13c') })
				.addTo(layer)
				.bindPopup(popup)
				.on('click', () => select(c));
		}
	}

	function clearTemp() {
		if (tempMarker && map) {
			map.removeLayer(tempMarker);
			tempMarker = null;
		}
	}

	function placeTemp(lat: number, lng: number) {
		if (!map) return;
		clearTemp();
		tempMarker = leaflet.marker([lat, lng], { icon: pinIcon('#dc2626') }).addTo(map);
		tempMarker.bindPopup(`<strong>Ubicación propuesta</strong><br>${lat.toFixed(5)}, ${lng.toFixed(5)}`).openPopup();
	}

	function syncTemp() {
		const lat = Number(draftLat);
		const lng = Number(draftLng);
		if (selected && draftLat !== '' && draftLng !== '' && !Number.isNaN(lat) && !Number.isNaN(lng)) {
			placeTemp(lat, lng);
		} else {
			clearTemp();
		}
	}

	function select(c: Client) {
		selected = c;
		error = '';
		notice = '';
		draftLat = c.lat != null ? String(c.lat) : '';
		draftLng = c.lng != null ? String(c.lng) : '';
		clearTemp();
		if (hasCoords(c)) {
			map?.flyTo([Number(c.lat), Number(c.lng)], Math.max(map.getZoom(), 14));
		}
	}

	function onMapClick(e: Leaflet.LeafletMouseEvent) {
		if (!selected) return;
		const t = e.originalEvent?.target as HTMLElement | null;
		if (t?.closest?.('.leaflet-marker-icon, .leaflet-popup')) return;
		draftLat = e.latlng.lat.toFixed(6);
		draftLng = e.latlng.lng.toFixed(6);
		syncTemp();
		notice = 'Coordenadas capturadas del mapa. Pulsa "Guardar ubicación" para confirmar.';
	}

	async function geocode() {
		if (!selected?.address) return;
		locating = true;
		error = '';
		notice = '';
		try {
			const url =
				'https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=es&q=' +
				encodeURIComponent(`${selected.name} ${selected.address}`);
			const res = await fetch(url);
			const results = (await res.json()) as { lat: string; lon: string }[];
			if (!results.length) {
				error = 'No se encontró la dirección en OpenStreetMap. Coloca el pin manualmente en el mapa.';
				return;
			}
			draftLat = Number(results[0].lat).toFixed(6);
			draftLng = Number(results[0].lon).toFixed(6);
			syncTemp();
			map?.flyTo([Number(draftLat), Number(draftLng)], Math.max(map?.getZoom() ?? 12, 14));
			notice = 'Dirección localizada. Verifica el pin y guarda.';
		} catch {
			error = 'Error al consultar el servicio de geocodificación.';
		} finally {
			locating = false;
		}
	}

	async function saveLocation() {
		if (!selected) return;
		const lat = Number(draftLat);
		const lng = Number(draftLng);
		if (draftLat === '' || draftLng === '' || Number.isNaN(lat) || Number.isNaN(lng)) {
			error = 'Captura o coloca coordenadas válidas (lat y lng).';
			return;
		}
		if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
			error = 'Rango inválido: latitud debe estar entre -90 y 90, longitud entre -180 y 180.';
			return;
		}
		saving = true;
		error = '';
		try {
			const updated = await api<Client>(`/clients/${selected.id}`, {
				method: 'PATCH',
				body: { lat, lng }
			});
			clients = clients.map((c) => (c.id === updated.id ? { ...c, ...updated } : c));
			selected = { ...selected, ...updated };
			clearTemp();
			renderMarkers();
			notice = `Ubicación guardada para ${updated.name}.`;
		} catch (e: any) {
			error = e.message;
		} finally {
			saving = false;
		}
	}

	async function clearLocation() {
		if (!selected || !confirm(`¿Quitar la ubicación de "${selected.name}"?`)) return;
		saving = true;
		error = '';
		try {
			const updated = await api<Client>(`/clients/${selected.id}`, {
				method: 'PATCH',
				body: { lat: null, lng: null }
			});
			clients = clients.map((c) => (c.id === updated.id ? { ...c, ...updated } : c));
			selected = { ...selected, ...updated };
			draftLat = '';
			draftLng = '';
			clearTemp();
			renderMarkers();
			notice = `Ubicación eliminada para ${updated.name}.`;
		} catch (e: any) {
			error = e.message;
		} finally {
			saving = false;
		}
	}

	onMount(() => {
		let destroyed = false;
		(async () => {
			leaflet = await import('leaflet');
			if (destroyed) return;
			map = leaflet.map(mapEl).setView([23.6345, -102.5528], 5);
			leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
				maxZoom: 19
			}).addTo(map);
			layer = leaflet.layerGroup().addTo(map);
			map.on('click', onMapClick);
			load();
			setTimeout(() => map?.invalidateSize(), 150);
		})();
		return () => {
			destroyed = true;
			map?.remove();
		};
	});
</script>

<div class="toolbar">
	<h1 style="margin:0">Mapa de oficinas</h1>
	<input placeholder="Buscar cliente…" bind:value={search} style="flex:1;min-width:200px" />
	<span class="muted">{locatedCount} de {clients.length} ubicados</span>
</div>

<div class="map-layout">
	<aside class="map-panel">
		<div class="map-panel-head">
			<h2>Clientes</h2>
			<p class="muted" style="margin:.3rem 0 0;font-size:.78rem">
				Selecciona un cliente y haz clic en el mapa para asignar su oficina.
			</p>
		</div>
		<div class="map-client-list">
			{#each filtered as c (c.id)}
				<button
					class="map-client-item"
					class:selected={selected?.id === c.id}
					onclick={() => select(c)}
				>
					<span class="pin-dot" class:located={hasCoords(c)} class:unlocated={!hasCoords(c)}></span>
					<span class="cli-name">{c.name}</span>
					<span class="cli-sub">{hasCoords(c) ? 'ubicado' : 'sin ubicación'}</span>
				</button>
			{:else}
				<p class="empty">{loading ? 'Cargando…' : 'Sin clientes.'}</p>
			{/each}
		</div>

		{#if selected}
			<div class="map-detail">
				<strong>{selected.name}</strong>
				<span class="muted" style="font-size:.78rem">{selected.address ?? 'Sin dirección registrada'}</span>
				{#if selected.address}
					<button class="btn sm secondary" onclick={geocode} disabled={locating}>
						{locating ? 'Buscando…' : 'Usar dirección'}
					</button>
				{/if}
				<div class="form-grid" style="grid-template-columns:1fr 1fr">
					<div class="field" style="margin-bottom:0">
						<label>Latitud</label>
						<input type="number" step="any" bind:value={draftLat} oninput={syncTemp} />
					</div>
					<div class="field" style="margin-bottom:0">
						<label>Longitud</label>
						<input type="number" step="any" bind:value={draftLng} oninput={syncTemp} />
					</div>
				</div>
				{#if notice}<div class="ok-msg" style="margin:0;font-size:.78rem">{notice}</div>{/if}
				{#if error}<div class="error-msg" style="margin:0;font-size:.78rem">{error}</div>{/if}
				<div style="display:flex;gap:.4rem;flex-wrap:wrap">
					<button class="btn sm gold" onclick={saveLocation} disabled={saving || !draftLat || !draftLng}>
						{saving ? 'Guardando…' : 'Guardar ubicación'}
					</button>
					{#if hasCoords(selected)}
						<button class="btn sm secondary" onclick={clearLocation} disabled={saving}>Quitar</button>
					{/if}
					<a class="btn sm secondary" href="/clients/{selected.id}" style="margin-left:auto">Ver ficha</a>
				</div>
			</div>
		{/if}
	</aside>

	<div class="map-wrap">
		<div class="client-map" bind:this={mapEl}></div>
		{#if selected}
			<div class="locate-hint">Haz clic en el mapa para colocar el pin de {selected.name}</div>
		{/if}
	</div>
</div>
