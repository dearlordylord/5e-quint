import { resolveSpellActiveEffectCast } from "../spell-active-effect-resolution.ts";
import { actionSpellCastCandidatesForTargetHole } from "../spell-cast-candidate.ts";
import type { BattleSpellExecutionSource } from "../../battle-state-execution.ts";
import { replaceTargetActiveEffect } from "../active-effect-replacement.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-damage-reduction
import { BattleActiveEffectExpirationSchema } from "../../active-effect/codecs.ts";
//
// The damageReduction Spell Procedure Profile: a cantrip-access spell (today
// Resistance) that, on touch, grants an ongoing reduction of one damage roll
// against the target by 1d4. All damageReduction-specific behavior lives
// here:
//
//   - admit()              — was supportedCantripDamageReductionSpellProfile
//                            in spells-profiles-support.ts
//   - damageReductionShape — was damageReductionSpellProjection in
//                            spells-profiles-support.ts
//   - discoverCastAct()    — was the damageReduction branch in
//                            spells-discovery.ts:discoverBattleActs
//   - castSummary()        — was the damageReduction branch in
//                            spells-discovery.ts:spellInvocationCastSummary
//   - resolve()            — was resolveDamageReductionSpellAct in
//                            spells-resolve-support-effects.ts
//   - applyEffect()        — was applyDamageReductionSpellEffect in
//                            spells-active-effects.ts (kept as a file-local
//                            helper; not exported from the profile)
//
import {
  movementFeet,
  PositiveInteger,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import { DamageTypeSchema } from "@dnd/surface/surface/schema";
import type { DamageType, SpellMechanics } from "@dnd/surface/surface/types";
import { Schema } from "effect";

import type { CombatantId } from "../../identity.ts";
import {
  type BattleActDiscoveryCandidate,
  type BattleResolutionResult,
  type BattleState,
  type BattleExecutableSpellInvocation,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { invalidResult } from "../result-helpers.ts";
import { selectSingleSpellTargetAndDamageType } from "../single-spell-target.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { ATTACK_TARGET_HOLE_ID } from "../battle-runtime-protocol.ts";
import { spellDamageTypeChoiceHole } from "../spells-damage-fills.ts";
import { spellTargetHole } from "../spells-targeting.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { cantripSpellAccessFor } from "./profile.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  CantripSpellAccessSchema,
  MovementFeet,
  NoSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import {
  admitSpellTargetAttachment,
  spellConsumedMaterialEvidencePaths,
  spellProcedureHasRedundantSignature,
  spellProcedureMapNonEmpty,
  spellProcedureNonEmpty,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureAdmissionIssue,
  type SpellProcedureMechanicsFacts,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";
import {
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  spellMechanicsRootPath,
  spellOngoingAttachmentPath,
  spellOngoingInitialPhasePath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type { UnitMechanicsPath } from "@dnd/surface/surface/mechanics-graph-path";
import { persistentAreaDurationChildPaths } from "./persistent-area-save-evidence.ts";

type DamageReductionSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "damageReduction" }
>;
type DamageReductionMechanics = Extract<
  SpellMechanics,
  { readonly family: "ongoing_effect" }
>;
type DamageReductionProfileShape = {
  readonly damageTypeChoices: ReadonlyNonEmptyArray<DamageType>;
  readonly range: Extract<
    SpellProcedureMechanicsFacts["range"],
    { readonly kind: "touch" }
  >;
  readonly duration: Extract<
    SpellProcedureMechanicsFacts["duration"],
    { readonly kind: "concentration" }
  >;
};
type DamageReductionMechanicsFacts = Omit<
  SpellProcedureMechanicsFacts,
  "range" | "duration"
> &
  DamageReductionProfileShape;
type DamageReductionFailedFact =
  | "level"
  | "castingTime"
  | "range"
  | "duration"
  | "initialPhase"
  | "authoredConditionalEffects"
  | "attachment"
  | "rangeOrigin"
  | "typeFilter"
  | "stateFilter"
  | "visibility"
  | "predicate"
  | "targetLimit"
  | "usageLimit"
  | "passiveOperation"
  | "damage"
  | "spellcastingMod"
  | "abilityModifier"
  | "operationCount";
type DamageReductionAdmissionIssue = SpellProcedureAdmissionIssue<
  "damageReduction",
  DamageReductionFailedFact,
  UnitMechanicsPath
>;

const DAMAGE_REDUCTION_LEVEL = 0;
const DAMAGE_REDUCTION_OPERATION_COUNT = 1;
const DAMAGE_REDUCTION_TARGET_SELECTION_FIELDS = [
  "mode",
  "targetKinds",
  "disposition",
] as const;

type DamageReductionOperationOccurrence = {
  readonly operation: DamageReductionMechanics["operations"][number];
  readonly ordinal: PositiveInteger;
};

function damageReductionOperationOccurrences(
  mechanics: DamageReductionMechanics,
): readonly DamageReductionOperationOccurrence[] {
  return mechanics.operations.map((operation, index) => ({
    operation,
    ordinal: PositiveInteger(index + 1),
  }));
}

function damageReductionOperationEffectPath(
  occurrence: DamageReductionOperationOccurrence | undefined,
): SpellMechanicsBranchPath {
  const ordinal = occurrence?.ordinal ?? PositiveInteger(1);
  return spellOngoingOperationEffectPath(ordinal);
}

function damageReductionOperationConstraintFacts(
  operation: DamageReductionMechanics["operations"][number],
): readonly ("predicate" | "targetLimit" | "usageLimit")[] {
  const facts: Array<"predicate" | "targetLimit" | "usageLimit"> = [];
  if (operation.predicate !== undefined) facts.push("predicate");
  if (operation.targetLimit !== undefined) facts.push("targetLimit");
  if (operation.usageLimit !== undefined) facts.push("usageLimit");
  return facts;
}

type DamageReductionDamageTypeProjection =
  | {
      readonly tag: "supported";
      readonly choices: ReadonlyNonEmptyArray<DamageType>;
    }
  | { readonly tag: "unsupported" };

function damageReductionDamageTypeProjection(
  effect:
    | Extract<
        DamageReductionMechanics["operations"][number]["effect"],
        { readonly kind: "reduce_damage_taken" }
      >
    | undefined,
): DamageReductionDamageTypeProjection {
  const damageType = effect?.damageType;
  if (
    typeof damageType !== "object" ||
    damageType === null ||
    damageType.kind !== "hole" ||
    typeof damageType.value !== "object" ||
    damageType.value === null ||
    damageType.value.kind !== "choice"
  ) {
    return { tag: "unsupported" };
  }
  const choices = damageType.value.options.filter(
    (option): option is DamageType => Schema.is(DamageTypeSchema)(option),
  );
  const nonEmptyChoices = spellProcedureNonEmpty(choices);
  return nonEmptyChoices !== undefined &&
    choices.length === damageType.value.options.length
    ? { tag: "supported", choices: nonEmptyChoices }
    : { tag: "unsupported" };
}

function damageReductionTargetAttachmentFailedFacts(
  attachment: DamageReductionMechanics["attachment"],
): readonly Extract<
  DamageReductionFailedFact,
  "attachment" | "rangeOrigin" | "typeFilter" | "stateFilter" | "visibility"
>[] {
  const targetAttachment =
    attachment.kind === "hole" && attachment.value.kind === "target"
      ? attachment.value
      : undefined;
  if (targetAttachment === undefined) return ["attachment"];
  const failedFacts: Array<
    Extract<
      DamageReductionFailedFact,
      "rangeOrigin" | "typeFilter" | "stateFilter" | "visibility"
    >
  > = [];
  if (targetAttachment.rangeOrigin !== undefined) {
    failedFacts.push("rangeOrigin");
  }
  const selection = targetAttachment.selection;
  if ("typeFilter" in selection && selection.typeFilter !== undefined) {
    failedFacts.push("typeFilter");
  }
  if ("stateFilter" in selection && selection.stateFilter !== undefined) {
    failedFacts.push("stateFilter");
  }
  if ("visibility" in selection && selection.visibility !== undefined) {
    failedFacts.push("visibility");
  }
  return failedFacts.length === 0 ? ["attachment"] : failedFacts;
}

function isDamageReductionRepresentation(
  mechanics: SpellMechanics,
): mechanics is DamageReductionMechanics {
  if (mechanics.family !== "ongoing_effect") return false;
  const hasTargetAttachment =
    mechanics.attachment.kind === "hole" &&
    mechanics.attachment.value.kind === "target";
  const hasDamageReductionEffect = mechanics.operations.some(
    ({ effect }) => effect.kind === "reduce_damage_taken",
  );
  if (!hasDamageReductionEffect) return false;
  return spellProcedureHasRedundantSignature({
    kind: "oneWitnessMayBeMissing",
    witnesses: [
      hasTargetAttachment,
      hasDamageReductionEffect,
      mechanics.range.kind === "touch",
    ],
  });
}

function damageReductionIssue(
  failedFact: DamageReductionFailedFact,
  mechanicsPath: UnitMechanicsPath,
): DamageReductionAdmissionIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "damageReduction",
    failedFact,
    mechanicsPath,
    message: `Unsupported damageReduction mechanics fact: ${failedFact}.`,
  };
}

function damageReductionMechanicsAdmission(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "damageReduction",
  DamageReductionMechanicsFacts,
  DamageReductionSpellInvocation,
  DamageReductionAdmissionIssue
> {
  if (!isDamageReductionRepresentation(source.mechanics)) {
    return { tag: "notRepresented" };
  }

  const mechanics = source.mechanics;
  const rangeFacts =
    mechanics.range.kind === "touch" ? mechanics.range : undefined;
  const durationFacts =
    mechanics.duration.kind === "concentration"
      ? mechanics.duration
      : undefined;
  const occurrences = damageReductionOperationOccurrences(mechanics);
  const expected = occurrences.find(
    ({ operation }) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "reduce_damage_taken",
  );
  const selectedOrdinal = expected?.ordinal;
  const extraOperations = occurrences.filter(
    ({ ordinal }) => ordinal !== selectedOrdinal,
  );
  const issues: Array<{
    readonly failedFact: DamageReductionFailedFact;
    readonly mechanicsPath: UnitMechanicsPath;
  }> = [];
  const pushIssue = (
    failedFact: DamageReductionFailedFact,
    mechanicsPath: UnitMechanicsPath,
  ): void => {
    issues.push({ failedFact, mechanicsPath });
  };

  if (mechanics.level !== DAMAGE_REDUCTION_LEVEL) {
    pushIssue("level", spellMechanicsHeaderPath("level"));
  }
  if (mechanics.castingTime.kind !== "action") {
    pushIssue("castingTime", spellMechanicsHeaderPath("castingTime"));
  }
  if (mechanics.range.kind !== "touch") {
    pushIssue("range", spellMechanicsHeaderPath("range"));
  }
  if (
    mechanics.duration.kind !== "concentration" ||
    mechanics.duration.upTo.unit !== "minute" ||
    mechanics.duration.upTo.amount !== 1
  ) {
    pushIssue("duration", spellDurationValuePath());
  }
  for (const mechanicsPath of persistentAreaDurationChildPaths(
    mechanics.duration,
  )) {
    pushIssue("duration", mechanicsPath);
  }
  if (mechanics.initialPhase !== undefined) {
    pushIssue("initialPhase", spellOngoingInitialPhasePath());
  }
  if (mechanics.authoredConditionalEffects !== undefined) {
    pushIssue("authoredConditionalEffects", spellMechanicsRootPath());
  }
  for (const occurrence of occurrences) {
    for (const failedFact of damageReductionOperationConstraintFacts(
      occurrence.operation,
    )) {
      pushIssue(failedFact, spellOngoingOperationPath(occurrence.ordinal));
    }
  }
  const targetAttachmentAdmission = admitSpellTargetAttachment(
    mechanics.attachment,
    DAMAGE_REDUCTION_TARGET_SELECTION_FIELDS,
  );
  if (targetAttachmentAdmission.tag === "rejected") {
    for (const failedFact of damageReductionTargetAttachmentFailedFacts(
      mechanics.attachment,
    )) {
      pushIssue(failedFact, spellOngoingAttachmentPath());
    }
  } else {
    const targetSelection =
      targetAttachmentAdmission.attachment.value.selection;
    if (
      targetSelection.mode !== "one" ||
      !("disposition" in targetSelection) ||
      targetSelection.disposition !== "willing"
    ) {
      pushIssue("attachment", spellOngoingAttachmentPath());
    }
  }
  if (expected === undefined || expected.operation.trigger.kind !== "passive") {
    pushIssue("passiveOperation", damageReductionOperationEffectPath(expected));
  }
  if (expected?.operation.effect.kind !== "reduce_damage_taken") {
    pushIssue("damage", damageReductionOperationEffectPath(expected));
  }
  const damageEffect =
    expected?.operation.effect.kind === "reduce_damage_taken"
      ? expected.operation.effect
      : undefined;
  const damageTypeProjection =
    damageReductionDamageTypeProjection(damageEffect);
  if (damageEffect === undefined || damageEffect.amount.kind !== "fixed") {
    pushIssue("damage", damageReductionOperationEffectPath(expected));
  } else {
    const expr = damageEffect.amount.expr;
    if (expr.dice !== 1 || expr.dieSize !== 4 || (expr.flat ?? 0) !== 0) {
      pushIssue("damage", damageReductionOperationEffectPath(expected));
    }
    if (expr.spellcastingMod === true) {
      pushIssue(
        "spellcastingMod",
        damageReductionOperationEffectPath(expected),
      );
    }
    if (expr.abilityModifier !== undefined) {
      pushIssue(
        "abilityModifier",
        damageReductionOperationEffectPath(expected),
      );
    }
  }
  if (damageTypeProjection.tag === "unsupported") {
    pushIssue("damage", damageReductionOperationEffectPath(expected));
  }
  if (
    mechanics.operations.length !== DAMAGE_REDUCTION_OPERATION_COUNT &&
    extraOperations.length === 0
  ) {
    pushIssue(
      "operationCount",
      spellOngoingOperationPath(
        PositiveInteger(mechanics.operations.length + 1),
      ),
    );
  }
  for (const occurrence of extraOperations) {
    pushIssue("operationCount", spellOngoingOperationPath(occurrence.ordinal));
  }

  const failures = spellProcedureNonEmpty(issues);
  if (failures !== undefined) {
    return {
      tag: "unsupported",
      issues: spellProcedureMapNonEmpty(
        failures,
        ({ failedFact, mechanicsPath }) =>
          damageReductionIssue(failedFact, mechanicsPath),
      ),
    };
  }

  return damageTypeProjection.tag === "supported" &&
    rangeFacts !== undefined &&
    durationFacts !== undefined
    ? (() => {
        const facts = {
          ...source.spellDefinitionRuleFacts,
          range: rangeFacts,
          duration: durationFacts,
          damageTypeChoices: damageTypeProjection.choices,
        } satisfies DamageReductionMechanicsFacts;
        return {
          tag: "supported" as const,
          admitted: {
            binding: "ready" as const,
            procedure: "damageReduction" as const,
            facts,
            evidence: {
              consumed: [
                spellMechanicsHeaderPath("level"),
                spellMechanicsHeaderPath("school"),
                spellMechanicsHeaderPath("range"),
                spellMechanicsHeaderPath("components"),
                spellMechanicsHeaderPath("duration"),
                spellMechanicsHeaderPath("castingTime"),
                spellMechanicsHeaderPath("family"),
                spellDurationValuePath(),
                spellOngoingAttachmentPath(),
                spellOngoingOperationPath(PositiveInteger(1)),
                spellOngoingOperationEffectPath(PositiveInteger(1)),
                ...spellConsumedMaterialEvidencePaths(mechanics.components),
              ],
              unowned: [] as const,
            },
            admit: (
              executionSource: BattleSpellExecutionSource,
              ctx: SpellAdmissionContext,
            ) => admitDamageReduction(executionSource, ctx, facts),
          },
        };
      })()
    : {
        tag: "unsupported",
        issues: [
          damageReductionIssue(
            damageTypeProjection.tag === "unsupported"
              ? "damage"
              : rangeFacts === undefined
                ? "range"
                : "duration",
            damageTypeProjection.tag === "unsupported"
              ? damageReductionOperationEffectPath(expected)
              : rangeFacts === undefined
                ? spellMechanicsHeaderPath("range")
                : spellDurationValuePath(),
          ),
        ],
      };
}

function applyDamageReductionEffect(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  damageType: DamageType,
  invocation: BattleExecutableSpellInvocation<DamageReductionSpellInvocation>,
): BattleState {
  const nextEffect = {
    kind: "spellDamageReduction" as const,
    sourceProcedureRef: invocation.sourceProcedureRef,
    sourceCombatantId: actorId,
    damageType,
    amount: invocation.amount,
    usedThisTurn: false,
    expiresAt: invocation.expiresAt,
  };
  return replaceTargetActiveEffect(
    state,
    targetId,
    (effect) =>
      effect.kind === "spellDamageReduction" &&
      effect.sourceProcedureRef === invocation.sourceProcedureRef,
    nextEffect,
  );
}

function admitDamageReduction(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: DamageReductionMechanicsFacts,
): readonly DamageReductionSpellInvocation[] {
  return [
    {
      access: cantripSpellAccessFor(spell.castingSource),
      resource: { tag: "none" },
      procedure: "damageReduction",
      spell,
      actionCost: "magicAction",
      targeting: {
        kind: "targetList",
        minTargets: 1,
        maxTargets: 1,
        requiredTargetDisposition: "willing",
      },
      damageTypeChoices: facts.damageTypeChoices,
      amount: { dice: 1, dieSize: 4 },
      expiresAt: {
        kind: "concentration",
        combatantId: ctx.actor.combatantId,
      },
      rangeFeet: movementFeet(5),
    },
  ];
}

function discoverDamageReductionCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<DamageReductionSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  return actionSpellCastCandidatesForTargetHole(
    actorId,
    invocation.sourceProcedureRef,
    targetHole,
    [spellDamageTypeChoiceHole(invocation)],
  );
}

function resolveDamageReduction(
  input: SpellProcedureProfileResolveInput<DamageReductionSpellInvocation>,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !fillsBelongToSpellCastHoles(input.input.fills, [
      ATTACK_TARGET_HOLE_ID,
      spellDamageTypeChoiceHole(input.invocation).holeId,
    ])
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Damage-reduction spells use one target fill and one damage type choice.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const selection = selectSingleSpellTargetAndDamageType({
    state: input.input.state,
    subject: input.input.subject,
    actorId: input.actorId,
    invocation: input.invocation,
    targetId: input.fillSet.targetId,
    targetSpatialFacts: input.fillSet.targetSpatialFacts,
    damageType: input.fillSet.damageTypeChoice?.value,
    invalidTargetMessage:
      "Spell target must be a combatant within the selected spell's supported range.",
    invalidDamageTypeMessage:
      "Damage-reduction spell damage type must be one of the selected spell's choices.",
  });
  if (selection.tag !== "selected") {
    return selection;
  }

  return resolveSpellActiveEffectCast({
    resolution: input,
    targetIds: [selection.targetId],
    castingResource: { kind: "magicAction" },
    applyEffect: (state) =>
      applyDamageReductionEffect(
        state,
        input.actorId,
        selection.targetId,
        selection.damageType,
        input.invocation,
      ),
  });
}

export const DamageReductionInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: CantripSpellAccessSchema,
    resource: NoSpellInvocationResourceSchema,
    procedure: Schema.Literal("damageReduction"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("magicAction"),
    targeting: Schema.Struct({
      kind: Schema.Literal("targetList"),
      minTargets: Schema.Literal(1),
      maxTargets: Schema.Number,
      requiredTargetDisposition: Schema.Literal("willing"),
    }),
    damageTypeChoices: Schema.Array(DamageTypeSchema),
    amount: Schema.Struct({
      dice: Schema.Literal(1),
      dieSize: Schema.Literal(4),
    }),
    expiresAt: BattleActiveEffectExpirationSchema,
    rangeFeet: MovementFeet,
  }),
);
export const damageReductionProfile: SpellProcedureDeclaration<
  "damageReduction",
  DamageReductionSpellInvocation,
  DamageReductionMechanicsFacts,
  DamageReductionAdmissionIssue
> = {
  procedure: "damageReduction",
  admitMechanics: damageReductionMechanicsAdmission,
  discoverCastAct: discoverDamageReductionCastAct,
  executionSchema: DamageReductionInvocationSchema,
  resolve: resolveDamageReduction,
};
