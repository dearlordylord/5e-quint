// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-sleep-target-admission
//
// The sleepTargetAdmission Spell Procedure Profile: action-time Spell Slot
// casting where creatures chosen in a point-origin Sphere make a Wisdom Saving
// Throw before entering Sleep's two-stage Incapacitated-to-Unconscious
// lifecycle.
//
// RAW anchors:
//   - SRD 5.2.1 Spells: Sleep requires a Wisdom Saving Throw in a 5-foot-radius
//     Sphere, then repeats the save at the end of the target's next turn.
//   - UBIQUITOUS_LANGUAGE.md: Saving Throw, Condition, Unconscious, Magic
//     Action, and Spell Invocation.

import { movementFeet, MovementFeet } from "@dnd/shared/types";
import type { ActivationPhase } from "@dnd/surface/surface/types";
import type { SpellInvocationRef } from "../../battle-subjects.ts";
import {
  SUPPORTED_POINT_SPHERE_SAVE_GATE_RADIUS_FEET,
  type ActionSpellBattleResolutionInput,
  type AvailableBattleAct,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type SpellTargeting,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import {
  discoverSpellMetamagicSelections,
  spellMetamagicLabel,
} from "../metamagic.ts";
import {
  spellSavingThrowAbility,
  spellSavingThrowOutcomeHole,
} from "../spells-holes-fills.ts";
import { readiedSpellAct } from "../spells-discovery.ts";
import { resolveSleepTargetAdmissionSpellAct } from "../spells-resolve-save-gates.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import { spellProcedureInvocationSchema } from "./profile.ts";
import {
  BattleRuntimeObjectSchema,
  DcSourceSchema,
  PreparedSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type SleepTargetAdmissionSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "sleepTargetAdmission" }
>;

type SleepTargetAdmissionPhase = Extract<
  ActivationPhase,
  { readonly kind: "save_gate" }
> & {
  readonly ability: "wis";
  readonly attachment: {
    readonly kind: "hole";
    readonly value: {
      readonly kind: "area";
      readonly origin: { readonly kind: "point_within_range" };
      readonly shape: {
        readonly kind: "sphere";
        readonly radiusFeet: number;
      };
    };
  };
};

type SleepTargetAdmissionResolveInput = SpellProcedureProfileResolveInput<
  SleepTargetAdmissionSpellInvocation,
  ActionSpellBattleResolutionInput
>;

function admitSleepTargetAdmission(
  spell: SleepTargetAdmissionSpellInvocation["spell"],
  ctx: SpellAdmissionContext,
): readonly SleepTargetAdmissionSpellInvocation[] {
  return supportedPreparedSleepTargetAdmissionProfile(
    spell,
    ctx.actor.origin.spellcasting.spellSlots,
  );
}

export function supportedPreparedSleepTargetAdmissionProfile(
  spell: SleepTargetAdmissionSpellInvocation["spell"],
  spellSlots: SpellAdmissionContext["actor"]["origin"]["spellcasting"]["spellSlots"],
): readonly SleepTargetAdmissionSpellInvocation[] {
  const sleep = sleepTargetAdmissionSpell(spell);
  if (sleep === null) {
    return [];
  }

  return spellSlots.flatMap(
    (slot): readonly SleepTargetAdmissionSpellInvocation[] => {
      if (Number(slot.spellLevel) < spell.mechanics.level) {
        return [];
      }
      return [
        {
          access: { tag: "prepared" },
          resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
          procedure: "sleepTargetAdmission",
          spell,
          ability: sleep.phase.ability,
          dc: sleep.phase.dc,
          targeting: sleep.targeting,
          rangeFeet: sleep.rangeFeet,
        },
      ];
    },
  );
}

function sleepTargetAdmissionSpell(
  spell: SleepTargetAdmissionSpellInvocation["spell"],
): {
  readonly phase: SleepTargetAdmissionPhase;
  readonly targeting: Extract<
    SpellTargeting,
    { readonly kind: "pointOriginSphere" }
  >;
  readonly rangeFeet: MovementFeet;
} | null {
  if (spell.mechanics.family !== "activation") {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const earlyEnd =
    spell.mechanics.duration.kind === "concentration"
      ? (spell.mechanics.duration.earlyEnd ?? [])
      : [];
  if (
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 60 ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    earlyEnd.length !== 1 ||
    earlyEnd[0]?.kind !== "target_takes_damage" ||
    spell.mechanics.phases.length !== 1 ||
    !isSleepTargetAdmissionPhase(phase)
  ) {
    return null;
  }

  return {
    phase,
    targeting: {
      kind: "pointOriginSphere",
      radiusFeet: movementFeet(phase.attachment.value.shape.radiusFeet),
    },
    rangeFeet: movementFeet(spell.mechanics.range.feet),
  };
}

function isSleepTargetAdmissionPhase(
  phase: ActivationPhase | undefined,
): phase is SleepTargetAdmissionPhase {
  const repeatSaves = phase?.kind === "save_gate" ? phase.repeatSaves : [];
  const repeatSave = repeatSaves?.length === 1 ? repeatSaves[0] : undefined;
  const repeatFailure =
    repeatSave !== undefined ? repeatSave.onFailAgain : undefined;
  return (
    phase?.kind === "save_gate" &&
    phase.ability === "wis" &&
    phase.dc.kind === "caster_spell_save_dc" &&
    phase.onSuccess.kind === "none" &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "area" &&
    phase.attachment.value.origin.kind === "point_within_range" &&
    phase.attachment.value.shape.kind === "sphere" &&
    phase.attachment.value.shape.radiusFeet ===
      SUPPORTED_POINT_SPHERE_SAVE_GATE_RADIUS_FEET &&
    phase.onFail.kind === "apply_condition" &&
    phase.onFail.condition === "incapacitated" &&
    repeatSave !== undefined &&
    repeatSave.cadence === "end_of_target_turn" &&
    repeatSave.rollMode === undefined &&
    repeatSave.onSuccess === "ends_on_target" &&
    repeatFailure?.kind === "apply_condition" &&
    repeatFailure.condition === "unconscious"
  );
}

function discoverSleepTargetAdmissionCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: SleepTargetAdmissionSpellInvocation,
): readonly AvailableBattleAct[] {
  const actor = state.combatants.get(actorId);
  const initialHole = spellSavingThrowOutcomeHole(state, actorId, invocation);
  const baseCastAct = sleepTargetAdmissionCastAct(
    actorId,
    invocation,
    [initialHole],
    invocation.spell.name,
    sleepTargetAdmissionCastSummaryWithSavingThrow(invocation),
  );
  const metamagicCastActs =
    actor === undefined
      ? []
      : discoverSpellMetamagicSelections({ actor, invocation }).map(
          (metamagic) => {
            const label = spellMetamagicLabel(metamagic);
            return {
              ...baseCastAct,
              subject: {
                ...baseCastAct.subject,
                metamagic,
              },
              initialHoles: [
                spellSavingThrowOutcomeHole(state, actorId, invocation),
              ],
              label: `${invocation.spell.name} (${label})`,
              summary: `${baseCastAct.summary} Cast with ${label}.`,
            };
          },
        );
  const castActs = [baseCastAct, ...metamagicCastActs];
  return [...castActs, ...readiedSpellAct(state, actorId, invocation)];
}

function sleepTargetAdmissionCastAct(
  actorId: CombatantId,
  invocation: SleepTargetAdmissionSpellInvocation,
  initialHoles: readonly BattleHole[],
  label: string,
  summary: string,
): AvailableBattleAct {
  return {
    subject: {
      tag: "actionSpell",
      actorId,
      invocation: sleepTargetAdmissionInvocationRef(invocation),
      mode: { tag: "cast" },
    },
    label,
    summary,
    initialHoles,
  };
}

function sleepTargetAdmissionInvocationRef(
  invocation: SleepTargetAdmissionSpellInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "sleepTargetAdmission",
  };
}

function sleepTargetAdmissionCastSummary(
  invocation: SleepTargetAdmissionSpellInvocation,
): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
}

function sleepTargetAdmissionCastSummaryWithSavingThrow(
  invocation: SleepTargetAdmissionSpellInvocation,
): string {
  return `${sleepTargetAdmissionCastSummary(
    invocation,
  )} Table-supplied affected targets make ${spellSavingThrowAbility(
    invocation,
  ).toUpperCase()} Saving Throws.`;
}

function resolveSleepTargetAdmission(
  input: SleepTargetAdmissionResolveInput,
): BattleResolutionResult {
  return resolveSleepTargetAdmissionSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
  });
}

const SleepTargetAdmissionInvocationSchema = spellProcedureInvocationSchema<
  Extract<
    SupportedSpellInvocation,
    { readonly procedure: "sleepTargetAdmission" }
  >
>(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: SpellSlotInvocationResourceSchema,
    procedure: Schema.Literal("sleepTargetAdmission"),
    spell: BattleRuntimeObjectSchema,
    ability: Schema.Literal("wis"),
    dc: DcSourceSchema,
    targeting: Schema.Struct({
      kind: Schema.Literal("pointOriginSphere"),
      radiusFeet: MovementFeet,
    }),
    rangeFeet: MovementFeet,
  }),
);
export const sleepTargetAdmissionProfile = {
  procedure: "sleepTargetAdmission",
  invocationSchema: SleepTargetAdmissionInvocationSchema,
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  isTargetListInvocation: false,
  isReadiedSpellCompatible: true,
  knownWillingTargetSpellIds: [],
  admit: admitSleepTargetAdmission,
  discoverCastAct: discoverSleepTargetAdmissionCastAct,
  castSummary: sleepTargetAdmissionCastSummary,
  invocationRef: sleepTargetAdmissionInvocationRef,
  resolve: resolveSleepTargetAdmission,
} satisfies SpellProcedureProfile<
  "sleepTargetAdmission",
  SleepTargetAdmissionSpellInvocation,
  ActionSpellBattleResolutionInput
>;
