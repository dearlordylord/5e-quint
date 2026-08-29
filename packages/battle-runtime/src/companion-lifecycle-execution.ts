import {
  nonEmptyArrayProperty,
  optionalProperty,
} from "./optional-property.ts";
import { spendAction } from "@dnd/shared-algebras/action-economy-algebra";
import { Hp } from "@dnd/shared/types";
import { Match, Result } from "effect";
import type {
  BattleDroppedObjectOutcome,
  BattleAmmunitionStock,
  BattleResolutionResult,
  BattleState,
} from "./battle-state-execution.ts";
import type { BattleStatBlockExecutionSource } from "./stat-block-execution-state.ts";
import type { AdmittedFindFamiliarReappearance } from "./companion-admission-state.ts";
import { currentActorId } from "./battle-reducer/creature-state-leaves.ts";
import { snapshotBattle } from "./battle-reducer/battle-snapshot.ts";
import { removeBattleCombatants } from "./battle-reducer/combatant-removal.ts";
import { addBattleStatBlockCombatant } from "./battle-reducer/stat-block-combatant-execution.ts";
import type { CombatantId, InitiativeScore } from "./identity.ts";
import { findPresentFamiliarById } from "./spawned-companion-state.ts";
import {
  findCompanionEntryByOwner,
  findFamiliarDisappearedAtZeroHitPointsState,
  setCompanion,
  type BattleCompanionCurrentHitPoints,
  type BattleCompanionDismissedForeverState,
  type BattleCompanionHitPoints,
  type BattleCompanionIdentity,
  type BattleCompanionPlacement,
  type BattleCompanionPresentState,
  type BattleCompanionProtocol,
  type BattleCompanionFormAccess,
  type BattleCompanionState,
  type BattleCompanionStoredForm,
  type BattleCompanionTemporarilyDismissedState,
} from "./companion-state.ts";
import type { FindFamiliarCreatureTypeOverride } from "@dnd/shared/game-facts";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";
import { retainedStoredFormForPresentCompanion } from "./companion-stored-form.ts";
import { spawnedCompanionLifecycleRouteEvents } from "./battle-reducer/companion-routes.ts";
import type { BattleReducerRouteEvents } from "./battle-reducer/reducer-route-protocol.ts";

type FindFamiliarCombatantRemoval =
  | { readonly tag: "resolved"; readonly state: BattleState }
  | Extract<BattleResolutionResult, { readonly tag: "invalid" }>;

export type FindFamiliarOwnerInput = {
  readonly state: BattleState;
  readonly casterId: CombatantId;
};

export type FindFamiliarLifecycleInputBase = FindFamiliarOwnerInput & {
  readonly heldObjectIds?: readonly BattleDroppedObjectOutcome["objectId"][];
};

export type AdmittedFindFamiliarReappearanceInput = {
  readonly admission: AdmittedFindFamiliarReappearance;
  readonly initiative: InitiativeScore;
  readonly placement: Extract<
    BattleCompanionPlacement,
    { readonly kind: "unoccupiedSpaceWithin30Feet" }
  >;
};

export function findFamiliarPresentState(input: {
  readonly form: BattleCompanionFormAccess;
  readonly combatantId: CombatantId;
  readonly identity: BattleCompanionIdentity;
  readonly protocol: BattleCompanionProtocol;
  readonly creatureTypeOverride: FindFamiliarCreatureTypeOverride;
  readonly placement: BattleCompanionPlacement;
  readonly ownerId: CombatantId;
}): BattleCompanionPresentState {
  return {
    ...input.form,
    status: "present",
    combatantId: input.combatantId,
    ownerId: input.ownerId,
    identity: input.identity,
    protocol: input.protocol,
    creatureTypeOverride: input.creatureTypeOverride,
    placement: input.placement,
  };
}

export function findFamiliarTemporarilyDismissedState(input: {
  readonly storedForm: BattleCompanionStoredForm;
  readonly identity: BattleCompanionIdentity;
  readonly protocol: BattleCompanionProtocol;
  readonly creatureTypeOverride: FindFamiliarCreatureTypeOverride;
  readonly hitPoints: BattleCompanionHitPoints;
  readonly ammunitionStocks: readonly BattleAmmunitionStock[];
  readonly reactionAvailable: boolean;
  readonly reappearanceCombatantId: CombatantId;
  readonly ownerId: CombatantId;
}): BattleCompanionTemporarilyDismissedState {
  return {
    ...input.storedForm,
    status: "temporarilyDismissed",
    ownerId: input.ownerId,
    identity: input.identity,
    protocol: input.protocol,
    creatureTypeOverride: input.creatureTypeOverride,
    reappearanceCombatantId: input.reappearanceCombatantId,
    hitPoints: input.hitPoints,
    ammunitionStocks: input.ammunitionStocks,
    reactionAvailable: input.reactionAvailable,
  };
}

export function presentFindFamiliarHitPoints(
  state: BattleState,
  familiarId: CombatantId | undefined,
): BattleCompanionHitPoints | string {
  if (familiarId === undefined) {
    return "Present Find Familiar combatant identity is missing.";
  }
  const combatant = state.combatants.get(familiarId);
  if (combatant === undefined) {
    return "Present companion combatant is missing.";
  }
  const currentHp = findFamiliarCurrentHitPoints(combatant.hp);
  /* v8 ignore start -- @preserve -- Present-companion lifecycle invariant: a familiar at zero HP is transitioned and removed atomically before present-state HP is retained. */
  if (typeof currentHp === "string") {
    return currentHp;
  }
  /* v8 ignore stop -- @preserve */
  return {
    currentHp,
    tempHp: combatant.tempHp,
  };
}

export function findFamiliarCurrentHitPoints(
  currentHp: Hp,
): BattleCompanionCurrentHitPoints | string {
  if (currentHp < Hp(1)) {
    return "Present Find Familiar current HP must be above 0.";
  }
  // Cast evidence: Hp already proves non-negative integer HP, and the guard
  // above proves the positive part of BattleCompanionCurrentHitPoints.
  return currentHp as BattleCompanionCurrentHitPoints;
}

export function temporarilyDismissFindFamiliar(
  input: FindFamiliarLifecycleInputBase,
): BattleResolutionResult {
  const familiarEntry = findCompanionEntryByOwner(
    input.state.companions,
    input.casterId,
  );
  if (familiarEntry === undefined) {
    return invalidFindFamiliarResult(
      input.state,
      "invalidFill",
      "Find Familiar caster has no familiar to dismiss.",
    );
  }
  const familiar = familiarEntry.companion;
  if (familiar.status !== "present") {
    return invalidFindFamiliarResult(
      input.state,
      "invalidFill",
      "Find Familiar can be temporarily dismissed only while present.",
    );
  }
  const familiarId = familiar.combatantId;
  const spent = spendFindFamiliarMagicAction(
    input.state,
    input.casterId,
    "Find Familiar temporary dismissal",
  );
  if (spent.tag === "invalid") {
    return spent;
  }
  const dismissalFacts = temporarilyDismissFindFamiliarFacts(
    input,
    familiar,
    familiarId,
  );
  if (typeof dismissalFacts === "string") {
    return invalidFindFamiliarResult(
      input.state,
      "invalidFill",
      dismissalFacts,
    );
  }
  const nextFamiliar = findFamiliarTemporarilyDismissedState({
    storedForm: dismissalFacts.retainedForm,
    identity: familiar.identity,
    protocol: familiar.protocol,
    creatureTypeOverride: familiar.creatureTypeOverride,
    hitPoints: dismissalFacts.hitPoints,
    ammunitionStocks: dismissalFacts.ammunitionStocks,
    reactionAvailable: dismissalFacts.reactionAvailable,
    reappearanceCombatantId: familiarId,
    ownerId: input.casterId,
  });
  const nextState = withoutPresentFindFamiliarCombatant(
    withFindFamiliar(spent.state, nextFamiliar),
    familiarId,
  );
  /* v8 ignore start -- @preserve -- Atomic dismissal invariant: the present companion was resolved from this roster immediately before its combatant is removed. */
  if (nextState.tag === "invalid") {
    return nextState;
  }
  /* v8 ignore stop -- @preserve */
  return resolvedFindFamiliarResult(
    nextState.state,
    droppedObjectsForFamiliarDisappearance({
      casterId: input.casterId,
      familiarId,
      ...optionalProperty("heldObjectIds", input.heldObjectIds),
    }),
    spawnedCompanionLifecycleRouteEvents(),
  );
}

type TemporarilyDismissFindFamiliarFacts = {
  readonly hitPoints: BattleCompanionHitPoints;
  readonly ammunitionStocks: readonly BattleAmmunitionStock[];
  readonly reactionAvailable: boolean;
  readonly retainedForm: BattleCompanionStoredForm;
};

function temporarilyDismissFindFamiliarFacts(
  input: FindFamiliarLifecycleInputBase,
  familiar: Extract<BattleCompanionState, { readonly status: "present" }>,
  familiarId: CombatantId,
): TemporarilyDismissFindFamiliarFacts | string {
  const hitPoints = presentFindFamiliarHitPoints(input.state, familiarId);
  /* v8 ignore start -- @preserve -- Present-companion lifecycle invariant: zero-HP damage processing transitions and removes the familiar atomically before a dismissal can observe it as present. */
  if (typeof hitPoints === "string") return hitPoints;
  /* v8 ignore stop -- @preserve */
  const combatant = input.state.combatants.get(familiarId);
  /* v8 ignore start -- @preserve -- Present-companion lifecycle invariant: the same live combatant that supplied retained Hit Points owns its Reaction availability. */
  if (combatant === undefined) {
    return "Present companion combatant is missing.";
  }
  /* v8 ignore stop -- @preserve */
  const retainedForm = retainedStoredFormForPresentCompanion({
    state: input.state,
    companionId: familiarId,
    companion: familiar,
  });
  /* v8 ignore start -- @preserve -- Present-companion invariant: dismissal receives the form and live Stat Block combatant admitted together; a retained-form mismatch requires externally corrupted companion state. */
  if (typeof retainedForm === "string") return retainedForm;
  /* v8 ignore stop -- @preserve */
  return {
    hitPoints,
    ammunitionStocks: combatant.ammunitionStocks,
    reactionAvailable: combatant.reactionAvailable,
    retainedForm,
  };
}

export function permanentlyDismissFindFamiliar(
  input: FindFamiliarOwnerInput,
): BattleResolutionResult {
  const familiarEntry = findCompanionEntryByOwner(
    input.state.companions,
    input.casterId,
  );
  if (familiarEntry === undefined) {
    return invalidFindFamiliarResult(
      input.state,
      "invalidFill",
      "Find Familiar caster has no familiar to dismiss forever.",
    );
  }
  const familiar = familiarEntry.companion;
  const spent = spendFindFamiliarMagicAction(
    input.state,
    input.casterId,
    "Find Familiar permanent dismissal",
  );
  if (spent.tag === "invalid") {
    return spent;
  }
  // Leave a dismissedForever tombstone (retaining owner + identity + protocol
  // state) instead of deleting the entry, so settlement can clear the owner's
  // durable Character Sheet slot rather than mistaking permanent dismissal for
  // "never admitted". Mirrors permanentlyDismissFindFamiliarLifecycle in
  // battle-runtime-find-familiar.qnt.
  const tombstone: BattleCompanionDismissedForeverState = {
    status: "dismissedForever",
    ownerId: familiar.ownerId,
    identity: familiar.identity,
    protocol: familiar.protocol,
    creatureTypeOverride: familiar.creatureTypeOverride,
  };
  const companions = setCompanion(spent.state.companions, tombstone);
  if (familiar.status !== "present") {
    return resolvedFindFamiliarResult({ ...spent.state, companions }, []);
  }
  const nextState = withoutPresentFindFamiliarCombatant(
    { ...spent.state, companions },
    familiar.combatantId,
  );
  /* v8 ignore start -- @preserve -- Atomic permanent-dismissal invariant: a present companion's combatant is removed from the same roster entry that supplied its identity. */
  if (nextState.tag === "invalid") {
    return nextState;
  }
  /* v8 ignore stop -- @preserve */
  return resolvedFindFamiliarResult(nextState.state, []);
}

export function reappearAdmittedTemporarilyDismissedFindFamiliar(
  input: AdmittedFindFamiliarReappearanceInput,
): BattleResolutionResult {
  const state = input.admission.state;
  const casterId = input.admission.subject.actorId;
  const familiarEntry = findCompanionEntryByOwner(state.companions, casterId);
  /* v8 ignore start -- @preserve -- Reappearance admission proves this owner has the temporarily dismissed companion represented by the admitted form. */
  if (
    familiarEntry === undefined ||
    familiarEntry.companion.status !== "temporarilyDismissed"
  ) {
    return invalidFindFamiliarResult(
      state,
      "invalidFill",
      "Find Familiar can reappear only from temporary dismissal.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const familiar = familiarEntry.companion;
  /* v8 ignore start -- @preserve -- The admission object is constructed from this retained companion; a differing reappearance id requires corrupting the branded admission. */
  if (
    input.admission.combatantAdmission.combatantId !==
    familiar.reappearanceCombatantId
  ) {
    return invalidFindFamiliarResult(
      state,
      "invalidFill",
      "Find Familiar reappearance admission does not match the retained familiar.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const identityIssue = findFamiliarIdentityIssue(
    state,
    casterId,
    familiar.reappearanceCombatantId,
  );
  /* v8 ignore start -- @preserve -- Reappearance admission collision-checks the retained combatant id against the current roster immediately before commit. */
  if (identityIssue !== null) {
    return invalidFindFamiliarResult(state, "invalidFill", identityIssue);
  }
  /* v8 ignore stop -- @preserve */
  const nextFamiliar = findFamiliarPresentState({
    form: familiar,
    combatantId: familiar.reappearanceCombatantId,
    identity: familiar.identity,
    protocol: familiar.protocol,
    creatureTypeOverride: familiar.creatureTypeOverride,
    placement: input.placement,
    ownerId: casterId,
  });
  const spent = spendFindFamiliarMagicAction(
    state,
    casterId,
    "Find Familiar reappearance",
  );
  if (spent.tag === "invalid") {
    return spent;
  }
  const nextState = withFindFamiliarCombatant({
    state: spent.state,
    casterId,
    familiarId: familiar.reappearanceCombatantId,
    familiar: nextFamiliar,
    initiative: input.initiative,
    combatantAdmission: input.admission.combatantAdmission,
    currentHp: familiar.hitPoints.currentHp,
    tempHp: familiar.hitPoints.tempHp,
    ammunitionStocks: familiar.ammunitionStocks,
    reactionAvailable: familiar.reactionAvailable,
  });
  /* v8 ignore start -- @preserve -- Admitted reappearance commit: owner, identity, form, HP, and roster insertion were proven together before this helper returns. */
  if (nextState.tag === "invalid") {
    return nextState;
  }
  /* v8 ignore stop -- @preserve */
  return resolvedFindFamiliarResult(
    nextState.state,
    [],
    spawnedCompanionLifecycleRouteEvents(),
  );
}

export function applyFindFamiliarZeroHitPointDisappearance(input: {
  readonly state: BattleState;
  readonly familiarId: CombatantId;
  readonly heldObjectIds?: readonly BattleDroppedObjectOutcome["objectId"][];
}): BattleResolutionResult {
  const entry = findPresentFamiliarById(input.state, input.familiarId);
  if (entry === null) {
    return invalidFindFamiliarResult(
      input.state,
      "invalidFill",
      "Familiar identity is not a present Find Familiar familiar.",
    );
  }
  const retainedForm = retainedStoredFormForPresentCompanion({
    state: input.state,
    companionId: input.familiarId,
    companion: entry.familiar,
  });
  /* v8 ignore start -- @preserve -- Zero-HP disappearance starts from a present companion and the live Stat Block combatant admitted with its stored form. */
  if (typeof retainedForm === "string") {
    return invalidFindFamiliarResult(input.state, "invalidFill", retainedForm);
  }
  /* v8 ignore stop -- @preserve */
  const reactionAvailable = input.state.combatants.get(
    input.familiarId,
  )?.reactionAvailable;
  /* v8 ignore start -- @preserve -- Zero-HP disappearance starts from the present familiar combatant that owns the retained Reaction resource. */
  if (reactionAvailable === undefined) {
    return invalidFindFamiliarResult(
      input.state,
      "missingCombatant",
      "Present companion combatant is missing.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const nextFamiliar = findFamiliarDisappearedAtZeroHitPointsState({
    storedForm: retainedForm,
    identity: entry.familiar.identity,
    protocol: entry.familiar.protocol,
    creatureTypeOverride: entry.familiar.creatureTypeOverride,
    ownerId: entry.ownerId,
    reactionAvailable,
  });
  const nextState = withoutPresentFindFamiliarCombatant(
    withFindFamiliar(input.state, nextFamiliar),
    input.familiarId,
  );
  /* v8 ignore start -- @preserve -- Atomic zero-HP lifecycle invariant: the present companion lookup and combatant removal operate on the same roster state. */
  if (nextState.tag === "invalid") {
    return nextState;
  }
  /* v8 ignore stop -- @preserve */
  return resolvedFindFamiliarResult(
    nextState.state,
    droppedObjectsForFamiliarDisappearance({
      casterId: entry.ownerId,
      familiarId: input.familiarId,
      ...optionalProperty("heldObjectIds", input.heldObjectIds),
    }),
  );
}

export function withFindFamiliarCombatant(input: {
  readonly state: BattleState;
  readonly casterId: CombatantId;
  readonly familiarId: CombatantId;
  readonly familiar: BattleCompanionPresentState;
  readonly initiative: InitiativeScore;
  readonly combatantAdmission: import("./stat-block-combatant-execution-state.ts").AdmittedBattleStatBlockCombatant;
  readonly currentHp?: Hp;
  readonly tempHp?: Hp;
  readonly ammunitionStocks: readonly import("./battle-state-execution.ts").BattleAmmunitionStock[];
  readonly reactionAvailable: boolean;
}):
  | { readonly tag: "resolved"; readonly state: BattleState }
  | Extract<BattleResolutionResult, { readonly tag: "invalid" }> {
  /* v8 ignore start -- @preserve -- Internal commit invariant: cast and reappearance workflows establish the caster in the battle before constructing an admitted familiar. */
  if (!input.state.combatants.has(input.casterId)) {
    return invalidFindFamiliarResult(
      input.state,
      "missingCombatant",
      "Find Familiar caster is not in this battle.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const priorWithoutFamiliar = withoutPresentFindFamiliarCombatant(
    input.state,
    input.familiarId,
  );
  /* v8 ignore start -- @preserve -- Internal commit invariant: callers collision-check familiar identity, so removing the prior manifestation cannot fail its roster checks. */
  if (priorWithoutFamiliar.tag === "invalid") {
    return priorWithoutFamiliar;
  }
  /* v8 ignore stop -- @preserve */
  const maxHp = input.combatantAdmission.initialization.maxHp;
  /* v8 ignore start -- @preserve -- Admitted Stat Block invariant: combatant admission parses maximum HP as a positive integer before this commit helper receives it. */
  if (maxHp < Hp(1)) {
    return invalidFindFamiliarResult(
      input.state,
      "invalidFill",
      "Present Find Familiar requires maximum HP above 0.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Retained-companion invariant: reappearance HP is captured only from a previously admitted, living familiar manifestation. */
  if (input.currentHp !== undefined && input.currentHp < Hp(1)) {
    return invalidFindFamiliarResult(
      input.state,
      "invalidFill",
      "Present Find Familiar admission requires current HP above 0.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Retained-companion invariant: stored current HP originates from the same admitted form and therefore cannot exceed its maximum HP. */
  if (input.currentHp !== undefined && input.currentHp > maxHp) {
    return invalidFindFamiliarResult(
      input.state,
      "invalidFill",
      "Present Find Familiar admission current HP must not exceed maximum HP.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const added = addBattleStatBlockCombatant({
    state: priorWithoutFamiliar.state,
    combatant: {
      combatantId: input.familiarId,
      initiative: input.initiative,
      admission: input.combatantAdmission,
      currentHp: input.currentHp ?? Hp(maxHp),
      tempHp: input.tempHp ?? Hp(0),
      ammunitionStocks: input.ammunitionStocks,
      reactionAvailable: input.reactionAvailable,
    },
  });
  /* v8 ignore start -- @preserve -- Internal commit invariant: the familiar identity was collision-checked and its Stat Block combatant admission succeeded immediately before insertion. */
  if (Result.isFailure(added)) {
    return invalidFindFamiliarResult(
      input.state,
      "invalidFill",
      battleStateInitIssueMessage(added.failure),
    );
  }
  /* v8 ignore stop -- @preserve */
  return {
    tag: "resolved",
    state: withFindFamiliar(added.success, input.familiar),
  };
}

function withoutPresentFindFamiliarCombatant(
  state: BattleState,
  familiarId: CombatantId,
): FindFamiliarCombatantRemoval {
  if (!state.combatants.has(familiarId)) {
    return { tag: "resolved", state };
  }
  // Preserve the companion entry the caller already transitioned (dismissed or
  // removed): removing the familiar combatant must not disturb the owner-keyed
  // companions map.
  const companions = state.companions;
  const removed = removeBattleCombatants({
    state,
    combatantIds: [familiarId],
  });
  /* v8 ignore start -- @preserve -- Internal removal invariant: callers pass an id already proven to be the present companion in this roster, so lifecycle-alignment removal cannot fail. */
  if (Result.isFailure(removed)) {
    return invalidFindFamiliarResult(
      state,
      "invalidFill",
      battleStateInitIssueMessage(removed.failure),
    );
  }
  /* v8 ignore stop -- @preserve */
  return { tag: "resolved", state: { ...removed.success, companions } };
}

export function familiarStatBlockWithCreatureTypeOverride(input: {
  readonly statBlock: BattleStatBlockExecutionSource;
  readonly creatureTypeOverride: FindFamiliarCreatureTypeOverride;
}): BattleStatBlockExecutionSource {
  return {
    ...input.statBlock,
    statBlock: {
      ...input.statBlock.statBlock,
      creatureType: input.creatureTypeOverride,
    },
  };
}

export function familiarMaxHp(
  statBlock: BattleStatBlockExecutionSource,
): Hp | string {
  const hp = statBlock.statBlock.hp;
  if (hp.kind !== "literal") {
    return "Find Familiar form Stat Block must use literal HP.";
  }
  return Hp(hp.value);
}

function withFindFamiliar(
  state: BattleState,
  familiar: BattleCompanionState,
): BattleState {
  return {
    ...state,
    companions: setCompanion(state.companions, familiar),
  };
}

export function findFamiliarIdentityIssue(
  state: BattleState,
  casterId: CombatantId,
  familiarId: CombatantId,
): string | null {
  const issue = findFamiliarIdentityIssueFacts(state, casterId, familiarId);
  return issue === null ? null : findFamiliarIdentityIssueMessage(issue);
}

export type FindFamiliarIdentityIssue =
  | {
      readonly tag: "casterCollision";
      readonly casterId: CombatantId;
      readonly familiarId: CombatantId;
    }
  | {
      readonly tag: "ownedByAnotherCaster";
      readonly familiarId: CombatantId;
      readonly existingOwnerId: CombatantId;
    }
  | {
      readonly tag: "ordinaryCombatantCollision";
      readonly familiarId: CombatantId;
    };

export function findFamiliarIdentityIssueFacts(
  state: BattleState,
  casterId: CombatantId,
  familiarId: CombatantId,
): FindFamiliarIdentityIssue | null {
  if (familiarId === casterId) {
    return { tag: "casterCollision", casterId, familiarId };
  }
  const existing = findPresentFamiliarById(state, familiarId);
  if (existing !== null && existing.ownerId !== casterId) {
    return {
      tag: "ownedByAnotherCaster",
      familiarId,
      existingOwnerId: existing.ownerId,
    };
  }
  if (state.combatants.has(familiarId) && existing === null) {
    return { tag: "ordinaryCombatantCollision", familiarId };
  }
  return null;
}

export function findFamiliarIdentityIssueMessage(
  issue: FindFamiliarIdentityIssue,
): string {
  return Match.value(issue).pipe(
    Match.when(
      { tag: "casterCollision" },
      () => "Find Familiar familiar identity must be distinct from its caster.",
    ),
    Match.when(
      { tag: "ownedByAnotherCaster" },
      () =>
        "Find Familiar familiar identity is already owned by another caster.",
    ),
    Match.when(
      { tag: "ordinaryCombatantCollision" },
      () =>
        "Find Familiar familiar identity must not identify an ordinary combatant.",
    ),
    Match.exhaustive,
  );
}

export function spendFindFamiliarMagicAction(
  state: BattleState,
  casterId: CombatantId,
  actionLabel: string,
):
  | { readonly tag: "resolved"; readonly state: BattleState }
  | Extract<BattleResolutionResult, { readonly tag: "invalid" }> {
  if (currentActorId(state) !== casterId) {
    return invalidFindFamiliarResult(
      state,
      "staleSubject",
      `${actionLabel} is available only on the caster's turn.`,
    );
  }
  const spent = spendAction(state.currentTurnResources, "magic");
  return Result.isFailure(spent)
    ? invalidFindFamiliarResult(
        state,
        "staleSubject",
        `${actionLabel} requires an available Magic action.`,
      )
    : {
        tag: "resolved",
        state: {
          ...state,
          currentTurnResources: spent.success,
        },
      };
}

function droppedObjectsForFamiliarDisappearance(input: {
  readonly casterId: CombatantId;
  readonly familiarId: CombatantId;
  readonly heldObjectIds?: readonly BattleDroppedObjectOutcome["objectId"][];
}): readonly BattleDroppedObjectOutcome[] {
  const objectIds = input.heldObjectIds ?? [];
  return objectIds.map((objectId) => ({
    kind: "objectDropped",
    actorId: input.familiarId,
    objectId,
    source: {
      kind: "companionDisappearance",
      ownerId: input.casterId,
      companionId: input.familiarId,
    },
  }));
}

export function resolvedFindFamiliarResult(
  state: BattleState,
  droppedObjects: readonly BattleDroppedObjectOutcome[],
  routeEvents?: BattleReducerRouteEvents,
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  return {
    tag: "resolved",
    state,
    snapshot: snapshotBattle(state),
    ...nonEmptyArrayProperty("droppedObjects", droppedObjects),
    ...optionalProperty("routeEvents", routeEvents),
  };
}

export function invalidFindFamiliarResult(
  state: BattleState,
  reason: Extract<
    BattleResolutionResult,
    { readonly tag: "invalid" }
  >["reason"],
  message: string,
): Extract<BattleResolutionResult, { readonly tag: "invalid" }> {
  return {
    tag: "invalid",
    reason,
    message,
    snapshot: snapshotBattle(state),
  };
}
