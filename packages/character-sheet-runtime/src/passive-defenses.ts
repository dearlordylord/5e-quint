// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.passive-defense-projection
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import {
  characterBuildFeatureUnitIds,
  type CharacterBuild,
  type UnitCatalog,
} from "@dnd/character-creation-runtime";
import {
  abilityModifier,
  abilityScoreToMod,
  DAMAGE_TYPES,
  type AbilityModifier,
} from "@dnd/shared/types";
import type {
  DamageType,
  DruidCircleLandChoice,
  SpellRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";
import { Either, Option } from "effect";

import {
  characterSheetIssue,
  type CharacterSheet,
  type CharacterSheetAuraOfCourage,
  type CharacterSheetEmpoweredEvocation,
  type CharacterSheetFiendishResilience,
  type CharacterSheetInput,
  type CharacterSheetIssue,
  type CharacterSheetNatureWard,
  type CharacterSheetPassiveDefenseProjection,
  type CharacterSheetSelfRestoration,
  type CharacterSheetShortRestInput,
  type CharacterSheetLongRestInput,
} from "./sheet-types.ts";
import { isRecord, recordHasExactKeys } from "./stored-sheet-parser.ts";

const FIENDISH_RESILIENCE_UNIT_ID = authoredUnitId(
  "warlock_fiendish_resilience",
);
const NATURES_WARD_UNIT_ID = authoredUnitId("druid_natures_ward");
const AURA_OF_COURAGE_UNIT_ID = authoredUnitId("paladin_aura_of_courage");
const SELF_RESTORATION_UNIT_ID = authoredUnitId("monk_self_restoration");
const EMPOWERED_EVOCATION_UNIT_ID = authoredUnitId(
  "wizard_empowered_evocation",
);
const NATURES_WARD_CONDITION_IMMUNITIES = ["poisoned"] as const;
const AURA_OF_COURAGE_CONDITION_IMMUNITIES = ["frightened"] as const;
const SELF_RESTORATION_CONDITION_CHOICES = [
  "charmed",
  "frightened",
  "poisoned",
] as const;
const FIENDISH_RESILIENCE_DAMAGE_TYPES = DAMAGE_TYPES.filter(
  (damageType): damageType is Exclude<DamageType, "force"> =>
    damageType !== "force",
);
const NATURES_WARD_RESISTANCE_BY_LAND = {
  arid: "fire",
  polar: "cold",
  temperate: "lightning",
  tropical: "poison",
} as const satisfies Record<DruidCircleLandChoice, DamageType>;

export function fiendishResilienceFromInput(
  input: Pick<
    CharacterSheetInput,
    "build" | "unitLibrary" | "fiendishResilience"
  >,
): Either.Either<
  CharacterSheetFiendishResilience | undefined,
  CharacterSheetIssue
> {
  const featureOwned = ownedClassFeature(
    input,
    authoredUnitId(FIENDISH_RESILIENCE_UNIT_ID),
  );
  if (Either.isLeft(featureOwned)) return Either.left(featureOwned.left);
  if (featureOwned.right === undefined) {
    return input.fiendishResilience === undefined
      ? Either.right(undefined)
      : characterSheetIssue(
          "Fiendish Resilience selection requires the Fiendish Resilience feature.",
        );
  }
  if (input.fiendishResilience === undefined) {
    return characterSheetIssue(
      "Fiendish Resilience requires selected damage type state.",
    );
  }
  return fiendishResilienceSelection(input.fiendishResilience.damageType);
}

export function fiendishResilienceAfterShortRest(input: {
  readonly input: CharacterSheetShortRestInput;
}): Either.Either<
  CharacterSheetFiendishResilience | undefined,
  CharacterSheetIssue
> {
  return fiendishResilienceAfterRest(input.input);
}

export function fiendishResilienceAfterLongRest(input: {
  readonly input: CharacterSheetLongRestInput;
}): Either.Either<
  CharacterSheetFiendishResilience | undefined,
  CharacterSheetIssue
> {
  return fiendishResilienceAfterRest(input.input);
}

function fiendishResilienceAfterRest(
  input: CharacterSheetShortRestInput | CharacterSheetLongRestInput,
): Either.Either<
  CharacterSheetFiendishResilience | undefined,
  CharacterSheetIssue
> {
  const sheet = input.completion.startedRest.sheet;
  return fiendishResilienceAfterRestSelection({
    sheet,
    unitLibrary: input.unitLibrary,
    ...(input.fiendishResilienceDamageType === undefined
      ? {}
      : { selectedDamageType: input.fiendishResilienceDamageType }),
  });
}

export function characterSheetPassiveDefenseProjection(input: {
  readonly sheet: Pick<
    CharacterSheet,
    "build" | "druidCircleLand" | "fiendishResilience"
  >;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<CharacterSheetPassiveDefenseProjection, CharacterSheetIssue> {
  const fiendishResilience = fiendishResilienceForSheet(input);
  if (Either.isLeft(fiendishResilience))
    return Either.left(fiendishResilience.left);
  const naturesWard = naturesWardForSheet(input);
  if (Either.isLeft(naturesWard)) return Either.left(naturesWard.left);
  const auraOfCourage = auraOfCourageForSheet(input);
  if (Either.isLeft(auraOfCourage)) return Either.left(auraOfCourage.left);
  const selfRestoration = selfRestorationForSheet(input);
  if (Either.isLeft(selfRestoration)) {
    return Either.left(selfRestoration.left);
  }

  const damageResistances = distinctValues([
    ...(fiendishResilience.right === undefined
      ? []
      : [fiendishResilience.right.damageType]),
    ...(naturesWard.right === undefined
      ? []
      : [naturesWard.right.resistance.damageType]),
  ]);
  const conditionImmunities = distinctValues([
    ...(naturesWard.right?.conditionImmunities ?? []),
    ...(auraOfCourage.right?.conditionImmunities ?? []),
  ]);

  return Either.right({
    damageResistances,
    conditionImmunities,
    ...(auraOfCourage.right === undefined
      ? {}
      : { auraOfCourage: auraOfCourage.right }),
    ...(selfRestoration.right === undefined
      ? {}
      : { selfRestoration: selfRestoration.right }),
    ...(fiendishResilience.right === undefined
      ? {}
      : { fiendishResilience: fiendishResilience.right }),
    ...(naturesWard.right === undefined
      ? {}
      : { naturesWard: naturesWard.right }),
  });
}

export function removeSelfRestorationConditionAtTurnEnd(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly condition: CharacterSheetSelfRestoration["turnEndRemovableConditions"][number];
}): Either.Either<CharacterSheet, CharacterSheetIssue> {
  const selfRestoration = selfRestorationForSheet(input);
  if (Either.isLeft(selfRestoration)) return Either.left(selfRestoration.left);
  if (selfRestoration.right === undefined) {
    return characterSheetIssue(
      "Self-Restoration requires the retained Monk Self-Restoration feature.",
    );
  }
  if (!SELF_RESTORATION_CONDITION_CHOICES.includes(input.condition)) {
    return characterSheetIssue(
      "Self-Restoration can remove only Charmed, Frightened, or Poisoned.",
    );
  }
  if (!input.sheet.conditions.includes(input.condition)) {
    return characterSheetIssue(
      "Self-Restoration requires the chosen condition to be present.",
    );
  }
  return Either.right({
    ...input.sheet,
    conditions: input.sheet.conditions.filter(
      (condition) => condition !== input.condition,
    ),
  });
}

export function empoweredEvocationDamageRollModifier(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly spell: SpellRecord;
  readonly spellSourceUnitId: UnitRecord["id"];
}): Either.Either<CharacterSheetEmpoweredEvocation, CharacterSheetIssue> {
  const featureOwned = ownedClassFeature(
    { build: input.sheet.build, unitLibrary: input.unitLibrary },
    authoredUnitId(EMPOWERED_EVOCATION_UNIT_ID),
  );
  if (Either.isLeft(featureOwned)) return Either.left(featureOwned.left);
  if (featureOwned.right === undefined) {
    return characterSheetIssue(
      "Empowered Evocation requires the retained Wizard Empowered Evocation feature.",
    );
  }
  if (
    featureOwned.right.kind !== "class_feature" ||
    featureOwned.right.mechanics.family !== "spell_damage_roll_ability_modifier"
  ) {
    return characterSheetIssue(
      "Empowered Evocation requires supported spell damage roll modifier facts.",
    );
  }
  const mechanics = featureOwned.right.mechanics;
  const spellSourceUnit = input.unitLibrary.getUnit(input.spellSourceUnitId);
  if (
    Option.isNone(spellSourceUnit) ||
    spellSourceUnit.value.kind !== "class" ||
    spellSourceUnit.value.className !== mechanics.spellSourceClassName
  ) {
    return characterSheetIssue(
      "Empowered Evocation requires Wizard Spell Access.",
    );
  }
  if (
    !("school" in input.spell.mechanics) ||
    input.spell.mechanics.school !== mechanics.school
  ) {
    return characterSheetIssue(
      "Empowered Evocation requires an Evocation Spell Definition.",
    );
  }
  const spellSource = input.sheet.build.spellcasting?.sources.find(
    (source) => source.sourceUnitId === input.spellSourceUnitId,
  );
  if (spellSource === undefined) {
    return characterSheetIssue(
      "Empowered Evocation requires the selected spellcasting source.",
    );
  }
  if (spellSource.spellcastingAbility !== mechanics.ability) {
    return characterSheetIssue(
      "Empowered Evocation requires Intelligence-based Wizard spellcasting.",
    );
  }
  const spellAccess = [
    ...spellSource.cantrips,
    ...spellSource.spellbook,
    ...spellSource.preparedSpells,
  ];
  if (!spellAccess.includes(input.spell.id)) {
    return characterSheetIssue(
      "Empowered Evocation requires the spell to be present in Wizard Spell Access.",
    );
  }
  return Either.right({
    sourceUnitId: EMPOWERED_EVOCATION_UNIT_ID,
    spellSourceUnitId: input.spellSourceUnitId,
    school: mechanics.school,
    damageRollAbility: mechanics.ability,
    damageRollCount: mechanics.damageRollCount,
    damageRollModifier: abilityModifier(
      abilityScoreToMod(input.sheet.build.abilityScores[mechanics.ability]),
    ) as AbilityModifier,
  });
}

function fiendishResilienceForSheet(input: {
  readonly sheet: Pick<CharacterSheet, "build" | "fiendishResilience">;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<
  CharacterSheetFiendishResilience | undefined,
  CharacterSheetIssue
> {
  return fiendishResilienceFromInput({
    build: input.sheet.build,
    unitLibrary: input.unitLibrary,
    ...(input.sheet.fiendishResilience === undefined
      ? {}
      : { fiendishResilience: input.sheet.fiendishResilience }),
  });
}

function naturesWardForSheet(input: {
  readonly sheet: Pick<CharacterSheet, "build" | "druidCircleLand">;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<CharacterSheetNatureWard | undefined, CharacterSheetIssue> {
  const featureOwned = ownedClassFeature(
    { build: input.sheet.build, unitLibrary: input.unitLibrary },
    authoredUnitId(NATURES_WARD_UNIT_ID),
  );
  if (Either.isLeft(featureOwned)) return Either.left(featureOwned.left);
  if (featureOwned.right === undefined) return Either.right(undefined);
  if (input.sheet.druidCircleLand === undefined) {
    return characterSheetIssue(
      "Nature's Ward resistance requires the current Circle Spells land choice.",
    );
  }
  return Either.right({
    sourceUnitId: NATURES_WARD_UNIT_ID,
    conditionImmunities: NATURES_WARD_CONDITION_IMMUNITIES,
    resistance: {
      land: input.sheet.druidCircleLand.land,
      damageType:
        NATURES_WARD_RESISTANCE_BY_LAND[input.sheet.druidCircleLand.land],
    },
  });
}

function auraOfCourageForSheet(input: {
  readonly sheet: Pick<CharacterSheet, "build">;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<
  CharacterSheetAuraOfCourage | undefined,
  CharacterSheetIssue
> {
  const featureOwned = ownedClassFeature(
    { build: input.sheet.build, unitLibrary: input.unitLibrary },
    authoredUnitId(AURA_OF_COURAGE_UNIT_ID),
  );
  if (Either.isLeft(featureOwned)) return Either.left(featureOwned.left);
  if (featureOwned.right === undefined) return Either.right(undefined);
  return Either.right({
    sourceUnitId: AURA_OF_COURAGE_UNIT_ID,
    conditionImmunities: AURA_OF_COURAGE_CONDITION_IMMUNITIES,
    auraMembershipSource: {
      kind: "auraOfProtection",
      condition: "frightened",
    },
  });
}

function selfRestorationForSheet(input: {
  readonly sheet: Pick<CharacterSheet, "build">;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<
  CharacterSheetSelfRestoration | undefined,
  CharacterSheetIssue
> {
  const featureOwned = ownedClassFeature(
    { build: input.sheet.build, unitLibrary: input.unitLibrary },
    authoredUnitId(SELF_RESTORATION_UNIT_ID),
  );
  if (Either.isLeft(featureOwned)) return Either.left(featureOwned.left);
  if (featureOwned.right === undefined) return Either.right(undefined);
  return Either.right({
    sourceUnitId: SELF_RESTORATION_UNIT_ID,
    turnEndRemovableConditions: SELF_RESTORATION_CONDITION_CHOICES,
    foodAndDrinkExhaustionPrevented: true,
  });
}

function fiendishResilienceAfterRestSelection(input: {
  readonly sheet: Pick<CharacterSheet, "build" | "fiendishResilience">;
  readonly unitLibrary: UnitCatalog;
  readonly selectedDamageType?: DamageType;
}): Either.Either<
  CharacterSheetFiendishResilience | undefined,
  CharacterSheetIssue
> {
  const featureOwned = ownedClassFeature(
    { build: input.sheet.build, unitLibrary: input.unitLibrary },
    authoredUnitId(FIENDISH_RESILIENCE_UNIT_ID),
  );
  if (Either.isLeft(featureOwned)) return Either.left(featureOwned.left);
  if (
    featureOwned.right === undefined &&
    input.selectedDamageType !== undefined
  ) {
    return characterSheetIssue(
      "Fiendish Resilience selection requires the Fiendish Resilience feature.",
    );
  }
  if (input.selectedDamageType === undefined) {
    return Either.right(input.sheet.fiendishResilience);
  }
  return fiendishResilienceSelection(input.selectedDamageType);
}

function fiendishResilienceSelection(
  damageType: DamageType,
): Either.Either<CharacterSheetFiendishResilience, CharacterSheetIssue> {
  return FIENDISH_RESILIENCE_DAMAGE_TYPES.some(
    (candidate) => candidate === damageType,
  )
    ? Either.right({
        damageType,
      })
    : characterSheetIssue(
        "Fiendish Resilience damage type must be a non-Force damage type.",
      );
}

export function parseStoredFiendishResilience(
  value: unknown,
): Either.Either<
  CharacterSheetFiendishResilience | undefined,
  CharacterSheetIssue
> {
  if (value === undefined) return Either.right(undefined);
  if (!isRecord(value)) {
    return characterSheetIssue("Expected Fiendish Resilience selection.");
  }
  if (!recordHasExactKeys(value, ["damageType"])) {
    return characterSheetIssue(
      "Fiendish Resilience selection must contain exactly a damage type.",
    );
  }
  if (!isDamageType(value.damageType)) {
    return characterSheetIssue(
      "Fiendish Resilience damage type must be a damage type.",
    );
  }
  return fiendishResilienceSelection(value.damageType);
}

function ownedClassFeature(
  input: {
    readonly build: Pick<CharacterBuild, "progression" | "features">;
    readonly unitLibrary: UnitCatalog;
  },
  featureUnitId: UnitRecord["id"],
): Either.Either<UnitRecord | undefined, CharacterSheetIssue> {
  if (
    !characterBuildFeatureUnitIds(input.build, input.unitLibrary).includes(
      featureUnitId,
    )
  ) {
    return Either.right(undefined);
  }
  const unit = input.unitLibrary.getUnit(featureUnitId);
  if (Option.isNone(unit)) {
    return characterSheetIssue(`Missing class feature Unit ${featureUnitId}.`);
  }
  return unit.value.kind === "class_feature"
    ? Either.right(unit.value)
    : characterSheetIssue(`${featureUnitId} is not a class feature Unit.`);
}

function distinctValues<T>(values: readonly T[]): readonly T[] {
  return [...new Set(values)];
}

function isDamageType(value: unknown): value is DamageType {
  return DAMAGE_TYPES.some((damageType) => damageType === value);
}
