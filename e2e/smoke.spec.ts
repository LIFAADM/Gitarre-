import { expect, test, type Page } from '@playwright/test';

/**
 * Smoke-Tests gegen den Produktions-Build (Phase 0: Navigationsgerüst, Stimmgerät, Metronom, Vorhören, Offline).
 */

async function dismissToasts(page: Page): Promise<void> {
  await page.evaluate(() => document.querySelectorAll('[aria-label="Hinweis schließen"]').forEach((b) => (b as HTMLButtonElement).click()));
}

test.describe('GuitarCoach v2 – Gerüst', () => {
  test('Start zeigt genau eine Hauptaktion und die vier Navigationsziele', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Nächster Schritt' })).toBeVisible();
    await expect(page.getByTestId('home-main-action')).toBeVisible();
    const nav = page.getByRole('navigation', { name: 'Hauptnavigation' });
    for (const label of ['Start', 'Lernpfad', 'Stücke', 'Werkzeuge']) await expect(nav.getByRole('link', { name: label })).toBeVisible();
    await page.getByTestId('home-main-action').click();
    await expect(page).toHaveURL(/\/werkzeuge\/stimmgeraet$/);
  });

  test('Lernpfad zeigt das Level-Gerüst 1–7', async ({ page }) => {
    await page.goto('/lernpfad');
    await expect(page.getByRole('heading', { name: 'Lernpfad' })).toBeVisible();
    const levels = page.getByLabel('Levels').getByRole('listitem');
    await expect(levels).toHaveCount(7);
    await expect(page.getByText('Erste Akkorde')).toBeVisible();
  });

  test('Stücke: nur gemeinfreie Arrangements, Vorhören mit Wiedergabe und Tempo', async ({ page }) => {
    await page.goto('/stuecke');
    await expect(page.getByText(/6 gemeinfreie Arrangements/)).toBeVisible();
    await expect(page.getByText(/Tab-Datei nötig/)).toHaveCount(0);
    await page.getByTestId('piece-happy-birthday').click();
    await expect(page.getByRole('heading', { name: 'Happy Birthday' })).toBeVisible();
    await expect(page.locator('svg.tab-svg').first()).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Anfänger' })).toBeVisible();
    await expect(page.getByText(/Takt 1 \/ 9/)).toBeVisible();
    await page.getByRole('radio', { name: '50 %' }).click();
    await expect(page.getByTestId('player-bpm')).toContainText('(50 %)');
    await page.getByRole('button', { name: 'Abspielen' }).click();
    await expect(page.getByRole('button', { name: 'Wiedergabe pausieren' })).toBeVisible();
    await page.getByRole('button', { name: 'Wiedergabe pausieren' }).click();
    await expect(page.getByRole('button', { name: 'Abspielen' })).toBeVisible();
    await dismissToasts(page);
  });

  test('Noten-Ansicht (klassische Notenschrift + Tab) wird gerendert', async ({ page }) => {
    await page.goto('/stuecke/alle-jahre-wieder');
    await page.getByRole('radio', { name: 'Noten + Tab' }).click();
    const scoreView = page.getByTestId('score-view');
    await expect(scoreView.locator('svg').first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/konnte nicht dargestellt/)).toHaveCount(0);
  });

  test('Stimmgerät täuscht ohne Mikrofon keinen Ton vor', async ({ page }) => {
    await page.goto('/werkzeuge/stimmgeraet');
    await expect(page.getByRole('heading', { name: 'Stimmgerät' })).toBeVisible();
    await expect(page.getByTestId('tuner-note')).toContainText('–');
    await expect(page.getByRole('button', { name: /Mikrofon starten/ })).toBeVisible();
  });

  test('Metronom startet und stoppt', async ({ page }) => {
    await page.goto('/werkzeuge/metronom');
    await page.getByRole('button', { name: /^Start$/ }).click();
    await expect(page.getByRole('button', { name: /^Stopp$/ })).toBeVisible();
    await page.getByRole('button', { name: /^Stopp$/ }).click();
    await expect(page.getByRole('button', { name: /^Start$/ })).toBeVisible();
  });

  test('Profil: Einstellungen bleiben nach Neuladen erhalten', async ({ page }) => {
    await page.goto('/profil');
    const toggle = page.getByRole('switch', { name: /Linkshänder/ });
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await toggle.click();
    await page.reload();
    await expect(page.getByRole('switch', { name: /Linkshänder/ })).toHaveAttribute('aria-checked', 'true');
  });

  test('Offline: App funktioniert nach Erstinstallation ohne Netz', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, null, { timeout: 20000 }).catch(() => undefined);
    await page.waitForTimeout(1500);
    await context.setOffline(true);
    await page.goto('/stuecke/happy-birthday');
    await expect(page.getByRole('heading', { name: 'Happy Birthday' })).toBeVisible();
    await expect(page.locator('svg.tab-svg').first()).toBeVisible();
    await context.setOffline(false);
    await dismissToasts(page);
  });
});
