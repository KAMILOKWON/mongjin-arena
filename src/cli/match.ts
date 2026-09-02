#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Agent } from '../agents/types.js';
import { GreedyAgent } from '../agents/greedy.js';
import { RandomAgent } from '../agents/random.js';
import { RULESET_ID } from '../core/config.js';
import { generateOpening, runMatch } from '../match/run.js';
import type { MatchResult } from '../match/types.js';
import { serializeMgn } from '../mgn/format.js';

interface CliOptions {
  agentA: string;
  agentB: string;
  games: number;
  output: string;
  seed: number;
  openingPlies: number;
  moveTimeoutMs: number;
  maxPlies: number;
  force: boolean;
}

function usage(): never {
  console.error(
    'Usage: npm run match -- --black random --white greedy --games 4 --out results/smoke ' +
      '[--seed 20260902] [--opening-plies 4] [--move-timeout-ms 5000] [--max-plies 240] [--force]',
  );
  process.exit(1);
}

function numberOption(value: string | undefined, name: string, minimum: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < minimum) {
    throw new Error(`${name} must be an integer >= ${minimum}`);
  }
  return parsed;
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    agentA: 'random',
    agentB: 'greedy',
    games: 4,
    output: 'results/smoke',
    seed: 20_260_902,
    openingPlies: 4,
    moveTimeoutMs: 5_000,
    maxPlies: 240,
    force: false,
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--black') options.agentA = args[++index] ?? usage();
    else if (arg === '--white') options.agentB = args[++index] ?? usage();
    else if (arg === '--games') options.games = numberOption(args[++index], '--games', 2);
    else if (arg === '--out') options.output = args[++index] ?? usage();
    else if (arg === '--seed') options.seed = numberOption(args[++index], '--seed', 0);
    else if (arg === '--opening-plies') {
      options.openingPlies = numberOption(args[++index], '--opening-plies', 0);
    } else if (arg === '--move-timeout-ms') {
      options.moveTimeoutMs = numberOption(args[++index], '--move-timeout-ms', 1);
    } else if (arg === '--max-plies') {
      options.maxPlies = numberOption(args[++index], '--max-plies', 1);
    } else if (arg === '--force') options.force = true;
    else usage();
  }
  if (options.games % 2 !== 0) throw new Error('--games must be even for color-swapped pairs');
  if (options.agentA !== 'random' && options.agentA !== 'greedy') {
    throw new Error('--black currently supports random or greedy');
  }
  if (options.agentB !== 'random' && options.agentB !== 'greedy') {
    throw new Error('--white currently supports random or greedy');
  }
  return options;
}

function createAgent(spec: string, seed: number, label: string): Agent {
  if (spec === 'greedy') return new GreedyAgent(seed, `${label}:greedy`);
  return new RandomAgent(seed, `${label}:random`);
}

function csvCell(value: unknown): string {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function writeOutputs(output: string, options: CliOptions, matches: MatchResult[]): void {
  mkdirSync(output, { recursive: true });
  const manifest = {
    experimentId: output.split('/').filter(Boolean).at(-1) ?? 'experiment',
    createdAt: new Date().toISOString(),
    ruleset: RULESET_ID,
    protocol: 'mongjin-arena-jsonl-1',
    node: process.version,
    agentA: options.agentA,
    agentB: options.agentB,
    games: options.games,
    pairs: options.games / 2,
    seed: options.seed,
    openingPlies: options.openingPlies,
    colorSwap: true,
    moveTimeoutMs: options.moveTimeoutMs,
    maxPlies: options.maxPlies,
  };
  writeFileSync(resolve(output, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(
    resolve(output, 'matches.jsonl'),
    `${matches.map((match) => JSON.stringify(match)).join('\n')}\n`,
  );

  const headers = [
    'game_id',
    'black_agent',
    'white_agent',
    'winner',
    'termination',
    'plies',
    'opening_plies',
    'duration_ms',
    'error',
  ];
  const rows = matches.map((match) =>
    [
      match.gameId,
      match.blackAgent,
      match.whiteAgent,
      match.winner ?? 'DRAW',
      match.termination,
      match.plies,
      match.openingPlies,
      match.durationMs.toFixed(3),
      match.error ?? '',
    ]
      .map(csvCell)
      .join(','),
  );
  writeFileSync(resolve(output, 'matches.csv'), `${headers.join(',')}\n${rows.join('\n')}\n`);

  let agentAWins = 0;
  let agentBWins = 0;
  let draws = 0;
  const terminations: Record<string, number> = {};
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index]!;
    const agentAIsBlack = index % 2 === 0;
    if (!match.winner) draws += 1;
    else if ((match.winner === 'BLACK') === agentAIsBlack) agentAWins += 1;
    else agentBWins += 1;
    terminations[match.termination] = (terminations[match.termination] ?? 0) + 1;

    writeFileSync(
      resolve(output, `${match.gameId}.mgn`),
      serializeMgn({
        event: manifest.experimentId,
        gameId: match.gameId,
        black: match.blackAgent,
        white: match.whiteAgent,
        winner: match.winner,
        termination: match.termination,
        moves: match.moves,
      }),
    );
  }
  const summary = {
    agentA: { spec: options.agentA, wins: agentAWins },
    agentB: { spec: options.agentB, wins: agentBWins },
    draws,
    terminations,
  };
  writeFileSync(resolve(output, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
}

const options = parseArgs(process.argv.slice(2));
const output = resolve(options.output);
if (existsSync(output) && readdirSync(output).length > 0 && !options.force) {
  throw new Error(`output directory is not empty: ${output}; use --force to overwrite known files`);
}

const matches: MatchResult[] = [];
for (let index = 0; index < options.games; index += 1) {
  const pair = Math.floor(index / 2);
  const agentAIsBlack = index % 2 === 0;
  const opening = generateOpening(options.seed + pair, options.openingPlies);
  // Each agent gets the same RNG stream in both games of a color-swapped pair.
  const agentA = createAgent(options.agentA, options.seed + pair * 2 + 1, 'A');
  const agentB = createAgent(options.agentB, options.seed + pair * 2 + 2, 'B');
  const black = agentAIsBlack ? agentA : agentB;
  const white = agentAIsBlack ? agentB : agentA;
  const gameId = `game-${String(index + 1).padStart(4, '0')}`;
  const result = await runMatch({
    gameId,
    black,
    white,
    opening,
    moveTimeoutMs: options.moveTimeoutMs,
    maxPlies: options.maxPlies,
  });
  matches.push(result);
  await Promise.all([black.close?.(), white.close?.()]);
  console.log(
    `[${index + 1}/${options.games}] ${result.blackAgent} vs ${result.whiteAgent} → ${result.winner ?? 'DRAW'} (${result.termination}, ${result.plies} plies)`,
  );
}

writeOutputs(output, options, matches);
console.log(`Results written to ${output}`);
