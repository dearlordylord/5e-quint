// Held-light, rider, ready, and release spell resolution extracted from spells-resolve.ts.
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spell-created-held-object spell.invocation-glyph-stored-summon-object-placement
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-damage-penalty
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.remarkable-athlete
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.d20-test-natural-one-reroll

import { optionalProperty } from "../optional-property.ts";
import {
  spendAction,
  spendActivationResource,
} from "@dnd/shared-algebras/action-economy-algebra";
import { currentArmorClass } from "@dnd/shared-algebras/armor-class-algebra";
import { damageAmount as toDamageAmount } from "@dnd/shared/types";
import {
  attackRollHits,
  attackRollResultIsValid,
} from "@dnd/shared-algebras/attack-roll-algebra";
import { Result, Match } from "effect";
import {
  type ActionSpellBattleResolutionInput,
  type BattleActiveEffect,
  type BattleResolutionInputForSubject,
  type BattleResolutionResult,
  type BattleMovableLightPlacementValue,
  type BattleState,
  type BattleCreatureState,
  type BattleExecutableSpellInvocation,
  type BonusActionSpellBattleResolutionInput,
  type SpellMarkedDamageRider,
} from "../battle-state-execution.ts";
import { attackRollIsCriticalHit } from "./attack-resolution.ts";
import { maybeOpenInterruptWindow } from "./interrupt-execution.ts";
import { spellReplayContinuation } from "./spell-reaction-continuation.ts";
import { snapshotBattle } from "./battle-snapshot.ts";
import { spellAttackRerollUnsupportedIssue } from "./spell-reroll-issues.ts";
import type { BattleSubject } from "../battle-subjects.ts";
import { battleMovableLightId, type CombatantId } from "../identity.ts";
import {
  damageDispositionFillFor,
  damageDispositionFillsValidation,
  damageDispositionForTarget,
  zeroHitPointReplacementDispositionHole,
} from "./attack-damage-apply.ts";
import {
  attackRollModeMatches,
  consumeHelpAttackForAttackRoll,
  recordAttackRollOngoingFeatures,
  requiredSpellAttackRollMode,
} from "./attack-roll.ts";
import { activeEffectArmorClass } from "./creature-state-execution.ts";
import {
  applyMovableLightSpellEffect,
  applySpatialMeleeSpellAttackProxyEffect,
  movableLightFromEffect,
  repositionMovableLightSpellEffect,
  type MovableLightCastPlan,
  type MovableLightRepositionPlan,
} from "./spells-active-effects.ts";
import {
  breakBattleConcentration,
  concentrationSavingThrowHole,
  damageLifecycleConcentrationSavingThrowFillCheck,
  damageLifecycleSaveGatedConditionWithRepeatDamageRepeatSaveFillCheck,
  fillsMatchingHoleIds,
  damageLifecycleConcentrationSavingThrowHoles,
} from "./damage-apply.ts";
import { damageRelationshipDecisionFillCheck } from "./damage-relationship-decisions.ts";
import {
  activeMarkedDamageRiders,
  applyAvailableSourceDamageRollPenalty,
  damageAmountByTypeAfterTargetAdjustments,
  sourceDamageRollPenaltyRollHoleForDamageRoll,
  sourceDamageRollPenaltyRollForDamageRoll,
  unexpectedSourceDamageRollPenaltyRoll,
} from "./damage-helpers.ts";
import {
  attackRollHoleWithD20TestNaturalOneRerollOption,
  d20TestNaturalOneRerollRollDecisionRequired,
  d20TestNaturalOneRerollRollIssue,
  effectiveD20TestNaturalOneRerollAttackRoll,
} from "./d20-test-natural-one-reroll.ts";
import { revealHidden } from "./hole-helpers.ts";
import { needsHolesResult } from "./needs-holes-result.ts";
import { invalidResult } from "./result-helpers.ts";
import { resolveRemarkableAthleteCriticalHitMovement } from "./remarkable-athlete-critical-movement.ts";
import { battleStateAfterTargetActionEarlyEndForActor } from "./sanctuary-targeting-interdiction.ts";
import { expendSpellSlot } from "./spell-effects.ts";
import {
  releaseSpellCreatedHeldObjectState,
  applySpellActiveEffects,
  applySpellLightEmitterEffects,
  applySpellDamage,
  spellAttackRollHole,
  spellObjectTargetHole,
  spellDamageByTypeForTarget,
  spellDamageHole,
  type RuntimeExecutableDamageSpellProcedure,
  selectedSpellAttackDamageProcedure,
  spellTargetHole,
  spellTargetIsLegal,
  validateSpellDamageFill,
} from "./spells-holes-fills.ts";
import { markSpellSlotExpendedThisTurn } from "./spell-turn-resources.ts";
import {
  clearPendingAttackRollMissToHitReplacementSelection,
  recordAttackRollMissToHitReplacementUsed,
  selectedAttackRollMissToHitReplacement,
} from "./statblock-attacks.ts";
import { spendSpellCastResources } from "./spells-resolve-resources.ts";
import { resolveChainedSpellAttackDamageAct } from "./spells-resolve-chained.ts";
import { resolveStoredGlyphAttackBurstSaveDamageSpellRelease } from "./spells-resolve-attack-burst.ts";
import { spellCastInterruptFrame } from "./spell-cast-interrupt-frame.ts";
import type { ReadiedSpellRuntimeLaneInvocation } from "./spell-execution-facts.ts";
import type { StoredGlyphSpellReleasePlan } from "./spell-procedure-profiles/resolution-contract.ts";

import { resolvePreparedSlotSpellRelease } from "./spells-resolve-prepared-slot.ts";
import { resolveSaveGateDamageSpellRelease } from "./spells-resolve-save-gates.ts";
import { spellFillSet, type SpellFillSet } from "./spells-resolve-fill-set.ts";
import { resolveReadiedSpellObjectTarget } from "./spells-resolve-object-target.ts";
import { readiedSpellTargetSelection } from "./spells-resolve-readied-target.ts";
import { fillsBelongToSpellCastHoles } from "./fill-hole-protocol.ts";
import { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";
import {
  spellMovableLightPlacementHole,
  spatialMeleeSpellAttackProxyPositionHole,
  spatialMeleeSpellAttackProxyPositionInvalidReason,
} from "./spells-targeting.ts";

type StoredGlyphAreaRelease = Extract<
  StoredGlyphSpellReleasePlan,
  { readonly kind: "ordinaryArea" }
>;
type StoredGlyphTriggeringCreatureRelease = Extract<
  StoredGlyphSpellReleasePlan,
  { readonly kind: "ordinaryTriggeringCreature" }
>;
type StoredGlyphDirectTargetReleaseInvocation = Extract<
  StoredGlyphTriggeringCreatureRelease["invocation"],
  {
    readonly procedure:
      | "attackBurstSaveDamage"
      | "spatialMeleeSpellAttackProxy";
  }
>;

export type SpellReleaseRequest =
  | {
      readonly kind: "readiedSpell";
      readonly invocation: BattleExecutableSpellInvocation<ReadiedSpellRuntimeLaneInvocation>;
    }
  | {
      readonly kind: "storedGlyphArea";
      readonly invocation: StoredGlyphAreaRelease["invocation"];
      readonly anchorId: StoredGlyphAreaRelease["anchorId"];
    }
  | {
      readonly kind: "storedGlyphTriggeringCreature";
      readonly invocation: StoredGlyphTriggeringCreatureRelease["invocation"];
      readonly targetId: StoredGlyphTriggeringCreatureRelease["targetId"];
    };

type TargetedSpellReleaseInvocation = Extract<
  RuntimeExecutableDamageSpellProcedure,
  {
    readonly procedure:
      | "attackBurstSaveDamage"
      | "spellAttackDamage"
      | "spatialMeleeSpellAttackProxy";
  }
>;

type TargetedSpellReleaseFillSet = Extract<
  SpellFillSet,
  { readonly tag: "ok" }
>;
type TargetedSpellDamageRoll = NonNullable<
  TargetedSpellReleaseFillSet["damageRoll"]
>;
type TargetedSpellSourceDamagePenaltyRoll =
  TargetedSpellReleaseFillSet["sourceDamageRollPenaltyRolls"][number];
type TargetedSpellDamageByType = ReturnType<typeof spellDamageByTypeForTarget>;
type TargetedSpellSourcePenaltyDamageByType = Extract<
  ReturnType<typeof applyAvailableSourceDamageRollPenalty>,
  { readonly tag: "ok" }
>["damageByType"];

type TargetedSpellReleaseAfterTargetInput = {
  readonly input: ActionSpellBattleResolutionInput;
  readonly invocation: TargetedSpellReleaseInvocation;
  readonly fillSet: TargetedSpellReleaseFillSet;
  readonly target: BattleCreatureState;
};

type NonSpiritualSpellReleaseRequest =
  | Exclude<
      SpellReleaseRequest,
      { readonly kind: "storedGlyphTriggeringCreature" }
    >
  | (Omit<
      Extract<
        SpellReleaseRequest,
        { readonly kind: "storedGlyphTriggeringCreature" }
      >,
      "invocation"
    > & {
      readonly invocation: Exclude<
        StoredGlyphTriggeringCreatureRelease["invocation"],
        {
          readonly procedure:
            | "attackBurstSaveDamage"
            | "spatialMeleeSpellAttackProxy";
        }
      >;
    });

type NonChainedSpellReleaseInvocation = Exclude<
  NonSpiritualSpellReleaseRequest["invocation"],
  { readonly procedure: "chainedSpellAttackDamage" }
>;

type ReadySpellBattleResolutionInput = ActionSpellBattleResolutionInput & {
  readonly subject: ActionSpellBattleResolutionInput["subject"] & {
    readonly mode: Extract<
      ActionSpellBattleResolutionInput["subject"]["mode"],
      { readonly tag: "ready" }
    >;
  };
};

export function resolveReleaseSpellCreatedHeldObjectCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "releaseSpellCreatedHeldObject";
      }
    >
  >,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 0) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Spell-created held object release does not accept fills.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const released = releaseSpellCreatedHeldObjectState({
    state: input.state,
    actorId: input.subject.actorId,
    effectRef: input.subject.effectRef,
  });
  if (released.tag === "invalid") {
    return invalidResult(input.state, "staleSubject", released.message);
  }
  return {
    tag: "resolved",
    state: released.state,
    snapshot: snapshotBattle(released.state),
  };
}

export function resolveMovableLightCastSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    {
      readonly procedure: "movableLightManifestation";
      readonly operation: "create";
    }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (movableLightFillSetHasUnrelatedFills(input.fillSet)) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Movable-light manifestation uses only a movable-light placement fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const placement = input.fillSet.movableLightPlacement?.value;
  if (placement === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellMovableLightPlacementHole(
        input.invocation,
        input.invocation.form,
        [],
      ),
    ]);
  }
  const placementPlan = movableLightCastPlacementPlan(
    input.actorId,
    input.invocation,
    placement,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (Result.isFailure(placementPlan)) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      placementPlan.failure,
    );
  }
  /* v8 ignore stop -- @preserve */
  const spellCastReactionWindow = maybeOpenInterruptWindow(
    input.input.state,
    spellCastInterruptFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: [],
      reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
      castingResource: { kind: "magicAction" },
      continuation: spellReplayContinuation(input.input),
    }),
    input.input.handledInterruptTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }
  const resourced = spendSpellCastResources({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  /* v8 ignore start -- @preserve -- Defensive internal guard: dispatcher admission proves this cantrip's Magic Action, and spell-cast interrupt replay cannot spend the caster's Action before this synchronous commit. */
  if (resourced.tag === "invalid") return resourced;
  /* v8 ignore stop -- @preserve */
  const effected = applyMovableLightSpellEffect(
    resourced.state,
    input.actorId,
    input.invocation,
    placementPlan.success,
  );
  return {
    tag: "resolved",
    state: effected,
    snapshot: snapshotBattle(effected),
  };
}

export function resolveMovableLightRepositionSpellAct(input: {
  readonly input: BonusActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    {
      readonly procedure: "movableLightManifestation";
      readonly operation: "reposition";
    }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (movableLightFillSetHasUnrelatedFills(input.fillSet)) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Movable-light manifestation uses only a movable-light placement fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const activeEffect = input.input.state.combatants
    .get(input.actorId)
    ?.activeEffects.find(
      (
        candidate,
      ): candidate is Extract<
        BattleActiveEffect,
        { readonly kind: "movableLightManifestation" }
      > =>
        candidate.kind === "movableLightManifestation" &&
        candidate.effectRef === input.invocation.activeEffectRef &&
        candidate.sourceProcedureRef ===
          input.invocation.sourceManifestationProcedureRef &&
        candidate.sourceCombatantId === input.actorId,
    );
  if (activeEffect === undefined) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Movable-light reposition requires an active manifestation from this spell.",
    );
  }
  const placement = input.fillSet.movableLightPlacement?.value;
  if (placement === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellMovableLightPlacementHole(
        input.invocation,
        activeEffect.form,
        movableLightFromEffect(activeEffect).map((light) => light.lightId),
      ),
    ]);
  }
  const placementPlan = movableLightRepositionPlacementPlan(
    input.invocation,
    activeEffect,
    placement,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (Result.isFailure(placementPlan)) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      placementPlan.failure,
    );
  }
  /* v8 ignore stop -- @preserve */
  const effected = repositionMovableLightSpellEffect(
    input.input.state,
    input.actorId,
    placementPlan.success,
  );
  const spent = spendActivationResource(effected.currentTurnResources, {
    kind: "bonusAction",
  });
  /* v8 ignore start -- @preserve -- Defensive internal guard: dispatcher admission proves the Bonus Action is available, and the preceding synchronous light reposition does not spend turn resources. */
  if (Result.isFailure(spent)) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Bonus Action spell is no longer available for the current actor.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const state = {
    ...effected,
    currentTurnResources: spent.success,
  };
  return {
    tag: "resolved",
    state,
    snapshot: snapshotBattle(state),
  };
}

function movableLightCastPlacementPlan(
  actorId: CombatantId,
  invocation: Extract<
    BattleExecutableSpellInvocation,
    {
      readonly procedure: "movableLightManifestation";
      readonly operation: "create";
    }
  >,
  placement: BattleMovableLightPlacementValue,
): Result.Result<MovableLightCastPlan, string> {
  if (placement.mode !== "cast" || placement.form !== invocation.form) {
    return Result.fail(
      "Movable-light placement does not match the selected form.",
    );
  }
  if (placement.form === "combinedMediumForm") {
    return placement.light.distanceFromCasterFeet > invocation.rangeFeet
      ? Result.fail("Movable-light placement must be within spell range.")
      : Result.succeed({
          form: "combinedMediumForm",
          light: {
            lightId: battleMovableLightId(
              `${actorId}:${invocation.sourceProcedureRef}:combinedMediumForm:1`,
            ),
            positionId: placement.light.positionId,
          },
        });
  }
  const placements = oneToFourFromArray(placement.lights);
  if (placements === null) {
    return Result.fail(
      "Movable-light separate form requires one to four lights.",
    );
  }
  const placementError = movableLightSeparatePlacementError(
    placements,
    invocation.rangeFeet,
    invocation.spacingFeet,
  );
  if (placementError !== null) {
    return Result.fail(placementError);
  }
  return Result.succeed({
    form: "separateLights",
    lights: mapOneToFour(placements, (light, index) => ({
      lightId: battleMovableLightId(
        `${actorId}:${invocation.sourceProcedureRef}:separateLights:${index + 1}`,
      ),
      positionId: light.positionId,
    })),
  });
}

function movableLightRepositionPlacementPlan(
  invocation: Extract<
    BattleExecutableSpellInvocation,
    {
      readonly procedure: "movableLightManifestation";
      readonly operation: "reposition";
    }
  >,
  effect: Extract<
    BattleActiveEffect,
    { readonly kind: "movableLightManifestation" }
  >,
  placement: BattleMovableLightPlacementValue,
): Result.Result<MovableLightRepositionPlan, string> {
  if (placement.mode !== "reposition") {
    return Result.fail("Movable-light movement requires reposition placement.");
  }
  if (placement.form !== effect.form) {
    return Result.fail(
      "Movable-light movement form does not match the active manifestation.",
    );
  }
  const placements =
    placement.form === "combinedMediumForm"
      ? [placement.light]
      : placement.lights;
  if (
    placements.some(
      (candidate) => candidate.moveDistanceFeet > invocation.maxMoveFeet,
    )
  ) {
    return Result.fail("Movable-light reposition exceeds its movement limit.");
  }
  const currentMovableLightIds = movableLightFromEffect(effect).map(
    (movableLight) => movableLight.lightId,
  );
  const placedLightIds = placements.map((candidate) => candidate.lightId);
  const narrowedPlacements = oneToFourFromArray(placements);
  if (
    narrowedPlacements === null ||
    placedLightIds.length !== new Set(placedLightIds).size ||
    placedLightIds.length !== currentMovableLightIds.length ||
    placedLightIds.some((lightId) => !currentMovableLightIds.includes(lightId))
  ) {
    return Result.fail(
      "Movable-light movement must place each active light identity.",
    );
  }
  const inRange = oneToFourFromArray(
    narrowedPlacements.filter(
      (candidate) => candidate.distanceFromCasterFeet <= invocation.rangeFeet,
    ),
  );
  if (inRange === null) {
    return Result.succeed({
      kind: "removeEffect",
      effect,
    });
  }
  if (placement.form === "separateLights") {
    const placementError = movableLightSeparatePlacementError(
      inRange,
      invocation.rangeFeet,
      invocation.spacingFeet,
    );
    if (placementError !== null) {
      return Result.fail(placementError);
    }
    return Result.succeed({
      kind: "replaceEffect",
      effect,
      effectShape: {
        form: "separateLights",
        lights: mapOneToFour(inRange, ({ lightId, positionId }) => ({
          lightId,
          positionId,
        })),
      },
    });
  }
  return Result.succeed({
    kind: "replaceEffect",
    effect,
    effectShape: {
      form: "combinedMediumForm",
      light: {
        lightId: placement.light.lightId,
        positionId: placement.light.positionId,
      },
    },
  });
}

function movableLightFillSetHasUnrelatedFills(
  fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>,
): boolean {
  return (
    fillSet.targetId !== undefined ||
    fillSet.objectTarget !== undefined ||
    fillSet.targetSpatialFacts.length > 0 ||
    fillSet.targetAllocation !== undefined ||
    fillSet.targetList !== undefined ||
    fillSet.attackSequencePartFills.some(
      (attackSequencePartFill) =>
        attackSequencePartFill.target !== undefined ||
        attackSequencePartFill.attackRoll !== undefined ||
        attackSequencePartFill.damageRoll !== undefined,
    ) ||
    fillSet.attackRoll !== undefined ||
    fillSet.savingThrowOutcomes !== undefined ||
    fillSet.skillChoice !== undefined ||
    fillSet.targetAbilityChoices !== undefined ||
    fillSet.abilityChoice !== undefined ||
    fillSet.commandOptionChoice !== undefined ||
    fillSet.areaChoice !== undefined ||
    fillSet.damageTypeChoice !== undefined ||
    fillSet.concentrationSavingThrows.length > 0 ||
    fillSet.hideousLaughterDamageRepeatSaves.length > 0 ||
    fillSet.damageDispositions.length > 0 ||
    fillSet.damageRoll !== undefined ||
    fillSet.movement !== undefined ||
    fillSet.spellDamageReductionRolls.length > 0 ||
    fillSet.attackBurstDamageRoll !== undefined ||
    fillSet.healingRoll !== undefined
  );
}

type OneToFour<T> =
  | readonly [T]
  | readonly [T, T]
  | readonly [T, T, T]
  | readonly [T, T, T, T];

function oneToFourFromArray<T>(values: readonly T[]): OneToFour<T> | null {
  return values.length === 1
    ? [values[0]!]
    : values.length === 2
      ? [values[0]!, values[1]!]
      : values.length === 3
        ? [values[0]!, values[1]!, values[2]!]
        : values.length === 4
          ? [values[0]!, values[1]!, values[2]!, values[3]!]
          : null;
}

function mapOneToFour<T, U>(
  values: OneToFour<T>,
  mapValue: (value: T, index: number) => U,
): OneToFour<U> {
  return values.length === 1
    ? [mapValue(values[0], 0)]
    : values.length === 2
      ? [mapValue(values[0], 0), mapValue(values[1], 1)]
      : values.length === 3
        ? [
            mapValue(values[0], 0),
            mapValue(values[1], 1),
            mapValue(values[2], 2),
          ]
        : [
            mapValue(values[0], 0),
            mapValue(values[1], 1),
            mapValue(values[2], 2),
            mapValue(values[3], 3),
          ];
}

function movableLightSeparatePlacementError(
  placements: OneToFour<{
    readonly distanceFromCasterFeet: number;
    readonly nearestSiblingDistanceFeet?: number;
  }>,
  rangeFeet: number,
  spacingFeet: number,
): string | null {
  if (
    placements.some((candidate) => candidate.distanceFromCasterFeet > rangeFeet)
  ) {
    return "Movable-light placement must be within spell range.";
  }
  if (
    placements.length > 1 &&
    placements.some(
      (candidate) =>
        candidate.nearestSiblingDistanceFeet === undefined ||
        candidate.nearestSiblingDistanceFeet > spacingFeet,
    )
  ) {
    return "Separate movable lights must remain within their spacing limit.";
  }
  return null;
}

export function resolveReadySpellAct(
  input: ReadySpellBattleResolutionInput,
  invocation: BattleExecutableSpellInvocation<ReadiedSpellRuntimeLaneInvocation>,
): BattleResolutionResult {
  const fillSet = spellFillSet(
    input.fills,
    invocation,
    input.subject.procedureRef,
    input.subject.actorId,
    input.state,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fillSet.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!fillsBelongToSpellCastHoles(input.fills)) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Ready Spell accepts only spell-cast Reaction trigger facts.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Defensive lifecycle guard: Ready spends the caster's only Magic-capable Action, and supported extra-action grants cannot Ready another spell before the held spell expires. */
  if (input.state.readiedSpells.has(input.subject.actorId)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "This caster is already holding a readied spell.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const castingState = invocation.spellRuleFacts.components.verbal
    ? revealHidden(input.state, input.subject.actorId)
    : input.state;
  const spellCastState = battleStateAfterTargetActionEarlyEndForActor(
    castingState,
    input.subject.actorId,
  );
  const spellCastReactionWindow = maybeOpenInterruptWindow(
    spellCastState,
    spellCastInterruptFrame({
      casterId: input.subject.actorId,
      invocation,
      targetIds: [],
      reactionSpellTargetFacts: fillSet.reactionSpellTargetFacts,
      castingResource: { kind: "magicAction" },
      continuation: spellReplayContinuation(input),
    }),
    input.handledInterruptTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const afterPriorConcentration = breakBattleConcentration(
    spellCastState,
    input.subject.actorId,
  );
  const refreshedActor = afterPriorConcentration.combatants.get(
    input.subject.actorId,
  );
  /* v8 ignore start -- @preserve -- Defensive internal guard: invocation admission proves a character caster, and synchronous Concentration teardown preserves that combatant and origin. */
  if (refreshedActor?.origin.kind !== "character") {
    return invalidResult(
      input.state,
      "staleSubject",
      "Ready Spell caster is no longer available.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const concentratingActor = {
    ...refreshedActor,
    concentration: {
      sourceProcedureRef: input.subject.procedureRef,
      effectKind: "readiedSpell" as const,
    },
  };
  const withConcentration = {
    ...afterPriorConcentration,
    combatants: new Map(afterPriorConcentration.combatants).set(
      input.subject.actorId,
      concentratingActor,
    ),
    readiedSpells: new Map(afterPriorConcentration.readiedSpells).set(
      input.subject.actorId,
      {
        procedureRef: input.subject.procedureRef,
        trigger: input.subject.mode.trigger,
        expiresAt: {
          kind: "startOfTurn" as const,
          combatantId: input.subject.actorId,
        },
      },
    ),
  };
  const spent = spendAction(withConcentration.currentTurnResources, "magic");
  /* v8 ignore start -- @preserve -- Defensive internal guard: dispatcher Magic-action admission runs before Ready resolution, and the preceding synchronous setup does not spend an Action. */
  if (Result.isFailure(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Magic action is no longer available for the current actor.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const slotted =
    invocation.resource.tag === "spellSlot"
      ? expendSpellSlot(
          withConcentration,
          input.subject.actorId,
          invocation.resource.slotLevel,
        )
      : withConcentration;
  const nextTurnResources =
    invocation.resource.tag === "spellSlot"
      ? markSpellSlotExpendedThisTurn(spent.success, input.subject.actorId)
      : Result.succeed(spent.success);
  /* v8 ignore start -- @preserve -- Defensive internal guard: spell discovery and interrupt-checkpoint admission reject a second committed Spell Slot use before Ready resolution. */
  if (Result.isFailure(nextTurnResources)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const nextState = {
    ...slotted,
    currentTurnResources: nextTurnResources.success,
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveSpellRelease(
  input: ActionSpellBattleResolutionInput,
  request: SpellReleaseRequest,
): BattleResolutionResult {
  if (request.kind === "storedGlyphTriggeringCreature") {
    const invocation = request.invocation;
    if (invocation.procedure === "attackBurstSaveDamage") {
      const fillSet = spellFillSet(
        input.fills,
        invocation,
        invocation.sourceProcedureRef,
        input.subject.actorId,
        input.state,
      );
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered holes. */
      if (fillSet.tag === "invalid") {
        return invalidResult(input.state, "invalidFill", fillSet.message);
      }
      /* v8 ignore stop -- @preserve */
      return resolveStoredGlyphAttackBurstSaveDamageSpellRelease({
        input,
        actorId: input.subject.actorId,
        invocation,
        fillSet,
        triggeringTargetId: request.targetId,
      });
    }
    return invocation.procedure === "spatialMeleeSpellAttackProxy"
      ? resolveStoredGlyphDirectTargetRelease(
          input,
          invocation,
          request.targetId,
        )
      : resolveNonSpiritualSpellRelease(input, { ...request, invocation });
  }
  return resolveNonSpiritualSpellRelease(input, request);
}

function resolveNonSpiritualSpellRelease(
  input: ActionSpellBattleResolutionInput,
  request: NonSpiritualSpellReleaseRequest,
): BattleResolutionResult {
  const candidateInvocation = request.invocation;
  if (candidateInvocation.procedure === "chainedSpellAttackDamage") {
    return resolveChainedSpellAttackDamageAct({
      input,
      actorId: input.subject.actorId,
      invocation: candidateInvocation,
      opensSpellCastReactionWindow: false,
      spendsCastResources: false,
    });
  }
  const fillSet = spellFillSet(
    input.fills,
    candidateInvocation,
    candidateInvocation.sourceProcedureRef,
    input.subject.actorId,
    input.state,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fillSet.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  /* v8 ignore stop -- @preserve */
  return resolveNonSpiritualSelectedInvocation({
    input,
    request,
    candidateInvocation,
    fillSet,
  });
}

function resolveNonSpiritualSelectedInvocation(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly request: NonSpiritualSpellReleaseRequest;
  readonly candidateInvocation: NonChainedSpellReleaseInvocation;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  const selectedInvocation = selectedSpellAttackDamageProcedure(
    input.candidateInvocation,
    input.fillSet.damageTypeChoice,
  );
  if (selectedInvocation.tag === "needsHoles") {
    return needsHolesResult(input.input.state, input.input.subject, [
      selectedInvocation.hole,
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: the selected invocation must satisfy the admitted spell release procedure contract. */
  if (selectedInvocation.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      selectedInvocation.message,
    );
  }
  /* v8 ignore stop -- @preserve */
  const invocation = selectedInvocation.invocation;
  if (invocation.procedure === "saveGatedDamage") {
    return resolveSaveGateDamageSpellRelease({
      input: input.input,
      actorId: input.input.subject.actorId,
      invocation,
      fillSet: input.fillSet,
      ...optionalProperty(
        "selfOriginAreaAnchorId",
        input.request.kind === "storedGlyphArea"
          ? input.request.anchorId
          : undefined,
      ),
      ...(input.request.kind === "readiedSpell"
        ? {}
        : { opensSpellCastReactionWindow: false }),
    });
  }
  if (invocation.procedure === "repeatedDamageAllocation") {
    return resolvePreparedSlotSpellRelease({
      input: input.input,
      actorId: input.input.subject.actorId,
      invocation,
      fillSet: input.fillSet,
    });
  }
  if (invocation.procedure === "spellAttackDamage") {
    return Match.value(
      readiedSpellTargetSelection(input.fillSet, invocation),
    ).pipe(
      Match.discriminatorsExhaustive("tag")({
        invalid: (selection) =>
          invalidResult(input.input.state, "invalidFill", selection.message),
        none: () =>
          needsHolesResult(input.input.state, input.input.subject, [
            spellTargetHole(
              input.input.state,
              input.input.subject.actorId,
              invocation,
            ),
            ...(invocation.targeting.kind === "singleCreatureOrObject"
              ? [spellObjectTargetHole(invocation)]
              : []),
          ]),
        creature: (selection) =>
          resolveTargetedSpellRelease(
            input.input,
            invocation,
            selection.fillSet,
            selection.fillSet.targetId,
            input.request.kind === "storedGlyphTriggeringCreature" &&
              selection.fillSet.targetId === input.request.targetId,
          ),
        object: (selection) =>
          resolveReadiedSpellObjectTarget({
            input: input.input,
            actorId: input.input.subject.actorId,
            invocation,
            fillSet: selection.fillSet,
          }),
      }),
    );
  }
  return invocation;
}

function resolveStoredGlyphDirectTargetRelease(
  input: ActionSpellBattleResolutionInput,
  candidateInvocation: StoredGlyphDirectTargetReleaseInvocation,
  targetId: CombatantId,
): BattleResolutionResult {
  const fillSet = spellFillSet(
    input.fills,
    candidateInvocation,
    candidateInvocation.sourceProcedureRef,
    input.subject.actorId,
    input.state,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fillSet.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  /* v8 ignore stop -- @preserve */
  const selectedInvocation = selectedSpellAttackDamageProcedure(
    candidateInvocation,
    fillSet.damageTypeChoice,
  );
  if (selectedInvocation.tag === "needsHoles") {
    return needsHolesResult(input.state, input.subject, [
      selectedInvocation.hole,
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (selectedInvocation.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      selectedInvocation.message,
    );
  }
  /* v8 ignore stop -- @preserve */
  const invocation = selectedInvocation.invocation;
  if (invocation.procedure === "spatialMeleeSpellAttackProxy") {
    if (fillSet.spatialMeleeSpellAttackProxyPosition === undefined) {
      return needsHolesResult(input.state, input.subject, [
        spatialMeleeSpellAttackProxyPositionHole(invocation),
      ]);
    }
    const placementError = spatialMeleeSpellAttackProxyPositionInvalidReason(
      fillSet.spatialMeleeSpellAttackProxyPosition,
      invocation,
    );
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (placementError !== null) {
      /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(input.state, "invalidFill", placementError);
    }
    /* v8 ignore stop -- @preserve */
  }
  return resolveTargetedSpellRelease(
    input,
    invocation,
    fillSet,
    targetId,
    true,
  );
}

function resolveTargetedSpellRelease(
  input: ActionSpellBattleResolutionInput,
  invocation: TargetedSpellReleaseInvocation,
  fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>,
  targetId: CombatantId,
  storedGlyphRetargetingMatches: boolean,
): BattleResolutionResult {
  const target = input.state.combatants.get(targetId);
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    target == null ||
    (!storedGlyphRetargetingMatches &&
      !spellTargetIsLegal(
        input.state,
        input.subject.actorId,
        target.combatantId,
        invocation,
        fillSet.targetSpatialFacts,
      ))
  ) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Readied spell target must be a combatant within the selected spell's supported range.",
    );
  }
  /* v8 ignore stop -- @preserve */
  return resolveTargetedSpellReleaseAfterTarget({
    input,
    invocation,
    fillSet,
    target,
  });
}

function resolveTargetedSpellReleaseAfterTarget(
  input: TargetedSpellReleaseAfterTargetInput,
): BattleResolutionResult {
  const attackPreparation = resolveTargetedSpellAttackPreparation({
    input: input.input,
    invocation: input.invocation,
    fillSet: input.fillSet,
    target: input.target,
  });
  if (attackPreparation.tag === "result") return attackPreparation.result;
  const {
    spellMarkedDamageRiders,
    releaseResolutionStateAfterCriticalMovement,
  } = attackPreparation;
  return resolveTargetedSpellDamage({
    input: input.input,
    invocation: input.invocation,
    fillSet: input.fillSet,
    target: input.target,
    spellMarkedDamageRiders,
    releaseResolutionStateAfterCriticalMovement,
  });
}

type TargetedSpellAttackPreparation =
  | { readonly tag: "result"; readonly result: BattleResolutionResult }
  | {
      readonly tag: "ready";
      readonly spellMarkedDamageRiders: readonly SpellMarkedDamageRider[];
      readonly releaseResolutionStateAfterCriticalMovement: BattleState | null;
    };

type TargetedSpellAttackRollPreparation =
  | { readonly tag: "result"; readonly result: BattleResolutionResult }
  | {
      readonly tag: "ready";
      readonly effectiveAttackRoll: ReturnType<
        typeof effectiveD20TestNaturalOneRerollAttackRoll
      >;
      readonly ordinaryHit: boolean;
      readonly missToHitReplacement: ReturnType<
        typeof selectedAttackRollMissToHitReplacement
      >;
      readonly releaseAttackRolledState: BattleState;
    };

function targetedSpellAttackRollIssue(input: {
  readonly attackRoll: NonNullable<
    Extract<SpellFillSet, { readonly tag: "ok" }>["attackRoll"]
  >;
  readonly requiredRollMode: ReturnType<typeof requiredSpellAttackRollMode>;
}): string | null {
  if (!attackRollResultIsValid(input.attackRoll)) {
    return "Spell attack roll result is outside the d20 attack-roll protocol.";
  }
  const spellAttackRerollIssue = spellAttackRerollUnsupportedIssue(
    input.attackRoll,
  );
  if (spellAttackRerollIssue !== null) return spellAttackRerollIssue;
  return attackRollModeMatches(input.attackRoll, input.requiredRollMode)
    ? null
    : "Readied spell attack roll mode does not match the current attack-roll rule.";
}

function prepareTargetedSpellAttackRoll(
  input: TargetedSpellReleaseAfterTargetInput,
): TargetedSpellAttackRollPreparation {
  const requiredRollMode = requiredSpellAttackRollMode(
    input.input.state,
    input.input.subject.actorId,
    input.target.combatantId,
    input.invocation,
    input.fillSet.targetSpatialFacts,
  );
  const attackRoll = input.fillSet.attackRoll;
  if (attackRoll === undefined) {
    return {
      tag: "result",
      result: needsHolesResult(input.input.state, input.input.subject, [
        spellAttackRollHole(
          input.input.state,
          input.input.subject.actorId,
          input.invocation,
          requiredRollMode,
        ),
      ]),
    };
  }
  const attackRollError = targetedSpellAttackRollIssue({
    attackRoll,
    requiredRollMode,
  });
  if (attackRollError !== null) {
    return {
      tag: "result",
      result: invalidResult(input.input.state, "invalidFill", attackRollError),
    };
  }
  const actorBeforeSpellAttack = input.input.state.combatants.get(
    input.input.subject.actorId,
  );
  if (
    d20TestNaturalOneRerollRollDecisionRequired({
      actor: actorBeforeSpellAttack,
      originalNaturalD20: Number(attackRoll.naturalD20),
      rollMode: attackRoll.rollMode,
      rolledD20s: attackRoll.rolledD20s,
      decision: attackRoll.d20TestNaturalOneReroll,
    })
  ) {
    return {
      tag: "result",
      result: needsHolesResult(input.input.state, input.input.subject, [
        attackRollHoleWithD20TestNaturalOneRerollOption(
          spellAttackRollHole(
            input.input.state,
            input.input.subject.actorId,
            input.invocation,
            requiredRollMode,
          ),
        ),
      ]),
    };
  }
  const d20TestNaturalOneRerollIssue = d20TestNaturalOneRerollRollIssue({
    actor: actorBeforeSpellAttack,
    total: attackRoll.total,
    originalNaturalD20: Number(attackRoll.naturalD20),
    rollMode: attackRoll.rollMode,
    rolledD20s: attackRoll.rolledD20s,
    decision: attackRoll.d20TestNaturalOneReroll,
    requiredRollMode,
  });
  if (d20TestNaturalOneRerollIssue !== null) {
    return {
      tag: "result",
      result: invalidResult(
        input.input.state,
        "invalidFill",
        d20TestNaturalOneRerollIssue,
      ),
    };
  }
  const effectiveAttackRoll =
    effectiveD20TestNaturalOneRerollAttackRoll(attackRoll);
  const ordinaryHit = attackRollHits(
    effectiveAttackRoll,
    currentArmorClass(activeEffectArmorClass(input.input.state, input.target)),
  );
  const missToHitReplacement = selectedAttackRollMissToHitReplacement({
    state: input.input.state,
    subject: input.input.subject,
    attackerId: input.input.subject.actorId,
    targetId: input.target.combatantId,
    attackRoll: effectiveAttackRoll,
    ordinaryHit,
  });
  if (
    attackRoll.missToHitReplacementProcedureRef !== undefined &&
    missToHitReplacement === null
  ) {
    return {
      tag: "result",
      result: invalidResult(
        input.input.state,
        "invalidFill",
        ordinaryHit
          ? "Attack-roll miss-to-hit replacement can only be selected after a miss."
          : "Attack-roll miss-to-hit replacement is not available for this spell attack roll.",
      ),
    };
  }
  const releaseAttackRolledState = recordAttackRollMissToHitReplacementUsed(
    consumeHelpAttackForAttackRoll(
      recordAttackRollOngoingFeatures(
        input.input.state,
        input.input.subject.actorId,
        input.target.combatantId,
        null,
        input.fillSet.targetRelationshipFacts,
      ),
      input.input.subject.actorId,
      input.target.combatantId,
    ),
    input.input.subject.actorId,
    missToHitReplacement,
    {
      subject: input.input.subject,
      targetId: input.target.combatantId,
      attackRoll: effectiveAttackRoll,
    },
  );
  return {
    tag: "ready",
    effectiveAttackRoll,
    ordinaryHit,
    missToHitReplacement,
    releaseAttackRolledState,
  };
}

function resolveTargetedSpellAttackPreparation(
  input: TargetedSpellReleaseAfterTargetInput,
): TargetedSpellAttackPreparation {
  if (
    input.invocation.procedure !== "spellAttackDamage" &&
    input.invocation.procedure !== "spatialMeleeSpellAttackProxy"
  ) {
    return input.fillSet.attackRoll != null
      ? {
          tag: "result",
          result: invalidResult(
            input.input.state,
            "invalidFill",
            "Magic Missile does not use an attack roll.",
          ),
        }
      : {
          tag: "ready",
          spellMarkedDamageRiders: [],
          releaseResolutionStateAfterCriticalMovement: null,
        };
  }
  const rollPreparation = prepareTargetedSpellAttackRoll(input);
  if (rollPreparation.tag === "result") return rollPreparation;
  return resolveTargetedSpellAttackAfterRoll(input, rollPreparation);
}

function resolveTargetedSpellAttackAfterRoll(
  input: TargetedSpellReleaseAfterTargetInput,
  rollPreparation: Extract<
    TargetedSpellAttackRollPreparation,
    { readonly tag: "ready" }
  >,
): TargetedSpellAttackPreparation {
  const {
    effectiveAttackRoll,
    ordinaryHit,
    missToHitReplacement,
    releaseAttackRolledState,
  } = rollPreparation;
  const hit = ordinaryHit || missToHitReplacement !== null;
  const critical = attackRollIsCriticalHit(effectiveAttackRoll);
  const spellMarkedDamageRiders = hit
    ? activeMarkedDamageRiders(
        releaseAttackRolledState.combatants.get(input.input.subject.actorId),
        input.target.combatantId,
      )
    : [];
  const remarkableAthleteMovement = resolveRemarkableAthleteCriticalHitMovement(
    {
      state: releaseAttackRolledState,
      subject: input.input.subject,
      attackerId: input.input.subject.actorId,
      scoredCriticalHit: critical,
      fills: input.fillSet,
    },
  );
  if (remarkableAthleteMovement.tag === "result") {
    return remarkableAthleteMovement.result.tag === "needsHoles"
      ? {
          tag: "result",
          result: {
            ...remarkableAthleteMovement.result,
            state: input.input.state,
            snapshot: snapshotBattle(input.input.state),
          },
        }
      : {
          tag: "result",
          result: {
            ...remarkableAthleteMovement.result,
            snapshot: snapshotBattle(input.input.state),
          },
        };
  }
  const spatialMeleeSpellAttackProxyRepeatTargeting = {
    kind: "fixedCombatant" as const,
    combatantId: input.target.combatantId,
  };
  const releaseResolutionStateAfterCriticalMovement =
    input.invocation.procedure === "spatialMeleeSpellAttackProxy" &&
    input.invocation.operation === "createAndAttack" &&
    input.fillSet.spatialMeleeSpellAttackProxyPosition !== undefined
      ? applySpatialMeleeSpellAttackProxyEffect({
          state: remarkableAthleteMovement.state,
          actorId: input.input.subject.actorId,
          forcePositionId:
            input.fillSet.spatialMeleeSpellAttackProxyPosition.positionId,
          repeatTargeting: spatialMeleeSpellAttackProxyRepeatTargeting,
          invocation: input.invocation,
        })
      : remarkableAthleteMovement.state;
  return resolveTargetedSpellAttackDamageOutcome({
    ...input,
    hit,
    critical,
    spellMarkedDamageRiders,
    releaseResolutionStateAfterCriticalMovement,
  });
}

function resolveTargetedSpellAttackDamageOutcome(
  input: TargetedSpellReleaseAfterTargetInput & {
    readonly hit: boolean;
    readonly critical: boolean;
    readonly spellMarkedDamageRiders: readonly SpellMarkedDamageRider[];
    readonly releaseResolutionStateAfterCriticalMovement: BattleState;
  },
): TargetedSpellAttackPreparation {
  return input.hit
    ? resolveTargetedSpellAttackHitDamageOutcome(input)
    : resolveTargetedSpellAttackMissDamageOutcome(input);
}

function resolveTargetedSpellAttackHitDamageOutcome(
  input: TargetedSpellReleaseAfterTargetInput & {
    readonly hit: boolean;
    readonly critical: boolean;
    readonly spellMarkedDamageRiders: readonly SpellMarkedDamageRider[];
    readonly releaseResolutionStateAfterCriticalMovement: BattleState;
  },
): TargetedSpellAttackPreparation {
  if (input.fillSet.damageRoll !== undefined) {
    return {
      tag: "ready",
      spellMarkedDamageRiders: input.spellMarkedDamageRiders,
      releaseResolutionStateAfterCriticalMovement:
        input.releaseResolutionStateAfterCriticalMovement,
    };
  }
  if (input.fillSet.sourceDamageRollPenaltyRolls.length > 0) {
    return {
      tag: "result",
      result: invalidResult(
        input.input.state,
        "invalidFill",
        "Source damage roll penalty does not match an active source-side damage penalty.",
      ),
    };
  }
  return {
    tag: "result",
    result: needsHolesResult(input.input.state, input.input.subject, [
      spellDamageHole(
        input.invocation,
        input.critical,
        input.spellMarkedDamageRiders,
      ),
    ]),
  };
}

function resolveTargetedSpellAttackMissDamageOutcome(
  input: TargetedSpellReleaseAfterTargetInput & {
    readonly hit: boolean;
    readonly critical: boolean;
    readonly spellMarkedDamageRiders: readonly SpellMarkedDamageRider[];
    readonly releaseResolutionStateAfterCriticalMovement: BattleState;
  },
): TargetedSpellAttackPreparation {
  if (
    input.fillSet.damageRoll != null ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.sourceDamageRollPenaltyRolls.length > 0
  ) {
    return {
      tag: "result",
      result: invalidResult(
        input.input.state,
        "invalidFill",
        "Spell damage can only be filled after a hit.",
      ),
    };
  }
  return {
    tag: "result",
    result: {
      tag: "resolved",
      state: input.releaseResolutionStateAfterCriticalMovement,
      snapshot: snapshotBattle(
        input.releaseResolutionStateAfterCriticalMovement,
      ),
    },
  };
}

type TargetedSpellDamageInput = Pick<
  TargetedSpellReleaseAfterTargetInput,
  "input" | "invocation" | "fillSet" | "target"
> & {
  readonly spellMarkedDamageRiders: readonly SpellMarkedDamageRider[];
  readonly releaseResolutionStateAfterCriticalMovement: BattleState | null;
};

type TargetedSpellDamageWithRollInput = TargetedSpellDamageInput & {
  readonly damageRoll: TargetedSpellDamageRoll;
};

type TargetedSpellDamagePreparation =
  | { readonly tag: "result"; readonly result: BattleResolutionResult }
  | {
      readonly tag: "ready";
      readonly damageRoll: TargetedSpellDamageRoll;
      readonly releaseDamageBaseState: BattleState;
      readonly critical: boolean;
      readonly sourceDamageRollPenaltyRoll:
        | TargetedSpellSourceDamagePenaltyRoll
        | undefined;
      readonly sourcePenaltyDamageByType: TargetedSpellSourcePenaltyDamageByType;
    };

type TargetedSpellSourceDamagePreparation =
  | { readonly tag: "result"; readonly result: BattleResolutionResult }
  | {
      readonly tag: "ready";
      readonly sourceDamageRollPenaltyRoll:
        | TargetedSpellSourceDamagePenaltyRoll
        | undefined;
      readonly sourcePenaltyDamageByType: TargetedSpellSourcePenaltyDamageByType;
    };

type TargetedSpellDamageLifecycleInput = TargetedSpellDamageWithRollInput & {
  readonly releaseDamageBaseState: BattleState;
  readonly critical: boolean;
  readonly sourceDamageRollPenaltyRoll:
    | TargetedSpellSourceDamagePenaltyRoll
    | undefined;
  readonly sourcePenaltyDamageByType: TargetedSpellSourcePenaltyDamageByType;
};

function resolveTargetedSpellDamage(
  input: TargetedSpellDamageInput,
): BattleResolutionResult {
  const preparation = prepareTargetedSpellDamage(input);
  if (preparation.tag === "result") return preparation.result;
  return resolveTargetedSpellDamageLifecycle({
    ...input,
    ...preparation,
  });
}

function prepareTargetedSpellDamage(
  input: TargetedSpellDamageInput,
): TargetedSpellDamagePreparation {
  const damageRoll = input.fillSet.damageRoll;
  if (damageRoll == null) {
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (input.fillSet.sourceDamageRollPenaltyRolls.length > 0) {
      /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return {
        tag: "result",
        result: invalidResult(
          input.input.state,
          "invalidFill",
          "Source damage roll penalty does not match an active source-side damage penalty.",
        ),
      };
    }
    /* v8 ignore stop -- @preserve */
    return {
      tag: "result",
      result: needsHolesResult(input.input.state, input.input.subject, [
        spellDamageHole(input.invocation),
      ]),
    };
  }
  return prepareTargetedSpellDamageWithRoll({
    ...input,
    damageRoll,
  });
}

function targetedSpellReleaseAttackRoll(
  input: TargetedSpellDamageInput,
): ReturnType<typeof effectiveD20TestNaturalOneRerollAttackRoll> | undefined {
  if (
    input.invocation.procedure !== "spellAttackDamage" &&
    input.invocation.procedure !== "spatialMeleeSpellAttackProxy"
  ) {
    return undefined;
  }
  const attackRoll = input.fillSet.attackRoll;
  return attackRoll == null
    ? undefined
    : effectiveD20TestNaturalOneRerollAttackRoll(attackRoll);
}

function prepareTargetedSpellDamageWithRoll(
  input: TargetedSpellDamageWithRollInput,
): TargetedSpellDamagePreparation {
  const releaseDamageBaseState =
    input.releaseResolutionStateAfterCriticalMovement ?? input.input.state;
  const effectiveReleaseAttackRoll = targetedSpellReleaseAttackRoll(input);
  const critical =
    effectiveReleaseAttackRoll !== undefined &&
    attackRollIsCriticalHit(effectiveReleaseAttackRoll);
  const damageValidation = validateSpellDamageFill(
    input.damageRoll,
    input.invocation,
    critical,
    input.spellMarkedDamageRiders,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (damageValidation !== null) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return {
      tag: "result",
      result: invalidResult(input.input.state, "invalidFill", damageValidation),
    };
  }
  /* v8 ignore stop -- @preserve */
  const spellDamageByType = spellDamageByTypeForTarget(
    input.target,
    input.invocation,
    input.damageRoll,
    "full",
    input.spellMarkedDamageRiders,
    critical,
  );
  const sourcePreparation = resolveTargetedSpellSourceDamagePreparation({
    ...input,
    releaseDamageBaseState,
    spellDamageByType,
  });
  if (sourcePreparation.tag === "result") return sourcePreparation;
  return {
    tag: "ready",
    damageRoll: input.damageRoll,
    releaseDamageBaseState,
    critical,
    sourceDamageRollPenaltyRoll: sourcePreparation.sourceDamageRollPenaltyRoll,
    sourcePenaltyDamageByType: sourcePreparation.sourcePenaltyDamageByType,
  };
}

function resolveTargetedSpellSourceDamagePreparation(
  input: TargetedSpellDamageWithRollInput & {
    readonly releaseDamageBaseState: BattleState;
    readonly spellDamageByType: TargetedSpellDamageByType;
  },
): TargetedSpellSourceDamagePreparation {
  const damageSource = input.releaseDamageBaseState.combatants.get(
    input.input.subject.actorId,
  );
  const expectedSourcePenaltyHole =
    sourceDamageRollPenaltyRollHoleForDamageRoll(
      damageSource,
      input.spellDamageByType,
      input.damageRoll.holeId,
    );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    unexpectedSourceDamageRollPenaltyRoll(
      input.fillSet.sourceDamageRollPenaltyRolls,
      expectedSourcePenaltyHole === null ? [] : [expectedSourcePenaltyHole],
    ) !== undefined
  ) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return {
      tag: "result",
      result: invalidResult(
        input.input.state,
        "invalidFill",
        "Source damage roll penalty does not match an active source-side damage penalty.",
      ),
    };
  }
  /* v8 ignore stop -- @preserve */
  const sourceDamageRollPenaltyRoll = sourceDamageRollPenaltyRollForDamageRoll(
    input.fillSet.sourceDamageRollPenaltyRolls,
    damageSource,
    input.spellDamageByType,
    input.damageRoll.holeId,
  );
  const sourcePenalty = applyAvailableSourceDamageRollPenalty(
    damageSource,
    input.spellDamageByType,
    input.damageRoll.holeId,
    sourceDamageRollPenaltyRoll,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (sourcePenalty.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return {
      tag: "result",
      result: invalidResult(
        input.input.state,
        "invalidFill",
        "Source damage roll penalty does not match an active source-side damage penalty.",
      ),
    };
  }
  /* v8 ignore stop -- @preserve */
  if (sourcePenalty.tag === "needsHoles") {
    return {
      tag: "result",
      result: needsHolesResult(input.input.state, input.input.subject, [
        ...sourcePenalty.holes,
      ]),
    };
  }
  return {
    tag: "ready",
    sourceDamageRollPenaltyRoll,
    sourcePenaltyDamageByType: sourcePenalty.damageByType,
  };
}

type TargetedSpellDamageAmountInput = Pick<
  TargetedSpellDamageLifecycleInput,
  "input" | "fillSet" | "target" | "releaseDamageBaseState" | "damageRoll"
> & { readonly spellDamageAmount: number };

type TargetedSpellConcentrationPreparation =
  | { readonly tag: "result"; readonly result: BattleResolutionResult }
  | {
      readonly tag: "ready";
      readonly concentrationFill: ReturnType<
        typeof concentrationSavingThrowFillFor
      >;
      readonly concentrationLifecycleFills: TargetedSpellReleaseFillSet["concentrationSavingThrows"];
    };

type TargetedSpellHideousLaughterPreparation =
  | { readonly tag: "result"; readonly result: BattleResolutionResult }
  | {
      readonly tag: "ready";
      readonly hideousLaughterLifecycleFills: TargetedSpellReleaseFillSet["hideousLaughterDamageRepeatSaves"];
    };

type TargetedSpellDamageDispositionPreparation =
  | { readonly tag: "result"; readonly result: BattleResolutionResult }
  | {
      readonly tag: "ready";
      readonly damageDisposition: ReturnType<typeof damageDispositionForTarget>;
    };

type TargetedSpellRelationshipDecisions = Extract<
  ReturnType<typeof damageRelationshipDecisionFillCheck>,
  { readonly tag: "ok" }
>["decisions"];

type TargetedSpellDamageResolvedLifecycleInput =
  TargetedSpellDamageAmountInput & {
    readonly critical: boolean;
    readonly sourceDamageRollPenaltyRoll:
      | TargetedSpellSourceDamagePenaltyRoll
      | undefined;
    readonly spellMarkedDamageRiders: readonly SpellMarkedDamageRider[];
    readonly concentrationFill: ReturnType<
      typeof concentrationSavingThrowFillFor
    >;
    readonly concentrationLifecycleFills: TargetedSpellReleaseFillSet["concentrationSavingThrows"];
    readonly damageDisposition: ReturnType<typeof damageDispositionForTarget>;
    readonly hideousLaughterLifecycleFills: TargetedSpellReleaseFillSet["hideousLaughterDamageRepeatSaves"];
    readonly relationshipDecisions: TargetedSpellRelationshipDecisions;
    readonly invocation: TargetedSpellReleaseInvocation;
  };

function resolveTargetedSpellConcentrationLifecycle(
  input: TargetedSpellDamageAmountInput,
): TargetedSpellConcentrationPreparation {
  const concentrationSave = concentrationSavingThrowHole(
    input.target,
    input.spellDamageAmount,
  );
  const concentrationLifecycleHoles =
    damageLifecycleConcentrationSavingThrowHoles({
      state: input.releaseDamageBaseState,
      target: input.target,
      damageAmount: input.spellDamageAmount,
    });
  const concentrationLifecycleFills = fillsMatchingHoleIds(
    input.fillSet.concentrationSavingThrows,
    concentrationLifecycleHoles,
  );
  const concentrationFill =
    concentrationSave === null
      ? undefined
      : concentrationSavingThrowFillFor(
          concentrationLifecycleFills,
          concentrationSave,
        );
  const concentrationSaveCheck =
    damageLifecycleConcentrationSavingThrowFillCheck({
      state: input.releaseDamageBaseState,
      target: input.target,
      damageAmount: input.spellDamageAmount,
      fills: input.fillSet.concentrationSavingThrows,
    });
  if (concentrationSaveCheck.tag === "needsHoles") {
    return {
      tag: "result",
      result: needsHolesResult(input.input.state, input.input.subject, [
        ...concentrationSaveCheck.holes,
      ]),
    };
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (concentrationSaveCheck.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return {
      tag: "result",
      result: invalidResult(
        input.input.state,
        "invalidFill",
        concentrationSaveCheck.message,
      ),
    };
  }
  /* v8 ignore stop -- @preserve */
  return {
    tag: "ready",
    concentrationFill,
    concentrationLifecycleFills,
  };
}

function resolveTargetedSpellHideousLaughterLifecycle(
  input: TargetedSpellDamageAmountInput,
): TargetedSpellHideousLaughterPreparation {
  const hideousLaughterSaveCheck =
    damageLifecycleSaveGatedConditionWithRepeatDamageRepeatSaveFillCheck({
      state: input.releaseDamageBaseState,
      target: input.target,
      damageAmount: input.spellDamageAmount,
      fills: input.fillSet.hideousLaughterDamageRepeatSaves,
    });
  if (hideousLaughterSaveCheck.tag === "needsHoles") {
    return {
      tag: "result",
      result: needsHolesResult(input.input.state, input.input.subject, [
        ...hideousLaughterSaveCheck.holes,
      ]),
    };
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (hideousLaughterSaveCheck.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return {
      tag: "result",
      result: invalidResult(
        input.input.state,
        "invalidFill",
        hideousLaughterSaveCheck.message,
      ),
    };
  }
  /* v8 ignore stop -- @preserve */
  return {
    tag: "ready",
    hideousLaughterLifecycleFills: fillsMatchingHoleIds(
      input.fillSet.hideousLaughterDamageRepeatSaves,
      hideousLaughterSaveCheck.holes,
    ),
  };
}

function resolveTargetedSpellDamageDisposition(
  input: TargetedSpellDamageAmountInput,
): TargetedSpellDamageDispositionPreparation {
  const damageDispositionHole = zeroHitPointReplacementDispositionHole({
    damageSourceId: input.input.subject.actorId,
    target: input.target,
    damageAmount: input.spellDamageAmount,
  });
  const damageDispositionValidation = damageDispositionFillsValidation({
    holes: damageDispositionHole === null ? [] : [damageDispositionHole],
    fills: input.fillSet.damageDispositions,
  });
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (damageDispositionValidation !== null) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return {
      tag: "result",
      result: invalidResult(
        input.input.state,
        "invalidFill",
        damageDispositionValidation,
      ),
    };
  }
  /* v8 ignore stop -- @preserve */
  if (
    damageDispositionHole !== null &&
    damageDispositionFillFor(
      input.fillSet.damageDispositions,
      damageDispositionHole,
    ) === undefined
  ) {
    return {
      tag: "result",
      result: needsHolesResult(input.input.state, input.input.subject, [
        damageDispositionHole,
      ]),
    };
  }
  return {
    tag: "ready",
    damageDisposition: damageDispositionForTarget(
      damageDispositionHole === null ? [] : [damageDispositionHole],
      input.fillSet.damageDispositions,
      input.target.combatantId,
    ),
  };
}

function resolveTargetedSpellDamageRelationship(
  input: TargetedSpellDamageAmountInput & {
    readonly damageDisposition: ReturnType<typeof damageDispositionForTarget>;
  },
):
  | { readonly tag: "result"; readonly result: BattleResolutionResult }
  | {
      readonly tag: "ready";
      readonly relationshipDecisions: TargetedSpellRelationshipDecisions;
    } {
  const relationshipCheck = damageRelationshipDecisionFillCheck({
    state: input.releaseDamageBaseState,
    damageEventHoleId: input.damageRoll.holeId,
    damageSourceId: input.input.subject.actorId,
    targets:
      input.spellDamageAmount <= 0
        ? []
        : [
            {
              targetId: input.target.combatantId,
              damageAmount: toDamageAmount(input.spellDamageAmount),
              damageDisposition: input.damageDisposition,
            },
          ],
    spatialFacts: input.fillSet.targetSpatialFacts,
    decisionsByRelationshipHole: input.fillSet.damageRelationshipDecisions,
  });
  if (relationshipCheck.tag === "needsHoles") {
    return {
      tag: "result",
      result: needsHolesResult(
        input.input.state,
        input.input.subject,
        relationshipCheck.holes,
      ),
    };
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (relationshipCheck.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return {
      tag: "result",
      result: invalidResult(
        input.input.state,
        "invalidFill",
        relationshipCheck.message,
      ),
    };
  }
  /* v8 ignore stop -- @preserve */
  return {
    tag: "ready",
    relationshipDecisions: relationshipCheck.decisions,
  };
}

function resolveTargetedSpellDamageLifecycle(
  lifecycleInput: TargetedSpellDamageLifecycleInput,
): BattleResolutionResult {
  const {
    input,
    invocation,
    fillSet,
    target,
    spellMarkedDamageRiders,
    releaseDamageBaseState,
    critical,
    sourceDamageRollPenaltyRoll,
    sourcePenaltyDamageByType,
  } = lifecycleInput;
  const spellDamageAmount = damageAmountByTypeAfterTargetAdjustments(
    input.state,
    target,
    sourcePenaltyDamageByType,
  );
  const damageAmountInput = {
    input,
    fillSet,
    target,
    releaseDamageBaseState,
    damageRoll: lifecycleInput.damageRoll,
    spellDamageAmount,
  } satisfies TargetedSpellDamageAmountInput;
  const concentrationPreparation =
    resolveTargetedSpellConcentrationLifecycle(damageAmountInput);
  if (concentrationPreparation.tag === "result") {
    return concentrationPreparation.result;
  }
  const dispositionPreparation =
    resolveTargetedSpellDamageDisposition(damageAmountInput);
  if (dispositionPreparation.tag === "result") {
    return dispositionPreparation.result;
  }
  const hideousLaughterPreparation =
    resolveTargetedSpellHideousLaughterLifecycle(damageAmountInput);
  if (hideousLaughterPreparation.tag === "result") {
    return hideousLaughterPreparation.result;
  }
  const relationshipPreparation = resolveTargetedSpellDamageRelationship({
    ...damageAmountInput,
    damageDisposition: dispositionPreparation.damageDisposition,
  });
  if (relationshipPreparation.tag === "result") {
    return relationshipPreparation.result;
  }
  return applyTargetedSpellDamageLifecycle({
    ...damageAmountInput,
    invocation,
    critical,
    sourceDamageRollPenaltyRoll,
    spellMarkedDamageRiders,
    concentrationFill: concentrationPreparation.concentrationFill,
    concentrationLifecycleFills:
      concentrationPreparation.concentrationLifecycleFills,
    damageDisposition: dispositionPreparation.damageDisposition,
    hideousLaughterLifecycleFills:
      hideousLaughterPreparation.hideousLaughterLifecycleFills,
    relationshipDecisions: relationshipPreparation.relationshipDecisions,
  });
}

function applyTargetedSpellDamageLifecycle(
  input: TargetedSpellDamageResolvedLifecycleInput,
): BattleResolutionResult {
  const damaged = applySpellDamage(
    input.releaseDamageBaseState,
    input.target.combatantId,
    input.invocation,
    input.damageRoll,
    input.critical,
    {
      concentrationSavingThrow: input.concentrationFill,
      wardingBondDamageShareConcentrationSavingThrows:
        input.concentrationLifecycleFills,
      damageDisposition: input.damageDisposition,
      spellMarkedDamageRiders: input.spellMarkedDamageRiders,
      sourceDamageRollPenaltyRoll: input.sourceDamageRollPenaltyRoll,
      saveGatedConditionWithRepeatDamageRepeatSaves:
        input.hideousLaughterLifecycleFills,
      damageSourceId: input.input.subject.actorId,
      spatialFacts: input.fillSet.targetSpatialFacts,
      ...optionalProperty("relationshipDecisions", input.relationshipDecisions),
    },
  );
  const effected = applySpellActiveEffects(
    damaged,
    input.input.subject.actorId,
    input.target.combatantId,
    input.invocation,
  );
  const lit =
    input.invocation.procedure === "spellAttackDamage"
      ? applySpellLightEmitterEffects(
          effected,
          input.input.subject.actorId,
          {
            kind: "combatant",
            combatantId: input.target.combatantId,
          },
          input.invocation,
        )
      : effected;
  const resolvedState = {
    ...lit,
    currentTurnResources: clearPendingAttackRollMissToHitReplacementSelection(
      lit.currentTurnResources,
      input.input.subject.actorId,
    ),
  };
  return {
    tag: "resolved",
    state: resolvedState,
    snapshot: snapshotBattle(resolvedState),
  };
}
