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
  TargetSelection,
} from "@dnd/surface/surface/types";
import {
  movementDeltaFeet,
  movementFeet,
  PositiveInteger,
} from "@dnd/shared/types";
import { BATTLE_SPECIAL_SPEED_KINDS } from "../../battle-subjects.ts";
import {
  type BattleActDiscoveryCandidate,
  type BattleActiveEffectExpiration,
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
import { Match, Schema } from "effect";
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
  admitSpellTargetAttachment,
  isSpellCanonicalDurationValue,
  spellDurationTicksFromCanonicalValue,
  spellConsumedMaterialEvidencePaths,
  spellProcedureHasRedundantSignature,
  spellProcedureMapNonEmpty,
  spellProcedureNonEmpty,
  type SpellMechanicsAdmissionSource,
  type SpellCanonicalDurationValue,
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
  spellMechanicsRootPath,
  spellOngoingAttachmentPath,
  spellOngoingInitialPhasePath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type { UnitMechanicsPath } from "@dnd/surface/surface/mechanics-graph-path";
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
type ScalarBuffDuration =
  | { readonly kind: "instantaneous" }
  | (Extract<
      SpellProcedureMechanicsFacts["duration"],
      { readonly kind: "timed" }
    > & { readonly value: SpellCanonicalDurationValue })
  | (Extract<
      SpellProcedureMechanicsFacts["duration"],
      { readonly kind: "concentration" }
    > & { readonly upTo: SpellCanonicalDurationValue });
type ScalarBuffTargetCountProjection =
  | { readonly kind: "fixed"; readonly count: number }
  | {
      readonly kind: "linear";
      readonly base: number;
      readonly baseLevel: number;
      readonly perSlotAboveBase: number;
    };
type ScalarBuffTargetingProjection =
  | { readonly kind: "self" }
  | {
      readonly kind: "targetList";
      readonly count: ScalarBuffTargetCountProjection;
      readonly requiredTargetDisposition: "unrestricted" | "willing";
    };
type ScalarBuffMaxHitPointProjection = {
  readonly base: number;
  readonly perLevel: number;
  readonly startingAtLevel: number;
};
type ScalarBuffTemporaryHitPointProjection =
  | { readonly kind: "fixed"; readonly expr: DiceExpr }
  | {
      readonly kind: "linear";
      readonly baseDice: number;
      readonly baseDieSize: number;
      readonly baseFlat: number;
      readonly perLevelDice: number;
      readonly perLevelFlat: number;
      readonly startingAtLevel: number;
    };
type ScalarBuffEffectProjection =
  | {
      readonly kind: "temporaryHitPoints";
      readonly amount: ScalarBuffTemporaryHitPointProjection;
    }
  | {
      readonly kind: "specialSpeedEqualTo";
      readonly speedKind: "climb" | "swim";
    }
  | {
      readonly kind: "specialSpeedFixed";
      readonly speedFeet: MovementFeet;
    }
  | { readonly kind: "speedDelta"; readonly deltaFeet: MovementDeltaFeet }
  | { readonly kind: "armorClassBonus"; readonly bonus: number }
  | {
      readonly kind: "armorClassFloor";
      readonly floor: ReturnType<typeof armorClass>;
    }
  | {
      readonly kind: "hitPointMaximumIncrease";
      readonly amount: ScalarBuffMaxHitPointProjection;
    };
type ScalarBuffNonInstantDuration = Exclude<
  ScalarBuffDuration,
  { readonly kind: "instantaneous" }
>;
type ScalarBuffNonTemporaryEffect = Exclude<
  ScalarBuffEffectProjection,
  { readonly kind: "temporaryHitPoints" }
>;
type ScalarBuffProfileShape = {
  readonly actionCost: HealingSpellActionCost;
  readonly targeting: ScalarBuffTargetingProjection;
  readonly rangeFeet: MovementFeet;
};
type ScalarBuffMechanicsFacts =
  | (Omit<SpellProcedureMechanicsFacts, "duration"> &
      ScalarBuffProfileShape & {
        readonly branchKind: "instantaneous";
        readonly duration: { readonly kind: "instantaneous" };
        readonly effect: Extract<
          ScalarBuffEffectProjection,
          { readonly kind: "temporaryHitPoints" }
        >;
      })
  | (Omit<SpellProcedureMechanicsFacts, "duration"> &
      ScalarBuffProfileShape & {
        readonly branchKind: "nonInstant";
        readonly duration: ScalarBuffNonInstantDuration;
        readonly effect: ScalarBuffNonTemporaryEffect;
      });
type ScalarBuffFailedFact =
  | "castingTime"
  | "range"
  | "duration"
  | "authoredConditionalEffects"
  | "durationExtension"
  | "durationEnding"
  | "phaseCount"
  | "phase"
  | "attachment"
  | "initialPhase"
  | "operation"
  | "operationCount"
  | "effect"
  | "rangeOrigin"
  | "selection"
  | "typeFilter"
  | "stateFilter"
  | "visibility"
  | "creatureSizeFilter"
  | "relativePosition"
  | "objectFilter"
  | "creatureDisposition"
  | "castingRequirement"
  | "repeatsAllowed"
  | "occupantDispositionFilter"
  | "occupantPerceptionFilter"
  | "excludedAreas"
  | "predicate"
  | "targetLimit"
  | "usageLimit"
  | "mode";
type ScalarBuffAdmissionIssue = SpellProcedureAdmissionIssue<
  "scalarBuff",
  ScalarBuffFailedFact,
  UnitMechanicsPath
>;

const SCALAR_BUFF_TARGET_SELECTION_FIELDS = [
  "mode",
  "count",
  "targetKinds",
  "disposition",
] as const;

type ScalarBuffActivationPhaseOccurrence = {
  readonly phase: Extract<
    SpellMechanics,
    { readonly family: "activation" }
  >["phases"][number];
  readonly ordinal: PositiveInteger;
};
type ScalarBuffActivationEffectOccurrence = {
  readonly phase: Extract<
    SpellMechanics,
    { readonly family: "activation" }
  >["phases"][number] & { readonly kind: "direct" };
  readonly phaseOrdinal: PositiveInteger;
  readonly effect: ScalarBuffSurfaceEffect;
  readonly effectOrdinal: PositiveInteger;
};
type ScalarBuffOperationOccurrence = {
  readonly operation: Extract<
    SpellMechanics,
    { readonly family: "ongoing_effect" }
  >["operations"][number];
  readonly ordinal: PositiveInteger;
};

type ScalarBuffBranchProjection =
  | {
      readonly tag: "supported";
      readonly branchKind: "instantaneous";
      readonly targeting: ScalarBuffTargetingProjection;
      readonly duration: { readonly kind: "instantaneous" };
      readonly effect: Extract<
        ScalarBuffEffectProjection,
        { readonly kind: "temporaryHitPoints" }
      >;
    }
  | {
      readonly tag: "supported";
      readonly branchKind: "nonInstant";
      readonly targeting: ScalarBuffTargetingProjection;
      readonly duration: ScalarBuffNonInstantDuration;
      readonly effect: ScalarBuffNonTemporaryEffect;
    }
  | { readonly tag: "unsupported" };
type ScalarBuffSupportedBranch = Extract<
  ScalarBuffBranchProjection,
  { readonly tag: "supported" }
>;

function isScalarBuffEffectKind(
  effect: unknown,
): effect is ScalarBuffSurfaceEffect {
  if (typeof effect !== "object" || effect === null || !("kind" in effect)) {
    return false;
  }
  return (
    effect.kind === "grant_temp_hp" ||
    effect.kind === "grant_speed" ||
    effect.kind === "modify_speed" ||
    effect.kind === "modify_ac" ||
    effect.kind === "modify_ac_set_floor" ||
    effect.kind === "modify_max_hp"
  );
}

function isScalarBuffDuration(
  duration: SpellProcedureMechanicsFacts["duration"],
): duration is ScalarBuffDuration {
  return (
    duration.kind === "instantaneous" ||
    (duration.kind === "timed" &&
      isSpellCanonicalDurationValue(duration.value)) ||
    (duration.kind === "concentration" &&
      isSpellCanonicalDurationValue(duration.upTo))
  );
}

function scalarBuffActivationPhaseOccurrences(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): readonly ScalarBuffActivationPhaseOccurrence[] {
  return mechanics.phases.map((phase, index) => ({
    phase,
    ordinal: PositiveInteger(index + 1),
  }));
}

function scalarBuffActivationEffectOccurrences(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): readonly ScalarBuffActivationEffectOccurrence[] {
  return scalarBuffActivationPhaseOccurrences(mechanics).flatMap(
    ({ phase, ordinal: phaseOrdinal }) => {
      if (phase.kind !== "direct") return [];
      return (phase.effects ?? []).flatMap((candidate, index) =>
        isEffectAtom(candidate) && isScalarBuffEffectKind(candidate)
          ? [
              {
                phase,
                phaseOrdinal,
                effect: candidate,
                effectOrdinal: PositiveInteger(index + 1),
              },
            ]
          : [],
      );
    },
  );
}

function scalarBuffOperationOccurrences(
  mechanics: Extract<SpellMechanics, { readonly family: "ongoing_effect" }>,
): readonly ScalarBuffOperationOccurrence[] {
  return mechanics.operations.map((operation, index) => ({
    operation,
    ordinal: PositiveInteger(index + 1),
  }));
}

function scalarBuffOperationConstraintFacts(
  operation: ScalarBuffOperationOccurrence["operation"],
): readonly ("predicate" | "targetLimit" | "usageLimit")[] {
  const facts: Array<"predicate" | "targetLimit" | "usageLimit"> = [];
  if (operation.predicate !== undefined) facts.push("predicate");
  if (operation.targetLimit !== undefined) facts.push("targetLimit");
  if (operation.usageLimit !== undefined) facts.push("usageLimit");
  return facts;
}

function scalarBuffTargetCountProjection(
  selection: TargetSelection,
  spellLevel: number,
): ScalarBuffTargetCountProjection | undefined {
  if (selection.mode === "one") {
    return { kind: "fixed", count: 1 };
  }
  if (selection.mode !== "choose_up_to" || selection.count === undefined) {
    return undefined;
  }
  if (typeof selection.count === "number") {
    return { kind: "fixed", count: selection.count };
  }
  if (selection.count.kind !== "linear") return undefined;
  return {
    kind: "linear",
    base: selection.count.base,
    baseLevel: selection.count.baseLevel ?? spellLevel,
    perSlotAboveBase: selection.count.perSlotAboveBase,
  };
}

function scalarBuffTargetingProjection(
  attachment: Attachment,
  spellLevel: number,
): ScalarBuffTargetingProjection | undefined {
  if (attachment.kind === "self") return { kind: "self" };
  const admitted = admitSpellTargetAttachment(
    attachment,
    SCALAR_BUFF_TARGET_SELECTION_FIELDS,
  );
  if (admitted.tag === "rejected") return undefined;
  const selection = admitted.attachment.value.selection;
  if (
    selection.targetKinds !== undefined &&
    (selection.targetKinds.length !== 1 ||
      selection.targetKinds[0] !== "creature")
  ) {
    return undefined;
  }
  const count = scalarBuffTargetCountProjection(selection, spellLevel);
  return count === undefined
    ? undefined
    : {
        kind: "targetList",
        count,
        requiredTargetDisposition:
          "disposition" in selection && selection.disposition === "willing"
            ? "willing"
            : "unrestricted",
      };
}

function scalarBuffTargetingForSlot(
  targeting: ScalarBuffTargetingProjection,
  slotLevel: number,
): ScalarBuffInvocation["targeting"] {
  if (targeting.kind === "self") return { kind: "self" };
  const maxTargets =
    targeting.count.kind === "fixed"
      ? targeting.count.count
      : targeting.count.base +
        Math.max(0, slotLevel - targeting.count.baseLevel) *
          targeting.count.perSlotAboveBase;
  return {
    kind: "targetList",
    minTargets: 1,
    maxTargets,
    requiredTargetDisposition: targeting.requiredTargetDisposition,
  };
}

function scalarBuffMaxHitPointProjection(
  amount: DiceAmount,
  spellLevel: number,
): ScalarBuffMaxHitPointProjection | undefined {
  const deterministic = (expr: DiceExpr): number | undefined =>
    expr.dice === 0 &&
    expr.dieSize === 1 &&
    expr.spellcastingMod !== true &&
    expr.abilityModifier === undefined
      ? (expr.flat ?? 0)
      : undefined;
  const deterministicDelta = (expr: DiceExprDelta): number | undefined =>
    (expr.dice ?? 0) === 0 && (expr.dieSize ?? 1) === 1
      ? (expr.flat ?? 0)
      : undefined;
  if (amount.kind === "fixed") {
    const base = deterministic(amount.expr);
    return base === undefined
      ? undefined
      : { base, perLevel: 0, startingAtLevel: spellLevel };
  }
  if (
    amount.kind !== "linear_per_level" ||
    amount.axis !== "slot" ||
    amount.startingAtLevel !== spellLevel
  ) {
    return undefined;
  }
  const base = deterministic(amount.base);
  const perLevel = deterministicDelta(amount.perLevel);
  return base === undefined || perLevel === undefined
    ? undefined
    : { base, perLevel, startingAtLevel: amount.startingAtLevel };
}

function scalarBuffTemporaryHitPointProjection(
  amount: DiceAmount,
  spellLevel: number,
): ScalarBuffTemporaryHitPointProjection | undefined {
  if (amount.kind === "fixed") {
    return { kind: "fixed", expr: amount.expr };
  }
  if (
    amount.kind !== "linear_per_level" ||
    amount.axis !== "slot" ||
    amount.startingAtLevel !== spellLevel + 1 ||
    amount.base.dieSize === undefined
  ) {
    return undefined;
  }
  return {
    kind: "linear",
    baseDice: amount.base.dice,
    baseDieSize: amount.base.dieSize,
    baseFlat: amount.base.flat ?? 0,
    perLevelDice: amount.perLevel?.dice ?? 0,
    perLevelFlat: amount.perLevel?.flat ?? 0,
    startingAtLevel: amount.startingAtLevel,
  };
}

function scalarBuffEffectProjection(
  effect: ScalarBuffSurfaceEffect,
  duration: ScalarBuffDuration | undefined,
  spellLevel: number,
): ScalarBuffEffectProjection | undefined {
  return Match.value(effect).pipe(
    Match.when({ kind: "grant_temp_hp" }, (candidate) => {
      if (duration?.kind !== "instantaneous") {
        return undefined;
      }
      const amount = scalarBuffTemporaryHitPointProjection(
        candidate.amount,
        spellLevel,
      );
      return amount === undefined
        ? undefined
        : { kind: "temporaryHitPoints" as const, amount };
    }),
    Match.when({ kind: "grant_speed" }, (candidate) => {
      if (
        typeof candidate.feet !== "number" &&
        candidate.feet.kind === "walk_speed" &&
        (candidate.speedKind === "climb" || candidate.speedKind === "swim") &&
        candidate.hover === undefined
      ) {
        return {
          kind: "specialSpeedEqualTo" as const,
          speedKind: candidate.speedKind,
        };
      }
      if (
        typeof candidate.feet === "number" &&
        candidate.speedKind === "fly" &&
        candidate.hover === true
      ) {
        return {
          kind: "specialSpeedFixed" as const,
          speedFeet: movementFeet(candidate.feet),
        };
      }
      return undefined;
    }),
    Match.when({ kind: "modify_speed" }, (candidate) =>
      candidate.unit === "feet"
        ? {
            kind: "speedDelta" as const,
            deltaFeet: movementDeltaFeet(candidate.delta),
          }
        : undefined,
    ),
    Match.when({ kind: "modify_ac" }, (candidate) =>
      candidate.delta.kind === "fixed_dice" &&
      candidate.delta.sign === "+" &&
      candidate.delta.dieSize === 1
        ? { kind: "armorClassBonus" as const, bonus: candidate.delta.dice }
        : undefined,
    ),
    Match.when({ kind: "modify_ac_set_floor" }, (candidate) =>
      Number.isInteger(candidate.const) && candidate.const > 0
        ? {
            kind: "armorClassFloor" as const,
            floor: armorClass(candidate.const),
          }
        : undefined,
    ),
    Match.when({ kind: "modify_max_hp" }, (candidate) =>
      candidate.direction === "increase"
        ? (() => {
            const amount = scalarBuffMaxHitPointProjection(
              candidate.delta,
              spellLevel,
            );
            return amount === undefined
              ? undefined
              : { kind: "hitPointMaximumIncrease" as const, amount };
          })()
        : undefined,
    ),
    Match.exhaustive,
  );
}

function scalarBuffExpiration(
  actorId: CombatantId,
  duration: Exclude<ScalarBuffDuration, { readonly kind: "instantaneous" }>,
  includeConcentrationDuration: boolean,
): BattleActiveEffectExpiration {
  return duration.kind === "concentration"
    ? {
        kind: "concentration",
        combatantId: actorId,
        ...(includeConcentrationDuration
          ? {
              durationTicks: spellDurationTicksFromCanonicalValue(
                duration.upTo,
              ),
            }
          : {}),
      }
    : {
        kind: "duration",
        durationTicks: spellDurationTicksFromCanonicalValue(duration.value),
      };
}

function scalarBuffAttachmentIssueFacts(
  attachment: Attachment,
): readonly ScalarBuffFailedFact[] {
  const facts: ScalarBuffFailedFact[] = [];
  const targetAttachment =
    attachment.kind === "target"
      ? attachment
      : attachment.kind === "hole" && attachment.value.kind === "target"
        ? attachment.value
        : undefined;
  if (targetAttachment !== undefined) {
    if (targetAttachment.rangeOrigin !== undefined) facts.push("rangeOrigin");
    const selection = targetAttachment.selection;
    for (const fact of [
      "typeFilter",
      "stateFilter",
      "visibility",
      "creatureSizeFilter",
      "relativePosition",
      "objectFilter",
      "creatureDisposition",
      "castingRequirement",
      "repeatsAllowed",
    ] as const) {
      if (
        Reflect.has(selection, fact) &&
        Reflect.get(selection, fact) !== undefined
      ) {
        facts.push(fact);
      }
    }
    return facts.length === 0 ? ["attachment"] : facts;
  }
  const areaAttachment =
    attachment.kind === "area"
      ? attachment
      : attachment.kind === "hole" && attachment.value.kind === "area"
        ? attachment.value
        : undefined;
  if (areaAttachment !== undefined) {
    if (areaAttachment.selection !== undefined) facts.push("selection");
    if (areaAttachment.occupantDispositionFilter !== undefined) {
      facts.push("occupantDispositionFilter");
    }
    if (areaAttachment.occupantPerceptionFilter !== undefined) {
      facts.push("occupantPerceptionFilter");
    }
    if (areaAttachment.excludedAreas !== undefined) facts.push("excludedAreas");
    if (areaAttachment.rangeOrigin !== undefined) facts.push("rangeOrigin");
  }
  return facts.length === 0 ? ["attachment"] : facts;
}

function scalarBuffIssue(
  failedFact: ScalarBuffFailedFact,
  mechanicsPath: UnitMechanicsPath,
): ScalarBuffAdmissionIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "scalarBuff",
    failedFact,
    mechanicsPath,
    message: `Unsupported scalarBuff mechanics fact: ${failedFact}.`,
  };
}

function scalarBuffSupportedBranch(
  targeting: ScalarBuffTargetingProjection,
  duration: ScalarBuffDuration | undefined,
  effect: ScalarBuffEffectProjection | undefined,
): ScalarBuffBranchProjection {
  if (duration === undefined || effect === undefined) {
    return { tag: "unsupported" };
  }
  if (duration.kind === "instantaneous") {
    return effect.kind === "temporaryHitPoints"
      ? {
          tag: "supported",
          branchKind: "instantaneous",
          targeting,
          duration,
          effect,
        }
      : { tag: "unsupported" };
  }
  return effect.kind === "temporaryHitPoints"
    ? { tag: "unsupported" }
    : {
        tag: "supported",
        branchKind: "nonInstant",
        targeting,
        duration,
        effect,
      };
}

function scalarBuffFactsFromBranch(
  baseFacts: SpellProcedureMechanicsFacts,
  branch: ScalarBuffSupportedBranch,
  actionCost: HealingSpellActionCost,
  rangeFeet: MovementFeet,
): ScalarBuffMechanicsFacts {
  if (branch.branchKind === "instantaneous") {
    return {
      ...baseFacts,
      actionCost,
      targeting: branch.targeting,
      rangeFeet,
      branchKind: "instantaneous",
      duration: branch.duration,
      effect: branch.effect,
    };
  }
  return {
    ...baseFacts,
    actionCost,
    targeting: branch.targeting,
    rangeFeet,
    branchKind: "nonInstant",
    duration: branch.duration,
    effect: branch.effect,
  };
}

function scalarBuffActivationBranchProjection(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
  duration: ScalarBuffDuration | undefined,
  spellLevel: number,
  pushIssue: (
    failedFact: ScalarBuffFailedFact,
    mechanicsPath: UnitMechanicsPath,
  ) => void,
): ScalarBuffBranchProjection {
  const phases = scalarBuffActivationPhaseOccurrences(mechanics);
  for (const occurrence of phases) {
    if (
      occurrence.phase.kind === "direct" &&
      occurrence.phase.mode !== undefined
    ) {
      pushIssue("mode", spellActivationPhasePath(occurrence.ordinal));
    }
  }
  const effects = scalarBuffActivationEffectOccurrences(mechanics);
  const expected = effects[0];
  const selectedPhaseOrdinal =
    expected?.phaseOrdinal ??
    phases.find(({ phase }) => phase.kind === "direct")?.ordinal ??
    PositiveInteger(1);
  const selectedPhase = phases.find(
    ({ ordinal }) => ordinal === selectedPhaseOrdinal,
  )?.phase;
  if (
    mechanics.phases.length !== 1 ||
    selectedPhaseOrdinal !== PositiveInteger(1)
  ) {
    for (const occurrence of phases) {
      if (occurrence.ordinal === selectedPhaseOrdinal) continue;
      pushIssue("phaseCount", spellActivationPhasePath(occurrence.ordinal));
    }
    if (phases.length === 0) {
      pushIssue("phase", spellActivationPhasePath(PositiveInteger(1)));
    }
  }
  const attachment =
    selectedPhase?.kind === "direct" ? selectedPhase.attachment : undefined;
  const attachmentPath = spellActivationAttachmentPath(selectedPhaseOrdinal);
  const targeting =
    attachment === undefined
      ? undefined
      : scalarBuffTargetingProjection(attachment, spellLevel);
  if (attachment === undefined) {
    pushIssue("attachment", attachmentPath);
  } else if (targeting === undefined) {
    for (const failedFact of scalarBuffAttachmentIssueFacts(attachment)) {
      pushIssue(failedFact, attachmentPath);
    }
  }
  if (selectedPhase?.kind !== "direct") {
    pushIssue("phase", spellActivationPhasePath(selectedPhaseOrdinal));
  }
  const selectedEffects =
    selectedPhase?.kind === "direct" ? (selectedPhase.effects ?? []) : [];
  if (selectedEffects.length === 0) {
    pushIssue(
      "effect",
      spellActivationEffectPath(selectedPhaseOrdinal, PositiveInteger(1)),
    );
  }
  if (
    expected !== undefined &&
    expected.phaseOrdinal === selectedPhaseOrdinal
  ) {
    for (const [index] of selectedEffects.entries()) {
      const effectOrdinal = PositiveInteger(index + 1);
      if (effectOrdinal === expected.effectOrdinal) continue;
      pushIssue(
        "effect",
        spellActivationEffectPath(selectedPhaseOrdinal, effectOrdinal),
      );
    }
  }
  const effect =
    expected?.phaseOrdinal === selectedPhaseOrdinal
      ? expected.effect
      : undefined;
  const effectProjection =
    effect === undefined
      ? undefined
      : scalarBuffEffectProjection(effect, duration, spellLevel);
  if (effect === undefined || effectProjection === undefined) {
    pushIssue(
      "effect",
      spellActivationEffectPath(
        selectedPhaseOrdinal,
        expected?.phaseOrdinal === selectedPhaseOrdinal
          ? expected.effectOrdinal
          : PositiveInteger(1),
      ),
    );
  }
  return targeting === undefined
    ? { tag: "unsupported" }
    : scalarBuffSupportedBranch(targeting, duration, effectProjection);
}

function scalarBuffOngoingBranchProjection(
  mechanics: Extract<SpellMechanics, { readonly family: "ongoing_effect" }>,
  duration: ScalarBuffDuration | undefined,
  spellLevel: number,
  pushIssue: (
    failedFact: ScalarBuffFailedFact,
    mechanicsPath: UnitMechanicsPath,
  ) => void,
): ScalarBuffBranchProjection {
  if (mechanics.initialPhase !== undefined) {
    pushIssue("initialPhase", spellOngoingInitialPhasePath());
  }
  if (mechanics.authoredConditionalEffects !== undefined) {
    pushIssue("authoredConditionalEffects", spellMechanicsRootPath());
  }
  const occurrences = scalarBuffOperationOccurrences(mechanics);
  for (const occurrence of occurrences) {
    for (const failedFact of scalarBuffOperationConstraintFacts(
      occurrence.operation,
    )) {
      pushIssue(failedFact, spellOngoingOperationPath(occurrence.ordinal));
    }
  }
  const expected = occurrences.find(
    ({ operation }) =>
      operation.trigger.kind === "passive" &&
      isScalarBuffEffectKind(operation.effect),
  );
  const extras =
    expected === undefined
      ? []
      : occurrences.filter(({ ordinal }) => ordinal !== expected.ordinal);
  if (mechanics.operations.length !== 1 && extras.length === 0) {
    pushIssue(
      "operationCount",
      spellOngoingOperationPath(
        PositiveInteger(mechanics.operations.length + 1),
      ),
    );
  }
  for (const occurrence of extras) {
    pushIssue("operationCount", spellOngoingOperationPath(occurrence.ordinal));
  }
  const attachment = mechanics.attachment;
  const targeting = scalarBuffTargetingProjection(attachment, spellLevel);
  if (targeting === undefined) {
    for (const failedFact of scalarBuffAttachmentIssueFacts(attachment)) {
      pushIssue(failedFact, spellOngoingAttachmentPath());
    }
  }
  const effect = expected?.operation.effect;
  const effectProjection = isScalarBuffEffectKind(effect)
    ? scalarBuffEffectProjection(effect, duration, spellLevel)
    : undefined;
  const effectPath = spellOngoingOperationEffectPath(
    expected?.ordinal ?? PositiveInteger(1),
  );
  if (expected === undefined) {
    pushIssue("operation", effectPath);
    pushIssue("effect", effectPath);
  } else if (effectProjection === undefined) {
    pushIssue("effect", effectPath);
  }
  return targeting === undefined
    ? { tag: "unsupported" }
    : scalarBuffSupportedBranch(targeting, duration, effectProjection);
}

function isScalarBuffRepresentation(
  mechanics: SpellMechanics,
): mechanics is ScalarBuffMechanics {
  if (
    mechanics.family !== "activation" &&
    mechanics.family !== "ongoing_effect"
  ) {
    return false;
  }
  return Match.value(mechanics.family).pipe(
    Match.when("activation", () => {
      if (mechanics.family !== "activation") return false;
      const activation = mechanics;
      const hasScalarEffectKind =
        scalarBuffActivationEffectOccurrences(activation).length > 0;
      if (!hasScalarEffectKind) return false;
      return spellProcedureHasRedundantSignature({
        kind: "twoWitnessesMayBeMissing",
        witnesses: [
          hasScalarEffectKind,
          activation.phases.some(({ kind }) => kind === "direct"),
          scalarBuffSpellRangeFeet(activation.range) !== null,
          isScalarBuffDuration(activation.duration),
          topLevelSpellCastingTime(activation)?.kind === "action" ||
            topLevelSpellCastingTime(activation)?.kind === "bonus_action",
        ],
      });
    }),
    Match.when("ongoing_effect", () => {
      if (mechanics.family !== "ongoing_effect") return false;
      const ongoing = mechanics;
      const hasScalarEffectKind = ongoing.operations.some(
        ({ trigger, effect }) =>
          trigger.kind === "passive" && isScalarBuffEffectKind(effect),
      );
      if (!hasScalarEffectKind) return false;
      return spellProcedureHasRedundantSignature({
        kind: "twoWitnessesMayBeMissing",
        witnesses: [
          hasScalarEffectKind,
          ongoing.castingTime.kind === "action" ||
            ongoing.castingTime.kind === "bonus_action",
          scalarBuffSpellRangeFeet(ongoing.range) !== null,
          isScalarBuffDuration(ongoing.duration),
          ongoing.attachment.kind !== "object",
        ],
      });
    }),
    Match.exhaustive,
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
    readonly mechanicsPath: UnitMechanicsPath;
  }> = [];
  const pushIssue = (
    failedFact: ScalarBuffFailedFact,
    mechanicsPath: UnitMechanicsPath,
  ): void => {
    issues.push({ failedFact, mechanicsPath });
  };
  const castingTime = topLevelSpellCastingTime(mechanics);
  const actionCost =
    castingTime === null ? null : scalarBuffSpellActionCost(castingTime);
  if (actionCost === null) {
    pushIssue("castingTime", spellMechanicsHeaderPath("castingTime"));
  }
  const range = scalarBuffSpellRangeFeet(mechanics.range);
  if (range === null) {
    pushIssue("range", spellMechanicsHeaderPath("range"));
  }
  const duration = isScalarBuffDuration(mechanics.duration)
    ? mechanics.duration
    : undefined;
  if (duration === undefined) {
    pushIssue("duration", spellDurationValuePath());
  }
  for (const path of persistentAreaDurationChildPaths(mechanics.duration)) {
    const branch = path.nodes.at(-1);
    pushIssue(
      branch?.role === "extension" ? "durationExtension" : "durationEnding",
      path,
    );
  }
  const branch = Match.value(mechanics).pipe(
    Match.when({ family: "activation" }, (activation) =>
      scalarBuffActivationBranchProjection(
        activation,
        duration,
        Number(mechanics.level),
        pushIssue,
      ),
    ),
    Match.when({ family: "ongoing_effect" }, (ongoing) =>
      scalarBuffOngoingBranchProjection(
        ongoing,
        duration,
        Number(mechanics.level),
        pushIssue,
      ),
    ),
    Match.exhaustive,
  );
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
  if (
    actionCost === null ||
    range === null ||
    duration === undefined ||
    branch.tag !== "supported"
  ) {
    return {
      tag: "unsupported",
      issues: [scalarBuffIssue("effect", spellMechanicsHeaderPath("family"))],
    };
  }
  const facts = scalarBuffFactsFromBranch(
    source.spellDefinitionRuleFacts,
    branch,
    actionCost,
    range,
  );
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
          ...(branch.duration.kind === "instantaneous"
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

/* Legacy scalar admission helpers retained while the narrowed parser is
 * checked against the existing resolver contract.
function legacyIsScalarBuffEffect(
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

type ScalarBuffActivationEffectOccurrence = {
  readonly phaseIndex: number;
  readonly effectIndex: number;
};

type ScalarBuffOngoingOperation = Extract<
  SpellMechanics,
  { readonly family: "ongoing_effect" }
>["operations"][number];

function scalarBuffOperationConstraintFacts(
  operation: ScalarBuffOngoingOperation,
): readonly ("predicate" | "targetLimit" | "usageLimit")[] {
  const facts: Array<"predicate" | "targetLimit" | "usageLimit"> = [];
  if (operation.predicate !== undefined) facts.push("predicate");
  if (operation.targetLimit !== undefined) facts.push("targetLimit");
  if (operation.usageLimit !== undefined) facts.push("usageLimit");
  return facts;
}

function scalarBuffActivationEffectOccurrences(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): readonly ScalarBuffActivationEffectOccurrence[] {
  return mechanics.phases.flatMap((phase, phaseIndex) => {
    if (phase.kind !== "direct") return [];
    return (phase.effects ?? []).flatMap((candidate, effectIndex) => {
      if (!isEffectAtom(candidate) || !isScalarBuffEffect(candidate)) {
        return [];
      }
      return [
        {
          phaseIndex,
          effectIndex,
        },
      ];
    });
  });
}

function isScalarBuffRepresentation(
  mechanics: SpellMechanics,
): mechanics is ScalarBuffMechanics {
  const effectWitness =
    mechanics.family === "activation"
      ? scalarBuffActivationEffectOccurrences(mechanics).length > 0
      : mechanics.family === "ongoing_effect"
        ? mechanics.operations.some(
            ({ trigger, effect }) =>
              trigger.kind === "passive" && isScalarBuffEffect(effect),
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
  mechanicsPath: UnitMechanicsPath,
): ScalarBuffAdmissionIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "scalarBuff",
    failedFact,
    mechanicsPath,
    message: `Unsupported scalarBuff mechanics fact: ${failedFact}.`,
  };
}

function scalarBuffDroppedTargetSelectionFacts(
  selection: TargetSelection,
): readonly ScalarBuffFailedFact[] {
  const facts: ScalarBuffFailedFact[] = [];
  if ("typeFilter" in selection && selection.typeFilter !== undefined) {
    facts.push("typeFilter");
  }
  if ("stateFilter" in selection && selection.stateFilter !== undefined) {
    facts.push("stateFilter");
  }
  if ("visibility" in selection && selection.visibility !== undefined) {
    facts.push("visibility");
  }
  if (
    "creatureSizeFilter" in selection &&
    selection.creatureSizeFilter !== undefined
  ) {
    facts.push("creatureSizeFilter");
  }
  if (
    "relativePosition" in selection &&
    selection.relativePosition !== undefined
  ) {
    facts.push("relativePosition");
  }
  if ("objectFilter" in selection && selection.objectFilter !== undefined) {
    facts.push("objectFilter");
  }
  if (
    "creatureDisposition" in selection &&
    selection.creatureDisposition !== undefined
  ) {
    facts.push("creatureDisposition");
  }
  if (
    "castingRequirement" in selection &&
    selection.castingRequirement !== undefined
  ) {
    facts.push("castingRequirement");
  }
  if ("repeatsAllowed" in selection && selection.repeatsAllowed !== undefined) {
    facts.push("repeatsAllowed");
  }
  return facts;
}

function scalarBuffDroppedAttachmentFacts(
  attachment: Attachment,
): readonly ScalarBuffFailedFact[] {
  const facts: ScalarBuffFailedFact[] = [];
  const targetAttachment =
    attachment.kind === "target"
      ? attachment
      : attachment.kind === "hole" && attachment.value.kind === "target"
        ? attachment.value
        : undefined;
  if (targetAttachment !== undefined) {
    if (targetAttachment.rangeOrigin !== undefined) {
      facts.push("rangeOrigin");
    }
    facts.push(
      ...scalarBuffDroppedTargetSelectionFacts(targetAttachment.selection),
    );
  }
  const areaAttachment =
    attachment.kind === "area"
      ? attachment
      : attachment.kind === "hole" && attachment.value.kind === "area"
        ? attachment.value
        : undefined;
  if (areaAttachment !== undefined) {
    if (areaAttachment.selection !== undefined) facts.push("selection");
    if (areaAttachment.occupantDispositionFilter !== undefined) {
      facts.push("occupantDispositionFilter");
    }
    if (areaAttachment.occupantPerceptionFilter !== undefined) {
      facts.push("occupantPerceptionFilter");
    }
    if (areaAttachment.excludedAreas !== undefined) {
      facts.push("excludedAreas");
    }
    if (areaAttachment.rangeOrigin !== undefined) facts.push("rangeOrigin");
  }
  return facts;
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
    readonly mechanicsPath: UnitMechanicsPath;
  }> = [];
  const pushIssue = (
    failedFact: ScalarBuffFailedFact,
    mechanicsPath: UnitMechanicsPath,
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
  let attachmentPath: SpellMechanicsBranchPath =
    mechanics.family === "activation"
      ? spellActivationAttachmentPath(PositiveInteger(1))
      : spellOngoingAttachmentPath();
  let effectPath: SpellMechanicsBranchPath =
    mechanics.family === "activation"
      ? spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1))
      : spellOngoingOperationEffectPath(PositiveInteger(1));
  if (mechanics.family === "activation") {
    for (const [index, candidate] of mechanics.phases.entries()) {
      if (candidate.kind === "direct" && candidate.mode !== undefined) {
        pushIssue("mode", spellActivationPhasePath(PositiveInteger(index + 1)));
      }
    }
    const expected = scalarBuffActivationEffectOccurrences(mechanics)[0];
    const fallbackPhaseIndex = mechanics.phases.findIndex(
      (phase) => phase.kind === "direct",
    );
    const phaseIndex = expected?.phaseIndex ?? fallbackPhaseIndex;
    const phaseOrdinal = PositiveInteger(phaseIndex < 0 ? 1 : phaseIndex + 1);
    const phase = phaseIndex < 0 ? undefined : mechanics.phases[phaseIndex];
    attachmentPath = spellActivationAttachmentPath(phaseOrdinal);
    const selectedEffectOrdinal = PositiveInteger(
      expected?.phaseIndex === phaseIndex ? expected.effectIndex + 1 : 1,
    );
    effectPath = spellActivationEffectPath(phaseOrdinal, selectedEffectOrdinal);
    if (mechanics.phases.length !== 1 || phaseIndex !== 0) {
      for (const [index] of mechanics.phases.entries()) {
        if (index === phaseIndex) continue;
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
        const selectedEffectIndex =
          expected?.phaseIndex === phaseIndex ? expected.effectIndex : 0;
        for (const [index] of effects.entries()) {
          if (index === selectedEffectIndex) continue;
          pushIssue(
            "effect",
            spellActivationEffectPath(phaseOrdinal, PositiveInteger(index + 1)),
          );
        }
        const candidate = effects[selectedEffectIndex];
        if (
          candidate === undefined ||
          !isEffectAtom(candidate) ||
          !isScalarBuffEffect(candidate)
        ) {
          pushIssue(
            "effect",
            spellActivationEffectPath(
              phaseOrdinal,
              PositiveInteger(selectedEffectIndex + 1),
            ),
          );
        } else {
          effect = candidate;
        }
      }
    }
  } else {
    if (mechanics.initialPhase !== undefined) {
      pushIssue("initialPhase", spellOngoingInitialPhasePath());
    }
    if (mechanics.authoredConditionalEffects !== undefined) {
      pushIssue("authoredConditionalEffects", spellMechanicsRootPath());
    }
    attachment = mechanics.attachment;
    const occurrences = mechanics.operations.map((operation, index) => ({
      operation,
      ordinal: PositiveInteger(index + 1),
    }));
    for (const occurrence of occurrences) {
      for (const failedFact of scalarBuffOperationConstraintFacts(
        occurrence.operation,
      )) {
        pushIssue(failedFact, spellOngoingOperationPath(occurrence.ordinal));
      }
    }
    const expected = occurrences.find(
      ({ operation }) =>
        operation.trigger.kind === "passive" &&
        isScalarBuffEffect(operation.effect),
    );
    effectPath = spellOngoingOperationEffectPath(
      expected?.ordinal ?? PositiveInteger(1),
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
  if (attachment !== undefined) {
    for (const failedFact of scalarBuffDroppedAttachmentFacts(attachment)) {
      pushIssue(failedFact, attachmentPath);
    }
  }
  if (attachment === undefined) {
    pushIssue("attachment", attachmentPath);
  } else if (
    scalarBuffSpellTargeting(
      attachment,
      Number(mechanics.level),
      spellSlotLevel(Number(mechanics.level)),
    ) === null
  ) {
    pushIssue("attachment", attachmentPath);
  }
  if (
    effect === undefined ||
    !scalarBuffEffectSupported(
      effect,
      mechanics.duration,
      Number(mechanics.level),
    )
  ) {
    pushIssue("effect", effectPath);
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

*/

function scalarBuffTemporaryHitPointExpr(
  amount: ScalarBuffTemporaryHitPointProjection,
  slotLevel: number,
): DiceExpr {
  return Match.value(amount).pipe(
    Match.when({ kind: "fixed" }, ({ expr }) => expr),
    Match.when({ kind: "linear" }, (linear) => {
      const slotDelta = Math.max(0, slotLevel - linear.startingAtLevel + 1);
      return {
        dice: linear.baseDice + linear.perLevelDice * slotDelta,
        dieSize: linear.baseDieSize,
        flat: linear.baseFlat + linear.perLevelFlat * slotDelta,
      };
    }),
    Match.exhaustive,
  );
}

function scalarBuffExpirationForEffect(
  actorId: CombatantId,
  duration: ScalarBuffNonInstantDuration,
  includeConcentrationDuration: boolean,
): BattleActiveEffectExpiration {
  return scalarBuffExpiration(actorId, duration, includeConcentrationDuration);
}

function scalarBuffEffectForCast(
  actorId: CombatantId,
  facts: ScalarBuffMechanicsFacts,
  slotLevel: number,
): ScalarBuffInvocation["effect"] {
  return Match.value(facts).pipe(
    Match.when({ branchKind: "instantaneous" }, ({ effect }) => ({
      kind: "temporaryHitPoints" as const,
      amount: {
        expr: scalarBuffTemporaryHitPointExpr(effect.amount, slotLevel),
      },
    })),
    Match.when({ branchKind: "nonInstant" }, ({ duration, effect }) =>
      scalarBuffNonInstantEffectForCast(actorId, effect, duration, slotLevel),
    ),
    Match.exhaustive,
  );
}

function scalarBuffNonInstantEffectForCast(
  actorId: CombatantId,
  effect: ScalarBuffNonTemporaryEffect,
  duration: ScalarBuffNonInstantDuration,
  slotLevel: number,
): ScalarBuffInvocation["effect"] {
  return Match.value(effect).pipe(
    Match.when({ kind: "specialSpeedEqualTo" }, ({ speedKind }) => ({
      kind: "activeEffect" as const,
      activeEffect: {
        kind: "specialSpeedGrant" as const,
        sourceCombatantId: actorId,
        speedKind,
        speed: { kind: "equalToSpeed" as const },
        hover: false as const,
        expiresAt: scalarBuffExpirationForEffect(actorId, duration, true),
      },
    })),
    Match.when({ kind: "specialSpeedFixed" }, ({ speedFeet }) => ({
      kind: "activeEffect" as const,
      activeEffect: {
        kind: "specialSpeedGrant" as const,
        sourceCombatantId: actorId,
        speedKind: "fly" as const,
        speed: { kind: "fixed" as const, speedFeet },
        hover: true as const,
        expiresAt: scalarBuffExpirationForEffect(actorId, duration, true),
      },
    })),
    Match.when({ kind: "speedDelta" }, ({ deltaFeet }) => ({
      kind: "activeEffect" as const,
      activeEffect: {
        kind: "speedDelta" as const,
        sourceCombatantId: actorId,
        deltaFeet,
        expiresAt: scalarBuffExpirationForEffect(actorId, duration, false),
      },
    })),
    Match.when({ kind: "armorClassBonus" }, ({ bonus }) => ({
      kind: "activeEffect" as const,
      activeEffect: {
        kind: "spellArmorClassBonus" as const,
        sourceCombatantId: actorId,
        bonus,
        negatesRepeatedDamageAllocation: false,
        expiresAt: scalarBuffExpirationForEffect(actorId, duration, false),
      },
    })),
    Match.when({ kind: "armorClassFloor" }, ({ floor }) => ({
      kind: "activeEffect" as const,
      activeEffect: {
        kind: "spellArmorClassFloor" as const,
        sourceCombatantId: actorId,
        floor,
        expiresAt: scalarBuffExpirationForEffect(actorId, duration, false),
      },
    })),
    Match.when({ kind: "hitPointMaximumIncrease" }, ({ amount }) => ({
      kind: "hitPointMaximumIncrease" as const,
      activeEffect: {
        kind: "hitPointMaximumIncrease" as const,
        sourceCombatantId: actorId,
        amount:
          amount.base +
          amount.perLevel * Math.max(0, slotLevel - amount.startingAtLevel),
        expiresAt: scalarBuffExpirationForEffect(actorId, duration, false),
      },
    })),
    Match.exhaustive,
  );
}

function admitScalarBuff(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: ScalarBuffMechanicsFacts,
): readonly ScalarBuffInvocation[] {
  return ctx.spellCastOptions.flatMap(
    (slot): readonly ScalarBuffInvocation[] => {
      if (Number(slot.spellLevel) < Number(facts.level)) return [];
      return [
        {
          access: { tag: "prepared" },
          resource: spellInvocationResourceForCastOption(slot),
          procedure: "scalarBuff",
          spell,
          actionCost: facts.actionCost,
          targeting: scalarBuffTargetingForSlot(
            facts.targeting,
            Number(slot.spellLevel),
          ),
          effect: scalarBuffEffectForCast(
            ctx.actor.combatantId,
            facts,
            Number(slot.spellLevel),
          ),
          rangeFeet: facts.rangeFeet,
        },
      ];
    },
  );
}

/* Legacy scalar execution helpers retained while the narrowed projection is
 * checked against the existing resolver contract.
function legacyScalarBuffExpirationForEffect(
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

*/

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
