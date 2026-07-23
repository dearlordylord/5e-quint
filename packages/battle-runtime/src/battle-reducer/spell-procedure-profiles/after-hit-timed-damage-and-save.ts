import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-after-hit-timed-damage-save
import {
  AbilitySchema,
  DamageTypeSchema as SurfaceDamageTypeSchema,
  DcSourceSchema,
  DiceExprSchema,
} from "@dnd/surface/surface/schema";
import { BattleActiveEffectExpirationSchema } from "../../active-effect/codecs.ts";
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS
//
// The afterHitTimedDamageAndSave Spell Procedure Profile: a Bonus Action spell
// cast immediately after a qualifying melee weapon or Unarmed Strike hit,
// adding spell damage to the triggering attack and applying a timed start-turn
// damage effect that ends on a successful Saving Throw.
//
// RAW anchors:
//   - .references/srd-5.2.1/Spells/Descriptions-S-Z.md "Searing Smite":
//     Bonus Action immediately after a Melee weapon or Unarmed Strike hit;
//     Self; 1 minute; extra Fire damage from the attack; at the start of each
//     target turn, Fire damage followed by a Constitution Saving Throw; success
//     ends the spell; higher-level slots increase all damage.
//   - SRD 5.2.1 Playing the Game "Damage Rolls".
//   - SRD 5.2.1 Rules Glossary "Saving Throw".
//   - UBIQUITOUS_LANGUAGE.md: Attack Damage Rider, Bonus Action, Attack Roll,
//     Damage Roll, Timer, Saving Throw, Spell Slot, and Spell Invocation.
//
// What stays in shared infrastructure:
//   - The attack-hit interrupt checkpoint and eligibility orchestration stay in
//     dispatcher.ts until the after-hit rider family migrates together.
//   - The active-effect turn-start damage and save-to-end lifecycle stays with
//     active-effect processing.
//   - The metamagic table entry remains Wave 9 migration work.

import type {
  DamageType,
  DiceAmount as SurfaceDiceAmount,
} from "@dnd/surface/surface/types";

import {
  type AfterHitTimedDamageAndSaveSpellInvocation,
  type AttackSpellDamageAddition,
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
} from "../../battle-state-execution.ts";
import { snapshotBattle } from "../dispatcher.ts";
import type { BattleSpellProcedureExecution } from "../../character-execution.ts";
import { CombatantId } from "../../identity.ts";
import {
  maybeOpenPostCastReadySpellCastWindow,
  maybeOpenSpellCastInterruptWindowWithTriggeredSpellChoices,
  interruptCheckpointFrame,
} from "../dispatcher.ts";
import { invalidResult } from "../result-helpers.ts";
import { spellCastInterruptFrame } from "../spell-cast-interrupt-frame.ts";
import { supportedDamageAmountExpr } from "../spells-execution-facts.ts";
import { scalarBuffActiveEffectExpiration } from "../spells-profiles-support.ts";
import { spellFillSetContainsOnlySpellCastReactionFacts } from "../spells-resolve-fill-set.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  DamageTypeSchema,
  PreparedSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type AfterHitTimedDamageAndSaveInvocation =
  AfterHitTimedDamageAndSaveSpellInvocation;

const SpellTurnStartDamageAndSaveEffectSchema = Schema.Struct({
  kind: Schema.Literal("spellTurnStartDamageAndSave"),
  source: Schema.Literal(
    "afterHitTimedDamageAndSave",
    "turnBoundaryEffectLifecycle",
  ),
  sourceCombatantId: CombatantId,
  damage: Schema.Struct({
    expr: DiceExprSchema,
    damageType: SurfaceDamageTypeSchema,
  }),
  save: Schema.Struct({
    ability: AbilitySchema,
    dc: DcSourceSchema,
    successEnds: Schema.Literal("spell"),
  }),
  expiresAt: BattleActiveEffectExpirationSchema,
});
type AfterHitTimedDamageAndSaveResolveInput =
  SpellProcedureProfileResolveInput<AfterHitTimedDamageAndSaveInvocation>;

function admitAfterHitTimedDamageAndSave(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly AfterHitTimedDamageAndSaveInvocation[] {
  const projection = afterHitTimedDamageAndSaveSpellProjection(
    ctx.actor.combatantId,
    spell,
  );
  if (projection === null) {
    return [];
  }
  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly AfterHitTimedDamageAndSaveInvocation[] => {
      if (Number(slot.spellLevel) < spell.mechanics.level) {
        return [];
      }
      const immediateDamageExpr = supportedDamageAmountExpr({
        amount: projection.immediateDamageAmount,
        spellLevel: spell.mechanics.level,
        slotLevel: slot.spellLevel,
      });
      const turnStartDamageExpr = supportedDamageAmountExpr({
        amount: projection.turnStartDamageAmount,
        spellLevel: spell.mechanics.level,
        slotLevel: slot.spellLevel,
      });
      if (immediateDamageExpr === null || turnStartDamageExpr === null) {
        return [];
      }
      return [
        {
          access: { tag: "prepared" },
          resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
          procedure: "afterHitTimedDamageAndSave",
          spell,
          actionCost: "bonusAction",
          immediateDamage: {
            expr: immediateDamageExpr,
            damageType: projection.damageType,
          },
          activeEffect: {
            kind: "spellTurnStartDamageAndSave",
            source: "afterHitTimedDamageAndSave",
            sourceCombatantId: ctx.actor.combatantId,
            damage: {
              expr: turnStartDamageExpr,
              damageType: projection.damageType,
            },
            save: {
              ability: projection.saveAbility,
              dc: projection.dc,
              successEnds: "spell",
            },
            expiresAt: projection.expiresAt,
          },
        },
      ];
    },
  );
}

function afterHitTimedDamageAndSaveSpellProjection(
  actorId: CombatantId,
  spell: BattleSpellAdmissionSource,
): {
  readonly immediateDamageAmount: SurfaceDiceAmount;
  readonly turnStartDamageAmount: SurfaceDiceAmount;
  readonly damageType: Extract<DamageType, "fire">;
  readonly saveAbility: "con";
  readonly dc: { readonly kind: "caster_spell_save_dc" };
  readonly expiresAt: AfterHitTimedDamageAndSaveInvocation["activeEffect"]["expiresAt"];
} | null {
  if (
    spell.mechanics.family !== "ongoing_effect" ||
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "bonus_action" ||
    spell.mechanics.castingTime.trigger?.kind !== "after_hit_with" ||
    spell.mechanics.castingTime.trigger.attack !==
      "melee_weapon_or_unarmed_strike" ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.duration.value.unit !== "minute" ||
    spell.mechanics.duration.value.amount !== 1 ||
    spell.mechanics.attachment.kind !== "hole" ||
    spell.mechanics.attachment.value.kind !== "target" ||
    spell.mechanics.attachment.value.selection.mode !== "one" ||
    spell.mechanics.operations.length !== 1
  ) {
    return null;
  }
  const initialPhase = spell.mechanics.initialPhase;
  const immediateDamage =
    initialPhase?.kind === "direct" ? initialPhase.effects?.[0] : undefined;
  const operation = spell.mechanics.operations[0];
  const composite =
    operation?.trigger.kind === "on_attached_turn_start" &&
    operation.effect.kind === "composite_ongoing"
      ? operation.effect
      : null;
  const turnStartDamage = composite?.effects.find(
    (effect) => effect.kind === "damage",
  );
  const saveGate = composite?.effects.find(
    (effect) => effect.kind === "save_gate",
  );
  const expiresAt = scalarBuffActiveEffectExpiration(
    actorId,
    spell.mechanics.duration,
  );
  if (
    initialPhase?.kind !== "direct" ||
    initialPhase.attachment.kind !== "hole" ||
    initialPhase.attachment.value.kind !== "target" ||
    initialPhase.attachment.value.selection.mode !== "one" ||
    initialPhase.effects?.length !== 1 ||
    immediateDamage?.kind !== "damage" ||
    immediateDamage.damageType !== "fire" ||
    immediateDamage.amount === undefined ||
    composite === null ||
    composite.effects.length !== 2 ||
    turnStartDamage?.kind !== "damage" ||
    turnStartDamage.damageType !== "fire" ||
    turnStartDamage.amount === undefined ||
    saveGate?.kind !== "save_gate" ||
    saveGate.ability !== "con" ||
    saveGate.dc.kind !== "caster_spell_save_dc" ||
    saveGate.onFail.kind !== "none" ||
    saveGate.onSuccess.kind !== "end_current_effect" ||
    expiresAt === null
  ) {
    return null;
  }
  return {
    immediateDamageAmount: immediateDamage.amount,
    turnStartDamageAmount: turnStartDamage.amount,
    damageType: "fire",
    saveAbility: "con",
    dc: { kind: "caster_spell_save_dc" },
    expiresAt,
  };
}

function discoverAfterHitTimedDamageAndSaveCastAct(
  _state: BattleState,
  _actorId: CombatantId,
  _invocation: BattleSpellProcedureExecution<AfterHitTimedDamageAndSaveInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  return [];
}

function applyAfterHitTimedDamageAndSaveSpellEffect(
  state: BattleState,
  targetId: CombatantId,
  invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "afterHitTimedDamageAndSave" }
  >,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    return state;
  }
  const replacing = target.activeEffects.filter(
    (effect) =>
      effect.kind === "spellTurnStartDamageAndSave" &&
      effect.sourceProcedureRef === invocation.sourceProcedureRef &&
      effect.sourceCombatantId === invocation.activeEffect.sourceCombatantId,
  );
  const activeEffects = [
    ...target.activeEffects.filter((effect) => !replacing.includes(effect)),
    {
      ...invocation.activeEffect,
      sourceProcedureRef: invocation.sourceProcedureRef,
    },
  ];
  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, {
      ...target,
      activeEffects,
    }),
  };
}

function resolveAfterHitTimedDamageAndSave(
  input: AfterHitTimedDamageAndSaveResolveInput,
): BattleResolutionResult {
  if (!spellFillSetContainsOnlySpellCastReactionFacts(input.fillSet, {})) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Attack-hit Bonus Action spell accepts only spell-cast Reaction trigger facts.",
    );
  }
  const attackContinuation = input.input.frame.continuation;
  const spellCastFrame = spellCastInterruptFrame({
    casterId: input.input.subject.casterId,
    invocation: input.invocation,
    targetIds: [input.input.target.combatantId],
    reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
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

  const resourced = spendSpellCastResources({
    state: input.input.state,
    actorId: input.input.subject.casterId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const damageAddition: AttackSpellDamageAddition = {
    kind: "attackSpellDamageAddition",
    sourceProcedure: "afterHitTimedDamageAndSave",
    sourceProcedureRef: input.invocation.sourceProcedureRef,
    sourceCombatantId: input.input.subject.casterId,
    damage: {
      expr: input.invocation.immediateDamage.expr,
      damageType: input.invocation.immediateDamage.damageType,
    },
  };
  const nextFrame = {
    ...input.input.frame,
    continuation: {
      ...attackContinuation,
      attackDamageAdditions: [
        ...(attackContinuation.attackDamageAdditions ?? []),
        damageAddition,
      ],
    },
  };
  const effected = applyAfterHitTimedDamageAndSaveSpellEffect(
    resourced.state,
    input.input.target.combatantId,
    input.invocation,
  );
  const nextState: BattleState = {
    ...effected,
    interruptStack: [
      ...effected.interruptStack.slice(0, -1),
      interruptCheckpointFrame(nextFrame),
    ],
  };
  const readiedSpellCastReactionWindow = maybeOpenPostCastReadySpellCastWindow({
    state: nextState,
    subject: input.input.subject,
    casterId: input.input.subject.casterId,
    sourceProcedureRef: input.invocation.sourceProcedureRef,
    spellProcedure: input.invocation.procedure,
    targetIds: [input.input.target.combatantId],
    handledInterruptTrigger: input.input.handledInterruptTrigger,
  });
  if (readiedSpellCastReactionWindow !== null) {
    return readiedSpellCastReactionWindow;
  }
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

const AfterHitTimedDamageAndSaveInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("afterHitTimedDamageAndSave"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("bonusAction"),
      immediateDamage: Schema.Struct({
        expr: DiceExprSchema,
        damageType: DamageTypeSchema,
      }),
      activeEffect: SpellTurnStartDamageAndSaveEffectSchema,
    }),
  );
export const afterHitTimedDamageAndSaveProfile = {
  procedure: "afterHitTimedDamageAndSave",
  executionSchema: AfterHitTimedDamageAndSaveInvocationSchema,
  admit: admitAfterHitTimedDamageAndSave,
  discoverCastAct: discoverAfterHitTimedDamageAndSaveCastAct,
  resolve: resolveAfterHitTimedDamageAndSave,
} satisfies SpellProcedureDeclaration<
  "afterHitTimedDamageAndSave",
  AfterHitTimedDamageAndSaveInvocation
>;
