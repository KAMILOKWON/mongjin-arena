# Mongjin Standard Rules 1.0

Ruleset ID: `mongjin-standard-1.0`

## Objective

Escort your king to one of the three central goal squares on the opponent’s
back rank. You also win immediately by capturing or surrounding the opposing
king, or when the opponent has no legal move.

## Setup

- Two players: Black and White.
- Black moves first.
- The board is a 9×9 grid.
- Black’s king starts on `e1`; White’s king starts on `e9`.
- Each player has eight guards in reserve and no guards on the board.
- Black’s goals are `d9`, `e9`, `f9`.
- White’s goals are `d1`, `e1`, `f1`.

## Turn

On a turn, perform exactly one action:

1. Place one guard from reserve; or
2. Move one piece already on the board.

## Placing a guard

- A guard may be placed on an empty square orthogonally adjacent to any of
  your pieces.
- A guard may not be placed on either player’s goal squares.
- Placing consumes one guard from reserve. Captured guards do not return.

## Moving pieces

- A king moves one square in any of the eight directions to an empty square.
- A king cannot capture.
- A guard moves one square orthogonally.
- A guard may replace and capture an opposing guard or king.
- A guard may not finish a normal move on either player’s goal squares.
- Capturing a king on a goal square is allowed and ends the game immediately.

## End conditions

The arena checks terminal conditions in this order:

1. **Capture:** A missing king loses.
2. **Goal:** A king occupying one of its goal squares wins.
3. **Surround:** A king loses if all four orthogonal neighboring directions
   are either off-board or occupied by opposing pieces.
4. **No legal move:** The player to move loses if no legal action exists.

Repeated positions do not automatically end the game. Competition runners may
declare a draw at a published ply cap, but that is an evaluation policy rather
than a game rule.

## 한국어 요약

- 9×9 보드에서 흑이 선공한다.
- 각자 왕 1개와 손의 호위 8개로 시작한다.
- 한 턴에는 호위 하나를 착수하거나, 보드 위 말 하나를 이동한다.
- 왕은 빈 칸으로 8방향 한 칸, 호위는 4방향 한 칸 이동한다.
- 호위는 상대 호위와 왕을 잡을 수 있고 왕은 잡을 수 없다.
- 호위는 양쪽 목적지 칸에 착수하거나 정상 이동으로 멈출 수 없다.
- 왕의 목적지 도달, 상대 왕 포획·포위, 상대의 합법 수 소진으로 승리한다.
