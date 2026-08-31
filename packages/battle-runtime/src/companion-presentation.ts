import { Result } from "effect";

import {
  battleRuntimeSessionWithRetainedCompanionTransition,
  type BattleRuntimeSession,
  type RetainedCompanionBattleSelection,
} from "./battle-runtime-context.ts";
import type {
  BattleResolutionResult,
  BattleStateInitIssue,
} from "./battle-state-execution.ts";
import {
  admitCompanionToBattleWithPresentation,
  castResolvedSpawnedCompanionWithPresentation,
  type CompanionBattleAdmissionInput,
  type SpawnedCompanionCastInput,
} from "./companion-lifecycle.ts";
import { resolveSpawnedCompanionForm } from "@dnd/surface/surface/find-familiar-forms";
import { snapshotBattle } from "./battle-reducer/battle-snapshot.ts";

type WithoutBattleState<Input> = Input extends unknown
  ? Omit<Input, "state">
  : never;

export function admitCompanionToBattleRuntime(
  input: WithoutBattleState<CompanionBattleAdmissionInput> & {
    readonly session: BattleRuntimeSession;
  },
): Result.Result<BattleRuntimeSession, BattleStateInitIssue> {
  const selection = retainedCompanionSelection(input.manifestation.storedForm);
  const admitted = admitCompanionToBattleWithPresentation({
    ...input,
    state: input.session.state,
  });
  /* v8 ignore start -- @preserve -- Admission issues are returned by the lifecycle parser itself; this wrapper only preserves that already-typed failure. */
  if (Result.isFailure(admitted)) return Result.fail(admitted.failure);
  /* v8 ignore stop -- @preserve */
  const presentation =
    admitted.success.tag === "embodiedOutsideBattle"
      ? {
          combatantId: admitted.success.companionId,
          source: admitted.success.presentation,
        }
      : undefined;
  const session = battleRuntimeSessionWithRetainedCompanionTransition(
    input.session,
    input.ownerId,
    admitted.success.state,
    selection,
    presentation,
  );
  if (session === undefined) {
    return Result.fail({
      tag: "battleStateInitIssue" as const,
      kind: "companionOwnerRuntimeContextMissing" as const,
      ownerId: input.ownerId,
      message:
        "Retained companion admission owner has no authored runtime context.",
    });
  }
  return Result.succeed(session);
}

function retainedCompanionSelection(
  storedForm: CompanionBattleAdmissionInput["manifestation"]["storedForm"],
): RetainedCompanionBattleSelection {
  return storedForm.formAccess === "spawnedCompanion"
    ? {
        formAccess: "spawnedCompanion",
        selectedForm: storedForm.formSelection,
      }
    : {
        formAccess: "pactOfTheChain",
        selectedForm: storedForm.formSelection,
      };
}

export type RetainedCompanionRuntimeCastResult =
  | {
      readonly tag: "resolved";
      readonly session: BattleRuntimeSession;
      readonly snapshot: Extract<
        BattleResolutionResult,
        { readonly tag: "resolved" }
      >["snapshot"];
    }
  | {
      readonly tag: "invalid";
      readonly session: BattleRuntimeSession;
      readonly reason: Extract<
        BattleResolutionResult,
        { readonly tag: "invalid" }
      >["reason"];
      readonly message: string;
      readonly snapshot: Extract<
        BattleResolutionResult,
        { readonly tag: "invalid" }
      >["snapshot"];
    };

export function castRetainedSpawnedCompanionRuntime(
  input: Omit<SpawnedCompanionCastInput, "state"> & {
    readonly session: BattleRuntimeSession;
  },
): RetainedCompanionRuntimeCastResult {
  const ownerContext = input.session.context.characters.get(input.casterId);
  if (ownerContext?.retainedCompanionSelection === undefined) {
    return {
      tag: "invalid",
      session: input.session,
      reason: "invalidFill",
      message:
        "Retained companion recast requires a battle-owned authored form selection.",
      snapshot: snapshotBattle(input.session.state),
    };
  }
  const resolvedForm = resolveSpawnedCompanionForm({
    catalog: input.catalog,
    eligibility: input.eligibility,
    selection: input.selection,
    creatureTypeOverrideChoiceId: input.creatureTypeOverrideChoiceId,
  });
  if (resolvedForm.tag === "issue") {
    return {
      tag: "invalid",
      session: input.session,
      reason: "invalidFill",
      message: resolvedForm.message,
      snapshot: snapshotBattle(input.session.state),
    };
  }
  const cast = castResolvedSpawnedCompanionWithPresentation({
    state: input.session.state,
    casterId: input.casterId,
    familiarId: input.familiarId,
    resolvedForm: resolvedForm.form,
    initiative: input.initiative,
    placement: input.placement,
    ammunitionStocks: input.ammunitionStocks,
    retainedTransition: "sessionOwned",
  });
  /* v8 ignore start -- @preserve -- Cast lifecycle failures are exercised at the lifecycle boundary; this wrapper only preserves their typed reason, message, and snapshot. */
  if (!("presentation" in cast)) {
    const result = cast.result;
    return {
      tag: "invalid",
      session: input.session,
      reason: result.reason,
      message: result.message,
      snapshot: result.snapshot,
    };
  }
  /* v8 ignore stop -- @preserve */
  const result = cast.result;
  const session = battleRuntimeSessionWithRetainedCompanionTransition(
    input.session,
    input.casterId,
    result.state,
    {
      formAccess: "spawnedCompanion",
      selectedForm: input.selection,
    },
    cast.presentation,
  );
  /* v8 ignore start -- @preserve -- The retained-selection guard at function entry proves that the caster owns authored context in this session. */
  if (session === undefined) {
    return {
      tag: "invalid",
      session: input.session,
      reason: "invalidFill",
      message:
        "Retained companion recast owner has no authored runtime context.",
      snapshot: snapshotBattle(input.session.state),
    };
  }
  /* v8 ignore stop -- @preserve */
  return { tag: "resolved", session, snapshot: result.snapshot };
}
