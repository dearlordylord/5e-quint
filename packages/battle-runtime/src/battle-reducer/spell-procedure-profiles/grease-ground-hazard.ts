// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-grease-ground-hazard unit-feature.metamagic-heightened-save-disadvantage
import { ElapsedTimeTicksSchema } from "@dnd/shared/elapsed-time";
//
// The greaseGroundHazard Spell Procedure Profile: action-time Spell Slot
// casting that creates a one-minute ground-area Difficult Terrain hazard and
// gates Prone application behind Dexterity Saving Throws when the grease
// appears, when a creature enters it, and when a creature ends its turn there.
//
// RAW anchors:
//   - SRD 5.2.1 Spells: Grease creates a 10-foot square of Difficult Terrain
//     for 1 minute; creatures standing there when it appears, entering it, or
//     ending their turn there make Dexterity Saving Throws or fall Prone.
//   - UBIQUITOUS_LANGUAGE.md: Difficult Terrain, Saving Throw, Condition,
//     Prone, Magic Action, and Spell Invocation.

import {
  elapsedTimeTicksFromTimeSpanDuration,
  type ElapsedTimeTicks,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet, MovementFeet } from "@dnd/shared/types";
import type { ActivationPhase } from "@dnd/surface/surface/types";
import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleCreatureState,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type SpellTargeting,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import { type CombatantId } from "../../identity.ts";
import { hasSaveGateRepeatSaves } from "./_save-gate-helpers.ts";
import { resolveGreaseGroundHazardSpellAct } from "../spells-resolve-save-gates.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  DcSourceSchema,
  PreparedSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import { Either, Schema } from "effect";
import {
  CAREFUL_METAMAGIC_EFFECT_KIND,
  discoverSpellMetamagicSelections,
  HEIGHTENED_METAMAGIC_EFFECT_KIND,
  spellMetamagicApplications,
} from "../metamagic-support.ts";
import {
  carefulSpellProtectedTargetsHole,
  heightenedSpellTargetChoiceHole,
  spellSavingThrowOutcomeHole,
  spellSavingThrowTargeting,
} from "../spells-holes-fills.ts";

type GreaseGroundHazardSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "greaseGroundHazard" }
>;

type GreaseGroundHazardPhase = Extract<
  ActivationPhase,
  { readonly kind: "save_gate" }
> & {
  readonly ability: "dex";
  readonly attachment: {
    readonly kind: "hole";
    readonly value: {
      readonly kind: "area";
      readonly origin: { readonly kind: "point_within_range" };
      readonly shape: {
        readonly kind: "cube";
        readonly sideFeet: 10;
      };
    };
  };
};

type GreaseGroundHazardResolveInput =
  SpellProcedureProfileResolveInput<GreaseGroundHazardSpellInvocation>;

function admitGreaseGroundHazard(
  spell: GreaseGroundHazardSpellInvocation["spell"],
  ctx: SpellAdmissionContext,
): readonly GreaseGroundHazardSpellInvocation[] {
  return supportedPreparedGreaseGroundHazardProfile(
    spell,
    ctx.actor.origin.spellcasting.spellSlots,
  );
}

export function supportedPreparedGreaseGroundHazardProfile(
  spell: GreaseGroundHazardSpellInvocation["spell"],
  spellSlots: SpellAdmissionContext["actor"]["origin"]["spellcasting"]["spellSlots"],
): readonly GreaseGroundHazardSpellInvocation[] {
  const grease = greaseGroundHazardSpell(spell);
  if (grease === null) {
    return [];
  }

  return spellSlots.flatMap(
    (slot): readonly GreaseGroundHazardSpellInvocation[] => {
      if (Number(slot.spellLevel) < spell.mechanics.level) {
        return [];
      }
      return [
        {
          access: { tag: "prepared" },
          resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
          procedure: "greaseGroundHazard",
          spell,
          ability: grease.phase.ability,
          dc: grease.phase.dc,
          targeting: grease.targeting,
          durationTicks: grease.durationTicks,
          rangeFeet: grease.rangeFeet,
        },
      ];
    },
  );
}

function greaseGroundHazardSpell(
  spell: GreaseGroundHazardSpellInvocation["spell"],
): {
  readonly phase: GreaseGroundHazardPhase;
  readonly targeting: Extract<
    SpellTargeting,
    { readonly kind: "pointOriginCube" }
  >;
  readonly durationTicks: ElapsedTimeTicks;
  readonly rangeFeet: MovementFeet;
} | null {
  if (spell.mechanics.family !== "activation") {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const durationTicks =
    spell.mechanics.duration.kind === "timed"
      ? elapsedTimeTicksFromTimeSpanDuration(spell.mechanics.duration.value)
      : null;
  if (
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 60 ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.duration.value.unit !== "minute" ||
    spell.mechanics.duration.value.amount !== 1 ||
    spell.mechanics.phases.length !== 1 ||
    !isGreaseGroundHazardPhase(phase) ||
    durationTicks === null ||
    Either.isLeft(durationTicks)
  ) {
    return null;
  }

  return {
    phase,
    targeting: {
      kind: "pointOriginCube",
      sideFeet: movementFeet(phase.attachment.value.shape.sideFeet),
    },
    durationTicks: durationTicks.right,
    rangeFeet: movementFeet(spell.mechanics.range.feet),
  };
}

function isGreaseGroundHazardPhase(
  phase: ActivationPhase | undefined,
): phase is GreaseGroundHazardPhase {
  const failedEffect = phase?.kind === "save_gate" ? phase.onFail : undefined;
  return (
    phase?.kind === "save_gate" &&
    !hasSaveGateRepeatSaves(phase) &&
    phase.ability === "dex" &&
    phase.dc.kind === "caster_spell_save_dc" &&
    phase.onSuccess.kind === "none" &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "area" &&
    phase.attachment.value.origin.kind === "point_within_range" &&
    phase.attachment.value.shape.kind === "cube" &&
    phase.attachment.value.shape.sideFeet === 10 &&
    failedEffect?.kind === "apply_condition" &&
    failedEffect.condition === "prone"
  );
}

function discoverGreaseGroundHazardCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<GreaseGroundHazardSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const actor = state.combatants.get(actorId);
  const savingThrowHole = spellSavingThrowOutcomeHole(
    state,
    actorId,
    invocation,
  );
  const baseCastAct = greaseGroundHazardCastAct(actorId, invocation, [
    savingThrowHole,
  ]);
  return [
    baseCastAct,
    ...greaseGroundHazardMetamagicCastActs({
      state,
      actorId,
      actor,
      invocation,
      baseCastAct,
      baseHoles: [savingThrowHole],
    }),
  ];
}

function greaseGroundHazardMetamagicCastActs(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly actor: BattleCreatureState | undefined;
  readonly invocation: BattleExecutableSpellInvocation<GreaseGroundHazardSpellInvocation>;
  readonly baseCastAct: BattleActDiscoveryCandidate;
  readonly baseHoles: readonly BattleHole[];
}): readonly BattleActDiscoveryCandidate[] {
  const actor = input.actor;
  if (actor === undefined) {
    return [];
  }
  return discoverSpellMetamagicSelections({
    actor,
    invocation: input.invocation,
  }).map((metamagic) => {
    const applications = spellMetamagicApplications(actor, metamagic);
    const metamagicInitialHoles = greaseGroundHazardMetamagicInitialHoles(
      input.state,
      input.actorId,
      input.invocation,
      applications,
    );
    return {
      ...input.baseCastAct,
      subject: {
        ...input.baseCastAct.subject,
        metamagic,
      },
      initialHoles:
        metamagicInitialHoles.length === 0
          ? input.baseHoles
          : metamagicInitialHoles,
    };
  });
}

function greaseGroundHazardCastAct(
  actorId: CombatantId,
  invocation: import("../../battle-reducer.ts").BattleExecutableSpellInvocation<GreaseGroundHazardSpellInvocation>,
  initialHoles: readonly BattleHole[],
): BattleActDiscoveryCandidate {
  return {
    subject: {
      tag: "actionSpell",
      actorId,
      procedureRef: invocation.sourceProcedureRef,
      mode: { tag: "cast" },
    },
    initialHoles,
  };
}

function greaseGroundHazardMetamagicInitialHoles(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<GreaseGroundHazardSpellInvocation>,
  metamagicApplications: readonly SpellMetamagicApplicationFact[],
): readonly BattleHole[] {
  const targeting = spellSavingThrowTargeting(invocation);
  const holes: BattleHole[] = [];
  if (
    targeting.kind !== "singleCombatant" &&
    metamagicApplications.some(
      (application) => application.effectKind === CAREFUL_METAMAGIC_EFFECT_KIND,
    )
  ) {
    holes.push(carefulSpellProtectedTargetsHole(state, actorId, invocation));
  }
  if (
    targeting.kind !== "singleCombatant" &&
    metamagicApplications.some(
      (application) =>
        application.effectKind === HEIGHTENED_METAMAGIC_EFFECT_KIND,
    )
  ) {
    holes.push(heightenedSpellTargetChoiceHole(state, actorId, invocation));
  }
  return holes;
}

function resolveGreaseGroundHazard(
  input: GreaseGroundHazardResolveInput,
): BattleResolutionResult {
  return resolveGreaseGroundHazardSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
    ...(input.metamagicApplications === undefined
      ? {}
      : { metamagicApplications: input.metamagicApplications }),
  });
}

const GreaseGroundHazardInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: SpellSlotInvocationResourceSchema,
    procedure: Schema.Literal("greaseGroundHazard"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    ability: Schema.Literal("dex"),
    dc: DcSourceSchema,
    targeting: Schema.Struct({
      kind: Schema.Literal("pointOriginCube"),
      sideFeet: MovementFeet,
    }),
    durationTicks: ElapsedTimeTicksSchema,
    rangeFeet: MovementFeet,
  }),
);
export const greaseGroundHazardProfile = {
  procedure: "greaseGroundHazard",
  executionSchema: GreaseGroundHazardInvocationSchema,
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  admit: admitGreaseGroundHazard,
  discoverCastAct: discoverGreaseGroundHazardCastAct,
  resolve: resolveGreaseGroundHazard,
} satisfies SpellProcedureDeclaration<
  "greaseGroundHazard",
  GreaseGroundHazardSpellInvocation
>;
import type { SpellMetamagicApplicationFact } from "../metamagic-support.ts";
