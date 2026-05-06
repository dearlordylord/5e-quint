import {
  ALIGNMENT_MORALITIES,
  ALIGNMENT_ORDERS,
  abilityScoreAssignment,
  characterBuildSpellcastingSlotCapacity,
  classUnitId,
  CHARACTER_CLASS_LEVELS,
  parseCharacterEquipmentItemId,
  STANDARD_LANGUAGES,
  type CharacterBuild,
  type CharacterBuildEquipment,
  type CharacterBuildFeature,
  type CharacterBuildProficiencyChoiceSubject,
  type CharacterBuildSpellcasting,
  type CharacterBuildSpellcastingFocus,
  type CharacterBuildSpellcastingSource,
} from "@dnd/character-creation-runtime";
import { ABILITIES, SKILLS, type Ability } from "@dnd/shared/game-facts";
import { Hp, resourceCount, spellSlotLevel } from "@dnd/shared/types";
import type {
  DeathSaveCount,
  DeathSaves,
} from "@dnd/shared-algebras/death-saves-algebra";
import type {
  Hp as HpType,
  ResourceCount,
  SpellSlotLevel,
} from "@dnd/shared/types";
import { Brand, Either } from "effect";

const WEAPON_PROFICIENCY_CATEGORY_VALUES = ["simple", "martial"] as const;
const ARMOR_TRAINING_CATEGORY_VALUES = [
  "light",
  "medium",
  "heavy",
  "shield",
] as const;

export type CharacterSheetId = string & Brand.Brand<"CharacterId">;
const CharacterSheetId = Brand.nominal<CharacterSheetId>();

export function characterSheetId(value: string): CharacterSheetId {
  return CharacterSheetId(value);
}

type SpellcastingCharacterBuild = CharacterBuild & {
  readonly spellcasting: NonNullable<CharacterBuild["spellcasting"]>;
};

type NonSpellcastingCharacterBuild = CharacterBuild & {
  readonly spellcasting?: undefined;
};

export type CharacterSheet =
  | {
      readonly tag: "available";
      readonly characterId: CharacterSheetId;
      readonly build: SpellcastingCharacterBuild;
      readonly maximumHp: HpType;
      readonly hitPoints: CharacterSheetHitPoints;
      readonly spellSlotExpenditures: readonly CharacterSpellSlotExpenditure[];
    }
  | {
      readonly tag: "available";
      readonly characterId: CharacterSheetId;
      readonly build: NonSpellcastingCharacterBuild;
      readonly maximumHp: HpType;
      readonly hitPoints: CharacterSheetHitPoints;
      readonly spellSlots?: never;
    };

export type CharacterSpellSlotExpenditure = {
  readonly spellLevel: SpellSlotLevel;
  readonly expended: ResourceCount;
};

export type CharacterSheetSpellSlotState = {
  readonly spellLevel: SpellSlotLevel;
  readonly count: ResourceCount;
  readonly expended: ResourceCount;
};

export type CharacterSheetInput = {
  readonly characterId: CharacterSheetId;
  readonly build: CharacterBuild;
  readonly maximumHp: HpType;
  readonly currentHp: HpType;
  readonly tempHp: HpType;
  readonly positiveHpUnconscious?: CharacterSheetPositiveHpUnconscious;
  readonly zeroHpLifecycle?: CharacterSheetZeroHpLifecycleInput;
  readonly spellSlots?: readonly CharacterSheetSpellSlotState[];
};

export type CharacterSheetPositiveHpUnconscious = {
  readonly tag: "knockedOut";
};

export const CHARACTER_SHEET_KNOCKED_OUT_UNCONSCIOUS = {
  tag: "knockedOut",
} as const satisfies CharacterSheetPositiveHpUnconscious;

type CharacterSheetPendingDeathSaveCount = Exclude<DeathSaveCount, 3>;

export type CharacterSheetPendingDeathSaves = {
  readonly successes: CharacterSheetPendingDeathSaveCount;
  readonly failures: CharacterSheetPendingDeathSaveCount;
};

export type CharacterSheetDeadDeathSaves = {
  readonly successes: CharacterSheetPendingDeathSaveCount;
  readonly failures: 3;
};

type CharacterSheetStableZeroHpLifecycle = {
  readonly tag: "stable";
  readonly recovery: { readonly kind: "regains1HpAfter1d4Hours" };
};

export type CharacterSheetZeroHpLifecycle =
  | {
      readonly tag: "unstable";
      readonly deathSaves: CharacterSheetPendingDeathSaves;
    }
  | CharacterSheetStableZeroHpLifecycle
  | {
      readonly tag: "dead";
      readonly deathSaves: CharacterSheetDeadDeathSaves;
    };

export type CharacterSheetZeroHpLifecycleInput =
  | { readonly tag: "unstable"; readonly deathSaves: DeathSaves }
  | CharacterSheetStableZeroHpLifecycle
  | { readonly tag: "dead"; readonly deathSaves: DeathSaves };

export type CharacterSheetHitPoints =
  | {
      readonly tag: "positive";
      readonly currentHp: HpType;
      readonly tempHp: HpType;
    }
  | { readonly tag: "knockedOut"; readonly tempHp: HpType }
  | {
      readonly tag: "zero";
      readonly tempHp: HpType;
      readonly lifecycle: CharacterSheetZeroHpLifecycle;
    };

export type CharacterSheetHitPointsInput = {
  readonly currentHp: HpType;
  readonly tempHp: HpType;
  readonly positiveHpUnconscious?: CharacterSheetPositiveHpUnconscious;
  readonly zeroHpLifecycle?: CharacterSheetZeroHpLifecycleInput;
};

export type CharacterSheetIssue = {
  readonly tag: "characterSheetIssue";
  readonly message: string;
};

export function characterSheetIssue(
  message: string,
): Either.Either<never, CharacterSheetIssue> {
  return Either.left({ tag: "characterSheetIssue", message });
}

export function createFreshCharacterSheet(
  input: CharacterSheetInput,
): Either.Either<CharacterSheet, CharacterSheetIssue> {
  const hitPointCapacity = characterSheetHitPointCapacity(input);
  if (Either.isLeft(hitPointCapacity))
    return Either.left(hitPointCapacity.left);

  if (isNonSpellcastingBuild(input.build)) {
    if (input.spellSlots !== undefined) {
      return characterSheetIssue(
        "Non-spellcasting Character Sheet cannot carry Spell Slot state.",
      );
    }
    const hitPoints = characterSheetHitPoints(input);
    if (Either.isLeft(hitPoints)) return Either.left(hitPoints.left);
    return Either.right({
      tag: "available",
      characterId: input.characterId,
      build: input.build,
      maximumHp: input.maximumHp,
      hitPoints: hitPoints.right,
    });
  }

  if (!isSpellcastingBuild(input.build)) {
    return characterSheetIssue(
      "Character build spellcasting state is inconsistent.",
    );
  }
  const build = input.build;
  const hitPoints = characterSheetHitPoints(input);
  if (Either.isLeft(hitPoints)) return Either.left(hitPoints.left);
  const spellSlotExpenditures = spellSlotExpendituresFromInput({
    build,
    characterId: input.characterId,
    maximumHp: input.maximumHp,
    currentHp: input.currentHp,
    tempHp: input.tempHp,
    ...(input.spellSlots === undefined ? {} : { spellSlots: input.spellSlots }),
  });
  if (Either.isLeft(spellSlotExpenditures)) {
    return Either.left(spellSlotExpenditures.left);
  }

  return Either.right({
    tag: "available",
    characterId: input.characterId,
    build,
    maximumHp: input.maximumHp,
    hitPoints: hitPoints.right,
    spellSlotExpenditures: spellSlotExpenditures.right,
  });
}

export function parseCharacterSheet(
  value: unknown,
): Either.Either<CharacterSheet, CharacterSheetIssue> {
  if (!isRecord(value)) return characterSheetIssue("Expected Character Sheet.");
  if (value.tag !== "available") {
    return characterSheetIssue("Expected available Character Sheet.");
  }
  if (typeof value.characterId !== "string") {
    return characterSheetIssue("Character Sheet requires character id.");
  }
  const build = parseCharacterBuild(value.build);
  if (Either.isLeft(build)) return Either.left(build.left);
  const maximumHp = parseHp(value.maximumHp);
  if (Either.isLeft(maximumHp)) return Either.left(maximumHp.left);
  const hitPoints = parseStoredHitPoints(value.hitPoints);
  if (Either.isLeft(hitPoints)) return Either.left(hitPoints.left);
  const spellSlots = parseStoredSpellSlots(build.right, value);
  if (Either.isLeft(spellSlots)) return Either.left(spellSlots.left);

  return createFreshCharacterSheet({
    characterId: characterSheetId(value.characterId),
    build: build.right,
    maximumHp: maximumHp.right,
    currentHp: hitPoints.right.currentHp,
    tempHp: hitPoints.right.tempHp,
    ...(hitPoints.right.positiveHpUnconscious === undefined
      ? {}
      : { positiveHpUnconscious: hitPoints.right.positiveHpUnconscious }),
    ...(hitPoints.right.zeroHpLifecycle === undefined
      ? {}
      : { zeroHpLifecycle: hitPoints.right.zeroHpLifecycle }),
    ...(spellSlots.right === undefined ? {} : { spellSlots: spellSlots.right }),
  });
}

export function characterSheetHitPoints(
  input: CharacterSheetHitPointsInput,
): Either.Either<CharacterSheetHitPoints, CharacterSheetIssue> {
  if (!isNonNegativeInteger(input.tempHp)) {
    return characterSheetIssue(
      "Character Sheet Temporary Hit Points must be nonnegative.",
    );
  }
  const tempHp = input.tempHp;
  if (Number(input.currentHp) > 0) {
    if (input.zeroHpLifecycle !== undefined) {
      return characterSheetIssue(
        "Positive-HP Character Sheet cannot carry zero-HP state.",
      );
    }
    if (
      input.positiveHpUnconscious !== undefined &&
      Number(input.currentHp) !== 1
    ) {
      return characterSheetIssue(
        "Knocked Out Character Sheet must have exactly 1 current HP.",
      );
    }
    return Either.right(
      input.positiveHpUnconscious === undefined
        ? { tag: "positive", currentHp: input.currentHp, tempHp }
        : { tag: "knockedOut", tempHp },
    );
  }
  if (input.positiveHpUnconscious !== undefined) {
    return characterSheetIssue(
      "Zero-HP Character Sheet cannot carry Knock Out Unconscious state.",
    );
  }
  const lifecycle = canonicalZeroHpLifecycle(
    input.zeroHpLifecycle ?? {
      tag: "unstable",
      deathSaves: { successes: 0, failures: 0 },
    },
  );
  return Either.isLeft(lifecycle)
    ? Either.left(lifecycle.left)
    : Either.right({ tag: "zero", tempHp, lifecycle: lifecycle.right });
}

export function characterSheetCurrentHp(sheet: CharacterSheet): HpType {
  return characterSheetHitPointsCurrentHp(sheet.hitPoints);
}

export function characterSheetTempHp(sheet: CharacterSheet): HpType {
  return sheet.hitPoints.tempHp;
}

export function characterSheetHitPointsCurrentHp(
  hitPoints: CharacterSheetHitPoints,
): HpType {
  if (hitPoints.tag === "positive") return hitPoints.currentHp;
  return hitPoints.tag === "knockedOut" ? Hp(1) : Hp(0);
}

export function characterSheetSpellSlots(
  sheet: CharacterSheet,
): readonly CharacterSheetSpellSlotState[] | undefined {
  if (!("spellSlotExpenditures" in sheet)) return undefined;
  return characterBuildSpellcastingSlotCapacity(sheet.build).map((slot) => {
    const expenditure = requireSpellSlotExpenditure(
      sheet.spellSlotExpenditures,
      spellSlotLevel(slot.spellLevel),
    );
    return {
      spellLevel: spellSlotLevel(slot.spellLevel),
      count: resourceCount(slot.count),
      expended: expenditure.expended,
    };
  });
}

function requireSpellSlotExpenditure(
  expenditures: readonly CharacterSpellSlotExpenditure[],
  spellLevel: SpellSlotLevel,
): CharacterSpellSlotExpenditure {
  const expenditure = expenditures.find(
    (candidate) => candidate.spellLevel === spellLevel,
  );
  if (expenditure !== undefined) return expenditure;
  throw new Error(
    `Available spellcasting Character Sheet is missing Spell Slot expenditure for level ${spellLevel}.`,
  );
}

function spellSlotExpendituresFromInput(
  input: CharacterSheetInput & {
    readonly build: SpellcastingCharacterBuild;
  },
): Either.Either<
  readonly CharacterSpellSlotExpenditure[],
  CharacterSheetIssue
> {
  const runtimeSlots =
    input.spellSlots ??
    characterBuildSpellcastingSlotCapacity(input.build).map((slot) => ({
      spellLevel: spellSlotLevel(slot.spellLevel),
      count: resourceCount(slot.count),
      expended: resourceCount(0),
    }));
  const buildSlots = characterBuildSpellcastingSlotCapacity(input.build);
  if (runtimeSlots.length !== buildSlots.length) {
    return characterSheetIssue(
      "Spell Slot state must match build capacity exactly.",
    );
  }
  const runtimeLevels = new Set<number>();
  for (const runtimeSlot of runtimeSlots) {
    if (runtimeLevels.has(runtimeSlot.spellLevel)) {
      return characterSheetIssue(
        "Spell Slot state must not duplicate spell levels.",
      );
    }
    runtimeLevels.add(runtimeSlot.spellLevel);
  }
  const expenditures = [];
  for (const buildSlot of buildSlots) {
    const runtimeSlot = runtimeSlots.find(
      (candidate) =>
        candidate.spellLevel === spellSlotLevel(buildSlot.spellLevel),
    );
    if (
      runtimeSlot === undefined ||
      runtimeSlot.count !== resourceCount(buildSlot.count) ||
      !Number.isInteger(runtimeSlot.expended) ||
      runtimeSlot.expended < 0 ||
      runtimeSlot.expended > buildSlot.count
    ) {
      return characterSheetIssue(
        `Spell Slot state does not match build capacity for level ${buildSlot.spellLevel}.`,
      );
    }
    expenditures.push({
      spellLevel: spellSlotLevel(buildSlot.spellLevel),
      expended: resourceCount(runtimeSlot.expended),
    });
  }
  return Either.right(expenditures);
}

function characterSheetHitPointCapacity(
  input: Pick<CharacterSheetInput, "maximumHp" | "currentHp">,
): Either.Either<void, CharacterSheetIssue> {
  if (input.maximumHp < 1) {
    return characterSheetIssue("Character Sheet maximum HP must be positive.");
  }
  if (input.currentHp > input.maximumHp) {
    return characterSheetIssue(
      "Character Sheet current HP exceeds maximum HP.",
    );
  }
  return Either.right(undefined);
}

type ParsedStoredHitPoints = {
  readonly currentHp: HpType;
  readonly tempHp: HpType;
  readonly positiveHpUnconscious?: CharacterSheetPositiveHpUnconscious;
  readonly zeroHpLifecycle?: CharacterSheetZeroHpLifecycleInput;
};

function parseStoredHitPoints(
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
    return Either.right({
      tag: "stable",
      recovery: { kind: "regains1HpAfter1d4Hours" },
    });
  }
  if (value.tag !== "unstable" && value.tag !== "dead") {
    return characterSheetIssue("Expected zero-HP lifecycle state.");
  }
  const deathSaves = parseStoredDeathSaves(value.deathSaves);
  return Either.isLeft(deathSaves)
    ? Either.left(deathSaves.left)
    : Either.right({ tag: value.tag, deathSaves: deathSaves.right });
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

function parseStoredSpellSlots(
  build: CharacterBuild,
  value: Readonly<Record<string, unknown>>,
): Either.Either<
  readonly CharacterSheetSpellSlotState[] | undefined,
  CharacterSheetIssue
> {
  if (!isSpellcastingBuild(build)) {
    return value.spellSlotExpenditures === undefined
      ? Either.right(undefined)
      : characterSheetIssue(
          "Non-spellcasting Character Sheet cannot carry Spell Slot state.",
        );
  }
  if (!Array.isArray(value.spellSlotExpenditures)) {
    return characterSheetIssue(
      "Spellcasting Character Sheet requires Spell Slot state.",
    );
  }
  const parsed = [];
  for (const expenditure of value.spellSlotExpenditures) {
    if (!isRecord(expenditure)) {
      return characterSheetIssue("Expected Spell Slot expenditure.");
    }
    const spellLevel = parseSpellSlotLevel(expenditure.spellLevel);
    const expended = parseResourceCount(expenditure.expended);
    if (Either.isLeft(spellLevel)) return Either.left(spellLevel.left);
    if (Either.isLeft(expended)) return Either.left(expended.left);
    const capacity = characterBuildSpellcastingSlotCapacity(build).find(
      (slot) => slot.spellLevel === spellLevel.right,
    );
    if (capacity === undefined) {
      return characterSheetIssue(
        "Spell Slot state does not match build capacity.",
      );
    }
    parsed.push({
      spellLevel: spellLevel.right,
      count: resourceCount(capacity.count),
      expended: expended.right,
    });
  }
  return Either.right(parsed);
}

function parseHp(value: unknown): Either.Either<HpType, CharacterSheetIssue> {
  return isNonNegativeInteger(value)
    ? Either.right(Hp(value))
    : characterSheetIssue("Expected nonnegative HP.");
}

function parseResourceCount(
  value: unknown,
): Either.Either<ResourceCount, CharacterSheetIssue> {
  return isNonNegativeInteger(value)
    ? Either.right(resourceCount(value))
    : characterSheetIssue("Expected nonnegative resource count.");
}

function parseSpellSlotLevel(
  value: unknown,
): Either.Either<SpellSlotLevel, CharacterSheetIssue> {
  return isPositiveInteger(value)
    ? Either.right(spellSlotLevel(value))
    : characterSheetIssue("Expected positive Spell Slot level.");
}

function canonicalZeroHpLifecycle(
  lifecycle: CharacterSheetZeroHpLifecycleInput,
): Either.Either<CharacterSheetZeroHpLifecycle, CharacterSheetIssue> {
  if (lifecycle.tag === "stable") return Either.right(lifecycle);
  if (lifecycle.tag === "dead") {
    const { successes, failures } = lifecycle.deathSaves;
    if (successes === 3 || failures !== 3) {
      return characterSheetIssue(
        "Dead Character Sheet requires exactly three death save failures.",
      );
    }
    return Either.right({ tag: "dead", deathSaves: { successes, failures } });
  }
  const { successes, failures } = lifecycle.deathSaves;
  if (successes === 3 || failures === 3) {
    return characterSheetIssue(
      "Unstable Character Sheet cannot carry terminal death save counts.",
    );
  }
  return Either.right({ tag: "unstable", deathSaves: { successes, failures } });
}

function parseCharacterBuild(
  value: unknown,
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
  const features = parseStoredFeatures(value.features);
  if (Either.isLeft(features)) return Either.left(features.left);
  const spellcasting =
    value.spellcasting === undefined
      ? undefined
      : parseStoredSpellcasting(value.spellcasting);
  if (spellcasting !== undefined && Either.isLeft(spellcasting)) {
    return Either.left(spellcasting.left);
  }
  const equipment = parseStoredEquipment(value.equipment);
  if (Either.isLeft(equipment)) return Either.left(equipment.left);

  return Either.right({
    progression: progression.right,
    background: value.background,
    species: value.species,
    originLanguages: originLanguages.right,
    alignment: alignment.right,
    abilityScores: abilityScores.right,
    proficiencyChoices: proficiencyChoices.right,
    features: features.right,
    ...(spellcasting === undefined ? {} : { spellcasting: spellcasting.right }),
    equipment: equipment.right,
  });
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
      classUnitId: classUnitId(advancement.classUnitId),
      hitPointRule: { tag: "fixedHigherLevelGain" as const },
    });
  }
  const totalLevel = 1 + advancements.length;
  if (!CHARACTER_CLASS_LEVELS.some((level) => level === totalLevel)) {
    return characterSheetIssue("Character Build progression is invalid.");
  }
  return Either.right({
    startingClass: classUnitId(value.startingClass),
    advancements,
  });
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
  return Either.right(value as unknown as CharacterBuild["originLanguages"]);
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
  if (!isRecord(value)) {
    return characterSheetIssue("Character Build requires ability scores.");
  }
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
  const choices = [];
  for (const choice of value) {
    if (!isRecord(choice) || typeof choice.kind !== "string") {
      return characterSheetIssue(
        "Character Build proficiency choice is invalid.",
      );
    }
    if (
      choice.kind === "skill" &&
      SKILLS.some((skill) => skill === choice.skill)
    ) {
      choices.push({ kind: "skill", skill: choice.skill });
    } else if (
      choice.kind === "weapon_category" &&
      WEAPON_PROFICIENCY_CATEGORY_VALUES.some(
        (category) => category === choice.category,
      )
    ) {
      choices.push({ kind: "weapon_category", category: choice.category });
    } else if (
      choice.kind === "armor_category" &&
      ARMOR_TRAINING_CATEGORY_VALUES.some(
        (category) => category === choice.category,
      )
    ) {
      choices.push({ kind: "armor_category", category: choice.category });
    } else if (choice.kind === "tool" && typeof choice.toolId === "string") {
      choices.push({ kind: "tool", toolId: choice.toolId });
    } else {
      return characterSheetIssue(
        "Character Build proficiency choice is invalid.",
      );
    }
  }
  return Either.right(
    choices as readonly CharacterBuildProficiencyChoiceSubject[],
  );
}

function parseStoredFeatures(
  value: unknown,
): Either.Either<readonly CharacterBuildFeature[], CharacterSheetIssue> {
  if (!Array.isArray(value)) {
    return characterSheetIssue("Character Build requires features.");
  }
  const features = [];
  for (const feature of value) {
    if (
      !isRecord(feature) ||
      feature.kind !== "selectedClassChoice" ||
      typeof feature.unitId !== "string" ||
      typeof feature.selectedFromUnitId !== "string"
    ) {
      return characterSheetIssue("Character Build feature is invalid.");
    }
    features.push({
      kind: "selectedClassChoice" as const,
      unitId: feature.unitId,
      selectedFromUnitId: feature.selectedFromUnitId,
    });
  }
  return Either.right(features);
}

function parseStoredSpellcasting(
  value: unknown,
): Either.Either<CharacterBuildSpellcasting, CharacterSheetIssue> {
  if (
    !isRecord(value) ||
    !Array.isArray(value.sources) ||
    value.sources.length === 0
  ) {
    return characterSheetIssue(
      "Character Build spellcasting requires sources.",
    );
  }
  const sources = value.sources.map(parseStoredSpellcastingSource);
  const firstIssue = sources.find(Either.isLeft);
  if (firstIssue !== undefined) return Either.left(firstIssue.left);
  const slotPools = parseStoredSpellSlotPools(value.slotPools);
  if (Either.isLeft(slotPools)) return Either.left(slotPools.left);
  const parsedSources = sources
    .filter(Either.isRight)
    .map((source) => source.right);
  return Either.right({
    sources: parsedSources as unknown as CharacterBuildSpellcasting["sources"],
    slotPools: slotPools.right,
  });
}

function parseStoredSpellcastingSource(
  value: unknown,
): Either.Either<CharacterBuildSpellcastingSource, CharacterSheetIssue> {
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
  return Either.right({
    sourceUnitId: value.sourceUnitId,
    spellcastingAbility: value.spellcastingAbility,
    cantrips: value.cantrips,
    spellbook: value.spellbook,
    preparedSpells: value.preparedSpells,
    spellcastingFocuses:
      value.spellcastingFocuses as readonly CharacterBuildSpellcastingFocus[],
  });
}

function parseStoredSpellSlotPools(
  value: unknown,
): Either.Either<CharacterBuildSpellcasting["slotPools"], CharacterSheetIssue> {
  if (!isRecord(value)) {
    return characterSheetIssue(
      "Character Build spellcasting requires slot pools.",
    );
  }
  const spellcasting =
    value.spellcasting === undefined
      ? undefined
      : parseStoredSpellcastingSlotPool(value.spellcasting);
  if (spellcasting !== undefined && Either.isLeft(spellcasting)) {
    return Either.left(spellcasting.left);
  }
  const pactMagic =
    value.pactMagic === undefined
      ? undefined
      : parseStoredPactMagicSlotPool(value.pactMagic);
  if (pactMagic !== undefined && Either.isLeft(pactMagic)) {
    return Either.left(pactMagic.left);
  }
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
  const owned = [];
  for (const item of value.owned) {
    if (
      !isRecord(item) ||
      typeof item.itemId !== "string" ||
      typeof item.unitId !== "string"
    ) {
      return characterSheetIssue(
        "Character Build owned equipment item is invalid.",
      );
    }
    const parsedItemId = parseCharacterEquipmentItemId(item.itemId);
    if (Either.isLeft(parsedItemId)) {
      return characterSheetIssue(
        "Character Build owned equipment item id is invalid.",
      );
    }
    owned.push({ itemId: item.itemId, unitId: item.unitId });
  }
  const loadout = parseStoredLoadout(value.loadout);
  if (Either.isLeft(loadout)) return Either.left(loadout.left);
  return Either.right({
    owned,
    loadout: loadout.right,
  } as unknown as CharacterBuildEquipment);
}

function parseStoredLoadout(
  value: Readonly<Record<string, unknown>>,
): Either.Either<CharacterBuildEquipment["loadout"], CharacterSheetIssue> {
  const armor = parseOptionalEquipmentItemId(value.armor, "armor");
  if (Either.isLeft(armor)) return Either.left(armor.left);
  const shield = parseOptionalEquipmentItemId(value.shield, "shield");
  if (Either.isLeft(shield)) return Either.left(shield.left);
  const weapon = parseStoredMainWeapon(value.weapon);
  if (Either.isLeft(weapon)) return Either.left(weapon.left);
  const offHandWeapon = parseStoredOffHandWeapon(value.offHandWeapon);
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
  if (!isRecord(value) || value.grip !== "one_handed") {
    return characterSheetIssue("Character Build weapon loadout is invalid.");
  }
  const itemId = parseOptionalEquipmentItemId(value.itemId, "main");
  if (Either.isLeft(itemId)) return Either.left(itemId.left);
  if (itemId.right === undefined) {
    return characterSheetIssue("Character Build weapon loadout is invalid.");
  }
  return Either.right({
    itemId: itemId.right as NonNullable<
      CharacterBuildEquipment["loadout"]["weapon"]
    >["itemId"],
    grip: "one_handed",
  });
}

function parseStoredOffHandWeapon(
  value: unknown,
): Either.Either<
  CharacterBuildEquipment["loadout"]["offHandWeapon"],
  CharacterSheetIssue
> {
  if (value === undefined) return Either.right(undefined);
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
  return Either.right({
    itemId: itemId.right as NonNullable<
      CharacterBuildEquipment["loadout"]["offHandWeapon"]
    >["itemId"],
  });
}

function parseOptionalEquipmentItemId(
  value: unknown,
  slot: "armor" | "shield" | "main" | "off",
): Either.Either<
  CharacterBuildEquipment["owned"][number]["itemId"] | undefined,
  CharacterSheetIssue
> {
  if (value === undefined) return Either.right(undefined);
  if (typeof value !== "string") {
    return characterSheetIssue("Character Build equipment item id is invalid.");
  }
  const parsed = parseCharacterEquipmentItemId(value);
  if (Either.isLeft(parsed) || parsed.right.slot !== slot) {
    return characterSheetIssue(
      "Character Build equipment item slot is invalid.",
    );
  }
  return Either.right(
    value as CharacterBuildEquipment["owned"][number]["itemId"],
  );
}

function isAbility(value: unknown): value is Ability {
  return ABILITIES.some((ability) => ability === value);
}

function isStandardLanguage(value: unknown): value is string {
  return STANDARD_LANGUAGES.some((language) => language === value);
}

function isStringArray(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isDeathSaveCount(value: unknown): value is DeathSaveCount {
  return value === 0 || value === 1 || value === 2 || value === 3;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

function isSpellcastingBuild(
  build: CharacterBuild,
): build is SpellcastingCharacterBuild {
  return build.spellcasting !== undefined;
}

function isNonSpellcastingBuild(
  build: CharacterBuild,
): build is NonSpellcastingCharacterBuild {
  return build.spellcasting === undefined;
}
