# Experiments

Every experiment has its own immutable folder. Create a new folder instead of
reusing an old one when the question, prompt, model, position, or evaluation
policy changes.

```text
exp-NNN-short-name/
├── README.md       Question, method, result, and limitations
├── manifest.json   Frozen machine-readable protocol
├── prompt.md       Exact model input, when applicable
├── raw/            Unedited provider outputs and run metadata
└── normalized/     Parsed records and comparison summary
```

Content packages refer to an experiment ID; they do not silently alter its
data. Small raw outputs used for a published claim are committed. Large match
artifacts stay under `results/` and are attached to a release with their hash.

## Index

| ID | Question | Status | Content |
|---|---|---|---|
| `exp-001-arena-smoke` | Can the arena finish reproducible baseline games? | complete | internal validation |
| `exp-002-four-model-first-move` | Can four subscription agents choose a legal first Mongjin move? | complete | `content-001-four-model-first-move` |
