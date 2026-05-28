// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-damage-save-or-attack
// KERNEL-COVERAGE: runtime-owner BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES
//
// The repeatedDamageAllocation Spell Procedure Profile: an action-time Spell
// Slot spell whose repeated damage applications are allocated among one or
// several creature targets.
//
// RAW anchors:
//   - SRD 5.2.1 Magic Missile: three simultaneous Force darts, each dealing
//     1d4 + 1 damage, directed at one creature or several, plus one dart per
//     slot level above 1.
//   - SRD 5.2.1 Playing-the-Game "Damage Rolls".
//   - SRD 5.2.1 Rules Glossary "Ready [Action]".
//   - UBIQUITOUS_LANGUAGE.md: Spell Invocation, Damage Roll, Damage Type,
//     Spell Slot, and Readied Spell Response.
//
// What stays in shared infrastructure: the resolver body remains in
// spells-resolve-prepared-slot.ts because it owns repeated damage allocation,
// Shield negation, Sanctuary replacement, after-damage Reaction windows, and
// Readied Spell release continuation sequencing.

import { movementFeet } from "@dnd/shared/types";
import type { SpellRecord } from "@dnd/surface/surface/types";

import {
  type ActionSpellBattleResolutionInput,
  type AvailableBattleAct,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import type { SpellInvocationRef } from "../../battle-subjects.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import {
  readiedSpellAct,
  spellSubjectTagForInvocation,
} from "../spells-discovery.ts";
import {
  supportedDamageAmountExpr,
  supportedRepeatedEffectCount,
} from "../spells-profile-shared.ts";
import { resolvePreparedSlotSpellAct } from "../spells-resolve-prepared-slot.ts";
import { spellTargetAllocationHole } from "../spells-targeting.ts";
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

type RepeatedDamageAllocationInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "repeatedDamageAllocation" }
>;

type RepeatedDamageAllocationResolveInput = SpellProcedureProfileResolveInput<
  RepeatedDamageAllocationInvocation,
  ActionSpellBattleResolutionInput
>;

function admitRepeatedDamageAllocation(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly RepeatedDamageAllocationInvocation[] {
  const spellcasting = ctx.actor.origin.spellcasting;
  if (spell.mechanics.family !== "activation") {
    return [];
  }
  const phase = spell.mechanics.phases[0];
  if (
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    typeof spell.mechanics.range.feet !== "number" ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "direct" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target" ||
    phase.effects?.length !== 1
  ) {
    return [];
  }
  const effect = phase.effects?.[0];
  if (effect?.kind !== "damage" || typeof effect.damageType !== "string") {
    return [];
  }
  const damageExpr = supportedDamageAmountExpr({ amount: effect.amount });
  if (damageExpr == null) {
    return [];
  }
  const damageType = effect.damageType;
  const rangeFeet = movementFeet(spell.mechanics.range.feet);
  const repeatedEffectCountForSlotLevel = supportedRepeatedEffectCount(
    phase.attachment.value.selection,
    spell.mechanics.level,
  );
  if (repeatedEffectCountForSlotLevel === null) {
    return [];
  }
  return spellcasting.spellSlots.flatMap(
    (slot): readonly RepeatedDamageAllocationInvocation[] => {
      if (Number(slot.spellLevel) < spell.mechanics.level) {
        return [];
      }
      return [
        {
          access: { tag: "prepared" },
          resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
          procedure: "repeatedDamageAllocation",
          spell,
          targeting: {
            kind: "repeatedEffectTargetAllocation",
            repeatedEffectCount: repeatedEffectCountForSlotLevel(
              slot.spellLevel,
            ),
          },
          damage: {
            expr: damageExpr,
            damageType,
          },
          rangeFeet,
        },
      ];
    },
  );
}

function discoverRepeatedDamageAllocationCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: RepeatedDamageAllocationInvocation,
): readonly AvailableBattleAct[] {
  const targetAllocationHole = spellTargetAllocationHole(
    state,
    actorId,
    invocation,
  );
  const castActs =
    targetAllocationHole.choices.length === 0
      ? []
      : [
          {
            subject: {
              tag: spellSubjectTagForInvocation(invocation),
              actorId,
              invocation: repeatedDamageAllocationInvocationRef(invocation),
              mode: { tag: "cast" as const },
            },
            label: invocation.spell.name,
            summary: repeatedDamageAllocationCastSummary(invocation),
            initialHoles: [targetAllocationHole],
          },
        ];
  return [...castActs, ...readiedSpellAct(state, actorId, invocation)];
}

function repeatedDamageAllocationInvocationRef(
  invocation: RepeatedDamageAllocationInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "repeatedDamageAllocation",
  };
}

function repeatedDamageAllocationCastSummary(
  invocation: RepeatedDamageAllocationInvocation,
): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot, allocating ${invocation.targeting.repeatedEffectCount} repeated effects among targets.`;
}

function resolveRepeatedDamageAllocation(
  input: RepeatedDamageAllocationResolveInput,
): BattleResolutionResult {
  return resolvePreparedSlotSpellAct(input);
}

const RepeatedDamageAllocationInvocationSchema = spellProcedureInvocationSchema<
  Extract<
    SupportedSpellInvocation,
    { readonly procedure: "repeatedDamageAllocation" }
  >
>(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: SpellSlotInvocationResourceSchema,
    procedure: Schema.Literal("repeatedDamageAllocation"),
    spell: BattleRuntimeObjectSchema,
    targeting: Schema.Struct({
      kind: Schema.Literal("repeatedEffectTargetAllocation"),
      repeatedEffectCount: Schema.Number,
    }),
    damage: Schema.Struct({
      expr: BattleRuntimeObjectSchema,
      damageType: Schema.String,
    }),
    rangeFeet: MovementFeet,
  }),
);
export const repeatedDamageAllocationProfile: SpellProcedureProfile<
  "repeatedDamageAllocation",
  RepeatedDamageAllocationInvocation
> = {
  procedure: "repeatedDamageAllocation",
  invocationSchema: RepeatedDamageAllocationInvocationSchema,
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  isTargetListInvocation: false,
  isReadiedSpellCompatible: true,
  knownWillingTargetSpellIds: [],
  admit: admitRepeatedDamageAllocation,
  discoverCastAct: discoverRepeatedDamageAllocationCastAct,
  castSummary: repeatedDamageAllocationCastSummary,
  invocationRef: repeatedDamageAllocationInvocationRef,
  resolve: resolveRepeatedDamageAllocation,
};
