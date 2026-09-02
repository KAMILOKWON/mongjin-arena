import type { Move, Player } from '../core/types.js';

export type MatchTermination =
  | 'goal'
  | 'capture'
  | 'surround'
  | 'no-moves'
  | 'illegal-move'
  | 'timeout'
  | 'agent-error'
  | 'ply-cap';

export interface MoveRecord {
  ply: number;
  side: Player;
  agent: string;
  move: Move;
  thinkMs: number;
  stateHashAfter: string;
  debug?: Record<string, unknown>;
}

export interface MatchResult {
  gameId: string;
  rulesetId: string;
  blackAgent: string;
  whiteAgent: string;
  winner: Player | null;
  termination: MatchTermination;
  plies: number;
  openingPlies: number;
  durationMs: number;
  moves: Move[];
  records: MoveRecord[];
  error?: string;
}
