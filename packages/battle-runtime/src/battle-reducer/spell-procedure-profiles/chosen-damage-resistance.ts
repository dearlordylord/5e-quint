import { resolveSpellActiveEffectCast } from "../spell-active-effect-resolution.ts";
import { actionSpellCastCandidatesForTargetHole } from "../spell-cast-candidate.ts";
import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
import { replaceTargetActiveEffect } from "../active-effect-replacement.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-chosen-damage-resistance
import { ElapsedTimeTicksSchema } from "@dnd/shared/elapsed-time";
import { CombatantId } from "../../identity.ts";
//
// The chosenDamageResistance Spell Procedure Profile: a prepared action spell
// that targets one willing touched creature, accepts a caster-selected damage
// type from the authored spell choices, and records a Concentration-owned
// target-side damage Resistance active effect.

import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet } from "@dnd/shared/types";
import type { DamageType } from "@dnd/surface/surface/types";
import { Either, Schema } from "effect";

import {
  type BattleActDiscoveryCandidate,
  type BattleActiveEffect,
  type BattleResolutionResult,
  type BattleState,
  type BattleExecutableSpellInvocation,
  type ChosenDamageResistanceSpellInvocation,
} from "../../battle-state-execution.ts";
import { invalidResult } from "../result-helpers.ts";
import { selectSingleSpellTargetAndDamageType } from "../single-spell-target.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { ATTACK_TARGET_HOLE_ID } from "../battle-runtime-protocol.ts";
import { spellDamageTypeChoiceHole } from "../spells-damage-fills.ts";
import { sameStringSet } from "../spells-execution-facts.ts";
import { spellTargetHole } from "../spells-targeting.ts";
import {
  DamageTypeSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";

const CHOSEN_ENERGY_RESISTANCE_DAMAGE_TYPES = [
  "acid",
  "cold",
  "fire",
  "lightning",
  "thunder",
] as const satisfies ReadonlyArray<DamageType>;

type ChosenDamageResistanceResolveInput =
  SpellProcedureProfileResolveInput<ChosenDamageResistanceSpellInvocation>;

function admitChosenDamageResistance(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly ChosenDamageResistanceSpellInvocation[] {
  const projection = chosenDamageResistanceSpellProjection(
    ctx.actor.combatantId,
    spell,
  );
  if (projection === null) {
    return [];
  }
  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly ChosenDamageResistanceSpellInvocation[] =>
      Number(slot.spellLevel) < spell.mechanics.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
              procedure: "chosenDamageResistance",
              spell,
              actionCost: "magicAction",
              ...projection,
            },
          ],
  );
}

function chosenDamageResistanceSpellProjection(
  actorId: CombatantId,
  spell: BattleSpellAdmissionSource,
): Pick<
  ChosenDamageResistanceSpellInvocation,
  "damageTypeChoices" | "expiresAt" | "rangeFeet" | "targeting"
> | null {
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 3 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "touch" ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "hour" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    spell.mechanics.phases.length !== 1
  ) {
    return null;
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.upTo,
  );
  if (Either.isLeft(durationTicks)) {
    return null;
  }

  const phase = spell.mechanics.phases[0];
  const selection =
    phase?.kind === "direct" &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "target"
      ? phase.attachment.value.selection
      : null;
  const effects = phase?.kind === "direct" ? (phase.effects ?? []) : [];
  const effect = effects[0];
  const damageType =
    effect?.kind === "grant_resistance" ? effect.damageType : null;
  const choice =
    typeof damageType === "object" &&
    damageType !== null &&
    damageType.kind === "hole" &&
    typeof damageType.value === "object" &&
    damageType.value.kind === "choice"
      ? damageType.value
      : null;
  const choices =
    choice?.options.filter((option): option is DamageType =>
      Schema.is(DamageTypeSchema)(option),
    ) ?? [];
  if (
    phase?.kind !== "direct" ||
    selection === null ||
    selection.mode !== "one" ||
    !("disposition" in selection) ||
    selection.disposition !== "willing" ||
    !("targetKinds" in selection) ||
    selection.targetKinds === undefined ||
    !sameStringSet(selection.targetKinds, ["creature"]) ||
    effects.length !== 1 ||
    effect?.kind !== "grant_resistance" ||
    effect.sourceFilter !== undefined ||
    choice === null ||
    choices.length !== choice.options.length ||
    !sameStringSet(choices, CHOSEN_ENERGY_RESISTANCE_DAMAGE_TYPES)
  ) {
    return null;
  }

  return {
    targeting: {
      kind: "targetList",
      minTargets: 1,
      maxTargets: 1,
      requiredTargetDisposition: "willing",
    },
    damageTypeChoices: choices,
    expiresAt: {
      kind: "concentration",
      combatantId: actorId,
      durationTicks: durationTicks.right,
    },
    rangeFeet: movementFeet(5),
  };
}

function discoverChosenDamageResistanceCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<ChosenDamageResistanceSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  return actionSpellCastCandidatesForTargetHole(
    actorId,
    invocation.sourceProcedureRef,
    targetHole,
    [spellDamageTypeChoiceHole(invocation)],
  );
}

function resolveChosenDamageResistance(
  input: ChosenDamageResistanceResolveInput,
): BattleResolutionResult {
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !fillsBelongToSpellCastHoles(input.input.fills, [
      ATTACK_TARGET_HOLE_ID,
      spellDamageTypeChoiceHole(input.invocation).holeId,
    ])
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Chosen damage Resistance spells use one target fill and one damage type choice.",
    );
  }
  /* v8 ignore stop */

  const selection = selectSingleSpellTargetAndDamageType({
    state: input.input.state,
    subject: input.input.subject,
    actorId: input.actorId,
    invocation: input.invocation,
    targetId: input.fillSet.targetId,
    targetSpatialFacts: input.fillSet.targetSpatialFacts,
    damageType: input.fillSet.damageTypeChoice?.value,
    invalidTargetMessage:
      "Chosen damage Resistance spell target must be a willing combatant within the selected spell's supported range.",
    invalidDamageTypeMessage:
      "Chosen damage Resistance spell damage type must be one of the selected spell's choices.",
  });
  if (selection.tag !== "selected") {
    return selection;
  }

  return resolveSpellActiveEffectCast({
    resolution: input,
    targetIds: [selection.targetId],
    castingResource: { kind: "magicAction" },
    applyEffect: (state) =>
      applyChosenDamageResistanceEffect({
        state,
        actorId: input.actorId,
        targetId: selection.targetId,
        damageType: selection.damageType,
        invocation: input.invocation,
      }),
  });
}

function applyChosenDamageResistanceEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly targetId: CombatantId;
  readonly damageType: DamageType;
  readonly invocation: BattleExecutableSpellInvocation<ChosenDamageResistanceSpellInvocation>;
}): BattleState {
  const nextEffect = {
    kind: "damageResistance" as const,
    sourceProcedureRef: input.invocation.sourceProcedureRef,
    sourceCombatantId: input.actorId,
    damageType: input.damageType,
    expiresAt: input.invocation.expiresAt,
  } satisfies Extract<
    BattleActiveEffect,
    { readonly kind: "damageResistance" }
  >;
  return replaceTargetActiveEffect(
    input.state,
    input.targetId,
    (effect) =>
      effect.kind === "damageResistance" &&
      effect.sourceProcedureRef === input.invocation.sourceProcedureRef &&
      effect.sourceCombatantId === input.actorId,
    nextEffect,
  );
}

export const ChosenDamageResistanceInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("chosenDamageResistance"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("magicAction"),
      targeting: Schema.Struct({
        kind: Schema.Literal("targetList"),
        minTargets: Schema.Literal(1),
        maxTargets: Schema.Literal(1),
        requiredTargetDisposition: Schema.Literal("willing"),
      }),
      damageTypeChoices: Schema.Array(DamageTypeSchema),
      expiresAt: Schema.Struct({
        kind: Schema.Literal("concentration"),
        combatantId: CombatantId,
        durationTicks: ElapsedTimeTicksSchema,
      }),
      rangeFeet: MovementFeet,
    }),
  );

export const chosenDamageResistanceProfile: SpellProcedureDeclaration<
  "chosenDamageResistance",
  ChosenDamageResistanceSpellInvocation
> = {
  procedure: "chosenDamageResistance",
  executionSchema: ChosenDamageResistanceInvocationSchema,
  admit: admitChosenDamageResistance,
  discoverCastAct: discoverChosenDamageResistanceCastAct,
  resolve: resolveChosenDamageResistance,
};
