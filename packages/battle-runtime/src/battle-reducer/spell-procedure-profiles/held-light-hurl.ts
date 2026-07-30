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

import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import {
  BattleActiveEffectExecutionRef,
  BattleProcedureExecutionRef,
  type CombatantId,
} from "../../identity.ts";
import { spellCastSelectionSubject } from "../spells-discovery.ts";
import { spellObjectTargetHole, spellTargetHole } from "../spells-targeting.ts";
import { resolveSpellAttackDamageAct } from "../spells-resolve.ts";
import type { SpellProcedureExecutionRegistry } from "./execution-registry.ts";
import type {
  SpellProcedureProfileResolveInput,
  SynthesizedSpellProcedureDeclaration,
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

function discoverHeldLightHurlCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<HeldLightHurlInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  const initialHoles = [
    /* v8 ignore next -- The upstream Magic Action discovery gate removes this hurl when Antimagic excludes its actor; otherwise Produce Flame permits that actor creature as a target, so this list is nonempty. */
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
export const heldLightHurlProfile: SynthesizedSpellProcedureDeclaration<"heldLightHurl"> =
  {
    admission: "synthesized",
    procedure: "heldLightHurl",
    executionSchema: HeldLightHurlInvocationSchema,
    discoverCastAct: discoverHeldLightHurlCastAct,
    resolve: resolveHeldLightHurl,
  };
