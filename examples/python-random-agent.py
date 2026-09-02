#!/usr/bin/env python3
"""Minimal external agent: one JSON request in, one JSON response out."""

import json
import random
import sys

random.seed(1)

for line in sys.stdin:
    request = json.loads(line)
    legal_moves = request["observation"]["legalMoves"]
    response = {"move": random.choice(legal_moves)}
    print(json.dumps(response), flush=True)
