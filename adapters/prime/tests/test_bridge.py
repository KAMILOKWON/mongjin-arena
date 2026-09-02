from pathlib import Path

from mongjin_v1.bridge import ArenaBridge


def test_bridge_reads_initial_position() -> None:
    arena_root = Path(__file__).resolve().parents[3]
    response = ArenaBridge(arena_root).snapshot([])
    observation = response["observation"]
    assert observation["rulesetId"] == "mongjin-standard-1.0"
    assert observation["turn"] == "BLACK"
    assert len(observation["legalMoves"]) == 6
