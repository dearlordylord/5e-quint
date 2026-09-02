export const ATTACK_PRESENTATION_SIMPLE_JOIN_ISSUE_REASONS = [
  "characterContextMissing",
  "weaponPresentationMissing",
  "statBlockAdmissionMissing",
  "statBlockPresentationMissing",
] as const;

export const ATTACK_PRESENTATION_JOIN_ISSUE_REASONS = [
  ...ATTACK_PRESENTATION_SIMPLE_JOIN_ISSUE_REASONS,
  "statBlockProcedurePresentationJoin",
] as const;

export type AttackPresentationJoinIssueReason =
  (typeof ATTACK_PRESENTATION_JOIN_ISSUE_REASONS)[number];

export type AttackPresentationJoinIssue =
  | {
      readonly tag: "attackPresentationJoinIssue";
      readonly reason: (typeof ATTACK_PRESENTATION_SIMPLE_JOIN_ISSUE_REASONS)[number];
    }
  | {
      readonly tag: "attackPresentationJoinIssue";
      readonly reason: "statBlockProcedurePresentationJoin";
      readonly issues: import("@dnd/shared/types").ReadonlyNonEmptyArray<
        import("./stat-block-presentation-contract.ts").StatBlockProcedurePresentationJoinIssue
      >;
    };
