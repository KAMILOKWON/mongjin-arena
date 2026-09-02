import type { Move, Player } from '../core/types.js';
import type { Observation } from '../protocol/types.js';

export interface AgentRequest {
  type: 'act';
  gameId: string;
  side: Player;
  observation: Observation;
  deadlineMs: number;
}

export interface AgentResponse {
  move: Move;
  debug?: Record<string, unknown>;
}

export interface Agent {
  readonly name: string;
  act(request: AgentRequest): Promise<AgentResponse>;
  close?(): Promise<void>;
}
