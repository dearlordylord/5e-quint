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
//   - invocationRef()                 - was the heldLight Match case in
//                                       spells-invocation-ref.ts
//   - resolve()                       - was resolveHeldLightSpellAct in
//                                       spells-resolve-release.ts
//   - applyEffect()                   - was applyHeldLightSpellEffect in
//                                       spells-active-effects.ts
//
// What stays in shared infrastructure:
//   - heldLightHurl has its own paired profile; the shared attack/damage
//     resolver still owns the hurl damage lifecycle.
//   - The central codec branch in battle-codecs.ts still owns the Schema
//     literal for this invocation - see the TODO in profile.ts.

import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet } from "@dnd/shared/types";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import { spellId } from "../../identity.ts";
import type { CombatantId } from "../../identity.ts";
import {
  maybeOpenReactionWindow,
  snapshotBattle,
  type AvailableBattleAct,
  type BattleResolutionResult,
  type BattleState,
  type BonusActionSpellBattleResolutionInput,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import { invalidResult } from "../result-helpers.ts";
import { spellCastReactionFrame } from "../spell-cast-reaction-frame.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import type { SpellInvocationRef } from "../../battle-subjects.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";

type HeldLightInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "heldLight" }
>;

export function isProduceFlameOngoingEffectSpell(
  spell: SpellRecord,
): spell is SpellRecord & {
  readonly mechanics: Extract<
    SpellRecord["mechanics"],
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
  spell: SpellRecord,
  _ctx: SpellAdmissionContext,
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
  return Either.isLeft(durationTicks)
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
          expiresAt: { kind: "duration", durationTicks: durationTicks.right },
        },
      ];
}

function discoverHeldLightCastAct(
  _state: BattleState,
  actorId: CombatantId,
  invocation: HeldLightInvocation,
): readonly AvailableBattleAct[] {
  return [
    {
      subject: {
        tag: "bonusActionSpell",
        actorId,
        invocation: heldLightInvocationRef(invocation),
        mode: { tag: "cast" },
      },
      label: invocation.spell.name,
      summary: heldLightCastSummary(invocation),
      initialHoles: [],
    },
  ];
}

function heldLightInvocationRef(
  invocation: HeldLightInvocation,
): SpellInvocationRef {
  return {
    tag: "cantrip",
    spellId: spellId(invocation.spell.id),
    procedure: "heldLight",
  };
}

function heldLightCastSummary(invocation: HeldLightInvocation): string {
  return `Cast ${invocation.spell.name} as a cantrip.`;
}

function applyHeldLightEffect(
  state: BattleState,
  actorId: CombatantId,
  invocation: HeldLightInvocation,
): BattleState {
  const caster = state.combatants.get(actorId);
  if (caster === undefined) {
    return state;
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(actorId, {
      ...caster,
      activeEffects: [
        ...caster.activeEffects.filter(
          (effect) =>
            !(
              effect.kind === "heldLight" &&
              effect.sourceSpellId === invocation.spell.id &&
              effect.sourceCombatantId === actorId
            ),
        ),
        {
          kind: "heldLight",
          sourceSpellId: invocation.spell.id,
          sourceCombatantId: actorId,
          brightRadiusFeet: invocation.light.brightRadiusFeet,
          dimAdditionalFeet: invocation.light.dimAdditionalFeet,
          expiresAt: invocation.expiresAt,
        },
      ],
    }),
  };
}

function resolveHeldLight(
  input: SpellProcedureProfileResolveInput<
    HeldLightInvocation,
    BonusActionSpellBattleResolutionInput
  >,
): BattleResolutionResult {
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.commandOptionChoice !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Held light spells do not use target, roll, damage, or save fills.",
    );
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    spellCastReactionFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: [input.actorId],
      reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
      castingResource: { kind: "bonusAction" },
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

  const effected = applyHeldLightEffect(
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

export const heldLightProfile: SpellProcedureProfile<
  "heldLight",
  HeldLightInvocation,
  BonusActionSpellBattleResolutionInput
> = {
  procedure: "heldLight",
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  isTargetListInvocation: false,
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitHeldLight,
  discoverCastAct: discoverHeldLightCastAct,
  castSummary: heldLightCastSummary,
  invocationRef: heldLightInvocationRef,
  resolve: resolveHeldLight,
};
