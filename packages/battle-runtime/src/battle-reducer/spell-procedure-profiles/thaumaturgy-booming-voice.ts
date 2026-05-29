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
//   - invocationRef()   - was the thaumaturgyBoomingVoice branch in
//                         spells-invocation-ref.ts
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

import type { SpellRecord } from "@dnd/surface/surface/types";

import {
  maybeOpenReactionWindow,
  snapshotBattle,
  type AvailableBattleAct,
  type BattleActiveEffect,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import type { SpellInvocationRef } from "../../battle-subjects.ts";
import { needsHolesResult } from "../hole-helpers.ts";
import { invalidResult } from "../result-helpers.ts";
import { spellCastReactionFrame } from "../spell-cast-reaction-frame.ts";
import { thaumaturgyActiveOneMinuteEffectCountHole } from "../spells-damage-fills.ts";
import { thaumaturgyBoomingVoiceProjection } from "../spells-profiles-support.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import { THAUMATURGY_MAX_ACTIVE_ONE_MINUTE_EFFECTS } from "../domain-constants.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import { spellProcedureInvocationSchema } from "./profile.ts";
import {
  BattleRuntimeObjectSchema,
  ClassCantripSpellAccessSchema,
  MovementFeet,
  NoSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type ThaumaturgyBoomingVoiceInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "thaumaturgyBoomingVoice" }
>;

function admitThaumaturgyBoomingVoice(
  spell: SpellRecord,
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
          access: { tag: "classCantrip" },
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
  invocation: ThaumaturgyBoomingVoiceInvocation,
): readonly AvailableBattleAct[] {
  return [
    {
      subject: {
        tag: "actionSpell",
        actorId,
        invocation: thaumaturgyBoomingVoiceInvocationRef(invocation),
        mode: { tag: "cast" },
      },
      label: invocation.spell.name,
      summary: thaumaturgyBoomingVoiceCastSummary(invocation),
      initialHoles: [thaumaturgyActiveOneMinuteEffectCountHole(invocation)],
    },
  ];
}

function thaumaturgyBoomingVoiceInvocationRef(
  invocation: ThaumaturgyBoomingVoiceInvocation,
): SpellInvocationRef {
  return {
    tag: "cantrip",
    spellId: spellId(invocation.spell.id),
    procedure: "thaumaturgyBoomingVoice",
  };
}

function thaumaturgyBoomingVoiceCastSummary(
  invocation: ThaumaturgyBoomingVoiceInvocation,
): string {
  return `Cast ${invocation.spell.name} as a cantrip, using the Booming Voice effect.`;
}

function isThaumaturgyBoomingVoiceEffectForInvocation(
  effect: BattleActiveEffect,
  actorId: CombatantId,
  invocation: ThaumaturgyBoomingVoiceInvocation,
): effect is Extract<
  BattleActiveEffect,
  { readonly kind: "thaumaturgyBoomingVoice" }
> {
  return (
    effect.kind === "thaumaturgyBoomingVoice" &&
    effect.sourceSpellId === invocation.spell.id &&
    effect.sourceCombatantId === actorId
  );
}

function applyThaumaturgyBoomingVoiceEffect(
  state: BattleState,
  actorId: CombatantId,
  invocation: ThaumaturgyBoomingVoiceInvocation,
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
          sourceCombatantId: actorId,
        },
      ],
    }),
  };
}

function resolveThaumaturgyBoomingVoice(
  input: SpellProcedureProfileResolveInput<ThaumaturgyBoomingVoiceInvocation>,
): BattleResolutionResult {
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.objectTarget !== undefined ||
    input.fillSet.targetSpatialFacts.length > 0 ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.attackSequencePartFills.length > 0 ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.abilityChoice !== undefined ||
    input.fillSet.commandOptionChoice !== undefined ||
    input.fillSet.areaChoice !== undefined ||
    input.fillSet.dancingLightsPlacement !== undefined ||
    input.fillSet.damageTypeChoice !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.hideousLaughterDamageRepeatSaves.length > 0 ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.mirrorImageDuplicateRoll !== undefined ||
    input.fillSet.movement !== undefined ||
    input.fillSet.spellDamageReductionRolls.length > 0 ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Thaumaturgy Booming Voice uses only the total active 1-minute effect count witness.",
    );
  }

  const activeCountFill = input.fillSet.thaumaturgyActiveOneMinuteEffectCount;
  if (activeCountFill === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      thaumaturgyActiveOneMinuteEffectCountHole(input.invocation),
    ]);
  }
  const activeCount = activeCountFill.value.activeOneMinuteEffectCount;
  if (!Number.isInteger(activeCount) || activeCount < 0) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Thaumaturgy active 1-minute effect count must be a non-negative integer.",
    );
  }
  const actor = input.input.state.combatants.get(input.actorId);
  const existingBoomingVoiceEffectCount =
    actor?.activeEffects.filter((effect) =>
      isThaumaturgyBoomingVoiceEffectForInvocation(
        effect,
        input.actorId,
        input.invocation,
      ),
    ).length ?? 0;
  if (activeCount < existingBoomingVoiceEffectCount) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Thaumaturgy active 1-minute effect count must include active Booming Voice effects tracked by battle runtime.",
    );
  }
  const activeCountAfterCast =
    activeCount - existingBoomingVoiceEffectCount + 1;
  if (activeCountAfterCast > THAUMATURGY_MAX_ACTIVE_ONE_MINUTE_EFFECTS) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Thaumaturgy can have at most three active 1-minute effects after this cast.",
    );
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    spellCastReactionFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: [input.actorId],
      reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
      castingResource: { kind: "magicAction" },
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    }),
    input.input.suppressedReactionTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const effected = applyThaumaturgyBoomingVoiceEffect(
    input.input.state,
    input.actorId,
    input.invocation,
  );
  const resourced = spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  return resourced.tag === "invalid"
    ? resourced
    : {
        tag: "resolved",
        state: resourced.state,
        snapshot: snapshotBattle(resourced.state),
      };
}

const ThaumaturgyBoomingVoiceInvocationSchema = spellProcedureInvocationSchema<
  Extract<
    SupportedSpellInvocation,
    { readonly procedure: "thaumaturgyBoomingVoice" }
  >
>(
  Schema.Struct({
    access: ClassCantripSpellAccessSchema,
    resource: NoSpellInvocationResourceSchema,
    procedure: Schema.Literal("thaumaturgyBoomingVoice"),
    spell: BattleRuntimeObjectSchema,
    actionCost: Schema.Literal("magicAction"),
    activeEffect: BattleRuntimeObjectSchema,
    rangeFeet: MovementFeet,
  }),
);
export const thaumaturgyBoomingVoiceProfile: SpellProcedureProfile<
  "thaumaturgyBoomingVoice",
  ThaumaturgyBoomingVoiceInvocation
> = {
  procedure: "thaumaturgyBoomingVoice",
  invocationSchema: ThaumaturgyBoomingVoiceInvocationSchema,
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  targetListInvocation: { kind: "none" },
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitThaumaturgyBoomingVoice,
  discoverCastAct: discoverThaumaturgyBoomingVoiceCastAct,
  castSummary: thaumaturgyBoomingVoiceCastSummary,
  invocationRef: thaumaturgyBoomingVoiceInvocationRef,
  resolve: resolveThaumaturgyBoomingVoice,
};
