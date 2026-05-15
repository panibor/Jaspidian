import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';

// Chrome extension popups can fail to load when Vite adds crossorigin=""
// to <script type="module"> and <link rel="modulepreload"> tags.
// Strip them from every HTML output file.
function stripCrossoriginPlugin() {
  return {
    name: 'strip-crossorigin',
    transformIndexHtml(html: string) {
      return html.replace(/\s*crossorigin\b(?:="[^"]*")?/gi, '');
    },
  };
}

function copyStaticPlugin() {
  return {
    name: 'copy-static',
    closeBundle() {
      const distDir = resolve(__dirname, 'dist');
      const assetsDir = resolve(__dirname, 'dist/assets');
      mkdirSync(assetsDir, { recursive: true });

      // manifest.json
      copyFileSync(resolve(__dirname, 'public/manifest.json'), resolve(distDir, 'manifest.json'));

      // icons (logo_*.png)
      const pubAssets = resolve(__dirname, 'public/assets');
      for (const file of readdirSync(pubAssets)) {
        copyFileSync(resolve(pubAssets, file), resolve(assetsDir, file));
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), stripCrossoriginPlugin(), copyStaticPlugin()],
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // content script built separately as IIFE (vite.content.config.ts)
        background: resolve(__dirname, 'src/background/index.ts'),
        popup: resolve(__dirname, 'popup.html'),
        options: resolve(__dirname, 'options.html'),
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name]-chunk.js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
