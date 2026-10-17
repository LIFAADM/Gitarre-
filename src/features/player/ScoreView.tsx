import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, TriangleAlert } from 'lucide-react';
import { loadAlphaTab } from '@/core/import/alphaTabImport';
import { exportAlphaTex } from '@/core/import/alphaTexExport';
import type { Score } from '@/core/music/score';
import { SongRepository } from '@/core/storage/repositories';

/**
 * Klassische Notenschrift + Tabulatur (Partitur) über den alphaTab-Renderer.
 * Rendert im Hauptthread (kein Worker nötig) und nutzt für importierte Dateien die Originaldatei,
 * sonst einen alphaTex-Export des internen Modells.
 */
export function ScoreView({ score, trackIndex, sourceFileId, zoom = 1 }: { score: Score; trackIndex: number; sourceFileId?: string; zoom?: number }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let api: { destroy(): void } | null = null;
    const container = containerRef.current;
    if (!container) return;
    setStatus('loading');
    setError(null);
    void (async () => {
      try {
        const alphaTab = await loadAlphaTab();
        if (disposed) return;
        const settings = {
          core: { fontDirectory: '/font/', useWorkers: false, engine: 'svg', logLevel: 1 },
          display: {
            layoutMode: 'page',
            staveProfile: 'scoretab',
            scale: Math.min(1.4, Math.max(0.6, zoom * 0.85)),
            padding: [12, 8, 12, 8],
            resources: {
              mainGlyphColor: '#f3f1ea',
              secondaryGlyphColor: '#a8a69d',
              staffLineColor: '#6b6b75',
              barSeparatorColor: '#8d8d98',
              barNumberColor: '#d9a94e',
              scoreInfoColor: '#f3f1ea',
              tablatureFont: '13px "SF Pro Rounded", system-ui, sans-serif',
            },
          },
          player: { enablePlayer: false },
        };
        const instance = new alphaTab.AlphaTabApi(container, settings as unknown as Record<string, unknown>);
        api = instance;
        instance.error.on((e: unknown) => {
          if (disposed) return;
          setError(e instanceof Error ? e.message : String(e));
          setStatus('error');
        });
        instance.renderFinished.on(() => {
          if (!disposed) setStatus('ready');
        });
        let rendered = false;
        if (sourceFileId) {
          const file = await new SongRepository().getImportFile(sourceFileId);
          if (file && !disposed) {
            try {
              const bytes = new Uint8Array(await file.blob.arrayBuffer());
              const atScore = alphaTab.importer.ScoreLoader.loadScoreFromBytes(bytes, new alphaTab.Settings());
              const atTrack = atScore.tracks[trackIndex] ?? atScore.tracks[0];
              if (atTrack) {
                instance.renderScore(atScore, [atTrack.index]);
                rendered = true;
              }
            } catch {
              rendered = false;
            }
          }
        }
        if (!rendered && !disposed) instance.tex(exportAlphaTex(score, { trackIndex }));
      } catch (e) {
        if (disposed) return;
        setError(e instanceof Error ? e.message : String(e));
        setStatus('error');
      }
    })();
    return () => {
      disposed = true;
      try {
        api?.destroy();
      } catch {
        // bereits zerstört
      }
    };
  }, [score, trackIndex, sourceFileId, zoom]);

  return (
    <div className="relative min-h-40">
      {status === 'loading' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 text-sm text-muted">
          <LoaderCircle size={18} className="animate-spin" /> Notenschrift wird geladen …
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-start gap-2 rounded-2xl border border-bad/40 bg-bad/10 p-3 text-sm">
          <TriangleAlert size={18} className="mt-0.5 shrink-0 text-bad" />
          <span>Die Notenschrift konnte nicht dargestellt werden{error ? `: ${error}` : '.'} Die Tab-Ansicht funktioniert weiterhin.</span>
        </div>
      )}
      <div ref={containerRef} data-testid="score-view" className="overflow-x-auto" />
    </div>
  );
}
