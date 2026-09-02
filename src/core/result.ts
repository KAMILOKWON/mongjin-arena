import type { RuleConfig } from './config.js';
import type { GameState, Player } from './types.js';
import { ORTHO, findKing, inBoard, isGoalCell, legalMoves, opponent } from './rules.js';

export type WinReason = 'goal' | 'capture' | 'surround' | 'no-moves';

export interface GameResult {
  winner: Player;
  reason: WinReason;
}

const PLAYERS: Player[] = ['BLACK', 'WHITE'];

export function getResult(state: GameState, config: RuleConfig): GameResult | null {
  const size = state.board.length;

  for (const player of PLAYERS) {
    if (!findKing(state, player)) return { winner: opponent(player), reason: 'capture' };
  }

  for (const player of PLAYERS) {
    const king = findKing(state, player);
    if (king && isGoalCell(player, king, config)) return { winner: player, reason: 'goal' };
  }

  if (config.kingSurroundLoss) {
    for (const player of PLAYERS) {
      const king = findKing(state, player);
      if (!king) continue;
      const surrounded = ORTHO.every(([dr, dc]) => {
        const r = king.r + dr;
        const c = king.c + dc;
        if (!inBoard(size, r, c)) return true;
        const piece = state.board[r]![c];
        return piece !== null && piece.player !== player;
      });
      if (surrounded) return { winner: opponent(player), reason: 'surround' };
    }
  }

  if (legalMoves(state, config).length === 0) {
    return { winner: opponent(state.turn), reason: 'no-moves' };
  }
  return null;
}
