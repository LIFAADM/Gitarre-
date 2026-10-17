import { expect, test, type Page } from '@playwright/test';

/**
 * Smoke-Tests gegen den Produktions-Build (Akzeptanztests aus der Aufgabenstellung, soweit ohne Mikrofon/Gitarre prüfbar).
 */

async function dismissToasts(page: Page): Promise<void> {
  await page.evaluate(() => document.querySelectorAll('[aria-label="Hinweis schließen"]').forEach((b) => (b as HTMLButtonElement).click()));
}

test.describe('GuitarCoach MVP', () => {
  test('Dashboard lädt mit deutscher Oberfläche und Schnellstart', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Guten (Morgen|Tag|Abend)/ })).toBeVisible();
    await expect(page.getByText('Heutiges Lernziel')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Gitarre stimmen' }).first()).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible();
  });

  test('Songbibliothek enthält alle Wunsch-Songs mit Status (Test 10)', async ({ page }) => {
    await page.goto('/songs');
    await expect(page.getByText(/30 Songs · 6 spielbereit · 24 benötigen eine Tab-Datei/)).toBeVisible();
    for (const title of ['Nothing Else Matters', 'Yesterday', 'Love Me Tender', '99 Luftballons', 'Sweet Child o’ Mine', 'Jingle Bells']) {
      await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    }
    await expect(page.getByText('Spielbereit').first()).toBeVisible();
    await expect(page.getByText('Tab-Datei nötig').first()).toBeVisible();
    await page.getByRole('radio', { name: 'Tab nötig' }).click();
    await expect(page.getByRole('heading', { name: 'Happy Birthday', exact: true })).toHaveCount(0);
  });

  test('Happy Birthday: Tabulatur, Wiedergabe, Tempo, Einzelton (Test 3 & 6)', async ({ page }) => {
    await page.goto('/songs/happy-birthday');
    await expect(page.getByRole('heading', { name: 'Happy Birthday' })).toBeVisible();
    await expect(page.locator('svg.tab-svg').first()).toBeVisible();
    // Mehrere Versionen mit echten Notendaten
    await expect(page.getByRole('button', { name: /Anfänger/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Leicht/ })).toBeVisible();
    await expect(page.getByText(/Takt 1 \/ 9/)).toBeVisible();
    // Einzeltonmodus
    await page.getByRole('button', { name: 'Nächste Note' }).click();
    await page.getByRole('button', { name: 'Nächste Note' }).click();
    // Tempo auf 50 % → angezeigte BPM halbieren sich
    const bpmBefore = await page.getByTestId('player-bpm').textContent();
    await page.getByRole('radio', { name: '50 %' }).click();
    await expect(page.getByText(/\(50 %\)/)).toBeVisible();
    const bpmAfter = await page.getByTestId('player-bpm').textContent();
    expect(Number(bpmAfter?.match(/\d+/)?.[0])).toBeLessThan(Number(bpmBefore?.match(/\d+/)?.[0]));
    // Abspielen startet (Status wechselt zu Pause-Button)
    await page.getByRole('button', { name: 'Abspielen' }).click();
    await expect(page.getByRole('button', { name: 'Wiedergabe pausieren' })).toBeVisible();
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: 'Wiedergabe pausieren' }).click();
    await expect(page.getByRole('button', { name: 'Abspielen' })).toBeVisible();
  });

  test('Schleife: Abschnitt auswählen (Test 7)', async ({ page }) => {
    await page.goto('/songs/jingle-bells');
    await page.getByRole('button', { name: 'Schleife' }).click();
    await page.getByRole('button', { name: 'Aktuellen Takt + 3 wiederholen' }).click();
    await page.getByRole('button', { name: 'Fertig' }).click();
    await expect(page.getByText(/Takt 1–4/)).toBeVisible();
  });

  test('Import einer Guitar-Pro-Datei in die Bibliothek (Test 5)', async ({ page }) => {
    await page.goto('/songs/import');
    await page.getByRole('button', { name: /GuitarCoach Etüde Nr. 1/ }).click();
    await expect(page.getByText('Datei erkannt')).toBeVisible();
    await expect(page.getByText('Guitar Pro 7/8').first()).toBeVisible();
    await expect(page.getByText('Melodie', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'In meine Bibliothek übernehmen' }).click();
    await expect(page).toHaveURL(/\/songs\/song-/);
    await expect(page.getByRole('heading', { name: 'GuitarCoach Etüde Nr. 1' })).toBeVisible();
    await expect(page.locator('svg.tab-svg').first()).toBeVisible();
    await expect(page.getByText(/Takt 1 \/ 7/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Spur 1/ })).toBeVisible();
  });

  test('Lernfortschritt bleibt nach Neuladen erhalten (Test 8)', async ({ page }) => {
    await page.goto('/lernen/k1-l1-aufbau');
    await expect(page.getByRole('heading', { name: 'Aufbau einer Konzertgitarre' })).toBeVisible();
    await page.getByRole('button', { name: 'Lektion abschließen' }).click();
    await expect(page.getByText('erledigt', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText('erledigt', { exact: true })).toBeVisible();
    await page.goto('/lernen');
    await expect(page.getByText(/1 von \d+ Lektionen abgeschlossen/)).toBeVisible();
  });

  test('Gitarrenschule hat sieben Kapitel mit Lektionen', async ({ page }) => {
    await page.goto('/lernen');
    await expect(page.getByText('Meine Gitarre')).toBeVisible();
    await expect(page.getByText('Fortgeschrittene Techniken')).toBeVisible();
    await page.getByRole('button', { name: /Fortgeschrittene Techniken/ }).click();
    await expect(page.getByText('Hammer-ons', { exact: true })).toBeVisible();
  });

  test('Stimmgerät täuscht ohne Mikrofon keinen Ton vor (Test 1, Teil ohne Hardware)', async ({ page }) => {
    await page.goto('/werkzeuge/stimmgeraet');
    await expect(page.getByRole('heading', { name: 'Stimmgerät' })).toBeVisible();
    await expect(page.getByText(/82,4\d? Hz/).first()).toBeVisible();
    await expect(page.getByText('–', { exact: true }).first()).toBeVisible();
  });

  test('Griffbrett zeigt Ton bei Antippen (Test 2)', async ({ page }) => {
    await page.goto('/werkzeuge/griffbrett');
    await page.getByRole('button', { name: 'Saite 3, Bund 2 (A3)' }).click();
    await expect(page.getByText('A3').first()).toBeVisible();
    await expect(page.getByText(/220,0 Hz/)).toBeVisible();
  });

  test('Metronom startet und stoppt', async ({ page }) => {
    await page.goto('/werkzeuge/metronom');
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.getByRole('button', { name: 'Stopp' })).toBeVisible();
    await page.getByRole('button', { name: 'Stopp' }).click();
    await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
  });

  test('Offline: App funktioniert nach Erstinstallation ohne Netz (Test 9)', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, null, { timeout: 20000 }).catch(() => undefined);
    await page.waitForTimeout(2500);
    await context.setOffline(true);
    await page.goto('/songs/happy-birthday');
    await expect(page.getByRole('heading', { name: 'Happy Birthday' })).toBeVisible();
    await expect(page.locator('svg.tab-svg').first()).toBeVisible();
    await context.setOffline(false);
    await dismissToasts(page);
  });

  test('Spiel-mit-Modus startet und zeigt erwarteten Ton (Test 11, ohne Mikrofon)', async ({ page }) => {
    await page.goto('/ueben/uebung/ex-leere-saiten/spiel-mit');
    await expect(page.getByText(/Nächster Ton: E2/)).toBeVisible();
    await expect(page.getByText('Ton 1 von 12')).toBeVisible();
  });
});
