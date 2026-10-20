import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

/** Konfiguration für `npm run bench:detection` (Erkennungs-Benchmark in Node, ohne jsdom). */
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'node',
    include: ['bench/**/*.bench.ts'],
    testTimeout: 10 * 60 * 1000,
    hookTimeout: 10 * 60 * 1000,
    reporters: ['verbose'],
    restoreMocks: true,
  },
});
