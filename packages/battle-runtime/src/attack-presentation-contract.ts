import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import type { StatBlockProcedurePresentationJoinIssue } from "./stat-block-presentation-contract.ts";

export const ATTACK_PRESENTATION_JOIN_ISSUE_REASONS = [
  "characterContextMissing",
  "weaponPresentationMissing",
  "statBlockAdmissionMissing",
  "statBlockPresentationMissing",
] as const;

export type AttackPresentationJoinIssueReason =
  | (typeof ATTACK_PRESENTATION_JOIN_ISSUE_REASONS)[number]
  | "statBlockProcedurePresentationJoin";

export type AttackPresentationJoinIssue =
  | {
      readonly tag: "attackPresentationJoinIssue";
      readonly reason: (typeof ATTACK_PRESENTATION_JOIN_ISSUE_REASONS)[number];
    }
  | {
      readonly tag: "attackPresentationJoinIssue";
      readonly reason: "statBlockProcedurePresentationJoin";
      readonly issues: ReadonlyNonEmptyArray<StatBlockProcedurePresentationJoinIssue>;
    };
