import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, resolve } from 'node:path';

type ProviderId = 'codex' | 'gemini' | 'kimi' | 'grok';

interface Coord {
  r: number;
  c: number;
}

type Move =
  | { kind: 'PLACE'; to: Coord }
  | { kind: 'MOVE'; from: Coord; to: Coord };

interface ModelAnswer {
  moveIndex: number;
  reasoningSummaryKo: string;
  strategicIdea: 'guard-development' | 'king-advance' | 'king-side-step' | 'other';
  confidence: number;
}

interface CommandSpec {
  executable: string;
  args: string[];
  requestedModel: string;
  answerFile?: string;
}

interface CommandResult {
  exitCode: number | null;
  signal: string | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
}

const arenaRoot = resolve(import.meta.dirname, '..');
const experimentRoot = resolve(arenaRoot, 'experiments', 'exp-002-four-model-first-move');
const promptFile = resolve(experimentRoot, 'prompt.md');
const schemaFile = resolve(experimentRoot, 'response.schema.json');
const positionFile = resolve(experimentRoot, 'position.json');
const rawRoot = resolve(experimentRoot, 'raw');
const normalizedRoot = resolve(experimentRoot, 'normalized');
const providers: ProviderId[] = ['gemini', 'codex', 'kimi', 'grok'];

function usage(): never {
  console.error(
    'Usage: npm run experiment:first-move -- --provider <codex|gemini|kimi|grok> [--force]',
  );
  process.exit(1);
}

function parseArgs(args: string[]): { provider: ProviderId; force: boolean } {
  let provider: ProviderId | undefined;
  let force = false;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--provider') {
      const value = args[++index];
      if (!providers.includes(value as ProviderId)) usage();
      provider = value as ProviderId;
    } else if (arg === '--force') {
      force = true;
    } else {
      usage();
    }
  }
  if (!provider) usage();
  return { provider, force };
}

function commandFor(
  provider: ProviderId,
  prompt: string,
  isolatedRoot: string,
): CommandSpec {
  const schema = readFileSync(schemaFile, 'utf8').trim();
  if (provider === 'codex') {
    const answerFile = resolve(isolatedRoot, 'codex-answer.json');
    return {
      executable: 'codex',
      requestedModel: 'gpt-5.6-sol',
      answerFile,
      args: [
        'exec',
        '--ephemeral',
        '--sandbox',
        'read-only',
        '--ignore-user-config',
        '--ignore-rules',
        '--skip-git-repo-check',
        '--output-schema',
        schemaFile,
        '--output-last-message',
        answerFile,
        '--cd',
        isolatedRoot,
        prompt,
      ],
    };
  }
  if (provider === 'gemini') {
    return {
      executable: 'npx',
      requestedModel: 'subscription default',
      args: [
        '--yes',
        '@google/gemini-cli@0.58.0',
        '--skip-trust',
        '--approval-mode',
        'plan',
        '--prompt',
        prompt,
        '--output-format',
        'json',
      ],
    };
  }
  if (provider === 'kimi') {
    const emptySkills = resolve(isolatedRoot, 'empty-skills');
    mkdirSync(emptySkills, { recursive: true });
    return {
      executable: 'kimi',
      requestedModel: 'kimi-code/k3',
      args: [
        '--model',
        'kimi-code/k3',
        '--prompt',
        prompt,
        '--output-format',
        'stream-json',
        '--skills-dir',
        emptySkills,
      ],
    };
  }
  return {
    executable: 'grok',
    requestedModel: 'grok-4.6',
    args: [
      '--single',
      prompt,
      '--output-format',
      'json',
      '--json-schema',
      schema,
      '--cwd',
      isolatedRoot,
      '--max-turns',
      '1',
      '--no-subagents',
      '--disable-web-search',
      '--verbatim',
    ],
  };
}

function runCommand(spec: CommandSpec, cwd: string): CommandResult {
  const startedAt = performance.now();
  const completed = spawnSync(spec.executable, spec.args, {
    cwd,
    encoding: 'utf8',
    timeout: 10 * 60 * 1_000,
    maxBuffer: 10 * 1024 * 1024,
    env: process.env,
  });
  return {
    exitCode: completed.status,
    signal: completed.signal,
    stdout: completed.stdout ?? '',
    stderr: completed.stderr ?? '',
    durationMs: performance.now() - startedAt,
    timedOut: completed.error?.message.includes('ETIMEDOUT') ?? false,
  };
}

function stripFence(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match?.[1]?.trim() ?? trimmed;
}

function parseJsonText(value: string): unknown {
  const stripped = stripFence(value);
  try {
    return JSON.parse(stripped);
  } catch {
    const start = stripped.indexOf('{');
    const end = stripped.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(stripped.slice(start, end + 1));
    throw new Error('model output does not contain a JSON object');
  }
}

function looksLikeAnswer(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && 'moveIndex' in value;
}

function findAnswer(value: unknown): unknown {
  if (looksLikeAnswer(value)) return value;
  if (typeof value === 'string') {
    try {
      return findAnswer(parseJsonText(value));
    } catch {
      return undefined;
    }
  }
  if (Array.isArray(value)) {
    for (let index = value.length - 1; index >= 0; index -= 1) {
      const found = findAnswer(value[index]);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  if (typeof value === 'object' && value !== null) {
    for (const key of ['response', 'content', 'message', 'output', 'result', 'text']) {
      const found = findAnswer((value as Record<string, unknown>)[key]);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

function extractProviderAnswer(
  provider: ProviderId,
  result: CommandResult,
  spec: CommandSpec,
): unknown {
  if (provider === 'codex' && spec.answerFile && existsSync(spec.answerFile)) {
    return parseJsonText(readFileSync(spec.answerFile, 'utf8'));
  }
  if (provider === 'kimi') {
    const lines = result.stdout.split(/\r?\n/).filter(Boolean);
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      try {
        const event = JSON.parse(lines[index]!) as Record<string, unknown>;
        if (event.role === 'assistant' && typeof event.content === 'string') {
          return parseJsonText(event.content);
        }
      } catch {
        // Preserve malformed provider lines in raw output and continue searching.
      }
    }
  }
  const outer = parseJsonText(result.stdout);
  const answer = findAnswer(outer);
  if (answer === undefined) throw new Error('could not locate the structured answer');
  return answer;
}

function isCoord(value: unknown): value is Coord {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return Number.isInteger(record.r) && Number.isInteger(record.c);
}

function isMove(value: unknown): value is Move {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  if (record.kind === 'PLACE') return isCoord(record.to);
  if (record.kind === 'MOVE') return isCoord(record.from) && isCoord(record.to);
  return false;
}

function normalizeAnswer(value: unknown): ModelAnswer {
  if (typeof value !== 'object' || value === null) throw new Error('answer is not an object');
  const record = value as Record<string, unknown>;
  if (!Number.isInteger(record.moveIndex) || (record.moveIndex as number) < 0 || (record.moveIndex as number) > 5) {
    throw new Error('answer.moveIndex must be an integer between 0 and 5');
  }
  if (typeof record.reasoningSummaryKo !== 'string' || record.reasoningSummaryKo.length === 0) {
    throw new Error('answer.reasoningSummaryKo is missing');
  }
  const ideas = ['guard-development', 'king-advance', 'king-side-step', 'other'] as const;
  if (!ideas.includes(record.strategicIdea as (typeof ideas)[number])) {
    throw new Error('answer.strategicIdea is invalid');
  }
  if (
    typeof record.confidence !== 'number' ||
    record.confidence < 0 ||
    record.confidence > 1
  ) {
    throw new Error('answer.confidence must be between 0 and 1');
  }
  return {
    moveIndex: record.moveIndex as number,
    reasoningSummaryKo: record.reasoningSummaryKo,
    strategicIdea: record.strategicIdea as ModelAnswer['strategicIdea'],
    confidence: record.confidence,
  };
}

function writeSummary(): void {
  const results = providers.flatMap((provider) => {
    const file = resolve(normalizedRoot, `${provider}.json`);
    if (!existsSync(file)) return [];
    return [JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>];
  });
  const legalMoveCount = results.filter((result) => result.legal === true).length;
  const completed = results.map((result) => result.provider);
  const summary = {
    experimentId: 'exp-002-four-model-first-move',
    status: results.length === providers.length ? 'complete' : 'in-progress',
    completedProviders: completed,
    legalMoveCount,
    providerCount: providers.length,
    legalMoveRate: results.length === providers.length ? legalMoveCount / providers.length : null,
    results,
  };
  writeFileSync(resolve(normalizedRoot, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
}

const { provider, force } = parseArgs(process.argv.slice(2));
const providerRawRoot = resolve(rawRoot, provider);
const normalizedFile = resolve(normalizedRoot, `${provider}.json`);
if ((existsSync(providerRawRoot) || existsSync(normalizedFile)) && !force) {
  throw new Error(`results already exist for ${provider}; pass --force only for a transport retry`);
}

mkdirSync(providerRawRoot, { recursive: true });
mkdirSync(normalizedRoot, { recursive: true });
const isolatedRoot = mkdtempSync(resolve(tmpdir(), `mongjin-${provider}-`));
const prompt = readFileSync(promptFile, 'utf8');
const position = JSON.parse(readFileSync(positionFile, 'utf8')) as { legalMoves: Move[] };
const spec = commandFor(provider, prompt, isolatedRoot);
const startedAt = new Date().toISOString();
const result = runCommand(spec, isolatedRoot);

writeFileSync(resolve(providerRawRoot, 'stdout.txt'), result.stdout);
writeFileSync(resolve(providerRawRoot, 'stderr.txt'), result.stderr);
writeFileSync(
  resolve(providerRawRoot, 'run.json'),
  `${JSON.stringify(
    {
      provider,
      requestedModel: spec.requestedModel,
      startedAt,
      durationMs: result.durationMs,
      exitCode: result.exitCode,
      signal: result.signal,
      timedOut: result.timedOut,
      executable: basename(spec.executable),
      promptFile: 'prompt.md',
      responseSchemaFile: 'response.schema.json',
    },
    null,
    2,
  )}\n`,
);

if (result.exitCode !== 0) {
  throw new Error(
    `${provider} exited with ${String(result.exitCode)}; inspect raw/${provider}/stderr.txt`,
  );
}

const answer = normalizeAnswer(extractProviderAnswer(provider, result, spec));
writeFileSync(
  resolve(providerRawRoot, 'response.json'),
  `${JSON.stringify(answer, null, 2)}\n`,
);
const move = position.legalMoves[answer.moveIndex];
if (!move || !isMove(move)) throw new Error(`position has no legal move at index ${answer.moveIndex}`);
const normalized = {
  provider,
  requestedModel: spec.requestedModel,
  legal: true,
  durationMs: result.durationMs,
  move,
  ...answer,
};
writeFileSync(normalizedFile, `${JSON.stringify(normalized, null, 2)}\n`);
writeSummary();
console.log(JSON.stringify(normalized, null, 2));
