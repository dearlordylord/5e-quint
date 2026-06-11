// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-chained-attack-damage
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

import type { SpellRecord } from "@dnd/surface/surface/types";

import {
  type ActionSpellBattleResolutionInput,
  type AvailableBattleAct,
  type BattleResolutionResult,
  type BattleState,
  type BonusActionSpellBattleResolutionInput,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import type { SpellMetamagicApplicationFact } from "../metamagic-support.ts";
import type { SpellInvocationRef } from "../../battle-subjects.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import { spellDamageTypeChoiceHole } from "../spells-damage-fills.ts";
import {
  readiedSpellAct,
  spellSubjectTagForInvocation,
} from "../spells-discovery.ts";
import { supportedPreparedChainedSpellAttackDamageProfile } from "../spells-profiles-attack-damage.ts";
import {
  resolveChainedSpellAttackDamageAct,
  type ChainedSpellFillSet,
} from "../spells-resolve-chained.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import { spellProcedureInvocationSchema } from "./profile.ts";
import {
  AttackBonus,
  BattleRuntimeObjectSchema,
  DamageTypeSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type ChainedSpellAttackDamageInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "chainedSpellAttackDamage" }
>;

type ChainedSpellAttackDamageResolveInput = SpellProcedureProfileResolveInput<
  ChainedSpellAttackDamageInvocation,
  ActionSpellBattleResolutionInput | BonusActionSpellBattleResolutionInput,
  ChainedSpellFillSet
> & {
  readonly actionCostOverride?: "magicAction" | "bonusAction";
  readonly metamagicApplications?: readonly SpellMetamagicApplicationFact[];
};

function isChainedSpellAttackDamageInvocation(
  invocation: SupportedSpellInvocation,
): invocation is ChainedSpellAttackDamageInvocation {
  return invocation.procedure === "chainedSpellAttackDamage";
}

function admitChainedSpellAttackDamage(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly ChainedSpellAttackDamageInvocation[] {
  const spellcasting = ctx.actor.origin.spellcasting;
  return supportedPreparedChainedSpellAttackDamageProfile(
    spell,
    spellcasting.spellSlots,
    spellcasting.spellcastingAbilityModifier,
    spellcasting.proficiencyBonus,
  ).filter(isChainedSpellAttackDamageInvocation);
}

function discoverChainedSpellAttackDamageCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: ChainedSpellAttackDamageInvocation,
): readonly AvailableBattleAct[] {
  const castActs = [
    {
      subject: {
        tag: spellSubjectTagForInvocation(invocation),
        actorId,
        invocation: chainedSpellAttackDamageInvocationRef(invocation),
        mode: { tag: "cast" as const },
      },
      label: invocation.spell.name,
      summary: chainedSpellAttackDamageCastSummary(invocation),
      initialHoles: [spellDamageTypeChoiceHole(invocation)],
    },
  ];
  return [...castActs, ...readiedSpellAct(state, actorId, invocation)];
}

function chainedSpellAttackDamageInvocationRef(
  invocation: ChainedSpellAttackDamageInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "chainedSpellAttackDamage",
  };
}

function chainedSpellAttackDamageCastSummary(
  invocation: ChainedSpellAttackDamageInvocation,
): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
}

function resolveChainedSpellAttackDamage(
  input: ChainedSpellAttackDamageResolveInput,
): BattleResolutionResult {
  return resolveChainedSpellAttackDamageAct({
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

const ChainedSpellAttackDamageInvocationSchema = spellProcedureInvocationSchema<
  Extract<
    SupportedSpellInvocation,
    { readonly procedure: "chainedSpellAttackDamage" }
  >
>(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: SpellSlotInvocationResourceSchema,
    procedure: Schema.Literal("chainedSpellAttackDamage"),
    spell: BattleRuntimeObjectSchema,
    targeting: Schema.Struct({
      kind: Schema.Literal("singleCombatant"),
    }),
    damage: Schema.Struct({
      expr: BattleRuntimeObjectSchema,
    }),
    damageTypeChoices: Schema.Array(DamageTypeSchema),
    rangeFeet: MovementFeet,
    leapRangeFeet: MovementFeet,
    attackKind: Schema.Literal("melee_spell_attack", "ranged_spell_attack"),
    attackBonus: AttackBonus,
  }),
);
export const chainedSpellAttackDamageProfile: SpellProcedureProfile<
  "chainedSpellAttackDamage",
  ChainedSpellAttackDamageInvocation,
  ActionSpellBattleResolutionInput,
  ChainedSpellFillSet
> = {
  procedure: "chainedSpellAttackDamage",
  invocationSchema: ChainedSpellAttackDamageInvocationSchema,
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  targetListInvocation: { kind: "none" },
  isReadiedSpellCompatible: true,
  knownWillingTargetSpellIds: [],
  admit: admitChainedSpellAttackDamage,
  discoverCastAct: discoverChainedSpellAttackDamageCastAct,
  castSummary: chainedSpellAttackDamageCastSummary,
  invocationRef: chainedSpellAttackDamageInvocationRef,
  resolve: resolveChainedSpellAttackDamage,
};
