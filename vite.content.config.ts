import { defineConfig } from 'vite';
import { resolve } from 'node:path';

/**
 * Separate build for the content script.
 *
 * Chrome loads content scripts as classic scripts (not ES modules), so the
 * output must be a self-contained IIFE with no top-level `import` statements.
 * All dependencies are bundled inline; no chunk splitting.
 */
export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'dist/assets',
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(__dirname, 'src/content/index.ts'),
      output: {
        format: 'iife',
        entryFileNames: 'content.js',
        name: 'FBContent',
        inlineDynamicImports: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
