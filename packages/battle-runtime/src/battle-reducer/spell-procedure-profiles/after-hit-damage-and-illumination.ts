import { resolveAfterHitSlotSpellDamageCast } from "../after-hit-spell-resolution.ts";
import { replaceTargetActiveEffect } from "../active-effect-replacement.ts";
import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-after-hit-damage-illumination
import { DiceExprSchema } from "@dnd/surface/surface/schema";
import { ElapsedTimeTicksSchema } from "@dnd/shared/elapsed-time";
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS
//
// The afterHitDamageAndIllumination Spell Procedure Profile: a Bonus Action
// spell cast immediately after a qualifying melee weapon or Unarmed Strike hit,
// adding spell damage to the triggering attack and applying a Concentration
// illumination effect to the struck target.
//
// RAW anchors:
//   - .references/srd-5.2.1/Spells/Descriptions-S-Z.md, after-hit
//     illumination spell:
//     Bonus Action immediately after a Melee weapon or Unarmed Strike hit;
//     Self; Concentration up to 1 minute; extra Radiant damage from the
//     attack; target sheds Bright Light, attack rolls against it have
//     Advantage, and it can't benefit from Invisible.
//   - SRD 5.2.1 Rules Glossary "Concentration", "Bright Light", and
//     "Invisible [Condition]".
//   - SRD 5.2.1 Playing the Game "Damage Rolls".
//   - UBIQUITOUS_LANGUAGE.md: Attack Damage Rider, Bonus Action, Attack Roll,
//     Damage Roll, Spell Slot, Concentration, and Spell Effect.
//
// What stays in shared infrastructure:
//   - The attack-hit interrupt checkpoint and eligibility orchestration stay in
//     dispatcher.ts until the after-hit rider family migrates together.
//   - Illumination emission is retained in the admitted procedure binding;
//     the durable target effect retains only its lifecycle and source ref.
//   - The metamagic table entry remains Wave 9 migration work.

import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import type {
  DamageType,
  DiceAmount as SurfaceDiceAmount,
} from "@dnd/surface/surface/types";
import { Result } from "effect";

import {
  type AfterHitDamageAndIlluminationSpellInvocation,
  type AttackSpellDamageAddition,
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
} from "../../battle-state-execution.ts";
import { CombatantId } from "../../identity.ts";
import {
  sameStringSet,
  supportedSpellSlotDamageFacts,
} from "../spells-execution-facts.ts";
import { illuminationEmissionFactsFromSurface } from "./illumination-emission-facts.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import { BattleEffectOccurrenceTemplateSchemaFields } from "../../active-effect/template-codec.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  DamageTypeSchema,
  BrightRadiusIlluminationEmissionFactsSchema,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type AfterHitDamageAndIlluminationInvocation =
  AfterHitDamageAndIlluminationSpellInvocation;

const AfterHitDamageAndIlluminationEffectSchema = Schema.Struct({
  ...BattleEffectOccurrenceTemplateSchemaFields,
  kind: Schema.Literal("afterHitDamageAndIllumination"),
  sourceCombatantId: CombatantId,
  expiresAt: Schema.Struct({
    kind: Schema.Literal("concentration"),
    combatantId: CombatantId,
    durationTicks: ElapsedTimeTicksSchema,
  }),
});
type AfterHitDamageAndIlluminationResolveInput =
  SpellProcedureProfileResolveInput<AfterHitDamageAndIlluminationInvocation>;

function admitAfterHitDamageAndIllumination(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly AfterHitDamageAndIlluminationInvocation[] {
  const projection = afterHitDamageAndIlluminationSpellProjection(
    ctx.actor.combatantId,
    spell,
  );
  if (projection === null) {
    return [];
  }
  return supportedSpellSlotDamageFacts({
    slots: ctx.spellCastOptions,
    amount: projection.damageAmount,
    spellLevel: spell.mechanics.level,
  }).map(
    ({
      slotLevel,
      damageExpr,
      payment,
    }): AfterHitDamageAndIlluminationInvocation => ({
      access: { tag: "prepared" },
      resource: spellInvocationResourceForCastOption({
        spellLevel: slotLevel,
        payment,
      }),
      procedure: "afterHitDamageAndIllumination",
      spell,
      actionCost: "bonusAction",
      damage: {
        expr: damageExpr,
        damageType: projection.damageType,
      },
      illumination: projection.illumination,
      activeEffect: {
        kind: "afterHitDamageAndIllumination",
        sourceCombatantId: ctx.actor.combatantId,
        expiresAt: projection.expiresAt,
      },
    }),
  );
}

function afterHitDamageAndIlluminationSpellProjection(
  actorId: CombatantId,
  spell: BattleSpellAdmissionSource,
): {
  readonly damageAmount: SurfaceDiceAmount;
  readonly damageType: Extract<DamageType, "radiant">;
  readonly illumination: AfterHitDamageAndIlluminationSpellInvocation["illumination"];
  readonly expiresAt: AfterHitDamageAndIlluminationSpellInvocation["activeEffect"]["expiresAt"];
} | null {
  if (
    spell.mechanics.family !== "ongoing_effect" ||
    spell.mechanics.level !== 2 ||
    spell.mechanics.castingTime.kind !== "bonus_action" ||
    spell.mechanics.castingTime.trigger?.kind !== "after_hit_with" ||
    spell.mechanics.castingTime.trigger.attack !==
      "melee_weapon_or_unarmed_strike" ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    spell.mechanics.attachment.kind !== "hole" ||
    spell.mechanics.attachment.value.kind !== "target" ||
    spell.mechanics.attachment.value.selection.mode !== "one" ||
    spell.mechanics.operations.length !== 3 ||
    !spell.mechanics.operations.every(
      (operation) => operation.trigger.kind === "passive",
    )
  ) {
    return null;
  }

  const initialPhase = spell.mechanics.initialPhase;
  const damage =
    initialPhase?.kind === "direct" ? initialPhase.effects?.[0] : undefined;
  const operationEffects = spell.mechanics.operations.map(
    (operation) => operation.effect,
  );
  const illuminationEffect = operationEffects.find(
    (effect) =>
      effect.kind === "emit_light" ||
      effect.kind === "emit_bright_illumination",
  );
  const illumination =
    illuminationEffect?.kind === "emit_light" ||
    illuminationEffect?.kind === "emit_bright_illumination"
      ? illuminationEmissionFactsFromSurface({
          effect: illuminationEffect,
          opaqueCoverInteraction: { kind: "doesNotBlockEmission" },
        })
      : null;
  const attackAdvantage = operationEffects.find(
    (effect) => effect.kind === "modify_roll_advantage",
  );
  const suppressInvisible = operationEffects.find(
    (effect) => effect.kind === "suppress_condition_benefit",
  );
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.upTo,
  );
  if (
    initialPhase?.kind !== "direct" ||
    initialPhase.attachment.kind !== "hole" ||
    initialPhase.attachment.value.kind !== "target" ||
    initialPhase.attachment.value.selection.mode !== "one" ||
    initialPhase.effects?.length !== 1 ||
    damage?.kind !== "damage" ||
    damage.damageType !== "radiant" ||
    damage.amount === undefined ||
    (illumination?.emission.kind !== "bright" &&
      illumination?.emission.kind !== "brightAndDim") ||
    attackAdvantage?.kind !== "modify_roll_advantage" ||
    attackAdvantage.mode !== "advantage" ||
    attackAdvantage.affects !== "rolls_against_self" ||
    attackAdvantage.on === undefined ||
    !sameStringSet(attackAdvantage.on, ["attack_roll"]) ||
    suppressInvisible?.kind !== "suppress_condition_benefit" ||
    suppressInvisible.condition !== "invisible" ||
    Result.isFailure(durationTicks)
  ) {
    return null;
  }

  return {
    damageAmount: damage.amount,
    damageType: "radiant",
    illumination: {
      emission: illumination.emission,
      opaqueCoverInteraction: {
        kind: illumination.opaqueCoverInteraction.kind,
      },
    },
    expiresAt: {
      kind: "concentration",
      combatantId: actorId,
      durationTicks: durationTicks.success,
    },
  };
}

function discoverAfterHitDamageAndIlluminationCastAct(): readonly BattleActDiscoveryCandidate[] {
  return [];
}

function applyAfterHitDamageAndIlluminationSpellEffect(
  state: BattleState,
  targetId: CombatantId,
  invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "afterHitDamageAndIllumination" }
  >,
): BattleState {
  return replaceTargetActiveEffect(
    state,
    targetId,
    (effect) =>
      effect.kind === "afterHitDamageAndIllumination" &&
      effect.sourceProcedureRef === invocation.sourceProcedureRef &&
      effect.sourceCombatantId === invocation.activeEffect.sourceCombatantId,
    {
      ...invocation.activeEffect,
      sourceProcedureRef: invocation.sourceProcedureRef,
    },
  );
}

function resolveAfterHitDamageAndIllumination(
  input: AfterHitDamageAndIlluminationResolveInput,
): BattleResolutionResult {
  const damageAddition: AttackSpellDamageAddition = {
    kind: "attackSpellDamageAddition",
    sourceProcedure: "afterHitDamageAndIllumination",
    sourceProcedureRef: input.invocation.sourceProcedureRef,
    sourceCombatantId: input.input.subject.casterId,
    damage: {
      expr: input.invocation.damage.expr,
      damageType: input.invocation.damage.damageType,
    },
  };
  return resolveAfterHitSlotSpellDamageCast({
    input: input.input,
    frame: input.input.frame,
    fillSet: input.fillSet,
    casterId: input.input.subject.casterId,
    invocation: input.invocation,
    targetId: input.input.target.combatantId,
    damageAddition,
    applyEffect: (state) =>
      applyAfterHitDamageAndIlluminationSpellEffect(
        state,
        input.input.target.combatantId,
        input.invocation,
      ),
  });
}

const AfterHitDamageAndIlluminationInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("afterHitDamageAndIllumination"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("bonusAction"),
      damage: Schema.Struct({
        expr: DiceExprSchema,
        damageType: DamageTypeSchema,
      }),
      illumination: BrightRadiusIlluminationEmissionFactsSchema,
      activeEffect: AfterHitDamageAndIlluminationEffectSchema,
    }),
  );
export const afterHitDamageAndIlluminationProfile = {
  procedure: "afterHitDamageAndIllumination",
  executionSchema: AfterHitDamageAndIlluminationInvocationSchema,
  admit: admitAfterHitDamageAndIllumination,
  discoverCastAct: discoverAfterHitDamageAndIlluminationCastAct,
  resolve: resolveAfterHitDamageAndIllumination,
} satisfies SpellProcedureDeclaration<
  "afterHitDamageAndIllumination",
  AfterHitDamageAndIlluminationInvocation
>;
import { spellInvocationResourceForCastOption } from "./profile.ts";
