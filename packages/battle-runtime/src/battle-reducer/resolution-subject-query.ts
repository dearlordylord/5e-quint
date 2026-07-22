import type { CharacterProcedureBattleSubject } from "../battle-subjects.ts";
import {
  BONUS_ACTION_STANDARD_ACTION_PROCEDURE_QUERY,
  CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY,
  DRUID_WILD_SHAPE_PROCEDURE_QUERY,
  MONK_FOCUS_PROCEDURE_QUERY,
  type CharacterUnitProcedureQuery,
} from "../character-execution-admission.ts";
import { Match } from "effect";

export type UnitProcedureSubject = Extract<
  CharacterProcedureBattleSubject,
  {
    readonly tag:
      | "unitFeature"
      | "unitFeatureHeldWeaponActivation"
      | "druidWildShape"
      | "bonusActionStandardAction"
      | "monkFocusOption";
  }
>;

/** The mechanical procedure family selected by an executable subject shape. */
export function characterUnitProcedureQueryForSubject(
  subject: UnitProcedureSubject,
): CharacterUnitProcedureQuery {
  return Match.value(subject).pipe(
    Match.discriminatorsExhaustive("tag")({
      unitFeature: () => CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY,
      unitFeatureHeldWeaponActivation: () =>
        CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY,
      druidWildShape: () => DRUID_WILD_SHAPE_PROCEDURE_QUERY,
      bonusActionStandardAction: () =>
        BONUS_ACTION_STANDARD_ACTION_PROCEDURE_QUERY,
      monkFocusOption: () => MONK_FOCUS_PROCEDURE_QUERY,
    }),
  );
}
