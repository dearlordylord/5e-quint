// KERNEL-COVERAGE: runtime-owner SHEET.SPELL_ACCESS.FREE_CAST_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner CREATION.EQUIPMENT.STARTING_CURRENCY_FINALIZATION
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import {
  ALIGNMENT_MORALITIES,
  ALIGNMENT_ORDERS,
  abilityScoreAssignment,
  characterBuildSorcererMetamagicFacts,
  characterBuildSpellcastingSlotCapacity,
  characterEquipmentItemId,
  characterDraconicAncestrySelection,
  classLevelForUnit,
  copperPieceAmount,
  classUnitId,
  classUnitIdToClassName,
  CHARACTER_CLASS_LEVELS,
  eldritchInvocationId,
  eldritchInvocationOptionForInvocationId,
  eldritchInvocationRepeatableChoiceSatisfiesRule,
  isCharacterBuildToolProficiencyId,
  isCopperPieceAmount,
  languageFromSurfaceLanguageId,
  parseCharacterBuildMagicInitiateSpellAccesses,
  parseCharacterEquipmentItemId,
  progressionClassUnitIds,
  sorcererMetamagicOptionId,
  STANDARD_LANGUAGES,
  toolProficiencyId,
  type CharacterBuild,
  type AlignmentMorality,
  type AlignmentOrder,
  type CharacterBuildBookOfShadowsSpellAccess,
  type CharacterBuildEldritchInvocationRepeatableChoice,
  type CharacterBuildEquipment,
  type CharacterBuildFeature,
  type CharacterBuildProficiencyChoiceSubject,
  type CharacterBuildSpeciesChoiceFacts,
  type CharacterBuildSpellcasting,
  type CharacterBuildSpellcastingFocus,
  type CharacterBuildSpellcastingSource,
  type CharacterEquipmentItemId,
  type CharacterEquipmentItemSlot,
  type CopperPieceAmount,
  type UnitCatalog,
} from "@dnd/character-creation-runtime/consumer-protocol";
import {
  ABILITIES,
  LANGUAGES,
  SKILLS,
  SURFACE_SKILLS,
  type Ability,
  type CharacterStartingLanguages,
  type StandardLanguage,
  type SurfaceSkill,
} from "@dnd/shared/game-facts";
import {
  Hp,
  PositiveInteger,
  resourceCount,
  spellSlotLevel,
} from "@dnd/shared/types";
import type {
  Hp as HpType,
  ResourceCount,
  SpellSlotLevel,
} from "@dnd/shared/types";
import {
  parseElapsedTimeTicks,
  parsePositiveElapsedTimeTicks,
} from "@dnd/shared/elapsed-time";
import type {
  DeathSaveCount,
  DeathSaves,
} from "@dnd/shared-algebras/death-saves-algebra";
import {
  allCantripsFromAnyClassSpellList,
  allCantripsFromClassSpellList,
  allLeveledSpellsFromAnyClassSpellList,
} from "@dnd/surface/surface/unit-catalog-core";
import { readClassCreationFacts } from "@dnd/surface/surface/character-creation-readers";
import type {
  DragonbornSpeciesRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";
import { Result, Option } from "effect";

import {
  projectCharacterSheetClassFeature,
  type CharacterSheetClassFeatureFacts,
} from "./character-feature-projection.ts";
import {
  projectCharacterSheetSpellSource,
  type CharacterSheetSpellSource,
} from "./character-spell-projection.ts";
import { characterSheetSpellHasRitualTag } from "./spell-profile-shape.ts";
import { featurePreparedSpellIdsForBuild } from "./class-feature-spells.ts";
import {
  characterBuildHasBookOfShadows,
  isNonSpellcastingBuild,
  isSpellcastingBuild,
} from "./character-build-shape.ts";
import { isDruidCircleLandChoice } from "./druid-features.ts";
import { parseHp } from "./hit-points.ts";
import { isRecord, recordHasExactKeys } from "./record-shape.ts";
import {
  characterBuildPactSlotCapacity,
  validateSpellSlotSourceState,
} from "./spell-slots.ts";
import {
  ARMOR_TRAINING_CATEGORY_VALUES,
  CHARACTER_SHEET_KNOCKED_OUT_UNCONSCIOUS,
  WEAPON_PROFICIENCY_CATEGORY_VALUES,
  characterSheetIssue,
  getRequiredUnit,
  isCharacterSheetPointPoolResourceUnitId,
  isNonNegativeInteger,
  isPositiveInteger,
  type CharacterPactSlotExpenditure,
  type CharacterSheetBookOfShadowsPresence,
  type CharacterSheetCreatedSpellSlotState,
  type CharacterSheetDruidCircleLand,
  type CharacterSheetDruidWildShapeKnownForms,
  type CharacterSheetIssue,
  type CharacterSheetPointPoolResourceUnitId,
  type CharacterSheetPositiveHpUnconscious,
  type CharacterSheetResourceExpenditure,
  type CharacterSheetSpellSlotSourceState,
  type CharacterSheetStableRecovery,
  type CharacterSheetZeroHpLifecycleInput,
  type CharacterSpellSlotExpenditure,
  type StoredClassFeatureLanguage,
  type StoredClassFeatureLanguageFact,
  type StoredClassFeatureLanguageProjection,
} from "./sheet-types.ts";

export { characterBuildHasBookOfShadows };

type ParsedStoredHitPoints = {
  readonly currentHp: HpType;
  readonly tempHp: HpType;
  readonly positiveHpUnconscious?: CharacterSheetPositiveHpUnconscious;
  readonly zeroHpLifecycle?: CharacterSheetZeroHpLifecycleInput;
};

export function parseStoredHitPoints(
  value: unknown,
): Result.Result<ParsedStoredHitPoints, CharacterSheetIssue> {
  if (!isRecord(value))
    return characterSheetIssue("Expected Character Sheet hit points.");
  const tempHp =
    value.tempHp === undefined ? Result.succeed(Hp(0)) : parseHp(value.tempHp);
  if (Result.isFailure(tempHp)) return Result.fail(tempHp.failure);
  if (value.tag === "positive") {
    const currentHp = parseHp(value.currentHp);
    return Result.isFailure(currentHp)
      ? Result.fail(currentHp.failure)
      : Result.succeed({
          currentHp: currentHp.success,
          tempHp: tempHp.success,
        });
  }
  if (value.tag === "knockedOut") {
    return Result.succeed({
      currentHp: Hp(1),
      tempHp: tempHp.success,
      positiveHpUnconscious: CHARACTER_SHEET_KNOCKED_OUT_UNCONSCIOUS,
    });
  }
  if (value.tag !== "zero") {
    return characterSheetIssue("Expected Character Sheet hit point state.");
  }
  const lifecycle = parseStoredZeroHpLifecycle(value.lifecycle);
  return Result.isFailure(lifecycle)
    ? Result.fail(lifecycle.failure)
    : Result.succeed({
        currentHp: Hp(0),
        tempHp: tempHp.success,
        zeroHpLifecycle: lifecycle.success,
      });
}

function parseStoredZeroHpLifecycle(
  value: unknown,
): Result.Result<CharacterSheetZeroHpLifecycleInput, CharacterSheetIssue> {
  if (!isRecord(value))
    return characterSheetIssue("Expected zero-HP lifecycle.");
  if (value.tag === "stable") {
    const recovery = parseStoredStableRecovery(value.recovery);
    return Result.isFailure(recovery)
      ? Result.fail(recovery.failure)
      : Result.succeed({ tag: "stable", recovery: recovery.success });
  }
  if (value.tag !== "unstable" && value.tag !== "dead") {
    return characterSheetIssue("Expected zero-HP lifecycle state.");
  }
  const deathSaves = parseStoredDeathSaves(value.deathSaves);
  return Result.isFailure(deathSaves)
    ? Result.fail(deathSaves.failure)
    : Result.succeed({ tag: value.tag, deathSaves: deathSaves.success });
}

function parseStoredStableRecovery(
  value: unknown,
): Result.Result<CharacterSheetStableRecovery, CharacterSheetIssue> {
  if (!isRecord(value)) {
    return characterSheetIssue("Expected Stable recovery state.");
  }
  if (value.kind === "regains1HpAfter1d4Hours") {
    if (typeof value.elapsedBeforeRecoveryRoll !== "number") {
      return characterSheetIssue(
        "Stable recovery elapsed time must be elapsed-time ticks.",
      );
    }
    const elapsedBeforeRecoveryRoll = parseElapsedTimeTicks(
      value.elapsedBeforeRecoveryRoll,
    );
    return Result.isFailure(elapsedBeforeRecoveryRoll)
      ? characterSheetIssue(
          "Stable recovery elapsed time must be elapsed-time ticks.",
        )
      : Result.succeed({
          kind: "regains1HpAfter1d4Hours",
          elapsedBeforeRecoveryRoll: elapsedBeforeRecoveryRoll.success,
        });
  }
  if (value.kind !== "regains1HpAfter") {
    return characterSheetIssue("Expected Stable recovery state.");
  }
  if (typeof value.remaining !== "number") {
    return characterSheetIssue(
      "Stable recovery remaining time must be positive elapsed-time ticks.",
    );
  }
  const remaining = parsePositiveElapsedTimeTicks(value.remaining);
  return Result.isFailure(remaining)
    ? characterSheetIssue(
        "Stable recovery remaining time must be positive elapsed-time ticks.",
      )
    : Result.succeed({ kind: "regains1HpAfter", remaining: remaining.success });
}

function parseStoredDeathSaves(
  value: unknown,
): Result.Result<DeathSaves, CharacterSheetIssue> {
  if (!isRecord(value)) return characterSheetIssue("Expected death saves.");
  if (!isDeathSaveCount(value.successes) || !isDeathSaveCount(value.failures)) {
    return characterSheetIssue("Death saves must be counts from 0 to 3.");
  }
  return Result.succeed({
    successes: value.successes,
    failures: value.failures,
  });
}

export function parseStoredSpellSlots(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
  value: Readonly<Record<string, unknown>>,
): Result.Result<
  CharacterSheetSpellSlotSourceState | undefined,
  CharacterSheetIssue
> {
  if (Object.hasOwn(value, "spellSlots")) {
    return characterSheetIssue(
      "Stored Character Sheet must not carry build-derived ordinary Spell Slot capacity.",
    );
  }
  if (!isSpellcastingBuild(build)) {
    return value.spellSlotExpenditures === undefined &&
      value.createdSpellSlots === undefined
      ? Result.succeed(undefined)
      : characterSheetIssue(
          "Non-spellcasting Character Sheet cannot carry Spell Slot state.",
        );
  }
  if (
    value.spellSlotExpenditures !== undefined &&
    !Array.isArray(value.spellSlotExpenditures)
  ) {
    return characterSheetIssue("Spell Slot expenditure state must be a list.");
  }
  const spellSlotExpenditures: CharacterSpellSlotExpenditure[] = [];
  const expenditureLevels = new Set<number>();
  const buildSlots = characterBuildSpellcastingSlotCapacity(build);
  for (const expenditure of value.spellSlotExpenditures ?? []) {
    if (!isRecord(expenditure)) {
      return characterSheetIssue("Expected Spell Slot expenditure.");
    }
    if (!recordHasExactKeys(expenditure, ["spellLevel", "expended"])) {
      return characterSheetIssue(
        "Spell Slot expenditure state must contain exactly spell level and expended count.",
      );
    }
    const spellLevel = parseSpellSlotLevel(expenditure.spellLevel);
    const expended = parseResourceCount(expenditure.expended);
    if (Result.isFailure(spellLevel)) return Result.fail(spellLevel.failure);
    if (Result.isFailure(expended)) return Result.fail(expended.failure);
    if (expenditureLevels.has(spellLevel.success)) {
      return characterSheetIssue(
        "Spell Slot state must not duplicate spell levels.",
      );
    }
    expenditureLevels.add(spellLevel.success);
    const capacity = buildSlots.find(
      (slot) => slot.spellLevel === spellLevel.success,
    );
    if (capacity === undefined) {
      return characterSheetIssue(
        "Spell Slot state does not match build capacity.",
      );
    }
    if (expended.success > capacity.count) {
      return characterSheetIssue(
        `Spell Slot state does not match build capacity for level ${capacity.spellLevel}.`,
      );
    }
    spellSlotExpenditures.push({
      spellLevel: spellLevel.success,
      expended: expended.success,
    });
  }
  const createdSpellSlots = parseStoredCreatedSpellSlots(
    value.createdSpellSlots,
  );
  if (Result.isFailure(createdSpellSlots)) {
    return Result.fail(createdSpellSlots.failure);
  }
  return validateSpellSlotSourceState({
    build,
    unitLibrary,
    spellSlotState: {
      ordinarySpellSlotExpenditures: spellSlotExpenditures,
      createdSpellSlots: createdSpellSlots.success,
    },
  });
}

function parseStoredCreatedSpellSlots(
  value: unknown,
): Result.Result<
  readonly CharacterSheetCreatedSpellSlotState[],
  CharacterSheetIssue
> {
  if (value === undefined) return Result.succeed([]);
  if (!Array.isArray(value)) {
    return characterSheetIssue("Created Spell Slot state must be a list.");
  }
  const slots: CharacterSheetCreatedSpellSlotState[] = [];
  const levels = new Set<number>();
  for (const slot of value) {
    if (!isRecord(slot)) {
      return characterSheetIssue("Expected Created Spell Slot state.");
    }
    if (!recordHasExactKeys(slot, ["spellLevel", "count", "expended"])) {
      return characterSheetIssue(
        "Created Spell Slot state must contain exactly spell level, count, and expended count.",
      );
    }
    const spellLevel = parseSpellSlotLevel(slot.spellLevel);
    const count = parsePositiveResourceCount(slot.count);
    const expended = parseResourceCount(slot.expended);
    if (Result.isFailure(spellLevel)) return Result.fail(spellLevel.failure);
    if (Result.isFailure(count)) return Result.fail(count.failure);
    if (Result.isFailure(expended)) return Result.fail(expended.failure);
    if (levels.has(spellLevel.success)) {
      return characterSheetIssue(
        "Created Spell Slot state must not duplicate spell levels.",
      );
    }
    levels.add(spellLevel.success);
    if (expended.success > count.success) {
      return characterSheetIssue(
        "Created Spell Slot expenditure cannot exceed count.",
      );
    }
    slots.push({
      spellLevel: spellLevel.success,
      count: count.success,
      expended: expended.success,
    });
  }
  return Result.succeed(slots);
}

export function parseStoredPactSlots(
  build: CharacterBuild,
  value: Readonly<Record<string, unknown>>,
): Result.Result<
  CharacterPactSlotExpenditure | undefined,
  CharacterSheetIssue
> {
  if (Object.hasOwn(value, "pactSlots")) {
    return characterSheetIssue(
      "Stored Character Sheet must not carry build-derived Pact Slot capacity.",
    );
  }
  const pactMagic = characterBuildPactSlotCapacity(build);
  if (pactMagic === undefined) {
    return value.pactSlotExpenditure === undefined
      ? Result.succeed(undefined)
      : characterSheetIssue(
          "Character Sheet without Pact Magic cannot carry Pact Slot state.",
        );
  }
  if (value.pactSlotExpenditure === undefined) {
    return Result.succeed(undefined);
  }
  if (!isRecord(value.pactSlotExpenditure)) {
    return characterSheetIssue(
      "Pact Slot expenditure state must be an object.",
    );
  }
  if (!recordHasExactKeys(value.pactSlotExpenditure, ["expended"])) {
    return characterSheetIssue(
      "Pact Slot expenditure state must contain exactly expended count.",
    );
  }
  const expended = parseResourceCount(value.pactSlotExpenditure.expended);
  if (Result.isFailure(expended)) return Result.fail(expended.failure);
  if (expended.success > pactMagic.count) {
    return characterSheetIssue(
      "Pact Slot state must match Pact Magic build capacity.",
    );
  }
  return expended.success === resourceCount(0)
    ? Result.succeed(undefined)
    : Result.succeed({
        expended: expended.success,
      });
}

export function parseStoredResourceExpenditures(
  value: unknown,
): Result.Result<
  readonly CharacterSheetResourceExpenditure[],
  CharacterSheetIssue
> {
  if (!Array.isArray(value)) {
    return characterSheetIssue(
      "Character Sheet requires resource expenditure state.",
    );
  }
  const expenditures: CharacterSheetResourceExpenditure[] = [];
  for (const expenditure of value) {
    const parsed = parseStoredResourceExpenditure(expenditure);
    if (Result.isFailure(parsed)) return Result.fail(parsed.failure);
    expenditures.push(parsed.success);
  }
  return Result.succeed(expenditures);
}

function parseStoredResourceExpenditure(
  value: unknown,
): Result.Result<CharacterSheetResourceExpenditure, CharacterSheetIssue> {
  if (!isRecord(value)) {
    return characterSheetIssue(
      "Expected Character Sheet resource expenditure.",
    );
  }
  switch (value.tag) {
    case "layOnHandsHealingPool":
      return parseStoredLayOnHandsResourceExpenditure(value);
    case "useCountResource":
      return parseStoredUseCountResourceExpenditure(value);
    case "pointPoolResource":
      return parseStoredPointPoolResourceExpenditure(value);
    case "spellAccessFreeCast":
      return parseStoredSpellAccessFreeCastExpenditure(value);
    default:
      return characterSheetIssue(
        "Expected Character Sheet resource expenditure.",
      );
  }
}

function parseStoredUseCountResourceExpenditure(
  value: Readonly<Record<string, unknown>>,
): Result.Result<CharacterSheetResourceExpenditure, CharacterSheetIssue> {
  if (!recordHasExactKeys(value, ["tag", "unitId", "expended"])) {
    return characterSheetIssue(
      "Character Sheet keyed resource expenditure must contain exactly tag, Unit id, and expended count.",
    );
  }
  const expended = parseResourceCount(value.expended);
  if (Result.isFailure(expended)) return Result.fail(expended.failure);
  const unitId = parseUseCountResourceExpenditureUnitId(value);
  if (Result.isFailure(unitId)) return Result.fail(unitId.failure);
  return Result.succeed({
    tag: "useCountResource",
    unitId: unitId.success,
    expended: expended.success,
  });
}

function parseStoredPointPoolResourceExpenditure(
  value: Readonly<Record<string, unknown>>,
): Result.Result<CharacterSheetResourceExpenditure, CharacterSheetIssue> {
  if (!recordHasExactKeys(value, ["tag", "unitId", "expended"])) {
    return characterSheetIssue(
      "Character Sheet keyed resource expenditure must contain exactly tag, Unit id, and expended count.",
    );
  }
  const expended = parseResourceCount(value.expended);
  if (Result.isFailure(expended)) return Result.fail(expended.failure);
  const unitId = parsePointPoolResourceExpenditureUnitId(value);
  if (Result.isFailure(unitId)) return Result.fail(unitId.failure);
  return Result.succeed({
    tag: "pointPoolResource",
    unitId: unitId.success,
    expended: expended.success,
  });
}

function parseStoredSpellAccessFreeCastExpenditure(
  value: Readonly<Record<string, unknown>>,
): Result.Result<CharacterSheetResourceExpenditure, CharacterSheetIssue> {
  if (
    !recordHasExactKeys(value, [
      "tag",
      "sourceUnitId",
      "spellId",
      "expended",
    ]) ||
    typeof value.sourceUnitId !== "string" ||
    typeof value.spellId !== "string"
  ) {
    return characterSheetIssue(
      "Character Sheet Spell Access free-cast expenditure must contain exactly tag, source Unit id, spell Unit id, and expended count.",
    );
  }
  const expended = parseResourceCount(value.expended);
  if (Result.isFailure(expended)) return Result.fail(expended.failure);
  return Result.succeed({
    tag: "spellAccessFreeCast",
    sourceUnitId: authoredUnitId(value.sourceUnitId),
    spellId: authoredUnitId(value.spellId),
    expended: expended.success,
  });
}

function parseStoredLayOnHandsResourceExpenditure(
  value: Readonly<Record<string, unknown>>,
): Result.Result<CharacterSheetResourceExpenditure, CharacterSheetIssue> {
  if (!recordHasExactKeys(value, ["tag", "expended"])) {
    return characterSheetIssue(
      "Character Sheet tagged resource expenditure must contain exactly tag and expended count.",
    );
  }
  const expended = parseResourceCount(value.expended);
  if (Result.isFailure(expended)) return Result.fail(expended.failure);
  return Result.succeed({
    tag: "layOnHandsHealingPool",
    expended: expended.success,
  });
}

export function parseStoredDruidWildShapeKnownForms(
  value: unknown,
): Result.Result<
  CharacterSheetDruidWildShapeKnownForms | undefined,
  CharacterSheetIssue
> {
  if (value === undefined) return Result.succeed(undefined);
  if (
    !isRecord(value) ||
    !Array.isArray(value.statBlockIds) ||
    value.statBlockIds.some((statBlockId) => typeof statBlockId !== "string")
  ) {
    return characterSheetIssue("Expected Wild Shape known-form state.");
  }
  return Result.succeed({
    statBlockIds: value.statBlockIds,
  });
}

export function parseStoredDruidCircleLand(
  value: unknown,
): Result.Result<
  CharacterSheetDruidCircleLand | undefined,
  CharacterSheetIssue
> {
  if (value === undefined) return Result.succeed(undefined);
  if (!isRecord(value) || !isDruidCircleLandChoice(value.land)) {
    return characterSheetIssue(
      "Expected Circle of the Land selected land state.",
    );
  }
  return Result.succeed({ land: value.land });
}

function parseUseCountResourceExpenditureUnitId(
  expenditure: Record<string, unknown>,
): Result.Result<UnitRecord["id"], CharacterSheetIssue> {
  if (typeof expenditure.unitId !== "string") {
    return characterSheetIssue(
      "Character Sheet use-count expenditure requires a supported class feature Unit id.",
    );
  }
  return Result.succeed(authoredUnitId(expenditure.unitId));
}

function parsePointPoolResourceExpenditureUnitId(
  expenditure: Record<string, unknown>,
): Result.Result<CharacterSheetPointPoolResourceUnitId, CharacterSheetIssue> {
  if (
    typeof expenditure.unitId !== "string" ||
    !isCharacterSheetPointPoolResourceUnitId(authoredUnitId(expenditure.unitId))
  ) {
    return characterSheetIssue(
      "Character Sheet point-pool expenditure requires a supported class feature Unit id.",
    );
  }
  return Result.succeed(authoredUnitId(expenditure.unitId));
}

export function parseResourceCount(
  value: unknown,
): Result.Result<ResourceCount, CharacterSheetIssue> {
  return isNonNegativeInteger(value)
    ? Result.succeed(resourceCount(value))
    : characterSheetIssue("Expected nonnegative resource count.");
}

function parsePositiveResourceCount(
  value: unknown,
): Result.Result<ResourceCount, CharacterSheetIssue> {
  return isPositiveInteger(value)
    ? Result.succeed(resourceCount(value))
    : characterSheetIssue("Expected positive resource count.");
}

function parseSpellSlotLevel(
  value: unknown,
): Result.Result<SpellSlotLevel, CharacterSheetIssue> {
  return isPositiveInteger(value)
    ? Result.succeed(spellSlotLevel(value))
    : characterSheetIssue("Expected positive Spell Slot level.");
}

export function parseCharacterBuild(
  value: unknown,
  unitLibrary: UnitCatalog,
): Result.Result<CharacterBuild, CharacterSheetIssue> {
  if (!isRecord(value)) return characterSheetIssue("Expected Character Build.");
  const progression = parseStoredProgression(value.progression);
  if (Result.isFailure(progression)) return Result.fail(progression.failure);
  if (typeof value.background !== "string") {
    return characterSheetIssue("Character Build requires background Unit id.");
  }
  if (typeof value.species !== "string") {
    return characterSheetIssue("Character Build requires species Unit id.");
  }
  const originLanguages = parseStoredOriginLanguages(value.originLanguages);
  if (Result.isFailure(originLanguages))
    return Result.fail(originLanguages.failure);
  const alignment = parseStoredAlignment(value.alignment);
  if (Result.isFailure(alignment)) return Result.fail(alignment.failure);
  const abilityScores = parseStoredAbilityScores(value.abilityScores);
  if (Result.isFailure(abilityScores))
    return Result.fail(abilityScores.failure);
  const proficiencyChoices = parseStoredProficiencyChoices(
    value.proficiencyChoices,
  );
  if (Result.isFailure(proficiencyChoices)) {
    return Result.fail(proficiencyChoices.failure);
  }
  const speciesChoiceFacts = parseStoredSpeciesChoiceFacts(
    authoredUnitId(value.species),
    value.speciesChoiceFacts,
    unitLibrary,
  );
  if (Result.isFailure(speciesChoiceFacts)) {
    return Result.fail(speciesChoiceFacts.failure);
  }
  const features = parseStoredFeatures(value.features, unitLibrary);
  if (Result.isFailure(features)) return Result.fail(features.failure);
  const classFeatureLanguages = parseStoredClassFeatureLanguages({
    value: value.classFeatureLanguages,
    originLanguages: originLanguages.success,
    build: { progression: progression.success },
    unitLibrary,
  });
  if (Result.isFailure(classFeatureLanguages)) {
    return Result.fail(classFeatureLanguages.failure);
  }
  const spellcasting =
    value.spellcasting === undefined
      ? undefined
      : parseStoredSpellcasting(value.spellcasting);
  /* v8 ignore start -- @preserve -- Malformed stored build: the optional spellcasting object failed its boundary parser. */
  if (spellcasting !== undefined && Result.isFailure(spellcasting)) {
    return Result.fail(spellcasting.failure);
  }
  /* v8 ignore stop -- @preserve */
  const equipment = parseStoredEquipment(value.equipment);
  if (Result.isFailure(equipment)) return Result.fail(equipment.failure);

  const magicInitiateSpellAccesses =
    parseCharacterBuildMagicInitiateSpellAccesses({
      value: value.magicInitiateSpellAccesses,
      build: {
        background: authoredUnitId(value.background),
        species: authoredUnitId(value.species),
        features: features.success,
      },
      unitLibrary,
    });
  if (Result.isFailure(magicInitiateSpellAccesses)) {
    return characterSheetIssue(
      magicInitiateSpellAccesses.failure
        .map((issue) => issue.message)
        .join(" "),
    );
  }

  const build: CharacterBuild = {
    progression: progression.success,
    background: authoredUnitId(value.background),
    species: authoredUnitId(value.species),
    originLanguages: originLanguages.success,
    classFeatureLanguages: classFeatureLanguages.success,
    alignment: alignment.success,
    abilityScores: abilityScores.success,
    proficiencyChoices: proficiencyChoices.success,
    ...(speciesChoiceFacts.success === undefined
      ? {}
      : { speciesChoiceFacts: speciesChoiceFacts.success }),
    features: features.success,
    ...(spellcasting === undefined
      ? {}
      : { spellcasting: spellcasting.success }),
    magicInitiateSpellAccesses: magicInitiateSpellAccesses.success,
    equipment: equipment.success,
  };
  const validation = validateParsedCharacterBuild(build, unitLibrary);
  return Result.isFailure(validation)
    ? Result.fail(validation.failure)
    : Result.succeed(build);
}

function validateParsedCharacterBuild(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Result.Result<void, CharacterSheetIssue> {
  const bookOfShadowsIssue = storedBookOfShadowsSelectionIssue(
    build,
    unitLibrary,
  );
  if (Result.isFailure(bookOfShadowsIssue)) {
    return Result.fail(bookOfShadowsIssue.failure);
  }
  const eldritchInvocationIssue =
    storedEldritchInvocationKnownCantripSelectionIssue(build, unitLibrary);
  if (Result.isFailure(eldritchInvocationIssue)) {
    return Result.fail(eldritchInvocationIssue.failure);
  }
  const sorcererMetamagicIssue = storedSorcererMetamagicSelectionIssue(
    build,
    unitLibrary,
  );
  return Result.isFailure(sorcererMetamagicIssue)
    ? Result.fail(sorcererMetamagicIssue.failure)
    : Result.succeed(undefined);
}

type DraconicAncestryDamageTypeSource =
  DragonbornSpeciesRecord["draconicAncestry"]["damageType"];

function parseStoredSpeciesChoiceFacts(
  speciesId: UnitRecord["id"],
  value: unknown,
  unitLibrary: UnitCatalog,
): Result.Result<
  CharacterBuildSpeciesChoiceFacts | undefined,
  CharacterSheetIssue
> {
  const source = storedDraconicAncestryDamageTypeSource(speciesId, unitLibrary);
  if (Result.isFailure(source)) return Result.fail(source.failure);
  if (value === undefined) {
    /* v8 ignore start -- @preserve -- Malformed stored build: a species with an authored Draconic Ancestry source omitted its required selected ancestry fact. */
    return source.success === undefined
      ? Result.succeed(undefined)
      : characterSheetIssue(
          "Character Build requires selected Draconic Ancestry fact for species with a Draconic Ancestry source.",
        );
    /* v8 ignore stop -- @preserve */
  }
  if (!isRecord(value)) {
    return characterSheetIssue(
      "Expected Character Build species choice facts.",
    );
  }
  if (
    Object.keys(value).some((key) => key !== "draconicAncestry") ||
    !Object.hasOwn(value, "draconicAncestry")
  ) {
    return characterSheetIssue(
      "Character Build species choice facts must contain exactly supported species choice facts.",
    );
  }
  if (source.success === undefined) {
    return characterSheetIssue(
      "Character Build cannot carry Draconic Ancestry fact for species without a Draconic Ancestry source.",
    );
  }
  const draconicAncestry = parseStoredDraconicAncestryFact(
    value.draconicAncestry,
    source.success,
  );
  return Result.isFailure(draconicAncestry)
    ? Result.fail(draconicAncestry.failure)
    : Result.succeed({ draconicAncestry: draconicAncestry.success });
}

function storedDraconicAncestryDamageTypeSource(
  speciesId: UnitRecord["id"],
  unitLibrary: UnitCatalog,
): Result.Result<
  DraconicAncestryDamageTypeSource | undefined,
  CharacterSheetIssue
> {
  const speciesUnit = unitLibrary.getUnit(speciesId);
  if (Option.isNone(speciesUnit)) {
    return characterSheetIssue("Character Build species Unit id is unknown.");
  }
  if (speciesUnit.value.kind !== "species") {
    return characterSheetIssue(
      "Character Build species Unit id must reference a species Unit.",
    );
  }
  return Result.succeed(
    "draconicAncestry" in speciesUnit.value
      ? speciesUnit.value.draconicAncestry.damageType
      : undefined,
  );
}

function parseStoredDraconicAncestryFact(
  value: unknown,
  source: DraconicAncestryDamageTypeSource,
): Result.Result<
  NonNullable<CharacterBuildSpeciesChoiceFacts["draconicAncestry"]>,
  CharacterSheetIssue
> {
  if (!isRecord(value)) {
    return characterSheetIssue(
      "Expected Character Build Draconic Ancestry fact.",
    );
  }
  if (
    Object.keys(value).some((key) => key !== "kind" && key !== "ancestorId") ||
    value.kind !== "draconicAncestry" ||
    typeof value.ancestorId !== "string"
  ) {
    return characterSheetIssue(
      "Character Build Draconic Ancestry fact must contain exactly selected ancestry fact fields.",
    );
  }
  const selected = source.options.find(
    (option) => option.id === value.ancestorId,
  );
  if (selected === undefined) {
    return characterSheetIssue(
      "Character Build Draconic Ancestry fact must reference the selected species source table.",
    );
  }
  return Result.succeed({
    kind: "draconicAncestry",
    ancestorId: characterDraconicAncestrySelection(value.ancestorId),
  });
}

function storedSorcererMetamagicSelectionIssue(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Result.Result<void, CharacterSheetIssue> {
  const facts = characterBuildSorcererMetamagicFacts({ build, unitLibrary });
  return Result.isFailure(facts)
    ? characterSheetIssue(facts.failure.message)
    : Result.succeed(undefined);
}

function storedEldritchInvocationKnownCantripSelectionIssue(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Result.Result<void, CharacterSheetIssue> {
  const knownWarlockCantrips = knownWarlockCantripIdsForStoredBuild(
    build,
    unitLibrary,
  );
  for (const feature of build.features) {
    if (
      feature.kind !== "selectedEldritchInvocation" ||
      feature.selection.kind !== "repeatable" ||
      feature.selection.repeatableChoice.kind !== "knownWarlockCantrip"
    ) {
      continue;
    }
    if (
      !knownWarlockCantrips.has(feature.selection.repeatableChoice.cantripId)
    ) {
      return characterSheetIssue(
        "Character Build Eldritch Invocation repeatable known cantrip choice must be a known Warlock cantrip.",
      );
    }
  }
  return Result.succeed(undefined);
}

function knownWarlockCantripIdsForStoredBuild(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): ReadonlySet<UnitRecord["id"]> {
  const cantripIds = new Set<UnitRecord["id"]>();
  for (const source of build.spellcasting?.sources ?? []) {
    const sourceClassName = classUnitIdToClassName({
      unitLibrary,
      classUnitId: source.sourceUnitId,
    });
    if (
      Result.isFailure(sourceClassName) ||
      sourceClassName.success !== "warlock"
    ) {
      continue;
    }
    for (const cantripId of source.cantrips) {
      if (
        allCantripsFromClassSpellList({
          className: "warlock",
          spellIds: [cantripId],
          unitLibrary,
        })
      ) {
        cantripIds.add(cantripId);
      }
    }
  }
  return cantripIds;
}

function parseStoredProgression(
  value: unknown,
): Result.Result<CharacterBuild["progression"], CharacterSheetIssue> {
  if (!isRecord(value) || typeof value.startingClass !== "string") {
    return characterSheetIssue("Character Build requires progression.");
  }
  if (!Array.isArray(value.advancements)) {
    return characterSheetIssue(
      "Character Build progression requires advancements.",
    );
  }
  const advancements = [];
  for (const advancement of value.advancements) {
    if (
      !isRecord(advancement) ||
      typeof advancement.classUnitId !== "string" ||
      !isRecord(advancement.hitPointRule) ||
      advancement.hitPointRule.tag !== "fixedHigherLevelGain"
    ) {
      return characterSheetIssue(
        "Character Build progression advancement is invalid.",
      );
    }
    advancements.push({
      classUnitId: classUnitId(authoredUnitId(advancement.classUnitId)),
      hitPointRule: { tag: "fixedHigherLevelGain" as const },
    });
  }
  const totalLevel = 1 + advancements.length;
  if (!CHARACTER_CLASS_LEVELS.some((level) => level === totalLevel)) {
    return characterSheetIssue("Character Build progression is invalid.");
  }
  return Result.succeed({
    startingClass: classUnitId(authoredUnitId(value.startingClass)),
    advancements,
  });
}

function storedBookOfShadowsSelectionIssue(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Result.Result<void, CharacterSheetIssue> {
  const sources =
    build.spellcasting?.sources.filter(
      (source) => source.bookOfShadows !== undefined,
    ) ?? [];
  if (sources.length === 0) {
    return Result.succeed(undefined);
  }
  /* v8 ignore start -- @preserve -- Malformed stored build: Book of Shadows access disagrees with its single admitted Pact-of-the-Tome Warlock source or selected spell roster. */
  if (sources.length !== 1) {
    return characterSheetIssue(
      "Character Build supports one Book of Shadows Spell Access source.",
    );
  }
  if (!hasSelectedWarlockEldritchInvocation(build, unitLibrary)) {
    return characterSheetIssue(
      "Character Build Book of Shadows Spell Access requires Pact of the Tome.",
    );
  }
  const source = sources[0];
  const access = source.bookOfShadows;
  if (access === undefined) {
    return characterSheetIssue(
      "Character Build Book of Shadows Spell Access source is missing its selection.",
    );
  }
  const sourceUnit = getRequiredUnit(unitLibrary, source.sourceUnitId);
  if (Result.isFailure(sourceUnit)) {
    return Result.fail(sourceUnit.failure);
  }
  if (
    sourceUnit.success.kind !== "class" ||
    sourceUnit.success.className !== "warlock"
  ) {
    return characterSheetIssue(
      "Character Build Book of Shadows Spell Access requires the Warlock spellcasting source.",
    );
  }
  const selectedSpellIds = [...access.cantrips, ...access.ritualSpells];
  if (new Set(selectedSpellIds).size !== selectedSpellIds.length) {
    return characterSheetIssue(
      "Character Build Book of Shadows Spell Access selections must be distinct.",
    );
  }
  const preparedOrKnown = new Set([
    ...source.cantrips,
    ...source.preparedSpells,
    ...featurePreparedSpellIdsForBuild(build, unitLibrary),
  ]);
  if (selectedSpellIds.some((spellId) => preparedOrKnown.has(spellId))) {
    return characterSheetIssue(
      "Character Build Book of Shadows Spell Access cannot select spells the character already has prepared or known.",
    );
  }
  if (
    !allCantripsFromAnyClassSpellList({
      spellIds: access.cantrips,
      unitLibrary,
    })
  ) {
    return characterSheetIssue(
      "Character Build Book of Shadows cantrips must come from class spell lists.",
    );
  }
  if (
    !allLeveledSpellsFromAnyClassSpellList({
      spells: access.ritualSpells.map((spellId) => ({
        spellId,
        spellLevel: 1,
      })),
      unitLibrary,
    })
  ) {
    return characterSheetIssue(
      "Character Build Book of Shadows Ritual spells must be level-1 spells from class spell lists.",
    );
  }
  const cantrips = spellSourcesForIds(unitLibrary, access.cantrips);
  if (Result.isFailure(cantrips)) {
    return Result.fail(cantrips.failure);
  }
  const ritualSpells = spellSourcesForIds(unitLibrary, access.ritualSpells);
  if (Result.isFailure(ritualSpells)) {
    return Result.fail(ritualSpells.failure);
  }
  if (cantrips.success.some((spell) => spell.mechanics.level !== 0)) {
    return characterSheetIssue(
      "Character Build Book of Shadows cantrip selections must be cantrip Spell Definitions.",
    );
  }
  if (
    ritualSpells.success.some(
      (spell) =>
        spell.mechanics.level !== 1 || !characterSheetSpellHasRitualTag(spell),
    )
  ) {
    return characterSheetIssue(
      "Character Build Book of Shadows Ritual selections must be level-1 ritual-tagged Spell Definitions.",
    );
  }
  /* v8 ignore stop -- @preserve */
  return Result.succeed(undefined);
}

function hasSelectedWarlockEldritchInvocation(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): boolean {
  return build.features.some((feature) => {
    if (
      feature.kind !== "selectedEldritchInvocation" ||
      feature.selection.invocationId !==
        eldritchInvocationId("pact_of_the_tome")
    ) {
      return false;
    }
    const source = unitLibrary.getUnit(feature.selectedFromUnitId);
    const projection = Option.isSome(source)
      ? projectCharacterSheetClassFeature(source.value)
      : Option.none();
    /* v8 ignore start -- @preserve -- Malformed stored build: a selected Pact of the Tome invocation references a missing or non-feature source Unit. */
    if (Option.isNone(projection)) {
      return false;
    }
    /* v8 ignore stop -- @preserve */
    const mechanics = projection.value.mechanics;
    return (
      mechanics.family === "feature_choice" &&
      mechanics.optionSource.kind === "class_feature_options" &&
      mechanics.optionSource.className === "warlock" &&
      mechanics.optionSource.optionKind === "eldritch_invocation"
    );
  });
}

function spellSourcesForIds(
  unitLibrary: UnitCatalog,
  spellIds: readonly UnitRecord["id"][],
): Result.Result<readonly CharacterSheetSpellSource[], CharacterSheetIssue> {
  const spells: CharacterSheetSpellSource[] = [];
  for (const spellId of spellIds) {
    const spell = getRequiredUnit(unitLibrary, spellId);
    /* v8 ignore start -- @preserve -- Malformed stored build: an admitted Book of Shadows selection references a missing or non-spell Unit. */
    if (Result.isFailure(spell)) {
      return Result.fail(spell.failure);
    }
    const projection = projectCharacterSheetSpellSource(spell.success);
    if (Option.isNone(projection)) {
      return characterSheetIssue(
        `Character Build Book of Shadows selection must reference Spell Definitions: ${spellId}`,
      );
    }
    /* v8 ignore stop -- @preserve */
    spells.push(projection.value);
  }
  return Result.succeed(spells);
}

function parseStoredOriginLanguages(
  value: unknown,
): Result.Result<CharacterBuild["originLanguages"], CharacterSheetIssue> {
  if (
    !Array.isArray(value) ||
    value.length !== 3 ||
    value[0] !== "Common" ||
    !value.every(isStandardLanguage) ||
    new Set(value).size !== value.length
  ) {
    return characterSheetIssue("Character Build requires origin languages.");
  }
  /* v8 ignore start -- @preserve -- Malformed stored build: origin-language data passed structural checks but failed the narrowed starting-language tuple guard. */
  return isCharacterStartingLanguages(value)
    ? Result.succeed(value)
    : characterSheetIssue("Character Build requires origin languages.");
  /* v8 ignore stop -- @preserve */
}

function parseStoredClassFeatureLanguages(input: {
  readonly value: unknown;
  readonly originLanguages: CharacterBuild["originLanguages"];
  readonly build: Pick<CharacterBuild, "progression">;
  readonly unitLibrary: UnitCatalog;
}): Result.Result<
  CharacterBuild["classFeatureLanguages"],
  CharacterSheetIssue
> {
  const { value, originLanguages, build, unitLibrary } = input;
  /* v8 ignore start -- @preserve -- Malformed stored build: class-feature language state is absent instead of the required list. */
  if (!Array.isArray(value)) {
    return characterSheetIssue(
      "Character Build requires class-feature languages.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const knownLanguages = new Set<StoredClassFeatureLanguage>(originLanguages);
  const ownedClassFeatureUnitIds = new Set(
    storedClassFeatureLanguageSourceUnitIds(build, unitLibrary),
  );
  const expectedProjection = storedClassFeatureLanguageProjection({
    ownedClassFeatureUnitIds,
    unitLibrary,
  });
  /* v8 ignore start -- @preserve -- Malformed catalog correlation: an owned class-feature language source cannot be projected from its installed Unit facts. */
  if (Result.isFailure(expectedProjection)) {
    return Result.fail(expectedProjection.failure);
  }
  /* v8 ignore stop -- @preserve */
  const choiceCountsBySourceUnitId = new Map<UnitRecord["id"], number>();
  const fixedLanguagesBySourceUnitId = new Map<
    UnitRecord["id"],
    Set<StoredClassFeatureLanguage>
  >();
  const classFeatureLanguages: StoredClassFeatureLanguageFact[] = [];
  for (const item of value) {
    /* v8 ignore start -- @preserve -- Malformed stored build: a class-feature language entry must match one of the two exact typed language-fact shapes. */
    if (
      !isRecord(item) ||
      (item.kind !== "classFeatureLanguageGrant" &&
        item.kind !== "classFeatureLanguageChoice") ||
      typeof item.sourceUnitId !== "string" ||
      !isLanguage(item.language)
    ) {
      return characterSheetIssue(
        "Character Build requires class-feature language facts.",
      );
      /* v8 ignore stop -- @preserve */
    }
    const languageFact: StoredClassFeatureLanguageFact = {
      kind: item.kind,
      sourceUnitId: authoredUnitId(item.sourceUnitId),
      language: item.language,
    };

    if (!ownedClassFeatureUnitIds.has(languageFact.sourceUnitId)) {
      return characterSheetIssue(
        `Character Build class-feature language source Unit ${languageFact.sourceUnitId} is not owned by the build.`,
      );
    }
    /* v8 ignore start -- @preserve -- Malformed stored build: a class-feature language duplicates an already retained language. */
    if (knownLanguages.has(languageFact.language)) {
      return characterSheetIssue(
        `Duplicate Character Build language ${languageFact.language}.`,
      );
    }
    /* v8 ignore stop -- @preserve */
    if (
      languageFact.kind === "classFeatureLanguageChoice" &&
      expectedProjection.success.fixedLanguages.has(languageFact.language)
    ) {
      return characterSheetIssue(
        `Duplicate Character Build language ${languageFact.language}.`,
      );
    }
    const sourceMatch = storedClassFeatureLanguageMatchesSourceUnit({
      languageFact,
      unitLibrary,
    });
    /* v8 ignore start -- @preserve -- Malformed stored build: a retained class-feature language does not match its installed source Unit grant. */
    if (Result.isFailure(sourceMatch)) {
      return Result.fail(sourceMatch.failure);
    }
    /* v8 ignore stop -- @preserve */
    if (languageFact.kind === "classFeatureLanguageChoice") {
      choiceCountsBySourceUnitId.set(
        languageFact.sourceUnitId,
        (choiceCountsBySourceUnitId.get(languageFact.sourceUnitId) ?? 0) + 1,
      );
    } else {
      const sourceLanguages =
        fixedLanguagesBySourceUnitId.get(languageFact.sourceUnitId) ??
        new Set<StoredClassFeatureLanguage>();
      sourceLanguages.add(languageFact.language);
      fixedLanguagesBySourceUnitId.set(
        languageFact.sourceUnitId,
        sourceLanguages,
      );
    }

    knownLanguages.add(languageFact.language);
    classFeatureLanguages.push(languageFact);
  }

  for (const [sourceUnitId, expectedLanguages] of expectedProjection.success
    .fixedLanguagesBySourceUnitId) {
    const storedLanguages =
      fixedLanguagesBySourceUnitId.get(sourceUnitId) ??
      new Set<StoredClassFeatureLanguage>();
    for (const expectedLanguage of expectedLanguages) {
      if (!storedLanguages.has(expectedLanguage)) {
        return characterSheetIssue(
          `Character Build class-feature language projection is incomplete for source Unit ${sourceUnitId}.`,
        );
      }
    }
  }

  for (const [sourceUnitId, expectedCount] of expectedProjection.success
    .choiceCountsBySourceUnitId) {
    const selectedCount = choiceCountsBySourceUnitId.get(sourceUnitId) ?? 0;
    if (selectedCount !== expectedCount) {
      return characterSheetIssue(
        `Character Build class-feature language choices for source Unit ${sourceUnitId} must match the source choice count.`,
      );
    }
  }

  return Result.succeed(classFeatureLanguages);
}

function storedClassFeatureLanguageSourceUnitIds(
  build: Pick<CharacterBuild, "progression">,
  unitLibrary: UnitCatalog,
): readonly UnitRecord["id"][] {
  return progressionClassUnitIds(build.progression).flatMap((classUnitId) => {
    const unit = unitLibrary.getUnit(classUnitId);
    /* v8 ignore next -- @preserve -- Malformed build/catalog correlation: every class id admitted into stored progression must resolve in its retained Unit catalog. */
    if (Option.isNone(unit)) return [];
    const facts = readClassCreationFacts(unit.value);
    /* v8 ignore next -- @preserve -- Unsupported authored data: stored progression admits only class Units with readable creation facts. */
    if (facts.tag !== "readable") return [];
    return facts.value.featureGrants
      .filter(
        (grant) =>
          grant.level <= classLevelForUnit(build.progression, classUnitId),
      )
      .map((grant) => grant.unitId);
  });
}

function storedClassFeatureLanguageMatchesSourceUnit(input: {
  readonly languageFact: StoredClassFeatureLanguageFact;
  readonly unitLibrary: UnitCatalog;
}): Result.Result<void, CharacterSheetIssue> {
  const sourceUnit = input.unitLibrary.getUnit(input.languageFact.sourceUnitId);
  const projection = Option.isSome(sourceUnit)
    ? projectCharacterSheetClassFeature(sourceUnit.value)
    : Option.none();
  /* v8 ignore start -- @preserve -- Malformed stored build: a class-feature language fact must reference its admitted passive class-feature Unit. */
  if (
    Option.isNone(projection) ||
    projection.value.mechanics.family !== "passive"
  ) {
    return characterSheetIssue(
      `Character Build class-feature language does not match source Unit ${input.languageFact.sourceUnitId}.`,
    );
    /* v8 ignore stop -- @preserve */
  }

  if (input.languageFact.kind === "classFeatureLanguageChoice") {
    /* v8 ignore start -- @preserve -- Malformed stored build: a choice language fact references a source with no language-choice grant. */
    return storedClassFeatureLanguageChoiceGrantCount(projection.value) ===
      undefined
      ? characterSheetIssue(
          `Character Build class-feature language does not match source Unit ${input.languageFact.sourceUnitId}.`,
        )
      : Result.succeed(undefined);
    /* v8 ignore stop -- @preserve */
  }

  const matches = projection.value.mechanics.grants.some((grant) => {
    if (grant.kind !== "grant_language") return false;
    const language = languageFromSurfaceLanguageId(grant.languageId);
    return (
      Result.isSuccess(language) &&
      language.success === input.languageFact.language
    );
  });
  /* v8 ignore start -- @preserve -- Malformed stored build: a fixed language fact is absent from the installed source Unit's fixed grants. */
  return matches
    ? Result.succeed(undefined)
    : characterSheetIssue(
        `Character Build class-feature language does not match source Unit ${input.languageFact.sourceUnitId}.`,
      );
  /* v8 ignore stop -- @preserve */
}

function storedClassFeatureLanguageProjection(input: {
  readonly ownedClassFeatureUnitIds: ReadonlySet<UnitRecord["id"]>;
  readonly unitLibrary: UnitCatalog;
}): Result.Result<StoredClassFeatureLanguageProjection, CharacterSheetIssue> {
  const fixedLanguagesBySourceUnitId = new Map<
    UnitRecord["id"],
    Set<StoredClassFeatureLanguage>
  >();
  const fixedLanguages = new Set<StoredClassFeatureLanguage>();
  const choiceCountsBySourceUnitId = new Map<UnitRecord["id"], number>();
  for (const sourceUnitId of input.ownedClassFeatureUnitIds) {
    const sourceUnit = input.unitLibrary.getUnit(sourceUnitId);
    const projection = Option.isSome(sourceUnit)
      ? projectCharacterSheetClassFeature(sourceUnit.value)
      : Option.none();
    if (
      Option.isNone(projection) ||
      projection.value.mechanics.family !== "passive"
    ) {
      continue;
    }
    const choiceCount = storedClassFeatureLanguageChoiceGrantCount(
      projection.value,
    );
    if (choiceCount !== undefined) {
      choiceCountsBySourceUnitId.set(sourceUnitId, choiceCount);
    }
    for (const grant of projection.value.mechanics.grants) {
      if (grant.kind !== "grant_language") continue;
      const language = languageFromSurfaceLanguageId(grant.languageId);
      /* v8 ignore start -- @preserve -- Malformed installed content: a supported fixed-language grant carries an id outside the shared language codec. */
      if (Result.isFailure(language)) {
        return characterSheetIssue(
          `Unsupported class-feature language id ${grant.languageId} on Unit ${sourceUnitId}.`,
        );
      }
      /* v8 ignore stop -- @preserve */
      const sourceLanguages =
        fixedLanguagesBySourceUnitId.get(sourceUnitId) ??
        new Set<StoredClassFeatureLanguage>();
      sourceLanguages.add(language.success);
      fixedLanguagesBySourceUnitId.set(sourceUnitId, sourceLanguages);
      fixedLanguages.add(language.success);
    }
  }
  return Result.succeed({
    fixedLanguagesBySourceUnitId,
    fixedLanguages,
    choiceCountsBySourceUnitId,
  });
}

function storedClassFeatureLanguageChoiceGrantCount(
  sourceFacts: CharacterSheetClassFeatureFacts,
): number | undefined {
  /* v8 ignore start -- @preserve -- Unsupported stored language source: only admitted passive class-feature Units can contribute a language-choice count. */
  if (sourceFacts.mechanics.family !== "passive") {
    return undefined;
    /* v8 ignore stop -- @preserve */
  }
  const choiceGrantCount = sourceFacts.mechanics.grants.reduce(
    (count, grant) =>
      grant.kind === "grant_language_choice" &&
      grant.source === "character_creation_language_tables"
        ? count + grant.count
        : count,
    0,
  );
  return choiceGrantCount === 0 ? undefined : choiceGrantCount;
}

function parseStoredAlignment(
  value: unknown,
): Result.Result<CharacterBuild["alignment"], CharacterSheetIssue> {
  if (!isRecord(value)) {
    return characterSheetIssue("Character Build requires alignment.");
  }
  const order = value.order;
  const morality = value.morality;
  if (!isAlignmentOrder(order) || !isAlignmentMorality(morality)) {
    return characterSheetIssue("Character Build requires alignment.");
  }
  return Result.succeed({ order, morality });
}

function isAlignmentOrder(value: unknown): value is AlignmentOrder {
  return ALIGNMENT_ORDERS.some((order) => order === value);
}

function isAlignmentMorality(value: unknown): value is AlignmentMorality {
  return ALIGNMENT_MORALITIES.some((morality) => morality === value);
}

function parseStoredAbilityScores(
  value: unknown,
): Result.Result<CharacterBuild["abilityScores"], CharacterSheetIssue> {
  /* v8 ignore start -- @preserve -- Malformed stored build: ability scores are not represented by the required record. */
  if (!isRecord(value)) {
    return characterSheetIssue("Character Build requires ability scores.");
  }
  /* v8 ignore stop -- @preserve */
  const scores = Object.fromEntries(
    ABILITIES.map((ability) => [ability, value[ability]]),
  );
  const parsed = abilityScoreAssignment(scores);
  return Result.isFailure(parsed)
    ? characterSheetIssue("Character Build ability scores are invalid.")
    : Result.succeed(parsed.success);
}

function parseStoredProficiencyChoices(
  value: unknown,
): Result.Result<
  readonly CharacterBuildProficiencyChoiceSubject[],
  CharacterSheetIssue
> {
  if (!Array.isArray(value)) {
    return characterSheetIssue("Character Build requires proficiency choices.");
  }
  const choices: CharacterBuildProficiencyChoiceSubject[] = [];
  for (const choice of value) {
    if (!isRecord(choice) || typeof choice.kind !== "string") {
      return characterSheetIssue(
        "Character Build proficiency choice is invalid.",
      );
    }
    if (choice.kind === "skill" && isCharacterBuildSkill(choice.skill)) {
      choices.push({ kind: "skill", skill: choice.skill });
    } else if (
      choice.kind === "skill_expertise" &&
      isCharacterBuildSkill(choice.skill)
    ) {
      choices.push({ kind: "skill_expertise", skill: choice.skill });
    } else if (
      choice.kind === "weapon_category" &&
      isWeaponProficiencyCategory(choice.category)
    ) {
      choices.push({ kind: "weapon_category", category: choice.category });
    } else if (
      choice.kind === "armor_category" &&
      isArmorTrainingCategory(choice.category)
    ) {
      choices.push({ kind: "armor_category", category: choice.category });
    } else if (
      choice.kind === "tool" &&
      typeof choice.toolId === "string" &&
      isCharacterBuildToolProficiencyId(choice.toolId)
    ) {
      choices.push({ kind: "tool", toolId: toolProficiencyId(choice.toolId) });
    } else {
      return characterSheetIssue(
        "Character Build proficiency choice is invalid.",
      );
    }
  }
  return Result.succeed(choices);
}

type CharacterBuildSkill = Extract<
  CharacterBuildProficiencyChoiceSubject,
  { readonly kind: "skill" | "skill_expertise" }
>["skill"];
type WeaponProficiencyCategory = Extract<
  CharacterBuildProficiencyChoiceSubject,
  { readonly kind: "weapon_category" }
>["category"];
type ArmorTrainingCategory = Extract<
  CharacterBuildProficiencyChoiceSubject,
  { readonly kind: "armor_category" }
>["category"];

function isCharacterBuildSkill(value: unknown): value is CharacterBuildSkill {
  return SKILLS.some((skill) => skill === value);
}

function isWeaponProficiencyCategory(
  value: unknown,
): value is WeaponProficiencyCategory {
  return WEAPON_PROFICIENCY_CATEGORY_VALUES.some(
    (category) => category === value,
  );
}

function isArmorTrainingCategory(
  value: unknown,
): value is ArmorTrainingCategory {
  return ARMOR_TRAINING_CATEGORY_VALUES.some((category) => category === value);
}

function parseStoredFeatures(
  value: unknown,
  unitLibrary: UnitCatalog,
): Result.Result<readonly CharacterBuildFeature[], CharacterSheetIssue> {
  if (!Array.isArray(value)) {
    return characterSheetIssue("Character Build requires features.");
  }
  const features = [];
  for (const feature of value) {
    if (!isRecord(feature) || typeof feature.selectedFromUnitId !== "string") {
      return characterSheetIssue("Character Build feature is invalid.");
    }
    if (
      feature.kind === "selectedClassChoice" &&
      typeof feature.unitId === "string"
    ) {
      features.push({
        kind: "selectedClassChoice" as const,
        unitId: authoredUnitId(feature.unitId),
        selectedFromUnitId: authoredUnitId(feature.selectedFromUnitId),
      });
    } else if (
      feature.kind === "selectedEldritchInvocation" &&
      isRecord(feature.selection)
    ) {
      const selection = parseStoredEldritchInvocationSelection(
        feature.selection,
        unitLibrary,
      );
      if (Result.isFailure(selection)) {
        return Result.fail(selection.failure);
      }
      features.push({
        kind: "selectedEldritchInvocation" as const,
        selection: selection.success,
        selectedFromUnitId: authoredUnitId(feature.selectedFromUnitId),
      });
    } else if (
      feature.kind === "selectedSorcererMetamagicOption" &&
      typeof feature.optionId === "string"
    ) {
      const optionId = sorcererMetamagicOptionId(feature.optionId);
      /* v8 ignore start -- @preserve -- Malformed stored build: a selected Metamagic option id is outside the installed closed option roster. */
      if (Result.isFailure(optionId)) {
        return characterSheetIssue(
          "Character Build Sorcerer Metamagic option selection is invalid.",
        );
      }
      /* v8 ignore stop -- @preserve */
      features.push({
        kind: "selectedSorcererMetamagicOption" as const,
        optionId: optionId.success,
        selectedFromUnitId: authoredUnitId(feature.selectedFromUnitId),
      });
    } else if (feature.kind === "abilityCheckBonus") {
      const abilityCheckBonus = parseStoredAbilityCheckBonusFeature({
        feature,
        selectedFromUnitId: feature.selectedFromUnitId,
      });
      if (Result.isFailure(abilityCheckBonus)) {
        return Result.fail(abilityCheckBonus.failure);
      }
      features.push(abilityCheckBonus.success);
    } else {
      return characterSheetIssue("Character Build feature is invalid.");
    }
  }
  return Result.succeed(features);
}

function parseStoredEldritchInvocationSelection(
  value: Readonly<Record<string, unknown>>,
  unitLibrary: UnitCatalog,
): Result.Result<
  Extract<
    CharacterBuildFeature,
    { readonly kind: "selectedEldritchInvocation" }
  >["selection"],
  CharacterSheetIssue
> {
  /* v8 ignore start -- @preserve -- Malformed stored build: an Eldritch Invocation selection omits its string invocation id or names no installed option. */
  if (typeof value.invocationId !== "string") {
    return characterSheetIssue(
      "Character Build Eldritch Invocation selection is invalid.",
    );
  }
  const invocationId = eldritchInvocationId(value.invocationId);
  const option = eldritchInvocationOptionForInvocationId(invocationId);
  if (option === undefined) {
    return characterSheetIssue(
      "Character Build Eldritch Invocation selection is invalid.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (option.repeatability.kind === "once") {
    return value.kind === "nonRepeatable"
      ? Result.succeed({ kind: "nonRepeatable", invocationId })
      : characterSheetIssue(
          "Character Build Eldritch Invocation selection is invalid.",
        );
  }

  if (value.kind !== "repeatable") {
    return characterSheetIssue(
      "Character Build Eldritch Invocation selection is invalid.",
    );
  }
  const repeatableChoiceInput = value.repeatableChoice;
  const repeatableChoice = parseStoredEldritchInvocationRepeatableChoice(
    repeatableChoiceInput,
  );
  if (Result.isFailure(repeatableChoice)) {
    return Result.fail(repeatableChoice.failure);
  }

  return eldritchInvocationRepeatableChoiceSatisfiesRule({
    unitLibrary,
    choiceRule: option.repeatability.choice,
    repeatableChoice: repeatableChoice.success,
  })
    ? Result.succeed({
        kind: "repeatable",
        invocationId,
        repeatableChoice: repeatableChoice.success,
      })
    : characterSheetIssue(
        "Character Build Eldritch Invocation repeatable choice is invalid.",
      );
}

function parseStoredEldritchInvocationRepeatableChoice(
  value: unknown,
): Result.Result<
  CharacterBuildEldritchInvocationRepeatableChoice,
  CharacterSheetIssue
> {
  /* v8 ignore start -- @preserve -- Malformed stored build: a repeatable invocation choice is not one of the two typed choice records. */
  if (!isRecord(value) || typeof value.kind !== "string") {
    return characterSheetIssue(
      "Character Build Eldritch Invocation repeatable choice is invalid.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (
    value.kind === "knownWarlockCantrip" &&
    typeof value.cantripId === "string"
  ) {
    return Result.succeed({
      kind: "knownWarlockCantrip",
      cantripId: authoredUnitId(value.cantripId),
    });
  }
  if (value.kind === "originFeat" && typeof value.featUnitId === "string") {
    return Result.succeed({
      kind: "originFeat",
      featUnitId: authoredUnitId(value.featUnitId),
    });
  }
  return characterSheetIssue(
    "Character Build Eldritch Invocation repeatable choice is invalid.",
  );
}

function parseStoredAbilityCheckBonusFeature(input: {
  readonly feature: Readonly<Record<string, unknown>>;
  readonly selectedFromUnitId: string;
}): Result.Result<CharacterBuildFeature, CharacterSheetIssue> {
  const { feature } = input;
  if (
    !Array.isArray(feature.skills) ||
    !feature.skills.every(isSurfaceSkill) ||
    !isAbility(feature.ability) ||
    !isRecord(feature.bonus) ||
    feature.bonus.kind !== "abilityModifier" ||
    !isAbility(feature.bonus.ability) ||
    typeof feature.bonus.minimum !== "number"
  ) {
    return characterSheetIssue("Character Build feature is invalid.");
  }

  return Result.succeed({
    kind: "abilityCheckBonus" as const,
    ability: feature.ability,
    skills: feature.skills,
    bonus: {
      kind: "abilityModifier" as const,
      ability: feature.bonus.ability,
      minimum: feature.bonus.minimum,
    },
    selectedFromUnitId: authoredUnitId(input.selectedFromUnitId),
  });
}

function parseStoredSpellcasting(
  value: unknown,
): Result.Result<CharacterBuildSpellcasting, CharacterSheetIssue> {
  /* v8 ignore start -- @preserve -- Malformed stored build: spellcasting omits its required nonempty source list. */
  if (
    !isRecord(value) ||
    !Array.isArray(value.sources) ||
    value.sources.length === 0
  ) {
    return characterSheetIssue(
      "Character Build spellcasting requires sources.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const sources = value.sources.map(parseStoredSpellcastingSource);
  const firstIssue = sources.find(Result.isFailure);
  /* v8 ignore next -- @preserve -- Malformed stored build: every raw spellcasting source is parsed before a CharacterBuildSpellcasting value is constructed. */
  if (firstIssue !== undefined) return Result.fail(firstIssue.failure);
  const slotPools = parseStoredSpellSlotPools(value.slotPools);
  /* v8 ignore next -- @preserve -- Malformed stored build: raw spell-slot pools are parsed before a CharacterBuildSpellcasting value is constructed. */
  if (Result.isFailure(slotPools)) return Result.fail(slotPools.failure);
  const parsedSources = sources
    .filter(Result.isSuccess)
    .map((source) => source.success);
  const [firstSource, ...remainingSources] = parsedSources;
  /* v8 ignore start -- @preserve -- The nonempty source-list check above makes an absent first parsed source an internal impossibility. */
  if (firstSource === undefined) {
    return characterSheetIssue(
      "Character Build spellcasting requires sources.",
    );
  }
  /* v8 ignore stop -- @preserve */
  return Result.succeed({
    sources: [firstSource, ...remainingSources],
    slotPools: slotPools.success,
  });
}

function parseStoredSpellcastingSource(
  value: unknown,
): Result.Result<CharacterBuildSpellcastingSource, CharacterSheetIssue> {
  /* v8 ignore start -- @preserve -- Malformed stored build: a spellcasting source fails its required scalar and list field shape. */
  if (
    !isRecord(value) ||
    typeof value.sourceUnitId !== "string" ||
    !isAbility(value.spellcastingAbility) ||
    !isStringArray(value.cantrips) ||
    !isStringArray(value.spellbook) ||
    !isStringArray(value.preparedSpells) ||
    !Array.isArray(value.spellcastingFocuses)
  ) {
    return characterSheetIssue(
      "Character Build spellcasting source is invalid.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const bookOfShadows =
    value.bookOfShadows === undefined
      ? undefined
      : parseStoredBookOfShadowsSpellAccess(value.bookOfShadows);
  /* v8 ignore start -- @preserve -- Malformed stored build: the optional Book of Shadows access object failed its boundary parser. */
  if (bookOfShadows !== undefined && Result.isFailure(bookOfShadows)) {
    return Result.fail(bookOfShadows.failure);
  }
  /* v8 ignore stop -- @preserve */
  return Result.succeed({
    sourceUnitId: authoredUnitId(value.sourceUnitId),
    spellcastingAbility: value.spellcastingAbility,
    cantrips: value.cantrips.map(authoredUnitId),
    spellbook: value.spellbook.map(authoredUnitId),
    preparedSpells: value.preparedSpells.map(authoredUnitId),
    spellcastingFocuses:
      value.spellcastingFocuses as readonly CharacterBuildSpellcastingFocus[],
    ...(bookOfShadows === undefined
      ? {}
      : { bookOfShadows: bookOfShadows.success }),
  });
}

function parseStoredBookOfShadowsSpellAccess(
  value: unknown,
): Result.Result<CharacterBuildBookOfShadowsSpellAccess, CharacterSheetIssue> {
  /* v8 ignore start -- @preserve -- Malformed stored build: Book of Shadows access fails its exact tagged-record shape. */
  if (
    !isRecord(value) ||
    value.tag !== "bookOfShadows" ||
    value.spellcastingFocus !== "book_of_shadows"
  ) {
    return characterSheetIssue(
      "Character Build Book of Shadows Spell Access is invalid.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const cantrips = parseStoredBookOfShadowsCantripIds(value.cantrips);
  /* v8 ignore start -- @preserve -- Malformed stored build: the Book of Shadows cantrip roster failed its exact-cardinality parser. */
  if (Result.isFailure(cantrips)) {
    return Result.fail(cantrips.failure);
  }
  /* v8 ignore stop -- @preserve */
  const ritualSpells = parseStoredBookOfShadowsRitualSpellIds(
    value.ritualSpells,
  );
  /* v8 ignore start -- @preserve -- Malformed stored build: the Book of Shadows ritual roster failed its exact-cardinality parser. */
  if (Result.isFailure(ritualSpells)) {
    return Result.fail(ritualSpells.failure);
  }
  /* v8 ignore stop -- @preserve */
  return Result.succeed({
    tag: value.tag,
    cantrips: cantrips.success,
    ritualSpells: ritualSpells.success,
    spellcastingFocus: value.spellcastingFocus,
  });
}

export function parseStoredCharacterSheetBookOfShadowsPresence(
  build: CharacterBuild,
  value: unknown,
): Result.Result<
  CharacterSheetBookOfShadowsPresence | undefined,
  CharacterSheetIssue
> {
  if (!characterBuildHasBookOfShadows(build)) {
    return value === undefined
      ? Result.succeed(undefined)
      : characterSheetIssue(
          "Character Sheet Book of Shadows presence requires Book of Shadows selection.",
        );
  }
  if (
    !isRecord(value) ||
    (value.tag !== "onPerson" && value.tag !== "notOnPerson")
  ) {
    return characterSheetIssue(
      "Character Sheet Book of Shadows presence is invalid.",
    );
  }
  return Result.succeed({ tag: value.tag });
}

function parseStoredBookOfShadowsCantripIds(
  value: unknown,
): Result.Result<
  CharacterBuildBookOfShadowsSpellAccess["cantrips"],
  CharacterSheetIssue
> {
  /* v8 ignore start -- @preserve -- Malformed stored build: Book of Shadows cantrips are not a string list of exactly three ids. */
  if (!isStringArray(value)) {
    return characterSheetIssue(
      "Character Build Book of Shadows cantrips are invalid.",
    );
  }
  const [first, second, third, ...extra] = value;
  if (
    first === undefined ||
    second === undefined ||
    third === undefined ||
    extra.length !== 0
  ) {
    return characterSheetIssue(
      "Character Build Book of Shadows requires exactly three cantrips.",
    );
  }
  /* v8 ignore stop -- @preserve */
  return Result.succeed([
    authoredUnitId(first),
    authoredUnitId(second),
    authoredUnitId(third),
  ]);
}

function parseStoredBookOfShadowsRitualSpellIds(
  value: unknown,
): Result.Result<
  CharacterBuildBookOfShadowsSpellAccess["ritualSpells"],
  CharacterSheetIssue
> {
  /* v8 ignore start -- @preserve -- Malformed stored build: Book of Shadows rituals are not a string list of exactly two ids. */
  if (!isStringArray(value)) {
    return characterSheetIssue(
      "Character Build Book of Shadows Ritual spells are invalid.",
    );
  }
  const [first, second, ...extra] = value;
  if (first === undefined || second === undefined || extra.length !== 0) {
    return characterSheetIssue(
      "Character Build Book of Shadows requires exactly two Ritual spells.",
    );
  }
  /* v8 ignore stop -- @preserve */
  return Result.succeed([authoredUnitId(first), authoredUnitId(second)]);
}

function parseStoredSpellSlotPools(
  value: unknown,
): Result.Result<CharacterBuildSpellcasting["slotPools"], CharacterSheetIssue> {
  /* v8 ignore start -- @preserve -- Malformed stored build: spellcasting slot pools are absent or not a record. */
  if (!isRecord(value)) {
    return characterSheetIssue(
      "Character Build spellcasting requires slot pools.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const spellcasting =
    value.spellcasting === undefined
      ? undefined
      : parseStoredSpellcastingSlotPool(value.spellcasting);
  /* v8 ignore start -- @preserve -- Malformed stored build: the optional ordinary Spell Slot pool failed its boundary parser. */
  if (spellcasting !== undefined && Result.isFailure(spellcasting)) {
    return Result.fail(spellcasting.failure);
  }
  /* v8 ignore stop -- @preserve */
  const pactMagic =
    value.pactMagic === undefined
      ? undefined
      : parseStoredPactMagicSlotPool(value.pactMagic);
  /* v8 ignore start -- @preserve -- Malformed stored build: the optional Pact Magic pool failed its boundary parser. */
  if (pactMagic !== undefined && Result.isFailure(pactMagic)) {
    return Result.fail(pactMagic.failure);
  }
  /* v8 ignore stop -- @preserve */
  return Result.succeed({
    ...(spellcasting === undefined
      ? {}
      : { spellcasting: spellcasting.success }),
    ...(pactMagic === undefined ? {} : { pactMagic: pactMagic.success }),
  });
}

function parseStoredSpellcastingSlotPool(
  value: unknown,
): Result.Result<
  NonNullable<CharacterBuildSpellcasting["slotPools"]["spellcasting"]>,
  CharacterSheetIssue
> {
  /* v8 ignore start -- @preserve -- Malformed stored build: an ordinary Spell Slot pool or one of its capacity rows fails its typed shape. */
  if (
    !isRecord(value) ||
    value.kind !== "spellcasting" ||
    !Array.isArray(value.slots)
  ) {
    return characterSheetIssue(
      "Character Build spellcasting slot pool is invalid.",
    );
  }
  const slots = [];
  for (const slot of value.slots) {
    if (
      !isRecord(slot) ||
      !isPositiveInteger(slot.spellLevel) ||
      !isPositiveInteger(slot.count)
    ) {
      return characterSheetIssue(
        "Character Build Spell Slot capacity is invalid.",
      );
    }
    /* v8 ignore stop -- @preserve */
    slots.push({ spellLevel: slot.spellLevel, count: slot.count });
  }
  return Result.succeed({ kind: "spellcasting", slots });
}

function parseStoredPactMagicSlotPool(
  value: unknown,
): Result.Result<
  NonNullable<CharacterBuildSpellcasting["slotPools"]["pactMagic"]>,
  CharacterSheetIssue
> {
  /* v8 ignore start -- @preserve -- Malformed stored build: the Pact Magic pool fails its tagged positive-integer shape. */
  if (
    !isRecord(value) ||
    value.kind !== "pactMagic" ||
    !isPositiveInteger(value.slotLevel) ||
    !isPositiveInteger(value.count)
  ) {
    return characterSheetIssue(
      "Character Build Pact Magic slot pool is invalid.",
    );
  }
  /* v8 ignore stop -- @preserve */
  return Result.succeed({
    kind: "pactMagic",
    slotLevel: value.slotLevel,
    count: value.count,
  });
}

function parseStoredEquipment(
  value: unknown,
): Result.Result<CharacterBuildEquipment, CharacterSheetIssue> {
  if (
    !isRecord(value) ||
    !Array.isArray(value.owned) ||
    !isRecord(value.loadout)
  ) {
    return characterSheetIssue("Character Build requires equipment.");
  }
  const startingEquipmentCurrencyRemainderCp =
    parseStoredStartingEquipmentCurrencyRemainderCp(
      value.startingEquipmentCurrencyRemainderCp,
    );
  if (Result.isFailure(startingEquipmentCurrencyRemainderCp)) {
    return Result.fail(startingEquipmentCurrencyRemainderCp.failure);
  }
  const owned = parseStoredOwnedEquipment(value.owned);
  if (Result.isFailure(owned)) return Result.fail(owned.failure);
  const loadout = parseStoredLoadout(value.loadout);
  /* v8 ignore next -- @preserve -- Malformed stored build: raw loadout fields are parsed before CharacterBuildEquipment is constructed. */
  if (Result.isFailure(loadout)) return Result.fail(loadout.failure);
  const ownedItemIds = new Set(
    owned.success.flatMap((item) =>
      item.kind === "catalogItem" || item.kind === "authoredCatalogItem"
        ? [item.itemId]
        : [],
    ),
  );
  const selectedItemIds = [
    loadout.success.armor,
    loadout.success.shield,
    loadout.success.weapon?.itemId,
    loadout.success.offHandWeapon?.itemId,
  ].filter((itemId) => itemId !== undefined);
  if (selectedItemIds.some((itemId) => !ownedItemIds.has(itemId))) {
    return characterSheetIssue(
      "Character Build loadout must reference owned catalog equipment.",
    );
  }
  return Result.succeed({
    startingEquipmentCurrencyRemainderCp:
      startingEquipmentCurrencyRemainderCp.success,
    owned: owned.success,
    loadout: loadout.success,
  });
}

function parseStoredOwnedEquipment(
  value: readonly unknown[],
): Result.Result<
  readonly CharacterBuildEquipment["owned"][number][],
  CharacterSheetIssue
> {
  const owned: CharacterBuildEquipment["owned"][number][] = [];
  for (const item of value) {
    const parsed = parseStoredOwnedEquipmentItem(item);
    if (Result.isFailure(parsed)) return Result.fail(parsed.failure);
    owned.push(parsed.success);
  }
  return Result.succeed(owned);
}

function parseStoredOwnedEquipmentItem(
  value: unknown,
): Result.Result<
  CharacterBuildEquipment["owned"][number],
  CharacterSheetIssue
> {
  if (!isRecord(value) || !isPositiveInteger(value.quantity)) {
    return characterSheetIssue(
      "Character Build owned equipment item is invalid.",
    );
  }
  const quantity = value.quantity;
  if (value.kind === "authoredStartingItem") {
    return parseStoredAuthoredStartingEquipmentItem(value, quantity);
  }
  if (value.kind === "selectedToolItem") {
    return parseStoredSelectedToolEquipmentItem(value, quantity);
  }
  if (value.kind === "authoredCatalogItem") {
    return parseStoredAuthoredCatalogEquipmentItem(value, quantity);
  }
  if (value.kind !== "catalogItem" || typeof value.itemId !== "string") {
    return characterSheetIssue(
      "Character Build owned equipment item is invalid.",
    );
  }
  return parseStoredCatalogEquipmentItem(value, quantity);
}

function parseStoredAuthoredStartingEquipmentItem(
  value: Readonly<Record<string, unknown>>,
  quantity: number,
): Result.Result<
  CharacterBuildEquipment["owned"][number],
  CharacterSheetIssue
> {
  if (typeof value.itemName !== "string" || value.itemName.trim() === "") {
    return characterSheetIssue(
      "Character Build authored starting equipment item is invalid.",
    );
  }
  return Result.succeed({
    kind: "authoredStartingItem",
    itemName: value.itemName,
    quantity: PositiveInteger(quantity),
  });
}

function parseStoredSelectedToolEquipmentItem(
  value: Readonly<Record<string, unknown>>,
  quantity: number,
): Result.Result<
  CharacterBuildEquipment["owned"][number],
  CharacterSheetIssue
> {
  if (
    typeof value.toolProficiencyId !== "string" ||
    !isCharacterBuildToolProficiencyId(value.toolProficiencyId)
  ) {
    return characterSheetIssue(
      "Character Build selected-tool equipment item is invalid.",
    );
  }
  return Result.succeed({
    kind: "selectedToolItem",
    toolProficiencyId: toolProficiencyId(value.toolProficiencyId),
    quantity: PositiveInteger(quantity),
  });
}

function parseStoredAuthoredCatalogEquipmentItem(
  value: Readonly<Record<string, unknown>>,
  quantity: number,
): Result.Result<
  CharacterBuildEquipment["owned"][number],
  CharacterSheetIssue
> {
  if (
    typeof value.itemId !== "string" ||
    typeof value.authoredItemId !== "string" ||
    value.authoredItemId.trim() === "" ||
    value.spellcastingFocusKind !== "arcane"
  ) {
    return characterSheetIssue(
      "Character Build authored catalog equipment item is invalid.",
    );
  }
  const parsedItemId = parseCharacterEquipmentItemId(value.itemId);
  if (Result.isFailure(parsedItemId)) {
    return characterSheetIssue(
      "Character Build authored catalog equipment item id is invalid.",
    );
  }
  return Result.succeed({
    kind: "authoredCatalogItem",
    itemId: characterEquipmentItemId(parsedItemId.success),
    authoredItemId: value.authoredItemId,
    spellcastingFocusKind: "arcane",
    quantity: PositiveInteger(quantity),
  });
}

function parseStoredCatalogEquipmentItem(
  value: Readonly<Record<string, unknown>>,
  quantity: number,
): Result.Result<
  CharacterBuildEquipment["owned"][number],
  CharacterSheetIssue
> {
  if (typeof value.itemId !== "string") {
    return characterSheetIssue(
      "Character Build owned equipment item is invalid.",
    );
  }
  const parsedItemId = parseCharacterEquipmentItemId(value.itemId);
  if (Result.isFailure(parsedItemId)) {
    return characterSheetIssue(
      "Character Build owned equipment item id is invalid.",
    );
  }
  return Result.succeed({
    kind: "catalogItem",
    itemId: characterEquipmentItemId(parsedItemId.success),
    quantity: PositiveInteger(quantity),
  });
}

function parseStoredStartingEquipmentCurrencyRemainderCp(
  value: unknown,
): Result.Result<CopperPieceAmount, CharacterSheetIssue> {
  if (value === undefined) {
    return characterSheetIssue(
      "Character Build starting-equipment currency remainder is required.",
    );
  }
  return isCopperPieceAmount(value)
    ? Result.succeed(copperPieceAmount(value))
    : characterSheetIssue(
        "Character Build starting-equipment currency remainder is invalid.",
      );
}

function parseStoredLoadout(
  value: Readonly<Record<string, unknown>>,
): Result.Result<CharacterBuildEquipment["loadout"], CharacterSheetIssue> {
  const armor = parseOptionalEquipmentItemId(value.armor, "armor");
  /* v8 ignore next -- @preserve -- Malformed stored loadout: a present armor item id must parse at this raw-storage boundary. */
  if (Result.isFailure(armor)) return Result.fail(armor.failure);
  const shield = parseOptionalEquipmentItemId(value.shield, "shield");
  /* v8 ignore next -- @preserve -- Malformed stored loadout: a present shield item id must parse at this raw-storage boundary. */
  if (Result.isFailure(shield)) return Result.fail(shield.failure);
  const weapon = parseStoredMainWeapon(value.weapon);
  /* v8 ignore next -- @preserve -- Malformed stored loadout: a present main-weapon record must parse at this raw-storage boundary. */
  if (Result.isFailure(weapon)) return Result.fail(weapon.failure);
  const offHandWeapon = parseStoredOffHandWeapon(value.offHandWeapon);
  /* v8 ignore next -- @preserve -- Malformed stored loadout: a present off-hand weapon record must parse at this raw-storage boundary. */
  if (Result.isFailure(offHandWeapon))
    return Result.fail(offHandWeapon.failure);
  return Result.succeed({
    ...(armor.success === undefined ? {} : { armor: armor.success }),
    ...(shield.success === undefined ? {} : { shield: shield.success }),
    ...(weapon.success === undefined ? {} : { weapon: weapon.success }),
    ...(offHandWeapon.success === undefined
      ? {}
      : { offHandWeapon: offHandWeapon.success }),
  });
}

function parseStoredMainWeapon(
  value: unknown,
): Result.Result<
  CharacterBuildEquipment["loadout"]["weapon"],
  CharacterSheetIssue
> {
  if (value === undefined) return Result.succeed(undefined);
  /* v8 ignore start -- @preserve -- Malformed stored build: a main-hand weapon loadout is not a one-handed item record with a valid main-slot item id. */
  if (!isRecord(value) || value.grip !== "one_handed") {
    return characterSheetIssue("Character Build weapon loadout is invalid.");
  }
  const itemId = parseOptionalEquipmentItemId(value.itemId, "main");
  if (Result.isFailure(itemId)) return Result.fail(itemId.failure);
  if (itemId.success === undefined) {
    return characterSheetIssue("Character Build weapon loadout is invalid.");
  }
  /* v8 ignore stop -- @preserve */
  if (Object.keys(value).some((key) => key !== "itemId" && key !== "grip")) {
    return characterSheetIssue("Character Build weapon loadout is invalid.");
  }
  return Result.succeed({ itemId: itemId.success, grip: "one_handed" });
}

function parseStoredOffHandWeapon(
  value: unknown,
): Result.Result<
  CharacterBuildEquipment["loadout"]["offHandWeapon"],
  CharacterSheetIssue
> {
  if (value === undefined) return Result.succeed(undefined);
  /* v8 ignore start -- @preserve -- Malformed stored build: an off-hand weapon loadout is not an item record with a valid off-slot item id. */
  if (!isRecord(value)) {
    return characterSheetIssue(
      "Character Build off-hand weapon loadout is invalid.",
    );
  }
  const itemId = parseOptionalEquipmentItemId(value.itemId, "off");
  if (Result.isFailure(itemId)) return Result.fail(itemId.failure);
  if (itemId.success === undefined) {
    return characterSheetIssue(
      "Character Build off-hand weapon loadout is invalid.",
    );
  }
  /* v8 ignore stop -- @preserve */
  return Result.succeed({
    itemId: itemId.success,
  });
}

function parseOptionalEquipmentItemId<
  const Slot extends CharacterEquipmentItemSlot,
>(
  value: unknown,
  slot: Slot,
): Result.Result<
  CharacterEquipmentItemId<Slot> | undefined,
  CharacterSheetIssue
> {
  if (value === undefined) return Result.succeed(undefined);
  /* v8 ignore start -- @preserve -- Malformed stored build: an equipment item id is non-string, unparseable, or belongs to a different loadout slot. */
  if (typeof value !== "string") {
    return characterSheetIssue("Character Build equipment item id is invalid.");
  }
  const parsed = parseCharacterEquipmentItemId(value);
  if (Result.isFailure(parsed) || parsed.success.slot !== slot) {
    return characterSheetIssue(
      "Character Build equipment item slot is invalid.",
    );
  }
  /* v8 ignore stop -- @preserve */
  return Result.succeed(
    characterEquipmentItemId({ slot, unitId: parsed.success.unitId }),
  );
}

function isAbility(value: unknown): value is Ability {
  return ABILITIES.some((ability) => ability === value);
}

function isSurfaceSkill(value: unknown): value is SurfaceSkill {
  return SURFACE_SKILLS.some((skill) => skill === value);
}

function isStandardLanguage(value: unknown): value is StandardLanguage {
  return STANDARD_LANGUAGES.some((language) => language === value);
}

function isCharacterStartingLanguages(
  value: unknown,
): value is CharacterStartingLanguages {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value[0] === "Common" &&
    value.every(isStandardLanguage) &&
    new Set(value).size === value.length
  );
}

function isLanguage(
  value: unknown,
): value is CharacterBuild["classFeatureLanguages"][number]["language"] {
  return LANGUAGES.some((language) => language === value);
}

function isStringArray(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isDeathSaveCount(value: unknown): value is DeathSaveCount {
  return value === 0 || value === 1 || value === 2 || value === 3;
}

export {
  isNonSpellcastingBuild,
  isRecord,
  isSpellcastingBuild,
  recordHasExactKeys,
};
