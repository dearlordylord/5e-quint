// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-cast-governor-quickened
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-careful-save-protection
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-heightened-save-disadvantage
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-damage-type-substitution
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-cast-range-increase
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-cast-duration-and-concentration
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-cast-component-suppression unit-feature.metamagic-damage-dice-reroll
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-effective-level-extra-target
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-missed-spell-attack-reroll
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR BATTLE.FEATURE.METAMAGIC_CAREFUL_SAVE_PROTECTION BATTLE.FEATURE.METAMAGIC_HEIGHTENED_SAVE_DISADVANTAGE BATTLE.FEATURE.METAMAGIC_TRANSMUTED_DAMAGE_TYPE_SUBSTITUTION BATTLE.FEATURE.METAMAGIC_TWINNED_EFFECTIVE_LEVEL_EXTRA_TARGET BATTLE.FEATURE.METAMAGIC_DISTANT_CAST_RANGE_INCREASE BATTLE.FEATURE.METAMAGIC_EXTENDED_CAST_DURATION_CONCENTRATION BATTLE.FEATURE.METAMAGIC_SUBTLE_COMPONENT_SUPPRESSION BATTLE.FEATURE.METAMAGIC_SEEKING_SPELL_ATTACK_REROLL BATTLE.FEATURE.METAMAGIC_EMPOWERED_DAMAGE_DICE_REROLL

import * as Either from "effect/Either";
import { canSpendBonusAction } from "@dnd/shared-algebras/action-economy-algebra";
import { abilityScoreToMod } from "@dnd/shared/types";
import type {
  BattleAttackRollResult,
  BattleCreatureState,
  BattleRolledDiceFill,
  BattleSpellDamageDieReroll,
  BattleSpellDamageRerollOption,
  BattleSpellAttackRerollOption,
  BattleState,
  SupportedSpellInvocation,
} from "../battle-reducer.ts";
import type {
  BattleSubject,
  SpellMetamagicSelection,
} from "../battle-subjects.ts";
import {
  characterBattleResourceIsPointPool,
  spendCharacterPointPoolResource,
  type CharacterBattleMetamagicEffectKind,
  type CharacterBattleMetamagicOptionFact,
  type CharacterBattlePointPoolResourceState,
} from "../character-battle-resources.ts";
import type { CombatantId } from "../identity.ts";
import { combatantHasLevelOnePlusSpellCastThisTurn } from "./spell-turn-resources.ts";
import { REGISTERED_SPELL_PROCEDURE_PROFILES } from "./spell-procedure-profiles/registry.ts";
import {
  DISTANT_METAMAGIC_EFFECT_KIND,
  distantSpellRangeModifierFact,
  distantSpellRangeProjectionIssue,
  EMPOWERED_METAMAGIC_EFFECT_KIND,
  EXTENDED_METAMAGIC_EFFECT_KIND,
  extendedSpellDurationModifierFact,
  extendedSpellDurationProjectionIssue,
  isSpellMetamagicApplicationFactWithoutSelectionPayload,
  metamagicApplicationsIncludeQuickened,
  metamagicSorceryPointCost,
  metamagicSorceryPointSpendIssue,
  QUICKENED_METAMAGIC_EFFECT_KIND,
  saveMetamagicSupportIssue,
  SEEKING_METAMAGIC_EFFECT_KIND,
  subtleSpellComponentProjectionFact,
  subtleSpellComponentProjectionIssue,
  SUBTLE_METAMAGIC_EFFECT_KIND,
  TRANSMUTED_METAMAGIC_EFFECT_KIND,
  transmutedSpellDamageTypeSubstitutionIssue,
  transmutedSpellSelectionTargetDamageType,
  TWINNED_METAMAGIC_EFFECT_KIND,
  twinnedSpellTargetCountProjectionIssue,
  type SpellMetamagicApplicationFact,
} from "./metamagic-support.ts";
export {
  CAREFUL_METAMAGIC_EFFECT_KIND,
  discoverDistantSpellMetamagicSelections,
  discoverExtendedSpellMetamagicSelections,
  discoverSpellMetamagicSelections,
  discoverSubtleSpellMetamagicSelections,
  discoverTransmutedSpellMetamagicSelections,
  discoverTwinnedSpellMetamagicSelections,
  DISTANT_METAMAGIC_EFFECT_KIND,
  distantSpellRangeModifierForApplications,
  EMPOWERED_METAMAGIC_EFFECT_KIND,
  extendedSpellDurationModifierForApplications,
  EXTENDED_METAMAGIC_EFFECT_KIND,
  EXTENDED_SPELL_METAMAGIC_SELECTION,
  HEIGHTENED_METAMAGIC_EFFECT_KIND,
  metamagicActionCostOverride,
  metamagicApplicationsIncludeQuickened,
  QUICKENED_METAMAGIC_EFFECT_KIND,
  QUICKENED_SPELL_METAMAGIC_SELECTION,
  SEEKING_METAMAGIC_EFFECT_KIND,
  spellMetamagicApplications,
  spellMetamagicLabel,
  subtleSpellComponentProjectionForApplications,
  SUBTLE_METAMAGIC_EFFECT_KIND,
  transmutedSpellDamageInvocation,
  TRANSMUTED_METAMAGIC_EFFECT_KIND,
  transmutedSpellMetamagicLabel,
  TWINNED_METAMAGIC_EFFECT_KIND,
  TWINNED_SPELL_METAMAGIC_SELECTION,
  twinnedSpellTargetCountInvocation,
} from "./metamagic-support.ts";

export const DISTANT_METAMAGIC_UNSUPPORTED_MESSAGE =
  "Distant Spell is supported only for promoted spell target witnesses that carry cast-local range facts without trusting authored spell identity.";
export const EXTENDED_METAMAGIC_UNSUPPORTED_MESSAGE =
  "Extended Spell is supported only for promoted duration-bearing spell witnesses that carry cast-local duration facts and same-occurrence Concentration save Advantage.";
export const SUBTLE_METAMAGIC_UNSUPPORTED_MESSAGE =
  "Subtle Spell is supported only for action-time spell casts with Verbal, Somatic, or Material component requirements.";
export const TWINNED_METAMAGIC_UNSUPPORTED_MESSAGE =
  "Twinned Spell is not supported until upcast target-count projection can increase effective spell level by 1 only for procedures whose higher-slot shape targets one additional creature without duplicating spell slot state.";
export const EMPOWERED_METAMAGIC_UNSUPPORTED_MESSAGE =
  "Empowered Spell is not supported until spell damage roll fills carry a typed post-roll reroll boundary that selects original damage dice up to the caster's Charisma modifier and replaces them with forced new rolls without storing reroll opportunity state.";
export const SEEKING_METAMAGIC_UNSUPPORTED_MESSAGE =
  "Seeking Spell is supported only as a post-miss spell attack reroll fill that replaces one missed d20 with the forced new roll without storing reroll opportunity state.";

export const QUICKENED_ACTION_SPELL_PROCEDURE_UNSUPPORTED_MESSAGE =
  "Quickened Spell is not supported for this action-casting spell procedure until its resolver threads a Bonus Action rewrite and Metamagic applications through the shared spell-cast resource boundary.";
export const QUICKENED_ACTION_CASTING_TIME_REQUIRED_MESSAGE =
  "Quickened Spell can modify only spells with a casting time of an action.";

type SeekingSpellApplicationFact = CharacterBattleMetamagicOptionFact & {
  readonly effectKind: typeof SEEKING_METAMAGIC_EFFECT_KIND;
};

type EmpoweredSpellApplicationFact = CharacterBattleMetamagicOptionFact & {
  readonly effectKind: typeof EMPOWERED_METAMAGIC_EFFECT_KIND;
};

type QuickenedActionRewriteProcedureDisposition =
  | "bonusActionRewrite"
  | "actionSpellResolverNotRewritten"
  | "notActionSpellCasting";

type QuickenedActionRewriteProcedureDispositions = {
  readonly [Profile in (typeof REGISTERED_SPELL_PROCEDURE_PROFILES)[number] as Profile["procedure"]]: Profile["metamagicCompatibility"];
} & Record<
  SupportedSpellInvocation["procedure"],
  QuickenedActionRewriteProcedureDisposition
>;

let quickenedActionRewriteProcedureDispositions:
  | QuickenedActionRewriteProcedureDispositions
  | undefined;

function quickenedActionRewriteProcedureDispositionTable(): QuickenedActionRewriteProcedureDispositions {
  // Build lazily so registry imports can finish before metamagic reads the
  // registered profile list.
  // Object.fromEntries erases the one-entry-per-procedure relationship; the
  // mapped type above keeps that registry-derived key/value invariant visible.
  quickenedActionRewriteProcedureDispositions ??= Object.freeze(
    Object.fromEntries(
      REGISTERED_SPELL_PROCEDURE_PROFILES.map((profile) => [
        profile.procedure,
        profile.metamagicCompatibility,
      ]),
    ),
  ) as QuickenedActionRewriteProcedureDispositions;
  return quickenedActionRewriteProcedureDispositions;
}

type QuickenedActionRewriteProcedure = {
  [Procedure in keyof QuickenedActionRewriteProcedureDispositions]: QuickenedActionRewriteProcedureDispositions[Procedure] extends "bonusActionRewrite"
    ? Procedure
    : never;
}[keyof QuickenedActionRewriteProcedureDispositions];

export type SpellMetamagicAdmissionIssue = {
  readonly tag: "spellMetamagicAdmissionIssue";
  readonly message: string;
};

export type SpellMetamagicAdmission =
  | {
      readonly tag: "ok";
      readonly applications: readonly SpellMetamagicApplicationFact[];
    }
  | SpellMetamagicAdmissionIssue;

type SpellMetamagicSubject = Extract<
  BattleSubject,
  { readonly tag: "actionSpell" | "bonusActionSpell" }
>;

export function admitSpellMetamagicApplications(input: {
  readonly state: BattleState;
  readonly actor: BattleCreatureState;
  readonly actorId: CombatantId;
  readonly invocation: SupportedSpellInvocation;
  readonly subject: SpellMetamagicSubject;
}): SpellMetamagicAdmission {
  const selections = input.subject.metamagic ?? [];
  if (selections.length === 0) {
    return { tag: "ok", applications: [] };
  }
  if (input.actor.origin.kind !== "character") {
    return metamagicIssue(
      "Metamagic selection requires a character with known Metamagic options.",
    );
  }
  const metamagic = input.actor.origin.metamagic;
  if (metamagic === undefined) {
    return metamagicIssue(
      "Metamagic selection requires a character with known Metamagic options.",
    );
  }
  if (hasDuplicateEffectKinds(selections)) {
    return metamagicIssue(
      "Metamagic selections must not repeat an option effect.",
    );
  }
  const knownApplications: SpellMetamagicApplicationFact[] = [];
  for (const selection of selections) {
    const application = metamagic.knownOptions.find(
      (option) => option.effectKind === selection.effectKind,
    );
    if (application === undefined) {
      return metamagicIssue(
        "Metamagic selection must be one of the actor's known Metamagic options.",
      );
    }
    const admittedApplication = metamagicApplicationForSelection({
      application,
      selection,
      invocation: input.invocation,
    });
    if (typeof admittedApplication === "string") {
      return metamagicIssue(admittedApplication);
    }
    knownApplications.push(admittedApplication);
  }
  const quickenedSelected =
    metamagicApplicationsIncludeQuickened(knownApplications);
  const stackingIssue = metamagicStackingIssue(knownApplications);
  if (stackingIssue !== null) {
    return metamagicIssue(stackingIssue);
  }
  const supportIssue = spellMetamagicSupportIssue({
    applications: knownApplications,
    invocation: input.invocation,
    subject: input.subject,
  });
  if (supportIssue !== null) {
    return metamagicIssue(supportIssue);
  }
  if (quickenedSelected) {
    const quickenedIssue = quickenedSpellAdmissionIssue({
      state: input.state,
      actor: input.actor,
      actorId: input.actorId,
      invocation: input.invocation,
      subject: input.subject,
    });
    if (quickenedIssue !== null) {
      return metamagicIssue(quickenedIssue);
    }
  }
  const sorceryPointIssue = metamagicSorceryPointSpendIssue({
    actor: input.actor,
    applications: knownApplications,
  });
  return sorceryPointIssue === null
    ? { tag: "ok", applications: knownApplications }
    : metamagicIssue(sorceryPointIssue);
}

export function actorCanOfferQuickenedSpellMetamagic(input: {
  readonly state: BattleState;
  readonly actor: BattleCreatureState;
  readonly actorId: CombatantId;
  readonly invocation: SupportedSpellInvocation;
}): boolean {
  if (input.actor.origin.kind !== "character") {
    return false;
  }
  const quickened = input.actor.origin.metamagic?.knownOptions.find(
    (option) => option.effectKind === QUICKENED_METAMAGIC_EFFECT_KIND,
  );
  if (quickened === undefined) {
    return false;
  }
  if (!spellInvocationHasMagicActionCastingTime(input.invocation)) {
    return false;
  }
  if (!spellInvocationSupportsQuickenedActionRewrite(input.invocation)) {
    return false;
  }
  if (!canSpendBonusAction(input.state.currentTurnResources)) {
    return false;
  }
  if (
    combatantHasLevelOnePlusSpellCastThisTurn(
      input.state.currentTurnResources,
      input.actorId,
    )
  ) {
    return false;
  }
  return (
    metamagicSorceryPointSpendIssue({
      actor: input.actor,
      applications: [quickened],
    }) === null
  );
}

export function seekingSpellAttackRerollOption(input: {
  readonly actor: BattleCreatureState | undefined;
}): BattleSpellAttackRerollOption | null {
  const application = seekingSpellMetamagicApplication(input.actor);
  return application === null
    ? null
    : {
        effectKind: SEEKING_METAMAGIC_EFFECT_KIND,
        label: "Seeking Spell",
        sorceryPointCost: application.sorceryPointCost,
      };
}

export function empoweredSpellDamageRerollOption(input: {
  readonly actor: BattleCreatureState | undefined;
  readonly castApplications: readonly CharacterBattleMetamagicOptionFact[];
}): BattleSpellDamageRerollOption | null {
  const application = empoweredSpellMetamagicApplication(input.actor);
  if (application === null) {
    return null;
  }
  if (
    empoweredSpellCombinedUseIssue({
      actor: input.actor,
      castApplications: input.castApplications,
      empoweredApplication: application,
    }) !== null
  ) {
    return null;
  }
  return {
    effectKind: EMPOWERED_METAMAGIC_EFFECT_KIND,
    label: "Empowered Spell",
    sorceryPointCost: application.sorceryPointCost,
    maximumSelectedDice: empoweredSpellMaximumSelectedDice(input.actor),
  };
}

export function effectiveEmpoweredSpellDamageRoll(
  damageRoll: BattleRolledDiceFill,
): BattleRolledDiceFill {
  if (damageRoll.spellDamageReroll === undefined) {
    return damageRoll;
  }
  const replacements = damageRoll.spellDamageReroll.dice;
  const [firstGroup, ...remainingGroups] = damageRoll.value;
  const value: BattleRolledDiceFill["value"] = [
    effectiveEmpoweredSpellDiceGroup(firstGroup, 0, replacements),
    ...remainingGroups.map((group, index) =>
      effectiveEmpoweredSpellDiceGroup(group, index + 1, replacements),
    ),
  ];
  return {
    ...damageRoll,
    value,
  };
}

function effectiveEmpoweredSpellDiceGroup(
  group: BattleRolledDiceFill["value"][number],
  groupIndex: number,
  replacements: readonly BattleSpellDamageDieReroll[],
): BattleRolledDiceFill["value"][number] {
  const [firstResult, ...remainingResults] = group.results;
  return {
    results: [
      effectiveEmpoweredSpellDieResult(
        firstResult,
        groupIndex,
        0,
        replacements,
      ),
      ...remainingResults.map((result, index) =>
        effectiveEmpoweredSpellDieResult(
          result,
          groupIndex,
          index + 1,
          replacements,
        ),
      ),
    ],
  };
}

function effectiveEmpoweredSpellDieResult(
  result: BattleRolledDiceFill["value"][number]["results"][number],
  groupIndex: number,
  resultIndex: number,
  replacements: readonly BattleSpellDamageDieReroll[],
): BattleRolledDiceFill["value"][number]["results"][number] {
  const replacement = replacements.find(
    (candidate) =>
      candidate.groupIndex === groupIndex &&
      candidate.resultIndex === resultIndex,
  );
  return replacement?.replacement ?? result;
}

export function empoweredSpellRerollApplicationForDamageRoll(input: {
  readonly actor: BattleCreatureState | undefined;
  readonly damageRoll: BattleRolledDiceFill;
  readonly castApplications: readonly CharacterBattleMetamagicOptionFact[];
}): EmpoweredSpellApplicationFact | string | null {
  if (input.damageRoll.spellDamageReroll === undefined) {
    return null;
  }
  const application = empoweredSpellMetamagicApplication(input.actor);
  if (application === null) {
    return "Empowered Spell requires a character that knows Empowered Spell and has enough Sorcery Points.";
  }
  const combinedUseIssue = empoweredSpellCombinedUseIssue({
    actor: input.actor,
    castApplications: input.castApplications,
    empoweredApplication: application,
  });
  if (combinedUseIssue !== null) {
    return combinedUseIssue;
  }
  return application;
}

export function empoweredSpellDamageRerollValidationIssue(input: {
  readonly actor: BattleCreatureState | undefined;
  readonly invocation: SupportedSpellInvocation;
  readonly damageRoll: BattleRolledDiceFill;
  readonly castApplications: readonly CharacterBattleMetamagicOptionFact[];
}): string | null {
  const decision = input.damageRoll.spellDamageReroll;
  if (decision === undefined) {
    return null;
  }
  if (input.invocation.procedure !== "spellAttackDamage") {
    return "Empowered Spell is supported only for the promoted single spell attack damage procedure.";
  }
  const application = empoweredSpellRerollApplicationForDamageRoll({
    actor: input.actor,
    damageRoll: input.damageRoll,
    castApplications: input.castApplications,
  });
  if (typeof application === "string") {
    return application;
  }
  const selectedDice = decision.dice;
  if (selectedDice.length > empoweredSpellMaximumSelectedDice(input.actor)) {
    return "Empowered Spell selected damage dice exceed the caster's Charisma modifier minimum-one limit.";
  }
  const seenPositions = new Set<string>();
  for (const selectedDie of selectedDice) {
    if (
      !Number.isInteger(selectedDie.groupIndex) ||
      !Number.isInteger(selectedDie.resultIndex) ||
      selectedDie.groupIndex < 0 ||
      selectedDie.resultIndex < 0
    ) {
      return "Empowered Spell selected damage dice must identify existing original dice.";
    }
    const positionKey = `${selectedDie.groupIndex}:${selectedDie.resultIndex}`;
    if (seenPositions.has(positionKey)) {
      return "Empowered Spell cannot select the same damage die more than once.";
    }
    seenPositions.add(positionKey);
    const originalGroup = input.damageRoll.value[selectedDie.groupIndex];
    const originalDie = originalGroup?.results[selectedDie.resultIndex];
    if (originalDie === undefined || originalDie !== selectedDie.original) {
      return "Empowered Spell selected original dice must match the pending spell damage roll.";
    }
    if (
      !Number.isInteger(Number(selectedDie.replacement)) ||
      Number(selectedDie.replacement) < 1 ||
      Number(selectedDie.replacement) > input.invocation.damage.expr.dieSize
    ) {
      return "Empowered Spell replacement rolls must fit the spell damage die size.";
    }
  }
  return null;
}

export function seekingSpellRerollApplicationForAttackRoll(input: {
  readonly actor: BattleCreatureState | undefined;
  readonly attackRoll: BattleAttackRollResult;
  readonly castApplications: readonly CharacterBattleMetamagicOptionFact[];
}): SeekingSpellApplicationFact | string | null {
  if (input.attackRoll.spellAttackReroll === undefined) {
    return null;
  }
  const application = seekingSpellMetamagicApplication(input.actor);
  if (application === null) {
    return "Seeking Spell requires a character that knows Seeking Spell and has enough Sorcery Points.";
  }
  const combinedUseIssue = seekingSpellCombinedUseIssue({
    actor: input.actor,
    castApplications: input.castApplications,
    seekingApplication: application,
  });
  if (combinedUseIssue !== null) {
    return combinedUseIssue;
  }
  return application;
}

export function seekingSpellStackingIssue(input: {
  readonly castApplications: readonly CharacterBattleMetamagicOptionFact[];
  readonly seekingApplication: CharacterBattleMetamagicOptionFact;
}): string | null {
  if (
    input.castApplications.some(
      (application) =>
        application.effectKind === input.seekingApplication.effectKind,
    )
  ) {
    return "Seeking Spell can combine only with a different Metamagic option.";
  }
  return metamagicStackingIssue([
    ...input.castApplications,
    input.seekingApplication,
  ]);
}

export function empoweredSpellStackingIssue(input: {
  readonly castApplications: readonly CharacterBattleMetamagicOptionFact[];
  readonly empoweredApplication: CharacterBattleMetamagicOptionFact;
}): string | null {
  if (
    input.castApplications.some(
      (application) =>
        application.effectKind === input.empoweredApplication.effectKind,
    )
  ) {
    return "Empowered Spell can combine only with a different Metamagic option.";
  }
  return metamagicStackingIssue([
    ...input.castApplications,
    input.empoweredApplication,
  ]);
}

export function empoweredSpellCombinedUseIssue(input: {
  readonly actor: BattleCreatureState | undefined;
  readonly castApplications: readonly CharacterBattleMetamagicOptionFact[];
  readonly empoweredApplication: CharacterBattleMetamagicOptionFact;
}): string | null {
  const stackingIssue = empoweredSpellStackingIssue({
    castApplications: input.castApplications,
    empoweredApplication: input.empoweredApplication,
  });
  if (stackingIssue !== null) {
    return stackingIssue;
  }
  if (input.actor === undefined) {
    return "Empowered Spell requires a character that knows Empowered Spell and has enough Sorcery Points.";
  }
  return metamagicSorceryPointSpendIssue({
    actor: input.actor,
    applications: [...input.castApplications, input.empoweredApplication],
  }) === null
    ? null
    : "Empowered Spell requires enough unexpended Sorcery Points for all Metamagic options used on this spell.";
}

export function empoweredSpellMetamagicApplication(
  actor: BattleCreatureState | undefined,
): EmpoweredSpellApplicationFact | null {
  if (actor?.origin.kind !== "character") {
    return null;
  }
  const empowered = actor.origin.metamagic?.knownOptions.find(
    (option) => option.effectKind === EMPOWERED_METAMAGIC_EFFECT_KIND,
  );
  if (empowered === undefined) {
    return null;
  }
  if (
    metamagicSorceryPointSpendIssue({
      actor,
      applications: [empowered],
    }) !== null
  ) {
    return null;
  }
  return {
    effectKind: EMPOWERED_METAMAGIC_EFFECT_KIND,
    stackingMode: empowered.stackingMode,
    sorceryPointCost: empowered.sorceryPointCost,
  };
}

function empoweredSpellMaximumSelectedDice(
  actor: BattleCreatureState | undefined,
): number {
  return Math.max(
    1,
    actor?.origin.kind === "character"
      ? abilityScoreToMod(actor.origin.d20Statistics.abilityScores.cha)
      : 0,
  );
}

export function seekingSpellCombinedUseIssue(input: {
  readonly actor: BattleCreatureState | undefined;
  readonly castApplications: readonly CharacterBattleMetamagicOptionFact[];
  readonly seekingApplication: CharacterBattleMetamagicOptionFact;
}): string | null {
  const stackingIssue = seekingSpellStackingIssue({
    castApplications: input.castApplications,
    seekingApplication: input.seekingApplication,
  });
  if (stackingIssue !== null) {
    return stackingIssue;
  }
  if (input.actor === undefined) {
    return "Seeking Spell requires a character that knows Seeking Spell and has enough Sorcery Points.";
  }
  return metamagicSorceryPointSpendIssue({
    actor: input.actor,
    applications: [...input.castApplications, input.seekingApplication],
  }) === null
    ? null
    : "Seeking Spell requires enough unexpended Sorcery Points for all Metamagic options used on this spell.";
}

export function seekingSpellMetamagicApplication(
  actor: BattleCreatureState | undefined,
): SeekingSpellApplicationFact | null {
  if (actor?.origin.kind !== "character") {
    return null;
  }
  const seeking = actor.origin.metamagic?.knownOptions.find(
    (option) => option.effectKind === SEEKING_METAMAGIC_EFFECT_KIND,
  );
  if (seeking === undefined) {
    return null;
  }
  if (
    metamagicSorceryPointSpendIssue({
      actor,
      applications: [seeking],
    }) !== null
  ) {
    return null;
  }
  return {
    effectKind: SEEKING_METAMAGIC_EFFECT_KIND,
    stackingMode: seeking.stackingMode,
    sorceryPointCost: seeking.sorceryPointCost,
  };
}

export function spellInvocationHasMagicActionCastingTime(
  invocation: SupportedSpellInvocation,
): boolean {
  if (invocation.procedure === "saveGatedDamage") {
    return invocation.castingTime.kind === "action";
  }
  return (
    !("actionCost" in invocation) || invocation.actionCost === "magicAction"
  );
}

export function spellInvocationSupportsQuickenedActionRewrite(
  invocation: SupportedSpellInvocation,
): invocation is Extract<
  SupportedSpellInvocation,
  { readonly procedure: QuickenedActionRewriteProcedure }
> {
  return (
    quickenedActionRewriteProcedureDisposition(invocation) ===
    "bonusActionRewrite"
  );
}

export function spendSpellMetamagicSorceryPoints(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly applications: readonly CharacterBattleMetamagicOptionFact[];
}): Either.Either<BattleState, string> {
  if (input.applications.length === 0) {
    return Either.right(input.state);
  }
  const actor = input.state.combatants.get(input.actorId);
  if (actor?.origin.kind !== "character") {
    return Either.left(
      "Metamagic selection requires a character with known Metamagic options.",
    );
  }
  const metamagic = actor.origin.metamagic;
  if (metamagic === undefined) {
    return Either.left(
      "Metamagic selection requires a character with known Metamagic options.",
    );
  }
  const resource = actor.origin.resources.find(
    (candidate): candidate is CharacterBattlePointPoolResourceState =>
      candidate.unit.id === metamagic.sorceryPointResourceUnitId &&
      characterBattleResourceIsPointPool(candidate),
  );
  if (resource === undefined) {
    return Either.left("Metamagic requires its shared Sorcery Point resource.");
  }
  const spent = spendCharacterPointPoolResource({
    resource,
    points: metamagicSorceryPointCost(input.applications),
  });
  if (Either.isLeft(spent)) {
    return Either.left("Metamagic requires enough unexpended Sorcery Points.");
  }
  return Either.right({
    ...input.state,
    combatants: new Map(input.state.combatants).set(input.actorId, {
      ...actor,
      origin: {
        ...actor.origin,
        resources: actor.origin.resources.map((candidate) =>
          candidate.unit.id === metamagic.sorceryPointResourceUnitId &&
          characterBattleResourceIsPointPool(candidate)
            ? spent.right
            : candidate,
        ),
      },
    }),
  });
}

function metamagicIssue(message: string): SpellMetamagicAdmissionIssue {
  return { tag: "spellMetamagicAdmissionIssue", message };
}

function hasDuplicateEffectKinds(
  selections: readonly SpellMetamagicSelection[],
): boolean {
  return (
    new Set(selections.map((selection) => selection.effectKind)).size !==
    selections.length
  );
}

function metamagicStackingIssue(
  applications: readonly CharacterBattleMetamagicOptionFact[],
): string | null {
  if (applications.length <= 1) {
    return null;
  }
  const hasStackingException = applications.some(
    (application) =>
      application.stackingMode === "can_combine_with_different_metamagic",
  );
  return applications.length === 2 && hasStackingException
    ? null
    : "A spell can use only one Metamagic option unless one selected option explicitly combines with a different Metamagic option.";
}

function spellMetamagicSupportIssue(input: {
  readonly applications: readonly SpellMetamagicApplicationFact[];
  readonly invocation: SupportedSpellInvocation;
  readonly subject: Pick<SpellMetamagicSubject, "tag" | "mode">;
}): string | null {
  const effectKinds = new Set(
    input.applications.map((option) => option.effectKind),
  );
  if (effectKinds.has(QUICKENED_METAMAGIC_EFFECT_KIND)) {
    if (
      !input.applications.every(
        (application) =>
          application.effectKind === QUICKENED_METAMAGIC_EFFECT_KIND,
      )
    ) {
      return "Selected Metamagic option effect is not supported for this spell procedure.";
    }
    const quickenedSupportIssue = quickenedActionRewriteSupportIssue(
      input.invocation,
    );
    if (quickenedSupportIssue !== null) {
      return quickenedSupportIssue;
    }
    return null;
  }
  if (
    effectKinds.has(DISTANT_METAMAGIC_EFFECT_KIND) ||
    effectKinds.has(EXTENDED_METAMAGIC_EFFECT_KIND) ||
    effectKinds.has(SUBTLE_METAMAGIC_EFFECT_KIND)
  ) {
    const castPropertyIssue = castPropertyMetamagicSupportIssue(
      effectKinds,
      input,
    );
    if (castPropertyIssue === null) {
      return null;
    }
    return castPropertyIssue;
  }
  const damageShapeIssue = damageShapeMetamagicSupportIssue(effectKinds, input);
  if (damageShapeIssue !== null) {
    return damageShapeIssue;
  }
  if (effectKinds.has(TRANSMUTED_METAMAGIC_EFFECT_KIND)) {
    return null;
  }
  if (effectKinds.has(TWINNED_METAMAGIC_EFFECT_KIND)) {
    return null;
  }
  const rerollIssue = rerollMetamagicSupportIssue(effectKinds);
  if (rerollIssue !== null) {
    return rerollIssue;
  }
  return saveMetamagicSupportIssue({
    effectKinds,
    invocation: input.invocation,
    subject: input.subject,
  });
}

function quickenedActionRewriteProcedureDisposition(
  invocation: SupportedSpellInvocation,
): QuickenedActionRewriteProcedureDisposition {
  return quickenedActionRewriteProcedureDispositionTable()[
    invocation.procedure
  ];
}

function quickenedActionRewriteSupportIssue(
  invocation: SupportedSpellInvocation,
): string | null {
  const disposition = quickenedActionRewriteProcedureDisposition(invocation);
  if (disposition === "bonusActionRewrite") {
    return null;
  }
  if (disposition === "actionSpellResolverNotRewritten") {
    return QUICKENED_ACTION_SPELL_PROCEDURE_UNSUPPORTED_MESSAGE;
  }
  return QUICKENED_ACTION_CASTING_TIME_REQUIRED_MESSAGE;
}

function castPropertyMetamagicSupportIssue(
  effectKinds: ReadonlySet<CharacterBattleMetamagicEffectKind>,
  input: {
    readonly applications: readonly SpellMetamagicApplicationFact[];
    readonly invocation: SupportedSpellInvocation;
    readonly subject: Pick<SpellMetamagicSubject, "tag" | "mode">;
  },
): string | null {
  if (effectKinds.has(DISTANT_METAMAGIC_EFFECT_KIND)) {
    return distantSpellRangeProjectionIssue(input);
  }
  if (effectKinds.has(EXTENDED_METAMAGIC_EFFECT_KIND)) {
    return extendedSpellDurationProjectionIssue(input);
  }
  return effectKinds.has(SUBTLE_METAMAGIC_EFFECT_KIND)
    ? subtleSpellComponentProjectionIssue(input)
    : null;
}

function damageShapeMetamagicSupportIssue(
  effectKinds: ReadonlySet<CharacterBattleMetamagicEffectKind>,
  input: {
    readonly applications: readonly SpellMetamagicApplicationFact[];
    readonly invocation: SupportedSpellInvocation;
    readonly subject: Pick<SpellMetamagicSubject, "tag" | "mode">;
  },
): string | null {
  if (effectKinds.has(TRANSMUTED_METAMAGIC_EFFECT_KIND)) {
    return transmutedSpellDamageTypeSubstitutionIssue(input);
  }
  return effectKinds.has(TWINNED_METAMAGIC_EFFECT_KIND)
    ? twinnedSpellTargetCountProjectionIssue(input)
    : null;
}

function metamagicApplicationForSelection(input: {
  readonly application: CharacterBattleMetamagicOptionFact;
  readonly selection: SpellMetamagicSelection;
  readonly invocation: SupportedSpellInvocation;
}): SpellMetamagicApplicationFact | string {
  if (input.application.effectKind === DISTANT_METAMAGIC_EFFECT_KIND) {
    const rangeModifier = distantSpellRangeModifierFact(input.invocation);
    return rangeModifier === null
      ? "Distant Spell is supported only for spell procedures with a Touch range or a distance range of at least 5 feet."
      : {
          effectKind: DISTANT_METAMAGIC_EFFECT_KIND,
          stackingMode: input.application.stackingMode,
          sorceryPointCost: input.application.sorceryPointCost,
          rangeModifier,
        };
  }
  if (input.application.effectKind === EXTENDED_METAMAGIC_EFFECT_KIND) {
    const durationModifier = extendedSpellDurationModifierFact(
      input.invocation,
    );
    return durationModifier === null
      ? "Extended Spell is supported only for spells with a timed or Concentration duration of at least 1 minute."
      : {
          effectKind: EXTENDED_METAMAGIC_EFFECT_KIND,
          stackingMode: input.application.stackingMode,
          sorceryPointCost: input.application.sorceryPointCost,
          durationModifier,
        };
  }
  if (input.application.effectKind === SUBTLE_METAMAGIC_EFFECT_KIND) {
    const componentProjection = subtleSpellComponentProjectionFact(
      input.invocation,
    );
    return componentProjection === null
      ? "Subtle Spell requires at least one Verbal, Somatic, or Material component to project."
      : {
          effectKind: SUBTLE_METAMAGIC_EFFECT_KIND,
          stackingMode: input.application.stackingMode,
          sorceryPointCost: input.application.sorceryPointCost,
          componentProjection,
        };
  }
  if (
    isSpellMetamagicApplicationFactWithoutSelectionPayload(input.application)
  ) {
    return input.application;
  }
  const targetDamageType = transmutedSpellSelectionTargetDamageType([
    input.selection,
  ]);
  return targetDamageType === undefined
    ? "Transmuted Spell requires one selected replacement damage type."
    : {
        effectKind: TRANSMUTED_METAMAGIC_EFFECT_KIND,
        stackingMode: input.application.stackingMode,
        sorceryPointCost: input.application.sorceryPointCost,
        targetDamageType,
      };
}

function rerollMetamagicSupportIssue(
  effectKinds: ReadonlySet<CharacterBattleMetamagicEffectKind>,
): string | null {
  if (effectKinds.has(EMPOWERED_METAMAGIC_EFFECT_KIND)) {
    return EMPOWERED_METAMAGIC_UNSUPPORTED_MESSAGE;
  }
  return effectKinds.has(SEEKING_METAMAGIC_EFFECT_KIND)
    ? SEEKING_METAMAGIC_UNSUPPORTED_MESSAGE
    : null;
}

function quickenedSpellAdmissionIssue(input: {
  readonly state: BattleState;
  readonly actor: BattleCreatureState;
  readonly actorId: CombatantId;
  readonly invocation: SupportedSpellInvocation;
  readonly subject: SpellMetamagicSubject;
}): string | null {
  if (input.subject.tag !== "bonusActionSpell") {
    return "Quickened Spell must use the Bonus Action spell subject.";
  }
  if (!spellInvocationHasMagicActionCastingTime(input.invocation)) {
    return QUICKENED_ACTION_CASTING_TIME_REQUIRED_MESSAGE;
  }
  if (
    combatantHasLevelOnePlusSpellCastThisTurn(
      input.state.currentTurnResources,
      input.actorId,
    )
  ) {
    return "Quickened Spell cannot modify a spell after this turn has already cast a level 1+ spell.";
  }
  return input.actor.origin.kind === "character" &&
    input.actor.origin.metamagic?.knownOptions.some(
      (option) => option.effectKind === QUICKENED_METAMAGIC_EFFECT_KIND,
    )
    ? null
    : "Quickened Spell selection requires the actor to know Quickened Spell.";
}
