import { Match } from "effect";
import type { BattleReducerRouteEvents } from "./battle-reducer/reducer-route.ts";
import { battleReducerRouteForResolution } from "./battle-reducer/reducer-route.ts";
import {
  endTurn,
  openCreatureFallsInterruptWindow,
  resolveAdmittedBattleSubject,
  resolveBattleInterrupt,
  snapshotBattle,
} from "./battle-reducer/dispatcher.ts";
import { admitBattleResolutionInput } from "./battle-reducer/resolution-admission.ts";
import {
  battleRuntimeSessionWithState,
  type BattleRuntimeSession,
} from "./battle-runtime-context.ts";
import type { CombatantId } from "./identity.ts";
import type {
  BattleFill,
  BattleResolutionInput,
  BattleResolutionResult,
  BattleSnapshot,
  BattleTargetSpatialFact,
} from "./battle-state-execution.ts";

export type BattleRuntimeResolutionInput = {
  readonly session: BattleRuntimeSession;
  readonly subject: BattleResolutionInput["subject"];
  readonly fills: BattleResolutionInput["fills"];
  readonly statBlockCatalog?: BattleResolutionInput["statBlockCatalog"];
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
  const result = resolveBattleSubject({
    state: input.session.state,
    subject: input.subject,
    fills: input.fills,
    ...(input.statBlockCatalog === undefined
      ? {}
      : { statBlockCatalog: input.statBlockCatalog }),
  });
  return battleRuntimeResolutionFromMechanical(input.session, result);
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
