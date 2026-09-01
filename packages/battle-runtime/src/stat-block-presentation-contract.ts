import type { StatBlockProcedureOrdinal } from "../../surface/src/surface/stat-block-types.ts";
import {
  STAT_BLOCK_PROCEDURE_SECTIONS,
  type StatBlockProcedureSection,
} from "./procedure-execution/stat-block-procedure-sections.ts";

export const STAT_BLOCK_ACTION_PROJECTION_SECTIONS =
  STAT_BLOCK_PROCEDURE_SECTIONS;
export type StatBlockActionProjectionSection = StatBlockProcedureSection;

export const STAT_BLOCK_PROCEDURE_PRESENTATION_KINDS = [
  "attack",
  "multiattack",
  "bonusActionOption",
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
  "spellcasting",
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
