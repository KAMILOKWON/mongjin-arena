import { createHash } from 'node:crypto';
import { applyMove } from '../core/apply.js';
import { DEFAULT_CONFIG, RULESET_ID } from '../core/config.js';
import { getResult } from '../core/result.js';
import { initialState, isLegalMove, legalMoves, positionKey } from '../core/rules.js';
import type { GameState, Move } from '../core/types.js';
import {
  PROTOCOL_VERSION,
  type ArenaCommand,
  type ArenaResponse,
  type EncodedPiece,
  type Observation,
} from './types.js';

export function encodeBoard(state: GameState): EncodedPiece[][] {
  return state.board.map((row) =>
    row.map((piece) => {
      if (!piece) return null;
      const side = piece.player === 'BLACK' ? 'B' : 'W';
      const kind = piece.type === 'KING' ? 'K' : 'G';
      return `${side}${kind}` as Exclude<EncodedPiece, null>;
    }),
  );
}

export function stateHash(state: GameState): string {
  const payload = JSON.stringify({
    position: positionKey(state),
    history: state.history,
  });
  return createHash('sha256').update(payload).digest('hex');
}

export function observationForState(state: GameState, gameId: string): Observation {
  return {
    gameId,
    rulesetId: RULESET_ID,
    protocolVersion: PROTOCOL_VERSION,
    stateHash: stateHash(state),
    ply: state.history.length,
    turn: state.turn,
    board: encodeBoard(state),
    guardsInHand: { ...state.guardsInHand },
    legalMoves: legalMoves(state, DEFAULT_CONFIG),
    result: getResult(state, DEFAULT_CONFIG),
  };
}

function hasObjectShape(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIntegerCoord(value: unknown): boolean {
  return (
    hasObjectShape(value) &&
    Number.isInteger(value.r) &&
    Number.isInteger(value.c)
  );
}

export function isMove(value: unknown): value is Move {
  if (!hasObjectShape(value)) return false;
  if (value.kind === 'PLACE') return isIntegerCoord(value.to);
  return value.kind === 'MOVE' && isIntegerCoord(value.from) && isIntegerCoord(value.to);
}

export function parseCommand(value: unknown): ArenaCommand {
  if (!hasObjectShape(value) || typeof value.command !== 'string') {
    throw new Error('command must be a JSON object with a string command field');
  }
  const id = typeof value.id === 'string' ? value.id : undefined;
  if (value.command === 'play') {
    if (!isMove(value.move)) throw new Error('play requires a valid move object');
    return { id, command: 'play', move: value.move };
  }
  if (value.command === 'new_game') {
    const gameId = typeof value.gameId === 'string' ? value.gameId : undefined;
    return { id, command: 'new_game', gameId };
  }
  if (
    value.command === 'hello' ||
    value.command === 'observe' ||
    value.command === 'legal_moves' ||
    value.command === 'result' ||
    value.command === 'quit'
  ) {
    return { id, command: value.command };
  }
  throw new Error(`unknown command: ${value.command}`);
}

export class ArenaSession {
  private state: GameState = initialState(DEFAULT_CONFIG);
  private gameCounter = 1;
  private gameId = 'game-1';

  getState(): GameState {
    return this.state;
  }

  observation(): Observation {
    return observationForState(this.state, this.gameId);
  }

  private success(id: string | undefined, type: string, data?: unknown): ArenaResponse {
    return {
      ok: true,
      ...(id === undefined ? {} : { id }),
      type,
      protocolVersion: PROTOCOL_VERSION,
      rulesetId: RULESET_ID,
      stateHash: stateHash(this.state),
      ...(data === undefined ? {} : { data }),
    };
  }

  handle(command: ArenaCommand): ArenaResponse {
    if (command.command === 'hello') {
      return this.success(command.id, 'hello', {
        name: 'Mongjin Arena',
        commands: ['hello', 'new_game', 'observe', 'legal_moves', 'play', 'result', 'quit'],
      });
    }

    if (command.command === 'new_game') {
      this.gameCounter += 1;
      this.gameId = command.gameId ?? `game-${this.gameCounter}`;
      this.state = initialState(DEFAULT_CONFIG);
      return this.success(command.id, 'new_game', this.observation());
    }

    if (command.command === 'observe') {
      return this.success(command.id, 'observation', this.observation());
    }

    if (command.command === 'legal_moves') {
      return this.success(command.id, 'legal_moves', {
        gameId: this.gameId,
        ply: this.state.history.length,
        turn: this.state.turn,
        moves: legalMoves(this.state, DEFAULT_CONFIG),
      });
    }

    if (command.command === 'result') {
      return this.success(command.id, 'result', getResult(this.state, DEFAULT_CONFIG));
    }

    if (command.command === 'play') {
      if (getResult(this.state, DEFAULT_CONFIG)) {
        return {
          ok: false,
          ...(command.id === undefined ? {} : { id: command.id }),
          error: { code: 'GAME_OVER', message: 'the game is already over' },
        };
      }
      if (!isLegalMove(this.state, command.move, DEFAULT_CONFIG)) {
        return {
          ok: false,
          ...(command.id === undefined ? {} : { id: command.id }),
          error: { code: 'ILLEGAL_MOVE', message: 'move is not legal in the current state' },
        };
      }
      this.state = applyMove(this.state, command.move);
      return this.success(command.id, 'played', this.observation());
    }

    return this.success(command.id, 'bye');
  }
}
