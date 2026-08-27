import * as Either from "effect/Either";

import {
  battleRuntimeSessionWithRetainedCompanionTransition,
  type BattleRuntimeSession,
  type RetainedCompanionBattleSelection,
} from "./battle-runtime-context.ts";
import type { BattleStateInitIssue } from "./battle-state-execution.ts";
import type { BattleResolutionResult } from "./battle-state-execution.ts";
import {
  admitCompanionToBattleWithPresentation,
  castResolvedFindFamiliarWithPresentation,
  type CompanionBattleAdmissionInput,
  type FindFamiliarCastInput,
} from "./find-familiar-lifecycle.ts";
import {
  resolveFindFamiliarForm,
  type FindFamiliarResolvedForm,
} from "@dnd/surface/surface/find-familiar-forms";
import { snapshotBattle } from "./battle-reducer/battle-snapshot.ts";

type WithoutBattleState<Input> = Input extends unknown
  ? Omit<Input, "state">
  : never;

export function admitCompanionToBattleRuntime(
  input: WithoutBattleState<CompanionBattleAdmissionInput> & {
    readonly session: BattleRuntimeSession;
  },
): Either.Either<BattleRuntimeSession, BattleStateInitIssue> {
  const selection = retainedCompanionSelection(input.manifestation.storedForm);
  const admitted = admitCompanionToBattleWithPresentation({
    ...input,
    state: input.session.state,
  });
  /* v8 ignore start -- @preserve -- Admission issues are returned by the lifecycle parser itself; this wrapper only preserves that already-typed failure. */
  if (Either.isLeft(admitted)) return Either.left(admitted.left);
  /* v8 ignore stop -- @preserve */
  const presentation =
    admitted.right.tag === "embodiedOutsideBattle"
      ? {
          combatantId: admitted.right.companionId,
          source: admitted.right.presentation,
        }
      : undefined;
  const session = battleRuntimeSessionWithRetainedCompanionTransition(
    input.session,
    input.ownerId,
    admitted.right.state,
    selection,
    presentation,
  );
  if (session === undefined) {
    return Either.left({
      tag: "battleStateInitIssue" as const,
      message:
        "Retained companion admission owner has no authored runtime context.",
    });
  }
  return Either.right(session);
}

function retainedCompanionSelection(
  storedForm: CompanionBattleAdmissionInput["manifestation"]["storedForm"],
): RetainedCompanionBattleSelection {
  return storedForm.formAccess === "findFamiliar"
    ? {
        formAccess: "findFamiliar",
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

type RetainedFindFamiliarRuntimeInput = Omit<FindFamiliarCastInput, "state"> & {
  readonly session: BattleRuntimeSession;
};

function resolveRetainedFindFamiliarCastForm(
  input: RetainedFindFamiliarRuntimeInput,
): Either.Either<FindFamiliarResolvedForm, string> {
  const ownerContext = input.session.context.characters.get(input.casterId);
  if (ownerContext?.retainedCompanionSelection === undefined) {
    return Either.left(
      "Retained Find Familiar recast requires a battle-owned authored form selection.",
    );
  }
  const resolvedForm = resolveFindFamiliarForm({
    catalog: input.catalog,
    eligibility: input.eligibility,
    selection: input.selection,
    creatureTypeOverrideChoiceId: input.creatureTypeOverrideChoiceId,
  });
  if (resolvedForm.tag === "issue") {
    return Either.left(resolvedForm.message);
  }
  return Either.right(resolvedForm.form);
}

export function castRetainedFindFamiliarRuntime(
  input: RetainedFindFamiliarRuntimeInput,
): RetainedCompanionRuntimeCastResult {
  const resolvedForm = resolveRetainedFindFamiliarCastForm(input);
  if (Either.isLeft(resolvedForm)) {
    return {
      tag: "invalid",
      session: input.session,
      reason: "invalidFill",
      message: resolvedForm.left,
      snapshot: snapshotBattle(input.session.state),
    };
  }
  const cast = castResolvedFindFamiliarWithPresentation({
    state: input.session.state,
    casterId: input.casterId,
    familiarId: input.familiarId,
    resolvedForm: resolvedForm.right,
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
      formAccess: "findFamiliar",
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
        "Retained Find Familiar recast owner has no authored runtime context.",
      snapshot: snapshotBattle(input.session.state),
    };
  }
  /* v8 ignore stop -- @preserve */
  return { tag: "resolved", session, snapshot: result.snapshot };
}
