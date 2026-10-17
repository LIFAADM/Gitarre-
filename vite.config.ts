/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { alphaTab } from '@coderline/alphatab-vite';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

/**
 * GuitarCoach – Vite-Konfiguration
 *
 * - React + Tailwind v4
 * - alphaTab-Plugin (kopiert Bravura-Font + SoundFont, konfiguriert Worker)
 * - PWA (Workbox-Precache für Offline-Betrieb)
 * - Vitest (jsdom) für Unit-/Komponententests
 */
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    alphaTab(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'icons/*.svg', 'samples/*'],
      manifest: {
        id: '/',
        name: 'GuitarCoach – Gitarre lernen',
        short_name: 'GuitarCoach',
        description:
          'Persönliche Gitarren-Lernapp: Stimmgerät, Griffbrett, Tab-Player, Gitarrenschule und Songbibliothek – komplett offline.',
        lang: 'de',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#161618',
        theme_color: '#161618',
        categories: ['education', 'music'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,otf,json,webmanifest,gp,musicxml,gcjson}'],
        // Der GM-SoundFont von alphaTab (1,3 MB) wird in v1 nicht benötigt (eigener Gitarren-Synth).
        // Worker/Worklet und Notenschrift von alphaTab werden erst mit der Partitur-Ansicht benötigt (Import läuft im Hauptthread).
        globIgnores: ['**/soundfont/**', '**/*.map', '**/font/**', '**/alphaTab.worker*', '**/alphaTab.worklet*'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 1800,
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    restoreMocks: true,
  },
});
