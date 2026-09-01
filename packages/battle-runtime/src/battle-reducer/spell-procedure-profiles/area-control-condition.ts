import { savingThrowMetamagicHoles } from "../saving-throw-metamagic-holes.ts";
import { actionSpellCastCandidate } from "../spell-cast-candidate.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-hypnotic-pattern-control spell.invocation-glyph-stored-concentration-full-duration
import { ElapsedTimeTicksSchema } from "@dnd/shared/elapsed-time";
//
// Hypnotic Pattern control profile: action-time level-3+ Spell Slot casting,
// table-supplied point-origin Cube affected targets with sight witnesses,
// Wisdom Saving Throws, and one source-owned target effect that projects
// Charmed, Incapacitated, and Speed 0 until damage, shake-awake, Concentration,
// or duration cleanup.
//
// RAW anchors:
//   - SRD 5.2.1 Spells/Descriptions-E-L.md: Hypnotic Pattern.
//   - Rules Glossary: Area of Effect, Cube, Charmed, Incapacitated, Speed,
//     Concentration, and Saving Throw.
//   - UBIQUITOUS_LANGUAGE.md: Magic Action, Spell Invocation, Spell Effect,
//     Area of Effect, Saving Throw, Charmed, Incapacitated, Speed.

import { hasCondition } from "@dnd/shared-algebras/conditions-algebra";
import { PositiveInteger, movementFeet } from "@dnd/shared/types";
import type { ElapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import type {
  ActivationPhase,
  EffectAtom,
  SpellMechanics,
} from "@dnd/surface/surface/types";
import { Match, Schema } from "effect";
import { bindStoredSpellProcedureExecutionFacts } from "../../character-execution-queries.ts";
import type { SpellProcedureExecution } from "../../character-execution.ts";
import type {
  ActionSpellBattleResolutionInput,
  BattleActDiscoveryCandidate,
  BattleExecutableSpellInvocation,
  BattleInterruptedProcedure,
  BattleResolutionResult,
  BattleSpellSavingThrowOutcomeValue,
  BattleState,
  SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { type GlyphStoredAreaControlInvocation } from "../../glyph-stored-spell-invocation.ts";
import {
  maybeOpenInterruptWindow,
  snapshotBattle,
} from "../interrupt-execution.ts";
import { spellReplayContinuation } from "../spell-reaction-continuation.ts";
import type { CharacterBattleMetamagicOptionFact } from "../../character-battle-resource-execution.ts";
import { type CombatantId } from "../../identity.ts";
import { battleCreatureWithSpellActiveEffects } from "../../active-effect/lifecycle.ts";
import { allocateBattleEffectOccurrenceForCreature } from "../../effect-execution-ref.ts";
import { breakBattleConcentration } from "../damage-apply.ts";
import {
  conditionApplicationPreventedByConditionImmunity,
  conditionApplicationPreventedByCreatureTypeProtection,
  conditionHadNonSpellSourceBeforeSpellEffect,
} from "../spell-condition-effects-helpers.ts";
import { extendSavingThrowOngoingFeatures } from "../attack-roll.ts";
import { resolveAreaSaveMetamagicFills } from "../spells-resolve-save-gates.ts";
import {
  spendSpellCastResources,
  startSpellEffectConcentration,
} from "../spells-resolve-resources.ts";
import { invalidResult } from "../result-helpers.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import type { BattleSpellExecutionSource } from "../../battle-state-execution.ts";
import type { SpellDefinitionRuleFacts } from "../../procedure-execution/spell-rule-facts.ts";
import {
  isSpellCanonicalDurationValue,
  spellDurationChildCoordinates,
  spellDurationChildPath,
  spellDurationTicksFromCanonicalValue,
  spellProcedureNonEmpty,
  spellConsumedMaterialEvidencePaths,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsInspection,
  type SpellCanonicalDurationValue,
} from "./spell-mechanics-admission.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellActivationRepeatPath,
  spellDurationEndingPath,
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type { SaveGatedAreaControlStoredGlyphRelease } from "./resolution-contract.ts";
import {
  DcSourceSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import {
  discoverSpellMetamagicSelections,
  spellMetamagicApplications,
} from "../metamagic-support.ts";
import { spellSavingThrowOutcomeHole } from "../spells-holes-fills.ts";
import { failedSavingThrowTargetIds } from "../saving-throw-outcomes.ts";

type SaveGatedAreaControlSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "saveGatedAreaControl" }
>;
type StoredGlyphAreaControlSpellInvocation =
  SpellProcedureExecution<GlyphStoredAreaControlInvocation>;

type SaveGatedAreaControlResolveInput =
  SpellProcedureProfileResolveInput<SaveGatedAreaControlSpellInvocation>;

export function resolveStoredGlyphAreaControlSpellRelease(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: StoredGlyphAreaControlSpellInvocation;
  readonly fillSet: Extract<
    SpellProcedureProfileResolveInput<SaveGatedAreaControlSpellInvocation>["fillSet"],
    { readonly tag: "ok" }
  >;
  readonly selfOriginAreaAnchorId: CombatantId;
}): BattleResolutionResult {
  return resolveSaveGatedAreaControl({
    input: input.input,
    actorId: input.actorId,
    invocation: bindStoredSpellProcedureExecutionFacts(
      input.invocation,
      input.input.subject.procedureRef,
    ),
    fillSet: input.fillSet,
    storedGlyphRelease: {
      kind: "storedGlyphSpellRelease",
      selfOriginAreaAnchorId: input.selfOriginAreaAnchorId,
    },
  });
}

type SaveGatedAreaControlMechanicsFacts = SpellDefinitionRuleFacts & {
  readonly range: Extract<
    SpellDefinitionRuleFacts["range"],
    {
      readonly kind: "point";
    }
  > & { readonly feet: number };
  readonly duration: Extract<
    SpellDefinitionRuleFacts["duration"],
    {
      readonly kind: "concentration";
    }
  > & { readonly upTo: SpellCanonicalDurationValue };
  readonly durationTicks: ElapsedTimeTicks;
  readonly ability: "wis";
  readonly dc: SaveGatedAreaControlSpellInvocation["dc"];
  readonly targeting: SaveGatedAreaControlSpellInvocation["targeting"];
};

type SaveGatedAreaControlRange = SaveGatedAreaControlMechanicsFacts["range"];
type SaveGatedAreaControlDuration =
  SaveGatedAreaControlMechanicsFacts["duration"];
type SaveGatedAreaControlPhase = Extract<
  ActivationPhase,
  { readonly kind: "save_gate" }
>;
type SaveGatedAreaControlAreaHoleAttachment = Extract<
  SaveGatedAreaControlPhase["attachment"],
  { readonly kind: "hole"; readonly value: { readonly kind: "area" } }
>;
type SaveGatedAreaControlExpectedAttachment =
  SaveGatedAreaControlAreaHoleAttachment & {
    readonly value: SaveGatedAreaControlAreaHoleAttachment["value"] & {
      readonly origin: Extract<
        SaveGatedAreaControlAreaHoleAttachment["value"]["origin"],
        { readonly kind: "point_within_range" }
      >;
      readonly shape: Extract<
        SaveGatedAreaControlAreaHoleAttachment["value"]["shape"],
        { readonly kind: "cube" }
      > & { readonly sideFeet: 30 };
      readonly occupantPerceptionFilter: "can_see_area_effect";
    };
  };

function saveGatedAreaControlTargeting(
  attachment: SaveGatedAreaControlPhase["attachment"],
): SaveGatedAreaControlSpellInvocation["targeting"] | undefined {
  if (
    attachment.kind !== "hole" ||
    attachment.value.kind !== "area" ||
    attachment.value.origin.kind !== "point_within_range" ||
    attachment.value.shape.kind !== "cube" ||
    attachment.value.shape.sideFeet !== 30 ||
    attachment.value.occupantPerceptionFilter !== "can_see_area_effect"
  ) {
    return undefined;
  }
  return {
    kind: "pointOriginCube",
    sideFeet: movementFeet(attachment.value.shape.sideFeet),
  };
}

function isSaveGatedAreaControlRange(
  range: SpellDefinitionRuleFacts["range"],
): range is SaveGatedAreaControlRange {
  return range.kind === "point" && typeof range.feet === "number";
}

function isSaveGatedAreaControlDuration(
  duration: SpellDefinitionRuleFacts["duration"],
): duration is SaveGatedAreaControlDuration {
  return (
    duration.kind === "concentration" &&
    duration.upTo.unit === "minute" &&
    duration.upTo.amount === 1 &&
    isSpellCanonicalDurationValue(duration.upTo)
  );
}

function isSaveGatedAreaControlAttachment(
  attachment: SaveGatedAreaControlPhase["attachment"],
): attachment is SaveGatedAreaControlExpectedAttachment {
  return (
    attachment.kind === "hole" &&
    attachment.value.kind === "area" &&
    attachment.value.origin.kind === "point_within_range" &&
    attachment.value.shape.kind === "cube" &&
    attachment.value.shape.sideFeet === 30 &&
    attachment.value.occupantPerceptionFilter === "can_see_area_effect"
  );
}

function isSaveGatedAreaControlAbility(
  ability: SaveGatedAreaControlPhase["ability"],
): ability is "wis" {
  return ability === "wis";
}

function isSaveGatedAreaControlDc(
  dc: SaveGatedAreaControlPhase["dc"],
): dc is SaveGatedAreaControlSpellInvocation["dc"] {
  return dc.kind === "caster_spell_save_dc";
}

export const SAVE_GATED_AREA_CONTROL_FAILED_FACTS = [
  "level",
  "castingTime",
  "range",
  "duration",
  "durationExtension",
  "durationEnding",
  "phaseCount",
  "phaseAbility",
  "phaseDc",
  "attachment",
  "successOutcome",
  "failedSaveEffect",
  "repeatSave",
] as const;
type SaveGatedAreaControlFailedFact =
  (typeof SAVE_GATED_AREA_CONTROL_FAILED_FACTS)[number];

type SaveGatedAreaControlIssue = {
  readonly failedFact: SaveGatedAreaControlFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
};

type SaveGatedAreaControlInspection = SpellProcedureMechanicsInspection<
  "saveGatedAreaControl",
  SaveGatedAreaControlMechanicsFacts,
  SaveGatedAreaControlSpellInvocation,
  ReturnType<typeof saveGatedAreaControlIssueResult>
>;

function saveGatedAreaControlIssue(
  failedFact: SaveGatedAreaControlFailedFact,
  mechanicsPath: SpellMechanicsBranchPath,
): SaveGatedAreaControlIssue {
  return { failedFact, mechanicsPath };
}

function saveGatedAreaControlIssueResult(issue: SaveGatedAreaControlIssue) {
  return {
    tag: "spellProcedureAdmissionIssue" as const,
    procedure: "saveGatedAreaControl" as const,
    failedFact: issue.failedFact,
    mechanicsPath: issue.mechanicsPath,
    message: `Unsupported saveGatedAreaControl mechanics fact: ${issue.failedFact}.`,
  };
}

function saveGatedAreaControlDurationIssues(
  duration: Extract<
    SpellMechanics["duration"],
    { readonly kind: "concentration" }
  >,
): readonly SaveGatedAreaControlIssue[] {
  const issues: SaveGatedAreaControlIssue[] = [];
  const durationChildren = spellDurationChildCoordinates(duration);
  let targetTakesDamageSeen = false;
  for (const child of durationChildren) {
    if (child.branch === "extension") {
      issues.push(
        saveGatedAreaControlIssue(
          "durationExtension",
          spellDurationChildPath(child),
        ),
      );
      continue;
    }
    if (
      child.ending.kind === "earlyEnd" &&
      child.ending.trigger.kind === "target_takes_damage" &&
      !targetTakesDamageSeen
    ) {
      targetTakesDamageSeen = true;
    } else {
      issues.push(
        saveGatedAreaControlIssue(
          "durationEnding",
          spellDurationChildPath(child),
        ),
      );
    }
  }
  const endingCount = durationChildren.filter(
    (child) => child.branch === "ending",
  ).length;
  if (!targetTakesDamageSeen && duration.permanentIfMaintainedFull !== true) {
    issues.push(
      saveGatedAreaControlIssue(
        "durationEnding",
        spellDurationEndingPath(PositiveInteger(endingCount + 1)),
      ),
    );
  }
  return issues;
}

function isSaveGatedAreaControlRootShape(
  phase: ActivationPhase | undefined,
): phase is Extract<ActivationPhase, { readonly kind: "save_gate" }> {
  if (phase?.kind !== "save_gate" || phase.onFail.kind !== "composite") {
    return false;
  }
  // Damage-led composite save gates belong to the save-gated-damage owner.
  if (phase.onFail.effects[0]?.kind === "damage") {
    return false;
  }
  return phase.onFail.effects.some(
    (effect) =>
      isApplyConditionEffect(effect, "charmed") ||
      isApplyConditionEffect(effect, "incapacitated") ||
      (effect.kind === "set_speed" && effect.feet === 0) ||
      isSaveGatedAreaControlShakeAwakeEffect(effect),
  );
}

function admitSaveGatedAreaControlMechanics(
  source: SpellMechanicsAdmissionSource,
): SaveGatedAreaControlInspection {
  if (source.mechanics.family !== "activation") {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
  const phase = source.mechanics.phases[0];
  if (!isSaveGatedAreaControlRootShape(phase)) {
    return { tag: "notRepresented" };
  }
  const issues: SaveGatedAreaControlIssue[] = [];
  const rangeFacts = isSaveGatedAreaControlRange(mechanics.range)
    ? mechanics.range
    : undefined;
  const durationFacts = isSaveGatedAreaControlDuration(mechanics.duration)
    ? mechanics.duration
    : undefined;
  const abilityFacts = isSaveGatedAreaControlAbility(phase.ability)
    ? phase.ability
    : undefined;
  const dcFacts = isSaveGatedAreaControlDc(phase.dc) ? phase.dc : undefined;
  if (source.mechanics.level !== 3) {
    issues.push(
      saveGatedAreaControlIssue("level", spellMechanicsHeaderPath("level")),
    );
  }
  if (source.mechanics.castingTime.kind !== "action") {
    issues.push(
      saveGatedAreaControlIssue(
        "castingTime",
        spellMechanicsHeaderPath("castingTime"),
      ),
    );
  }
  if (
    !isSaveGatedAreaControlRange(mechanics.range) ||
    mechanics.range.feet !== 120
  ) {
    issues.push(
      saveGatedAreaControlIssue("range", spellMechanicsHeaderPath("range")),
    );
  }
  if (!isSaveGatedAreaControlDuration(mechanics.duration)) {
    issues.push(
      saveGatedAreaControlIssue("duration", spellDurationValuePath()),
    );
  }
  const duration = mechanics.duration;
  if (duration.kind === "concentration") {
    issues.push(...saveGatedAreaControlDurationIssues(duration));
  }
  if (source.mechanics.phases.length !== 1) {
    for (const [index] of source.mechanics.phases.entries()) {
      if (index === 0) continue;
      issues.push(
        saveGatedAreaControlIssue(
          "phaseCount",
          spellActivationPhasePath(PositiveInteger(index + 1)),
        ),
      );
    }
    if (source.mechanics.phases.length === 0) {
      issues.push(
        saveGatedAreaControlIssue(
          "phaseCount",
          spellActivationPhasePath(PositiveInteger(1)),
        ),
      );
    }
  }
  if (abilityFacts === undefined) {
    issues.push(
      saveGatedAreaControlIssue(
        "phaseAbility",
        spellActivationPhasePath(PositiveInteger(1)),
      ),
    );
  }
  if (dcFacts === undefined) {
    issues.push(
      saveGatedAreaControlIssue(
        "phaseDc",
        spellActivationPhasePath(PositiveInteger(1)),
      ),
    );
  }
  if (!isSaveGatedAreaControlAttachment(phase.attachment)) {
    issues.push(
      saveGatedAreaControlIssue(
        "attachment",
        spellActivationAttachmentPath(PositiveInteger(1)),
      ),
    );
  }
  const targeting = saveGatedAreaControlTargeting(phase.attachment);
  if (phase.onSuccess.kind !== "none") {
    issues.push(
      saveGatedAreaControlIssue(
        "successOutcome",
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
      ),
    );
  }
  if (phase.onFail.kind !== "composite") {
    issues.push(
      saveGatedAreaControlIssue(
        "failedSaveEffect",
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
      ),
    );
  } else {
    const seenRoles = new Set<SaveGatedAreaControlFailedEffectRole>();
    let hasUnknownRole = false;
    for (const [index, effect] of phase.onFail.effects.entries()) {
      const roleEffect = saveGatedAreaControlFailedRoleEffect(effect);
      if (roleEffect === undefined) {
        hasUnknownRole = true;
        issues.push(
          saveGatedAreaControlIssue(
            "failedSaveEffect",
            spellActivationEffectPath(
              PositiveInteger(1),
              PositiveInteger(index + 1),
            ),
          ),
        );
      } else {
        const role = saveGatedAreaControlFailedEffectRole(roleEffect);
        if (seenRoles.has(role)) {
          issues.push(
            saveGatedAreaControlIssue(
              "failedSaveEffect",
              spellActivationEffectPath(
                PositiveInteger(1),
                PositiveInteger(index + 1),
              ),
            ),
          );
        } else {
          seenRoles.add(role);
        }
      }
    }
    const missingRoles = hasUnknownRole
      ? []
      : SAVE_GATED_AREA_CONTROL_FAILED_EFFECT_ROLES.filter(
          (role) => !seenRoles.has(role),
        );
    for (const [index] of missingRoles.entries()) {
      issues.push(
        saveGatedAreaControlIssue(
          "failedSaveEffect",
          spellActivationEffectPath(
            PositiveInteger(1),
            PositiveInteger(phase.onFail.effects.length + index + 1),
          ),
        ),
      );
    }
  }
  for (const [index] of (phase.repeatSaves ?? []).entries()) {
    issues.push(
      saveGatedAreaControlIssue(
        "repeatSave",
        spellActivationRepeatPath(
          PositiveInteger(1),
          PositiveInteger(index + 1),
        ),
      ),
    );
  }
  const allIssues = spellProcedureNonEmpty(issues);
  if (allIssues !== undefined) {
    const [firstIssue, ...remainingIssues] = allIssues;
    return {
      tag: "unsupported",
      issues: [
        saveGatedAreaControlIssueResult(firstIssue),
        ...remainingIssues.map(saveGatedAreaControlIssueResult),
      ],
    };
  }
  if (targeting === undefined) {
    return {
      tag: "unsupported",
      issues: [
        saveGatedAreaControlIssueResult(
          saveGatedAreaControlIssue(
            "attachment",
            spellActivationAttachmentPath(PositiveInteger(1)),
          ),
        ),
      ],
    };
  }
  if (rangeFacts === undefined) {
    return {
      tag: "unsupported",
      issues: [
        saveGatedAreaControlIssueResult(
          saveGatedAreaControlIssue("range", spellMechanicsHeaderPath("range")),
        ),
      ],
    };
  }
  if (durationFacts === undefined) {
    return {
      tag: "unsupported",
      issues: [
        saveGatedAreaControlIssueResult(
          saveGatedAreaControlIssue("duration", spellDurationValuePath()),
        ),
      ],
    };
  }
  if (abilityFacts === undefined) {
    return {
      tag: "unsupported",
      issues: [
        saveGatedAreaControlIssueResult(
          saveGatedAreaControlIssue(
            "phaseAbility",
            spellActivationPhasePath(PositiveInteger(1)),
          ),
        ),
      ],
    };
  }
  if (dcFacts === undefined) {
    return {
      tag: "unsupported",
      issues: [
        saveGatedAreaControlIssueResult(
          saveGatedAreaControlIssue(
            "phaseDc",
            spellActivationPhasePath(PositiveInteger(1)),
          ),
        ),
      ],
    };
  }
  const admittedFacts = {
    ...source.spellDefinitionRuleFacts,
    range: rangeFacts,
    duration: durationFacts,
    durationTicks: spellDurationTicksFromCanonicalValue(durationFacts.upTo),
    ability: abilityFacts,
    dc: dcFacts,
    targeting,
  } satisfies SaveGatedAreaControlMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "saveGatedAreaControl",
      facts: admittedFacts,
      evidence: saveGatedAreaControlMechanicsEvidence(source.mechanics, phase),
      admit: (executionSource, ctx) =>
        admitSaveGatedAreaControl(executionSource, ctx, admittedFacts),
    },
  };
}

function saveGatedAreaControlMechanicsEvidence(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
  phase: Extract<ActivationPhase, { readonly kind: "save_gate" }>,
): SpellProcedureMechanicsEvidence {
  const failedEffects =
    phase.onFail.kind === "composite" ? phase.onFail.effects : [];
  const consumed: [SpellMechanicsBranchPath, ...SpellMechanicsBranchPath[]] = [
    spellMechanicsHeaderPath("level"),
    spellMechanicsHeaderPath("school"),
    spellMechanicsHeaderPath("range"),
    spellMechanicsHeaderPath("components"),
    spellMechanicsHeaderPath("duration"),
    spellMechanicsHeaderPath("castingTime"),
    spellMechanicsHeaderPath("family"),
    spellDurationValuePath(),
    ...spellDurationChildCoordinates(mechanics.duration).map((child) =>
      spellDurationChildPath(child),
    ),
    spellActivationPhasePath(PositiveInteger(1)),
    spellActivationAttachmentPath(PositiveInteger(1)),
    ...failedEffects.map((_effect, index) =>
      spellActivationEffectPath(PositiveInteger(1), PositiveInteger(index + 1)),
    ),
    ...spellConsumedMaterialEvidencePaths(mechanics.components),
  ];
  return { consumed, unowned: [] };
}

function admitSaveGatedAreaControl(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: SaveGatedAreaControlMechanicsFacts,
): readonly SaveGatedAreaControlSpellInvocation[] {
  const rangeFeet = movementFeet(facts.range.feet);
  return ctx.spellCastOptions.flatMap(
    (slot): readonly SaveGatedAreaControlSpellInvocation[] =>
      Number(slot.spellLevel) < facts.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              procedure: "saveGatedAreaControl",
              spell,
              actionCost: "magicAction",
              ability: facts.ability,
              dc: facts.dc,
              targeting: facts.targeting,
              rangeFeet,
              durationTicks: facts.durationTicks,
            },
          ],
  );
}

function isApplyConditionEffect(
  effect: EffectAtom,
  condition: "charmed" | "incapacitated",
): effect is Extract<EffectAtom, { readonly kind: "apply_condition" }> & {
  readonly condition: typeof condition;
} {
  return effect.kind === "apply_condition" && effect.condition === condition;
}

const SAVE_GATED_AREA_CONTROL_FAILED_EFFECT_ROLES = [
  "charmed",
  "incapacitated",
  "speedZero",
  "shakeAwake",
] as const;
type SaveGatedAreaControlFailedEffectRole =
  (typeof SAVE_GATED_AREA_CONTROL_FAILED_EFFECT_ROLES)[number];

type SaveGatedAreaControlFailedRoleEffect =
  | (Extract<EffectAtom, { readonly kind: "apply_condition" }> & {
      readonly condition: "charmed" | "incapacitated";
    })
  | (Extract<EffectAtom, { readonly kind: "set_speed" }> & {
      readonly feet: 0;
    })
  | Extract<EffectAtom, { readonly kind: "target_effect_escape_action" }>;

function saveGatedAreaControlFailedRoleEffect(
  effect: EffectAtom,
): SaveGatedAreaControlFailedRoleEffect | undefined {
  if (
    isApplyConditionEffect(effect, "charmed") ||
    isApplyConditionEffect(effect, "incapacitated")
  ) {
    return effect;
  }
  if (isSaveGatedAreaControlSpeedZeroEffect(effect)) {
    return effect;
  }
  return isSaveGatedAreaControlShakeAwakeEffect(effect) ? effect : undefined;
}

function isSaveGatedAreaControlSpeedZeroEffect(
  effect: EffectAtom,
): effect is Extract<EffectAtom, { readonly kind: "set_speed" }> & {
  readonly feet: 0;
} {
  return effect.kind === "set_speed" && effect.feet === 0;
}

function saveGatedAreaControlFailedEffectRole(
  effect: SaveGatedAreaControlFailedRoleEffect,
): SaveGatedAreaControlFailedEffectRole {
  return Match.value(effect).pipe(
    Match.when(
      { kind: "apply_condition", condition: "charmed" },
      () => "charmed" as const,
    ),
    Match.when(
      { kind: "apply_condition", condition: "incapacitated" },
      () => "incapacitated" as const,
    ),
    Match.when({ kind: "set_speed", feet: 0 }, () => "speedZero" as const),
    Match.when(
      { kind: "target_effect_escape_action" },
      () => "shakeAwake" as const,
    ),
    Match.exhaustive,
  );
}

function isSaveGatedAreaControlShakeAwakeEffect(
  effect: EffectAtom,
): effect is Extract<
  EffectAtom,
  { readonly kind: "target_effect_escape_action" }
> {
  return (
    effect.kind === "target_effect_escape_action" &&
    effect.actor === "another_creature" &&
    effect.cost === "action" &&
    effect.method === "shake_awake" &&
    effect.outcome === "end_current_effect"
  );
}

function discoverSaveGatedAreaControlCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<SaveGatedAreaControlSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const savingThrowHole = spellSavingThrowOutcomeHole(
    state,
    actorId,
    invocation,
  );
  const baseCastAct = actionSpellCastCandidate(
    actorId,
    invocation.sourceProcedureRef,
    [savingThrowHole],
  );
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return [baseCastAct];
  }
  return [
    baseCastAct,
    ...discoverSpellMetamagicSelections({ actor, invocation }).map(
      (metamagic) => {
        const applications = spellMetamagicApplications(actor, metamagic);
        return {
          ...baseCastAct,
          subject: { ...baseCastAct.subject, metamagic },
          initialHoles: savingThrowMetamagicHoles(
            state,
            actorId,
            invocation,
            applications,
          ),
        };
      },
    ),
  ];
}

function saveGatedAreaControlReleaseResourceState(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly invocation: SaveGatedAreaControlResolveInput["invocation"];
  readonly errorState: BattleState;
  readonly metamagicApplications: readonly CharacterBattleMetamagicOptionFact[];
  readonly storedGlyphRelease:
    | SaveGatedAreaControlStoredGlyphRelease
    | undefined;
}): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  if (input.storedGlyphRelease !== undefined) {
    return {
      tag: "resolved",
      state: input.state,
      snapshot: snapshotBattle(input.state),
    };
  }
  return spendSpellCastResources({
    state: input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.errorState,
    startConcentration: false,
    metamagicApplications: input.metamagicApplications,
  });
}

function storedGlyphAreaControlReleaseUsesOrdinaryConcentration(
  storedGlyphRelease: SaveGatedAreaControlStoredGlyphRelease | undefined,
): boolean {
  return storedGlyphRelease === undefined;
}

function invalidStoredGlyphAreaCenterResult(input: {
  readonly state: BattleState;
  readonly savingThrowOutcomes: BattleSpellSavingThrowOutcomeValue;
  readonly storedGlyphRelease:
    | SaveGatedAreaControlStoredGlyphRelease
    | undefined;
}): Extract<BattleResolutionResult, { readonly tag: "invalid" }> | null {
  if (input.storedGlyphRelease === undefined) {
    return null;
  }
  if (
    "area" in input.savingThrowOutcomes &&
    input.savingThrowOutcomes.area.originAnchorId ===
      input.storedGlyphRelease.selfOriginAreaAnchorId
  ) {
    return null;
  }
  return invalidResult(
    input.state,
    "invalidFill",
    "Stored glyph area release must use a spell area centered on the triggering creature.",
  );
}

function resolveSaveGatedAreaControl(
  input: SaveGatedAreaControlResolveInput,
): BattleResolutionResult {
  const metamagicApplications =
    input.storedGlyphRelease === undefined ? input.metamagicApplications : [];
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.damageDispositions.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "save-gated area control uses an area Saving Throw outcome fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const areaSave = resolveAreaSaveMetamagicFills({
    state: input.input.state,
    subject: input.input.subject,
    actorId: input.actorId,
    invocation: input.invocation,
    fills: input.input.fills,
    metamagicApplications,
    savingThrowOutcomes: input.fillSet.savingThrowOutcomes,
  });
  if (areaSave.tag !== "ready") {
    return areaSave;
  }
  const savingThrowOutcomes = areaSave.savingThrowOutcomes;
  const areaWitnessValidation =
    validateSaveGatedAreaControlAreaWitness(savingThrowOutcomes);
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (areaWitnessValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      areaWitnessValidation,
    );
  }
  /* v8 ignore stop -- @preserve */
  const invalidStoredGlyphCenter = invalidStoredGlyphAreaCenterResult({
    state: input.input.state,
    savingThrowOutcomes,
    storedGlyphRelease: input.storedGlyphRelease,
  });
  if (invalidStoredGlyphCenter !== null) {
    return invalidStoredGlyphCenter;
  }
  const affectedTargetIds = savingThrowOutcomes.outcomes.map(
    (outcome) => outcome.targetId,
  );
  const failedTargets = failedSavingThrowTargetIds(
    savingThrowOutcomes.outcomes,
  );
  if (failedTargets.length > 0) {
    const continuation: BattleInterruptedProcedure = spellReplayContinuation(
      input.input,
    );
    const saveFailedReactionWindow = maybeOpenInterruptWindow(
      input.input.state,
      {
        trigger: "saveFailed",
        targetId: failedTargets[0]!,
        sourceProcedureRef: input.invocation.sourceProcedureRef,
        continuation,
      },
      input.input.handledInterruptTrigger,
    );
    if (saveFailedReactionWindow !== null) {
      return saveFailedReactionWindow;
    }
  }
  const resourced = saveGatedAreaControlReleaseResourceState({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
    metamagicApplications,
    storedGlyphRelease: input.storedGlyphRelease,
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const effected = applySaveGatedAreaControlControlEffects(
    resourced.state,
    input.actorId,
    failedTargets,
    input.invocation,
  );
  const concentrationState =
    effected.appliedTargetIds.length === 0 ||
    !storedGlyphAreaControlReleaseUsesOrdinaryConcentration(
      input.storedGlyphRelease,
    )
      ? effected.state
      : startSpellEffectConcentration(
          effected.state,
          input.actorId,
          input.invocation,
        );
  const concentrationChecked = breakConcentrationForIncapacitatedTargets(
    concentrationState,
    effected.appliedTargetIds,
  );
  const nextState = extendSavingThrowOngoingFeatures(
    concentrationChecked,
    input.actorId,
    affectedTargetIds,
    input.fillSet.savingThrowRelationshipFacts,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function applySaveGatedAreaControlControlEffects(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: BattleExecutableSpellInvocation<SaveGatedAreaControlSpellInvocation>,
): {
  readonly state: BattleState;
  readonly appliedTargetIds: readonly CombatantId[];
} {
  const combatants = new Map(state.combatants);
  const appliedTargetIds: CombatantId[] = [];
  for (const targetId of targetIds) {
    const target = combatants.get(targetId);
    if (target === undefined) {
      continue;
    }
    if (
      conditionApplicationPreventedByConditionImmunity(target, "charmed") ||
      conditionApplicationPreventedByCreatureTypeProtection(
        state,
        actorId,
        target,
        "charmed",
      )
    ) {
      continue;
    }
    const replacing = target.activeEffects.filter(
      (effect) =>
        effect.kind === "saveGatedAreaControl" &&
        effect.sourceProcedureRef === invocation.sourceProcedureRef &&
        effect.sourceCombatantId === actorId,
    );
    const allocation = allocateBattleEffectOccurrenceForCreature({
      owner: target,
      effect: {
        kind: "saveGatedAreaControl" as const,
        sourceProcedureRef: invocation.sourceProcedureRef,
        sourceCombatantId: actorId,
        conditionHadNonSpellCharmedSource:
          conditionHadNonSpellSourceBeforeSpellEffect(target, "charmed"),
        conditionHadNonSpellIncapacitatedSource:
          conditionHadNonSpellSourceBeforeSpellEffect(target, "incapacitated"),
        expiresAt: {
          kind: "concentration" as const,
          combatantId: actorId,
          durationTicks: invocation.durationTicks,
        },
      },
    });
    const activeEffects = [
      ...allocation.owner.activeEffects.filter(
        (effect) => !replacing.includes(effect),
      ),
      allocation.effect,
    ];
    combatants.set(
      targetId,
      battleCreatureWithSpellActiveEffects(allocation.owner, activeEffects),
    );
    appliedTargetIds.push(targetId);
  }
  return { state: { ...state, combatants }, appliedTargetIds };
}

/* v8 ignore start -- @preserve -- Malformed area-witness validator: Hypnotic Pattern discovery supplies the typed Cube geometry, unique visible targets, and matching outcomes; admitted effect execution remains measured. */
function validateSaveGatedAreaControlAreaWitness(
  savingThrowOutcomes: BattleSpellSavingThrowOutcomeValue,
): string | null {
  if (!("area" in savingThrowOutcomes)) {
    return "save-gated area control requires a point-origin Cube area witness.";
  }
  const area = savingThrowOutcomes.area;
  if (area.kind !== "saveGatedAreaControlArea") {
    return "save-gated area control requires explicit Cube membership and sight witnesses.";
  }
  if (area.cubeSideFeet !== 30) {
    return "save-gated area control requires a 30-foot Cube witness.";
  }
  const outcomeTargetIds = savingThrowOutcomes.outcomes.map(
    (outcome) => outcome.targetId,
  );
  const affectedTargetIds = new Set(area.affectedTargetIds);
  if (
    affectedTargetIds.size !== outcomeTargetIds.length ||
    outcomeTargetIds.some((targetId) => !affectedTargetIds.has(targetId))
  ) {
    return "save-gated area control Cube affected targets must match its Saving Throw outcomes.";
  }
  const witnessTargetIds = new Set<CombatantId>();
  for (const witness of area.affectedCreatureWitnesses) {
    if (witnessTargetIds.has(witness.targetId)) {
      return "save-gated area control Cube witnesses must not duplicate a target.";
    }
    witnessTargetIds.add(witness.targetId);
    if (witness.inCube !== true || witness.canSeePattern !== true) {
      return "save-gated area control affected-creature witnesses must prove Cube membership and sight.";
    }
  }
  if (
    witnessTargetIds.size !== outcomeTargetIds.length ||
    outcomeTargetIds.some((targetId) => !witnessTargetIds.has(targetId))
  ) {
    return "save-gated area control requires a Cube and sight witness for every affected target.";
  }
  return null;
}
/* v8 ignore stop -- @preserve */

function breakConcentrationForIncapacitatedTargets(
  state: BattleState,
  targetIds: readonly CombatantId[],
): BattleState {
  const incapacitatedTargetIds = targetIds.filter((targetId) => {
    const target = state.combatants.get(targetId);
    return (
      target !== undefined && hasCondition(target.conditions, "incapacitated")
    );
  });
  return incapacitatedTargetIds.reduce(
    (nextState, targetId) => breakBattleConcentration(nextState, targetId),
    state,
  );
}

const SaveGatedAreaControlInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    procedure: Schema.Literal("saveGatedAreaControl"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("magicAction"),
    ability: Schema.Literal("wis"),
    dc: DcSourceSchema,
    targeting: Schema.Struct({
      kind: Schema.Literal("pointOriginCube"),
      sideFeet: MovementFeet,
    }),
    rangeFeet: MovementFeet,
    durationTicks: ElapsedTimeTicksSchema,
  }),
);

export const saveGatedAreaControlProfile = {
  procedure: "saveGatedAreaControl",
  executionSchema: SaveGatedAreaControlInvocationSchema,
  admitMechanics: admitSaveGatedAreaControlMechanics,
  discoverCastAct: discoverSaveGatedAreaControlCastAct,
  resolve: resolveSaveGatedAreaControl,
} satisfies SpellProcedureDeclaration<
  "saveGatedAreaControl",
  SaveGatedAreaControlSpellInvocation
>;
import { spellInvocationResourceForCastOption } from "./profile.ts";
