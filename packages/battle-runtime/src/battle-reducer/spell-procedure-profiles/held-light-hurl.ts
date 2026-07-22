// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-held-light-emitter
import { DiceExprSchema } from "@dnd/surface/surface/schema";
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

import type { SpellRecord } from "@dnd/surface/surface/types";
import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import {
  BattleActiveEffectExecutionRef,
  BattleProcedureExecutionRef,
  type CombatantId,
} from "../../identity.ts";
import { characterSpellProcedureExecution } from "../../character-execution-admission.ts";
import { spellCastSelectionSubject } from "../spells-discovery.ts";
import { spellObjectTargetHole, spellTargetHole } from "../spells-targeting.ts";
import { resolveSpellAttackDamageAct } from "../spells-resolve.ts";
import type { SpellProcedureExecutionRegistry } from "./execution-registry.ts";
import {
  heldLightHurlMechanicalFacts,
  isProduceFlameOngoingEffectSpell,
} from "./held-light.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import {
  AttackBonus,
  ClassCantripSpellAccessSchema,
  DamageTypeSchema,
  MovementFeet,
  NoSpellInvocationResourceSchema,
  SingleCreatureOrObjectSpellTargetingSchema,
} from "../codec-building-blocks.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";

type HeldLightHurlInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "heldLightHurl" }
>;

type HeldLightHurlResolveInput =
  SpellProcedureProfileResolveInput<HeldLightHurlInvocation>;

function admitHeldLightHurl(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly HeldLightHurlInvocation[] {
  if (!isProduceFlameOngoingEffectSpell(spell)) {
    return [];
  }
  const hurl = heldLightHurlMechanicalFacts(spell, ctx);
  if (hurl === null) return [];
  return ctx.actor.activeEffects.flatMap((effect) => {
    if (effect.kind !== "heldLight") return [];
    const source = characterSpellProcedureExecution(
      ctx.actor.origin.execution,
      effect.sourceProcedureRef,
    );
    if (source?.procedure !== "heldLight") {
      return [];
    }
    return [
      {
        access: { tag: "classCantrip" },
        resource: { tag: "none" },
        procedure: "heldLightHurl",
        sourceEffectRef: effect.effectRef,
        sourceHeldLightProcedureRef: effect.sourceProcedureRef,
        spell,
        targeting: hurl.targeting,
        damage: hurl.damage,
        rangeFeet: hurl.rangeFeet,
        attackKind: hurl.attackKind,
        attackBonus: hurl.attackBonus,
      },
    ];
  });
}

function discoverHeldLightHurlCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<HeldLightHurlInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  const initialHoles = [
    ...(targetHole.choices.length === 0 ? [] : [targetHole]),
    spellObjectTargetHole(invocation),
  ];
  return [
    {
      subject: spellCastSelectionSubject(actorId, invocation),
      initialHoles,
    },
  ];
}

function resolveHeldLightHurl(
  input: HeldLightHurlResolveInput,
  executionRegistry: SpellProcedureExecutionRegistry,
): BattleResolutionResult {
  return resolveSpellAttackDamageAct(input, executionRegistry);
}

const HeldLightHurlInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: ClassCantripSpellAccessSchema,
    resource: NoSpellInvocationResourceSchema,
    procedure: Schema.Literal("heldLightHurl"),
    sourceEffectRef: BattleActiveEffectExecutionRef,
    sourceHeldLightProcedureRef: BattleProcedureExecutionRef,
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    targeting: SingleCreatureOrObjectSpellTargetingSchema,
    damage: Schema.Struct({
      expr: DiceExprSchema,
      damageType: DamageTypeSchema,
    }),
    rangeFeet: MovementFeet,
    attackKind: Schema.Literal("ranged_spell_attack"),
    attackBonus: AttackBonus,
  }),
);
export const heldLightHurlProfile: SpellProcedureDeclaration<
  "heldLightHurl",
  HeldLightHurlInvocation
> = {
  procedure: "heldLightHurl",
  executionSchema: HeldLightHurlInvocationSchema,
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  admit: admitHeldLightHurl,
  discoverCastAct: discoverHeldLightHurlCastAct,
  resolve: resolveHeldLightHurl,
};
