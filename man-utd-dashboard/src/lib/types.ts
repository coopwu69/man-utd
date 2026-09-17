export interface SeasonRow {
  season: string;
  competition: string;
  rank: string | null;
  mp: number | null;
  w: number | null;
  d: number | null;
  l: number | null;
  gf: number | null;
  ga: number | null;
  gd: number | null;
  pts: number | null;
  ptsPerMp: number | null;
  xg: number | null;
  xga: number | null;
  xgd: number | null;
  cs: number | null;
  attendance: number | null;
  topScorer: string | null;
  goalkeeper: string | null;
  notes: string | null;
}

export type CompGroup =
  | 'all'
  | 'premier-league'
  | 'fa-cup'
  | 'efl-cup'
  | 'europe';

export interface MatchRow {
  season: string;
  date: string;
  time: string | null;
  competition: string;
  round: string | null;
  venue: string | null;
  result: string | null;
  gf: number | null;
  ga: number | null;
  gfPens: number | null;
  gaPens: number | null;
  opponent: string | null;
  possession: number | null;
  attendance: number | null;
  captain: string | null;
  formation: string | null;
  oppFormation: string | null;
  referee: string | null;
  notes: string | null;
  xg: number | null;
  xga: number | null;
}
