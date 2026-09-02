#!/usr/bin/env node
import { createInterface } from 'node:readline';
import { ArenaSession, parseCommand } from '../protocol/session.js';
import type { ArenaResponse } from '../protocol/types.js';

const session = new ArenaSession();
const input = createInterface({ input: process.stdin, crlfDelay: Infinity });

function write(response: ArenaResponse): void {
  process.stdout.write(`${JSON.stringify(response)}\n`);
}

input.on('line', (line) => {
  let raw: unknown;
  try {
    raw = JSON.parse(line);
  } catch {
    write({ ok: false, error: { code: 'BAD_JSON', message: 'input is not valid JSON' } });
    return;
  }

  try {
    const command = parseCommand(raw);
    const response = session.handle(command);
    write(response);
    if (command.command === 'quit') input.close();
  } catch (error) {
    const id =
      typeof raw === 'object' && raw !== null && 'id' in raw && typeof raw.id === 'string'
        ? raw.id
        : undefined;
    write({
      ok: false,
      ...(id === undefined ? {} : { id }),
      error: {
        code: 'BAD_COMMAND',
        message: error instanceof Error ? error.message : String(error),
      },
    });
  }
});
