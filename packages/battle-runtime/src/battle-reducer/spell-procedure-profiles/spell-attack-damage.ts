import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-damage-save-or-attack spell.invocation-acid-arrow-attack-timing
// KERNEL-COVERAGE: runtime-owner BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES BATTLE.SPELL.ACID_ARROW_ATTACK_TIMING BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING
//
// The spellAttackDamage Spell Procedure Profile: an action-time spell attack
// that chooses one target, makes a Spell Attack, and rolls spell damage on a
// hit. Some spell definitions add post-damage riders or object-hit effects.
//
// RAW anchors:
//   - SRD 5.2.1 Playing-the-Game "Attack Rolls", "Making an Attack", and
//     "Damage Rolls": Spell Attacks use attack-roll rules, hit Armor Class,
//     and roll spell-specified damage on a hit.
//   - SRD 5.2.1 Rules Glossary "Spell Attack".
//   - UBIQUITOUS_LANGUAGE.md: Spell Attack, Attack Roll, Damage Roll, Damage
//     Type, and Spell Invocation.
//
// What lives here: admit, discoverCastAct, castSummary, and the
// profile-owned resolve entrypoint.
//
// What stays in shared infrastructure: the attack/damage resolver body remains
// in spells-resolve.ts because held-light hurls, spell-created attacks,
// spiritual weapon attacks, object-contact repeats, and spellAttackDamage share
// one damage lifecycle. The profile owns dispatch into that shared lifecycle.

import { DamageTypeSchema, DiceExprSchema } from "@dnd/surface/surface/schema";
import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
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
import {
  supportedSpellAttackDamageProfile,
  type SpellAttackDamageInvocation,
} from "../spells-profiles-attack-damage.ts";
import { spellObjectTargetHole, spellTargetHole } from "../spells-targeting.ts";
import { resolveSpellAttackDamageAct } from "../spells-resolve.ts";
import type { SpellProcedureExecutionRegistry } from "./execution-registry.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import {
  AttackBonus,
  ClassCantripSpellAccessSchema,
  MovementFeet,
  NoSpellInvocationResourceSchema,
  PreparedSpellAccessSchema,
  SpellDamageSchema,
  SpellAttackMissDamageSchema,
  SpellAttackDamageTargetingSchema,
  SpellPostDamageRiderSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import {
  spellAdmissionCharacterLevel,
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";

const SpellAttackDamagePayloadExecutionSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("fixedSpellAttackDamage"),
    expr: DiceExprSchema,
    damageType: DamageTypeSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("sorcerousBurstDamageTypeChoice"),
    expr: DiceExprSchema,
    damageTypeChoices: Schema.NonEmptyArray(DamageTypeSchema),
    maxDieAdditionalDiceLimit: Schema.Number.pipe(
      Schema.int(),
      Schema.greaterThanOrEqualTo(0),
    ),
  }),
  Schema.Struct({
    kind: Schema.Literal("selectedSorcerousBurstDamage"),
    expr: DiceExprSchema,
    damageType: DamageTypeSchema,
    maxDieAdditionalDiceLimit: Schema.Number.pipe(
      Schema.int(),
      Schema.greaterThanOrEqualTo(0),
    ),
  }),
);

type SpellAttackDamageResolveInput =
  SpellProcedureProfileResolveInput<SpellAttackDamageInvocation>;

function admitSpellAttackDamage(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly SpellAttackDamageInvocation[] {
  const spellcasting = ctx.actor.origin.spellcasting;
  if (spell.mechanics.level === 0) {
    return supportedSpellAttackDamageProfile({
      spell,
      access: { tag: "classCantrip" },
      resource: { tag: "none" },
      spellcastingAbilityModifier: spellcasting.spellcastingAbilityModifier,
      proficiencyBonus: spellcasting.proficiencyBonus,
      characterLevel: spellAdmissionCharacterLevel(ctx),
    });
  }
  return spellcasting.spellSlots.flatMap(
    (slot): readonly SpellAttackDamageInvocation[] =>
      Number(slot.spellLevel) < spell.mechanics.level
        ? []
        : supportedSpellAttackDamageProfile({
            spell,
            access: { tag: "prepared" },
            resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
            spellcastingAbilityModifier:
              spellcasting.spellcastingAbilityModifier,
            proficiencyBonus: spellcasting.proficiencyBonus,
            slotLevel: slot.spellLevel,
          }),
  );
}

function discoverSpellAttackDamageCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<SpellAttackDamageInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  if (invocation.targeting.kind === "singleCreatureOrObject") {
    const targetHole = spellTargetHole(state, actorId, invocation);
    const initialHoles = [
      ...(invocation.damage.kind === "sorcerousBurstDamageTypeChoice"
        ? [spellDamageTypeChoiceHole(invocation)]
        : []),
      ...(targetHole.choices.length === 0 ? [] : [targetHole]),
      spellObjectTargetHole(invocation),
    ];
    const castActs = [
      {
        subject: spellCastSelectionSubject(actorId, invocation),
        initialHoles,
      },
    ];
    return [...castActs, ...readiedSpellAct(state, actorId, invocation)];
  }

  const targetHole = spellTargetHole(state, actorId, invocation);
  const castActs =
    targetHole.choices.length === 0
      ? []
      : [
          {
            subject: spellCastSelectionSubject(actorId, invocation),
            initialHoles: [
              ...(invocation.damage.kind === "sorcerousBurstDamageTypeChoice"
                ? [spellDamageTypeChoiceHole(invocation)]
                : []),
              targetHole,
            ],
          },
        ];
  return [...castActs, ...readiedSpellAct(state, actorId, invocation)];
}

function resolveSpellAttackDamage(
  input: SpellAttackDamageResolveInput,
  executionRegistry: SpellProcedureExecutionRegistry,
): BattleResolutionResult {
  return resolveSpellAttackDamageAct(input, executionRegistry);
}

export const SpellAttackDamageInvocationSchema = spellProcedureExecutionSchema(
  Schema.Union(
    Schema.Struct({
      access: ClassCantripSpellAccessSchema,
      resource: NoSpellInvocationResourceSchema,
      procedure: Schema.Literal("spellAttackDamage"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      targeting: SpellAttackDamageTargetingSchema,
      damage: SpellAttackDamagePayloadExecutionSchema,
      rangeFeet: MovementFeet,
      attackKind: Schema.Literal("melee_spell_attack", "ranged_spell_attack"),
      attackBonus: AttackBonus,
      missDamage: SpellAttackMissDamageSchema,
      laterDamage: Schema.NullOr(SpellDamageSchema),
      postDamageRiders: Schema.Array(SpellPostDamageRiderSchema),
      objectHitEffect: Schema.Union(
        Schema.Struct({ kind: Schema.Literal("none") }),
        Schema.Struct({
          kind: Schema.Literal("igniteFlammableUnattended"),
        }),
      ),
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("spellAttackDamage"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      targeting: SpellAttackDamageTargetingSchema,
      damage: SpellAttackDamagePayloadExecutionSchema,
      rangeFeet: MovementFeet,
      attackKind: Schema.Literal("melee_spell_attack", "ranged_spell_attack"),
      attackBonus: AttackBonus,
      missDamage: SpellAttackMissDamageSchema,
      laterDamage: Schema.NullOr(SpellDamageSchema),
      postDamageRiders: Schema.Array(SpellPostDamageRiderSchema),
      objectHitEffect: Schema.Union(
        Schema.Struct({ kind: Schema.Literal("none") }),
        Schema.Struct({
          kind: Schema.Literal("igniteFlammableUnattended"),
        }),
      ),
    }),
  ),
);
export const spellAttackDamageProfile: SpellProcedureDeclaration<
  "spellAttackDamage",
  Extract<SupportedSpellInvocation, { readonly procedure: "spellAttackDamage" }>
> = {
  procedure: "spellAttackDamage",
  executionSchema: SpellAttackDamageInvocationSchema,
  metamagicCompatibility: "bonusActionRewrite",
  admit: admitSpellAttackDamage,
  discoverCastAct: discoverSpellAttackDamageCastAct,
  resolve: resolveSpellAttackDamage,
};
