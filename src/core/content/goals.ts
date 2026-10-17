import type { GoalRecord } from '../storage/types';

/** Persönliche Lernziele (Standardliste, in der App abhakbar und erweiterbar). */
export const DEFAULT_GOALS: Omit<GoalRecord, 'done'>[] = [
  { id: 'goal-a1', title: 'Meine Gitarre stimmen können', group: 'anfaenger', order: 1, linkedLessonId: 'k1-l6-stimmen' },
  { id: 'goal-a2', title: 'Alle sechs Saiten kennen', group: 'anfaenger', order: 2, linkedLessonId: 'k1-l3-saitennamen' },
  { id: 'goal-a3', title: 'Erste einzelne Töne sauber spielen', group: 'anfaenger', order: 3, linkedLessonId: 'k2-l6-erste-toene' },
  { id: 'goal-a4', title: 'Happy Birthday spielen', group: 'anfaenger', order: 4, linkedSongId: 'happy-birthday' },
  { id: 'goal-a5', title: 'Jingle Bells spielen', group: 'anfaenger', order: 5, linkedSongId: 'jingle-bells' },
  { id: 'goal-a6', title: 'O Tannenbaum spielen', group: 'anfaenger', order: 6, linkedSongId: 'o-tannenbaum' },
  { id: 'goal-m1', title: 'Erste Beatles-Melodien', group: 'mittel', order: 1, linkedSongId: 'beatles-love-me-do' },
  { id: 'goal-m2', title: 'Elvis-Melodien', group: 'mittel', order: 2, linkedSongId: 'elvis-love-me-tender' },
  { id: 'goal-m3', title: 'Nirvana – Come As You Are', group: 'mittel', order: 3, linkedSongId: 'nirvana-come-as-you-are' },
  { id: 'goal-m4', title: 'Nena – 99 Luftballons', group: 'mittel', order: 4, linkedSongId: 'nena-99-luftballons' },
  { id: 'goal-m5', title: 'Beatles – Day Tripper', group: 'mittel', order: 5, linkedSongId: 'beatles-day-tripper' },
  { id: 'goal-m6', title: 'Metallica – Nothing Else Matters (Intro)', group: 'mittel', order: 6, linkedSongId: 'metallica-nothing-else-matters' },
  { id: 'goal-l1', title: 'Metallica – Enter Sandman', group: 'lang', order: 1, linkedSongId: 'metallica-enter-sandman' },
  { id: 'goal-l2', title: 'Metallica – One', group: 'lang', order: 2, linkedSongId: 'metallica-one' },
  { id: 'goal-l3', title: 'Guns N’ Roses – Sweet Child o’ Mine', group: 'lang', order: 3, linkedSongId: 'guns-n-roses-sweet-child-o-mine' },
  { id: 'goal-l4', title: 'Anspruchsvollere Rocksolos', group: 'lang', order: 4, linkedLessonId: 'k7-l7-kleines-solo' },
  { id: 'goal-l5', title: 'Komplette Gitarrenparts meiner Lieblingssongs', group: 'lang', order: 5 },
];
