import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-feather-fall-mitigation
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.FEATHER_FALL_MITIGATION_LIFECYCLE
//
// The featherFallMitigation Spell Procedure Profile: a prepared Reaction spell
// that uses caller-supplied falling-trigger and falling-target witnesses to
// attach per-target Feather Fall mitigation until landing or duration expiry.
//
// RAW anchors:
//   - SRD 5.2.1 Spells "Feather Fall": Reaction when the caster or a visible
//     creature within 60 feet falls; range 60 feet; one-minute duration; choose
//     up to five falling creatures; descent slows to 60 feet per round; landing
//     before spell end prevents fall damage and ends the spell for that target.
//   - SRD 5.2.1 Rules Glossary "Falling": landing after a fall deals
//     Bludgeoning damage and imposes Prone unless the creature avoids taking
//     fall damage.
//   - SRD 5.2.1 Rules Glossary "Reaction": a Reaction responds to a trigger
//     defined in the Reaction description.
//   - UBIQUITOUS_LANGUAGE.md: Falling is the environmental hazard; fall damage
//     is acceptable shorthand only for the damage portion.
//
// What stays in shared infrastructure:
//   - Reaction-window discovery and trigger matching in reaction-triggered-spells.ts.
//   - Landing cleanup/projection helpers in spells-active-effects.ts.
//   - The metamagic table entry remains Wave 9 migration work.

import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet } from "@dnd/shared/types";
import { Either } from "effect";

import {
  type AvailableBattleAct,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { CombatantId } from "../../identity.ts";
import { DurationBattleActiveEffectExpirationSchema } from "../../active-effect/codecs.ts";
import { invalidResult } from "../result-helpers.ts";
import { stateAfterSpellCastDeclared } from "../spell-cast-declaration.ts";
import { selectSpellTargetList } from "../spell-target-list-selection.ts";
import { sameStringSet } from "../spells-execution-facts.ts";
import { completeReactionSpellSlotCast } from "../reaction-spell-resolution.ts";
import { featherFallReactionSpellMatchesTrigger } from "../reaction-triggered-spells.ts";

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
  MovementFeet,
  PreparedSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type FeatherFallMitigationInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "featherFallMitigation" }
>;
type FeatherFallMitigationResolveInput =
  SpellProcedureProfileResolveInput<FeatherFallMitigationInvocation>;

function admitFeatherFallMitigation(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly FeatherFallMitigationInvocation[] {
  const projection = featherFallMitigationSpellProjection(
    ctx.actor.combatantId,
    spell,
  );
  if (projection === null) {
    return [];
  }
  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly FeatherFallMitigationInvocation[] =>
      Number(slot.spellLevel) < spell.mechanics.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
              procedure: "featherFallMitigation",
              spell,
              targeting: {
                kind: "targetList",
                minTargets: 1,
                maxTargets: 5,
              },
              ...projection,
            },
          ],
  );
}

function featherFallMitigationSpellProjection(
  actorId: CombatantId,
  spell: BattleSpellAdmissionSource,
): Pick<FeatherFallMitigationInvocation, "activeEffect" | "rangeFeet"> | null {
  if (
    spell.mechanics.family !== "triggered_reaction" ||
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "reaction" ||
    spell.mechanics.castingTime.trigger.kind !==
      "self_or_visible_creature_falls" ||
    spell.mechanics.castingTime.trigger.rangeFeet !== 60 ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 60 ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.duration.value.unit !== "minute" ||
    spell.mechanics.duration.value.amount !== 1 ||
    spell.mechanics.phases.length !== 1
  ) {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const effect = phase?.kind === "direct" ? phase.effects?.[0] : undefined;
  const selection =
    phase?.kind === "direct" &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "target"
      ? phase.attachment.value.selection
      : null;
  const stateFilter =
    selection !== null &&
    "stateFilter" in selection &&
    Array.isArray(selection.stateFilter)
      ? selection.stateFilter
      : [];
  if (
    phase?.kind !== "direct" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target" ||
    selection?.mode !== "choose_up_to" ||
    selection.count !== 5 ||
    !sameStringSet(stateFilter, ["falling"]) ||
    !("targetKinds" in selection) ||
    selection.targetKinds === undefined ||
    !sameStringSet(selection.targetKinds, ["creature"]) ||
    phase.effects?.length !== 1 ||
    effect?.kind !== "feather_fall_mitigation" ||
    effect.descentRateCapFeetPerRound !== 60 ||
    effect.landingOutcome !== "no_fall_damage_and_end_for_target"
  ) {
    return null;
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.value,
  );
  return Either.isLeft(durationTicks)
    ? null
    : {
        rangeFeet: movementFeet(spell.mechanics.range.feet),
        activeEffect: {
          kind: "featherFallMitigation",
          sourceCombatantId: actorId,
          expiresAt: { kind: "duration", durationTicks: durationTicks.right },
        },
      };
}

function discoverFeatherFallMitigationCastAct(): readonly AvailableBattleAct[] {
  return [];
}

function resolveFeatherFallMitigation(
  input: FeatherFallMitigationResolveInput,
): BattleResolutionResult {
  if (
    input.input.frame.trigger !== "creatureFalls" ||
    !featherFallReactionSpellMatchesTrigger(input.invocation, input.input.frame)
  ) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Feather Fall requires a matching falling Reaction trigger.",
    );
  }
  const targetSelection = selectSpellTargetList({
    state: input.input.state,
    subject: input.input.subject,
    fills: input.input.fills,
    fillSet: input.fillSet,
    actorId: input.input.subject.reactorId,
    invocation: input.invocation,
    invalidFillMessage: "Feather Fall uses only falling target-list fills.",
  });
  if (targetSelection.tag !== "selected") {
    return targetSelection;
  }
  const castingState = stateAfterSpellCastDeclared({
    state: input.input.state,
    casterId: input.input.subject.reactorId,
    invocation: input.invocation,
  });
  const effected: BattleState = targetSelection.targetIds.reduce(
    (state, targetId) => {
      const target = state.combatants.get(targetId);
      return target === undefined
        ? state
        : {
            ...state,
            combatants: new Map(state.combatants).set(targetId, {
              ...target,
              activeEffects: [
                ...target.activeEffects,
                {
                  ...input.invocation.activeEffect,
                  sourceProcedureRef: input.invocation.sourceProcedureRef,
                },
              ],
            }),
          };
    },
    castingState,
  );
  return completeReactionSpellSlotCast({
    effectedState: effected,
    errorState: input.input.state,
    casterId: input.input.subject.reactorId,
    slotLevel: input.invocation.resource.slotLevel,
  });
}

const FeatherFallMitigationInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: SpellSlotInvocationResourceSchema,
    procedure: Schema.Literal("featherFallMitigation"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    targeting: Schema.Struct({
      kind: Schema.Literal("targetList"),
      minTargets: Schema.Literal(1),
      maxTargets: Schema.Literal(5),
    }),
    activeEffect: Schema.Struct({
      kind: Schema.Literal("featherFallMitigation"),
      sourceCombatantId: CombatantId,
      expiresAt: DurationBattleActiveEffectExpirationSchema,
    }),
    rangeFeet: MovementFeet,
  }),
);
export const featherFallMitigationProfile = {
  procedure: "featherFallMitigation",
  executionSchema: FeatherFallMitigationInvocationSchema,
  admit: admitFeatherFallMitigation,
  discoverCastAct: discoverFeatherFallMitigationCastAct,
  resolve: resolveFeatherFallMitigation,
} satisfies SpellProcedureDeclaration<
  "featherFallMitigation",
  FeatherFallMitigationInvocation
>;
