import { describe, expect, it } from 'vitest';
import { applyMove } from '../src/core/apply.js';
import { DEFAULT_CONFIG, RULESET_ID } from '../src/core/config.js';
import { getResult } from '../src/core/result.js';
import { initialState, isLegalMove, legalMoves } from '../src/core/rules.js';
import type { GameState } from '../src/core/types.js';

describe('mongjin-standard-1.0 golden rules', () => {
  it('starts with two kings, eight guards each, and Black to move', () => {
    const state = initialState(DEFAULT_CONFIG);
    expect(RULESET_ID).toBe('mongjin-standard-1.0');
    expect(state.turn).toBe('BLACK');
    expect(state.board[8]?.[4]).toEqual({ player: 'BLACK', type: 'KING' });
    expect(state.board[0]?.[4]).toEqual({ player: 'WHITE', type: 'KING' });
    expect(state.guardsInHand).toEqual({ BLACK: 8, WHITE: 8 });
  });

  it('forbids guard placement on goals, leaving one initial placement', () => {
    const moves = legalMoves(initialState(DEFAULT_CONFIG), DEFAULT_CONFIG);
    expect(moves.filter((move) => move.kind === 'PLACE')).toEqual([
      { kind: 'PLACE', to: { r: 7, c: 4 } },
    ]);
    expect(moves).toHaveLength(6);
  });

  it('applies a legal placement immutably', () => {
    const before = initialState(DEFAULT_CONFIG);
    const move = { kind: 'PLACE', to: { r: 7, c: 4 } } as const;
    expect(isLegalMove(before, move, DEFAULT_CONFIG)).toBe(true);
    const after = applyMove(before, move);
    expect(before.board[7]?.[4]).toBeNull();
    expect(after.board[7]?.[4]).toEqual({ player: 'BLACK', type: 'GUARD' });
    expect(after.turn).toBe('WHITE');
  });

  it('awards a goal win', () => {
    const state = initialState(DEFAULT_CONFIG);
    state.board[8]![4] = null;
    state.board[0]![3] = { player: 'BLACK', type: 'KING' };
    expect(getResult(state, DEFAULT_CONFIG)).toEqual({ winner: 'BLACK', reason: 'goal' });
  });

  it('awards a capture win when a king is absent', () => {
    const state: GameState = initialState(DEFAULT_CONFIG);
    state.board[0]![4] = null;
    expect(getResult(state, DEFAULT_CONFIG)).toEqual({ winner: 'BLACK', reason: 'capture' });
  });
});
