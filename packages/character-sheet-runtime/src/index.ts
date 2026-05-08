import {
  ALIGNMENT_MORALITIES,
  ALIGNMENT_ORDERS,
  abilityScoreAssignment,
  characterBuildArmorTraining,
  characterBuildFeatureUnitIds,
  characterBuildHitPoints,
  characterBuildSpellcastingSlotCapacity,
  classLevelForUnit,
  classUnitId,
  CHARACTER_CLASS_LEVELS,
  characterEquipmentItemSourceFromId,
  parseCharacterEquipmentItemId,
  progressionClassUnitIds,
  STANDARD_LANGUAGES,
  type CharacterBuild,
  type CharacterBuildEquipment,
  type CharacterBuildFeature,
  type CharacterBuildHitDiePool,
  type CharacterBuildPactMagicSlotPool,
  type CharacterBuildProficiencyChoiceSubject,
  type CharacterBuildSpellcasting,
  type CharacterBuildSpellcastingFocus,
  type CharacterBuildSpellcastingSource,
  type UnitCatalog,
} from "@dnd/character-creation-runtime";
import { ABILITIES, SKILLS, type Ability } from "@dnd/shared/game-facts";
import {
  DieRollResult,
  Hp,
  resourceCount,
  spellSlotLevel,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import {
  elapsedTimeTicksFromTimeSpanDuration,
  parseElapsedTimeTicks,
  parsePositiveElapsedTimeTicks,
  type ElapsedTimeTicks,
  type PositiveElapsedTimeTicks,
  type TimeSpanDuration,
} from "@dnd/shared/elapsed-time";
import {
  abilityModifier,
  armorClass,
  armorClassDelta,
  currentArmorClass,
  defaultArmorClassState,
  zeroAbilityModifiers,
  type ArmorClassBaseSource,
  type ArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import { abilityScoreToMod } from "@dnd/shared-algebras/ability-score-algebra";
import type {
  DeathSaveCount,
  DeathSaves,
} from "@dnd/shared-algebras/death-saves-algebra";
import {
  holeId,
  holeInstanceKey,
  type FilledHoleValue,
  type RuntimeHole,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { validateRolledDiceForDiceExpr } from "@dnd/shared-algebras/runtime-dice-algebra";
import {
  STABLE_RECOVERY_ROLL_DICE_EXPR,
  advanceStableRecovery,
  advanceStableRecoveryWithRoll,
  type StableRecovery,
} from "@dnd/shared-algebras/stable-recovery-algebra";
import type {
  Hp as HpType,
  ResourceCount,
  SpellSlotLevel,
} from "@dnd/shared/types";
import type {
  ClassFeatureComponentMechanics,
  EquipmentPredicate,
  UnitRecord,
} from "@dnd/surface/surface/types";
import { Brand, Either, Option } from "effect";

// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.armor-class-base-formula

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

type CharacterSheetWithSpellSlots = CharacterSheet & {
  readonly build: SpellcastingCharacterBuild;
  readonly spellSlotExpenditures: readonly CharacterSpellSlotExpenditure[];
};

export type CharacterSheet =
  | {
      readonly tag: "available";
      readonly characterId: CharacterSheetId;
      readonly build: SpellcastingCharacterBuild;
      readonly maximumHp: HpType;
      readonly hitPoints: CharacterSheetHitPoints;
      readonly spentHitDice: readonly CharacterSheetSpentHitDiePool[];
      readonly restFeatureUses: readonly CharacterSheetRestFeatureUse[];
      readonly spellSlotExpenditures: readonly CharacterSpellSlotExpenditure[];
      readonly pactSlotExpenditure: CharacterPactSlotExpenditure | undefined;
    }
  | {
      readonly tag: "available";
      readonly characterId: CharacterSheetId;
      readonly build: NonSpellcastingCharacterBuild;
      readonly maximumHp: HpType;
      readonly hitPoints: CharacterSheetHitPoints;
      readonly spentHitDice: readonly CharacterSheetSpentHitDiePool[];
      readonly restFeatureUses: readonly CharacterSheetRestFeatureUse[];
      readonly spellSlotExpenditures?: never;
      readonly pactSlotExpenditure?: never;
    };

export type CharacterSpellSlotExpenditure = {
  readonly spellLevel: SpellSlotLevel;
  readonly expended: ResourceCount;
};

export type CharacterPactSlotExpenditure = {
  readonly slotLevel: SpellSlotLevel;
  readonly count: ResourceCount;
  readonly expended: ResourceCount;
};

export type CharacterSheetSpellSlotState = {
  readonly spellLevel: SpellSlotLevel;
  readonly count: ResourceCount;
  readonly expended: ResourceCount;
};

export type CharacterSheetPactSlotState = CharacterPactSlotExpenditure;

export type CharacterSheetSpentHitDiePool = {
  readonly classUnitId: UnitRecord["id"];
  readonly spent: ResourceCount;
};

export type CharacterSheetHitDieState = CharacterBuildHitDiePool & {
  readonly spent: ResourceCount;
};

export type CharacterSheetHitDieSpend = {
  readonly classUnitId: UnitRecord["id"];
  readonly roll: DieRollResult;
};

export type CharacterSheetRestFeatureUse = {
  readonly tag: "arcaneRecovery";
  readonly usedSinceLongRest: true;
};

export type CharacterSheetArcaneRecoverySlotRefund = {
  readonly spellLevel: SpellSlotLevel;
  readonly count: ResourceCount;
};

export type CharacterSheetShortRestInput = {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly spendHitDice?: readonly CharacterSheetHitDieSpend[];
  readonly arcaneRecovery?: {
    readonly refundSpellSlots: readonly CharacterSheetArcaneRecoverySlotRefund[];
  };
};

export type CharacterSheetLongRestInput = {
  readonly sheet: CharacterSheet;
};

export type CharacterSheetInput = {
  readonly characterId: CharacterSheetId;
  readonly build: CharacterBuild;
  readonly maximumHp: HpType;
  readonly currentHp: HpType;
  readonly tempHp: HpType;
  readonly unitLibrary: UnitCatalog;
  readonly positiveHpUnconscious?: CharacterSheetPositiveHpUnconscious;
  readonly zeroHpLifecycle?: CharacterSheetZeroHpLifecycleInput;
  readonly spentHitDice?: readonly CharacterSheetSpentHitDiePool[];
  readonly spellSlots?: readonly CharacterSheetSpellSlotState[];
  readonly pactSlots?: CharacterSheetPactSlotState;
  readonly restFeatureUses?: readonly CharacterSheetRestFeatureUse[];
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
  readonly recovery: CharacterSheetStableRecovery;
};

export type CharacterSheetStableRecovery = StableRecovery;

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

export type CharacterSheetElapsedTimeResult =
  | {
      readonly tag: "resolved";
      readonly sheet: CharacterSheet;
      readonly elapsedTicks: ElapsedTimeTicks;
    }
  | {
      readonly tag: "needsHoles";
      readonly sheet: CharacterSheet;
      readonly holes: ReadonlyNonEmptyArray<RuntimeHole>;
      readonly elapsedTicks: ElapsedTimeTicks;
      readonly remainingTicks: PositiveElapsedTimeTicks;
    }
  | {
      readonly tag: "invalid";
      readonly sheet: CharacterSheet;
      readonly reason: "invalidFill";
      readonly message: string;
    };

export type CharacterSheetTimePassedInput = {
  readonly sheet: CharacterSheet;
  readonly duration: TimeSpanDuration;
  readonly fills: readonly FilledHoleValue[];
};

export type CharacterSheetArmorClassBaseChoice =
  | { readonly kind: "default_unarmored" }
  | { readonly kind: "class_feature"; readonly unitId: UnitRecord["id"] };

export type CharacterSheetArmorClassStateInput = {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly baseChoice?: CharacterSheetArmorClassBaseChoice;
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
  const spentHitDice = spentHitDiceFromInput(input);
  if (Either.isLeft(spentHitDice)) return Either.left(spentHitDice.left);
  const restFeatureUses = restFeatureUsesFromInput(input);
  if (Either.isLeft(restFeatureUses)) return Either.left(restFeatureUses.left);

  if (isNonSpellcastingBuild(input.build)) {
    if (input.spellSlots !== undefined) {
      return characterSheetIssue(
        "Non-spellcasting Character Sheet cannot carry Spell Slot state.",
      );
    }
    if (input.pactSlots !== undefined) {
      return characterSheetIssue(
        "Non-spellcasting Character Sheet cannot carry Pact Slot state.",
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
      spentHitDice: spentHitDice.right,
      restFeatureUses: restFeatureUses.right,
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
    ...(input.spellSlots === undefined ? {} : { spellSlots: input.spellSlots }),
  });
  if (Either.isLeft(spellSlotExpenditures)) {
    return Either.left(spellSlotExpenditures.left);
  }
  const pactSlotExpenditure = pactSlotExpenditureFromInput({
    build,
    ...(input.pactSlots === undefined ? {} : { pactSlots: input.pactSlots }),
  });
  if (Either.isLeft(pactSlotExpenditure)) {
    return Either.left(pactSlotExpenditure.left);
  }

  return Either.right({
    tag: "available",
    characterId: input.characterId,
    build,
    maximumHp: input.maximumHp,
    hitPoints: hitPoints.right,
    spentHitDice: spentHitDice.right,
    restFeatureUses: restFeatureUses.right,
    spellSlotExpenditures: spellSlotExpenditures.right,
    pactSlotExpenditure: pactSlotExpenditure.right,
  });
}

export function parseCharacterSheet(
  value: unknown,
  unitLibrary: UnitCatalog,
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
  const spentHitDice = parseStoredSpentHitDice(value.spentHitDice);
  if (Either.isLeft(spentHitDice)) return Either.left(spentHitDice.left);
  const spellSlots = parseStoredSpellSlots(build.right, value);
  if (Either.isLeft(spellSlots)) return Either.left(spellSlots.left);
  const pactSlots = parseStoredPactSlots(build.right, value);
  if (Either.isLeft(pactSlots)) return Either.left(pactSlots.left);
  const restFeatureUses = parseStoredRestFeatureUses(
    build.right,
    unitLibrary,
    value.restFeatureUses,
  );
  if (Either.isLeft(restFeatureUses)) return Either.left(restFeatureUses.left);

  return createFreshCharacterSheet({
    characterId: characterSheetId(value.characterId),
    build: build.right,
    maximumHp: maximumHp.right,
    currentHp: hitPoints.right.currentHp,
    tempHp: hitPoints.right.tempHp,
    unitLibrary,
    ...(hitPoints.right.positiveHpUnconscious === undefined
      ? {}
      : { positiveHpUnconscious: hitPoints.right.positiveHpUnconscious }),
    ...(hitPoints.right.zeroHpLifecycle === undefined
      ? {}
      : { zeroHpLifecycle: hitPoints.right.zeroHpLifecycle }),
    ...(spellSlots.right === undefined ? {} : { spellSlots: spellSlots.right }),
    ...(pactSlots.right === undefined ? {} : { pactSlots: pactSlots.right }),
    spentHitDice: spentHitDice.right,
    restFeatureUses: restFeatureUses.right,
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
  if (!isCharacterSheetWithSpellSlots(sheet)) return undefined;
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

export function characterSheetPactSlots(
  sheet: CharacterSheet,
): CharacterSheetPactSlotState | undefined {
  return "pactSlotExpenditure" in sheet ? sheet.pactSlotExpenditure : undefined;
}

export function characterSheetHitDice(
  sheet: CharacterSheet,
  unitLibrary: UnitCatalog,
): Either.Either<readonly CharacterSheetHitDieState[], CharacterSheetIssue> {
  const capacity = characterBuildHitDice(sheet.build, unitLibrary);
  if (Either.isLeft(capacity)) return Either.left(capacity.left);
  return Either.right(
    capacity.right.map((pool) => ({
      ...pool,
      spent:
        sheet.spentHitDice.find(
          (spent) => spent.classUnitId === pool.classUnitId,
        )?.spent ?? resourceCount(0),
    })),
  );
}

export function completeShortRest(
  input: CharacterSheetShortRestInput,
): Either.Either<CharacterSheet, CharacterSheetIssue> {
  if (characterSheetCurrentHp(input.sheet) < Hp(1)) {
    return characterSheetIssue(
      "Short Rest requires the Character Sheet to have at least 1 HP.",
    );
  }
  const pactRecovered = recoverPactSlots(input.sheet);
  const hitDiceSpent = spendHitDice({
    sheet: pactRecovered,
    unitLibrary: input.unitLibrary,
    spendHitDice: input.spendHitDice,
  });
  if (Either.isLeft(hitDiceSpent)) return Either.left(hitDiceSpent.left);
  if (input.arcaneRecovery === undefined) return Either.right(hitDiceSpent.right);
  return applyArcaneRecovery({
    sheet: hitDiceSpent.right,
    unitLibrary: input.unitLibrary,
    refundSpellSlots: input.arcaneRecovery.refundSpellSlots,
  });
}

export function completeLongRest(
  input: CharacterSheetLongRestInput,
): Either.Either<CharacterSheet, CharacterSheetIssue> {
  if (characterSheetCurrentHp(input.sheet) < Hp(1)) {
    return characterSheetIssue(
      "Long Rest requires the Character Sheet to have at least 1 HP.",
    );
  }
  const hitPoints = characterSheetHitPoints({
    currentHp: input.sheet.maximumHp,
    tempHp: Hp(0),
  });
  if (Either.isLeft(hitPoints)) return Either.left(hitPoints.left);
  if (isCharacterSheetWithSpellSlots(input.sheet)) {
    return Either.right({
      ...input.sheet,
      hitPoints: hitPoints.right,
      spentHitDice: [],
      restFeatureUses: [],
      spellSlotExpenditures: input.sheet.spellSlotExpenditures.map(
        (expenditure) => ({
          ...expenditure,
          expended: resourceCount(0),
        }),
      ),
      pactSlotExpenditure:
        input.sheet.pactSlotExpenditure === undefined
          ? undefined
          : { ...input.sheet.pactSlotExpenditure, expended: resourceCount(0) },
    });
  }
  return Either.right({
    ...input.sheet,
    hitPoints: hitPoints.right,
    spentHitDice: [],
    restFeatureUses: [],
  });
}

export function characterSheetArmorClassState(
  input: CharacterSheetArmorClassStateInput,
): Either.Either<ArmorClassState, CharacterSheetIssue> {
  const { build, unitLibrary } = input;
  const loadout = build.equipment.loadout;
  const defaultState = defaultArmorClassState();
  const armorTraining = characterBuildArmorTraining(build, unitLibrary);
  if (Either.isLeft(armorTraining)) {
    return characterSheetIssue(
      armorTraining.left.map((issue) => issue.message).join("; "),
    );
  }

  const armor =
    loadout.armor == null
      ? undefined
      : getRequiredUnit(
          unitLibrary,
          characterEquipmentItemSourceFromId(loadout.armor).unitId,
        );
  if (armor !== undefined && Either.isLeft(armor)) {
    return Either.left(armor.left);
  }

  const shield =
    loadout.shield == null
      ? undefined
      : getRequiredUnit(
          unitLibrary,
          characterEquipmentItemSourceFromId(loadout.shield).unitId,
        );
  if (shield !== undefined && Either.isLeft(shield)) {
    return Either.left(shield.left);
  }

  const base =
    armor?.right.kind === "armor"
      ? Either.right(armorBaseSource(armor.right))
      : selectedUnarmoredBaseSource(input, {
          wearingArmor: false,
          wieldingShield: shield?.right.kind === "shield",
        });
  if (Either.isLeft(base)) return Either.left(base.left);

  const bonuses: ArmorClassState["bonuses"][number][] = [];
  if (shield?.right.kind === "shield") {
    bonuses.push({
      kind: "shield",
      bonus: armorClassDelta(shield.right.armorClassProjection.bonus),
      handUse: shield.right.armorClassProjection.handUse,
      trainingRequired: shield.right.armorClassProjection.trainingRequired,
      sourceUnitId: shield.right.id,
    });
  }

  return Either.right({
    ...defaultState,
    abilityModifiers: characterSheetAbilityModifiers(build),
    base: base.right,
    bonuses,
    armorTraining: new Set(armorTraining.right),
    leftHandUse:
      shield?.right.kind === "shield"
        ? "shield"
        : loadout.offHandWeapon == null
          ? "free"
          : "offWeapon",
    rightHandUse: loadout.weapon == null ? "free" : "mainWeapon",
  });
}

export function characterSheetArmorClass(
  input: CharacterSheetArmorClassStateInput,
): Either.Either<ReturnType<typeof currentArmorClass>, CharacterSheetIssue> {
  const state = characterSheetArmorClassState(input);
  return Either.isLeft(state)
    ? Either.left(state.left)
    : Either.right(currentArmorClass(state.right));
}

export function timePassed(
  input: CharacterSheetTimePassedInput,
): CharacterSheetElapsedTimeResult {
  // Future ASSUMPTIONS.md work: out-of-battle elapsed rounds may imply
  // turn-boundary Death Saving Throws, but this operation currently only
  // handles calendar-time Stable recovery.
  const totalTicks = elapsedTimeTicksFromTimeSpanDuration(input.duration);
  if (Either.isLeft(totalTicks)) {
    return invalidElapsedTimeResult(
      input.sheet,
      `Invalid elapsed-time duration: ${totalTicks.left.kind}.`,
    );
  }
  const consumed = passStableRecoveryTime({
    sheet: input.sheet,
    ticks: totalTicks.right,
    fills: input.fills,
  });
  if (consumed.tag !== "resolved") return consumed;
  return {
    tag: "resolved",
    sheet: consumed.sheet,
    elapsedTicks: consumed.elapsedTicks,
  };
}

type CharacterSheetArmorClassBaseCandidate = {
  readonly choice: CharacterSheetArmorClassBaseChoice;
  readonly base: ArmorClassBaseSource;
};
type CharacterSheetArmorClassEquipmentState = {
  readonly wearingArmor: boolean;
  readonly wieldingShield: boolean;
};
type CharacterSheetClassFeatureRecord = Extract<
  UnitRecord,
  { readonly kind: "class_feature" }
>;
type ModifyAcSetBaseGrant = Extract<
  Extract<
    ClassFeatureComponentMechanics,
    { readonly family: "passive" }
  >["grants"][number],
  { readonly kind: "modify_ac_set_base" }
>;
type RestSpellSlotRecoveryMechanics = Extract<
  CharacterSheetClassFeatureRecord["mechanics"],
  { readonly family: "rest_spell_slot_recovery" }
>;
type CharacterSheetRestSpellSlotRecoveryFeature =
  CharacterSheetClassFeatureRecord & {
    readonly mechanics: RestSpellSlotRecoveryMechanics;
  };
type CharacterSheetRestSpellSlotRecoveryProfile = {
  readonly feature: CharacterSheetRestSpellSlotRecoveryFeature;
  readonly classUnitId: UnitRecord["id"];
};

function selectedUnarmoredBaseSource(
  input: CharacterSheetArmorClassStateInput,
  equipment: CharacterSheetArmorClassEquipmentState,
): Either.Either<ArmorClassBaseSource, CharacterSheetIssue> {
  const defaultBase = {
    choice: { kind: "default_unarmored" },
    base: defaultArmorClassState().base,
  } as const satisfies CharacterSheetArmorClassBaseCandidate;
  const classFeatureCandidateResult =
    characterSheetClassFeatureArmorClassBaseCandidates(
      input.build,
      input.unitLibrary,
      equipment,
    );
  if (Either.isLeft(classFeatureCandidateResult)) {
    return Either.left(classFeatureCandidateResult.left);
  }
  const candidates = [defaultBase, ...classFeatureCandidateResult.right];
  const baseChoice = input.baseChoice;
  if (baseChoice !== undefined) {
    const selected = candidates.find((candidate) =>
      armorClassChoiceEquals(candidate.choice, baseChoice),
    );
    return selected === undefined
      ? characterSheetIssue(
          "Selected Armor Class base formula is not available.",
        )
      : Either.right(selected.base);
  }
  const classFeatureCandidates = candidates.filter(
    (candidate) => candidate.choice.kind === "class_feature",
  );
  if (classFeatureCandidates.length === 0)
    return Either.right(defaultBase.base);
  if (classFeatureCandidates.length === 1) {
    return Either.right(classFeatureCandidates[0].base);
  }
  return characterSheetIssue(
    "Multiple class-feature Armor Class base formulas are available; choose one.",
  );
}

function characterSheetClassFeatureArmorClassBaseCandidates(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
  equipment: CharacterSheetArmorClassEquipmentState,
): Either.Either<
  readonly CharacterSheetArmorClassBaseCandidate[],
  CharacterSheetIssue
> {
  const candidates: CharacterSheetArmorClassBaseCandidate[] = [];
  for (const unitId of characterBuildFeatureUnitIds(build, unitLibrary)) {
    const unit = getRequiredUnit(unitLibrary, unitId);
    if (Either.isLeft(unit)) return Either.left(unit.left);
    candidates.push(...armorClassBaseCandidatesForUnit(unit.right, equipment));
  }
  return Either.right(candidates);
}

function armorClassBaseCandidatesForUnit(
  unit: UnitRecord,
  equipment: CharacterSheetArmorClassEquipmentState,
): readonly CharacterSheetArmorClassBaseCandidate[] {
  if (unit.kind !== "class_feature") return [];
  return armorClassBaseCandidatesForClassFeatureMechanics(
    unit.id,
    unit.mechanics,
    equipment,
  );
}

function armorClassBaseCandidatesForClassFeatureMechanics(
  unitId: UnitRecord["id"],
  mechanics: CharacterSheetClassFeatureRecord["mechanics"],
  equipment: CharacterSheetArmorClassEquipmentState,
): readonly CharacterSheetArmorClassBaseCandidate[] {
  if (mechanics.family === "composite") {
    return mechanics.parts.flatMap((part) =>
      armorClassBaseCandidatesForClassFeatureComponent(unitId, part, equipment),
    );
  }
  if (mechanics.family !== "passive") return [];
  return armorClassBaseCandidatesForClassFeatureComponent(
    unitId,
    mechanics,
    equipment,
  );
}

function armorClassBaseCandidatesForClassFeatureComponent(
  unitId: UnitRecord["id"],
  mechanics: ClassFeatureComponentMechanics,
  equipment: CharacterSheetArmorClassEquipmentState,
): readonly CharacterSheetArmorClassBaseCandidate[] {
  if (mechanics.family !== "passive") return [];
  if (!equipmentPredicateMatches(mechanics.condition, equipment)) {
    return [];
  }
  return mechanics.grants.flatMap((grant) => {
    if (grant.kind !== "modify_ac_set_base") return [];
    const base = armorClassBaseSourceForFormula(unitId, grant.formula);
    return base === undefined
      ? []
      : [{ choice: { kind: "class_feature", unitId }, base }];
  });
}

function equipmentPredicateMatches(
  predicate: EquipmentPredicate | undefined,
  equipment: CharacterSheetArmorClassEquipmentState,
): boolean {
  if (predicate === undefined || predicate.kind === "always") return true;
  if (predicate.kind === "unarmored") return !equipment.wearingArmor;
  if (predicate.kind === "not_wielding_shield")
    return !equipment.wieldingShield;
  if (predicate.kind === "all_of") {
    return predicate.predicates.every((part) =>
      equipmentPredicateMatches(part, equipment),
    );
  }
  if (predicate.kind === "holding_item") return false;
  if (predicate.kind === "peering_through_item") return false;
  if (predicate.kind === "wearing_item") return false;
  if (predicate.kind === "unarmed_or_monk_weapons_only") return false;
  if (predicate.kind === "wearing_armor") return false;
  if (predicate.kind === "not_wearing_armor") return !equipment.wearingArmor;
  if (predicate.kind === "wielding_weapon") return false;
  const exhaustive: never = predicate;
  return exhaustive;
}

function armorClassBaseSourceForFormula(
  sourceUnitId: UnitRecord["id"],
  formula: ModifyAcSetBaseGrant["formula"],
): ArmorClassBaseSource | undefined {
  if (formula.kind === "base_plus_dex") {
    return {
      kind: "ability_sum",
      base: armorClass(formula.base),
      abilityModifiers: ["dex"],
      source: "spell_base_plus_ability",
      sourceUnitId,
    };
  }
  if (formula.kind === "base_plus_dex_con") {
    return {
      kind: "ability_sum",
      base: armorClass(formula.base),
      abilityModifiers: ["dex", "con"],
      source: "unarmored_defense",
      sourceUnitId,
    };
  }
  if (formula.kind === "base_plus_dex_wis") {
    return {
      kind: "ability_sum",
      base: armorClass(formula.base),
      abilityModifiers: ["dex", "wis"],
      source: "unarmored_defense",
      sourceUnitId,
    };
  }
  return undefined;
}

function armorBaseSource(
  armor: Extract<UnitRecord, { readonly kind: "armor" }>,
): ArmorClassBaseSource {
  return {
    kind: "armor",
    formula: armor.acFormula,
    category: armor.category,
  };
}

function characterSheetAbilityModifiers(
  build: Pick<CharacterBuild, "abilityScores">,
): ArmorClassState["abilityModifiers"] {
  return {
    ...zeroAbilityModifiers(),
    str: abilityModifier(abilityScoreToMod(build.abilityScores.str)),
    dex: abilityModifier(abilityScoreToMod(build.abilityScores.dex)),
    con: abilityModifier(abilityScoreToMod(build.abilityScores.con)),
    int: abilityModifier(abilityScoreToMod(build.abilityScores.int)),
    wis: abilityModifier(abilityScoreToMod(build.abilityScores.wis)),
    cha: abilityModifier(abilityScoreToMod(build.abilityScores.cha)),
  };
}

function armorClassChoiceEquals(
  left: CharacterSheetArmorClassBaseChoice,
  right: CharacterSheetArmorClassBaseChoice,
): boolean {
  return left.kind === "default_unarmored"
    ? right.kind === "default_unarmored"
    : right.kind === "class_feature" && left.unitId === right.unitId;
}

function getRequiredUnit(
  unitLibrary: UnitCatalog,
  unitId: UnitRecord["id"],
): Either.Either<UnitRecord, CharacterSheetIssue> {
  const unit = unitLibrary.getUnit(unitId);
  return Option.isSome(unit)
    ? Either.right(unit.value)
    : characterSheetIssue(`Unknown Unit id: ${unitId}`);
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
  input: Pick<CharacterSheetInput, "spellSlots"> & {
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

function pactSlotExpenditureFromInput(
  input: Pick<CharacterSheetInput, "pactSlots"> & {
    readonly build: SpellcastingCharacterBuild;
  },
): Either.Either<
  CharacterPactSlotExpenditure | undefined,
  CharacterSheetIssue
> {
  const pactMagic = characterBuildPactSlotCapacity(input.build);
  if (pactMagic === undefined) {
    return input.pactSlots === undefined
      ? Either.right(undefined)
      : characterSheetIssue(
          "Pact Slot state must match Pact Magic build capacity.",
        );
  }
  const pactSlots =
    input.pactSlots ??
    ({
      slotLevel: spellSlotLevel(pactMagic.slotLevel),
      count: resourceCount(pactMagic.count),
      expended: resourceCount(0),
    } satisfies CharacterSheetPactSlotState);
  if (
    pactSlots.slotLevel !== spellSlotLevel(pactMagic.slotLevel) ||
    pactSlots.count !== resourceCount(pactMagic.count) ||
    !Number.isInteger(pactSlots.expended) ||
    pactSlots.expended < 0 ||
    pactSlots.expended > pactMagic.count
  ) {
    return characterSheetIssue(
      "Pact Slot state must match Pact Magic build capacity.",
    );
  }
  return Either.right({
    slotLevel: spellSlotLevel(pactMagic.slotLevel),
    count: resourceCount(pactMagic.count),
    expended: resourceCount(pactSlots.expended),
  });
}

function spentHitDiceFromInput(
  input: Pick<
    CharacterSheetInput,
    "build" | "spentHitDice" | "unitLibrary"
  >,
): Either.Either<readonly CharacterSheetSpentHitDiePool[], CharacterSheetIssue> {
  const capacity = characterBuildHitDice(input.build, input.unitLibrary);
  if (Either.isLeft(capacity)) return Either.left(capacity.left);
  const spentHitDice = input.spentHitDice ?? [];
  const spentByClass = new Map<UnitRecord["id"], ResourceCount>();
  for (const spent of spentHitDice) {
    if (spentByClass.has(spent.classUnitId)) {
      return characterSheetIssue("Spent Hit Dice state must not duplicate.");
    }
    spentByClass.set(spent.classUnitId, spent.spent);
  }
  const capacityByClass = new Map(
    capacity.right.map((pool) => [pool.classUnitId, pool]),
  );
  const result = [];
  for (const spent of spentHitDice) {
    const pool = capacityByClass.get(spent.classUnitId);
    if (pool === undefined) {
      return characterSheetIssue(
        "Spent Hit Dice state must match build Hit Dice exactly.",
      );
    }
    if (
      !Number.isInteger(spent.spent) ||
      spent.spent < 0 ||
      spent.spent > pool.total
    ) {
      return characterSheetIssue(
        "Spent Hit Dice state cannot exceed build Hit Dice.",
      );
    }
    if (spent.spent > 0) {
      result.push({
        classUnitId: spent.classUnitId,
        spent: resourceCount(spent.spent),
      });
    }
  }
  return Either.right(result);
}

function restFeatureUsesFromInput(
  input: Pick<CharacterSheetInput, "build" | "restFeatureUses" | "unitLibrary">,
): Either.Either<readonly CharacterSheetRestFeatureUse[], CharacterSheetIssue> {
  const uses = input.restFeatureUses ?? [];
  const usedFeatureTags = new Set<string>();
  for (const use of uses) {
    if (use.tag !== "arcaneRecovery" || use.usedSinceLongRest !== true) {
      return characterSheetIssue("Expected supported rest feature use state.");
    }
    if (usedFeatureTags.has(use.tag)) {
      return characterSheetIssue("Rest feature use state must not duplicate.");
    }
    if (
      Either.isLeft(
        restSpellSlotRecoveryProfileForBuild(input.build, input.unitLibrary),
      )
    ) {
      return characterSheetIssue(
        "Arcane Recovery rest feature use requires the Wizard Arcane Recovery feature.",
      );
    }
    usedFeatureTags.add(use.tag);
  }
  return Either.right([...uses]);
}

function characterBuildHitDice(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<readonly CharacterBuildHitDiePool[], CharacterSheetIssue> {
  const hitPoints = characterBuildHitPoints(build, unitLibrary);
  return Either.isLeft(hitPoints)
    ? characterSheetIssue(
        hitPoints.left.map((issue) => issue.message).join("; "),
      )
    : Either.right(hitPoints.right.hitDice);
}

function characterBuildPactSlotCapacity(
  build: Pick<CharacterBuild, "spellcasting">,
): CharacterBuildPactMagicSlotPool | undefined {
  return build.spellcasting?.slotPools.pactMagic;
}

function recoverPactSlots(sheet: CharacterSheet): CharacterSheet {
  if (
    !("pactSlotExpenditure" in sheet) ||
    sheet.pactSlotExpenditure === undefined
  ) {
    return sheet;
  }
  return {
    ...sheet,
    pactSlotExpenditure: {
      ...sheet.pactSlotExpenditure,
      expended: resourceCount(0),
    },
  };
}

function spendHitDice(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly spendHitDice: readonly CharacterSheetHitDieSpend[] | undefined;
}): Either.Either<CharacterSheet, CharacterSheetIssue> {
  if (input.spendHitDice === undefined) return Either.right(input.sheet);
  if (input.spendHitDice.length === 0) {
    return characterSheetIssue("Short Rest Hit Dice spending cannot be empty.");
  }
  const hitDice = characterSheetHitDice(input.sheet, input.unitLibrary);
  if (Either.isLeft(hitDice)) return Either.left(hitDice.left);
  const hitDiceByClass = new Map(
    hitDice.right.map((pool) => [pool.classUnitId, pool]),
  );
  const spentThisRest = new Map<UnitRecord["id"], ResourceCount>();
  let healingTotal = 0;
  const constitutionModifier = abilityScoreToMod(
    input.sheet.build.abilityScores.con,
  );
  for (const spend of input.spendHitDice) {
    const pool = hitDiceByClass.get(spend.classUnitId);
    if (pool === undefined) {
      return characterSheetIssue(
        "Short Rest Hit Dice spend must match build Hit Dice.",
      );
    }
    if (
      !Number.isInteger(Number(spend.roll)) ||
      spend.roll < 1 ||
      spend.roll > pool.dieSize
    ) {
      return characterSheetIssue(
        `Short Rest Hit Die roll must be within d${pool.dieSize}.`,
      );
    }
    healingTotal += Math.max(1, spend.roll + constitutionModifier);
    spentThisRest.set(
      spend.classUnitId,
      resourceCount((spentThisRest.get(spend.classUnitId) ?? 0) + 1),
    );
  }
  const nextSpentHitDice = input.sheet.spentHitDice.map((spent) => ({
    ...spent,
  }));
  for (const [classUnitId, spentCount] of spentThisRest.entries()) {
    const pool = hitDiceByClass.get(classUnitId);
    if (pool === undefined || pool.spent + spentCount > pool.total) {
      return characterSheetIssue(
        "Short Rest cannot spend more Hit Dice than remain.",
      );
    }
    const existingIndex = nextSpentHitDice.findIndex(
      (spent) => spent.classUnitId === classUnitId,
    );
    if (existingIndex === -1) {
      nextSpentHitDice.push({ classUnitId, spent: spentCount });
    } else {
      nextSpentHitDice[existingIndex] = {
        classUnitId,
        spent: resourceCount(nextSpentHitDice[existingIndex].spent + spentCount),
      };
    }
  }
  const currentHp = characterSheetCurrentHp(input.sheet);
  const healedHp = Hp(
    Math.min(input.sheet.maximumHp, currentHp + healingTotal),
  );
  const hitPoints = characterSheetHitPoints({
    currentHp: healedHp,
    tempHp: characterSheetTempHp(input.sheet),
  });
  if (Either.isLeft(hitPoints)) return Either.left(hitPoints.left);
  return Either.right({
    ...input.sheet,
    hitPoints: hitPoints.right,
    spentHitDice: nextSpentHitDice,
  });
}

function applyArcaneRecovery(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly refundSpellSlots: readonly CharacterSheetArcaneRecoverySlotRefund[];
}): Either.Either<CharacterSheet, CharacterSheetIssue> {
  if (!isCharacterSheetWithSpellSlots(input.sheet)) {
    return characterSheetIssue(
      "Arcane Recovery requires ordinary Spell Slot state.",
    );
  }
  const profile = restSpellSlotRecoveryProfileForBuild(
    input.sheet.build,
    input.unitLibrary,
  );
  if (Either.isLeft(profile)) return Either.left(profile.left);
  if (input.sheet.restFeatureUses.some((use) => use.tag === "arcaneRecovery")) {
    return characterSheetIssue(
      "Arcane Recovery cannot be used again until a Long Rest.",
    );
  }
  const sheet = input.sheet;
  const refund = arcaneRecoverySpellSlotRefund({
    sheet,
    profile: profile.right,
    refundSpellSlots: input.refundSpellSlots,
  });
  if (Either.isLeft(refund)) return Either.left(refund.left);
  return Either.right({
    ...sheet,
    spellSlotExpenditures: refund.right,
    restFeatureUses: [
      ...sheet.restFeatureUses,
      {
        tag: "arcaneRecovery",
        usedSinceLongRest: true,
      },
    ],
  });
}

function arcaneRecoverySpellSlotRefund(input: {
  readonly sheet: CharacterSheetWithSpellSlots;
  readonly profile: CharacterSheetRestSpellSlotRecoveryProfile;
  readonly refundSpellSlots: readonly CharacterSheetArcaneRecoverySlotRefund[];
}): Either.Either<
  readonly CharacterSpellSlotExpenditure[],
  CharacterSheetIssue
> {
  if (input.refundSpellSlots.length === 0) {
    return characterSheetIssue("Arcane Recovery must recover expended slots.");
  }
  const classLevel = classLevelForUnit(
    input.sheet.build.progression,
    input.profile.classUnitId,
  );
  const maximumCombinedSlotLevels = Math.ceil(classLevel / 2);
  const maximumSlotLevelExclusive =
    input.profile.feature.mechanics.recoveredSlotLevelCap
      .maximumSlotLevelExclusive;
  let combinedSlotLevels = 0;
  const refundByLevel = new Map<SpellSlotLevel, ResourceCount>();
  for (const refund of input.refundSpellSlots) {
    if (refund.spellLevel >= spellSlotLevel(maximumSlotLevelExclusive)) {
      return characterSheetIssue(
        "Arcane Recovery cannot recover level 6 or higher Spell Slots.",
      );
    }
    if (!Number.isInteger(refund.count) || refund.count < 1) {
      return characterSheetIssue(
        "Arcane Recovery refund counts must be positive.",
      );
    }
    combinedSlotLevels += refund.spellLevel * refund.count;
    refundByLevel.set(
      refund.spellLevel,
      resourceCount((refundByLevel.get(refund.spellLevel) ?? 0) + refund.count),
    );
  }
  if (combinedSlotLevels > maximumCombinedSlotLevels) {
    return characterSheetIssue(
      "Arcane Recovery refund exceeds half Wizard level rounded up.",
    );
  }
  const updated = input.sheet.spellSlotExpenditures.map((expenditure) => {
    const refundCount = refundByLevel.get(expenditure.spellLevel) ?? 0;
    return {
      ...expenditure,
      expended: resourceCount(expenditure.expended - refundCount),
    };
  });
  const knownLevels = new Set(
    input.sheet.spellSlotExpenditures.map((slot) => slot.spellLevel),
  );
  for (const [spellLevel, refundCount] of refundByLevel.entries()) {
    if (!knownLevels.has(spellLevel)) {
      return characterSheetIssue(
        "Arcane Recovery refund must match existing Spell Slot levels.",
      );
    }
    const original = input.sheet.spellSlotExpenditures.find(
      (slot) => slot.spellLevel === spellLevel,
    );
    if (original === undefined || refundCount > original.expended) {
      return characterSheetIssue(
        "Arcane Recovery cannot refund more Spell Slots than are expended.",
      );
    }
  }
  return Either.right(updated);
}

function restSpellSlotRecoveryProfileForBuild(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<
  CharacterSheetRestSpellSlotRecoveryProfile,
  CharacterSheetIssue
> {
  const features: CharacterSheetRestSpellSlotRecoveryFeature[] = [];
  for (const unitId of characterBuildFeatureUnitIds(build, unitLibrary)) {
    const unit = getRequiredUnit(unitLibrary, unitId);
    if (Either.isLeft(unit)) return Either.left(unit.left);
    if (!isRestSpellSlotRecoveryFeature(unit.right)) {
      continue;
    }
    features.push(unit.right);
  }
  if (features.length === 0) {
    return characterSheetIssue(
      "Arcane Recovery requires a Short Rest Spell Slot recovery feature.",
    );
  }
  if (features.length > 1) {
    return characterSheetIssue(
      "Character Sheet supports only one Short Rest Spell Slot recovery feature.",
    );
  }
  const feature = features[0];
  if (feature === undefined) {
    return characterSheetIssue(
      "Arcane Recovery requires a Short Rest Spell Slot recovery feature.",
    );
  }
  return restSpellSlotRecoveryProfileForFeature({
    build,
    unitLibrary,
    feature,
  });
}

function restSpellSlotRecoveryProfileForFeature(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly feature: CharacterSheetRestSpellSlotRecoveryFeature;
}): Either.Either<
  CharacterSheetRestSpellSlotRecoveryProfile,
  CharacterSheetIssue
> {
  for (const progressionClassUnitId of progressionClassUnitIds(
    input.build.progression,
  )) {
    const unit = getRequiredUnit(input.unitLibrary, progressionClassUnitId);
    if (Either.isLeft(unit)) return Either.left(unit.left);
    if (
      unit.right.kind === "class" &&
      unit.right.className === input.feature.className
    ) {
      return Either.right({
        feature: input.feature,
        classUnitId: progressionClassUnitId,
      });
    }
  }
  return characterSheetIssue(
    "Short Rest Spell Slot recovery feature must belong to a class in the build progression.",
  );
}

function isCharacterSheetWithSpellSlots(
  sheet: CharacterSheet,
): sheet is CharacterSheetWithSpellSlots {
  return "spellSlotExpenditures" in sheet;
}

function isRestSpellSlotRecoveryFeature(
  unit: UnitRecord,
): unit is CharacterSheetRestSpellSlotRecoveryFeature {
  return (
    unit.kind === "class_feature" &&
    unit.mechanics.family === "rest_spell_slot_recovery" &&
    unit.mechanics.recoveryTrigger === "short_rest" &&
    unit.mechanics.resetCadence.kind === "long_rest" &&
    unit.mechanics.recoveredSlotLevelCap.kind === "half_class_level_rounded_up"
  );
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

function parseStoredPactSlots(
  build: CharacterBuild,
  value: Readonly<Record<string, unknown>>,
): Either.Either<CharacterSheetPactSlotState | undefined, CharacterSheetIssue> {
  const pactMagic = characterBuildPactSlotCapacity(build);
  if (pactMagic === undefined) {
    return value.pactSlotExpenditure === undefined
      ? Either.right(undefined)
      : characterSheetIssue(
          "Character Sheet without Pact Magic cannot carry Pact Slot state.",
        );
  }
  if (!isRecord(value.pactSlotExpenditure)) {
    return characterSheetIssue(
      "Pact Magic Character Sheet requires Pact Slot state.",
    );
  }
  const slotLevel = parseSpellSlotLevel(value.pactSlotExpenditure.slotLevel);
  const count = parseResourceCount(value.pactSlotExpenditure.count);
  const expended = parseResourceCount(value.pactSlotExpenditure.expended);
  if (Either.isLeft(slotLevel)) return Either.left(slotLevel.left);
  if (Either.isLeft(count)) return Either.left(count.left);
  if (Either.isLeft(expended)) return Either.left(expended.left);
  if (
    slotLevel.right !== spellSlotLevel(pactMagic.slotLevel) ||
    count.right !== resourceCount(pactMagic.count)
  ) {
    return characterSheetIssue(
      "Pact Slot state must match Pact Magic build capacity.",
    );
  }
  return Either.right({
    slotLevel: slotLevel.right,
    count: count.right,
    expended: expended.right,
  });
}

function parseStoredSpentHitDice(
  value: unknown,
): Either.Either<readonly CharacterSheetSpentHitDiePool[], CharacterSheetIssue> {
  if (!Array.isArray(value)) {
    return characterSheetIssue("Character Sheet requires spent Hit Dice state.");
  }
  const spentHitDice = [];
  for (const spent of value) {
    if (!isRecord(spent) || typeof spent.classUnitId !== "string") {
      return characterSheetIssue("Expected spent Hit Dice state.");
    }
    const spentCount = parseResourceCount(spent.spent);
    if (Either.isLeft(spentCount)) return Either.left(spentCount.left);
    spentHitDice.push({
      classUnitId: spent.classUnitId,
      spent: spentCount.right,
    });
  }
  return Either.right(spentHitDice);
}

function parseStoredRestFeatureUses(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
  value: unknown,
): Either.Either<readonly CharacterSheetRestFeatureUse[], CharacterSheetIssue> {
  if (value === undefined) return Either.right([]);
  if (!Array.isArray(value)) {
    return characterSheetIssue("Expected Character Sheet rest feature uses.");
  }
  const uses: CharacterSheetRestFeatureUse[] = [];
  for (const use of value) {
    if (!isRecord(use)) {
      return characterSheetIssue("Expected Character Sheet rest feature use.");
    }
    if (use.tag !== "arcaneRecovery" || use.usedSinceLongRest !== true) {
      return characterSheetIssue("Expected supported rest feature use state.");
    }
    uses.push({
      tag: "arcaneRecovery",
      usedSinceLongRest: true,
    });
  }
  return restFeatureUsesFromInput({ build, unitLibrary, restFeatureUses: uses });
}

function passStableRecoveryTime(input: {
  readonly sheet: CharacterSheet;
  readonly ticks: ElapsedTimeTicks;
  readonly fills: readonly FilledHoleValue[];
}): CharacterSheetElapsedTimeResult {
  if (input.sheet.hitPoints.tag !== "zero") {
    return {
      tag: "resolved",
      sheet: input.sheet,
      elapsedTicks: input.ticks,
    };
  }
  const lifecycle = input.sheet.hitPoints.lifecycle;
  if (lifecycle.tag !== "stable") {
    return {
      tag: "resolved",
      sheet: input.sheet,
      elapsedTicks: input.ticks,
    };
  }
  if (lifecycle.recovery.kind === "regains1HpAfter") {
    if (input.fills.length !== 0) {
      return invalidElapsedTimeResult(
        input.sheet,
        "Elapsed-time recovery received fills when no roll is pending.",
      );
    }
    return passStableRecoveryRule({
      sheet: input.sheet,
      ticks: input.ticks,
    });
  }
  const hole = stableRecoveryRollHole(input.sheet.characterId);
  const fill = stableRecoveryFillFor(input.fills, hole);
  if (fill === undefined && input.fills.length !== 0) {
    return invalidElapsedTimeResult(
      input.sheet,
      "Elapsed-time recovery received a fill for a different hole.",
    );
  }
  if (fill !== undefined && input.fills.length !== 1) {
    return invalidElapsedTimeResult(
      input.sheet,
      "Elapsed-time recovery accepts exactly one matching fill.",
    );
  }
  if (fill === undefined) {
    return passStableRecoveryRule({
      sheet: input.sheet,
      ticks: input.ticks,
      hole,
    });
  }
  const roll = stableRecoveryRollFromFill(fill);
  return Either.isLeft(roll)
    ? invalidElapsedTimeResult(input.sheet, roll.left.message)
    : passStableRecoveryRuleWithRoll({
        sheet: input.sheet,
        ticks: input.ticks,
        roll: roll.right,
        hole,
      });
}

function passStableRecoveryRule(input: {
  readonly sheet: CharacterSheet;
  readonly ticks: ElapsedTimeTicks;
  readonly hole?: RuntimeHole;
}): CharacterSheetElapsedTimeResult {
  const sheet = input.sheet;
  if (
    sheet.hitPoints.tag !== "zero" ||
    sheet.hitPoints.lifecycle.tag !== "stable"
  ) {
    return { tag: "resolved", sheet, elapsedTicks: input.ticks };
  }
  const recovery = sheet.hitPoints.lifecycle.recovery;
  const advanced =
    recovery.kind === "regains1HpAfter"
      ? advanceStableRecovery({ recovery, ticks: input.ticks })
      : advanceStableRecovery({ recovery, ticks: input.ticks });
  if (Either.isLeft(advanced)) {
    return invalidElapsedTimeResult(sheet, advanced.left.message);
  }
  if (advanced.right.tag === "needsStableRecoveryRoll") {
    return {
      tag: "needsHoles",
      sheet,
      holes: [input.hole ?? stableRecoveryRollHole(sheet.characterId)],
      elapsedTicks: advanced.right.elapsedTicks,
      remainingTicks: advanced.right.remainingTicks,
    };
  }
  if (advanced.right.tag === "recovered") {
    return {
      tag: "resolved",
      sheet: replaceCharacterSheetHitPoints(sheet, {
        tag: "positive",
        currentHp: Hp(1),
        tempHp: sheet.hitPoints.tempHp,
      }),
      elapsedTicks: advanced.right.elapsedTicks,
    };
  }
  return {
    tag: "resolved",
    sheet: replaceCharacterSheetHitPoints(sheet, {
      ...sheet.hitPoints,
      lifecycle: {
        tag: "stable",
        recovery: advanced.right.recovery,
      },
    }),
    elapsedTicks: advanced.right.elapsedTicks,
  };
}

function passStableRecoveryRuleWithRoll(input: {
  readonly sheet: CharacterSheet;
  readonly ticks: ElapsedTimeTicks;
  readonly roll: DieRollResult;
  readonly hole: RuntimeHole;
}): CharacterSheetElapsedTimeResult {
  const sheet = input.sheet;
  if (
    sheet.hitPoints.tag !== "zero" ||
    sheet.hitPoints.lifecycle.tag !== "stable" ||
    sheet.hitPoints.lifecycle.recovery.kind !== "regains1HpAfter1d4Hours"
  ) {
    return invalidElapsedTimeResult(
      sheet,
      "Elapsed-time recovery received a roll when no roll is pending.",
    );
  }
  const advanced = advanceStableRecoveryWithRoll({
    recovery: sheet.hitPoints.lifecycle.recovery,
    ticks: input.ticks,
    roll: input.roll,
  });
  if (Either.isLeft(advanced)) {
    return invalidElapsedTimeResult(sheet, advanced.left.message);
  }
  if (advanced.right.tag === "needsStableRecoveryRoll") {
    return {
      tag: "needsHoles",
      sheet,
      holes: [input.hole],
      elapsedTicks: advanced.right.elapsedTicks,
      remainingTicks: advanced.right.remainingTicks,
    };
  }
  if (advanced.right.tag === "recovered") {
    return {
      tag: "resolved",
      sheet: replaceCharacterSheetHitPoints(sheet, {
        tag: "positive",
        currentHp: Hp(1),
        tempHp: sheet.hitPoints.tempHp,
      }),
      elapsedTicks: advanced.right.elapsedTicks,
    };
  }
  return {
    tag: "resolved",
    sheet: replaceCharacterSheetHitPoints(sheet, {
      ...sheet.hitPoints,
      lifecycle: {
        tag: "stable",
        recovery: advanced.right.recovery,
      },
    }),
    elapsedTicks: advanced.right.elapsedTicks,
  };
}

function stableRecoveryRollHole(characterId: CharacterSheetId): RuntimeHole {
  return {
    kind: "rolledDice",
    holeId: holeId(`character-sheet:${characterId}:stable-recovery-roll`),
    holeInstanceKey: holeInstanceKey(
      `character-sheet:${characterId}:stable-recovery-roll`,
    ),
    label: "Stable recovery 1d4 hours",
  };
}

function stableRecoveryFillFor(
  fills: readonly FilledHoleValue[],
  hole: RuntimeHole,
): Extract<FilledHoleValue, { readonly kind: "rolledDice" }> | undefined {
  return fills.find(
    (
      candidate,
    ): candidate is Extract<FilledHoleValue, { readonly kind: "rolledDice" }> =>
      candidate.kind === "rolledDice" && candidate.holeId === hole.holeId,
  );
}

function stableRecoveryRollFromFill(
  fill: Extract<FilledHoleValue, { readonly kind: "rolledDice" }>,
): Either.Either<DieRollResult, CharacterSheetIssue> {
  const validation = validateRolledDiceForDiceExpr(fill.value, {
    dice: STABLE_RECOVERY_ROLL_DICE_EXPR.dice,
    dieSize: STABLE_RECOVERY_ROLL_DICE_EXPR.dieSize,
  });
  if (validation !== null) {
    return characterSheetIssue(validation.reason);
  }
  const group = fill.value[0];
  const roll = group?.results[0];
  return roll === undefined
    ? characterSheetIssue("Stable recovery requires one d4 roll.")
    : Either.right(roll);
}

function invalidElapsedTimeResult(
  sheet: CharacterSheet,
  message: string,
): CharacterSheetElapsedTimeResult {
  return {
    tag: "invalid",
    sheet,
    reason: "invalidFill",
    message,
  };
}

function replaceCharacterSheetHitPoints(
  sheet: CharacterSheet,
  hitPoints: CharacterSheetHitPoints,
): CharacterSheet {
  return isCharacterSheetWithSpellSlots(sheet)
    ? {
        ...sheet,
        hitPoints,
        spellSlotExpenditures: sheet.spellSlotExpenditures,
      }
    : { ...sheet, hitPoints };
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
