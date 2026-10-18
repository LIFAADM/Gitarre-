import { expect, test } from '@playwright/test';

/**
 * Stimmgerät mit simuliertem Mikrofon (Chromium-Fake-Capture spielt e2e/fixtures/a2-110hz.wav ein).
 * Prüft Akzeptanztest 1: gemessene Tonhöhe und Abweichung werden angezeigt – aus echter Signalanalyse.
 */
test('Stimmgerät erkennt A2 = 110 Hz aus dem Mikrofonsignal (Test 1)', async ({ page }) => {
  await page.goto('/werkzeuge/stimmgeraet');
  await page.getByRole('button', { name: /Mikrofon starten/ }).click();
  await expect(page.getByText('A2', { exact: true }).first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/richtig gestimmt/).first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/11\d,\d Hz|109,\d Hz/).first()).toBeVisible();
});
