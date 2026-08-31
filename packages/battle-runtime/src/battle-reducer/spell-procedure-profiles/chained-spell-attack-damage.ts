import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-chained-attack-damage
import { DiceExprSchema } from "@dnd/surface/surface/schema";
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CHAINED_ATTACK_SEQUENCE BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING
//
// The chainedSpellAttackDamage Spell Procedure Profile: a Spell Slot action
// spell that chooses one damage type, makes a Spell Attack, rolls spell
// damage, and can continue to distinct later targets when the damage dice
// satisfy the spell's duplicate-face continuation rule.
//
// RAW anchors:
//   - SRD 5.2.1 Chromatic Orb: damage-type choice, ranged spell attack,
//     duplicate d8 leap, higher-level leap cap, and one targeting per creature.
//   - SRD 5.2.1 Playing-the-Game "Attack Rolls" and "Damage Rolls".
//   - SRD 5.2.1 Rules Glossary "Spell Attack".
//   - UBIQUITOUS_LANGUAGE.md: Spell Attack, Attack Roll, Damage Roll,
//     Damage Type, and Spell Invocation.

import {
  type BattleActDiscoveryCandidate,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { type CombatantId } from "../../identity.ts";
import { spellDamageTypeChoiceHole } from "../spells-damage-fills.ts";
import {
  readiedSpellAct,
  spellCastSelectionSubject,
} from "../spells-discovery.ts";
import { supportedPreparedChainedSpellAttackDamageProfile } from "../spells-profiles-attack-damage.ts";
import { resolveChainedSpellAttackDamageAct } from "../spells-resolve-chained.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
  spellProcedureResolutionContext,
} from "./profile.ts";
import {
  AttackBonus,
  DamageTypeSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type ChainedSpellAttackDamageInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "chainedSpellAttackDamage" }
>;

type ChainedSpellAttackDamageResolveInput =
  SpellProcedureProfileResolveInput<ChainedSpellAttackDamageInvocation>;

function isChainedSpellAttackDamageInvocation(
  invocation: SupportedSpellInvocation,
): invocation is ChainedSpellAttackDamageInvocation {
  return invocation.procedure === "chainedSpellAttackDamage";
}

function admitChainedSpellAttackDamage(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly ChainedSpellAttackDamageInvocation[] {
  const spellcasting = ctx.actor.origin.spellcasting;
  return supportedPreparedChainedSpellAttackDamageProfile(
    spell,
    spellcasting.spellSlots,
    ctx.castingSource.abilityModifier,
    spellcasting.proficiencyBonus,
  ).filter(isChainedSpellAttackDamageInvocation);
}

function discoverChainedSpellAttackDamageCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: import("../../battle-state-execution.ts").BattleExecutableSpellInvocation<ChainedSpellAttackDamageInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const castActs = [
    {
      subject: spellCastSelectionSubject(actorId, invocation),
      initialHoles: [spellDamageTypeChoiceHole(invocation)],
    },
  ];
  return [...castActs, ...readiedSpellAct(state, actorId, invocation)];
}

function resolveChainedSpellAttackDamage(
  input: ChainedSpellAttackDamageResolveInput,
): BattleResolutionResult {
  return resolveChainedSpellAttackDamageAct(
    spellProcedureResolutionContext(input),
  );
}

export const ChainedSpellAttackDamageInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("chainedSpellAttackDamage"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("singleCombatant"),
      }),
      damage: Schema.Struct({
        expr: DiceExprSchema,
      }),
      damageTypeChoices: Schema.Array(DamageTypeSchema),
      rangeFeet: MovementFeet,
      leapRangeFeet: MovementFeet,
      attackKind: Schema.Literals([
        "melee_spell_attack",
        "ranged_spell_attack",
      ]),
      attackBonus: AttackBonus,
    }),
  );
export const chainedSpellAttackDamageProfile: SpellProcedureDeclaration<
  "chainedSpellAttackDamage",
  ChainedSpellAttackDamageInvocation
> = {
  procedure: "chainedSpellAttackDamage",
  executionSchema: ChainedSpellAttackDamageInvocationSchema,
  admit: admitChainedSpellAttackDamage,
  discoverCastAct: discoverChainedSpellAttackDamageCastAct,
  resolve: resolveChainedSpellAttackDamage,
};
