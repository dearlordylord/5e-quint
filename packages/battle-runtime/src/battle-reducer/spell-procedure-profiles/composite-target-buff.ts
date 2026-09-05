import { resolveSpellActiveEffectCast } from "../spell-active-effect-resolution.ts";
import { actionSpellCastCandidatesForTargetHole } from "../spell-cast-candidate.ts";
import type { BattleSpellExecutionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-haste-positive
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-glyph-stored-concentration-full-duration
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.HASTE_POSITIVE_EFFECTS
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.HASTE_LETHARGY_LIFECYCLE
//
// The Haste-positive Spell Procedure Profile: the SRD Haste cast path that
// grants its active positive effects and carries the spell-end lethargy rider
// until Concentration or duration cleanup promotes it.

import { ElapsedTimeTicksSchema } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  ATTACK_ONCE_OR_DASH_DISENGAGE_HIDE_UTILIZE_ACTION_RESTRICTION,
  type AttackOnceOrDashDisengageHideUtilizeActionRestriction,
  AttackOnceOrDashDisengageHideUtilizeActionRestrictionSchema,
  isAttackOnceOrDashDisengageHideUtilizeActionRestriction,
} from "@dnd/shared-algebras/action-economy-algebra";
import { movementFeet, PositiveInteger } from "@dnd/shared/types";
import type { MovementFeet as MovementFeetValue } from "@dnd/shared/types";
import type { UnitMechanicsPath } from "@dnd/surface/surface/mechanics-graph-path";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellDurationEndingPath,
  spellDurationExtensionPath,
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  spellMechanicsRootPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type {
  ActionRestriction,
  Duration,
  EffectAtom,
  SpellLevel,
  SpellMechanics,
} from "@dnd/surface/surface/types";
import { isEffectAtom } from "@dnd/surface/surface/types";
import { Match, Schema } from "effect";
import { BattleEffectOccurrenceTemplateSchemaFields } from "../../active-effect/template-codec.ts";

import type { BattleActiveEffect } from "../../active-effect/types.ts";
import {
  type ActionSpellBattleResolutionInput,
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type CompositeTargetBuffWithAftermathSpellInvocation,
} from "../../battle-state-execution.ts";
import { CombatantId } from "../../identity.ts";
import type { BattleSourcedEffectOccurrenceTemplateList } from "../../effect-execution-ref.ts";

import { replaceAllocatedTargetSpellActiveEffects } from "../active-effect-replacement.ts";
import { spellSelectionResolution } from "../needs-holes-result.ts";
import { invalidResult } from "../result-helpers.ts";
import { battleStateWithCurrentActorSpellGrantedActionResourcesForTargets } from "../spell-granted-action-resource.ts";
import { sameStringSet } from "../spells-execution-facts.ts";
import type { SpellFillSet } from "../spells-resolve-fill-set.ts";
import { spellTargetHole } from "../spells-holes-fills.ts";
import {
  spellSingleTargetSelection,
  type SpellSingleTargetSelection,
} from "../spells-resolve-target-selection.ts";
import {
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  admitSpellTargetAttachment,
  isSpellCanonicalDurationValue,
  spellConsumedMaterialEvidencePaths,
  spellDurationChildCoordinates,
  spellDurationChildFailedFact,
  spellDurationEvidencePaths,
  spellDurationTicksFromCanonicalValue,
  spellMechanicsObjectHasOnlyKeys,
  spellProcedureHasRedundantSignature,
  spellProcedureMapNonEmpty,
  spellProcedureNonEmpty,
  spellUniqueMechanicsIssues,
  type SpellCanonicalDurationValue,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureAdmissionIssue,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsFacts,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";

const CompositeTargetBuffWithAftermathExpirationSchema = Schema.Struct({
  kind: Schema.Literal("concentration"),
  combatantId: CombatantId,
  durationTicks: ElapsedTimeTicksSchema,
});

type ActivationMechanics = Extract<
  SpellMechanics,
  { readonly family: "activation" }
>;
type DirectPhase = Extract<
  ActivationMechanics["phases"][number],
  { readonly kind: "direct" }
>;
type CompositeTargetBuffDuration = Extract<
  Duration,
  { readonly kind: "concentration" }
> & {
  readonly upTo: SpellCanonicalDurationValue & {
    readonly amount: CompositeTargetBuffDurationMinutes;
    readonly unit: "minute";
  };
};
type CompositeTargetBuffEffectOccurrence = {
  readonly effect: EffectAtom;
  readonly authoredOrdinal: PositiveInteger;
};
type CompositeTargetBuffSpeedRatio = Extract<
  EffectAtom,
  { readonly kind: "set_speed_ratio" }
> & { readonly numerator: 2; readonly denominator: 1 };
type CompositeTargetBuffArmorClassBonus = Extract<
  EffectAtom,
  { readonly kind: "modify_ac" }
> & {
  readonly delta: {
    readonly kind: "fixed_number";
    readonly sign: "+";
    readonly amount: 2;
  };
};
type CompositeTargetBuffSavingThrowAdvantage = Extract<
  EffectAtom,
  { readonly kind: "modify_roll_advantage" }
> & { readonly mode: "advantage" };
type CompositeTargetBuffSpellEndTargetState = Extract<
  EffectAtom,
  { readonly kind: "effect_end_target_state" }
> & {
  readonly condition: "incapacitated";
  readonly duration: "end_of_target_next_turn";
  readonly speed: { readonly kind: "set_speed"; readonly feet: 0 };
};
type CompositeTargetBuffFacts = SpellProcedureMechanicsFacts & {
  readonly duration: CompositeTargetBuffDuration;
  readonly rangeFeet: MovementFeetValue;
  readonly speedRatio: { readonly numerator: 2; readonly denominator: 1 };
  readonly armorClassBonus: 2;
  readonly savingThrowAdvantage: {
    readonly ability: "dex";
    readonly mode: "advantage";
  };
  readonly actionRestriction: AttackOnceOrDashDisengageHideUtilizeActionRestriction;
  readonly spellEndTargetState: {
    readonly condition: "incapacitated";
  };
};

const COMPOSITE_TARGET_BUFF_SPELL_LEVEL = 3 satisfies SpellLevel;
const COMPOSITE_TARGET_BUFF_RANGE_FEET = movementFeet(30);
const COMPOSITE_TARGET_BUFF_DURATION_MINUTES_VALUE = 1;
type CompositeTargetBuffDurationMinutes = PositiveInteger &
  typeof COMPOSITE_TARGET_BUFF_DURATION_MINUTES_VALUE;
const COMPOSITE_TARGET_BUFF_DURATION_MINUTES = PositiveInteger(
  COMPOSITE_TARGET_BUFF_DURATION_MINUTES_VALUE,
);
const COMPOSITE_TARGET_BUFF_SPEED_NUMERATOR = 2;
const COMPOSITE_TARGET_BUFF_SPEED_DENOMINATOR = 1;
const COMPOSITE_TARGET_BUFF_ARMOR_CLASS_BONUS = 2;
const COMPOSITE_TARGET_BUFF_AFTERMATH_SPEED_FEET = movementFeet(0);
const COMPOSITE_TARGET_BUFF_EFFECT_KINDS = [
  "set_speed_ratio",
  "modify_ac",
  "modify_roll_advantage",
  "grant_extra_action",
  "effect_end_target_state",
] as const satisfies readonly EffectAtom["kind"][];

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- This module-private tuple is the canonical source for CompositeTargetBuffFailedFact.
const COMPOSITE_TARGET_BUFF_FAILED_FACTS = [
  "mechanics",
  "level",
  "school",
  "range",
  "components",
  "duration",
  "durationValue",
  "durationExtension",
  "durationEnding",
  "castingTime",
  "phaseCount",
  "phase",
  "attachment",
  "targetSelection",
  "effectCount",
  "speedRatio",
  "armorClassBonus",
  "savingThrowAdvantage",
  "actionRestriction",
  "spellEndTargetState",
] as const;
type CompositeTargetBuffFailedFact =
  (typeof COMPOSITE_TARGET_BUFF_FAILED_FACTS)[number];
type CompositeTargetBuffIssue = SpellProcedureAdmissionIssue<
  "compositeTargetBuffWithAftermath",
  CompositeTargetBuffFailedFact,
  UnitMechanicsPath
>;
type CompositeTargetBuffInspection = SpellProcedureMechanicsInspection<
  "compositeTargetBuffWithAftermath",
  CompositeTargetBuffFacts,
  CompositeTargetBuffWithAftermathSpellInvocation,
  CompositeTargetBuffIssue
>;

const ROOT_FIELDS = [
  "level",
  "school",
  "range",
  "components",
  "duration",
  "castingTime",
  "family",
  "phases",
] as const;
const RANGE_FIELDS = ["kind", "feet"] as const;
const COMPONENT_FIELDS = ["v", "s", "m"] as const;
const DURATION_FIELDS = ["kind", "upTo"] as const;
const DURATION_VALUE_FIELDS = ["amount", "unit"] as const;
const CASTING_TIME_FIELDS = ["kind"] as const;
const PHASE_FIELDS = ["kind", "attachment", "effects"] as const;
const TARGET_SELECTION_FIELDS = [
  "mode",
  "disposition",
  "targetKinds",
  "visibility",
] as const;

function compositeTargetBuffIssue(
  failedFact: CompositeTargetBuffFailedFact,
  mechanicsPath: UnitMechanicsPath,
): CompositeTargetBuffIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "compositeTargetBuffWithAftermath",
    failedFact,
    mechanicsPath,
    message: `Unsupported compositeTargetBuffWithAftermath mechanics fact: ${failedFact}.`,
  };
}

function compositeTargetBuffRepresentation(
  mechanics: SpellMechanics,
): mechanics is ActivationMechanics {
  return Match.value(mechanics).pipe(
    Match.when({ family: "activation" }, (activation) => {
      const phase = activation.phases.find(
        (candidate): candidate is DirectPhase => candidate.kind === "direct",
      );
      const effects = (phase?.effects ?? []).flatMap(
        (effect): readonly EffectAtom[] =>
          isEffectAtom(effect) ? [effect] : [],
      );
      const effectKinds = new Set(effects.map(({ kind }) => kind));
      return spellProcedureHasRedundantSignature({
        kind: "twoWitnessesMayBeMissing",
        witnesses: [
          {
            name: "definition",
            present:
              activation.level === COMPOSITE_TARGET_BUFF_SPELL_LEVEL &&
              activation.school === "transmutation",
          },
          {
            name: "castingEnvelope",
            present:
              activation.castingTime.kind === "action" &&
              activation.range.kind === "point" &&
              activation.range.feet === COMPOSITE_TARGET_BUFF_RANGE_FEET &&
              activation.duration.kind === "concentration",
          },
          {
            name: "target",
            present:
              phase?.attachment.kind === "hole" &&
              phase.attachment.value.kind === "target" &&
              phase.attachment.value.selection.mode === "one",
          },
          {
            name: "positiveEffects",
            present:
              effectKinds.has("set_speed_ratio") &&
              effectKinds.has("modify_ac") &&
              effectKinds.has("grant_extra_action"),
          },
          {
            name: "aftermath",
            present: effectKinds.has("effect_end_target_state"),
          },
        ],
      });
    }),
    Match.whenOr(
      { family: "ongoing_effect" },
      { family: "modal_ongoing_effect" },
      { family: "modal_activation" },
      { family: "triggered_reaction" },
      { family: "passive_hit_intercept" },
      { family: "anchored_trigger" },
      { family: "magic_circle_ward" },
      { family: "stone_merge" },
      { family: "glyph_warding" },
      { family: "spawned_creature" },
      { family: "reanimated_creature" },
      { family: "templated_multi_spawn" },
      { family: "object_repair" },
      { family: "minor_magic_effect_menu" },
      () => false,
    ),
    Match.exhaustive,
  );
}

function compositeTargetBuffDuration(
  duration: Duration,
): CompositeTargetBuffDuration | undefined {
  if (
    duration.kind !== "concentration" ||
    !spellMechanicsObjectHasOnlyKeys(duration, DURATION_FIELDS) ||
    !spellMechanicsObjectHasOnlyKeys(duration.upTo, DURATION_VALUE_FIELDS) ||
    !isSpellCanonicalDurationValue(duration.upTo) ||
    duration.upTo.unit !== "minute" ||
    !isCompositeTargetBuffDurationMinutes(duration.upTo.amount)
  )
    return undefined;
  return {
    kind: duration.kind,
    upTo: {
      amount: duration.upTo.amount,
      unit: duration.upTo.unit,
    },
  };
}

function isCompositeTargetBuffDurationMinutes(
  amount: PositiveInteger,
): amount is CompositeTargetBuffDurationMinutes {
  return amount === COMPOSITE_TARGET_BUFF_DURATION_MINUTES;
}

function isCompositeTargetBuffSpeedRatio(
  effect: Extract<EffectAtom, { readonly kind: "set_speed_ratio" }> | null,
): effect is CompositeTargetBuffSpeedRatio {
  return (
    effect?.numerator === COMPOSITE_TARGET_BUFF_SPEED_NUMERATOR &&
    effect.denominator === COMPOSITE_TARGET_BUFF_SPEED_DENOMINATOR &&
    spellMechanicsObjectHasOnlyKeys(effect, [
      "kind",
      "numerator",
      "denominator",
    ])
  );
}

function isCompositeTargetBuffArmorClassBonus(
  effect: Extract<EffectAtom, { readonly kind: "modify_ac" }> | null,
): effect is CompositeTargetBuffArmorClassBonus {
  return (
    effect?.delta.kind === "fixed_number" &&
    effect.delta.sign === "+" &&
    effect.delta.amount === COMPOSITE_TARGET_BUFF_ARMOR_CLASS_BONUS &&
    spellMechanicsObjectHasOnlyKeys(effect, ["kind", "delta"]) &&
    spellMechanicsObjectHasOnlyKeys(effect.delta, ["kind", "sign", "amount"])
  );
}

function isCompositeTargetBuffSavingThrowAdvantage(
  effect: Extract<
    EffectAtom,
    { readonly kind: "modify_roll_advantage" }
  > | null,
): effect is CompositeTargetBuffSavingThrowAdvantage {
  return (
    effect?.mode === "advantage" &&
    (effect.affects ?? "self_roll") === "self_roll" &&
    sameStringSet(effect.on, ["saving_throw"]) &&
    Array.isArray(effect.saveAbilityFilter) &&
    sameStringSet(effect.saveAbilityFilter, ["dex"]) &&
    spellMechanicsObjectHasOnlyKeys(effect, [
      "kind",
      "mode",
      "affects",
      "on",
      "saveAbilityFilter",
    ])
  );
}

function isCompositeTargetBuffSpellEndTargetState(
  effect: Extract<
    EffectAtom,
    { readonly kind: "effect_end_target_state" }
  > | null,
): effect is CompositeTargetBuffSpellEndTargetState {
  return (
    effect?.condition === "incapacitated" &&
    effect.duration === "end_of_target_next_turn" &&
    effect.speed.kind === "set_speed" &&
    effect.speed.feet === COMPOSITE_TARGET_BUFF_AFTERMATH_SPEED_FEET &&
    spellMechanicsObjectHasOnlyKeys(effect, [
      "kind",
      "condition",
      "duration",
      "speed",
    ]) &&
    spellMechanicsObjectHasOnlyKeys(effect.speed, ["kind", "feet"])
  );
}

function compositeTargetBuffEvidence(
  mechanics: ActivationMechanics,
  phaseOrdinal: PositiveInteger,
  effects: readonly CompositeTargetBuffEffectOccurrence[],
): SpellProcedureMechanicsEvidence {
  return {
    consumed: [
      spellMechanicsHeaderPath("level"),
      spellMechanicsHeaderPath("school"),
      spellMechanicsHeaderPath("range"),
      spellMechanicsHeaderPath("components"),
      spellMechanicsHeaderPath("duration"),
      spellMechanicsHeaderPath("castingTime"),
      spellMechanicsHeaderPath("family"),
      ...spellDurationEvidencePaths(mechanics.duration),
      ...spellConsumedMaterialEvidencePaths(mechanics.components),
      spellActivationPhasePath(phaseOrdinal),
      spellActivationAttachmentPath(phaseOrdinal),
      ...effects.map(({ authoredOrdinal }) =>
        spellActivationEffectPath(phaseOrdinal, authoredOrdinal),
      ),
    ],
    unowned: [],
  };
}

function admitCompositeTargetBuffMechanics(
  source: SpellMechanicsAdmissionSource,
): CompositeTargetBuffInspection {
  if (!compositeTargetBuffRepresentation(source.mechanics))
    return { tag: "notRepresented" };
  const mechanics = source.mechanics;
  const semanticIndex = mechanics.phases.findIndex(
    (candidate) =>
      candidate.kind === "direct" &&
      (candidate.effects ?? []).some(
        (effect) => effect.kind === "effect_end_target_state",
      ),
  );
  const directIndex = mechanics.phases.findIndex(
    (candidate) => candidate.kind === "direct",
  );
  const inspectedIndex =
    semanticIndex >= 0 ? semanticIndex : directIndex >= 0 ? directIndex : 0;
  const phaseOrdinal = PositiveInteger(inspectedIndex + 1);
  const candidatePhase = mechanics.phases[inspectedIndex];
  const phase = candidatePhase?.kind === "direct" ? candidatePhase : undefined;
  const authoredEffects = phase?.effects ?? [];
  const effects = authoredEffects.flatMap(
    (effect, index): readonly CompositeTargetBuffEffectOccurrence[] =>
      isEffectAtom(effect)
        ? [{ effect, authoredOrdinal: PositiveInteger(index + 1) }]
        : [],
  );
  const effectAtoms = effects.map(({ effect }) => effect);
  const effectPath = (kind: EffectAtom["kind"]): UnitMechanicsPath => {
    const occurrence = effects.find(({ effect }) => effect.kind === kind);
    return occurrence === undefined
      ? spellActivationPhasePath(phaseOrdinal)
      : spellActivationEffectPath(phaseOrdinal, occurrence.authoredOrdinal);
  };
  const speedRatio = onlyEffect(effectAtoms, "set_speed_ratio");
  const armorClassBonus = onlyEffect(effectAtoms, "modify_ac");
  const savingThrowAdvantage = onlyEffect(effectAtoms, "modify_roll_advantage");
  const extraAction = onlyEffect(effectAtoms, "grant_extra_action");
  const spellEndTargetState = onlyEffect(
    effectAtoms,
    "effect_end_target_state",
  );
  const actionRestriction = compositeTargetBuffActionRestriction(
    extraAction?.restriction,
  );
  const issues: Array<{
    readonly failedFact: CompositeTargetBuffFailedFact;
    readonly mechanicsPath: UnitMechanicsPath;
  }> = [];
  const push = (
    failedFact: CompositeTargetBuffFailedFact,
    mechanicsPath: UnitMechanicsPath,
  ): void => {
    issues.push({ failedFact, mechanicsPath });
  };

  if (!spellMechanicsObjectHasOnlyKeys(mechanics, ROOT_FIELDS))
    push("mechanics", spellMechanicsRootPath());
  if (mechanics.level !== COMPOSITE_TARGET_BUFF_SPELL_LEVEL)
    push("level", spellMechanicsHeaderPath("level"));
  if (mechanics.school !== "transmutation")
    push("school", spellMechanicsHeaderPath("school"));
  if (
    mechanics.range.kind !== "point" ||
    mechanics.range.feet !== COMPOSITE_TARGET_BUFF_RANGE_FEET ||
    !spellMechanicsObjectHasOnlyKeys(mechanics.range, RANGE_FIELDS)
  )
    push("range", spellMechanicsHeaderPath("range"));
  if (
    mechanics.components.v !== true ||
    mechanics.components.s !== true ||
    typeof mechanics.components.m !== "string" ||
    !spellMechanicsObjectHasOnlyKeys(mechanics.components, COMPONENT_FIELDS)
  )
    push("components", spellMechanicsHeaderPath("components"));
  for (const path of spellConsumedMaterialEvidencePaths(mechanics.components))
    push("components", path);

  const duration = compositeTargetBuffDuration(mechanics.duration);
  if (mechanics.duration.kind !== "concentration")
    push("duration", spellMechanicsHeaderPath("duration"));
  else {
    if (!spellMechanicsObjectHasOnlyKeys(mechanics.duration, DURATION_FIELDS))
      push("duration", spellMechanicsHeaderPath("duration"));
    if (
      !spellMechanicsObjectHasOnlyKeys(
        mechanics.duration.upTo,
        DURATION_VALUE_FIELDS,
      ) ||
      !isSpellCanonicalDurationValue(mechanics.duration.upTo) ||
      mechanics.duration.upTo.unit !== "minute" ||
      !isCompositeTargetBuffDurationMinutes(mechanics.duration.upTo.amount)
    )
      push("durationValue", spellDurationValuePath());
  }
  for (const child of spellDurationChildCoordinates(mechanics.duration))
    push(
      spellDurationChildFailedFact(child),
      Match.value(child).pipe(
        Match.when({ branch: "extension" }, ({ ordinal }) =>
          spellDurationExtensionPath(ordinal),
        ),
        Match.when({ branch: "ending" }, ({ ordinal }) =>
          spellDurationEndingPath(ordinal),
        ),
        Match.exhaustive,
      ),
    );
  if (
    mechanics.castingTime.kind !== "action" ||
    !spellMechanicsObjectHasOnlyKeys(mechanics.castingTime, CASTING_TIME_FIELDS)
  )
    push("castingTime", spellMechanicsHeaderPath("castingTime"));

  if (mechanics.phases.length === 0)
    push("phaseCount", spellActivationPhasePath(phaseOrdinal));
  for (const [index] of mechanics.phases.entries())
    if (index !== inspectedIndex)
      push("phaseCount", spellActivationPhasePath(PositiveInteger(index + 1)));
  if (phase === undefined)
    push("phase", spellActivationPhasePath(phaseOrdinal));
  else {
    if (!spellMechanicsObjectHasOnlyKeys(phase, PHASE_FIELDS))
      push("phase", spellActivationPhasePath(phaseOrdinal));
    const attachment = admitSpellTargetAttachment(
      phase.attachment,
      TARGET_SELECTION_FIELDS,
    );
    if (attachment.tag === "rejected")
      push("attachment", spellActivationAttachmentPath(phaseOrdinal));
    const selection =
      attachment.tag === "admitted"
        ? attachment.attachment.value.selection
        : phase.attachment.kind === "hole" &&
            phase.attachment.value.kind === "target"
          ? phase.attachment.value.selection
          : undefined;
    if (
      selection === undefined ||
      selection.mode !== "one" ||
      !("disposition" in selection) ||
      selection.disposition !== "willing" ||
      selection.targetKinds === undefined ||
      !sameStringSet(selection.targetKinds, ["creature"]) ||
      !("visibility" in selection) ||
      selection.visibility !== "caster_can_see"
    )
      push("targetSelection", spellActivationAttachmentPath(phaseOrdinal));
  }

  for (const occurrence of effects)
    if (
      !COMPOSITE_TARGET_BUFF_EFFECT_KINDS.some(
        (ownedKind) => ownedKind === occurrence.effect.kind,
      ) ||
      effects.filter(
        (candidate) => candidate.effect.kind === occurrence.effect.kind,
      ).length > 1
    )
      push(
        "effectCount",
        spellActivationEffectPath(phaseOrdinal, occurrence.authoredOrdinal),
      );
  for (const [index, effect] of authoredEffects.entries())
    if (!isEffectAtom(effect))
      push(
        "effectCount",
        spellActivationEffectPath(phaseOrdinal, PositiveInteger(index + 1)),
      );
  if (!isCompositeTargetBuffSpeedRatio(speedRatio))
    push("speedRatio", effectPath("set_speed_ratio"));
  if (!isCompositeTargetBuffArmorClassBonus(armorClassBonus))
    push("armorClassBonus", effectPath("modify_ac"));
  if (!isCompositeTargetBuffSavingThrowAdvantage(savingThrowAdvantage))
    push("savingThrowAdvantage", effectPath("modify_roll_advantage"));
  if (
    extraAction === null ||
    actionRestriction === undefined ||
    !spellMechanicsObjectHasOnlyKeys(extraAction, ["kind", "restriction"])
  )
    push("actionRestriction", effectPath("grant_extra_action"));
  if (!isCompositeTargetBuffSpellEndTargetState(spellEndTargetState))
    push("spellEndTargetState", effectPath("effect_end_target_state"));

  const nonEmpty = spellProcedureNonEmpty(spellUniqueMechanicsIssues(issues));
  if (nonEmpty !== undefined)
    return {
      tag: "unsupported",
      issues: spellProcedureMapNonEmpty(
        nonEmpty,
        ({ failedFact, mechanicsPath }) =>
          compositeTargetBuffIssue(failedFact, mechanicsPath),
      ),
    };
  if (
    duration === undefined ||
    phase === undefined ||
    !isCompositeTargetBuffSpeedRatio(speedRatio) ||
    !isCompositeTargetBuffArmorClassBonus(armorClassBonus) ||
    !isCompositeTargetBuffSavingThrowAdvantage(savingThrowAdvantage) ||
    extraAction === null ||
    !isCompositeTargetBuffSpellEndTargetState(spellEndTargetState) ||
    actionRestriction === undefined
  )
    return {
      tag: "unsupported",
      issues: [
        compositeTargetBuffIssue(
          duration === undefined ? "duration" : "phase",
          duration === undefined
            ? spellMechanicsHeaderPath("duration")
            : spellActivationPhasePath(phaseOrdinal),
        ),
      ],
    };
  const facts = {
    ...source.spellDefinitionRuleFacts,
    level: COMPOSITE_TARGET_BUFF_SPELL_LEVEL,
    duration,
    rangeFeet: COMPOSITE_TARGET_BUFF_RANGE_FEET,
    speedRatio: {
      numerator: speedRatio.numerator,
      denominator: speedRatio.denominator,
    },
    armorClassBonus: armorClassBonus.delta.amount,
    savingThrowAdvantage: { ability: "dex", mode: savingThrowAdvantage.mode },
    actionRestriction,
    spellEndTargetState: {
      condition: spellEndTargetState.condition,
    },
  } satisfies CompositeTargetBuffFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "compositeTargetBuffWithAftermath",
      facts,
      evidence: compositeTargetBuffEvidence(mechanics, phaseOrdinal, effects),
      admit: (executionSource, context) =>
        admitCompositeTargetBuffWithAftermath(executionSource, context, facts),
    },
  };
}

function compositeTargetBuffActionRestriction(
  restriction: ActionRestriction | undefined,
): AttackOnceOrDashDisengageHideUtilizeActionRestriction | undefined {
  if (
    !isAttackOnceOrDashDisengageHideUtilizeActionRestriction(restriction) ||
    restriction === undefined ||
    restriction.kind !== "allow_only" ||
    !spellMechanicsObjectHasOnlyKeys(restriction, ["kind", "actions"]) ||
    !restriction.actions.every((allowed) =>
      allowed.action === "attack"
        ? "attackLimit" in allowed &&
          spellMechanicsObjectHasOnlyKeys(allowed, ["action", "attackLimit"]) &&
          spellMechanicsObjectHasOnlyKeys(allowed.attackLimit, [
            "kind",
            "count",
          ])
        : spellMechanicsObjectHasOnlyKeys(allowed, ["action"]),
    )
  )
    return undefined;
  return ATTACK_ONCE_OR_DASH_DISENGAGE_HIDE_UTILIZE_ACTION_RESTRICTION;
}

function admitCompositeTargetBuffWithAftermath(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: CompositeTargetBuffFacts,
): readonly CompositeTargetBuffWithAftermathSpellInvocation[] {
  const actorId = ctx.actor.combatantId;
  const expiresAt = {
    kind: "concentration" as const,
    combatantId: actorId,
    durationTicks: spellDurationTicksFromCanonicalValue(facts.duration.upTo),
  };
  return ctx.spellCastOptions.flatMap(
    (slot): readonly CompositeTargetBuffWithAftermathSpellInvocation[] =>
      Number(slot.spellLevel) < facts.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              procedure: "compositeTargetBuffWithAftermath",
              spell,
              actionCost: "magicAction",
              targeting: {
                kind: "targetList",
                minTargets: 1,
                maxTargets: 1,
                requiredTargetDisposition: "willing",
              },
              activeEffects: {
                speedRatio: {
                  kind: "speedRatio",
                  sourceCombatantId: actorId,
                  ...facts.speedRatio,
                  expiresAt,
                },
                armorClassBonus: {
                  kind: "spellArmorClassBonus",
                  sourceCombatantId: actorId,
                  bonus: facts.armorClassBonus,
                  negatesRepeatedDamageAllocation: false,
                  expiresAt,
                },
                dexteritySavingThrowAdvantage: {
                  kind: "savingThrowRollMode",
                  sourceCombatantId: actorId,
                  ability: facts.savingThrowAdvantage.ability,
                  mode: facts.savingThrowAdvantage.mode,
                  expiresAt,
                },
                grantedActionResource: {
                  kind: "spellGrantedActionResource",
                  sourceCombatantId: actorId,
                  restriction: facts.actionRestriction,
                  expiresAt,
                },
                spellEndTargetState: {
                  kind: "spellEndTargetState",
                  sourceCombatantId: actorId,
                  condition: facts.spellEndTargetState.condition,
                  expiresAt,
                },
              },
              rangeFeet: facts.rangeFeet,
            },
          ],
  );
}

function onlyEffect<K extends EffectAtom["kind"]>(
  effects: readonly EffectAtom[],
  kind: K,
): Extract<EffectAtom, { readonly kind: K }> | null {
  const matches = effects.filter(
    (effect): effect is Extract<EffectAtom, { readonly kind: K }> =>
      effect.kind === kind,
  );
  return matches.length === 1 ? matches[0] : null;
}

function discoverCompositeTargetBuffWithAftermathCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<CompositeTargetBuffWithAftermathSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  return actionSpellCastCandidatesForTargetHole(
    actorId,
    invocation.sourceProcedureRef,
    targetHole,
  );
}

function resolveCompositeTargetBuffWithAftermath(
  input: SpellProcedureProfileResolveInput<CompositeTargetBuffWithAftermathSpellInvocation>,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (hasNonCompositeTargetBuffWithAftermathFill(input.fillSet)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "positive turn-speed effect positive effects use one target fill.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const targetSelectionResolution = spellSelectionResolution(
    input.input.state,
    input.input.subject,
    compositeTargetBuffWithAftermathTargetSelection(input),
  );
  if (targetSelectionResolution.tag === "resolution")
    return targetSelectionResolution.result;
  const targetSelection = targetSelectionResolution.selection;

  return resolveSpellActiveEffectCast({
    resolution: input,
    targetIds: targetSelection.targetIds,
    castingResource: { kind: "magicAction" },
    applyEffect: (state) =>
      applyCompositeTargetBuffWithAftermathEffects(
        state,
        input.actorId,
        targetSelection.targetIds,
        input.invocation,
      ),
    finalizeState: (state) =>
      battleStateWithCurrentActorSpellGrantedActionResourcesForTargets(
        state,
        targetSelection.targetIds,
      ),
  });
}

function hasNonCompositeTargetBuffWithAftermathFill(
  fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>,
): boolean {
  return (
    fillSet.objectTarget !== undefined ||
    fillSet.attackRoll !== undefined ||
    fillSet.targetAllocation !== undefined ||
    fillSet.attackSequencePartFills.length > 0 ||
    fillSet.damageRoll !== undefined ||
    fillSet.attackBurstDamageRoll !== undefined ||
    fillSet.healingRoll !== undefined ||
    fillSet.skillChoice !== undefined ||
    fillSet.targetAbilityChoices !== undefined ||
    fillSet.abilityChoice !== undefined ||
    fillSet.conditionChoice !== undefined ||
    fillSet.compelledBehaviorOptionChoice !== undefined ||
    fillSet.areaChoice !== undefined ||
    fillSet.teleportDestination !== undefined ||
    fillSet.movableLightPlacement !== undefined ||
    fillSet.damageTypeChoice !== undefined ||
    fillSet.savingThrowOutcomes !== undefined ||
    fillSet.movement !== undefined ||
    fillSet.temporaryAbilityCheckRollModeActiveEffectCount !== undefined ||
    fillSet.saveGatedConditionWithRepeatDamageRepeatSaves.length > 0 ||
    fillSet.damageDispositions.length > 0 ||
    fillSet.concentrationSavingThrows.length > 0 ||
    fillSet.spellDamageReductionRolls.length > 0
  );
}

function compositeTargetBuffWithAftermathTargetSelection(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation<CompositeTargetBuffWithAftermathSpellInvocation>;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): SpellSingleTargetSelection {
  return spellSingleTargetSelection({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
    targetListMessage: "Composite target buff requires one target choice.",
    invalidTargetMessage:
      "Composite target buff requires a known willing combatant the caster can see within the spell's supported range.",
  });
}

function applyCompositeTargetBuffWithAftermathEffects(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: BattleExecutableSpellInvocation<CompositeTargetBuffWithAftermathSpellInvocation>,
): BattleState {
  return targetIds.reduce(
    (nextState, targetId) =>
      replaceAllocatedTargetSpellActiveEffects(
        nextState,
        targetId,
        (effect) =>
          isCompositeTargetBuffWithAftermathActiveEffect(effect) &&
          effect.sourceProcedureRef === invocation.sourceProcedureRef &&
          effect.sourceCombatantId === actorId,
        compositeTargetBuffWithAftermathEffectTemplates(invocation, actorId),
      ),
    state,
  );
}

type CompositeTargetBuffWithAftermathActiveEffect = Extract<
  BattleActiveEffect,
  {
    readonly kind:
      | "speedRatio"
      | "spellArmorClassBonus"
      | "savingThrowRollMode"
      | "spellGrantedActionResource"
      | "spellEndTargetState";
  }
>;

function compositeTargetBuffWithAftermathEffectTemplates(
  invocation: BattleExecutableSpellInvocation<CompositeTargetBuffWithAftermathSpellInvocation>,
  actorId: CombatantId,
): BattleSourcedEffectOccurrenceTemplateList {
  return [
    {
      ...invocation.activeEffects.speedRatio,
      sourceProcedureRef: invocation.sourceProcedureRef,
      sourceCombatantId: actorId,
    },
    {
      ...invocation.activeEffects.armorClassBonus,
      sourceProcedureRef: invocation.sourceProcedureRef,
      sourceCombatantId: actorId,
    },
    {
      ...invocation.activeEffects.dexteritySavingThrowAdvantage,
      sourceProcedureRef: invocation.sourceProcedureRef,
      sourceCombatantId: actorId,
    },
    {
      ...invocation.activeEffects.grantedActionResource,
      sourceProcedureRef: invocation.sourceProcedureRef,
      sourceCombatantId: actorId,
    },
    {
      ...invocation.activeEffects.spellEndTargetState,
      sourceProcedureRef: invocation.sourceProcedureRef,
      sourceCombatantId: actorId,
    },
  ];
}

function isCompositeTargetBuffWithAftermathActiveEffect(
  effect: BattleActiveEffect,
): effect is CompositeTargetBuffWithAftermathActiveEffect {
  return (
    effect.kind === "speedRatio" ||
    effect.kind === "spellArmorClassBonus" ||
    effect.kind === "savingThrowRollMode" ||
    effect.kind === "spellGrantedActionResource" ||
    effect.kind === "spellEndTargetState"
  );
}

const CompositeTargetBuffWithAftermathInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("compositeTargetBuffWithAftermath"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("magicAction"),
      targeting: Schema.Struct({
        kind: Schema.Literal("targetList"),
        minTargets: Schema.Literal(1),
        maxTargets: Schema.Literal(1),
        requiredTargetDisposition: Schema.Literal("willing"),
      }),
      activeEffects: Schema.Struct({
        speedRatio: Schema.Struct({
          ...BattleEffectOccurrenceTemplateSchemaFields,
          kind: Schema.Literal("speedRatio"),
          sourceCombatantId: CombatantId,
          numerator: Schema.Number,
          denominator: Schema.Number,
          expiresAt: CompositeTargetBuffWithAftermathExpirationSchema,
        }),
        armorClassBonus: Schema.Struct({
          ...BattleEffectOccurrenceTemplateSchemaFields,
          kind: Schema.Literal("spellArmorClassBonus"),
          sourceCombatantId: CombatantId,
          bonus: Schema.Number,
          negatesRepeatedDamageAllocation: Schema.Literal(false),
          expiresAt: CompositeTargetBuffWithAftermathExpirationSchema,
        }),
        dexteritySavingThrowAdvantage: Schema.Struct({
          ...BattleEffectOccurrenceTemplateSchemaFields,
          kind: Schema.Literal("savingThrowRollMode"),
          sourceCombatantId: CombatantId,
          ability: Schema.Literal("dex"),
          mode: Schema.Literal("advantage"),
          expiresAt: CompositeTargetBuffWithAftermathExpirationSchema,
        }),
        grantedActionResource: Schema.Struct({
          ...BattleEffectOccurrenceTemplateSchemaFields,
          kind: Schema.Literal("spellGrantedActionResource"),
          sourceCombatantId: CombatantId,
          restriction:
            AttackOnceOrDashDisengageHideUtilizeActionRestrictionSchema,
          expiresAt: CompositeTargetBuffWithAftermathExpirationSchema,
        }),
        spellEndTargetState: Schema.Struct({
          ...BattleEffectOccurrenceTemplateSchemaFields,
          kind: Schema.Literal("spellEndTargetState"),
          sourceCombatantId: CombatantId,
          condition: Schema.Literal("incapacitated"),
          expiresAt: CompositeTargetBuffWithAftermathExpirationSchema,
        }),
      }),
      rangeFeet: MovementFeet,
    }),
  );

export const compositeTargetBuffWithAftermathProfile = {
  procedure: "compositeTargetBuffWithAftermath",
  executionSchema: CompositeTargetBuffWithAftermathInvocationSchema,
  admitMechanics: admitCompositeTargetBuffMechanics,
  discoverCastAct: discoverCompositeTargetBuffWithAftermathCastAct,
  resolve: resolveCompositeTargetBuffWithAftermath,
} satisfies SpellProcedureDeclaration<
  "compositeTargetBuffWithAftermath",
  CompositeTargetBuffWithAftermathSpellInvocation,
  CompositeTargetBuffFacts,
  CompositeTargetBuffIssue
>;
import { spellInvocationResourceForCastOption } from "./profile.ts";
