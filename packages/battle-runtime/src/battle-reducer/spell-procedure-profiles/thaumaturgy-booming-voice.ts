import { resolveSpellActiveEffectCast } from "../spell-active-effect-resolution.ts";
import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-self-ability-check-advantage
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS
//
// The thaumaturgyBoomingVoice Spell Procedure Profile: the Thaumaturgy cantrip
// branch that creates a one-minute self Spell Effect projecting Advantage on
// caller-supplied Charisma (Intimidation) Ability Check witnesses.
//
// What lives here:
//   - admit()           - was supportedCantripThaumaturgyBoomingVoiceSpellProfile
//                         in spells-profiles-support.ts
//   - discoverCastAct() - was the thaumaturgyBoomingVoice branch in
//                         spells-discovery.ts
//   - castSummary()     - was the thaumaturgyBoomingVoice branch in
//                         spells-discovery.ts
//   - resolve()         - was resolveThaumaturgyBoomingVoiceSpellAct in
//                         spells-resolve-support-effects.ts
//   - applyEffect()     - was applyThaumaturgyBoomingVoiceSpellEffect in
//                         spells-active-effects.ts
//
// What stays in shared infrastructure:
//   - thaumaturgyBoomingVoiceProjection and rollModifierSkillFilter stay in
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
import { ThaumaturgyBoomingVoiceTemplateSchema } from "../../active-effect/codecs.ts";

import { needsHolesResult } from "../needs-holes-result.ts";
import { invalidResult } from "../result-helpers.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { thaumaturgyActiveOneMinuteEffectCountHole } from "../spells-damage-fills.ts";
import { thaumaturgyBoomingVoiceProjection } from "../spells-profiles-support.ts";
import {
  THAUMATURGY_ACTIVE_ONE_MINUTE_EFFECT_COUNT_HOLE_ID,
  THAUMATURGY_MAX_ACTIVE_ONE_MINUTE_EFFECTS,
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

type ThaumaturgyBoomingVoiceInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "thaumaturgyBoomingVoice" }
>;

function admitThaumaturgyBoomingVoice(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly ThaumaturgyBoomingVoiceInvocation[] {
  const projection = thaumaturgyBoomingVoiceProjection(
    ctx.actor.combatantId,
    spell,
  );
  return projection === null
    ? []
    : [
        {
          access: cantripSpellAccessFor(spell.castingSource),
          resource: { tag: "none" },
          procedure: "thaumaturgyBoomingVoice",
          spell,
          actionCost: "magicAction",
          ...projection,
        },
      ];
}

function discoverThaumaturgyBoomingVoiceCastAct(
  _state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<ThaumaturgyBoomingVoiceInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  return [
    {
      subject: {
        tag: "actionSpell",
        actorId,
        procedureRef: invocation.sourceProcedureRef,
        mode: { tag: "cast" },
      },
      initialHoles: [thaumaturgyActiveOneMinuteEffectCountHole(invocation)],
    },
  ];
}

function isThaumaturgyBoomingVoiceEffectForInvocation(
  effect: BattleActiveEffect,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<ThaumaturgyBoomingVoiceInvocation>,
): effect is Extract<
  BattleActiveEffect,
  { readonly kind: "thaumaturgyBoomingVoice" }
> {
  return (
    effect.kind === "thaumaturgyBoomingVoice" &&
    effect.sourceProcedureRef === invocation.sourceProcedureRef &&
    effect.sourceCombatantId === actorId
  );
}

function applyThaumaturgyBoomingVoiceEffect(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<ThaumaturgyBoomingVoiceInvocation>,
): BattleState {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return state;
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(actorId, {
      ...actor,
      activeEffects: [
        ...actor.activeEffects.filter(
          (effect) =>
            !isThaumaturgyBoomingVoiceEffectForInvocation(
              effect,
              actorId,
              invocation,
            ),
        ),
        {
          ...invocation.activeEffect,
          sourceProcedureRef: invocation.sourceProcedureRef,
          sourceCombatantId: actorId,
        },
      ],
    }),
  };
}

function resolveThaumaturgyBoomingVoice(
  input: SpellProcedureProfileResolveInput<ThaumaturgyBoomingVoiceInvocation>,
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

  const activeCountFill = input.fillSet.thaumaturgyActiveOneMinuteEffectCount;
  if (activeCountFill === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      thaumaturgyActiveOneMinuteEffectCountHole(input.invocation),
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
      isThaumaturgyBoomingVoiceEffectForInvocation(
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
  if (activeCountAfterCast > THAUMATURGY_MAX_ACTIVE_ONE_MINUTE_EFFECTS) {
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
      applyThaumaturgyBoomingVoiceEffect(
        state,
        input.actorId,
        input.invocation,
      ),
  });
}

const ThaumaturgyBoomingVoiceInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: CantripSpellAccessSchema,
    resource: NoSpellInvocationResourceSchema,
    procedure: Schema.Literal("thaumaturgyBoomingVoice"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("magicAction"),
    activeEffect: ThaumaturgyBoomingVoiceTemplateSchema,
    rangeFeet: MovementFeet,
  }),
);
export const thaumaturgyBoomingVoiceProfile: SpellProcedureDeclaration<
  "thaumaturgyBoomingVoice",
  ThaumaturgyBoomingVoiceInvocation
> = {
  procedure: "thaumaturgyBoomingVoice",
  executionSchema: ThaumaturgyBoomingVoiceInvocationSchema,
  admit: admitThaumaturgyBoomingVoice,
  discoverCastAct: discoverThaumaturgyBoomingVoiceCastAct,
  resolve: resolveThaumaturgyBoomingVoice,
};
