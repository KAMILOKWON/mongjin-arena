# Mongjin Arena JSONL Protocol 1

Protocol ID: `mongjin-arena-jsonl-1`

Start the server with `npm run arena` or `node dist/cli/arena.js`. Send exactly
one JSON object per line on stdin. The server returns exactly one JSON object
per line on stdout. Diagnostic output must never be written to stdout.

## Commands

### Handshake

```json
{"id":"1","command":"hello"}
```

### Reset

```json
{"id":"2","command":"new_game","gameId":"experiment-1-game-1"}
```

### Observe

```json
{"id":"3","command":"observe"}
```

The observation includes the full board, side to move, guards in hand, legal
moves, ply, terminal result, ruleset ID, protocol ID, and SHA-256 state hash.

Piece encoding:

- `BK`: Black king
- `BG`: Black guard
- `WK`: White king
- `WG`: White guard
- `null`: empty

### Legal moves

```json
{"id":"4","command":"legal_moves"}
```

### Play

```json
{"id":"5","command":"play","move":{"kind":"PLACE","to":{"r":7,"c":4}}}
```

or

```json
{"id":"6","command":"play","move":{"kind":"MOVE","from":{"r":8,"c":4},"to":{"r":7,"c":3}}}
```

### Result and shutdown

```json
{"id":"7","command":"result"}
{"id":"8","command":"quit"}
```

## Errors

Errors use `ok: false` and one of these stable codes:

- `BAD_JSON`
- `BAD_COMMAND`
- `BAD_MOVE`
- `ILLEGAL_MOVE`
- `GAME_OVER`

An illegal move sent through the arena server does not mutate state. In a
competition match, an illegal move is a terminal loss enforced by the runner.
