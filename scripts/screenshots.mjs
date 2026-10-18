// Erzeugt iPhone-Screenshots der wichtigsten Seiten aus dem Produktions-Build (für Doku/Review).
// Aufruf: npm run build && PW_CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/screenshots.mjs [ausgabeordner]
import { chromium, devices } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'screenshots';
mkdirSync(out, { recursive: true });
const port = 4174;
const server = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 3000));
try {
  const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
  const context = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 2 });
  const page = await context.newPage();
  const shots = [
    ['/', 'dashboard'],
    ['/songs', 'songs'],
    ['/songs/happy-birthday', 'player'],
    ['/lernen', 'lessons'],
    ['/lernen/k2-l6-erste-toene', 'lesson'],
    ['/werkzeuge/stimmgeraet', 'tuner'],
    ['/werkzeuge/griffbrett', 'fretboard'],
    ['/werkzeuge/metronom', 'metronome'],
    ['/ueben', 'practice'],
    ['/songs/import', 'import'],
    ['/ueben/uebung/ex-leere-saiten/spiel-mit', 'listen'],
    ['/werkzeuge/editor', 'editor'],
    ['/fortschritt', 'progress'],
    ['/einstellungen', 'settings'],
    ['/lernen/tabs-lesen', 'tabreading'],
  ];
  for (const [path, name] of shots) {
    await page.goto(`http://127.0.0.1:${port}${path}`);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${out}/${name}.png`, fullPage: false });
    console.info('✓', name);
  }
  await page.goto(`http://127.0.0.1:${port}/songs/happy-birthday`);
  await page.waitForTimeout(800);
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Nächste Note' }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/player-step.png`, fullPage: true });
  console.info('✓ player-step');
  await browser.close();
} finally {
  server.kill();
}
