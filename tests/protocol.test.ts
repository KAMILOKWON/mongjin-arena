import { describe, expect, it } from 'vitest';
import { ArenaSession, parseCommand, stateHash } from '../src/protocol/session.js';

describe('JSONL protocol session', () => {
  it('returns a versioned deterministic observation', () => {
    const first = new ArenaSession();
    const second = new ArenaSession();
    const observation = first.observation();
    expect(observation.protocolVersion).toBe('mongjin-arena-jsonl-1');
    expect(observation.rulesetId).toBe('mongjin-standard-1.0');
    expect(observation.stateHash).toBe(stateHash(second.getState()));
    expect(observation.legalMoves).toHaveLength(6);
  });

  it('plays a legal move and rejects an illegal move', () => {
    const session = new ArenaSession();
    const legal = session.handle(
      parseCommand({
        id: 'legal',
        command: 'play',
        move: { kind: 'PLACE', to: { r: 7, c: 4 } },
      }),
    );
    expect(legal.ok).toBe(true);
    expect(session.observation().ply).toBe(1);

    const illegal = session.handle(
      parseCommand({
        id: 'illegal',
        command: 'play',
        move: { kind: 'PLACE', to: { r: 4, c: 4 } },
      }),
    );
    expect(illegal).toMatchObject({
      ok: false,
      id: 'illegal',
      error: { code: 'ILLEGAL_MOVE' },
    });
  });

  it('rejects malformed commands before state mutation', () => {
    expect(() => parseCommand({ command: 'play', move: { kind: 'PLACE' } })).toThrow();
  });
});
