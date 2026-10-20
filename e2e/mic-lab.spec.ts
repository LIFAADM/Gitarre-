import { expect, test } from '@playwright/test';

/**
 * Kalibrierung und Erkennungs-Labor mit simuliertem Mikrofon (Chromium spielt e2e/fixtures/a2-110hz.wav in Schleife ein).
 * Der Dauerton ersetzt hier Stille und Anschlag – geprüft wird der Ablauf, nicht die Messwerte.
 */

test('Kalibrierung: drei Schritte, Speichern, danach zeigt Start das Stimmgerät', async ({ page }) => {
  await page.goto('/kalibrierung');
  await page.getByTestId('calibration-start').click();
  await expect(page.getByTestId('calibration-step')).toContainText('Schritt 1', { timeout: 15000 });
  // Schritt 1 (2 s Stille) läuft von selbst durch.
  await expect(page.getByTestId('calibration-step')).toContainText('Schritt 2', { timeout: 15000 });
  // Der Dauerton liefert keinen Anschlag über dem gemessenen „Rauschen“ → überspringen.
  await page.getByRole('button', { name: 'Schritt überspringen' }).click();
  await expect(page.getByTestId('calibration-step')).toContainText('Schritt 3');
  await page.getByRole('button', { name: 'Schritt überspringen' }).click();
  await expect(page.getByRole('heading', { name: 'Mikrofon eingerichtet' })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Grundrauschen')).toBeVisible();
  await page.getByTestId('calibration-save').click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Gitarre stimmen' })).toBeVisible();

  await page.goto('/profil');
  await expect(page.getByTestId('calibration-summary')).toContainText(/Rauschen -?\d+ dB/);
});

test('Erkennungs-Labor: Live-Tonhöhe A2, Zieltonprüfung und beschriftete Aufnahme', async ({ page }) => {
  await page.goto('/profil');
  await page.getByTestId('profile-lab').click();
  await expect(page).toHaveURL(/\/profil\/labor$/);
  await page.getByTestId('lab-preset').selectOption('leersaite-5');
  await page.getByTestId('lab-mic').click();
  await expect(page.getByTestId('lab-pitch')).toHaveText('A2', { timeout: 15000 });
  await expect(page.getByTestId('lab-targets')).toContainText('A2');
  await expect(page.getByTestId('lab-targets')).toContainText(/[5-9]\d %|100 %/, { timeout: 10000 });

  await page.getByTestId('lab-record').click();
  await expect(page.getByTestId('lab-record')).toContainText('Aufnahme beenden');
  await page.waitForTimeout(1500);
  await page.getByTestId('lab-record').click();
  await expect(page.getByText(/Aufnahme „Leersaite A \(5\)“ gespeichert/)).toBeVisible({ timeout: 10000 });
  const clips = page.getByTestId('lab-clips').getByRole('listitem');
  await expect(clips).toHaveCount(1);
  await expect(clips.first()).toContainText('Leersaite A (5)');
  await expect(clips.first()).toContainText(/1,[3-9] s|2,\d s/);
  await expect(page.getByRole('button', { name: 'Leersaite A (5) exportieren' })).toBeVisible();
});
