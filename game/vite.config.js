import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const r = (p) => fileURLToPath(new URL(p, import.meta.url));

// The trailer modules in ../web are imported read-only through @trailer.
// three is pinned to this package's copy so the trailer files and the game share one instance.
export default defineConfig({
  // Relative asset paths so the build works under any sub-path (e.g. GitHub Pages /Rat_Wedding_Night/).
  base: './',
  resolve: {
    alias: [
      { find: /^three$/, replacement: r('./node_modules/three/build/three.module.js') },
      { find: /^three\/addons\/(.*)$/, replacement: r('./node_modules/three/examples/jsm/') + '$1' },
      { find: '@trailer', replacement: r('../web') },
      { find: '@sfx', replacement: r('../sfx') },
    ],
  },
  server: { port: 5173, fs: { allow: ['..'] } },
  build: { target: 'es2022', chunkSizeWarningLimit: 2000 },
});
