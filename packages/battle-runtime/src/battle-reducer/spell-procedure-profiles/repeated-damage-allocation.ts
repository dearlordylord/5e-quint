// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-damage-save-or-attack
import { DamageTypeSchema, DiceExprSchema } from "@dnd/surface/surface/schema";
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
// Shield negation, Sanctuary replacement, after-damage interrupt checkpoints, and
// Readied Spell release continuation sequencing.

import { movementFeet } from "@dnd/shared/types";
import type { SpellRecord } from "@dnd/surface/surface/types";

import {
  type BattleActDiscoveryCandidate,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import { type CombatantId } from "../../identity.ts";
import {
  readiedSpellAct,
  spellCastSelectionSubject,
} from "../spells-discovery.ts";
import {
  supportedDamageAmountExpr,
  supportedRepeatedEffectCount,
} from "../spells-profile-shared.ts";
import { resolvePreparedSlotSpellAct } from "../spells-resolve-prepared-slot.ts";
import { spellTargetAllocationHole } from "../spells-targeting.ts";
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
import { repeatedDamageAllocationAdmissionFacts } from "./repeated-damage-allocation-facts.ts";

type RepeatedDamageAllocationInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "repeatedDamageAllocation" }
>;

type RepeatedDamageAllocationResolveInput =
  SpellProcedureProfileResolveInput<RepeatedDamageAllocationInvocation>;

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
      const facts = repeatedDamageAllocationAdmissionFacts({
        selectedSlotLevel: slot.spellLevel,
        repeatedEffectCount: repeatedEffectCountForSlotLevel(slot.spellLevel),
      });
      return [
        {
          access: { tag: "prepared" },
          resource: { tag: "spellSlot", slotLevel: facts.selectedSlotLevel },
          procedure: "repeatedDamageAllocation",
          spell,
          targeting: {
            kind: "repeatedEffectTargetAllocation",
            repeatedEffectCount: facts.repeatedEffectCount,
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
  invocation: import("../../battle-reducer.ts").BattleExecutableSpellInvocation<RepeatedDamageAllocationInvocation>,
): readonly BattleActDiscoveryCandidate[] {
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
            subject: spellCastSelectionSubject(actorId, invocation),
            initialHoles: [targetAllocationHole],
          },
        ];
  return [...castActs, ...readiedSpellAct(state, actorId, invocation)];
}

function resolveRepeatedDamageAllocation(
  input: RepeatedDamageAllocationResolveInput,
): BattleResolutionResult {
  return resolvePreparedSlotSpellAct(input);
}

const RepeatedDamageAllocationInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: SpellSlotInvocationResourceSchema,
    procedure: Schema.Literal("repeatedDamageAllocation"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    targeting: Schema.Struct({
      kind: Schema.Literal("repeatedEffectTargetAllocation"),
      repeatedEffectCount: Schema.Number,
    }),
    damage: Schema.Struct({
      expr: DiceExprSchema,
      damageType: DamageTypeSchema,
    }),
    rangeFeet: MovementFeet,
  }),
);
export const repeatedDamageAllocationProfile: SpellProcedureDeclaration<
  "repeatedDamageAllocation",
  RepeatedDamageAllocationInvocation
> = {
  procedure: "repeatedDamageAllocation",
  executionSchema: RepeatedDamageAllocationInvocationSchema,
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  admit: admitRepeatedDamageAllocation,
  discoverCastAct: discoverRepeatedDamageAllocationCastAct,
  resolve: resolveRepeatedDamageAllocation,
};
