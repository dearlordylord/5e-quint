// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.d20-test-die-minimum
// KERNEL-COVERAGE: runtime-owner BATTLE.D20_TEST.DIE_MINIMUM
// The D20 Test die minimum: a feature that lets its holder count a low d20 as
// a higher face on some D20 Tests (classes.md, Rogue, Reliable Talent: "you
// can treat a d20 roll of 9 or lower as a 10"). The ability check hole
// projects the minimum when the check uses one of the roller's own
// proficiencies; the fill says whether the roller used it, and the table's
// totals count it.

import type { Skill } from "@dnd/surface/surface/types";
import { Match } from "effect";

import {
  D20_TEST_DIE_MINIMUM_EFFECT_KIND,
  type BattleAbilityCheckHole,
  type BattleCreatureState,
  type BattleD20TestDieMinimumOption,
  type BattleFill,
} from "../battle-state-execution.ts";
import { characterUnitProcedureBindings } from "../character-execution-queries.ts";
import { combatantSkillProficiencies } from "./druid-wild-shape.ts";

export const D20_TEST_DIE_MINIMUM_DECISION_REQUIRED_MESSAGE =
  "Ability check with a d20 minimum requires an explicit use or decline decision.";
export const D20_TEST_DIE_MINIMUM_UNAVAILABLE_MESSAGE =
  "Ability check d20 minimum is not available for this check.";

/** The lowest d20 face that counts on a D20 Test whose roller uses a minimum. */
export type D20TestDieMinimumFace =
  BattleD20TestDieMinimumOption["minimumDieFace"];

type AbilityCheckValue = Extract<
  BattleFill,
  { readonly kind: "abilityCheck" }
>["value"];

/**
 * The d20 minimum the roller's features offer on an ability check with
 * `skill`: present when a feature applies to ability checks that use the
 * roller's own proficiency and the roller is proficient in the skill.
 */
export function abilityCheckD20TestDieMinimumOption(
  actor: BattleCreatureState | undefined,
  skill: Skill,
): BattleD20TestDieMinimumOption | undefined {
  if (actor?.origin.kind !== "character") return undefined;
  if (!combatantSkillProficiencies(actor).includes(skill)) return undefined;
  const faces = characterUnitProcedureBindings(actor.origin.execution).flatMap(
    ({ procedure }) =>
      procedure.kind === "unitFeature" &&
      procedure.execution.kind === "d20TestDieMinimum" &&
      procedure.execution.dieMinimum.appliesTo ===
        "abilityCheckUsingOwnProficiency"
        ? [procedure.execution.dieMinimum.minimumDieFace]
        : [],
  );
  const [face, ...others] = faces;
  if (face === undefined) return undefined;
  const highest = others.reduce<D20TestDieMinimumFace>(
    (best, next) => (next > best ? next : best),
    face,
  );
  return {
    effectKind: D20_TEST_DIE_MINIMUM_EFFECT_KIND,
    label: `D20 Test d20 minimum ${highest}`,
    minimumDieFace: highest,
  };
}

/** Where an ability check fill's d20 minimum decision stands. */
export type AbilityCheckD20TestDieMinimum =
  | { readonly tag: "invalid"; readonly issue: string }
  | {
      readonly tag: "admitted";
      /** The minimum the fill's totals count, or undefined when none does. */
      readonly countedMinimum: D20TestDieMinimumFace | undefined;
    };

/**
 * Checks the fill's d20 minimum decision against the hole: the fill decides
 * exactly when the hole offers a minimum.
 */
export function abilityCheckD20TestDieMinimum(
  hole: Pick<BattleAbilityCheckHole, "d20TestDieMinimum"> | undefined,
  value: AbilityCheckValue,
): AbilityCheckD20TestDieMinimum {
  const option = hole?.d20TestDieMinimum;
  const decision = value.d20TestDieMinimum;
  if (option === undefined) {
    return decision === undefined
      ? { tag: "admitted", countedMinimum: undefined }
      : { tag: "invalid", issue: D20_TEST_DIE_MINIMUM_UNAVAILABLE_MESSAGE };
  }
  if (decision === undefined) {
    return {
      tag: "invalid",
      issue: D20_TEST_DIE_MINIMUM_DECISION_REQUIRED_MESSAGE,
    };
  }
  return {
    tag: "admitted",
    countedMinimum: Match.value(decision.kind).pipe(
      Match.when("use", () => option.minimumDieFace),
      Match.when("decline", () => undefined),
      Match.exhaustive,
    ),
  };
}
