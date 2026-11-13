import { writable } from 'svelte/store';
import type { Session } from '@supabase/supabase-js';
import { PUBLIC_API_URL } from '$app/env/public';
import { supabase } from './supabase';
import { api, ApiError } from './api';
import type { Profile } from './types';

const API_URL = (PUBLIC_API_URL || 'http://localhost:3001') + '/api';

interface AuthState {
	session: Session | null;
	profile: Profile | null;
	loading: boolean;
}

function createAuth() {
	const { subscribe, set, update } = writable<AuthState>({
		session: null,
		profile: null,
		loading: true
	});

	async function loadProfile(session: Session | null) {
		if (!session) {
			set({ session: null, profile: null, loading: false });
			return;
		}
		try {
			const { data } = await supabase
				.from('profiles')
				.select('*')
				.eq('id', session.user.id)
				.single();
			set({ session, profile: data as Profile | null, loading: false });
		} catch {
			set({ session, profile: null, loading: false });
		}
	}

	async function init() {
		const { data } = await supabase.auth.getSession();
		await loadProfile(data.session);
		supabase.auth.onAuthStateChange((_event, session) => {
			loadProfile(session);
		});
	}

	async function login(email: string, password: string) {
		const { error } = await supabase.auth.signInWithPassword({ email, password });
		if (error) throw error;
	}

	/** Registro público (sin sesión): el primer usuario queda como admin. */
	async function register(payload: { email: string; password: string; full_name: string }) {
		const res = await fetch(`${API_URL}/auth/register`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
		const data = await res.json().catch(() => ({}));
		if (!res.ok) throw new ApiError(res.status, data.error || `Error ${res.status}`);
		return data as { id: string; email: string; role: Profile['role'] };
	}

	async function logout() {
		await supabase.auth.signOut();
		set({ session: null, profile: null, loading: false });
	}

	/** Registra un usuario nuevo (solo admin) vía backend. */
	async function createUser(payload: {
		email: string;
		password: string;
		full_name: string;
		role: Profile['role'];
	}) {
		return api<{ id: string }>('/admin/users', { method: 'POST', body: payload });
	}

	return { subscribe, init, login, logout, register, createUser, loadProfile, update };
}

export const auth = createAuth();
