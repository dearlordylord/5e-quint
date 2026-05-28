// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-held-light-emitter
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.HELD_LIGHT_EMITTER_LIFECYCLE
//
// The heldLightHurl Spell Procedure Profile: a later Magic Action that hurls
// an already-held Produce Flame at a creature or object, ending the held flame
// after resolution.
//
// RAW anchors:
//   - SRD 5.2.1 Produce Flame: until the spell ends, the caster can take a
//     Magic action to hurl fire at one creature or object within 60 feet,
//     making a ranged spell attack for Fire damage on a hit.
//   - SRD 5.2.1 Rules Glossary "Magic [Action]" and "Spell Attack".
//   - UBIQUITOUS_LANGUAGE.md: Magic Action, Spell Attack, Attack Roll, Damage
//     Roll, Damage Type, and Spell Invocation.
//
// What stays in shared infrastructure: the attack/damage resolver body remains
// in spells-resolve.ts because held-light hurls share the spell attack damage
// lifecycle with ordinary spell attacks and object target adjudication.

import { attackBonus, movementFeet } from "@dnd/shared/types";
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
import { spellSubjectTagForInvocation } from "../spells-discovery.ts";
import { supportedDamageAmountExpr } from "../spells-profile-shared.ts";
import { spellObjectTargetHole, spellTargetHole } from "../spells-targeting.ts";
import { resolveSpellAttackDamageAct } from "../spells-resolve.ts";
import { isProduceFlameOngoingEffectSpell } from "./held-light.ts";
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
  DamageTypeSchema,
  MovementFeet,
  NoSpellInvocationResourceSchema,
  SingleCreatureOrObjectSpellTargetingSchema,
} from "../codec-building-blocks.ts";

type HeldLightHurlInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "heldLightHurl" }
>;

type HeldLightHurlResolveInput = SpellProcedureProfileResolveInput<
  HeldLightHurlInvocation,
  ActionSpellBattleResolutionInput
>;

function admitHeldLightHurl(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly HeldLightHurlInvocation[] {
  if (!isProduceFlameOngoingEffectSpell(spell)) {
    return [];
  }
  const hurlOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "on_caster_spends_action" &&
      operation.trigger.cost?.kind === "standard_action" &&
      operation.trigger.cost.action === "magic" &&
      operation.effect.kind === "attack_roll",
  );
  if (
    hurlOperation === undefined ||
    hurlOperation.effect.kind !== "attack_roll" ||
    hurlOperation.effect.attackKind !== "ranged_spell_attack" ||
    hurlOperation.effect.onHit.length !== 1 ||
    hurlOperation.effect.onMiss.length !== 1 ||
    hurlOperation.effect.onMiss[0]?.kind !== "none"
  ) {
    return [];
  }
  const damageEffect = hurlOperation.effect.onHit[0];
  if (
    damageEffect?.kind !== "damage" ||
    damageEffect.damageType !== "fire" ||
    damageEffect.amount === undefined
  ) {
    return [];
  }
  const damageExpr = supportedDamageAmountExpr({
    amount: damageEffect.amount,
    spellLevel: spell.mechanics.level,
    characterLevel: spellAdmissionCharacterLevel(ctx),
  });
  if (damageExpr === null) {
    return [];
  }
  const spellcasting = ctx.actor.origin.spellcasting;
  return [
    {
      access: { tag: "classCantrip" },
      resource: { tag: "none" },
      procedure: "heldLightHurl",
      spell,
      targeting: { kind: "singleCreatureOrObject" },
      damage: {
        expr: damageExpr,
        damageType: damageEffect.damageType,
      },
      rangeFeet: movementFeet(60),
      attackKind: hurlOperation.effect.attackKind,
      attackBonus: attackBonus(
        Number(spellcasting.spellcastingAbilityModifier) +
          Number(spellcasting.proficiencyBonus),
      ),
    },
  ];
}

function discoverHeldLightHurlCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: HeldLightHurlInvocation,
): readonly AvailableBattleAct[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  const initialHoles = [
    ...(targetHole.choices.length === 0 ? [] : [targetHole]),
    spellObjectTargetHole(invocation),
  ];
  return [
    {
      subject: {
        tag: spellSubjectTagForInvocation(invocation),
        actorId,
        invocation: heldLightHurlInvocationRef(invocation),
        mode: { tag: "cast" as const },
      },
      label: invocation.spell.name,
      summary: heldLightHurlCastSummary(invocation),
      initialHoles,
    },
  ];
}

function heldLightHurlInvocationRef(
  invocation: HeldLightHurlInvocation,
): SpellInvocationRef {
  return {
    tag: "cantrip",
    spellId: spellId(invocation.spell.id),
    procedure: "heldLightHurl",
  };
}

function heldLightHurlCastSummary(invocation: HeldLightHurlInvocation): string {
  return `Take a Magic action to hurl ${invocation.spell.name}.`;
}

function resolveHeldLightHurl(
  input: HeldLightHurlResolveInput,
): BattleResolutionResult {
  return resolveSpellAttackDamageAct(input);
}

const HeldLightHurlInvocationSchema = spellProcedureInvocationSchema<
  Extract<SupportedSpellInvocation, { readonly procedure: "heldLightHurl" }>
>(
  Schema.Struct({
    access: ClassCantripSpellAccessSchema,
    resource: NoSpellInvocationResourceSchema,
    procedure: Schema.Literal("heldLightHurl"),
    spell: BattleRuntimeObjectSchema,
    targeting: SingleCreatureOrObjectSpellTargetingSchema,
    damage: Schema.Struct({
      expr: BattleRuntimeObjectSchema,
      damageType: DamageTypeSchema,
    }),
    rangeFeet: MovementFeet,
    attackKind: Schema.Literal("ranged_spell_attack"),
    attackBonus: AttackBonus,
  }),
);
export const heldLightHurlProfile: SpellProcedureProfile<
  "heldLightHurl",
  HeldLightHurlInvocation
> = {
  procedure: "heldLightHurl",
  invocationSchema: HeldLightHurlInvocationSchema,
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  isTargetListInvocation: false,
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitHeldLightHurl,
  discoverCastAct: discoverHeldLightHurlCastAct,
  castSummary: heldLightHurlCastSummary,
  invocationRef: heldLightHurlInvocationRef,
  resolve: resolveHeldLightHurl,
};
