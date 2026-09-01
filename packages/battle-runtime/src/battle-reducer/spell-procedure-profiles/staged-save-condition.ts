import { optionalProperty } from "../../optional-property.ts";
import { discoverTargetSavingThrowSpellCastActs } from "../saving-throw-metamagic-holes.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-hideous-laughter-repeat-save-lifecycle
//
// The saveGatedConditionWithRepeat Spell Procedure Profile: action-time Spell Slot casting
// where target-list creatures make a Wisdom Saving Throw before failed-save
// targets receive Prone and Incapacitated spell effects with repeat Saving
// Throws at end of turn and on damage.
//
// RAW anchors:
//   - SRD 5.2.1 Spells: Hideous Laughter applies Prone and Incapacitated on a
//     failed Wisdom Saving Throw, prevents the target from ending Prone on
//     itself, repeats the save at end of target turn and on damage with
//     Advantage, and adds one target per Spell Slot level above 1.
//   - UBIQUITOUS_LANGUAGE.md: Saving Throw, Advantage, Condition, Prone,
//     Incapacitated, Magic Action, and Spell Invocation.

import { MovementFeet, PositiveInteger, movementFeet } from "@dnd/shared/types";
import {
  ElapsedTimeTicksSchema,
  type ElapsedTimeTicks,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import type {
  ActivationPhase,
  EffectAtom,
  SpellMechanics,
} from "@dnd/surface/surface/types";
import {
  battleSpellExecutionSourceFromAdmission,
  type BattleSpellAdmissionSource,
  type BattleSpellExecutionSource,
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { type CombatantId } from "../../identity.ts";
import { readiedSpellAct } from "../spells-discovery.ts";
import { resolveSaveGatedConditionWithRepeatSpellAct } from "../spells-resolve-save-gates.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { spellInvocationResourceForCastOption } from "./profile.ts";
import { Match, Schema } from "effect";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  DcSourceSchema,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import { spellTargetListHole } from "../spells-holes-fills.ts";
import type { SpellDefinitionRuleFacts } from "../../procedure-execution/spell-rule-facts.ts";
import {
  saveGateTargetCountFactsFromSelection,
  saveGatedConditionTargetingFromFacts,
  type SaveGateConditionTargetingFacts,
} from "./_save-gate-helpers.ts";
import {
  admitSpellTargetAttachment,
  isSpellCanonicalDurationValue,
  spellConsumedMaterialEvidencePaths,
  spellDurationChildCoordinates,
  spellDurationChildPath,
  spellDurationEvidencePaths,
  spellDurationTicksFromCanonicalValue,
  spellHasOnlyNamedFields,
  spellProcedureNonEmpty,
  spellUniqueMechanicsIssues,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureAdmissionIssue,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellActivationRepeatPath,
  spellMechanicsHeaderPath,
  spellDurationValuePath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";

type SaveGatedConditionWithRepeatSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "saveGatedConditionWithRepeat" }
>;

type SaveGatedConditionWithRepeatMechanicsFacts = SpellDefinitionRuleFacts & {
  readonly ability: "wis";
  readonly dc: SaveGatedConditionWithRepeatSpellInvocation["dc"];
  readonly targeting: Extract<
    SaveGateConditionTargetingFacts,
    { readonly kind: "targetList" }
  >;
  readonly rangeFeet: MovementFeet;
  readonly durationTicks: ElapsedTimeTicks;
};

type SaveGatedConditionWithRepeatResolveInput =
  SpellProcedureProfileResolveInput<SaveGatedConditionWithRepeatSpellInvocation>;

type SaveGatedConditionWithRepeatFailedFact =
  | "level"
  | "castingTime"
  | "range"
  | "duration"
  | "durationValue"
  | "durationExtension"
  | "durationEnding"
  | "rootShape"
  | "phaseCount"
  | "phaseOrder"
  | "phaseShape"
  | "phaseAbility"
  | "phaseDc"
  | "phaseAttachment"
  | "successOutcome"
  | "failedSaveEffect"
  | "extraFailureEffect"
  | "missingFailureEffect"
  | "repeatSave"
  | "missingRepeat"
  | "extraRepeat"
  | "requiredFacts";

type SaveGatedConditionWithRepeatMechanicsIssue = SpellProcedureAdmissionIssue<
  "saveGatedConditionWithRepeat",
  SaveGatedConditionWithRepeatFailedFact,
  SpellMechanicsBranchPath
>;

const SAVE_GATED_CONDITION_WITH_REPEAT_FAILED_FACT_MESSAGES = {
  level: "Hideous Laughter requires a first-level spell.",
  castingTime: "Hideous Laughter requires an action casting time.",
  range: "Hideous Laughter requires a 30-foot point range.",
  duration: "Hideous Laughter requires one minute of concentration.",
  durationValue: "Hideous Laughter requires a one-minute concentration value.",
  durationExtension: "Hideous Laughter has an unsupported duration extension.",
  durationEnding: "Hideous Laughter has an unsupported duration ending.",
  rootShape: "Hideous Laughter has unsupported activation root fields.",
  phaseCount: "Hideous Laughter requires exactly one activation phase.",
  phaseOrder: "Hideous Laughter's save gate must be the first phase.",
  phaseShape: "Hideous Laughter has an unsupported save-gate field.",
  phaseAbility: "Hideous Laughter requires a Wisdom Saving Throw.",
  phaseDc: "Hideous Laughter requires the caster's Spell Save DC.",
  phaseAttachment: "Hideous Laughter requires one creature target selection.",
  successOutcome: "Hideous Laughter requires no successful-save effect.",
  failedSaveEffect: "Hideous Laughter has an unsupported failed-save bundle.",
  extraFailureEffect:
    "Hideous Laughter has an unsupported additional failed-save effect.",
  missingFailureEffect:
    "Hideous Laughter is missing a required failed-save effect.",
  repeatSave: "Hideous Laughter has an unsupported repeat save.",
  missingRepeat: "Hideous Laughter is missing a required repeat save.",
  extraRepeat: "Hideous Laughter has an unsupported additional repeat save.",
  requiredFacts:
    "Hideous Laughter's admitted mechanics did not retain required facts.",
} as const satisfies Record<SaveGatedConditionWithRepeatFailedFact, string>;

function saveGatedConditionWithRepeatIssue(
  failedFact: SaveGatedConditionWithRepeatFailedFact,
  mechanicsPath: SpellMechanicsBranchPath,
): SaveGatedConditionWithRepeatMechanicsIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "saveGatedConditionWithRepeat",
    failedFact,
    mechanicsPath,
    message: SAVE_GATED_CONDITION_WITH_REPEAT_FAILED_FACT_MESSAGES[failedFact],
  };
}

type SaveGatePhase = Extract<ActivationPhase, { readonly kind: "save_gate" }>;

function hideousLaughterRootPhase(phase: ActivationPhase): boolean {
  return (
    phase.kind === "save_gate" &&
    phase.onFail.kind === "composite" &&
    phase.onFail.effects.some(
      (effect) =>
        effect.kind === "suppress_condition_self_end" &&
        effect.condition === "prone",
    )
  );
}

function isHideousLaughterDuration(
  duration: SpellMechanics["duration"],
): duration is Extract<
  SpellMechanics["duration"],
  { readonly kind: "concentration" }
> & {
  readonly upTo: Extract<
    SpellMechanics["duration"],
    { readonly kind: "concentration" }
  >["upTo"] & {
    readonly amount: PositiveInteger;
  };
} {
  return (
    duration.kind === "concentration" &&
    isSpellCanonicalDurationValue(duration.upTo) &&
    duration.upTo.unit === "minute" &&
    duration.upTo.amount === 1
  );
}

function hideousLaughterDurationIssues(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): SaveGatedConditionWithRepeatMechanicsIssue[] {
  const issues: SaveGatedConditionWithRepeatMechanicsIssue[] = [];
  const duration = mechanics.duration;
  if (duration.kind !== "concentration") {
    issues.push(
      saveGatedConditionWithRepeatIssue(
        "duration",
        spellMechanicsHeaderPath("duration"),
      ),
    );
    return issues;
  }
  if (
    !isHideousLaughterDuration(duration) ||
    !isSpellCanonicalDurationValue(duration.upTo) ||
    duration.upTo.unit !== "minute" ||
    duration.upTo.amount !== 1
  ) {
    issues.push(
      saveGatedConditionWithRepeatIssue(
        "durationValue",
        spellDurationValuePath(),
      ),
    );
  }
  for (const child of spellDurationChildCoordinates(duration)) {
    issues.push(
      saveGatedConditionWithRepeatIssue(
        child.branch === "extension" ? "durationExtension" : "durationEnding",
        spellDurationChildPath(child),
      ),
    );
  }
  return issues;
}

type HideousLaughterFailureRoleEffect =
  | Extract<EffectAtom, { readonly kind: "apply_condition" }>
  | Extract<EffectAtom, { readonly kind: "suppress_condition_self_end" }>;

function hideousLaughterFailureRoleEffect(
  effect: EffectAtom,
): HideousLaughterFailureRoleEffect | undefined {
  if (
    effect.kind === "apply_condition" &&
    effect.condition === "prone" &&
    spellHasOnlyNamedFields(effect, ["kind", "condition"])
  ) {
    return effect;
  }
  if (
    effect.kind === "apply_condition" &&
    effect.condition === "incapacitated" &&
    spellHasOnlyNamedFields(effect, ["kind", "condition"])
  ) {
    return effect;
  }
  if (
    effect.kind === "suppress_condition_self_end" &&
    effect.condition === "prone" &&
    spellHasOnlyNamedFields(effect, ["kind", "condition"])
  ) {
    return effect;
  }
  return undefined;
}

function hideousLaughterFailureRole(
  effect: EffectAtom,
): "prone" | "incapacitated" | "suppressProne" | null {
  const roleEffect = hideousLaughterFailureRoleEffect(effect);
  if (roleEffect === undefined) return null;
  return Match.value(roleEffect).pipe(
    Match.when({ kind: "apply_condition" }, (value) =>
      value.condition === "prone"
        ? ("prone" as const)
        : ("incapacitated" as const),
    ),
    Match.when(
      { kind: "suppress_condition_self_end" },
      () => "suppressProne" as const,
    ),
    Match.exhaustive,
  );
}

function hideousLaughterRepeatRole(
  repeatSave: NonNullable<SaveGatePhase["repeatSaves"]>[number],
): "endOfTurn" | "onDamage" | null {
  if (
    repeatSave.cadence === "end_of_target_turn" &&
    repeatSave.rollMode === undefined &&
    repeatSave.onSuccess === "ends_on_target" &&
    repeatSave.onFailAgain === undefined &&
    repeatSave.successesRequired === undefined &&
    repeatSave.failuresRequired === undefined &&
    repeatSave.onFailureThreshold === undefined &&
    spellHasOnlyNamedFields(repeatSave, ["cadence", "onSuccess"])
  ) {
    return "endOfTurn";
  }
  if (
    repeatSave.cadence === "on_target_takes_damage" &&
    repeatSave.rollMode === "advantage" &&
    repeatSave.onSuccess === "ends_on_target" &&
    repeatSave.onFailAgain === undefined &&
    repeatSave.successesRequired === undefined &&
    repeatSave.failuresRequired === undefined &&
    repeatSave.onFailureThreshold === undefined &&
    spellHasOnlyNamedFields(repeatSave, ["cadence", "rollMode", "onSuccess"])
  ) {
    return "onDamage";
  }
  return null;
}

function saveGatedConditionWithRepeatMechanicsEvidence(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
  phase: SaveGatePhase,
): SpellProcedureMechanicsEvidence {
  const effects = phase.onFail.kind === "composite" ? phase.onFail.effects : [];
  const consumed: [SpellMechanicsBranchPath, ...SpellMechanicsBranchPath[]] = [
    spellMechanicsHeaderPath("level"),
    spellMechanicsHeaderPath("school"),
    spellMechanicsHeaderPath("range"),
    spellMechanicsHeaderPath("components"),
    spellMechanicsHeaderPath("duration"),
    spellMechanicsHeaderPath("castingTime"),
    spellMechanicsHeaderPath("family"),
    ...spellDurationEvidencePaths(mechanics.duration),
    spellActivationPhasePath(PositiveInteger(1)),
    spellActivationAttachmentPath(PositiveInteger(1)),
    ...effects.map((_effect, index) =>
      spellActivationEffectPath(PositiveInteger(1), PositiveInteger(index + 1)),
    ),
    ...(phase.repeatSaves ?? []).map((_repeat, index) =>
      spellActivationRepeatPath(PositiveInteger(1), PositiveInteger(index + 1)),
    ),
    ...spellConsumedMaterialEvidencePaths(mechanics.components),
  ];
  return { consumed, unowned: [] };
}

function saveGatedConditionWithRepeatInvocationsFromFacts(
  spell: BattleSpellExecutionSource,
  facts: SaveGatedConditionWithRepeatMechanicsFacts,
  castOptions: SpellAdmissionContext["spellCastOptions"],
): readonly SaveGatedConditionWithRepeatSpellInvocation[] {
  return castOptions.flatMap(
    (slot): readonly SaveGatedConditionWithRepeatSpellInvocation[] =>
      Number(slot.spellLevel) < Number(facts.level)
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              procedure: "saveGatedConditionWithRepeat",
              spell,
              actionCost: "magicAction",
              ability: facts.ability,
              dc: facts.dc,
              targeting: saveGatedConditionTargetingFromFacts(
                facts.targeting,
                slot.spellLevel,
              ),
              rangeFeet: facts.rangeFeet,
              durationTicks: facts.durationTicks,
            },
          ],
  );
}

function admitSaveGatedConditionWithRepeatMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "saveGatedConditionWithRepeat",
  SaveGatedConditionWithRepeatMechanicsFacts,
  SaveGatedConditionWithRepeatSpellInvocation,
  SaveGatedConditionWithRepeatMechanicsIssue
> {
  if (source.mechanics.family !== "activation") {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
  const phaseIndex = mechanics.phases.findIndex(hideousLaughterRootPhase);
  if (phaseIndex < 0) return { tag: "notRepresented" };
  const phase = mechanics.phases[phaseIndex];
  if (phase?.kind !== "save_gate") return { tag: "notRepresented" };
  const issues: SaveGatedConditionWithRepeatMechanicsIssue[] = [];
  const push = (
    failedFact: SaveGatedConditionWithRepeatFailedFact,
    path: SpellMechanicsBranchPath,
  ): void => {
    issues.push(saveGatedConditionWithRepeatIssue(failedFact, path));
  };
  if (mechanics.level !== 1) push("level", spellMechanicsHeaderPath("level"));
  if (
    mechanics.castingTime.kind !== "action" ||
    !spellHasOnlyNamedFields(mechanics.castingTime, ["kind"])
  ) {
    push("castingTime", spellMechanicsHeaderPath("castingTime"));
  }
  if (
    mechanics.range.kind !== "point" ||
    mechanics.range.feet !== 30 ||
    !spellHasOnlyNamedFields(mechanics.range, ["kind", "feet"])
  ) {
    push("range", spellMechanicsHeaderPath("range"));
  }
  issues.push(...hideousLaughterDurationIssues(mechanics));
  if (
    !spellHasOnlyNamedFields(mechanics, [
      "level",
      "school",
      "range",
      "components",
      "duration",
      "castingTime",
      "family",
      "phases",
    ])
  ) {
    push("rootShape", spellMechanicsHeaderPath("family"));
  }
  if (mechanics.phases.length !== 1) {
    for (const [index] of mechanics.phases.entries()) {
      if (index !== phaseIndex) {
        push(
          "phaseCount",
          spellActivationPhasePath(PositiveInteger(index + 1)),
        );
      }
    }
  }
  if (phaseIndex !== 0) {
    push(
      "phaseOrder",
      spellActivationPhasePath(PositiveInteger(phaseIndex + 1)),
    );
  }
  if (
    !spellHasOnlyNamedFields(phase, [
      "kind",
      "attachment",
      "ability",
      "dc",
      "onFail",
      "onSuccess",
      "repeatSaves",
    ])
  ) {
    push(
      "phaseShape",
      spellActivationPhasePath(PositiveInteger(phaseIndex + 1)),
    );
  }
  if (phase.ability !== "wis") {
    push(
      "phaseAbility",
      spellActivationPhasePath(PositiveInteger(phaseIndex + 1)),
    );
  }
  if (
    phase.dc.kind !== "caster_spell_save_dc" ||
    !spellHasOnlyNamedFields(phase.dc, ["kind"])
  ) {
    push("phaseDc", spellActivationPhasePath(PositiveInteger(phaseIndex + 1)));
  }
  const targetAdmission = admitSpellTargetAttachment(phase.attachment, [
    "mode",
    "count",
    "targetKinds",
  ]);
  const targetSelection =
    targetAdmission.tag === "admitted"
      ? targetAdmission.attachment.value.selection
      : undefined;
  const targetCountFacts =
    targetSelection === undefined
      ? null
      : saveGateTargetCountFactsFromSelection(
          targetSelection,
          Number(mechanics.level),
        );
  const targetSupported =
    targetSelection !== undefined &&
    targetSelection.mode === "choose_up_to" &&
    targetSelection.targetKinds?.length === 1 &&
    targetSelection.targetKinds[0] === "creature" &&
    targetCountFacts !== null;
  if (!targetSupported) {
    push(
      "phaseAttachment",
      spellActivationAttachmentPath(PositiveInteger(phaseIndex + 1)),
    );
  }
  if (
    phase.onSuccess.kind !== "none" ||
    !spellHasOnlyNamedFields(phase.onSuccess, ["kind"])
  ) {
    push(
      "successOutcome",
      spellActivationEffectPath(
        PositiveInteger(phaseIndex + 1),
        PositiveInteger(1),
      ),
    );
  }
  const failureEffects =
    phase.onFail.kind === "composite" ? phase.onFail.effects : [];
  if (
    phase.onFail.kind !== "composite" ||
    !spellHasOnlyNamedFields(phase.onFail, ["kind", "effects"])
  ) {
    push(
      "failedSaveEffect",
      spellActivationEffectPath(
        PositiveInteger(phaseIndex + 1),
        PositiveInteger(1),
      ),
    );
  } else {
    const roles = new Set<string>();
    for (const [index, effect] of failureEffects.entries()) {
      const role = hideousLaughterFailureRole(effect);
      if (role === null || roles.has(role)) {
        push(
          "extraFailureEffect",
          spellActivationEffectPath(
            PositiveInteger(phaseIndex + 1),
            PositiveInteger(index + 1),
          ),
        );
      } else {
        roles.add(role);
      }
    }
    const missingRoles = (
      ["prone", "incapacitated", "suppressProne"] as const
    ).filter((role) => !roles.has(role));
    for (const [missingIndex] of missingRoles.entries()) {
      push(
        "missingFailureEffect",
        spellActivationEffectPath(
          PositiveInteger(phaseIndex + 1),
          PositiveInteger(failureEffects.length + missingIndex + 1),
        ),
      );
    }
  }
  const repeatSaves = phase.repeatSaves ?? [];
  const roles = new Set<string>();
  for (const [index, repeat] of repeatSaves.entries()) {
    const role = hideousLaughterRepeatRole(repeat);
    if (role === null || roles.has(role)) {
      push(
        "extraRepeat",
        spellActivationRepeatPath(
          PositiveInteger(phaseIndex + 1),
          PositiveInteger(index + 1),
        ),
      );
    } else {
      roles.add(role);
    }
  }
  const missingRepeatRoles = (["endOfTurn", "onDamage"] as const).filter(
    (role) => !roles.has(role),
  );
  for (const [missingIndex] of missingRepeatRoles.entries()) {
    push(
      repeatSaves.length === 0 ? "missingRepeat" : "repeatSave",
      spellActivationRepeatPath(
        PositiveInteger(phaseIndex + 1),
        PositiveInteger(repeatSaves.length + missingIndex + 1),
      ),
    );
  }
  const nonEmptyIssues = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues(issues),
  );
  if (nonEmptyIssues !== undefined) {
    const [first, ...rest] = nonEmptyIssues;
    return {
      tag: "unsupported",
      issues: [
        saveGatedConditionWithRepeatIssue(
          first.failedFact,
          first.mechanicsPath,
        ),
        ...rest.map((issue) =>
          saveGatedConditionWithRepeatIssue(
            issue.failedFact,
            issue.mechanicsPath,
          ),
        ),
      ],
    };
  }
  if (
    !isHideousLaughterDuration(mechanics.duration) ||
    targetAdmission.tag !== "admitted" ||
    !targetSupported ||
    targetCountFacts === null ||
    mechanics.range.kind !== "point" ||
    typeof mechanics.range.feet !== "number"
  ) {
    return {
      tag: "unsupported",
      issues: [
        saveGatedConditionWithRepeatIssue(
          "requiredFacts",
          spellActivationPhasePath(PositiveInteger(phaseIndex + 1)),
        ),
      ],
    };
  }
  const facts = {
    ...source.spellDefinitionRuleFacts,
    ability: "wis" as const,
    dc: phase.dc,
    targeting: {
      kind: "targetList" as const,
      count: targetCountFacts,
    },
    rangeFeet: movementFeet(mechanics.range.feet),
    durationTicks: spellDurationTicksFromCanonicalValue(
      mechanics.duration.upTo,
    ),
  } satisfies SaveGatedConditionWithRepeatMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "saveGatedConditionWithRepeat",
      facts,
      evidence: saveGatedConditionWithRepeatMechanicsEvidence(mechanics, phase),
      admit: (executionSource: BattleSpellExecutionSource, ctx) =>
        saveGatedConditionWithRepeatInvocationsFromFacts(
          executionSource,
          facts,
          ctx.spellCastOptions,
        ),
    },
  };
}

export function supportedPreparedSaveGatedConditionWithRepeatProfile(
  spell: BattleSpellAdmissionSource,
  castOptions: SpellAdmissionContext["spellCastOptions"],
): readonly SaveGatedConditionWithRepeatSpellInvocation[] {
  const result = admitSaveGatedConditionWithRepeatMechanics({
    mechanics: spell.mechanics,
    spellDefinitionRuleFacts: spell.spellDefinitionRuleFacts,
  });
  return result.tag === "supported"
    ? saveGatedConditionWithRepeatInvocationsFromFacts(
        battleSpellExecutionSourceFromAdmission(spell),
        result.admitted.facts,
        castOptions,
      )
    : [];
}

function discoverSaveGatedConditionWithRepeatCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<SaveGatedConditionWithRepeatSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return [];
  }

  const targetHole = spellTargetListHole(state, actorId, invocation);
  if (targetHole.choices.length === 0) {
    return [];
  }

  const castActs = discoverTargetSavingThrowSpellCastActs({
    state,
    actorId,
    actor,
    invocation,
    targetHole,
  });
  return [...castActs, ...readiedSpellAct(state, actorId, invocation)];
}

function resolveSaveGatedConditionWithRepeat(
  input: SaveGatedConditionWithRepeatResolveInput,
): BattleResolutionResult {
  return resolveSaveGatedConditionWithRepeatSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
    ...optionalProperty("metamagicApplications", input.metamagicApplications),
  });
}

const SaveGatedConditionWithRepeatInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("saveGatedConditionWithRepeat"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("magicAction"),
      ability: Schema.Literal("wis"),
      dc: DcSourceSchema,
      durationTicks: ElapsedTimeTicksSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("targetList"),
        minTargets: Schema.Literal(1),
        maxTargets: Schema.Number,
      }),
      rangeFeet: MovementFeet,
    }),
  );
export const saveGatedConditionWithRepeatProfile = {
  procedure: "saveGatedConditionWithRepeat",
  executionSchema: SaveGatedConditionWithRepeatInvocationSchema,
  admitMechanics: admitSaveGatedConditionWithRepeatMechanics,
  discoverCastAct: discoverSaveGatedConditionWithRepeatCastAct,
  resolve: resolveSaveGatedConditionWithRepeat,
} satisfies SpellProcedureDeclaration<
  "saveGatedConditionWithRepeat",
  SaveGatedConditionWithRepeatSpellInvocation
>;
