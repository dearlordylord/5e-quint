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
import type { Ability, DamageType, DiceExpr } from "@dnd/surface/surface/types";
import type {
  BattleObjectId,
  BattleProcedureExecutionRef,
  CombatantId,
} from "../identity.ts";
import type { PassiveSavingThrowRollModeProfile } from "../unit-feature-execution-constants.ts";
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
import { hasDodgeBenefit } from "./dodge-benefit.ts";
import { ongoingFeatureEnemyRelationshipDecisionRequired } from "./ongoing-feature-relationship.ts";
import { spellTargetHasNonSpatialPrerequisites } from "./spells-targeting.ts";
import { spellTargetIsHostileToCaster } from "./roll-trigger-relationship-facts.ts";
import { battleCreatureType } from "./domain-helpers.ts";
import { uniqueSavingThrowRollModeProjections } from "./saving-throw-roll-mode-projections.ts";
import {
  attackDamageAbilityModifierChoiceUnsupportedIssue,
  attackDamageDieFloorChoiceUnsupportedIssue,
  type BattleActiveEffect,
  type BattleAttackDamageDisposition,
  type BattleCreatureState,
  type BattleDamageRelationshipDecisions,
  type BattleFill,
  type BattleHoleId,
  type BattleObjectDamageDisposition,
  type BattleObjectDamageOutcome,
  type BattleSpellTargetListRelationshipFact,
  type BattleSavingThrowFlatBonusProjection,
  type BattleSavingThrowRollModeProjection,
  type BattleSpellAttackRollHole,
  type BattleSpellAbilityChoiceHole,
  type BattleSpellDamageRollHole,
  type BattleSpellDamageTypeChoiceHole,
  type BattleExecutableSpellInvocation,
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
  type ResolvedSpellAttackDamagePayload,
  type SpellMarkedDamageRider,
  type SpellTargeting,
  type SpellFailedSaveConditionChoiceEffect,
  type SupportedDamageSpellInvocation,
  validateRolledDiceFillForDiceExpr,
} from "../battle-state-execution.ts";
import {
  ATTACK_ROLL_HOLE_ID,
  ATTACK_ROLL_HOLE_INSTANCE,
} from "./battle-runtime-protocol.ts";
import { spellDamageRerollUnsupportedIssue } from "./spell-reroll-issues.ts";
import {
  characterUnitProcedureBindings,
  type UnitFeatureProcedureExecution,
} from "../character-execution-queries.ts";
import type { RuntimeSpellProcedureExecution } from "../character-execution.ts";
import {
  SLOW_ACTIVE_PENALTIES_DEX_SAVE_DELTA,
  THAUMATURGY_ACTIVE_ONE_MINUTE_EFFECT_COUNT_HOLE_ID,
  THAUMATURGY_ACTIVE_ONE_MINUTE_EFFECT_COUNT_HOLE_INSTANCE,
  THAUMATURGY_MAX_ACTIVE_ONE_MINUTE_EFFECTS,
} from "./domain-constants.ts";
import { spellAttackSequencePartName } from "./spells-execution-facts.ts";
import { wardingBondSavingThrowFlatBonusProjectionsForTarget } from "./warding-bond.ts";
import {
  activeCreatureSizeChangeEffect,
  creatureSizeChangeStrengthRollMode,
} from "./creature-size-change-effects.ts";

type RuntimeSpellProcedure = RuntimeSpellProcedureExecution;
type RuntimeDamageSpellProcedureOf<Procedure> = Procedure extends {
  readonly procedure: SupportedDamageSpellInvocation["procedure"];
}
  ? Procedure
  : never;
type RuntimeDamageSpellProcedureBase =
  RuntimeDamageSpellProcedureOf<RuntimeSpellProcedure>;
type ResolvedRuntimeSpellAttackDamageProcedure<Procedure> = Procedure extends {
  readonly procedure: "spellAttackDamage";
}
  ? Procedure & { readonly damage: ResolvedSpellAttackDamagePayload }
  : never;
export type RuntimeDamageSpellProcedure =
  | Exclude<
      RuntimeDamageSpellProcedureBase,
      { readonly procedure: "spellAttackDamage" }
    >
  | ResolvedRuntimeSpellAttackDamageProcedure<RuntimeDamageSpellProcedureBase>;

type RuntimeExecutableDamageSpellProcedureOf<Procedure> =
  Procedure extends RuntimeDamageSpellProcedure
    ? Procedure & {
        readonly sourceProcedureRef: BattleProcedureExecutionRef;
      }
    : never;

export type RuntimeExecutableDamageSpellProcedure =
  RuntimeExecutableDamageSpellProcedureOf<RuntimeDamageSpellProcedure>;

function runtimeSpellPrimaryDamage(invocation: RuntimeDamageSpellProcedure): {
  readonly expr: DiceExpr;
  readonly damageType: DamageType;
} {
  return invocation.procedure === "objectContactDamageRepeat"
    ? invocation.activeEffect.damage
    : invocation.damage;
}

type SelectedSpellAttackDamageProcedure<
  Invocation extends BattleExecutableSpellInvocation,
> = Invocation extends { readonly procedure: "spellAttackDamage" }
  ? Invocation & { readonly damage: ResolvedSpellAttackDamagePayload }
  : Invocation;

export type SelectedSpellAttackDamageProcedureResult<
  Invocation extends BattleExecutableSpellInvocation,
> =
  | {
      readonly tag: "ok";
      readonly invocation: SelectedSpellAttackDamageProcedure<Invocation>;
    }
  | {
      readonly tag: "needsHoles";
      readonly hole: BattleSpellDamageTypeChoiceHole;
    }
  | { readonly tag: "invalid"; readonly message: string };

export function selectedSpellAttackDamageProcedure<
  Invocation extends BattleExecutableSpellInvocation,
>(
  invocation: Invocation,
  damageTypeChoice:
    | Extract<BattleFill, { readonly kind: "damageTypeChoice" }>
    | undefined,
): SelectedSpellAttackDamageProcedureResult<Invocation>;
export function selectedSpellAttackDamageProcedure(
  invocation: BattleExecutableSpellInvocation,
  damageTypeChoice:
    | Extract<BattleFill, { readonly kind: "damageTypeChoice" }>
    | undefined,
):
  | {
      readonly tag: "ok";
      readonly invocation: BattleExecutableSpellInvocation;
    }
  | {
      readonly tag: "needsHoles";
      readonly hole: BattleSpellDamageTypeChoiceHole;
    }
  | { readonly tag: "invalid"; readonly message: string } {
  if (
    invocation.procedure !== "spellAttackDamage" ||
    invocation.damage.kind !== "sorcerousBurstDamageTypeChoice"
  ) {
    return { tag: "ok", invocation };
  }
  if (damageTypeChoice === undefined) {
    return {
      tag: "needsHoles",
      hole: spellDamageTypeChoiceHole(invocation),
    };
  }
  const selectedDamageType = damageTypeChoice.value;
  if (!invocation.damage.damageTypeChoices.includes(selectedDamageType)) {
    return {
      tag: "invalid",
      message:
        "Spell attack damage type must be one of the selected spell's choices.",
    };
  }
  return {
    tag: "ok",
    invocation: {
      ...invocation,
      damage: {
        kind: "selectedSorcerousBurstDamage",
        expr: invocation.damage.expr,
        damageType: selectedDamageType,
        maxDieAdditionalDiceLimit: invocation.damage.maxDieAdditionalDiceLimit,
      },
    },
  };
}

type CarefulSpellProcedureFacts = {
  readonly procedure: RuntimeSpellProcedure["procedure"];
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
};

const OBJECT_DAMAGE_IMMUNITIES = [
  "poison",
  "psychic",
] as const satisfies ReadonlyArray<DamageType>;

type SpellAttackDamageInvocationWithMaxDieAdditionalDiceLimit = Extract<
  RuntimeDamageSpellProcedure,
  { readonly procedure: "spellAttackDamage" }
> & {
  readonly damage: {
    readonly kind: "selectedSorcerousBurstDamage";
    readonly maxDieAdditionalDiceLimit: number;
  };
};

type SpellObjectDamageInvocation =
  | Extract<
      RuntimeSpellProcedure,
      { readonly procedure: "heldLightHurl" | "spellAttackSequence" }
    >
  | Extract<
      RuntimeDamageSpellProcedure,
      { readonly procedure: "saveGatedDamage" | "spellAttackDamage" }
    >;

export function spellAttackRollHole(
  state: BattleState,
  attackerId: CombatantId,
  invocation: BattleExecutableSpellInvocation<
    Extract<
      RuntimeSpellProcedure,
      {
        readonly procedure:
          | "attackBurstSaveDamage"
          | "heldLightHurl"
          | "spellCreatedHeldObjectAttack"
          | "spiritualWeaponAttackProxy"
          | "spiritualWeaponRepeatAttack"
          | "spellAttackDamage";
      }
    >
  >,
  rollMode?: AttackRollMode,
): BattleSpellAttackRollHole {
  return {
    ...spellAttackRollHoleBase(invocation, rollMode),
    ...attackRollMissToHitReplacementHolePayload(state, attackerId),
  };
}

export function spellAttackSequencePartAttackRollHole(
  invocation: BattleExecutableSpellInvocation<
    Extract<
      RuntimeSpellProcedure,
      { readonly procedure: "spellAttackSequence" }
    >
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
    label: `Spell ${partName} ${partIndex + 1} spell attack roll`,
    sourceProcedureRef: invocation.sourceProcedureRef,
    attackBonus: invocation.attackBonus,
    ...(rollMode === undefined ? {} : { rollMode }),
  };
}

export function spellAttackSequencePartAttackRollHoleId(
  invocation: Extract<
    RuntimeSpellProcedure,
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
    RuntimeSpellProcedure,
    { readonly procedure: "spellAttackSequence" }
  >,
  partIndex: number,
): string {
  return `battle:spell:attack-sequence-part-attack-roll:${invocation.procedure}:${partIndex}`;
}

export function spellObjectAttackRollHole(
  invocation: BattleExecutableSpellInvocation<
    Extract<
      RuntimeSpellProcedure,
      { readonly procedure: "heldLightHurl" | "spellAttackDamage" }
    >
  >,
  rollMode?: AttackRollMode,
): BattleSpellAttackRollHole {
  return spellAttackRollHoleBase(invocation, rollMode);
}

function spellAttackRollHoleBase(
  invocation: BattleExecutableSpellInvocation<
    Extract<
      RuntimeSpellProcedure,
      {
        readonly procedure:
          | "attackBurstSaveDamage"
          | "heldLightHurl"
          | "spellCreatedHeldObjectAttack"
          | "spiritualWeaponAttackProxy"
          | "spiritualWeaponRepeatAttack"
          | "spellAttackDamage";
      }
    >
  >,
  rollMode?: AttackRollMode,
): BattleSpellAttackRollHole {
  return {
    kind: "attackRoll",
    holeId: ATTACK_ROLL_HOLE_ID,
    holeInstanceKey: ATTACK_ROLL_HOLE_INSTANCE,
    label: `Spell spell attack roll`,
    sourceProcedureRef: invocation.sourceProcedureRef,
    attackBonus: invocation.attackBonus,
    ...(rollMode === undefined ? {} : { rollMode }),
  };
}

export function spellDamageTypeChoiceHole(
  invocation: BattleExecutableSpellInvocation<
    Extract<
      RuntimeSpellProcedure,
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
    >
  >,
): BattleSpellDamageTypeChoiceHole {
  const protocolId =
    invocation.procedure === "spellHostedWeaponAttack"
      ? `battle:spell:damage-type:${invocation.procedure}:${invocation.componentWeaponObjectId}`
      : `battle:spell:damage-type:${invocation.procedure}`;
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
    label: `Spell damage type`,
    sourceProcedureRef: invocation.sourceProcedureRef,
    choices,
  };
}

export type SaveGatedConditionChoiceInvocation = Extract<
  RuntimeSpellProcedure,
  { readonly procedure: "saveGatedCondition" }
> & {
  readonly effect: SpellFailedSaveConditionChoiceEffect;
};
export type SpellConditionChoiceInvocation =
  | SaveGatedConditionChoiceInvocation
  | Extract<
      RuntimeSpellProcedure,
      { readonly procedure: "directConditionRemoval" }
    >;

export function saveGatedConditionHasConditionChoice(
  invocation: Extract<
    RuntimeSpellProcedure,
    { readonly procedure: "saveGatedCondition" }
  >,
): invocation is SaveGatedConditionChoiceInvocation {
  return invocation.effect.kind === "choice";
}

export function spellInvocationHasConditionChoice(
  invocation: RuntimeSpellProcedure,
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
  invocation: BattleExecutableSpellInvocation<SpellConditionChoiceInvocation>,
): BattleSpellConditionChoiceHole {
  const protocolId = spellConditionChoiceHoleProtocolId(invocation);
  return {
    kind: "conditionChoice",
    holeId: holeId(protocolId),
    holeInstanceKey: holeInstanceKey(protocolId),
    label: `Spell condition`,
    sourceProcedureRef: invocation.sourceProcedureRef,
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
  return `battle:spell:condition-choice:${invocation.procedure}`;
}

export function chainedSpellTargetHole(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation<
    Extract<
      RuntimeSpellProcedure,
      { readonly procedure: "chainedSpellAttackDamage" }
    >
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
        ? `Spell target`
        : `Spell leap target ${input.stepIndex}`,
    requiresTableSpatialFact: true,
    spellTargetSpatialFactRequest: {
      casterId: input.actorId,
      sourceProcedureRef: input.invocation.sourceProcedureRef,
    },
    ...(ongoingFeatureEnemyRelationshipDecisionRequired(
      input.state,
      input.actorId,
      "attackRollAgainstEnemy",
    )
      ? {
          relationshipFactRequest: {
            kind: "attackRollTargetIsEnemy" as const,
            attackerId: input.actorId,
          },
        }
      : {}),
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
  invocation: BattleExecutableSpellInvocation<
    Extract<
      RuntimeSpellProcedure,
      { readonly procedure: "chainedSpellAttackDamage" }
    >
  >,
  stepIndex: number,
  rollMode?: AttackRollMode,
): BattleSpellAttackRollHole {
  const protocolId = chainedSpellAttackRollProtocolId(invocation, stepIndex);
  return {
    kind: "attackRoll",
    holeId: holeId(protocolId),
    holeInstanceKey: holeInstanceKey(protocolId),
    label: `Spell spell attack roll ${stepIndex + 1}`,
    sourceProcedureRef: invocation.sourceProcedureRef,
    attackBonus: invocation.attackBonus,
    ...(rollMode === undefined ? {} : { rollMode }),
    ...attackRollMissToHitReplacementHolePayload(state, attackerId),
  };
}

export function chainedSpellDamageRollHole(
  invocation: BattleExecutableSpellInvocation<
    Extract<
      RuntimeSpellProcedure,
      { readonly procedure: "chainedSpellAttackDamage" }
    >
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
    label: `Spell damage ${step.stepIndex + 1} (${expr})`,
    sourceProcedureRef: invocation.sourceProcedureRef,
    critical: step.critical,
  };
}

export function chainedSpellTargetHoleId(
  invocation: Extract<
    RuntimeSpellProcedure,
    { readonly procedure: "chainedSpellAttackDamage" }
  >,
  stepIndex: number,
): BattleHoleId {
  return holeId(chainedSpellTargetProtocolId(invocation, stepIndex));
}

export function chainedSpellAttackRollHoleId(
  invocation: Extract<
    RuntimeSpellProcedure,
    { readonly procedure: "chainedSpellAttackDamage" }
  >,
  stepIndex: number,
): BattleHoleId {
  return holeId(chainedSpellAttackRollProtocolId(invocation, stepIndex));
}

export function chainedSpellDamageRollHoleId(
  invocation: Extract<
    RuntimeSpellProcedure,
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
    RuntimeSpellProcedure,
    { readonly procedure: "chainedSpellAttackDamage" }
  >,
  stepIndex: number,
): string {
  return `battle:spell:chained-target:${invocation.procedure}:${stepIndex}`;
}

export function chainedSpellAttackRollProtocolId(
  invocation: Extract<
    RuntimeSpellProcedure,
    { readonly procedure: "chainedSpellAttackDamage" }
  >,
  stepIndex: number,
): string {
  return `battle:spell:chained-attack-roll:${invocation.procedure}:${stepIndex}`;
}

export function chainedSpellDamageRollProtocolId(
  invocation: Extract<
    RuntimeSpellProcedure,
    { readonly procedure: "chainedSpellAttackDamage" }
  >,
  stepIndex: number,
  critical: boolean,
): string {
  return `battle:spell:chained-damage:${invocation.procedure}:${stepIndex}:${critical ? "critical" : "normal"}`;
}

export function chainedSpellDamageExpression(
  invocation: Extract<
    RuntimeSpellProcedure,
    { readonly procedure: "chainedSpellAttackDamage" }
  >,
  damageType: DamageType,
  critical: boolean,
): string {
  const dice = invocation.damage.expr.dice * (critical ? 2 : 1);
  return `${dice}d${invocation.damage.expr.dieSize}${signedModifier(invocation.damage.expr.flat ?? 0)}-${damageType}`;
}

export function chainedSpellLeapTargetIsLegal(
  invocation: BattleExecutableSpellInvocation<
    Extract<
      RuntimeSpellProcedure,
      { readonly procedure: "chainedSpellAttackDamage" }
    >
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
        fact.sourceProcedureRef === invocation.sourceProcedureRef &&
        fact.rangeFeet === invocation.leapRangeFeet,
    )
  );
}

export function spellDamageTypes(
  invocation: Extract<
    RuntimeSpellProcedure,
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
  invocation: RuntimeExecutableDamageSpellProcedure,
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
    holeId: spellDamageHoleId(invocation, critical, spellMarkedDamageRiders),
    holeInstanceKey: holeInstanceKey(
      `battle:spell:damage-result:${invocation.procedure}:${expr}`,
    ),
    label: `Spell damage (${expr})`,
    sourceProcedureRef: invocation.sourceProcedureRef,
    critical,
    ...(spellMarkedDamageRiders.length === 0
      ? {}
      : { spellMarkedDamageRiders }),
  };
}

function spellDamageHoleId(
  invocation: RuntimeDamageSpellProcedure,
  critical: boolean,
  spellMarkedDamageRiders: readonly SpellMarkedDamageRider[],
): BattleHoleId {
  const expr = spellDamageExpression(
    invocation,
    critical,
    spellMarkedDamageRiders,
  );
  return holeId(`battle:spell:damage-result:${invocation.procedure}:${expr}`);
}

export function spellAttackSequencePartDamageHole(
  invocation: BattleExecutableSpellInvocation<
    Extract<
      RuntimeSpellProcedure,
      { readonly procedure: "spellAttackSequence" }
    >
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
    label: `Spell ${partName} ${partIndex + 1} damage (${expr})`,
    sourceProcedureRef: invocation.sourceProcedureRef,
    critical,
    ...(spellMarkedDamageRiders.length === 0
      ? {}
      : { spellMarkedDamageRiders }),
  };
}

export function spellAttackSequencePartDamageHoleId(
  invocation: Extract<
    RuntimeSpellProcedure,
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
    RuntimeSpellProcedure,
    { readonly procedure: "spellAttackSequence" }
  >,
  partIndex: number,
  critical: boolean,
): string {
  return `battle:spell:attack-sequence-part-damage:${invocation.procedure}:${partIndex}:${critical ? "critical" : "normal"}`;
}

export function spellBurstDamageHole(
  invocation: BattleExecutableSpellInvocation<
    Extract<
      RuntimeSpellProcedure,
      { readonly procedure: "attackBurstSaveDamage" }
    >
  >,
): BattleSpellDamageRollHole {
  const expr = spellBurstDamageExpression(invocation);
  return {
    kind: "rolledDice",
    holeId: spellBurstDamageHoleId(invocation),
    holeInstanceKey: holeInstanceKey(
      `battle:spell:burst-damage-result:${invocation.procedure}:${expr}`,
    ),
    label: `Spell burst damage (${expr})`,
    sourceProcedureRef: invocation.sourceProcedureRef,
    critical: false,
  };
}

function spellBurstDamageHoleId(
  invocation: Extract<
    RuntimeSpellProcedure,
    { readonly procedure: "attackBurstSaveDamage" }
  >,
): BattleHoleId {
  const expr = spellBurstDamageExpression(invocation);
  return holeId(
    `battle:spell:burst-damage-result:${invocation.procedure}:${expr}`,
  );
}

export function spellHealingRollHole(
  invocation: BattleExecutableSpellInvocation<
    Extract<
      RuntimeSpellProcedure,
      { readonly procedure: "directHitPointRestoration" }
    >
  >,
): BattleSpellHealingRollHole {
  const expr = spellHealingExpression(invocation);
  return {
    kind: "rolledDice",
    holeId: spellHealingRollHoleId(invocation),
    holeInstanceKey: holeInstanceKey(
      `battle:spell:healing-result:${invocation.procedure}:${expr}`,
    ),
    label: `Spell healing (${expr})`,
    sourceProcedureRef: invocation.sourceProcedureRef,
  };
}

function spellHealingRollHoleId(
  invocation: Extract<
    RuntimeSpellProcedure,
    { readonly procedure: "directHitPointRestoration" }
  >,
): BattleHoleId {
  const expr = spellHealingExpression(invocation);
  return holeId(`battle:spell:healing-result:${invocation.procedure}:${expr}`);
}

export function spellScalarBuffRollHole(
  invocation: BattleExecutableSpellInvocation<
    Extract<RuntimeSpellProcedure, { readonly procedure: "scalarBuff" }>
  >,
): BattleSpellHealingRollHole {
  const expr = scalarBuffTemporaryHitPointsExpression(invocation);
  return {
    kind: "rolledDice",
    holeId: spellScalarBuffRollHoleId(invocation),
    holeInstanceKey: holeInstanceKey(
      `battle:spell:scalar-buff-result:${invocation.procedure}:${expr}`,
    ),
    label: `Spell Temporary Hit Points (${expr})`,
    sourceProcedureRef: invocation.sourceProcedureRef,
  };
}

function spellScalarBuffRollHoleId(
  invocation: Extract<
    RuntimeSpellProcedure,
    { readonly procedure: "scalarBuff" }
  >,
): BattleHoleId {
  const expr = scalarBuffTemporaryHitPointsExpression(invocation);
  return holeId(
    `battle:spell:scalar-buff-result:${invocation.procedure}:${expr}`,
  );
}

export function spellRollModifierSkillChoiceHoleId(
  invocation: RuntimeSpellProcedure,
): BattleHoleId {
  return holeId(`battle:spell:skill-choice:${invocation.procedure}`);
}

export function spellRollModifierSkillChoiceHole(
  invocation: BattleExecutableSpellInvocation<
    Extract<RuntimeSpellProcedure, { readonly procedure: "rollModifier" }>
  >,
): BattleSpellSkillChoiceHole {
  return {
    kind: "skillChoice",
    holeId: spellRollModifierSkillChoiceHoleId(invocation),
    holeInstanceKey: holeInstanceKey(
      `battle:spell:skill-choice:${invocation.procedure}`,
    ),
    label: `Spell skill`,
    sourceProcedureRef: invocation.sourceProcedureRef,
    choices: invocation.skillChoices ?? [],
  };
}

export function spellRollModifierAbilityChoiceHoleId(
  invocation: Extract<
    RuntimeSpellProcedure,
    { readonly procedure: "rollModifier" }
  >,
): BattleHoleId {
  return holeId(`battle:spell:ability-choice:${invocation.procedure}`);
}

export function spellRollModifierAbilityChoiceHole(
  invocation: BattleExecutableSpellInvocation<
    Extract<RuntimeSpellProcedure, { readonly procedure: "rollModifier" }>
  >,
): BattleSpellAbilityChoiceHole {
  return {
    kind: "abilityChoice",
    holeId: spellRollModifierAbilityChoiceHoleId(invocation),
    holeInstanceKey: holeInstanceKey(
      `battle:spell:ability-choice:${invocation.procedure}`,
    ),
    label: `Spell ability`,
    sourceProcedureRef: invocation.sourceProcedureRef,
    choices: invocation.abilityChoices ?? [],
  };
}

export function rollModifierUsesTargetAbilityChoices(
  invocation: Extract<
    RuntimeSpellProcedure,
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
  invocation: RuntimeSpellProcedure,
): BattleHoleId {
  return holeId(`battle:spell:target-ability-choices:${invocation.procedure}`);
}

export function spellRollModifierTargetAbilityChoicesHole(
  invocation: BattleExecutableSpellInvocation<
    Extract<RuntimeSpellProcedure, { readonly procedure: "rollModifier" }>
  >,
): BattleSpellTargetAbilityChoicesHole {
  return {
    kind: "targetAbilityChoices",
    holeId: spellRollModifierTargetAbilityChoicesHoleId(invocation),
    holeInstanceKey: holeInstanceKey(
      `battle:spell:target-ability-choices:${invocation.procedure}`,
    ),
    label: `Spell abilities by target`,
    sourceProcedureRef: invocation.sourceProcedureRef,
    choices: invocation.abilityChoices ?? [],
  };
}

export function spellAbilityChoiceHoleId(
  invocation: Extract<
    RuntimeSpellProcedure,
    | { readonly procedure: "markedDamageRider"; readonly action: "cast" }
    | { readonly procedure: "saveGatedDamage" }
  >,
): BattleHoleId {
  return holeId(`battle:spell:ability-choice:${invocation.procedure}`);
}

export function spellAbilityChoiceHole(
  invocation: BattleExecutableSpellInvocation<
    Extract<
      RuntimeSpellProcedure,
      | { readonly procedure: "markedDamageRider"; readonly action: "cast" }
      | { readonly procedure: "saveGatedDamage" }
    >
  >,
): BattleSpellAbilityChoiceHole {
  return {
    kind: "abilityChoice",
    holeId: spellAbilityChoiceHoleId(invocation),
    holeInstanceKey: holeInstanceKey(
      `battle:spell:ability-choice:${invocation.procedure}`,
    ),
    label: `Spell ability`,
    sourceProcedureRef: invocation.sourceProcedureRef,
    choices:
      invocation.procedure === "saveGatedDamage"
        ? (invocation.failedSaveAbilityChoices ?? [])
        : invocation.abilityCheckBehavior.kind === "chosenAbilityDisadvantage"
          ? invocation.abilityCheckBehavior.choices
          : [],
  };
}

export function thaumaturgyActiveOneMinuteEffectCountHole(
  invocation: BattleExecutableSpellInvocation<
    Extract<
      RuntimeSpellProcedure,
      { readonly procedure: "thaumaturgyBoomingVoice" }
    >
  >,
): BattleThaumaturgyActiveOneMinuteEffectCountHole {
  return {
    kind: "thaumaturgyActiveOneMinuteEffectCount",
    holeId: THAUMATURGY_ACTIVE_ONE_MINUTE_EFFECT_COUNT_HOLE_ID,
    holeInstanceKey: THAUMATURGY_ACTIVE_ONE_MINUTE_EFFECT_COUNT_HOLE_INSTANCE,
    label: `Spell total active 1-minute effects`,
    sourceProcedureRef: invocation.sourceProcedureRef,
    maximumActiveOneMinuteEffects: THAUMATURGY_MAX_ACTIVE_ONE_MINUTE_EFFECTS,
    requiresTableSpellEffectCount: true,
  };
}

export function spellSavingThrowOutcomeHoleId(
  invocation: RuntimeSpellProcedure,
): BattleHoleId {
  return holeId(`battle:spell:saving-throw-outcome:${invocation.procedure}`);
}

export function spellSavingThrowOutcomeHole(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<
    Extract<
      RuntimeSpellProcedure,
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
    >
  >,
  heightenedSpellTargetId?: CombatantId,
  relationshipFacts: readonly BattleSpellTargetListRelationshipFact[] = [],
): BattleSpellSavingThrowOutcomeHole {
  const holeKey = `battle:spell:saving-throw-outcome:${invocation.procedure}`;
  const ability =
    invocation.procedure === "attackBurstSaveDamage"
      ? invocation.burst.ability
      : invocation.procedure === "rollModifier"
        ? (invocation.saveGate?.ability ?? "cha")
        : invocation.ability;
  const targeting =
    invocation.procedure === "rollModifier"
      ? invocation.targeting
      : spellSavingThrowTargeting(invocation);
  return {
    kind: "savingThrowOutcome",
    holeId: spellSavingThrowOutcomeHoleId(invocation),
    holeInstanceKey: holeInstanceKey(holeKey),
    label: (() => {
      if (invocation.procedure === "rollModifier") {
        return `Spell Saving Throw outcomes`;
      }
      const targeting = spellSavingThrowTargeting(invocation);
      return targeting.kind === "singleCombatant"
        ? `Spell Saving Throw outcome`
        : targeting.kind === "singleCreatureOrObject"
          ? `Spell Saving Throw outcome`
          : `Spell ${spellAreaTargetingLabel(targeting)} Saving Throw outcomes`;
    })(),
    sourceProcedureRef: invocation.sourceProcedureRef,
    outcomeTargeting:
      targeting.kind === "singleCombatant" ||
      targeting.kind === "singleCreatureOrObject"
        ? "singleTarget"
        : targeting.kind === "targetList"
          ? "targetList"
          : "area",
    ...(ongoingFeatureEnemyRelationshipDecisionRequired(
      state,
      actorId,
      "enemySavingThrow",
    )
      ? {
          relationshipFactRequest: {
            kind: "savingThrowTargetIsEnemy" as const,
            actorId,
          },
        }
      : {}),
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
            relationshipFacts,
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

export function carefulSpellProtectedTargetsHoleId(invocation: {
  readonly procedure: RuntimeSpellProcedure["procedure"];
}): BattleHoleId {
  return holeId(
    `battle:spell:careful-spell:protected-targets:${invocation.procedure}`,
  );
}

export function carefulSpellProtectedTargetsHole(
  state: BattleState,
  actorId: CombatantId,
  invocation: CarefulSpellProcedureFacts,
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
      `battle:spell:careful-spell:protected-targets:${invocation.procedure}`,
    ),
    label: `Spell Careful Spell protected targets`,
    sourceProcedureRef: invocation.sourceProcedureRef,
    minTargets: 1,
    maxTargets: maxProtectedTargets,
    spatialTargeting: { kind: "individualTargets" },
    choices: [...state.combatants.keys()].filter(
      (targetId) => targetId !== actorId,
    ),
    requiresTableSpatialFact: true,
  };
}

const HEIGHTENED_SPELL_TARGET_CHOICE_HOLE_ID_PREFIX =
  "battle:spell:heightened-spell:target:";

export function heightenedSpellTargetChoiceHoleId(
  sourceProcedureRef: BattleProcedureExecutionRef,
): BattleHoleId {
  return holeId(
    `${HEIGHTENED_SPELL_TARGET_CHOICE_HOLE_ID_PREFIX}${sourceProcedureRef}`,
  );
}

export function isHeightenedSpellTargetChoiceHoleId(
  candidate: BattleHoleId,
): boolean {
  return candidate.startsWith(HEIGHTENED_SPELL_TARGET_CHOICE_HOLE_ID_PREFIX);
}

export function heightenedSpellTargetChoiceHole(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<RuntimeSpellProcedure>,
): BattleTargetChoiceHole {
  return {
    kind: "targetChoice",
    holeId: heightenedSpellTargetChoiceHoleId(invocation.sourceProcedureRef),
    holeInstanceKey: holeInstanceKey(
      `${HEIGHTENED_SPELL_TARGET_CHOICE_HOLE_ID_PREFIX}${invocation.sourceProcedureRef}`,
    ),
    label: `Spell Heightened Spell target`,
    procedureRef: invocation.sourceProcedureRef,
    choices: [...state.combatants.keys()].filter(
      (targetId) => targetId !== actorId,
    ),
  };
}

export function spellSavingThrowAbility(
  invocation: Extract<
    RuntimeSpellProcedure,
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
    RuntimeSpellProcedure,
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
    ...activeCountedConditionSavingThrowRollModeProjections(state, ability),
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
    const { actorId, invocation, relationshipFacts } = rollModeContext;
    return uniqueSavingThrowRollModeProjections([
      ...baseProjections,
      ...[...state.combatants]
        .filter(
          ([targetId]) =>
            spellTargetIsHostileToCaster(
              relationshipFacts,
              actorId,
              targetId,
              invocation,
            ) &&
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
      readonly invocation: BattleExecutableSpellInvocation<
        Extract<
          RuntimeSpellProcedure,
          { readonly procedure: "saveGatedCondition" | "saveGatedDamage" }
        >
      >;
      readonly relationshipFacts: readonly BattleSpellTargetListRelationshipFact[];
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
  return [...state.combatants].flatMap(([targetId, target]) =>
    target.activeEffects
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
  );
}

function activeCountedConditionSavingThrowRollModeProjections(
  state: BattleState,
  ability: Ability,
): readonly BattleSavingThrowRollModeProjection[] {
  return [...state.combatants].flatMap(([targetId, target]) =>
    target.activeEffects.flatMap((effect) =>
      effect.kind === "spellConditionCountedEndTurnSave" &&
      effect.savingThrowDisadvantageAbility === ability
        ? [{ targetId, rollMode: "disadvantage" as const }]
        : [],
    ),
  );
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
          sourceCombatantId: effect.sourceCombatantId,
          sourceProcedureRef: effect.sourceProcedureRef,
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
  const binding = characterUnitProcedureBindings(target.origin.execution).find(
    ({ procedure }) =>
      procedure.kind === "unitFeature" &&
      procedure.execution.kind === "passiveSavingThrowRollMode" &&
      passiveSavingThrowRollModeScopeMatches(
        procedure.execution.savingThrow,
        ability,
        condition,
        isIncapacitated(target.conditions),
      ),
  );
  const execution =
    binding?.procedure.kind === "unitFeature"
      ? binding.procedure.execution
      : undefined;
  return execution?.kind !== "passiveSavingThrowRollMode"
    ? null
    : {
        targetId,
        rollMode: execution.savingThrow.mode,
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
  invocation: RuntimeDamageSpellProcedure,
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
    spellDamageHoleId(invocation, critical, spellMarkedDamageRiders)
  ) {
    return critical
      ? "Critical hit spell damage must use the critical spell damage hole."
      : "Spell damage must use the selected action-time spell act damage hole.";
  }
  const usesComponentDamageGroups =
    spellMarkedDamageRiders.length > 0 ||
    (invocation.procedure === "saveGatedDamage" &&
      invocation.additionalDamageComponents.length > 0);
  if (usesComponentDamageGroups) {
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
  const damage = runtimeSpellPrimaryDamage(invocation);
  const validation = validateRolledDiceForDiceExpr(fill.value, {
    dice:
      invocation.procedure === "repeatedDamageAllocation"
        ? damage.expr.dice * invocation.targeting.repeatedEffectCount
        : damage.expr.dice *
          ((invocation.procedure === "heldLightHurl" ||
            invocation.procedure === "spellAttackSequence" ||
            invocation.procedure === "spellAttackDamage" ||
            invocation.procedure === "spellCreatedHeldObjectAttack" ||
            invocation.procedure === "attackBurstSaveDamage") &&
          critical
            ? 2
            : 1),
    dieSize: damage.expr.dieSize,
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
  invocation: RuntimeDamageSpellProcedure,
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
    RuntimeSpellProcedure,
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
    spellAttackSequencePartDamageHoleId(invocation, partIndex, critical)
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
    RuntimeSpellProcedure,
    { readonly procedure: "directHitPointRestoration" }
  >,
): string | null {
  if (fill.holeId !== spellHealingRollHoleId(invocation)) {
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
    RuntimeSpellProcedure,
    { readonly procedure: "scalarBuff" }
  >,
): string | null {
  if (invocation.effect.kind !== "temporaryHitPoints") {
    return "Scalar buff dice are only valid for Temporary Hit Points effects.";
  }
  if (fill.holeId !== spellScalarBuffRollHoleId(invocation)) {
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
    RuntimeSpellProcedure,
    { readonly procedure: "attackBurstSaveDamage" }
  >,
): string | null {
  if (fill.holeId !== spellBurstDamageHoleId(invocation)) {
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
  readonly relationshipDecisions?: BattleDamageRelationshipDecisions;
};

export function applySpellDamage(
  state: BattleState,
  targetId: CombatantId,
  invocation: RuntimeDamageSpellProcedure,
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
    relationshipDecisions,
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
    ...(relationshipDecisions === undefined ? {} : { relationshipDecisions }),
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
  readonly relationshipDecisions?: BattleDamageRelationshipDecisions;
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
    relationshipDecisions,
  } = context;
  return applyBattleHitPointDamage({
    state,
    target,
    damageAmount,
    deathFailuresAtZeroHp: 1,
    damageDisposition,
    damageSourceId,
    spatialFacts,
    ...(relationshipDecisions === undefined ? {} : { relationshipDecisions }),
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
  invocation: RuntimeDamageSpellProcedure,
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
  invocation: RuntimeDamageSpellProcedure,
  damageRoll: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  saveDamageResult: SaveDamageResult = "full",
  spellMarkedDamageRiders: readonly SpellMarkedDamageRider[] = [],
  critical = false,
): ReadonlyMap<DamageType, number> {
  if (
    spellMarkedDamageRiders.length > 0 ||
    (invocation.procedure === "saveGatedDamage" &&
      invocation.additionalDamageComponents.length > 0)
  ) {
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
      return addDamageAmountForType(
        totals,
        component.damageType,
        applySaveDamageResult(unadjusted, saveDamageResult),
      );
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
  const damage = runtimeSpellPrimaryDamage(invocation);
  const flat =
    (damage.expr.flat ?? 0) *
    (invocation.procedure === "repeatedDamageAllocation"
      ? invocation.targeting.repeatedEffectCount
      : 1);
  const saveAdjustedDamage = applySaveDamageResult(
    diceTotal + flat,
    saveDamageResult,
  );
  return addDamageAmountForType(
    new Map(),
    damage.damageType,
    saveAdjustedDamage,
  );
}

export function spellBurstDamageByTypeForTarget(
  _target: BattleCreatureState,
  invocation: Extract<
    RuntimeSpellProcedure,
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
): ReadonlyMap<DamageType, number> {
  return addDamageAmountForType(
    new Map(),
    invocation.damage.damageType,
    spellObjectRolledDamage(invocation, damageRoll),
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
    RuntimeSpellProcedure,
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
    RuntimeSpellProcedure,
    { readonly procedure: "repeatedDamageAllocation" }
  >,
  damageRoll: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  allocationIndex: number,
  repeatedEffectCount: number,
): number {
  if (repeatedDamageAllocationNegatedForTarget(target)) {
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

export function repeatedDamageAllocationNegatedForTarget(
  target: BattleCreatureState,
): boolean {
  return target.activeEffects.some(
    (effect) =>
      effect.kind === "spellArmorClassBonus" &&
      effect.negatesRepeatedDamageAllocation,
  );
}

export function saveGateDamageResultForOutcome(
  state: BattleState,
  targetId: CombatantId,
  invocation: Extract<
    RuntimeSpellProcedure,
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
    RuntimeSpellProcedure,
    { readonly procedure: "saveGatedDamage" }
  >,
): Extract<
  UnitFeatureProcedureExecution,
  { readonly kind: "saveDamageReplacement" }
> | null {
  if (
    target?.origin.kind !== "character" ||
    invocation.successDamage !== "half" ||
    isIncapacitated(target.conditions)
  ) {
    return null;
  }
  for (const { procedure } of characterUnitProcedureBindings(
    target.origin.execution,
  )) {
    if (procedure.kind !== "unitFeature") continue;
    const execution = procedure.execution;
    if (
      execution.kind === "saveDamageReplacement" &&
      execution.ability === invocation.ability &&
      execution.requiredSuccessDamage === "half" &&
      execution.suppressedByCondition === "incapacitated"
    ) {
      return execution;
    }
  }
  return null;
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
