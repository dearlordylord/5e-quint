import { spellInvocationResourceForCastOption } from "./profile.ts";
import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-antimagic-field-ongoing-spell-suppression
import { ElapsedTimeTicksSchema } from "@dnd/shared/elapsed-time";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-antimagic-field-action-interdiction
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.ANTIMAGIC_FIELD_ONGOING_SUPPRESSION
//
// The Antimagic Field ongoing-spell suppression Spell Procedure Profile:
// action-time level-8 Spell Slot casting creates a caster-owned Concentration
// 10-foot Emanation. The runtime owns Spell Slot spending, Concentration
// duration, caller-supplied self-origin Emanation identity, caller-supplied
// tracked ongoing Spell Effect witnesses, suppression of ordinary tracked
// ongoing Spell Effects without deleting their occurrence state, artifact/deity
// source exceptions, and cleanup.
//
// RAW anchors:
//   - .references/srd-5.2.1/Spells/Descriptions-A-D.md "Antimagic Field":
//     Action; Self; Concentration up to 1 hour; an aura of antimagic in a
//     10-foot Emanation; ongoing spells except those cast by an Artifact or a
//     deity are suppressed in the area; suppressed effects do not function, but
//     suppressed time counts against duration.
//   - .references/srd-5.2.1/Rules-Glossary.md "Emanation": an Emanation
//     extends from a creature or object in all directions and moves with its
//     origin unless instantaneous or stationary.
//   - UBIQUITOUS_LANGUAGE.md: Magic Action, Concentration, Spell Slot, Spell
//     Invocation, Spell Effect, Area of Effect/Emanation, and Battle Runtime
//     Boundaries.

import {
  elapsedTimeTicksFromTimeSpanDuration,
  type ElapsedTimeTicks,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet } from "@dnd/shared/types";
import { Result } from "effect";

import {
  type ActionSpellBattleResolutionInput,
  type BattleMagicSuppressionAffectedOngoingSpellEffect,
  type BattleMagicSuppressionAreaChoice,
  type BattleResolutionResult,
  type BattleState,
  type BattleExecutableSpellInvocation,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { type BattleAreaId, type CombatantId } from "../../identity.ts";
import {
  magicSuppressionOngoingSpellEffectRefForActiveEffect,
  magicSuppressionOngoingSpellEffectRefForEmitter,
  isTrackedOngoingSpellLightEmitter,
  ongoingSpellEffectRefKey,
} from "../antimagic-field-suppression.ts";
import { snapshotBattle } from "../interrupt-execution.ts";
import { needsHolesResult } from "../needs-holes-result.ts";
import { invalidResult } from "../result-helpers.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { sameStringSet } from "../spells-execution-facts.ts";
import { spellAreaChoiceHole } from "../spells-holes-fills.ts";
import { spellAreaChoiceHoleId } from "../spells-targeting.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import { replaceTargetSpellActiveEffect } from "../active-effect-replacement.ts";
import { discoverActionSpellAreaCastAct } from "../spell-area-cast-discovery.ts";
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
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type MagicSuppressionEmanationInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "magicSuppressionEmanation" }
>;
type MagicSuppressionEmanationResolveInput =
  SpellProcedureProfileResolveInput<MagicSuppressionEmanationInvocation>;
type MagicSuppressionEmanationProfileShape = {
  readonly radiusFeet: number;
  readonly durationTicks: ElapsedTimeTicks;
};

const ANTIMAGIC_FIELD_LEVEL = 8;
const ANTIMAGIC_FIELD_RANGE_FEET = 0;
const ANTIMAGIC_FIELD_DURATION_HOURS = 1;
const ANTIMAGIC_FIELD_RADIUS_FEET = 10;
const ANTIMAGIC_FIELD_SUPPRESSION_EXCEPT_SOURCES = [
  "artifact",
  "deity",
] as const satisfies readonly string[];

function admitMagicSuppressionEmanation(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly MagicSuppressionEmanationInvocation[] {
  const profile = magicSuppressionEmanationSpell(spell);
  if (profile === null) {
    return [];
  }

  return ctx.spellCastOptions.flatMap(
    (slot): readonly MagicSuppressionEmanationInvocation[] => {
      if (Number(slot.spellLevel) < ANTIMAGIC_FIELD_LEVEL) {
        return [];
      }
      return [
        {
          access: { tag: "prepared" },
          resource: spellInvocationResourceForCastOption(slot),
          procedure: "magicSuppressionEmanation",
          spell,
          targeting: {
            kind: "selfOriginEmanation",
            radiusFeet: movementFeet(profile.radiusFeet),
          },
          durationTicks: profile.durationTicks,
          rangeFeet: movementFeet(ANTIMAGIC_FIELD_RANGE_FEET),
        },
      ];
    },
  );
}

function magicSuppressionEmanationSpell(
  spell: BattleSpellAdmissionSource,
): MagicSuppressionEmanationProfileShape | null {
  if (spell.mechanics.family !== "ongoing_effect") {
    return null;
  }
  const attachment = spell.mechanics.attachment;
  const durationTicks =
    spell.mechanics.duration.kind === "concentration"
      ? elapsedTimeTicksFromTimeSpanDuration(spell.mechanics.duration.upTo)
      : null;
  const suppressOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "suppress_ongoing_magic_effects",
  );
  if (
    spell.mechanics.level !== ANTIMAGIC_FIELD_LEVEL ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "hour" ||
    spell.mechanics.duration.upTo.amount !== ANTIMAGIC_FIELD_DURATION_HOURS ||
    attachment.kind !== "area" ||
    attachment.origin.kind !== "self" ||
    attachment.shape.kind !== "emanation" ||
    attachment.shape.radiusFeet !== ANTIMAGIC_FIELD_RADIUS_FEET ||
    suppressOperation?.effect.kind !== "suppress_ongoing_magic_effects" ||
    suppressOperation.effect.suppressedTimeCountsAgainstDuration !== true ||
    !sameStringSet(
      suppressOperation.effect.exceptSources ?? [],
      ANTIMAGIC_FIELD_SUPPRESSION_EXCEPT_SOURCES,
    ) ||
    durationTicks === null ||
    Result.isFailure(durationTicks)
  ) {
    return null;
  }
  return {
    radiusFeet: attachment.shape.radiusFeet,
    durationTicks: durationTicks.success,
  };
}

function resolveMagicSuppressionEmanation(
  input: MagicSuppressionEmanationResolveInput,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !fillsBelongToSpellCastHoles(input.input.fills, [
      spellAreaChoiceHoleId(input.invocation),
    ])
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Antimagic Field uses one table-supplied antimagic Emanation fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (input.fillSet.areaChoice === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellAreaChoiceHole(input.invocation),
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.areaChoice.kind !== "magicSuppressionSelfEmanation" ||
    input.fillSet.areaChoice.areaId.length === 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Antimagic Field area id must be a non-empty antimagic Emanation area.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.areaChoice.auraMembership.nonOriginCombatantIds.includes(
      input.actorId,
    )
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Antimagic Field non-origin aura membership cannot include the source combatant.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const invalidAffectedEffects = magicSuppressionAreaChoiceInvalidReason(
    input.input.state,
    input.fillSet.areaChoice,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (invalidAffectedEffects !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      invalidAffectedEffects,
    );
  }
  /* v8 ignore stop -- @preserve */

  const resourced = spendSpellCastResources({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const nextState = applyMagicSuppressionEmanationCastEffect({
    state: resourced.state,
    actorId: input.actorId,
    areaId: input.fillSet.areaChoice.areaId,
    auraMembership: input.fillSet.areaChoice.auraMembership,
    affectedOngoingSpellEffects:
      input.fillSet.areaChoice.affectedOngoingSpellEffects,
    invocation: input.invocation,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function magicSuppressionAreaChoiceInvalidReason(
  state: ActionSpellBattleResolutionInput["state"],
  areaChoice: BattleMagicSuppressionAreaChoice,
): string | null {
  const trackedEffects = trackedOngoingSpellEffectKeys(state);
  for (const affected of areaChoice.affectedOngoingSpellEffects) {
    if (!trackedEffects.has(ongoingSpellEffectRefKey(affected.effect))) {
      return "Antimagic Field affected effect must reference a tracked ongoing spell effect.";
    }
  }
  return null;
}

function trackedOngoingSpellEffectKeys(
  state: ActionSpellBattleResolutionInput["state"],
): ReadonlySet<string> {
  return new Set([
    ...state.lightEmitters.flatMap((emitter) =>
      isTrackedOngoingSpellLightEmitter(emitter)
        ? [
            ongoingSpellEffectRefKey(
              magicSuppressionOngoingSpellEffectRefForEmitter(emitter),
            ),
          ]
        : [],
    ),
    ...[...state.combatants.values()].flatMap((combatant) =>
      combatant.activeEffects.flatMap((effect) =>
        effect.kind === "spellObjectContactDamage" ||
        effect.kind === "spatialMeleeSpellAttackProxy"
          ? [
              ongoingSpellEffectRefKey(
                magicSuppressionOngoingSpellEffectRefForActiveEffect(effect),
              ),
            ]
          : [],
      ),
    ),
  ]);
}

function applyMagicSuppressionEmanationCastEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly areaId: BattleAreaId;
  readonly auraMembership: BattleMagicSuppressionAreaChoice["auraMembership"];
  readonly affectedOngoingSpellEffects: readonly BattleMagicSuppressionAffectedOngoingSpellEffect[];
  readonly invocation: BattleExecutableSpellInvocation<MagicSuppressionEmanationInvocation>;
}): BattleState {
  const caster = input.state.combatants.get(input.actorId);
  if (caster === undefined) {
    return input.state;
  }
  const suppressedOngoingSpellEffects = input.affectedOngoingSpellEffects
    .filter((effect) => effect.sourceKind === "ordinarySpell")
    .map((effect) => effect.effect);
  return replaceTargetSpellActiveEffect(
    input.state,
    input.actorId,
    (effect) =>
      effect.kind === "magicSuppressionEmanation" &&
      effect.sourceProcedureRef === input.invocation.sourceProcedureRef &&
      effect.sourceCombatantId === input.actorId &&
      effect.areaId === input.areaId,
    {
      kind: "magicSuppressionEmanation" as const,
      sourceProcedureRef: input.invocation.sourceProcedureRef,
      sourceCombatantId: input.actorId,
      areaId: input.areaId,
      auraMembership: input.auraMembership,
      radiusFeet: input.invocation.targeting.radiusFeet,
      suppressedOngoingSpellEffects,
      expiresAt: {
        kind: "concentration" as const,
        combatantId: input.actorId,
        durationTicks: input.invocation.durationTicks,
      },
    },
  );
}

const MagicSuppressionEmanationInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    procedure: Schema.Literal("magicSuppressionEmanation"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    targeting: Schema.Struct({
      kind: Schema.Literal("selfOriginEmanation"),
      radiusFeet: MovementFeet,
    }),
    durationTicks: ElapsedTimeTicksSchema,
    rangeFeet: MovementFeet,
  }),
);
export const magicSuppressionEmanationProfile = {
  procedure: "magicSuppressionEmanation",
  executionSchema: MagicSuppressionEmanationInvocationSchema,
  admit: admitMagicSuppressionEmanation,
  discoverCastAct: discoverActionSpellAreaCastAct,
  resolve: resolveMagicSuppressionEmanation,
} satisfies SpellProcedureDeclaration<
  "magicSuppressionEmanation",
  MagicSuppressionEmanationInvocation
>;
