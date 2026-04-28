import { Brand, Match } from "effect";
import { ABILITIES, Integer } from "@dnd/shared/types";
import type {
  Ability,
  HandUse,
  ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import type {
  ArmorAcFormula,
  ArmorTrainingCategory,
} from "@dnd/prototype-content-surface/surface/types";

export type ArmorClass = Integer & Brand.Brand<"ArmorClass">;
const ArmorClass = Brand.all(Integer, Brand.nominal<ArmorClass>());

export function armorClass(value: number): ArmorClass {
  return ArmorClass(Math.max(1, Math.floor(value)));
}

export type ArmorClassDelta = Integer & Brand.Brand<"ArmorClassDelta">;
const ArmorClassDelta = Brand.all(Integer, Brand.nominal<ArmorClassDelta>());

export function armorClassDelta(value: number): ArmorClassDelta {
  return ArmorClassDelta(Math.floor(value));
}

export type AbilityModifier = Integer & Brand.Brand<"AbilityModifier">;
const AbilityModifier = Brand.all(Integer, Brand.nominal<AbilityModifier>());

export function abilityModifier(value: number): AbilityModifier {
  return AbilityModifier(Math.floor(value));
}

export type AbilityModifierBlock = Readonly<Record<Ability, AbilityModifier>>;

export function zeroAbilityModifiers(): AbilityModifierBlock {
  return Object.fromEntries(
    ABILITIES.map((ability) => [ability, abilityModifier(0)]),
  ) as AbilityModifierBlock;
}

export type ArmorClassBaseSource =
  | {
      readonly kind: "stat_block";
      readonly ac: ArmorClass;
    }
  | {
      readonly kind: "ability_sum";
      readonly base: ArmorClass;
      readonly abilityModifiers: ReadonlyNonEmptyArray<Ability>;
      readonly source:
        | "default_unarmored"
        | "barbarian_unarmored_defense"
        | "monk_unarmored_defense"
        | "mage_armor";
    }
  | {
      readonly kind: "armor";
      readonly formula: ArmorAcFormula;
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

function wearingArmor(armorClassState: ArmorClassState): boolean {
  return armorClassState.base.kind === "armor";
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
