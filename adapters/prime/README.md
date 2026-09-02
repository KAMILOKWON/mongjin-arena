# Prime Intellect adapter

This is a Verifiers v1 taskset. The evaluated model controls Black through MCP
tools while a deterministic greedy baseline replies as White. Per-rollout game
history lives in `vf.State`; every state transition is verified by the
canonical TypeScript engine through `ArenaBridge`.

## Local preparation

Build the arena first:

```bash
cd ../..
npm install
npm run build
```

Install the taskset in a Prime/Verifiers workspace:

```bash
uv pip install -e adapters/prime
```

Validate the evaluation configuration before spending inference credits:

```bash
uv run eval @ adapters/prime/configs/rlm-smoke.toml --dry-run
```

Select an available model according to the current Prime model catalog, then
run by adding `--model <provider/model>`.

## Current scope

- Verifiers v1 taskset, not the deprecated v0 `StatefulToolEnv` API
- Built-in RLM harness (`id = "rlm"`)
- One standard initial position
- Black agent versus fixed greedy White
- Binary reward: 1 for a Black win, 0 otherwise
- Invalid tool arguments are recoverable and counted in rollout state

Before publishing to Environments Hub, bundle the compiled arena JS into the
Python wheel and verify that the selected Docker runtime contains Node.js.
