// Spell hole construction, fill validation, and damage application extracted from spells-holes-fills.ts.
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-self-transformation-mode
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-warding-bond-linked-effect
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spell-created-held-object
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.passive-saving-throw-roll-mode
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-d20-lifecycle
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-creature-size-change
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-damage-penalty
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-careful-save-protection
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-heightened-save-disadvantage
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-damage-dice-reroll
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spiritual-weapon-attack-proxy
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-slow-active-penalties
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-haste-positive
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.METAMAGIC_CAREFUL_SAVE_PROTECTION BATTLE.FEATURE.METAMAGIC_HEIGHTENED_SAVE_DISADVANTAGE BATTLE.FEATURE.METAMAGIC_EMPOWERED_DAMAGE_DICE_REROLL
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.INDEPENDENT_ATTACK_SEQUENCE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.LINKED_EFFECT_DAMAGE_SHARING
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CONDITION_REMOVAL_AND_PROTECTION
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_D20_LIFECYCLE BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_DAMAGE_PENALTY
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CREATURE_SIZE_CHANGE_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SLOW_ACTIVE_PENALTIES_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.HASTE_POSITIVE_EFFECTS
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MIST_CLOUD_FORM_STATE

import { Match } from "effect";
import {
  holeId,
  holeInstanceKey,
  type AttackRollMode,
  type RolledDiceGroup,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { validateRolledDiceForDiceExpr } from "@dnd/shared-algebras/runtime-dice-algebra";
import { isIncapacitated } from "@dnd/shared-algebras/conditions-algebra";
import {
  damageAmount,
  Hp,
  type Condition,
  type DamageAmount,
  type DieRollResult,
} from "@dnd/shared/types";
import type {
  Ability,
  DamageType,
  SpellRecord,
} from "@dnd/surface/surface/types";
import type { BattleObjectId, CombatantId } from "../identity.ts";
import type {
  PassiveSavingThrowRollModeProfile,
  SupportedUnitFeatureProfile,
} from "../unit-feature-support.ts";
import {
  scalarBuffTemporaryHitPointsExpression,
  spellBurstDamageExpression,
  spellDamageComponents,
  spellDamageExpression,
  spellHealingExpression,
} from "./spell-effects.ts";
import {
  addDamageAmountForType,
  applyAvailableSourceDamageRollPenalty,
  applyAvailableSpellDamageReduction,
  damageAmountAfterTargetAdjustments,
  damageAmountByTypeEntriesToMap,
  damageAmountByTypeAfterTargetAdjustments,
  damageAmountByTypeMapEntries,
} from "./damage-helpers.ts";
import { applyBattleHitPointDamage } from "./damage-apply.ts";
import {
  attackRollMissToHitReplacementHolePayload,
  signedModifier,
} from "./statblock-attacks.ts";
import { hasDodgeBenefit } from "./attack-roll.ts";
import { spellTargetHasNonSpatialPrerequisites } from "./spells-targeting.ts";
import { combatantsAreEnemies } from "./creature-state-leaves.ts";
import { battleCreatureType } from "./domain-helpers.ts";
import { uniqueSavingThrowRollModeProjections } from "./saving-throw-roll-mode-projections.ts";
import {
  ATTACK_ROLL_HOLE_ID,
  ATTACK_ROLL_HOLE_INSTANCE,
  attackDamageAbilityModifierChoiceUnsupportedIssue,
  attackDamageDieFloorChoiceUnsupportedIssue,
  spellDamageRerollUnsupportedIssue,
  type BattleActiveEffect,
  type BattleAttackDamageDisposition,
  type BattleCreatureState,
  type BattleFill,
  type BattleHoleId,
  type BattleObjectDamageDisposition,
  type BattleObjectDamageOutcome,
  type BattleSavingThrowFlatBonusProjection,
  type BattleSavingThrowRollModeProjection,
  type BattleSpellAttackRollHole,
  type BattleSpellAbilityChoiceHole,
  type BattleSpellDamageRollHole,
  type BattleSpellDamageTypeChoiceHole,
  type BattleSpellConditionChoiceHole,
  type BattleSpellHealingRollHole,
  type BattleSpellSavingThrowOutcomeHole,
  type BattleSpellSkillChoiceHole,
  type BattleSpellTargetAbilityChoicesHole,
  type BattleThaumaturgyActiveOneMinuteEffectCountHole,
  type BattleSpellTargetAllocation,
  type BattleSpellTargetListHole,
  type BattleState,
  type BattleTargetChoiceHole,
  type BattleTargetSpatialFact,
  spellAttackDamagePayloadIsResolved,
  type SaveDamageResult,
  type SpellMarkedDamageRider,
  type SpellTargeting,
  type SpellFailedSaveConditionChoiceEffect,
  type SupportedDamageSpellInvocation,
  type SupportedSpellInvocation,
  validateRolledDiceFillForDiceExpr,
} from "../battle-reducer.ts";
import {
  SLOW_ACTIVE_PENALTIES_DEX_SAVE_DELTA,
  THAUMATURGY_ACTIVE_ONE_MINUTE_EFFECT_COUNT_HOLE_ID,
  THAUMATURGY_ACTIVE_ONE_MINUTE_EFFECT_COUNT_HOLE_INSTANCE,
  THAUMATURGY_MAX_ACTIVE_ONE_MINUTE_EFFECTS,
} from "./domain-constants.ts";
import { spellAttackSequencePartName } from "./spells-profile-shared.ts";
import { wardingBondSavingThrowFlatBonusProjectionsForTarget } from "./warding-bond.ts";
import { MIST_CLOUD_FORM_SAVING_THROW_ADVANTAGE } from "./mist-cloud-form-facts.ts";
import {
  activeCreatureSizeChangeEffect,
  creatureSizeChangeStrengthRollMode,
} from "./creature-size-change-effects.ts";

const OBJECT_DAMAGE_IMMUNITIES = [
  "poison",
  "psychic",
] as const satisfies ReadonlyArray<DamageType>;

type SpellAttackDamageInvocationWithMaxDieAdditionalDiceLimit = Extract<
  SupportedDamageSpellInvocation,
  { readonly procedure: "spellAttackDamage" }
> & {
  readonly damage: {
    readonly kind: "selectedSorcerousBurstDamage";
    readonly maxDieAdditionalDiceLimit: number;
  };
};

type SpellObjectDamageInvocation =
  | Extract<
      SupportedSpellInvocation,
      { readonly procedure: "heldLightHurl" | "spellAttackSequence" }
    >
  | Extract<
      SupportedDamageSpellInvocation,
      { readonly procedure: "saveGatedDamage" | "spellAttackDamage" }
    >;

export function spellAttackRollHole(
  state: BattleState,
  attackerId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    {
      readonly procedure:
        | "attackBurstSaveDamage"
        | "heldLightHurl"
        | "spellCreatedHeldObjectAttack"
        | "spiritualWeaponAttackProxy"
        | "spiritualWeaponRepeatAttack"
        | "spellAttackDamage";
    }
  >,
  rollMode?: AttackRollMode,
): BattleSpellAttackRollHole {
  return {
    ...spellAttackRollHoleBase(invocation, rollMode),
    ...attackRollMissToHitReplacementHolePayload(state, attackerId),
  };
}

export function spellAttackSequencePartAttackRollHole(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spellAttackSequence" }
  >,
  partIndex: number,
  rollMode?: AttackRollMode,
): BattleSpellAttackRollHole {
  const protocolId = spellAttackSequencePartAttackRollProtocolId(
    invocation,
    partIndex,
  );
  const partName = spellAttackSequencePartName();
  return {
    kind: "attackRoll",
    holeId: holeId(protocolId),
    holeInstanceKey: holeInstanceKey(protocolId),
    label: `${invocation.spell.name} ${partName} ${partIndex + 1} spell attack roll`,
    spell: invocation,
    attackBonus: invocation.attackBonus,
    ...(rollMode === undefined ? {} : { rollMode }),
  };
}

export function spellAttackSequencePartAttackRollHoleId(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spellAttackSequence" }
  >,
  partIndex: number,
): BattleHoleId {
  return holeId(
    spellAttackSequencePartAttackRollProtocolId(invocation, partIndex),
  );
}

function spellAttackSequencePartAttackRollProtocolId(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spellAttackSequence" }
  >,
  partIndex: number,
): string {
  return `battle:spell:attack-sequence-part-attack-roll:${invocation.spell.id}:${partIndex}`;
}

export function spellObjectAttackRollHole(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "heldLightHurl" | "spellAttackDamage" }
  >,
  rollMode?: AttackRollMode,
): BattleSpellAttackRollHole {
  return spellAttackRollHoleBase(invocation, rollMode);
}

function spellAttackRollHoleBase(
  invocation: Extract<
    SupportedSpellInvocation,
    {
      readonly procedure:
        | "attackBurstSaveDamage"
        | "heldLightHurl"
        | "spellCreatedHeldObjectAttack"
        | "spiritualWeaponAttackProxy"
        | "spiritualWeaponRepeatAttack"
        | "spellAttackDamage";
    }
  >,
  rollMode?: AttackRollMode,
): BattleSpellAttackRollHole {
  return {
    kind: "attackRoll",
    holeId: ATTACK_ROLL_HOLE_ID,
    holeInstanceKey: ATTACK_ROLL_HOLE_INSTANCE,
    label: `${invocation.spell.name} spell attack roll`,
    spell: invocation,
    attackBonus: invocation.attackBonus,
    ...(rollMode === undefined ? {} : { rollMode }),
  };
}

export function spellDamageTypeChoiceHole(
  invocation: Extract<
    SupportedSpellInvocation,
    {
      readonly procedure:
        | "chainedSpellAttackDamage"
        | "chosenDamageResistance"
        | "damageReduction"
        | "dragonsBreathInitial"
        | "selfTransformationMode"
        | "spellAttackDamage"
        | "spellHostedWeaponAttack";
    }
  >,
): BattleSpellDamageTypeChoiceHole {
  const protocolId =
    invocation.procedure === "spellHostedWeaponAttack"
      ? `battle:spell:damage-type:${invocation.spell.id}:${invocation.componentWeapon.itemId}`
      : `battle:spell:damage-type:${invocation.spell.id}`;
  const choices =
    invocation.procedure === "selfTransformationMode"
      ? invocation.naturalWeaponFacts.damage.damageTypeChoices
      : invocation.procedure === "spellAttackDamage"
        ? invocation.damage.kind === "sorcerousBurstDamageTypeChoice"
          ? invocation.damage.damageTypeChoices
          : []
        : invocation.damageTypeChoices;
  return {
    kind: "damageTypeChoice",
    holeId: holeId(protocolId),
    holeInstanceKey: holeInstanceKey(protocolId),
    label: `${invocation.spell.name} damage type`,
    spell: invocation,
    choices,
  };
}

export type SaveGatedConditionChoiceInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "saveGatedCondition" }
> & {
  readonly effect: SpellFailedSaveConditionChoiceEffect;
};
export type SpellConditionChoiceInvocation =
  | SaveGatedConditionChoiceInvocation
  | Extract<
      SupportedSpellInvocation,
      { readonly procedure: "directConditionRemoval" }
    >;

export function saveGatedConditionHasConditionChoice(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "saveGatedCondition" }
  >,
): invocation is SaveGatedConditionChoiceInvocation {
  return invocation.effect.kind === "choice";
}

export function spellInvocationHasConditionChoice(
  invocation: SupportedSpellInvocation,
): invocation is SpellConditionChoiceInvocation {
  return (
    (invocation.procedure === "saveGatedCondition" &&
      saveGatedConditionHasConditionChoice(invocation)) ||
    invocation.procedure === "directConditionRemoval"
  );
}

export function spellConditionChoices(
  invocation: SpellConditionChoiceInvocation,
): readonly [Condition, ...Condition[]] {
  return invocation.procedure === "saveGatedCondition"
    ? invocation.effect.choices
    : invocation.conditionChoices;
}

export function spellConditionChoiceHole(
  invocation: SpellConditionChoiceInvocation,
): BattleSpellConditionChoiceHole {
  const protocolId = spellConditionChoiceHoleProtocolId(invocation);
  return {
    kind: "conditionChoice",
    holeId: holeId(protocolId),
    holeInstanceKey: holeInstanceKey(protocolId),
    label: `${invocation.spell.name} condition`,
    spell: invocation,
    choices: spellConditionChoices(invocation),
  };
}

export function spellConditionChoiceHoleId(
  invocation: SpellConditionChoiceInvocation,
): BattleHoleId {
  return holeId(spellConditionChoiceHoleProtocolId(invocation));
}

function spellConditionChoiceHoleProtocolId(
  invocation: SpellConditionChoiceInvocation,
): string {
  return `battle:spell:condition-choice:${invocation.spell.id}`;
}

export function chainedSpellTargetHole(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "chainedSpellAttackDamage" }
  >;
  readonly stepIndex: number;
  readonly targeted: readonly CombatantId[];
}): BattleTargetChoiceHole {
  const protocolId = chainedSpellTargetProtocolId(
    input.invocation,
    input.stepIndex,
  );
  const targeted = new Set(input.targeted);
  return {
    kind: "targetChoice",
    holeId: holeId(protocolId),
    holeInstanceKey: holeInstanceKey(protocolId),
    label:
      input.stepIndex === 0
        ? `${input.invocation.spell.name} target`
        : `${input.invocation.spell.name} leap target ${input.stepIndex}`,
    requiresTableSpatialFact: true,
    choices: [...input.state.combatants.keys()].filter(
      (targetId) =>
        !targeted.has(targetId) &&
        spellTargetHasNonSpatialPrerequisites(
          input.state,
          input.actorId,
          targetId,
          input.invocation,
        ),
    ),
  };
}

export function chainedSpellAttackRollHole(
  state: BattleState,
  attackerId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "chainedSpellAttackDamage" }
  >,
  stepIndex: number,
  rollMode?: AttackRollMode,
): BattleSpellAttackRollHole {
  const protocolId = chainedSpellAttackRollProtocolId(invocation, stepIndex);
  return {
    kind: "attackRoll",
    holeId: holeId(protocolId),
    holeInstanceKey: holeInstanceKey(protocolId),
    label: `${invocation.spell.name} spell attack roll ${stepIndex + 1}`,
    spell: invocation,
    attackBonus: invocation.attackBonus,
    ...(rollMode === undefined ? {} : { rollMode }),
    ...attackRollMissToHitReplacementHolePayload(state, attackerId),
  };
}

export function chainedSpellDamageRollHole(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "chainedSpellAttackDamage" }
  >,
  damageType: DamageType,
  step: { readonly stepIndex: number; readonly critical: boolean },
): BattleSpellDamageRollHole {
  const protocolId = chainedSpellDamageRollProtocolId(
    invocation,
    step.stepIndex,
    step.critical,
  );
  const expr = chainedSpellDamageExpression(
    invocation,
    damageType,
    step.critical,
  );
  return {
    kind: "rolledDice",
    holeId: holeId(protocolId),
    holeInstanceKey: holeInstanceKey(protocolId),
    label: `${invocation.spell.name} damage ${step.stepIndex + 1} (${expr})`,
    spell: invocation,
    critical: step.critical,
  };
}

export function chainedSpellTargetHoleId(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "chainedSpellAttackDamage" }
  >,
  stepIndex: number,
): BattleHoleId {
  return holeId(chainedSpellTargetProtocolId(invocation, stepIndex));
}

export function chainedSpellAttackRollHoleId(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "chainedSpellAttackDamage" }
  >,
  stepIndex: number,
): BattleHoleId {
  return holeId(chainedSpellAttackRollProtocolId(invocation, stepIndex));
}

export function chainedSpellDamageRollHoleId(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "chainedSpellAttackDamage" }
  >,
  stepIndex: number,
  critical: boolean,
): BattleHoleId {
  return holeId(
    chainedSpellDamageRollProtocolId(invocation, stepIndex, critical),
  );
}

export function chainedSpellTargetProtocolId(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "chainedSpellAttackDamage" }
  >,
  stepIndex: number,
): string {
  return `battle:spell:chained-target:${invocation.spell.id}:${stepIndex}`;
}

export function chainedSpellAttackRollProtocolId(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "chainedSpellAttackDamage" }
  >,
  stepIndex: number,
): string {
  return `battle:spell:chained-attack-roll:${invocation.spell.id}:${stepIndex}`;
}

export function chainedSpellDamageRollProtocolId(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "chainedSpellAttackDamage" }
  >,
  stepIndex: number,
  critical: boolean,
): string {
  return `battle:spell:chained-damage:${invocation.spell.id}:${stepIndex}:${critical ? "critical" : "normal"}`;
}

export function chainedSpellDamageExpression(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "chainedSpellAttackDamage" }
  >,
  damageType: DamageType,
  critical: boolean,
): string {
  const dice = invocation.damage.expr.dice * (critical ? 2 : 1);
  return `${dice}d${invocation.damage.expr.dieSize}${signedModifier(invocation.damage.expr.flat ?? 0)}-${damageType}`;
}

export function chainedSpellLeapTargetIsLegal(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "chainedSpellAttackDamage" }
  >,
  previousTargetId: CombatantId | undefined,
  targetId: CombatantId,
  facts: readonly BattleTargetSpatialFact[],
): boolean {
  return (
    previousTargetId !== undefined &&
    previousTargetId !== targetId &&
    facts.some(
      (fact) =>
        fact.kind === "spellLeapTargetWithinRange" &&
        fact.previousTargetId === previousTargetId &&
        fact.targetId === targetId &&
        fact.spellId === invocation.spell.id &&
        fact.rangeFeet === invocation.leapRangeFeet,
    )
  );
}

export function spellDamageTypes(
  invocation: Extract<
    SupportedSpellInvocation,
    {
      readonly procedure:
        | "heldLightHurl"
        | "spellCreatedHeldObjectAttack"
        | "spellAttackSequence"
        | "spiritualWeaponAttackProxy"
        | "spiritualWeaponRepeatAttack"
        | "spellAttackDamage";
    }
  >,
): readonly DamageType[] {
  if (invocation.procedure === "spellAttackDamage") {
    return spellAttackDamagePayloadIsResolved(invocation.damage)
      ? [invocation.damage.damageType]
      : invocation.damage.damageTypeChoices;
  }
  return [invocation.damage.damageType];
}

export function spellDamageHole(
  invocation: SupportedDamageSpellInvocation,
  critical = false,
  spellMarkedDamageRiders: readonly SpellMarkedDamageRider[] = [],
): BattleSpellDamageRollHole {
  const expr = spellDamageExpression(
    invocation,
    critical,
    spellMarkedDamageRiders,
  );
  return {
    kind: "rolledDice",
    holeId: holeId(`battle:spell:damage-result:${invocation.spell.id}:${expr}`),
    holeInstanceKey: holeInstanceKey(
      `battle:spell:damage-result:${invocation.spell.id}:${expr}`,
    ),
    label: `${invocation.spell.name} damage (${expr})`,
    spell: invocation,
    critical,
    ...(spellMarkedDamageRiders.length === 0
      ? {}
      : { spellMarkedDamageRiders }),
  };
}

export function spellAttackSequencePartDamageHole(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spellAttackSequence" }
  >,
  partIndex: number,
  critical = false,
  spellMarkedDamageRiders: readonly SpellMarkedDamageRider[] = [],
): BattleSpellDamageRollHole {
  const expr = spellDamageExpression(
    invocation,
    critical,
    spellMarkedDamageRiders,
  );
  const protocolId = spellAttackSequencePartDamageProtocolId(
    invocation,
    partIndex,
    critical,
  );
  const partName = spellAttackSequencePartName();
  return {
    kind: "rolledDice",
    holeId: holeId(protocolId),
    holeInstanceKey: holeInstanceKey(protocolId),
    label: `${invocation.spell.name} ${partName} ${partIndex + 1} damage (${expr})`,
    spell: invocation,
    critical,
    ...(spellMarkedDamageRiders.length === 0
      ? {}
      : { spellMarkedDamageRiders }),
  };
}

export function spellAttackSequencePartDamageHoleId(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spellAttackSequence" }
  >,
  partIndex: number,
  critical: boolean,
): BattleHoleId {
  return holeId(
    spellAttackSequencePartDamageProtocolId(invocation, partIndex, critical),
  );
}

function spellAttackSequencePartDamageProtocolId(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spellAttackSequence" }
  >,
  partIndex: number,
  critical: boolean,
): string {
  return `battle:spell:attack-sequence-part-damage:${invocation.spell.id}:${partIndex}:${critical ? "critical" : "normal"}`;
}

export function spellBurstDamageHole(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "attackBurstSaveDamage" }
  >,
): BattleSpellDamageRollHole {
  const expr = spellBurstDamageExpression(invocation);
  return {
    kind: "rolledDice",
    holeId: holeId(
      `battle:spell:burst-damage-result:${invocation.spell.id}:${expr}`,
    ),
    holeInstanceKey: holeInstanceKey(
      `battle:spell:burst-damage-result:${invocation.spell.id}:${expr}`,
    ),
    label: `${invocation.spell.name} burst damage (${expr})`,
    spell: invocation,
    critical: false,
  };
}

export function spellHealingRollHole(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "directHitPointRestoration" }
  >,
): BattleSpellHealingRollHole {
  const expr = spellHealingExpression(invocation);
  return {
    kind: "rolledDice",
    holeId: holeId(
      `battle:spell:healing-result:${invocation.spell.id}:${expr}`,
    ),
    holeInstanceKey: holeInstanceKey(
      `battle:spell:healing-result:${invocation.spell.id}:${expr}`,
    ),
    label: `${invocation.spell.name} healing (${expr})`,
    spell: invocation,
  };
}

export function spellScalarBuffRollHole(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "scalarBuff" }
  >,
): BattleSpellHealingRollHole {
  const expr = scalarBuffTemporaryHitPointsExpression(invocation);
  return {
    kind: "rolledDice",
    holeId: holeId(
      `battle:spell:scalar-buff-result:${invocation.spell.id}:${expr}`,
    ),
    holeInstanceKey: holeInstanceKey(
      `battle:spell:scalar-buff-result:${invocation.spell.id}:${expr}`,
    ),
    label: `${invocation.spell.name} Temporary Hit Points (${expr})`,
    spell: invocation,
  };
}

export function spellRollModifierSkillChoiceHoleId(
  invocation: SupportedSpellInvocation,
): BattleHoleId {
  return holeId(`battle:spell:skill-choice:${invocation.spell.id}`);
}

export function spellRollModifierSkillChoiceHole(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "rollModifier" }
  >,
): BattleSpellSkillChoiceHole {
  return {
    kind: "skillChoice",
    holeId: spellRollModifierSkillChoiceHoleId(invocation),
    holeInstanceKey: holeInstanceKey(
      `battle:spell:skill-choice:${invocation.spell.id}`,
    ),
    label: `${invocation.spell.name} skill`,
    spell: invocation,
    choices: invocation.skillChoices ?? [],
  };
}

export function spellRollModifierAbilityChoiceHoleId(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "rollModifier" }
  >,
): BattleHoleId {
  return holeId(`battle:spell:ability-choice:${invocation.spell.id}`);
}

export function spellRollModifierAbilityChoiceHole(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "rollModifier" }
  >,
): BattleSpellAbilityChoiceHole {
  return {
    kind: "abilityChoice",
    holeId: spellRollModifierAbilityChoiceHoleId(invocation),
    holeInstanceKey: holeInstanceKey(
      `battle:spell:ability-choice:${invocation.spell.id}`,
    ),
    label: `${invocation.spell.name} ability`,
    spell: invocation,
    choices: invocation.abilityChoices ?? [],
  };
}

export function rollModifierUsesTargetAbilityChoices(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "rollModifier" }
  >,
): boolean {
  return (
    invocation.abilityChoices !== null &&
    invocation.abilityChoiceApplication === "perTarget" &&
    invocation.targeting.kind === "targetList" &&
    typeof invocation.targeting.maxTargets === "number" &&
    invocation.targeting.maxTargets > 1
  );
}

export function spellRollModifierTargetAbilityChoicesHoleId(
  invocation: SupportedSpellInvocation,
): BattleHoleId {
  return holeId(`battle:spell:target-ability-choices:${invocation.spell.id}`);
}

export function spellRollModifierTargetAbilityChoicesHole(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "rollModifier" }
  >,
): BattleSpellTargetAbilityChoicesHole {
  return {
    kind: "targetAbilityChoices",
    holeId: spellRollModifierTargetAbilityChoicesHoleId(invocation),
    holeInstanceKey: holeInstanceKey(
      `battle:spell:target-ability-choices:${invocation.spell.id}`,
    ),
    label: `${invocation.spell.name} abilities by target`,
    spell: invocation,
    choices: invocation.abilityChoices ?? [],
  };
}

export function spellAbilityChoiceHoleId(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "markedDamageRider"; readonly action: "cast" }
  >,
): BattleHoleId {
  return holeId(`battle:spell:ability-choice:${invocation.spell.id}`);
}

export function spellAbilityChoiceHole(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "markedDamageRider"; readonly action: "cast" }
  >,
): BattleSpellAbilityChoiceHole {
  return {
    kind: "abilityChoice",
    holeId: spellAbilityChoiceHoleId(invocation),
    holeInstanceKey: holeInstanceKey(
      `battle:spell:ability-choice:${invocation.spell.id}`,
    ),
    label: `${invocation.spell.name} ability`,
    spell: invocation,
    choices:
      invocation.abilityCheckBehavior.kind === "chosenAbilityDisadvantage"
        ? invocation.abilityCheckBehavior.choices
        : [],
  };
}

export function thaumaturgyActiveOneMinuteEffectCountHole(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "thaumaturgyBoomingVoice" }
  >,
): BattleThaumaturgyActiveOneMinuteEffectCountHole {
  return {
    kind: "thaumaturgyActiveOneMinuteEffectCount",
    holeId: THAUMATURGY_ACTIVE_ONE_MINUTE_EFFECT_COUNT_HOLE_ID,
    holeInstanceKey: THAUMATURGY_ACTIVE_ONE_MINUTE_EFFECT_COUNT_HOLE_INSTANCE,
    label: `${invocation.spell.name} total active 1-minute effects`,
    spell: invocation,
    maximumActiveOneMinuteEffects: THAUMATURGY_MAX_ACTIVE_ONE_MINUTE_EFFECTS,
    requiresTableSpellEffectCount: true,
  };
}

export function spellSavingThrowOutcomeHoleId(
  invocation: SupportedSpellInvocation,
): BattleHoleId {
  return holeId(`battle:spell:saving-throw-outcome:${invocation.spell.id}`);
}

export function spellSavingThrowOutcomeHole(
  state: BattleState,
  actorId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    {
      readonly procedure:
        | "attackBurstSaveDamage"
        | "abilityD20TestRollModeSaveGate"
        | "afterHitSaveGatedCondition"
        | "rollModifier"
        | "creatureSizeIncrease"
        | "creatureSizeDecrease"
        | "levitatedCreature"
        | "saveGatedDamage"
        | "saveGatedCondition"
        | "saveGatedConditionImmunity"
        | "saveGatedAttackRollAdvantage"
        | "counterspell"
        | "sleepTargetAdmission"
        | "hideousLaughter"
        | "hypnoticPattern"
        | "slowActivePenalties"
        | "command"
        | "greaseGroundHazard"
        | "gustOfWindLine";
    }
  >,
  heightenedSpellTargetId?: CombatantId,
): BattleSpellSavingThrowOutcomeHole {
  const holeKey = `battle:spell:saving-throw-outcome:${invocation.spell.id}`;
  const ability =
    invocation.procedure === "attackBurstSaveDamage"
      ? invocation.burst.ability
      : invocation.procedure === "rollModifier"
        ? (invocation.saveGate?.ability ?? "cha")
        : invocation.ability;
  return {
    kind: "savingThrowOutcome",
    holeId: spellSavingThrowOutcomeHoleId(invocation),
    holeInstanceKey: holeInstanceKey(holeKey),
    label: (() => {
      if (invocation.procedure === "rollModifier") {
        return `${invocation.spell.name} Saving Throw outcomes`;
      }
      const targeting = spellSavingThrowTargeting(invocation);
      return targeting.kind === "singleCombatant"
        ? `${invocation.spell.name} Saving Throw outcome`
        : targeting.kind === "singleCreatureOrObject"
          ? `${invocation.spell.name} Saving Throw outcome`
          : `${invocation.spell.name} ${spellAreaTargetingLabel(targeting)} Saving Throw outcomes`;
    })(),
    spell: invocation,
    ability,
    dc:
      invocation.procedure === "attackBurstSaveDamage"
        ? invocation.burst.dc
        : invocation.procedure === "rollModifier"
          ? (invocation.saveGate?.dc ?? { kind: "caster_spell_save_dc" })
          : invocation.dc,
    areaChoices: [],
    targetRollModes: savingThrowRollModeProjections(
      state,
      ability,
      invocation.procedure === "saveGatedCondition" ||
        invocation.procedure === "saveGatedDamage"
        ? {
            actorId,
            invocation,
            ...(invocation.procedure === "saveGatedCondition" &&
            invocation.effect.kind === "fixed"
              ? { condition: invocation.effect.condition }
              : {}),
          }
        : undefined,
      heightenedRollModeProjection(heightenedSpellTargetId),
    ),
    targetFlatBonuses: savingThrowFlatBonusProjections(state, ability),
  };
}

function heightenedRollModeProjection(
  heightenedSpellTargetId: CombatantId | undefined,
): BattleSavingThrowRollModeProjection | undefined {
  return heightenedSpellTargetId === undefined
    ? undefined
    : {
        targetId: heightenedSpellTargetId,
        rollMode: "disadvantage",
      };
}

export function carefulSpellProtectedTargetsHoleId(
  invocation: SupportedSpellInvocation,
): BattleHoleId {
  return holeId(
    `battle:spell:careful-spell:protected-targets:${invocation.spell.id}`,
  );
}

export function carefulSpellProtectedTargetsHole(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleSpellTargetListHole["spell"],
): BattleSpellTargetListHole {
  const actor = state.combatants.get(actorId);
  const maxProtectedTargets =
    actor?.origin.kind === "character" &&
    actor.origin.spellcasting !== undefined
      ? Math.max(
          1,
          Number(actor.origin.spellcasting.spellcastingAbilityModifier),
        )
      : 1;
  return {
    kind: "spellTargetList",
    holeId: carefulSpellProtectedTargetsHoleId(invocation),
    holeInstanceKey: holeInstanceKey(
      `battle:spell:careful-spell:protected-targets:${invocation.spell.id}`,
    ),
    label: `${invocation.spell.name} Careful Spell protected targets`,
    spell: invocation,
    minTargets: 1,
    maxTargets: maxProtectedTargets,
    choices: [...state.combatants.keys()].filter(
      (targetId) => targetId !== actorId,
    ),
    requiresTableSpatialFact: true,
  };
}

export function heightenedSpellTargetChoiceHoleId(
  invocation: SupportedSpellInvocation,
): BattleHoleId {
  return holeId(`battle:spell:heightened-spell:target:${invocation.spell.id}`);
}

export function heightenedSpellTargetChoiceHole(
  state: BattleState,
  actorId: CombatantId,
  invocation: SupportedSpellInvocation,
): BattleTargetChoiceHole {
  return {
    kind: "targetChoice",
    holeId: heightenedSpellTargetChoiceHoleId(invocation),
    holeInstanceKey: holeInstanceKey(
      `battle:spell:heightened-spell:target:${invocation.spell.id}`,
    ),
    label: `${invocation.spell.name} Heightened Spell target`,
    choices: [...state.combatants.keys()].filter(
      (targetId) => targetId !== actorId,
    ),
  };
}

export function spellSavingThrowAbility(
  invocation: Extract<
    SupportedSpellInvocation,
    {
      readonly procedure:
        | "attackBurstSaveDamage"
        | "abilityD20TestRollModeSaveGate"
        | "afterHitSaveGatedCondition"
        | "rollModifier"
        | "saveGatedDamage"
        | "creatureSizeIncrease"
        | "creatureSizeDecrease"
        | "levitatedCreature"
        | "saveGatedCondition"
        | "saveGatedConditionImmunity"
        | "saveGatedAttackRollAdvantage"
        | "counterspell"
        | "sleepTargetAdmission"
        | "hideousLaughter"
        | "hypnoticPattern"
        | "command"
        | "greaseGroundHazard"
        | "gustOfWindLine"
        | "slowActivePenalties";
    }
  >,
): Ability {
  if (invocation.procedure === "attackBurstSaveDamage") {
    return invocation.burst.ability;
  }
  if (invocation.procedure === "rollModifier") {
    return invocation.saveGate?.ability ?? "cha";
  }
  return invocation.ability;
}

export function spellSavingThrowTargeting(
  invocation: Extract<
    SupportedSpellInvocation,
    {
      readonly procedure:
        | "attackBurstSaveDamage"
        | "abilityD20TestRollModeSaveGate"
        | "afterHitSaveGatedCondition"
        | "saveGatedDamage"
        | "creatureSizeIncrease"
        | "creatureSizeDecrease"
        | "levitatedCreature"
        | "saveGatedCondition"
        | "saveGatedConditionImmunity"
        | "saveGatedAttackRollAdvantage"
        | "counterspell"
        | "sleepTargetAdmission"
        | "hideousLaughter"
        | "hypnoticPattern"
        | "command"
        | "greaseGroundHazard"
        | "gustOfWindLine"
        | "slowActivePenalties";
    }
  >,
): SpellTargeting {
  return invocation.procedure === "counterspell"
    ? { kind: "singleCombatant" }
    : invocation.procedure === "attackBurstSaveDamage"
      ? invocation.burst.targeting
      : invocation.targeting;
}

export function spellAreaTargetingLabel(
  targeting: Exclude<
    SpellTargeting,
    { readonly kind: "singleCombatant" | "singleCreatureOrObject" }
  >,
): string {
  return Match.value(targeting).pipe(
    Match.when({ kind: "pointOriginSphere" }, () => "point-origin Sphere"),
    Match.when(
      { kind: "pointOriginSphereDiameter" },
      () => "point-origin Sphere",
    ),
    Match.when(
      { kind: "pointOriginCubeExcludingCaster" },
      () => "point-origin Cube",
    ),
    Match.when({ kind: "pointOriginCube" }, () => "point-origin Cube"),
    Match.when({ kind: "selfOriginCube" }, () => "self-origin Cube"),
    Match.when({ kind: "selfOriginCone" }, () => "self-origin Cone"),
    Match.when({ kind: "selfOriginLine" }, () => "self-origin Line"),
    Match.when({ kind: "selfOriginEmanation" }, () => "self-origin Emanation"),
    Match.when(
      { kind: "primaryTargetOriginEmanation" },
      () => "primary-target-origin Emanation",
    ),
    Match.when({ kind: "pointOriginCylinder" }, () => "point-origin Cylinder"),
    Match.when({ kind: "targetList" }, () => "target-list"),
    Match.exhaustive,
  );
}

export function savingThrowRollModeProjections(
  state: BattleState,
  ability: Ability,
  rollModeContext?: SavingThrowRollModeContext,
  extraProjection?: BattleSavingThrowRollModeProjection,
): readonly BattleSavingThrowRollModeProjection[] {
  const dodgeProjections =
    ability === "dex"
      ? [...state.combatants]
          .filter(([, target]) => hasDodgeBenefit(state, target))
          .map(([targetId]) => ({
            targetId,
            rollMode: "advantage" as const,
          }))
      : [];
  const passiveRollModeProjections = passiveSavingThrowRollModeProjections(
    state,
    ability,
    rollModeContext?.condition,
  );
  const baseProjections = [
    ...dodgeProjections,
    ...passiveRollModeProjections,
    ...activeAbilityD20TestSavingThrowRollModeProjections(state, ability),
    ...activeSavingThrowRollModeProjections(state, ability),
    ...creatureSizeChangeSavingThrowRollModeProjections(state, ability),
    ...conditionSavingThrowRollModeProjections(
      state,
      rollModeContext?.condition,
    ),
  ];
  const saveRollModeRule =
    rollModeContext === undefined || !("invocation" in rollModeContext)
      ? undefined
      : rollModeContext.invocation.saveRollModeRule;
  if (
    rollModeContext !== undefined &&
    "invocation" in rollModeContext &&
    saveRollModeRule?.kind === "hostileTarget"
  ) {
    const { actorId, invocation } = rollModeContext;
    return uniqueSavingThrowRollModeProjections([
      ...baseProjections,
      ...[...state.combatants]
        .filter(
          ([targetId]) =>
            combatantsAreEnemies(state, actorId, targetId) &&
            spellTargetHasNonSpatialPrerequisites(
              state,
              actorId,
              targetId,
              invocation,
            ),
        )
        .map(([targetId]) => ({
          targetId,
          rollMode: saveRollModeRule.mode,
        })),
      ...(extraProjection === undefined ? [] : [extraProjection]),
    ]);
  }
  if (
    rollModeContext !== undefined &&
    "invocation" in rollModeContext &&
    saveRollModeRule?.kind === "creatureType"
  ) {
    const { actorId, invocation } = rollModeContext;
    return uniqueSavingThrowRollModeProjections([
      ...baseProjections,
      ...[...state.combatants]
        .filter(
          ([, target]) =>
            battleCreatureType(target) === saveRollModeRule.creatureType,
        )
        .filter(([targetId]) =>
          spellTargetHasNonSpatialPrerequisites(
            state,
            actorId,
            targetId,
            invocation,
          ),
        )
        .map(([targetId]) => ({
          targetId,
          rollMode: saveRollModeRule.mode,
        })),
      ...(extraProjection === undefined ? [] : [extraProjection]),
    ]);
  }
  return uniqueSavingThrowRollModeProjections([
    ...baseProjections,
    ...(extraProjection === undefined ? [] : [extraProjection]),
  ]);
}

type SavingThrowRollModeContext =
  | {
      readonly condition: Condition;
    }
  | {
      readonly actorId: CombatantId;
      readonly invocation: Extract<
        SupportedSpellInvocation,
        { readonly procedure: "saveGatedCondition" | "saveGatedDamage" }
      >;
      readonly condition?: Condition;
    };

function creatureSizeChangeSavingThrowRollModeProjections(
  state: BattleState,
  ability: Ability,
): readonly BattleSavingThrowRollModeProjection[] {
  if (ability !== "str") {
    return [];
  }
  return [...state.combatants].flatMap(([targetId, target]) => {
    const effect = activeCreatureSizeChangeEffect(target);
    return effect === null
      ? []
      : [{ targetId, rollMode: creatureSizeChangeStrengthRollMode(effect) }];
  });
}

function conditionSavingThrowRollModeProjections(
  state: BattleState,
  condition: Condition | undefined,
): readonly BattleSavingThrowRollModeProjection[] {
  if (condition === undefined) {
    return [];
  }
  return [...state.combatants].flatMap(([targetId, target]) =>
    target.activeEffects
      .filter(
        (
          effect,
        ): effect is Extract<
          BattleActiveEffect,
          { readonly kind: "conditionSavingThrowRollMode" }
        > =>
          effect.kind === "conditionSavingThrowRollMode" &&
          effect.condition === condition,
      )
      .map((effect) => ({ targetId, rollMode: effect.mode })),
  );
}

function activeSavingThrowRollModeProjections(
  state: BattleState,
  ability: Ability,
): readonly BattleSavingThrowRollModeProjection[] {
  return [...state.combatants].flatMap(([targetId, target]) => [
    ...mistCloudFormSavingThrowRollModeProjections(target, targetId, ability),
    ...target.activeEffects
      .filter(
        (
          effect,
        ): effect is Extract<
          BattleActiveEffect,
          { readonly kind: "savingThrowRollMode" }
        > =>
          effect.kind === "savingThrowRollMode" && effect.ability === ability,
      )
      .map((effect) => ({ targetId, rollMode: effect.mode })),
  ]);
}

function mistCloudFormSavingThrowRollModeProjections(
  target: BattleCreatureState,
  targetId: CombatantId,
  ability: Ability,
): readonly BattleSavingThrowRollModeProjection[] {
  return target.activeEffects.some(
    (effect) => effect.kind === "spellMistCloudForm",
  ) &&
    MIST_CLOUD_FORM_SAVING_THROW_ADVANTAGE.some(
      (candidate) => candidate === ability,
    )
    ? [{ targetId, rollMode: "advantage" }]
    : [];
}

function activeAbilityD20TestSavingThrowRollModeProjections(
  state: BattleState,
  ability: Ability,
): readonly BattleSavingThrowRollModeProjection[] {
  return [...state.combatants].flatMap(([targetId, target]) =>
    target.activeEffects.flatMap((effect) =>
      effect.kind === "abilityD20TestRollModeEndTurnSave" &&
      effect.ability === ability
        ? [{ targetId, rollMode: effect.mode }]
        : [],
    ),
  );
}

export function savingThrowFlatBonusProjections(
  state: BattleState,
  ability: Ability,
): readonly BattleSavingThrowFlatBonusProjection[] {
  return [...state.combatants].flatMap(([, target]) => [
    ...wardingBondSavingThrowFlatBonusProjectionsForTarget(target),
    ...slowActivePenaltiesSavingThrowFlatBonusProjection(target, ability),
  ]);
}

function slowActivePenaltiesSavingThrowFlatBonusProjection(
  target: BattleCreatureState,
  ability: Ability,
): readonly BattleSavingThrowFlatBonusProjection[] {
  if (ability !== "dex") {
    return [];
  }
  const effect = target.activeEffects.find(
    (
      candidate,
    ): candidate is Extract<
      BattleCreatureState["activeEffects"][number],
      { readonly kind: "slowActivePenalties" }
    > => candidate.kind === "slowActivePenalties",
  );
  return effect === undefined
    ? []
    : [
        {
          targetId: target.combatantId,
          sourceSpellId: effect.sourceSpellId,
          bonus: SLOW_ACTIVE_PENALTIES_DEX_SAVE_DELTA,
        },
      ];
}

function passiveSavingThrowRollModeProjections(
  state: BattleState,
  ability: Ability,
  condition: Condition | undefined,
): readonly BattleSavingThrowRollModeProjection[] {
  return [...state.combatants].flatMap(([targetId, target]) => {
    const projection = passiveSavingThrowRollModeProjection(
      targetId,
      target,
      ability,
      condition,
    );
    return projection === null ? [] : [projection];
  });
}

function passiveSavingThrowRollModeProjection(
  targetId: CombatantId,
  target: BattleCreatureState,
  ability: Ability,
  condition: Condition | undefined,
): BattleSavingThrowRollModeProjection | null {
  if (target.origin.kind !== "character") {
    return null;
  }
  const profile = [
    ...target.origin.passiveSavingThrowRollModeProfiles.values(),
  ].find((candidate) =>
    passiveSavingThrowRollModeScopeMatches(
      candidate.savingThrow,
      ability,
      condition,
      isIncapacitated(target.conditions),
    ),
  );
  return profile === undefined
    ? null
    : {
        targetId,
        rollMode: profile.savingThrow.mode,
      };
}

function passiveSavingThrowRollModeScopeMatches(
  profile: PassiveSavingThrowRollModeProfile,
  ability: Ability,
  condition: Condition | undefined,
  targetIncapacitated: boolean,
): boolean {
  if (profile.scope.kind === "savingThrowAbility") {
    return (
      profile.scope.ability === ability &&
      profile.scope.suppressedByCondition === "incapacitated" &&
      !targetIncapacitated
    );
  }
  return profile.scope.condition === condition;
}

export function validateSpellDamageFill(
  fill: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  invocation: SupportedDamageSpellInvocation,
  critical: boolean,
  spellMarkedDamageRiders: readonly SpellMarkedDamageRider[] = [],
): string | null {
  const attackDamageChoiceIssue = attackDamageChoiceUnsupportedIssue(fill);
  if (attackDamageChoiceIssue !== null) {
    return attackDamageChoiceIssue;
  }
  if (invocation.procedure !== "spellAttackDamage") {
    const spellDamageRerollIssue = spellDamageRerollUnsupportedIssue(fill);
    if (spellDamageRerollIssue !== null) {
      return spellDamageRerollIssue;
    }
  }
  if (
    fill.holeId !==
    spellDamageHole(invocation, critical, spellMarkedDamageRiders).holeId
  ) {
    return critical
      ? "Critical hit spell damage must use the critical spell damage hole."
      : "Spell damage must use the selected action-time spell act damage hole.";
  }
  if (spellMarkedDamageRiders.length > 0) {
    const spellDamageRerollIssue = spellDamageRerollUnsupportedIssue(fill);
    if (spellDamageRerollIssue !== null) {
      return spellDamageRerollIssue;
    }
    const components = spellDamageComponents(
      invocation,
      critical,
      spellMarkedDamageRiders,
    );
    if (fill.value.length !== components.length) {
      return "filled spell damage groups do not match current spell damage";
    }
    for (const [index, component] of components.entries()) {
      const group = fill.value[index];
      if (group === undefined) {
        return "filled spell damage groups do not match current spell damage";
      }
      if (index === 0 && hasMaxDieAdditionalDiceLimit(invocation)) {
        const validation = validateMaxDieAdditionalDiceFill(
          { ...fill, value: [group] },
          invocation,
          critical,
        );
        if (validation !== null) {
          return validation;
        }
      } else {
        const validation = validateRolledDiceForDiceExpr(
          [group],
          component.expr,
        );
        if (validation !== null) {
          return validation.reason;
        }
      }
    }
    return null;
  }
  const explodingError = hasMaxDieAdditionalDiceLimit(invocation)
    ? validateMaxDieAdditionalDiceFill(fill, invocation, critical)
    : null;
  if (explodingError !== null) {
    return explodingError;
  }
  if (
    invocation.procedure === "spellAttackDamage" &&
    invocation.damage.kind === "selectedSorcerousBurstDamage"
  ) {
    return null;
  }
  const validation = validateRolledDiceForDiceExpr(fill.value, {
    dice:
      invocation.procedure === "repeatedDamageAllocation"
        ? invocation.damage.expr.dice * invocation.targeting.repeatedEffectCount
        : invocation.damage.expr.dice *
          ((invocation.procedure === "heldLightHurl" ||
            invocation.procedure === "spellAttackSequence" ||
            invocation.procedure === "spellAttackDamage" ||
            invocation.procedure === "spellCreatedHeldObjectAttack" ||
            invocation.procedure === "attackBurstSaveDamage") &&
          critical
            ? 2
            : 1),
    dieSize: invocation.damage.expr.dieSize,
  });
  return validation?.reason ?? null;
}

function validateMaxDieAdditionalDiceFill(
  fill: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  invocation: SpellAttackDamageInvocationWithMaxDieAdditionalDiceLimit,
  critical: boolean,
): string | null {
  const baseDice = invocation.damage.expr.dice * (critical ? 2 : 1);
  const rolledResults = fill.value.flatMap((group: RolledDiceGroup): number[] =>
    group.results.map((result: DieRollResult): number => Number(result)),
  );
  const rolledDiceCount = rolledResults.length;
  const additionalDice = rolledDiceCount - baseDice;
  if (additionalDice < 0) {
    return "filled dice count is below the spell's base damage dice";
  }
  if (additionalDice > invocation.damage.maxDieAdditionalDiceLimit) {
    return "filled additional max-die damage dice exceed this caster's spellcasting ability modifier.";
  }
  const validation = validateRolledDiceForDiceExpr(fill.value, {
    dice: rolledDiceCount,
    dieSize: invocation.damage.expr.dieSize,
  });
  if (validation !== null) {
    return validation.reason;
  }
  const authorizationError = validateMaxDieAdditionalDiceSequence(
    rolledResults,
    baseDice,
    invocation.damage.expr.dieSize,
    additionalDice,
  );
  if (authorizationError !== null) {
    return authorizationError;
  }
  return null;
}

function hasMaxDieAdditionalDiceLimit(
  invocation: SupportedDamageSpellInvocation,
): invocation is SpellAttackDamageInvocationWithMaxDieAdditionalDiceLimit {
  return (
    invocation.procedure === "spellAttackDamage" &&
    invocation.damage.kind === "selectedSorcerousBurstDamage"
  );
}

function validateMaxDieAdditionalDiceSequence(
  rolledResults: readonly number[],
  baseDice: number,
  dieSize: number,
  additionalDice: number,
): string | null {
  for (
    let additionalDieIndex = 0;
    additionalDieIndex < additionalDice;
    additionalDieIndex += 1
  ) {
    const currentRollIndex = baseDice + additionalDieIndex;
    const priorMaxDieResults = rolledResults
      .slice(0, currentRollIndex)
      .filter((result): boolean => result === dieSize).length;
    if (additionalDieIndex >= priorMaxDieResults) {
      return "filled additional max-die damage dice require a rolled maximum on a prior spell damage die.";
    }
  }
  return null;
}

export function validateSpellAttackSequencePartDamageFill(
  fill: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spellAttackSequence" }
  >,
  partIndex: number,
  critical: boolean,
  spellMarkedDamageRiders: readonly SpellMarkedDamageRider[] = [],
): string | null {
  const attackDamageChoiceIssue = attackDamageChoiceUnsupportedIssue(fill);
  if (attackDamageChoiceIssue !== null) {
    return attackDamageChoiceIssue;
  }
  const spellDamageRerollIssue = spellDamageRerollUnsupportedIssue(fill);
  if (spellDamageRerollIssue !== null) {
    return spellDamageRerollIssue;
  }
  if (
    fill.holeId !==
    spellAttackSequencePartDamageHole(
      invocation,
      partIndex,
      critical,
      spellMarkedDamageRiders,
    ).holeId
  ) {
    return critical
      ? "Critical hit spell attack sequence damage must use the critical damage hole."
      : "Spell attack sequence damage must use the selected damage hole.";
  }
  if (spellMarkedDamageRiders.length > 0) {
    const components = spellDamageComponents(
      invocation,
      critical,
      spellMarkedDamageRiders,
    );
    if (fill.value.length !== components.length) {
      return "filled spell damage groups do not match current spell damage";
    }
    for (const [index, component] of components.entries()) {
      const group = fill.value[index];
      if (group === undefined) {
        return "filled spell damage groups do not match current spell damage";
      }
      const validation = validateRolledDiceForDiceExpr([group], component.expr);
      if (validation !== null) {
        return validation.reason;
      }
    }
    return null;
  }
  const validation = validateRolledDiceForDiceExpr(fill.value, {
    dice: invocation.damage.expr.dice * (critical ? 2 : 1),
    dieSize: invocation.damage.expr.dieSize,
  });
  return validation?.reason ?? null;
}

export function validateSpellHealingFill(
  fill: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "directHitPointRestoration" }
  >,
): string | null {
  if (fill.holeId !== spellHealingRollHole(invocation).holeId) {
    return "Spell healing must use the selected spell act healing hole.";
  }
  return validateRolledDiceFillForDiceExpr(fill, {
    dice: invocation.healing.expr.dice,
    dieSize: invocation.healing.expr.dieSize,
  });
}

export function validateScalarBuffTemporaryHitPointsFill(
  fill: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "scalarBuff" }
  >,
): string | null {
  if (invocation.effect.kind !== "temporaryHitPoints") {
    return "Scalar buff dice are only valid for Temporary Hit Points effects.";
  }
  if (fill.holeId !== spellScalarBuffRollHole(invocation).holeId) {
    return "Temporary Hit Points must use the selected scalar buff spell hole.";
  }
  return validateRolledDiceFillForDiceExpr(fill, {
    dice: invocation.effect.amount.expr.dice,
    dieSize: invocation.effect.amount.expr.dieSize,
  });
}

export function validateSpellBurstDamageFill(
  fill: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "attackBurstSaveDamage" }
  >,
): string | null {
  if (fill.holeId !== spellBurstDamageHole(invocation).holeId) {
    return "Ice Knife burst damage must use the burst damage hole.";
  }
  return validateRolledDiceFillForDiceExpr(fill, {
    dice: invocation.burst.damage.expr.dice,
    dieSize: invocation.burst.damage.expr.dieSize,
  });
}

export function validatePreparedSlotSpellDamageGroups(
  fill: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  allocations: readonly BattleSpellTargetAllocation[],
): string | null {
  const attackDamageChoiceIssue = attackDamageChoiceUnsupportedIssue(fill);
  if (attackDamageChoiceIssue !== null) {
    return attackDamageChoiceIssue;
  }
  const spellDamageRerollIssue = spellDamageRerollUnsupportedIssue(fill);
  if (spellDamageRerollIssue !== null) {
    return spellDamageRerollIssue;
  }
  if (fill.value.length !== allocations.length) {
    return "Repeated spell damage dice groups must match the target allocation entries.";
  }
  const mismatched = allocations.find(
    (allocation, index) =>
      fill.value[index]?.results.length !== allocation.count,
  );
  return mismatched === undefined
    ? null
    : "Each repeated spell damage dice group must match that target's allocated effect count.";
}

function attackDamageChoiceUnsupportedIssue(
  fill: Extract<BattleFill, { readonly kind: "rolledDice" }>,
): string | null {
  const attackDamageDieFloorChoiceIssue =
    attackDamageDieFloorChoiceUnsupportedIssue(fill);
  if (attackDamageDieFloorChoiceIssue !== null) {
    return attackDamageDieFloorChoiceIssue;
  }
  return attackDamageAbilityModifierChoiceUnsupportedIssue(fill);
}

type SpellDamageContext = {
  readonly concentrationSavingThrow?:
    | Extract<BattleFill, { readonly kind: "concentrationSavingThrow" }>
    | undefined;
  readonly wardingBondDamageShareConcentrationSavingThrows?:
    | readonly Extract<
        BattleFill,
        { readonly kind: "concentrationSavingThrow" }
      >[]
    | undefined;
  readonly hideousLaughterDamageRepeatSaves?:
    | readonly Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>[]
    | undefined;
  readonly hideousLaughterDamageRepeatSaveEventKey?: string | undefined;
  readonly saveDamageResult?: SaveDamageResult | undefined;
  readonly damageDisposition?: BattleAttackDamageDisposition | undefined;
  readonly spellMarkedDamageRiders?:
    | readonly SpellMarkedDamageRider[]
    | undefined;
  readonly spellDamageReductionRoll?:
    | Extract<BattleFill, { readonly kind: "rolledDice" }>
    | undefined;
  readonly spellDamageReductionRollHoleForReduction?:
    | Parameters<typeof applyAvailableSpellDamageReduction>[3]
    | undefined;
  readonly sourceDamageRollPenaltyRoll?:
    | Extract<BattleFill, { readonly kind: "rolledDice" }>
    | undefined;
  readonly sourcePenaltyDamageByType?:
    | ReadonlyMap<DamageType, number>
    | undefined;
  readonly damageSourceId?: CombatantId | undefined;
  readonly spatialFacts: readonly BattleTargetSpatialFact[];
};

export function applySpellDamage(
  state: BattleState,
  targetId: CombatantId,
  invocation: SupportedDamageSpellInvocation,
  damageRoll: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  critical: boolean,
  context: SpellDamageContext,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target == null) {
    return state;
  }
  const {
    concentrationSavingThrow,
    wardingBondDamageShareConcentrationSavingThrows,
    hideousLaughterDamageRepeatSaves,
    hideousLaughterDamageRepeatSaveEventKey,
    saveDamageResult = "full",
    damageDisposition = { kind: "ordinaryDamage" },
    spellMarkedDamageRiders = [],
    spellDamageReductionRoll,
    spellDamageReductionRollHoleForReduction,
    sourceDamageRollPenaltyRoll,
    sourcePenaltyDamageByType,
    damageSourceId,
    spatialFacts,
  } = context;
  const spellDamageByType = spellDamageByTypeForTarget(
    target,
    invocation,
    damageRoll,
    saveDamageResult,
    spellMarkedDamageRiders,
    critical,
  );
  const sourcePenalty =
    sourcePenaltyDamageByType === undefined
      ? applyAvailableSourceDamageRollPenalty(
          damageSourceId === undefined
            ? undefined
            : state.combatants.get(damageSourceId),
          spellDamageByType,
          damageRoll.holeId,
          sourceDamageRollPenaltyRoll,
        )
      : {
          tag: "ok" as const,
          damageByType: damageAmountByTypeAfterSaveDamageResult(
            sourcePenaltyDamageByType,
            saveDamageResult,
          ),
        };
  if (sourcePenalty.tag !== "ok") return state;
  const reduction = applyAvailableSpellDamageReduction(
    target,
    sourcePenalty.damageByType,
    spellDamageReductionRoll,
    spellDamageReductionRollHoleForReduction,
  );
  if (reduction.tag !== "ok") {
    return state;
  }
  const effectiveDamage = damageAmountByTypeAfterTargetAdjustments(
    reduction.target,
    reduction.damageByType,
  );
  return applyBattleHitPointDamage({
    state,
    target: reduction.target,
    damageAmount: effectiveDamage,
    deathFailuresAtZeroHp: critical ? 2 : 1,
    damageDisposition,
    damageSourceId,
    spatialFacts,
    concentrationSavingThrow,
    ...(wardingBondDamageShareConcentrationSavingThrows === undefined
      ? {}
      : { wardingBondDamageShareConcentrationSavingThrows }),
    ...(hideousLaughterDamageRepeatSaves === undefined
      ? {}
      : { hideousLaughterDamageRepeatSaves }),
    ...(hideousLaughterDamageRepeatSaveEventKey === undefined
      ? {}
      : { hideousLaughterDamageRepeatSaveEventKey }),
  });
}

type PreparedSlotSpellDamageContext = {
  readonly concentrationSavingThrow?:
    | Extract<BattleFill, { readonly kind: "concentrationSavingThrow" }>
    | undefined;
  readonly wardingBondDamageShareConcentrationSavingThrows?:
    | readonly Extract<
        BattleFill,
        { readonly kind: "concentrationSavingThrow" }
      >[]
    | undefined;
  readonly hideousLaughterDamageRepeatSaves?:
    | readonly Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>[]
    | undefined;
  readonly hideousLaughterDamageRepeatSaveEventKey?: string | undefined;
  readonly damageDisposition?: BattleAttackDamageDisposition | undefined;
  readonly damageSourceId?: CombatantId | undefined;
  readonly spatialFacts: readonly BattleTargetSpatialFact[];
};

export function applyPreparedSlotSpellDamage(
  state: BattleState,
  targetId: CombatantId,
  damageAmount: number,
  context: PreparedSlotSpellDamageContext,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target == null) {
    return state;
  }
  const {
    concentrationSavingThrow,
    wardingBondDamageShareConcentrationSavingThrows,
    hideousLaughterDamageRepeatSaves,
    hideousLaughterDamageRepeatSaveEventKey,
    damageDisposition = { kind: "ordinaryDamage" },
    damageSourceId,
    spatialFacts,
  } = context;
  return applyBattleHitPointDamage({
    state,
    target,
    damageAmount,
    deathFailuresAtZeroHp: 1,
    damageDisposition,
    damageSourceId,
    spatialFacts,
    concentrationSavingThrow,
    ...(wardingBondDamageShareConcentrationSavingThrows === undefined
      ? {}
      : { wardingBondDamageShareConcentrationSavingThrows }),
    ...(hideousLaughterDamageRepeatSaves === undefined
      ? {}
      : { hideousLaughterDamageRepeatSaves }),
    ...(hideousLaughterDamageRepeatSaveEventKey === undefined
      ? {}
      : { hideousLaughterDamageRepeatSaveEventKey }),
  });
}

export function spellDamageAmountForTarget(
  target: BattleCreatureState,
  invocation: SupportedDamageSpellInvocation,
  damageRoll: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  saveDamageResult: SaveDamageResult = "full",
  spellMarkedDamageRiders: readonly SpellMarkedDamageRider[] = [],
  critical = false,
): number {
  return damageAmountByTypeAfterTargetAdjustments(
    target,
    spellDamageByTypeForTarget(
      target,
      invocation,
      damageRoll,
      saveDamageResult,
      spellMarkedDamageRiders,
      critical,
    ),
  );
}

export function spellDamageByTypeForTarget(
  _target: BattleCreatureState,
  invocation: SupportedDamageSpellInvocation,
  damageRoll: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  saveDamageResult: SaveDamageResult = "full",
  spellMarkedDamageRiders: readonly SpellMarkedDamageRider[] = [],
  critical = false,
): ReadonlyMap<DamageType, number> {
  if (spellMarkedDamageRiders.length > 0) {
    const components = spellDamageComponents(
      invocation,
      critical,
      spellMarkedDamageRiders,
    );
    const damageByType = damageRoll.value.reduce<
      ReadonlyMap<DamageType, number>
    >((totals, group, index) => {
      const component = components[index];
      if (component === undefined) {
        return totals;
      }
      const diceTotal = group.results.reduce(
        (groupTotal: number, dieResult: DieRollResult): number =>
          groupTotal + Number(dieResult),
        0,
      );
      const unadjusted = diceTotal + component.flat;
      return addDamageAmountForType(totals, component.damageType, unadjusted);
    }, new Map());
    return damageByType;
  }
  const diceTotal = damageRoll.value.reduce(
    (total: number, group: RolledDiceGroup): number =>
      total +
      group.results.reduce(
        (groupTotal: number, dieResult: DieRollResult): number =>
          groupTotal + Number(dieResult),
        0,
      ),
    0,
  );
  const flat =
    (invocation.damage.expr.flat ?? 0) *
    (invocation.procedure === "repeatedDamageAllocation"
      ? invocation.targeting.repeatedEffectCount
      : 1);
  const saveAdjustedDamage = applySaveDamageResult(
    diceTotal + flat,
    saveDamageResult,
  );
  return addDamageAmountForType(
    new Map(),
    invocation.damage.damageType,
    saveAdjustedDamage,
  );
}

export function spellBurstDamageByTypeForTarget(
  _target: BattleCreatureState,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "attackBurstSaveDamage" }
  >,
  damageRoll: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  saveDamageResult: SaveDamageResult,
): ReadonlyMap<DamageType, number> {
  const diceTotal = damageRoll.value.reduce(
    (total: number, group: RolledDiceGroup): number =>
      total +
      group.results.reduce(
        (groupTotal: number, dieResult: DieRollResult): number =>
          groupTotal + Number(dieResult),
        0,
      ),
    0,
  );
  const flat = invocation.burst.damage.expr.flat ?? 0;
  return addDamageAmountForType(
    new Map(),
    invocation.burst.damage.damageType,
    applySaveDamageResult(diceTotal + flat, saveDamageResult),
  );
}

export function damageAmountByTypeAfterSaveDamageResult(
  damageByType: ReadonlyMap<DamageType, number>,
  saveDamageResult: SaveDamageResult,
): ReadonlyMap<DamageType, number> {
  return damageAmountByTypeEntriesToMap(
    damageAmountByTypeMapEntries(damageByType).map((entry) => ({
      ...entry,
      amount: applySaveDamageResult(entry.amount, saveDamageResult),
    })),
  );
}

export function spellObjectDamageOutcome(input: {
  readonly objectId: BattleObjectId;
  readonly invocation: SpellObjectDamageInvocation;
  readonly damageRoll: Extract<BattleFill, { readonly kind: "rolledDice" }>;
  readonly critical: boolean;
  readonly disposition: BattleObjectDamageDisposition;
}): BattleObjectDamageOutcome {
  const rolledDamage = spellObjectRolledDamage(
    input.invocation,
    input.damageRoll,
    input.critical,
  );
  const damageType = input.invocation.damage.damageType;
  return Match.value(input.disposition).pipe(
    Match.when({ kind: "tableResolved" }, () => ({
      kind: "tableResolved" as const,
      objectId: input.objectId,
      damageType,
      rolledDamage: damageAmount(rolledDamage),
    })),
    Match.when({ kind: "hitPoints" }, (disposition) =>
      objectHitPointDamageOutcome({
        objectId: input.objectId,
        damageType,
        rolledDamage,
        priorHitPoints: disposition.hitPoints,
        damageThreshold: null,
      }),
    ),
    Match.when({ kind: "hitPointsWithDamageThreshold" }, (disposition) =>
      objectHitPointDamageOutcome({
        objectId: input.objectId,
        damageType,
        rolledDamage,
        priorHitPoints: disposition.hitPoints,
        damageThreshold: disposition.damageThreshold,
      }),
    ),
    Match.exhaustive,
  );
}

export function spellObjectDamageByType(
  invocation: SpellObjectDamageInvocation,
  damageRoll: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  critical: boolean,
): ReadonlyMap<DamageType, number> {
  return addDamageAmountForType(
    new Map(),
    invocation.damage.damageType,
    spellObjectRolledDamage(invocation, damageRoll, critical),
  );
}

export function spellObjectDamageOutcomeFromDamageByType(input: {
  readonly objectId: BattleObjectId;
  readonly damageType?: DamageType | undefined;
  readonly damageByType: ReadonlyMap<DamageType, number>;
  readonly disposition: BattleObjectDamageDisposition;
}): BattleObjectDamageOutcome {
  const entries = damageAmountByTypeMapEntries(input.damageByType);
  const [firstEntry] = entries;
  const damageType = input.damageType ?? firstEntry?.damageType ?? "force";
  const rolledDamage = entries.reduce(
    (total, entry) => total + entry.amount,
    0,
  );
  return Match.value(input.disposition).pipe(
    Match.when({ kind: "tableResolved" }, () => ({
      kind: "tableResolved" as const,
      objectId: input.objectId,
      damageType,
      rolledDamage: damageAmount(rolledDamage),
    })),
    Match.when({ kind: "hitPoints" }, (disposition) =>
      objectHitPointDamageOutcome({
        objectId: input.objectId,
        damageType,
        rolledDamage,
        priorHitPoints: disposition.hitPoints,
        damageThreshold: null,
      }),
    ),
    Match.when({ kind: "hitPointsWithDamageThreshold" }, (disposition) =>
      objectHitPointDamageOutcome({
        objectId: input.objectId,
        damageType,
        rolledDamage,
        priorHitPoints: disposition.hitPoints,
        damageThreshold: disposition.damageThreshold,
      }),
    ),
    Match.exhaustive,
  );
}

export function spellObjectRolledDamage(
  invocation: SpellObjectDamageInvocation,
  damageRoll: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  _critical: boolean,
): number {
  const diceTotal = damageRoll.value.reduce(
    (total: number, group: RolledDiceGroup): number =>
      total +
      group.results.reduce(
        (groupTotal: number, dieResult: DieRollResult): number =>
          groupTotal + Number(dieResult),
        0,
      ),
    0,
  );
  return diceTotal + (invocation.damage.expr.flat ?? 0);
}

function objectHitPointDamageOutcome(input: {
  readonly objectId: BattleObjectId;
  readonly damageType: DamageType;
  readonly rolledDamage: number;
  readonly priorHitPoints: Hp;
  readonly damageThreshold: DamageAmount | null;
}): Extract<BattleObjectDamageOutcome, { readonly kind: "hitPoints" }> {
  const objectImmune = objectDamageTypeIsImmune(input.damageType);
  const thresholdBlocksDamage =
    input.damageThreshold !== null &&
    input.rolledDamage < Number(input.damageThreshold);
  const effectiveDamage =
    objectImmune || thresholdBlocksDamage ? 0 : input.rolledDamage;
  const nextHitPoints = Hp(
    Math.max(0, Number(input.priorHitPoints) - effectiveDamage),
  );
  return {
    kind: "hitPoints",
    objectId: input.objectId,
    damageType: input.damageType,
    rolledDamage: damageAmount(input.rolledDamage),
    effectiveDamage: damageAmount(effectiveDamage),
    priorHitPoints: input.priorHitPoints,
    nextHitPoints,
    destroyed: nextHitPoints === 0,
  };
}

function objectDamageTypeIsImmune(damageType: DamageType): boolean {
  return OBJECT_DAMAGE_IMMUNITIES.some(
    (immuneDamageType): boolean => immuneDamageType === damageType,
  );
}

export function spellBurstDamageAmountForTarget(
  target: BattleCreatureState,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "attackBurstSaveDamage" }
  >,
  damageRoll: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  saveDamageResult: SaveDamageResult,
): number {
  const diceTotal = damageRoll.value.reduce(
    (total: number, group: RolledDiceGroup): number =>
      total +
      group.results.reduce(
        (groupTotal: number, dieResult: DieRollResult): number =>
          groupTotal + Number(dieResult),
        0,
      ),
    0,
  );
  const flat = invocation.burst.damage.expr.flat ?? 0;
  return damageAmountAfterTargetAdjustments(
    target,
    applySaveDamageResult(diceTotal + flat, saveDamageResult),
    invocation.burst.damage.damageType,
  );
}

export function repeatedDamageAllocationSpellDamageAmount(
  target: BattleCreatureState,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "repeatedDamageAllocation" }
  >,
  damageRoll: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  allocationIndex: number,
  repeatedEffectCount: number,
): number {
  if (spellDamageNegatedForTarget(target, invocation.spell.id)) {
    return 0;
  }
  const group = damageRoll.value[allocationIndex];
  const diceTotal =
    group?.results.reduce(
      (groupTotal: number, dieResult: DieRollResult): number =>
        groupTotal + Number(dieResult),
      0,
    ) ?? 0;
  const flat = (invocation.damage.expr.flat ?? 0) * repeatedEffectCount;
  return damageAmountAfterTargetAdjustments(
    target,
    diceTotal + flat,
    invocation.damage.damageType,
  );
}

export function spellDamageNegatedForTarget(
  target: BattleCreatureState,
  spellId: SpellRecord["id"],
): boolean {
  return target.activeEffects.some(
    (effect) =>
      effect.kind === "spellArmorClassBonus" &&
      effect.negatedSpellIds.includes(spellId),
  );
}

export function saveGateDamageResultForOutcome(
  state: BattleState,
  targetId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "saveGatedDamage" }
  >,
  savingThrowSucceeded: boolean,
  carefulSpellProtectedTargetIds: readonly CombatantId[] = [],
): SaveDamageResult {
  if (
    savingThrowSucceeded &&
    invocation.successDamage === "half" &&
    carefulSpellProtectedTargetIds.includes(targetId)
  ) {
    return "none";
  }
  const target = state.combatants.get(targetId);
  const baseResult: SaveDamageResult = savingThrowSucceeded
    ? invocation.successDamage
    : "full";
  const replacement = saveDamageReplacementForInvocation(target, invocation);
  if (replacement === null) {
    return baseResult;
  }
  return savingThrowSucceeded ? replacement.onSuccess : replacement.onFail;
}

export function saveDamageReplacementForInvocation(
  target: BattleCreatureState | undefined,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "saveGatedDamage" }
  >,
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "saveDamageReplacement" }
> | null {
  if (
    target?.origin.kind !== "character" ||
    invocation.successDamage !== "half" ||
    isIncapacitated(target.conditions)
  ) {
    return null;
  }
  return (
    [...target.origin.saveDamageReplacementProfiles.values()].find(
      (profile) =>
        profile.ability === invocation.ability &&
        profile.requiredSuccessDamage === "half" &&
        profile.suppressedByCondition === "incapacitated",
    ) ?? null
  );
}

export function applySaveDamageResult(
  amount: number,
  saveDamageResult: SaveDamageResult,
): number {
  return Match.value(saveDamageResult).pipe(
    Match.when("none", () => 0),
    Match.when("half", () => Math.floor(amount / 2)),
    Match.when("full", () => amount),
    Match.exhaustive,
  );
}
