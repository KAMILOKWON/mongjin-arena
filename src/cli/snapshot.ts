#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { GreedyAgent } from '../agents/greedy.js';
import { applyMove } from '../core/apply.js';
import { DEFAULT_CONFIG } from '../core/config.js';
import { getResult } from '../core/result.js';
import { initialState, isLegalMove } from '../core/rules.js';
import type { GameState, Move } from '../core/types.js';
import { isMove, observationForState } from '../protocol/session.js';

interface SnapshotInput {
  gameId?: string;
  moves?: Move[];
  move?: Move;
  opponent?: 'none' | 'greedy';
  opponentSeed?: number;
}

function parseInput(value: unknown): SnapshotInput {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('input must be a JSON object');
  }
  const object = value as Record<string, unknown>;
  const moves = object.moves ?? [];
  if (!Array.isArray(moves) || !moves.every(isMove)) throw new Error('moves must contain valid moves');
  if (object.move !== undefined && !isMove(object.move)) throw new Error('move is invalid');
  const opponent = object.opponent ?? 'none';
  if (opponent !== 'none' && opponent !== 'greedy') throw new Error('unsupported opponent');
  return {
    gameId: typeof object.gameId === 'string' ? object.gameId : 'snapshot',
    moves,
    ...(object.move === undefined ? {} : { move: object.move }),
    opponent,
    opponentSeed: Number.isInteger(object.opponentSeed) ? Number(object.opponentSeed) : 1,
  };
}

function replay(moves: Move[]): GameState {
  let state = initialState(DEFAULT_CONFIG);
  for (const move of moves) {
    if (getResult(state, DEFAULT_CONFIG)) throw new Error('history continues after a terminal state');
    if (!isLegalMove(state, move, DEFAULT_CONFIG)) {
      throw new Error(`history contains an illegal move at ply ${state.history.length + 1}`);
    }
    state = applyMove(state, move);
  }
  return state;
}

async function main(): Promise<void> {
  const raw = readFileSync(0, 'utf8');
  const input = parseInput(JSON.parse(raw));
  let state = replay(input.moves ?? []);
  let opponentMove: Move | null = null;

  if (input.move) {
    if (getResult(state, DEFAULT_CONFIG)) throw new Error('game is already over');
    if (!isLegalMove(state, input.move, DEFAULT_CONFIG)) throw new Error('submitted move is illegal');
    state = applyMove(state, input.move);
  }

  if (input.move && input.opponent === 'greedy' && !getResult(state, DEFAULT_CONFIG)) {
    const opponent = new GreedyAgent(input.opponentSeed ?? 1, 'prime-opponent:greedy');
    const response = await opponent.act({
      type: 'act',
      gameId: input.gameId ?? 'snapshot',
      side: state.turn,
      observation: observationForState(state, input.gameId ?? 'snapshot'),
      deadlineMs: 5_000,
    });
    opponentMove = response.move;
    state = applyMove(state, opponentMove);
  }

  process.stdout.write(
    `${JSON.stringify({
      ok: true,
      submittedMove: input.move ?? null,
      opponentMove,
      moves: state.history,
      observation: observationForState(state, input.gameId ?? 'snapshot'),
    })}\n`,
  );
}

main().catch((error) => {
  process.stdout.write(
    `${JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) })}\n`,
  );
  process.exitCode = 1;
});
