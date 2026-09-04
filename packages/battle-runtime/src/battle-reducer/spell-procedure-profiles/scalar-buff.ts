import { optionalProperty } from "../../optional-property.ts";
import {
  completeSpellActiveEffectCast,
  maybeOpenConfiguredSpellCastReactionWindow,
} from "../spell-active-effect-resolution.ts";
import type { BattleSpellExecutionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.scalar-buff
import { DiceExprSchema } from "@dnd/surface/surface/schema";
import {
  ArmorClassDeltaSchema,
  ArmorClassSchema,
  armorClass,
  armorClassDelta,
  type ArmorClassDelta,
} from "@dnd/shared-algebras/armor-class-algebra";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-glyph-stored-concentration-full-duration
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS
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
  SpellLevel,
  SpellMechanics,
  TargetSelection,
} from "@dnd/surface/surface/types";
import {
  movementDeltaFeet,
  movementFeet,
  NonNegativeInteger,
  PositiveInteger,
  HP,
  type NonNegativeInteger as NonNegativeIntegerType,
  type PositiveInteger as PositiveIntegerType,
  type SpellSlotLevel,
  type HP as HPType,
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
  admitSpellAreaAttachment,
  admitSpellTargetAttachment,
  isSpellCanonicalDurationValue,
  spellOngoingOperationOccurrences,
  spellOngoingOperationUnsupportedFacts,
  spellDurationChildCoordinates,
  spellDurationChildPath,
  spellDurationEvidencePaths,
  spellDurationTicksFromCanonicalValue,
  spellConsumedMaterialEvidencePaths,
  spellProcedureHasRedundantSignature,
  spellProcedureHasCompleteSignature,
  spellProcedureMapNonEmpty,
  spellProcedureNonEmpty,
  spellPositiveIntegerFromSurface,
  spellSlotLevelFromSurface,
  type SpellAttachmentRejection,
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
    bonus: ArmorClassDeltaSchema,
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
  | { readonly kind: "fixed"; readonly count: PositiveIntegerType }
  | {
      readonly kind: "linear";
      readonly base: PositiveIntegerType;
      readonly baseLevel: SpellSlotLevel;
      readonly perSlotAboveBase: PositiveIntegerType;
    };
type ScalarBuffTargetingProjection =
  | { readonly kind: "self" }
  | {
      readonly kind: "targetList";
      readonly count: ScalarBuffTargetCountProjection;
      readonly requiredTargetDisposition: "unrestricted" | "willing";
    };
type ScalarBuffMaxHitPointProjection = {
  readonly base: HPType;
  readonly perLevel: HPType;
  readonly startingAtLevel: PositiveIntegerType;
};
type ScalarBuffDiceExprProjection = {
  readonly dice: NonNegativeIntegerType;
  readonly dieSize: PositiveIntegerType;
  readonly flat: HPType;
};
type ScalarBuffTemporaryHitPointProjection =
  | { readonly kind: "fixed"; readonly expr: ScalarBuffDiceExprProjection }
  | {
      readonly kind: "linear";
      readonly baseDice: NonNegativeIntegerType;
      readonly baseDieSize: PositiveIntegerType;
      readonly baseFlat: HPType;
      readonly perLevelDice: NonNegativeIntegerType;
      readonly perLevelFlat: HPType;
      readonly startingAtLevel: PositiveIntegerType;
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
  | { readonly kind: "armorClassBonus"; readonly bonus: ArmorClassDelta }
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
const SCALAR_BUFF_AREA_SELECTION_FIELDS = [] as const;
const SCALAR_BUFF_AREA_OPTIONAL_FIELDS = [] as const;
const FIRST_ORDINAL = PositiveInteger(1);

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
  readonly effect: EffectAtom;
  readonly effectOrdinal: PositiveInteger;
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
  effect: EffectAtom | OngoingEffect,
): effect is ScalarBuffSurfaceEffect {
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
        isEffectAtom(candidate)
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

function nonNegativeIntegerFromSurface(
  value: number,
): NonNegativeInteger | undefined {
  return Number.isInteger(value) && value >= 0
    ? NonNegativeInteger(value)
    : undefined;
}

function hitPointAmountFromSurface(value: number): HP | undefined {
  return Number.isInteger(value) && value >= 0 ? HP.make(value) : undefined;
}

function scalarBuffTargetCountProjection(
  selection: TargetSelection,
  spellLevel: SpellLevel,
): ScalarBuffTargetCountProjection | undefined {
  if (selection.mode === "one") {
    return { kind: "fixed", count: PositiveInteger(1) };
  }
  if (selection.mode !== "choose_up_to" || selection.count === undefined) {
    return undefined;
  }
  if (typeof selection.count === "number") {
    const count = spellPositiveIntegerFromSurface(selection.count);
    return count === undefined ? undefined : { kind: "fixed", count };
  }
  if (selection.count.kind !== "linear") return undefined;
  const base = spellPositiveIntegerFromSurface(selection.count.base);
  const perSlotAboveBase = spellPositiveIntegerFromSurface(
    selection.count.perSlotAboveBase,
  );
  const baseLevel = spellSlotLevelFromSurface(
    selection.count.baseLevel ?? spellLevel,
  );
  if (
    base === undefined ||
    perSlotAboveBase === undefined ||
    baseLevel === undefined
  ) {
    return undefined;
  }
  return {
    kind: "linear",
    base,
    baseLevel,
    perSlotAboveBase,
  };
}

type ScalarBuffTargetingProjectionResult =
  | {
      readonly tag: "supported";
      readonly targeting: ScalarBuffTargetingProjection;
    }
  | {
      readonly tag: "rejected";
      readonly rejections: readonly SpellAttachmentRejection[];
    }
  | { readonly tag: "unsupported" };

function scalarBuffTargetingProjection(
  attachment: Attachment,
  spellLevel: SpellLevel,
): ScalarBuffTargetingProjectionResult {
  if (attachment.kind === "self") {
    return { tag: "supported", targeting: { kind: "self" } };
  }
  const admitted = admitSpellTargetAttachment(
    attachment,
    SCALAR_BUFF_TARGET_SELECTION_FIELDS,
  );
  if (admitted.tag === "rejected") {
    if (admitted.reason !== "targetAttachmentMissing") {
      return { tag: "rejected", rejections: [...admitted.rejections] };
    }
    const areaAdmission = admitSpellAreaAttachment(
      attachment,
      SCALAR_BUFF_AREA_SELECTION_FIELDS,
      SCALAR_BUFF_AREA_OPTIONAL_FIELDS,
    );
    if (areaAdmission.tag === "rejected") {
      return { tag: "rejected", rejections: [...areaAdmission.rejections] };
    }
    return { tag: "unsupported" };
  }
  const selection = admitted.attachment.value.selection;
  if (
    selection.targetKinds !== undefined &&
    (selection.targetKinds.length !== 1 ||
      selection.targetKinds[0] !== "creature")
  ) {
    return { tag: "unsupported" };
  }
  const count = scalarBuffTargetCountProjection(selection, spellLevel);
  return count === undefined
    ? { tag: "unsupported" }
    : {
        tag: "supported",
        targeting: {
          kind: "targetList",
          count,
          requiredTargetDisposition:
            "disposition" in selection && selection.disposition === "willing"
              ? "willing"
              : "unrestricted",
        },
      };
}

function scalarBuffTargetingForSlot(
  targeting: ScalarBuffTargetingProjection,
  slotLevel: SpellSlotLevel,
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
  spellLevel: SpellLevel,
): ScalarBuffMaxHitPointProjection | undefined {
  const deterministic = (expr: DiceExpr): HP | undefined =>
    expr.dice === 0 &&
    expr.dieSize === 1 &&
    expr.spellcastingMod !== true &&
    expr.abilityModifier === undefined
      ? hitPointAmountFromSurface(expr.flat ?? 0)
      : undefined;
  const deterministicDelta = (expr: DiceExprDelta): HP | undefined =>
    (expr.dice ?? 0) === 0 && (expr.dieSize ?? 1) === 1
      ? hitPointAmountFromSurface(expr.flat ?? 0)
      : undefined;
  const startingAtLevel = spellPositiveIntegerFromSurface(spellLevel);
  if (startingAtLevel === undefined) return undefined;
  if (amount.kind === "fixed") {
    const base = deterministic(amount.expr);
    return base === undefined
      ? undefined
      : { base, perLevel: HP.make(0), startingAtLevel };
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
  const amountStartingAtLevel = spellPositiveIntegerFromSurface(
    amount.startingAtLevel,
  );
  return base === undefined || perLevel === undefined
    ? undefined
    : amountStartingAtLevel === undefined
      ? undefined
      : { base, perLevel, startingAtLevel: amountStartingAtLevel };
}

function scalarBuffDiceExprProjection(
  expr: DiceExpr,
): ScalarBuffDiceExprProjection | undefined {
  if (expr.spellcastingMod === true || expr.abilityModifier !== undefined) {
    return undefined;
  }
  const dice = nonNegativeIntegerFromSurface(expr.dice);
  const dieSize = spellPositiveIntegerFromSurface(expr.dieSize);
  const flat = hitPointAmountFromSurface(expr.flat ?? 0);
  return dice === undefined || dieSize === undefined || flat === undefined
    ? undefined
    : { dice, dieSize, flat };
}

function scalarBuffTemporaryHitPointProjection(
  amount: DiceAmount,
  spellLevel: SpellLevel,
): ScalarBuffTemporaryHitPointProjection | undefined {
  if (amount.kind === "fixed") {
    const expr = scalarBuffDiceExprProjection(amount.expr);
    return expr === undefined ? undefined : { kind: "fixed", expr };
  }
  if (
    amount.kind !== "linear_per_level" ||
    amount.axis !== "slot" ||
    amount.startingAtLevel !== spellLevel + 1 ||
    amount.base.dieSize === undefined ||
    amount.base.spellcastingMod === true ||
    amount.base.abilityModifier !== undefined ||
    amount.perLevel.dieSize !== undefined
  ) {
    return undefined;
  }
  const baseDice = nonNegativeIntegerFromSurface(amount.base.dice);
  const baseDieSize = spellPositiveIntegerFromSurface(amount.base.dieSize);
  const baseFlat = hitPointAmountFromSurface(amount.base.flat ?? 0);
  const perLevelDice = nonNegativeIntegerFromSurface(
    amount.perLevel?.dice ?? 0,
  );
  const perLevelFlat = hitPointAmountFromSurface(amount.perLevel?.flat ?? 0);
  const startingAtLevel = spellPositiveIntegerFromSurface(
    amount.startingAtLevel,
  );
  if (
    baseDice === undefined ||
    baseDieSize === undefined ||
    baseFlat === undefined ||
    perLevelDice === undefined ||
    perLevelFlat === undefined ||
    startingAtLevel === undefined
  ) {
    return undefined;
  }
  return {
    kind: "linear",
    baseDice,
    baseDieSize,
    baseFlat,
    perLevelDice,
    perLevelFlat,
    startingAtLevel,
  };
}

function scalarBuffEffectProjection(
  effect: ScalarBuffSurfaceEffect,
  duration: ScalarBuffDuration | undefined,
  spellLevel: SpellLevel,
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
      candidate.delta.dieSize === 1 &&
      Number.isInteger(candidate.delta.dice)
        ? {
            kind: "armorClassBonus" as const,
            bonus: armorClassDelta(candidate.delta.dice),
          }
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

function scalarBuffAttachmentFailedFact(
  rejection: SpellAttachmentRejection,
): ScalarBuffFailedFact {
  return Match.value(rejection.failedFact).pipe(
    Match.whenOr(
      "attachment",
      "selection",
      "rangeOrigin",
      "typeFilter",
      "stateFilter",
      "visibility",
      "creatureSizeFilter",
      "relativePosition",
      "objectFilter",
      "creatureDisposition",
      "castingRequirement",
      "repeatsAllowed",
      (fact) => fact,
    ),
    Match.whenOr(
      "mode",
      "targetKinds",
      "objectOrLocationMaxDimensionFeet",
      "count",
      "disposition",
      "shape",
      "origin",
      "occupantDispositionFilter",
      "occupantPerceptionFilter",
      "excludedAreas",
      () => "attachment" as const,
    ),
    Match.exhaustive,
  );
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
  spellLevel: SpellLevel,
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
  const expected = effects.find(({ effect }) => isScalarBuffEffectKind(effect));
  const selectedPhaseOrdinal =
    expected?.phaseOrdinal ??
    phases.find(({ phase }) => phase.kind === "direct")?.ordinal ??
    FIRST_ORDINAL;
  const selectedPhase = phases.find(
    ({ ordinal }) => ordinal === selectedPhaseOrdinal,
  )?.phase;
  if (mechanics.phases.length !== 1 || selectedPhaseOrdinal !== FIRST_ORDINAL) {
    for (const occurrence of phases) {
      if (occurrence.ordinal === selectedPhaseOrdinal) continue;
      pushIssue("phaseCount", spellActivationPhasePath(occurrence.ordinal));
    }
    if (phases.length === 0) {
      pushIssue("phase", spellActivationPhasePath(FIRST_ORDINAL));
    }
  }
  const attachment =
    selectedPhase?.kind === "direct" ? selectedPhase.attachment : undefined;
  const attachmentPath = spellActivationAttachmentPath(selectedPhaseOrdinal);
  const targeting =
    attachment === undefined
      ? ({ tag: "unsupported" } as const)
      : scalarBuffTargetingProjection(attachment, spellLevel);
  if (attachment === undefined) {
    pushIssue("attachment", attachmentPath);
  } else if (targeting.tag === "rejected") {
    for (const rejection of targeting.rejections) {
      pushIssue(scalarBuffAttachmentFailedFact(rejection), attachmentPath);
    }
  } else if (targeting.tag === "unsupported") {
    pushIssue("attachment", attachmentPath);
  }
  if (selectedPhase?.kind !== "direct") {
    pushIssue("phase", spellActivationPhasePath(selectedPhaseOrdinal));
  }
  const selectedEffectOccurrences = effects.filter(
    ({ phaseOrdinal }) => phaseOrdinal === selectedPhaseOrdinal,
  );
  if (
    expected !== undefined &&
    expected.phaseOrdinal === selectedPhaseOrdinal
  ) {
    for (const occurrence of selectedEffectOccurrences) {
      if (occurrence.effectOrdinal === expected.effectOrdinal) continue;
      pushIssue(
        "effect",
        spellActivationEffectPath(
          selectedPhaseOrdinal,
          occurrence.effectOrdinal,
        ),
      );
    }
  }
  const selectedEffect =
    expected !== undefined && expected.phaseOrdinal === selectedPhaseOrdinal
      ? expected
      : undefined;
  const effectProjection =
    selectedEffect === undefined
      ? undefined
      : isScalarBuffEffectKind(selectedEffect.effect)
        ? scalarBuffEffectProjection(
            selectedEffect.effect,
            duration,
            spellLevel,
          )
        : undefined;
  if (selectedEffect === undefined) {
    pushIssue(
      "effect",
      spellActivationEffectPath(selectedPhaseOrdinal, FIRST_ORDINAL),
    );
  } else if (effectProjection === undefined) {
    pushIssue(
      "effect",
      spellActivationEffectPath(
        selectedPhaseOrdinal,
        selectedEffect.effectOrdinal,
      ),
    );
  }
  return targeting.tag !== "supported"
    ? { tag: "unsupported" }
    : scalarBuffSupportedBranch(
        targeting.targeting,
        duration,
        effectProjection,
      );
}

function scalarBuffOngoingBranchProjection(
  mechanics: Extract<SpellMechanics, { readonly family: "ongoing_effect" }>,
  duration: ScalarBuffDuration | undefined,
  spellLevel: SpellLevel,
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
  const occurrences = spellOngoingOperationOccurrences(mechanics);
  for (const occurrence of occurrences) {
    for (const failedFact of spellOngoingOperationUnsupportedFacts(
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
  if (mechanics.operations.length === 0) {
    pushIssue("operationCount", spellOngoingOperationPath(FIRST_ORDINAL));
  }
  for (const occurrence of extras) {
    pushIssue("operationCount", spellOngoingOperationPath(occurrence.ordinal));
  }
  const attachment = mechanics.attachment;
  const targeting = scalarBuffTargetingProjection(attachment, spellLevel);
  if (targeting.tag === "rejected") {
    for (const rejection of targeting.rejections) {
      pushIssue(
        scalarBuffAttachmentFailedFact(rejection),
        spellOngoingAttachmentPath(),
      );
    }
  } else if (targeting.tag === "unsupported") {
    pushIssue("attachment", spellOngoingAttachmentPath());
  }
  const effectProjection =
    expected === undefined
      ? undefined
      : isScalarBuffEffectKind(expected.operation.effect)
        ? scalarBuffEffectProjection(
            expected.operation.effect,
            duration,
            spellLevel,
          )
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
  return targeting.tag !== "supported"
    ? { tag: "unsupported" }
    : scalarBuffSupportedBranch(
        targeting.targeting,
        duration,
        effectProjection,
      );
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
  return Match.value(mechanics).pipe(
    Match.when({ family: "activation" }, (activation) => {
      const hasSupportedRangeRole =
        scalarBuffSpellRangeFeet(activation.range) !== null;
      const hasSupportedDurationRole = isScalarBuffDuration(
        activation.duration,
      );
      const hasSupportedCastingRole =
        topLevelSpellCastingTime(activation)?.kind === "action" ||
        topLevelSpellCastingTime(activation)?.kind === "bonus_action";
      const hasSingleDirectPhase =
        activation.phases.length === 1 &&
        activation.phases[0]?.kind === "direct";
      const hasSupportedAttachmentRole = activation.phases.some(
        (phase) =>
          phase.kind === "direct" && phase.attachment.kind !== "object",
      );
      const hasScalarEffectRole = scalarBuffActivationEffectOccurrences(
        activation,
      ).some(({ effect }) => isScalarBuffEffectKind(effect));
      const hasScalarAttachmentShape = activation.phases.some(
        (phase) =>
          phase.kind === "direct" &&
          (phase.attachment.kind === "hole" ||
            (phase.attachment.kind === "self" &&
              activation.duration.kind === "instantaneous")),
      );
      if (!hasScalarEffectRole) {
        return spellProcedureHasCompleteSignature([
          { name: "singleDirectPhase", present: hasSingleDirectPhase },
          { name: "range", present: hasSupportedRangeRole },
          { name: "duration", present: hasSupportedDurationRole },
          { name: "castingTime", present: hasSupportedCastingRole },
          {
            name: "scalarAttachmentShape",
            present: hasScalarAttachmentShape,
          },
        ]);
      }
      return spellProcedureHasRedundantSignature({
        kind: "twoWitnessesMayBeMissing",
        witnesses: [
          { name: "singleDirectPhase", present: hasSingleDirectPhase },
          { name: "range", present: hasSupportedRangeRole },
          { name: "duration", present: hasSupportedDurationRole },
          { name: "castingTime", present: hasSupportedCastingRole },
          { name: "attachment", present: hasSupportedAttachmentRole },
        ],
      });
    }),
    Match.when({ family: "ongoing_effect" }, (ongoing) => {
      const hasSupportedCastingRole =
        ongoing.castingTime.kind === "action" ||
        ongoing.castingTime.kind === "bonus_action";
      const hasSupportedRangeRole =
        scalarBuffSpellRangeFeet(ongoing.range) !== null;
      const hasSupportedDurationRole = isScalarBuffDuration(ongoing.duration);
      const hasSupportedAttachmentRole = ongoing.attachment.kind !== "object";
      const hasSingleOperation = ongoing.operations.length <= 1;
      const hasScalarEffectRole = ongoing.operations.some(({ effect }) =>
        isScalarBuffEffectKind(effect),
      );
      const hasScalarOngoingShape =
        ongoing.duration.kind === "timed" &&
        (ongoing.attachment.kind === "self" ||
          (ongoing.attachment.kind === "hole" &&
            ongoing.attachment.value.kind === "target" &&
            ongoing.attachment.value.selection.mode === "one"));
      if (!hasScalarEffectRole) {
        return spellProcedureHasCompleteSignature([
          { name: "singleOperation", present: hasSingleOperation },
          { name: "castingTime", present: hasSupportedCastingRole },
          { name: "range", present: hasSupportedRangeRole },
          { name: "duration", present: hasSupportedDurationRole },
          { name: "attachment", present: hasSupportedAttachmentRole },
          { name: "scalarOngoingShape", present: hasScalarOngoingShape },
        ]);
      }
      return spellProcedureHasRedundantSignature({
        kind: "twoWitnessesMayBeMissing",
        witnesses: [
          { name: "singleOperation", present: hasSingleOperation },
          { name: "castingTime", present: hasSupportedCastingRole },
          { name: "range", present: hasSupportedRangeRole },
          { name: "duration", present: hasSupportedDurationRole },
          { name: "attachment", present: hasSupportedAttachmentRole },
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
  for (const child of spellDurationChildCoordinates(mechanics.duration)) {
    pushIssue(
      child.branch === "extension" ? "durationExtension" : "durationEnding",
      spellDurationChildPath(child),
    );
  }
  const branch = Match.value(mechanics).pipe(
    Match.when({ family: "activation" }, (activation) =>
      scalarBuffActivationBranchProjection(
        activation,
        duration,
        mechanics.level,
        pushIssue,
      ),
    ),
    Match.when({ family: "ongoing_effect" }, (ongoing) =>
      scalarBuffOngoingBranchProjection(
        ongoing,
        duration,
        mechanics.level,
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
          ...spellDurationEvidencePaths(mechanics.duration),
          ...(mechanics.family === "activation"
            ? [
                spellActivationPhasePath(FIRST_ORDINAL),
                spellActivationAttachmentPath(FIRST_ORDINAL),
                spellActivationEffectPath(FIRST_ORDINAL, FIRST_ORDINAL),
              ]
            : [
                spellOngoingAttachmentPath(),
                spellOngoingOperationPath(FIRST_ORDINAL),
                spellOngoingOperationEffectPath(FIRST_ORDINAL),
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

function scalarBuffTemporaryHitPointExpr(
  amount: ScalarBuffTemporaryHitPointProjection,
  slotLevel: SpellSlotLevel,
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
  slotLevel: SpellSlotLevel,
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
  slotLevel: SpellSlotLevel,
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
      if (slot.spellLevel < facts.level) return [];
      return [
        {
          access: { tag: "prepared" },
          resource: spellInvocationResourceForCastOption(slot),
          procedure: "scalarBuff",
          spell,
          actionCost: facts.actionCost,
          targeting: scalarBuffTargetingForSlot(
            facts.targeting,
            slot.spellLevel,
          ),
          effect: scalarBuffEffectForCast(
            ctx.actor.combatantId,
            facts,
            slot.spellLevel,
          ),
          rangeFeet: facts.rangeFeet,
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
