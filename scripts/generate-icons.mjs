// Erzeugt PNG-Icons aus public/icons/icon.svg mit dem vorinstallierten Chromium (Playwright).
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const svg = readFileSync(resolve('public/icons/icon.svg'), 'utf8');
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const page = await browser.newPage();

async function render(size, file, { maskable = false } = {}) {
  await page.setViewportSize({ width: size, height: size });
  const inner = maskable ? Math.round(size * 0.8) : size;
  const offset = Math.round((size - inner) / 2);
  const html = `<!doctype html><html><body style="margin:0;background:${maskable ? '#161618' : 'transparent'};width:${size}px;height:${size}px;overflow:hidden">
    <div style="position:absolute;left:${offset}px;top:${offset}px;width:${inner}px;height:${inner}px">${svg.replace('<svg ', `<svg style="width:${inner}px;height:${inner}px" `)}</div></body></html>`;
  await page.setContent(html);
  const buffer = await page.screenshot({ type: 'png', omitBackground: !maskable, clip: { x: 0, y: 0, width: size, height: size } });
  writeFileSync(resolve('public/icons', file), buffer);
  console.info('✓', file);
}

await render(192, 'icon-192.png');
await render(512, 'icon-512.png');
await render(512, 'icon-maskable-512.png', { maskable: true });
await render(180, 'apple-touch-icon.png');
await browser.close();
