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
// What lives here: admit, discoverCastAct, castSummary, invocationRef, and the
// profile-owned resolve entrypoint.
//
// What stays in shared infrastructure: the attack/damage resolver body remains
// in spells-resolve.ts because held-light hurls, spell-created attacks,
// spiritual weapon attacks, object-contact repeats, and spellAttackDamage share
// one damage lifecycle. The profile owns dispatch into that shared lifecycle.

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
import {
  supportedSpellAttackDamageProfile,
  type SpellAttackDamageInvocation,
} from "../spells-profiles-attack-damage.ts";
import { spellObjectTargetHole, spellTargetHole } from "../spells-targeting.ts";
import { resolveSpellAttackDamageAct } from "../spells-resolve.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { spellAdmissionCharacterLevel } from "./profile.ts";
import { Schema } from "effect";
import { spellProcedureInvocationSchema } from "./profile.ts";
import {
  AttackBonus,
  BattleRuntimeObjectSchema,
  ClassCantripSpellAccessSchema,
  MovementFeet,
  NoSpellInvocationResourceSchema,
  PreparedSpellAccessSchema,
  SpellAttackDamagePayloadSchema,
  SpellAttackMissDamageSchema,
  SpellAttackDamageTargetingSchema,
  SpellPostDamageRiderSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type SpellAttackDamageResolveInput = SpellProcedureProfileResolveInput<
  SpellAttackDamageInvocation,
  ActionSpellBattleResolutionInput | BonusActionSpellBattleResolutionInput
> & {
  readonly actionCostOverride?: "magicAction" | "bonusAction";
  readonly metamagicApplications?: readonly SpellMetamagicApplicationFact[];
};

function admitSpellAttackDamage(
  spell: SpellRecord,
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
  invocation: SpellAttackDamageInvocation,
): readonly AvailableBattleAct[] {
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
        subject: {
          tag: spellSubjectTagForInvocation(invocation),
          actorId,
          invocation: spellAttackDamageInvocationRef(invocation),
          mode: { tag: "cast" as const },
        },
        label: invocation.spell.name,
        summary: spellAttackDamageCastSummary(invocation),
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
            subject: {
              tag: spellSubjectTagForInvocation(invocation),
              actorId,
              invocation: spellAttackDamageInvocationRef(invocation),
              mode: { tag: "cast" as const },
            },
            label: invocation.spell.name,
            summary: spellAttackDamageCastSummary(invocation),
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

function spellAttackDamageInvocationRef(
  invocation: SpellAttackDamageInvocation,
): SpellInvocationRef {
  return invocation.resource.tag === "spellSlot"
    ? {
        tag: "spellSlot",
        spellId: spellId(invocation.spell.id),
        slotLevel: invocation.resource.slotLevel,
        procedure: "spellAttackDamage",
      }
    : {
        tag: "cantrip",
        spellId: spellId(invocation.spell.id),
        procedure: "spellAttackDamage",
      };
}

function spellAttackDamageCastSummary(
  invocation: SpellAttackDamageInvocation,
): string {
  return invocation.resource.tag === "spellSlot"
    ? `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`
    : `Cast ${invocation.spell.name} as a cantrip.`;
}

function resolveSpellAttackDamage(
  input: SpellAttackDamageResolveInput,
): BattleResolutionResult {
  return resolveSpellAttackDamageAct(input);
}

const SpellAttackDamageInvocationSchema = spellProcedureInvocationSchema<
  Extract<SupportedSpellInvocation, { readonly procedure: "spellAttackDamage" }>
>(
  Schema.Union(
    Schema.Struct({
      access: ClassCantripSpellAccessSchema,
      resource: NoSpellInvocationResourceSchema,
      procedure: Schema.Literal("spellAttackDamage"),
      spell: BattleRuntimeObjectSchema,
      targeting: SpellAttackDamageTargetingSchema,
      damage: SpellAttackDamagePayloadSchema,
      rangeFeet: MovementFeet,
      attackKind: Schema.Literal("melee_spell_attack", "ranged_spell_attack"),
      attackBonus: AttackBonus,
      missDamage: SpellAttackMissDamageSchema,
      laterDamage: Schema.NullOr(BattleRuntimeObjectSchema),
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
      spell: BattleRuntimeObjectSchema,
      targeting: SpellAttackDamageTargetingSchema,
      damage: SpellAttackDamagePayloadSchema,
      rangeFeet: MovementFeet,
      attackKind: Schema.Literal("melee_spell_attack", "ranged_spell_attack"),
      attackBonus: AttackBonus,
      missDamage: SpellAttackMissDamageSchema,
      laterDamage: Schema.NullOr(BattleRuntimeObjectSchema),
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
export const spellAttackDamageProfile: SpellProcedureProfile<
  "spellAttackDamage",
  Extract<SupportedSpellInvocation, { readonly procedure: "spellAttackDamage" }>
> = {
  procedure: "spellAttackDamage",
  invocationSchema: SpellAttackDamageInvocationSchema,
  metamagicCompatibility: "bonusActionRewrite",
  targetListInvocation: { kind: "none" },
  isReadiedSpellCompatible: true,
  knownWillingTargetSpellIds: [],
  admit: admitSpellAttackDamage,
  discoverCastAct: discoverSpellAttackDamageCastAct,
  castSummary: spellAttackDamageCastSummary,
  invocationRef: spellAttackDamageInvocationRef,
  resolve: resolveSpellAttackDamage,
};
