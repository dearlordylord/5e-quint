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
  characterCreationIssueMessage,
  classLevelForUnit,
  progressionClassUnitIds,
  type CharacterBuild,
  type CharacterBuildHitDiePool,
  type UnitCatalog,
} from "../../character-creation-runtime/src/consumer-protocol.ts";
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
import type { UnitRecord } from "@dnd/surface/surface/types";
import { Result, Option } from "effect";

import {
  projectCharacterSheetClassFeature,
  type CharacterSheetClassFeatureFacts,
} from "./character-feature-projection.ts";
import {
  projectCharacterSheetSpellSource,
  type CharacterSheetSpellFacts,
} from "./character-spell-projection.ts";
import { characterSheetTopLevelSpellCastingTime } from "./spell-profile-shape.ts";
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
  characterSheetPactSlots,
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
  type CharacterSheetLayOnHandsRoute,
  type CharacterSheetLayOnHandsRouteResult,
  type CharacterSheetLayOnHandsResult,
  type CharacterSheetPactSlotState,
  type CharacterSheetRouteOwner,
  type CharacterSheetResourceExpenditure,
  type CharacterSheetShortRestBenefitHpGate,
  type CharacterSheetSpellRestBenefitInput,
  type CharacterSheetSpellRestBenefitRecipient,
  type CharacterSheetSpellRestBenefitResult,
  type CharacterSheetSpellSlotSourceState,
  type CharacterSheetSpellSlotState,
  type CharacterSheetWithSpellSlots,
  type CharacterSpellSlotExpenditure,
} from "./sheet-types.ts";

type CharacterSheetShortRestBenefitsInput = {
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
};

type CharacterSheetArcaneRecoveryRouteOwner = Extract<
  CharacterSheetRouteOwner,
  "featureResource" | "pactSlot" | "spellSlot"
>;

const LAY_ON_HANDS_ROUTE = [
  {
    kind: "resolveCharacterSheetSubject",
    subject: "featureResource",
    fill: "resourceSpend",
    holes: [],
    owner: "featureResource",
  },
  {
    kind: "projectCharacterSheetFacts",
    subject: "hitPoint",
    owner: "hitPoint",
  },
  {
    kind: "recordCharacterSheetFacts",
    subject: "featureResource",
    facts: ["featureResourceSpend"],
    owner: "featureResource",
  },
] as const satisfies CharacterSheetLayOnHandsRoute;

export type CharacterSheetShortRestArcaneRecoveryBenefitsResult =
  | {
      readonly tag: "accepted";
      readonly sheet: CharacterSheet;
      readonly owner: "spellSlot";
    }
  | {
      readonly tag: "rejected";
      readonly issue: CharacterSheetIssue;
      readonly owner: CharacterSheetArcaneRecoveryRouteOwner | undefined;
    };

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
): Result.Result<CharacterSheetLayOnHandsResult, CharacterSheetIssue> {
  const spend = layOnHandsSpend(input);
  /* v8 ignore next -- @preserve -- Lay On Hands spend rejection is malformed healing-pool request input. */
  if (Result.isFailure(spend)) return Result.fail(spend.failure);

  const sourceAfterSpend = spendCharacterSheetResource({
    sheet: input.source,
    unitLibrary: input.unitLibrary,
    amount: spend.success,
  });
  if (Result.isFailure(sourceAfterSpend))
    return Result.fail(sourceAfterSpend.failure);

  const sourceIsTarget = input.source.characterId === input.target.characterId;
  const targetBase = sourceIsTarget ? sourceAfterSpend.success : input.target;
  const targetAfterHealing = applyLayOnHandsTargetEffects({
    sheet: targetBase,
    unitLibrary: input.unitLibrary,
    restoreHp: input.restoreHp,
    removePoisoned: input.removePoisoned,
  });
  /* v8 ignore start -- @preserve -- Malformed Lay On Hands input: the target request failed its HP or Poisoned-state precondition. */
  if (Result.isFailure(targetAfterHealing)) {
    return Result.fail(targetAfterHealing.failure);
  }
  /* v8 ignore stop -- @preserve */

  return Result.succeed(
    sourceIsTarget
      ? {
          source: targetAfterHealing.success,
          target: targetAfterHealing.success,
        }
      : {
          source: sourceAfterSpend.success,
          target: targetAfterHealing.success,
        },
  );
}

export function applyLayOnHandsWithRoute(
  input: CharacterSheetLayOnHandsInput,
): Result.Result<CharacterSheetLayOnHandsRouteResult, CharacterSheetIssue> {
  const result = applyLayOnHands(input);
  /* v8 ignore start -- @preserve -- Malformed Lay On Hands route input returns the same typed rejection as the core application. */
  return Result.isFailure(result)
    ? Result.fail(result.failure)
    : Result.succeed({
        ...result.success,
        qRoute: layOnHandsRoute(),
      });
  /* v8 ignore stop -- @preserve */
}

function layOnHandsRoute(): CharacterSheetLayOnHandsRoute {
  return LAY_ON_HANDS_ROUTE;
}

export function applyCharacterSheetSpellRestBenefit(
  input: CharacterSheetSpellRestBenefitInput,
): Result.Result<CharacterSheetSpellRestBenefitResult, CharacterSheetIssue> {
  const profile = characterSheetSpellRestBenefitProfile({
    spellId: input.spellId,
    unitLibrary: input.unitLibrary,
  });
  /* v8 ignore next -- @preserve -- Rest-benefit profile rejection is unsupported authored spell data. */
  if (Result.isFailure(profile)) return Result.fail(profile.failure);
  /* v8 ignore start -- @preserve -- Malformed spell-rest input: the requested cast level is below the admitted spell's base level. */
  if (input.castLevel < profile.success.baseSpellLevel) {
    return characterSheetIssue(
      "Spell rest benefit application requires a Spell Slot at or above the spell's base level.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const recipientIssue = spellRestBenefitRecipientIssue(input, profile.success);
  /* v8 ignore next -- @preserve -- A non-null recipient issue is malformed spell-rest recipient input. */
  if (recipientIssue !== null) return characterSheetIssue(recipientIssue);
  const caster = spendCharacterSheetSpellSlot({
    sheet: input.caster,
    spellLevel: input.castLevel,
    spellSlotSource: input.spellSlotSource,
  });
  /* v8 ignore next -- @preserve -- Slot-spend rejection is malformed spell-rest casting input. */
  if (Result.isFailure(caster)) return Result.fail(caster.failure);

  let casterSheet = caster.success;
  const recipients: CharacterSheet[] = [];
  for (const recipient of input.recipients) {
    const affected = applySpellRestBenefitToRecipient({
      profile: profile.success,
      recipient:
        recipient.sheet.characterId === casterSheet.characterId
          ? { ...recipient, sheet: casterSheet }
          : recipient,
      unitLibrary: input.unitLibrary,
      castLevel: input.castLevel,
    });
    /* v8 ignore next -- @preserve -- Recipient application rejection is malformed per-recipient rest-benefit input. */
    if (Result.isFailure(affected)) return Result.fail(affected.failure);
    if (affected.success.characterId === casterSheet.characterId) {
      casterSheet = affected.success;
    }
    recipients.push(affected.success);
  }
  return Result.succeed({ caster: casterSheet, recipients });
}

export function characterSheetSpellRestBenefitProfile(input: {
  readonly spellId: UnitRecord["id"];
  readonly unitLibrary: UnitCatalog;
}): Result.Result<CharacterSheetSpellRestBenefitProfile, CharacterSheetIssue> {
  const unit = input.unitLibrary.getUnit(input.spellId);
  const spell = Option.isSome(unit)
    ? projectCharacterSheetSpellSource(unit.value)
    : Option.none();
  if (Option.isNone(spell)) {
    return characterSheetIssue(
      "Spell rest benefit application requires an installed Spell Definition.",
    );
  }
  const mechanics = spell.value.mechanics;
  /* v8 ignore start -- @preserve -- Unsupported authored spell shape: rest-benefit projection requires the admitted leveled casting shell, one direct recipient phase, and effect trio. */
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
  if (Result.isFailure(restBenefitEffects)) {
    return Result.fail(restBenefitEffects.failure);
  }
  const { healing } = restBenefitEffects.success;
  const healingDicePerSlotAboveBase = healing.amount.perLevel.dice;
  if (healingDicePerSlotAboveBase === undefined) {
    return characterSheetIssue(
      "Spell rest benefit application requires slot-scaled healing, Short Rest benefit, and Long Rest lockout facts.",
    );
  }
  /* v8 ignore stop -- @preserve */
  return Result.succeed({
    spellId: spell.value.unitId,
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
  /* v8 ignore start -- @preserve -- Malformed spell-rest input: recipients exceed cardinality, omit completed-casting eligibility, duplicate a sheet, or retain the Long-Rest lockout. */
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
  /* v8 ignore stop -- @preserve */
  return null;
}

export function spellRestBenefitHealingAmount(input: {
  readonly profile: CharacterSheetSpellRestBenefitProfile;
  readonly castLevel: SpellSlotLevel;
  readonly healingRolls: readonly DieRollResult[];
}): Result.Result<HpType, CharacterSheetIssue> {
  const dice =
    input.profile.healingBaseDice +
    (input.castLevel - input.profile.baseSpellLevel) *
      input.profile.healingDicePerSlotAboveBase;
  /* v8 ignore start -- @preserve -- Malformed spell-rest input: healing rolls have the wrong cardinality or contain a value outside the admitted die. */
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
  /* v8 ignore stop -- @preserve */
  return Result.succeed(
    Hp(input.healingRolls.reduce((total, roll) => total + roll, 0)),
  );
}

export function completeShortRestBenefits(
  input: CharacterSheetShortRestBenefitsInput,
): Result.Result<CharacterSheet, CharacterSheetIssue> {
  const prepared = completeShortRestBenefitsBeforeArcaneRecovery(input);
  if (Result.isFailure(prepared)) return Result.fail(prepared.failure);
  if (input.arcaneRecovery === undefined)
    return Result.succeed(prepared.success);
  const arcaneRecovery = applyArcaneRecovery({
    sheet: prepared.success,
    pactSlotsAtRestStart: characterSheetPactSlots(input.sheet),
    unitLibrary: input.unitLibrary,
    refundSpellSlots: input.arcaneRecovery.refundSpellSlots,
  });
  return arcaneRecovery.tag === "accepted"
    ? Result.succeed(arcaneRecovery.sheet)
    : Result.fail(arcaneRecovery.issue);
}

export function completeShortRestArcaneRecoveryBenefitsWithOwner(
  input: CharacterSheetShortRestBenefitsInput & {
    readonly arcaneRecovery: NonNullable<
      CharacterSheetShortRestBenefitsInput["arcaneRecovery"]
    >;
  },
): CharacterSheetShortRestArcaneRecoveryBenefitsResult {
  const prepared = completeShortRestBenefitsBeforeArcaneRecovery(input);
  /* v8 ignore start -- @preserve -- Malformed Arcane Recovery route input: an earlier Short Rest benefit failed before ownership could be assigned. */
  if (Result.isFailure(prepared)) {
    return {
      tag: "rejected",
      issue: prepared.failure,
      owner: undefined,
    };
  }
  /* v8 ignore stop -- @preserve */
  return applyArcaneRecovery({
    sheet: prepared.success,
    pactSlotsAtRestStart: characterSheetPactSlots(input.sheet),
    unitLibrary: input.unitLibrary,
    refundSpellSlots: input.arcaneRecovery.refundSpellSlots,
  });
}

function completeShortRestBenefitsBeforeArcaneRecovery(
  input: CharacterSheetShortRestBenefitsInput,
): Result.Result<CharacterSheet, CharacterSheetIssue> {
  /* v8 ignore start -- @preserve -- Malformed Short Rest input: a normal rest starts while the character has zero HP. */
  if (
    input.hpGate === "requiresShortRestStartHp" &&
    characterSheetCurrentHp(input.sheet) < Hp(1)
  ) {
    return characterSheetIssue(
      "Short Rest requires the Character Sheet to have at least 1 HP.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const pactRecovered = recoverPactSlots(input.sheet);
  const useCountRecovered = recoverShortRestUseCountResources({
    sheet: pactRecovered,
    unitLibrary: input.unitLibrary,
  });
  /* v8 ignore start -- @preserve -- Malformed sheet/catalog correlation: an admitted Short-Rest resource cannot be projected from its installed Unit. */
  if (Result.isFailure(useCountRecovered)) {
    return Result.fail(useCountRecovered.failure);
  }
  /* v8 ignore stop -- @preserve */
  const hitDiceSpent = spendHitDice({
    sheet: useCountRecovered.success,
    unitLibrary: input.unitLibrary,
    spendHitDice: input.spendHitDice,
  });
  if (Result.isFailure(hitDiceSpent)) return Result.fail(hitDiceSpent.failure);
  const sorceryPointsRecovered =
    input.sorcerousRestoration === undefined
      ? Result.succeed(hitDiceSpent.success)
      : recoverSorceryPointsWithSorcerousRestoration({
          sheet: hitDiceSpent.success,
          unitLibrary: input.unitLibrary,
          recoverSorceryPoints: input.sorcerousRestoration.recoverSorceryPoints,
        });
  if (Result.isFailure(sorceryPointsRecovered)) {
    return Result.fail(sorceryPointsRecovered.failure);
  }
  return Result.succeed(sorceryPointsRecovered.success);
}

export function characterSheetHitDice(
  sheet: CharacterSheet,
  unitLibrary: UnitCatalog,
): Result.Result<readonly CharacterSheetHitDieState[], CharacterSheetIssue> {
  const capacity = characterBuildHitDice(sheet.build, unitLibrary);
  /* v8 ignore next -- @preserve -- Hit Die capacity rejection is malformed build/catalog correlation. */
  if (Result.isFailure(capacity)) return Result.fail(capacity.failure);
  return Result.succeed(
    capacity.success.map((pool) => ({
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
): Result.Result<readonly CharacterBuildHitDiePool[], CharacterSheetIssue> {
  const hitPoints = characterBuildHitPoints(build, unitLibrary);
  /* v8 ignore start -- @preserve -- Malformed build/catalog correlation: Hit Point construction cannot project the build's class Hit Dice. */
  return Result.isFailure(hitPoints)
    ? characterSheetIssue(
        hitPoints.failure.map(characterCreationIssueMessage).join("; "),
      )
    : Result.succeed(hitPoints.success.hitDice);
  /* v8 ignore stop -- @preserve */
}

export function restSpellSlotRecoveryProfileForBuild(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Result.Result<
  CharacterSheetRestSpellSlotRecoveryProfile,
  CharacterSheetIssue
> {
  const features: CharacterSheetRestSpellSlotRecoveryFeature[] = [];
  for (const unitId of characterBuildFeatureUnitIds(build, unitLibrary)) {
    const unit = getRequiredUnit(unitLibrary, unitId);
    /* v8 ignore next -- @preserve -- A build-owned recovery feature id must resolve in the same Unit catalog. */
    if (Result.isFailure(unit)) return Result.fail(unit.failure);
    const projection = projectCharacterSheetClassFeature(unit.success);
    if (
      Option.isNone(projection) ||
      !isRestSpellSlotRecoveryFeature(projection.value)
    ) {
      continue;
    }
    features.push({ unitId: unit.success.id, ...projection.value });
  }
  if (features.length === 0) {
    return characterSheetIssue(
      "Arcane Recovery requires a Short Rest Spell Slot recovery feature.",
    );
  }
  /* v8 ignore start -- @preserve -- Malformed admitted build: more than one Short-Rest Spell Slot recovery feature survived support admission. */
  if (features.length > 1) {
    return characterSheetIssue(
      "Character Sheet supports only one Short Rest Spell Slot recovery feature.",
    );
  }
  const feature = features[0];
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- The nonempty feature check above makes an absent first recovery feature impossible. */
  if (feature === undefined) {
    return characterSheetIssue(
      "Arcane Recovery requires a Short Rest Spell Slot recovery feature.",
    );
  }
  /* v8 ignore stop -- @preserve */
  return restSpellSlotRecoveryProfileForFeature({
    build,
    unitLibrary,
    feature,
  });
}

type RestSpellSlotRecoveryMechanics = Extract<
  CharacterSheetClassFeatureFacts["mechanics"],
  { readonly family: "rest_spell_slot_recovery" }
>;
type CharacterSheetRestSpellSlotRecoveryFeature =
  CharacterSheetClassFeatureFacts & {
    readonly unitId: UnitRecord["id"];
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
}): Result.Result<CharacterSheet, CharacterSheetIssue> {
  const shortRested = completeShortRestBenefits({
    sheet: input.recipient.sheet,
    unitLibrary: input.unitLibrary,
    hpGate: "spellGrantedRestBenefit",
    spendHitDice: input.recipient.spendHitDice,
    arcaneRecovery: input.recipient.arcaneRecovery,
    sorcerousRestoration: input.recipient.sorcerousRestoration,
  });
  /* v8 ignore next -- @preserve -- Short Rest benefit rejection is malformed admitted recipient input. */
  if (Result.isFailure(shortRested)) return Result.fail(shortRested.failure);
  const healing = spellRestBenefitHealingAmount({
    profile: input.profile,
    castLevel: input.castLevel,
    healingRolls: input.recipient.healingRolls,
  });
  /* v8 ignore next -- @preserve -- Healing-roll rejection is malformed admitted recipient roll input. */
  if (Result.isFailure(healing)) return Result.fail(healing.failure);
  const healed = recoverCharacterSheetHitPoints({
    sheet: shortRested.success,
    unitLibrary: input.unitLibrary,
    healing: healing.success,
    overflow: { tag: "capAtMaximum" },
    deadCharacterMessage:
      "Spell rest benefit healing cannot restore HP to a dead character.",
  });
  /* v8 ignore next -- @preserve -- HP recovery rejection is malformed admitted recipient HP state. */
  if (Result.isFailure(healed)) return Result.fail(healed.failure);
  return Result.succeed({
    ...healed.success,
    restFeatureUses: [
      ...healed.success.restFeatureUses,
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
}): Result.Result<CharacterSheet, CharacterSheetIssue> {
  /* v8 ignore start -- @preserve -- Malformed spell-rest input: the caster has no ordinary or created Spell Slot state. */
  if (!isCharacterSheetWithSpellSlots(input.sheet)) {
    return characterSheetIssue(
      "Spell rest benefit application requires Spell Slot state.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const spellSlotSpend = spendCharacterSheetSpellSlotSource({
    sheet: input.sheet,
    spellLevel: input.spellLevel,
    spellSlotSource: input.spellSlotSource,
  });
  /* v8 ignore next -- @preserve -- Slot-source rejection is malformed retained slot/source input. */
  if (Result.isFailure(spellSlotSpend))
    return Result.fail(spellSlotSpend.failure);
  return Result.succeed({
    ...input.sheet,
    spellSlotExpenditures: spellSlotSpend.success.ordinarySpellSlotExpenditures,
    createdSpellSlots: spellSlotSpend.success.createdSpellSlots,
  });
}

function spendCharacterSheetSpellSlotSource(input: {
  readonly sheet: CharacterSheetWithSpellSlots;
  readonly spellLevel: SpellSlotLevel;
  readonly spellSlotSource:
    | CharacterSheetFontOfMagicSpellSlotSource
    | undefined;
}): Result.Result<CharacterSheetSpellSlotSourceState, CharacterSheetIssue> {
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
  /* v8 ignore next -- @preserve -- Slot-source selection rejection is malformed or ambiguous slot-spend input. */
  if (Result.isFailure(source)) return Result.fail(source.failure);
  return source.success === "ordinary"
    ? Result.succeed({
        ordinarySpellSlotExpenditures: replaceOrdinarySpellSlotExpenditure({
          expenditures: input.sheet.spellSlotExpenditures,
          spellLevel: input.spellLevel,
          /* v8 ignore next -- @preserve -- Internal invariant: selecting the ordinary source above proves the ordinary slot exists at this level. */
          expended: resourceCount((ordinarySlot?.expended ?? 0) + 1),
        }),
        createdSpellSlots: input.sheet.createdSpellSlots,
      })
    : Result.succeed({
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
}): Result.Result<
  CharacterSheetFontOfMagicSpellSlotSource,
  CharacterSheetIssue
> {
  if (input.spellSlotSource === "ordinary") {
    /* v8 ignore start -- @preserve -- Malformed slot-spend input: ordinary was selected but no unexpended ordinary slot exists at this level. */
    if (!input.ordinaryAvailable) {
      return characterSheetIssue(
        "Spell Slot spend requires an unexpended ordinary Spell Slot.",
      );
    }
    /* v8 ignore stop -- @preserve */
    return Result.succeed("ordinary");
  }
  if (input.spellSlotSource === "created") {
    /* v8 ignore start -- @preserve -- Malformed slot-spend input: created was selected but no unexpended created slot exists at this level. */
    if (!input.createdAvailable) {
      return characterSheetIssue(
        "Spell Slot spend requires an unexpended created Spell Slot.",
      );
    }
    /* v8 ignore stop -- @preserve */
    return Result.succeed("created");
  }
  /* v8 ignore start -- @preserve -- Ambiguous slot-spend input: both ordinary and created sources are available but no source was selected. */
  if (input.ordinaryAvailable && input.createdAvailable) {
    return characterSheetIssue(
      "Spell Slot spend requires a source when ordinary and created Spell Slots are both available.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (input.ordinaryAvailable) return Result.succeed("ordinary");
  /* v8 ignore start -- @preserve -- Malformed slot-spend input: V8 maps the no-available-source edge to this conditional; after both availability checks fail, the remaining paths only report fully expended or absent slot state. */
  if (input.createdAvailable) return Result.succeed("created");
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
  /* v8 ignore stop -- @preserve */
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
}): Result.Result<CharacterSheet, CharacterSheetIssue> {
  if (input.spendHitDice === undefined) return Result.succeed(input.sheet);
  /* v8 ignore start -- @preserve -- Malformed Short Rest input: an explicit Hit Dice spend list cannot be empty. */
  if (input.spendHitDice.length === 0) {
    return characterSheetIssue("Short Rest Hit Dice spending cannot be empty.");
  }
  /* v8 ignore stop -- @preserve */
  const hitDice = characterSheetHitDice(input.sheet, input.unitLibrary);
  /* v8 ignore next -- @preserve -- Hit Die projection rejection is malformed Short Rest build/pool correlation. */
  if (Result.isFailure(hitDice)) return Result.fail(hitDice.failure);
  const hitDiceByClass = new Map(
    hitDice.success.map((pool) => [pool.classUnitId, pool]),
  );
  const spentThisRest = new Map<UnitRecord["id"], ResourceCount>();
  let healingTotal = 0;
  const constitutionModifier = abilityScoreToMod(
    input.sheet.build.abilityScores.con,
  );
  for (const spend of input.spendHitDice) {
    const pool = hitDiceByClass.get(spend.classUnitId);
    /* v8 ignore start -- @preserve -- Malformed Short Rest input: a Hit Die spend names no build pool or carries a roll outside that pool's die. */
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
    /* v8 ignore stop -- @preserve */
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
  /* v8 ignore next -- @preserve -- Hit Die HP recovery rejection is malformed retained HP state. */
  if (Result.isFailure(healed)) return Result.fail(healed.failure);
  return Result.succeed({
    ...healed.success,
    spentHitDice: nextSpentHitDice,
  });
}

function applyArcaneRecovery(input: {
  readonly sheet: CharacterSheet;
  readonly pactSlotsAtRestStart: CharacterSheetPactSlotState | undefined;
  readonly unitLibrary: UnitCatalog;
  readonly refundSpellSlots: readonly CharacterSheetArcaneRecoverySlotRefund[];
}): CharacterSheetShortRestArcaneRecoveryBenefitsResult {
  /* v8 ignore start -- @preserve -- Malformed Arcane Recovery input: the sheet has no ordinary slots or its build lacks the admitted recovery feature. */
  if (!isCharacterSheetWithSpellSlots(input.sheet)) {
    return {
      tag: "rejected",
      issue: arcaneRecoveryIssue(
        "Arcane Recovery requires ordinary Spell Slot state.",
      ),
      owner: "spellSlot",
    };
  }
  const profile = restSpellSlotRecoveryProfileForBuild(
    input.sheet.build,
    input.unitLibrary,
  );
  if (Result.isFailure(profile)) {
    return {
      tag: "rejected",
      issue: profile.failure,
      owner: "featureResource",
    };
  }
  /* v8 ignore stop -- @preserve */
  if (
    input.sheet.restFeatureUses.some(
      (use) => use.tag === ARCANE_RECOVERY_REST_FEATURE_TAG,
    )
  ) {
    return {
      tag: "rejected",
      issue: arcaneRecoveryIssue(
        "Arcane Recovery cannot be used again until a Long Rest.",
      ),
      owner: "featureResource",
    };
  }
  const sheet = input.sheet;
  const refund = arcaneRecoverySpellSlotRefund({
    sheet,
    profile: profile.success,
    refundSpellSlots: input.refundSpellSlots,
  });
  if (Result.isFailure(refund)) {
    return {
      tag: "rejected",
      issue: refund.failure,
      owner: arcaneRecoveryPactSlotRejectionBoundary({
        sheet,
        pactSlotsAtRestStart: input.pactSlotsAtRestStart,
        refundSpellSlots: input.refundSpellSlots,
      })
        ? "pactSlot"
        : "spellSlot",
    };
  }
  return {
    tag: "accepted",
    owner: "spellSlot",
    sheet: {
      ...sheet,
      spellSlotExpenditures: refund.success,
      restFeatureUses: [
        ...sheet.restFeatureUses,
        {
          tag: ARCANE_RECOVERY_REST_FEATURE_TAG,
          usedSinceLongRest: true,
        },
      ],
    },
  };
}

function arcaneRecoveryIssue(message: string): CharacterSheetIssue {
  return { tag: "characterSheetIssue", message };
}

function arcaneRecoverySpellSlotRefund(input: {
  readonly sheet: CharacterSheetWithSpellSlots;
  readonly profile: CharacterSheetRestSpellSlotRecoveryProfile;
  readonly refundSpellSlots: readonly CharacterSheetArcaneRecoverySlotRefund[];
}): Result.Result<
  readonly CharacterSpellSlotExpenditure[],
  CharacterSheetIssue
> {
  /* v8 ignore start -- @preserve -- Malformed Arcane Recovery input: an explicit refund list cannot be empty. */
  if (input.refundSpellSlots.length === 0) {
    return characterSheetIssue("Arcane Recovery must recover expended slots.");
  }
  /* v8 ignore stop -- @preserve */
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
    /* v8 ignore start -- @preserve -- Malformed Arcane Recovery input: a refund is above the authored level cap or has a nonpositive count. */
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
    /* v8 ignore stop -- @preserve */
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
  const ordinarySlotsByLevel = new Map(
    ordinarySpellSlotStates(input.sheet).map((slot) => [slot.spellLevel, slot]),
  );
  for (const [spellLevel, refundCount] of refundByLevel.entries()) {
    const ordinarySlot = ordinarySlotsByLevel.get(spellLevel);
    /* v8 ignore start -- @preserve -- Malformed Arcane Recovery input: a refund names no ordinary slot capacity or exceeds its current expenditure. */
    if (ordinarySlot === undefined) {
      return characterSheetIssue(
        "Arcane Recovery refund must match existing Spell Slot levels.",
      );
    }
    if (refundCount > ordinarySlot.expended) {
      return characterSheetIssue(
        "Arcane Recovery cannot refund more Spell Slots than are expended.",
      );
    }
    /* v8 ignore stop -- @preserve */
  }
  return Result.succeed(updated);
}

function arcaneRecoveryPactSlotRejectionBoundary(input: {
  readonly sheet: CharacterSheetWithSpellSlots;
  readonly pactSlotsAtRestStart: CharacterSheetPactSlotState | undefined;
  readonly refundSpellSlots: readonly CharacterSheetArcaneRecoverySlotRefund[];
}): boolean {
  const pactSlots = input.pactSlotsAtRestStart;
  if (pactSlots === undefined || pactSlots.expended < resourceCount(1)) {
    return false;
  }
  const ordinaryExpendedByLevel = new Map(
    ordinarySpellSlotStates(input.sheet).map((slot) => [
      slot.spellLevel,
      slot.expended,
    ]),
  );
  return input.refundSpellSlots.some((refund) => {
    const ordinaryExpended =
      ordinaryExpendedByLevel.get(refund.spellLevel) ?? resourceCount(0);
    return (
      refund.spellLevel === pactSlots.slotLevel &&
      ordinaryExpended === resourceCount(0) &&
      refund.count <= pactSlots.expended
    );
  });
}

function restSpellSlotRecoveryProfileForFeature(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly feature: CharacterSheetRestSpellSlotRecoveryFeature;
}): Result.Result<
  CharacterSheetRestSpellSlotRecoveryProfile,
  CharacterSheetIssue
> {
  /* v8 ignore start -- @preserve -- Malformed admitted build: V8 maps the exhausted-scan edge to this loop, but an admitted recovery feature's owning class must occur in progression. */
  for (const progressionClassUnitId of progressionClassUnitIds(
    input.build.progression,
  )) {
    const unit = getRequiredUnit(input.unitLibrary, progressionClassUnitId);
    /* v8 ignore next -- @preserve -- A progression class id must resolve in the same Unit catalog. */
    if (Result.isFailure(unit)) return Result.fail(unit.failure);
    if (
      unit.success.kind === "class" &&
      unit.success.className === input.feature.className
    ) {
      return Result.succeed({
        feature: input.feature,
        classUnitId: progressionClassUnitId,
      });
    }
  }
  return characterSheetIssue(
    "Short Rest Spell Slot recovery feature must belong to a class in the build progression.",
  );
  /* v8 ignore stop -- @preserve */
}

function isRestSpellSlotRecoveryFeature(
  facts: CharacterSheetClassFeatureFacts,
): facts is Omit<CharacterSheetRestSpellSlotRecoveryFeature, "unitId"> {
  return (
    facts.mechanics.family === "rest_spell_slot_recovery" &&
    facts.mechanics.recoveryTrigger === "short_rest" &&
    facts.mechanics.resetCadence.kind === "long_rest" &&
    facts.mechanics.recoveredSlotLevelCap.kind === "half_class_level_rounded_up"
  );
}

function isSpellRestBenefitCastingShell(
  mechanics: CharacterSheetSpellFacts["mechanics"],
) {
  const castingTime = characterSheetTopLevelSpellCastingTime(mechanics);
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
): Result.Result<CharacterSheetSpellRestBenefitEffects, CharacterSheetIssue> {
  /* v8 ignore start -- @preserve -- Unsupported authored spell shape: the direct phase lacks the exact healing, Short Rest benefit, and Long-Rest lockout effect trio. */
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
  /* v8 ignore stop -- @preserve */
  return Result.succeed({
    healing,
  });
}

function isSpellRestBenefitHealingEffect(
  effect: unknown,
): effect is CharacterSheetSpellRestBenefitHealingEffect {
  if (!isRecord(effect) || effect.kind !== "heal_hp") return false;
  /* v8 ignore start -- @preserve -- Unsupported authored effect shape: a healing atom has the wrong target or non-record scaling payload. */
  if (effect.target !== "target_creature" || !isRecord(effect.amount)) {
    return false;
  }
  /* v8 ignore stop -- @preserve */
  const amount = effect.amount;
  /* v8 ignore start -- @preserve -- Unsupported authored effect shape: optional healing scaling fields, when present, must be numeric and use the admitted linear slot axis. */
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
  /* v8 ignore stop -- @preserve */
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
): Result.Result<ResourceCount, CharacterSheetIssue> {
  /* v8 ignore start -- @preserve -- Malformed Lay On Hands input: HP restoration is negative/nonintegral or neither healing nor Poisoned removal was requested. */
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
    : Result.succeed(spend);
  /* v8 ignore stop -- @preserve */
}

function spendCharacterSheetResource(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly amount: ResourceCount;
}): Result.Result<CharacterSheet, CharacterSheetIssue> {
  const resources = characterSheetResources(input.sheet, input.unitLibrary);
  /* v8 ignore next -- @preserve -- Lay On Hands resource rejection is malformed build/resource correlation. */
  if (Result.isFailure(resources)) return Result.fail(resources.failure);
  const resource = resources.success.find(
    (candidate) => candidate.tag === "layOnHandsHealingPool",
  );
  /* v8 ignore start -- @preserve -- Malformed Lay On Hands input: the source build lacks the admitted Lay On Hands healing-pool feature. */
  if (resource === undefined) {
    return characterSheetIssue(
      "Lay On Hands requires the Paladin Lay On Hands feature.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (resource.expended + input.amount > resource.count) {
    return characterSheetIssue(
      "Lay On Hands cannot spend more healing pool than remains.",
    );
  }

  const nextExpenditures: CharacterSheetResourceExpenditure[] =
    input.sheet.resourceExpenditures.filter(
      (expenditure) => expenditure.tag !== "layOnHandsHealingPool",
    );
  nextExpenditures.push({
    tag: "layOnHandsHealingPool",
    expended: resourceCount(resource.expended + input.amount),
  });
  return Result.succeed({
    ...input.sheet,
    resourceExpenditures: nextExpenditures,
  });
}

function applyLayOnHandsTargetEffects(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly restoreHp: HpType;
  readonly removePoisoned: boolean;
}): Result.Result<CharacterSheet, CharacterSheetIssue> {
  if (input.removePoisoned) {
    /* v8 ignore start -- @preserve -- Malformed Lay On Hands input: Poisoned removal was requested for a target without Poisoned. */
    if (!input.sheet.conditions.some((condition) => condition === "poisoned")) {
      return characterSheetIssue(
        "Lay On Hands Poisoned removal requires a Poisoned target.",
      );
    }
    /* v8 ignore stop -- @preserve */
  }
  const conditions = input.removePoisoned
    ? input.sheet.conditions.filter((condition) => condition !== "poisoned")
    : input.sheet.conditions;

  if (input.restoreHp === 0) {
    return Result.succeed({ ...input.sheet, conditions });
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
  /* v8 ignore start -- @preserve -- Malformed Lay On Hands input: requested healing violates the target's HP lifecycle or missing-HP bound. */
  if (Result.isFailure(healed)) return Result.fail(healed.failure);
  /* v8 ignore stop -- @preserve */
  return Result.succeed({ ...healed.success, conditions });
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}
