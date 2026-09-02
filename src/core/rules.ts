import type { RuleConfig } from './config.js';
import type { Coord, GameState, Move, Piece, Player } from './types.js';

export const ORTHO: ReadonlyArray<readonly [number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

export const ALL8: ReadonlyArray<readonly [number, number]> = [
  ...ORTHO,
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

export function opponent(player: Player): Player {
  return player === 'BLACK' ? 'WHITE' : 'BLACK';
}

export function inBoard(size: number, r: number, c: number): boolean {
  return r >= 0 && r < size && c >= 0 && c < size;
}

export function homeRow(player: Player, size: number): number {
  return player === 'BLACK' ? size - 1 : 0;
}

export function goalRow(player: Player, size: number): number {
  return player === 'BLACK' ? 0 : size - 1;
}

export function goalCellsFor(player: Player, config: RuleConfig): Coord[] {
  const size = config.boardSize;
  const row = goalRow(player, size);
  const middle = Math.floor(size / 2);
  if (config.goalCells === 'full-row') {
    return Array.from({ length: size }, (_, c) => ({ r: row, c }));
  }
  if (config.goalCells === 'center-1') return [{ r: row, c: middle }];
  return [middle - 1, middle, middle + 1].map((c) => ({ r: row, c }));
}

export function isGoalCell(player: Player, coord: Coord, config: RuleConfig): boolean {
  return goalCellsFor(player, config).some((goal) => goal.r === coord.r && goal.c === coord.c);
}

export function isAnyGoalCell(coord: Coord, config: RuleConfig): boolean {
  return isGoalCell('BLACK', coord, config) || isGoalCell('WHITE', coord, config);
}

export function initialState(config: RuleConfig): GameState {
  const size = config.boardSize;
  const board: (Piece | null)[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => null),
  );
  const middle = Math.floor(size / 2);
  board[homeRow('BLACK', size)]![middle] = { player: 'BLACK', type: 'KING' };
  board[homeRow('WHITE', size)]![middle] = { player: 'WHITE', type: 'KING' };
  const state: GameState = {
    board,
    turn: 'BLACK',
    guardsInHand: { BLACK: config.guardCount, WHITE: config.guardCount },
    history: [],
    positionCounts: {},
  };
  state.positionCounts[positionKey(state)] = 1;
  return state;
}

export function positionKey(state: GameState): string {
  const cells = state.board
    .map((row) =>
      row
        .map((piece) => {
          if (!piece) return '.';
          const symbol = piece.type === 'KING' ? 'k' : 'g';
          return piece.player === 'BLACK' ? symbol : symbol.toUpperCase();
        })
        .join(''),
    )
    .join('/');
  return `${state.turn}|${state.guardsInHand.BLACK},${state.guardsInHand.WHITE}|${cells}`;
}

export function findKing(state: GameState, player: Player): Coord | null {
  for (let r = 0; r < state.board.length; r += 1) {
    for (let c = 0; c < state.board.length; c += 1) {
      const piece = state.board[r]![c];
      if (piece?.player === player && piece.type === 'KING') return { r, c };
    }
  }
  return null;
}

function placementCells(state: GameState, config: RuleConfig): Coord[] {
  const size = state.board.length;
  const cells: Coord[] = [];
  const seen = new Set<string>();

  if (config.placement === 'own-half') {
    const middle = Math.floor(size / 2);
    for (let r = 0; r < size; r += 1) {
      const inOwnHalf = state.turn === 'BLACK' ? r > middle : r < middle;
      if (!inOwnHalf) continue;
      for (let c = 0; c < size; c += 1) {
        if (!state.board[r]![c]) cells.push({ r, c });
      }
    }
  } else {
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        const piece = state.board[r]![c];
        if (!piece || piece.player !== state.turn) continue;
        for (const [dr, dc] of ORTHO) {
          const next = { r: r + dr, c: c + dc };
          const key = `${next.r},${next.c}`;
          if (
            inBoard(size, next.r, next.c) &&
            !state.board[next.r]![next.c] &&
            !seen.has(key)
          ) {
            seen.add(key);
            cells.push(next);
          }
        }
      }
    }
  }

  return config.noGuardOnGoal
    ? cells.filter((coord) => !isAnyGoalCell(coord, config))
    : cells;
}

function pieceMoves(state: GameState, from: Coord, config: RuleConfig): Move[] {
  const size = state.board.length;
  const piece = state.board[from.r]![from.c]!;
  const moves: Move[] = [];

  if (piece.type === 'KING') {
    for (const [dr, dc] of ALL8) {
      const to = { r: from.r + dr, c: from.c + dc };
      if (inBoard(size, to.r, to.c) && !state.board[to.r]![to.c]) {
        moves.push({ kind: 'MOVE', from, to });
      }
    }
    return moves;
  }

  const canStop = (r: number, c: number) =>
    !config.noGuardOnGoal || !isAnyGoalCell({ r, c }, config);
  const canCapture = (target: Piece) =>
    target.player !== piece.player && (target.type === 'GUARD' || config.kingCapture);
  const canLand = (r: number, c: number, target: Piece | null) =>
    target
      ? canCapture(target) && (target.type === 'KING' || canStop(r, c))
      : canStop(r, c);

  for (const [dr, dc] of ORTHO) {
    if (config.guardMove === 'step') {
      const to = { r: from.r + dr, c: from.c + dc };
      if (
        inBoard(size, to.r, to.c) &&
        canLand(to.r, to.c, state.board[to.r]![to.c])
      ) {
        moves.push({ kind: 'MOVE', from, to });
      }
      continue;
    }

    let r = from.r + dr;
    let c = from.c + dc;
    while (inBoard(size, r, c)) {
      const target = state.board[r]![c];
      if (canLand(r, c, target)) moves.push({ kind: 'MOVE', from, to: { r, c } });
      if (target) break;
      r += dr;
      c += dc;
    }
  }
  return moves;
}

export function legalMoves(state: GameState, config: RuleConfig): Move[] {
  const moves: Move[] = [];
  if (state.guardsInHand[state.turn] > 0) {
    for (const to of placementCells(state, config)) moves.push({ kind: 'PLACE', to });
  }

  for (let r = 0; r < state.board.length; r += 1) {
    for (let c = 0; c < state.board.length; c += 1) {
      const piece = state.board[r]![c];
      if (piece?.player === state.turn) {
        moves.push(...pieceMoves(state, { r, c }, config));
      }
    }
  }
  return moves;
}

export function sameMove(left: Move, right: Move): boolean {
  if (left.kind !== right.kind) return false;
  if (left.kind === 'PLACE' && right.kind === 'PLACE') {
    return left.to.r === right.to.r && left.to.c === right.to.c;
  }
  if (left.kind === 'MOVE' && right.kind === 'MOVE') {
    return (
      left.from.r === right.from.r &&
      left.from.c === right.from.c &&
      left.to.r === right.to.r &&
      left.to.c === right.to.c
    );
  }
  return false;
}

export function isLegalMove(state: GameState, move: Move, config: RuleConfig): boolean {
  return legalMoves(state, config).some((candidate) => sameMove(candidate, move));
}
