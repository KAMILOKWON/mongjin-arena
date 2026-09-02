import type { GameState, Move, Player } from '../core/types.js';
import { applyMove } from '../core/apply.js';
import { DEFAULT_CONFIG, RULESET_ID } from '../core/config.js';
import { initialState } from '../core/rules.js';

export function toSquare(r: number, c: number, boardSize = 9): string {
  return `${String.fromCharCode(97 + c)}${boardSize - r}`;
}

function moveToken(state: GameState, move: Move): string {
  if (move.kind === 'PLACE') return `@${toSquare(move.to.r, move.to.c)}`;
  const piece = state.board[move.from.r]![move.from.c];
  if (!piece) throw new Error('cannot format move without a source piece');
  const letter = piece.type === 'KING' ? 'K' : 'G';
  const separator = state.board[move.to.r]![move.to.c] ? 'x' : '-';
  return `${letter}${toSquare(move.from.r, move.from.c)}${separator}${toSquare(move.to.r, move.to.c)}`;
}

export interface MgnRecord {
  event: string;
  gameId: string;
  black: string;
  white: string;
  winner: Player | null;
  termination: string;
  moves: Move[];
}

export function serializeMgn(record: MgnRecord): string {
  const result = record.winner === 'BLACK' ? '1-0' : record.winner === 'WHITE' ? '0-1' : '1/2-1/2';
  const headers = [
    '[MGN "1"]',
    `[Event "${record.event}"]`,
    `[GameId "${record.gameId}"]`,
    `[Ruleset "${RULESET_ID}"]`,
    `[Black "${record.black}"]`,
    `[White "${record.white}"]`,
    `[Result "${result}"]`,
    `[Termination "${record.termination}"]`,
  ];

  let state: GameState = initialState(DEFAULT_CONFIG);
  const turns: string[] = [];
  for (let index = 0; index < record.moves.length; index += 1) {
    const token = moveToken(state, record.moves[index]!);
    if (index % 2 === 0) turns.push(`${Math.floor(index / 2) + 1}. ${token}`);
    else turns[turns.length - 1] += ` ${token}`;
    state = applyMove(state, record.moves[index]!);
  }
  return `${headers.join('\n')}\n\n${turns.join(' ')}\n`;
}
