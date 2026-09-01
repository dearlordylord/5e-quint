import { optionalProperty } from "../../optional-property.ts";
import {
  completeSpellActiveEffectCast,
  maybeOpenConfiguredSpellCastReactionWindow,
} from "../spell-active-effect-resolution.ts";
import type { BattleSpellExecutionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.scalar-buff
import { DiceExprSchema } from "@dnd/surface/surface/schema";
import { ArmorClassSchema } from "@dnd/shared-algebras/armor-class-algebra";
import { armorClass } from "@dnd/shared-algebras/armor-class-algebra";
import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-glyph-stored-concentration-full-duration
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS
//
// The scalarBuff Spell Procedure Profile: prepared spells that grant a scalar
// creature buff such as Temporary Hit Points, Hit Point Maximum increase, Armor
// Class floor/bonus, Speed increase, or special Speed grant, with self or
// target-list targeting and Magic Action or Bonus Action casting.
//
// What lives here:
//   - admit()           - was supportedPreparedScalarBuffSpellProfile in
//                         spells-profiles-support.ts
//   - discoverCastAct() - was the scalarBuff branch in
//                         spells-discovery.ts
//   - castSummary()     - was the scalarBuff branch in
//                         spellInvocationCastSummary
//   - resolve()         - was resolveScalarBuffSpellAct in
//                         spells-resolve-support-effects.ts
//   - applyEffect()     - was applyScalarBuffSpellEffect in
//                         spells-active-effects.ts
//
// What stays in shared infrastructure:
//   - scalarBuffSpellActionCost / RangeFeet / Targeting / Effect stay in
//     spells-profiles-support.ts because later bonus-action/movement profiles
//     still share those projection helpers.
//   - scalarBuffSpellTargetSelection stays in spells-resolve-target-selection.ts
//     while fill and targeting families remain shared.
//   - spellScalarBuffRollHole and fill validation stay with hole/fill helpers.
//   - The metamagic table entry remains for the Wave 9 cross-cutting cleanup.

import {
  isEffectAtom,
  topLevelSpellCastingTime,
} from "@dnd/surface/surface/types";
import type {
  Attachment,
  DiceAmount,
  DiceExpr,
  DiceExprDelta,
  EffectAtom,
  OngoingEffect,
  SpellMechanics,
} from "@dnd/surface/surface/types";
import {
  movementDeltaFeet,
  movementFeet,
  PositiveInteger,
  spellSlotLevel,
} from "@dnd/shared/types";
import { BATTLE_SPECIAL_SPEED_KINDS } from "../../battle-subjects.ts";
import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type HealingSpellActionCost,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { CombatantId } from "../../identity.ts";
import { BattleActiveEffectExpirationSchema } from "../../active-effect/codecs.ts";
import { battleCreatureWithSpellActiveEffects } from "../../active-effect/lifecycle.ts";
import { allocateBattleEffectOccurrenceForCreature } from "../../effect-execution-ref.ts";
import {
  applyHitPointMaximumIncrease,
  applyTemporaryHitPoints,
} from "../damage-apply.ts";
import {
  battleStateWithFlySpeedGrantEndFallCleanupFrames,
  grantedFlightEndFallCleanupFramesForExpiredEffects,
} from "../granted-flight-end-fall-cleanup.ts";
import {
  needsHolesResult,
  spellSelectionResolution,
} from "../needs-holes-result.ts";
import { invalidResult } from "../result-helpers.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { ATTACK_TARGET_HOLE_ID } from "../battle-runtime-protocol.ts";
import { scalarBuffTemporaryHitPointsAmount } from "../spell-effects.ts";
import {
  readiedSpellAct,
  spellCastSelectionSubject,
  targetListSpellUsesTargetListHole,
} from "../spells-discovery.ts";
import { isScalarBuffTargetListInvocation } from "../spells-invocation-guards.ts";
import {
  spellScalarBuffRollHole,
  validateScalarBuffTemporaryHitPointsFill,
} from "../spells-damage-fills.ts";
import {
  scalarBuffSpellActionCost,
  scalarBuffSpellRangeFeet,
  scalarBuffSpellTargeting,
  scalarBuffActiveEffectExpiration,
  supportedTemporaryHitPointsAmountExpr,
} from "../spells-profiles-support.ts";
import { scalarBuffSpellTargetSelection } from "../spells-resolve-target-selection.ts";
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
import { spellInvocationResourceForCastOption } from "./profile.ts";
import { Result, Schema } from "effect";
import { BattleEffectOccurrenceTemplateSchemaFields } from "../../active-effect/template-codec.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  MovementDeltaFeet,
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import { discoverSubtleSpellMetamagicSelections } from "../metamagic.ts";
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

type ScalarBuffInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "scalarBuff" }
>;

const ScalarBuffActiveEffectTemplateSchema = Schema.Union([
  Schema.Struct({
    sourceCombatantId: CombatantId,
    kind: Schema.Literal("speedDelta"),
    deltaFeet: MovementDeltaFeet,
    expiresAt: BattleActiveEffectExpirationSchema,
    ...BattleEffectOccurrenceTemplateSchemaFields,
  }),
  Schema.Struct({
    sourceCombatantId: CombatantId,
    kind: Schema.Literal("specialSpeedGrant"),
    speedKind: Schema.Literals([
      BATTLE_SPECIAL_SPEED_KINDS[0],
      BATTLE_SPECIAL_SPEED_KINDS[1],
    ]),
    speed: Schema.Struct({ kind: Schema.Literal("equalToSpeed") }),
    hover: Schema.Literal(false),
    expiresAt: BattleActiveEffectExpirationSchema,
    ...BattleEffectOccurrenceTemplateSchemaFields,
  }),
  Schema.Struct({
    sourceCombatantId: CombatantId,
    kind: Schema.Literal("specialSpeedGrant"),
    speedKind: Schema.Literal(BATTLE_SPECIAL_SPEED_KINDS[2]),
    speed: Schema.Struct({
      kind: Schema.Literal("fixed"),
      speedFeet: MovementFeet,
    }),
    hover: Schema.Literal(true),
    expiresAt: BattleActiveEffectExpirationSchema,
    ...BattleEffectOccurrenceTemplateSchemaFields,
  }),
  Schema.Struct({
    sourceCombatantId: CombatantId,
    kind: Schema.Literal("spellArmorClassBonus"),
    bonus: Schema.Number,
    negatesRepeatedDamageAllocation: Schema.Boolean,
    expiresAt: BattleActiveEffectExpirationSchema,
    ...BattleEffectOccurrenceTemplateSchemaFields,
  }),
  Schema.Struct({
    sourceCombatantId: CombatantId,
    kind: Schema.Literal("spellArmorClassFloor"),
    floor: ArmorClassSchema,
    expiresAt: BattleActiveEffectExpirationSchema,
    ...BattleEffectOccurrenceTemplateSchemaFields,
  }),
]);

const HitPointMaximumIncreaseTemplateSchema = Schema.Struct({
  sourceCombatantId: CombatantId,
  kind: Schema.Literal("hitPointMaximumIncrease"),
  amount: Schema.Number,
  expiresAt: BattleActiveEffectExpirationSchema,
  ...BattleEffectOccurrenceTemplateSchemaFields,
});
type ScalarBuffResolveInput =
  SpellProcedureProfileResolveInput<ScalarBuffInvocation>;

type ScalarBuffMechanics =
  | Extract<SpellMechanics, { readonly family: "activation" }>
  | Extract<SpellMechanics, { readonly family: "ongoing_effect" }>;
type ScalarBuffSurfaceEffect = Extract<
  EffectAtom | OngoingEffect,
  {
    readonly kind:
      | "grant_temp_hp"
      | "grant_speed"
      | "modify_speed"
      | "modify_ac"
      | "modify_ac_set_floor"
      | "modify_max_hp";
  }
>;
type ScalarBuffProfileShape = {
  readonly actionCost: HealingSpellActionCost;
  readonly attachment: Attachment;
  readonly effect: ScalarBuffSurfaceEffect;
};
type ScalarBuffMechanicsFacts = SpellProcedureMechanicsFacts &
  ScalarBuffProfileShape;
type ScalarBuffFailedFact =
  | "castingTime"
  | "range"
  | "duration"
  | "durationExtension"
  | "durationEnding"
  | "phaseCount"
  | "phase"
  | "attachment"
  | "initialPhase"
  | "operation"
  | "operationCount"
  | "effect";
type ScalarBuffAdmissionIssue = SpellProcedureAdmissionIssue<
  "scalarBuff",
  ScalarBuffFailedFact,
  SpellMechanicsBranchPath
>;

function isScalarBuffEffect(
  effect: unknown,
): effect is ScalarBuffSurfaceEffect {
  if (typeof effect !== "object" || effect === null || !("kind" in effect)) {
    return false;
  }
  const kind = effect.kind;
  return (
    kind === "grant_temp_hp" ||
    kind === "grant_speed" ||
    kind === "modify_speed" ||
    kind === "modify_ac" ||
    kind === "modify_ac_set_floor" ||
    kind === "modify_max_hp"
  );
}

function isScalarBuffRepresentation(
  mechanics: SpellMechanics,
): mechanics is ScalarBuffMechanics {
  const effectWitness =
    mechanics.family === "activation"
      ? mechanics.phases.some(
          (phase) =>
            phase.kind === "direct" &&
            (phase.effects ?? []).some(
              (effect) =>
                isScalarBuffEffect(effect) &&
                scalarBuffEffectShapeSupported(effect, Number(mechanics.level)),
            ),
        )
      : mechanics.family === "ongoing_effect"
        ? mechanics.operations.some(
            ({ trigger, predicate, targetLimit, usageLimit, effect }) =>
              trigger.kind === "passive" &&
              predicate === undefined &&
              targetLimit === undefined &&
              usageLimit === undefined &&
              isScalarBuffEffect(effect) &&
              scalarBuffEffectShapeSupported(effect, Number(mechanics.level)),
          )
        : false;
  if (!effectWitness) return false;
  const castingTime = topLevelSpellCastingTime(mechanics);
  const hasSupportedCastingTime =
    castingTime !== null && scalarBuffSpellActionCost(castingTime) !== null;
  const hasSupportedRange = scalarBuffSpellRangeFeet(mechanics.range) !== null;
  let hasAttachment = false;
  if (mechanics.family === "activation") {
    hasAttachment = mechanics.phases.some(
      (phase) => "attachment" in phase && phase.attachment.kind !== undefined,
    );
  } else if (mechanics.family === "ongoing_effect") {
    hasAttachment = mechanics.attachment.kind !== undefined;
  }
  return spellProcedureHasRedundantSignature({
    kind: "twoWitnessesMayBeMissing",
    witnesses: [
      effectWitness,
      hasSupportedCastingTime,
      hasSupportedRange,
      hasAttachment,
      mechanics.family === "activation" ||
        mechanics.family === "ongoing_effect",
    ],
  });
}

function scalarBuffIssue(
  failedFact: ScalarBuffFailedFact,
  mechanicsPath: SpellMechanicsBranchPath,
): ScalarBuffAdmissionIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "scalarBuff",
    failedFact,
    mechanicsPath,
    message: `Unsupported scalarBuff mechanics fact: ${failedFact}.`,
  };
}

function scalarBuffMaxHitPointAmount(
  amount: DiceAmount,
  spellLevel: number,
  slotLevel: number,
): number | null {
  const deterministic = (expr: DiceExpr): number | null =>
    expr.dice === 0 &&
    expr.dieSize === 1 &&
    expr.spellcastingMod !== true &&
    expr.abilityModifier === undefined
      ? (expr.flat ?? 0)
      : null;
  const deterministicDelta = (expr: DiceExprDelta): number | null =>
    (expr.dice ?? 0) === 0 && (expr.dieSize ?? 1) === 1
      ? (expr.flat ?? 0)
      : null;
  if (amount.kind === "fixed") return deterministic(amount.expr);
  if (
    amount.kind !== "linear_per_level" ||
    amount.axis !== "slot" ||
    amount.startingAtLevel !== spellLevel
  ) {
    return null;
  }
  const base = deterministic(amount.base);
  const perLevel = deterministicDelta(amount.perLevel);
  return base === null || perLevel === null
    ? null
    : base + perLevel * Math.max(0, slotLevel - amount.startingAtLevel);
}

function scalarBuffEffectSupported(
  effect: ScalarBuffSurfaceEffect,
  duration: SpellMechanics["duration"],
  spellLevel: number,
): boolean {
  if (effect.kind === "grant_temp_hp") {
    return (
      duration.kind === "instantaneous" &&
      scalarBuffEffectShapeSupported(effect, spellLevel)
    );
  }
  if (duration.kind !== "timed" && duration.kind !== "concentration") {
    return false;
  }
  return scalarBuffEffectShapeSupported(effect, spellLevel);
}

function scalarBuffEffectShapeSupported(
  effect: ScalarBuffSurfaceEffect,
  spellLevel: number,
): boolean {
  if (effect.kind === "grant_temp_hp") {
    return (
      supportedTemporaryHitPointsAmountExpr(
        effect.amount,
        spellLevel,
        spellSlotLevel(spellLevel),
      ) !== null
    );
  }
  if (
    effect.kind === "grant_speed" &&
    typeof effect.feet !== "number" &&
    effect.feet.kind === "walk_speed" &&
    (effect.speedKind === "climb" || effect.speedKind === "swim") &&
    effect.hover === undefined
  ) {
    return true;
  }
  if (
    effect.kind === "grant_speed" &&
    typeof effect.feet === "number" &&
    effect.speedKind === "fly" &&
    effect.hover === true
  ) {
    return true;
  }
  if (effect.kind === "modify_speed" && effect.unit === "feet") return true;
  if (
    effect.kind === "modify_ac" &&
    effect.delta.kind === "fixed_dice" &&
    effect.delta.sign === "+" &&
    effect.delta.dieSize === 1
  ) {
    return true;
  }
  if (
    effect.kind === "modify_ac_set_floor" &&
    Number.isInteger(effect.const) &&
    effect.const > 0
  ) {
    return true;
  }
  return (
    effect.kind === "modify_max_hp" &&
    effect.direction === "increase" &&
    scalarBuffMaxHitPointAmount(effect.delta, spellLevel, spellLevel) !== null
  );
}

function scalarBuffMechanicsAdmission(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "scalarBuff",
  ScalarBuffMechanicsFacts,
  ScalarBuffInvocation,
  ScalarBuffAdmissionIssue
> {
  if (!isScalarBuffRepresentation(source.mechanics)) {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
  const issues: Array<{
    readonly failedFact: ScalarBuffFailedFact;
    readonly mechanicsPath: SpellMechanicsBranchPath;
  }> = [];
  const pushIssue = (
    failedFact: ScalarBuffFailedFact,
    mechanicsPath: SpellMechanicsBranchPath,
  ): void => {
    issues.push({ failedFact, mechanicsPath });
  };
  const castingTime = topLevelSpellCastingTime(mechanics);
  const actionCost =
    castingTime === null ? null : scalarBuffSpellActionCost(castingTime);
  if (actionCost === null) {
    pushIssue("castingTime", spellMechanicsHeaderPath("castingTime"));
  }
  if (scalarBuffSpellRangeFeet(mechanics.range) === null) {
    pushIssue("range", spellMechanicsHeaderPath("range"));
  }
  if (
    mechanics.duration.kind !== "instantaneous" &&
    mechanics.duration.kind !== "timed" &&
    mechanics.duration.kind !== "concentration"
  ) {
    pushIssue("duration", spellDurationValuePath());
  }
  for (const path of persistentAreaDurationChildPaths(mechanics.duration)) {
    const branch = path.nodes.at(-1);
    pushIssue(
      branch?.role === "extension" ? "durationExtension" : "durationEnding",
      path,
    );
  }
  let attachment: Attachment | undefined;
  let effect: ScalarBuffSurfaceEffect | undefined;
  if (mechanics.family === "activation") {
    const phaseIndex = mechanics.phases.findIndex(
      (phase) => phase.kind === "direct",
    );
    const phaseOrdinal = PositiveInteger(phaseIndex < 0 ? 1 : phaseIndex + 1);
    const phase = phaseIndex < 0 ? undefined : mechanics.phases[phaseIndex];
    if (mechanics.phases.length !== 1 || phaseIndex !== 0) {
      for (const [index] of mechanics.phases.entries()) {
        if (index === phaseIndex && phaseIndex === 0) continue;
        pushIssue(
          "phaseCount",
          spellActivationPhasePath(PositiveInteger(index + 1)),
        );
      }
      if (mechanics.phases.length === 0) {
        pushIssue("phase", spellActivationPhasePath(PositiveInteger(1)));
      }
    }
    if (phase?.kind !== "direct") {
      pushIssue("phase", spellActivationPhasePath(phaseOrdinal));
    } else {
      attachment = phase.attachment;
      const effects = phase.effects ?? [];
      if (effects.length === 0) {
        pushIssue(
          "effect",
          spellActivationEffectPath(phaseOrdinal, PositiveInteger(1)),
        );
      } else {
        for (const [index] of effects.entries()) {
          if (index > 0) {
            pushIssue(
              "effect",
              spellActivationEffectPath(
                phaseOrdinal,
                PositiveInteger(index + 1),
              ),
            );
          }
        }
      }
      const candidate = effects[0];
      if (
        candidate === undefined ||
        !isEffectAtom(candidate) ||
        !isScalarBuffEffect(candidate)
      ) {
        pushIssue(
          "effect",
          spellActivationEffectPath(phaseOrdinal, PositiveInteger(1)),
        );
      } else {
        effect = candidate;
      }
    }
  } else {
    if (mechanics.initialPhase !== undefined) {
      pushIssue("initialPhase", spellOngoingInitialPhasePath());
    }
    attachment = mechanics.attachment;
    const occurrences = mechanics.operations.map((operation, index) => ({
      operation,
      ordinal: PositiveInteger(index + 1),
    }));
    const expected = occurrences.find(
      ({ operation }) =>
        operation.trigger.kind === "passive" &&
        operation.predicate === undefined &&
        operation.targetLimit === undefined &&
        operation.usageLimit === undefined &&
        isScalarBuffEffect(operation.effect),
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
      pushIssue(
        "operation",
        spellOngoingOperationEffectPath(
          expected?.ordinal ?? PositiveInteger(1),
        ),
      );
    } else {
      effect = isScalarBuffEffect(expected.operation.effect)
        ? expected.operation.effect
        : undefined;
    }
  }
  if (attachment === undefined) {
    pushIssue(
      "attachment",
      mechanics.family === "activation"
        ? spellActivationAttachmentPath(PositiveInteger(1))
        : spellOngoingAttachmentPath(),
    );
  } else if (
    scalarBuffSpellTargeting(
      attachment,
      Number(mechanics.level),
      spellSlotLevel(Number(mechanics.level)),
    ) === null
  ) {
    pushIssue(
      "attachment",
      mechanics.family === "activation"
        ? spellActivationAttachmentPath(PositiveInteger(1))
        : spellOngoingAttachmentPath(),
    );
  }
  if (
    effect === undefined ||
    !scalarBuffEffectSupported(
      effect,
      mechanics.duration,
      Number(mechanics.level),
    )
  ) {
    pushIssue(
      "effect",
      mechanics.family === "activation"
        ? spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1))
        : spellOngoingOperationEffectPath(PositiveInteger(1)),
    );
  }
  const failures = spellProcedureNonEmpty(issues);
  if (failures !== undefined) {
    return {
      tag: "unsupported",
      issues: spellProcedureMapNonEmpty(
        failures,
        ({ failedFact, mechanicsPath }) =>
          scalarBuffIssue(failedFact, mechanicsPath),
      ),
    };
  }
  if (actionCost === null || attachment === undefined || effect === undefined) {
    return {
      tag: "unsupported",
      issues: [scalarBuffIssue("effect", spellMechanicsHeaderPath("family"))],
    };
  }
  const facts = {
    ...source.spellDefinitionRuleFacts,
    actionCost,
    attachment,
    effect,
  } satisfies ScalarBuffMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "scalarBuff",
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
          ...(mechanics.duration.kind === "instantaneous"
            ? []
            : [spellDurationValuePath()]),
          ...(mechanics.family === "activation"
            ? [
                spellActivationPhasePath(PositiveInteger(1)),
                spellActivationAttachmentPath(PositiveInteger(1)),
                spellActivationEffectPath(
                  PositiveInteger(1),
                  PositiveInteger(1),
                ),
              ]
            : [
                spellOngoingAttachmentPath(),
                spellOngoingOperationPath(PositiveInteger(1)),
                spellOngoingOperationEffectPath(PositiveInteger(1)),
              ]),
          ...spellConsumedMaterialEvidencePaths(mechanics.components),
        ],
        unowned: [],
      },
      admit: (executionSource, ctx) =>
        admitScalarBuff(executionSource, ctx, facts),
    },
  };
}

function scalarBuffExpirationForEffect(
  actorId: CombatantId,
  duration: ScalarBuffMechanicsFacts["duration"],
): Exclude<ReturnType<typeof scalarBuffActiveEffectExpiration>, null> | null {
  return scalarBuffActiveEffectExpiration(actorId, duration);
}

function scalarBuffSpecialSpeedGrantExpiration(
  actorId: CombatantId,
  duration: ScalarBuffMechanicsFacts["duration"],
): Exclude<ReturnType<typeof scalarBuffActiveEffectExpiration>, null> | null {
  if (duration.kind !== "concentration") {
    return scalarBuffActiveEffectExpiration(actorId, duration);
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(duration.upTo);
  return Result.isFailure(durationTicks)
    ? null
    : {
        kind: "concentration",
        combatantId: actorId,
        durationTicks: durationTicks.success,
      };
}

function scalarBuffEffectForCast(
  actorId: CombatantId,
  effect: ScalarBuffSurfaceEffect,
  duration: ScalarBuffMechanicsFacts["duration"],
  spellLevel: number,
  slotLevel: number,
): ScalarBuffInvocation["effect"] | null {
  if (effect.kind === "grant_temp_hp" && duration.kind === "instantaneous") {
    const expr = supportedTemporaryHitPointsAmountExpr(
      effect.amount,
      spellLevel,
      spellSlotLevel(slotLevel),
    );
    return expr === null
      ? null
      : { kind: "temporaryHitPoints", amount: { expr } };
  }
  const expiresAt = scalarBuffExpirationForEffect(actorId, duration);
  if (expiresAt === null) return null;
  if (
    effect.kind === "grant_speed" &&
    typeof effect.feet !== "number" &&
    effect.feet.kind === "walk_speed" &&
    (effect.speedKind === "climb" || effect.speedKind === "swim") &&
    effect.hover === undefined
  ) {
    const speedGrantExpiresAt = scalarBuffSpecialSpeedGrantExpiration(
      actorId,
      duration,
    );
    if (speedGrantExpiresAt === null) return null;
    return {
      kind: "activeEffect",
      activeEffect: {
        kind: "specialSpeedGrant",
        sourceCombatantId: actorId,
        speedKind: effect.speedKind,
        speed: { kind: "equalToSpeed" },
        hover: false,
        expiresAt: speedGrantExpiresAt,
      },
    };
  }
  if (
    effect.kind === "grant_speed" &&
    typeof effect.feet === "number" &&
    effect.speedKind === "fly" &&
    effect.hover === true
  ) {
    const speedGrantExpiresAt = scalarBuffSpecialSpeedGrantExpiration(
      actorId,
      duration,
    );
    if (speedGrantExpiresAt === null) return null;
    return {
      kind: "activeEffect",
      activeEffect: {
        kind: "specialSpeedGrant",
        sourceCombatantId: actorId,
        speedKind: "fly",
        speed: { kind: "fixed", speedFeet: movementFeet(effect.feet) },
        hover: true,
        expiresAt: speedGrantExpiresAt,
      },
    };
  }
  if (effect.kind === "modify_speed" && effect.unit === "feet") {
    return {
      kind: "activeEffect",
      activeEffect: {
        kind: "speedDelta",
        sourceCombatantId: actorId,
        deltaFeet: movementDeltaFeet(effect.delta),
        expiresAt,
      },
    };
  }
  if (
    effect.kind === "modify_ac" &&
    effect.delta.kind === "fixed_dice" &&
    effect.delta.sign === "+" &&
    effect.delta.dieSize === 1
  ) {
    return {
      kind: "activeEffect",
      activeEffect: {
        kind: "spellArmorClassBonus",
        sourceCombatantId: actorId,
        bonus: effect.delta.dice,
        negatesRepeatedDamageAllocation: false,
        expiresAt,
      },
    };
  }
  if (
    effect.kind === "modify_ac_set_floor" &&
    Number.isInteger(effect.const) &&
    effect.const > 0
  ) {
    return {
      kind: "activeEffect",
      activeEffect: {
        kind: "spellArmorClassFloor",
        sourceCombatantId: actorId,
        floor: armorClass(effect.const),
        expiresAt,
      },
    };
  }
  if (effect.kind === "modify_max_hp" && effect.direction === "increase") {
    const amount = scalarBuffMaxHitPointAmount(
      effect.delta,
      spellLevel,
      slotLevel,
    );
    return amount === null
      ? null
      : {
          kind: "hitPointMaximumIncrease",
          activeEffect: {
            kind: "hitPointMaximumIncrease",
            sourceCombatantId: actorId,
            amount,
            expiresAt,
          },
        };
  }
  return null;
}

function admitScalarBuff(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: ScalarBuffMechanicsFacts,
): readonly ScalarBuffInvocation[] {
  const rangeFeet = scalarBuffSpellRangeFeet(facts.range);
  if (rangeFeet === null) return [];
  return ctx.spellCastOptions.flatMap(
    (slot): readonly ScalarBuffInvocation[] => {
      if (Number(slot.spellLevel) < Number(facts.level)) return [];
      const targeting = scalarBuffSpellTargeting(
        facts.attachment,
        Number(facts.level),
        slot.spellLevel,
      );
      const effect = scalarBuffEffectForCast(
        ctx.actor.combatantId,
        facts.effect,
        facts.duration,
        Number(facts.level),
        Number(slot.spellLevel),
      );
      return targeting === null || effect === null
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              procedure: "scalarBuff",
              spell,
              actionCost: facts.actionCost,
              targeting,
              effect,
              rangeFeet,
            },
          ];
    },
  );
}

function discoverScalarBuffCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<ScalarBuffInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  if (invocation.targeting.kind === "self") {
    const initialHoles = scalarBuffInitialHoles(invocation);
    const castActs = [
      {
        subject: spellCastSelectionSubject(actorId, invocation),
        initialHoles,
      },
      ...scalarBuffSubtleMetamagicCastActs({
        state,
        actorId,
        invocation,
        initialHoles,
      }),
    ];
    return [...castActs, ...readiedSpellAct(state, actorId, invocation)];
  }
  if (!isScalarBuffTargetListInvocation(invocation)) {
    return [];
  }
  const targetHole = targetListSpellUsesTargetListHole(invocation)
    ? spellTargetListHole(state, actorId, invocation)
    : spellTargetHole(state, actorId, invocation);
  const castActs =
    targetHole.choices.length === 0
      ? []
      : [
          {
            subject: spellCastSelectionSubject(actorId, invocation),
            initialHoles: [targetHole],
          },
          ...scalarBuffSubtleMetamagicCastActs({
            state,
            actorId,
            invocation,
            initialHoles: [targetHole],
          }),
        ];
  return [...castActs, ...readiedSpellAct(state, actorId, invocation)];
}

function scalarBuffSubtleMetamagicCastActs(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation<
    import("../../battle-state-execution.ts").BattleExecutableSpellInvocation<ScalarBuffInvocation>
  >;
  readonly initialHoles: readonly BattleHole[];
}): readonly BattleActDiscoveryCandidate[] {
  const subject = spellCastSelectionSubject(input.actorId, input.invocation);
  return discoverSubtleSpellMetamagicSelections({
    actor: input.state.combatants.get(input.actorId),
    invocation: input.invocation,
    subject,
  }).map((metamagic) => {
    return {
      subject: {
        ...subject,
        metamagic,
      },
      initialHoles: input.initialHoles,
    };
  });
}

function scalarBuffInitialHoles(
  invocation: BattleExecutableSpellInvocation<ScalarBuffInvocation>,
): readonly ReturnType<typeof spellScalarBuffRollHole>[] {
  return invocation.effect.kind === "temporaryHitPoints"
    ? [spellScalarBuffRollHole(invocation)]
    : [];
}

function applyScalarBuffEffect(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: BattleExecutableSpellInvocation<ScalarBuffInvocation>,
  temporaryHitPointsRoll:
    | Extract<BattleFill, { readonly kind: "rolledDice" }>
    | undefined,
): BattleState {
  const scalarEffect = invocation.effect;
  return targetIds.reduce((nextState, targetId) => {
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    if (scalarEffect.kind === "temporaryHitPoints") {
      const nextTarget =
        temporaryHitPointsRoll === undefined
          ? target
          : applyTemporaryHitPoints(
              target,
              scalarBuffTemporaryHitPointsAmount(
                invocation,
                temporaryHitPointsRoll,
              ),
            );
      return {
        ...nextState,
        combatants: new Map(nextState.combatants).set(targetId, nextTarget),
      };
    }
    const allocation = allocateBattleEffectOccurrenceForCreature({
      owner: target,
      effect: {
        ...scalarEffect.activeEffect,
        sourceProcedureRef: invocation.sourceProcedureRef,
        sourceCombatantId: actorId,
      },
    });
    if (allocation.effect.kind === "hitPointMaximumIncrease") {
      const nextTarget = applyHitPointMaximumIncrease(
        allocation.owner,
        allocation.effect,
      );
      return {
        ...nextState,
        combatants: new Map(nextState.combatants).set(targetId, nextTarget),
      };
    }
    const replacing = target.activeEffects.filter(
      (effect) =>
        effect.kind === scalarEffect.activeEffect.kind &&
        effect.sourceProcedureRef === invocation.sourceProcedureRef,
    );
    const nextTarget = battleCreatureWithSpellActiveEffects(allocation.owner, [
      ...allocation.owner.activeEffects.filter(
        (effect) => !replacing.includes(effect),
      ),
      allocation.effect,
    ]);
    const applied = {
      ...nextState,
      combatants: new Map(nextState.combatants).set(targetId, nextTarget),
    };
    return battleStateWithFlySpeedGrantEndFallCleanupFrames(
      applied,
      grantedFlightEndFallCleanupFramesForExpiredEffects(targetId, replacing),
    );
  }, state);
}

function resolveScalarBuff(
  input: ScalarBuffResolveInput,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !fillsBelongToSpellCastHoles(input.input.fills, [
      ATTACK_TARGET_HOLE_ID,
      spellTargetListHoleId(input.invocation),
      spellScalarBuffRollHole(input.invocation).holeId,
    ])
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Scalar buff spells use target fills and optional scalar dice roll.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const targetSelectionResolution = spellSelectionResolution(
    input.input.state,
    input.input.subject,
    scalarBuffSpellTargetSelection(input),
  );
  if (targetSelectionResolution.tag === "resolution")
    return targetSelectionResolution.result;
  const targetSelection = targetSelectionResolution.selection;

  const spellCastReactionWindow = maybeOpenConfiguredSpellCastReactionWindow({
    resolution: input,
    targetIds: targetSelection.targetIds,
  });
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  if (
    input.invocation.effect.kind === "temporaryHitPoints" &&
    input.fillSet.healingRoll == null
  ) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellScalarBuffRollHole(input.invocation),
    ]);
  }
  if (
    input.invocation.effect.kind === "temporaryHitPoints" &&
    input.fillSet.healingRoll !== undefined
  ) {
    const validation = validateScalarBuffTemporaryHitPointsFill(
      input.fillSet.healingRoll,
      input.invocation,
    );
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (validation !== null) {
      return invalidResult(input.input.state, "invalidFill", validation);
    }
    /* v8 ignore stop -- @preserve */
  }

  return completeSpellActiveEffectCast({
    resolution: input,
    ...optionalProperty("actionCostOverride", input.actionCostOverride),
    ...optionalProperty("metamagicApplications", input.metamagicApplications),
    applyEffect: (state) =>
      applyScalarBuffEffect(
        state,
        input.actorId,
        targetSelection.targetIds,
        input.invocation,
        input.fillSet.healingRoll,
      ),
  });
}

const ScalarBuffInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    procedure: Schema.Literal("scalarBuff"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literals(["magicAction", "bonusAction"]),
    targeting: Schema.Union([
      Schema.Struct({
        kind: Schema.Literal("self"),
      }),
      Schema.Struct({
        kind: Schema.Literal("targetList"),
        minTargets: Schema.Literal(1),
        maxTargets: Schema.Number,
        requiredTargetDisposition: Schema.Literals(["unrestricted", "willing"]),
      }),
    ]),
    effect: Schema.Union([
      Schema.Struct({
        kind: Schema.Literal("temporaryHitPoints"),
        amount: Schema.Struct({
          expr: DiceExprSchema,
        }),
      }),
      Schema.Struct({
        kind: Schema.Literal("activeEffect"),
        activeEffect: ScalarBuffActiveEffectTemplateSchema,
      }),
      Schema.Struct({
        kind: Schema.Literal("hitPointMaximumIncrease"),
        activeEffect: HitPointMaximumIncreaseTemplateSchema,
      }),
    ]),
    rangeFeet: MovementFeet,
  }),
);
export const scalarBuffProfile = {
  procedure: "scalarBuff",
  executionSchema: ScalarBuffInvocationSchema,
  admitMechanics: scalarBuffMechanicsAdmission,
  discoverCastAct: discoverScalarBuffCastAct,
  resolve: resolveScalarBuff,
} satisfies SpellProcedureDeclaration<
  "scalarBuff",
  ScalarBuffInvocation,
  ScalarBuffMechanicsFacts,
  ScalarBuffAdmissionIssue
>;
