import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  resolve: { dedupe: ['react', 'react-dom'] },
  base: './',
  experimental: {
    renderBuiltUrl(filename, { hostType }) {
      if (hostType === 'js') return { runtime: `new URL(${JSON.stringify(filename)}, document.currentScript?.src || document.baseURI).href` };
      return { relative: true };
    },
  },
  plugins: [{
    name: 'external-widget-fonts',
    enforce: 'pre',
    transform(code, id) {
      // Only the hosted widget splits fonts out; the standalone SDK stays portable.
      if (!id.replaceAll('\\', '/').endsWith('/engine/dyslexiaFont.js')) return null;
      return { code: code.replaceAll('.woff2?url', '.woff2?url&no-inline'), map: null };
    },
  }],
  build: {
    outDir: fileURLToPath(new URL('../dist', import.meta.url)),
    emptyOutDir: false,
    lib: {
      entry: fileURLToPath(new URL('./index.jsx', import.meta.url)),
      name: 'AccessEaseTeam', formats: ['iife'], fileName: () => 'team-features.js',
    },
    rollupOptions: { output: { inlineDynamicImports: true, assetFileNames: 'assets/[name]-[hash][extname]' } },
  },
});
