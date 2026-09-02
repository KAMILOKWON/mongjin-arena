# Channel derivatives

## X / Threads

### 1/3

처음 보는 추상전략게임의 첫 수를 AI에게 맡기면 서로 같은 선택을 할까요?

몽진은 왕을 호위해 9×9 보드 반대편의 목표 칸까지 보내는 2인 완전정보 게임입니다. 호위로 길을 만들면서 상대의 진격을 막아야 합니다.

### 2/3

Gemini, Codex, Kimi K3, Grok에게 같은 규칙과 여섯 개 합법 수를 제공했습니다. 검색 없이 수 하나와 짧은 근거만 반환하게 했습니다.

Claude(클로드)는 예산 문제로 구독하지 않았기 때문에 이번 실험에서 제외했습니다.

### 3/3

결과는 4/4 모두 합법 수였습니다. 네 모델 전부 흑 왕 앞 `(7,4)`에 호위를 배치했습니다.

같은 결론, 다른 자신감: Gemini 0.95 / Grok 0.74 / Codex 0.68 / Kimi 0.55.
한 위치에서 한 번 관찰한 결과이므로 모델 순위나 최적 수의 증명은 아닙니다.

다음에는 자동화가 안정적인 Codex부터 Greedy 봇과 한 판 전체를 진행하겠습니다.

실험 기록: https://github.com/KAMILOKWON/mongjin-arena/tree/69a99eb3568f833086191a94c71e8f7c0faf67d0/experiments/exp-002-four-model-first-move

## GeekNews / Disquiet

몽진은 왕을 호위해 9×9 보드 반대편의 목표 칸까지 보내는 2인 완전정보 추상전략게임입니다. 이 게임을 AI 에이전트 실험장으로 공개하는 첫 단계로 Gemini, Codex, Kimi K3, Grok에 동일한 규칙과 초기 위치를 주고 첫 수 하나를 선택하게 했습니다. Claude(클로드)는 예산 문제로 구독하지 않아 이번 실험에서 제외했습니다. 네 모델 모두 합법 수를 반환했고, 전부 왕 앞 `(7,4)` 호위 배치를 골랐습니다. 모델 순위가 아니라 규칙 이해와 첫 전략 직관을 관찰한 개발 기록이며, 프롬프트와 원문 응답을 모두 공개합니다. https://github.com/KAMILOKWON/mongjin-arena/tree/69a99eb3568f833086191a94c71e8f7c0faf67d0/experiments/exp-002-four-model-first-move

## YouTube title candidates

1. Gemini·Codex·Kimi·Grok에게 처음 보는 보드게임을 맡겨봤습니다
2. 네 AI는 몽진의 첫 수로 무엇을 골랐을까요?
3. AI마다 첫 수가 다를까요? 직접 만든 전략게임으로 실험했습니다
