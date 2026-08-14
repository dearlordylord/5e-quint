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
  type CopperPieceAmount,
  type UnitCatalog,
} from "@dnd/character-creation-runtime";
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
} from "@dnd/surface/surface/unit-catalog";
import { readClassCreationFacts } from "@dnd/surface/surface/character-creation-readers";
import { spellHasTopLevelRitualTag } from "@dnd/surface/surface/types";
import type {
  DragonbornSpeciesRecord,
  SpellRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";
import { Either, Option } from "effect";

import { featurePreparedSpellIdsForBuild } from "./class-feature-spells.ts";
import { isDruidCircleLandChoice } from "./druid-features.ts";
import { parseHp } from "./hit-points.ts";
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
  type NonSpellcastingCharacterBuild,
  type SpellcastingCharacterBuild,
  type StoredClassFeatureLanguage,
  type StoredClassFeatureLanguageFact,
  type StoredClassFeatureLanguageProjection,
} from "./sheet-types.ts";

export function characterBuildHasBookOfShadows(build: CharacterBuild): boolean {
  return (
    build.spellcasting?.sources.some(
      (source) => source.bookOfShadows !== undefined,
    ) ?? false
  );
}

type ParsedStoredHitPoints = {
  readonly currentHp: HpType;
  readonly tempHp: HpType;
  readonly positiveHpUnconscious?: CharacterSheetPositiveHpUnconscious;
  readonly zeroHpLifecycle?: CharacterSheetZeroHpLifecycleInput;
};

export function parseStoredHitPoints(
  value: unknown,
): Either.Either<ParsedStoredHitPoints, CharacterSheetIssue> {
  if (!isRecord(value))
    return characterSheetIssue("Expected Character Sheet hit points.");
  const tempHp =
    value.tempHp === undefined ? Either.right(Hp(0)) : parseHp(value.tempHp);
  if (Either.isLeft(tempHp)) return Either.left(tempHp.left);
  if (value.tag === "positive") {
    const currentHp = parseHp(value.currentHp);
    return Either.isLeft(currentHp)
      ? Either.left(currentHp.left)
      : Either.right({ currentHp: currentHp.right, tempHp: tempHp.right });
  }
  if (value.tag === "knockedOut") {
    return Either.right({
      currentHp: Hp(1),
      tempHp: tempHp.right,
      positiveHpUnconscious: CHARACTER_SHEET_KNOCKED_OUT_UNCONSCIOUS,
    });
  }
  if (value.tag !== "zero") {
    return characterSheetIssue("Expected Character Sheet hit point state.");
  }
  const lifecycle = parseStoredZeroHpLifecycle(value.lifecycle);
  return Either.isLeft(lifecycle)
    ? Either.left(lifecycle.left)
    : Either.right({
        currentHp: Hp(0),
        tempHp: tempHp.right,
        zeroHpLifecycle: lifecycle.right,
      });
}

function parseStoredZeroHpLifecycle(
  value: unknown,
): Either.Either<CharacterSheetZeroHpLifecycleInput, CharacterSheetIssue> {
  if (!isRecord(value))
    return characterSheetIssue("Expected zero-HP lifecycle.");
  if (value.tag === "stable") {
    const recovery = parseStoredStableRecovery(value.recovery);
    return Either.isLeft(recovery)
      ? Either.left(recovery.left)
      : Either.right({ tag: "stable", recovery: recovery.right });
  }
  if (value.tag !== "unstable" && value.tag !== "dead") {
    return characterSheetIssue("Expected zero-HP lifecycle state.");
  }
  const deathSaves = parseStoredDeathSaves(value.deathSaves);
  return Either.isLeft(deathSaves)
    ? Either.left(deathSaves.left)
    : Either.right({ tag: value.tag, deathSaves: deathSaves.right });
}

function parseStoredStableRecovery(
  value: unknown,
): Either.Either<CharacterSheetStableRecovery, CharacterSheetIssue> {
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
    return Either.isLeft(elapsedBeforeRecoveryRoll)
      ? characterSheetIssue(
          "Stable recovery elapsed time must be elapsed-time ticks.",
        )
      : Either.right({
          kind: "regains1HpAfter1d4Hours",
          elapsedBeforeRecoveryRoll: elapsedBeforeRecoveryRoll.right,
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
  return Either.isLeft(remaining)
    ? characterSheetIssue(
        "Stable recovery remaining time must be positive elapsed-time ticks.",
      )
    : Either.right({ kind: "regains1HpAfter", remaining: remaining.right });
}

function parseStoredDeathSaves(
  value: unknown,
): Either.Either<DeathSaves, CharacterSheetIssue> {
  if (!isRecord(value)) return characterSheetIssue("Expected death saves.");
  if (!isDeathSaveCount(value.successes) || !isDeathSaveCount(value.failures)) {
    return characterSheetIssue("Death saves must be counts from 0 to 3.");
  }
  return Either.right({ successes: value.successes, failures: value.failures });
}

export function parseStoredSpellSlots(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
  value: Readonly<Record<string, unknown>>,
): Either.Either<
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
      ? Either.right(undefined)
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
    if (Either.isLeft(spellLevel)) return Either.left(spellLevel.left);
    if (Either.isLeft(expended)) return Either.left(expended.left);
    if (expenditureLevels.has(spellLevel.right)) {
      return characterSheetIssue(
        "Spell Slot state must not duplicate spell levels.",
      );
    }
    expenditureLevels.add(spellLevel.right);
    const capacity = buildSlots.find(
      (slot) => slot.spellLevel === spellLevel.right,
    );
    if (capacity === undefined) {
      return characterSheetIssue(
        "Spell Slot state does not match build capacity.",
      );
    }
    if (expended.right > capacity.count) {
      return characterSheetIssue(
        `Spell Slot state does not match build capacity for level ${capacity.spellLevel}.`,
      );
    }
    spellSlotExpenditures.push({
      spellLevel: spellLevel.right,
      expended: expended.right,
    });
  }
  const createdSpellSlots = parseStoredCreatedSpellSlots(
    value.createdSpellSlots,
  );
  if (Either.isLeft(createdSpellSlots)) {
    return Either.left(createdSpellSlots.left);
  }
  return validateSpellSlotSourceState({
    build,
    unitLibrary,
    spellSlotState: {
      ordinarySpellSlotExpenditures: spellSlotExpenditures,
      createdSpellSlots: createdSpellSlots.right,
    },
  });
}

function parseStoredCreatedSpellSlots(
  value: unknown,
): Either.Either<
  readonly CharacterSheetCreatedSpellSlotState[],
  CharacterSheetIssue
> {
  if (value === undefined) return Either.right([]);
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
    if (Either.isLeft(spellLevel)) return Either.left(spellLevel.left);
    if (Either.isLeft(count)) return Either.left(count.left);
    if (Either.isLeft(expended)) return Either.left(expended.left);
    if (levels.has(spellLevel.right)) {
      return characterSheetIssue(
        "Created Spell Slot state must not duplicate spell levels.",
      );
    }
    levels.add(spellLevel.right);
    if (expended.right > count.right) {
      return characterSheetIssue(
        "Created Spell Slot expenditure cannot exceed count.",
      );
    }
    slots.push({
      spellLevel: spellLevel.right,
      count: count.right,
      expended: expended.right,
    });
  }
  return Either.right(slots);
}

export function parseStoredPactSlots(
  build: CharacterBuild,
  value: Readonly<Record<string, unknown>>,
): Either.Either<
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
      ? Either.right(undefined)
      : characterSheetIssue(
          "Character Sheet without Pact Magic cannot carry Pact Slot state.",
        );
  }
  if (value.pactSlotExpenditure === undefined) {
    return Either.right(undefined);
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
  if (Either.isLeft(expended)) return Either.left(expended.left);
  if (expended.right > pactMagic.count) {
    return characterSheetIssue(
      "Pact Slot state must match Pact Magic build capacity.",
    );
  }
  return expended.right === resourceCount(0)
    ? Either.right(undefined)
    : Either.right({
        expended: expended.right,
      });
}

export function parseStoredResourceExpenditures(
  value: unknown,
): Either.Either<
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
    if (Either.isLeft(parsed)) return Either.left(parsed.left);
    expenditures.push(parsed.right);
  }
  return Either.right(expenditures);
}

function parseStoredResourceExpenditure(
  value: unknown,
): Either.Either<CharacterSheetResourceExpenditure, CharacterSheetIssue> {
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
): Either.Either<CharacterSheetResourceExpenditure, CharacterSheetIssue> {
  if (!recordHasExactKeys(value, ["tag", "unitId", "expended"])) {
    return characterSheetIssue(
      "Character Sheet keyed resource expenditure must contain exactly tag, Unit id, and expended count.",
    );
  }
  const expended = parseResourceCount(value.expended);
  if (Either.isLeft(expended)) return Either.left(expended.left);
  const unitId = parseUseCountResourceExpenditureUnitId(value);
  if (Either.isLeft(unitId)) return Either.left(unitId.left);
  return Either.right({
    tag: "useCountResource",
    unitId: unitId.right,
    expended: expended.right,
  });
}

function parseStoredPointPoolResourceExpenditure(
  value: Readonly<Record<string, unknown>>,
): Either.Either<CharacterSheetResourceExpenditure, CharacterSheetIssue> {
  if (!recordHasExactKeys(value, ["tag", "unitId", "expended"])) {
    return characterSheetIssue(
      "Character Sheet keyed resource expenditure must contain exactly tag, Unit id, and expended count.",
    );
  }
  const expended = parseResourceCount(value.expended);
  if (Either.isLeft(expended)) return Either.left(expended.left);
  const unitId = parsePointPoolResourceExpenditureUnitId(value);
  if (Either.isLeft(unitId)) return Either.left(unitId.left);
  return Either.right({
    tag: "pointPoolResource",
    unitId: unitId.right,
    expended: expended.right,
  });
}

function parseStoredSpellAccessFreeCastExpenditure(
  value: Readonly<Record<string, unknown>>,
): Either.Either<CharacterSheetResourceExpenditure, CharacterSheetIssue> {
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
  if (Either.isLeft(expended)) return Either.left(expended.left);
  return Either.right({
    tag: "spellAccessFreeCast",
    sourceUnitId: authoredUnitId(value.sourceUnitId),
    spellId: authoredUnitId(value.spellId),
    expended: expended.right,
  });
}

function parseStoredLayOnHandsResourceExpenditure(
  value: Readonly<Record<string, unknown>>,
): Either.Either<CharacterSheetResourceExpenditure, CharacterSheetIssue> {
  if (!recordHasExactKeys(value, ["tag", "expended"])) {
    return characterSheetIssue(
      "Character Sheet tagged resource expenditure must contain exactly tag and expended count.",
    );
  }
  const expended = parseResourceCount(value.expended);
  if (Either.isLeft(expended)) return Either.left(expended.left);
  return Either.right({
    tag: "layOnHandsHealingPool",
    expended: expended.right,
  });
}

export function parseStoredDruidWildShapeKnownForms(
  value: unknown,
): Either.Either<
  CharacterSheetDruidWildShapeKnownForms | undefined,
  CharacterSheetIssue
> {
  if (value === undefined) return Either.right(undefined);
  if (
    !isRecord(value) ||
    !Array.isArray(value.statBlockIds) ||
    value.statBlockIds.some((statBlockId) => typeof statBlockId !== "string")
  ) {
    return characterSheetIssue("Expected Wild Shape known-form state.");
  }
  return Either.right({
    statBlockIds: value.statBlockIds,
  });
}

export function parseStoredDruidCircleLand(
  value: unknown,
): Either.Either<
  CharacterSheetDruidCircleLand | undefined,
  CharacterSheetIssue
> {
  if (value === undefined) return Either.right(undefined);
  if (!isRecord(value) || !isDruidCircleLandChoice(value.land)) {
    return characterSheetIssue(
      "Expected Circle of the Land selected land state.",
    );
  }
  return Either.right({ land: value.land });
}

function parseUseCountResourceExpenditureUnitId(
  expenditure: Record<string, unknown>,
): Either.Either<UnitRecord["id"], CharacterSheetIssue> {
  if (typeof expenditure.unitId !== "string") {
    return characterSheetIssue(
      "Character Sheet use-count expenditure requires a supported class feature Unit id.",
    );
  }
  return Either.right(authoredUnitId(expenditure.unitId));
}

function parsePointPoolResourceExpenditureUnitId(
  expenditure: Record<string, unknown>,
): Either.Either<CharacterSheetPointPoolResourceUnitId, CharacterSheetIssue> {
  if (
    typeof expenditure.unitId !== "string" ||
    !isCharacterSheetPointPoolResourceUnitId(authoredUnitId(expenditure.unitId))
  ) {
    return characterSheetIssue(
      "Character Sheet point-pool expenditure requires a supported class feature Unit id.",
    );
  }
  return Either.right(authoredUnitId(expenditure.unitId));
}

export function parseResourceCount(
  value: unknown,
): Either.Either<ResourceCount, CharacterSheetIssue> {
  return isNonNegativeInteger(value)
    ? Either.right(resourceCount(value))
    : characterSheetIssue("Expected nonnegative resource count.");
}

function parsePositiveResourceCount(
  value: unknown,
): Either.Either<ResourceCount, CharacterSheetIssue> {
  return isPositiveInteger(value)
    ? Either.right(resourceCount(value))
    : characterSheetIssue("Expected positive resource count.");
}

function parseSpellSlotLevel(
  value: unknown,
): Either.Either<SpellSlotLevel, CharacterSheetIssue> {
  return isPositiveInteger(value)
    ? Either.right(spellSlotLevel(value))
    : characterSheetIssue("Expected positive Spell Slot level.");
}

export function parseCharacterBuild(
  value: unknown,
  unitLibrary: UnitCatalog,
): Either.Either<CharacterBuild, CharacterSheetIssue> {
  if (!isRecord(value)) return characterSheetIssue("Expected Character Build.");
  const progression = parseStoredProgression(value.progression);
  if (Either.isLeft(progression)) return Either.left(progression.left);
  if (typeof value.background !== "string") {
    return characterSheetIssue("Character Build requires background Unit id.");
  }
  if (typeof value.species !== "string") {
    return characterSheetIssue("Character Build requires species Unit id.");
  }
  const originLanguages = parseStoredOriginLanguages(value.originLanguages);
  if (Either.isLeft(originLanguages)) return Either.left(originLanguages.left);
  const alignment = parseStoredAlignment(value.alignment);
  if (Either.isLeft(alignment)) return Either.left(alignment.left);
  const abilityScores = parseStoredAbilityScores(value.abilityScores);
  if (Either.isLeft(abilityScores)) return Either.left(abilityScores.left);
  const proficiencyChoices = parseStoredProficiencyChoices(
    value.proficiencyChoices,
  );
  if (Either.isLeft(proficiencyChoices)) {
    return Either.left(proficiencyChoices.left);
  }
  const speciesChoiceFacts = parseStoredSpeciesChoiceFacts(
    authoredUnitId(value.species),
    value.speciesChoiceFacts,
    unitLibrary,
  );
  if (Either.isLeft(speciesChoiceFacts)) {
    return Either.left(speciesChoiceFacts.left);
  }
  const features = parseStoredFeatures(value.features, unitLibrary);
  if (Either.isLeft(features)) return Either.left(features.left);
  const classFeatureLanguages = parseStoredClassFeatureLanguages({
    value: value.classFeatureLanguages,
    originLanguages: originLanguages.right,
    build: { progression: progression.right },
    unitLibrary,
  });
  if (Either.isLeft(classFeatureLanguages)) {
    return Either.left(classFeatureLanguages.left);
  }
  const spellcasting =
    value.spellcasting === undefined
      ? undefined
      : parseStoredSpellcasting(value.spellcasting);
  /* v8 ignore start -- Malformed stored build: the optional spellcasting object failed its boundary parser. */
  if (spellcasting !== undefined && Either.isLeft(spellcasting)) {
    return Either.left(spellcasting.left);
  }
  /* v8 ignore stop */
  const equipment = parseStoredEquipment(value.equipment);
  if (Either.isLeft(equipment)) return Either.left(equipment.left);

  const magicInitiateSpellAccesses =
    parseCharacterBuildMagicInitiateSpellAccesses({
      value: value.magicInitiateSpellAccesses,
      build: {
        background: authoredUnitId(value.background),
        species: authoredUnitId(value.species),
        features: features.right,
      },
      unitLibrary,
    });
  if (Either.isLeft(magicInitiateSpellAccesses)) {
    return characterSheetIssue(
      magicInitiateSpellAccesses.left.map((issue) => issue.message).join(" "),
    );
  }

  const build: CharacterBuild = {
    progression: progression.right,
    background: authoredUnitId(value.background),
    species: authoredUnitId(value.species),
    originLanguages: originLanguages.right,
    classFeatureLanguages: classFeatureLanguages.right,
    alignment: alignment.right,
    abilityScores: abilityScores.right,
    proficiencyChoices: proficiencyChoices.right,
    ...(speciesChoiceFacts.right === undefined
      ? {}
      : { speciesChoiceFacts: speciesChoiceFacts.right }),
    features: features.right,
    ...(spellcasting === undefined ? {} : { spellcasting: spellcasting.right }),
    magicInitiateSpellAccesses: magicInitiateSpellAccesses.right,
    equipment: equipment.right,
  };
  const validation = validateParsedCharacterBuild(build, unitLibrary);
  return Either.isLeft(validation)
    ? Either.left(validation.left)
    : Either.right(build);
}

function validateParsedCharacterBuild(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<void, CharacterSheetIssue> {
  const bookOfShadowsIssue = storedBookOfShadowsSelectionIssue(
    build,
    unitLibrary,
  );
  if (Either.isLeft(bookOfShadowsIssue)) {
    return Either.left(bookOfShadowsIssue.left);
  }
  const eldritchInvocationIssue =
    storedEldritchInvocationKnownCantripSelectionIssue(build, unitLibrary);
  if (Either.isLeft(eldritchInvocationIssue)) {
    return Either.left(eldritchInvocationIssue.left);
  }
  const sorcererMetamagicIssue = storedSorcererMetamagicSelectionIssue(
    build,
    unitLibrary,
  );
  return Either.isLeft(sorcererMetamagicIssue)
    ? Either.left(sorcererMetamagicIssue.left)
    : Either.right(undefined);
}

type DraconicAncestryDamageTypeSource =
  DragonbornSpeciesRecord["draconicAncestry"]["damageType"];

function parseStoredSpeciesChoiceFacts(
  speciesId: UnitRecord["id"],
  value: unknown,
  unitLibrary: UnitCatalog,
): Either.Either<
  CharacterBuildSpeciesChoiceFacts | undefined,
  CharacterSheetIssue
> {
  const source = storedDraconicAncestryDamageTypeSource(speciesId, unitLibrary);
  if (Either.isLeft(source)) return Either.left(source.left);
  if (value === undefined) {
    /* v8 ignore start -- Malformed stored build: a species with an authored Draconic Ancestry source omitted its required selected ancestry fact. */
    return source.right === undefined
      ? Either.right(undefined)
      : characterSheetIssue(
          "Character Build requires selected Draconic Ancestry fact for species with a Draconic Ancestry source.",
        );
    /* v8 ignore stop */
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
  if (source.right === undefined) {
    return characterSheetIssue(
      "Character Build cannot carry Draconic Ancestry fact for species without a Draconic Ancestry source.",
    );
  }
  const draconicAncestry = parseStoredDraconicAncestryFact(
    value.draconicAncestry,
    source.right,
  );
  return Either.isLeft(draconicAncestry)
    ? Either.left(draconicAncestry.left)
    : Either.right({ draconicAncestry: draconicAncestry.right });
}

function storedDraconicAncestryDamageTypeSource(
  speciesId: UnitRecord["id"],
  unitLibrary: UnitCatalog,
): Either.Either<
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
  return Either.right(
    "draconicAncestry" in speciesUnit.value
      ? speciesUnit.value.draconicAncestry.damageType
      : undefined,
  );
}

function parseStoredDraconicAncestryFact(
  value: unknown,
  source: DraconicAncestryDamageTypeSource,
): Either.Either<
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
  return Either.right({
    kind: "draconicAncestry",
    ancestorId: characterDraconicAncestrySelection(value.ancestorId),
  });
}

function storedSorcererMetamagicSelectionIssue(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<void, CharacterSheetIssue> {
  const facts = characterBuildSorcererMetamagicFacts({ build, unitLibrary });
  return Either.isLeft(facts)
    ? characterSheetIssue(facts.left.message)
    : Either.right(undefined);
}

function storedEldritchInvocationKnownCantripSelectionIssue(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<void, CharacterSheetIssue> {
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
  return Either.right(undefined);
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
    if (Either.isLeft(sourceClassName) || sourceClassName.right !== "warlock") {
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
): Either.Either<CharacterBuild["progression"], CharacterSheetIssue> {
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
  return Either.right({
    startingClass: classUnitId(authoredUnitId(value.startingClass)),
    advancements,
  });
}

function storedBookOfShadowsSelectionIssue(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<void, CharacterSheetIssue> {
  const sources =
    build.spellcasting?.sources.filter(
      (source) => source.bookOfShadows !== undefined,
    ) ?? [];
  if (sources.length === 0) {
    return Either.right(undefined);
  }
  /* v8 ignore start -- Malformed stored build: Book of Shadows access disagrees with its single admitted Pact-of-the-Tome Warlock source or selected spell roster. */
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
  if (Either.isLeft(sourceUnit)) {
    return Either.left(sourceUnit.left);
  }
  if (
    sourceUnit.right.kind !== "class" ||
    sourceUnit.right.className !== "warlock"
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
  const cantrips = spellRecordsForIds(unitLibrary, access.cantrips);
  if (Either.isLeft(cantrips)) {
    return Either.left(cantrips.left);
  }
  const ritualSpells = spellRecordsForIds(unitLibrary, access.ritualSpells);
  if (Either.isLeft(ritualSpells)) {
    return Either.left(ritualSpells.left);
  }
  if (cantrips.right.some((spell) => spell.mechanics.level !== 0)) {
    return characterSheetIssue(
      "Character Build Book of Shadows cantrip selections must be cantrip Spell Definitions.",
    );
  }
  if (
    ritualSpells.right.some(
      (spell) =>
        spell.mechanics.level !== 1 || !spellHasTopLevelRitualTag(spell),
    )
  ) {
    return characterSheetIssue(
      "Character Build Book of Shadows Ritual selections must be level-1 ritual-tagged Spell Definitions.",
    );
  }
  /* v8 ignore stop */
  return Either.right(undefined);
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
    /* v8 ignore start -- Malformed stored build: a selected Pact of the Tome invocation references a missing or non-feature source Unit. */
    if (Option.isNone(source) || source.value.kind !== "class_feature") {
      return false;
    }
    /* v8 ignore stop */
    const mechanics = source.value.mechanics;
    return (
      mechanics.family === "feature_choice" &&
      mechanics.optionSource.kind === "class_feature_options" &&
      mechanics.optionSource.className === "warlock" &&
      mechanics.optionSource.optionKind === "eldritch_invocation"
    );
  });
}

function spellRecordsForIds(
  unitLibrary: UnitCatalog,
  spellIds: readonly UnitRecord["id"][],
): Either.Either<readonly SpellRecord[], CharacterSheetIssue> {
  const spells: SpellRecord[] = [];
  for (const spellId of spellIds) {
    const spell = getRequiredUnit(unitLibrary, spellId);
    /* v8 ignore start -- Malformed stored build: an admitted Book of Shadows selection references a missing or non-spell Unit. */
    if (Either.isLeft(spell)) {
      return Either.left(spell.left);
    }
    if (!isSpellRecord(spell.right)) {
      return characterSheetIssue(
        `Character Build Book of Shadows selection must reference Spell Definitions: ${spellId}`,
      );
    }
    /* v8 ignore stop */
    spells.push(spell.right);
  }
  return Either.right(spells);
}

function isSpellRecord(unit: UnitRecord): unit is SpellRecord {
  return unit.kind === "spell";
}

function parseStoredOriginLanguages(
  value: unknown,
): Either.Either<CharacterBuild["originLanguages"], CharacterSheetIssue> {
  if (
    !Array.isArray(value) ||
    value.length !== 3 ||
    value[0] !== "Common" ||
    !value.every(isStandardLanguage) ||
    new Set(value).size !== value.length
  ) {
    return characterSheetIssue("Character Build requires origin languages.");
  }
  /* v8 ignore start -- Malformed stored build: origin-language data passed structural checks but failed the narrowed starting-language tuple guard. */
  return isCharacterStartingLanguages(value)
    ? Either.right(value)
    : characterSheetIssue("Character Build requires origin languages.");
  /* v8 ignore stop */
}

function parseStoredClassFeatureLanguages(input: {
  readonly value: unknown;
  readonly originLanguages: CharacterBuild["originLanguages"];
  readonly build: Pick<CharacterBuild, "progression">;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<
  CharacterBuild["classFeatureLanguages"],
  CharacterSheetIssue
> {
  const { value, originLanguages, build, unitLibrary } = input;
  /* v8 ignore start -- Malformed stored build: class-feature language state is absent instead of the required list. */
  if (!Array.isArray(value)) {
    return characterSheetIssue(
      "Character Build requires class-feature languages.",
    );
  }
  /* v8 ignore stop */

  const knownLanguages = new Set<StoredClassFeatureLanguage>(originLanguages);
  const ownedClassFeatureUnitIds = new Set(
    storedClassFeatureLanguageSourceUnitIds(build, unitLibrary),
  );
  const expectedProjection = storedClassFeatureLanguageProjection({
    ownedClassFeatureUnitIds,
    unitLibrary,
  });
  /* v8 ignore start -- Malformed catalog correlation: an owned class-feature language source cannot be projected from its installed Unit facts. */
  if (Either.isLeft(expectedProjection)) {
    return Either.left(expectedProjection.left);
  }
  /* v8 ignore stop */
  const choiceCountsBySourceUnitId = new Map<UnitRecord["id"], number>();
  const fixedLanguagesBySourceUnitId = new Map<
    UnitRecord["id"],
    Set<StoredClassFeatureLanguage>
  >();
  const classFeatureLanguages: StoredClassFeatureLanguageFact[] = [];
  for (const item of value) {
    /* v8 ignore start -- Malformed stored build: a class-feature language entry must match one of the two exact typed language-fact shapes. */
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
      /* v8 ignore stop */
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
    /* v8 ignore start -- Malformed stored build: a class-feature language duplicates an already retained language. */
    if (knownLanguages.has(languageFact.language)) {
      return characterSheetIssue(
        `Duplicate Character Build language ${languageFact.language}.`,
      );
    }
    /* v8 ignore stop */
    if (
      languageFact.kind === "classFeatureLanguageChoice" &&
      expectedProjection.right.fixedLanguages.has(languageFact.language)
    ) {
      return characterSheetIssue(
        `Duplicate Character Build language ${languageFact.language}.`,
      );
    }
    const sourceMatch = storedClassFeatureLanguageMatchesSourceUnit({
      languageFact,
      unitLibrary,
    });
    /* v8 ignore start -- Malformed stored build: a retained class-feature language does not match its installed source Unit grant. */
    if (Either.isLeft(sourceMatch)) {
      return Either.left(sourceMatch.left);
    }
    /* v8 ignore stop */
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

  for (const [sourceUnitId, expectedLanguages] of expectedProjection.right
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

  for (const [sourceUnitId, expectedCount] of expectedProjection.right
    .choiceCountsBySourceUnitId) {
    const selectedCount = choiceCountsBySourceUnitId.get(sourceUnitId) ?? 0;
    if (selectedCount !== expectedCount) {
      return characterSheetIssue(
        `Character Build class-feature language choices for source Unit ${sourceUnitId} must match the source choice count.`,
      );
    }
  }

  return Either.right(classFeatureLanguages);
}

function storedClassFeatureLanguageSourceUnitIds(
  build: Pick<CharacterBuild, "progression">,
  unitLibrary: UnitCatalog,
): readonly UnitRecord["id"][] {
  return progressionClassUnitIds(build.progression).flatMap((classUnitId) => {
    const unit = unitLibrary.getUnit(classUnitId);
    /* v8 ignore next -- Malformed build/catalog correlation: every class id admitted into stored progression must resolve in its retained Unit catalog. */
    if (Option.isNone(unit)) return [];
    const facts = readClassCreationFacts(unit.value);
    /* v8 ignore next -- Unsupported authored data: stored progression admits only class Units with readable creation facts. */
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
}): Either.Either<void, CharacterSheetIssue> {
  const sourceUnit = input.unitLibrary.getUnit(input.languageFact.sourceUnitId);
  /* v8 ignore start -- Malformed stored build: a class-feature language fact must reference its admitted passive class-feature Unit. */
  if (
    Option.isNone(sourceUnit) ||
    sourceUnit.value.kind !== "class_feature" ||
    sourceUnit.value.mechanics.family !== "passive"
  ) {
    return characterSheetIssue(
      `Character Build class-feature language does not match source Unit ${input.languageFact.sourceUnitId}.`,
    );
    /* v8 ignore stop */
  }

  if (input.languageFact.kind === "classFeatureLanguageChoice") {
    /* v8 ignore start -- Malformed stored build: a choice language fact references a source with no language-choice grant. */
    return storedClassFeatureLanguageChoiceGrantCount(sourceUnit.value) ===
      undefined
      ? characterSheetIssue(
          `Character Build class-feature language does not match source Unit ${input.languageFact.sourceUnitId}.`,
        )
      : Either.right(undefined);
    /* v8 ignore stop */
  }

  const matches = sourceUnit.value.mechanics.grants.some((grant) => {
    if (grant.kind !== "grant_language") return false;
    const language = languageFromSurfaceLanguageId(grant.languageId);
    return (
      Either.isRight(language) && language.right === input.languageFact.language
    );
  });
  /* v8 ignore start -- Malformed stored build: a fixed language fact is absent from the installed source Unit's fixed grants. */
  return matches
    ? Either.right(undefined)
    : characterSheetIssue(
        `Character Build class-feature language does not match source Unit ${input.languageFact.sourceUnitId}.`,
      );
  /* v8 ignore stop */
}

function storedClassFeatureLanguageProjection(input: {
  readonly ownedClassFeatureUnitIds: ReadonlySet<UnitRecord["id"]>;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<StoredClassFeatureLanguageProjection, CharacterSheetIssue> {
  const fixedLanguagesBySourceUnitId = new Map<
    UnitRecord["id"],
    Set<StoredClassFeatureLanguage>
  >();
  const fixedLanguages = new Set<StoredClassFeatureLanguage>();
  const choiceCountsBySourceUnitId = new Map<UnitRecord["id"], number>();
  for (const sourceUnitId of input.ownedClassFeatureUnitIds) {
    const sourceUnit = input.unitLibrary.getUnit(sourceUnitId);
    if (
      Option.isNone(sourceUnit) ||
      sourceUnit.value.kind !== "class_feature" ||
      sourceUnit.value.mechanics.family !== "passive"
    ) {
      continue;
    }
    const choiceCount = storedClassFeatureLanguageChoiceGrantCount(
      sourceUnit.value,
    );
    if (choiceCount !== undefined) {
      choiceCountsBySourceUnitId.set(sourceUnitId, choiceCount);
    }
    for (const grant of sourceUnit.value.mechanics.grants) {
      if (grant.kind !== "grant_language") continue;
      const language = languageFromSurfaceLanguageId(grant.languageId);
      /* v8 ignore start -- Malformed installed content: a supported fixed-language grant carries an id outside the shared language codec. */
      if (Either.isLeft(language)) {
        return characterSheetIssue(
          `Unsupported class-feature language id ${grant.languageId} on Unit ${sourceUnitId}.`,
        );
      }
      /* v8 ignore stop */
      const sourceLanguages =
        fixedLanguagesBySourceUnitId.get(sourceUnitId) ??
        new Set<StoredClassFeatureLanguage>();
      sourceLanguages.add(language.right);
      fixedLanguagesBySourceUnitId.set(sourceUnitId, sourceLanguages);
      fixedLanguages.add(language.right);
    }
  }
  return Either.right({
    fixedLanguagesBySourceUnitId,
    fixedLanguages,
    choiceCountsBySourceUnitId,
  });
}

function storedClassFeatureLanguageChoiceGrantCount(
  sourceUnit: UnitRecord,
): number | undefined {
  /* v8 ignore start -- Unsupported stored language source: only admitted passive class-feature Units can contribute a language-choice count. */
  if (
    sourceUnit.kind !== "class_feature" ||
    sourceUnit.mechanics.family !== "passive"
  ) {
    return undefined;
    /* v8 ignore stop */
  }
  const choiceGrantCount = sourceUnit.mechanics.grants.reduce(
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
): Either.Either<CharacterBuild["alignment"], CharacterSheetIssue> {
  if (
    !isRecord(value) ||
    !ALIGNMENT_ORDERS.some((order) => order === value.order) ||
    !ALIGNMENT_MORALITIES.some((morality) => morality === value.morality)
  ) {
    return characterSheetIssue("Character Build requires alignment.");
  }
  return Either.right(value as CharacterBuild["alignment"]);
}

function parseStoredAbilityScores(
  value: unknown,
): Either.Either<CharacterBuild["abilityScores"], CharacterSheetIssue> {
  /* v8 ignore start -- Malformed stored build: ability scores are not represented by the required record. */
  if (!isRecord(value)) {
    return characterSheetIssue("Character Build requires ability scores.");
  }
  /* v8 ignore stop */
  const scores = Object.fromEntries(
    ABILITIES.map((ability) => [ability, value[ability]]),
  );
  const parsed = abilityScoreAssignment(scores);
  return Either.isLeft(parsed)
    ? characterSheetIssue("Character Build ability scores are invalid.")
    : Either.right(parsed.right);
}

function parseStoredProficiencyChoices(
  value: unknown,
): Either.Either<
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
  return Either.right(choices);
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
): Either.Either<readonly CharacterBuildFeature[], CharacterSheetIssue> {
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
      if (Either.isLeft(selection)) {
        return Either.left(selection.left);
      }
      features.push({
        kind: "selectedEldritchInvocation" as const,
        selection: selection.right,
        selectedFromUnitId: authoredUnitId(feature.selectedFromUnitId),
      });
    } else if (
      feature.kind === "selectedSorcererMetamagicOption" &&
      typeof feature.optionId === "string"
    ) {
      const optionId = sorcererMetamagicOptionId(feature.optionId);
      /* v8 ignore start -- Malformed stored build: a selected Metamagic option id is outside the installed closed option roster. */
      if (Either.isLeft(optionId)) {
        return characterSheetIssue(
          "Character Build Sorcerer Metamagic option selection is invalid.",
        );
      }
      /* v8 ignore stop */
      features.push({
        kind: "selectedSorcererMetamagicOption" as const,
        optionId: optionId.right,
        selectedFromUnitId: authoredUnitId(feature.selectedFromUnitId),
      });
    } else if (feature.kind === "abilityCheckBonus") {
      const abilityCheckBonus = parseStoredAbilityCheckBonusFeature({
        feature,
        selectedFromUnitId: feature.selectedFromUnitId,
      });
      if (Either.isLeft(abilityCheckBonus)) {
        return Either.left(abilityCheckBonus.left);
      }
      features.push(abilityCheckBonus.right);
    } else {
      return characterSheetIssue("Character Build feature is invalid.");
    }
  }
  return Either.right(features);
}

function parseStoredEldritchInvocationSelection(
  value: Readonly<Record<string, unknown>>,
  unitLibrary: UnitCatalog,
): Either.Either<
  Extract<
    CharacterBuildFeature,
    { readonly kind: "selectedEldritchInvocation" }
  >["selection"],
  CharacterSheetIssue
> {
  /* v8 ignore start -- Malformed stored build: an Eldritch Invocation selection omits its string invocation id or names no installed option. */
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
  /* v8 ignore stop */
  if (option.repeatability.kind === "once") {
    return value.kind === "nonRepeatable"
      ? Either.right({ kind: "nonRepeatable", invocationId })
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
  if (Either.isLeft(repeatableChoice)) {
    return Either.left(repeatableChoice.left);
  }

  return eldritchInvocationRepeatableChoiceSatisfiesRule({
    unitLibrary,
    choiceRule: option.repeatability.choice,
    repeatableChoice: repeatableChoice.right,
  })
    ? Either.right({
        kind: "repeatable",
        invocationId,
        repeatableChoice: repeatableChoice.right,
      })
    : characterSheetIssue(
        "Character Build Eldritch Invocation repeatable choice is invalid.",
      );
}

function parseStoredEldritchInvocationRepeatableChoice(
  value: unknown,
): Either.Either<
  CharacterBuildEldritchInvocationRepeatableChoice,
  CharacterSheetIssue
> {
  /* v8 ignore start -- Malformed stored build: a repeatable invocation choice is not one of the two typed choice records. */
  if (!isRecord(value) || typeof value.kind !== "string") {
    return characterSheetIssue(
      "Character Build Eldritch Invocation repeatable choice is invalid.",
    );
  }
  /* v8 ignore stop */
  if (
    value.kind === "knownWarlockCantrip" &&
    typeof value.cantripId === "string"
  ) {
    return Either.right({
      kind: "knownWarlockCantrip",
      cantripId: authoredUnitId(value.cantripId),
    });
  }
  if (value.kind === "originFeat" && typeof value.featUnitId === "string") {
    return Either.right({
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
}): Either.Either<CharacterBuildFeature, CharacterSheetIssue> {
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

  return Either.right({
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
): Either.Either<CharacterBuildSpellcasting, CharacterSheetIssue> {
  /* v8 ignore start -- Malformed stored build: spellcasting omits its required nonempty source list. */
  if (
    !isRecord(value) ||
    !Array.isArray(value.sources) ||
    value.sources.length === 0
  ) {
    return characterSheetIssue(
      "Character Build spellcasting requires sources.",
    );
  }
  /* v8 ignore stop */
  const sources = value.sources.map(parseStoredSpellcastingSource);
  const firstIssue = sources.find(Either.isLeft);
  /* v8 ignore next -- Malformed stored build: every raw spellcasting source is parsed before a CharacterBuildSpellcasting value is constructed. */
  if (firstIssue !== undefined) return Either.left(firstIssue.left);
  const slotPools = parseStoredSpellSlotPools(value.slotPools);
  /* v8 ignore next -- Malformed stored build: raw spell-slot pools are parsed before a CharacterBuildSpellcasting value is constructed. */
  if (Either.isLeft(slotPools)) return Either.left(slotPools.left);
  const parsedSources = sources
    .filter(Either.isRight)
    .map((source) => source.right);
  const [firstSource, ...remainingSources] = parsedSources;
  /* v8 ignore start -- The nonempty source-list check above makes an absent first parsed source an internal impossibility. */
  if (firstSource === undefined) {
    return characterSheetIssue(
      "Character Build spellcasting requires sources.",
    );
  }
  /* v8 ignore stop */
  return Either.right({
    sources: [firstSource, ...remainingSources],
    slotPools: slotPools.right,
  });
}

function parseStoredSpellcastingSource(
  value: unknown,
): Either.Either<CharacterBuildSpellcastingSource, CharacterSheetIssue> {
  /* v8 ignore start -- Malformed stored build: a spellcasting source fails its required scalar and list field shape. */
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
  /* v8 ignore stop */
  const bookOfShadows =
    value.bookOfShadows === undefined
      ? undefined
      : parseStoredBookOfShadowsSpellAccess(value.bookOfShadows);
  /* v8 ignore start -- Malformed stored build: the optional Book of Shadows access object failed its boundary parser. */
  if (bookOfShadows !== undefined && Either.isLeft(bookOfShadows)) {
    return Either.left(bookOfShadows.left);
  }
  /* v8 ignore stop */
  return Either.right({
    sourceUnitId: authoredUnitId(value.sourceUnitId),
    spellcastingAbility: value.spellcastingAbility,
    cantrips: value.cantrips.map(authoredUnitId),
    spellbook: value.spellbook.map(authoredUnitId),
    preparedSpells: value.preparedSpells.map(authoredUnitId),
    spellcastingFocuses:
      value.spellcastingFocuses as readonly CharacterBuildSpellcastingFocus[],
    ...(bookOfShadows === undefined
      ? {}
      : { bookOfShadows: bookOfShadows.right }),
  });
}

function parseStoredBookOfShadowsSpellAccess(
  value: unknown,
): Either.Either<CharacterBuildBookOfShadowsSpellAccess, CharacterSheetIssue> {
  /* v8 ignore start -- Malformed stored build: Book of Shadows access fails its exact tagged-record shape. */
  if (
    !isRecord(value) ||
    value.tag !== "bookOfShadows" ||
    value.spellcastingFocus !== "book_of_shadows"
  ) {
    return characterSheetIssue(
      "Character Build Book of Shadows Spell Access is invalid.",
    );
  }
  /* v8 ignore stop */
  const cantrips = parseStoredBookOfShadowsCantripIds(value.cantrips);
  /* v8 ignore start -- Malformed stored build: the Book of Shadows cantrip roster failed its exact-cardinality parser. */
  if (Either.isLeft(cantrips)) {
    return Either.left(cantrips.left);
  }
  /* v8 ignore stop */
  const ritualSpells = parseStoredBookOfShadowsRitualSpellIds(
    value.ritualSpells,
  );
  /* v8 ignore start -- Malformed stored build: the Book of Shadows ritual roster failed its exact-cardinality parser. */
  if (Either.isLeft(ritualSpells)) {
    return Either.left(ritualSpells.left);
  }
  /* v8 ignore stop */
  return Either.right({
    tag: value.tag,
    cantrips: cantrips.right,
    ritualSpells: ritualSpells.right,
    spellcastingFocus: value.spellcastingFocus,
  });
}

export function parseStoredCharacterSheetBookOfShadowsPresence(
  build: CharacterBuild,
  value: unknown,
): Either.Either<
  CharacterSheetBookOfShadowsPresence | undefined,
  CharacterSheetIssue
> {
  if (!characterBuildHasBookOfShadows(build)) {
    return value === undefined
      ? Either.right(undefined)
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
  return Either.right({ tag: value.tag });
}

function parseStoredBookOfShadowsCantripIds(
  value: unknown,
): Either.Either<
  CharacterBuildBookOfShadowsSpellAccess["cantrips"],
  CharacterSheetIssue
> {
  /* v8 ignore start -- Malformed stored build: Book of Shadows cantrips are not a string list of exactly three ids. */
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
  /* v8 ignore stop */
  return Either.right([
    authoredUnitId(first),
    authoredUnitId(second),
    authoredUnitId(third),
  ]);
}

function parseStoredBookOfShadowsRitualSpellIds(
  value: unknown,
): Either.Either<
  CharacterBuildBookOfShadowsSpellAccess["ritualSpells"],
  CharacterSheetIssue
> {
  /* v8 ignore start -- Malformed stored build: Book of Shadows rituals are not a string list of exactly two ids. */
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
  /* v8 ignore stop */
  return Either.right([authoredUnitId(first), authoredUnitId(second)]);
}

function parseStoredSpellSlotPools(
  value: unknown,
): Either.Either<CharacterBuildSpellcasting["slotPools"], CharacterSheetIssue> {
  /* v8 ignore start -- Malformed stored build: spellcasting slot pools are absent or not a record. */
  if (!isRecord(value)) {
    return characterSheetIssue(
      "Character Build spellcasting requires slot pools.",
    );
  }
  /* v8 ignore stop */
  const spellcasting =
    value.spellcasting === undefined
      ? undefined
      : parseStoredSpellcastingSlotPool(value.spellcasting);
  /* v8 ignore start -- Malformed stored build: the optional ordinary Spell Slot pool failed its boundary parser. */
  if (spellcasting !== undefined && Either.isLeft(spellcasting)) {
    return Either.left(spellcasting.left);
  }
  /* v8 ignore stop */
  const pactMagic =
    value.pactMagic === undefined
      ? undefined
      : parseStoredPactMagicSlotPool(value.pactMagic);
  /* v8 ignore start -- Malformed stored build: the optional Pact Magic pool failed its boundary parser. */
  if (pactMagic !== undefined && Either.isLeft(pactMagic)) {
    return Either.left(pactMagic.left);
  }
  /* v8 ignore stop */
  return Either.right({
    ...(spellcasting === undefined ? {} : { spellcasting: spellcasting.right }),
    ...(pactMagic === undefined ? {} : { pactMagic: pactMagic.right }),
  });
}

function parseStoredSpellcastingSlotPool(
  value: unknown,
): Either.Either<
  NonNullable<CharacterBuildSpellcasting["slotPools"]["spellcasting"]>,
  CharacterSheetIssue
> {
  /* v8 ignore start -- Malformed stored build: an ordinary Spell Slot pool or one of its capacity rows fails its typed shape. */
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
    /* v8 ignore stop */
    slots.push({ spellLevel: slot.spellLevel, count: slot.count });
  }
  return Either.right({ kind: "spellcasting", slots });
}

function parseStoredPactMagicSlotPool(
  value: unknown,
): Either.Either<
  NonNullable<CharacterBuildSpellcasting["slotPools"]["pactMagic"]>,
  CharacterSheetIssue
> {
  /* v8 ignore start -- Malformed stored build: the Pact Magic pool fails its tagged positive-integer shape. */
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
  /* v8 ignore stop */
  return Either.right({
    kind: "pactMagic",
    slotLevel: value.slotLevel,
    count: value.count,
  });
}

function parseStoredEquipment(
  value: unknown,
): Either.Either<CharacterBuildEquipment, CharacterSheetIssue> {
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
  if (Either.isLeft(startingEquipmentCurrencyRemainderCp)) {
    return Either.left(startingEquipmentCurrencyRemainderCp.left);
  }
  const owned = parseStoredOwnedEquipment(value.owned);
  if (Either.isLeft(owned)) return Either.left(owned.left);
  const loadout = parseStoredLoadout(value.loadout);
  /* v8 ignore next -- Malformed stored build: raw loadout fields are parsed before CharacterBuildEquipment is constructed. */
  if (Either.isLeft(loadout)) return Either.left(loadout.left);
  const ownedItemIds = new Set(
    owned.right.flatMap((item) =>
      item.kind === "catalogItem" || item.kind === "authoredCatalogItem"
        ? [item.itemId]
        : [],
    ),
  );
  const selectedItemIds = [
    loadout.right.armor,
    loadout.right.shield,
    loadout.right.weapon?.itemId,
    loadout.right.offHandWeapon?.itemId,
  ].filter((itemId) => itemId !== undefined);
  if (selectedItemIds.some((itemId) => !ownedItemIds.has(itemId))) {
    return characterSheetIssue(
      "Character Build loadout must reference owned catalog equipment.",
    );
  }
  return Either.right({
    startingEquipmentCurrencyRemainderCp:
      startingEquipmentCurrencyRemainderCp.right,
    owned: owned.right,
    loadout: loadout.right,
  });
}

function parseStoredOwnedEquipment(
  value: readonly unknown[],
): Either.Either<
  readonly CharacterBuildEquipment["owned"][number][],
  CharacterSheetIssue
> {
  const owned: CharacterBuildEquipment["owned"][number][] = [];
  for (const item of value) {
    const parsed = parseStoredOwnedEquipmentItem(item);
    if (Either.isLeft(parsed)) return Either.left(parsed.left);
    owned.push(parsed.right);
  }
  return Either.right(owned);
}

function parseStoredOwnedEquipmentItem(
  value: unknown,
): Either.Either<
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
): Either.Either<
  CharacterBuildEquipment["owned"][number],
  CharacterSheetIssue
> {
  if (typeof value.itemName !== "string" || value.itemName.trim() === "") {
    return characterSheetIssue(
      "Character Build authored starting equipment item is invalid.",
    );
  }
  return Either.right({
    kind: "authoredStartingItem",
    itemName: value.itemName,
    quantity: PositiveInteger(quantity),
  });
}

function parseStoredSelectedToolEquipmentItem(
  value: Readonly<Record<string, unknown>>,
  quantity: number,
): Either.Either<
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
  return Either.right({
    kind: "selectedToolItem",
    toolProficiencyId: toolProficiencyId(value.toolProficiencyId),
    quantity: PositiveInteger(quantity),
  });
}

function parseStoredAuthoredCatalogEquipmentItem(
  value: Readonly<Record<string, unknown>>,
  quantity: number,
): Either.Either<
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
  if (Either.isLeft(parsedItemId)) {
    return characterSheetIssue(
      "Character Build authored catalog equipment item id is invalid.",
    );
  }
  return Either.right({
    kind: "authoredCatalogItem",
    itemId: characterEquipmentItemId(parsedItemId.right),
    authoredItemId: value.authoredItemId,
    spellcastingFocusKind: "arcane",
    quantity: PositiveInteger(quantity),
  });
}

function parseStoredCatalogEquipmentItem(
  value: Readonly<Record<string, unknown>>,
  quantity: number,
): Either.Either<
  CharacterBuildEquipment["owned"][number],
  CharacterSheetIssue
> {
  if (typeof value.itemId !== "string") {
    return characterSheetIssue(
      "Character Build owned equipment item is invalid.",
    );
  }
  const parsedItemId = parseCharacterEquipmentItemId(value.itemId);
  if (Either.isLeft(parsedItemId)) {
    return characterSheetIssue(
      "Character Build owned equipment item id is invalid.",
    );
  }
  return Either.right({
    kind: "catalogItem",
    itemId: characterEquipmentItemId(parsedItemId.right),
    quantity: PositiveInteger(quantity),
  });
}

function parseStoredStartingEquipmentCurrencyRemainderCp(
  value: unknown,
): Either.Either<CopperPieceAmount, CharacterSheetIssue> {
  if (value === undefined) {
    return characterSheetIssue(
      "Character Build starting-equipment currency remainder is required.",
    );
  }
  return isCopperPieceAmount(value)
    ? Either.right(copperPieceAmount(value))
    : characterSheetIssue(
        "Character Build starting-equipment currency remainder is invalid.",
      );
}

function parseStoredLoadout(
  value: Readonly<Record<string, unknown>>,
): Either.Either<CharacterBuildEquipment["loadout"], CharacterSheetIssue> {
  const armor = parseOptionalEquipmentItemId(value.armor, "armor");
  /* v8 ignore next -- Malformed stored loadout: a present armor item id must parse at this raw-storage boundary. */
  if (Either.isLeft(armor)) return Either.left(armor.left);
  const shield = parseOptionalEquipmentItemId(value.shield, "shield");
  /* v8 ignore next -- Malformed stored loadout: a present shield item id must parse at this raw-storage boundary. */
  if (Either.isLeft(shield)) return Either.left(shield.left);
  const weapon = parseStoredMainWeapon(value.weapon);
  /* v8 ignore next -- Malformed stored loadout: a present main-weapon record must parse at this raw-storage boundary. */
  if (Either.isLeft(weapon)) return Either.left(weapon.left);
  const offHandWeapon = parseStoredOffHandWeapon(value.offHandWeapon);
  /* v8 ignore next -- Malformed stored loadout: a present off-hand weapon record must parse at this raw-storage boundary. */
  if (Either.isLeft(offHandWeapon)) return Either.left(offHandWeapon.left);
  return Either.right({
    ...(armor.right === undefined ? {} : { armor: armor.right }),
    ...(shield.right === undefined ? {} : { shield: shield.right }),
    ...(weapon.right === undefined ? {} : { weapon: weapon.right }),
    ...(offHandWeapon.right === undefined
      ? {}
      : { offHandWeapon: offHandWeapon.right }),
  } as CharacterBuildEquipment["loadout"]);
}

function parseStoredMainWeapon(
  value: unknown,
): Either.Either<
  CharacterBuildEquipment["loadout"]["weapon"],
  CharacterSheetIssue
> {
  if (value === undefined) return Either.right(undefined);
  /* v8 ignore start -- Malformed stored build: a main-hand weapon loadout is not a one-handed item record with a valid main-slot item id. */
  if (!isRecord(value) || value.grip !== "one_handed") {
    return characterSheetIssue("Character Build weapon loadout is invalid.");
  }
  const itemId = parseOptionalEquipmentItemId(value.itemId, "main");
  if (Either.isLeft(itemId)) return Either.left(itemId.left);
  if (itemId.right === undefined) {
    return characterSheetIssue("Character Build weapon loadout is invalid.");
  }
  /* v8 ignore stop */
  const parsedItemId = itemId.right as NonNullable<
    CharacterBuildEquipment["loadout"]["weapon"]
  >["itemId"];
  if (Object.keys(value).some((key) => key !== "itemId" && key !== "grip")) {
    return characterSheetIssue("Character Build weapon loadout is invalid.");
  }
  return Either.right({ itemId: parsedItemId, grip: "one_handed" });
}

function parseStoredOffHandWeapon(
  value: unknown,
): Either.Either<
  CharacterBuildEquipment["loadout"]["offHandWeapon"],
  CharacterSheetIssue
> {
  if (value === undefined) return Either.right(undefined);
  /* v8 ignore start -- Malformed stored build: an off-hand weapon loadout is not an item record with a valid off-slot item id. */
  if (!isRecord(value)) {
    return characterSheetIssue(
      "Character Build off-hand weapon loadout is invalid.",
    );
  }
  const itemId = parseOptionalEquipmentItemId(value.itemId, "off");
  if (Either.isLeft(itemId)) return Either.left(itemId.left);
  if (itemId.right === undefined) {
    return characterSheetIssue(
      "Character Build off-hand weapon loadout is invalid.",
    );
  }
  /* v8 ignore stop */
  return Either.right({
    itemId: itemId.right as NonNullable<
      CharacterBuildEquipment["loadout"]["offHandWeapon"]
    >["itemId"],
  });
}

function parseOptionalEquipmentItemId(
  value: unknown,
  slot: "armor" | "shield" | "main" | "off",
): Either.Either<CharacterEquipmentItemId | undefined, CharacterSheetIssue> {
  if (value === undefined) return Either.right(undefined);
  /* v8 ignore start -- Malformed stored build: an equipment item id is non-string, unparseable, or belongs to a different loadout slot. */
  if (typeof value !== "string") {
    return characterSheetIssue("Character Build equipment item id is invalid.");
  }
  const parsed = parseCharacterEquipmentItemId(value);
  if (Either.isLeft(parsed) || parsed.right.slot !== slot) {
    return characterSheetIssue(
      "Character Build equipment item slot is invalid.",
    );
  }
  /* v8 ignore stop */
  return Either.right(characterEquipmentItemId(parsed.right));
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

export function isRecord(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

export function recordHasExactKeys(
  value: Readonly<Record<string, unknown>>,
  keys: readonly string[],
): boolean {
  const allowed = new Set(keys);
  const actual = Object.keys(value);
  return (
    actual.length === keys.length && actual.every((key) => allowed.has(key))
  );
}

export function isSpellcastingBuild(
  build: CharacterBuild,
): build is SpellcastingCharacterBuild {
  return build.spellcasting !== undefined;
}

export function isNonSpellcastingBuild(
  build: CharacterBuild,
): build is NonSpellcastingCharacterBuild {
  return build.spellcasting === undefined;
}
