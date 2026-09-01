import { optionalProperty } from "../../optional-property.ts";
import {
  completeSpellActiveEffectCast,
  maybeOpenConfiguredSpellCastReactionWindow,
} from "../spell-active-effect-resolution.ts";
import type { BattleSpellExecutionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-roll-modifier
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-glyph-stored-concentration-full-duration
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS
//
// The rollModifier Spell Procedure Profile: SRD spells (Bless, Bane, Guidance,
// Resistance, Shield of Faith and similar) that grant a persistent d20-roll
// modifier or a roll-mode rider on one or more targets, with either cantrip
// access (Guidance, Resistance) or prepared+slot access (Bless, Bane).
//
// What lives here (the public face of the profile):
//   - admit()           — combines cantrip and prepared admission. Was
//                         supportedCantripRollModifierSpellProfile and
//                         supportedPreparedRollModifierSpellProfile in
//                         spells-profiles-support.ts.
//   - resolve()         — was resolveRollModifierSpellAct in
//                         spells-resolve-support-effects.ts.
//   - applyEffect       — both same-effect-for-targets and per-target
//                         variants. Were applyRollModifierSpellEffect and
//                         applyRollModifierSpellEffectsByTarget in
//                         spells-active-effects.ts.
//   - discoverCastAct() — was the rollModifier branch in
//                         spells-discovery.ts:discoverBattleActs.
//   - castSummary()     — was the rollModifier branch in
//                         spellInvocationCastSummary.
//
// What stays in shared infrastructure files (imported back here):
//   - rollModifierSpellProjection + projection sub-helpers
//     (rollModifierActiveEffect, rollModifierAbilityCheckRollModeEffect,
//     rollModifierSpellTargeting, rollModifierSkillFilter) — entangled with
//     scalarBuff and temporaryAbilityCheckRollMode; full extraction is a separate
//     sweep.
//   - rollModifierSpellTargetSelection / EffectSelection / AffectedTargets —
//     ~400 lines in spells-resolve-target-selection.ts. Moveable later.
//   - Hole builders (spellRollModifierSkillChoiceHole etc.) in
//     spells-damage-fills.ts — moveable later when the hole subsystem migrates.
//   - The metamagic table entry — same migration story as damageReduction.

import {
  movementFeet,
  PositiveInteger,
  spellSlotLevel,
  type MovementFeet as MovementFeetType,
  type SpellSlotLevel,
} from "@dnd/shared/types";
import type {
  Ability,
  Attachment,
  DcSource,
  EffectAtom,
  Skill,
  SpellMechanics,
} from "@dnd/surface/surface/types";
import type {
  CantripSpellAccess,
  LeveledSpellInvocationResource,
  PreparedSpellAccess,
  NoSpellInvocationResource,
} from "../../procedure-execution/spell-invocation-vocabulary.ts";

import { BattleProcedureExecutionRef, CombatantId } from "../../identity.ts";
import { allocateBattleEffectOccurrenceForCreature } from "../../effect-execution-ref.ts";
import { BattleActiveEffectExpirationSchema } from "../../active-effect/codecs.ts";
import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type SelectedRollModifierSpellEffect,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";

import { spellSelectionResolution } from "../needs-holes-result.ts";
import { invalidResult } from "../result-helpers.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { ATTACK_TARGET_HOLE_ID } from "../battle-runtime-protocol.ts";
import {
  rollModifierUsesTargetAbilityChoices,
  spellRollModifierAbilityChoiceHole,
  spellRollModifierAbilityChoiceHoleId,
  spellRollModifierSkillChoiceHole,
  spellRollModifierSkillChoiceHoleId,
  spellRollModifierTargetAbilityChoicesHole,
  spellRollModifierTargetAbilityChoicesHoleId,
} from "../spells-damage-fills.ts";
import { spellSavingThrowOutcomeHoleId } from "../spells-damage-fills.ts";
import { targetListSpellUsesTargetListHole } from "../spells-discovery.ts";
import {
  rollModifierDelta,
  rollModifierKindsAreSupported,
  rollModifierSkillFilter,
  rollModifierSpellTargeting,
  scalarBuffActiveEffectExpiration,
  scalarBuffSpellRangeFeet,
} from "../spells-profiles-support.ts";
import { sameStringSet } from "../spells-execution-facts.ts";
import {
  rollModifierSpellAffectedTargets,
  rollModifierSpellEffectSelection,
  rollModifierSpellTargetSelection,
} from "../spells-resolve-target-selection.ts";
import {
  spellTargetHole,
  spellTargetListHole,
  spellTargetListHoleId,
} from "../spells-targeting.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { cantripSpellAccessFor } from "./profile.ts";
import { Schema } from "effect";
import { BattleEffectOccurrenceTemplateSchemaFields } from "../../active-effect/template-codec.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  BATTLE_SURFACE_ABILITIES,
  BATTLE_SURFACE_SKILLS,
  CantripSpellAccessSchema,
  MovementFeet,
  NoSpellInvocationResourceSchema,
  PreparedSpellAccessSchema,
  RollModifierSpellSaveGateSchema,
  RollModifierSpellTargetingSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import {
  BATTLE_D20_ROLL_MODIFIER_DIE_SIZES,
  BATTLE_D20_ROLL_MODIFIER_KINDS,
} from "../domain-constants.ts";
import {
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
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  spellOngoingAttachmentPath,
  spellOngoingInitialPhasePath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import { persistentAreaDurationChildPaths } from "./persistent-area-save-evidence.ts";

const D20RollModifierEffectSchema = Schema.Struct({
  ...BattleEffectOccurrenceTemplateSchemaFields,
  kind: Schema.Literal("d20RollModifier"),
  sourceCombatantId: CombatantId,
  on: Schema.Array(Schema.Literals(BATTLE_D20_ROLL_MODIFIER_KINDS)),
  delta: Schema.Union([
    Schema.Struct({
      kind: Schema.Literal("fixedNumber"),
      amount: Schema.Number,
      sign: Schema.Literals(["+", "-"]),
    }),
    Schema.Struct({
      dice: Schema.Number,
      dieSize: Schema.Literals(BATTLE_D20_ROLL_MODIFIER_DIE_SIZES),
      sign: Schema.Literals(["+", "-"]),
    }),
  ]),
  skill: Schema.NullOr(Schema.Literals(BATTLE_SURFACE_SKILLS)),
  expiresAt: BattleActiveEffectExpirationSchema,
});

const AbilityCheckRollModeEffectSchema = Schema.Struct({
  ...BattleEffectOccurrenceTemplateSchemaFields,
  kind: Schema.Literal("abilityCheckRollMode"),
  sourceCombatantId: CombatantId,
  mode: Schema.Literal("advantage"),
  expiresAt: BattleActiveEffectExpirationSchema,
});

type RollModifierInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "rollModifier" }
>;
type RollModifierResolveInput =
  SpellProcedureProfileResolveInput<RollModifierInvocation>;
type RollModifierD20Effect = Extract<
  RollModifierInvocation["effect"],
  { readonly kind: "d20RollModifier" }
>;
type RollModifierAbilityCheckModeEffect = Extract<
  RollModifierInvocation["effect"],
  { readonly kind: "abilityCheckRollMode" }
>;
type RollModifierMechanics =
  | Extract<SpellMechanics, { readonly family: "ongoing_effect" }>
  | Extract<SpellMechanics, { readonly family: "activation" }>;

type RollModifierNumericEffect = Extract<
  EffectAtom,
  { readonly kind: "modify_roll_numeric" }
>;
type RollModifierAbilityCheckEffect = Extract<
  EffectAtom,
  { readonly kind: "modify_roll_advantage" }
>;
type RollModifierProfileShape =
  | {
      readonly kind: "numeric";
      readonly attachment: Attachment;
      readonly effect: RollModifierNumericEffect;
      readonly saveGate: {
        readonly ability: Ability;
        readonly dc: DcSource;
      } | null;
      readonly rangeRadiusFeet: MovementFeetType | null;
    }
  | {
      readonly kind: "abilityCheck";
      readonly attachment: Attachment;
      readonly effect: RollModifierAbilityCheckEffect;
      readonly saveGate: null;
      readonly rangeRadiusFeet: MovementFeetType | null;
    };
type RollModifierMechanicsFacts = SpellProcedureMechanicsFacts &
  RollModifierProfileShape;
type RollModifierFailedFact =
  | "castingTime"
  | "range"
  | "duration"
  | "durationExtension"
  | "durationEnding"
  | "initialPhase"
  | "phaseCount"
  | "attachment"
  | "saveGate"
  | "operation"
  | "operationCount"
  | "effect"
  | "weaponFilter"
  | "abilityFilter"
  | "count";
type RollModifierAdmissionIssue = SpellProcedureAdmissionIssue<
  "rollModifier",
  RollModifierFailedFact,
  SpellMechanicsBranchPath
>;

type RollModifierOperationOccurrence = {
  readonly operation: Extract<
    SpellMechanics,
    { readonly family: "ongoing_effect" }
  >["operations"][number];
  readonly ordinal: PositiveInteger;
};

type RollModifierSaveGateOccurrence = {
  readonly phase: Extract<
    SpellMechanics,
    { readonly family: "activation" }
  >["phases"][number] & { readonly kind: "save_gate" };
  readonly ordinal: PositiveInteger;
};

function rollModifierOperationOccurrences(
  mechanics: Extract<SpellMechanics, { readonly family: "ongoing_effect" }>,
): readonly RollModifierOperationOccurrence[] {
  return mechanics.operations.map((operation, index) => ({
    operation,
    ordinal: PositiveInteger(index + 1),
  }));
}

function rollModifierOperationEffectPath(
  occurrence: RollModifierOperationOccurrence | undefined,
): SpellMechanicsBranchPath {
  return spellOngoingOperationEffectPath(
    occurrence?.ordinal ?? PositiveInteger(1),
  );
}

function rollModifierSaveGateOccurrences(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): readonly RollModifierSaveGateOccurrence[] {
  return mechanics.phases.flatMap((phase, index) =>
    phase.kind === "save_gate"
      ? [
          {
            phase,
            ordinal: PositiveInteger(index + 1),
          },
        ]
      : [],
  );
}

function rollModifierSupportedSaveGateOccurrence(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): RollModifierSaveGateOccurrence | undefined {
  return rollModifierSaveGateOccurrences(mechanics).find(
    ({ phase }) =>
      phase.usageLimit === undefined &&
      phase.onFail.kind === "modify_roll_numeric" &&
      rollModifierNumericEffectShapeProjection(phase.onFail),
  );
}

function rollModifierRangeRadius(
  range: SpellMechanics["range"],
  attachment: Attachment,
): MovementFeetType | null {
  if (
    range.kind === "self" &&
    attachment.kind === "area" &&
    attachment.origin.kind === "self" &&
    attachment.shape.kind === "emanation" &&
    typeof attachment.shape.radiusFeet === "number"
  ) {
    return movementFeet(attachment.shape.radiusFeet);
  }
  return null;
}

function isRollModifierRepresentation(
  mechanics: SpellMechanics,
): mechanics is RollModifierMechanics {
  if (mechanics.family === "ongoing_effect") {
    const hasRollEffect = mechanics.operations.some(
      ({ effect, predicate, targetLimit, usageLimit }) =>
        predicate === undefined &&
        targetLimit === undefined &&
        usageLimit === undefined &&
        (effect.kind === "modify_roll_numeric" ||
          effect.kind === "modify_roll_advantage") &&
        (effect.kind !== "modify_roll_numeric" ||
          rollModifierNumericEffectShapeProjection(effect)) &&
        (effect.kind !== "modify_roll_advantage" ||
          rollModifierAbilityCheckEffectProjection(effect)),
    );
    if (!hasRollEffect) return false;
    return spellProcedureHasRedundantSignature({
      kind: "twoWitnessesMayBeMissing",
      witnesses: [
        mechanics.castingTime.kind === "action",
        mechanics.range.kind === "self" ||
          mechanics.range.kind === "point" ||
          mechanics.range.kind === "touch",
        mechanics.attachment.kind === "hole" ||
          mechanics.attachment.kind === "area",
        hasRollEffect,
        mechanics.operations.some(({ trigger }) => trigger.kind === "passive"),
      ],
    });
  }
  if (mechanics.family === "activation") {
    const hasRollPhase = mechanics.phases.some(
      (phase) =>
        phase.kind === "save_gate" &&
        phase.onFail.kind === "modify_roll_numeric" &&
        phase.usageLimit === undefined &&
        rollModifierNumericEffectShapeProjection(phase.onFail),
    );
    if (!hasRollPhase) return false;
    return spellProcedureHasRedundantSignature({
      kind: "twoWitnessesMayBeMissing",
      witnesses: [
        mechanics.castingTime.kind === "action",
        mechanics.range.kind === "point" ||
          mechanics.range.kind === "self" ||
          mechanics.range.kind === "touch",
        mechanics.phases.length > 0,
        hasRollPhase,
        mechanics.phases.some(
          (phase) => "attachment" in phase && phase.attachment.kind === "hole",
        ),
      ],
    });
  }
  return false;
}

function rollModifierIssue(
  failedFact: RollModifierFailedFact,
  mechanicsPath: SpellMechanicsBranchPath,
): RollModifierAdmissionIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "rollModifier",
    failedFact,
    mechanicsPath,
    message: `Unsupported rollModifier mechanics fact: ${failedFact}.`,
  };
}

function rollModifierNumericEffectProjection(
  effect: RollModifierNumericEffect,
): boolean {
  return (
    rollModifierNumericEffectShapeProjection(effect) &&
    effect.weaponFilter === undefined &&
    effect.abilityFilter === undefined &&
    effect.count === undefined
  );
}

function rollModifierNumericEffectShapeProjection(
  effect: RollModifierNumericEffect,
): boolean {
  return (
    rollModifierDelta(effect.delta) !== null &&
    rollModifierKindsAreSupported(effect.on) &&
    rollModifierSkillFilter(effect.skillFilter) !== null
  );
}

function rollModifierNumericEffectConstraintIssues(
  effect: RollModifierNumericEffect,
): readonly RollModifierFailedFact[] {
  const issues: RollModifierFailedFact[] = [];
  if (effect.weaponFilter !== undefined) issues.push("weaponFilter");
  if (effect.abilityFilter !== undefined) issues.push("abilityFilter");
  if (effect.count !== undefined) issues.push("count");
  return issues;
}

function rollModifierAbilityCheckEffectProjection(
  effect: RollModifierAbilityCheckEffect,
): boolean {
  const hasChoice = rollModifierAbilityChoiceFilter(effect) !== undefined;
  return (
    (effect.affects ?? "self_roll") === "self_roll" &&
    effect.mode === "advantage" &&
    sameStringSet(effect.on, ["ability_check"]) &&
    effect.skillFilter === undefined &&
    effect.conditionFilter === undefined &&
    effect.saveAbilityFilter === undefined &&
    effect.saveSourceFilter === undefined &&
    effect.contextRangeFeet === undefined &&
    effect.spellSourceFilter === undefined &&
    effect.attackerTypeFilter === undefined &&
    effect.count === undefined &&
    effect.expiresOn === undefined &&
    hasChoice
  );
}

function rollModifierAbilityChoiceFilter(
  effect: RollModifierAbilityCheckEffect,
) {
  const abilityFilter = effect.abilityFilter;
  if (
    typeof abilityFilter !== "object" ||
    abilityFilter === null ||
    !("kind" in abilityFilter) ||
    (abilityFilter.kind !== "hole" &&
      abilityFilter.kind !== "per_target_hole") ||
    !("value" in abilityFilter) ||
    abilityFilter.value.kind !== "choice"
  ) {
    return undefined;
  }
  return abilityFilter;
}

function rollModifierMechanicsAdmission(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "rollModifier",
  RollModifierMechanicsFacts,
  RollModifierInvocation,
  RollModifierAdmissionIssue
> {
  if (!isRollModifierRepresentation(source.mechanics)) {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
  const issues: Array<{
    readonly failedFact: RollModifierFailedFact;
    readonly mechanicsPath: SpellMechanicsBranchPath;
  }> = [];
  const pushIssue = (
    failedFact: RollModifierFailedFact,
    mechanicsPath: SpellMechanicsBranchPath,
  ): void => {
    issues.push({ failedFact, mechanicsPath });
  };
  if (mechanics.castingTime.kind !== "action") {
    pushIssue("castingTime", spellMechanicsHeaderPath("castingTime"));
  }
  if (
    mechanics.duration.kind !== "timed" &&
    mechanics.duration.kind !== "concentration"
  ) {
    pushIssue("duration", spellDurationValuePath());
  }
  for (const mechanicsPath of persistentAreaDurationChildPaths(
    mechanics.duration,
  )) {
    const branch = mechanicsPath.nodes.at(-1);
    pushIssue(
      branch?.role === "extension" ? "durationExtension" : "durationEnding",
      mechanicsPath,
    );
  }

  let shape: RollModifierProfileShape | undefined;
  if (mechanics.family === "ongoing_effect") {
    if (mechanics.initialPhase !== undefined) {
      pushIssue("initialPhase", spellOngoingInitialPhasePath());
    }
    const occurrences = rollModifierOperationOccurrences(mechanics);
    const expected = occurrences.find(
      ({ operation }) =>
        operation.trigger.kind === "passive" &&
        (operation.effect.kind === "modify_roll_numeric" ||
          operation.effect.kind === "modify_roll_advantage"),
    );
    const extras = occurrences.filter(
      ({ ordinal }) => ordinal !== expected?.ordinal,
    );
    if (mechanics.operations.length !== 1 && extras.length === 0) {
      pushIssue(
        "operationCount",
        spellOngoingOperationPath(
          PositiveInteger(mechanics.operations.length + 1),
        ),
      );
    }
    for (const occurrence of extras) {
      pushIssue(
        "operationCount",
        spellOngoingOperationPath(occurrence.ordinal),
      );
    }
    if (
      expected === undefined ||
      expected.operation.trigger.kind !== "passive"
    ) {
      pushIssue("operation", rollModifierOperationEffectPath(expected));
    }
    const effect =
      expected?.operation.effect.kind === "modify_roll_numeric" ||
      expected?.operation.effect.kind === "modify_roll_advantage"
        ? expected.operation.effect
        : undefined;
    if (effect === undefined) {
      pushIssue("effect", rollModifierOperationEffectPath(expected));
    } else if (
      effect.kind === "modify_roll_numeric" &&
      rollModifierNumericEffectProjection(effect)
    ) {
      shape = {
        kind: "numeric",
        attachment: mechanics.attachment,
        effect,
        saveGate: null,
        rangeRadiusFeet: rollModifierRangeRadius(
          mechanics.range,
          mechanics.attachment,
        ),
      };
    } else if (effect.kind === "modify_roll_numeric") {
      for (const failedFact of rollModifierNumericEffectConstraintIssues(
        effect,
      )) {
        pushIssue(failedFact, rollModifierOperationEffectPath(expected));
      }
      if (!rollModifierNumericEffectShapeProjection(effect)) {
        pushIssue("effect", rollModifierOperationEffectPath(expected));
      }
    } else if (
      effect.kind === "modify_roll_advantage" &&
      rollModifierAbilityCheckEffectProjection(effect)
    ) {
      shape = {
        kind: "abilityCheck",
        attachment: mechanics.attachment,
        effect,
        saveGate: null,
        rangeRadiusFeet: rollModifierRangeRadius(
          mechanics.range,
          mechanics.attachment,
        ),
      };
    } else {
      pushIssue("effect", rollModifierOperationEffectPath(expected));
    }
    if (
      mechanics.attachment.kind !== "hole" &&
      mechanics.attachment.kind !== "area"
    ) {
      pushIssue("attachment", spellOngoingAttachmentPath());
    }
    const rangeRadiusFeet = rollModifierRangeRadius(
      mechanics.range,
      mechanics.attachment,
    );
    if (
      rangeRadiusFeet === null &&
      scalarBuffSpellRangeFeet(mechanics.range) === null
    ) {
      pushIssue("range", spellMechanicsHeaderPath("range"));
    }
  } else {
    const expected = rollModifierSupportedSaveGateOccurrence(mechanics);
    const fallbackPhaseIndex = mechanics.phases.findIndex(
      (phase) => phase.kind === "save_gate",
    );
    const phaseIndex = expected
      ? Number(expected.ordinal) - 1
      : fallbackPhaseIndex;
    const phaseOrdinal = PositiveInteger(phaseIndex < 0 ? 1 : phaseIndex + 1);
    const phase = phaseIndex < 0 ? undefined : mechanics.phases[phaseIndex];
    if (mechanics.phases.length !== 1 || phaseIndex !== 0) {
      for (const [index] of mechanics.phases.entries()) {
        if (index === phaseIndex) continue;
        pushIssue(
          "phaseCount",
          spellActivationPhasePath(PositiveInteger(index + 1)),
        );
      }
      if (mechanics.phases.length === 0) {
        pushIssue("phaseCount", spellActivationPhasePath(PositiveInteger(1)));
      }
    }
    if (phase?.kind !== "save_gate") {
      pushIssue("saveGate", spellActivationPhasePath(phaseOrdinal));
    }
    if (phase?.kind === "save_gate") {
      if (
        phase.attachment.kind !== "hole" &&
        phase.attachment.kind !== "area"
      ) {
        pushIssue("attachment", spellActivationAttachmentPath(phaseOrdinal));
      }
      if (phase.onSuccess.kind !== "none") {
        pushIssue(
          "saveGate",
          spellActivationEffectPath(phaseOrdinal, PositiveInteger(1)),
        );
      }
      if (phase.onFail.kind !== "modify_roll_numeric") {
        pushIssue(
          "effect",
          spellActivationEffectPath(phaseOrdinal, PositiveInteger(1)),
        );
      } else {
        for (const failedFact of rollModifierNumericEffectConstraintIssues(
          phase.onFail,
        )) {
          pushIssue(
            failedFact,
            spellActivationEffectPath(phaseOrdinal, PositiveInteger(1)),
          );
        }
        if (!rollModifierNumericEffectProjection(phase.onFail)) {
          if (!rollModifierNumericEffectShapeProjection(phase.onFail)) {
            pushIssue(
              "effect",
              spellActivationEffectPath(phaseOrdinal, PositiveInteger(1)),
            );
          }
        } else {
          shape = {
            kind: "numeric",
            attachment: phase.attachment,
            effect: phase.onFail,
            saveGate: { ability: phase.ability, dc: phase.dc },
            rangeRadiusFeet: null,
          };
        }
      }
    }
    if (scalarBuffSpellRangeFeet(mechanics.range) === null) {
      pushIssue("range", spellMechanicsHeaderPath("range"));
    }
  }
  if (
    shape === undefined &&
    !issues.some(
      ({ failedFact }) =>
        failedFact === "effect" ||
        failedFact === "weaponFilter" ||
        failedFact === "abilityFilter" ||
        failedFact === "count",
    )
  ) {
    pushIssue("effect", spellMechanicsHeaderPath("family"));
  }
  const failures = spellProcedureNonEmpty(issues);
  if (failures !== undefined) {
    return {
      tag: "unsupported",
      issues: spellProcedureMapNonEmpty(
        failures,
        ({ failedFact, mechanicsPath }) =>
          rollModifierIssue(failedFact, mechanicsPath),
      ),
    };
  }
  if (shape === undefined) {
    return {
      tag: "unsupported",
      issues: [rollModifierIssue("effect", spellMechanicsHeaderPath("family"))],
    };
  }
  const facts = {
    ...source.spellDefinitionRuleFacts,
    ...shape,
  } satisfies RollModifierMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "rollModifier",
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
          ...(mechanics.duration.kind === "timed" ||
          mechanics.duration.kind === "concentration"
            ? [spellDurationValuePath()]
            : []),
          ...(mechanics.family === "ongoing_effect"
            ? [
                spellOngoingAttachmentPath(),
                spellOngoingOperationPath(PositiveInteger(1)),
                spellOngoingOperationEffectPath(PositiveInteger(1)),
              ]
            : [
                spellActivationPhasePath(PositiveInteger(1)),
                spellActivationAttachmentPath(PositiveInteger(1)),
                spellActivationEffectPath(
                  PositiveInteger(1),
                  PositiveInteger(1),
                ),
              ]),
          ...spellConsumedMaterialEvidencePaths(mechanics.components),
        ],
        unowned: [],
      },
      admit: (executionSource, ctx) =>
        admitRollModifier(executionSource, ctx, facts),
    },
  };
}

function rollModifierNumericActiveEffect(
  actorId: CombatantId,
  effect: RollModifierNumericEffect,
  expiresAt: Exclude<ReturnType<typeof scalarBuffActiveEffectExpiration>, null>,
): {
  readonly effect: RollModifierD20Effect;
  readonly skillChoices: readonly Skill[] | null;
} | null {
  const delta = rollModifierDelta(effect.delta);
  const skillFilter = rollModifierSkillFilter(effect.skillFilter);
  if (
    delta === null ||
    !rollModifierKindsAreSupported(effect.on) ||
    skillFilter === null
  ) {
    return null;
  }
  return {
    effect: {
      kind: "d20RollModifier",
      sourceCombatantId: actorId,
      on: effect.on,
      delta,
      skill: skillFilter.kind === "fixed" ? skillFilter.skill : null,
      expiresAt,
    },
    skillChoices: skillFilter.kind === "choice" ? skillFilter.options : null,
  };
}

function rollModifierAbilityCheckActiveEffect(
  actorId: CombatantId,
  effect: RollModifierAbilityCheckEffect,
  expiresAt: Exclude<ReturnType<typeof scalarBuffActiveEffectExpiration>, null>,
): {
  readonly effect: RollModifierAbilityCheckModeEffect;
  readonly abilityChoices: readonly Ability[];
  readonly abilityChoiceApplication: "single" | "perTarget";
} {
  const abilityFilter = rollModifierAbilityChoiceFilter(effect);
  if (abilityFilter === undefined) {
    throw new Error("Static admission must validate the ability choice.");
  }
  return {
    effect: {
      kind: "abilityCheckRollMode",
      sourceCombatantId: actorId,
      mode: "advantage",
      expiresAt,
    },
    abilityChoices: abilityFilter.value.options,
    abilityChoiceApplication:
      abilityFilter.kind === "per_target_hole" ? "perTarget" : "single",
  };
}

function rollModifierRangeFeet(
  facts: RollModifierMechanicsFacts,
): MovementFeetType | null {
  return facts.rangeRadiusFeet ?? scalarBuffSpellRangeFeet(facts.range);
}

function admitRollModifier(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: RollModifierMechanicsFacts,
): readonly RollModifierInvocation[] {
  const expiresAt = scalarBuffActiveEffectExpiration(
    ctx.actor.combatantId,
    facts.duration,
  );
  const rangeFeet = rollModifierRangeFeet(facts);
  if (expiresAt === null || rangeFeet === null) return [];
  type RollModifierCast =
    | {
        readonly kind: "cantrip";
        readonly access: CantripSpellAccess;
        readonly resource: NoSpellInvocationResource;
        readonly slotLevel: SpellSlotLevel;
      }
    | {
        readonly kind: "prepared";
        readonly access: PreparedSpellAccess;
        readonly resource: LeveledSpellInvocationResource;
        readonly slotLevel: SpellSlotLevel;
      };
  const complete = (cast: RollModifierCast): RollModifierInvocation | null => {
    const targeting = rollModifierSpellTargeting(
      facts.attachment,
      Number(facts.level),
      cast.slotLevel,
    );
    if (targeting === null) return null;
    if (facts.kind === "numeric") {
      const modifier = rollModifierNumericActiveEffect(
        ctx.actor.combatantId,
        facts.effect,
        expiresAt,
      );
      if (modifier === null) return null;
      if (cast.kind === "cantrip") {
        return {
          access: cast.access,
          resource: cast.resource,
          procedure: "rollModifier",
          spell,
          actionCost: "magicAction",
          targeting,
          rangeFeet,
          saveGate: facts.saveGate,
          effect: modifier.effect,
          skillChoices: modifier.skillChoices,
          abilityChoices: null,
        };
      }
      return {
        access: cast.access,
        resource: cast.resource,
        procedure: "rollModifier",
        spell,
        actionCost: "magicAction",
        targeting,
        rangeFeet,
        saveGate: facts.saveGate,
        effect: modifier.effect,
        skillChoices: modifier.skillChoices,
        abilityChoices: null,
      };
    }
    const modifier = rollModifierAbilityCheckActiveEffect(
      ctx.actor.combatantId,
      facts.effect,
      expiresAt,
    );
    if (cast.kind === "cantrip") {
      return {
        access: cast.access,
        resource: cast.resource,
        procedure: "rollModifier",
        spell,
        actionCost: "magicAction",
        targeting,
        rangeFeet,
        saveGate: facts.saveGate,
        effect: modifier.effect,
        skillChoices: null,
        abilityChoices: modifier.abilityChoices,
        abilityChoiceApplication: modifier.abilityChoiceApplication,
      };
    }
    return {
      access: cast.access,
      resource: cast.resource,
      procedure: "rollModifier",
      spell,
      actionCost: "magicAction",
      targeting,
      rangeFeet,
      saveGate: facts.saveGate,
      effect: modifier.effect,
      skillChoices: null,
      abilityChoices: modifier.abilityChoices,
      abilityChoiceApplication: modifier.abilityChoiceApplication,
    };
  };
  const invocations: RollModifierInvocation[] = [];
  if (Number(facts.level) === 0) {
    const invocation = complete({
      kind: "cantrip",
      access: cantripSpellAccessFor(spell.castingSource),
      resource: { tag: "none" },
      slotLevel: spellSlotLevel(0),
    });
    if (invocation !== null) invocations.push(invocation);
  } else {
    for (const slot of ctx.spellCastOptions) {
      if (Number(slot.spellLevel) < Number(facts.level)) continue;
      const invocation = complete({
        kind: "prepared",
        access: { tag: "prepared" },
        resource: spellInvocationResourceForCastOption(slot),
        slotLevel: slot.spellLevel,
      });
      if (invocation !== null) invocations.push(invocation);
    }
  }
  return invocations;
}

function applyRollModifierEffect(
  state: BattleState,
  targetIds: readonly CombatantId[],
  selectedEffect: SelectedRollModifierSpellEffect,
  sourceProcedureRef: BattleProcedureExecutionRef,
): BattleState {
  return applyRollModifierEffectsByTarget(
    state,
    targetIds.map((targetId) => ({ targetId, effect: selectedEffect })),
    sourceProcedureRef,
  );
}

function applyRollModifierEffectsByTarget(
  state: BattleState,
  targetEffects: readonly {
    readonly targetId: CombatantId;
    readonly effect: SelectedRollModifierSpellEffect;
  }[],
  sourceProcedureRef: BattleProcedureExecutionRef,
): BattleState {
  return targetEffects.reduce((nextState, targetEffect) => {
    const { targetId, effect: selectedEffect } = targetEffect;
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    const allocation = allocateBattleEffectOccurrenceForCreature({
      owner: target,
      effect: { ...selectedEffect, sourceProcedureRef },
    });
    const activeEffects = [
      ...allocation.owner.activeEffects.filter(
        (effect) =>
          !(
            effect.kind === selectedEffect.kind &&
            effect.sourceProcedureRef === sourceProcedureRef
          ),
      ),
      allocation.effect,
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

function discoverRollModifierCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<RollModifierInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = targetListSpellUsesTargetListHole(invocation)
    ? spellTargetListHole(state, actorId, invocation)
    : spellTargetHole(state, actorId, invocation);
  const initialHoles =
    targetHole.choices.length === 0
      ? []
      : [
          targetHole,
          ...(invocation.skillChoices === null
            ? []
            : [spellRollModifierSkillChoiceHole(invocation)]),
          ...(invocation.abilityChoices === null
            ? []
            : rollModifierUsesTargetAbilityChoices(invocation)
              ? [spellRollModifierTargetAbilityChoicesHole(invocation)]
              : [spellRollModifierAbilityChoiceHole(invocation)]),
        ];
  if (initialHoles.length === 0) {
    return [];
  }
  return [
    {
      subject: {
        tag: "actionSpell",
        actorId,
        procedureRef: invocation.sourceProcedureRef,
        mode: { tag: "cast" },
      },
      initialHoles,
    },
  ];
}

function resolveRollModifier(
  input: RollModifierResolveInput,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !fillsBelongToSpellCastHoles(input.input.fills, [
      ATTACK_TARGET_HOLE_ID,
      spellTargetListHoleId(input.invocation),
      spellRollModifierSkillChoiceHoleId(input.invocation),
      spellRollModifierAbilityChoiceHoleId(input.invocation),
      spellRollModifierTargetAbilityChoicesHoleId(input.invocation),
      spellSavingThrowOutcomeHoleId(input.invocation),
    ])
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Roll modifier spells use target, optional skill or ability, and optional Saving Throw fills.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const targetSelectionResolution = spellSelectionResolution(
    input.input.state,
    input.input.subject,
    rollModifierSpellTargetSelection(input),
  );
  if (targetSelectionResolution.tag === "resolution")
    return targetSelectionResolution.result;
  const targetSelection = targetSelectionResolution.selection;

  const effectSelectionResolution = spellSelectionResolution(
    input.input.state,
    input.input.subject,
    rollModifierSpellEffectSelection({
      ...input,
      targetIds: targetSelection.targetIds,
    }),
  );
  if (effectSelectionResolution.tag === "resolution")
    return effectSelectionResolution.result;
  const effectSelection = effectSelectionResolution.selection;

  const spellCastReactionWindow = maybeOpenConfiguredSpellCastReactionWindow({
    resolution: input,
    targetIds: targetSelection.targetIds,
  });
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const affectedTargetsResolution = spellSelectionResolution(
    input.input.state,
    input.input.subject,
    rollModifierSpellAffectedTargets(input),
  );
  if (affectedTargetsResolution.tag === "resolution")
    return affectedTargetsResolution.result;
  const affectedTargets = affectedTargetsResolution.selection;

  const affectedTargetIds = new Set(affectedTargets.targetIds);
  return completeSpellActiveEffectCast({
    resolution: input,
    ...optionalProperty("actionCostOverride", input.actionCostOverride),
    ...optionalProperty("metamagicApplications", input.metamagicApplications),
    applyEffect: (state) =>
      effectSelection.selection.kind === "sameForTargets"
        ? applyRollModifierEffect(
            state,
            affectedTargets.targetIds,
            effectSelection.selection.effect,
            input.invocation.sourceProcedureRef,
          )
        : applyRollModifierEffectsByTarget(
            state,
            effectSelection.selection.targetEffects.filter((targetEffect) =>
              affectedTargetIds.has(targetEffect.targetId),
            ),
            input.invocation.sourceProcedureRef,
          ),
  });
}

const RollModifierInvocationCommonFields = {
  access: Schema.Union([PreparedSpellAccessSchema, CantripSpellAccessSchema]),
  resource: Schema.Union([
    LeveledSpellInvocationResourceSchema,
    NoSpellInvocationResourceSchema,
  ]),
  procedure: Schema.Literal("rollModifier"),
  spellRuleFacts: SpellRuleExecutionFactsSchema,
  actionCost: Schema.Literal("magicAction"),
  targeting: RollModifierSpellTargetingSchema,
  rangeFeet: MovementFeet,
  saveGate: RollModifierSpellSaveGateSchema,
} as const;

const RollModifierInvocationSchema = spellProcedureExecutionSchema(
  Schema.Union([
    Schema.Struct({
      ...RollModifierInvocationCommonFields,
      effect: D20RollModifierEffectSchema,
      skillChoices: Schema.NullOr(
        Schema.Array(Schema.Literals(BATTLE_SURFACE_SKILLS)),
      ),
      abilityChoices: Schema.Null,
      abilityChoiceApplication: Schema.optionalKey(Schema.Never),
    }),
    Schema.Struct({
      ...RollModifierInvocationCommonFields,
      effect: AbilityCheckRollModeEffectSchema,
      skillChoices: Schema.Null,
      abilityChoices: Schema.Array(Schema.Literals(BATTLE_SURFACE_ABILITIES)),
      abilityChoiceApplication: Schema.Literals(["single", "perTarget"]),
    }),
  ]),
);
export const rollModifierProfile: SpellProcedureDeclaration<
  "rollModifier",
  RollModifierInvocation,
  RollModifierMechanicsFacts,
  RollModifierAdmissionIssue
> = {
  procedure: "rollModifier",
  admitMechanics: rollModifierMechanicsAdmission,

  discoverCastAct: discoverRollModifierCastAct,
  executionSchema: RollModifierInvocationSchema,
  resolve: resolveRollModifier,
};
import { spellInvocationResourceForCastOption } from "./profile.ts";
