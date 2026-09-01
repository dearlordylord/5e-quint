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
import {
  sameStringSet,
  supportedSpellSlotDamageFacts,
} from "../spells-execution-facts.ts";
import { illuminationEmissionFactsFromSurface } from "./illumination-emission-facts.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import type { SpellDefinitionRuleFacts } from "../../procedure-execution/spell-rule-facts.ts";
import {
  spellConsumedMaterialEvidencePaths,
  spellProcedureNonEmpty,
  spellUniqueMechanicsIssues,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";
import {
  spellDurationEndingPath,
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

type AfterHitDamageAndIlluminationMechanicsIssue = {
  readonly failedFact: AfterHitDamageAndIlluminationFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
};

function afterHitDamageAndIlluminationMechanicsIssue(
  failedFact: AfterHitDamageAndIlluminationMechanicsIssue["failedFact"],
  mechanicsPath: SpellMechanicsBranchPath,
): AfterHitDamageAndIlluminationMechanicsIssue {
  return { failedFact, mechanicsPath };
}

function afterHitDamageAndIlluminationIssueResult(
  issue: AfterHitDamageAndIlluminationMechanicsIssue,
): {
  readonly tag: "spellProcedureAdmissionIssue";
  readonly procedure: "afterHitDamageAndIllumination";
  readonly failedFact: AfterHitDamageAndIlluminationFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
  readonly message: string;
} {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "afterHitDamageAndIllumination",
    failedFact: issue.failedFact,
    mechanicsPath: issue.mechanicsPath,
    message: `Unsupported afterHitDamageAndIllumination mechanics fact: ${issue.failedFact}.`,
  };
}

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

function admitAfterHitDamageAndIlluminationMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "afterHitDamageAndIllumination",
  AfterHitDamageAndIlluminationMechanicsFacts,
  AfterHitDamageAndIlluminationInvocation,
  ReturnType<typeof afterHitDamageAndIlluminationIssueResult>
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
  const operationEffects = mechanics.operations.map(
    (operation) => operation.effect,
  );
  if (
    trigger?.kind !== "after_hit_with" ||
    trigger.attack !== "melee_weapon_or_unarmed_strike" ||
    initialPhase?.kind !== "direct" ||
    !operationEffects.some(
      (effect) =>
        effect.kind === "emit_bright_illumination" ||
        effect.kind === "emit_bright_and_dim_illumination" ||
        effect.kind === "emit_dim_illumination" ||
        effect.kind === "modify_roll_advantage" ||
        effect.kind === "suppress_condition_benefit",
    )
  ) {
    return { tag: "notRepresented" };
  }
  const issues: AfterHitDamageAndIlluminationMechanicsIssue[] = [];
  const pushIssue = (
    failedFact: AfterHitDamageAndIlluminationMechanicsIssue["failedFact"],
    mechanicsPath: SpellMechanicsBranchPath,
  ): void => {
    issues.push(
      afterHitDamageAndIlluminationMechanicsIssue(failedFact, mechanicsPath),
    );
  };
  if (mechanics.level !== 2) {
    pushIssue("level", spellMechanicsHeaderPath("level"));
  }
  if (mechanics.range.kind !== "self") {
    pushIssue("range", spellMechanicsHeaderPath("range"));
  }
  if (mechanics.duration.kind !== "concentration") {
    pushIssue("duration", spellMechanicsHeaderPath("duration"));
  } else {
    if (
      mechanics.duration.upTo.unit !== "minute" ||
      mechanics.duration.upTo.amount !== 1
    ) {
      pushIssue("duration", spellDurationValuePath());
    }
    for (const [index] of (mechanics.duration.earlyEnd ?? []).entries()) {
      pushIssue(
        "duration",
        spellDurationEndingPath(PositiveInteger(index + 1)),
      );
    }
    if (mechanics.duration.permanentIfMaintainedFull === true) {
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
  const damage = initialPhase.effects?.[0];
  const damageProjection =
    damage?.kind === "damage" &&
    damage.damageType === "radiant" &&
    damage.amount !== undefined
      ? { amount: damage.amount }
      : null;
  if (damageProjection === null) {
    pushIssue("initialDamage", spellOngoingInitialPhasePath());
  }
  const illuminationIndex = operationEffects.findIndex(
    (effect) =>
      effect.kind === "emit_bright_illumination" ||
      effect.kind === "emit_bright_and_dim_illumination" ||
      effect.kind === "emit_dim_illumination",
  );
  const illuminationEffect =
    illuminationIndex < 0 ? undefined : operationEffects[illuminationIndex];
  const illumination =
    illuminationEffect?.kind === "emit_bright_and_dim_illumination" ||
    illuminationEffect?.kind === "emit_bright_illumination"
      ? illuminationEmissionFactsFromSurface({
          effect: illuminationEffect,
          opaqueCoverInteraction: { kind: "doesNotBlockEmission" },
        })
      : null;
  const illuminationProjection =
    illumination?.emission.kind === "bright" ||
    illumination?.emission.kind === "brightAndDim"
      ? {
          emission: illumination.emission,
          opaqueCoverInteraction: {
            kind: illumination.opaqueCoverInteraction.kind,
          },
        }
      : null;
  if (illuminationProjection === null) {
    pushIssue(
      "illumination",
      spellOngoingOperationEffectPath(
        PositiveInteger(illuminationIndex < 0 ? 1 : illuminationIndex + 1),
      ),
    );
  } else if (illuminationIndex !== 0) {
    pushIssue(
      "operationOrder",
      spellOngoingOperationPath(PositiveInteger(illuminationIndex + 1)),
    );
  }
  for (const [index, operation] of mechanics.operations.entries()) {
    if (operation.trigger.kind !== "passive") {
      pushIssue(
        "operationTrigger",
        spellOngoingOperationPath(PositiveInteger(index + 1)),
      );
    }
  }
  const attackAdvantageIndex = operationEffects.findIndex(
    (effect) => effect.kind === "modify_roll_advantage",
  );
  const attackAdvantage =
    attackAdvantageIndex < 0
      ? undefined
      : operationEffects[attackAdvantageIndex];
  const attackAdvantageSupported =
    attackAdvantage?.kind === "modify_roll_advantage" &&
    attackAdvantage.mode === "advantage" &&
    attackAdvantage.affects === "rolls_against_self" &&
    attackAdvantage.on !== undefined &&
    sameStringSet(attackAdvantage.on, ["attack_roll"]);
  if (!attackAdvantageSupported) {
    pushIssue(
      "attackAdvantage",
      spellOngoingOperationEffectPath(
        PositiveInteger(
          attackAdvantageIndex < 0 ? 2 : attackAdvantageIndex + 1,
        ),
      ),
    );
  } else if (attackAdvantageIndex !== 1) {
    pushIssue(
      "operationOrder",
      spellOngoingOperationPath(PositiveInteger(attackAdvantageIndex + 1)),
    );
  }
  const suppressInvisibleIndex = operationEffects.findIndex(
    (effect) => effect.kind === "suppress_condition_benefit",
  );
  const suppressInvisible =
    suppressInvisibleIndex < 0
      ? undefined
      : operationEffects[suppressInvisibleIndex];
  const suppressInvisibleSupported =
    suppressInvisible?.kind === "suppress_condition_benefit" &&
    suppressInvisible.condition === "invisible";
  if (!suppressInvisibleSupported) {
    pushIssue(
      "invisibleSuppression",
      spellOngoingOperationEffectPath(
        PositiveInteger(
          suppressInvisibleIndex < 0 ? 3 : suppressInvisibleIndex + 1,
        ),
      ),
    );
  } else if (suppressInvisibleIndex !== 2) {
    pushIssue(
      "operationOrder",
      spellOngoingOperationPath(PositiveInteger(suppressInvisibleIndex + 1)),
    );
  }
  const semanticOperationIndexes = new Set(
    [illuminationIndex, attackAdvantageIndex, suppressInvisibleIndex].filter(
      (index) => index >= 0,
    ),
  );
  if (mechanics.operations.length < 3) {
    for (let index = mechanics.operations.length; index < 3; index += 1) {
      pushIssue(
        "operationCount",
        spellOngoingOperationPath(PositiveInteger(index + 1)),
      );
    }
  }
  for (const [index] of mechanics.operations.entries()) {
    if (semanticOperationIndexes.has(index)) continue;
    pushIssue(
      "operationCount",
      spellOngoingOperationPath(PositiveInteger(index + 1)),
    );
  }
  const nonEmptyIssues = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues(issues),
  );
  if (nonEmptyIssues !== undefined) {
    const [firstIssue, ...remainingIssues] = nonEmptyIssues.map(
      afterHitDamageAndIlluminationIssueResult,
    );
    return {
      tag: "unsupported",
      issues: [firstIssue, ...remainingIssues],
    };
  }
  if (
    mechanics.duration.kind !== "concentration" ||
    damageProjection === null ||
    illuminationProjection === null ||
    !attackAdvantageSupported ||
    !suppressInvisibleSupported
  ) {
    return {
      tag: "unsupported",
      issues: [
        afterHitDamageAndIlluminationIssueResult(
          afterHitDamageAndIlluminationMechanicsIssue(
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
    illumination: illuminationProjection,
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
