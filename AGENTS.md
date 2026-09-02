# Mongjin Arena contributor rules

## Source of truth

- `src/core/` is the only rules implementation in this repository.
- `rules/mongjin-standard-1.0.json` and `rules/RULES.md` describe its frozen public behavior.
- Adapters must call the TypeScript engine; do not reimplement rules in Python.
- A behavior-changing rule patch requires a new ruleset ID and migration notes.

## Required checks

Run these after every change:

```bash
npm run typecheck
npm test
npm run build
```

For Prime bridge changes, also run:

```bash
python3 -m py_compile adapters/prime/mongjin_v1/*.py
```

## Evaluation integrity

- Comparative matches use color-swapped pairs.
- Agents receive the same seed within each pair.
- Never count a timeout, illegal move, crash, or ply-cap as a normal game win.
- Preserve raw JSONL and MGN; summaries must be reproducible from raw results.
- Record protocol, ruleset, agent version, seed, timeout, and maximum plies.

## Generated files

- Do not edit `dist/`, `node_modules/`, `results/`, or Python cache files.
- Do not commit API keys or model-provider credentials.

## Brand boundary

Code is MIT licensed. The Mongjin name and visual assets follow `NOTICE.md` and
must not be relicensed through code contributions.
