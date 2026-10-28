import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	// 5173-5179 は共有Tailscaleゲートウェイ(gateway skill)がfarmnote-labs専用に
	// 決め打ちしていて、その範囲内のポートは /api/* をfarmnote-labsのRailsバックエンドへ
	// 誤転送する(2026-08-24 発覚)。boqiteはSvelteKit fullstackでこの範囲外の固定ポートが必要。
	server: { port: 5189, strictPort: true },
	preview: { port: 5189, strictPort: true },
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
			// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
			// See https://svelte.dev/docs/kit/adapters for more information about adapters.
			adapter: adapter()
		})
	]
});
