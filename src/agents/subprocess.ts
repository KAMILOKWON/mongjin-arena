import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createInterface, type Interface } from 'node:readline';
import { isMove } from '../protocol/session.js';
import type { Agent, AgentRequest, AgentResponse } from './types.js';

interface PendingLine {
  resolve: (line: string) => void;
  reject: (error: Error) => void;
}

export class SubprocessAgent implements Agent {
  readonly name: string;
  private readonly child: ChildProcessWithoutNullStreams;
  private readonly lines: Interface;
  private readonly queue: PendingLine[] = [];
  private readonly buffered: string[] = [];
  private closed = false;

  constructor(executable: string, args: string[] = [], name = executable) {
    this.name = name;
    this.child = spawn(executable, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    this.lines = createInterface({ input: this.child.stdout, crlfDelay: Infinity });
    this.lines.on('line', (line) => {
      const pending = this.queue.shift();
      if (pending) pending.resolve(line);
      else this.buffered.push(line);
    });
    this.child.on('error', (error) => this.rejectAll(error));
    this.child.on('exit', (code, signal) => {
      this.closed = true;
      this.rejectAll(new Error(`agent exited (code=${String(code)}, signal=${String(signal)})`));
    });
  }

  private rejectAll(error: Error): void {
    for (const pending of this.queue.splice(0)) pending.reject(error);
  }

  private nextLine(): Promise<string> {
    const buffered = this.buffered.shift();
    if (buffered !== undefined) return Promise.resolve(buffered);
    if (this.closed) return Promise.reject(new Error('agent process is closed'));
    return new Promise((resolve, reject) => this.queue.push({ resolve, reject }));
  }

  async act(request: AgentRequest): Promise<AgentResponse> {
    this.child.stdin.write(`${JSON.stringify(request)}\n`);
    const line = await this.nextLine();
    const parsed: unknown = JSON.parse(line);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('move' in parsed) ||
      !isMove(parsed.move)
    ) {
      throw new Error('agent response must be JSON with a valid move');
    }
    return { move: parsed.move };
  }

  async close(): Promise<void> {
    if (!this.closed) this.child.kill('SIGTERM');
    this.lines.close();
  }
}
