import type { GameResult } from '../core/result.js';
import type { GameState, Move } from '../core/types.js';

export const PROTOCOL_VERSION = 'mongjin-arena-jsonl-1' as const;

export type ArenaCommand =
  | { id?: string; command: 'hello' }
  | { id?: string; command: 'new_game'; gameId?: string }
  | { id?: string; command: 'observe' }
  | { id?: string; command: 'legal_moves' }
  | { id?: string; command: 'play'; move: Move }
  | { id?: string; command: 'result' }
  | { id?: string; command: 'quit' };

export type EncodedPiece = 'BK' | 'BG' | 'WK' | 'WG' | null;

export interface Observation {
  gameId: string;
  rulesetId: string;
  protocolVersion: string;
  stateHash: string;
  ply: number;
  turn: GameState['turn'];
  board: EncodedPiece[][];
  guardsInHand: GameState['guardsInHand'];
  legalMoves: Move[];
  result: GameResult | null;
}

export interface ArenaError {
  code: 'BAD_JSON' | 'BAD_COMMAND' | 'BAD_MOVE' | 'ILLEGAL_MOVE' | 'GAME_OVER';
  message: string;
}

export type ArenaResponse =
  | {
      ok: true;
      id?: string;
      type: string;
      protocolVersion: string;
      rulesetId: string;
      stateHash: string;
      data?: unknown;
    }
  | { ok: false; id?: string; error: ArenaError };
