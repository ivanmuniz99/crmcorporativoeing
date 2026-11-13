export function money(value: number | null | undefined, currency = 'MXN'): string {
	return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(value ?? 0);
}

export function date(value: string | null | undefined): string {
	if (!value) return '—';
	return new Date(value).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function dateTime(value: string | null | undefined): string {
	if (!value) return '—';
	return new Date(value).toLocaleString('es-MX', {
		day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
	});
}
