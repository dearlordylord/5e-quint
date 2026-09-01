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
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";
import {
  spellDurationEndingPath,
  spellDurationExtensionPath,
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  spellOngoingAttachmentPath,
  spellOngoingInitialPhasePath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import { PositiveInteger, type ReadonlyNonEmptyArray } from "@dnd/shared/types";
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

type AfterHitTimedDamageAndSaveMechanicsIssue = {
  readonly failedFact: AfterHitTimedDamageAndSaveFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
};

function afterHitTimedDamageAndSaveMechanicsIssue(
  failedFact: AfterHitTimedDamageAndSaveMechanicsIssue["failedFact"],
  mechanicsPath: SpellMechanicsBranchPath,
): AfterHitTimedDamageAndSaveMechanicsIssue {
  return { failedFact, mechanicsPath };
}

function afterHitTimedDamageAndSaveIssueResult(
  issue: AfterHitTimedDamageAndSaveMechanicsIssue,
): {
  readonly tag: "spellProcedureAdmissionIssue";
  readonly procedure: "afterHitTimedDamageAndSave";
  readonly failedFact: AfterHitTimedDamageAndSaveFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
  readonly message: string;
} {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "afterHitTimedDamageAndSave",
    failedFact: issue.failedFact,
    mechanicsPath: issue.mechanicsPath,
    message: `Unsupported afterHitTimedDamageAndSave mechanics fact: ${issue.failedFact}.`,
  };
}

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

function afterHitTimedDamageAndSaveNonEmpty<T>(
  values: readonly T[],
): ReadonlyNonEmptyArray<T> | undefined {
  const [first, ...rest] = values;
  return first === undefined ? undefined : [first, ...rest];
}

function afterHitTimedDamageAndSaveUniqueIssues(
  issues: readonly AfterHitTimedDamageAndSaveMechanicsIssue[],
): readonly AfterHitTimedDamageAndSaveMechanicsIssue[] {
  const issueKeys = new Set<string>();
  return issues.filter((issue) => {
    const key = JSON.stringify([issue.failedFact, issue.mechanicsPath.nodes]);
    if (issueKeys.has(key)) return false;
    issueKeys.add(key);
    return true;
  });
}

function admitAfterHitTimedDamageAndSaveMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "afterHitTimedDamageAndSave",
  AfterHitTimedDamageAndSaveMechanicsFacts,
  AfterHitTimedDamageAndSaveInvocation,
  ReturnType<typeof afterHitTimedDamageAndSaveIssueResult>
> {
  if (source.mechanics.family !== "ongoing_effect") {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
  const castingTime = mechanics.castingTime;
  if (castingTime.kind !== "bonus_action") {
    return { tag: "notRepresented" };
  }
  const trigger = castingTime.trigger;
  const initialPhase = mechanics.initialPhase;
  const operation = mechanics.operations.find(
    (candidate) => candidate.effect.kind === "composite_ongoing",
  );
  if (
    trigger?.kind !== "after_hit_with" ||
    trigger.attack !== "melee_weapon_or_unarmed_strike" ||
    initialPhase?.kind !== "direct" ||
    operation?.effect.kind !== "composite_ongoing"
  ) {
    return { tag: "notRepresented" };
  }
  const issues: AfterHitTimedDamageAndSaveMechanicsIssue[] = [];
  const issueKeys = new Set<string>();
  const pushIssue = (
    failedFact: AfterHitTimedDamageAndSaveMechanicsIssue["failedFact"],
    mechanicsPath: SpellMechanicsBranchPath,
  ): void => {
    const key = JSON.stringify([failedFact, mechanicsPath.nodes]);
    if (issueKeys.has(key)) return;
    issueKeys.add(key);
    issues.push(
      afterHitTimedDamageAndSaveMechanicsIssue(failedFact, mechanicsPath),
    );
  };
  if (mechanics.level !== 1) {
    pushIssue("level", spellMechanicsHeaderPath("level"));
  }
  if (mechanics.range.kind !== "self") {
    pushIssue("range", spellMechanicsHeaderPath("range"));
  }
  if (mechanics.duration.kind !== "timed") {
    pushIssue("duration", spellMechanicsHeaderPath("duration"));
  } else {
    if (
      mechanics.duration.value.unit !== "minute" ||
      mechanics.duration.value.amount !== 1
    ) {
      pushIssue("duration", spellDurationValuePath());
    }
    for (const [index] of (
      mechanics.duration.value.upcastTiers ?? []
    ).entries()) {
      pushIssue(
        "duration",
        spellDurationExtensionPath(PositiveInteger(index + 1)),
      );
    }
    for (const [index] of (mechanics.duration.earlyEnd ?? []).entries()) {
      pushIssue(
        "duration",
        spellDurationEndingPath(PositiveInteger(index + 1)),
      );
    }
    if (mechanics.duration.permanentAfter !== undefined) {
      pushIssue(
        "duration",
        spellDurationEndingPath(
          PositiveInteger((mechanics.duration.earlyEnd?.length ?? 0) + 1),
        ),
      );
    }
  }
  if (
    mechanics.attachment.kind !== "hole" ||
    mechanics.attachment.value.kind !== "target" ||
    mechanics.attachment.value.selection.mode !== "one"
  ) {
    pushIssue("attachment", spellOngoingAttachmentPath());
  }
  if (
    initialPhase.attachment.kind !== "hole" ||
    initialPhase.attachment.value.kind !== "target" ||
    initialPhase.attachment.value.selection.mode !== "one" ||
    (initialPhase.effects?.length ?? 0) !== 1
  ) {
    pushIssue("initialPhase", spellOngoingInitialPhasePath());
  }
  const immediateDamage = initialPhase.effects?.[0];
  const immediateDamageProjection =
    immediateDamage?.kind === "damage" &&
    immediateDamage.damageType === "fire" &&
    immediateDamage.amount !== undefined
      ? { amount: immediateDamage.amount }
      : null;
  if (immediateDamageProjection === null) {
    pushIssue("initialDamage", spellOngoingInitialPhasePath());
  }
  const operationIndex = mechanics.operations.findIndex(
    (candidate) => candidate.effect.kind === "composite_ongoing",
  );
  if (mechanics.operations.length !== 1) {
    if (mechanics.operations.length === 0) {
      pushIssue(
        "operationCount",
        spellOngoingOperationPath(PositiveInteger(1)),
      );
    }
    for (const [index] of mechanics.operations.entries()) {
      if (index === operationIndex) continue;
      pushIssue(
        "operationCount",
        spellOngoingOperationPath(PositiveInteger(index + 1)),
      );
    }
  }
  if (operation.trigger.kind !== "on_attached_turn_start") {
    pushIssue(
      "operationTrigger",
      spellOngoingOperationPath(PositiveInteger(operationIndex + 1)),
    );
  } else if (operationIndex !== 0) {
    pushIssue(
      "operationOrder",
      spellOngoingOperationPath(PositiveInteger(operationIndex + 1)),
    );
  }
  const composite = operation.effect;
  if (composite.effects.length !== 2) {
    pushIssue(
      "operationEffect",
      spellOngoingOperationEffectPath(PositiveInteger(operationIndex + 1)),
    );
  }
  const turnStartDamageIndex = composite.effects.findIndex(
    (effect) => effect.kind === "damage",
  );
  const turnStartDamage = composite.effects.find(
    (effect) => effect.kind === "damage",
  );
  const turnStartDamageProjection =
    turnStartDamage?.kind === "damage" &&
    turnStartDamage.damageType === "fire" &&
    turnStartDamage.amount !== undefined
      ? { amount: turnStartDamage.amount }
      : null;
  if (turnStartDamageProjection === null) {
    pushIssue(
      "turnStartDamage",
      spellOngoingOperationEffectPath(PositiveInteger(operationIndex + 1)),
    );
  } else if (turnStartDamageIndex !== 0) {
    pushIssue(
      "operationOrder",
      spellOngoingOperationEffectPath(PositiveInteger(operationIndex + 1)),
    );
  }
  const saveGateIndex = composite.effects.findIndex(
    (effect) => effect.kind === "save_gate",
  );
  const saveGate = composite.effects.find(
    (effect) => effect.kind === "save_gate",
  );
  const saveGateProjection =
    saveGate?.kind === "save_gate" &&
    saveGate.ability === "con" &&
    saveGate.dc.kind === "caster_spell_save_dc" &&
    saveGate.onFail.kind === "none" &&
    saveGate.onSuccess.kind === "end_current_effect"
      ? {
          ability: "con" as const,
          dc: { kind: "caster_spell_save_dc" as const },
        }
      : null;
  if (saveGateProjection === null) {
    pushIssue(
      "saveGate",
      spellOngoingOperationEffectPath(PositiveInteger(operationIndex + 1)),
    );
  } else if (saveGateIndex !== 1) {
    pushIssue(
      "operationOrder",
      spellOngoingOperationEffectPath(PositiveInteger(operationIndex + 1)),
    );
  }
  const nonEmptyIssues = afterHitTimedDamageAndSaveNonEmpty(
    afterHitTimedDamageAndSaveUniqueIssues(issues),
  );
  if (nonEmptyIssues !== undefined) {
    const [firstIssue, ...remainingIssues] = nonEmptyIssues.map(
      afterHitTimedDamageAndSaveIssueResult,
    );
    return {
      tag: "unsupported",
      issues: [firstIssue, ...remainingIssues],
    };
  }
  if (
    immediateDamageProjection === null ||
    composite.effects.length !== 2 ||
    turnStartDamageProjection === null ||
    saveGateProjection === null
  ) {
    return {
      tag: "unsupported",
      issues: [
        afterHitTimedDamageAndSaveIssueResult(
          afterHitTimedDamageAndSaveMechanicsIssue(
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
