export interface RuleConfig {
  boardSize: number;
  guardCount: number;
  goalCells: 'full-row' | 'center-3' | 'center-1';
  placement: 'adjacent' | 'own-half';
  guardMove: 'step' | 'slide';
  kingSurroundLoss: boolean;
  noGuardOnGoal: boolean;
  kingCapture: boolean;
}

export const RULESET_ID = 'mongjin-standard-1.0' as const;

export const DEFAULT_CONFIG: Readonly<RuleConfig> = Object.freeze({
  boardSize: 9,
  guardCount: 8,
  goalCells: 'center-3',
  placement: 'adjacent',
  guardMove: 'step',
  kingSurroundLoss: true,
  noGuardOnGoal: true,
  kingCapture: true,
});
