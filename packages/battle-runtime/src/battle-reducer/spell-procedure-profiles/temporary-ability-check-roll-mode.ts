import { resolveSpellActiveEffectCast } from "../spell-active-effect-resolution.ts";
import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-self-ability-check-advantage
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS
//
// The temporaryAbilityCheckRollMode Spell Procedure Profile: the Thaumaturgy cantrip
// branch that creates a one-minute self Spell Effect projecting Advantage on
// caller-supplied Charisma (Intimidation) Ability Check witnesses.
//
// What lives here:
//   - admit()           - was supportedCantripTemporaryAbilityCheckRollModeSpellProfile
//                         in spells-profiles-support.ts
//   - discoverCastAct() - was the temporaryAbilityCheckRollMode branch in
//                         spells-discovery.ts
//   - castSummary()     - was the temporaryAbilityCheckRollMode branch in
//                         spells-discovery.ts
//   - resolve()         - was resolveTemporaryAbilityCheckRollModeSpellAct in
//                         spells-resolve-support-effects.ts
//   - applyEffect()     - was applyTemporaryAbilityCheckRollModeSpellEffect in
//                         spells-active-effects.ts
//
// What stays in shared infrastructure:
//   - temporaryAbilityCheckRollModeProjection and rollModifierSkillFilter stay in
//     spells-profiles-support.ts until the shared roll-modifier projection
//     helpers are split.
//   - The active 1-minute-effect count witness hole stays in
//     spells-damage-fills.ts until the hole subsystem migrates.

import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleActiveEffect,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { type CombatantId } from "../../identity.ts";
import { TemporaryAbilityCheckRollModeTemplateSchema } from "../../active-effect/codecs.ts";
import {
  TemporaryAbilityCheckRollModeConcurrentDurationModeLimitSchema,
  TemporaryAbilityCheckRollModeSelectedModeSchema,
} from "../../procedure-execution/spell-procedure-execution.ts";

import { needsHolesResult } from "../needs-holes-result.ts";
import { invalidResult } from "../result-helpers.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { temporaryAbilityCheckRollModeActiveEffectCountHole } from "../spells-damage-fills.ts";
import { temporaryAbilityCheckRollModeProjection } from "../spells-profiles-support.ts";
import { replaceTargetSpellActiveEffect } from "../active-effect-replacement.ts";
import {
  THAUMATURGY_ACTIVE_ONE_MINUTE_EFFECT_COUNT_HOLE_ID,
  TEMPORARY_ABILITY_CHECK_ROLL_MODE_MAX_ACTIVE_EFFECTS,
} from "../domain-constants.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { cantripSpellAccessFor } from "./profile.ts";
import { Schema } from "effect";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  CantripSpellAccessSchema,
  MovementFeet,
  NoSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type TemporaryAbilityCheckRollModeInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "temporaryAbilityCheckRollMode" }
>;

function admitTemporaryAbilityCheckRollMode(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly TemporaryAbilityCheckRollModeInvocation[] {
  const projection = temporaryAbilityCheckRollModeProjection(
    ctx.actor.combatantId,
    spell,
  );
  return projection === null
    ? []
    : [
        {
          access: cantripSpellAccessFor(spell.castingSource),
          resource: { tag: "none" },
          procedure: "temporaryAbilityCheckRollMode",
          spell,
          actionCost: "magicAction",
          ...projection,
        },
      ];
}

function discoverTemporaryAbilityCheckRollModeCastAct(
  _state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<TemporaryAbilityCheckRollModeInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  return [
    {
      subject: {
        tag: "actionSpell",
        actorId,
        procedureRef: invocation.sourceProcedureRef,
        mode: { tag: "cast" },
      },
      initialHoles: [
        temporaryAbilityCheckRollModeActiveEffectCountHole(invocation),
      ],
    },
  ];
}

function isTemporaryAbilityCheckRollModeEffectForInvocation(
  effect: BattleActiveEffect,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<TemporaryAbilityCheckRollModeInvocation>,
): effect is Extract<
  BattleActiveEffect,
  { readonly kind: "temporaryAbilityCheckRollMode" }
> {
  return (
    effect.kind === "temporaryAbilityCheckRollMode" &&
    effect.sourceProcedureRef === invocation.sourceProcedureRef &&
    effect.sourceCombatantId === actorId
  );
}

function applyTemporaryAbilityCheckRollModeEffect(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<TemporaryAbilityCheckRollModeInvocation>,
): BattleState {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return state;
  }
  return replaceTargetSpellActiveEffect(
    state,
    actorId,
    (effect) =>
      isTemporaryAbilityCheckRollModeEffectForInvocation(
        effect,
        actorId,
        invocation,
      ),
    {
      ...invocation.activeEffect,
      sourceProcedureRef: invocation.sourceProcedureRef,
      sourceCombatantId: actorId,
    },
  );
}

function resolveTemporaryAbilityCheckRollMode(
  input: SpellProcedureProfileResolveInput<TemporaryAbilityCheckRollModeInvocation>,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !fillsBelongToSpellCastHoles(input.input.fills, [
      THAUMATURGY_ACTIVE_ONE_MINUTE_EFFECT_COUNT_HOLE_ID,
    ])
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Thaumaturgy Booming Voice uses only the total active 1-minute effect count witness.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const activeCountFill =
    input.fillSet.temporaryAbilityCheckRollModeActiveEffectCount;
  if (activeCountFill === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      temporaryAbilityCheckRollModeActiveEffectCountHole(input.invocation),
    ]);
  }
  const activeCount = activeCountFill.value.activeOneMinuteEffectCount;
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!Number.isInteger(activeCount) || activeCount < 0) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Thaumaturgy active 1-minute effect count must be a non-negative integer.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const actor = input.input.state.combatants.get(input.actorId);
  const existingBoomingVoiceEffectCount =
    actor?.activeEffects.filter((effect) =>
      isTemporaryAbilityCheckRollModeEffectForInvocation(
        effect,
        input.actorId,
        input.invocation,
      ),
    ).length ?? 0;
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (activeCount < existingBoomingVoiceEffectCount) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Thaumaturgy active 1-minute effect count must include active Booming Voice effects tracked by battle runtime.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const activeCountAfterCast =
    activeCount - existingBoomingVoiceEffectCount + 1;
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    activeCountAfterCast > TEMPORARY_ABILITY_CHECK_ROLL_MODE_MAX_ACTIVE_EFFECTS
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Thaumaturgy can have at most three active 1-minute effects after this cast.",
    );
  }
  /* v8 ignore stop -- @preserve */

  return resolveSpellActiveEffectCast({
    resolution: input,
    targetIds: [input.actorId],
    castingResource: { kind: "magicAction" },
    applyEffect: (state) =>
      applyTemporaryAbilityCheckRollModeEffect(
        state,
        input.actorId,
        input.invocation,
      ),
  });
}

const TemporaryAbilityCheckRollModeInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: CantripSpellAccessSchema,
      resource: NoSpellInvocationResourceSchema,
      procedure: Schema.Literal("temporaryAbilityCheckRollMode"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("magicAction"),
      activeEffect: TemporaryAbilityCheckRollModeTemplateSchema,
      rangeFeet: MovementFeet,
      selectedMode: TemporaryAbilityCheckRollModeSelectedModeSchema,
      concurrentDurationModeLimit:
        TemporaryAbilityCheckRollModeConcurrentDurationModeLimitSchema,
    }),
  );
export const temporaryAbilityCheckRollModeProfile: SpellProcedureDeclaration<
  "temporaryAbilityCheckRollMode",
  TemporaryAbilityCheckRollModeInvocation
> = {
  procedure: "temporaryAbilityCheckRollMode",
  executionSchema: TemporaryAbilityCheckRollModeInvocationSchema,
  admit: admitTemporaryAbilityCheckRollMode,
  discoverCastAct: discoverTemporaryAbilityCheckRollModeCastAct,
  resolve: resolveTemporaryAbilityCheckRollMode,
};
