import type { StatBlockId } from "@dnd/shared/game-facts";
import type { ReadonlyNonEmptyArray, Size } from "@dnd/shared/types";
import type {
  StatBlockProcedureOrdinal,
  StatBlockProcedureResourceOrdinal,
} from "@dnd/surface/surface/stat-block-types";
import { Match } from "effect";

import type { StatBlockProcedureSection } from "./procedure-execution/stat-block-procedure-sections.ts";
import type { StatBlockRuntimeResourceParseFailure } from "./stat-block-execution-state.ts";

export type BattleStatBlockUnsupportedProcedureBinding = {
  readonly section: StatBlockProcedureSection;
  readonly procedureOrdinal: StatBlockProcedureOrdinal;
};

export type BattleStatBlockInvalidResourceDeclaration = {
  readonly ordinal: StatBlockProcedureResourceOrdinal;
  readonly reason: StatBlockRuntimeResourceParseFailure;
};

export type BattleStatBlockProjectionScalarFailureReason =
  | "nonLiteralSize"
  | "unresolvedGmSpeedChoice"
  | "unsupportedFormRestrictedSpeed"
  | "unsupportedQualifiedConditionImmunity"
  | "unsupportedLairConditionalLegendaryActionUses";

export type BattleStatBlockProjectionFailure =
  | {
      readonly tag: "battleStatBlockProjectionFailure";
      readonly reason: BattleStatBlockProjectionScalarFailureReason;
      readonly procedureOrdinal?: never;
      readonly section?: never;
    }
  | {
      readonly tag: "battleStatBlockProjectionFailure";
      readonly reason: "invalidSizeSelection";
      readonly statBlockId: StatBlockId;
      readonly selectedSize: Size;
      readonly availableSizes: ReadonlyNonEmptyArray<Size>;
      readonly procedureOrdinal?: never;
      readonly section?: never;
    }
  | {
      readonly tag: "battleStatBlockProjectionFailure";
      readonly reason: "inapplicableSizeSelection";
      readonly statBlockId: StatBlockId;
      readonly selectedSize: Size;
      readonly authoredSize: Size;
      readonly procedureOrdinal?: never;
      readonly section?: never;
    }
  | {
      readonly tag: "battleStatBlockProjectionFailure";
      readonly reason: "invalidResourceLimit";
      readonly issues: ReadonlyNonEmptyArray<BattleStatBlockInvalidResourceDeclaration>;
      readonly procedureOrdinal?: never;
      readonly section?: never;
    }
  | {
      readonly tag: "battleStatBlockProjectionFailure";
      readonly reason: "unsupportedProcedureBinding";
      readonly issues: ReadonlyNonEmptyArray<BattleStatBlockUnsupportedProcedureBinding>;
      readonly procedureOrdinal?: never;
      readonly section?: never;
    };

export function battleStatBlockProjectionFailureMessage(
  failure: BattleStatBlockProjectionFailure,
  prefix = "Stat Block authored projection failed",
): string {
  const location =
    failure.reason === "unsupportedProcedureBinding"
      ? ` in ${failure.issues
          .map(
            ({ section, procedureOrdinal }) =>
              `${section} procedure ${String(procedureOrdinal)}`,
          )
          .join(", ")}`
      : "";
  const reason = Match.value(failure.reason).pipe(
    Match.when(
      "nonLiteralSize",
      () => "battle initialization requires a concrete Size",
    ),
    Match.when(
      "unresolvedGmSpeedChoice",
      () =>
        "battle initialization requires the GM's Table Decision selecting one authored Speed alternative",
    ),
    Match.when(
      "unsupportedFormRestrictedSpeed",
      () =>
        "battle initialization does not own the active form needed to select a form-restricted Speed",
    ),
    Match.when(
      "unsupportedQualifiedConditionImmunity",
      () =>
        "battle initialization cannot apply a qualified condition Immunity without its qualifying state",
    ),
    Match.when(
      "unsupportedLairConditionalLegendaryActionUses",
      () =>
        "battle initialization does not own the lair context needed to select Legendary Action uses",
    ),
    Match.when(
      "invalidSizeSelection",
      () =>
        "the selected Size is not authored for this Stat Block; choose one of the exposed authored alternatives",
    ),
    Match.when(
      "inapplicableSizeSelection",
      () =>
        "a Size choice is inapplicable because this Stat Block has a fixed Size",
    ),
    Match.when(
      "invalidResourceLimit",
      () => "battle initialization requires valid Stat Block resource limits",
    ),
    Match.when(
      "unsupportedProcedureBinding",
      () => "the procedure binding is not supported by battle execution",
    ),
    Match.exhaustive,
  );
  return `${prefix}${location}: ${reason}.`;
}
