"""Thin subprocess bridge to the canonical TypeScript rules engine."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Any


class ArenaBridge:
    def __init__(self, arena_root: str | Path, timeout_seconds: float = 10.0) -> None:
        self.arena_root = Path(arena_root).resolve()
        self.timeout_seconds = timeout_seconds
        self.snapshot_cli = self.arena_root / "dist" / "cli" / "snapshot.js"

    def check(self) -> None:
        if not self.snapshot_cli.is_file():
            raise RuntimeError(
                f"Mongjin snapshot CLI not found at {self.snapshot_cli}. "
                "Run `npm install && npm run build` in the arena root first."
            )

    def snapshot(
        self,
        moves: list[dict[str, Any]],
        *,
        move: dict[str, Any] | None = None,
        opponent: str = "none",
        opponent_seed: int = 1,
        game_id: str = "prime-rollout",
    ) -> dict[str, Any]:
        self.check()
        payload: dict[str, Any] = {
            "gameId": game_id,
            "moves": moves,
            "opponent": opponent,
            "opponentSeed": opponent_seed,
        }
        if move is not None:
            payload["move"] = move
        completed = subprocess.run(
            ["node", str(self.snapshot_cli)],
            input=json.dumps(payload),
            text=True,
            capture_output=True,
            cwd=self.arena_root,
            timeout=self.timeout_seconds,
            check=False,
        )
        try:
            response = json.loads(completed.stdout)
        except json.JSONDecodeError as error:
            raise RuntimeError(
                f"arena returned invalid JSON (exit={completed.returncode}): {completed.stderr}"
            ) from error
        if completed.returncode != 0 or not response.get("ok"):
            raise RuntimeError(str(response.get("error") or completed.stderr or "arena call failed"))
        return response
