// KERNEL-COVERAGE: runtime-owner BATTLE.MOVEMENT.SPEED_COLLECTOR
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants
//
// Every Speed reader asks this collector what changes a creature's Speed.
// Each source is written once here, with its name.
//
// RAW:
// - .references/srd-5.2.1/rules-glossary.md, "Speed", "Changes to Your
//   Speeds": "If an effect increases or decreases your Speed for a time, any
//   special speed you have increases or decreases by an equal amount".
// - "Grappled", "Paralyzed", "Petrified", "Restrained" and "Unconscious":
//   "Speed 0. Your Speed is 0 and can't increase."
// - .references/srd-5.2.1/equipment.md, "Strength": "that armor reduces the
//   wearer's speed by 10 feet unless the wearer has a Strength score equal to
//   or higher than the listed score."
// - .references/srd-5.2.1/equipment.md, "Slow": "you can reduce its Speed by
//   10 feet ... If the creature is hit more than once by weapons that have
//   this property, the Speed reduction doesn't exceed 10 feet."
// - .references/srd-5.2.1/classes.md, "Hamstring Blow": "The target's Speed
//   is reduced by 15 feet ... A target can be affected by only one Hamstring
//   Blow at a time".
import { Match } from "effect";
import { movementDeltaFeet, type MovementDeltaFeet } from "@dnd/shared/types";
import {
  hasCondition,
  type ConditionFlag,
} from "@dnd/shared-algebras/conditions-algebra";
import type { SpeedChange } from "@dnd/shared-algebras/speed-algebra";
import type {
  BattleCreatureState,
  BattleState,
} from "../battle-state-execution.ts";
import type { PassiveSpeedBonusCondition } from "../unit-feature-execution-constants.ts";
import {
  combatantWearingArmor,
  combatantWearingArmorCategory,
  combatantWieldingShield,
} from "./creature-state-leaves.ts";
import { combatantD20AbilityScore } from "./druid-wild-shape.ts";
import {
  HEAVY_ARMOR_STRENGTH_SPEED_REDUCTION_FEET,
  SPEED_HALVED_RATIO,
} from "./domain-constants.ts";
import { boundSaveGatedTurnConstraintBundleEffect } from "./spell-modifier-binding.ts";

export const SPEED_DELTA_SOURCES = [
  "passiveFeature",
  "spellEffect",
  "weaponMasterySlow",
  "hamstringBlow",
  "heavyArmorStrength",
] as const;
export type SpeedDeltaSource = (typeof SPEED_DELTA_SOURCES)[number];

export const SPEED_RATIO_SOURCES = [
  "spellEffect",
  "turnConstraint",
  "halvedEffect",
] as const;
export type SpeedRatioSource = (typeof SPEED_RATIO_SOURCES)[number];

export const SPEED_ZERO_SOURCES = [
  "grappleLink",
  "targetCondition",
  "selfSpeedZeroEffect",
  "spellSpeedZeroEffect",
  "areaControlEffect",
] as const;
export type SpeedZeroSource = (typeof SPEED_ZERO_SOURCES)[number];

/** The conditions whose "Speed 0" holds a creature's every speed at 0. */
export const SPEED_ZERO_CONDITIONS = [
  "grappled",
  "paralyzed",
  "petrified",
  "restrained",
  "unconscious",
] as const satisfies readonly ConditionFlag[];
export type SpeedZeroCondition = (typeof SPEED_ZERO_CONDITIONS)[number];

/** One named source that changes a creature's Speed. */
export type SpeedContribution =
  | {
      readonly role: "delta";
      readonly source: SpeedDeltaSource;
      readonly deltaFeet: MovementDeltaFeet;
    }
  | {
      readonly role: "ratio";
      readonly source: SpeedRatioSource;
      readonly numerator: number;
      readonly denominator: number;
    }
  | {
      readonly role: "zero";
      readonly source: Exclude<SpeedZeroSource, "targetCondition">;
    }
  | {
      readonly role: "zero";
      readonly source: "targetCondition";
      readonly condition: SpeedZeroCondition;
    };

/** Every source that changes the creature's Speed now, each named once. */
export function speedContributions(
  state: BattleState,
  combatant: BattleCreatureState,
): readonly SpeedContribution[] {
  return [
    ...deltaContributions(state, combatant),
    ...ratioContributions(state, combatant),
    ...zeroContributions(state, combatant),
  ];
}

/** The deltas and ratios the speed algebra applies, in contribution order. */
export function speedChangesFromContributions(
  contributions: readonly SpeedContribution[],
): readonly SpeedChange[] {
  return contributions.flatMap((contribution): readonly SpeedChange[] =>
    Match.value(contribution).pipe(
      Match.when({ role: "delta" }, ({ deltaFeet }) => [
        { kind: "delta" as const, deltaFeet },
      ]),
      Match.when({ role: "ratio" }, ({ numerator, denominator }) => [
        { kind: "ratio" as const, numerator, denominator },
      ]),
      Match.when({ role: "zero" }, () => []),
      Match.exhaustive,
    ),
  );
}

/** Whether a source holds every speed at 0. */
export function speedIsZeroFromContributions(
  contributions: readonly SpeedContribution[],
): boolean {
  return contributions.some((contribution) => contribution.role === "zero");
}

function delta(
  source: SpeedDeltaSource,
  deltaFeet: number,
): readonly SpeedContribution[] {
  return deltaFeet === 0
    ? []
    : [{ role: "delta", source, deltaFeet: movementDeltaFeet(deltaFeet) }];
}

function deltaContributions(
  state: BattleState,
  combatant: BattleCreatureState,
): readonly SpeedContribution[] {
  return [
    ...delta("passiveFeature", passiveSpeedBonusDelta(state, combatant)),
    ...combatant.activeEffects.flatMap((effect) =>
      effect.kind === "speedDelta"
        ? delta("spellEffect", Number(effect.deltaFeet))
        : [],
    ),
    ...delta("weaponMasterySlow", masterySpeedReductionDelta(combatant)),
    ...combatant.activeEffects.flatMap((effect) =>
      effect.kind === "brutalStrikeHamstring"
        ? delta("hamstringBlow", Number(effect.effect.deltaFeet))
        : [],
    ),
    ...delta("heavyArmorStrength", heavyArmorStrengthDelta(state, combatant)),
  ];
}

// Each Slow keeps its own end, at the start of its attacker's next turn, so
// every one stays on the creature, and together they reduce its Speed only by
// the largest one.
function masterySpeedReductionDelta(combatant: BattleCreatureState): number {
  return -Math.max(
    0,
    ...combatant.activeEffects.flatMap((effect) =>
      effect.kind === "weaponMasterySpeedReduction"
        ? [Number(effect.reductionFeet)]
        : [],
    ),
  );
}

function heavyArmorStrengthDelta(
  state: BattleState,
  combatant: BattleCreatureState,
): number {
  if (combatant.origin.kind !== "character") return 0;
  const strengthRequirement =
    combatant.origin.selectedLoadout.armor?.strengthRequirement;
  return strengthRequirement !== undefined &&
    combatantWearingArmor(state, combatant) &&
    combatantD20AbilityScore(combatant, "str") < Number(strengthRequirement)
    ? -HEAVY_ARMOR_STRENGTH_SPEED_REDUCTION_FEET
    : 0;
}

function ratioContributions(
  state: BattleState,
  combatant: BattleCreatureState,
): readonly SpeedContribution[] {
  const turnConstraint = combatant.activeEffects.flatMap((effect) => {
    if (effect.kind !== "saveGatedTurnConstraintBundle") return [];
    const bound = boundSaveGatedTurnConstraintBundleEffect(state, effect);
    return bound === undefined ? [] : [bound.constraints.speedRatio];
  })[0];
  const halved = combatant.activeEffects.some(
    (effect) => effect.kind === "speedHalved",
  );
  return [
    ...combatant.activeEffects.flatMap(
      (effect): readonly SpeedContribution[] =>
        effect.kind === "speedRatio"
          ? [
              {
                role: "ratio",
                source: "spellEffect",
                numerator: effect.numerator,
                denominator: effect.denominator,
              },
            ]
          : [],
    ),
    ...(turnConstraint === undefined
      ? []
      : [
          {
            role: "ratio" as const,
            source: "turnConstraint" as const,
            numerator: turnConstraint.numerator,
            denominator: turnConstraint.denominator,
          },
        ]),
    ...(halved
      ? [
          {
            role: "ratio" as const,
            source: "halvedEffect" as const,
            ...SPEED_HALVED_RATIO,
          },
        ]
      : []),
  ];
}

function zeroContributions(
  state: BattleState,
  combatant: BattleCreatureState,
): readonly SpeedContribution[] {
  const hasEffect = (
    kind: BattleCreatureState["activeEffects"][number]["kind"],
  ) => combatant.activeEffects.some((effect) => effect.kind === kind);
  return [
    // A grapple link holds the target even before its condition is set.
    ...(state.grapples.some(
      (grapple) => grapple.targetId === combatant.combatantId,
    )
      ? [{ role: "zero" as const, source: "grappleLink" as const }]
      : []),
    ...SPEED_ZERO_CONDITIONS.filter((condition) =>
      hasCondition(combatant.conditions, condition),
    ).map((condition) => ({
      role: "zero" as const,
      source: "targetCondition" as const,
      condition,
    })),
    ...(hasEffect("selfSpeedZero")
      ? [{ role: "zero" as const, source: "selfSpeedZeroEffect" as const }]
      : []),
    ...(hasEffect("spellSpeedZero")
      ? [{ role: "zero" as const, source: "spellSpeedZeroEffect" as const }]
      : []),
    ...(hasEffect("saveGatedAreaControl")
      ? [{ role: "zero" as const, source: "areaControlEffect" as const }]
      : []),
  ];
}

/** The Speed bonus a character's passive features give it now, in feet. */
export function passiveSpeedBonusDelta(
  state: BattleState,
  combatant: BattleCreatureState,
): number {
  if (combatant.origin.kind !== "character") {
    return 0;
  }
  let total = 0;
  for (const binding of combatant.origin.execution.procedureBindings) {
    const procedure = binding.procedure;
    if (
      (procedure.kind !== "unitFeature" &&
        procedure.kind !== "unitSupportProfile") ||
      typeof procedure.execution !== "object"
    ) {
      continue;
    }
    const speed =
      procedure.execution.kind === "passiveSpeedBonus"
        ? procedure.kind === "unitFeature"
          ? procedure.execution.speed
          : procedure.execution
        : procedure.execution.kind === "passiveSpeedKindGrants"
          ? procedure.kind === "unitFeature"
            ? procedure.execution.speedKindGrants.speed
            : procedure.execution.speed
          : undefined;
    if (
      speed !== undefined &&
      passiveSpeedBonusConditionApplies(state, combatant, speed.condition)
    ) {
      total += Number(speed.deltaFeet);
    }
  }
  return total;
}

function passiveSpeedBonusConditionApplies(
  state: BattleState,
  combatant: BattleCreatureState,
  condition: PassiveSpeedBonusCondition,
): boolean {
  return Match.value(condition).pipe(
    Match.when(
      { kind: "notWearingArmor" },
      ({ categories }) =>
        !categories.some((category) =>
          combatantWearingArmorCategory(state, combatant, category),
        ),
    ),
    Match.when(
      { kind: "unarmoredUnshielded" },
      () =>
        !combatantWearingArmor(state, combatant) &&
        !combatantWieldingShield(state, combatant),
    ),
    Match.exhaustive,
  );
}
