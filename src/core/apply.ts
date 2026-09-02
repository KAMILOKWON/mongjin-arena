import type { GameState, Move } from './types.js';
import { opponent, positionKey } from './rules.js';

export function applyMove(state: GameState, move: Move): GameState {
  const board = state.board.map((row) => row.slice());
  const guardsInHand = { ...state.guardsInHand };

  if (move.kind === 'PLACE') {
    board[move.to.r]![move.to.c] = { player: state.turn, type: 'GUARD' };
    guardsInHand[state.turn] -= 1;
  } else {
    const piece = board[move.from.r]![move.from.c]!;
    board[move.from.r]![move.from.c] = null;
    board[move.to.r]![move.to.c] = piece;
  }

  const next: GameState = {
    board,
    turn: opponent(state.turn),
    guardsInHand,
    history: [...state.history, move],
    positionCounts: { ...state.positionCounts },
  };
  const key = positionKey(next);
  next.positionCounts[key] = (next.positionCounts[key] ?? 0) + 1;
  return next;
}
