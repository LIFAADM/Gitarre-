import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const fixture = (name: string): string => fileURLToPath(new URL(`./e2e/fixtures/${name}`, import.meta.url));
const chromiumPath = process.env.PW_CHROMIUM_PATH;
const micArgs = (file: string): string[] => ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${fixture(file)}`, '--autoplay-policy=no-user-gesture-required'];

/**
 * End-to-End-Smoke-Tests gegen den Produktions-Build (vite preview).
 * Der vorinstallierte Chromium-Build wird explizit über executablePath genutzt.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    launchOptions: chromiumPath ? { executablePath: chromiumPath } : {},
  },
  projects: [
    { name: 'mobile-chromium', testIgnore: /mic-.*\.spec\.ts/, use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
    {
      name: 'mic-tuner',
      testMatch: /mic-tuner\.spec\.ts/,
      use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium', permissions: ['microphone'], launchOptions: { ...(chromiumPath ? { executablePath: chromiumPath } : {}), args: micArgs('a2-110hz.wav') } },
    },
  ],
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
