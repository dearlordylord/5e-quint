// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-grease-ground-hazard spell.invocation-web-restraint-hazard spell.invocation-sleet-storm-area-hazard spell.invocation-insect-plague-area-hazard spell.invocation-cloudkill-area-hazard spell.invocation-gust-of-wind-line spell.invocation-flaming-sphere-hazard-ram spell.invocation-moonbeam-movable-zone
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.GREASE_GROUND_HAZARD_LIFECYCLE BATTLE.SPELL.WEB_RESTRAINT_HAZARD_LIFECYCLE BATTLE.SPELL.SLEET_STORM_AREA_HAZARD_LIFECYCLE BATTLE.SPELL.INSECT_PLAGUE_AREA_HAZARD_LIFECYCLE BATTLE.SPELL.CLOUDKILL_AREA_HAZARD_LIFECYCLE BATTLE.SPELL.GUST_OF_WIND_LINE_LIFECYCLE BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE

import { Either, Match } from "effect";
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
  BattleSleetStormAreaMembershipTrigger,
  BattleSubject,
} from "../battle-subjects.ts";
import type { BattleInterruptTrigger } from "../battle-interrupt-triggers.ts";
import {
  type BattleAreaId,
  type BattleProcedureExecutionRef,
  CombatantId,
} from "../identity.ts";
import type {
  BattleActiveEffect,
  BattleCreatureState,
  BattleFill,
  BattleFlamingSphereDamageRollHole,
  BattleFlamingSphereRamMovementHole,
  BattleFlamingSphereTrigger,
  BattleGreaseGroundHazardSavingThrowOutcomeHole,
  BattleHole,
  BattleMoonbeamDamageRollHole,
  BattleMoonbeamSaveTrigger,
  BattleMovableZoneRepositionMovementHole,
  BattleResolutionInput,
  BattleResolutionInputForSubject,
  BattleResolutionResult,
  BattleSavingThrowOutcome,
  BattleSavingThrowOutcomeValue,
  BattleSpellAreaChoice,
  BattleSleetStormAreaHazardSavingThrowOutcomeHole,
  BattleSleetStormAreaHazardTrigger,
  BattleState,
  BattleWebRestraintTrigger,
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
  flamingSphereDamageAfterSave,
  flamingSphereMoveDistanceAccepted,
} from "./flaming-sphere-hazard-ram.ts";
import {
  moonbeamDamageAfterSave,
  moonbeamMoveDistanceAccepted,
} from "./moonbeam-movable-zone.ts";
import {
  resolveCloudkillAreaSaveDamage,
  resolveInsectPlagueAreaSaveDamage,
} from "./persistent-area-save-damage.ts";
import { validateGustOfWindLineAreaPushFacts } from "./gust-of-wind-push-facts.ts";
import { revertShapeShiftedCombatantToTrueForm } from "./shape-shifting.ts";
import { resolveEndTurnCommand } from "./turn-boundary-lifecycle.ts";
import { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";
import {
  applyPreparedSlotSpellDamage,
  savingThrowFlatBonusProjections,
  savingThrowRollModeProjections,
} from "./spells-damage-fills.ts";
import {
  applyGreaseProneToTarget,
  applySleetStormAreaHazardFailedSaveEffect,
  applyWebRestrainedCondition,
  markSleetStormAreaHazardSavedThisTurn,
  markMoonbeamSavedThisTurn,
  addMoonbeamShapeShiftSuppression,
  removeMoonbeamShapeShiftSuppression,
  replaceGustOfWindLineDirection,
  markWebSavedThisTurn,
  removeWebRestrainedCondition,
} from "./spells-active-effects.ts";
import {
  greaseGroundHazardSavingThrowOutcomeHole,
  flamingSphereRamMovementHole,
  flamingSphereRepositionMovementHole,
  flamingSphereSavingThrowOutcomeHole,
  flamingSphereTriggerLabel,
  gustOfWindLineDirectionChoiceHole,
  gustOfWindLineSavingThrowOutcomeHole,
  moonbeamRepositionMovementHole,
  moonbeamSavingThrowOutcomeHole,
  moonbeamTriggerLabel,
  webRestraintSavingThrowOutcomeHole,
  type FlamingSphereEffect,
  type GreaseGroundHazardEffect,
  type GustOfWindLineEffect,
  type MoonbeamEffect,
  type WebRestraintHazardEffect,
} from "./persistent-spatial-spell-discovery.ts";

export type SleetStormAreaHazardEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "sleetStormAreaHazard" }
>;

const PERSISTENT_SPATIAL_SPELL_PROCEDURE_COMMANDS = [
  "greaseGroundHazardSave",
  "webRestraintSave",
  "sleetStormAreaHazardSave",
  "insectPlagueAreaHazardSave",
  "cloudkillAreaHazardSave",
  "webRestrainedNoLongerInArea",
  "webAreaRemoved",
  "gustOfWindLineSave",
  "gustOfWindLineDirectionChange",
  "movableZoneSave",
  "movableZoneReposition",
  "movableZoneRam",
  "moonbeamCylinderExit",
] as const satisfies ReadonlyArray<BattleRuntimeCommand>;

type PersistentSpatialSpellProcedureCommand =
  (typeof PERSISTENT_SPATIAL_SPELL_PROCEDURE_COMMANDS)[number];

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

type FlamingSphereSaveSubject = Extract<
  MovableZoneSaveSubject,
  { readonly trigger: "endsTurnWithinFiveFeetOfSphere" }
>;

type MoonbeamSaveSubject = Extract<
  MovableZoneSaveSubject,
  { readonly trigger: BattleMoonbeamSaveTrigger }
>;

type PersistentSpatialSaveFailedReplaySubject = Extract<
  PersistentSpatialSpellProcedureSubject,
  {
    readonly command:
      | "greaseGroundHazardSave"
      | "webRestraintSave"
      | "sleetStormAreaHazardSave"
      | "gustOfWindLineSave"
      | "movableZoneSave"
      | "movableZoneRam";
  }
>;

function maybeOpenPersistentSpatialSaveFailedReplayInterrupt(input: {
  readonly state: BattleState;
  readonly outcome: BattleSavingThrowOutcome;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly replaySubject: PersistentSpatialSaveFailedReplaySubject;
  readonly replayFills: readonly BattleFill[];
  readonly handledInterruptTrigger: BattleInterruptTrigger | undefined;
}): Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> | null {
  if (input.outcome.succeeded) {
    return null;
  }
  return maybeOpenInterruptWindow(
    input.state,
    {
      trigger: "saveFailed",
      targetId: input.outcome.targetId,
      sourceProcedureRef: input.sourceProcedureRef,
      continuation: {
        kind: "replay",
        subject: input.replaySubject,
        fills: input.replayFills,
      },
    },
    input.handledInterruptTrigger,
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

export function persistentAreaAppearanceSaveMayResolveOutsideCurrentTurn(
  subject: BattleSubject,
): boolean {
  return (
    subject.tag === "runtimeCommand" &&
    (subject.command === "insectPlagueAreaHazardSave" ||
      subject.command === "cloudkillAreaHazardSave") &&
    subject.areaMembershipTrigger.kind === "appearsInArea"
  );
}

export function resolvePersistentSpatialSpellProcedureCommand(
  input: BattleResolutionInputForSubject<PersistentSpatialSpellProcedureSubject> & {
    readonly handledInterruptTrigger?: BattleInterruptTrigger;
  },
): BattleResolutionResult {
  return Match.value(input.subject).pipe(
    Match.when({ command: "greaseGroundHazardSave" }, (subject) =>
      resolveGreaseGroundHazardSaveCommand({
        ...input,
        subject,
      }),
    ),
    Match.when({ command: "webRestraintSave" }, (subject) =>
      resolveWebRestraintSaveCommand({ ...input, subject }),
    ),
    Match.when({ command: "sleetStormAreaHazardSave" }, (subject) =>
      resolveSleetStormAreaHazardSaveCommand({ ...input, subject }),
    ),
    Match.when({ command: "insectPlagueAreaHazardSave" }, (subject) =>
      resolveInsectPlagueAreaHazardSaveCommand({ ...input, subject }),
    ),
    Match.when({ command: "cloudkillAreaHazardSave" }, (subject) =>
      resolveCloudkillAreaHazardSaveCommand({ ...input, subject }),
    ),
    Match.when({ command: "webRestrainedNoLongerInArea" }, (subject) =>
      resolveWebRestrainedNoLongerInAreaCommand({ ...input, subject }),
    ),
    Match.when({ command: "webAreaRemoved" }, (subject) =>
      resolveWebAreaRemovedCommand({ ...input, subject }),
    ),
    Match.when({ command: "gustOfWindLineSave" }, (subject) =>
      resolveGustOfWindLineSaveCommand({ ...input, subject }),
    ),
    Match.when({ command: "gustOfWindLineDirectionChange" }, (subject) =>
      resolveGustOfWindLineDirectionChangeCommand({ ...input, subject }),
    ),
    Match.when({ command: "movableZoneSave" }, (subject) => {
      if (subject.trigger === "endsTurnWithinFiveFeetOfSphere") {
        return resolveFlamingSphereSaveCommand({
          ...input,
          subject,
        });
      }
      return resolveMoonbeamSaveCommand({
        ...input,
        subject,
      });
    }),
    Match.when({ command: "movableZoneReposition" }, (subject) => {
      const flamingSphere = flamingSphereEffectFor(input.state, subject);
      if (flamingSphere !== undefined) {
        return resolveFlamingSphereRepositionCommand({ ...input, subject });
      }
      return resolveMoonbeamRepositionCommand({ ...input, subject });
    }),
    Match.when({ command: "movableZoneRam" }, (subject) =>
      resolveFlamingSphereRamCommand({ ...input, subject }),
    ),
    Match.when({ command: "moonbeamCylinderExit" }, (subject) =>
      resolveMoonbeamCylinderExitCommand({ ...input, subject }),
    ),
    Match.exhaustive,
  );
}

function greaseGroundHazardEffectFor(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "greaseGroundHazardSave";
    }
  >,
): GreaseGroundHazardEffect | undefined {
  return activeEffectForArea(
    state,
    subject.areaId,
    (effect): effect is GreaseGroundHazardEffect =>
      effect.kind === "greaseGroundHazard",
  );
}

function activeEffectForArea<
  TEffect extends BattleActiveEffect & { readonly areaId: BattleAreaId },
>(
  state: BattleState,
  areaId: BattleAreaId,
  isExpectedEffect: (effect: BattleActiveEffect) => effect is TEffect,
): TEffect | undefined {
  for (const combatant of state.combatants.values()) {
    const effect = combatant.activeEffects.find(
      (candidate): candidate is TEffect =>
        isExpectedEffect(candidate) && candidate.areaId === areaId,
    );
    if (effect !== undefined) return effect;
  }
  return undefined;
}

function greaseGroundHazardSavingThrowOutcomeFor(
  fills: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[],
  hole: BattleGreaseGroundHazardSavingThrowOutcomeHole,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> | undefined {
  return fills.find((fill) => fill.holeId === hole.holeId);
}

function validateGreaseGroundHazardSavingThrowOutcome(
  value: BattleSavingThrowOutcomeValue,
  targetId: CombatantId,
): string | null {
  /* v8 ignore start -- Malformed fill: a Grease entry save is single-target and cannot carry area geometry or an outcome for a different combatant. */
  if ("area" in value) {
    return "Grease ground-hazard Saving Throw outcome must not include area facts.";
  }
  return value.outcomes.length === 1 && value.outcomes[0]?.targetId === targetId
    ? null
    : "Grease ground-hazard Saving Throw outcome must match the triggering target.";
  /* v8 ignore stop */
}

function resolveGreaseGroundHazardSaveCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "greaseGroundHazardSave";
      }
    >;
    readonly handledInterruptTrigger?: BattleInterruptTrigger;
  },
): BattleResolutionResult {
  if (input.subject.trigger === "endsTurnInArea") {
    return resolveGreaseGroundHazardEndTurnSaveCommand(input);
  }
  return resolveGreaseGroundHazardEntrySaveCommand(input);
}

function resolveGreaseGroundHazardEntrySaveCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "greaseGroundHazardSave";
      }
    >;
    readonly handledInterruptTrigger?: BattleInterruptTrigger;
  },
): BattleResolutionResult {
  /* v8 ignore start -- Malformed fill set: the discovered Grease hazard subject exposes at most its one Saving Throw outcome hole. */
  if (
    input.fills.some((fill) => fill.kind !== "savingThrowOutcome") ||
    input.fills.length > 1
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Grease ground-hazard save accepts exactly one Saving Throw outcome fill.",
    );
  }
  /* v8 ignore stop */
  const effect = greaseGroundHazardEffectFor(input.state, input.subject);
  if (effect === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Grease ground-hazard save is no longer available.",
    );
  }
  const hole = greaseGroundHazardSavingThrowOutcomeHole(
    input.state,
    input.subject.actorId,
    effect,
    input.subject.trigger,
  );
  const savingThrowFill = greaseGroundHazardSavingThrowOutcomeFor(
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
  const validation = validateGreaseGroundHazardSavingThrowOutcome(
    savingThrowFill.value,
    input.subject.actorId,
  );
  /* v8 ignore start -- Malformed fill: the Grease save outcome must answer the discovered single-target hole for the triggering actor. */
  if (validation !== null) {
    return invalidResult(input.state, "invalidFill", validation);
  }
  /* v8 ignore stop */
  const outcome = savingThrowFill.value.outcomes[0]!;
  const saveFailedReactionWindow =
    maybeOpenPersistentSpatialSaveFailedReplayInterrupt({
      state: input.state,
      outcome,
      sourceProcedureRef: effect.sourceProcedureRef,
      replaySubject: input.subject,
      replayFills: input.fills,
      handledInterruptTrigger: input.handledInterruptTrigger,
    });
  if (saveFailedReactionWindow !== null) {
    return saveFailedReactionWindow;
  }
  const nextState = outcome.succeeded
    ? input.state
    : applyGreaseProneToTarget(input.state, input.subject.actorId);
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function webRestraintHazardEffectFor(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command:
        | "webRestraintSave"
        | "webRestrainedNoLongerInArea"
        | "webAreaRemoved";
    }
  >,
): WebRestraintHazardEffect | undefined {
  return activeEffectForArea(
    state,
    subject.areaId,
    (effect): effect is WebRestraintHazardEffect =>
      effect.kind === "webRestraintHazard",
  );
}

function validateWebRestraintSavingThrowOutcome(
  value: BattleSavingThrowOutcomeValue,
  targetId: CombatantId,
): string | null {
  /* v8 ignore start -- Malformed fill: a Web restraint save is single-target and cannot carry area geometry or an outcome for a different combatant. */
  if ("area" in value) {
    return "Web Restraint Saving Throw outcome must not include area facts.";
  }
  return value.outcomes.length === 1 && value.outcomes[0]?.targetId === targetId
    ? null
    : "Web Restraint Saving Throw outcome must match the triggering target.";
  /* v8 ignore stop */
}

function webRestraintSaveAlreadyResolved(
  effect: WebRestraintHazardEffect,
  targetId: CombatantId,
  trigger: BattleWebRestraintTrigger,
): boolean {
  return trigger === "entersArea"
    ? effect.entrySavedThisTurn.includes(targetId)
    : effect.startTurnSavedThisTurn.includes(targetId);
}

function resolveWebRestraintSaveCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "webRestraintSave";
      }
    >;
    readonly handledInterruptTrigger?: BattleInterruptTrigger;
  },
): BattleResolutionResult {
  /* v8 ignore start -- Malformed fill set: the discovered Web restraint subject exposes at most its one Saving Throw outcome hole. */
  if (
    input.fills.some((fill) => fill.kind !== "savingThrowOutcome") ||
    input.fills.length > 1
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Web Restraint save accepts exactly one Saving Throw outcome fill.",
    );
  }
  /* v8 ignore stop */
  const effect = webRestraintHazardEffectFor(input.state, input.subject);
  if (effect === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Web Restraint save is no longer available.",
    );
  }
  if (
    webRestraintSaveAlreadyResolved(
      effect,
      input.subject.actorId,
      input.subject.trigger,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Web Restraint save was already resolved for this target this turn.",
    );
  }
  const hole = webRestraintSavingThrowOutcomeHole(
    input.state,
    input.subject.actorId,
    effect,
    input.subject.trigger,
  );
  const [savingThrowFill] = input.fills;
  if (savingThrowFill === undefined) {
    return needsHolesResult(input.state, input.subject, [hole]);
  }
  /* v8 ignore start -- Internal protocol invariant: the fill-kind gate above leaves only a Saving Throw outcome when the optional first fill is present. */
  if (savingThrowFill.kind !== "savingThrowOutcome") {
    return invalidResult(
      input.state,
      "invalidFill",
      "Web Restraint save requires a Saving Throw outcome fill.",
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed fill: the supplied Saving Throw outcome must answer the exact hole derived from this Web restraint subject. */
  if (savingThrowFill.holeId !== hole.holeId) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Web Restraint save requires the matching Saving Throw outcome fill.",
    );
  }
  /* v8 ignore stop */
  const validation = validateWebRestraintSavingThrowOutcome(
    savingThrowFill.value,
    input.subject.actorId,
  );
  /* v8 ignore start -- Malformed fill: the Web save outcome must answer the discovered single-target hole for the triggering actor. */
  if (validation !== null) {
    return invalidResult(input.state, "invalidFill", validation);
  }
  /* v8 ignore stop */
  const outcome = savingThrowFill.value.outcomes[0]!;
  const saveFailedReactionWindow =
    maybeOpenPersistentSpatialSaveFailedReplayInterrupt({
      state: input.state,
      outcome,
      sourceProcedureRef: effect.sourceProcedureRef,
      replaySubject: input.subject,
      replayFills: input.fills,
      handledInterruptTrigger: input.handledInterruptTrigger,
    });
  if (saveFailedReactionWindow !== null) {
    return saveFailedReactionWindow;
  }
  const marked = markWebSavedThisTurn(
    input.state,
    input.subject.actorId,
    effect,
    input.subject.trigger,
  );
  const nextState = !outcome.succeeded
    ? applyWebRestrainedCondition(marked, input.subject.actorId, effect)
    : marked;
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function sleetStormAreaHazardEffectFor(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "sleetStormAreaHazardSave";
    }
  >,
): SleetStormAreaHazardEffect | undefined {
  return activeEffectForArea(
    state,
    subject.areaMembershipTrigger.areaId,
    (effect): effect is SleetStormAreaHazardEffect =>
      effect.kind === "sleetStormAreaHazard",
  );
}

const bySleetStormAreaMembershipTriggerKind = Match.discriminator("kind");

function sleetStormAreaHazardTriggerFromMembershipFact(
  trigger: BattleSleetStormAreaMembershipTrigger,
): BattleSleetStormAreaHazardTrigger {
  return Match.value(trigger).pipe(
    bySleetStormAreaMembershipTriggerKind(
      "firstEntryOnTurn",
      () => "entersArea" as const,
    ),
    bySleetStormAreaMembershipTriggerKind(
      "turnStartInArea",
      () => "startsTurnInArea" as const,
    ),
    Match.exhaustive,
  );
}

export function sleetStormAreaHazardSavingThrowOutcomeHole(
  state: BattleState,
  targetId: CombatantId,
  effect: SleetStormAreaHazardEffect,
  trigger: BattleSleetStormAreaHazardTrigger,
): BattleSleetStormAreaHazardSavingThrowOutcomeHole {
  const key = `battle:sleet-storm-area-hazard-save:${targetId}:${effect.sourceCombatantId}:${effect.sourceProcedureRef}:${effect.areaId}:${trigger}`;
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${trigger === "entersArea" ? "Entry" : "Start-turn"} DEX save`,
    sleetStormAreaHazard: {
      targetId,
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

function validateSleetStormAreaHazardSavingThrowOutcome(
  value: BattleSavingThrowOutcomeValue,
  targetId: CombatantId,
): string | null {
  /* v8 ignore start -- Malformed fill: a Sleet Storm membership save is single-target and cannot carry area geometry or an outcome for a different combatant. */
  if ("area" in value) {
    return "Sleet Storm Saving Throw outcome must not include area facts.";
  }
  return value.outcomes.length === 1 && value.outcomes[0]?.targetId === targetId
    ? null
    : "Sleet Storm Saving Throw outcome must match the triggering target.";
  /* v8 ignore stop */
}

function sleetStormAreaHazardSaveAlreadyResolved(
  effect: SleetStormAreaHazardEffect,
  targetId: CombatantId,
): boolean {
  return effect.savedThisTurn.includes(targetId);
}

function resolveSleetStormAreaHazardSaveCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "sleetStormAreaHazardSave";
      }
    >;
    readonly handledInterruptTrigger?: BattleInterruptTrigger;
  },
): BattleResolutionResult {
  /* v8 ignore start -- Malformed fill set: the discovered Sleet Storm subject exposes at most its one Saving Throw outcome hole. */
  if (
    input.fills.some((fill) => fill.kind !== "savingThrowOutcome") ||
    input.fills.length > 1
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Sleet Storm save accepts exactly one Saving Throw outcome fill.",
    );
  }
  /* v8 ignore stop */
  const effect = sleetStormAreaHazardEffectFor(input.state, input.subject);
  if (effect === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Sleet Storm save is no longer available.",
    );
  }
  const trigger = sleetStormAreaHazardTriggerFromMembershipFact(
    input.subject.areaMembershipTrigger,
  );
  if (sleetStormAreaHazardSaveAlreadyResolved(effect, input.subject.actorId)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Sleet Storm save was already resolved for this target this turn.",
    );
  }
  const hole = sleetStormAreaHazardSavingThrowOutcomeHole(
    input.state,
    input.subject.actorId,
    effect,
    trigger,
  );
  const [savingThrowFill] = input.fills;
  if (savingThrowFill === undefined) {
    return needsHolesResult(input.state, input.subject, [hole]);
  }
  /* v8 ignore start -- Internal protocol invariant: the fill-kind gate above leaves only a Saving Throw outcome when the optional first fill is present. */
  if (savingThrowFill.kind !== "savingThrowOutcome") {
    return invalidResult(
      input.state,
      "invalidFill",
      "Sleet Storm save requires a Saving Throw outcome fill.",
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed fill: the supplied Saving Throw outcome must answer the exact hole derived from this Sleet Storm subject. */
  if (savingThrowFill.holeId !== hole.holeId) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Sleet Storm save requires the matching Saving Throw outcome fill.",
    );
  }
  /* v8 ignore stop */
  const validation = validateSleetStormAreaHazardSavingThrowOutcome(
    savingThrowFill.value,
    input.subject.actorId,
  );
  /* v8 ignore start -- Malformed fill: the Sleet Storm save outcome must answer the discovered single-target hole for the triggering actor. */
  if (validation !== null) {
    return invalidResult(input.state, "invalidFill", validation);
  }
  /* v8 ignore stop */
  const outcome = savingThrowFill.value.outcomes[0]!;
  const saveFailedReactionWindow =
    maybeOpenPersistentSpatialSaveFailedReplayInterrupt({
      state: input.state,
      outcome,
      sourceProcedureRef: effect.sourceProcedureRef,
      replaySubject: input.subject,
      replayFills: input.fills,
      handledInterruptTrigger: input.handledInterruptTrigger,
    });
  if (saveFailedReactionWindow !== null) {
    return saveFailedReactionWindow;
  }
  const marked = markSleetStormAreaHazardSavedThisTurn(
    input.state,
    input.subject.actorId,
    effect,
  );
  const nextState = outcome.succeeded
    ? marked
    : applySleetStormAreaHazardFailedSaveEffect(marked, input.subject.actorId);
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveInsectPlagueAreaHazardSaveCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "insectPlagueAreaHazardSave";
      }
    >;
    readonly handledInterruptTrigger?: BattleInterruptTrigger;
  },
): BattleResolutionResult {
  return resolveInsectPlagueAreaSaveDamage(input);
}

function resolveCloudkillAreaHazardSaveCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "cloudkillAreaHazardSave";
      }
    >;
    readonly handledInterruptTrigger?: BattleInterruptTrigger;
  },
): BattleResolutionResult {
  return resolveCloudkillAreaSaveDamage(input);
}

function resolveWebRestrainedNoLongerInAreaCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "webRestrainedNoLongerInArea";
      }
    >;
  },
): BattleResolutionResult {
  /* v8 ignore start -- Malformed fill set: Web no-longer-in-area cleanup is a discovered no-input transition and exposes no holes. */
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Web no-longer-in-area cleanup uses no fills.",
    );
  }
  /* v8 ignore stop */
  const effect = webRestraintHazardEffectFor(input.state, input.subject);
  if (effect === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Web Restraint cleanup is no longer available.",
    );
  }
  const nextState = removeWebRestrainedCondition({
    state: input.state,
    targetId: input.subject.actorId,
    sourceCombatantId: effect.sourceCombatantId,
    sourceProcedureRef: effect.sourceProcedureRef,
  });
  return nextState === input.state
    ? invalidResult(
        input.state,
        "staleSubject",
        "Web Restraint cleanup is no longer available.",
      )
    : {
        tag: "resolved",
        state: nextState,
        snapshot: snapshotBattle(nextState),
      };
}

function resolveWebAreaRemovedCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "webAreaRemoved";
      }
    >;
  },
): BattleResolutionResult {
  /* v8 ignore start -- Malformed fill set: Web area removal is a discovered no-input transition and exposes no holes. */
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Web area removal uses no fills.",
    );
  }
  /* v8 ignore stop */
  const effect = webRestraintHazardEffectFor(input.state, input.subject);
  if (effect === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Web area is no longer active.",
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

function gustOfWindLineEffectFor(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "gustOfWindLineSave" | "gustOfWindLineDirectionChange";
    }
  >,
): GustOfWindLineEffect | undefined {
  return activeEffectForArea(
    state,
    subject.areaId,
    (effect): effect is GustOfWindLineEffect =>
      effect.kind === "gustOfWindLine" &&
      effect.directionId === subject.directionId,
  );
}

function validateGustOfWindLineSavingThrowOutcome(
  value: BattleSavingThrowOutcomeValue,
  targetId: CombatantId,
  effect: GustOfWindLineEffect,
): string | null {
  if (!("area" in value)) {
    /* v8 ignore next -- Gust of Wind discovery always supplies the active Line area; this rejects only a caller-mutated missing-area witness. */
    return "Gust of Wind Line Saving Throw outcome requires Line area facts.";
  }
  const area: BattleSpellAreaChoice = value.area;
  if (
    area.kind !== "gustOfWindLineArea" ||
    area.areaId !== effect.areaId ||
    area.directionId !== effect.directionId ||
    area.originAnchorId !== effect.sourceCombatantId
  ) {
    /* v8 ignore next -- Gust of Wind discovery binds this area to the active Line; this rejects only a caller-mutated geometry or source identity. */
    return "Gust of Wind Line Saving Throw outcome must match the active Line area.";
  }
  if (
    area.affectedTargetIds.length !== 1 ||
    area.affectedTargetIds[0] !== targetId ||
    value.outcomes.length !== 1 ||
    value.outcomes[0]?.targetId !== targetId
  ) {
    /* v8 ignore next -- Gust of Wind discovery selects the ending-turn target exactly once; this rejects only a caller-mutated target or outcome cardinality. */
    return "Gust of Wind Line Saving Throw outcome must match the ending-turn target.";
  }
  return validateGustOfWindLineAreaPushFacts({
    area,
    failedTargetIds: value.outcomes[0]?.succeeded === true ? [] : [targetId],
    pushDistanceFeet: effect.pushDistanceFeet,
  });
}

function resolveGustOfWindLineSaveCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "gustOfWindLineSave";
      }
    >;
    readonly handledInterruptTrigger?: BattleInterruptTrigger;
  },
): BattleResolutionResult {
  const effect = gustOfWindLineEffectFor(input.state, input.subject);
  if (effect === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Gust of Wind Line save is no longer available.",
    );
  }
  const hole = gustOfWindLineSavingThrowOutcomeHole(
    input.state,
    input.subject.actorId,
    effect,
    input.subject.trigger,
  );
  const matchingGustFills = input.fills.filter(
    (fill) => fill.holeId === hole.holeId,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (matchingGustFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "End Turn in Gust of Wind received duplicate Gust of Wind Saving Throw outcome fills.",
    );
  }
  /* v8 ignore stop */
  const [matchingGustFill] = matchingGustFills;
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    matchingGustFill !== undefined &&
    matchingGustFill.kind !== "savingThrowOutcome"
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "End Turn in Gust of Wind requires a Gust of Wind Saving Throw outcome fill.",
    );
  }
  /* v8 ignore stop */
  const endTurnSubject = {
    tag: "runtimeCommand" as const,
    actorId: input.subject.actorId,
    command: "endTurn" as const,
  };
  const endTurnFills = input.fills.filter(
    (fill) => fill.holeId !== hole.holeId,
  );
  const endTurnProbe = resolveEndTurnCommand({
    state: input.state,
    subject: endTurnSubject,
    fills: endTurnFills,
  });
  if (matchingGustFill === undefined) {
    return needsSpatialProcedureHoleWithEndTurnFrontier({
      state: input.state,
      subject: input.subject,
      hole,
      endTurnProbe,
    });
  }
  const validation = validateGustOfWindLineSavingThrowOutcome(
    matchingGustFill.value,
    input.subject.actorId,
    effect,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (validation !== null) {
    return invalidResult(input.state, "invalidFill", validation);
  }
  /* v8 ignore stop */
  const pendingEndTurn = pendingSpatialProcedureEndTurnResult(
    endTurnProbe,
    input.subject,
  );
  if (pendingEndTurn !== null) {
    return pendingEndTurn;
  }
  const outcome = matchingGustFill.value.outcomes[0]!;
  const saveFailedReactionWindow =
    maybeOpenPersistentSpatialSaveFailedReplayInterrupt({
      state: input.state,
      outcome,
      sourceProcedureRef: effect.sourceProcedureRef,
      replaySubject: input.subject,
      replayFills: input.fills,
      handledInterruptTrigger: input.handledInterruptTrigger,
    });
  if (saveFailedReactionWindow !== null) {
    return saveFailedReactionWindow;
  }
  const endTurnResult = resolveEndTurnCommand({
    state: input.state,
    subject: endTurnSubject,
    fills: endTurnFills,
  });
  return endTurnResult.tag === "needsHoles"
    ? { ...endTurnResult, subject: input.subject }
    : endTurnResult;
}

function resolveGustOfWindLineDirectionChangeCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "gustOfWindLineDirectionChange";
      }
    >
  >,
): BattleResolutionResult {
  const effect = gustOfWindLineEffectFor(input.state, input.subject);
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
      "Gust of Wind Line direction change is no longer available.",
    );
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fills.some((fill) => fill.kind !== "gustOfWindLineDirectionChoice")
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Gust of Wind Line direction change accepts only direction-choice fills.",
    );
  }
  /* v8 ignore stop */
  const hole = gustOfWindLineDirectionChoiceHole(effect);
  const directionFills = input.fills.filter(
    (
      fill,
    ): fill is Extract<
      BattleFill,
      { readonly kind: "gustOfWindLineDirectionChoice" }
    > => fill.kind === "gustOfWindLineDirectionChoice",
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!everyFillUsesHoleId(directionFills, hole.holeId)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Gust of Wind Line direction change received a fill for an unrelated hole.",
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (directionFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Gust of Wind Line direction change received duplicate fills.",
    );
  }
  /* v8 ignore stop */
  const directionFill = directionFills[0];
  if (directionFill === undefined) {
    return needsHolesResult(input.state, input.subject, [hole]);
  }
  const spent = spendActivationResource(input.state.currentTurnResources, {
    kind: "bonusAction",
  });
  if (Either.isLeft(spent)) {
    /* v8 ignore next -- Defensive internal guard: the availability check above and this spend read the same turn resources, with no intervening state transition. */
    return invalidResult(
      input.state,
      "staleSubject",
      "Gust of Wind Line direction change requires an available Bonus Action.",
    );
  }
  const nextState = replaceGustOfWindLineDirection({
    state: {
      ...input.state,
      currentTurnResources: spent.right,
    },
    sourceCombatantId: effect.sourceCombatantId,
    sourceProcedureRef: effect.sourceProcedureRef,
    areaId: effect.areaId,
    directionId: directionFill.value.directionId,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function flamingSphereEffectFor(
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
): FlamingSphereEffect | undefined {
  return activeEffectForArea(
    state,
    subject.areaId,
    (effect): effect is FlamingSphereEffect => effect.kind === "flamingSphere",
  );
}

function flamingSphereDamageRollHole(
  targetId: CombatantId,
  effect: FlamingSphereEffect,
  trigger: BattleFlamingSphereTrigger,
): BattleFlamingSphereDamageRollHole {
  const key = `battle:flaming-sphere-damage:${targetId}:${effect.sourceCombatantId}:${effect.sourceProcedureRef}:${effect.areaId}:${trigger}`;
  return {
    kind: "rolledDice",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${flamingSphereTriggerLabel(trigger)} damage`,
    movableZone: {
      targetId,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      areaId: effect.areaId,
      trigger,
      damage: effect.damage,
    },
    critical: false,
  };
}

function validateFlamingSphereSavingThrowOutcome(
  value: BattleSavingThrowOutcomeValue,
  targetId: CombatantId,
): string | null {
  /* v8 ignore start -- Malformed fill: a Flaming Sphere ram save hole is single-target and cannot carry area geometry. */
  if ("area" in value) {
    return "Movable zone saving throw outcome must not include area facts.";
  }
  /* v8 ignore stop */
  if (value.outcomes.length === 1 && value.outcomes[0]?.targetId === targetId) {
    return null;
  }
  /* v8 ignore next -- Malformed fill: the discovered Flaming Sphere ram save hole names exactly its triggering target. */
  return "Movable zone saving throw outcome must match the triggering target.";
}

function validateFlamingSphereDamageRoll(
  fill: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  hole: BattleFlamingSphereDamageRollHole,
): string | null {
  if (fill.holeId !== hole.holeId) {
    return "Movable zone damage must use the selected damage hole.";
  }
  return validateRolledDiceFillForDiceExpr(fill, hole.movableZone.damage.expr);
}

function validateFlamingSphereRamMovement(
  fill: Extract<BattleFill, { readonly kind: "movableZoneRamMovement" }>,
  hole: BattleFlamingSphereRamMovementHole,
): string | null {
  if (fill.holeId !== hole.holeId) {
    return "Movable zone ram movement must use the selected sphere movement hole.";
  }
  if (
    Number(fill.value.moveFeet) <= 0 ||
    !Number.isInteger(fill.value.moveFeet)
  ) {
    return "Movable zone ram movement distance must be a positive integer.";
  }
  return flamingSphereMoveDistanceAccepted({
    moveFeet: Number(fill.value.moveFeet),
    maxMoveFeet: Number(hole.movableZone.maxMoveFeet),
  })
    ? null
    : "Movable zone ram movement distance exceeds the spell's maximum.";
}

/* v8 ignore start -- Malformed Flaming Sphere reposition fill: discovery fixes the movement hole and offers positive whole-foot movement no greater than the active spell maximum. */
function validateFlamingSphereRepositionMovement(
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
  return flamingSphereMoveDistanceAccepted({
    moveFeet: Number(fill.value.moveFeet),
    maxMoveFeet: Number(hole.movableZone.maxMoveFeet),
  })
    ? null
    : "Movable zone reposition movement distance exceeds the spell's maximum.";
}
/* v8 ignore stop */

function flamingSphereAdjustedDamage(input: {
  readonly state: BattleState;
  readonly target: BattleCreatureState;
  readonly effect: FlamingSphereEffect;
  readonly damageFill: Extract<BattleFill, { readonly kind: "rolledDice" }>;
  readonly saveSucceeded: boolean;
}): number {
  const rolledDamage =
    rolledDiceTotal(input.damageFill.value) +
    (input.effect.damage.expr.flat ?? 0);
  const saveAdjustedDamage = flamingSphereDamageAfterSave({
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

function applyFlamingSphereDamage(input: {
  readonly state: BattleState;
  readonly target: BattleCreatureState;
  readonly effect: FlamingSphereEffect;
  readonly damageFill: Extract<BattleFill, { readonly kind: "rolledDice" }>;
  readonly saveSucceeded: boolean;
  readonly concentrationSavingThrow?:
    | Extract<BattleFill, { readonly kind: "concentrationSavingThrow" }>
    | undefined;
}): BattleState {
  return applyPreparedSlotSpellDamage(
    input.state,
    input.target.combatantId,
    flamingSphereAdjustedDamage({
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

function resolveFlamingSphereSaveCommand(
  input: BattleResolutionInput & {
    readonly subject: FlamingSphereSaveSubject;
    readonly handledInterruptTrigger?: BattleInterruptTrigger;
  },
): BattleResolutionResult {
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fills.some(
      (fill) =>
        fill.kind !== "savingThrowOutcome" &&
        fill.kind !== "rolledDice" &&
        fill.kind !== "concentrationSavingThrow",
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone save accepts only save, damage, and Concentration fills.",
    );
  }
  /* v8 ignore stop */
  const effect = flamingSphereEffectFor(input.state, input.subject);
  const target = input.state.combatants.get(input.subject.actorId);
  if (effect === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Movable zone save is no longer available.",
    );
  }
  /* v8 ignore start -- Spatial-procedure invariant: a Flaming Sphere save subject is routed here only after its target combatant has been found in the current state. */
  if (target === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Movable zone save target is no longer available.",
    );
  }
  /* v8 ignore stop */
  const saveHole = flamingSphereSavingThrowOutcomeHole(
    input.state,
    input.subject.actorId,
    effect,
    input.subject.trigger,
  );
  const damageHole = flamingSphereDamageRollHole(
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (saveFills.length > 1 || damageFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone end-within-5-feet save received duplicate sphere fills.",
    );
  }
  /* v8 ignore stop */
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
  const endTurnProbe = resolveEndTurnCommand({
    state: input.state,
    subject: endTurnSubject,
    fills: endTurnFills,
  });
  const saveFill = savingThrowOutcomeFillForHole(saveFills, saveHole);
  if (saveFill === undefined) {
    return needsSpatialProcedureHoleWithEndTurnFrontier({
      state: input.state,
      subject: input.subject,
      hole: saveHole,
      endTurnProbe,
    });
  }
  const saveValidation = validateFlamingSphereSavingThrowOutcome(
    saveFill.value,
    input.subject.actorId,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (saveValidation !== null) {
    return invalidResult(input.state, "invalidFill", saveValidation);
  }
  /* v8 ignore stop */
  const saveOutcome = saveFill.value.outcomes[0]!;
  const saveFailedReactionWindow =
    maybeOpenPersistentSpatialSaveFailedReplayInterrupt({
      state: input.state,
      outcome: saveOutcome,
      sourceProcedureRef: effect.sourceProcedureRef,
      replaySubject: input.subject,
      replayFills: input.fills,
      handledInterruptTrigger: input.handledInterruptTrigger,
    });
  if (saveFailedReactionWindow !== null) {
    return saveFailedReactionWindow;
  }
  const damageFill = rolledDiceFillForHole(damageFills, damageHole);
  if (damageFill === undefined) {
    return needsSpatialProcedureHoleWithEndTurnFrontier({
      state: input.state,
      subject: input.subject,
      hole: damageHole,
      endTurnProbe,
    });
  }
  const damageValidation = validateFlamingSphereDamageRoll(
    damageFill,
    damageHole,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (damageValidation !== null) {
    return invalidResult(input.state, "invalidFill", damageValidation);
  }
  /* v8 ignore stop */
  const adjustedDamage = flamingSphereAdjustedDamage({
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (concentrationFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone end-within-5-feet save received duplicate sphere fills.",
    );
  }
  /* v8 ignore stop */
  const concentrationFill =
    concentrationHole === null
      ? undefined
      : concentrationSavingThrowFillFor(concentrationFills, concentrationHole);
  if (concentrationHole !== null && concentrationFill === undefined) {
    return needsSpatialProcedureHoleWithEndTurnFrontier({
      state: input.state,
      subject: input.subject,
      hole: concentrationHole,
      endTurnProbe,
    });
  }
  const pendingEndTurn = pendingSpatialProcedureEndTurnResult(
    endTurnProbe,
    input.subject,
  );
  if (pendingEndTurn !== null) {
    return pendingEndTurn;
  }
  const damaged = applyFlamingSphereDamage({
    state: input.state,
    target,
    effect,
    damageFill,
    saveSucceeded: saveOutcome.succeeded,
    concentrationSavingThrow: concentrationFill,
  });
  const endTurnResult = resolveEndTurnCommand({
    state: damaged,
    subject: endTurnSubject,
    fills: endTurnFills,
  });
  return endTurnResult.tag === "needsHoles"
    ? { ...endTurnResult, subject: input.subject }
    : endTurnResult;
}

function resolveFlamingSphereRepositionCommand(
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fills.some((fill) => fill.kind !== "movableZoneRepositionMovement")
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone reposition accepts only movement fills.",
    );
  }
  /* v8 ignore stop */
  const effect = flamingSphereEffectFor(input.state, input.subject);
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
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Movable zone reposition requires an available Bonus Action.",
    );
  }
  /* v8 ignore stop */
  const movementHole = flamingSphereRepositionMovementHole(effect);
  const movementFills = input.fills.filter(
    (
      fill,
    ): fill is Extract<
      BattleFill,
      { readonly kind: "movableZoneRepositionMovement" }
    > => fill.kind === "movableZoneRepositionMovement",
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!everyFillUsesHoleId(movementFills, movementHole.holeId)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone reposition received a fill for an unrelated hole.",
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (movementFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone reposition received duplicate sphere fills.",
    );
  }
  /* v8 ignore stop */
  const movementFill = movementFills[0];
  if (movementFill === undefined) {
    return needsHolesResult(input.state, input.subject, [movementHole]);
  }
  const movementValidation = validateFlamingSphereRepositionMovement(
    movementFill,
    movementHole,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (movementValidation !== null) {
    return invalidResult(input.state, "invalidFill", movementValidation);
  }
  /* v8 ignore stop */
  const nextState = {
    ...input.state,
    currentTurnResources: spent.right,
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveFlamingSphereRamCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "movableZoneRam";
      }
    >;
    readonly handledInterruptTrigger?: BattleInterruptTrigger;
  },
): BattleResolutionResult {
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
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
  /* v8 ignore stop */
  const effect = flamingSphereEffectFor(input.state, input.subject);
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
  const saveHole = flamingSphereSavingThrowOutcomeHole(
    input.state,
    input.subject.targetId,
    effect,
    input.subject.trigger,
  );
  const movementHole = flamingSphereRamMovementHole(
    input.subject.targetId,
    effect,
  );
  const damageHole = flamingSphereDamageRollHole(
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
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
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
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
  /* v8 ignore stop */
  const movementFill = movementFills[0];
  if (movementFill === undefined) {
    return needsHolesResult(input.state, input.subject, [movementHole]);
  }
  const movementValidation = validateFlamingSphereRamMovement(
    movementFill,
    movementHole,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (movementValidation !== null) {
    return invalidResult(input.state, "invalidFill", movementValidation);
  }
  /* v8 ignore stop */
  const saveFill = savingThrowOutcomeFillForHole(saveFills, saveHole);
  if (saveFill === undefined) {
    return needsHolesResult(input.state, input.subject, [saveHole]);
  }
  const saveValidation = validateFlamingSphereSavingThrowOutcome(
    saveFill.value,
    input.subject.targetId,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (saveValidation !== null) {
    return invalidResult(input.state, "invalidFill", saveValidation);
  }
  /* v8 ignore stop */
  const saveOutcome = saveFill.value.outcomes[0]!;
  const damageFill = rolledDiceFillForHole(damageFills, damageHole);
  if (damageFill === undefined) {
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (concentrationFills.length > 0) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Movable zone ram received a fill for an unrelated hole.",
      );
    }
    /* v8 ignore stop */
  } else {
    const damageValidation = validateFlamingSphereDamageRoll(
      damageFill,
      damageHole,
    );
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (damageValidation !== null) {
      return invalidResult(input.state, "invalidFill", damageValidation);
    }
    /* v8 ignore stop */
  }
  const concentrationHole =
    damageFill === undefined
      ? null
      : concentrationSavingThrowHole(
          target,
          flamingSphereAdjustedDamage({
            state: input.state,
            target,
            effect,
            damageFill,
            saveSucceeded: saveOutcome.succeeded,
          }),
        );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
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
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (concentrationFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone ram received duplicate sphere fills.",
    );
  }
  /* v8 ignore stop */
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
      handledInterruptTrigger: input.handledInterruptTrigger,
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
  const damaged = applyFlamingSphereDamage({
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
  /* v8 ignore start -- Defensive internal guard: admission proves the Bonus Action, and synchronous Flaming Sphere damage preserves current turn resources before this spend. */
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Movable zone ram requires an available Bonus Action.",
    );
  }
  /* v8 ignore stop */
  const nextState = {
    ...damaged,
    currentTurnResources: spent.right,
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function moonbeamEffectFor(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command:
        | "movableZoneSave"
        | "movableZoneReposition"
        | "moonbeamCylinderExit";
    }
  >,
): MoonbeamEffect | undefined {
  return activeEffectForArea(
    state,
    subject.areaId,
    (effect): effect is MoonbeamEffect => effect.kind === "moonbeam",
  );
}

function moonbeamDamageRollHole(
  targetId: CombatantId,
  effect: MoonbeamEffect,
  trigger: BattleMoonbeamSaveTrigger,
): BattleMoonbeamDamageRollHole {
  const key = `battle:moonbeam-damage:${targetId}:${effect.sourceCombatantId}:${effect.sourceProcedureRef}:${effect.areaId}:${trigger}`;
  return {
    kind: "rolledDice",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${moonbeamTriggerLabel(trigger)} damage`,
    movableZone: {
      targetId,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      areaId: effect.areaId,
      trigger,
      damage: effect.damage,
    },
    critical: false,
  };
}

function validateMoonbeamSavingThrowOutcome(
  value: BattleSavingThrowOutcomeValue,
  targetId: CombatantId,
): string | null {
  /* v8 ignore start -- Malformed fill: a Moonbeam membership save hole is single-target and cannot carry area geometry. */
  if ("area" in value) {
    return "Movable zone saving throw outcome must not include area facts.";
  }
  /* v8 ignore stop */
  if (value.outcomes.length === 1 && value.outcomes[0]?.targetId === targetId) {
    return null;
  }
  /* v8 ignore next -- Malformed fill: the discovered Moonbeam save hole names exactly its triggering target. */
  return "Movable zone saving throw outcome must match the triggering target.";
}

function validateMoonbeamDamageRoll(
  fill: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  hole: BattleMoonbeamDamageRollHole,
): string | null {
  if (fill.holeId !== hole.holeId) {
    return "Movable zone save damage must use the selected damage hole.";
  }
  return validateRolledDiceFillForDiceExpr(fill, hole.movableZone.damage.expr);
}

/* v8 ignore start -- Malformed Moonbeam reposition fill: discovery fixes the movement hole and offers positive whole-foot movement no greater than the active spell maximum. */
function validateMoonbeamRepositionMovement(
  fill: Extract<BattleFill, { readonly kind: "movableZoneRepositionMovement" }>,
  hole: BattleMovableZoneRepositionMovementHole,
): string | null {
  if (fill.holeId !== hole.holeId) {
    return "Movable zone reposition movement must use the selected movement hole.";
  }
  if (!Number.isInteger(fill.value.moveFeet)) {
    return "Movable zone reposition movement distance must be a positive integer.";
  }
  return moonbeamMoveDistanceAccepted({
    moveFeet: Number(fill.value.moveFeet),
    maxMoveFeet: Number(hole.movableZone.maxMoveFeet),
  })
    ? null
    : Number(fill.value.moveFeet) > 0
      ? "Movable zone reposition movement distance exceeds the spell's maximum."
      : "Movable zone reposition movement distance must be a positive integer.";
}
/* v8 ignore stop */

function moonbeamAdjustedDamage(input: {
  readonly state: BattleState;
  readonly target: BattleCreatureState;
  readonly effect: MoonbeamEffect;
  readonly damageFill: Extract<BattleFill, { readonly kind: "rolledDice" }>;
  readonly saveSucceeded: boolean;
}): number {
  const rolledDamage =
    rolledDiceTotal(input.damageFill.value) +
    (input.effect.damage.expr.flat ?? 0);
  return damageAmountAfterTargetAdjustments(
    input.state,
    input.target,
    moonbeamDamageAfterSave({
      rolledDamage,
      savingThrowSucceeded: input.saveSucceeded,
    }),
    input.effect.damage.damageType,
  );
}

function applyMoonbeamDamage(input: {
  readonly state: BattleState;
  readonly target: BattleCreatureState;
  readonly effect: MoonbeamEffect;
  readonly damageFill: Extract<BattleFill, { readonly kind: "rolledDice" }>;
  readonly saveSucceeded: boolean;
  readonly concentrationSavingThrow?:
    | Extract<BattleFill, { readonly kind: "concentrationSavingThrow" }>
    | undefined;
}): BattleState {
  return applyPreparedSlotSpellDamage(
    input.state,
    input.target.combatantId,
    moonbeamAdjustedDamage({
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

function applyMoonbeamShapeShiftRider(input: {
  readonly state: BattleState;
  readonly targetId: CombatantId;
  readonly effect: MoonbeamEffect;
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
  return addMoonbeamShapeShiftSuppression(
    reversion.state,
    input.targetId,
    input.effect,
  );
}

function resolveMoonbeamSaveCommand(
  input: BattleResolutionInput & {
    readonly subject: MoonbeamSaveSubject;
    readonly handledInterruptTrigger?: BattleInterruptTrigger;
  },
): BattleResolutionResult {
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fills.some(
      (fill) =>
        fill.kind !== "savingThrowOutcome" &&
        fill.kind !== "rolledDice" &&
        fill.kind !== "concentrationSavingThrow",
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone save accepts only save, damage, and Concentration fills.",
    );
  }
  /* v8 ignore stop */
  const effect = moonbeamEffectFor(input.state, input.subject);
  const target = input.state.combatants.get(input.subject.actorId);
  if (
    effect === undefined ||
    /* v8 ignore next -- Defensive internal guard: the spatial-procedure boundary rejects an absent movable-zone target before routing this subject here. */
    target === undefined
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Movable zone save is no longer available.",
    );
  }
  const isEndTurn = input.subject.trigger === "endsTurnInArea";
  const endTurnSubject = {
    tag: "runtimeCommand" as const,
    actorId: input.subject.actorId,
    command: "endTurn" as const,
  };
  if (effect.savedThisTurn.includes(input.subject.actorId)) {
    if (isEndTurn) {
      const endTurnResult = resolveEndTurnCommand({
        state: input.state,
        subject: endTurnSubject,
        fills: input.fills,
      });
      return endTurnResult.tag === "needsHoles"
        ? { ...endTurnResult, subject: input.subject }
        : endTurnResult;
    }
    return {
      tag: "resolved",
      state: input.state,
      snapshot: snapshotBattle(input.state),
    };
  }
  const saveHole = moonbeamSavingThrowOutcomeHole(
    input.state,
    input.subject.actorId,
    effect,
    input.subject.trigger,
  );
  const damageHole = moonbeamDamageRollHole(
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (saveFills.length > 1 || damageFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone save received duplicate fills.",
    );
  }
  /* v8 ignore stop */
  const concentrationHoleId = concentrationSavingThrowHole(target, 1)?.holeId;
  const endTurnFills = isEndTurn
    ? input.fills.filter(
        (fill) =>
          fill.holeId !== saveHole.holeId &&
          fill.holeId !== damageHole.holeId &&
          fill.holeId !== concentrationHoleId,
      )
    : [];
  const endTurnProbe = isEndTurn
    ? resolveEndTurnCommand({
        state: input.state,
        subject: endTurnSubject,
        fills: endTurnFills,
      })
    : null;
  const saveFill = savingThrowOutcomeFillForHole(saveFills, saveHole);
  if (saveFill === undefined) {
    return needsSpatialProcedureHoleWithEndTurnFrontier({
      state: input.state,
      subject: input.subject,
      hole: saveHole,
      endTurnProbe,
    });
  }
  const saveValidation = validateMoonbeamSavingThrowOutcome(
    saveFill.value,
    input.subject.actorId,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (saveValidation !== null) {
    return invalidResult(input.state, "invalidFill", saveValidation);
  }
  /* v8 ignore stop */
  const saveOutcome = saveFill.value.outcomes[0]!;
  const saveFailedReactionWindow =
    maybeOpenPersistentSpatialSaveFailedReplayInterrupt({
      state: input.state,
      outcome: saveOutcome,
      sourceProcedureRef: effect.sourceProcedureRef,
      replaySubject: input.subject,
      replayFills: input.fills,
      handledInterruptTrigger: input.handledInterruptTrigger,
    });
  if (saveFailedReactionWindow !== null) {
    return saveFailedReactionWindow;
  }
  const damageFill = rolledDiceFillForHole(damageFills, damageHole);
  if (damageFill === undefined) {
    return needsSpatialProcedureHoleWithEndTurnFrontier({
      state: input.state,
      subject: input.subject,
      hole: damageHole,
      endTurnProbe,
    });
  }
  const damageValidation = validateMoonbeamDamageRoll(damageFill, damageHole);
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (damageValidation !== null) {
    return invalidResult(input.state, "invalidFill", damageValidation);
  }
  /* v8 ignore stop */
  const adjustedDamage = moonbeamAdjustedDamage({
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (concentrationFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone save received duplicate concentration save fills.",
    );
  }
  /* v8 ignore stop */
  const concentrationFill =
    concentrationHole === null
      ? undefined
      : concentrationSavingThrowFillFor(concentrationFills, concentrationHole);
  if (concentrationHole !== null && concentrationFill === undefined) {
    return needsSpatialProcedureHoleWithEndTurnFrontier({
      state: input.state,
      subject: input.subject,
      hole: concentrationHole,
      endTurnProbe,
    });
  }
  const pendingEndTurn = pendingSpatialProcedureEndTurnResult(
    endTurnProbe,
    input.subject,
  );
  if (pendingEndTurn !== null) {
    return pendingEndTurn;
  }
  const afterDamage = applyMoonbeamDamage({
    state: input.state,
    target,
    effect,
    damageFill,
    saveSucceeded: saveOutcome.succeeded,
    concentrationSavingThrow: concentrationFill,
  });
  const afterShapeShiftRider = applyMoonbeamShapeShiftRider({
    state: afterDamage,
    targetId: input.subject.actorId,
    effect,
    saveSucceeded: saveOutcome.succeeded,
  });
  const afterMark = markMoonbeamSavedThisTurn(
    afterShapeShiftRider,
    input.subject.actorId,
    effect,
  );
  if (isEndTurn) {
    const endTurnResult = resolveEndTurnCommand({
      state: afterMark,
      subject: endTurnSubject,
      fills: endTurnFills,
    });
    return endTurnResult.tag === "needsHoles"
      ? { ...endTurnResult, subject: input.subject }
      : endTurnResult;
  }
  return {
    tag: "resolved",
    state: afterMark,
    snapshot: snapshotBattle(afterMark),
  };
}

function resolveMoonbeamCylinderExitCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "moonbeamCylinderExit";
      }
    >;
  },
): BattleResolutionResult {
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Moonbeam Cylinder exit cleanup uses no fills.",
    );
  }
  /* v8 ignore stop */
  const effect = moonbeamEffectFor(input.state, input.subject);
  if (
    effect === undefined ||
    !effect.shapeShiftSuppressed.includes(input.subject.actorId)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Moonbeam shape-shift suppression is no longer active.",
    );
  }
  const nextState = removeMoonbeamShapeShiftSuppression(
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

function resolveMoonbeamRepositionCommand(
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fills.some((fill) => fill.kind !== "movableZoneRepositionMovement")
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone reposition accepts only movement fills.",
    );
  }
  /* v8 ignore stop */
  const effect = moonbeamEffectFor(input.state, input.subject);
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
  const movementHole = moonbeamRepositionMovementHole(effect);
  const movementFills = input.fills.filter(
    (
      fill,
    ): fill is Extract<
      BattleFill,
      { readonly kind: "movableZoneRepositionMovement" }
    > => fill.kind === "movableZoneRepositionMovement",
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!everyFillUsesHoleId(movementFills, movementHole.holeId)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone reposition received a fill for an unrelated hole.",
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (movementFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone reposition received duplicate fills.",
    );
  }
  /* v8 ignore stop */
  const movementFill = movementFills[0];
  if (movementFill === undefined) {
    return needsHolesResult(input.state, input.subject, [movementHole]);
  }
  const movementValidation = validateMoonbeamRepositionMovement(
    movementFill,
    movementHole,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (movementValidation !== null) {
    return invalidResult(input.state, "invalidFill", movementValidation);
  }
  /* v8 ignore stop */
  const spendResult = spendAction(input.state.currentTurnResources, "magic");
  if (Either.isLeft(spendResult)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Movable zone reposition requires an available Magic action.",
    );
  }
  const nextState = {
    ...input.state,
    currentTurnResources: spendResult.right,
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function needsSpatialProcedureHoleWithEndTurnFrontier(input: {
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly hole: BattleHole;
  readonly endTurnProbe: BattleResolutionResult | null;
}): BattleResolutionResult {
  /* v8 ignore start -- Malformed combined-command input: a nested End Turn probe is invalid only when fills outside the admitted spatial procedure and End Turn hole contracts were supplied. */
  if (input.endTurnProbe?.tag === "invalid") {
    return input.endTurnProbe;
  }
  /* v8 ignore stop */
  return needsHolesResult(input.state, input.subject, [
    input.hole,
    ...(input.endTurnProbe?.tag === "needsHoles"
      ? input.endTurnProbe.holes
      : []),
  ]);
}

function pendingSpatialProcedureEndTurnResult(
  endTurnProbe: BattleResolutionResult | null,
  subject: BattleSubject,
): BattleResolutionResult | null {
  if (endTurnProbe?.tag === "needsHoles") {
    return { ...endTurnProbe, subject };
  }
  /* v8 ignore start -- Malformed combined-command input: a nested End Turn probe is invalid only when fills outside the admitted spatial procedure and End Turn hole contracts were supplied. */
  if (endTurnProbe?.tag === "invalid") {
    return endTurnProbe;
  }
  /* v8 ignore stop */
  return null;
}

function resolveGreaseGroundHazardEndTurnSaveCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "greaseGroundHazardSave";
      }
    >;
    readonly handledInterruptTrigger?: BattleInterruptTrigger;
  },
): BattleResolutionResult {
  const effect = greaseGroundHazardEffectFor(input.state, input.subject);
  if (effect === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Grease ground-hazard save is no longer available.",
    );
  }
  const hole = greaseGroundHazardSavingThrowOutcomeHole(
    input.state,
    input.subject.actorId,
    effect,
    input.subject.trigger,
  );
  const matchingGreaseFills = input.fills.filter(
    (fill) => fill.holeId === hole.holeId,
  );
  /* v8 ignore start -- Malformed fill set: the end-turn Grease save hole can be answered only once. */
  if (matchingGreaseFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "End Turn in Grease received duplicate Grease Saving Throw outcome fills.",
    );
  }
  /* v8 ignore stop */
  const [matchingGreaseFill] = matchingGreaseFills;
  /* v8 ignore start -- Malformed fill: the value answering the Grease save hole must be a Saving Throw outcome. */
  if (
    matchingGreaseFill !== undefined &&
    matchingGreaseFill.kind !== "savingThrowOutcome"
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "End Turn in Grease requires a Grease Saving Throw outcome fill.",
    );
  }
  /* v8 ignore stop */
  const endTurnSubject = {
    tag: "runtimeCommand" as const,
    actorId: input.subject.actorId,
    command: "endTurn" as const,
  };
  const endTurnFills = input.fills.filter(
    (fill) => fill.holeId !== hole.holeId,
  );
  const endTurnProbe = resolveEndTurnCommand({
    state: input.state,
    subject: endTurnSubject,
    fills: endTurnFills,
  });
  if (matchingGreaseFill === undefined) {
    return needsSpatialProcedureHoleWithEndTurnFrontier({
      state: input.state,
      subject: input.subject,
      hole,
      endTurnProbe,
    });
  }
  const validation = validateGreaseGroundHazardSavingThrowOutcome(
    matchingGreaseFill.value,
    input.subject.actorId,
  );
  /* v8 ignore start -- Malformed fill: the end-turn Grease save outcome must answer the discovered single-target hole for the ending actor. */
  if (validation !== null) {
    return invalidResult(input.state, "invalidFill", validation);
  }
  /* v8 ignore stop */
  const pendingEndTurn = pendingSpatialProcedureEndTurnResult(
    endTurnProbe,
    input.subject,
  );
  if (pendingEndTurn !== null) {
    return pendingEndTurn;
  }
  const outcome = matchingGreaseFill.value.outcomes[0]!;
  const saveFailedReactionWindow =
    maybeOpenPersistentSpatialSaveFailedReplayInterrupt({
      state: input.state,
      outcome,
      sourceProcedureRef: effect.sourceProcedureRef,
      replaySubject: input.subject,
      replayFills: input.fills,
      handledInterruptTrigger: input.handledInterruptTrigger,
    });
  if (saveFailedReactionWindow !== null) {
    return saveFailedReactionWindow;
  }
  const nextState = outcome.succeeded
    ? input.state
    : applyGreaseProneToTarget(input.state, input.subject.actorId);
  const endTurnResult = resolveEndTurnCommand({
    state: nextState,
    subject: endTurnSubject,
    fills: endTurnFills,
  });
  return endTurnResult.tag === "needsHoles"
    ? { ...endTurnResult, subject: input.subject }
    : endTurnResult;
}
