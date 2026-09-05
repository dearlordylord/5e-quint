// UNIT-PROFILE-COVERAGE: runtime-owner spell.creature-type-protection-and-charm
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-glyph-stored-concentration-full-duration
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CREATURE_TYPE_PROTECTION_AND_CONDITION_PREVENTION
import { movementFeet, PositiveInteger } from "@dnd/shared/types";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellCreatureTypeScopedProtectionPath,
  spellMechanicsHeaderPath,
  spellOngoingAttachmentPath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
  spellOngoingSpecialFunctionPath,
  spellOngoingSpecialFunctionResolutionPath,
  spellOngoingSpecialFunctionResultPath,
  spellOngoingSpecialFunctionSpellEndingPath,
  spellOngoingSpecialFunctionTargetPath,
  spellRelevantEffectProtectionOutcomePath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type {
  CreatureTypeProtection,
  CreatureTypeWard,
  Duration,
  SpellLevel,
  SpellMechanics,
} from "@dnd/surface/surface/types";
import { Match, Schema } from "effect";

import { CreatureTypeProtectionTemplateSchema } from "../../active-effect/codecs.ts";
import type { CreatureTypeProtectionPolicy } from "../../active-effect/types.ts";
import type {
  ActionSpellBattleResolutionInput,
  BattleActDiscoveryCandidate,
  BattleExecutableSpellInvocation,
  BattleResolutionResult,
  BattleSpellExecutionSource,
  BattleState,
  CreatureTypeProtectionSpellInvocation,
} from "../../battle-state-execution.ts";
import { CombatantId } from "../../identity.ts";
import {
  LeveledSpellInvocationResourceSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
} from "../codec-building-blocks.ts";
import { replaceTargetActiveEffect } from "../active-effect-replacement.ts";
import { ATTACK_TARGET_HOLE_ID } from "../battle-runtime-protocol.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { spellSelectionResolution } from "../needs-holes-result.ts";
import { invalidResult } from "../result-helpers.ts";
import { resolveSpellActiveEffectCast } from "../spell-active-effect-resolution.ts";
import {
  actionSpellCastCandidate,
  actionSpellCastCandidatesForTargetHole,
} from "../spell-cast-candidate.ts";
import { spellTargetHole } from "../spells-holes-fills.ts";
import {
  spellSingleTargetSelection,
  type SpellSingleTargetSelection,
} from "../spells-resolve-target-selection.ts";
import type { SpellFillSet } from "../spells-resolve-fill-set.ts";
import {
  isSpellCanonicalDurationValue,
  spellConsumedMaterialEvidencePaths,
  spellDurationEvidencePaths,
  spellMechanicsObjectHasOnlyKeys,
  spellProcedureNonEmpty,
  spellUniqueMechanicsIssues,
  type SpellCanonicalDurationValue,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";
import {
  spellInvocationResourceForCastOption,
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
  type SpellAdmissionContext,
  type SpellProcedureDeclaration,
  type SpellProcedureProfileResolveInput,
} from "./profile.ts";

type ProtectionDuration = Extract<
  Duration,
  { readonly kind: "concentration" }
> & { readonly upTo: SpellCanonicalDurationValue };
type ProtectionFacts =
  | {
      readonly kind: "targetedActivation";
      readonly level: SpellLevel;
      readonly duration: ProtectionDuration;
      readonly policy: CreatureTypeProtectionPolicy;
    }
  | {
      readonly kind: "selfOngoingWard";
      readonly level: SpellLevel;
      readonly duration: ProtectionDuration;
      readonly policy: CreatureTypeProtectionPolicy;
    };

export const CREATURE_TYPE_PROTECTION_FAILED_FACTS = [
  "castingTime",
  "range",
  "duration",
  "phase",
  "phaseCount",
  "attachment",
  "targetSelection",
  "effect",
  "effectCount",
  "operation",
  "operationCount",
] as const;
type FailedFact = (typeof CREATURE_TYPE_PROTECTION_FAILED_FACTS)[number];
type MechanicsIssue = {
  readonly failedFact: FailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
};
type Inspection = SpellProcedureMechanicsInspection<
  "creatureTypeProtection",
  ProtectionFacts,
  CreatureTypeProtectionSpellInvocation,
  ReturnType<typeof issueResult>
>;

const COMMON_PATHS = [
  spellMechanicsHeaderPath("level"),
  spellMechanicsHeaderPath("school"),
  spellMechanicsHeaderPath("range"),
  spellMechanicsHeaderPath("components"),
  spellMechanicsHeaderPath("duration"),
  spellMechanicsHeaderPath("castingTime"),
  spellMechanicsHeaderPath("family"),
] as const;

function issueResult(issue: MechanicsIssue) {
  return {
    tag: "spellProcedureAdmissionIssue" as const,
    procedure: "creatureTypeProtection" as const,
    ...issue,
    message: `Unsupported creatureTypeProtection mechanics fact: ${issue.failedFact}.`,
  };
}

function isProtectionDuration(value: Duration): value is ProtectionDuration {
  return (
    value.kind === "concentration" && isSpellCanonicalDurationValue(value.upTo)
  );
}

function policy(
  effect: CreatureTypeProtection | CreatureTypeWard,
): CreatureTypeProtectionPolicy {
  return {
    creatureTypes: effect.creatureTypes,
    protections: effect.protections,
  };
}

function protectionPaths(
  effectPath: SpellMechanicsBranchPath,
  effect: CreatureTypeProtection | CreatureTypeWard,
): readonly SpellMechanicsBranchPath[] {
  return effect.protections.flatMap((protection, index) => {
    const protectionPath = spellCreatureTypeScopedProtectionPath(
      effectPath,
      PositiveInteger(index + 1),
    );
    return Match.value(protection).pipe(
      Match.when({ kind: "attack_rolls_against_target" }, () => [
        protectionPath,
      ]),
      Match.when({ kind: "relevant_effect_protection" }, (relevant) => [
        protectionPath,
        ...relevant.outcomes.map((_outcome, outcomeIndex) =>
          spellRelevantEffectProtectionOutcomePath(
            protectionPath,
            PositiveInteger(outcomeIndex + 1),
          ),
        ),
      ]),
      Match.exhaustive,
    );
  });
}

function specialFunctionPaths(
  effectPath: SpellMechanicsBranchPath,
  ward: CreatureTypeWard,
): readonly [SpellMechanicsBranchPath, ...SpellMechanicsBranchPath[]] {
  const paths = ward.specialFunctions.flatMap((specialFunction, index) => {
    const ordinal = PositiveInteger(index + 1);
    return Match.value(specialFunction).pipe(
      Match.when({ kind: "end_source_scoped_relevant_effects" }, () => [
        spellOngoingSpecialFunctionPath(effectPath, ordinal),
        spellOngoingSpecialFunctionTargetPath(effectPath, ordinal),
        spellOngoingSpecialFunctionResultPath(effectPath, ordinal),
        spellOngoingSpecialFunctionSpellEndingPath(effectPath, ordinal),
      ]),
      Match.when({ kind: "dismiss_creature_to_home_plane" }, () => [
        spellOngoingSpecialFunctionPath(effectPath, ordinal),
        spellOngoingSpecialFunctionTargetPath(effectPath, ordinal),
        spellOngoingSpecialFunctionResolutionPath(effectPath, ordinal),
        spellOngoingSpecialFunctionResultPath(effectPath, ordinal),
        spellOngoingSpecialFunctionSpellEndingPath(effectPath, ordinal),
      ]),
      Match.exhaustive,
    );
  });
  const [first, ...rest] = paths;
  return [first, ...rest];
}

function semanticCandidate(mechanics: SpellMechanics): boolean {
  return (
    (mechanics.family === "activation" &&
      mechanics.phases.some(
        (phase) =>
          phase.kind === "direct" &&
          (phase.effects ?? []).some(
            (effect) => effect.kind === "creature_type_protection",
          ),
      )) ||
    (mechanics.family === "ongoing_effect" &&
      mechanics.operations.some(
        (operation) => operation.effect.kind === "creature_type_ward",
      ))
  );
}

function unsupported(
  issues: readonly MechanicsIssue[],
): Inspection | undefined {
  const nonEmpty = spellProcedureNonEmpty(spellUniqueMechanicsIssues(issues));
  if (nonEmpty === undefined) return undefined;
  const [first, ...rest] = nonEmpty;
  return {
    tag: "unsupported",
    issues: [issueResult(first), ...rest.map(issueResult)],
  };
}

function inspectActivation(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): Inspection {
  const phaseIndex = mechanics.phases.findIndex(
    (phase) =>
      phase.kind === "direct" &&
      (phase.effects ?? []).some(
        (effect) => effect.kind === "creature_type_protection",
      ),
  );
  const inspectedPhaseIndex = phaseIndex < 0 ? 0 : phaseIndex;
  const phaseOrdinal = PositiveInteger(inspectedPhaseIndex + 1);
  const candidatePhase = mechanics.phases[inspectedPhaseIndex];
  const phase = candidatePhase?.kind === "direct" ? candidatePhase : undefined;
  const effects = phase?.effects ?? [];
  const effectIndex = effects.findIndex(
    (effect) => effect.kind === "creature_type_protection",
  );
  const effect = effects[effectIndex];
  const issues: MechanicsIssue[] = [];
  const push = (
    failedFact: FailedFact,
    mechanicsPath: SpellMechanicsBranchPath,
  ) => issues.push({ failedFact, mechanicsPath });

  if (mechanics.castingTime.kind !== "action")
    push("castingTime", spellMechanicsHeaderPath("castingTime"));
  if (mechanics.range.kind !== "touch")
    push("range", spellMechanicsHeaderPath("range"));
  if (!isProtectionDuration(mechanics.duration))
    push("duration", spellMechanicsHeaderPath("duration"));
  if (mechanics.phases.length !== 1) {
    if (mechanics.phases.length === 0)
      push("phaseCount", spellActivationPhasePath(PositiveInteger(1)));
    mechanics.phases.forEach((_phase, index) => {
      if (index !== inspectedPhaseIndex)
        push(
          "phaseCount",
          spellActivationPhasePath(PositiveInteger(index + 1)),
        );
    });
  }
  if (phaseIndex < 0 || phase === undefined)
    push("phase", spellActivationPhasePath(phaseOrdinal));
  const selection =
    phase?.attachment.kind === "hole" &&
    phase.attachment.value.kind === "target"
      ? phase.attachment.value.selection
      : undefined;
  if (selection === undefined)
    push("attachment", spellActivationAttachmentPath(phaseOrdinal));
  else if (
    selection.mode !== "one" ||
    !("disposition" in selection) ||
    selection.disposition !== "willing" ||
    selection.targetKinds?.length !== 1 ||
    selection.targetKinds[0] !== "creature" ||
    !spellMechanicsObjectHasOnlyKeys(selection, [
      "mode",
      "disposition",
      "targetKinds",
    ])
  )
    push("targetSelection", spellActivationAttachmentPath(phaseOrdinal));
  if (effects.length !== 1) {
    if (effects.length === 0)
      push(
        "effectCount",
        spellActivationEffectPath(phaseOrdinal, PositiveInteger(1)),
      );
    effects.forEach((_candidate, index) => {
      if (index !== effectIndex)
        push(
          "effectCount",
          spellActivationEffectPath(phaseOrdinal, PositiveInteger(index + 1)),
        );
    });
  }
  if (effect?.kind !== "creature_type_protection")
    push("effect", spellActivationEffectPath(phaseOrdinal, PositiveInteger(1)));

  const rejection = unsupported(issues);
  if (rejection !== undefined) return rejection;
  if (
    effect?.kind !== "creature_type_protection" ||
    !isProtectionDuration(mechanics.duration)
  )
    return { tag: "notRepresented" };
  const effectPath = spellActivationEffectPath(
    phaseOrdinal,
    PositiveInteger(effectIndex + 1),
  );
  const facts = {
    kind: "targetedActivation",
    level: mechanics.level,
    duration: mechanics.duration,
    policy: policy(effect),
  } satisfies ProtectionFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "creatureTypeProtection",
      facts,
      evidence: {
        consumed: [
          ...COMMON_PATHS,
          ...spellDurationEvidencePaths(mechanics.duration),
          ...spellConsumedMaterialEvidencePaths(mechanics.components),
          spellActivationPhasePath(phaseOrdinal),
          spellActivationAttachmentPath(phaseOrdinal),
          effectPath,
          ...protectionPaths(effectPath, effect),
        ],
        unowned: [],
      },
      admit: (source, context) => admit(source, context, facts),
    },
  };
}

function inspectOngoing(
  mechanics: Extract<SpellMechanics, { readonly family: "ongoing_effect" }>,
): Inspection {
  const operationIndex = mechanics.operations.findIndex(
    (operation) => operation.effect.kind === "creature_type_ward",
  );
  const inspectedOperationIndex = operationIndex < 0 ? 0 : operationIndex;
  const ordinal = PositiveInteger(inspectedOperationIndex + 1);
  const operation = mechanics.operations[inspectedOperationIndex];
  const effect = operation?.effect;
  const issues: MechanicsIssue[] = [];
  const push = (
    failedFact: FailedFact,
    mechanicsPath: SpellMechanicsBranchPath,
  ) => issues.push({ failedFact, mechanicsPath });

  if (mechanics.castingTime.kind !== "action")
    push("castingTime", spellMechanicsHeaderPath("castingTime"));
  if (mechanics.range.kind !== "self")
    push("range", spellMechanicsHeaderPath("range"));
  if (!isProtectionDuration(mechanics.duration))
    push("duration", spellMechanicsHeaderPath("duration"));
  if (mechanics.attachment.kind !== "self")
    push("attachment", spellOngoingAttachmentPath());
  if (mechanics.operations.length !== 1) {
    if (mechanics.operations.length === 0)
      push("operationCount", spellOngoingOperationPath(PositiveInteger(1)));
    mechanics.operations.forEach((_candidate, index) => {
      if (index !== inspectedOperationIndex)
        push(
          "operationCount",
          spellOngoingOperationPath(PositiveInteger(index + 1)),
        );
    });
  }
  if (
    operation === undefined ||
    operation.trigger.kind !== "passive" ||
    operation.predicate !== undefined ||
    operation.targetLimit !== undefined ||
    operation.usageLimit !== undefined ||
    !spellMechanicsObjectHasOnlyKeys(operation, ["trigger", "effect"])
  )
    push("operation", spellOngoingOperationPath(ordinal));
  if (effect?.kind !== "creature_type_ward")
    push("effect", spellOngoingOperationEffectPath(ordinal));

  const rejection = unsupported(issues);
  if (rejection !== undefined) return rejection;
  if (
    effect?.kind !== "creature_type_ward" ||
    !isProtectionDuration(mechanics.duration)
  )
    return { tag: "notRepresented" };
  const effectPath = spellOngoingOperationEffectPath(ordinal);
  const facts = {
    kind: "selfOngoingWard",
    level: mechanics.level,
    duration: mechanics.duration,
    policy: policy(effect),
  } satisfies ProtectionFacts;
  const evidence = {
    consumed: [
      ...COMMON_PATHS,
      ...spellDurationEvidencePaths(mechanics.duration),
      ...spellConsumedMaterialEvidencePaths(mechanics.components),
      spellOngoingAttachmentPath(),
      spellOngoingOperationPath(ordinal),
      effectPath,
      ...protectionPaths(effectPath, effect),
    ],
    unowned: specialFunctionPaths(effectPath, effect),
  } satisfies SpellProcedureMechanicsEvidence;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "creatureTypeProtection",
      facts,
      evidence,
      admit: (source, context) => admit(source, context, facts),
    },
  };
}

function admitMechanics(source: SpellMechanicsAdmissionSource): Inspection {
  if (!semanticCandidate(source.mechanics)) return { tag: "notRepresented" };
  if (source.mechanics.family === "activation")
    return inspectActivation(source.mechanics);
  if (source.mechanics.family === "ongoing_effect")
    return inspectOngoing(source.mechanics);
  return { tag: "notRepresented" };
}

function admit(
  spell: BattleSpellExecutionSource,
  context: SpellAdmissionContext,
  facts: ProtectionFacts,
): readonly CreatureTypeProtectionSpellInvocation[] {
  return context.spellCastOptions.flatMap(
    (option): readonly CreatureTypeProtectionSpellInvocation[] =>
      Number(option.spellLevel) < facts.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(option),
              procedure: "creatureTypeProtection",
              spell,
              actionCost: "magicAction",
              targeting:
                facts.kind === "targetedActivation"
                  ? {
                      kind: "targetList",
                      minTargets: 1,
                      maxTargets: 1,
                      requiredTargetDisposition: "willing",
                    }
                  : { kind: "self" },
              activeEffect: {
                kind: "creatureTypeProtection",
                sourceCombatantId: context.actor.combatantId,
                ...facts.policy,
                expiresAt: {
                  kind: "concentration",
                  combatantId: context.actor.combatantId,
                },
              },
              rangeFeet:
                facts.kind === "targetedActivation"
                  ? movementFeet(5)
                  : movementFeet(0),
            },
          ],
  );
}

function discoverCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<CreatureTypeProtectionSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  if (invocation.targeting.kind === "self")
    return [
      actionSpellCastCandidate(actorId, invocation.sourceProcedureRef, []),
    ];
  return actionSpellCastCandidatesForTargetHole(
    actorId,
    invocation.sourceProcedureRef,
    spellTargetHole(state, actorId, invocation),
  );
}

function resolve(
  input: SpellProcedureProfileResolveInput<CreatureTypeProtectionSpellInvocation>,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Defensive rejection of fills outside the discovered spell-cast hole contract. */
  if (!fillsBelongToSpellCastHoles(input.input.fills, [ATTACK_TARGET_HOLE_ID]))
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Creature-type protection spells use one target fill.",
    );
  /* v8 ignore stop -- @preserve */
  const selected = spellSelectionResolution(
    input.input.state,
    input.input.subject,
    targetSelection(input),
  );
  if (selected.tag === "resolution") return selected.result;
  return resolveSpellActiveEffectCast({
    resolution: input,
    targetIds: selected.selection.targetIds,
    castingResource: { kind: "magicAction" },
    applyEffect: (state) =>
      applyEffect(
        state,
        input.actorId,
        selected.selection.targetIds,
        input.invocation,
      ),
  });
}

function targetSelection(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation<CreatureTypeProtectionSpellInvocation>;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): SpellSingleTargetSelection {
  if (input.invocation.targeting.kind === "self")
    return input.fillSet.targetId !== undefined ||
      input.fillSet.targetList !== undefined ||
      input.fillSet.targetSpatialFacts.length > 0
      ? {
          tag: "invalid",
          message:
            "Self creature-type protection spells do not accept target fills.",
        }
      : { tag: "ok", targetIds: [input.actorId] };
  return spellSingleTargetSelection({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
    targetListMessage:
      "Creature-type protection spells require one target choice.",
    invalidTargetMessage:
      "Creature-type protection spell target must be a combatant within the selected spell's supported range.",
  });
}

function applyEffect(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: BattleExecutableSpellInvocation<CreatureTypeProtectionSpellInvocation>,
): BattleState {
  return targetIds.reduce(
    (nextState, targetId) =>
      replaceTargetActiveEffect(
        nextState,
        targetId,
        (effect) =>
          effect.kind === "creatureTypeProtection" &&
          effect.sourceProcedureRef === invocation.sourceProcedureRef &&
          effect.sourceCombatantId === actorId,
        {
          ...invocation.activeEffect,
          sourceProcedureRef: invocation.sourceProcedureRef,
          sourceCombatantId: actorId,
        },
      ),
    state,
  );
}

const InvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    procedure: Schema.Literal("creatureTypeProtection"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("magicAction"),
    targeting: Schema.Union([
      Schema.Struct({ kind: Schema.Literal("self") }),
      Schema.Struct({
        kind: Schema.Literal("targetList"),
        minTargets: Schema.Literal(1),
        maxTargets: Schema.Literal(1),
        requiredTargetDisposition: Schema.Literal("willing"),
      }),
    ]),
    activeEffect: CreatureTypeProtectionTemplateSchema,
    rangeFeet: MovementFeet,
  }),
);

export const creatureTypeProtectionProfile: SpellProcedureDeclaration<
  "creatureTypeProtection",
  CreatureTypeProtectionSpellInvocation,
  ProtectionFacts,
  ReturnType<typeof issueResult>
> = {
  procedure: "creatureTypeProtection",
  executionSchema: InvocationSchema,
  admitMechanics,
  discoverCastAct,
  resolve,
};
