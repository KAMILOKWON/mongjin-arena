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

Run the checked-in taskset with the Prime 0.6.31 toolchain. This command uses
the Prime-pinned Verifiers v1 package and installs the adapter only in a
temporary `uv` environment:

```bash
uv run --with prime==0.6.31 --with-editable adapters/prime \
  eval @ adapters/prime/configs/rlm-smoke.toml --dry-run
```

The command above only resolves the taskset and writes its normalized config;
it does not call a model API. A successful run writes under `outputs/`, which
is ignored by Git.

For a real evaluation, first authenticate and inspect the currently available
model catalog:

```bash
prime login
prime inference models
```

Then select a model and run the same config through `prime eval`. This path can
consume inference credits, so it is intentionally not part of automated tests.

## Current scope

- Verifiers v1 taskset, not the deprecated v0 `StatefulToolEnv` API
- Built-in RLM harness (`id = "rlm"`)
- One standard initial position
- Black agent versus fixed greedy White
- Binary reward: 1 for a Black win, 0 otherwise
- Invalid tool arguments are recoverable and counted in rollout state

Before publishing to Environments Hub, bundle the compiled arena JS and a Node
runtime into the task environment rather than relying on the maintainer's
local checkout.
