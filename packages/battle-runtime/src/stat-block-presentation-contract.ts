import type { StatBlockProcedureOrdinal } from "@dnd/surface/surface/types";

export const STAT_BLOCK_ACTION_PROJECTION_SECTIONS = [
  "actions",
  "bonusActions",
  "reactions",
  "legendaryActions",
] as const;
export type StatBlockActionProjectionSection =
  (typeof STAT_BLOCK_ACTION_PROJECTION_SECTIONS)[number];

export const STAT_BLOCK_PROCEDURE_PRESENTATION_KINDS = [
  "attack",
  "multiattack",
  "bonusActionOption",
  "save",
  "support",
  "spellcasting",
  "textOnly",
] as const;
export type StatBlockProcedurePresentationKind =
  (typeof STAT_BLOCK_PROCEDURE_PRESENTATION_KINDS)[number];
export type StatBlockAuthoredProcedurePresentationKind = Exclude<
  StatBlockProcedurePresentationKind,
  "textOnly"
>;

export const STAT_BLOCK_EXECUTABLE_PROCEDURE_KINDS = [
  "attack",
  "multiattack",
  "bonusActionOption",
] as const;
export type StatBlockExecutableProcedureKind =
  (typeof STAT_BLOCK_EXECUTABLE_PROCEDURE_KINDS)[number];

export type StatBlockProcedurePresentationJoinIssue =
  | {
      readonly tag: "statBlockProcedurePresentationJoinIssue";
      readonly reason: "missingPresentation";
      readonly section: StatBlockActionProjectionSection;
      readonly procedureOrdinal: StatBlockProcedureOrdinal;
      readonly executionKind: StatBlockExecutableProcedureKind;
    }
  | {
      readonly tag: "statBlockProcedurePresentationJoinIssue";
      readonly reason: "presentationKindMismatch";
      readonly section: StatBlockActionProjectionSection;
      readonly procedureOrdinal: StatBlockProcedureOrdinal;
      readonly executionKind: StatBlockExecutableProcedureKind;
      readonly presentationKind: StatBlockProcedurePresentationKind;
    };
