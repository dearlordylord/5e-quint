import { Match } from "effect";
import * as Either from "effect/Either";
import type { BattleReducerRouteEvents } from "./battle-reducer/reducer-route.ts";
import { battleReducerRouteForResolution } from "./battle-reducer/reducer-route.ts";
import {
  endTurn,
  openCreatureFallsInterruptWindow,
  resolveAdmittedBattleSubject,
  resolveAdmittedFindFamiliarReappearanceSubject,
  resolveBattleInterrupt,
  snapshotBattle,
} from "./battle-execution-composition.ts";
import { admitBattleResolutionInput } from "./battle-reducer/resolution-admission.ts";
import {
  battleRuntimeSessionWithStatBlockPresentation,
  battleRuntimeSessionWithState,
  type BattleStatBlockPresentationSource,
  type BattleRuntimeSession,
} from "./battle-runtime-context.ts";
import type { CombatantId } from "./identity.ts";
import type { BattleSubject } from "./battle-subjects.ts";
import type {
  BattleFill,
  BattleResolutionInput,
  BattleResolutionResult,
  BattleSnapshot,
  BattleTargetSpatialFact,
} from "./battle-state-execution.ts";
import type { BattleStatBlockExecutionCatalog } from "./battle-state-execution.ts";
import { admitFindFamiliarReappearance } from "./find-familiar-admission.ts";

export type BattleRuntimeResolutionInput = {
  readonly session: BattleRuntimeSession;
  readonly subject: BattleSubject;
  readonly fills: BattleResolutionInput["fills"];
  readonly statBlockCatalog?: BattleStatBlockExecutionCatalog;
};

type ResolvedBattleResult = Extract<
  BattleResolutionResult,
  { readonly tag: "resolved" }
>;
type NeedsHolesBattleResult = Extract<
  BattleResolutionResult,
  { readonly tag: "needsHoles" }
>;

export type BattleRuntimeResolutionResult =
  | {
      readonly tag: "resolved";
      readonly session: BattleRuntimeSession;
      readonly snapshot: ResolvedBattleResult["snapshot"];
      readonly routeEvents?: BattleReducerRouteEvents;
      readonly objectDamages?: ResolvedBattleResult["objectDamages"];
      readonly objectIgnitions?: ResolvedBattleResult["objectIgnitions"];
      readonly droppedObjects?: ResolvedBattleResult["droppedObjects"];
      readonly shovePushes?: ResolvedBattleResult["shovePushes"];
      readonly teleports?: ResolvedBattleResult["teleports"];
    }
  | {
      readonly tag: "needsHoles";
      readonly session: BattleRuntimeSession;
      readonly subject: NeedsHolesBattleResult["subject"];
      readonly holes: NeedsHolesBattleResult["holes"];
      readonly snapshot: NeedsHolesBattleResult["snapshot"];
      readonly routeEvents?: BattleReducerRouteEvents;
    }
  | {
      readonly tag: "invalid";
      readonly session: BattleRuntimeSession;
      readonly reason: Extract<
        BattleResolutionResult,
        { readonly tag: "invalid" }
      >["reason"];
      readonly message: string;
      readonly snapshot: BattleSnapshot;
      readonly routeEvents?: BattleReducerRouteEvents;
    };

const byBattleResolutionTag = Match.discriminator("tag");

export function resolveBattleRuntimeSubject(
  input: BattleRuntimeResolutionInput,
): BattleRuntimeResolutionResult {
  if (
    input.subject.tag === "companionLifecycle" &&
    input.subject.action === "reappear"
  ) {
    if (input.statBlockCatalog === undefined) {
      return {
        tag: "invalid",
        session: input.session,
        reason: "invalidFill",
        message: "Familiar reappearance requires a Stat Block catalog.",
        snapshot: snapshotBattle(input.session.state),
      };
    }
    const admission = admitFindFamiliarReappearance({
      state: input.session.state,
      casterId: input.subject.actorId,
      catalog: input.statBlockCatalog,
    });
    if (Either.isLeft(admission)) {
      return {
        tag: "invalid",
        session: input.session,
        reason: "invalidFill",
        message: admission.left.message,
        snapshot: snapshotBattle(input.session.state),
      };
    }
    const result = resolveAdmittedFindFamiliarReappearanceSubject({
      state: input.session.state,
      subject: { ...input.subject, action: "reappear" },
      fills: input.fills,
      admission: admission.right.mechanics,
    });
    return battleRuntimeResolutionWithFamiliarPresentation(
      input.session,
      result,
      admission.right.mechanics.combatantAdmission.combatantId,
      admission.right.presentation,
    );
  }
  return battleRuntimeResolutionFromMechanical(
    input.session,
    resolveBattleSubject({
      state: input.session.state,
      subject: input.subject,
      fills: input.fills,
    }),
  );
}

function battleRuntimeResolutionWithFamiliarPresentation(
  session: BattleRuntimeSession,
  result: BattleResolutionResult,
  combatantId: CombatantId,
  presentation: BattleStatBlockPresentationSource,
): BattleRuntimeResolutionResult {
  if (result.tag !== "resolved") {
    return battleRuntimeResolutionFromMechanical(session, result);
  }
  const combatant = result.state.combatants.get(combatantId);
  if (combatant === undefined) {
    return {
      tag: "invalid",
      session,
      reason: "invalidFill",
      message:
        "Resolved familiar reappearance did not create its admitted combatant.",
      snapshot: snapshotBattle(session.state),
    };
  }
  const { state: _state, ...outcome } = result;
  return {
    ...outcome,
    snapshot: snapshotBattle(result.state),
    session: battleRuntimeSessionWithStatBlockPresentation(
      session,
      result.state,
      combatantId,
      presentation,
    ),
  };
}

function battleRuntimeResolutionFromMechanical(
  session: BattleRuntimeSession,
  result: BattleResolutionResult,
): BattleRuntimeResolutionResult {
  return Match.value(result).pipe(
    byBattleResolutionTag("resolved", ({ state, ...outcome }) => ({
      ...outcome,
      session: battleRuntimeSessionWithState(session, state),
    })),
    byBattleResolutionTag("needsHoles", ({ state, ...outcome }) => ({
      ...outcome,
      session: battleRuntimeSessionWithState(session, state),
    })),
    byBattleResolutionTag("invalid", (outcome) => ({
      ...outcome,
      session,
    })),
    Match.exhaustive,
  );
}

export function resolveBattleRuntimeInterrupt(input: {
  readonly session: BattleRuntimeSession;
  readonly fill: Extract<BattleFill, { readonly kind: "interruptDecision" }>;
}): BattleRuntimeResolutionResult {
  return battleRuntimeResolutionFromMechanical(
    input.session,
    resolveBattleInterrupt({ state: input.session.state, fill: input.fill }),
  );
}

export function endBattleRuntimeTurn(input: {
  readonly session: BattleRuntimeSession;
  readonly actorId: CombatantId;
  readonly fills?: readonly BattleFill[];
}): BattleRuntimeResolutionResult {
  return battleRuntimeResolutionFromMechanical(
    input.session,
    endTurn({
      state: input.session.state,
      actorId: input.actorId,
      ...(input.fills === undefined ? {} : { fills: input.fills }),
    }),
  );
}

export function openCreatureFallsRuntimeInterruptWindow(input: {
  readonly session: BattleRuntimeSession;
  readonly fallingCreatureId: CombatantId;
  readonly reactionSpellTargetFacts: readonly BattleTargetSpatialFact[];
}): BattleRuntimeResolutionResult {
  return battleRuntimeResolutionFromMechanical(
    input.session,
    openCreatureFallsInterruptWindow({
      state: input.session.state,
      fallingCreatureId: input.fallingCreatureId,
      reactionSpellTargetFacts: input.reactionSpellTargetFacts,
    }),
  );
}

export function resolveBattleSubject(
  input: BattleResolutionInput,
): BattleResolutionResult {
  const admission = admitBattleResolutionInput(input);
  if (admission.tag === "staleCharacterProcedure") {
    return {
      tag: "invalid",
      reason: "staleSubject",
      message:
        "The selected character procedure reference is not bound to this actor.",
      snapshot: snapshotBattle(input.state),
    };
  }
  const result = resolveAdmittedBattleSubject(admission.input);
  const routeEvents = battleReducerRouteForResolution(admission.input, result);
  return routeEvents === undefined ? result : { ...result, routeEvents };
}
