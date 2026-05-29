// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-damage-save-or-attack
// KERNEL-COVERAGE: runtime-owner BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES
//
// The attackBurstSaveDamage Spell Procedure Profile: a Spell Slot action
// spell that makes one Spell Attack against a primary target, then resolves a
// primary-target-origin burst whose affected creatures make Saving Throws for
// burst damage.
//
// RAW anchors:
//   - SRD 5.2.1 Ice Knife: ranged spell attack, hit-only Piercing damage,
//     hit-or-miss explosion, Dexterity Saving Throws, Cold damage, and
//     higher-level Cold damage scaling.
//   - SRD 5.2.1 Playing-the-Game "Attack Rolls", "Damage Rolls", and
//     "Saving Throws and Damage".
//   - SRD 5.2.1 Rules Glossary "Spell Attack".
//   - UBIQUITOUS_LANGUAGE.md: Spell Attack, Attack Roll, Saving Throw,
//     Damage Roll, Damage Type, and Spell Invocation.
//
// What stays in shared infrastructure: the attack/burst resolver body remains
// in spells-resolve-attack-burst.ts because it owns the existing replay,
// reaction, and damage-lifecycle sequencing. The profile owns dispatch into
// that resolver and the procedure's admission/discovery projections.

import type { SpellRecord } from "@dnd/surface/surface/types";

import {
  type ActionSpellBattleResolutionInput,
  type AvailableBattleAct,
  type BattleResolutionResult,
  type BattleState,
} from "../../battle-reducer.ts";
import type { SpellInvocationRef } from "../../battle-subjects.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import {
  readiedSpellAct,
  spellSubjectTagForInvocation,
} from "../spells-discovery.ts";
import {
  supportedPreparedAttackBurstSaveDamageProfile,
  type AttackBurstSaveDamageInvocation,
} from "../spells-profiles-attack-damage.ts";
import { resolveAttackBurstSaveDamageSpellAct } from "../spells-resolve-attack-burst.ts";
import { spellTargetHole } from "../spells-targeting.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import { spellProcedureInvocationSchema } from "./profile.ts";
import type { SupportedSpellInvocation } from "../../battle-reducer.ts";
import {
  AbilitySchema,
  AttackBonus,
  BattleRuntimeObjectSchema,
  DamageTypeSchema,
  DcSourceSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type AttackBurstSaveDamageResolveInput = SpellProcedureProfileResolveInput<
  AttackBurstSaveDamageInvocation,
  ActionSpellBattleResolutionInput
>;

function admitAttackBurstSaveDamage(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly AttackBurstSaveDamageInvocation[] {
  const spellcasting = ctx.actor.origin.spellcasting;
  return supportedPreparedAttackBurstSaveDamageProfile(
    spell,
    spellcasting.spellSlots,
    spellcasting.spellcastingAbilityModifier,
    spellcasting.proficiencyBonus,
  );
}

function discoverAttackBurstSaveDamageCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: AttackBurstSaveDamageInvocation,
): readonly AvailableBattleAct[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  const castActs =
    targetHole.choices.length === 0
      ? []
      : [
          {
            subject: {
              tag: spellSubjectTagForInvocation(invocation),
              actorId,
              invocation: attackBurstSaveDamageInvocationRef(invocation),
              mode: { tag: "cast" as const },
            },
            label: invocation.spell.name,
            summary: attackBurstSaveDamageCastSummary(invocation),
            initialHoles: [targetHole],
          },
        ];
  return [...castActs, ...readiedSpellAct(state, actorId, invocation)];
}

function attackBurstSaveDamageInvocationRef(
  invocation: AttackBurstSaveDamageInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "attackBurstSaveDamage",
  };
}

function attackBurstSaveDamageCastSummary(
  invocation: AttackBurstSaveDamageInvocation,
): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
}

function resolveAttackBurstSaveDamage(
  input: AttackBurstSaveDamageResolveInput,
): BattleResolutionResult {
  return resolveAttackBurstSaveDamageSpellAct(input);
}

const AttackBurstSaveDamageInvocationSchema = spellProcedureInvocationSchema<
  Extract<
    SupportedSpellInvocation,
    { readonly procedure: "attackBurstSaveDamage" }
  >
>(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: SpellSlotInvocationResourceSchema,
    procedure: Schema.Literal("attackBurstSaveDamage"),
    spell: BattleRuntimeObjectSchema,
    targeting: Schema.Struct({
      kind: Schema.Literal("singleCombatant"),
    }),
    attackKind: Schema.Literal("melee_spell_attack", "ranged_spell_attack"),
    attackBonus: AttackBonus,
    damage: Schema.Struct({
      expr: BattleRuntimeObjectSchema,
      damageType: DamageTypeSchema,
    }),
    burst: Schema.Struct({
      ability: AbilitySchema,
      dc: DcSourceSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("primaryTargetOriginEmanation"),
        radiusFeet: MovementFeet,
      }),
      damage: Schema.Struct({
        expr: BattleRuntimeObjectSchema,
        damageType: DamageTypeSchema,
      }),
      successDamage: Schema.Literal("none"),
    }),
    rangeFeet: MovementFeet,
  }),
);
export const attackBurstSaveDamageProfile: SpellProcedureProfile<
  "attackBurstSaveDamage",
  AttackBurstSaveDamageInvocation
> = {
  procedure: "attackBurstSaveDamage",
  invocationSchema: AttackBurstSaveDamageInvocationSchema,
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  targetListInvocation: { kind: "none" },
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitAttackBurstSaveDamage,
  discoverCastAct: discoverAttackBurstSaveDamageCastAct,
  castSummary: attackBurstSaveDamageCastSummary,
  invocationRef: attackBurstSaveDamageInvocationRef,
  resolve: resolveAttackBurstSaveDamage,
};
