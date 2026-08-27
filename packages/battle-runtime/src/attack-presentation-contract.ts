export const ATTACK_PRESENTATION_JOIN_ISSUE_REASONS = [
  "characterContextMissing",
  "weaponPresentationMissing",
  "statBlockAdmissionMissing",
  "statBlockPresentationMissing",
] as const;

export type AttackPresentationJoinIssueReason =
  (typeof ATTACK_PRESENTATION_JOIN_ISSUE_REASONS)[number];

export type AttackPresentationJoinIssue = {
  readonly tag: "attackPresentationJoinIssue";
  readonly reason: AttackPresentationJoinIssueReason;
};
