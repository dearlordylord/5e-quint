// KERNEL-COVERAGE: runtime-owner SHEET.ARMOR_CLASS.BASE_FORMULA_CHOICE
import { Match } from "effect";
import type {
  Ability,
  HandUse,
  ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import type {
  ArmorCategory,
  ArmorAcFormula,
  ArmorTrainingCategory,
} from "@dnd/surface/surface/types";
import {
  armorClass,
  zeroAbilityModifiers,
  type AbilityModifierBlock,
  type ArmorClass,
  type ArmorClassDelta,
} from "./armor-class-values.ts";
export {
  ArmorClassSchema,
  abilityModifier,
  armorClass,
  armorClassDelta,
  zeroAbilityModifiers,
  type AbilityModifier,
  type AbilityModifierBlock,
  type ArmorClass,
  type ArmorClassDelta,
} from "./armor-class-values.ts";

export type ArmorClassBaseSource =
  | {
      readonly kind: "stat_block";
      readonly ac: ArmorClass;
    }
  | {
      readonly kind: "ability_sum";
      readonly base: ArmorClass;
      readonly abilityModifiers: ReadonlyNonEmptyArray<Ability>;
      readonly source: "default_unarmored";
    }
  | {
      readonly kind: "ability_sum";
      readonly base: ArmorClass;
      readonly abilityModifiers: ReadonlyNonEmptyArray<Ability>;
      readonly source: "unarmored_defense" | "class_feature_base_plus_ability";
      readonly sourceUnitId: string;
    }
  | {
      readonly kind: "ability_sum";
      readonly base: ArmorClass;
      readonly abilityModifiers: ReadonlyNonEmptyArray<Ability>;
      readonly source: "spell_base_plus_ability";
    }
  | {
      readonly kind: "armor";
      readonly formula: ArmorAcFormula;
      readonly category: ArmorCategory;
    };

export type ArmorClassBonusSource =
  | {
      readonly kind: "flat";
      readonly bonus: ArmorClassDelta;
      readonly sourceUnitId?: string;
    }
  | {
      readonly kind: "shield";
      readonly bonus: ArmorClassDelta;
      readonly handUse: "shield";
      readonly trainingRequired: "shield";
      readonly sourceUnitId?: string;
    }
  | {
      readonly kind: "unarmored_no_shield";
      readonly bonus: ArmorClassDelta;
      readonly sourceUnitId?: string;
    }
  | {
      readonly kind: "wearing_armor";
      readonly bonus: ArmorClassDelta;
      readonly categories: ReadonlyArray<ArmorCategory>;
      readonly sourceUnitId?: string;
    };

export type ArmorClassFloorSource = {
  readonly floor: ArmorClass;
  readonly sourceUnitId?: string;
};

export type ArmorClassState = {
  readonly abilityModifiers: AbilityModifierBlock;
  readonly base: ArmorClassBaseSource;
  readonly bonuses: ReadonlyArray<ArmorClassBonusSource>;
  readonly floors: ReadonlyArray<ArmorClassFloorSource>;
  readonly armorTraining: ReadonlySet<ArmorTrainingCategory>;
  readonly leftHandUse: HandUse;
  readonly rightHandUse: HandUse;
};

export function defaultArmorClassState(): ArmorClassState {
  return {
    abilityModifiers: zeroAbilityModifiers(),
    base: {
      kind: "ability_sum",
      base: armorClass(10),
      abilityModifiers: ["dex"],
      source: "default_unarmored",
    },
    bonuses: [],
    floors: [],
    armorTraining: new Set(),
    leftHandUse: "free",
    rightHandUse: "free",
  };
}

export function statBlockArmorClassState(value: number): ArmorClassState {
  return {
    ...defaultArmorClassState(),
    base: {
      kind: "stat_block",
      ac: armorClass(value),
    },
  };
}

function abilityModifierValue(
  armorClassState: ArmorClassState,
  ability: Ability,
): number {
  return Number(armorClassState.abilityModifiers[ability]);
}

function armorFormulaValue(
  armorClassState: ArmorClassState,
  formula: ArmorAcFormula,
): number {
  return Match.value(formula).pipe(
    Match.when(
      { kind: "light_dex" },
      ({ base }) => base + abilityModifierValue(armorClassState, "dex"),
    ),
    Match.when(
      { kind: "medium_dex_max_2" },
      ({ base }) =>
        base + Math.min(2, abilityModifierValue(armorClassState, "dex")),
    ),
    Match.when({ kind: "heavy_fixed" }, ({ ac }) => ac),
    Match.exhaustive,
  );
}

function baseArmorClassValue(armorClassState: ArmorClassState): number {
  return Match.value(armorClassState.base).pipe(
    Match.when({ kind: "stat_block" }, ({ ac }) => Number(ac)),
    Match.when({ kind: "ability_sum" }, ({ base, abilityModifiers }) =>
      abilityModifiers.reduce(
        (total, ability) =>
          total + abilityModifierValue(armorClassState, ability),
        Number(base),
      ),
    ),
    Match.when({ kind: "armor" }, ({ formula }) =>
      armorFormulaValue(armorClassState, formula),
    ),
    Match.exhaustive,
  );
}

function wieldingShield(armorClassState: ArmorClassState): boolean {
  return (
    armorClassState.leftHandUse === "shield" ||
    armorClassState.rightHandUse === "shield"
  );
}

function wearingArmor(
  armorClassState: ArmorClassState,
  categories?: ReadonlyArray<ArmorCategory>,
): boolean {
  return (
    armorClassState.base.kind === "armor" &&
    (categories == null || categories.includes(armorClassState.base.category))
  );
}

function bonusApplies(
  armorClassState: ArmorClassState,
  bonus: ArmorClassBonusSource,
): boolean {
  return Match.value(bonus).pipe(
    Match.when({ kind: "flat" }, () => true),
    Match.when(
      { kind: "shield" },
      ({ trainingRequired }) =>
        wieldingShield(armorClassState) &&
        armorClassState.armorTraining.has(trainingRequired),
    ),
    Match.when(
      { kind: "unarmored_no_shield" },
      () => !wearingArmor(armorClassState) && !wieldingShield(armorClassState),
    ),
    Match.when({ kind: "wearing_armor" }, ({ categories }) =>
      wearingArmor(armorClassState, categories),
    ),
    Match.exhaustive,
  );
}

export function currentArmorClass(
  armorClassState: ArmorClassState,
): ArmorClass {
  const withBonuses = armorClassState.bonuses.reduce(
    (total, bonus) =>
      bonusApplies(armorClassState, bonus)
        ? total + Number(bonus.bonus)
        : total,
    baseArmorClassValue(armorClassState),
  );
  const withFloors = armorClassState.floors.reduce(
    (total, floor) => Math.max(total, Number(floor.floor)),
    withBonuses,
  );
  return armorClass(withFloors);
}

export function currentCreatureArmorClass(creature: {
  readonly armorClass: ArmorClassState;
}): ArmorClass {
  return currentArmorClass(creature.armorClass);
}
