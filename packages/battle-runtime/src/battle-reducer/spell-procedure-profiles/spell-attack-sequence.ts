import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-independent-attack-sequence
import { DiceExprSchema } from "@dnd/surface/surface/schema";
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.INDEPENDENT_ATTACK_SEQUENCE BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING
//
// The spellAttackSequence Spell Procedure Profile: an action-time spell attack
// that resolves multiple independent spell attack parts from one spell
// invocation.
//
// RAW anchors:
//   - SRD 5.2.1 Playing-the-Game "Attack Rolls" and "Damage Rolls".
//   - SRD 5.2.1 Rules Glossary "Spell Attack".
//   - SRD 5.2.1 spell text for Eldritch Blast and Scorching Ray.
//   - UBIQUITOUS_LANGUAGE.md: Spell Attack, Attack Roll, Damage Roll,
//     Damage Type, and Spell Invocation.

import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { type CombatantId } from "../../identity.ts";
import { spellCastSelectionSubject } from "../spells-discovery.ts";
import {
  supportedCantripSpellAttackSequenceProfile,
  supportedPreparedSpellAttackSequenceProfile,
  type SpellAttackSequenceInvocation,
} from "../spells-profiles-attack-damage.ts";
import { resolveSpellAttackSequenceAct } from "../spells-resolve-attack-sequence.ts";
import {
  spellAttackSequencePartObjectTargetHole,
  spellAttackSequencePartTargetHole,
} from "../spells-targeting.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import {
  AttackBonus,
  CantripSpellAttackSequenceTargetingSchema,
  CantripSpellAccessSchema,
  DamageTypeSchema,
  MovementFeet,
  NoSpellInvocationResourceSchema,
  PreparedSpellAccessSchema,
  PreparedSpellAttackSequenceTargetingSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import {
  spellAdmissionCharacterLevel,
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
  spellProcedureResolutionContext,
} from "./profile.ts";

type SpellAttackSequenceResolveInput =
  SpellProcedureProfileResolveInput<SpellAttackSequenceInvocation>;

function admitSpellAttackSequence(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly SpellAttackSequenceInvocation[] {
  const spellcasting = ctx.actor.origin.spellcasting;
  if (spell.mechanics.level === 0) {
    return supportedCantripSpellAttackSequenceProfile(
      spell,
      ctx.castingSource.abilityModifier,
      spellcasting.proficiencyBonus,
      spellAdmissionCharacterLevel(ctx),
    );
  }
  return supportedPreparedSpellAttackSequenceProfile(
    spell,
    spellcasting.spellSlots,
    ctx.castingSource.abilityModifier,
    spellcasting.proficiencyBonus,
  );
}

function discoverSpellAttackSequenceCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<SpellAttackSequenceInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const initialHoles = Array.from(
    { length: invocation.targeting.attackCount },
    (_, partIndex) => [
      spellAttackSequencePartTargetHole(state, actorId, invocation, partIndex),
      spellAttackSequencePartObjectTargetHole(invocation, partIndex),
    ],
  ).flat();
  return [
    {
      subject: spellCastSelectionSubject(actorId, invocation),
      initialHoles,
    },
  ];
}

function resolveSpellAttackSequence(
  input: SpellAttackSequenceResolveInput,
): BattleResolutionResult {
  return resolveSpellAttackSequenceAct(spellProcedureResolutionContext(input));
}

const SpellAttackSequenceInvocationSchema = spellProcedureExecutionSchema(
  Schema.Union([
    Schema.Struct({
      access: CantripSpellAccessSchema,
      resource: NoSpellInvocationResourceSchema,
      procedure: Schema.Literal("spellAttackSequence"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      targeting: CantripSpellAttackSequenceTargetingSchema,
      damage: Schema.Struct({
        expr: DiceExprSchema,
        damageType: DamageTypeSchema,
      }),
      rangeFeet: MovementFeet,
      attackKind: Schema.Literal("ranged_spell_attack"),
      attackBonus: AttackBonus,
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("spellAttackSequence"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      targeting: PreparedSpellAttackSequenceTargetingSchema,
      damage: Schema.Struct({
        expr: DiceExprSchema,
        damageType: DamageTypeSchema,
      }),
      rangeFeet: MovementFeet,
      attackKind: Schema.Literal("ranged_spell_attack"),
      attackBonus: AttackBonus,
    }),
  ]),
);
export const spellAttackSequenceProfile: SpellProcedureDeclaration<
  "spellAttackSequence",
  Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spellAttackSequence" }
  >
> = {
  procedure: "spellAttackSequence",
  executionSchema: SpellAttackSequenceInvocationSchema,
  admit: admitSpellAttackSequence,
  discoverCastAct: discoverSpellAttackSequenceCastAct,
  resolve: resolveSpellAttackSequence,
};
