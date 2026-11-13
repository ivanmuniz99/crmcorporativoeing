import adapterVercel from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// En Vercel (Linux) se genera la función serverless. En local (p. ej. Windows
// sin privilegios de symlink) se omite el adapter y `vite build` solo verifica
// la compilación; `vite dev` es el flujo de desarrollo local.
const procEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const useAdapter = !!procEnv.VERCEL || procEnv.BUILD_TARGET === 'vercel';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
				// Los formularios usan <label> + input adyacente (patrón .field);
				// se omite la regla que exige asociación explícita por id.
				warningFilter: (w: { code: string }) => w.code !== 'a11y_label_has_associated_control'
			},
			...(useAdapter ? { adapter: adapterVercel() } : {})
		})
	]
});
