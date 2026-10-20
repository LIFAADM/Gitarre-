import { BUILTIN_SONGS, type BuiltinSongDef, type BuiltinVersionDef } from '@/core/content/songs';
import { parseTabNotation } from '@/core/music/tabNotation';
import type { Score } from '@/core/music/score';

/** Gemeinfreie Stücke mit eigenem Arrangement (Datendateien folgen in Phase 6). */
export function listPieces(): readonly BuiltinSongDef[] {
  return BUILTIN_SONGS;
}

export function getPiece(id: string): BuiltinSongDef | undefined {
  return BUILTIN_SONGS.find((s) => s.id === id);
}

export function pieceScore(piece: BuiltinSongDef, version: BuiltinVersionDef): Score {
  return parseTabNotation(version.notation, { title: piece.title, artist: piece.artist, tempo: version.tempo, timeSignature: version.timeSignature, notes: `${version.label}: ${version.description}` });
}
