#!/usr/bin/env node
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { applyMove } from '../src/core/apply.js';
import { DEFAULT_CONFIG } from '../src/core/config.js';
import { getResult } from '../src/core/result.js';
import { initialState, legalMoves, positionKey } from '../src/core/rules.js';
import type { GameState, Move } from '../src/core/types.js';

function randomGenerator(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let mixed = Math.imul(value ^ (value >>> 15), 1 | value);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function normalizedMoves(moves: Move[]): string[] {
  return moves.map((move) => JSON.stringify(move)).sort();
}

const productRoot = process.env.MONGJIN_PRODUCT_ROOT;
if (!productRoot) {
  throw new Error('Set MONGJIN_PRODUCT_ROOT to the canonical Mongjin product repository.');
}

const load = (relativePath: string) => import(pathToFileURL(join(productRoot, relativePath)).href);
const productConfig = await load('src/core/config.ts');
const productRules = await load('src/core/rules.ts');
const productApply = await load('src/core/apply.ts');
const productResult = await load('src/core/result.ts');

if (JSON.stringify(productConfig.DEFAULT_CONFIG) !== JSON.stringify(DEFAULT_CONFIG)) {
  throw new Error('DEFAULT_CONFIG differs from the product source');
}

const random = randomGenerator(20_260_902);
const games = 100;
const maxPlies = 500;
let positions = 0;

for (let game = 0; game < games; game += 1) {
  let arenaState: GameState = initialState(DEFAULT_CONFIG);
  let productState: GameState = productRules.initialState(productConfig.DEFAULT_CONFIG);
  for (let ply = 0; ply < maxPlies; ply += 1) {
    positions += 1;
    const arenaKey = positionKey(arenaState);
    const productKey = productRules.positionKey(productState);
    if (arenaKey !== productKey) throw new Error(`position mismatch at game ${game}, ply ${ply}`);

    const arenaResult = getResult(arenaState, DEFAULT_CONFIG);
    const canonicalResult = productResult.getResult(productState, productConfig.DEFAULT_CONFIG);
    if (JSON.stringify(arenaResult) !== JSON.stringify(canonicalResult)) {
      throw new Error(`result mismatch at game ${game}, ply ${ply}`);
    }
    if (arenaResult) break;

    const arenaMoves = legalMoves(arenaState, DEFAULT_CONFIG);
    const productMoves = productRules.legalMoves(productState, productConfig.DEFAULT_CONFIG);
    if (JSON.stringify(normalizedMoves(arenaMoves)) !== JSON.stringify(normalizedMoves(productMoves))) {
      throw new Error(`legal move mismatch at game ${game}, ply ${ply}`);
    }
    const selected = arenaMoves[Math.floor(random() * arenaMoves.length)];
    if (!selected) throw new Error(`no move at non-terminal game ${game}, ply ${ply}`);
    arenaState = applyMove(arenaState, selected);
    productState = productApply.applyMove(productState, selected);
  }
}

console.log(`Verified ${positions} positions across ${games} seeded games against ${productRoot}`);
