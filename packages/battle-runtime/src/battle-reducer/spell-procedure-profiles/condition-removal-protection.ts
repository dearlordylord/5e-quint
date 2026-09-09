import { resolveSpellActiveEffectCast } from "../spell-active-effect-resolution.ts";
import { actionSpellCastCandidatesForTargetHole } from "../spell-cast-candidate.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-condition-removal-protection
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CONDITION_REMOVAL_AND_PROTECTION
//
// The conditionRemovalProtection Spell Procedure Profile: a prepared action
// spell that removes Poisoned from one touched creature, then grants Poisoned
// Saving Throw Advantage and Poison damage Resistance.

import { PositiveInteger, type ReadonlyNonEmptyArray } from "@dnd/shared/types";
import type { ElapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import type { SpellMechanics, EffectAtom } from "@dnd/surface/surface/types";

import {
  type BattleSpellExecutionSource,
  type ActionSpellBattleResolutionInput,
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import type { SpellDefinitionRuleFacts } from "../../procedure-execution/spell-rule-facts.ts";
import { CombatantId } from "../../identity.ts";
import { BattleActiveEffectExpirationSchema } from "../../active-effect/codecs.ts";
import { allocateBattleEffectOccurrencesForCreature } from "../../effect-execution-ref.ts";

import { spellSelectionResolution } from "../needs-holes-result.ts";
import { invalidResult } from "../result-helpers.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { ATTACK_TARGET_HOLE_ID } from "../battle-runtime-protocol.ts";
import { battleCreatureAfterConditionRemoval } from "../spell-condition-effects-helpers.ts";
import { sameStringSet } from "../spells-execution-facts.ts";
import { creatureTargetSelection } from "../spells-profiles-support.ts";
import { spellTargetHole } from "../spells-holes-fills.ts";
import {
  spellSingleTargetSelection,
  type SpellSingleTargetSelection,
} from "../spells-resolve-target-selection.ts";
import type { SpellFillSet } from "../spells-resolve-fill-set.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { spellInvocationResourceForCastOption } from "./profile.ts";
import {
  admitSpellTargetAttachment,
  isSpellCanonicalDurationValue,
  spellDurationChildCoordinates,
  spellDurationChildPath,
  spellDurationTicksFromCanonicalValue,
  combineSpellProcedureValidations,
  spellProcedureNonEmpty,
  spellTouchRangeFeet,
  spellConsumedMaterialEvidencePaths,
  type SpellCanonicalDurationValue,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsInspection,
  type SpellProcedureValidation,
} from "./spell-mechanics-admission.ts";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";

type ConditionRemovalProtectionSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "conditionRemovalProtection" }
>;
import { Match, Result, Schema } from "effect";
import { BattleEffectOccurrenceTemplateSchemaFields } from "../../active-effect/template-codec.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

const CONDITION_REMOVAL_PROTECTION_TARGET_SELECTION_FIELDS = [
  "mode",
  "targetKinds",
] as const;

type ConditionRemovalProtectionMechanicsFacts = SpellDefinitionRuleFacts & {
  readonly range: Extract<
    SpellDefinitionRuleFacts["range"],
    {
      readonly kind: "touch";
    }
  >;
  readonly duration: Extract<
    SpellDefinitionRuleFacts["duration"],
    { readonly kind: "timed" }
  > & { readonly value: SpellCanonicalDurationValue };
  readonly durationTicks: ElapsedTimeTicks;
  readonly protection: {
    readonly condition: "poisoned";
    readonly damageType: "poison";
  };
};

export const CONDITION_REMOVAL_PROTECTION_FAILED_FACTS = [
  "level",
  "castingTime",
  "range",
  "duration",
  "durationExtension",
  "durationEnding",
  "phaseCount",
  "attachment",
  "effects",
  "conditionRemoval",
  "conditionSaveRollMode",
  "damageResistance",
] as const;
type ConditionRemovalProtectionFailedFact =
  (typeof CONDITION_REMOVAL_PROTECTION_FAILED_FACTS)[number];

type ConditionRemovalProtectionIssue = {
  readonly failedFact: ConditionRemovalProtectionFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
};
type ConditionRemovalProtectionValidation<Value> = SpellProcedureValidation<
  Value,
  ConditionRemovalProtectionIssue
>;

type ConditionRemovalProtectionInspection = SpellProcedureMechanicsInspection<
  "conditionRemovalProtection",
  ConditionRemovalProtectionMechanicsFacts,
  ConditionRemovalProtectionSpellInvocation,
  ReturnType<typeof conditionRemovalProtectionIssueResult>
>;

function conditionRemovalProtectionIssue(
  failedFact: ConditionRemovalProtectionFailedFact,
  mechanicsPath: SpellMechanicsBranchPath,
): ConditionRemovalProtectionIssue {
  return { failedFact, mechanicsPath };
}

function conditionRemovalProtectionIssueResult(
  issue: ConditionRemovalProtectionIssue,
) {
  return {
    tag: "spellProcedureAdmissionIssue" as const,
    procedure: "conditionRemovalProtection" as const,
    failedFact: issue.failedFact,
    mechanicsPath: issue.mechanicsPath,
    message: `Unsupported conditionRemovalProtection mechanics fact: ${issue.failedFact}.`,
  };
}

function conditionRemovalProtectionDurationIssues(
  duration: Extract<SpellMechanics["duration"], { readonly kind: "timed" }>,
): readonly ConditionRemovalProtectionIssue[] {
  const issues: ConditionRemovalProtectionIssue[] = [];
  for (const child of spellDurationChildCoordinates(duration)) {
    issues.push(
      conditionRemovalProtectionIssue(
        child.branch === "extension" ? "durationExtension" : "durationEnding",
        spellDurationChildPath(child),
      ),
    );
  }
  return issues;
}

type ConditionRemovalProtectionDuration =
  ConditionRemovalProtectionMechanicsFacts["duration"];

function isConditionRemovalProtectionDuration(
  duration: SpellDefinitionRuleFacts["duration"],
): duration is ConditionRemovalProtectionDuration {
  return (
    duration.kind === "timed" &&
    duration.value.unit === "hour" &&
    duration.value.amount === 1 &&
    isSpellCanonicalDurationValue(duration.value)
  );
}

type ConditionRemovalProtectionRange =
  ConditionRemovalProtectionMechanicsFacts["range"];

function isConditionRemovalProtectionRange(
  range: SpellDefinitionRuleFacts["range"],
): range is ConditionRemovalProtectionRange {
  return range.kind === "touch";
}

const CONDITION_REMOVAL_PROTECTION_EFFECT_ROLES = [
  "conditionRemoval",
  "conditionSaveRollMode",
  "damageResistance",
] as const;
type ConditionRemovalProtectionEffectRole =
  (typeof CONDITION_REMOVAL_PROTECTION_EFFECT_ROLES)[number];

type ConditionRemovalProtectionRoleEffect =
  | Extract<EffectAtom, { readonly kind: "remove_condition" }>
  | Extract<EffectAtom, { readonly kind: "modify_roll_advantage" }>
  | Extract<EffectAtom, { readonly kind: "grant_resistance" }>;

function conditionRemovalProtectionRoleEffect(
  effect: EffectAtom,
): ConditionRemovalProtectionRoleEffect | undefined {
  return effect.kind === "remove_condition" ||
    effect.kind === "modify_roll_advantage" ||
    effect.kind === "grant_resistance"
    ? effect
    : undefined;
}

function conditionRemovalProtectionEffectRole(
  effect: ConditionRemovalProtectionRoleEffect,
): ConditionRemovalProtectionEffectRole {
  return Match.value(effect).pipe(
    Match.when({ kind: "remove_condition" }, () => "conditionRemoval" as const),
    Match.when(
      { kind: "modify_roll_advantage" },
      () => "conditionSaveRollMode" as const,
    ),
    Match.when({ kind: "grant_resistance" }, () => "damageResistance" as const),
    Match.exhaustive,
  );
}

function conditionRemovalProtectionConditionValue(
  effect: Extract<EffectAtom, { readonly kind: "remove_condition" }>,
): "poisoned" | undefined {
  if (typeof effect.condition !== "string" || effect.condition !== "poisoned") {
    return undefined;
  }
  return effect.condition;
}

function conditionRemovalProtectionSaveRollConditionValue(
  effect: Extract<EffectAtom, { readonly kind: "modify_roll_advantage" }>,
): "poisoned" | undefined {
  const conditionFilter = effect.conditionFilter ?? [];
  const supported = [
    (effect.affects ?? "self_roll") === "self_roll",
    effect.mode === "advantage",
    sameStringSet(effect.on, ["saving_throw"]),
    sameStringSet(conditionFilter, ["poisoned"]),
    effect.skillFilter === undefined,
    effect.abilityFilter === undefined,
    effect.saveAbilityFilter === undefined,
    effect.saveSourceFilter === undefined,
    effect.contextRangeFeet === undefined,
    effect.spellSourceFilter === undefined,
    effect.attackerTypeFilter === undefined,
    effect.count === undefined,
    effect.expiresOn === undefined,
  ].every(Boolean);
  if (!supported) return undefined;
  const [condition] = conditionFilter;
  return condition === "poisoned" ? condition : undefined;
}

function conditionRemovalProtectionDamageTypeValue(
  effect: Extract<EffectAtom, { readonly kind: "grant_resistance" }>,
): "poison" | undefined {
  if (
    typeof effect.damageType !== "string" ||
    effect.damageType !== "poison" ||
    effect.sourceFilter !== undefined
  ) {
    return undefined;
  }
  return effect.damageType;
}

type ConditionRemovalProtectionRoleProjection =
  | {
      readonly tag: "valid";
      readonly protection: {
        readonly condition: "poisoned";
        readonly damageType: "poison";
      };
    }
  | {
      readonly tag: "invalid";
      readonly issues: ReadonlyNonEmptyArray<ConditionRemovalProtectionIssue>;
    };

type ConditionRemovalProtectionProjectedRole =
  | { readonly tag: "conditionRemoval"; readonly value: "poisoned" }
  | { readonly tag: "conditionSaveRollMode"; readonly value: "poisoned" }
  | { readonly tag: "damageResistance"; readonly value: "poison" }
  | {
      readonly tag: "invalid";
      readonly issue: ConditionRemovalProtectionIssue;
    };
type ConditionRemovalProtectionValidProjectedRole = Exclude<
  ConditionRemovalProtectionProjectedRole,
  { readonly tag: "invalid" }
>;

function conditionRemovalProtectionProjectedRole(
  effect: ConditionRemovalProtectionRoleEffect,
  ordinal: PositiveInteger,
): ConditionRemovalProtectionProjectedRole {
  const mechanicsPath = spellActivationEffectPath(PositiveInteger(1), ordinal);
  return Match.value(effect).pipe(
    Match.when({ kind: "remove_condition" }, (conditionRemoval) => {
      const value = conditionRemovalProtectionConditionValue(conditionRemoval);
      return value === undefined
        ? {
            tag: "invalid" as const,
            issue: conditionRemovalProtectionIssue(
              "conditionRemoval",
              mechanicsPath,
            ),
          }
        : { tag: "conditionRemoval" as const, value };
    }),
    Match.when({ kind: "modify_roll_advantage" }, (saveRollMode) => {
      const value =
        conditionRemovalProtectionSaveRollConditionValue(saveRollMode);
      return value === undefined
        ? {
            tag: "invalid" as const,
            issue: conditionRemovalProtectionIssue(
              "conditionSaveRollMode",
              mechanicsPath,
            ),
          }
        : { tag: "conditionSaveRollMode" as const, value };
    }),
    Match.when({ kind: "grant_resistance" }, (resistance) => {
      const value = conditionRemovalProtectionDamageTypeValue(resistance);
      return value === undefined
        ? {
            tag: "invalid" as const,
            issue: conditionRemovalProtectionIssue(
              "damageResistance",
              mechanicsPath,
            ),
          }
        : { tag: "damageResistance" as const, value };
    }),
    Match.exhaustive,
  );
}

function conditionRemovalProtectionMissingRoleIssues(
  seen: ReadonlySet<ConditionRemovalProtectionEffectRole>,
  effectCount: number,
): readonly ConditionRemovalProtectionIssue[] {
  return CONDITION_REMOVAL_PROTECTION_EFFECT_ROLES.filter(
    (role) => !seen.has(role),
  ).map((role, index) =>
    conditionRemovalProtectionIssue(
      role,
      spellActivationEffectPath(
        PositiveInteger(1),
        PositiveInteger(effectCount + index + 1),
      ),
    ),
  );
}

function conditionRemovalProtectionCompletedRoleProjection(
  issues: readonly ConditionRemovalProtectionIssue[],
  projectedRoles: readonly ConditionRemovalProtectionValidProjectedRole[],
  effectCount: number,
): ConditionRemovalProtectionRoleProjection {
  const nonEmpty = spellProcedureNonEmpty(issues);
  if (nonEmpty !== undefined) return { tag: "invalid", issues: nonEmpty };
  const missingPath = spellActivationEffectPath(
    PositiveInteger(1),
    PositiveInteger(effectCount + 1),
  );
  const conditionRemoval = projectedRoles.find(
    (
      role,
    ): role is Extract<
      ConditionRemovalProtectionValidProjectedRole,
      { readonly tag: "conditionRemoval" }
    > => role.tag === "conditionRemoval",
  );
  const saveRollMode = projectedRoles.find(
    (
      role,
    ): role is Extract<
      ConditionRemovalProtectionValidProjectedRole,
      { readonly tag: "conditionSaveRollMode" }
    > => role.tag === "conditionSaveRollMode",
  );
  const damageResistance = projectedRoles.find(
    (
      role,
    ): role is Extract<
      ConditionRemovalProtectionValidProjectedRole,
      { readonly tag: "damageResistance" }
    > => role.tag === "damageResistance",
  );
  const facts = combineSpellProcedureValidations(
    combineSpellProcedureValidations(
      conditionRemoval === undefined
        ? Result.fail([
            conditionRemovalProtectionIssue("conditionRemoval", missingPath),
          ])
        : Result.succeed({ conditionRemoval: conditionRemoval.value }),
      saveRollMode === undefined
        ? Result.fail([
            conditionRemovalProtectionIssue(
              "conditionSaveRollMode",
              missingPath,
            ),
          ])
        : Result.succeed({ conditionSaveRollMode: saveRollMode.value }),
    ),
    damageResistance === undefined
      ? Result.fail([
          conditionRemovalProtectionIssue("damageResistance", missingPath),
        ])
      : Result.succeed({ damageResistance: damageResistance.value }),
  );
  return Result.match(facts, {
    onFailure: (projectionIssues) => ({
      tag: "invalid" as const,
      issues: projectionIssues,
    }),
    onSuccess: (values) => ({
      tag: "valid" as const,
      protection: {
        condition: values.conditionRemoval,
        damageType: values.damageResistance,
      },
    }),
  });
}

function conditionRemovalProtectionRoleProjection(
  effects: readonly EffectAtom[],
): ConditionRemovalProtectionRoleProjection {
  const issues: ConditionRemovalProtectionIssue[] = [];
  const seen = new Set<ConditionRemovalProtectionEffectRole>();
  const projectedRoles: ConditionRemovalProtectionValidProjectedRole[] = [];
  for (const [index, effect] of effects.entries()) {
    const ordinal = PositiveInteger(index + 1);
    const roleEffect = conditionRemovalProtectionRoleEffect(effect);
    if (roleEffect === undefined) {
      issues.push(
        conditionRemovalProtectionIssue(
          "effects",
          spellActivationEffectPath(PositiveInteger(1), ordinal),
        ),
      );
      continue;
    }
    const role = conditionRemovalProtectionEffectRole(roleEffect);
    if (seen.has(role)) {
      issues.push(
        conditionRemovalProtectionIssue(
          role,
          spellActivationEffectPath(PositiveInteger(1), ordinal),
        ),
      );
      continue;
    }
    seen.add(role);
    const projected = conditionRemovalProtectionProjectedRole(
      roleEffect,
      ordinal,
    );
    if (projected.tag === "invalid") {
      issues.push(projected.issue);
    } else {
      projectedRoles.push(projected);
    }
  }
  issues.push(
    ...conditionRemovalProtectionMissingRoleIssues(seen, effects.length),
  );
  return conditionRemovalProtectionCompletedRoleProjection(
    issues,
    projectedRoles,
    effects.length,
  );
}

type ConditionRemovalProtectionActivation = Extract<
  SpellMechanics,
  { readonly family: "activation" }
>;
type ConditionRemovalProtectionPhase = Extract<
  ConditionRemovalProtectionActivation["phases"][number],
  { readonly kind: "direct" }
>;
type ConditionRemovalProtectionComposite = Extract<
  NonNullable<ConditionRemovalProtectionPhase["effects"]>[number],
  { readonly kind: "composite" }
>;
type ConditionRemovalProtectionCandidate = {
  readonly mechanics: ConditionRemovalProtectionActivation;
  readonly phase: ConditionRemovalProtectionPhase;
  readonly composite: ConditionRemovalProtectionComposite;
};

function conditionRemovalProtectionCandidate(
  mechanics: SpellMechanics,
): ConditionRemovalProtectionCandidate | null {
  if (mechanics.family !== "activation") return null;
  const phase = mechanics.phases[0];
  if (phase?.kind !== "direct") return null;
  const composite = phase.effects?.[0];
  if (composite?.kind !== "composite") return null;
  const represented = composite.effects.some(
    (effect) =>
      effect.kind === "remove_condition" ||
      effect.kind === "modify_roll_advantage" ||
      effect.kind === "grant_resistance",
  );
  return represented ? { mechanics, phase, composite } : null;
}

function conditionRemovalProtectionIssueValidation(
  issues: readonly ConditionRemovalProtectionIssue[],
): ConditionRemovalProtectionValidation<Record<never, never>> {
  const nonEmpty = spellProcedureNonEmpty(issues);
  return nonEmpty === undefined ? Result.succeed({}) : Result.fail(nonEmpty);
}

function conditionRemovalProtectionHeaderIssues(
  mechanics: ConditionRemovalProtectionActivation,
): readonly ConditionRemovalProtectionIssue[] {
  return [
    ...(mechanics.level === 2
      ? []
      : [
          conditionRemovalProtectionIssue(
            "level",
            spellMechanicsHeaderPath("level"),
          ),
        ]),
    ...(mechanics.castingTime.kind === "action"
      ? []
      : [
          conditionRemovalProtectionIssue(
            "castingTime",
            spellMechanicsHeaderPath("castingTime"),
          ),
        ]),
  ];
}

function conditionRemovalProtectionRangeValidation(
  mechanics: ConditionRemovalProtectionActivation,
): ConditionRemovalProtectionValidation<{
  readonly range: ConditionRemovalProtectionRange;
}> {
  return isConditionRemovalProtectionRange(mechanics.range)
    ? Result.succeed({ range: mechanics.range })
    : Result.fail([
        conditionRemovalProtectionIssue(
          "range",
          spellMechanicsHeaderPath("range"),
        ),
      ]);
}

function conditionRemovalProtectionDurationValidation(
  mechanics: ConditionRemovalProtectionActivation,
): ConditionRemovalProtectionValidation<{
  readonly duration: ConditionRemovalProtectionDuration;
}> {
  const childIssues =
    mechanics.duration.kind === "timed"
      ? conditionRemovalProtectionDurationIssues(mechanics.duration)
      : [];
  if (!isConditionRemovalProtectionDuration(mechanics.duration)) {
    return Result.fail([
      conditionRemovalProtectionIssue("duration", spellDurationValuePath()),
      ...childIssues,
    ]);
  }
  const nonEmptyChildIssues = spellProcedureNonEmpty(childIssues);
  return nonEmptyChildIssues === undefined
    ? Result.succeed({ duration: mechanics.duration })
    : Result.fail(nonEmptyChildIssues);
}

function conditionRemovalProtectionPhaseIssues(
  mechanics: ConditionRemovalProtectionActivation,
): readonly ConditionRemovalProtectionIssue[] {
  return mechanics.phases
    .slice(1)
    .map((_phase, index) =>
      conditionRemovalProtectionIssue(
        "phaseCount",
        spellActivationPhasePath(PositiveInteger(index + 2)),
      ),
    );
}

function conditionRemovalProtectionAttachmentIssues(
  phase: ConditionRemovalProtectionPhase,
): readonly ConditionRemovalProtectionIssue[] {
  const admission = admitSpellTargetAttachment(
    phase.attachment,
    CONDITION_REMOVAL_PROTECTION_TARGET_SELECTION_FIELDS,
  );
  if (admission.tag === "rejected") {
    return [
      conditionRemovalProtectionIssue(
        "attachment",
        spellActivationAttachmentPath(PositiveInteger(1)),
      ),
    ];
  }
  const selection = admission.attachment.value.selection;
  return selection.mode === "one" && creatureTargetSelection(selection)
    ? []
    : [
        conditionRemovalProtectionIssue(
          "attachment",
          spellActivationAttachmentPath(PositiveInteger(1)),
        ),
      ];
}

function conditionRemovalProtectionRoleValidation(
  effects: readonly EffectAtom[],
): ConditionRemovalProtectionValidation<{
  readonly protection: ConditionRemovalProtectionMechanicsFacts["protection"];
}> {
  const projection = conditionRemovalProtectionRoleProjection(effects);
  return Match.value(projection).pipe(
    Match.when({ tag: "invalid" }, ({ issues }) => Result.fail(issues)),
    Match.when({ tag: "valid" }, ({ protection }) =>
      Result.succeed({ protection }),
    ),
    Match.exhaustive,
  );
}

function conditionRemovalProtectionAdmissionProjection(input: {
  readonly header: ConditionRemovalProtectionValidation<Record<never, never>>;
  readonly range: ConditionRemovalProtectionValidation<{
    readonly range: ConditionRemovalProtectionRange;
  }>;
  readonly duration: ConditionRemovalProtectionValidation<{
    readonly duration: ConditionRemovalProtectionDuration;
  }>;
  readonly phase: ConditionRemovalProtectionValidation<Record<never, never>>;
  readonly attachment: ConditionRemovalProtectionValidation<
    Record<never, never>
  >;
  readonly roles: ConditionRemovalProtectionValidation<{
    readonly protection: ConditionRemovalProtectionMechanicsFacts["protection"];
  }>;
}): ConditionRemovalProtectionValidation<{
  readonly range: ConditionRemovalProtectionRange;
  readonly duration: ConditionRemovalProtectionDuration;
  readonly protection: ConditionRemovalProtectionMechanicsFacts["protection"];
}> {
  const throughDuration = combineSpellProcedureValidations(
    combineSpellProcedureValidations(input.header, input.range),
    input.duration,
  );
  const throughAttachment = combineSpellProcedureValidations(
    combineSpellProcedureValidations(throughDuration, input.phase),
    input.attachment,
  );
  return combineSpellProcedureValidations(throughAttachment, input.roles);
}

function admitConditionRemovalProtectionMechanics(
  source: SpellMechanicsAdmissionSource,
): ConditionRemovalProtectionInspection {
  const candidate = conditionRemovalProtectionCandidate(source.mechanics);
  if (candidate === null) return { tag: "notRepresented" };
  const { mechanics, phase, composite } = candidate;
  const projection = conditionRemovalProtectionAdmissionProjection({
    header: conditionRemovalProtectionIssueValidation(
      conditionRemovalProtectionHeaderIssues(mechanics),
    ),
    range: conditionRemovalProtectionRangeValidation(mechanics),
    duration: conditionRemovalProtectionDurationValidation(mechanics),
    phase: conditionRemovalProtectionIssueValidation(
      conditionRemovalProtectionPhaseIssues(mechanics),
    ),
    attachment: conditionRemovalProtectionIssueValidation(
      conditionRemovalProtectionAttachmentIssues(phase),
    ),
    roles: conditionRemovalProtectionRoleValidation(composite.effects),
  });
  return Result.match(projection, {
    onFailure: (issues) => ({
      tag: "unsupported" as const,
      issues: [
        conditionRemovalProtectionIssueResult(issues[0]),
        ...issues.slice(1).map(conditionRemovalProtectionIssueResult),
      ],
    }),
    onSuccess: (value) => {
      const facts = {
        ...source.spellDefinitionRuleFacts,
        ...value,
        durationTicks: spellDurationTicksFromCanonicalValue(
          value.duration.value,
        ),
      } satisfies ConditionRemovalProtectionMechanicsFacts;
      return {
        tag: "supported" as const,
        admitted: {
          binding: "ready" as const,
          procedure: "conditionRemovalProtection" as const,
          facts,
          evidence: conditionRemovalProtectionMechanicsEvidence(mechanics),
          admit: (
            executionSource: BattleSpellExecutionSource,
            ctx: SpellAdmissionContext,
          ) => admitConditionRemovalProtection(executionSource, ctx, facts),
        },
      };
    },
  });
}

function conditionRemovalProtectionMechanicsEvidence(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): SpellProcedureMechanicsEvidence {
  const consumed: [SpellMechanicsBranchPath, ...SpellMechanicsBranchPath[]] = [
    spellMechanicsHeaderPath("level"),
    spellMechanicsHeaderPath("school"),
    spellMechanicsHeaderPath("range"),
    spellMechanicsHeaderPath("components"),
    spellMechanicsHeaderPath("duration"),
    spellMechanicsHeaderPath("castingTime"),
    spellMechanicsHeaderPath("family"),
    spellDurationValuePath(),
    ...spellDurationChildCoordinates(mechanics.duration).map(
      spellDurationChildPath,
    ),
    spellActivationPhasePath(PositiveInteger(1)),
    spellActivationAttachmentPath(PositiveInteger(1)),
    spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
    spellActivationEffectPath(PositiveInteger(1), PositiveInteger(2)),
    spellActivationEffectPath(PositiveInteger(1), PositiveInteger(3)),
    ...spellConsumedMaterialEvidencePaths(mechanics.components),
  ];
  return { consumed, unowned: [] };
}

function admitConditionRemovalProtection(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: ConditionRemovalProtectionMechanicsFacts,
): readonly ConditionRemovalProtectionSpellInvocation[] {
  const expiresAt = {
    kind: "duration" as const,
    durationTicks: facts.durationTicks,
  };
  return ctx.spellCastOptions.flatMap(
    (slot): readonly ConditionRemovalProtectionSpellInvocation[] =>
      Number(slot.spellLevel) < facts.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              procedure: "conditionRemovalProtection",
              spell,
              actionCost: "magicAction",
              targeting: { kind: "targetList", minTargets: 1, maxTargets: 1 },
              protection: {
                conditionSaveRollMode: {
                  kind: "conditionSavingThrowRollMode",
                  sourceCombatantId: ctx.actor.combatantId,
                  condition: facts.protection.condition,
                  mode: "advantage",
                  expiresAt,
                },
                damageResistance: {
                  kind: "damageResistance",
                  sourceCombatantId: ctx.actor.combatantId,
                  damageType: facts.protection.damageType,
                  expiresAt,
                },
              },
              rangeFeet: spellTouchRangeFeet(),
            },
          ],
  );
}

function discoverConditionRemovalProtectionCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<ConditionRemovalProtectionSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  return actionSpellCastCandidatesForTargetHole(
    actorId,
    invocation.sourceProcedureRef,
    targetHole,
  );
}

function resolveConditionRemovalProtection(
  input: SpellProcedureProfileResolveInput<ConditionRemovalProtectionSpellInvocation>,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !fillsBelongToSpellCastHoles(input.input.fills, [ATTACK_TARGET_HOLE_ID])
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Condition-removal protection spells use one target fill.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const targetSelectionResolution = spellSelectionResolution(
    input.input.state,
    input.input.subject,
    conditionRemovalProtectionSpellTargetSelection(input),
  );
  if (targetSelectionResolution.tag === "resolution")
    return targetSelectionResolution.result;
  const targetSelection = targetSelectionResolution.selection;

  return resolveSpellActiveEffectCast({
    resolution: input,
    targetIds: targetSelection.targetIds,
    castingResource: { kind: "magicAction" },
    applyEffect: (state) =>
      applyConditionRemovalProtectionEffect(
        state,
        input.actorId,
        targetSelection.targetIds,
        input.invocation,
      ),
  });
}

function conditionRemovalProtectionSpellTargetSelection(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation<ConditionRemovalProtectionSpellInvocation>;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): SpellSingleTargetSelection {
  return spellSingleTargetSelection({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
    targetListMessage:
      "Condition-removal protection spells require one target choice.",
    invalidTargetMessage:
      "Condition-removal protection spell target must be a combatant within the selected spell's supported range.",
  });
}

function applyConditionRemovalProtectionEffect(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: BattleExecutableSpellInvocation<ConditionRemovalProtectionSpellInvocation>,
): BattleState {
  return targetIds.reduce((nextState, targetId) => {
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    const condition = invocation.protection.conditionSaveRollMode.condition;
    const cleansedTarget = battleCreatureAfterConditionRemoval(
      target,
      condition,
    );
    const allocation = allocateBattleEffectOccurrencesForCreature({
      owner: cleansedTarget,
      effects: [
        {
          ...invocation.protection.conditionSaveRollMode,
          sourceProcedureRef: invocation.sourceProcedureRef,
          sourceCombatantId: actorId,
        },
        {
          ...invocation.protection.damageResistance,
          sourceProcedureRef: invocation.sourceProcedureRef,
          sourceCombatantId: actorId,
        },
      ],
    });
    const activeEffects = [
      ...allocation.owner.activeEffects.filter(
        (effect) =>
          !(
            (effect.kind === "conditionSavingThrowRollMode" ||
              effect.kind === "damageResistance") &&
            effect.sourceProcedureRef === invocation.sourceProcedureRef &&
            effect.sourceCombatantId === actorId
          ),
      ),
      ...allocation.effects,
    ];
    return {
      ...nextState,
      combatants: new Map(nextState.combatants).set(targetId, {
        ...allocation.owner,
        activeEffects,
      }),
    };
  }, state);
}

const ConditionRemovalProtectionInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("conditionRemovalProtection"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("magicAction"),
      targeting: Schema.Struct({
        kind: Schema.Literal("targetList"),
        minTargets: Schema.Literal(1),
        maxTargets: Schema.Literal(1),
      }),
      protection: Schema.Struct({
        conditionSaveRollMode: Schema.Struct({
          ...BattleEffectOccurrenceTemplateSchemaFields,
          kind: Schema.Literal("conditionSavingThrowRollMode"),
          sourceCombatantId: CombatantId,
          condition: Schema.Literal("poisoned"),
          mode: Schema.Literal("advantage"),
          expiresAt: BattleActiveEffectExpirationSchema,
        }),
        damageResistance: Schema.Struct({
          ...BattleEffectOccurrenceTemplateSchemaFields,
          kind: Schema.Literal("damageResistance"),
          sourceCombatantId: CombatantId,
          damageType: Schema.Literal("poison"),
          expiresAt: BattleActiveEffectExpirationSchema,
        }),
      }),
      rangeFeet: MovementFeet,
    }),
  );
export const conditionRemovalProtectionProfile: SpellProcedureDeclaration<
  "conditionRemovalProtection",
  ConditionRemovalProtectionSpellInvocation
> = {
  procedure: "conditionRemovalProtection",
  executionSchema: ConditionRemovalProtectionInvocationSchema,
  admitMechanics: admitConditionRemovalProtectionMechanics,
  discoverCastAct: discoverConditionRemovalProtectionCastAct,
  resolve: resolveConditionRemovalProtection,
};
