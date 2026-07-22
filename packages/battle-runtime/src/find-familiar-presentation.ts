import * as Either from "effect/Either";
import * as Option from "effect/Option";

import {
  battleRuntimeSessionWithRetainedCompanionTransition,
  type BattleRuntimeSession,
  type RetainedCompanionBattleSelection,
} from "./battle-runtime-context.ts";
import type { BattleStateInitIssue } from "./battle-state-execution.ts";
import type { BattleResolutionResult } from "./battle-state-execution.ts";
import type { BattleStatBlockPresentationSource } from "./battle-runtime-context.ts";
import type { CombatantId } from "./identity.ts";
import type { BattleStatBlockExecutionSource } from "./stat-block-execution-state.ts";
import {
  admitCompanionToBattle,
  castResolvedFindFamiliar,
  type CompanionBattleAdmissionInput,
  type FindFamiliarCastInput,
} from "./find-familiar-lifecycle.ts";
import { resolveFindFamiliarForm } from "@dnd/surface/surface/find-familiar-forms";
import { snapshotBattle } from "./battle-reducer/battle-snapshot.ts";
import {
  statBlockLanguagePresentation,
  statBlockProcedurePresentations,
} from "./stat-block-presentation.ts";

type WithoutBattleState<Input> = Input extends unknown
  ? Omit<Input, "state">
  : never;

export function admitCompanionToBattleRuntime(
  input: WithoutBattleState<CompanionBattleAdmissionInput> & {
    readonly session: BattleRuntimeSession;
  },
): Either.Either<BattleRuntimeSession, BattleStateInitIssue> {
  const selection = retainedCompanionSelection(input.manifestation.storedForm);
  const admitted = admitCompanionToBattle({
    ...input,
    state: input.session.state,
  });
  if (Either.isLeft(admitted)) return Either.left(admitted.left);
  const presentation =
    "companionId" in input &&
    input.manifestation.tag === "embodiedOutsideBattle"
      ? companionPresentationFromCatalog({
          state: admitted.right,
          combatantId: input.companionId,
          statBlockId: input.manifestation.storedForm.resolvedStatBlockId,
          catalog: input.catalog,
        })
      : Either.right(undefined);
  if (Either.isLeft(presentation)) return Either.left(presentation.left);
  const session = battleRuntimeSessionWithRetainedCompanionTransition(
    input.session,
    input.ownerId,
    admitted.right,
    selection,
    presentation.right,
  );
  return session === undefined
    ? Either.left({
        tag: "battleStateInitIssue" as const,
        message:
          "Retained companion admission owner has no authored runtime context.",
      })
    : Either.right(session);
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

export function castRetainedFindFamiliarRuntime(
  input: Omit<FindFamiliarCastInput, "state"> & {
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
        "Retained Find Familiar recast requires a battle-owned authored form selection.",
      snapshot: snapshotBattle(input.session.state),
    };
  }
  const resolvedForm = resolveFindFamiliarForm({
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
  const result = castResolvedFindFamiliar({
    state: input.session.state,
    casterId: input.casterId,
    familiarId: input.familiarId,
    resolvedForm: resolvedForm.form,
    initiative: input.initiative,
    placement: input.placement,
    retainedTransition: "sessionOwned",
  });
  if (result.tag === "invalid") {
    return {
      tag: "invalid",
      session: input.session,
      reason: result.reason,
      message: result.message,
      snapshot: result.snapshot,
    };
  }
  if (result.tag === "needsHoles") {
    return {
      tag: "invalid",
      session: input.session,
      reason: "invalidFill",
      message:
        "Resolved Find Familiar execution unexpectedly requested additional fills.",
      snapshot: result.snapshot,
    };
  }
  const presentation = companionPresentationFromSource({
    state: result.state,
    combatantId: input.familiarId,
    statBlock: resolvedForm.form.statBlock,
  });
  if (Either.isLeft(presentation)) {
    return {
      tag: "invalid",
      session: input.session,
      reason: "invalidFill",
      message: presentation.left.message,
      snapshot: snapshotBattle(input.session.state),
    };
  }
  const session = battleRuntimeSessionWithRetainedCompanionTransition(
    input.session,
    input.casterId,
    result.state,
    {
      formAccess: "findFamiliar",
      selectedForm: input.selection,
    },
    presentation.right,
  );
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
  return { tag: "resolved", session, snapshot: result.snapshot };
}

function companionPresentationFromCatalog(input: {
  readonly state: import("./battle-state-execution.ts").BattleState;
  readonly combatantId: CombatantId;
  readonly statBlockId: import("@dnd/shared/game-facts").StatBlockId;
  readonly catalog: import("./battle-state-execution.ts").BattleStatBlockExecutionCatalog;
}): Either.Either<
  | {
      readonly combatantId: CombatantId;
      readonly source: BattleStatBlockPresentationSource;
    }
  | undefined,
  BattleStateInitIssue
> {
  const statBlock = input.catalog.getStatBlock(input.statBlockId);
  if (Option.isNone(statBlock)) {
    return Either.left({
      tag: "battleStateInitIssue",
      message:
        "Committed companion presentation Stat Block is missing from the catalog.",
    });
  }
  return companionPresentationFromSource({
    state: input.state,
    combatantId: input.combatantId,
    statBlock: statBlock.value,
  });
}

function companionPresentationFromSource(input: {
  readonly state: import("./battle-state-execution.ts").BattleState;
  readonly combatantId: CombatantId;
  readonly statBlock: BattleStatBlockExecutionSource;
}): Either.Either<
  {
    readonly combatantId: CombatantId;
    readonly source: BattleStatBlockPresentationSource;
  },
  BattleStateInitIssue
> {
  const combatant = input.state.combatants.get(input.combatantId);
  if (combatant?.origin.kind !== "statBlock") {
    return Either.left({
      tag: "battleStateInitIssue",
      message:
        "Committed companion presentation requires its Stat Block combatant.",
    });
  }
  return Either.right({
    combatantId: input.combatantId,
    source: {
      displayName: input.statBlock.statBlock.displayName,
      languages: statBlockLanguagePresentation(input.statBlock),
      procedures: statBlockProcedurePresentations({
        statBlock: input.statBlock,
        execution: combatant.origin.execution,
      }),
    },
  });
}
