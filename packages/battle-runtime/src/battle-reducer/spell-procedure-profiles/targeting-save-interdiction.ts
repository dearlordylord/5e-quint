import { spellCastCandidatesForTargetHole } from "../spell-cast-candidate.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-sanctuary-targeting-interdiction
// KERNEL-COVERAGE: runtime-owner BATTLE.SANCTUARY.TARGETING_INTERDICTION
//
// The targetingSaveInterdiction Spell Procedure Profile: a prepared Bonus
// Action spell that wards one creature, asks for a Wisdom Saving Throw when a
// direct attack roll or damaging spell targets that creature, and removes the
// ward when the warded creature makes an attack roll, casts a spell, or deals
// damage.
//
// RAW anchors:
//   - SRD 5.2.1 Spells "Sanctuary": Bonus Action, 30 feet, 1 minute; ward one
//     creature; direct attack-roll and damaging-spell targeting require a
//     Wisdom Saving Throw; failure chooses a new target or loses the attack or
//     spell; areas of effect are excluded; the spell ends when the warded
//     creature makes an attack roll, casts a spell, or deals damage.
//   - UBIQUITOUS_LANGUAGE.md: Bonus Action, Attack Roll, Saving Throw, Spell
//     Slot, Spell Invocation, Spell Effect, and Spell Save DC.

import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import type { ElapsedTimeTicks } from "@dnd/shared/elapsed-time";
import { movementFeet, PositiveInteger } from "@dnd/shared/types";
import type { Components, SpellMechanics } from "@dnd/surface/surface/types";
import { Result } from "effect";

import { DurationBattleActiveEffectExpirationSchema } from "../../active-effect/codecs.ts";
import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleSpellExecutionSource,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { CombatantId } from "../../identity.ts";

import { needsHolesResult } from "../needs-holes-result.ts";
import { invalidResult } from "../result-helpers.ts";
import {
  battleStateAfterTargetActionEarlyEndForActor,
  combatantWithTargetingSaveInterdiction,
} from "../targeting-save-interdiction.ts";
import { sameStringSet } from "../spells-execution-facts.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import {
  spellTargetIsLegal,
  spellTargetListHole,
} from "../spells-targeting.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import type { SpellDefinitionRuleFacts } from "../../procedure-execution/spell-rule-facts.ts";
import {
  admitSpellTargetAttachment,
  isSpellCanonicalDurationValue,
  spellMechanicsObjectHasOnlyKeys,
  spellConsumedMaterialEvidencePaths,
  spellDurationChildCoordinates,
  spellDurationChildPath,
  spellProcedureNonEmpty,
  spellUniqueMechanicsIssues,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureAdmissionIssue,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";
import {
  spellDurationEndingPath,
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  spellMechanicsRootPath,
  spellOngoingAttachmentPath,
  spellOngoingInitialPhasePath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
  spellOngoingAuthoredConditionalMechanicPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type { UnitMechanicsPath } from "@dnd/surface/surface/mechanics-graph-path";
import { Schema } from "effect";
import { BattleEffectOccurrenceTemplateSchemaFields } from "../../active-effect/template-codec.ts";
import {
  spellInvocationResourceForCastOption,
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  DcSourceSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

const TargetingSaveInterdictionTemplateSchema = Schema.Struct({
  ...BattleEffectOccurrenceTemplateSchemaFields,
  sourceCombatantId: CombatantId,
  kind: Schema.Literal("targetingSaveInterdiction"),
  save: Schema.Struct({
    ability: Schema.Literal("wis"),
    dc: DcSourceSchema,
  }),
  expiresAt: DurationBattleActiveEffectExpirationSchema,
});

type TargetingSaveInterdictionInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "targetingSaveInterdiction" }
>;
type TargetingSaveInterdictionResolveInput =
  SpellProcedureProfileResolveInput<TargetingSaveInterdictionInvocation>;

type TargetingSaveInterdictionMechanicsFacts = SpellDefinitionRuleFacts & {
  readonly durationTicks: ElapsedTimeTicks;
  readonly rangeFeet: ReturnType<typeof movementFeet>;
  readonly saveDc: TargetingSaveInterdictionInvocation["activeEffect"]["save"]["dc"];
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- This module-private tuple is the canonical source for TargetingSaveInterdictionFailedFact.
const TARGETING_SAVE_INTERDICTION_FAILED_FACTS = [
  "level",
  "school",
  "range",
  "components",
  "duration",
  "durationValue",
  "durationEnding",
  "castingTime",
  "attachment",
  "initialPhase",
  "authoredConditionalMechanics",
  "operationCount",
  "operation",
  "trigger",
  "effect",
  "saveGate",
] as const;
type TargetingSaveInterdictionFailedFact =
  (typeof TARGETING_SAVE_INTERDICTION_FAILED_FACTS)[number];
type TargetingSaveInterdictionMechanicsIssue = SpellProcedureAdmissionIssue<
  "targetingSaveInterdiction",
  TargetingSaveInterdictionFailedFact,
  UnitMechanicsPath
>;
type TargetingSaveInterdictionMechanicsInspection =
  SpellProcedureMechanicsInspection<
    "targetingSaveInterdiction",
    TargetingSaveInterdictionMechanicsFacts,
    TargetingSaveInterdictionInvocation,
    TargetingSaveInterdictionMechanicsIssue
  >;

const SANCTUARY_TARGET_SELECTION_FIELDS = ["mode", "targetKinds"] as const;
const SANCTUARY_EARLY_END_KINDS = [
  "target_makes_attack_roll",
  "target_casts_spell",
  "target_deals_damage",
] as const;
const SANCTUARY_ROOT_FIELDS = [
  "level",
  "school",
  "range",
  "components",
  "duration",
  "castingTime",
  "family",
  "attachment",
  "initialPhase",
  "operations",
  "authoredConditionalMechanics",
] as const;
const SANCTUARY_RANGE_FIELDS = ["kind", "feet"] as const;
const SANCTUARY_COMPONENT_FIELDS = [
  "v",
  "s",
  "m",
  "materialCostGp",
  "materialConsumed",
] as const;
const SANCTUARY_DURATION_FIELDS = [
  "kind",
  "value",
  "earlyEnd",
  "permanentAfter",
] as const;
const SANCTUARY_DURATION_VALUE_FIELDS = [
  "unit",
  "amount",
  "upcastTiers",
] as const;
const SANCTUARY_CASTING_TIME_FIELDS = ["kind", "trigger"] as const;
const SANCTUARY_OPERATION_FIELDS = [
  "trigger",
  "predicate",
  "targetLimit",
  "effect",
  "usageLimit",
] as const;
const SANCTUARY_TRIGGER_FIELDS = ["kind", "targeting", "excludes"] as const;
const SANCTUARY_SAVE_GATE_FIELDS = [
  "kind",
  "ability",
  "dc",
  "onFail",
  "onSuccess",
] as const;
const SANCTUARY_SAVE_GATE_DC_FIELDS = ["kind"] as const;
const SANCTUARY_SAVE_GATE_FAIL_FIELDS = ["kind", "subject"] as const;
const SANCTUARY_SAVE_GATE_SUCCESS_FIELDS = ["kind"] as const;

type GenericSpellComponents = Extract<
  Components,
  { readonly m: false | string }
>;

function isGenericSpellComponents(
  components: Components,
): components is GenericSpellComponents {
  return components.m === false || typeof components.m === "string";
}

function targetingSaveInterdictionMechanicsIssue(
  failedFact: TargetingSaveInterdictionFailedFact,
  mechanicsPath: UnitMechanicsPath,
): TargetingSaveInterdictionMechanicsIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "targetingSaveInterdiction",
    failedFact,
    mechanicsPath,
    message: `Unsupported targetingSaveInterdiction mechanics fact: ${failedFact}.`,
  };
}

function targetingSaveInterdictionMechanicsRepresentation(
  mechanics: SpellMechanics,
): mechanics is Extract<SpellMechanics, { readonly family: "ongoing_effect" }> {
  if (mechanics.family !== "ongoing_effect") return false;
  const hasDistinctiveHeaders =
    mechanics.level === 1 &&
    mechanics.school === "abjuration" &&
    mechanics.range.kind === "point" &&
    mechanics.range.feet === 30 &&
    mechanics.duration.kind === "timed" &&
    mechanics.duration.value.unit === "minute" &&
    mechanics.duration.value.amount === 1 &&
    mechanics.castingTime.kind === "bonus_action";
  return (
    hasDistinctiveHeaders ||
    mechanics.operations.some(
      (operation) => operation.trigger.kind === "on_attached_targeted",
    )
  );
}

function sanctuaryDurationValueSupported(
  duration: SpellMechanics["duration"],
): duration is Extract<
  SpellMechanics["duration"],
  { readonly kind: "timed" }
> & {
  readonly value: Extract<
    Extract<SpellMechanics["duration"], { readonly kind: "timed" }>["value"],
    { readonly unit: "minute"; readonly amount: 1 }
  >;
} {
  if (
    duration.kind !== "timed" ||
    !spellMechanicsObjectHasOnlyKeys(duration, SANCTUARY_DURATION_FIELDS) ||
    !spellMechanicsObjectHasOnlyKeys(
      duration.value,
      SANCTUARY_DURATION_VALUE_FIELDS,
    ) ||
    duration.value.unit !== "minute" ||
    duration.value.amount !== 1 ||
    !isSpellCanonicalDurationValue(duration.value)
  ) {
    return false;
  }
  return true;
}

type SanctuaryDurationEndingInspection = {
  readonly unsupportedOrdinals: readonly PositiveInteger[];
  readonly missingRequiredKind: boolean;
};

function sanctuaryDurationEndingInspection(
  duration: Extract<SpellMechanics["duration"], { readonly kind: "timed" }>,
): SanctuaryDurationEndingInspection {
  const actualEndings = duration.earlyEnd ?? [];
  const seenKinds = new Set<string>();
  const unsupportedOrdinals: PositiveInteger[] = [];
  for (const [index, ending] of actualEndings.entries()) {
    if (
      !SANCTUARY_EARLY_END_KINDS.some(
        (expectedKind) => expectedKind === ending.kind,
      ) ||
      seenKinds.has(ending.kind)
    ) {
      unsupportedOrdinals.push(PositiveInteger(index + 1));
    } else {
      seenKinds.add(ending.kind);
    }
  }
  return {
    unsupportedOrdinals,
    missingRequiredKind: SANCTUARY_EARLY_END_KINDS.some(
      (expectedKind) => !seenKinds.has(expectedKind),
    ),
  };
}

function admitTargetingSaveInterdictionMechanics(
  source: SpellMechanicsAdmissionSource,
): TargetingSaveInterdictionMechanicsInspection {
  if (!targetingSaveInterdictionMechanicsRepresentation(source.mechanics)) {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
  const operationIndex = mechanics.operations.findIndex(
    (operation) =>
      operation.trigger.kind === "on_attached_targeted" ||
      operation.effect.kind === "save_gate",
  );
  const operation = mechanics.operations[operationIndex];
  const duration = sanctuaryDurationValueSupported(mechanics.duration)
    ? mechanics.duration
    : undefined;
  const targetAttachment = admitSpellTargetAttachment(
    mechanics.attachment,
    SANCTUARY_TARGET_SELECTION_FIELDS,
  );
  const selection =
    targetAttachment.tag === "admitted"
      ? targetAttachment.attachment.value.selection
      : undefined;
  const attachmentSupported =
    targetAttachment.tag === "admitted" &&
    selection?.mode === "one" &&
    sameStringSet(selection?.targetKinds ?? [], ["creature"]);
  const saveGate =
    operation?.effect.kind === "save_gate" ? operation.effect : undefined;
  const issues: TargetingSaveInterdictionMechanicsIssue[] = [];
  const push = (
    failedFact: TargetingSaveInterdictionFailedFact,
    mechanicsPath: UnitMechanicsPath,
  ): void => {
    issues.push(
      targetingSaveInterdictionMechanicsIssue(failedFact, mechanicsPath),
    );
  };

  if (mechanics.level !== 1) {
    push("level", spellMechanicsHeaderPath("level"));
  }
  if (mechanics.school !== "abjuration") {
    push("school", spellMechanicsHeaderPath("school"));
  }
  if (!spellMechanicsObjectHasOnlyKeys(mechanics, SANCTUARY_ROOT_FIELDS)) {
    push("operation", spellMechanicsHeaderPath("family"));
  }
  if (
    mechanics.range.kind !== "point" ||
    mechanics.range.feet !== 30 ||
    !spellMechanicsObjectHasOnlyKeys(mechanics.range, SANCTUARY_RANGE_FIELDS)
  ) {
    push("range", spellMechanicsHeaderPath("range"));
  }
  let componentsSupported = false;
  if (
    isGenericSpellComponents(mechanics.components) &&
    typeof mechanics.components.m === "string"
  ) {
    const components = mechanics.components;
    componentsSupported =
      components.v === true &&
      components.s === true &&
      spellMechanicsObjectHasOnlyKeys<GenericSpellComponents>(
        components,
        SANCTUARY_COMPONENT_FIELDS,
      ) &&
      !("materialCostGp" in components) &&
      !("materialConsumed" in components);
  }
  if (!componentsSupported) {
    push("components", spellMechanicsHeaderPath("components"));
    for (const path of spellConsumedMaterialEvidencePaths(
      mechanics.components,
    )) {
      push("components", path);
    }
  }
  if (duration === undefined) {
    push("duration", spellMechanicsHeaderPath("duration"));
    if (mechanics.duration.kind === "timed") {
      if (
        mechanics.duration.value.unit !== "minute" ||
        mechanics.duration.value.amount !== 1 ||
        !isSpellCanonicalDurationValue(mechanics.duration.value)
      ) {
        push("durationValue", spellDurationValuePath());
      }
    } else {
      push("durationValue", spellDurationValuePath());
    }
  }
  if (mechanics.duration.kind === "timed") {
    const endingInspection = sanctuaryDurationEndingInspection(
      mechanics.duration,
    );
    for (const ordinal of endingInspection.unsupportedOrdinals) {
      push("durationEnding", spellDurationEndingPath(ordinal));
    }
    if (endingInspection.missingRequiredKind) {
      push("durationEnding", spellMechanicsHeaderPath("duration"));
    }
    if (mechanics.duration.permanentAfter !== undefined) {
      push(
        "durationEnding",
        spellDurationEndingPath(
          PositiveInteger((mechanics.duration.earlyEnd?.length ?? 0) + 1),
        ),
      );
    }
  }
  if (
    mechanics.castingTime.kind !== "bonus_action" ||
    mechanics.castingTime.trigger !== undefined ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.castingTime,
      SANCTUARY_CASTING_TIME_FIELDS,
    )
  ) {
    push("castingTime", spellMechanicsHeaderPath("castingTime"));
  }
  if (mechanics.attachment.kind !== "hole" || !attachmentSupported) {
    push("attachment", spellOngoingAttachmentPath());
  }
  if (mechanics.initialPhase !== undefined) {
    push("initialPhase", spellOngoingInitialPhasePath());
  }
  if (mechanics.authoredConditionalMechanics !== undefined) {
    for (const [index] of mechanics.authoredConditionalMechanics.entries()) {
      push(
        "authoredConditionalMechanics",
        spellOngoingAuthoredConditionalMechanicPath(PositiveInteger(index + 1)),
      );
    }
  }
  if (mechanics.operations.length !== 1 || operationIndex !== 0) {
    if (mechanics.operations.length === 0) {
      push("operationCount", spellMechanicsRootPath());
    }
    for (const [index] of mechanics.operations.entries()) {
      if (index === operationIndex) continue;
      push(
        "operationCount",
        spellOngoingOperationPath(PositiveInteger(index + 1)),
      );
    }
  }
  if (operation === undefined) {
    if (mechanics.operations.length === 0) {
      push("operation", spellMechanicsRootPath());
    } else {
      push("operation", spellOngoingOperationPath(PositiveInteger(1)));
      push("effect", spellOngoingOperationEffectPath(PositiveInteger(1)));
    }
  } else {
    if (
      !spellMechanicsObjectHasOnlyKeys(operation, SANCTUARY_OPERATION_FIELDS)
    ) {
      push(
        "operation",
        spellOngoingOperationPath(PositiveInteger(operationIndex + 1)),
      );
    }
    if (
      operation.trigger.kind !== "on_attached_targeted" ||
      operation.trigger.excludes !== "area_of_effect" ||
      !sameStringSet(operation.trigger.targeting, [
        "attack_roll",
        "damaging_spell",
      ]) ||
      !spellMechanicsObjectHasOnlyKeys(
        operation.trigger,
        SANCTUARY_TRIGGER_FIELDS,
      )
    ) {
      push(
        "trigger",
        spellOngoingOperationPath(PositiveInteger(operationIndex + 1)),
      );
    }
    if (saveGate === undefined) {
      push(
        "effect",
        spellOngoingOperationEffectPath(PositiveInteger(operationIndex + 1)),
      );
    } else if (
      saveGate.ability !== "wis" ||
      saveGate.dc.kind !== "caster_spell_save_dc" ||
      saveGate.onSuccess.kind !== "none" ||
      saveGate.onFail.kind !== "choose_new_target_or_lose" ||
      saveGate.onFail.subject !== "triggering_attack_or_spell" ||
      !spellMechanicsObjectHasOnlyKeys(saveGate, SANCTUARY_SAVE_GATE_FIELDS) ||
      !spellMechanicsObjectHasOnlyKeys(
        saveGate.dc,
        SANCTUARY_SAVE_GATE_DC_FIELDS,
      ) ||
      !spellMechanicsObjectHasOnlyKeys(
        saveGate.onFail,
        SANCTUARY_SAVE_GATE_FAIL_FIELDS,
      ) ||
      !spellMechanicsObjectHasOnlyKeys(
        saveGate.onSuccess,
        SANCTUARY_SAVE_GATE_SUCCESS_FIELDS,
      )
    ) {
      push(
        "saveGate",
        spellOngoingOperationEffectPath(PositiveInteger(operationIndex + 1)),
      );
    }
    if (
      operation.predicate !== undefined ||
      operation.targetLimit !== undefined ||
      operation.usageLimit !== undefined
    ) {
      push(
        "operation",
        spellOngoingOperationPath(PositiveInteger(operationIndex + 1)),
      );
    }
  }

  const nonEmpty = spellProcedureNonEmpty(spellUniqueMechanicsIssues(issues));
  if (nonEmpty !== undefined) {
    return { tag: "unsupported", issues: nonEmpty };
  }
  if (
    duration === undefined ||
    operation === undefined ||
    saveGate === undefined ||
    !attachmentSupported
  ) {
    return {
      tag: "unsupported",
      issues: [
        targetingSaveInterdictionMechanicsIssue(
          "effect",
          spellOngoingOperationEffectPath(PositiveInteger(1)),
        ),
      ],
    };
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(duration.value);
  if (Result.isFailure(durationTicks)) {
    return {
      tag: "unsupported",
      issues: [
        targetingSaveInterdictionMechanicsIssue(
          "durationValue",
          spellDurationValuePath(),
        ),
      ],
    };
  }
  const facts = {
    ...source.spellDefinitionRuleFacts,
    durationTicks: durationTicks.success,
    rangeFeet: movementFeet(30),
    saveDc: saveGate.dc,
  } satisfies TargetingSaveInterdictionMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "targetingSaveInterdiction",
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
          ...spellDurationChildCoordinates(duration).map(
            spellDurationChildPath,
          ),
          spellOngoingAttachmentPath(),
          spellOngoingOperationPath(PositiveInteger(1)),
          spellOngoingOperationEffectPath(PositiveInteger(1)),
          ...spellConsumedMaterialEvidencePaths(mechanics.components),
        ],
        unowned: [],
      },
      admit: (executionSource, ctx) =>
        admitTargetingSaveInterdiction(executionSource, ctx, facts),
    },
  };
}

function admitTargetingSaveInterdiction(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: TargetingSaveInterdictionMechanicsFacts,
): readonly TargetingSaveInterdictionInvocation[] {
  return ctx.spellCastOptions.flatMap(
    (slot): readonly TargetingSaveInterdictionInvocation[] =>
      Number(slot.spellLevel) < facts.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              procedure: "targetingSaveInterdiction",
              spell,
              actionCost: "bonusAction",
              targeting: { kind: "targetList", minTargets: 1, maxTargets: 1 },
              activeEffect: {
                kind: "targetingSaveInterdiction",
                sourceCombatantId: ctx.actor.combatantId,
                save: { ability: "wis", dc: facts.saveDc },
                expiresAt: {
                  kind: "duration",
                  durationTicks: facts.durationTicks,
                },
              },
              rangeFeet: facts.rangeFeet,
            },
          ],
  );
}

function discoverTargetingSaveInterdictionCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<TargetingSaveInterdictionInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = spellTargetListHole(state, actorId, invocation);
  return spellCastCandidatesForTargetHole(
    "bonusActionSpell",
    actorId,
    invocation.sourceProcedureRef,
    targetHole,
  );
}

function resolveTargetingSaveInterdiction(
  input: TargetingSaveInterdictionResolveInput,
): BattleResolutionResult {
  const targetList = input.fillSet.targetList;
  if (targetList === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellTargetListHole(input.input.state, input.actorId, input.invocation),
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (targetList.targetIds.length !== 1) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "attack-redirection ward must target exactly one creature.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const targetId = targetList.targetIds[0]!;
  const spellCastState = battleStateAfterTargetActionEarlyEndForActor(
    input.input.state,
    input.actorId,
  );
  const target = spellCastState.combatants.get(targetId);
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    target === undefined ||
    !spellTargetIsLegal(
      spellCastState,
      input.actorId,
      targetId,
      input.invocation,
      targetList.spatialFacts,
    )
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "attack-redirection ward target must be a combatant within range.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const combatants = new Map(spellCastState.combatants).set(
    targetId,
    combatantWithTargetingSaveInterdiction(target, input.invocation),
  );
  return spendSpellCastResources({
    state: { ...spellCastState, combatants },
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
    skipTargetActionSpellCastEarlyEnd: true,
  });
}

const TargetingSaveInterdictionInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    procedure: Schema.Literal("targetingSaveInterdiction"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("bonusAction"),
    targeting: Schema.Struct({
      kind: Schema.Literal("targetList"),
      minTargets: Schema.Literal(1),
      maxTargets: Schema.Literal(1),
    }),
    activeEffect: TargetingSaveInterdictionTemplateSchema,
    rangeFeet: MovementFeet,
  }),
);
export const targetingSaveInterdictionProfile = {
  procedure: "targetingSaveInterdiction",
  executionSchema: TargetingSaveInterdictionInvocationSchema,
  admitMechanics: admitTargetingSaveInterdictionMechanics,
  discoverCastAct: discoverTargetingSaveInterdictionCastAct,
  resolve: resolveTargetingSaveInterdiction,
} satisfies SpellProcedureDeclaration<
  "targetingSaveInterdiction",
  TargetingSaveInterdictionInvocation
>;
