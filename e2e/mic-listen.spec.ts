import { expect, test } from '@playwright/test';

/**
 * Spiel-mit-Modus mit simuliertem Mikrofon: e2e/fixtures/open-strings.wav spielt E2 A2 D3 G3 H3 E4 und zurück.
 * Prüft Akzeptanztest 11: die App erkennt die gespielten Töne tatsächlich und zählt Treffer.
 */
test('Spiel mit erkennt die gespielten leeren Saiten (Test 11)', async ({ page }) => {
  await page.goto('/ueben/uebung/ex-leere-saiten/spiel-mit');
  await expect(page.getByText(/Nächster Ton: E2/)).toBeVisible();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByText(/Richtig! E2/)).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/([4-9]|1[0-2]) richtig/)).toBeVisible({ timeout: 25000 });
});
