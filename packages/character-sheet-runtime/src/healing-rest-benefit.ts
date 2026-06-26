// KERNEL-COVERAGE: runtime-owner SHEET.SPELL_REST_BENEFIT.APPLICATION
// KERNEL-COVERAGE: runtime-owner SHEET.HP_REST_HIT_DICE.TRANSITIONS
// KERNEL-COVERAGE: runtime-owner SHEET.SPELL_SLOTS_PACT_SLOTS.TRANSITIONS
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.healing-resource-action
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.short-rest-spell-slot-recovery
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.spell-rest-benefit-application
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.sorcerous-restoration-sorcery-point-recovery
import {
  characterBuildFeatureUnitIds,
  characterBuildHitPoints,
  classLevelForUnit,
  progressionClassUnitIds,
  type CharacterBuild,
  type CharacterBuildHitDiePool,
  type UnitCatalog,
} from "@dnd/character-creation-runtime";
import { abilityScoreToMod } from "@dnd/shared-algebras/ability-score-algebra";
import {
  Hp,
  resourceCount,
  spellSlotLevel,
  type DieRollResult,
  type Hp as HpType,
  type ResourceCount,
  type SpellSlotLevel,
} from "@dnd/shared/types";
import {
  topLevelSpellCastingTime,
  type SpellRecord,
  type UnitRecord,
} from "@dnd/surface/surface/types";
import { Either, Option } from "effect";

import {
  characterSheetCurrentHp,
  recoverCharacterSheetHitPoints,
} from "./hit-points.ts";
import {
  characterSheetResources,
  recoverSorceryPointsWithSorcerousRestoration,
  recoverShortRestUseCountResources,
} from "./resources.ts";
import {
  isCharacterSheetWithSpellSlots,
  ordinarySpellSlotStates,
  replaceOrdinarySpellSlotExpenditure,
} from "./spell-slots.ts";
import {
  ARCANE_RECOVERY_REST_FEATURE_TAG,
  LAY_ON_HANDS_POISONED_REMOVAL_COST,
  SPELL_RECIPIENT_REST_LOCKOUT_TAG,
  characterSheetIssue,
  getRequiredUnit,
  type CharacterSheet,
  type CharacterSheetId,
  type CharacterSheetArcaneRecoverySlotRefund,
  type CharacterSheetCreatedSpellSlotState,
  type CharacterSheetFontOfMagicSpellSlotSource,
  type CharacterSheetHitDieSpend,
  type CharacterSheetHitDieState,
  type CharacterSheetIssue,
  type CharacterSheetLayOnHandsInput,
  type CharacterSheetLayOnHandsResult,
  type CharacterSheetShortRestBenefitHpGate,
  type CharacterSheetSpellRestBenefitInput,
  type CharacterSheetSpellRestBenefitRecipient,
  type CharacterSheetSpellRestBenefitResult,
  type CharacterSheetSpellSlotSourceState,
  type CharacterSheetSpellSlotState,
  type CharacterSheetWithSpellSlots,
  type CharacterSpellSlotExpenditure,
} from "./sheet-types.ts";

export type CharacterSheetSpellRestBenefitProfile = {
  readonly spellId: UnitRecord["id"];
  readonly baseSpellLevel: SpellSlotLevel;
  readonly maxRecipients: number;
  readonly healingBaseDice: number;
  readonly healingDieSize: number;
  readonly healingDicePerSlotAboveBase: number;
};

type CharacterSheetSpellRestBenefitHealingEffect = {
  readonly kind: "heal_hp";
  readonly target: "target_creature";
  readonly amount: {
    readonly kind: "linear_per_level";
    readonly axis: "slot";
    readonly base: {
      readonly dice: number;
      readonly dieSize: number;
      readonly flat?: number;
    };
    readonly perLevel: {
      readonly dice?: number;
      readonly dieSize?: number;
      readonly flat?: number;
    };
    readonly startingAtLevel: number;
  };
};

type CharacterSheetSpellRestBenefitEffects = {
  readonly healing: CharacterSheetSpellRestBenefitHealingEffect;
};

export function applyLayOnHands(
  input: CharacterSheetLayOnHandsInput,
): Either.Either<CharacterSheetLayOnHandsResult, CharacterSheetIssue> {
  const spend = layOnHandsSpend(input);
  if (Either.isLeft(spend)) return Either.left(spend.left);

  const sourceAfterSpend = spendCharacterSheetResource({
    sheet: input.source,
    unitLibrary: input.unitLibrary,
    amount: spend.right,
  });
  if (Either.isLeft(sourceAfterSpend))
    return Either.left(sourceAfterSpend.left);

  const sourceIsTarget = input.source.characterId === input.target.characterId;
  const targetBase = sourceIsTarget ? sourceAfterSpend.right : input.target;
  const targetAfterHealing = applyLayOnHandsTargetEffects({
    sheet: targetBase,
    unitLibrary: input.unitLibrary,
    restoreHp: input.restoreHp,
    removePoisoned: input.removePoisoned,
  });
  if (Either.isLeft(targetAfterHealing)) {
    return Either.left(targetAfterHealing.left);
  }

  return Either.right(
    sourceIsTarget
      ? {
          source: targetAfterHealing.right,
          target: targetAfterHealing.right,
        }
      : {
          source: sourceAfterSpend.right,
          target: targetAfterHealing.right,
        },
  );
}

export function applyCharacterSheetSpellRestBenefit(
  input: CharacterSheetSpellRestBenefitInput,
): Either.Either<CharacterSheetSpellRestBenefitResult, CharacterSheetIssue> {
  const profile = characterSheetSpellRestBenefitProfile({
    spellId: input.spellId,
    unitLibrary: input.unitLibrary,
  });
  if (Either.isLeft(profile)) return Either.left(profile.left);
  if (input.castLevel < profile.right.baseSpellLevel) {
    return characterSheetIssue(
      "Spell rest benefit application requires a Spell Slot at or above the spell's base level.",
    );
  }
  const recipientIssue = spellRestBenefitRecipientIssue(input, profile.right);
  if (recipientIssue !== null) return characterSheetIssue(recipientIssue);
  const caster = spendCharacterSheetSpellSlot({
    sheet: input.caster,
    spellLevel: input.castLevel,
    spellSlotSource: input.spellSlotSource,
  });
  if (Either.isLeft(caster)) return Either.left(caster.left);

  let casterSheet = caster.right;
  const recipients: CharacterSheet[] = [];
  for (const recipient of input.recipients) {
    const affected = applySpellRestBenefitToRecipient({
      profile: profile.right,
      recipient:
        recipient.sheet.characterId === casterSheet.characterId
          ? { ...recipient, sheet: casterSheet }
          : recipient,
      unitLibrary: input.unitLibrary,
      castLevel: input.castLevel,
    });
    if (Either.isLeft(affected)) return Either.left(affected.left);
    if (affected.right.characterId === casterSheet.characterId) {
      casterSheet = affected.right;
    }
    recipients.push(affected.right);
  }
  return Either.right({ caster: casterSheet, recipients });
}

export function characterSheetSpellRestBenefitProfile(input: {
  readonly spellId: UnitRecord["id"];
  readonly unitLibrary: UnitCatalog;
}): Either.Either<CharacterSheetSpellRestBenefitProfile, CharacterSheetIssue> {
  const unit = input.unitLibrary.getUnit(input.spellId);
  if (Option.isNone(unit) || unit.value.kind !== "spell") {
    return characterSheetIssue(
      "Spell rest benefit application requires an installed Spell Definition.",
    );
  }
  const mechanics = unit.value.mechanics;
  if (mechanics.family !== "activation" || mechanics.level < 1) {
    return characterSheetIssue(
      "Spell rest benefit application requires a leveled activation Spell Definition.",
    );
  }
  if (!isSpellRestBenefitCastingShell(mechanics)) {
    return characterSheetIssue(
      "Spell rest benefit application requires a 10-minute non-ritual spell with 30-foot point range and instantaneous duration.",
    );
  }
  const phase = mechanics.phases.length === 1 ? mechanics.phases[0] : undefined;
  if (phase === undefined || phase.kind !== "direct") {
    return characterSheetIssue(
      "Spell rest benefit application requires one direct spell phase.",
    );
  }
  const selection =
    phase.attachment.kind === "hole" && phase.attachment.value.kind === "target"
      ? phase.attachment.value.selection
      : undefined;
  if (
    selection === undefined ||
    selection.mode !== "choose_up_to" ||
    selection.count !== 5 ||
    !isExactCreatureTargetKindList(selection.targetKinds) ||
    !hasRemainWithinSpellRangeForEntireCastingRequirement(selection)
  ) {
    return characterSheetIssue(
      "Spell rest benefit application requires up-to-five creature recipients that remain within range for the entire casting.",
    );
  }
  const effects: readonly unknown[] = phase.effects ?? [];
  const restBenefitEffects = characterSheetSpellRestBenefitEffects(
    effects,
    mechanics.level,
  );
  if (Either.isLeft(restBenefitEffects)) {
    return Either.left(restBenefitEffects.left);
  }
  const { healing } = restBenefitEffects.right;
  const healingDicePerSlotAboveBase = healing.amount.perLevel.dice;
  if (healingDicePerSlotAboveBase === undefined) {
    return characterSheetIssue(
      "Spell rest benefit application requires slot-scaled healing, Short Rest benefit, and Long Rest lockout facts.",
    );
  }
  return Either.right({
    spellId: unit.value.id,
    baseSpellLevel: spellSlotLevel(mechanics.level),
    maxRecipients: selection.count,
    healingBaseDice: healing.amount.base.dice,
    healingDieSize: healing.amount.base.dieSize,
    healingDicePerSlotAboveBase,
  });
}

export function spellRestBenefitRecipientIssue(
  input: CharacterSheetSpellRestBenefitInput,
  profile: CharacterSheetSpellRestBenefitProfile,
): string | null {
  if (input.recipients.length > profile.maxRecipients) {
    return "Spell rest benefit application cannot affect more recipients than the Spell Definition allows.";
  }
  const seenCharacterIds = new Set<CharacterSheetId>();
  for (const recipient of input.recipients) {
    if (recipient.eligibility.remainedWithinRangeForEntireCasting !== true) {
      return "Spell rest benefit application requires caller-supplied completed-casting recipient eligibility.";
    }
    if (seenCharacterIds.has(recipient.sheet.characterId)) {
      return "Spell rest benefit application cannot target the same Character Sheet twice.";
    }
    seenCharacterIds.add(recipient.sheet.characterId);
    if (hasSpellRecipientRestLockout(recipient.sheet, profile.spellId)) {
      return "Spell rest benefit recipient cannot be affected by this spell again until finishing a Long Rest.";
    }
  }
  return null;
}

export function spellRestBenefitHealingAmount(input: {
  readonly profile: CharacterSheetSpellRestBenefitProfile;
  readonly castLevel: SpellSlotLevel;
  readonly healingRolls: readonly DieRollResult[];
}): Either.Either<HpType, CharacterSheetIssue> {
  const dice =
    input.profile.healingBaseDice +
    (input.castLevel - input.profile.baseSpellLevel) *
      input.profile.healingDicePerSlotAboveBase;
  if (input.healingRolls.length !== dice) {
    return characterSheetIssue(
      "Spell rest benefit healing rolls must match the current cast level.",
    );
  }
  const invalidRoll = input.healingRolls.find(
    (roll) =>
      !Number.isInteger(Number(roll)) ||
      roll < 1 ||
      roll > input.profile.healingDieSize,
  );
  if (invalidRoll !== undefined) {
    return characterSheetIssue(
      `Spell rest benefit healing roll must be within d${input.profile.healingDieSize}.`,
    );
  }
  return Either.right(
    Hp(input.healingRolls.reduce((total, roll) => total + roll, 0)),
  );
}

export function completeShortRestBenefits(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly hpGate: CharacterSheetShortRestBenefitHpGate;
  readonly spendHitDice?: readonly CharacterSheetHitDieSpend[] | undefined;
  readonly arcaneRecovery?:
    | {
        readonly refundSpellSlots: readonly CharacterSheetArcaneRecoverySlotRefund[];
      }
    | undefined;
  readonly sorcerousRestoration?:
    | {
        readonly recoverSorceryPoints: ResourceCount;
      }
    | undefined;
}): Either.Either<CharacterSheet, CharacterSheetIssue> {
  if (
    input.hpGate === "requiresShortRestStartHp" &&
    characterSheetCurrentHp(input.sheet) < Hp(1)
  ) {
    return characterSheetIssue(
      "Short Rest requires the Character Sheet to have at least 1 HP.",
    );
  }
  const pactRecovered = recoverPactSlots(input.sheet);
  const useCountRecovered = recoverShortRestUseCountResources({
    sheet: pactRecovered,
    unitLibrary: input.unitLibrary,
  });
  if (Either.isLeft(useCountRecovered)) {
    return Either.left(useCountRecovered.left);
  }
  const hitDiceSpent = spendHitDice({
    sheet: useCountRecovered.right,
    unitLibrary: input.unitLibrary,
    spendHitDice: input.spendHitDice,
  });
  if (Either.isLeft(hitDiceSpent)) return Either.left(hitDiceSpent.left);
  const sorceryPointsRecovered =
    input.sorcerousRestoration === undefined
      ? Either.right(hitDiceSpent.right)
      : recoverSorceryPointsWithSorcerousRestoration({
          sheet: hitDiceSpent.right,
          unitLibrary: input.unitLibrary,
          recoverSorceryPoints: input.sorcerousRestoration.recoverSorceryPoints,
        });
  if (Either.isLeft(sorceryPointsRecovered)) {
    return Either.left(sorceryPointsRecovered.left);
  }
  if (input.arcaneRecovery === undefined)
    return Either.right(sorceryPointsRecovered.right);
  return applyArcaneRecovery({
    sheet: sorceryPointsRecovered.right,
    unitLibrary: input.unitLibrary,
    refundSpellSlots: input.arcaneRecovery.refundSpellSlots,
  });
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

export function characterBuildHitDice(
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

export function restSpellSlotRecoveryProfileForBuild(
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

type CharacterSheetClassFeatureRecord = Extract<
  UnitRecord,
  { readonly kind: "class_feature" }
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

function applySpellRestBenefitToRecipient(input: {
  readonly profile: CharacterSheetSpellRestBenefitProfile;
  readonly recipient: CharacterSheetSpellRestBenefitRecipient;
  readonly unitLibrary: UnitCatalog;
  readonly castLevel: SpellSlotLevel;
}): Either.Either<CharacterSheet, CharacterSheetIssue> {
  const shortRested = completeShortRestBenefits({
    sheet: input.recipient.sheet,
    unitLibrary: input.unitLibrary,
    hpGate: "spellGrantedRestBenefit",
    spendHitDice: input.recipient.spendHitDice,
    arcaneRecovery: input.recipient.arcaneRecovery,
    sorcerousRestoration: input.recipient.sorcerousRestoration,
  });
  if (Either.isLeft(shortRested)) return Either.left(shortRested.left);
  const healing = spellRestBenefitHealingAmount({
    profile: input.profile,
    castLevel: input.castLevel,
    healingRolls: input.recipient.healingRolls,
  });
  if (Either.isLeft(healing)) return Either.left(healing.left);
  const healed = recoverCharacterSheetHitPoints({
    sheet: shortRested.right,
    unitLibrary: input.unitLibrary,
    healing: healing.right,
    overflow: { tag: "capAtMaximum" },
    deadCharacterMessage:
      "Spell rest benefit healing cannot restore HP to a dead character.",
  });
  if (Either.isLeft(healed)) return Either.left(healed.left);
  return Either.right({
    ...healed.right,
    restFeatureUses: [
      ...healed.right.restFeatureUses,
      {
        tag: SPELL_RECIPIENT_REST_LOCKOUT_TAG,
        spellId: input.profile.spellId,
        usedSinceLongRest: true,
      },
    ],
  });
}

function spendCharacterSheetSpellSlot(input: {
  readonly sheet: CharacterSheet;
  readonly spellLevel: SpellSlotLevel;
  readonly spellSlotSource:
    | CharacterSheetFontOfMagicSpellSlotSource
    | undefined;
}): Either.Either<CharacterSheet, CharacterSheetIssue> {
  if (!isCharacterSheetWithSpellSlots(input.sheet)) {
    return characterSheetIssue(
      "Spell rest benefit application requires Spell Slot state.",
    );
  }
  const spellSlotSpend = spendCharacterSheetSpellSlotSource({
    sheet: input.sheet,
    spellLevel: input.spellLevel,
    spellSlotSource: input.spellSlotSource,
  });
  if (Either.isLeft(spellSlotSpend)) return Either.left(spellSlotSpend.left);
  return Either.right({
    ...input.sheet,
    spellSlotExpenditures: spellSlotSpend.right.ordinarySpellSlotExpenditures,
    createdSpellSlots: spellSlotSpend.right.createdSpellSlots,
  });
}

function spendCharacterSheetSpellSlotSource(input: {
  readonly sheet: CharacterSheetWithSpellSlots;
  readonly spellLevel: SpellSlotLevel;
  readonly spellSlotSource:
    | CharacterSheetFontOfMagicSpellSlotSource
    | undefined;
}): Either.Either<CharacterSheetSpellSlotSourceState, CharacterSheetIssue> {
  const ordinarySlot = ordinarySpellSlotStates(input.sheet).find(
    (slot) => slot.spellLevel === input.spellLevel,
  );
  const createdSlot = input.sheet.createdSpellSlots.find(
    (slot) => slot.spellLevel === input.spellLevel,
  );
  const ordinaryAvailable =
    ordinarySlot !== undefined && ordinarySlot.expended < ordinarySlot.count;
  const createdAvailable =
    createdSlot !== undefined && createdSlot.expended < createdSlot.count;
  const source = characterSheetSpellSlotSpendSource({
    spellSlotSource: input.spellSlotSource,
    ordinarySlot,
    ordinaryAvailable,
    createdSlot,
    createdAvailable,
  });
  if (Either.isLeft(source)) return Either.left(source.left);
  return source.right === "ordinary"
    ? Either.right({
        ordinarySpellSlotExpenditures: replaceOrdinarySpellSlotExpenditure({
          expenditures: input.sheet.spellSlotExpenditures,
          spellLevel: input.spellLevel,
          expended: resourceCount((ordinarySlot?.expended ?? 0) + 1),
        }),
        createdSpellSlots: input.sheet.createdSpellSlots,
      })
    : Either.right({
        ordinarySpellSlotExpenditures: input.sheet.spellSlotExpenditures,
        createdSpellSlots: input.sheet.createdSpellSlots.map((slot) =>
          slot.spellLevel === input.spellLevel
            ? { ...slot, expended: resourceCount(slot.expended + 1) }
            : slot,
        ),
      });
}

function characterSheetSpellSlotSpendSource(input: {
  readonly spellSlotSource:
    | CharacterSheetFontOfMagicSpellSlotSource
    | undefined;
  readonly ordinarySlot: CharacterSheetSpellSlotState | undefined;
  readonly ordinaryAvailable: boolean;
  readonly createdSlot: CharacterSheetCreatedSpellSlotState | undefined;
  readonly createdAvailable: boolean;
}): Either.Either<
  CharacterSheetFontOfMagicSpellSlotSource,
  CharacterSheetIssue
> {
  if (input.spellSlotSource === "ordinary") {
    return input.ordinaryAvailable
      ? Either.right("ordinary")
      : characterSheetIssue(
          "Spell Slot spend requires an unexpended ordinary Spell Slot.",
        );
  }
  if (input.spellSlotSource === "created") {
    return input.createdAvailable
      ? Either.right("created")
      : characterSheetIssue(
          "Spell Slot spend requires an unexpended created Spell Slot.",
        );
  }
  if (input.ordinaryAvailable && input.createdAvailable) {
    return characterSheetIssue(
      "Spell Slot spend requires a source when ordinary and created Spell Slots are both available.",
    );
  }
  if (input.ordinaryAvailable) return Either.right("ordinary");
  if (input.createdAvailable) return Either.right("created");
  if (input.ordinarySlot !== undefined && input.createdSlot === undefined) {
    return characterSheetIssue(
      "Spell Slot spend requires an unexpended ordinary Spell Slot.",
    );
  }
  if (input.createdSlot !== undefined && input.ordinarySlot === undefined) {
    return characterSheetIssue(
      "Spell Slot spend requires an unexpended created Spell Slot.",
    );
  }
  return characterSheetIssue(
    "Spell Slot spend requires an unexpended Spell Slot.",
  );
}

function recoverPactSlots(sheet: CharacterSheet): CharacterSheet {
  return isCharacterSheetWithSpellSlots(sheet)
    ? { ...sheet, pactSlotExpenditure: undefined }
    : sheet;
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
        spent: resourceCount(
          nextSpentHitDice[existingIndex].spent + spentCount,
        ),
      };
    }
  }
  const healed = recoverCharacterSheetHitPoints({
    sheet: input.sheet,
    unitLibrary: input.unitLibrary,
    healing: Hp(healingTotal),
    overflow: { tag: "capAtMaximum" },
    deadCharacterMessage:
      "Short Rest Hit Dice cannot restore HP to a dead character.",
  });
  if (Either.isLeft(healed)) return Either.left(healed.left);
  return Either.right({
    ...healed.right,
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
  if (
    input.sheet.restFeatureUses.some(
      (use) => use.tag === ARCANE_RECOVERY_REST_FEATURE_TAG,
    )
  ) {
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
        tag: ARCANE_RECOVERY_REST_FEATURE_TAG,
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

function isSpellRestBenefitCastingShell(mechanics: SpellRecord["mechanics"]) {
  const castingTime = topLevelSpellCastingTime(mechanics);
  return (
    castingTime?.kind === "minutes" &&
    castingTime.amount === 10 &&
    castingTime.ritual === false &&
    mechanics.range.kind === "point" &&
    mechanics.range.feet === 30 &&
    mechanics.duration.kind === "instantaneous"
  );
}

function isExactCreatureTargetKindList(
  value: readonly unknown[] | undefined,
): value is readonly ["creature"] {
  return Array.isArray(value) && value.length === 1 && value[0] === "creature";
}

function hasRemainWithinSpellRangeForEntireCastingRequirement(
  selection: Readonly<Record<string, unknown>>,
): boolean {
  const requirement = selection.castingRequirement;
  return (
    isRecord(requirement) &&
    requirement.kind === "remain_within_spell_range_for_entire_casting"
  );
}

function characterSheetSpellRestBenefitEffects(
  effects: readonly unknown[],
  baseSpellLevel: number,
): Either.Either<CharacterSheetSpellRestBenefitEffects, CharacterSheetIssue> {
  if (effects.length !== 3) {
    return characterSheetIssue(
      "Spell rest benefit application requires exactly healing, Short Rest benefit, and Long Rest lockout facts.",
    );
  }
  let healing: CharacterSheetSpellRestBenefitHealingEffect | undefined;
  let shortRestBenefit = false;
  let lockout = false;
  for (const effect of effects) {
    if (isSpellRestBenefitHealingEffect(effect) && healing === undefined) {
      healing = effect;
      continue;
    }
    if (isSpellRestBenefitShortRestEffect(effect) && !shortRestBenefit) {
      shortRestBenefit = true;
      continue;
    }
    if (isSpellRestBenefitLockoutEffect(effect) && !lockout) {
      lockout = true;
      continue;
    }
    return characterSheetIssue(
      "Spell rest benefit application cannot ignore unsupported spell effects.",
    );
  }
  if (
    healing === undefined ||
    !shortRestBenefit ||
    !lockout ||
    healing.amount.startingAtLevel !== baseSpellLevel ||
    healing.amount.base.flat !== undefined ||
    healing.amount.perLevel.dice === undefined ||
    healing.amount.perLevel.flat !== undefined ||
    (healing.amount.perLevel.dieSize !== undefined &&
      healing.amount.perLevel.dieSize !== healing.amount.base.dieSize)
  ) {
    return characterSheetIssue(
      "Spell rest benefit application requires slot-scaled healing, Short Rest benefit, and Long Rest lockout facts.",
    );
  }
  return Either.right({
    healing,
  });
}

function isSpellRestBenefitHealingEffect(
  effect: unknown,
): effect is CharacterSheetSpellRestBenefitHealingEffect {
  if (!isRecord(effect) || effect.kind !== "heal_hp") return false;
  if (effect.target !== "target_creature" || !isRecord(effect.amount)) {
    return false;
  }
  const amount = effect.amount;
  return (
    amount.kind === "linear_per_level" &&
    amount.axis === "slot" &&
    isRecord(amount.base) &&
    isRecord(amount.perLevel) &&
    typeof amount.base.dice === "number" &&
    typeof amount.base.dieSize === "number" &&
    (amount.base.flat === undefined || typeof amount.base.flat === "number") &&
    (amount.perLevel.dice === undefined ||
      typeof amount.perLevel.dice === "number") &&
    (amount.perLevel.dieSize === undefined ||
      typeof amount.perLevel.dieSize === "number") &&
    (amount.perLevel.flat === undefined ||
      typeof amount.perLevel.flat === "number") &&
    typeof amount.startingAtLevel === "number"
  );
}

function isSpellRestBenefitShortRestEffect(effect: unknown): boolean {
  return (
    isRecord(effect) &&
    effect.kind === "grant_rest_benefit" &&
    effect.benefit === "short_rest" &&
    effect.target === "target_creature"
  );
}

function isSpellRestBenefitLockoutEffect(effect: unknown): boolean {
  return (
    isRecord(effect) &&
    effect.kind === "spell_recipient_rest_lockout" &&
    effect.resetBy === "target_finishes_long_rest" &&
    effect.target === "target_creature"
  );
}

function hasSpellRecipientRestLockout(
  sheet: CharacterSheet,
  spellId: UnitRecord["id"],
): boolean {
  return sheet.restFeatureUses.some(
    (use) =>
      use.tag === SPELL_RECIPIENT_REST_LOCKOUT_TAG && use.spellId === spellId,
  );
}

function layOnHandsSpend(
  input: Pick<CharacterSheetLayOnHandsInput, "restoreHp" | "removePoisoned">,
): Either.Either<ResourceCount, CharacterSheetIssue> {
  if (!Number.isInteger(input.restoreHp) || input.restoreHp < 0) {
    return characterSheetIssue(
      "Lay On Hands HP restoration must be nonnegative.",
    );
  }
  const spend = resourceCount(
    input.restoreHp +
      (input.removePoisoned ? LAY_ON_HANDS_POISONED_REMOVAL_COST : 0),
  );
  return spend === 0
    ? characterSheetIssue("Lay On Hands must restore HP or remove Poisoned.")
    : Either.right(spend);
}

function spendCharacterSheetResource(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly amount: ResourceCount;
}): Either.Either<CharacterSheet, CharacterSheetIssue> {
  const resources = characterSheetResources(input.sheet, input.unitLibrary);
  if (Either.isLeft(resources)) return Either.left(resources.left);
  const resource = resources.right.find(
    (candidate) => candidate.tag === "layOnHandsHealingPool",
  );
  if (resource === undefined) {
    return characterSheetIssue(
      "Lay On Hands requires the Paladin Lay On Hands feature.",
    );
  }
  if (resource.expended + input.amount > resource.count) {
    return characterSheetIssue(
      "Lay On Hands cannot spend more healing pool than remains.",
    );
  }

  const nextExpenditures = input.sheet.resourceExpenditures.filter(
    (expenditure) => expenditure.tag !== "layOnHandsHealingPool",
  );
  nextExpenditures.push({
    tag: "layOnHandsHealingPool",
    expended: resourceCount(resource.expended + input.amount),
  });
  return Either.right({
    ...input.sheet,
    resourceExpenditures: nextExpenditures,
  });
}

function applyLayOnHandsTargetEffects(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly restoreHp: HpType;
  readonly removePoisoned: boolean;
}): Either.Either<CharacterSheet, CharacterSheetIssue> {
  if (input.removePoisoned) {
    if (!input.sheet.conditions.some((condition) => condition === "poisoned")) {
      return characterSheetIssue(
        "Lay On Hands Poisoned removal requires a Poisoned target.",
      );
    }
  }
  const conditions = input.removePoisoned
    ? input.sheet.conditions.filter((condition) => condition !== "poisoned")
    : input.sheet.conditions;

  if (input.restoreHp === 0) {
    return Either.right({ ...input.sheet, conditions });
  }
  const healed = recoverCharacterSheetHitPoints({
    sheet: input.sheet,
    unitLibrary: input.unitLibrary,
    healing: input.restoreHp,
    overflow: {
      tag: "rejectAboveMaximum",
      message:
        "Lay On Hands HP restoration cannot exceed the target's missing HP.",
    },
    deadCharacterMessage: "Lay On Hands cannot restore HP to a dead target.",
  });
  return Either.isLeft(healed)
    ? Either.left(healed.left)
    : Either.right({ ...healed.right, conditions });
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}
