// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-after-hit-restraint-turn-start-damage
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS
//
// The afterHitSaveGatedCondition Spell Procedure Profile: a Bonus Action spell
// cast immediately after a qualifying weapon hit, forcing a Saving Throw before
// applying a Concentration condition with start-turn damage and an escape check.
//
// RAW anchors:
//   - .references/srd-5.2.1/Spells/Descriptions-E-L.md "Ensnaring Strike":
//     Bonus Action immediately after hitting a creature with a weapon; Self;
//     Concentration up to 1 minute; target makes a Strength Saving Throw with
//     Advantage if Large or larger; failed save applies Restrained; Restrained
//     target takes Piercing damage at the start of each turn and can be freed
//     by a Strength (Athletics) check.
//   - SRD 5.2.1 Playing the Game "Saving Throws", "Making an Attack", and
//     "Damage Rolls".
//   - SRD 5.2.1 Rules Glossary "Concentration", "Restrained [Condition]",
//     and "Saving Throw".
//   - UBIQUITOUS_LANGUAGE.md: Rider, Bonus Action, Saving Throw, Restrained,
//     Concentration, Spell Slot, and Spell Invocation.
//
// What stays in shared infrastructure:
//   - The attack-hit interrupt checkpoint and eligibility orchestration stay in
//     dispatcher.ts until the after-hit rider family migrates together.
//   - The metamagic table entry remains Wave 9 migration work.

import type {
  DamageType,
  DiceAmount as SurfaceDiceAmount,
  SpellRecord,
} from "@dnd/surface/surface/types";
import { type Size } from "@dnd/shared/types";

import type { BattleInterruptTrigger } from "../../battle-interrupt-triggers.ts";
import type { SpellInvocationRef } from "../../battle-subjects.ts";
import {
  snapshotBattle,
  type AfterHitSaveGatedConditionSpellInvocation,
  type AvailableBattleAct,
  type BattleCreatureState,
  type BattleFill,
  type BattleResolutionInputForSubject,
  type BattleResolutionResult,
  type BattleSpellSavingThrowOutcomeHole,
  type BattleSpellSavingThrowOutcomeValue,
  type BattleState,
} from "../../battle-reducer.ts";
import type { BattleSubject } from "../../battle-subjects.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import { combatantEffectiveSize } from "../druid-wild-shape.ts";
import {
  maybeOpenPostCastReadySpellCastWindow,
  maybeOpenInterruptWindow,
  maybeOpenSpellCastInterruptWindowWithTriggeredSpellChoices,
} from "../dispatcher.ts";
import { needsHolesResult } from "../hole-helpers.ts";
import { invalidResult } from "../result-helpers.ts";
import { spellCastInterruptFrame } from "../spell-cast-interrupt-frame.ts";
import { spellSavingThrowOutcomeHole } from "../spells-damage-fills.ts";
import {
  applyFailedSaveSpellConditionEffects,
  selectFailedSaveConditionEffect,
} from "../spells-active-effects.ts";
import { spellFillSet, type SpellFillSet } from "../spells-resolve-fill-set.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import { spellActTurnResourceAvailable } from "../spell-turn-resources.ts";
import { supportedDamageAmountExpr } from "../spells-profile-shared.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import { spellProcedureInvocationSchema } from "./profile.ts";
import type { SupportedSpellInvocation } from "../../battle-reducer.ts";
import {
  AbilitySchema,
  BattleRuntimeObjectSchema,
  DcSourceSchema,
  PreparedSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import { CONDITIONS as ALL_CONDITIONS } from "@dnd/shared/types";

type AfterHitSaveGatedConditionInvocation =
  AfterHitSaveGatedConditionSpellInvocation;
type AttackHitBonusActionSpellCommandSubject = Extract<
  BattleSubject,
  {
    readonly tag: "runtimeCommand";
    readonly command: "castAttackHitBonusActionSpell";
  }
>;
type AfterHitSaveGatedConditionBattleResolutionInput =
  BattleResolutionInputForSubject<AttackHitBonusActionSpellCommandSubject> & {
    readonly target: BattleCreatureState;
    readonly handledInterruptTrigger?: BattleInterruptTrigger | undefined;
  };
type AfterHitSaveGatedConditionFillSet = Extract<
  SpellFillSet,
  { readonly tag: "ok" }
>;
type AfterHitSaveGatedConditionResolveInput = SpellProcedureProfileResolveInput<
  AfterHitSaveGatedConditionInvocation,
  AfterHitSaveGatedConditionBattleResolutionInput,
  readonly BattleFill[]
>;

function admitAfterHitSaveGatedCondition(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly AfterHitSaveGatedConditionInvocation[] {
  const projection = afterHitSaveGatedConditionSpellProjection(spell);
  if (projection === null) {
    return [];
  }
  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly AfterHitSaveGatedConditionInvocation[] => {
      if (Number(slot.spellLevel) < spell.mechanics.level) {
        return [];
      }
      const damageExpr = supportedDamageAmountExpr({
        amount: projection.turnStartDamageAmount,
        spellLevel: spell.mechanics.level,
        slotLevel: slot.spellLevel,
      });
      if (damageExpr === null) {
        return [];
      }
      return [
        {
          access: { tag: "prepared" },
          resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
          procedure: "afterHitSaveGatedCondition",
          spell,
          actionCost: "bonusAction",
          ability: projection.ability,
          dc: projection.dc,
          targeting: { kind: "singleCombatant" },
          effect: {
            kind: "fixed",
            condition: projection.condition,
            expiresAt: "concentration",
            escape: {
              kind: "abilityCheck",
              ability: "str",
              skill: "athletics",
              allowedActor: "targetOrCreatureWithinReach",
              successEnds: "spell",
            },
            turnStartDamage: {
              expr: damageExpr,
              damageType: projection.turnStartDamageType,
            },
            repeatSave: null,
          },
        },
      ];
    },
  );
}

function afterHitSaveGatedConditionSpellProjection(spell: SpellRecord): {
  readonly ability: "str";
  readonly dc: { readonly kind: "caster_spell_save_dc" };
  readonly condition: "restrained";
  readonly turnStartDamageAmount: SurfaceDiceAmount;
  readonly turnStartDamageType: Extract<DamageType, "piercing">;
} | null {
  if (
    spell.mechanics.family !== "ongoing_effect" ||
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "bonus_action" ||
    spell.mechanics.castingTime.trigger?.kind !== "after_hit_with" ||
    spell.mechanics.castingTime.trigger.attack !== "weapon" ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    spell.mechanics.operations.length !== 1
  ) {
    return null;
  }
  const initialPhase = spell.mechanics.initialPhase;
  const operation = spell.mechanics.operations[0];
  if (
    initialPhase?.kind !== "save_gate" ||
    initialPhase.attachment.kind !== "hole" ||
    initialPhase.attachment.value.kind !== "target" ||
    initialPhase.attachment.value.selection.mode !== "one" ||
    initialPhase.ability !== "str" ||
    initialPhase.dc.kind !== "caster_spell_save_dc" ||
    initialPhase.onFail.kind !== "apply_condition" ||
    initialPhase.onFail.condition !== "restrained" ||
    initialPhase.onSuccess.kind !== "end_current_effect" ||
    operation?.trigger.kind !== "on_attached_turn_start" ||
    operation.effect.kind !== "damage" ||
    operation.effect.damageType !== "piercing" ||
    operation.effect.amount === undefined
  ) {
    return null;
  }
  return {
    ability: "str",
    dc: { kind: "caster_spell_save_dc" },
    condition: "restrained",
    turnStartDamageAmount: operation.effect.amount,
    turnStartDamageType: "piercing",
  };
}

function discoverAfterHitSaveGatedConditionCastAct(): readonly AvailableBattleAct[] {
  return [];
}

function afterHitSaveGatedConditionInvocationRef(
  invocation: AfterHitSaveGatedConditionInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "afterHitSaveGatedCondition",
  };
}

function afterHitSaveGatedConditionCastSummary(
  invocation: AfterHitSaveGatedConditionInvocation,
): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot after a qualifying hit.`;
}

function resolveAfterHitSaveGatedCondition(
  input: AfterHitSaveGatedConditionResolveInput,
): BattleResolutionResult {
  const fillValidation = afterHitSaveGatedConditionFillSet(
    input.input,
    input.invocation,
    input.input.target,
    input.fillSet,
  );
  if (fillValidation.tag === "invalid") {
    return fillValidation.result;
  }
  if (
    !spellActTurnResourceAvailable(
      input.input.state.currentTurnResources,
      input.input.subject.casterId,
      input.invocation,
    )
  ) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Attack-hit Bonus Action spell is no longer available for this turn.",
    );
  }

  const spellCastFrame = spellCastInterruptFrame({
    casterId: input.input.subject.casterId,
    invocation: input.invocation,
    targetIds: [input.input.target.combatantId],
    reactionSpellTargetFacts: fillValidation.fillSet.reactionSpellTargetFacts,
    castingResource: { kind: "bonusAction" },
    continuation: {
      kind: "replay",
      subject: input.input.subject,
      fills: input.input.fills,
    },
  });
  const spellCastReactionWindow =
    maybeOpenSpellCastInterruptWindowWithTriggeredSpellChoices(
      input.input.state,
      spellCastFrame,
      input.input.handledInterruptTrigger,
    );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const savingThrowHole = afterHitSaveGatedConditionSavingThrowOutcomeHole(
    input.input.state,
    input.input.subject.casterId,
    input.input.target,
    input.invocation,
  );
  if (fillValidation.fillSet.savingThrowOutcomes === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      savingThrowHole,
    ]);
  }

  const failedTargets = fillValidation.fillSet.savingThrowOutcomes.outcomes[0]!
    .succeeded
    ? []
    : [input.input.target.combatantId];
  if (failedTargets.length > 0) {
    const saveFailedReactionWindow = maybeOpenInterruptWindow(
      input.input.state,
      {
        trigger: "saveFailed",
        targetId: input.input.target.combatantId,
        sourceSpellId: input.invocation.spell.id,
        continuation: {
          kind: "replay",
          subject: input.input.subject,
          fills: input.input.fills,
        },
      },
      input.input.handledInterruptTrigger,
    );
    if (saveFailedReactionWindow !== null) {
      return saveFailedReactionWindow;
    }
  }

  const resourced = spendSpellCastResources({
    state: input.input.state,
    actorId: input.input.subject.casterId,
    invocation: input.invocation,
    errorState: input.input.state,
    startConcentration: failedTargets.length > 0,
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const selectedEffect = selectFailedSaveConditionEffect(
    input.invocation.effect,
    null,
  );
  if (selectedEffect.tag !== "selected") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Readied save-gate condition spell requires a fixed failed-save condition effect.",
    );
  }
  const effected = applyFailedSaveSpellConditionEffects(
    resourced.state,
    input.input.subject.casterId,
    failedTargets,
    input.invocation,
    selectedEffect.effect,
  );
  const readiedSpellCastReactionWindow = maybeOpenPostCastReadySpellCastWindow({
    state: effected,
    subject: input.input.subject,
    casterId: input.input.subject.casterId,
    spellId: input.invocation.spell.id,
    targetIds: [input.input.target.combatantId],
    handledInterruptTrigger: input.input.handledInterruptTrigger,
  });
  if (readiedSpellCastReactionWindow !== null) {
    return readiedSpellCastReactionWindow;
  }
  return {
    tag: "resolved",
    state: effected,
    snapshot: snapshotBattle(effected),
  };
}

function afterHitSaveGatedConditionFillSet(
  input: AfterHitSaveGatedConditionBattleResolutionInput,
  invocation: AfterHitSaveGatedConditionInvocation,
  target: BattleCreatureState,
  fills: readonly BattleFill[],
):
  | {
      readonly tag: "ok";
      readonly fillSet: AfterHitSaveGatedConditionFillSet;
    }
  | {
      readonly tag: "invalid";
      readonly result: Extract<
        BattleResolutionResult,
        { readonly tag: "invalid" }
      >;
    } {
  const fillSet = spellFillSet(fills, invocation);
  if (fillSet.tag === "invalid") {
    return {
      tag: "invalid",
      result: invalidResult(input.state, "invalidFill", fillSet.message),
    };
  }
  if (
    fillSet.targetId !== undefined ||
    fillSet.targetList !== undefined ||
    fillSet.targetAllocation !== undefined ||
    fillSet.attackRoll !== undefined ||
    fillSet.damageRoll !== undefined ||
    fillSet.attackBurstDamageRoll !== undefined ||
    fillSet.healingRoll !== undefined ||
    fillSet.concentrationSavingThrows.length > 0 ||
    fillSet.damageDispositions.length > 0 ||
    fillSet.spellDamageReductionRolls.length > 0
  ) {
    return {
      tag: "invalid",
      result: invalidResult(
        input.state,
        "invalidFill",
        "Attack-hit save-gated condition spells only use Saving Throw outcome fills.",
      ),
    };
  }
  if (fillSet.savingThrowOutcomes === undefined) {
    return { tag: "ok", fillSet };
  }
  const validation = validateAfterHitSaveGatedConditionSavingThrowOutcome(
    fillSet.savingThrowOutcomes,
    target.combatantId,
  );
  return validation === null
    ? { tag: "ok", fillSet }
    : {
        tag: "invalid",
        result: invalidResult(input.state, "invalidFill", validation),
      };
}

export function afterHitSaveGatedConditionSavingThrowOutcomeHole(
  state: BattleState,
  casterId: CombatantId,
  target: BattleCreatureState,
  invocation: AfterHitSaveGatedConditionInvocation,
): BattleSpellSavingThrowOutcomeHole {
  const base = spellSavingThrowOutcomeHole(state, casterId, invocation);
  return {
    ...base,
    label: `${invocation.spell.name} Saving Throw outcome`,
    targetRollModes: [
      ...base.targetRollModes,
      ...(creatureSizeIsLargeOrLarger(combatantEffectiveSize(target))
        ? [{ targetId: target.combatantId, rollMode: "advantage" as const }]
        : []),
    ],
  };
}

function validateAfterHitSaveGatedConditionSavingThrowOutcome(
  value: BattleSpellSavingThrowOutcomeValue,
  targetId: CombatantId,
): string | null {
  if ("area" in value) {
    return "Single-target save-gate spell outcomes must not include area facts.";
  }
  return value.outcomes.length === 1 && value.outcomes[0]?.targetId === targetId
    ? null
    : "Single-target save-gate spell Saving Throw outcome must match the triggering hit target.";
}

function creatureSizeIsLargeOrLarger(size: Size): boolean {
  return size === "large" || size === "huge" || size === "gargantuan";
}

const AfterHitSaveGatedConditionInvocationSchema =
  spellProcedureInvocationSchema<
    Extract<
      SupportedSpellInvocation,
      { readonly procedure: "afterHitSaveGatedCondition" }
    >
  >(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("afterHitSaveGatedCondition"),
      spell: BattleRuntimeObjectSchema,
      actionCost: Schema.Literal("bonusAction"),
      ability: AbilitySchema,
      dc: DcSourceSchema,
      targeting: Schema.Struct({ kind: Schema.Literal("singleCombatant") }),
      effect: Schema.Struct({
        condition: Schema.Literal(...ALL_CONDITIONS),
        expiresAt: Schema.Literal("concentration"),
        escape: Schema.Struct({
          kind: Schema.Literal("abilityCheck"),
          ability: Schema.Literal("str"),
          skill: Schema.Literal("athletics"),
          successEnds: Schema.Literal("spell"),
        }),
        turnStartDamage: BattleRuntimeObjectSchema,
      }),
    }),
  );
export const afterHitSaveGatedConditionProfile = {
  procedure: "afterHitSaveGatedCondition",
  invocationSchema: AfterHitSaveGatedConditionInvocationSchema,
  metamagicCompatibility: "notActionSpellCasting",
  targetListInvocation: { kind: "none" },
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitAfterHitSaveGatedCondition,
  discoverCastAct: discoverAfterHitSaveGatedConditionCastAct,
  castSummary: afterHitSaveGatedConditionCastSummary,
  invocationRef: afterHitSaveGatedConditionInvocationRef,
  resolve: resolveAfterHitSaveGatedCondition,
} satisfies SpellProcedureProfile<
  "afterHitSaveGatedCondition",
  AfterHitSaveGatedConditionInvocation,
  AfterHitSaveGatedConditionBattleResolutionInput,
  readonly BattleFill[]
>;
