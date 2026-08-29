// UNIT-PROFILE-COVERAGE: runtime-owner spell.find-familiar-lifecycle
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.FIND_FAMILIAR_COMPANION_LIFECYCLE

import { optionalProperty } from "../optional-property.ts";
import type { BattleSubject } from "../battle-subjects.ts";
import type {
  AdmittedActionSpellBattleResolutionInput,
  AdmittedBattleResolutionInput,
  AdmittedBonusActionSpellBattleResolutionInput,
  BattleDroppedObjectOutcome,
  BattleFill,
  BattleResolutionInput,
  BattleResolutionInputForSubject,
  BattleResolutionResult,
  BattleState,
} from "../battle-state-execution.ts";
import type { AdmittedFindFamiliarReappearance } from "../find-familiar-admission-state.ts";
import {
  companionHeldObjectFactsHole,
  companionReappearanceInitiativeHole,
  companionReappearancePlacementHole,
  spawnedCompanionConnectionHole,
  findFamiliarTouchDeliveryTargetHoles,
} from "../find-familiar-companion-subjects.ts";
import {
  permanentlyDismissFindFamiliar,
  reappearAdmittedTemporarilyDismissedFindFamiliar,
  temporarilyDismissFindFamiliar,
} from "../find-familiar-lifecycle-execution.ts";
import { findFamiliarCompanionEntryForOwner } from "../find-familiar-state.ts";
import {
  prepareTouchSpellDeliveryThroughFindFamiliar,
  shareFindFamiliarSenses as applyFindFamiliarSharedSenses,
  spendFindFamiliarTouchDeliveryReaction,
  type FindFamiliarWithin100FeetFact,
} from "../find-familiar-telepathy.ts";
import type { CombatantId } from "../identity.ts";
import { snapshotBattle } from "./battle-snapshot.ts";
import { consumeOrCloseLegendaryActionWindow } from "./legendary-action-window.ts";
import { needsHolesResult } from "./needs-holes-result.ts";
import { admitBattleResolutionInput } from "./resolution-admission.ts";
import { invalidResult } from "./result-helpers.ts";

type ResolveAdmittedFindFamiliarSpell = (
  input:
    | AdmittedActionSpellBattleResolutionInput
    | AdmittedBonusActionSpellBattleResolutionInput,
) => BattleResolutionResult;

export class FindFamiliarProcedureExecution {
  private constructor(
    private readonly resolveAdmittedSpell: ResolveAdmittedFindFamiliarSpell,
  ) {}

  static fromResolver(
    resolver: ResolveAdmittedFindFamiliarSpell,
  ): FindFamiliarProcedureExecution {
    return new FindFamiliarProcedureExecution(resolver);
  }

  resolveSpell(
    input:
      | AdmittedActionSpellBattleResolutionInput
      | AdmittedBonusActionSpellBattleResolutionInput,
  ): BattleResolutionResult {
    return this.resolveAdmittedSpell(input);
  }
}

export function resolveCompanionLifecycleSubject(
  input: BattleResolutionInputForSubject<
    Extract<BattleSubject, { readonly tag: "companionLifecycle" }>
  >,
): BattleResolutionResult {
  const familiarEntry = findFamiliarCompanionEntryForOwner(
    input.state,
    input.subject.actorId,
  );
  if (familiarEntry === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Familiar lifecycle act requires the actor's retained familiar.",
    );
  }
  const familiar = familiarEntry.companion;
  if (input.subject.action === "temporarilyDismiss") {
    if (familiar.status !== "present") {
      return invalidResult(
        input.state,
        "staleSubject",
        "Familiar temporary dismissal requires the actor's present familiar.",
      );
    }
    const heldObjectIds = companionHeldObjectIdsForDismissal(
      input,
      familiar.combatantId,
    );
    if (heldObjectIds.tag === "invalid") {
      return heldObjectIds;
    }
    return temporarilyDismissFindFamiliar({
      state: input.state,
      casterId: input.subject.actorId,
      heldObjectIds: heldObjectIds.objectIds,
    });
  }
  if (input.subject.action === "reappear") {
    return invalidResult(
      input.state,
      "invalidFill",
      "Familiar reappearance is a session-owned admitted operation.",
    );
  }
  if (input.subject.action === "permanentlyDismiss") {
    return permanentlyDismissFindFamiliar({
      state: input.state,
      casterId: input.subject.actorId,
    });
  }
  /* v8 ignore next -- @preserve -- Exhaustive-match harness: every compile-time-known companion lifecycle action is handled above. */
  const exhaustive: never = input.subject.action;
  /* v8 ignore next -- @preserve -- Exhaustive-match harness: the never value cannot be returned for a compile-time-known lifecycle action. */
  return exhaustive;
}

export function resolveAdmittedFindFamiliarReappearanceSubject(input: {
  readonly fills: readonly BattleFill[];
  readonly admission: AdmittedFindFamiliarReappearance;
}): BattleResolutionResult {
  const { state, subject } = input.admission;
  const resolutionInput = { state, subject, fills: input.fills };
  const placement = companionReappearancePlacement(resolutionInput);
  if (placement.tag === "needsHoles" || placement.tag === "invalid") {
    return placement;
  }
  const initiative = companionReappearanceInitiative(resolutionInput);
  if (initiative.tag === "needsHoles") {
    return initiative;
  }
  const result = reappearAdmittedTemporarilyDismissedFindFamiliar({
    admission: input.admission,
    initiative: initiative.initiative,
    placement: placement.placement,
  });
  return consumeOrCloseLegendaryActionWindow(subject, result);
}

function companionReappearancePlacement(
  input: BattleResolutionInputForSubject<
    Extract<BattleSubject, { readonly tag: "companionLifecycle" }>
  >,
):
  | {
      readonly tag: "resolved";
      readonly placement: Extract<
        Extract<
          BattleFill,
          { readonly kind: "companionReappearancePlacement" }
        >["value"],
        { readonly kind: "unoccupiedSpaceWithin30Feet" }
      >;
    }
  | Extract<
      BattleResolutionResult,
      { readonly tag: "needsHoles" | "invalid" }
    > {
  const expectedHole = companionReappearancePlacementHole({
    ownerId: input.subject.actorId,
  });
  const fill = input.fills.find(
    (
      candidate,
    ): candidate is Extract<
      BattleFill,
      { readonly kind: "companionReappearancePlacement" }
    > =>
      candidate.kind === "companionReappearancePlacement" &&
      candidate.holeId === expectedHole.holeId,
  );
  if (fill === undefined) {
    return needsHolesResult(input.state, input.subject, [expectedHole]);
  }
  if (fill.value.kind !== "unoccupiedSpaceWithin30Feet") {
    return invalidResult(
      input.state,
      "invalidFill",
      "Familiar reappearance placement must be an unoccupied space within 30 feet.",
    );
  }
  return { tag: "resolved", placement: fill.value };
}

function companionReappearanceInitiative(
  input: BattleResolutionInputForSubject<
    Extract<BattleSubject, { readonly tag: "companionLifecycle" }>
  >,
):
  | {
      readonly tag: "resolved";
      readonly initiative: Extract<
        BattleFill,
        { readonly kind: "companionReappearanceInitiative" }
      >["value"];
    }
  | Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> {
  const expectedHole = companionReappearanceInitiativeHole({
    ownerId: input.subject.actorId,
  });
  const fill = input.fills.find(
    (
      candidate,
    ): candidate is Extract<
      BattleFill,
      { readonly kind: "companionReappearanceInitiative" }
    > =>
      candidate.kind === "companionReappearanceInitiative" &&
      candidate.holeId === expectedHole.holeId,
  );
  return fill === undefined
    ? needsHolesResult(input.state, input.subject, [expectedHole])
    : { tag: "resolved", initiative: fill.value };
}

export function resolveFindFamiliarSharedSensesSubject(
  input: BattleResolutionInputForSubject<
    Extract<BattleSubject, { readonly tag: "spawnedCompanionSharedSenses" }>
  >,
): BattleResolutionResult {
  const connection = spawnedCompanionConnectionFact({
    state: input.state,
    ownerId: input.subject.actorId,
    companionId: input.subject.familiarId,
    fills: input.fills,
    subject: input.subject,
  });
  return connection.tag !== "resolved"
    ? connection
    : shareFindFamiliarSenses({
        state: input.state,
        casterId: input.subject.actorId,
        fact: connection.fact,
      });
}

export function shareFindFamiliarSenses(input: {
  readonly state: BattleState;
  readonly casterId: CombatantId;
  readonly fact: FindFamiliarWithin100FeetFact;
}): BattleResolutionResult {
  const transition = applyFindFamiliarSharedSenses(input);
  return transition.tag === "invalid"
    ? invalidResult(input.state, transition.reason, transition.message)
    : {
        tag: "resolved",
        state: transition.state,
        snapshot: snapshotBattle(transition.state),
      };
}

export function resolveFindFamiliarTouchSpellSubject(
  input: BattleResolutionInputForSubject<
    Extract<BattleSubject, { readonly tag: "spawnedCompanionTouchSpellProxy" }>
  >,
  execution: FindFamiliarProcedureExecution,
  reactionCommitment: "uncommitted" | "committed",
): BattleResolutionResult {
  const connection = spawnedCompanionConnectionFact({
    state: input.state,
    ownerId: input.subject.actorId,
    companionId: input.subject.companionId,
    fills: input.fills,
    subject: input.subject,
  });
  if (connection.tag !== "resolved") {
    return connection;
  }
  const spellSubject = spawnedCompanionTouchSpellProxySubject(input.subject);
  const spellFills = input.fills.filter(
    (fill) =>
      !(
        fill.kind === "spawnedCompanionConnection" &&
        fill.holeId === connection.holeId
      ),
  );
  const delivered = deliverTouchSpellThroughFindFamiliar(
    {
      state: input.state,
      subject: spellSubject,
      fills: spellFills,
      fact: connection.fact,
      reactionContinuation: {
        subject: input.subject,
        fills: input.fills,
      },
    },
    execution,
    reactionCommitment,
  );
  return delivered.tag === "needsHoles"
    ? {
        ...delivered,
        subject: input.subject,
        holes: findFamiliarTouchDeliveryTargetHoles(delivered.holes),
      }
    : delivered;
}

export function deliverTouchSpellThroughFindFamiliar(
  input: {
    readonly state: BattleState;
    readonly subject: Extract<
      BattleSubject,
      { readonly tag: "actionSpell" | "bonusActionSpell" }
    >;
    readonly fills: BattleResolutionInput["fills"];
    readonly fact: FindFamiliarWithin100FeetFact;
    readonly reactionContinuation: {
      readonly subject: BattleSubject;
      readonly fills: readonly BattleFill[];
    };
  },
  execution: FindFamiliarProcedureExecution,
  reactionCommitment: "uncommitted" | "committed",
): BattleResolutionResult {
  const prepared = prepareTouchSpellDeliveryThroughFindFamiliar({
    ...input,
    reactionCommitment,
  });
  if (prepared.tag === "invalid") {
    return invalidResult(input.state, prepared.reason, prepared.message);
  }
  const reactionState =
    reactionCommitment === "committed" || prepared.targetChoiceCount === 0
      ? { tag: "resolved" as const, state: input.state }
      : spendFindFamiliarTouchDeliveryReaction({
          state: input.state,
          familiarId: prepared.familiarId,
        });
  if (reactionState.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", reactionState.message);
  }
  const candidate = {
    state: reactionState.state,
    subject: input.subject,
    fills: prepared.fills,
    reactionContinuation: input.reactionContinuation,
  };
  const admission = admitBattleResolutionInput(candidate);
  if (admission.tag === "staleCharacterProcedure") {
    return invalidResult(
      input.state,
      "staleSubject",
      "The familiar-delivered spell procedure is no longer bound to its caster.",
    );
  }
  /* v8 ignore start -- @preserve -- The touch-spell candidate subject union excludes Wild Shape, so admission can only produce the general variant. */
  if (admission.input.admissionKind !== "general") {
    return invalidResult(
      input.state,
      "staleSubject",
      "The familiar-delivered spell procedure is no longer bound to its caster.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const admittedSpell = admittedFindFamiliarSpell(
    admission.input,
    input.subject,
  );
  const cast = execution.resolveSpell(admittedSpell);
  if (cast.tag === "invalid") {
    return { ...cast, snapshot: snapshotBattle(input.state) };
  }
  if (cast.tag === "resolved" && prepared.targetChoiceCount === 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Find Familiar touch delivery currently supports exactly one selected target choice.",
    );
  }
  return cast;
}

function admittedFindFamiliarSpell(
  input: Extract<
    AdmittedBattleResolutionInput,
    { readonly admissionKind: "general" }
  >,
  subject: Extract<
    BattleSubject,
    { readonly tag: "actionSpell" | "bonusActionSpell" }
  >,
):
  | AdmittedActionSpellBattleResolutionInput
  | AdmittedBonusActionSpellBattleResolutionInput {
  return subject.tag === "actionSpell"
    ? { ...input, subject }
    : { ...input, subject };
}

function companionHeldObjectIdsForDismissal(
  input: BattleResolutionInputForSubject<
    Extract<BattleSubject, { readonly tag: "companionLifecycle" }>
  >,
  companionId: CombatantId,
):
  | {
      readonly tag: "resolved";
      readonly objectIds: readonly BattleDroppedObjectOutcome["objectId"][];
    }
  | Extract<BattleResolutionResult, { readonly tag: "invalid" }> {
  const expectedHole = companionHeldObjectFactsHole({
    companionId,
  });
  const fill = input.fills.find(
    (
      candidate,
    ): candidate is Extract<BattleFill, { readonly kind: "heldObjectFacts" }> =>
      candidate.kind === "heldObjectFacts" &&
      candidate.holeId === expectedHole.holeId,
  );
  if (fill === undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Familiar temporary dismissal requires held-object facts for the familiar.",
    );
  }
  return { tag: "resolved", objectIds: fill.value.objectIds };
}

function spawnedCompanionConnectionFact(input: {
  readonly state: BattleState;
  readonly ownerId: CombatantId;
  readonly companionId: CombatantId;
  readonly fills: readonly BattleFill[];
  readonly subject: BattleSubject;
}):
  | {
      readonly tag: "resolved";
      readonly fact: FindFamiliarWithin100FeetFact;
      readonly holeId: BattleFill["holeId"];
    }
  | Extract<
      BattleResolutionResult,
      { readonly tag: "needsHoles" | "invalid" }
    > {
  const expectedHole = spawnedCompanionConnectionHole({
    ownerId: input.ownerId,
    companionId: input.companionId,
  });
  const fill = input.fills.find(
    (candidate) =>
      candidate.kind === "spawnedCompanionConnection" &&
      candidate.holeId === expectedHole.holeId,
  );
  if (fill === undefined) {
    return needsHolesResult(input.state, input.subject, [expectedHole]);
  }
  return {
    tag: "resolved",
    holeId: expectedHole.holeId,
    fact: {
      kind: "findFamiliarWithin100FeetOfOwner",
      ownerId: input.ownerId,
      familiarId: input.companionId,
    },
  };
}

function spawnedCompanionTouchSpellProxySubject(
  subject: Extract<
    BattleSubject,
    { readonly tag: "spawnedCompanionTouchSpellProxy" }
  >,
): Extract<
  BattleSubject,
  { readonly tag: "actionSpell" | "bonusActionSpell" }
> {
  const base = {
    actorId: subject.actorId,
    procedureRef: subject.procedureRef,
    mode: subject.mode,
    ...optionalProperty("metamagic", subject.metamagic),
  };
  return subject.spellAction === "action"
    ? { tag: "actionSpell", ...base }
    : { tag: "bonusActionSpell", ...base };
}
