// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-persistent-area-save-condition spell.invocation-persistent-area-save-condition-escape-hazard spell.invocation-persistent-area-save-composite-area-hazard spell.invocation-stationary-persistent-area-area-hazard spell.invocation-translatingPersistentArea-area-hazard spell.invocation-directional-persistent-area-line spell.invocation-ram-movable-persistent-area-hazard-ram spell.invocation-movablePersistentArea-movable-zone
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.GREASE_GROUND_HAZARD_LIFECYCLE BATTLE.SPELL.WEB_RESTRAINT_HAZARD_LIFECYCLE BATTLE.SPELL.SLEET_STORM_AREA_HAZARD_LIFECYCLE BATTLE.SPELL.STATIONARY_PERSISTENT_AREA_AREA_HAZARD_LIFECYCLE BATTLE.SPELL.TRANSLATING_PERSISTENT_AREA_AREA_HAZARD_LIFECYCLE BATTLE.SPELL.GUST_OF_WIND_LINE_LIFECYCLE BATTLE.SPELL.RAM_MOVABLE_PERSISTENT_AREA_HAZARD_LIFECYCLE BATTLE.SPELL.MOVABLE_PERSISTENT_AREA_MOVABLE_ZONE_LIFECYCLE

import { Result, Match } from "effect";
import {
  canSpendBonusAction,
  spendAction,
  spendActivationResource,
} from "@dnd/shared-algebras/action-economy-algebra";
import { rolledDiceTotal } from "@dnd/shared-algebras/runtime-dice-algebra";
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import type {
  BattleRuntimeCommand,
  BattlePersistentAreaSaveCompositeTrigger as BattlePersistentAreaSaveCompositeMembershipTrigger,
  BattleStationaryPersistentAreaSaveDamageTrigger as BattleStationaryPersistentAreaSaveDamageMembershipTrigger,
  BattleTranslatingPersistentAreaSaveDamageTrigger as BattleTranslatingPersistentAreaSaveDamageMembershipTrigger,
  BattleSubject,
} from "../battle-subjects.ts";
import {
  type BattleAreaId,
  type BattleEffectExecutionRef,
  type BattleProcedureExecutionRef,
  CombatantId,
} from "../identity.ts";
import type {
  BattleActiveEffect,
  BattleCreatureState,
  BattleFill,
  BattleHandledInterruptOccurrence,
  BattleCollisionRepositionPersistentAreaSaveDamageRollHole,
  BattlePersistentAreaSaveDamageRamMovementHole,
  BattleCollisionRepositionPersistentAreaSaveDamageTrigger,
  BattlePersistentAreaSaveConditionSavingThrowOutcomeHole,
  BattleHole,
  BattleDirectedRepositionPersistentAreaSaveDamageRollHole,
  BattleDirectedRepositionPersistentAreaSaveDamageTrigger,
  BattleMovableZoneRepositionMovementHole,
  BattleResolutionInput,
  BattleResolutionInputForSubject,
  BattleResolutionResult,
  BattleStartTurnOccurrenceSequenceCheckpoint,
  BattleSavingThrowOutcome,
  BattleSavingThrowOutcomeValue,
  BattleSpellAreaChoice,
  BattlePersistentAreaSaveCompositeSavingThrowOutcomeHole,
  BattlePersistentAreaSaveCompositeTrigger,
  BattleState,
  BattlePersistentAreaSaveConditionEscapeTrigger,
} from "../battle-state-execution.ts";
import { validateRolledDiceFillForDiceExpr } from "../battle-state-execution.ts";
import {
  breakBattleConcentration,
  concentrationSavingThrowHole,
} from "./damage-apply.ts";
import { damageAmountAfterTargetAdjustments } from "./damage-helpers.ts";
import {
  rolledDiceFillForHole,
  savingThrowOutcomeFillForHole,
  everyFillUsesHoleId,
} from "./fill-hole-protocol.ts";
import { maybeOpenInterruptWindow } from "./interrupt-execution.ts";
import { needsHolesResult } from "./needs-holes-result.ts";
import { invalidResult } from "./result-helpers.ts";
import { snapshotBattle } from "./battle-snapshot.ts";
import { currentActorId } from "./creature-state-leaves.ts";
import { combatantCanTakeActions } from "./creature-state-execution.ts";
import {
  ramMovablePersistentAreaDamageAfterSave,
  ramMovablePersistentAreaMoveDistanceAccepted,
} from "./collision-reposition-area-hazard.ts";
import {
  movablePersistentAreaDamageAfterSave,
  movablePersistentAreaMoveDistanceAccepted,
} from "./directed-reposition-area.ts";
import {
  resolveTranslatingPersistentAreaAreaSaveDamage,
  resolveStationaryPersistentAreaAreaSaveDamage,
} from "./persistent-area-save-damage.ts";
import { validateDirectionalPersistentAreaAreaPushFacts } from "./directional-area-push-facts.ts";
import { revertShapeShiftedCombatantToTrueForm } from "./shape-shifting.ts";
import {
  isEndTurnFillKind,
  resolveDelegatedEndTurnCommand,
  resolveStagedDelegatedEndTurnCommand,
} from "./turn-boundary-lifecycle.ts";
import { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";
import {
  applyPreparedSlotSpellDamage,
  savingThrowFlatBonusProjections,
  savingThrowRollModeProjections,
} from "./spells-damage-fills.ts";
import {
  applyPersistentAreaSaveConditionProneToTarget,
  applyPersistentAreaSaveCompositeFailedSaveEffect,
  applyPersistentAreaSaveConditionEscapeRestrainedCondition,
  markPersistentAreaSaveCompositeSavedThisTurn,
  markMovablePersistentAreaSavedThisTurn,
  addMovablePersistentAreaShapeShiftSuppression,
  removeMovablePersistentAreaShapeShiftSuppression,
  replaceDirectionalPersistentAreaDirection,
  markPersistentAreaSaveConditionEscapeSavedThisTurn,
  removePersistentAreaSaveConditionEscapeRestrainedCondition,
} from "./spells-active-effects.ts";
import {
  persistentAreaSaveConditionSavingThrowOutcomeHole,
  ramMovablePersistentAreaRamMovementHole,
  ramMovablePersistentAreaRepositionMovementHole,
  ramMovablePersistentAreaSavingThrowOutcomeHole,
  ramMovablePersistentAreaTriggerLabel,
  directionalPersistentAreaDirectionChoiceHole,
  directionalPersistentAreaSavingThrowOutcomeHole,
  movablePersistentAreaRepositionMovementHole,
  movablePersistentAreaSavingThrowOutcomeHole,
  movablePersistentAreaTriggerLabel,
  persistentAreaSaveConditionEscapeSavingThrowOutcomeHole,
  type RamMovablePersistentAreaEffect,
  type PersistentAreaSaveConditionEffect,
  type DirectionalPersistentAreaEffect,
  type MovablePersistentAreaEffect,
  type PersistentAreaSaveConditionEscapeEffect,
} from "./persistent-spatial-spell-discovery.ts";

export type PersistentAreaSaveCompositeEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "persistentAreaSaveComposite" }
>;

const PERSISTENT_SPATIAL_SPELL_PROCEDURE_COMMANDS = [
  "persistentAreaSaveConditionSave",
  "persistentAreaSaveConditionEscapeSave",
  "persistentAreaSaveCompositeSave",
  "persistentAreaSaveDamageSave",
  "endPersistentAreaSaveConditionEscapeForDeparture",
  "endPersistentAreaSaveConditionEscapeForAreaRemoval",
  "directionalPersistentAreaSave",
  "directionalPersistentAreaDirectionChange",
  "movableZoneSave",
  "movableZoneReposition",
  "movableZoneRam",
  "persistentAreaSaveDamageExit",
] as const satisfies ReadonlyArray<BattleRuntimeCommand>;

type PersistentSpatialSpellProcedureCommand =
  (typeof PERSISTENT_SPATIAL_SPELL_PROCEDURE_COMMANDS)[number];

type PersistentSpatialReplayRoute = {
  readonly handledSaveFailedOccurrence?: Extract<
    BattleHandledInterruptOccurrence,
    { readonly trigger: "saveFailed" }
  >;
  readonly replayParentPosition?: BattleStartTurnOccurrenceSequenceCheckpoint;
};

type PersistentSpatialSpellProcedureSubject = Extract<
  BattleSubject,
  {
    readonly tag: "runtimeCommand";
    readonly command: PersistentSpatialSpellProcedureCommand;
  }
>;

type MovableZoneSaveSubject = Extract<
  BattleSubject,
  {
    readonly tag: "runtimeCommand";
    readonly command: "movableZoneSave";
  }
>;

type RamMovablePersistentAreaSaveSubject = Extract<
  MovableZoneSaveSubject,
  { readonly trigger: "endsTurnWithinFiveFeetOfSphere" }
>;

type MovablePersistentAreaSaveSubject = Extract<
  MovableZoneSaveSubject,
  { readonly trigger: BattleDirectedRepositionPersistentAreaSaveDamageTrigger }
>;

type PersistentSpatialSaveFailedReplaySubject = Extract<
  PersistentSpatialSpellProcedureSubject,
  {
    readonly command:
      | "persistentAreaSaveConditionSave"
      | "persistentAreaSaveConditionEscapeSave"
      | "persistentAreaSaveCompositeSave"
      | "directionalPersistentAreaSave"
      | "movableZoneSave"
      | "movableZoneRam";
  }
>;

function persistentSpatialReplayEffectRef(
  subject: PersistentSpatialSaveFailedReplaySubject,
): BattleEffectExecutionRef {
  return Match.value(subject).pipe(
    Match.discriminatorsExhaustive("command")({
      persistentAreaSaveConditionSave: ({ effectRef }) => effectRef,
      persistentAreaSaveConditionEscapeSave: ({ effectRef }) => effectRef,
      persistentAreaSaveCompositeSave: ({ areaMembershipTrigger }) =>
        areaMembershipTrigger.effectRef,
      directionalPersistentAreaSave: ({ effectRef }) => effectRef,
      movableZoneSave: ({ effectRef }) => effectRef,
      movableZoneRam: ({ effectRef }) => effectRef,
    }),
  );
}

function maybeOpenPersistentSpatialSaveFailedReplayInterrupt(input: {
  readonly state: BattleState;
  readonly outcome: BattleSavingThrowOutcome;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly replaySubject: PersistentSpatialSaveFailedReplaySubject;
  readonly replayFills: readonly BattleFill[];
  readonly handledSaveFailedOccurrence:
    | Extract<
        BattleHandledInterruptOccurrence,
        { readonly trigger: "saveFailed" }
      >
    | undefined;
  readonly replayParentPosition:
    | BattleStartTurnOccurrenceSequenceCheckpoint
    | undefined;
}): Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> | null {
  if (input.outcome.succeeded) {
    return null;
  }
  const effectRef = persistentSpatialReplayEffectRef(input.replaySubject);
  const handledThisOccurrence =
    input.handledSaveFailedOccurrence?.targetId === input.outcome.targetId &&
    input.handledSaveFailedOccurrence.sourceProcedureRef ===
      input.sourceProcedureRef &&
    input.handledSaveFailedOccurrence.effectRef === effectRef;
  return maybeOpenInterruptWindow(
    input.state,
    {
      trigger: "saveFailed",
      targetId: input.outcome.targetId,
      sourceProcedureRef: input.sourceProcedureRef,
      effectRef,
      continuation: {
        kind: "replay",
        subject: input.replaySubject,
        fills: input.replayFills,
        ...(input.replayParentPosition === undefined
          ? {}
          : { parentPosition: input.replayParentPosition }),
      },
    },
    handledThisOccurrence ? "saveFailed" : undefined,
  );
}

export function isPersistentSpatialSpellProcedureSubject(
  subject: BattleSubject,
): subject is PersistentSpatialSpellProcedureSubject {
  return (
    subject.tag === "runtimeCommand" &&
    PERSISTENT_SPATIAL_SPELL_PROCEDURE_COMMANDS.some(
      (command) => command === subject.command,
    )
  );
}

export function isPersistentAreaSubjectAllowedOutsideCurrentActorTurn(
  subject: BattleSubject,
): boolean {
  if (subject.tag !== "runtimeCommand") return false;
  if (subject.command === "persistentAreaSaveDamageSave") {
    return Match.value(subject.areaMembershipTrigger.kind).pipe(
      Match.when("appearsInArea", () => true),
      Match.when("areaMovesIntoSpace", () => true),
      Match.when("firstEntryOnTurn", () => true),
      Match.when("turnEndInArea", () => false),
      Match.exhaustive,
    );
  }
  return false;
}

export function resolvePersistentSpatialSpellProcedureCommand(
  input: BattleResolutionInputForSubject<PersistentSpatialSpellProcedureSubject> &
    PersistentSpatialReplayRoute,
): BattleResolutionResult {
  return Match.value(input.subject).pipe(
    Match.when({ command: "persistentAreaSaveConditionSave" }, (subject) =>
      resolvePersistentAreaSaveConditionSaveCommand({
        ...input,
        subject,
      }),
    ),
    Match.when(
      { command: "persistentAreaSaveConditionEscapeSave" },
      (subject) =>
        resolvePersistentAreaSaveConditionEscapeSaveCommand({
          ...input,
          subject,
        }),
    ),
    Match.when({ command: "persistentAreaSaveCompositeSave" }, (subject) =>
      resolvePersistentAreaSaveCompositeSaveCommand({ ...input, subject }),
    ),
    Match.when({ command: "persistentAreaSaveDamageSave" }, (subject) =>
      resolvePersistentAreaSaveDamageCommand({ ...input, subject }),
    ),
    Match.when(
      { command: "endPersistentAreaSaveConditionEscapeForDeparture" },
      (subject) =>
        resolvePersistentAreaSaveConditionEscapeRestrainedNoLongerInAreaCommand(
          {
            ...input,
            subject,
          },
        ),
    ),
    Match.when(
      { command: "endPersistentAreaSaveConditionEscapeForAreaRemoval" },
      (subject) =>
        resolvePersistentAreaSaveConditionEscapeAreaRemovedCommand({
          ...input,
          subject,
        }),
    ),
    Match.when({ command: "directionalPersistentAreaSave" }, (subject) =>
      resolveDirectionalPersistentAreaSaveCommand({ ...input, subject }),
    ),
    Match.when(
      { command: "directionalPersistentAreaDirectionChange" },
      (subject) =>
        resolveDirectionalPersistentAreaDirectionChangeCommand({
          ...input,
          subject,
        }),
    ),
    Match.when({ command: "movableZoneSave" }, (subject) => {
      if (subject.trigger === "endsTurnWithinFiveFeetOfSphere") {
        return resolveRamMovablePersistentAreaSaveCommand({
          ...input,
          subject,
        });
      }
      return resolveMovablePersistentAreaSaveCommand({
        ...input,
        subject,
      });
    }),
    Match.when({ command: "movableZoneReposition" }, (subject) => {
      const ramMovablePersistentArea = ramMovablePersistentAreaEffectFor(
        input.state,
        subject,
      );
      if (ramMovablePersistentArea !== undefined) {
        return resolveRamMovablePersistentAreaRepositionCommand({
          ...input,
          subject,
        });
      }
      return resolveMovablePersistentAreaRepositionCommand({
        ...input,
        subject,
      });
    }),
    Match.when({ command: "movableZoneRam" }, (subject) =>
      resolveRamMovablePersistentAreaRamCommand({ ...input, subject }),
    ),
    Match.when({ command: "persistentAreaSaveDamageExit" }, (subject) =>
      resolveMovablePersistentAreaCylinderExitCommand({ ...input, subject }),
    ),
    Match.exhaustive,
  );
}

function persistentAreaSaveConditionEffectFor(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "persistentAreaSaveConditionSave";
    }
  >,
): PersistentAreaSaveConditionEffect | undefined {
  return activeEffectForArea(
    state,
    subject.effectRef,
    subject.areaId,
    (effect): effect is PersistentAreaSaveConditionEffect =>
      effect.kind === "persistentAreaSaveCondition",
  );
}

function activeEffectForArea<
  TEffect extends BattleActiveEffect & { readonly areaId: BattleAreaId },
>(
  state: BattleState,
  effectRef: BattleEffectExecutionRef,
  areaId: BattleAreaId,
  isExpectedEffect: (effect: BattleActiveEffect) => effect is TEffect,
): TEffect | undefined {
  for (const combatant of state.combatants.values()) {
    const effect = combatant.activeEffects.find(
      (candidate): candidate is TEffect =>
        candidate.effectRef === effectRef &&
        isExpectedEffect(candidate) &&
        candidate.areaId === areaId,
    );
    if (effect !== undefined) return effect;
  }
  return undefined;
}

function persistentAreaSaveConditionSavingThrowOutcomeFor(
  fills: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[],
  hole: BattlePersistentAreaSaveConditionSavingThrowOutcomeHole,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> | undefined {
  return fills.find((fill) => fill.holeId === hole.holeId);
}

function validatePersistentAreaSaveConditionSavingThrowOutcome(
  value: BattleSavingThrowOutcomeValue,
  targetId: CombatantId,
): string | null {
  /* v8 ignore start -- @preserve -- Malformed fill: a PersistentAreaSaveCondition entry save is single-target and cannot carry area geometry or an outcome for a different combatant. */
  if ("area" in value) {
    return "PersistentAreaSaveCondition ground-hazard Saving Throw outcome must not include area facts.";
  }
  return value.outcomes.length === 1 && value.outcomes[0]?.targetId === targetId
    ? null
    : "PersistentAreaSaveCondition ground-hazard Saving Throw outcome must match the triggering target.";
  /* v8 ignore stop -- @preserve */
}

function resolvePersistentAreaSaveConditionSaveCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "persistentAreaSaveConditionSave";
      }
    >;
  } & PersistentSpatialReplayRoute,
): BattleResolutionResult {
  if (input.subject.trigger === "endsTurnInArea") {
    return resolvePersistentAreaSaveConditionEndTurnSaveCommand(input);
  }
  return resolvePersistentAreaSaveConditionEntrySaveCommand(input);
}

function resolvePersistentAreaSaveConditionEntrySaveCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "persistentAreaSaveConditionSave";
      }
    >;
  } & PersistentSpatialReplayRoute,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed fill set: the discovered PersistentAreaSaveCondition hazard subject exposes at most its one Saving Throw outcome hole. */
  if (
    input.fills.some((fill) => fill.kind !== "savingThrowOutcome") ||
    input.fills.length > 1
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "PersistentAreaSaveCondition ground-hazard save accepts exactly one Saving Throw outcome fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const effect = persistentAreaSaveConditionEffectFor(
    input.state,
    input.subject,
  );
  if (effect === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "PersistentAreaSaveCondition ground-hazard save is no longer available.",
    );
  }
  const hole = persistentAreaSaveConditionSavingThrowOutcomeHole(
    input.state,
    input.subject.actorId,
    effect,
    input.subject.trigger,
  );
  const savingThrowFill = persistentAreaSaveConditionSavingThrowOutcomeFor(
    input.fills.filter(
      (
        fill,
      ): fill is Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> =>
        fill.kind === "savingThrowOutcome",
    ),
    hole,
  );
  if (savingThrowFill === undefined) {
    return needsHolesResult(input.state, input.subject, [hole]);
  }
  const validation = validatePersistentAreaSaveConditionSavingThrowOutcome(
    savingThrowFill.value,
    input.subject.actorId,
  );
  /* v8 ignore start -- @preserve -- Malformed fill: the PersistentAreaSaveCondition save outcome must answer the discovered single-target hole for the triggering actor. */
  if (validation !== null) {
    return invalidResult(input.state, "invalidFill", validation);
  }
  /* v8 ignore stop -- @preserve */
  const outcome = savingThrowFill.value.outcomes[0]!;
  const saveFailedReactionWindow =
    maybeOpenPersistentSpatialSaveFailedReplayInterrupt({
      state: input.state,
      outcome,
      sourceProcedureRef: effect.sourceProcedureRef,
      replaySubject: input.subject,
      replayFills: input.fills,
      handledSaveFailedOccurrence: input.handledSaveFailedOccurrence,
      replayParentPosition: input.replayParentPosition,
    });
  if (saveFailedReactionWindow !== null) {
    return saveFailedReactionWindow;
  }
  const nextState = outcome.succeeded
    ? input.state
    : applyPersistentAreaSaveConditionProneToTarget(
        input.state,
        input.subject.actorId,
      );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function persistentAreaSaveConditionEscapeEffectFor(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command:
        | "persistentAreaSaveConditionEscapeSave"
        | "endPersistentAreaSaveConditionEscapeForDeparture"
        | "endPersistentAreaSaveConditionEscapeForAreaRemoval";
    }
  >,
): PersistentAreaSaveConditionEscapeEffect | undefined {
  return activeEffectForArea(
    state,
    subject.effectRef,
    subject.areaId,
    (effect): effect is PersistentAreaSaveConditionEscapeEffect =>
      effect.kind === "persistentAreaSaveConditionEscape",
  );
}

function validatePersistentAreaSaveConditionEscapeSavingThrowOutcome(
  value: BattleSavingThrowOutcomeValue,
  targetId: CombatantId,
): string | null {
  /* v8 ignore start -- @preserve -- Malformed fill: a PersistentAreaSaveConditionEscape restraint save is single-target and cannot carry area geometry or an outcome for a different combatant. */
  if ("area" in value) {
    return "PersistentAreaSaveConditionEscape Restraint Saving Throw outcome must not include area facts.";
  }
  return value.outcomes.length === 1 && value.outcomes[0]?.targetId === targetId
    ? null
    : "PersistentAreaSaveConditionEscape Restraint Saving Throw outcome must match the triggering target.";
  /* v8 ignore stop -- @preserve */
}

function persistentAreaSaveConditionEscapeSaveAlreadyResolved(
  effect: PersistentAreaSaveConditionEscapeEffect,
  targetId: CombatantId,
  trigger: BattlePersistentAreaSaveConditionEscapeTrigger,
): boolean {
  return trigger === "entersArea"
    ? effect.entrySavedThisTurn.includes(targetId)
    : effect.startTurnSavedThisTurn.includes(targetId);
}

function resolvePersistentAreaSaveConditionEscapeSaveCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "persistentAreaSaveConditionEscapeSave";
      }
    >;
  } & PersistentSpatialReplayRoute,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed fill set: the discovered PersistentAreaSaveConditionEscape restraint subject exposes at most its one Saving Throw outcome hole. */
  if (
    input.fills.some((fill) => fill.kind !== "savingThrowOutcome") ||
    input.fills.length > 1
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "PersistentAreaSaveConditionEscape Restraint save accepts exactly one Saving Throw outcome fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const effect = persistentAreaSaveConditionEscapeEffectFor(
    input.state,
    input.subject,
  );
  if (effect === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "PersistentAreaSaveConditionEscape Restraint save is no longer available.",
    );
  }
  if (
    persistentAreaSaveConditionEscapeSaveAlreadyResolved(
      effect,
      input.subject.actorId,
      input.subject.trigger,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "PersistentAreaSaveConditionEscape Restraint save was already resolved for this target this turn.",
    );
  }
  const hole = persistentAreaSaveConditionEscapeSavingThrowOutcomeHole(
    input.state,
    input.subject.actorId,
    effect,
    input.subject.trigger,
  );
  const [savingThrowFill] = input.fills;
  if (savingThrowFill === undefined) {
    return needsHolesResult(input.state, input.subject, [hole]);
  }
  /* v8 ignore start -- @preserve -- Internal protocol invariant: the fill-kind gate above leaves only a Saving Throw outcome when the optional first fill is present. */
  if (savingThrowFill.kind !== "savingThrowOutcome") {
    return invalidResult(
      input.state,
      "invalidFill",
      "PersistentAreaSaveConditionEscape Restraint save requires a Saving Throw outcome fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed fill: the supplied Saving Throw outcome must answer the exact hole derived from this PersistentAreaSaveConditionEscape restraint subject. */
  if (savingThrowFill.holeId !== hole.holeId) {
    return invalidResult(
      input.state,
      "invalidFill",
      "PersistentAreaSaveConditionEscape Restraint save requires the matching Saving Throw outcome fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const validation =
    validatePersistentAreaSaveConditionEscapeSavingThrowOutcome(
      savingThrowFill.value,
      input.subject.actorId,
    );
  /* v8 ignore start -- @preserve -- Malformed fill: the PersistentAreaSaveConditionEscape save outcome must answer the discovered single-target hole for the triggering actor. */
  if (validation !== null) {
    return invalidResult(input.state, "invalidFill", validation);
  }
  /* v8 ignore stop -- @preserve */
  const outcome = savingThrowFill.value.outcomes[0]!;
  const saveFailedReactionWindow =
    maybeOpenPersistentSpatialSaveFailedReplayInterrupt({
      state: input.state,
      outcome,
      sourceProcedureRef: effect.sourceProcedureRef,
      replaySubject: input.subject,
      replayFills: input.fills,
      handledSaveFailedOccurrence: input.handledSaveFailedOccurrence,
      replayParentPosition: input.replayParentPosition,
    });
  if (saveFailedReactionWindow !== null) {
    return saveFailedReactionWindow;
  }
  const marked = markPersistentAreaSaveConditionEscapeSavedThisTurn(
    input.state,
    input.subject.actorId,
    effect,
    input.subject.trigger,
  );
  const nextState = !outcome.succeeded
    ? applyPersistentAreaSaveConditionEscapeRestrainedCondition(
        marked,
        input.subject.actorId,
        effect,
      )
    : marked;
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function persistentAreaSaveCompositeEffectFor(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "persistentAreaSaveCompositeSave";
    }
  >,
): PersistentAreaSaveCompositeEffect | undefined {
  return activeEffectForArea(
    state,
    subject.areaMembershipTrigger.effectRef,
    subject.areaMembershipTrigger.areaId,
    (effect): effect is PersistentAreaSaveCompositeEffect =>
      effect.kind === "persistentAreaSaveComposite",
  );
}

const byPersistentAreaSaveCompositeAreaMembershipTriggerKind =
  Match.discriminator("kind");

function persistentAreaSaveCompositeTriggerFromMembershipFact(
  trigger: BattlePersistentAreaSaveCompositeMembershipTrigger,
): BattlePersistentAreaSaveCompositeTrigger {
  return Match.value(trigger).pipe(
    byPersistentAreaSaveCompositeAreaMembershipTriggerKind(
      "firstEntryOnTurn",
      () => "entersArea" as const,
    ),
    byPersistentAreaSaveCompositeAreaMembershipTriggerKind(
      "turnStartInArea",
      () => "startsTurnInArea" as const,
    ),
    Match.exhaustive,
  );
}

export function persistentAreaSaveCompositeSavingThrowOutcomeHole(
  state: BattleState,
  targetId: CombatantId,
  effect: PersistentAreaSaveCompositeEffect,
  trigger: BattlePersistentAreaSaveCompositeTrigger,
): BattlePersistentAreaSaveCompositeSavingThrowOutcomeHole {
  const key = `battle:persistent-area-save-composite-area-hazard-save:${targetId}:${effect.effectRef}:${trigger}`;
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${trigger === "entersArea" ? "Entry" : "Start-turn"} DEX save`,
    persistentAreaSaveComposite: {
      targetId,
      effectRef: effect.effectRef,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      areaId: effect.areaId,
      trigger,
      save: effect.save,
    },
    ability: effect.save.ability,
    dc: effect.save.dc,
    areaChoices: [],
    targetRollModes: savingThrowRollModeProjections(
      state,
      effect.save.ability,
    ).filter((projection) => projection.targetId === targetId),
    targetFlatBonuses: savingThrowFlatBonusProjections(
      state,
      effect.save.ability,
    ).filter((projection) => projection.targetId === targetId),
  };
}

function validatePersistentAreaSaveCompositeSavingThrowOutcome(
  value: BattleSavingThrowOutcomeValue,
  targetId: CombatantId,
): string | null {
  /* v8 ignore start -- @preserve -- Malformed fill: a persistent-area save-composite membership save is single-target and cannot carry area geometry or an outcome for a different combatant. */
  if ("area" in value) {
    return "persistent-area save-composite Saving Throw outcome must not include area facts.";
  }
  return value.outcomes.length === 1 && value.outcomes[0]?.targetId === targetId
    ? null
    : "persistent-area save-composite Saving Throw outcome must match the triggering target.";
  /* v8 ignore stop -- @preserve */
}

function persistentAreaSaveCompositeSaveAlreadyResolved(
  effect: PersistentAreaSaveCompositeEffect,
  targetId: CombatantId,
): boolean {
  return effect.savedThisTurn.includes(targetId);
}

function resolvePersistentAreaSaveCompositeSaveCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "persistentAreaSaveCompositeSave";
      }
    >;
  } & PersistentSpatialReplayRoute,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed fill set: the discovered persistent-area save-composite subject exposes at most its one Saving Throw outcome hole. */
  if (
    input.fills.some((fill) => fill.kind !== "savingThrowOutcome") ||
    input.fills.length > 1
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "persistent-area save-composite save accepts exactly one Saving Throw outcome fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const effect = persistentAreaSaveCompositeEffectFor(
    input.state,
    input.subject,
  );
  if (effect === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "persistent-area save-composite save is no longer available.",
    );
  }
  const trigger = persistentAreaSaveCompositeTriggerFromMembershipFact(
    input.subject.areaMembershipTrigger,
  );
  if (
    persistentAreaSaveCompositeSaveAlreadyResolved(
      effect,
      input.subject.actorId,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "persistent-area save-composite save was already resolved for this target this turn.",
    );
  }
  const hole = persistentAreaSaveCompositeSavingThrowOutcomeHole(
    input.state,
    input.subject.actorId,
    effect,
    trigger,
  );
  const [savingThrowFill] = input.fills;
  if (savingThrowFill === undefined) {
    return needsHolesResult(input.state, input.subject, [hole]);
  }
  /* v8 ignore start -- @preserve -- Internal protocol invariant: the fill-kind gate above leaves only a Saving Throw outcome when the optional first fill is present. */
  if (savingThrowFill.kind !== "savingThrowOutcome") {
    return invalidResult(
      input.state,
      "invalidFill",
      "persistent-area save-composite save requires a Saving Throw outcome fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed fill: the supplied Saving Throw outcome must answer the exact hole derived from this persistent-area save-composite subject. */
  if (savingThrowFill.holeId !== hole.holeId) {
    return invalidResult(
      input.state,
      "invalidFill",
      "persistent-area save-composite save requires the matching Saving Throw outcome fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const validation = validatePersistentAreaSaveCompositeSavingThrowOutcome(
    savingThrowFill.value,
    input.subject.actorId,
  );
  /* v8 ignore start -- @preserve -- Malformed fill: the persistent-area save-composite save outcome must answer the discovered single-target hole for the triggering actor. */
  if (validation !== null) {
    return invalidResult(input.state, "invalidFill", validation);
  }
  /* v8 ignore stop -- @preserve */
  const outcome = savingThrowFill.value.outcomes[0]!;
  const saveFailedReactionWindow =
    maybeOpenPersistentSpatialSaveFailedReplayInterrupt({
      state: input.state,
      outcome,
      sourceProcedureRef: effect.sourceProcedureRef,
      replaySubject: input.subject,
      replayFills: input.fills,
      handledSaveFailedOccurrence: input.handledSaveFailedOccurrence,
      replayParentPosition: input.replayParentPosition,
    });
  if (saveFailedReactionWindow !== null) {
    return saveFailedReactionWindow;
  }
  const marked = markPersistentAreaSaveCompositeSavedThisTurn(
    input.state,
    input.subject.actorId,
    effect,
  );
  const nextState = outcome.succeeded
    ? marked
    : applyPersistentAreaSaveCompositeFailedSaveEffect(
        marked,
        input.subject.actorId,
      );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

type PersistentAreaSaveDamageSubject = Extract<
  BattleSubject,
  {
    readonly tag: "runtimeCommand";
    readonly command: "persistentAreaSaveDamageSave";
  }
>;

type StationaryPersistentAreaSaveDamageSubject = Extract<
  PersistentAreaSaveDamageSubject,
  {
    readonly areaMembershipTrigger: BattleStationaryPersistentAreaSaveDamageMembershipTrigger;
  }
>;

type TranslatingPersistentAreaSaveDamageSubject = Extract<
  PersistentAreaSaveDamageSubject,
  {
    readonly areaMembershipTrigger: BattleTranslatingPersistentAreaSaveDamageMembershipTrigger;
  }
>;

function persistentAreaSaveDamageLifecycleFor(
  state: BattleState,
  subject: PersistentAreaSaveDamageSubject,
): "stationary" | "sourceTurnTranslation" | undefined {
  const effect = activeEffectForArea(
    state,
    subject.areaMembershipTrigger.effectRef,
    subject.areaMembershipTrigger.areaId,
    (
      candidate,
    ): candidate is Extract<
      BattleActiveEffect,
      { readonly kind: "persistentAreaSaveDamage" }
    > => candidate.kind === "persistentAreaSaveDamage",
  );
  return effect?.lifecycle.kind === "stationary" ||
    effect?.lifecycle.kind === "sourceTurnTranslation"
    ? effect.lifecycle.kind
    : undefined;
}

function resolvePersistentAreaSaveDamageCommand(
  input: BattleResolutionInput & {
    readonly subject: PersistentAreaSaveDamageSubject;
  } & PersistentSpatialReplayRoute,
): BattleResolutionResult {
  const lifecycle = persistentAreaSaveDamageLifecycleFor(
    input.state,
    input.subject,
  );
  if (lifecycle === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Persistent-area save damage is no longer available.",
    );
  }
  if (lifecycle === "stationary") {
    /* The active effect lookup immediately above proves that this membership
       fact belongs to the stationary lifecycle represented by this subject. */
    return resolveStationaryPersistentAreaAreaSaveDamage({
      ...input,
      subject: input.subject as StationaryPersistentAreaSaveDamageSubject,
    });
  }
  if (input.subject.areaMembershipTrigger.kind === "areaMovesIntoSpace") {
    return invalidResult(
      input.state,
      "staleSubject",
      "Source-turn translating area movement saves resolve only through the source's start-turn boundary.",
    );
  }
  /* The active effect lookup immediately above proves that this membership
     fact belongs to the source-turn translating lifecycle. */
  return resolveTranslatingPersistentAreaAreaSaveDamage({
    ...input,
    subject: input.subject as TranslatingPersistentAreaSaveDamageSubject,
  });
}

function resolvePersistentAreaSaveConditionEscapeRestrainedNoLongerInAreaCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "endPersistentAreaSaveConditionEscapeForDeparture";
      }
    >;
  },
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed fill set: PersistentAreaSaveConditionEscape no-longer-in-area cleanup is a discovered no-input transition and exposes no holes. */
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "PersistentAreaSaveConditionEscape no-longer-in-area cleanup uses no fills.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const effect = persistentAreaSaveConditionEscapeEffectFor(
    input.state,
    input.subject,
  );
  if (effect === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "PersistentAreaSaveConditionEscape Restraint cleanup is no longer available.",
    );
  }
  const nextState = removePersistentAreaSaveConditionEscapeRestrainedCondition({
    state: input.state,
    targetId: input.subject.actorId,
    sourceCombatantId: effect.sourceCombatantId,
    sourceProcedureRef: effect.sourceProcedureRef,
  });
  return nextState === input.state
    ? invalidResult(
        input.state,
        "staleSubject",
        "PersistentAreaSaveConditionEscape Restraint cleanup is no longer available.",
      )
    : {
        tag: "resolved",
        state: nextState,
        snapshot: snapshotBattle(nextState),
      };
}

function resolvePersistentAreaSaveConditionEscapeAreaRemovedCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "endPersistentAreaSaveConditionEscapeForAreaRemoval";
      }
    >;
  },
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed fill set: PersistentAreaSaveConditionEscape area removal is a discovered no-input transition and exposes no holes. */
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "PersistentAreaSaveConditionEscape area removal uses no fills.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const effect = persistentAreaSaveConditionEscapeEffectFor(
    input.state,
    input.subject,
  );
  if (effect === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "PersistentAreaSaveConditionEscape area is no longer active.",
    );
  }
  const nextState = breakBattleConcentration(
    input.state,
    effect.sourceCombatantId,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function directionalPersistentAreaEffectFor(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command:
        | "directionalPersistentAreaSave"
        | "directionalPersistentAreaDirectionChange";
    }
  >,
): DirectionalPersistentAreaEffect | undefined {
  return activeEffectForArea(
    state,
    subject.effectRef,
    subject.areaId,
    (effect): effect is DirectionalPersistentAreaEffect =>
      effect.kind === "directionalPersistentArea" &&
      effect.directionId === subject.directionId,
  );
}

function validateDirectionalPersistentAreaSavingThrowOutcome(
  value: BattleSavingThrowOutcomeValue,
  targetId: CombatantId,
  effect: DirectionalPersistentAreaEffect,
): string | null {
  if (!("area" in value)) {
    /* v8 ignore next -- @preserve -- directional persistent area discovery always supplies the active Line area; this rejects only a caller-mutated missing-area witness. */
    return "directional persistent area Line Saving Throw outcome requires Line area facts.";
  }
  const area: BattleSpellAreaChoice = value.area;
  if (
    area.kind !== "directionalPersistentAreaArea" ||
    area.areaId !== effect.areaId ||
    area.directionId !== effect.directionId ||
    area.originAnchorId !== effect.sourceCombatantId
  ) {
    /* v8 ignore next -- @preserve -- directional persistent area discovery binds this area to the active Line; this rejects only a caller-mutated geometry or source identity. */
    return "directional persistent area Line Saving Throw outcome must match the active Line area.";
  }
  if (
    area.affectedTargetIds.length !== 1 ||
    area.affectedTargetIds[0] !== targetId ||
    value.outcomes.length !== 1 ||
    value.outcomes[0]?.targetId !== targetId
  ) {
    /* v8 ignore next -- @preserve -- directional persistent area discovery selects the ending-turn target exactly once; this rejects only a caller-mutated target or outcome cardinality. */
    return "directional persistent area Line Saving Throw outcome must match the ending-turn target.";
  }
  return validateDirectionalPersistentAreaAreaPushFacts({
    area,
    failedTargetIds: value.outcomes[0]?.succeeded === true ? [] : [targetId],
    pushDistanceFeet: effect.pushDistanceFeet,
  });
}

function resolveDirectionalPersistentAreaSaveCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "directionalPersistentAreaSave";
      }
    >;
  } & PersistentSpatialReplayRoute,
): BattleResolutionResult {
  const effect = directionalPersistentAreaEffectFor(input.state, input.subject);
  if (effect === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "directional persistent area Line save is no longer available.",
    );
  }
  const hole = directionalPersistentAreaSavingThrowOutcomeHole(
    input.state,
    input.subject.actorId,
    effect,
    input.subject.trigger,
  );
  const matchingGustFills = input.fills.filter(
    (fill) => fill.holeId === hole.holeId,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (matchingGustFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "End Turn in directional persistent area received duplicate directional persistent area Saving Throw outcome fills.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const [matchingGustFill] = matchingGustFills;
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    matchingGustFill !== undefined &&
    matchingGustFill.kind !== "savingThrowOutcome"
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "End Turn in directional persistent area requires a directional persistent area Saving Throw outcome fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const endTurnSubject = {
    tag: "runtimeCommand" as const,
    actorId: input.subject.actorId,
    command: "endTurn" as const,
  };
  const endTurnFills = input.fills.filter(
    (fill) => fill.holeId !== hole.holeId,
  );
  if (matchingGustFill === undefined) {
    return needsSpatialProcedureHole({
      state: input.state,
      subject: input.subject,
      hole,
    });
  }
  const validation = validateDirectionalPersistentAreaSavingThrowOutcome(
    matchingGustFill.value,
    input.subject.actorId,
    effect,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (validation !== null) {
    return invalidResult(input.state, "invalidFill", validation);
  }
  /* v8 ignore stop -- @preserve */
  const outcome = matchingGustFill.value.outcomes[0]!;
  const saveFailedReactionWindow =
    maybeOpenPersistentSpatialSaveFailedReplayInterrupt({
      state: input.state,
      outcome,
      sourceProcedureRef: effect.sourceProcedureRef,
      replaySubject: input.subject,
      replayFills: input.fills,
      handledSaveFailedOccurrence: input.handledSaveFailedOccurrence,
      replayParentPosition: input.replayParentPosition,
    });
  if (saveFailedReactionWindow !== null) {
    return saveFailedReactionWindow;
  }
  return resolveDelegatedEndTurnCommand(input, {
    state: input.state,
    subject: endTurnSubject,
    fills: endTurnFills,
  });
}

function resolveDirectionalPersistentAreaDirectionChangeCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "directionalPersistentAreaDirectionChange";
      }
    >
  >,
): BattleResolutionResult {
  const effect = directionalPersistentAreaEffectFor(input.state, input.subject);
  const actor = input.state.combatants.get(input.subject.actorId);
  if (
    effect === undefined ||
    input.subject.actorId !== effect.sourceCombatantId ||
    input.subject.actorId !== currentActorId(input.state) ||
    (effect.castTurn.actorId === input.subject.actorId &&
      effect.castTurn.round === input.state.initiative.round) ||
    !combatantCanTakeActions(actor)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "directional persistent area Line direction change is no longer available.",
    );
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fills.some(
      (fill) => fill.kind !== "directionalPersistentAreaDirectionChoice",
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "directional persistent area Line direction change accepts only direction-choice fills.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const hole = directionalPersistentAreaDirectionChoiceHole(effect);
  const directionFills = input.fills.filter(
    (
      fill,
    ): fill is Extract<
      BattleFill,
      { readonly kind: "directionalPersistentAreaDirectionChoice" }
    > => fill.kind === "directionalPersistentAreaDirectionChoice",
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!everyFillUsesHoleId(directionFills, hole.holeId)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "directional persistent area Line direction change received a fill for an unrelated hole.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (directionFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "directional persistent area Line direction change received duplicate fills.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const directionFill = directionFills[0];
  if (directionFill === undefined) {
    return needsHolesResult(input.state, input.subject, [hole]);
  }
  const spent = spendActivationResource(input.state.currentTurnResources, {
    kind: "bonusAction",
  });
  if (Result.isFailure(spent)) {
    /* v8 ignore next -- @preserve -- Defensive internal guard: the availability check above and this spend read the same turn resources, with no intervening state transition. */
    return invalidResult(
      input.state,
      "staleSubject",
      "directional persistent area Line direction change requires an available Bonus Action.",
    );
  }
  const nextState = replaceDirectionalPersistentAreaDirection({
    state: {
      ...input.state,
      currentTurnResources: spent.success,
    },
    sourceCombatantId: effect.sourceCombatantId,
    sourceProcedureRef: effect.sourceProcedureRef,
    effectRef: effect.effectRef,
    areaId: effect.areaId,
    directionId: directionFill.value.directionId,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function ramMovablePersistentAreaEffectFor(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command:
        | "movableZoneSave"
        | "movableZoneReposition"
        | "movableZoneRam";
    }
  >,
): RamMovablePersistentAreaEffect | undefined {
  return activeEffectForArea(
    state,
    subject.effectRef,
    subject.areaId,
    (effect): effect is RamMovablePersistentAreaEffect =>
      effect.kind === "persistentAreaSaveDamage",
  );
}

function ramMovablePersistentAreaDamageRollHole(
  targetId: CombatantId,
  effect: RamMovablePersistentAreaEffect,
  trigger: BattleCollisionRepositionPersistentAreaSaveDamageTrigger,
): BattleCollisionRepositionPersistentAreaSaveDamageRollHole {
  const key = `battle:ram-movable-persistent-area-damage:${targetId}:${effect.effectRef}:${trigger}`;
  return {
    kind: "rolledDice",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${ramMovablePersistentAreaTriggerLabel(trigger)} damage`,
    movableZone: {
      targetId,
      effectRef: effect.effectRef,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      areaId: effect.areaId,
      trigger,
      damage: effect.damage,
    },
    critical: false,
  };
}

function validateRamMovablePersistentAreaSavingThrowOutcome(
  value: BattleSavingThrowOutcomeValue,
  targetId: CombatantId,
): string | null {
  /* v8 ignore start -- @preserve -- Malformed fill: a ram-movable persistent area ram save hole is single-target and cannot carry area geometry. */
  if ("area" in value) {
    return "Movable zone saving throw outcome must not include area facts.";
  }
  /* v8 ignore stop -- @preserve */
  if (value.outcomes.length === 1 && value.outcomes[0]?.targetId === targetId) {
    return null;
  }
  /* v8 ignore next -- @preserve -- Malformed fill: the discovered ram-movable persistent area ram save hole names exactly its triggering target. */
  return "Movable zone saving throw outcome must match the triggering target.";
}

function validateRamMovablePersistentAreaDamageRoll(
  fill: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  hole: BattleCollisionRepositionPersistentAreaSaveDamageRollHole,
): string | null {
  return validateRolledDiceFillForDiceExpr(fill, hole.movableZone.damage.expr);
}

function validateRamMovablePersistentAreaRamMovement(
  fill: Extract<BattleFill, { readonly kind: "movableZoneRamMovement" }>,
  hole: BattlePersistentAreaSaveDamageRamMovementHole,
): string | null {
  if (
    Number(fill.value.moveFeet) <= 0 ||
    !Number.isInteger(fill.value.moveFeet)
  ) {
    return "Movable zone ram movement distance must be a positive integer.";
  }
  return ramMovablePersistentAreaMoveDistanceAccepted({
    moveFeet: Number(fill.value.moveFeet),
    maxMoveFeet: Number(hole.movableZone.maxMoveFeet),
  })
    ? null
    : "Movable zone ram movement distance exceeds the spell's maximum.";
}

/* v8 ignore start -- @preserve -- Malformed ram-movable persistent area reposition fill: discovery fixes the movement hole and offers positive whole-foot movement no greater than the active spell maximum. */
function validateRamMovablePersistentAreaRepositionMovement(
  fill: Extract<BattleFill, { readonly kind: "movableZoneRepositionMovement" }>,
  hole: BattleMovableZoneRepositionMovementHole,
): string | null {
  if (fill.holeId !== hole.holeId) {
    return "Movable zone reposition movement must use the selected sphere movement hole.";
  }
  if (
    Number(fill.value.moveFeet) <= 0 ||
    !Number.isInteger(fill.value.moveFeet)
  ) {
    return "Movable zone reposition movement distance must be a positive integer.";
  }
  return ramMovablePersistentAreaMoveDistanceAccepted({
    moveFeet: Number(fill.value.moveFeet),
    maxMoveFeet: Number(hole.movableZone.maxMoveFeet),
  })
    ? null
    : "Movable zone reposition movement distance exceeds the spell's maximum.";
}
/* v8 ignore stop -- @preserve */

function ramMovablePersistentAreaAdjustedDamage(input: {
  readonly state: BattleState;
  readonly target: BattleCreatureState;
  readonly effect: RamMovablePersistentAreaEffect;
  readonly damageFill: Extract<BattleFill, { readonly kind: "rolledDice" }>;
  readonly saveSucceeded: boolean;
}): number {
  const rolledDamage =
    rolledDiceTotal(input.damageFill.value) +
    (input.effect.damage.expr.flat ?? 0);
  const saveAdjustedDamage = ramMovablePersistentAreaDamageAfterSave({
    rolledDamage,
    savingThrowSucceeded: input.saveSucceeded,
  });
  return damageAmountAfterTargetAdjustments(
    input.state,
    input.target,
    saveAdjustedDamage,
    input.effect.damage.damageType,
  );
}

function applyRamMovablePersistentAreaDamage(input: {
  readonly state: BattleState;
  readonly target: BattleCreatureState;
  readonly effect: RamMovablePersistentAreaEffect;
  readonly damageFill: Extract<BattleFill, { readonly kind: "rolledDice" }>;
  readonly saveSucceeded: boolean;
  readonly concentrationSavingThrow?:
    | Extract<BattleFill, { readonly kind: "concentrationSavingThrow" }>
    | undefined;
}): BattleState {
  return applyPreparedSlotSpellDamage(
    input.state,
    input.target.combatantId,
    ramMovablePersistentAreaAdjustedDamage({
      state: input.state,
      target: input.target,
      effect: input.effect,
      damageFill: input.damageFill,
      saveSucceeded: input.saveSucceeded,
    }),
    {
      damageSourceId: input.effect.sourceCombatantId,
      concentrationSavingThrow: input.concentrationSavingThrow,
      spatialFacts: [],
    },
  );
}

function resolveRamMovablePersistentAreaSaveCommand(
  input: BattleResolutionInput & {
    readonly subject: RamMovablePersistentAreaSaveSubject;
  } & PersistentSpatialReplayRoute,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fills.some(
      (fill) =>
        fill.kind !== "savingThrowOutcome" &&
        fill.kind !== "rolledDice" &&
        fill.kind !== "concentrationSavingThrow" &&
        !isEndTurnFillKind(fill.kind),
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone save accepts only save, damage, Concentration, and delegated End Turn fills.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const effect = ramMovablePersistentAreaEffectFor(input.state, input.subject);
  const target = input.state.combatants.get(input.subject.actorId);
  if (effect === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Movable zone save is no longer available.",
    );
  }
  /* v8 ignore start -- @preserve -- Spatial-procedure invariant: a ram-movable persistent area save subject is routed here only after its target combatant has been found in the current state. */
  if (target === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Movable zone save target is no longer available.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const saveHole = ramMovablePersistentAreaSavingThrowOutcomeHole(
    input.state,
    input.subject.actorId,
    effect,
    input.subject.trigger,
  );
  const damageHole = ramMovablePersistentAreaDamageRollHole(
    input.subject.actorId,
    effect,
    input.subject.trigger,
  );
  const saveFills = input.fills.filter(
    (
      fill,
    ): fill is Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> =>
      fill.kind === "savingThrowOutcome" && fill.holeId === saveHole.holeId,
  );
  const damageFills = input.fills.filter(
    (fill): fill is Extract<BattleFill, { readonly kind: "rolledDice" }> =>
      fill.kind === "rolledDice" && fill.holeId === damageHole.holeId,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (saveFills.length > 1 || damageFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone end-within-5-feet save received duplicate sphere fills.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const concentrationHoleId = concentrationSavingThrowHole(target, 1)?.holeId;
  const endTurnSubject = {
    tag: "runtimeCommand" as const,
    actorId: input.subject.actorId,
    command: "endTurn" as const,
  };
  const endTurnFills = input.fills.filter(
    (fill) =>
      fill.holeId !== saveHole.holeId &&
      fill.holeId !== damageHole.holeId &&
      fill.holeId !== concentrationHoleId,
  );
  const saveFill = savingThrowOutcomeFillForHole(saveFills, saveHole);
  if (saveFill === undefined) {
    return needsSpatialProcedureHole({
      state: input.state,
      subject: input.subject,
      hole: saveHole,
    });
  }
  const saveValidation = validateRamMovablePersistentAreaSavingThrowOutcome(
    saveFill.value,
    input.subject.actorId,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (saveValidation !== null) {
    return invalidResult(input.state, "invalidFill", saveValidation);
  }
  /* v8 ignore stop -- @preserve */
  const saveOutcome = saveFill.value.outcomes[0]!;
  const saveFailedReactionWindow =
    maybeOpenPersistentSpatialSaveFailedReplayInterrupt({
      state: input.state,
      outcome: saveOutcome,
      sourceProcedureRef: effect.sourceProcedureRef,
      replaySubject: input.subject,
      replayFills: input.fills,
      handledSaveFailedOccurrence: input.handledSaveFailedOccurrence,
      replayParentPosition: input.replayParentPosition,
    });
  if (saveFailedReactionWindow !== null) {
    return saveFailedReactionWindow;
  }
  const damageFill = rolledDiceFillForHole(damageFills, damageHole);
  if (damageFill === undefined) {
    return needsSpatialProcedureHole({
      state: input.state,
      subject: input.subject,
      hole: damageHole,
    });
  }
  const damageValidation = validateRamMovablePersistentAreaDamageRoll(
    damageFill,
    damageHole,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (damageValidation !== null) {
    return invalidResult(input.state, "invalidFill", damageValidation);
  }
  /* v8 ignore stop -- @preserve */
  const adjustedDamage = ramMovablePersistentAreaAdjustedDamage({
    state: input.state,
    target,
    effect,
    damageFill,
    saveSucceeded: saveOutcome.succeeded,
  });
  const concentrationHole = concentrationSavingThrowHole(
    target,
    adjustedDamage,
  );
  const concentrationFills =
    concentrationHole === null
      ? []
      : input.fills.filter(
          (
            fill,
          ): fill is Extract<
            BattleFill,
            { readonly kind: "concentrationSavingThrow" }
          > =>
            fill.kind === "concentrationSavingThrow" &&
            fill.holeId === concentrationHole.holeId,
        );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (concentrationFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone end-within-5-feet save received duplicate sphere fills.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const concentrationFill =
    concentrationHole === null
      ? undefined
      : concentrationSavingThrowFillFor(concentrationFills, concentrationHole);
  if (concentrationHole !== null && concentrationFill === undefined) {
    return needsSpatialProcedureHole({
      state: input.state,
      subject: input.subject,
      hole: concentrationHole,
    });
  }
  const damaged = applyRamMovablePersistentAreaDamage({
    state: input.state,
    target,
    effect,
    damageFill,
    saveSucceeded: saveOutcome.succeeded,
    concentrationSavingThrow: concentrationFill,
  });
  return resolveStagedDelegatedEndTurnCommand(input, {
    state: damaged,
    subject: endTurnSubject,
    fills: endTurnFills,
  });
}

function resolveRamMovablePersistentAreaRepositionCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "movableZoneReposition";
      }
    >;
  },
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fills.some((fill) => fill.kind !== "movableZoneRepositionMovement")
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone reposition accepts only movement fills.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const effect = ramMovablePersistentAreaEffectFor(input.state, input.subject);
  if (
    effect === undefined ||
    input.subject.actorId !== effect.sourceCombatantId ||
    input.subject.actorId !== currentActorId(input.state)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Movable zone reposition is no longer available.",
    );
  }
  const spent = spendActivationResource(input.state.currentTurnResources, {
    kind: "bonusAction",
  });
  if (Result.isFailure(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Movable zone reposition requires an available Bonus Action.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const movementHole = ramMovablePersistentAreaRepositionMovementHole(effect);
  const movementFills = input.fills.filter(
    (
      fill,
    ): fill is Extract<
      BattleFill,
      { readonly kind: "movableZoneRepositionMovement" }
    > => fill.kind === "movableZoneRepositionMovement",
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!everyFillUsesHoleId(movementFills, movementHole.holeId)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone reposition received a fill for an unrelated hole.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (movementFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone reposition received duplicate sphere fills.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const movementFill = movementFills[0];
  if (movementFill === undefined) {
    return needsHolesResult(input.state, input.subject, [movementHole]);
  }
  const movementValidation = validateRamMovablePersistentAreaRepositionMovement(
    movementFill,
    movementHole,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (movementValidation !== null) {
    return invalidResult(input.state, "invalidFill", movementValidation);
  }
  /* v8 ignore stop -- @preserve */
  const nextState = {
    ...input.state,
    currentTurnResources: spent.success,
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveRamMovablePersistentAreaRamCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "movableZoneRam";
      }
    >;
  } & PersistentSpatialReplayRoute,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fills.some(
      (fill) =>
        fill.kind !== "savingThrowOutcome" &&
        fill.kind !== "rolledDice" &&
        fill.kind !== "movableZoneRamMovement" &&
        fill.kind !== "concentrationSavingThrow",
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone ram accepts only movement, save, damage, and Concentration fills.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const effect = ramMovablePersistentAreaEffectFor(input.state, input.subject);
  const target = input.state.combatants.get(input.subject.targetId);
  if (
    effect === undefined ||
    target === undefined ||
    input.subject.actorId !== effect.sourceCombatantId ||
    input.subject.actorId !== currentActorId(input.state)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Movable zone ram is no longer available.",
    );
  }
  if (!canSpendBonusAction(input.state.currentTurnResources)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Movable zone ram requires an available Bonus Action.",
    );
  }
  const saveHole = ramMovablePersistentAreaSavingThrowOutcomeHole(
    input.state,
    input.subject.targetId,
    effect,
    input.subject.trigger,
  );
  const movementHole = ramMovablePersistentAreaRamMovementHole(
    input.subject.targetId,
    effect,
  );
  const damageHole = ramMovablePersistentAreaDamageRollHole(
    input.subject.targetId,
    effect,
    input.subject.trigger,
  );
  const movementFills = input.fills.filter(
    (
      fill,
    ): fill is Extract<
      BattleFill,
      { readonly kind: "movableZoneRamMovement" }
    > => fill.kind === "movableZoneRamMovement",
  );
  const saveFills = input.fills.filter(
    (
      fill,
    ): fill is Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> =>
      fill.kind === "savingThrowOutcome",
  );
  const damageFills = input.fills.filter(
    (fill): fill is Extract<BattleFill, { readonly kind: "rolledDice" }> =>
      fill.kind === "rolledDice",
  );
  const concentrationFills = input.fills.filter(
    (
      fill,
    ): fill is Extract<
      BattleFill,
      { readonly kind: "concentrationSavingThrow" }
    > => fill.kind === "concentrationSavingThrow",
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !everyFillUsesHoleId(movementFills, movementHole.holeId) ||
    !everyFillUsesHoleId(saveFills, saveHole.holeId) ||
    !everyFillUsesHoleId(damageFills, damageHole.holeId)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone ram received a fill for an unrelated hole.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    movementFills.length > 1 ||
    saveFills.length > 1 ||
    damageFills.length > 1
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone ram received duplicate sphere fills.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const movementFill = movementFills[0];
  if (movementFill === undefined) {
    return needsHolesResult(input.state, input.subject, [movementHole]);
  }
  const movementValidation = validateRamMovablePersistentAreaRamMovement(
    movementFill,
    movementHole,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (movementValidation !== null) {
    return invalidResult(input.state, "invalidFill", movementValidation);
  }
  /* v8 ignore stop -- @preserve */
  const saveFill = savingThrowOutcomeFillForHole(saveFills, saveHole);
  if (saveFill === undefined) {
    return needsHolesResult(input.state, input.subject, [saveHole]);
  }
  const saveValidation = validateRamMovablePersistentAreaSavingThrowOutcome(
    saveFill.value,
    input.subject.targetId,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (saveValidation !== null) {
    return invalidResult(input.state, "invalidFill", saveValidation);
  }
  /* v8 ignore stop -- @preserve */
  const saveOutcome = saveFill.value.outcomes[0]!;
  const damageFill = rolledDiceFillForHole(damageFills, damageHole);
  if (damageFill === undefined) {
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (concentrationFills.length > 0) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Movable zone ram received a fill for an unrelated hole.",
      );
    }
    /* v8 ignore stop -- @preserve */
  } else {
    const damageValidation = validateRamMovablePersistentAreaDamageRoll(
      damageFill,
      damageHole,
    );
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (damageValidation !== null) {
      return invalidResult(input.state, "invalidFill", damageValidation);
    }
    /* v8 ignore stop -- @preserve */
  }
  const concentrationHole =
    damageFill === undefined
      ? null
      : concentrationSavingThrowHole(
          target,
          ramMovablePersistentAreaAdjustedDamage({
            state: input.state,
            target,
            effect,
            damageFill,
            saveSucceeded: saveOutcome.succeeded,
          }),
        );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    concentrationHole === null
      ? concentrationFills.length > 0
      : !everyFillUsesHoleId(concentrationFills, concentrationHole.holeId)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone ram received a fill for an unrelated hole.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (concentrationFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone ram received duplicate sphere fills.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const concentrationFill =
    concentrationHole === null
      ? undefined
      : concentrationSavingThrowFillFor(concentrationFills, concentrationHole);
  const saveFailedReactionWindow =
    maybeOpenPersistentSpatialSaveFailedReplayInterrupt({
      state: input.state,
      outcome: saveOutcome,
      sourceProcedureRef: effect.sourceProcedureRef,
      replaySubject: input.subject,
      replayFills: input.fills,
      handledSaveFailedOccurrence: input.handledSaveFailedOccurrence,
      replayParentPosition: input.replayParentPosition,
    });
  if (saveFailedReactionWindow !== null) {
    return saveFailedReactionWindow;
  }
  if (damageFill === undefined) {
    return needsHolesResult(input.state, input.subject, [damageHole]);
  }
  if (concentrationHole !== null && concentrationFill === undefined) {
    return needsHolesResult(input.state, input.subject, [concentrationHole]);
  }
  const damaged = applyRamMovablePersistentAreaDamage({
    state: input.state,
    target,
    effect,
    damageFill,
    saveSucceeded: saveOutcome.succeeded,
    concentrationSavingThrow: concentrationFill,
  });
  const spent = spendActivationResource(damaged.currentTurnResources, {
    kind: "bonusAction",
  });
  /* v8 ignore start -- @preserve -- Defensive internal guard: admission proves the Bonus Action, and synchronous ram-movable persistent area damage preserves current turn resources before this spend. */
  if (Result.isFailure(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Movable zone ram requires an available Bonus Action.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const nextState = {
    ...damaged,
    currentTurnResources: spent.success,
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function movablePersistentAreaEffectFor(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command:
        | "movableZoneSave"
        | "movableZoneReposition"
        | "persistentAreaSaveDamageExit";
    }
  >,
): MovablePersistentAreaEffect | undefined {
  return activeEffectForArea(
    state,
    subject.effectRef,
    subject.areaId,
    (effect): effect is MovablePersistentAreaEffect =>
      effect.kind === "persistentAreaSaveDamage",
  );
}

function movablePersistentAreaDamageRollHole(
  targetId: CombatantId,
  effect: MovablePersistentAreaEffect,
  trigger: BattleDirectedRepositionPersistentAreaSaveDamageTrigger,
): BattleDirectedRepositionPersistentAreaSaveDamageRollHole {
  const key = `battle:movablePersistentArea-damage:${targetId}:${effect.effectRef}:${trigger}`;
  return {
    kind: "rolledDice",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${movablePersistentAreaTriggerLabel(trigger)} damage`,
    movableZone: {
      targetId,
      effectRef: effect.effectRef,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      areaId: effect.areaId,
      trigger,
      damage: effect.damage,
    },
    critical: false,
  };
}

function validateMovablePersistentAreaSavingThrowOutcome(
  value: BattleSavingThrowOutcomeValue,
  targetId: CombatantId,
): string | null {
  /* v8 ignore start -- @preserve -- Malformed fill: a MovablePersistentArea membership save hole is single-target and cannot carry area geometry. */
  if ("area" in value) {
    return "Movable zone saving throw outcome must not include area facts.";
  }
  /* v8 ignore stop -- @preserve */
  if (value.outcomes.length === 1 && value.outcomes[0]?.targetId === targetId) {
    return null;
  }
  /* v8 ignore next -- @preserve -- Malformed fill: the discovered MovablePersistentArea save hole names exactly its triggering target. */
  return "Movable zone saving throw outcome must match the triggering target.";
}

function validateMovablePersistentAreaDamageRoll(
  fill: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  hole: BattleDirectedRepositionPersistentAreaSaveDamageRollHole,
): string | null {
  return validateRolledDiceFillForDiceExpr(fill, hole.movableZone.damage.expr);
}

/* v8 ignore start -- @preserve -- Malformed MovablePersistentArea reposition fill: discovery fixes the movement hole and offers positive whole-foot movement no greater than the active spell maximum. */
function validateMovablePersistentAreaRepositionMovement(
  fill: Extract<BattleFill, { readonly kind: "movableZoneRepositionMovement" }>,
  hole: BattleMovableZoneRepositionMovementHole,
): string | null {
  if (fill.holeId !== hole.holeId) {
    return "Movable zone reposition movement must use the selected movement hole.";
  }
  if (!Number.isInteger(fill.value.moveFeet)) {
    return "Movable zone reposition movement distance must be a positive integer.";
  }
  return movablePersistentAreaMoveDistanceAccepted({
    moveFeet: Number(fill.value.moveFeet),
    maxMoveFeet: Number(hole.movableZone.maxMoveFeet),
  })
    ? null
    : Number(fill.value.moveFeet) > 0
      ? "Movable zone reposition movement distance exceeds the spell's maximum."
      : "Movable zone reposition movement distance must be a positive integer.";
}
/* v8 ignore stop -- @preserve */

function movablePersistentAreaAdjustedDamage(input: {
  readonly state: BattleState;
  readonly target: BattleCreatureState;
  readonly effect: MovablePersistentAreaEffect;
  readonly damageFill: Extract<BattleFill, { readonly kind: "rolledDice" }>;
  readonly saveSucceeded: boolean;
}): number {
  const rolledDamage =
    rolledDiceTotal(input.damageFill.value) +
    (input.effect.damage.expr.flat ?? 0);
  return damageAmountAfterTargetAdjustments(
    input.state,
    input.target,
    movablePersistentAreaDamageAfterSave({
      rolledDamage,
      savingThrowSucceeded: input.saveSucceeded,
    }),
    input.effect.damage.damageType,
  );
}

function applyMovablePersistentAreaDamage(input: {
  readonly state: BattleState;
  readonly target: BattleCreatureState;
  readonly effect: MovablePersistentAreaEffect;
  readonly damageFill: Extract<BattleFill, { readonly kind: "rolledDice" }>;
  readonly saveSucceeded: boolean;
  readonly concentrationSavingThrow?:
    | Extract<BattleFill, { readonly kind: "concentrationSavingThrow" }>
    | undefined;
}): BattleState {
  return applyPreparedSlotSpellDamage(
    input.state,
    input.target.combatantId,
    movablePersistentAreaAdjustedDamage({
      state: input.state,
      target: input.target,
      effect: input.effect,
      damageFill: input.damageFill,
      saveSucceeded: input.saveSucceeded,
    }),
    {
      damageSourceId: input.effect.sourceCombatantId,
      concentrationSavingThrow: input.concentrationSavingThrow,
      spatialFacts: [],
    },
  );
}

function applyMovablePersistentAreaShapeShiftRider(input: {
  readonly state: BattleState;
  readonly targetId: CombatantId;
  readonly effect: MovablePersistentAreaEffect;
  readonly saveSucceeded: boolean;
}): BattleState {
  if (input.saveSucceeded) {
    return input.state;
  }
  const reversion = revertShapeShiftedCombatantToTrueForm({
    state: input.state,
    combatantId: input.targetId,
  });
  if (reversion.tag !== "reverted") {
    return reversion.state;
  }
  return addMovablePersistentAreaShapeShiftSuppression(
    reversion.state,
    input.targetId,
    input.effect,
  );
}

function resolveMovablePersistentAreaSaveCommand(
  input: BattleResolutionInput & {
    readonly subject: MovablePersistentAreaSaveSubject;
  } & PersistentSpatialReplayRoute,
): BattleResolutionResult {
  const isEndTurn = input.subject.trigger === "endsTurnInArea";
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fills.some(
      (fill) =>
        fill.kind !== "savingThrowOutcome" &&
        fill.kind !== "rolledDice" &&
        fill.kind !== "concentrationSavingThrow" &&
        !(isEndTurn && isEndTurnFillKind(fill.kind)),
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone save accepts only its save, damage, Concentration, and applicable delegated End Turn fills.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const effect = movablePersistentAreaEffectFor(input.state, input.subject);
  const target = input.state.combatants.get(input.subject.actorId);
  if (
    effect === undefined ||
    /* v8 ignore next -- @preserve -- Defensive internal guard: the spatial-procedure boundary rejects an absent movable-zone target before routing this subject here. */
    target === undefined
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Movable zone save is no longer available.",
    );
  }
  const endTurnSubject = {
    tag: "runtimeCommand" as const,
    actorId: input.subject.actorId,
    command: "endTurn" as const,
  };
  if (effect.savedThisTurn.includes(input.subject.actorId)) {
    if (isEndTurn) {
      return resolveDelegatedEndTurnCommand(input, {
        state: input.state,
        subject: endTurnSubject,
        fills: input.fills,
      });
    }
    return {
      tag: "resolved",
      state: input.state,
      snapshot: snapshotBattle(input.state),
    };
  }
  const saveHole = movablePersistentAreaSavingThrowOutcomeHole(
    input.state,
    input.subject.actorId,
    effect,
    input.subject.trigger,
  );
  const damageHole = movablePersistentAreaDamageRollHole(
    input.subject.actorId,
    effect,
    input.subject.trigger,
  );
  const saveFills = input.fills.filter(
    (
      fill,
    ): fill is Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> =>
      fill.kind === "savingThrowOutcome" && fill.holeId === saveHole.holeId,
  );
  const damageFills = input.fills.filter(
    (fill): fill is Extract<BattleFill, { readonly kind: "rolledDice" }> =>
      fill.kind === "rolledDice" && fill.holeId === damageHole.holeId,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (saveFills.length > 1 || damageFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone save received duplicate fills.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const concentrationHoleId = concentrationSavingThrowHole(target, 1)?.holeId;
  const endTurnFills = isEndTurn
    ? input.fills.filter(
        (fill) =>
          fill.holeId !== saveHole.holeId &&
          fill.holeId !== damageHole.holeId &&
          fill.holeId !== concentrationHoleId,
      )
    : [];
  const saveFill = savingThrowOutcomeFillForHole(saveFills, saveHole);
  if (saveFill === undefined) {
    return needsSpatialProcedureHole({
      state: input.state,
      subject: input.subject,
      hole: saveHole,
    });
  }
  const saveValidation = validateMovablePersistentAreaSavingThrowOutcome(
    saveFill.value,
    input.subject.actorId,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (saveValidation !== null) {
    return invalidResult(input.state, "invalidFill", saveValidation);
  }
  /* v8 ignore stop -- @preserve */
  const saveOutcome = saveFill.value.outcomes[0]!;
  const saveFailedReactionWindow =
    maybeOpenPersistentSpatialSaveFailedReplayInterrupt({
      state: input.state,
      outcome: saveOutcome,
      sourceProcedureRef: effect.sourceProcedureRef,
      replaySubject: input.subject,
      replayFills: input.fills,
      handledSaveFailedOccurrence: input.handledSaveFailedOccurrence,
      replayParentPosition: input.replayParentPosition,
    });
  if (saveFailedReactionWindow !== null) {
    return saveFailedReactionWindow;
  }
  const damageFill = rolledDiceFillForHole(damageFills, damageHole);
  if (damageFill === undefined) {
    return needsSpatialProcedureHole({
      state: input.state,
      subject: input.subject,
      hole: damageHole,
    });
  }
  const damageValidation = validateMovablePersistentAreaDamageRoll(
    damageFill,
    damageHole,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (damageValidation !== null) {
    return invalidResult(input.state, "invalidFill", damageValidation);
  }
  /* v8 ignore stop -- @preserve */
  const adjustedDamage = movablePersistentAreaAdjustedDamage({
    state: input.state,
    target,
    effect,
    damageFill,
    saveSucceeded: saveOutcome.succeeded,
  });
  const concentrationHole = concentrationSavingThrowHole(
    target,
    adjustedDamage,
  );
  const concentrationFills =
    concentrationHole === null
      ? []
      : input.fills.filter(
          (
            fill,
          ): fill is Extract<
            BattleFill,
            { readonly kind: "concentrationSavingThrow" }
          > =>
            fill.kind === "concentrationSavingThrow" &&
            fill.holeId === concentrationHole.holeId,
        );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (concentrationFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone save received duplicate concentration save fills.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const concentrationFill =
    concentrationHole === null
      ? undefined
      : concentrationSavingThrowFillFor(concentrationFills, concentrationHole);
  if (concentrationHole !== null && concentrationFill === undefined) {
    return needsSpatialProcedureHole({
      state: input.state,
      subject: input.subject,
      hole: concentrationHole,
    });
  }
  const afterDamage = applyMovablePersistentAreaDamage({
    state: input.state,
    target,
    effect,
    damageFill,
    saveSucceeded: saveOutcome.succeeded,
    concentrationSavingThrow: concentrationFill,
  });
  const afterShapeShiftRider = applyMovablePersistentAreaShapeShiftRider({
    state: afterDamage,
    targetId: input.subject.actorId,
    effect,
    saveSucceeded: saveOutcome.succeeded,
  });
  const afterMark = markMovablePersistentAreaSavedThisTurn(
    afterShapeShiftRider,
    input.subject.actorId,
    effect,
  );
  if (isEndTurn) {
    return resolveStagedDelegatedEndTurnCommand(input, {
      state: afterMark,
      subject: endTurnSubject,
      fills: endTurnFills,
    });
  }
  return {
    tag: "resolved",
    state: afterMark,
    snapshot: snapshotBattle(afterMark),
  };
}

function resolveMovablePersistentAreaCylinderExitCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "persistentAreaSaveDamageExit";
      }
    >;
  },
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "MovablePersistentArea Cylinder exit cleanup uses no fills.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const effect = movablePersistentAreaEffectFor(input.state, input.subject);
  if (
    effect === undefined ||
    !effect.shapeShiftSuppressed.includes(input.subject.actorId)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "MovablePersistentArea shape-shift suppression is no longer active.",
    );
  }
  const nextState = removeMovablePersistentAreaShapeShiftSuppression(
    input.state,
    input.subject.actorId,
    effect,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveMovablePersistentAreaRepositionCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "movableZoneReposition";
      }
    >;
  },
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fills.some((fill) => fill.kind !== "movableZoneRepositionMovement")
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone reposition accepts only movement fills.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const effect = movablePersistentAreaEffectFor(input.state, input.subject);
  if (
    effect === undefined ||
    input.subject.actorId !== effect.sourceCombatantId ||
    input.subject.actorId !== currentActorId(input.state)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Movable zone reposition is no longer available.",
    );
  }
  const movementHole = movablePersistentAreaRepositionMovementHole(effect);
  const movementFills = input.fills.filter(
    (
      fill,
    ): fill is Extract<
      BattleFill,
      { readonly kind: "movableZoneRepositionMovement" }
    > => fill.kind === "movableZoneRepositionMovement",
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!everyFillUsesHoleId(movementFills, movementHole.holeId)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone reposition received a fill for an unrelated hole.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (movementFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone reposition received duplicate fills.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const movementFill = movementFills[0];
  if (movementFill === undefined) {
    return needsHolesResult(input.state, input.subject, [movementHole]);
  }
  const movementValidation = validateMovablePersistentAreaRepositionMovement(
    movementFill,
    movementHole,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (movementValidation !== null) {
    return invalidResult(input.state, "invalidFill", movementValidation);
  }
  /* v8 ignore stop -- @preserve */
  const spendResult = spendAction(input.state.currentTurnResources, "magic");
  if (Result.isFailure(spendResult)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Movable zone reposition requires an available Magic action.",
    );
  }
  const nextState = {
    ...input.state,
    currentTurnResources: spendResult.success,
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function needsSpatialProcedureHole(input: {
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly hole: BattleHole;
}): BattleResolutionResult {
  return needsHolesResult(input.state, input.subject, [input.hole]);
}

function resolvePersistentAreaSaveConditionEndTurnSaveCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "persistentAreaSaveConditionSave";
      }
    >;
  } & PersistentSpatialReplayRoute,
): BattleResolutionResult {
  const effect = persistentAreaSaveConditionEffectFor(
    input.state,
    input.subject,
  );
  if (effect === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "PersistentAreaSaveCondition ground-hazard save is no longer available.",
    );
  }
  const hole = persistentAreaSaveConditionSavingThrowOutcomeHole(
    input.state,
    input.subject.actorId,
    effect,
    input.subject.trigger,
  );
  const matchingPersistentAreaSaveConditionFills = input.fills.filter(
    (fill) => fill.holeId === hole.holeId,
  );
  /* v8 ignore start -- @preserve -- Malformed fill set: the end-turn PersistentAreaSaveCondition save hole can be answered only once. */
  if (matchingPersistentAreaSaveConditionFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "End Turn in PersistentAreaSaveCondition received duplicate PersistentAreaSaveCondition Saving Throw outcome fills.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const [matchingPersistentAreaSaveConditionFill] =
    matchingPersistentAreaSaveConditionFills;
  /* v8 ignore start -- @preserve -- Malformed fill: the value answering the PersistentAreaSaveCondition save hole must be a Saving Throw outcome. */
  if (
    matchingPersistentAreaSaveConditionFill !== undefined &&
    matchingPersistentAreaSaveConditionFill.kind !== "savingThrowOutcome"
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "End Turn in PersistentAreaSaveCondition requires a PersistentAreaSaveCondition Saving Throw outcome fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const endTurnSubject = {
    tag: "runtimeCommand" as const,
    actorId: input.subject.actorId,
    command: "endTurn" as const,
  };
  const endTurnFills = input.fills.filter(
    (fill) => fill.holeId !== hole.holeId,
  );
  if (matchingPersistentAreaSaveConditionFill === undefined) {
    return needsSpatialProcedureHole({
      state: input.state,
      subject: input.subject,
      hole,
    });
  }
  const validation = validatePersistentAreaSaveConditionSavingThrowOutcome(
    matchingPersistentAreaSaveConditionFill.value,
    input.subject.actorId,
  );
  /* v8 ignore start -- @preserve -- Malformed fill: the end-turn PersistentAreaSaveCondition save outcome must answer the discovered single-target hole for the ending actor. */
  if (validation !== null) {
    return invalidResult(input.state, "invalidFill", validation);
  }
  /* v8 ignore stop -- @preserve */
  const outcome = matchingPersistentAreaSaveConditionFill.value.outcomes[0]!;
  const saveFailedReactionWindow =
    maybeOpenPersistentSpatialSaveFailedReplayInterrupt({
      state: input.state,
      outcome,
      sourceProcedureRef: effect.sourceProcedureRef,
      replaySubject: input.subject,
      replayFills: input.fills,
      handledSaveFailedOccurrence: input.handledSaveFailedOccurrence,
      replayParentPosition: input.replayParentPosition,
    });
  if (saveFailedReactionWindow !== null) {
    return saveFailedReactionWindow;
  }
  const nextState = outcome.succeeded
    ? input.state
    : applyPersistentAreaSaveConditionProneToTarget(
        input.state,
        input.subject.actorId,
      );
  return resolveDelegatedEndTurnCommand(input, {
    state: nextState,
    subject: endTurnSubject,
    fills: endTurnFills,
  });
}
