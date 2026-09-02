"""Verifiers v1 taskset: an RLM controls Black against the greedy baseline."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import verifiers.v1 as vf
from pydantic import Field

from mongjin_v1.bridge import ArenaBridge


DEFAULT_ARENA_ROOT = str(Path(__file__).resolve().parents[3])

PROMPT = """
You are Black in Mongjin (蒙塵), a deterministic 9x9 abstract strategy game.
Your goal is to escort your king from e1 to d9/e9/f9, capture or surround the
White king, or leave White without a legal move. White is controlled by a
fixed greedy baseline and replies automatically after each of your moves.

Use the mongjin tools to inspect the board and legal moves. Submit a move to
`mongjin_play` as a JSON string, for example:
{"kind":"PLACE","to":{"r":7,"c":4}}

Machine coordinates are zero-based: r=8 is Black's home rank and r=0 is
White's home rank. Never invent a move; call `mongjin_legal_moves` when unsure.
Continue until the game is terminal, then briefly summarize the result.
""".strip()


class MongjinState(vf.State):
    moves: list[dict[str, Any]] = Field(default_factory=list)
    result: dict[str, Any] | None = None
    invalid_attempts: int = 0


class MongjinToolsetConfig(vf.SharedToolsetConfig):
    arena_root: str = DEFAULT_ARENA_ROOT
    opponent_seed: int = 1
    bridge_timeout_seconds: float = 10.0


class MongjinToolset(vf.Toolset[MongjinToolsetConfig, MongjinState]):
    TOOL_PREFIX = "mongjin"

    def _bridge(self) -> ArenaBridge:
        return ArenaBridge(self.config.arena_root, self.config.bridge_timeout_seconds)

    def _snapshot(self) -> dict[str, Any]:
        return self._bridge().snapshot(self.state.moves)

    @vf.tool
    def observe(self) -> str:
        """Return the current board, side to move, state hash, and terminal result."""
        observation = self._snapshot()["observation"]
        return json.dumps(observation, ensure_ascii=False)

    @vf.tool
    def legal_moves(self) -> str:
        """Return every legal move in the current Mongjin position as JSON."""
        observation = self._snapshot()["observation"]
        return json.dumps(observation["legalMoves"], ensure_ascii=False)

    @vf.tool
    def play(self, move_json: str) -> str:
        """Play one legal Black move encoded as JSON; the greedy White agent then replies."""
        if self.state.result is not None:
            return json.dumps({"ok": False, "error": "game is already over"})
        try:
            move = json.loads(move_json)
            response = self._bridge().snapshot(
                self.state.moves,
                move=move,
                opponent="greedy",
                opponent_seed=self.config.opponent_seed,
            )
        except (json.JSONDecodeError, RuntimeError) as error:
            self.state.invalid_attempts += 1
            return json.dumps({"ok": False, "error": str(error)})

        self.state.moves = response["moves"]
        observation = response["observation"]
        self.state.result = observation["result"]
        return json.dumps(
            {
                "ok": True,
                "submittedMove": response["submittedMove"],
                "opponentMove": response["opponentMove"],
                "observation": observation,
            },
            ensure_ascii=False,
        )


class MongjinTaskConfig(vf.TaskConfig):
    tools: MongjinToolsetConfig = MongjinToolsetConfig()


class MongjinTask(vf.Task[vf.TaskData, MongjinState, MongjinTaskConfig]):
    @classmethod
    def toolsets(cls, config: MongjinTaskConfig) -> list[vf.Toolset]:
        return [MongjinToolset(config.tools)]

    @vf.stop
    async def terminal(self, trace: vf.Trace) -> bool:
        return trace.state.result is not None or trace.num_turns >= 80

    @vf.reward(weight=1.0)
    async def won(self, trace: vf.Trace) -> float:
        result = trace.state.result or {}
        return float(result.get("winner") == "BLACK")


class MongjinConfig(vf.TasksetConfig):
    task: MongjinTaskConfig = MongjinTaskConfig()


class MongjinTaskset(vf.Taskset[MongjinTask, MongjinConfig]):
    def load(self) -> list[MongjinTask]:
        return [MongjinTask(vf.TaskData(idx=0, prompt=PROMPT), self.config.task)]


__all__ = ["MongjinTaskset"]
