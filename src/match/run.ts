import { performance } from 'node:perf_hooks';
import type { Agent, AgentRequest } from '../agents/types.js';
import { applyMove } from '../core/apply.js';
import { DEFAULT_CONFIG, RULESET_ID } from '../core/config.js';
import { getResult } from '../core/result.js';
import { initialState, isLegalMove, legalMoves, opponent } from '../core/rules.js';
import type { GameState, Move, Player } from '../core/types.js';
import { observationForState, stateHash } from '../protocol/session.js';
import type { MatchResult, MatchTermination, MoveRecord } from './types.js';

export interface RunMatchOptions {
  gameId: string;
  black: Agent;
  white: Agent;
  opening?: Move[];
  moveTimeoutMs?: number;
  maxPlies?: number;
}

class MoveTimeoutError extends Error {}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(() => reject(new MoveTimeoutError('move timed out')), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function terminalResult(
  options: RunMatchOptions,
  state: GameState,
  records: MoveRecord[],
  startedAt: number,
  winner: Player | null,
  termination: MatchTermination,
  error?: string,
): MatchResult {
  return {
    gameId: options.gameId,
    rulesetId: RULESET_ID,
    blackAgent: options.black.name,
    whiteAgent: options.white.name,
    winner,
    termination,
    plies: state.history.length,
    openingPlies: options.opening?.length ?? 0,
    durationMs: performance.now() - startedAt,
    moves: state.history,
    records,
    ...(error === undefined ? {} : { error }),
  };
}

export async function runMatch(options: RunMatchOptions): Promise<MatchResult> {
  const timeoutMs = options.moveTimeoutMs ?? 5_000;
  const maxPlies = options.maxPlies ?? 240;
  const startedAt = performance.now();
  const records: MoveRecord[] = [];
  let state = initialState(DEFAULT_CONFIG);

  for (const move of options.opening ?? []) {
    if (getResult(state, DEFAULT_CONFIG) || !isLegalMove(state, move, DEFAULT_CONFIG)) {
      throw new Error(`invalid forced opening at ply ${state.history.length}`);
    }
    state = applyMove(state, move);
  }

  while (state.history.length < maxPlies) {
    const result = getResult(state, DEFAULT_CONFIG);
    if (result) {
      return terminalResult(options, state, records, startedAt, result.winner, result.reason);
    }

    const side = state.turn;
    const agent = side === 'BLACK' ? options.black : options.white;
    const request: AgentRequest = {
      type: 'act',
      gameId: options.gameId,
      side,
      observation: observationForState(state, options.gameId),
      deadlineMs: timeoutMs,
    };
    const moveStartedAt = performance.now();
    let response;
    try {
      response = await withTimeout(agent.act(request), timeoutMs);
    } catch (error) {
      const termination: MatchTermination = error instanceof MoveTimeoutError ? 'timeout' : 'agent-error';
      return terminalResult(
        options,
        state,
        records,
        startedAt,
        opponent(side),
        termination,
        error instanceof Error ? error.message : String(error),
      );
    }
    const thinkMs = performance.now() - moveStartedAt;

    if (!isLegalMove(state, response.move, DEFAULT_CONFIG)) {
      return terminalResult(
        options,
        state,
        records,
        startedAt,
        opponent(side),
        'illegal-move',
        JSON.stringify(response.move),
      );
    }

    state = applyMove(state, response.move);
    records.push({
      ply: state.history.length,
      side,
      agent: agent.name,
      move: response.move,
      thinkMs,
      stateHashAfter: stateHash(state),
      ...(response.debug === undefined ? {} : { debug: response.debug }),
    });
  }

  const result = getResult(state, DEFAULT_CONFIG);
  if (result) {
    return terminalResult(options, state, records, startedAt, result.winner, result.reason);
  }
  return terminalResult(options, state, records, startedAt, null, 'ply-cap');
}

export function generateOpening(seed: number, plies = 4): Move[] {
  let value = seed >>> 0;
  const random = () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let mixed = Math.imul(value ^ (value >>> 15), 1 | value);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
  let state = initialState(DEFAULT_CONFIG);
  const opening: Move[] = [];
  for (let index = 0; index < plies; index += 1) {
    if (getResult(state, DEFAULT_CONFIG)) break;
    const moves = legalMoves(state, DEFAULT_CONFIG);
    const move = moves[Math.floor(random() * moves.length)];
    if (!move) break;
    opening.push(move);
    state = applyMove(state, move);
  }
  return opening;
}
