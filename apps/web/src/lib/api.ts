import { PUBLIC_API_URL } from '$app/env/public';
import { supabase } from './supabase';

const API_URL = (PUBLIC_API_URL || 'http://localhost:3001') + '/api';

export class ApiError extends Error {
	constructor(public status: number, message: string) {
		super(message);
	}
}

/** Llama al backend Express adjuntando el JWT de Supabase Auth. */
export async function api<T = unknown>(
	path: string,
	options: { method?: string; body?: unknown; query?: Record<string, string | undefined> } = {}
): Promise<T> {
	const { data } = await supabase.auth.getSession();
	const token = data.session?.access_token;
	if (!token) throw new ApiError(401, 'Sesión no iniciada');

	const qs = options.query
		? '?' + new URLSearchParams(Object.entries(options.query).filter(([, v]) => v) as [string, string][]).toString()
		: '';

	const res = await fetch(`${API_URL}${path}${qs}`, {
		method: options.method || 'GET',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json'
		},
		body: options.body !== undefined ? JSON.stringify(options.body) : undefined
	});

	if (res.status === 204) return undefined as T;
	const payload = await res.json().catch(() => ({}));
	if (!res.ok) throw new ApiError(res.status, payload.error || `Error ${res.status}`);
	return payload as T;
}
