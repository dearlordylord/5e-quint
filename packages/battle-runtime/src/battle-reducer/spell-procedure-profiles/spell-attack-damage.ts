import type { BattleSpellExecutionSource } from "../../battle-state-execution.ts";
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
  inspectSpellAttackDamageMechanics,
  spellAttackDamageInvocationsFromFacts,
  type SpellAttackDamageMechanicsFacts,
  type SpellAttackDamageMechanicsIssue,
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
import { cantripSpellAccessFor } from "./profile.ts";
import type {
  SpellMechanicsAdmissionSource,
  SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";
import { Schema } from "effect";
import {
  AttackBonus,
  CantripSpellAccessSchema,
  MovementFeet,
  NoSpellInvocationResourceSchema,
  PreparedSpellAccessSchema,
  SpellDamageSchema,
  SpellAttackMissDamageSchema,
  SpellAttackDamagePayloadSchema,
  SpellAttackDamageTargetingSchema,
  SpellPostDamageRiderSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import {
  spellAdmissionCharacterLevel,
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";

type SpellAttackDamageResolveInput =
  SpellProcedureProfileResolveInput<SpellAttackDamageInvocation>;

function admitSpellAttackDamage(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: SpellAttackDamageMechanicsFacts,
): readonly SpellAttackDamageInvocation[] {
  const spellcasting = ctx.actor.origin.spellcasting;
  if (facts.level === 0) {
    return spellAttackDamageInvocationsFromFacts({
      spell,
      facts,
      access: cantripSpellAccessFor(ctx.castingSource),
      resource: { tag: "none" },
      spellcastingAbilityModifier: ctx.castingSource.abilityModifier,
      proficiencyBonus: spellcasting.proficiencyBonus,
      characterLevel: spellAdmissionCharacterLevel(ctx),
    });
  }
  return ctx.spellCastOptions.flatMap(
    (slot): readonly SpellAttackDamageInvocation[] =>
      Number(slot.spellLevel) < facts.level
        ? []
        : spellAttackDamageInvocationsFromFacts({
            spell,
            facts,
            access: { tag: "prepared" },
            resource: spellInvocationResourceForCastOption(slot),
            spellcastingAbilityModifier: ctx.castingSource.abilityModifier,
            proficiencyBonus: spellcasting.proficiencyBonus,
            slotLevel: slot.spellLevel,
          }),
  );
}

type SpellAttackDamageAdmissionIssue = Extract<
  SpellProcedureMechanicsInspection<
    "spellAttackDamage",
    SpellAttackDamageMechanicsFacts,
    SpellAttackDamageInvocation
  >,
  { readonly tag: "unsupported" }
>["issues"][number];

function spellAttackDamageMechanicsAdmissionIssue(
  issue: SpellAttackDamageMechanicsIssue,
): SpellAttackDamageAdmissionIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "spellAttackDamage",
    failedFact: issue.failedFact,
    mechanicsPath: issue.mechanicsPath,
    message: issue.message,
  };
}

function admitSpellAttackDamageMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "spellAttackDamage",
  SpellAttackDamageMechanicsFacts,
  SpellAttackDamageInvocation
> {
  const inspection = inspectSpellAttackDamageMechanics(source);
  if (inspection.tag === "notRepresented") {
    return inspection;
  }
  if (inspection.tag === "unsupported") {
    const [firstIssue, ...remainingIssues] = inspection.issues;
    return {
      tag: "unsupported",
      issues: [
        spellAttackDamageMechanicsAdmissionIssue(firstIssue),
        ...remainingIssues.map(spellAttackDamageMechanicsAdmissionIssue),
      ],
    };
  }
  const facts = {
    ...source.spellDefinitionRuleFacts,
    ...inspection.facts,
  } satisfies SpellAttackDamageMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "spellAttackDamage",
      facts,
      evidence: inspection.evidence,
      admit: (executionSource, ctx) =>
        admitSpellAttackDamage(executionSource, ctx, facts),
    },
  };
}

function discoverSpellAttackDamageCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<SpellAttackDamageInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  if (invocation.targeting.kind === "singleCreatureOrObject") {
    const targetHole = spellTargetHole(state, actorId, invocation);
    const initialHoles = [
      ...(invocation.damage.kind === "spellAttackDamageTypeChoice"
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
              ...(invocation.damage.kind === "spellAttackDamageTypeChoice"
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

const SpellAttackDamageInvocationCommonFields = {
  procedure: Schema.Literal("spellAttackDamage"),
  spellRuleFacts: SpellRuleExecutionFactsSchema,
  targeting: SpellAttackDamageTargetingSchema,
  damage: SpellAttackDamagePayloadSchema,
  rangeFeet: MovementFeet,
  attackKind: Schema.Literals(["melee_spell_attack", "ranged_spell_attack"]),
  attackBonus: AttackBonus,
  missDamage: SpellAttackMissDamageSchema,
  laterDamage: Schema.NullOr(SpellDamageSchema),
  postDamageRiders: Schema.Array(SpellPostDamageRiderSchema),
  objectHitEffect: Schema.Union([
    Schema.Struct({ kind: Schema.Literal("none") }),
    Schema.Struct({
      kind: Schema.Literal("igniteFlammableUnattended"),
    }),
  ]),
} as const;

export const SpellAttackDamageInvocationSchema = spellProcedureExecutionSchema(
  Schema.Union([
    Schema.Struct({
      ...SpellAttackDamageInvocationCommonFields,
      access: CantripSpellAccessSchema,
      resource: NoSpellInvocationResourceSchema,
    }),
    Schema.Struct({
      ...SpellAttackDamageInvocationCommonFields,
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
    }),
  ]),
);
export const spellAttackDamageProfile: SpellProcedureDeclaration<
  "spellAttackDamage",
  Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spellAttackDamage" }
  >,
  SpellAttackDamageMechanicsFacts
> = {
  procedure: "spellAttackDamage",
  executionSchema: SpellAttackDamageInvocationSchema,
  admitMechanics: admitSpellAttackDamageMechanics,
  discoverCastAct: discoverSpellAttackDamageCastAct,
  resolve: resolveSpellAttackDamage,
};
import { spellInvocationResourceForCastOption } from "./profile.ts";
