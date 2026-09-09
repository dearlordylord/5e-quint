import { resolveAfterHitSlotSpellDamageCast } from "../after-hit-spell-resolution.ts";
import { replaceTargetActiveEffect } from "../active-effect-replacement.ts";
import type {
  BattleSpellExecutionSource,
  SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-after-hit-timed-damage-save
import {
  AbilitySchema,
  DamageTypeSchema as SurfaceDamageTypeSchema,
  DcSourceSchema,
  DiceExprSchema,
} from "@dnd/surface/surface/schema";
import { BattleActiveEffectExpirationSchema } from "../../active-effect/codecs.ts";
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS
//
// The afterHitTimedDamageAndSave Spell Procedure Profile: a Bonus Action spell
// cast immediately after a qualifying melee weapon or Unarmed Strike hit,
// adding spell damage to the triggering attack and applying a timed start-turn
// damage effect that ends on a successful Saving Throw.
//
// RAW anchors:
//   - .references/srd-5.2.1/Spells/Descriptions-S-Z.md "Searing Smite":
//     Bonus Action immediately after a Melee weapon or Unarmed Strike hit;
//     Self; 1 minute; extra Fire damage from the attack; at the start of each
//     target turn, Fire damage followed by a Constitution Saving Throw; success
//     ends the spell; higher-level slots increase all damage.
//   - SRD 5.2.1 Playing the Game "Damage Rolls".
//   - SRD 5.2.1 Rules Glossary "Saving Throw".
//   - UBIQUITOUS_LANGUAGE.md: Attack Damage Rider, Bonus Action, Attack Roll,
//     Damage Roll, Timer, Saving Throw, Spell Slot, and Spell Invocation.
//
// What stays in shared infrastructure:
//   - The attack-hit interrupt checkpoint and eligibility orchestration stay in
//     dispatcher.ts until the after-hit rider family migrates together.
//   - The active-effect turn-start damage and save-to-end lifecycle stays with
//     active-effect processing.
//   - The metamagic table entry remains Wave 9 migration work.

import type {
  DamageType,
  DiceAmount as SurfaceDiceAmount,
  OngoingEffect,
  OngoingEffectMechanicsOperation,
  SpellMechanics,
} from "@dnd/surface/surface/types";

import {
  type AttackSpellDamageAddition,
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
} from "../../battle-state-execution.ts";
import { CombatantId } from "../../identity.ts";
import { supportedDamageAmountExpr } from "../spells-execution-facts.ts";
import { scalarBuffActiveEffectExpiration } from "../spells-profiles-support.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { spellInvocationResourceForCastOption } from "./profile.ts";
import type { SpellDefinitionRuleFacts } from "../../procedure-execution/spell-rule-facts.ts";
import {
  spellConsumedMaterialEvidencePaths,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureAdmissionIssue,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";
import {
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  spellOngoingAttachmentPath,
  spellOngoingInitialPhasePath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import { PositiveInteger } from "@dnd/shared/types";
import { Schema } from "effect";
import { BattleEffectOccurrenceTemplateSchemaFields } from "../../active-effect/template-codec.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  DamageTypeSchema,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import {
  afterHitAdmissionIssue,
  afterHitAdmissionRejection,
  afterHitEffectOrderIssues,
  afterHitMechanicsIssue,
  afterHitOperationTimingIssues,
  afterHitOptionalIssue,
  afterHitRequiredFactIssues,
  afterHitSingleOperationCountIssues,
  afterHitSingleTargetAttachmentIssue,
  afterHitTriggerAttack,
  oneMinuteTimedAfterHitIssues,
  type AfterHitMechanicsIssue,
} from "./after-hit-mechanics-admission.ts";

type AfterHitTimedDamageAndSaveInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "afterHitTimedDamageAndSave" }
>;
type AfterHitTimedDamageAndSaveMechanicsFacts = SpellDefinitionRuleFacts & {
  readonly immediateDamageAmount: SurfaceDiceAmount;
  readonly turnStartDamageAmount: SurfaceDiceAmount;
  readonly damageType: Extract<DamageType, "fire">;
  readonly saveAbility: "con";
  readonly dc: { readonly kind: "caster_spell_save_dc" };
};

const SpellTurnStartDamageAndSaveEffectSchema = Schema.Struct({
  ...BattleEffectOccurrenceTemplateSchemaFields,
  kind: Schema.Literal("spellTurnStartDamageAndSave"),
  source: Schema.Literals([
    "afterHitTimedDamageAndSave",
    "turnBoundaryEffectLifecycle",
  ]),
  sourceCombatantId: CombatantId,
  damage: Schema.Struct({
    expr: DiceExprSchema,
    damageType: SurfaceDamageTypeSchema,
  }),
  save: Schema.Struct({
    ability: AbilitySchema,
    dc: DcSourceSchema,
    successEnds: Schema.Literal("spell"),
  }),
  expiresAt: BattleActiveEffectExpirationSchema,
});
type AfterHitTimedDamageAndSaveResolveInput =
  SpellProcedureProfileResolveInput<AfterHitTimedDamageAndSaveInvocation>;

function admitAfterHitTimedDamageAndSave(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: AfterHitTimedDamageAndSaveMechanicsFacts,
): readonly AfterHitTimedDamageAndSaveInvocation[] {
  return ctx.spellCastOptions.flatMap(
    (slot): readonly AfterHitTimedDamageAndSaveInvocation[] => {
      if (Number(slot.spellLevel) < facts.level) {
        return [];
      }
      const immediateDamageExpr = supportedDamageAmountExpr({
        amount: facts.immediateDamageAmount,
        spellLevel: facts.level,
        slotLevel: slot.spellLevel,
      });
      const turnStartDamageExpr = supportedDamageAmountExpr({
        amount: facts.turnStartDamageAmount,
        spellLevel: facts.level,
        slotLevel: slot.spellLevel,
      });
      const expiresAt = scalarBuffActiveEffectExpiration(
        ctx.actor.combatantId,
        facts.duration,
      );
      if (immediateDamageExpr === null || turnStartDamageExpr === null) {
        return [];
      }
      if (expiresAt === null) return [];
      return [
        {
          access: { tag: "prepared" },
          resource: spellInvocationResourceForCastOption(slot),
          procedure: "afterHitTimedDamageAndSave",
          spell,
          actionCost: "bonusAction",
          immediateDamage: {
            expr: immediateDamageExpr,
            damageType: facts.damageType,
          },
          activeEffect: {
            kind: "spellTurnStartDamageAndSave",
            source: "afterHitTimedDamageAndSave",
            sourceCombatantId: ctx.actor.combatantId,
            damage: {
              expr: turnStartDamageExpr,
              damageType: facts.damageType,
            },
            save: {
              ability: facts.saveAbility,
              dc: facts.dc,
              successEnds: "spell",
            },
            expiresAt,
          },
        },
      ];
    },
  );
}

export const AFTER_HIT_TIMED_DAMAGE_AND_SAVE_FAILED_FACTS = [
  "level",
  "range",
  "duration",
  "attachment",
  "initialPhase",
  "initialDamage",
  "operationCount",
  "operationTrigger",
  "operationEffect",
  "operationOrder",
  "turnStartDamage",
  "saveGate",
] as const;
type AfterHitTimedDamageAndSaveFailedFact =
  (typeof AFTER_HIT_TIMED_DAMAGE_AND_SAVE_FAILED_FACTS)[number];

type AfterHitTimedDamageAndSaveMechanicsIssue =
  AfterHitMechanicsIssue<AfterHitTimedDamageAndSaveFailedFact>;
type AfterHitTimedDamageAndSaveAdmissionIssue = SpellProcedureAdmissionIssue<
  "afterHitTimedDamageAndSave",
  AfterHitTimedDamageAndSaveFailedFact
>;

function afterHitTimedDamageAndSaveDurationPaths(
  duration: SpellMechanics["duration"],
): readonly SpellMechanicsBranchPath[] {
  if (duration.kind !== "timed") return [];
  return [spellDurationValuePath()];
}

function afterHitTimedDamageAndSaveMechanicsEvidence(
  mechanics: Extract<SpellMechanics, { readonly family: "ongoing_effect" }>,
): SpellProcedureMechanicsEvidence {
  const consumed: [SpellMechanicsBranchPath, ...SpellMechanicsBranchPath[]] = [
    spellMechanicsHeaderPath("level"),
    spellMechanicsHeaderPath("school"),
    spellMechanicsHeaderPath("range"),
    spellMechanicsHeaderPath("components"),
    spellMechanicsHeaderPath("duration"),
    spellMechanicsHeaderPath("castingTime"),
    spellMechanicsHeaderPath("family"),
    ...afterHitTimedDamageAndSaveDurationPaths(mechanics.duration),
    spellOngoingAttachmentPath(),
    spellOngoingInitialPhasePath(),
    spellOngoingOperationPath(PositiveInteger(1)),
    spellOngoingOperationEffectPath(PositiveInteger(1)),
    ...spellConsumedMaterialEvidencePaths(mechanics.components),
  ];
  return { consumed, unowned: [] };
}

type AfterHitTimedDamageAndSaveCandidate = {
  readonly mechanics: Extract<
    SpellMechanics,
    { readonly family: "ongoing_effect" }
  >;
  readonly initialPhase: Extract<
    NonNullable<
      Extract<
        SpellMechanics,
        { readonly family: "ongoing_effect" }
      >["initialPhase"]
    >,
    { readonly kind: "direct" }
  >;
  readonly operation: OngoingEffectMechanicsOperation & {
    readonly effect: Extract<
      OngoingEffect,
      { readonly kind: "composite_ongoing" }
    >;
  };
  readonly operationIndex: number;
};
type AfterHitTimedDamageAndSaveInitialEffect = NonNullable<
  AfterHitTimedDamageAndSaveCandidate["initialPhase"]["effects"]
>[number];

function isAfterHitCompositeOperation(
  operation: OngoingEffectMechanicsOperation | undefined,
): operation is AfterHitTimedDamageAndSaveCandidate["operation"] {
  return operation?.effect.kind === "composite_ongoing";
}

function afterHitTimedDamageAndSaveCandidate(
  source: SpellMechanicsAdmissionSource,
): AfterHitTimedDamageAndSaveCandidate | undefined {
  if (source.mechanics.family !== "ongoing_effect") return undefined;
  if (
    afterHitTriggerAttack(source.mechanics) !== "melee_weapon_or_unarmed_strike"
  ) {
    return undefined;
  }
  const initialPhase = source.mechanics.initialPhase;
  if (initialPhase?.kind !== "direct") return undefined;
  const operationIndex = source.mechanics.operations.findIndex(
    (candidate) => candidate.effect.kind === "composite_ongoing",
  );
  const operation = source.mechanics.operations[operationIndex];
  if (!isAfterHitCompositeOperation(operation)) return undefined;
  return {
    mechanics: source.mechanics,
    initialPhase,
    operation,
    operationIndex,
  };
}

function timedImmediateDamageProjection(
  effect: AfterHitTimedDamageAndSaveInitialEffect | undefined,
) {
  return effect?.kind === "damage" &&
    effect.damageType === "fire" &&
    effect.amount !== undefined
    ? { amount: effect.amount }
    : null;
}

function timedTurnStartDamageProjection(
  effect:
    | AfterHitTimedDamageAndSaveCandidate["operation"]["effect"]["effects"][number]
    | undefined,
) {
  return effect?.kind === "damage" &&
    effect.damageType === "fire" &&
    effect.amount !== undefined
    ? { amount: effect.amount }
    : null;
}

function timedSaveGateProjection(
  effect:
    | AfterHitTimedDamageAndSaveCandidate["operation"]["effect"]["effects"][number]
    | undefined,
) {
  return effect?.kind === "save_gate" &&
    effect.ability === "con" &&
    effect.dc.kind === "caster_spell_save_dc" &&
    effect.onFail.kind === "none" &&
    effect.onSuccess.kind === "end_current_effect"
    ? { ability: "con" as const, dc: { kind: "caster_spell_save_dc" as const } }
    : null;
}

function timedAfterHitHeaderIssues(
  candidate: AfterHitTimedDamageAndSaveCandidate,
): readonly AfterHitTimedDamageAndSaveMechanicsIssue[] {
  return [
    ...afterHitRequiredFactIssues(
      candidate.mechanics.level === 1,
      "level",
      spellMechanicsHeaderPath("level"),
    ),
    ...afterHitRequiredFactIssues(
      candidate.mechanics.range.kind === "self",
      "range",
      spellMechanicsHeaderPath("range"),
    ),
    ...oneMinuteTimedAfterHitIssues(candidate.mechanics.duration, "duration"),
    ...afterHitOptionalIssue(
      afterHitSingleTargetAttachmentIssue(
        candidate.mechanics.attachment,
        "attachment",
        spellOngoingAttachmentPath(),
      ),
    ),
  ];
}

function timedAfterHitInitialIssues(
  candidate: AfterHitTimedDamageAndSaveCandidate,
  damageSupported: boolean,
): readonly AfterHitTimedDamageAndSaveMechanicsIssue[] {
  return [
    ...afterHitOptionalIssue(
      afterHitSingleTargetAttachmentIssue(
        candidate.initialPhase.attachment,
        "initialPhase",
        spellOngoingInitialPhasePath(),
      ),
    ),
    ...afterHitRequiredFactIssues(
      (candidate.initialPhase.effects?.length ?? 0) === 1,
      "initialPhase",
      spellOngoingInitialPhasePath(),
    ),
    ...afterHitRequiredFactIssues(
      damageSupported,
      "initialDamage",
      spellOngoingInitialPhasePath(),
    ),
  ];
}

function timedAfterHitOperationIssues(input: {
  readonly candidate: AfterHitTimedDamageAndSaveCandidate;
  readonly turnStartDamageIndex: number;
  readonly turnStartDamageSupported: boolean;
  readonly saveGateIndex: number;
  readonly saveGateSupported: boolean;
}): readonly AfterHitTimedDamageAndSaveMechanicsIssue[] {
  const { mechanics, operation, operationIndex } = input.candidate;
  const effectPath = spellOngoingOperationEffectPath(
    PositiveInteger(operationIndex + 1),
  );
  return [
    ...afterHitSingleOperationCountIssues(
      mechanics.operations.length,
      operationIndex,
      "operationCount",
    ),
    ...afterHitOperationTimingIssues({
      actualTrigger: operation.trigger.kind,
      expectedTrigger: "on_attached_turn_start",
      operationIndex,
      triggerFailedFact: "operationTrigger",
      orderFailedFact: "operationOrder",
    }),
    ...afterHitRequiredFactIssues(
      operation.effect.effects.length === 2,
      "operationEffect",
      effectPath,
    ),
    ...afterHitEffectOrderIssues({
      effectSupported: input.turnStartDamageSupported,
      actualIndex: input.turnStartDamageIndex,
      expectedIndex: 0,
      effectFailedFact: "turnStartDamage",
      orderFailedFact: "operationOrder",
      mechanicsPath: effectPath,
    }),
    ...afterHitEffectOrderIssues({
      effectSupported: input.saveGateSupported,
      actualIndex: input.saveGateIndex,
      expectedIndex: 1,
      effectFailedFact: "saveGate",
      orderFailedFact: "operationOrder",
      mechanicsPath: effectPath,
    }),
  ];
}

function admitAfterHitTimedDamageAndSaveMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "afterHitTimedDamageAndSave",
  AfterHitTimedDamageAndSaveMechanicsFacts,
  AfterHitTimedDamageAndSaveInvocation,
  AfterHitTimedDamageAndSaveAdmissionIssue
> {
  const candidate = afterHitTimedDamageAndSaveCandidate(source);
  if (candidate === undefined) return { tag: "notRepresented" };
  const { mechanics, initialPhase, operation } = candidate;
  const immediateDamage = initialPhase.effects?.[0];
  const immediateDamageProjection =
    timedImmediateDamageProjection(immediateDamage);
  const composite = operation.effect;
  const turnStartDamageIndex = composite.effects.findIndex(
    (effect) => effect.kind === "damage",
  );
  const turnStartDamage = composite.effects.find(
    (effect) => effect.kind === "damage",
  );
  const turnStartDamageProjection =
    timedTurnStartDamageProjection(turnStartDamage);
  const saveGateIndex = composite.effects.findIndex(
    (effect) => effect.kind === "save_gate",
  );
  const saveGate = composite.effects.find(
    (effect) => effect.kind === "save_gate",
  );
  const saveGateProjection = timedSaveGateProjection(saveGate);
  const issues = [
    ...timedAfterHitHeaderIssues(candidate),
    ...timedAfterHitInitialIssues(
      candidate,
      immediateDamageProjection !== null,
    ),
    ...timedAfterHitOperationIssues({
      candidate,
      turnStartDamageIndex,
      turnStartDamageSupported: turnStartDamageProjection !== null,
      saveGateIndex,
      saveGateSupported: saveGateProjection !== null,
    }),
  ];
  const rejection = afterHitAdmissionRejection(
    "afterHitTimedDamageAndSave",
    issues,
  );
  if (rejection !== undefined) return rejection;
  if (
    immediateDamageProjection === null ||
    composite.effects.length !== 2 ||
    turnStartDamageProjection === null ||
    saveGateProjection === null
  ) {
    return {
      tag: "unsupported",
      issues: [
        afterHitAdmissionIssue(
          "afterHitTimedDamageAndSave",
          afterHitMechanicsIssue(
            "initialPhase",
            spellOngoingInitialPhasePath(),
          ),
        ),
      ],
    };
  }
  const facts = {
    ...source.spellDefinitionRuleFacts,
    immediateDamageAmount: immediateDamageProjection.amount,
    turnStartDamageAmount: turnStartDamageProjection.amount,
    damageType: "fire",
    saveAbility: saveGateProjection.ability,
    dc: saveGateProjection.dc,
  } satisfies AfterHitTimedDamageAndSaveMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "afterHitTimedDamageAndSave",
      facts,
      evidence: afterHitTimedDamageAndSaveMechanicsEvidence(mechanics),
      admit: (executionSource, ctx) =>
        admitAfterHitTimedDamageAndSave(executionSource, ctx, facts),
    },
  };
}

function discoverAfterHitTimedDamageAndSaveCastAct(): readonly BattleActDiscoveryCandidate[] {
  return [];
}

function applyAfterHitTimedDamageAndSaveSpellEffect(
  state: BattleState,
  targetId: CombatantId,
  invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "afterHitTimedDamageAndSave" }
  >,
): BattleState {
  return replaceTargetActiveEffect(
    state,
    targetId,
    (effect) =>
      effect.kind === "spellTurnStartDamageAndSave" &&
      effect.sourceProcedureRef === invocation.sourceProcedureRef &&
      effect.sourceCombatantId === invocation.activeEffect.sourceCombatantId,
    {
      ...invocation.activeEffect,
      sourceProcedureRef: invocation.sourceProcedureRef,
    },
  );
}

function resolveAfterHitTimedDamageAndSave(
  input: AfterHitTimedDamageAndSaveResolveInput,
): BattleResolutionResult {
  const damageAddition: AttackSpellDamageAddition = {
    kind: "attackSpellDamageAddition",
    sourceProcedure: "afterHitTimedDamageAndSave",
    sourceProcedureRef: input.invocation.sourceProcedureRef,
    sourceCombatantId: input.input.subject.casterId,
    damage: {
      expr: input.invocation.immediateDamage.expr,
      damageType: input.invocation.immediateDamage.damageType,
    },
  };
  return resolveAfterHitSlotSpellDamageCast({
    input: input.input,
    frame: input.input.frame,
    fillSet: input.fillSet,
    casterId: input.input.subject.casterId,
    invocation: input.invocation,
    targetId: input.input.target.combatantId,
    damageAddition,
    applyEffect: (state) =>
      applyAfterHitTimedDamageAndSaveSpellEffect(
        state,
        input.input.target.combatantId,
        input.invocation,
      ),
  });
}

const AfterHitTimedDamageAndSaveInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("afterHitTimedDamageAndSave"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("bonusAction"),
      immediateDamage: Schema.Struct({
        expr: DiceExprSchema,
        damageType: DamageTypeSchema,
      }),
      activeEffect: SpellTurnStartDamageAndSaveEffectSchema,
    }),
  );
export const afterHitTimedDamageAndSaveProfile = {
  procedure: "afterHitTimedDamageAndSave",
  executionSchema: AfterHitTimedDamageAndSaveInvocationSchema,
  admitMechanics: admitAfterHitTimedDamageAndSaveMechanics,
  discoverCastAct: discoverAfterHitTimedDamageAndSaveCastAct,
  resolve: resolveAfterHitTimedDamageAndSave,
} satisfies SpellProcedureDeclaration<
  "afterHitTimedDamageAndSave",
  AfterHitTimedDamageAndSaveInvocation
>;
