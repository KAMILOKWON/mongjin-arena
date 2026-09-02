import type { Move } from '../core/types.js';
import type { Agent, AgentRequest, AgentResponse } from './types.js';
import { mulberry32 } from './random.js';

function scoreMove(request: AgentRequest, move: Move): number {
  const board = request.observation.board;
  if (move.kind === 'PLACE') {
    const forward = request.side === 'BLACK' ? 8 - move.to.r : move.to.r;
    return forward * 2;
  }

  const movingPiece = board[move.from.r]![move.from.c];
  const target = board[move.to.r]![move.to.c];
  if (target === (request.side === 'BLACK' ? 'WK' : 'BK')) return 1_000_000;
  let score = target ? 1_000 : 0;
  if (movingPiece?.endsWith('K')) {
    const distance = request.side === 'BLACK' ? move.to.r : 8 - move.to.r;
    score += (8 - distance) * 20;
    if (distance === 0 && move.to.c >= 3 && move.to.c <= 5) score += 100_000;
  }
  return score;
}

export class GreedyAgent implements Agent {
  readonly name: string;
  private readonly random: () => number;

  constructor(seed = 1, name = `greedy-${seed}`) {
    this.name = name;
    this.random = mulberry32(seed);
  }

  async act(request: AgentRequest): Promise<AgentResponse> {
    const ranked = request.observation.legalMoves.map((move) => ({
      move,
      score: scoreMove(request, move),
      tie: this.random(),
    }));
    ranked.sort((left, right) => right.score - left.score || left.tie - right.tie);
    if (!ranked[0]) throw new Error('no legal moves');
    return { move: ranked[0].move, debug: { greedyScore: ranked[0].score } };
  }
}
