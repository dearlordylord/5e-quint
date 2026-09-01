import { resolveSpellActiveEffectCast } from "../spell-active-effect-resolution.ts";
import { actionSpellCastCandidatesForTargetHole } from "../spell-cast-candidate.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-condition-removal-protection
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CONDITION_REMOVAL_AND_PROTECTION
//
// The conditionRemovalProtection Spell Procedure Profile: a prepared action
// spell that removes Poisoned from one touched creature, then grants Poisoned
// Saving Throw Advantage and Poison damage Resistance.

import {
  PositiveInteger,
  type Condition,
  type DamageType,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
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
  spellProcedureNonEmpty,
  spellTouchRangeFeet,
  spellConsumedMaterialEvidencePaths,
  type SpellCanonicalDurationValue,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsInspection,
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
import { Match, Schema } from "effect";
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
    readonly condition: Condition;
    readonly damageType: DamageType;
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
  effect: EffectAtom,
): Condition | undefined {
  if (
    effect.kind !== "remove_condition" ||
    typeof effect.condition !== "string" ||
    effect.condition !== "poisoned"
  ) {
    return undefined;
  }
  return effect.condition;
}

function conditionRemovalProtectionSaveRollConditionValue(
  effect: EffectAtom,
): Condition | undefined {
  if (
    effect.kind !== "modify_roll_advantage" ||
    (effect.affects ?? "self_roll") !== "self_roll" ||
    effect.mode !== "advantage" ||
    !sameStringSet(effect.on, ["saving_throw"]) ||
    effect.conditionFilter === undefined ||
    !sameStringSet(effect.conditionFilter, ["poisoned"]) ||
    effect.skillFilter !== undefined ||
    effect.abilityFilter !== undefined ||
    effect.saveAbilityFilter !== undefined ||
    effect.saveSourceFilter !== undefined ||
    effect.contextRangeFeet !== undefined ||
    effect.spellSourceFilter !== undefined ||
    effect.attackerTypeFilter !== undefined ||
    effect.count !== undefined ||
    effect.expiresOn !== undefined
  ) {
    return undefined;
  }
  const [condition] = effect.conditionFilter;
  return condition === "poisoned" ? condition : undefined;
}

function conditionRemovalProtectionDamageTypeValue(
  effect: EffectAtom,
): DamageType | undefined {
  if (
    effect.kind !== "grant_resistance" ||
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
      readonly condition: Condition;
      readonly damageType: DamageType;
    }
  | {
      readonly tag: "invalid";
      readonly issues: ReadonlyNonEmptyArray<ConditionRemovalProtectionIssue>;
    };

function conditionRemovalProtectionRoleProjection(
  effects: readonly EffectAtom[],
): ConditionRemovalProtectionRoleProjection {
  const issues: ConditionRemovalProtectionIssue[] = [];
  const seen = new Set<ConditionRemovalProtectionEffectRole>();
  let condition: Condition | undefined;
  let damageType: DamageType | undefined;
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
    if (role === "conditionRemoval") {
      condition = conditionRemovalProtectionConditionValue(effect);
      if (condition === undefined) {
        issues.push(
          conditionRemovalProtectionIssue(
            "conditionRemoval",
            spellActivationEffectPath(PositiveInteger(1), ordinal),
          ),
        );
      }
    } else if (role === "conditionSaveRollMode") {
      const saveCondition =
        conditionRemovalProtectionSaveRollConditionValue(effect);
      if (saveCondition === undefined) {
        issues.push(
          conditionRemovalProtectionIssue(
            "conditionSaveRollMode",
            spellActivationEffectPath(PositiveInteger(1), ordinal),
          ),
        );
      } else {
        condition = saveCondition;
      }
    } else {
      damageType = conditionRemovalProtectionDamageTypeValue(effect);
      if (damageType === undefined) {
        issues.push(
          conditionRemovalProtectionIssue(
            "damageResistance",
            spellActivationEffectPath(PositiveInteger(1), ordinal),
          ),
        );
      }
    }
  }
  const missingRoles = CONDITION_REMOVAL_PROTECTION_EFFECT_ROLES.filter(
    (role) => !seen.has(role),
  );
  for (const [index, role] of missingRoles.entries()) {
    issues.push(
      conditionRemovalProtectionIssue(
        role,
        spellActivationEffectPath(
          PositiveInteger(1),
          PositiveInteger(effects.length + index + 1),
        ),
      ),
    );
  }
  const nonEmpty = spellProcedureNonEmpty(issues);
  if (nonEmpty !== undefined) {
    return { tag: "invalid", issues: nonEmpty };
  }
  if (condition !== undefined && damageType !== undefined) {
    return { tag: "valid", condition, damageType };
  }
  // Every missing projection contributes an issue above. This branch keeps
  // the return type honest if the role vocabulary changes without a matching
  // projection update.
  return {
    tag: "invalid",
    issues: [
      conditionRemovalProtectionIssue(
        "effects",
        spellActivationEffectPath(
          PositiveInteger(1),
          PositiveInteger(effects.length + 1),
        ),
      ),
    ],
  };
}

function isConditionRemovalProtectionRootShape(
  mechanics: SpellMechanics,
): mechanics is Extract<SpellMechanics, { readonly family: "activation" }> {
  if (mechanics.family !== "activation") return false;
  const phase = mechanics.phases[0];
  const outerEffect = phase?.kind === "direct" ? phase.effects?.[0] : undefined;
  if (outerEffect?.kind !== "composite") return false;
  return outerEffect.effects.some(
    (effect) =>
      effect.kind === "remove_condition" ||
      effect.kind === "modify_roll_advantage" ||
      effect.kind === "grant_resistance",
  );
}

function admitConditionRemovalProtectionMechanics(
  source: SpellMechanicsAdmissionSource,
): ConditionRemovalProtectionInspection {
  if (!isConditionRemovalProtectionRootShape(source.mechanics)) {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
  const phase = mechanics.phases[0];
  if (phase?.kind !== "direct") return { tag: "notRepresented" };
  const outerEffect = phase.effects?.[0];
  if (outerEffect?.kind !== "composite") return { tag: "notRepresented" };
  const effects = outerEffect.effects;
  const issues: ConditionRemovalProtectionIssue[] = [];
  const rangeFacts = isConditionRemovalProtectionRange(mechanics.range)
    ? mechanics.range
    : undefined;
  const durationFacts = isConditionRemovalProtectionDuration(mechanics.duration)
    ? mechanics.duration
    : undefined;
  if (mechanics.level !== 2) {
    issues.push(
      conditionRemovalProtectionIssue(
        "level",
        spellMechanicsHeaderPath("level"),
      ),
    );
  }
  if (mechanics.castingTime.kind !== "action") {
    issues.push(
      conditionRemovalProtectionIssue(
        "castingTime",
        spellMechanicsHeaderPath("castingTime"),
      ),
    );
  }
  if (!isConditionRemovalProtectionRange(mechanics.range)) {
    issues.push(
      conditionRemovalProtectionIssue(
        "range",
        spellMechanicsHeaderPath("range"),
      ),
    );
  }
  if (!isConditionRemovalProtectionDuration(mechanics.duration)) {
    issues.push(
      conditionRemovalProtectionIssue("duration", spellDurationValuePath()),
    );
  }
  if (mechanics.duration.kind === "timed") {
    issues.push(
      ...conditionRemovalProtectionDurationIssues(mechanics.duration),
    );
  }
  if (mechanics.phases.length !== 1) {
    for (const [index] of mechanics.phases.entries()) {
      if (index === 0) continue;
      issues.push(
        conditionRemovalProtectionIssue(
          "phaseCount",
          spellActivationPhasePath(PositiveInteger(index + 1)),
        ),
      );
    }
  }
  const targetAttachmentAdmission = admitSpellTargetAttachment(
    phase.attachment,
    CONDITION_REMOVAL_PROTECTION_TARGET_SELECTION_FIELDS,
  );
  const selection =
    targetAttachmentAdmission.tag === "admitted"
      ? targetAttachmentAdmission.attachment.value.selection
      : undefined;
  const validSelection =
    selection !== undefined &&
    selection.mode === "one" &&
    creatureTargetSelection(selection);
  if (targetAttachmentAdmission.tag === "rejected" || !validSelection) {
    issues.push(
      conditionRemovalProtectionIssue(
        "attachment",
        spellActivationAttachmentPath(PositiveInteger(1)),
      ),
    );
  }
  const roleProjection = conditionRemovalProtectionRoleProjection(effects);
  if (roleProjection.tag === "invalid") {
    const [firstRoleIssue, ...remainingRoleIssues] = roleProjection.issues;
    const otherIssues = spellProcedureNonEmpty(issues);
    if (otherIssues === undefined) {
      return {
        tag: "unsupported",
        issues: [
          conditionRemovalProtectionIssueResult(firstRoleIssue),
          ...remainingRoleIssues.map(conditionRemovalProtectionIssueResult),
        ],
      };
    }
    const [firstIssue, ...remainingIssues] = otherIssues;
    return {
      tag: "unsupported",
      issues: [
        conditionRemovalProtectionIssueResult(firstIssue),
        ...remainingIssues.map(conditionRemovalProtectionIssueResult),
        conditionRemovalProtectionIssueResult(firstRoleIssue),
        ...remainingRoleIssues.map(conditionRemovalProtectionIssueResult),
      ],
    };
  }
  const nonEmpty = spellProcedureNonEmpty(issues);
  if (nonEmpty !== undefined) {
    const [firstIssue, ...remainingIssues] = nonEmpty;
    return {
      tag: "unsupported",
      issues: [
        conditionRemovalProtectionIssueResult(firstIssue),
        ...remainingIssues.map(conditionRemovalProtectionIssueResult),
      ],
    };
  }
  if (rangeFacts === undefined) {
    return {
      tag: "unsupported",
      issues: [
        conditionRemovalProtectionIssueResult(
          conditionRemovalProtectionIssue(
            "range",
            spellMechanicsHeaderPath("range"),
          ),
        ),
      ],
    };
  }
  if (durationFacts === undefined) {
    return {
      tag: "unsupported",
      issues: [
        conditionRemovalProtectionIssueResult(
          conditionRemovalProtectionIssue("duration", spellDurationValuePath()),
        ),
      ],
    };
  }
  const facts = {
    ...source.spellDefinitionRuleFacts,
    range: rangeFacts,
    duration: durationFacts,
    durationTicks: spellDurationTicksFromCanonicalValue(durationFacts.value),
    protection: {
      condition: roleProjection.condition,
      damageType: roleProjection.damageType,
    },
  } satisfies ConditionRemovalProtectionMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "conditionRemovalProtection",
      facts,
      evidence: conditionRemovalProtectionMechanicsEvidence(mechanics),
      admit: (executionSource, ctx) =>
        admitConditionRemovalProtection(executionSource, ctx, facts),
    },
  };
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
