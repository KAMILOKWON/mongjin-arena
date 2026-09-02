import { describe, expect, it } from 'vitest';
import type { Agent } from '../src/agents/types.js';
import { GreedyAgent } from '../src/agents/greedy.js';
import { RandomAgent } from '../src/agents/random.js';
import { generateOpening, runMatch } from '../src/match/run.js';

describe('match runner', () => {
  it('runs a legal baseline game and records every agent move', async () => {
    const opening = generateOpening(42, 4);
    const result = await runMatch({
      gameId: 'test-game',
      black: new GreedyAgent(1, 'greedy'),
      white: new RandomAgent(2, 'random'),
      opening,
      moveTimeoutMs: 100,
      maxPlies: 240,
    });
    expect(['BLACK', 'WHITE', null]).toContain(result.winner);
    expect(result.moves).toHaveLength(result.plies);
    expect(result.records).toHaveLength(result.plies - opening.length);
    expect(result.records.every((record) => record.stateHashAfter.length === 64)).toBe(true);
  });

  it('turns an illegal move into a terminal loss', async () => {
    const illegal: Agent = {
      name: 'illegal',
      async act() {
        return { move: { kind: 'PLACE', to: { r: 4, c: 4 } } };
      },
    };
    const result = await runMatch({
      gameId: 'illegal-game',
      black: illegal,
      white: new RandomAgent(2),
      moveTimeoutMs: 100,
    });
    expect(result.winner).toBe('WHITE');
    expect(result.termination).toBe('illegal-move');
  });

  it('turns a timeout into a terminal loss', async () => {
    const slow: Agent = {
      name: 'slow',
      async act() {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { move: { kind: 'PLACE', to: { r: 7, c: 4 } } };
      },
    };
    const result = await runMatch({
      gameId: 'timeout-game',
      black: slow,
      white: new RandomAgent(2),
      moveTimeoutMs: 5,
    });
    expect(result.winner).toBe('WHITE');
    expect(result.termination).toBe('timeout');
  });
});
