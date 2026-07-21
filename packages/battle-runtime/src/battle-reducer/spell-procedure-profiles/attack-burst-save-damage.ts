// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-damage-save-or-attack
import { DiceExprSchema } from "@dnd/surface/surface/schema";
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
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type BonusActionSpellBattleResolutionInput,
} from "../../battle-reducer.ts";
import type { SpellMetamagicApplicationFact } from "../metamagic-support.ts";
import { type CombatantId } from "../../identity.ts";
import {
  readiedSpellAct,
  spellCastSelectionSubject,
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
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  AbilitySchema,
  AttackBonus,
  DamageTypeSchema,
  DcSourceSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type AttackBurstSaveDamageResolveInput = SpellProcedureProfileResolveInput<
  AttackBurstSaveDamageInvocation,
  ActionSpellBattleResolutionInput | BonusActionSpellBattleResolutionInput
> & {
  readonly actionCostOverride?: "magicAction" | "bonusAction";
  readonly metamagicApplications?: readonly SpellMetamagicApplicationFact[];
};

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
  invocation: BattleExecutableSpellInvocation<AttackBurstSaveDamageInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  const castActs =
    targetHole.choices.length === 0
      ? []
      : [
          {
            subject: spellCastSelectionSubject(actorId, invocation),
            initialHoles: [targetHole],
          },
        ];
  return [...castActs, ...readiedSpellAct(state, actorId, invocation)];
}

function resolveAttackBurstSaveDamage(
  input: AttackBurstSaveDamageResolveInput,
): BattleResolutionResult {
  return resolveAttackBurstSaveDamageSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
    ...(input.actionCostOverride === undefined
      ? {}
      : { actionCostOverride: input.actionCostOverride }),
    ...(input.metamagicApplications === undefined
      ? {}
      : { metamagicApplications: input.metamagicApplications }),
  });
}

const AttackBurstSaveDamageInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: SpellSlotInvocationResourceSchema,
    procedure: Schema.Literal("attackBurstSaveDamage"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    targeting: Schema.Struct({
      kind: Schema.Literal("singleCombatant"),
    }),
    attackKind: Schema.Literal("melee_spell_attack", "ranged_spell_attack"),
    attackBonus: AttackBonus,
    damage: Schema.Struct({
      expr: DiceExprSchema,
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
        expr: DiceExprSchema,
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
  executionSchema: AttackBurstSaveDamageInvocationSchema,
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  targetListInvocation: { kind: "none" },
  isReadiedSpellCompatible: false,
  admit: admitAttackBurstSaveDamage,
  discoverCastAct: discoverAttackBurstSaveDamageCastAct,
  resolve: resolveAttackBurstSaveDamage,
};
