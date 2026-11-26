// KERNEL-COVERAGE: runtime-owner BATTLE.ARMOR_CLASS.COLLECTOR
// KERNEL-COVERAGE: runtime-owner BATTLE.ATTACK.TARGET_COVER
import {
  applyingArmorClassBonuses,
  armorClass,
  baseArmorClassValue,
  type ArmorClass,
  type ArmorClassBaseSource,
  type ArmorClassBonusSource,
  type ArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import {
  coverArmorClassBonus,
  type DirectTargetCover,
} from "@dnd/shared-algebras/cover-algebra";
import { Match } from "effect";
import type {
  BattleCreatureState,
  BattleState,
} from "../battle-state-execution.ts";
import { characterEffectiveLoadoutFromOrigin } from "./character-effective-loadout.ts";
import {
  handUseWithUnheldLoadout,
  unheldLoadoutObjects,
} from "./creature-state-leaves.ts";
import { LINKED_DEFENSE_DAMAGE_SHARE_ARMOR_CLASS_BONUS } from "./domain-constants.ts";
import { combatantDruidWildShapeArmorClassState } from "./druid-wild-shape.ts";
import { boundSaveGatedTurnConstraintBundleEffect } from "./spell-modifier-binding.ts";

/**
 * The base AC calculations a creature can have, each named for what it is
 * (SRD Playing the Game, "Armor Class": "Only One Base AC").
 */
export const ARMOR_CLASS_BASE_CALCULATION_SOURCES = [
  "wornArmor",
  "statBlock",
  "defaultUnarmored",
  "classFeatureCalculation",
  "spellBaseCalculation",
] as const;
export type ArmorClassBaseCalculationSource =
  (typeof ARMOR_CLASS_BASE_CALCULATION_SOURCES)[number];

/** Every source of a bonus or penalty to a creature's AC. */
export const ARMOR_CLASS_MODIFIER_SOURCES = [
  "wieldedShield",
  "wornArmorFeature",
  "unarmoredFeature",
  "featureBonus",
  "spellBonus",
  "linkedDefense",
  "turnConstraintPenalty",
] as const;
export type ArmorClassModifierSource =
  (typeof ARMOR_CLASS_MODIFIER_SOURCES)[number];

/** Every source of a floor under a creature's AC. */
export const ARMOR_CLASS_FLOOR_SOURCES = [
  "featureFloor",
  "spellFloor",
] as const;
export type ArmorClassFloorSource = (typeof ARMOR_CLASS_FLOOR_SOURCES)[number];

/** One named part of the AC an attack roll must meet. */
export type ArmorClassContribution =
  | {
      readonly role: "baseCalculation";
      readonly source: ArmorClassBaseCalculationSource;
      readonly armorClass: number;
    }
  | {
      readonly role: "modifier";
      readonly source: ArmorClassModifierSource;
      readonly delta: number;
    }
  | {
      readonly role: "floor";
      readonly source: ArmorClassFloorSource;
      readonly armorClass: ArmorClass;
    }
  | {
      readonly role: "cover";
      readonly source: "cover";
      readonly delta: number;
    };

type BaseCalculation = {
  readonly source: ArmorClassBaseCalculationSource;
  readonly state: ArmorClassState;
};

/**
 * Every part of the creature's AC, each with its source: the base
 * calculation in effect, each bonus and penalty that applies, each floor, and
 * the bonus of the table-supplied cover when an attack roll asks for it.
 * The snapshot and every attack-roll route ask this one collector.
 */
export function armorClassContributions(
  state: BattleState,
  creature: BattleCreatureState,
  cover: DirectTargetCover | null,
): readonly ArmorClassContribution[] {
  const base = baseCalculationInEffect(baseCalculations(state, creature));
  const coverDelta = cover === null ? 0 : coverArmorClassBonus(cover);
  return [
    {
      role: "baseCalculation",
      source: base.calculation.source,
      armorClass: base.armorClass,
    },
    ...applyingArmorClassBonuses(base.calculation.state).map(
      (bonus): ArmorClassContribution => ({
        role: "modifier",
        source: creatureBonusSource(bonus),
        delta: Number(bonus.bonus),
      }),
    ),
    ...base.calculation.state.floors.map(
      (floor): ArmorClassContribution => ({
        role: "floor",
        source: "featureFloor",
        armorClass: floor.floor,
      }),
    ),
    ...activeEffectContributions(state, creature),
    ...(coverDelta === 0
      ? []
      : [
          {
            role: "cover" as const,
            source: "cover" as const,
            delta: coverDelta,
          },
        ]),
  ];
}

/**
 * The AC from its parts. The base calculation in effect plus every bonus and
 * penalty, raised to the highest floor (Barkskin: "an Armor Class of 17 if its
 * AC is lower than that"), then the cover bonus (A66).
 */
export function armorClassFromContributions(
  contributions: readonly ArmorClassContribution[],
): ArmorClass {
  const parts = contributions.reduce(
    (total, contribution) =>
      Match.value(contribution).pipe(
        Match.when({ role: "baseCalculation" }, ({ armorClass }) => ({
          ...total,
          withModifiers: total.withModifiers + armorClass,
        })),
        Match.when({ role: "modifier" }, ({ delta }) => ({
          ...total,
          withModifiers: total.withModifiers + delta,
        })),
        Match.when({ role: "floor" }, ({ armorClass }) => ({
          ...total,
          floor: Math.max(total.floor, Number(armorClass)),
        })),
        Match.when({ role: "cover" }, ({ delta }) => ({
          ...total,
          cover: total.cover + delta,
        })),
        Match.exhaustive,
      ),
    { withModifiers: 0, floor: Number.NEGATIVE_INFINITY, cover: 0 },
  );
  return armorClass(Math.max(parts.withModifiers, parts.floor) + parts.cover);
}

/** The creature's AC, without cover. */
export function collectedArmorClass(
  state: BattleState,
  creature: BattleCreatureState,
): ArmorClass {
  return armorClassFromContributions(
    armorClassContributions(state, creature, null),
  );
}

/** The AC an attack roll must meet against an admitted creature target. */
export function armorClassAgainstAttack(
  state: BattleState,
  target: BattleCreatureState,
  cover: DirectTargetCover,
): number {
  return Number(
    armorClassFromContributions(armorClassContributions(state, target, cover)),
  );
}

/**
 * The base calculations the creature has: its own (worn armor, a stat block
 * or Wild Shape form, or an unarmored calculation), and a spell's base
 * calculation while it isn't wearing armor (Mage Armor: "a willing creature
 * who isn't wearing armor").
 */
function baseCalculations(
  state: BattleState,
  creature: BattleCreatureState,
): {
  readonly own: BaseCalculation;
  readonly spellCalculations: readonly BaseCalculation[];
} {
  const own =
    combatantDruidWildShapeArmorClassState(creature) ??
    groundEffectiveCharacterArmorClass(state, creature);
  const ownCalculation = { source: baseSource(own.base), state: own };
  if (own.base.kind === "armor")
    return { own: ownCalculation, spellCalculations: [] };
  return {
    own: ownCalculation,
    spellCalculations: creature.activeEffects.flatMap(
      (effect): BaseCalculation[] =>
        effect.kind === "spellBaseArmorClass"
          ? [
              {
                source: "spellBaseCalculation",
                state: {
                  ...own,
                  base: {
                    kind: "ability_sum",
                    base: effect.base,
                    abilityModifiers: [effect.ability],
                    source: "spell_base_plus_ability",
                  },
                },
              },
            ]
          : [],
    ),
  };
}

/**
 * SRD Rules Glossary, "Armor Class": "If a rule gives you another base AC
 * calculation, you choose which calculation to use; you can't use more than
 * one." The creature uses its highest (A67). On a tie its own stays.
 */
function baseCalculationInEffect(calculations: {
  readonly own: BaseCalculation;
  readonly spellCalculations: readonly BaseCalculation[];
}): { readonly calculation: BaseCalculation; readonly armorClass: number } {
  const valued = (calculation: BaseCalculation) => ({
    calculation,
    armorClass: baseArmorClassValue(calculation.state),
  });
  return calculations.spellCalculations
    .map(valued)
    .reduce(
      (best, candidate) =>
        candidate.armorClass > best.armorClass ? candidate : best,
      valued(calculations.own),
    );
}

function baseSource(
  base: ArmorClassBaseSource,
): ArmorClassBaseCalculationSource {
  return Match.value(base).pipe(
    Match.when({ kind: "armor" }, () => "wornArmor" as const),
    Match.when({ kind: "stat_block" }, () => "statBlock" as const),
    Match.when(
      { kind: "ability_sum", source: "default_unarmored" },
      () => "defaultUnarmored" as const,
    ),
    Match.when(
      { kind: "ability_sum", source: "unarmored_defense" },
      () => "classFeatureCalculation" as const,
    ),
    Match.when(
      { kind: "ability_sum", source: "class_feature_base_plus_ability" },
      () => "classFeatureCalculation" as const,
    ),
    Match.when(
      { kind: "ability_sum", source: "spell_base_plus_ability" },
      () => "spellBaseCalculation" as const,
    ),
    Match.exhaustive,
  );
}

function creatureBonusSource(
  bonus: ArmorClassBonusSource,
): ArmorClassModifierSource {
  return Match.value(bonus).pipe(
    Match.when({ kind: "shield" }, () => "wieldedShield" as const),
    Match.when({ kind: "wearing_armor" }, () => "wornArmorFeature" as const),
    Match.when(
      { kind: "unarmored_no_shield" },
      () => "unarmoredFeature" as const,
    ),
    Match.when({ kind: "flat" }, () => "featureBonus" as const),
    Match.exhaustive,
  );
}

function activeEffectContributions(
  state: BattleState,
  creature: BattleCreatureState,
): readonly ArmorClassContribution[] {
  const effectContributions = creature.activeEffects.flatMap(
    (effect): ArmorClassContribution[] => {
      if (effect.kind === "spellArmorClassBonus")
        return [
          { role: "modifier", source: "spellBonus", delta: effect.bonus },
        ];
      if (effect.kind === "linkedDefenseResistanceDamageShare")
        return [
          {
            role: "modifier",
            source: "linkedDefense",
            delta: LINKED_DEFENSE_DAMAGE_SHARE_ARMOR_CLASS_BONUS,
          },
        ];
      if (effect.kind === "spellArmorClassFloor")
        return [
          { role: "floor", source: "spellFloor", armorClass: effect.floor },
        ];
      return [];
    },
  );
  const turnConstraint = creature.activeEffects.flatMap((effect) => {
    if (effect.kind !== "saveGatedTurnConstraintBundle") return [];
    const bound = boundSaveGatedTurnConstraintBundleEffect(state, effect);
    return bound === undefined ? [] : [bound];
  })[0];
  return turnConstraint === undefined
    ? effectContributions
    : [
        ...effectContributions,
        {
          role: "modifier",
          source: "turnConstraintPenalty",
          delta: Number(turnConstraint.constraints.armorClassDelta),
        },
      ];
}

/**
 * A character's own AC state with the armor and Shield it actually has on:
 * grounded or unheld armor and a Shield stop counting, and the unarmored base
 * for its loadout takes over.
 */
function groundEffectiveCharacterArmorClass(
  state: BattleState,
  combatant: BattleCreatureState,
): ArmorClassState {
  if (combatant.origin.kind !== "character") return combatant.armorClass;
  const selected = combatant.origin.selectedLoadout;
  const effective = characterEffectiveLoadoutFromOrigin(
    state,
    combatant.combatantId,
    combatant.origin,
  );
  const armorGrounded =
    selected.armor !== undefined && effective.armor === undefined;
  const unheld = unheldLoadoutObjects(selected, effective);
  const armorAvailable = !armorGrounded;
  const shieldAvailable = !unheld.shield;
  const usesShield = selected.shield !== undefined && shieldAvailable;
  const usesArmoredBase =
    combatant.armorClass.base.kind === "armor" && !armorGrounded;
  return {
    ...combatant.armorClass,
    base: usesArmoredBase
      ? combatant.armorClass.base
      : usesShield
        ? combatant.origin.unarmoredArmorClassBases.shielded
        : combatant.origin.unarmoredArmorClassBases.unshielded,
    bonuses: combatant.armorClass.bonuses.filter((bonus) => {
      if (bonus.kind === "shield") return shieldAvailable;
      if (bonus.kind === "wearing_armor") return armorAvailable;
      return true;
    }),
    leftHandUse: handUseWithUnheldLoadout(
      combatant.armorClass.leftHandUse,
      unheld,
    ),
    rightHandUse: handUseWithUnheldLoadout(
      combatant.armorClass.rightHandUse,
      unheld,
    ),
  };
}
