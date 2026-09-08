import { resolveAfterHitSlotSpellDamageCast } from "../after-hit-spell-resolution.ts";
import { replaceTargetActiveEffect } from "../active-effect-replacement.ts";
import type {
  BattleSpellExecutionSource,
  SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-after-hit-damage-illumination
import { DiceExprSchema } from "@dnd/surface/surface/schema";
import { ElapsedTimeTicksSchema } from "@dnd/shared/elapsed-time";
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS
//
// The afterHitDamageAndIllumination Spell Procedure Profile: a Bonus Action
// spell cast immediately after a qualifying melee weapon or Unarmed Strike hit,
// adding spell damage to the triggering attack and applying a Concentration
// illumination effect to the struck target.
//
// RAW anchors:
//   - .references/srd-5.2.1/Spells/Descriptions-S-Z.md, after-hit
//     illumination spell:
//     Bonus Action immediately after a Melee weapon or Unarmed Strike hit;
//     Self; Concentration up to 1 minute; extra Radiant damage from the
//     attack; target sheds Bright Light, attack rolls against it have
//     Advantage, and it can't benefit from Invisible.
//   - SRD 5.2.1 Rules Glossary "Concentration", "Bright Light", and
//     "Invisible [Condition]".
//   - SRD 5.2.1 Playing the Game "Damage Rolls".
//   - UBIQUITOUS_LANGUAGE.md: Attack Damage Rider, Bonus Action, Attack Roll,
//     Damage Roll, Spell Slot, Concentration, and Spell Effect.
//
// What stays in shared infrastructure:
//   - The attack-hit interrupt checkpoint and eligibility orchestration stay in
//     dispatcher.ts until the after-hit rider family migrates together.
//   - Illumination emission is retained in the admitted procedure binding;
//     the durable target effect retains only its lifecycle and source ref.
//   - The metamagic table entry remains Wave 9 migration work.

import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import type {
  DamageType,
  DiceAmount as SurfaceDiceAmount,
  SpellMechanics,
} from "@dnd/surface/surface/types";
import { Result } from "effect";

import {
  type AttackSpellDamageAddition,
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
} from "../../battle-state-execution.ts";
import { CombatantId } from "../../identity.ts";
import { sameStringSet } from "../spells-execution-facts.ts";
import { supportedSpellSlotDamageFacts } from "../../procedure-admission/spell-slot-damage-facts.ts";
import { illuminationEmissionFactsFromSurface } from "./illumination-emission-facts.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
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
  BrightRadiusIlluminationEmissionFactsSchema,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import {
  afterHitAdmissionRejection,
  afterHitAdmissionIssue,
  afterHitMechanicsIssue,
  afterHitOptionalIssue,
  afterHitPassiveOperationIssues,
  afterHitRecognizedOperationCountIssues,
  afterHitRequiredFactIssues,
  afterHitSemanticOperationIssues,
  afterHitSingleTargetAttachmentIssue,
  afterHitTriggerAttack,
  oneMinuteConcentrationAfterHitIssues,
  type AfterHitMechanicsIssue,
} from "./after-hit-mechanics-admission.ts";

type AfterHitDamageAndIlluminationInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "afterHitDamageAndIllumination" }
>;
type AfterHitDamageAndIlluminationMechanicsFacts = SpellDefinitionRuleFacts & {
  readonly damageAmount: SurfaceDiceAmount;
  readonly damageType: Extract<DamageType, "radiant">;
  readonly illumination: AfterHitDamageAndIlluminationInvocation["illumination"];
};

const AfterHitDamageAndIlluminationEffectSchema = Schema.Struct({
  ...BattleEffectOccurrenceTemplateSchemaFields,
  kind: Schema.Literal("afterHitDamageAndIllumination"),
  sourceCombatantId: CombatantId,
  expiresAt: Schema.Struct({
    kind: Schema.Literal("concentration"),
    combatantId: CombatantId,
    durationTicks: ElapsedTimeTicksSchema,
  }),
});
type AfterHitDamageAndIlluminationResolveInput =
  SpellProcedureProfileResolveInput<AfterHitDamageAndIlluminationInvocation>;

function admitAfterHitDamageAndIllumination(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: AfterHitDamageAndIlluminationMechanicsFacts,
): readonly AfterHitDamageAndIlluminationInvocation[] {
  const durationTicks =
    facts.duration.kind === "concentration"
      ? elapsedTimeTicksFromTimeSpanDuration(facts.duration.upTo)
      : null;
  if (durationTicks === null || Result.isFailure(durationTicks)) return [];
  return supportedSpellSlotDamageFacts({
    slots: ctx.spellCastOptions,
    amount: facts.damageAmount,
    spellLevel: facts.level,
  }).map(
    ({
      slotLevel,
      damageExpr,
      payment,
    }): AfterHitDamageAndIlluminationInvocation => ({
      access: { tag: "prepared" },
      resource: spellInvocationResourceForCastOption({
        spellLevel: slotLevel,
        payment,
      }),
      procedure: "afterHitDamageAndIllumination",
      spell,
      actionCost: "bonusAction",
      damage: {
        expr: damageExpr,
        damageType: facts.damageType,
      },
      illumination: facts.illumination,
      activeEffect: {
        kind: "afterHitDamageAndIllumination",
        sourceCombatantId: ctx.actor.combatantId,
        expiresAt: {
          kind: "concentration",
          combatantId: ctx.actor.combatantId,
          durationTicks: durationTicks.success,
        },
      },
    }),
  );
}

export const AFTER_HIT_DAMAGE_AND_ILLUMINATION_FAILED_FACTS = [
  "level",
  "range",
  "duration",
  "attachment",
  "initialPhase",
  "initialDamage",
  "operationCount",
  "operationTrigger",
  "operationOrder",
  "illumination",
  "attackAdvantage",
  "invisibleSuppression",
] as const;
type AfterHitDamageAndIlluminationFailedFact =
  (typeof AFTER_HIT_DAMAGE_AND_ILLUMINATION_FAILED_FACTS)[number];

type AfterHitDamageAndIlluminationMechanicsIssue =
  AfterHitMechanicsIssue<AfterHitDamageAndIlluminationFailedFact>;
type AfterHitDamageAndIlluminationAdmissionIssue = SpellProcedureAdmissionIssue<
  "afterHitDamageAndIllumination",
  AfterHitDamageAndIlluminationFailedFact
>;

function afterHitDamageAndIlluminationDurationPaths(
  duration: SpellMechanics["duration"],
): readonly SpellMechanicsBranchPath[] {
  if (duration.kind !== "concentration") return [];
  return [spellDurationValuePath()];
}

function afterHitDamageAndIlluminationMechanicsEvidence(
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
    ...afterHitDamageAndIlluminationDurationPaths(mechanics.duration),
    spellOngoingAttachmentPath(),
    spellOngoingInitialPhasePath(),
    ...mechanics.operations.flatMap((_operation, index) => [
      spellOngoingOperationPath(PositiveInteger(index + 1)),
      spellOngoingOperationEffectPath(PositiveInteger(index + 1)),
    ]),
    ...spellConsumedMaterialEvidencePaths(mechanics.components),
  ];
  return { consumed, unowned: [] };
}

type AfterHitIlluminationCandidate = {
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
  readonly operationEffects: Extract<
    SpellMechanics,
    { readonly family: "ongoing_effect" }
  >["operations"][number]["effect"][];
};

function isAfterHitIlluminationEffect(
  effect: AfterHitIlluminationCandidate["operationEffects"][number],
): effect is Extract<
  typeof effect,
  {
    readonly kind:
      | "emit_bright_illumination"
      | "emit_bright_and_dim_illumination"
      | "emit_dim_illumination";
  }
> {
  return (
    effect.kind === "emit_bright_illumination" ||
    effect.kind === "emit_bright_and_dim_illumination" ||
    effect.kind === "emit_dim_illumination"
  );
}

function isAfterHitIlluminationSemanticEffect(
  effect: AfterHitIlluminationCandidate["operationEffects"][number],
): boolean {
  return (
    isAfterHitIlluminationEffect(effect) ||
    effect.kind === "modify_roll_advantage" ||
    effect.kind === "suppress_condition_benefit"
  );
}

function afterHitIlluminationCandidate(
  source: SpellMechanicsAdmissionSource,
): AfterHitIlluminationCandidate | undefined {
  if (source.mechanics.family !== "ongoing_effect") return undefined;
  if (
    afterHitTriggerAttack(source.mechanics) !== "melee_weapon_or_unarmed_strike"
  ) {
    return undefined;
  }
  const initialPhase = source.mechanics.initialPhase;
  if (initialPhase?.kind !== "direct") return undefined;
  const operationEffects = source.mechanics.operations.map(
    (operation) => operation.effect,
  );
  if (!operationEffects.some(isAfterHitIlluminationSemanticEffect)) {
    return undefined;
  }
  return { mechanics: source.mechanics, initialPhase, operationEffects };
}

function afterHitIlluminationDamageProjection(
  initialPhase: AfterHitIlluminationCandidate["initialPhase"],
) {
  const damage = initialPhase.effects?.[0];
  return damage?.kind === "damage" &&
    damage.damageType === "radiant" &&
    damage.amount !== undefined
    ? { amount: damage.amount }
    : null;
}

function afterHitIlluminationProjection(
  operationEffects: AfterHitIlluminationCandidate["operationEffects"],
) {
  const operationIndex = operationEffects.findIndex(
    isAfterHitIlluminationEffect,
  );
  const illumination = afterHitIlluminationEmission(
    operationEffects[operationIndex],
  );
  const projection = afterHitIlluminationExecutionProjection(illumination);
  return { operationIndex, projection };
}

function afterHitIlluminationEmission(
  effect: AfterHitIlluminationCandidate["operationEffects"][number] | undefined,
): ReturnType<typeof illuminationEmissionFactsFromSurface> {
  if (effect === undefined || !isAfterHitIlluminationEffect(effect))
    return null;
  return illuminationEmissionFactsFromSurface({
    effect,
    opaqueCoverInteraction: { kind: "doesNotBlockEmission" },
  });
}

function afterHitIlluminationExecutionProjection(
  illumination: ReturnType<typeof illuminationEmissionFactsFromSurface>,
) {
  if (illumination === null || illumination.emission.kind === "dim") {
    return null;
  }
  return {
    emission: illumination.emission,
    opaqueCoverInteraction: {
      kind: illumination.opaqueCoverInteraction.kind,
    },
  };
}

function afterHitAttackAdvantageProjection(
  operationEffects: AfterHitIlluminationCandidate["operationEffects"],
) {
  const operationIndex = operationEffects.findIndex(
    (effect) => effect.kind === "modify_roll_advantage",
  );
  const effect = operationEffects[operationIndex];
  const supported =
    effect?.kind === "modify_roll_advantage" &&
    effect.mode === "advantage" &&
    effect.affects === "rolls_against_self" &&
    effect.on !== undefined &&
    sameStringSet(effect.on, ["attack_roll"]);
  return { operationIndex, supported };
}

function afterHitInvisibleSuppressionProjection(
  operationEffects: AfterHitIlluminationCandidate["operationEffects"],
) {
  const operationIndex = operationEffects.findIndex(
    (effect) => effect.kind === "suppress_condition_benefit",
  );
  const effect = operationEffects[operationIndex];
  const supported =
    effect?.kind === "suppress_condition_benefit" &&
    effect.condition === "invisible";
  return { operationIndex, supported };
}

function afterHitIlluminationHeaderIssues(
  candidate: AfterHitIlluminationCandidate,
  damageSupported: boolean,
): readonly AfterHitDamageAndIlluminationMechanicsIssue[] {
  return [
    ...afterHitRequiredFactIssues(
      candidate.mechanics.level === 2,
      "level",
      spellMechanicsHeaderPath("level"),
    ),
    ...afterHitRequiredFactIssues(
      candidate.mechanics.range.kind === "self",
      "range",
      spellMechanicsHeaderPath("range"),
    ),
    ...oneMinuteConcentrationAfterHitIssues(
      candidate.mechanics.duration,
      "duration",
    ),
    ...afterHitOptionalIssue(
      afterHitSingleTargetAttachmentIssue(
        candidate.mechanics.attachment,
        "attachment",
        spellOngoingAttachmentPath(),
      ),
    ),
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

function afterHitIlluminationOperationIssues(input: {
  readonly candidate: AfterHitIlluminationCandidate;
  readonly illumination: ReturnType<typeof afterHitIlluminationProjection>;
  readonly attackAdvantage: ReturnType<
    typeof afterHitAttackAdvantageProjection
  >;
  readonly invisibleSuppression: ReturnType<
    typeof afterHitInvisibleSuppressionProjection
  >;
}): readonly AfterHitDamageAndIlluminationMechanicsIssue[] {
  const recognizedIndexes = new Set(
    [
      input.illumination.operationIndex,
      input.attackAdvantage.operationIndex,
      input.invisibleSuppression.operationIndex,
    ].filter((index) => index >= 0),
  );
  return [
    ...afterHitSemanticOperationIssues({
      effectSupported: input.illumination.projection !== null,
      operationIndex: input.illumination.operationIndex,
      expectedIndex: 0,
      missingEffectOrdinal: PositiveInteger(1),
      effectFailedFact: "illumination",
      orderFailedFact: "operationOrder",
    }),
    ...afterHitSemanticOperationIssues({
      effectSupported: input.attackAdvantage.supported,
      operationIndex: input.attackAdvantage.operationIndex,
      expectedIndex: 1,
      missingEffectOrdinal: PositiveInteger(2),
      effectFailedFact: "attackAdvantage",
      orderFailedFact: "operationOrder",
    }),
    ...afterHitSemanticOperationIssues({
      effectSupported: input.invisibleSuppression.supported,
      operationIndex: input.invisibleSuppression.operationIndex,
      expectedIndex: 2,
      missingEffectOrdinal: PositiveInteger(3),
      effectFailedFact: "invisibleSuppression",
      orderFailedFact: "operationOrder",
    }),
    ...afterHitPassiveOperationIssues(
      input.candidate.mechanics.operations,
      "operationTrigger",
    ),
    ...afterHitRecognizedOperationCountIssues({
      operationCount: input.candidate.mechanics.operations.length,
      expectedCount: 3,
      recognizedIndexes,
      failedFact: "operationCount",
    }),
  ];
}

function admitAfterHitDamageAndIlluminationMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "afterHitDamageAndIllumination",
  AfterHitDamageAndIlluminationMechanicsFacts,
  AfterHitDamageAndIlluminationInvocation,
  AfterHitDamageAndIlluminationAdmissionIssue
> {
  const candidate = afterHitIlluminationCandidate(source);
  if (candidate === undefined) return { tag: "notRepresented" };
  const { mechanics, initialPhase, operationEffects } = candidate;
  const damageProjection = afterHitIlluminationDamageProjection(initialPhase);
  const illumination = afterHitIlluminationProjection(operationEffects);
  const attackAdvantage = afterHitAttackAdvantageProjection(operationEffects);
  const invisibleSuppression =
    afterHitInvisibleSuppressionProjection(operationEffects);
  const issues = [
    ...afterHitIlluminationHeaderIssues(candidate, damageProjection !== null),
    ...afterHitIlluminationOperationIssues({
      candidate,
      illumination,
      attackAdvantage,
      invisibleSuppression,
    }),
  ];
  const rejection = afterHitAdmissionRejection(
    "afterHitDamageAndIllumination",
    issues,
  );
  if (rejection !== undefined) return rejection;
  if (
    mechanics.duration.kind !== "concentration" ||
    damageProjection === null ||
    illumination.projection === null ||
    !attackAdvantage.supported ||
    !invisibleSuppression.supported
  ) {
    return {
      tag: "unsupported",
      issues: [
        afterHitAdmissionIssue(
          "afterHitDamageAndIllumination",
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
    damageAmount: damageProjection.amount,
    damageType: "radiant",
    illumination: illumination.projection,
  } satisfies AfterHitDamageAndIlluminationMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "afterHitDamageAndIllumination",
      facts,
      evidence: afterHitDamageAndIlluminationMechanicsEvidence(mechanics),
      admit: (executionSource, ctx) =>
        admitAfterHitDamageAndIllumination(executionSource, ctx, facts),
    },
  };
}

function discoverAfterHitDamageAndIlluminationCastAct(): readonly BattleActDiscoveryCandidate[] {
  return [];
}

function applyAfterHitDamageAndIlluminationSpellEffect(
  state: BattleState,
  targetId: CombatantId,
  invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "afterHitDamageAndIllumination" }
  >,
): BattleState {
  return replaceTargetActiveEffect(
    state,
    targetId,
    (effect) =>
      effect.kind === "afterHitDamageAndIllumination" &&
      effect.sourceProcedureRef === invocation.sourceProcedureRef &&
      effect.sourceCombatantId === invocation.activeEffect.sourceCombatantId,
    {
      ...invocation.activeEffect,
      sourceProcedureRef: invocation.sourceProcedureRef,
    },
  );
}

function resolveAfterHitDamageAndIllumination(
  input: AfterHitDamageAndIlluminationResolveInput,
): BattleResolutionResult {
  const damageAddition: AttackSpellDamageAddition = {
    kind: "attackSpellDamageAddition",
    sourceProcedure: "afterHitDamageAndIllumination",
    sourceProcedureRef: input.invocation.sourceProcedureRef,
    sourceCombatantId: input.input.subject.casterId,
    damage: {
      expr: input.invocation.damage.expr,
      damageType: input.invocation.damage.damageType,
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
      applyAfterHitDamageAndIlluminationSpellEffect(
        state,
        input.input.target.combatantId,
        input.invocation,
      ),
  });
}

const AfterHitDamageAndIlluminationInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("afterHitDamageAndIllumination"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("bonusAction"),
      damage: Schema.Struct({
        expr: DiceExprSchema,
        damageType: DamageTypeSchema,
      }),
      illumination: BrightRadiusIlluminationEmissionFactsSchema,
      activeEffect: AfterHitDamageAndIlluminationEffectSchema,
    }),
  );
export const afterHitDamageAndIlluminationProfile = {
  procedure: "afterHitDamageAndIllumination",
  executionSchema: AfterHitDamageAndIlluminationInvocationSchema,
  admitMechanics: admitAfterHitDamageAndIlluminationMechanics,
  discoverCastAct: discoverAfterHitDamageAndIlluminationCastAct,
  resolve: resolveAfterHitDamageAndIllumination,
} satisfies SpellProcedureDeclaration<
  "afterHitDamageAndIllumination",
  AfterHitDamageAndIlluminationInvocation
>;
import { spellInvocationResourceForCastOption } from "./profile.ts";
