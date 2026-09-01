// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.passive-defense-projection
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import {
  characterBuildFeatureUnitIds,
  type CharacterBuild,
  type UnitCatalog,
} from "../../character-creation-runtime/src/consumer-protocol.ts";
import {
  abilityModifier,
  abilityScoreToMod,
  DAMAGE_TYPES,
  type AbilityModifier,
} from "@dnd/shared/types";
import type {
  DamageType,
  DruidCircleLandChoice,
  UnitRecord,
} from "@dnd/surface/surface/types";
import { Result, Option } from "effect";

import {
  projectCharacterSheetClassFeature,
  type CharacterSheetClassFeatureFacts,
} from "./character-feature-projection.ts";
import type { CharacterSheetSpellSource } from "./character-spell-projection.ts";
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
): Result.Result<
  CharacterSheetFiendishResilience | undefined,
  CharacterSheetIssue
> {
  const featureOwned = ownedClassFeature(
    input,
    authoredUnitId(FIENDISH_RESILIENCE_UNIT_ID),
  );
  /* v8 ignore next -- @preserve -- Feature lookup rejection is malformed Fiendish Resilience build/catalog correlation. */
  if (Result.isFailure(featureOwned)) return Result.fail(featureOwned.failure);
  if (featureOwned.success === undefined) {
    return input.fiendishResilience === undefined
      ? Result.succeed(undefined)
      : characterSheetIssue(
          "Fiendish Resilience selection requires the Fiendish Resilience feature.",
        );
  }
  /* v8 ignore start -- @preserve -- Feature ownership and retained Fiendish Resilience state are correlated by Character Sheet construction. */
  if (input.fiendishResilience === undefined) {
    return characterSheetIssue(
      "Fiendish Resilience requires selected damage type state.",
    );
  }
  /* v8 ignore stop -- @preserve */
  return fiendishResilienceSelection(input.fiendishResilience.damageType);
}

export function fiendishResilienceAfterShortRest(input: {
  readonly input: CharacterSheetShortRestInput;
}): Result.Result<
  CharacterSheetFiendishResilience | undefined,
  CharacterSheetIssue
> {
  return fiendishResilienceAfterRest(input.input);
}

export function fiendishResilienceAfterLongRest(input: {
  readonly input: CharacterSheetLongRestInput;
}): Result.Result<
  CharacterSheetFiendishResilience | undefined,
  CharacterSheetIssue
> {
  return fiendishResilienceAfterRest(input.input);
}

function fiendishResilienceAfterRest(
  input: CharacterSheetShortRestInput | CharacterSheetLongRestInput,
): Result.Result<
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
}): Result.Result<CharacterSheetPassiveDefenseProjection, CharacterSheetIssue> {
  const fiendishResilience = fiendishResilienceForSheet(input);
  /* v8 ignore start -- @preserve -- Malformed retained build/state correlation: Fiendish Resilience must reproject from the admitted feature and selection that created it. */
  if (Result.isFailure(fiendishResilience))
    return Result.fail(fiendishResilience.failure);
  /* v8 ignore stop -- @preserve */
  const naturesWard = naturesWardForSheet(input);
  /* v8 ignore next -- @preserve -- Nature's Ward projection rejection is malformed retained build/state correlation. */
  if (Result.isFailure(naturesWard)) return Result.fail(naturesWard.failure);
  const auraOfCourage = auraOfCourageForSheet(input);
  /* v8 ignore next -- @preserve -- Aura of Courage projection rejection is malformed retained build/catalog correlation. */
  if (Result.isFailure(auraOfCourage))
    return Result.fail(auraOfCourage.failure);
  const selfRestoration = selfRestorationForSheet(input);
  /* v8 ignore start -- @preserve -- A retained feature lookup failure indicates a build/catalog correlation error, not a passive-defense outcome. */
  if (Result.isFailure(selfRestoration)) {
    return Result.fail(selfRestoration.failure);
  }
  /* v8 ignore stop -- @preserve */

  const damageResistances = distinctValues([
    ...(fiendishResilience.success === undefined
      ? []
      : [fiendishResilience.success.damageType]),
    ...(naturesWard.success === undefined
      ? []
      : [naturesWard.success.resistance.damageType]),
  ]);
  const conditionImmunities = distinctValues([
    ...(naturesWard.success?.conditionImmunities ?? []),
    ...(auraOfCourage.success?.conditionImmunities ?? []),
  ]);

  return Result.succeed({
    damageResistances,
    conditionImmunities,
    ...(auraOfCourage.success === undefined
      ? {}
      : { auraOfCourage: auraOfCourage.success }),
    ...(selfRestoration.success === undefined
      ? {}
      : { selfRestoration: selfRestoration.success }),
    ...(fiendishResilience.success === undefined
      ? {}
      : { fiendishResilience: fiendishResilience.success }),
    ...(naturesWard.success === undefined
      ? {}
      : { naturesWard: naturesWard.success }),
  });
}

export function removeSelfRestorationConditionAtTurnEnd(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly condition: CharacterSheetSelfRestoration["turnEndRemovableConditions"][number];
}): Result.Result<CharacterSheet, CharacterSheetIssue> {
  const selfRestoration = selfRestorationForSheet(input);
  /* v8 ignore next -- @preserve -- Malformed build/catalog correlation: retained Self-Restoration must resolve from its admitted feature Unit. */
  if (Result.isFailure(selfRestoration))
    return Result.fail(selfRestoration.failure);
  /* v8 ignore start -- @preserve -- The typed turn-end operation can only be requested for a sheet whose build retained Self-Restoration. */
  if (selfRestoration.success === undefined) {
    return characterSheetIssue(
      "Self-Restoration requires the retained Monk Self-Restoration feature.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- The condition parameter is derived from the three supported Self-Restoration choices. */
  if (!SELF_RESTORATION_CONDITION_CHOICES.includes(input.condition)) {
    return characterSheetIssue(
      "Self-Restoration can remove only Charmed, Frightened, or Poisoned.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (!input.sheet.conditions.includes(input.condition)) {
    return characterSheetIssue(
      "Self-Restoration requires the chosen condition to be present.",
    );
  }
  return Result.succeed({
    ...input.sheet,
    conditions: input.sheet.conditions.filter(
      (condition) => condition !== input.condition,
    ),
  });
}

export function empoweredEvocationDamageRollModifier(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly spell: CharacterSheetSpellSource;
  readonly spellSourceUnitId: UnitRecord["id"];
}): Result.Result<CharacterSheetEmpoweredEvocation, CharacterSheetIssue> {
  const featureOwned = ownedClassFeature(
    { build: input.sheet.build, unitLibrary: input.unitLibrary },
    authoredUnitId(EMPOWERED_EVOCATION_UNIT_ID),
  );
  /* v8 ignore next -- @preserve -- Malformed build/catalog correlation: retained Empowered Evocation must resolve from its admitted feature Unit. */
  if (Result.isFailure(featureOwned)) return Result.fail(featureOwned.failure);
  /* v8 ignore start -- @preserve -- This operation is admitted only after the retained Empowered Evocation feature is established. */
  if (featureOwned.success === undefined) {
    return characterSheetIssue(
      "Empowered Evocation requires the retained Wizard Empowered Evocation feature.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- The owned feature Unit failed the exact spell-damage modifier profile used to admit this operation. */
  if (
    featureOwned.success.mechanics.family !==
    "spell_damage_roll_ability_modifier"
  ) {
    return characterSheetIssue(
      "Empowered Evocation requires supported spell damage roll modifier facts.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const mechanics = featureOwned.success.mechanics;
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
  if (input.spell.mechanics.school !== mechanics.school) {
    return characterSheetIssue(
      "Empowered Evocation requires an Evocation Spell Definition.",
    );
  }
  const spellSource = input.sheet.build.spellcasting?.sources.find(
    (source) => source.sourceUnitId === input.spellSourceUnitId,
  );
  /* v8 ignore start -- @preserve -- The selected Wizard source Unit and retained build spellcasting source are correlated during sheet construction. */
  if (spellSource === undefined) {
    return characterSheetIssue(
      "Empowered Evocation requires the selected spellcasting source.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Wizard source ability and Empowered Evocation ability are authored as one correlated support profile. */
  if (spellSource.spellcastingAbility !== mechanics.ability) {
    return characterSheetIssue(
      "Empowered Evocation requires Intelligence-based Wizard spellcasting.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const spellAccess = [
    ...spellSource.cantrips,
    ...spellSource.spellbook,
    ...spellSource.preparedSpells,
  ];
  /* v8 ignore start -- @preserve -- A spell passed to this narrowed operation must already belong to the selected Wizard spell-access source. */
  if (!spellAccess.includes(input.spell.unitId)) {
    return characterSheetIssue(
      "Empowered Evocation requires the spell to be present in Wizard Spell Access.",
    );
  }
  /* v8 ignore stop -- @preserve */
  return Result.succeed({
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
}): Result.Result<
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
}): Result.Result<CharacterSheetNatureWard | undefined, CharacterSheetIssue> {
  const featureOwned = ownedClassFeature(
    { build: input.sheet.build, unitLibrary: input.unitLibrary },
    authoredUnitId(NATURES_WARD_UNIT_ID),
  );
  /* v8 ignore next -- @preserve -- Malformed build/catalog correlation: retained Nature's Ward must resolve from its admitted feature Unit. */
  if (Result.isFailure(featureOwned)) return Result.fail(featureOwned.failure);
  if (featureOwned.success === undefined) return Result.succeed(undefined);
  /* v8 ignore start -- @preserve -- Nature's Ward ownership and retained Circle of the Land selection are correlated by sheet construction. */
  if (input.sheet.druidCircleLand === undefined) {
    return characterSheetIssue(
      "Nature's Ward resistance requires the current Circle Spells land choice.",
    );
  }
  /* v8 ignore stop -- @preserve */
  return Result.succeed({
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
}): Result.Result<
  CharacterSheetAuraOfCourage | undefined,
  CharacterSheetIssue
> {
  const featureOwned = ownedClassFeature(
    { build: input.sheet.build, unitLibrary: input.unitLibrary },
    authoredUnitId(AURA_OF_COURAGE_UNIT_ID),
  );
  /* v8 ignore next -- @preserve -- Malformed build/catalog correlation: retained Aura of Courage must resolve from its admitted feature Unit. */
  if (Result.isFailure(featureOwned)) return Result.fail(featureOwned.failure);
  if (featureOwned.success === undefined) return Result.succeed(undefined);
  return Result.succeed({
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
}): Result.Result<
  CharacterSheetSelfRestoration | undefined,
  CharacterSheetIssue
> {
  const featureOwned = ownedClassFeature(
    { build: input.sheet.build, unitLibrary: input.unitLibrary },
    authoredUnitId(SELF_RESTORATION_UNIT_ID),
  );
  /* v8 ignore next -- @preserve -- Malformed build/catalog correlation: retained Self-Restoration must resolve from its admitted feature Unit. */
  if (Result.isFailure(featureOwned)) return Result.fail(featureOwned.failure);
  if (featureOwned.success === undefined) return Result.succeed(undefined);
  return Result.succeed({
    sourceUnitId: SELF_RESTORATION_UNIT_ID,
    turnEndRemovableConditions: SELF_RESTORATION_CONDITION_CHOICES,
    foodAndDrinkExhaustionPrevented: true,
  });
}

function fiendishResilienceAfterRestSelection(input: {
  readonly sheet: Pick<CharacterSheet, "build" | "fiendishResilience">;
  readonly unitLibrary: UnitCatalog;
  readonly selectedDamageType?: DamageType;
}): Result.Result<
  CharacterSheetFiendishResilience | undefined,
  CharacterSheetIssue
> {
  const featureOwned = ownedClassFeature(
    { build: input.sheet.build, unitLibrary: input.unitLibrary },
    authoredUnitId(FIENDISH_RESILIENCE_UNIT_ID),
  );
  /* v8 ignore next -- @preserve -- Malformed build/catalog correlation: retained Fiendish Resilience must resolve from its admitted feature Unit. */
  if (Result.isFailure(featureOwned)) return Result.fail(featureOwned.failure);
  /* v8 ignore start -- @preserve -- Supplying a rest reselection without the retained Fiendish Resilience feature is a malformed rest request. */
  if (
    featureOwned.success === undefined &&
    input.selectedDamageType !== undefined
  ) {
    return characterSheetIssue(
      "Fiendish Resilience selection requires the Fiendish Resilience feature.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (input.selectedDamageType === undefined) {
    return Result.succeed(input.sheet.fiendishResilience);
  }
  return fiendishResilienceSelection(input.selectedDamageType);
}

function fiendishResilienceSelection(
  damageType: DamageType,
): Result.Result<CharacterSheetFiendishResilience, CharacterSheetIssue> {
  return FIENDISH_RESILIENCE_DAMAGE_TYPES.some(
    (candidate) => candidate === damageType,
  )
    ? Result.succeed({
        damageType,
      })
    : characterSheetIssue(
        "Fiendish Resilience damage type must be a non-Force damage type.",
      );
}

export function parseStoredFiendishResilience(
  value: unknown,
): Result.Result<
  CharacterSheetFiendishResilience | undefined,
  CharacterSheetIssue
> {
  if (value === undefined) return Result.succeed(undefined);
  /* v8 ignore start -- @preserve -- Stored non-record Fiendish Resilience data is malformed boundary input. */
  if (!isRecord(value)) {
    return characterSheetIssue("Expected Fiendish Resilience selection.");
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Stored Fiendish Resilience records with missing or extra fields are malformed boundary input. */
  if (!recordHasExactKeys(value, ["damageType"])) {
    return characterSheetIssue(
      "Fiendish Resilience selection must contain exactly a damage type.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- A stored damageType outside the canonical damage-type vocabulary is malformed boundary input. */
  if (!isDamageType(value.damageType)) {
    return characterSheetIssue(
      "Fiendish Resilience damage type must be a damage type.",
    );
  }
  /* v8 ignore stop -- @preserve */
  return fiendishResilienceSelection(value.damageType);
}

function ownedClassFeature(
  input: {
    readonly build: Pick<CharacterBuild, "progression" | "features">;
    readonly unitLibrary: UnitCatalog;
  },
  featureUnitId: UnitRecord["id"],
): Result.Result<
  CharacterSheetClassFeatureFacts | undefined,
  CharacterSheetIssue
> {
  if (
    !characterBuildFeatureUnitIds(input.build, input.unitLibrary).includes(
      featureUnitId,
    )
  ) {
    return Result.succeed(undefined);
  }
  const unit = input.unitLibrary.getUnit(featureUnitId);
  /* v8 ignore start -- @preserve -- A build-owned feature id missing from the same Unit catalog is a build/catalog correlation failure. */
  if (Option.isNone(unit)) {
    return characterSheetIssue(`Missing class feature Unit ${featureUnitId}.`);
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Internal projection invariant: V8 maps the non-class-feature edge to this conditional, but characterBuildFeatureUnitIds yields only ids admitted as class-feature Units. */
  const projection = projectCharacterSheetClassFeature(unit.value);
  if (Option.isSome(projection)) return Result.succeed(projection.value);
  return characterSheetIssue(`${featureUnitId} is not a class feature Unit.`);
  /* v8 ignore stop -- @preserve */
}

function distinctValues<T>(values: readonly T[]): readonly T[] {
  return [...new Set(values)];
}

function isDamageType(value: unknown): value is DamageType {
  return DAMAGE_TYPES.some((damageType) => damageType === value);
}
