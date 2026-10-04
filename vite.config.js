import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const r = (p) => fileURLToPath(new URL(p, import.meta.url));

// Trailer modules reused by the game live in src/trailer (copied from the trailer project) and are imported via @trailer.
export default defineConfig({
  // Relative asset paths so the build works under any sub-path (e.g. GitHub Pages /Rat_Wedding_Night/).
  base: './',
  resolve: {
    alias: [
      { find: /^three$/, replacement: r('./node_modules/three/build/three.module.js') },
      { find: /^three\/addons\/(.*)$/, replacement: r('./node_modules/three/examples/jsm/') + '$1' },
      { find: '@trailer', replacement: r('./src/trailer') },
    ],
  },
  server: { port: 5173 },
  build: { target: 'es2022', chunkSizeWarningLimit: 2000 },
});
