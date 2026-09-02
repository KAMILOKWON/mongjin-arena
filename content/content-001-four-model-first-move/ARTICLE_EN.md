# Four AIs Saw Mongjin for the First Time. Would They Choose the Same Opening?

**Mongjin (蒙塵)** is a two-player, perfect-information abstract strategy game I
designed. Each player escorts a king across a 9×9 board toward the three center
goal squares on the opposite edge while using guards to build paths, block, and
capture.

I am turning Mongjin into a reproducible AI testbed. The first participants are
Gemini, Codex, Kimi K3, and Grok. **Claude is not included because I did not
subscribe to it due to the project budget.**

![Four-model Mongjin opening result](assets/result-board.png)

The first experiment deliberately avoids a complete match. Each model receives
the same rules, initial board, coordinate system, and six legal actions. With
search and external tools disabled, it must return one move and a short
strategic summary as JSON.

## Results

All four models returned a legal move—and all four chose the same one: place
Black's first guard directly in front of the king at `(7,4)`.

| Model surface | Opening | Strategy label | Confidence | Legal |
|---|---|---|---:|---:|
| Gemini 3.1 Pro | Place guard at `(7,4)` | guard development | 0.95 | yes |
| Codex `gpt-5.6-sol` | Place guard at `(7,4)` | guard development | 0.68 | yes |
| Kimi K3 | Place guard at `(7,4)` | guard development | 0.55 | yes |
| Grok Expert | Place guard at `(7,4)` | guard development | 0.74 | yes |

The legal move rate was **4/4 (100%)**. Their short explanations converged on
the same intuition: build protection and a future placement base before
exposing the king. Their self-reported confidence still ranged from 0.55 to
0.95.

I recorded wall time but do not use it to compare speed. Gemini and Grok ran
through subscription web interfaces, while Codex and Kimi used
subscription-authenticated CLIs.

The [exact prompt, raw JSON responses, and normalized records](https://github.com/KAMILOKWON/mongjin-arena/tree/69a99eb3568f833086191a94c71e8f7c0faf67d0/experiments/exp-002-four-model-first-move)
are preserved at an immutable commit.

This is one sample from one position. It tests initial rule comprehension and
interface reliability; it does not rank general intelligence or Mongjin skill.

The unanimity creates a better follow-up question: is guard development
actually strong, or did the way I presented the rules and candidates guide all
four systems toward the same intuition? Next I will remove the explicit move
list or test repeated midgame positions. After that, Codex—the most reliable
automation path in this setup—will play a complete game against the
deterministic Greedy baseline.
