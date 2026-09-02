# EXP-002 — Four subscription models choose their first Mongjin move

## Question

Can Gemini, Codex, Kimi K3, and Grok understand a previously unseen abstract
strategy game well enough to return one legal opening move from the same
position?

## Why this is the first model experiment

A full game confounds rule comprehension, long-horizon strategy, interface
reliability, and subscription limits. This devlog-sized experiment isolates the
first gate: read the same rules and choose one legal move. It costs one model
call per provider and produces an understandable first piece of content.

## Frozen method

- One identical Korean prompt per provider
- One standard initial position with state hash
  `6638332df0f616763d82db5d070fd0f3301b469c4e2236d152a561944282781c`
- The six legal actions are supplied explicitly
- Temperature and hidden provider defaults are not claimed to be equivalent
- No web search, game engine access, or provider-to-provider context
- One response per model; no retry for strategic quality
- A transport or authentication failure may be repaired once and is reported
  separately from an illegal move

Primary metric: `legal_move_rate`. Secondary observations are the chosen move,
strategy label, confidence, latency, and rule misunderstandings.

This is a four-sample **devlog**, not a benchmark of overall model strength.

## Run

```bash
npm run experiment:first-move -- --provider codex
npm run experiment:first-move -- --provider gemini
npm run experiment:first-move -- --provider kimi
npm run experiment:first-move -- --provider grok
```

Provider subscriptions must already be authenticated in their official CLIs.
Raw stdout, stderr, exact command metadata, and normalized output are saved
under this folder. Credentials are never copied into the repository.

For this run, Gemini CLI authentication was rejected by Google with an
`UNSUPPORTED_CLIENT` migration message, and Grok CLI was not authenticated.
Their existing subscription web sessions are therefore used as declared in
`manifest.json`. The exact prompt and response schema remain unchanged. Full
CLI stdout/stderr stays local because it can contain session identifiers; the
exact assistant JSON response is committed as `raw/<provider>/response.json`.

## Result

All four providers returned a legal move, for a legal move rate of **4/4
(100%)**. They also made the same choice: place Black's first guard directly in
front of its king at `(7,4)`.

| Provider surface | Chosen move | Strategy label | Confidence | Observed wall time |
|---|---|---|---:|---:|
| Gemini 3.1 Pro | `PLACE (7,4)` | guard development | 0.95 | 16.1 s |
| Codex `gpt-5.6-sol` | `PLACE (7,4)` | guard development | 0.68 | 8.0 s |
| Kimi K3 | `PLACE (7,4)` | guard development | 0.55 | 15.0 s |
| Grok Expert | `PLACE (7,4)` | guard development | 0.74 | 45.0 s |

The short explanations converge on the same intuition: develop protection and
a placement base before exposing the king. This unanimity is an observation,
not evidence that the move is objectively optimal. It may partly reflect how
the rules and six candidate actions were presented.

Wall times are recorded for operational debugging only. Mixed web and CLI
transports make them unsuitable for provider speed comparisons. See
`normalized/summary.json` for the comparison record and `raw/<provider>` for
the exact returned JSON.
