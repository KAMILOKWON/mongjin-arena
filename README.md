# Mongjin Arena

Mongjin Arena is the reproducible agent-evaluation environment for **Mongjin
(蒙塵 / 몽진)**, a two-player perfect-information abstract strategy game.

The arena exposes the canonical rules through a headless JSON Lines protocol
and runs color-swapped matches between built-in or external agents. It is the
shared evaluation layer for Prime Intellect RLM experiments and future public
agent competitions.

## Quick start

```bash
npm install
npm test
npm run build
```

Start an interactive headless session:

```bash
npm run arena
```

Then write one JSON command per line:

```json
{"id":"1","command":"new_game"}
{"id":"2","command":"observe"}
{"id":"3","command":"legal_moves"}
{"id":"4","command":"play","move":{"kind":"PLACE","to":{"r":7,"c":4}}}
```

Run a color-swapped baseline:

```bash
npm run match -- --black random --white greedy --games 4 --out results/smoke
```

The match runner writes a manifest, summary, CSV, JSONL, and one MGN replay per
game. Generated results are ignored by Git.

## Repository layout

```text
rules/                 Human and machine-readable standard rules
src/core/              Canonical deterministic rules engine snapshot
src/protocol/          JSONL arena session and versioned message types
src/agents/            Built-in and subprocess agent adapters
src/match/             Match runner, paired openings, result records
src/mgn/               Portable Mongjin Game Notation writer
src/cli/               Headless arena and tournament commands
adapters/prime/        Python bridge for Prime/Verifiers integration
experiments/           Versioned experiment protocols
```

## Evaluation guarantees

- Ruleset: `mongjin-standard-1.0`
- Protocol: `mongjin-arena-jsonl-1`
- Every response includes a deterministic state hash.
- Invalid moves, timeouts, and agent crashes are terminal losses.
- Comparative runs use the same opening twice with agent colors swapped.
- The TypeScript rules engine is the sole authority; adapters must not
  reimplement game rules.

## Coordinates

The machine API uses zero-based `{r, c}` coordinates. Human-facing MGN uses
files `a`–`i` and ranks `1`–`9`, with Black starting on rank 1.

## Provenance

The rules engine was extracted from the canonical Mongjin product source at
version 1.0.8. Future engine updates must change the ruleset version or prove
behavioral equivalence with the golden tests.

## License

Source code is MIT licensed. The Mongjin name and visual brand assets are
covered separately; see [NOTICE.md](./NOTICE.md).
