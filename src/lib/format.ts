/** Formatiert Minuten als „12 Min.“ bzw. „1 Std. 05 Min.“. */
export function formatMinutes(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes));
  if (m < 60) return `${m} Min.`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h} Std.` : `${h} Std. ${String(rest).padStart(2, '0')} Min.`;
}

/** Formatiert einen Zeitstempel relativ („heute“, „gestern“, „vor 3 Tagen“, Datum). */
export function formatRelativeDay(timestamp: number, now = Date.now()): string {
  const dayStart = (t: number): number => {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const diffDays = Math.round((dayStart(now) - dayStart(timestamp)) / 86_400_000);
  if (diffDays <= 0) return 'heute';
  if (diffDays === 1) return 'gestern';
  if (diffDays < 7) return `vor ${diffDays} Tagen`;
  return new Date(timestamp).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatPercent(value: number): string {
  return `${Math.round(value)} %`;
}

export function formatTempoFactor(factor: number): string {
  return `${Math.round(factor * 100)} %`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
