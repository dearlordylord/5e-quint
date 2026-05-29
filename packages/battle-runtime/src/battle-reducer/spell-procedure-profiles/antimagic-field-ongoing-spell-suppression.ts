// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-antimagic-field-ongoing-spell-suppression
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
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import type { SpellInvocationRef } from "../../battle-subjects.ts";
import {
  type ActionSpellBattleResolutionInput,
  type AvailableBattleAct,
  type BattleAntimagicFieldAffectedOngoingSpellEffect,
  type BattleAntimagicFieldAreaChoice,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import {
  spellId,
  type BattleAreaId,
  type CombatantId,
} from "../../identity.ts";
import {
  antimagicFieldOngoingSpellEffectRefForActiveEffect,
  antimagicFieldOngoingSpellEffectRefForEmitter,
  isTrackedOngoingSpellLightEmitter,
  ongoingSpellEffectRefKey,
} from "../antimagic-field-suppression.ts";
import { snapshotBattle } from "../dispatcher.ts";
import { needsHolesResult } from "../hole-helpers.ts";
import { invalidResult } from "../result-helpers.ts";
import { sameStringSet } from "../spells-profile-shared.ts";
import { spellAreaChoiceHole } from "../spells-holes-fills.ts";
import type { SpellFillSet } from "../spells-resolve-fill-set.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import { spellProcedureInvocationSchema } from "./profile.ts";
import {
  BattleRuntimeObjectSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type AntimagicFieldOngoingSpellSuppressionInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "antimagicFieldOngoingSpellSuppression" }
>;
type AntimagicFieldOngoingSpellSuppressionResolveInput =
  SpellProcedureProfileResolveInput<
    AntimagicFieldOngoingSpellSuppressionInvocation,
    ActionSpellBattleResolutionInput
  >;
type AntimagicFieldOngoingSpellSuppressionProfileShape = {
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

function admitAntimagicFieldOngoingSpellSuppression(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly AntimagicFieldOngoingSpellSuppressionInvocation[] {
  const profile = antimagicFieldOngoingSpellSuppressionSpell(spell);
  if (profile === null) {
    return [];
  }

  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly AntimagicFieldOngoingSpellSuppressionInvocation[] => {
      if (Number(slot.spellLevel) < ANTIMAGIC_FIELD_LEVEL) {
        return [];
      }
      return [
        {
          access: { tag: "prepared" },
          resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
          procedure: "antimagicFieldOngoingSpellSuppression",
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

function antimagicFieldOngoingSpellSuppressionSpell(
  spell: SpellRecord,
): AntimagicFieldOngoingSpellSuppressionProfileShape | null {
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
    Either.isLeft(durationTicks)
  ) {
    return null;
  }
  return {
    radiusFeet: attachment.shape.radiusFeet,
    durationTicks: durationTicks.right,
  };
}

function discoverAntimagicFieldOngoingSpellSuppressionCastAct(
  _state: BattleState,
  actorId: CombatantId,
  invocation: AntimagicFieldOngoingSpellSuppressionInvocation,
): readonly AvailableBattleAct[] {
  return [
    {
      subject: {
        tag: "actionSpell",
        actorId,
        invocation:
          antimagicFieldOngoingSpellSuppressionInvocationRef(invocation),
        mode: { tag: "cast" },
      },
      label: invocation.spell.name,
      summary: `${antimagicFieldOngoingSpellSuppressionCastSummary(
        invocation,
      )} The table supplies the antimagic Emanation area identity and affected ongoing spell effects.`,
      initialHoles: [spellAreaChoiceHole(invocation)],
    },
  ];
}

function antimagicFieldOngoingSpellSuppressionInvocationRef(
  invocation: AntimagicFieldOngoingSpellSuppressionInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "antimagicFieldOngoingSpellSuppression",
  };
}

function antimagicFieldOngoingSpellSuppressionCastSummary(
  invocation: AntimagicFieldOngoingSpellSuppressionInvocation,
): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
}

function resolveAntimagicFieldOngoingSpellSuppression(
  input: AntimagicFieldOngoingSpellSuppressionResolveInput,
): BattleResolutionResult {
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.objectTarget !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.abilityChoice !== undefined ||
    input.fillSet.commandOptionChoice !== undefined ||
    input.fillSet.damageTypeChoice !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.movement !== undefined ||
    input.fillSet.spellDamageReductionRolls.length > 0 ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Antimagic Field uses one table-supplied antimagic Emanation fill.",
    );
  }
  if (input.fillSet.areaChoice === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellAreaChoiceHole(input.invocation),
    ]);
  }
  if (
    input.fillSet.areaChoice.kind !== "antimagicFieldSelfEmanation" ||
    input.fillSet.areaChoice.areaId.length === 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Antimagic Field area id must be a non-empty antimagic Emanation area.",
    );
  }
  const invalidAffectedEffects = antimagicFieldAreaChoiceInvalidReason(
    input.input.state,
    input.fillSet.areaChoice,
  );
  if (invalidAffectedEffects !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      invalidAffectedEffects,
    );
  }

  const resourced = spendSpellCastResources({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const nextState = applyAntimagicFieldOngoingSpellSuppressionCastEffect({
    state: resourced.state,
    actorId: input.actorId,
    areaId: input.fillSet.areaChoice.areaId,
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

function antimagicFieldAreaChoiceInvalidReason(
  state: ActionSpellBattleResolutionInput["state"],
  areaChoice: BattleAntimagicFieldAreaChoice,
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
              antimagicFieldOngoingSpellEffectRefForEmitter(emitter),
            ),
          ]
        : [],
    ),
    ...[...state.combatants.values()].flatMap((combatant) =>
      combatant.activeEffects.flatMap((effect) =>
        effect.kind === "spellObjectContactDamage" ||
        effect.kind === "spiritualWeapon"
          ? [
              ongoingSpellEffectRefKey(
                antimagicFieldOngoingSpellEffectRefForActiveEffect(effect),
              ),
            ]
          : [],
      ),
    ),
  ]);
}

function applyAntimagicFieldOngoingSpellSuppressionCastEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly areaId: BattleAreaId;
  readonly affectedOngoingSpellEffects: readonly BattleAntimagicFieldAffectedOngoingSpellEffect[];
  readonly invocation: AntimagicFieldOngoingSpellSuppressionInvocation;
}): BattleState {
  const combatants = new Map(input.state.combatants);
  const caster = combatants.get(input.actorId);
  if (caster === undefined) {
    return input.state;
  }
  const replacing = caster.activeEffects.filter(
    (effect) =>
      effect.kind === "antimagicFieldOngoingSpellSuppression" &&
      effect.sourceSpellId === input.invocation.spell.id &&
      effect.sourceCombatantId === input.actorId &&
      effect.areaId === input.areaId,
  );
  const suppressedOngoingSpellEffects = input.affectedOngoingSpellEffects
    .filter((effect) => effect.sourceKind === "ordinarySpell")
    .map((effect) => effect.effect);
  const activeEffects = [
    ...caster.activeEffects.filter((effect) => !replacing.includes(effect)),
    {
      kind: "antimagicFieldOngoingSpellSuppression" as const,
      sourceSpellId: input.invocation.spell.id,
      sourceCombatantId: input.actorId,
      areaId: input.areaId,
      radiusFeet: input.invocation.targeting.radiusFeet,
      suppressedOngoingSpellEffects,
      expiresAt: {
        kind: "concentration" as const,
        combatantId: input.actorId,
        durationTicks: input.invocation.durationTicks,
      },
    },
  ];
  combatants.set(input.actorId, { ...caster, activeEffects });
  return { ...input.state, combatants };
}

const AntimagicFieldOngoingSpellSuppressionInvocationSchema =
  spellProcedureInvocationSchema<
    Extract<
      SupportedSpellInvocation,
      { readonly procedure: "antimagicFieldOngoingSpellSuppression" }
    >
  >(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("antimagicFieldOngoingSpellSuppression"),
      spell: BattleRuntimeObjectSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("selfOriginEmanation"),
        radiusFeet: MovementFeet,
      }),
      durationTicks: BattleRuntimeObjectSchema,
      rangeFeet: MovementFeet,
    }),
  );
export const antimagicFieldOngoingSpellSuppressionProfile = {
  procedure: "antimagicFieldOngoingSpellSuppression",
  invocationSchema: AntimagicFieldOngoingSpellSuppressionInvocationSchema,
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  targetListInvocation: { kind: "none" },
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitAntimagicFieldOngoingSpellSuppression,
  discoverCastAct: discoverAntimagicFieldOngoingSpellSuppressionCastAct,
  castSummary: antimagicFieldOngoingSpellSuppressionCastSummary,
  invocationRef: antimagicFieldOngoingSpellSuppressionInvocationRef,
  resolve: resolveAntimagicFieldOngoingSpellSuppression,
} satisfies SpellProcedureProfile<
  "antimagicFieldOngoingSpellSuppression",
  AntimagicFieldOngoingSpellSuppressionInvocation,
  ActionSpellBattleResolutionInput,
  Extract<SpellFillSet, { readonly tag: "ok" }>
>;
