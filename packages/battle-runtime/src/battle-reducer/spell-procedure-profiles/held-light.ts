import { resolveSpellActiveEffectCast } from "../spell-active-effect-resolution.ts";
import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
import { spellCastCandidate } from "../spell-cast-candidate.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-held-light-emitter
//
// The heldLight Spell Procedure Profile: a cantrip-access spell (today Produce
// Flame) that creates a caster-held Bright Light and Dim Light emitter.
//
// What lives here:
//   - admit()                         - was
//                                       supportedCantripHeldLightSpellProfile
//                                       in spells-profiles.ts
//   - isProduceFlameOngoingEffectSpell - shared shape parser for the paired
//                                       heldLightHurl profile
//   - discoverCastAct()               - was the heldLight branch in
//                                       spells-discovery.ts:discoverBattleActs
//   - castSummary()                   - was the heldLight branch in
//                                       spells-discovery.ts
//                                       spells-invocation-ref.ts
//   - resolve()                       - was resolveHeldLightSpellAct in
//                                       spells-resolve-release.ts
//   - applyEffect()                   - was applyHeldLightSpellEffect in
//                                       spells-active-effects.ts
//
// What stays in shared infrastructure:
//   - heldLightHurl has its own paired profile; the shared attack/damage
//     resolver still owns the hurl damage lifecycle.

import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import { attackBonus, movementFeet } from "@dnd/shared/types";
import { Either } from "effect";
import { allocateBattleActiveEffectRef } from "../../active-effect/execution-ref.ts";

import type { CombatantId } from "../../identity.ts";
import {
  type BattleActDiscoveryCandidate,
  type BattleResolutionResult,
  type BattleState,
  type BattleExecutableSpellInvocation,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { invalidResult } from "../result-helpers.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { spellAdmissionCharacterLevel } from "./profile.ts";
import { Schema } from "effect";
import { BattleActiveEffectExpirationSchema } from "../../active-effect/codecs.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  AttackBonus,
  ClassCantripSpellAccessSchema,
  DamageTypeSchema,
  MovementFeet,
  NoSpellInvocationResourceSchema,
  SingleCreatureOrObjectSpellTargetingSchema,
} from "../codec-building-blocks.ts";
import { DiceExprSchema } from "@dnd/surface/surface/schema";
import { supportedDamageAmountExpr } from "../spells-execution-facts.ts";
import type { HeldLightHurlMechanicalFacts } from "../../battle-state-execution.ts";
import { characterExecutionWithHeldLightHurl } from "../../character-execution-queries.ts";
import type { HeldLightHurlSpellProcedureExecution } from "../../character-execution.ts";

type HeldLightInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "heldLight" }
>;

export function isProduceFlameOngoingEffectSpell(
  spell: BattleSpellAdmissionSource,
): spell is BattleSpellAdmissionSource & {
  readonly mechanics: Extract<
    BattleSpellAdmissionSource["mechanics"],
    { family: "ongoing_effect" }
  >;
} {
  const earlyEnd =
    spell.mechanics.duration.kind === "timed"
      ? (spell.mechanics.duration.earlyEnd ?? [])
      : [];
  return (
    spell.mechanics.family === "ongoing_effect" &&
    spell.mechanics.level === 0 &&
    spell.mechanics.castingTime.kind === "bonus_action" &&
    spell.mechanics.range.kind === "self" &&
    spell.mechanics.attachment.kind === "self" &&
    spell.mechanics.duration.kind === "timed" &&
    spell.mechanics.duration.value.unit === "minute" &&
    spell.mechanics.duration.value.amount === 10 &&
    earlyEnd.length === 1 &&
    earlyEnd[0]?.kind === "caster_recasts_spell"
  );
}

function admitHeldLight(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly HeldLightInvocation[] {
  if (!isProduceFlameOngoingEffectSpell(spell)) {
    return [];
  }
  const lightOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "emit_light",
  );
  if (
    lightOperation === undefined ||
    lightOperation.effect.kind !== "emit_light" ||
    lightOperation.effect.brightRadiusFeet !== 20 ||
    lightOperation.effect.dimAdditionalFeet !== 20
  ) {
    return [];
  }
  const duration = spell.mechanics.duration;
  if (duration.kind !== "timed") {
    return [];
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(duration.value);
  const hurl = heldLightHurlMechanicalFacts(spell, ctx);
  return Either.isLeft(durationTicks) || hurl === null
    ? []
    : [
        {
          access: { tag: "classCantrip" },
          resource: { tag: "none" },
          procedure: "heldLight",
          spell,
          actionCost: "bonusAction",
          light: {
            brightRadiusFeet: movementFeet(
              lightOperation.effect.brightRadiusFeet,
            ),
            dimAdditionalFeet: movementFeet(
              lightOperation.effect.dimAdditionalFeet,
            ),
          },
          hurl,
          expiresAt: { kind: "duration", durationTicks: durationTicks.right },
        },
      ];
}

export function heldLightHurlMechanicalFacts(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): HeldLightHurlMechanicalFacts | null {
  if (!isProduceFlameOngoingEffectSpell(spell)) return null;
  const hurlOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "on_caster_spends_action" &&
      operation.trigger.cost?.kind === "standard_action" &&
      operation.trigger.cost.action === "magic" &&
      operation.effect.kind === "attack_roll",
  );
  if (
    hurlOperation === undefined ||
    hurlOperation.effect.kind !== "attack_roll" ||
    hurlOperation.effect.attackKind !== "ranged_spell_attack" ||
    hurlOperation.effect.onHit.length !== 1 ||
    hurlOperation.effect.onMiss.length !== 1 ||
    hurlOperation.effect.onMiss[0]?.kind !== "none"
  ) {
    return null;
  }
  const damageEffect = hurlOperation.effect.onHit[0];
  if (
    damageEffect?.kind !== "damage" ||
    !Schema.is(DamageTypeSchema)(damageEffect.damageType) ||
    damageEffect.damageType !== "fire" ||
    damageEffect.amount === undefined
  ) {
    return null;
  }
  const damageExpr = supportedDamageAmountExpr({
    amount: damageEffect.amount,
    spellLevel: spell.mechanics.level,
    characterLevel: spellAdmissionCharacterLevel(ctx),
  });
  if (damageExpr === null) return null;
  return {
    targeting: { kind: "singleCreatureOrObject" },
    damage: { expr: damageExpr, damageType: damageEffect.damageType },
    rangeFeet: movementFeet(60),
    attackKind: hurlOperation.effect.attackKind,
    attackBonus: attackBonus(
      Number(ctx.actor.origin.spellcasting.spellcastingAbilityModifier) +
        Number(ctx.actor.origin.spellcasting.proficiencyBonus),
    ),
  };
}

function discoverHeldLightCastAct(
  _state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<HeldLightInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  return [
    spellCastCandidate(
      "bonusActionSpell",
      actorId,
      invocation.sourceProcedureRef,
      [],
    ),
  ];
}

function applyHeldLightEffect(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<HeldLightInvocation>,
): BattleState {
  const caster = state.combatants.get(actorId);
  if (caster === undefined) {
    return state;
  }
  const allocation = allocateBattleActiveEffectRef({
    state,
    ownerId: actorId,
  });
  if (allocation.tag === "ownerNotFound") return state;
  const hurlExecution = {
    spellRuleFacts: invocation.spellRuleFacts,
    access: invocation.access,
    resource: invocation.resource,
    procedure: "heldLightHurl",
    sourceEffectRef: allocation.effectRef,
    sourceHeldLightProcedureRef: invocation.sourceProcedureRef,
    targeting: invocation.hurl.targeting,
    damage: invocation.hurl.damage,
    rangeFeet: invocation.hurl.rangeFeet,
    attackKind: invocation.hurl.attackKind,
    attackBonus: invocation.hurl.attackBonus,
  } satisfies HeldLightHurlSpellProcedureExecution;
  const owner = allocation.owner;
  if (owner.origin.kind !== "character") return state;
  return {
    ...allocation.state,
    combatants: new Map(allocation.state.combatants).set(actorId, {
      ...owner,
      activeEffects: [
        ...caster.activeEffects.filter(
          (effect) =>
            !(
              effect.kind === "heldLight" &&
              effect.sourceProcedureRef === invocation.sourceProcedureRef &&
              effect.sourceCombatantId === actorId
            ),
        ),
        {
          kind: "heldLight",
          effectRef: allocation.effectRef,
          sourceProcedureRef: invocation.sourceProcedureRef,
          sourceCombatantId: actorId,
          brightRadiusFeet: invocation.light.brightRadiusFeet,
          dimAdditionalFeet: invocation.light.dimAdditionalFeet,
          expiresAt: invocation.expiresAt,
        },
      ],
      origin: {
        ...owner.origin,
        execution: characterExecutionWithHeldLightHurl(
          owner.origin.execution,
          hurlExecution,
        ),
      },
    }),
  };
}

function resolveHeldLight(
  input: SpellProcedureProfileResolveInput<HeldLightInvocation>,
): BattleResolutionResult {
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!fillsBelongToSpellCastHoles(input.input.fills)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Held light spells do not use target, roll, damage, or save fills.",
    );
  }
  /* v8 ignore stop */

  return resolveSpellActiveEffectCast({
    resolution: input,
    targetIds: [input.actorId],
    castingResource: { kind: "bonusAction" },
    applyEffect: (state) =>
      applyHeldLightEffect(state, input.actorId, input.invocation),
  });
}

const HeldLightInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: ClassCantripSpellAccessSchema,
    resource: NoSpellInvocationResourceSchema,
    procedure: Schema.Literal("heldLight"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("bonusAction"),
    light: Schema.Struct({
      brightRadiusFeet: MovementFeet,
      dimAdditionalFeet: MovementFeet,
    }),
    hurl: Schema.Struct({
      targeting: SingleCreatureOrObjectSpellTargetingSchema,
      damage: Schema.Struct({
        expr: DiceExprSchema,
        damageType: DamageTypeSchema,
      }),
      rangeFeet: MovementFeet,
      attackKind: Schema.Literal("ranged_spell_attack"),
      attackBonus: AttackBonus,
    }),
    expiresAt: BattleActiveEffectExpirationSchema,
  }),
);
export const heldLightProfile: SpellProcedureDeclaration<
  "heldLight",
  HeldLightInvocation
> = {
  procedure: "heldLight",
  executionSchema: HeldLightInvocationSchema,
  admit: admitHeldLight,
  discoverCastAct: discoverHeldLightCastAct,
  resolve: resolveHeldLight,
};
