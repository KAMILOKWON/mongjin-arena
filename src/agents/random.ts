import type { Agent, AgentRequest, AgentResponse } from './types.js';

export function mulberry32(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let mixed = Math.imul(value ^ (value >>> 15), 1 | value);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

export class RandomAgent implements Agent {
  readonly name: string;
  private readonly random: () => number;

  constructor(seed = 1, name = `random-${seed}`) {
    this.name = name;
    this.random = mulberry32(seed);
  }

  async act(request: AgentRequest): Promise<AgentResponse> {
    const moves = request.observation.legalMoves;
    if (moves.length === 0) throw new Error('no legal moves');
    const index = Math.floor(this.random() * moves.length);
    return { move: moves[index]! };
  }
}
