export type BattlePositiveHpUnconscious = {
  readonly tag: "knockedOut";
};

export const KNOCKED_OUT_UNCONSCIOUS = {
  tag: "knockedOut",
} as const satisfies BattlePositiveHpUnconscious;
