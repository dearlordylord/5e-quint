import { Result } from "effect";
import * as Option from "effect/Option";

import {
  battleRuntimeSessionWithRetainedCompanionTransition,
  type BattleRuntimeSession,
  type RetainedCompanionBattleSelection,
} from "./battle-runtime-context.ts";
import type {
  BattleResolutionResult,
  BattleStateInitIssue,
} from "./battle-state-execution.ts";
import type { BattleStatBlockPresentationSource } from "./battle-runtime-context.ts";
import type { CombatantId } from "./identity.ts";
import type { StatBlockCatalog } from "@dnd/surface/surface/stat-block-catalog";
import type {
  SpawnedCompanionCreatureTypeOverride,
  SpawnedCompanionResolvedForm,
} from "@dnd/surface/surface/find-familiar-forms";
import {
  admitCompanionToBattle,
  castResolvedSpawnedCompanion,
  type CompanionBattleAdmissionInput,
  type SpawnedCompanionCastInput,
} from "./companion-lifecycle.ts";
import { resolveSpawnedCompanionForm } from "@dnd/surface/surface/find-familiar-forms";
import { snapshotBattle } from "./battle-reducer/battle-snapshot.ts";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";
import {
  battleStatBlockProjectionFailureMessage,
  projectAuthoredStatBlockWithCreatureType,
} from "./stat-block-authored-projection.ts";

type WithoutBattleState<Input> = Input extends unknown
  ? Omit<Input, "state">
  : never;

export function admitCompanionToBattleRuntime(
  input: WithoutBattleState<CompanionBattleAdmissionInput> & {
    readonly session: BattleRuntimeSession;
  },
): Result.Result<BattleRuntimeSession, BattleStateInitIssue> {
  const selection = retainedCompanionSelection(input.manifestation.storedForm);
  const admitted = admitCompanionToBattle({
    ...input,
    state: input.session.state,
  });
  /* v8 ignore start -- @preserve -- Admission issues are returned by the lifecycle parser itself; this wrapper only preserves that already-typed failure. */
  if (Result.isFailure(admitted)) return Result.fail(admitted.failure);
  /* v8 ignore stop -- @preserve */
  const presentation =
    "companionId" in input &&
    input.manifestation.tag === "embodiedOutsideBattle"
      ? companionPresentationFromCatalog({
          state: admitted.success,
          combatantId: input.companionId,
          statBlockId: input.manifestation.storedForm.resolvedStatBlockId,
          catalog: input.catalog,
          creatureTypeOverride: input.manifestation.creatureTypeOverride,
        })
      : Result.succeed(undefined);
  /* v8 ignore next -- @preserve -- Successful embodied admission proves the same catalog entry and Stat Block combatant consumed by presentation projection. */
  if (Result.isFailure(presentation)) return Result.fail(presentation.failure);
  const session = battleRuntimeSessionWithRetainedCompanionTransition(
    input.session,
    input.ownerId,
    admitted.success,
    selection,
    presentation.success,
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
  const result = castResolvedSpawnedCompanion({
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
  if (result.tag === "invalid") {
    return {
      tag: "invalid",
      session: input.session,
      reason: result.reason,
      message: result.message,
      snapshot: result.snapshot,
    };
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Resolved Find Familiar has no player-choice frontier: form, type override, initiative, and placement were all parsed before lifecycle execution. */
  if (result.tag === "needsHoles") {
    return {
      tag: "invalid",
      session: input.session,
      reason: "invalidFill",
      message:
        "Resolved companion lifecycle execution unexpectedly requested additional fills.",
      snapshot: result.snapshot,
    };
  }
  /* v8 ignore stop -- @preserve */
  const presentation = companionPresentationFromSource({
    state: result.state,
    combatantId: input.familiarId,
    resolvedForm: resolvedForm.form,
  });
  /* v8 ignore start -- @preserve -- A resolved familiar cast just admitted this combatant from the same resolved Stat Block source, so presentation cannot observe a missing/non-Stat-Block combatant. */
  if (Result.isFailure(presentation)) {
    return {
      tag: "invalid",
      session: input.session,
      reason: "invalidFill",
      message: battleStateInitIssueMessage(presentation.failure),
      snapshot: snapshotBattle(input.session.state),
    };
  }
  /* v8 ignore stop -- @preserve */
  const session = battleRuntimeSessionWithRetainedCompanionTransition(
    input.session,
    input.casterId,
    result.state,
    {
      formAccess: "spawnedCompanion",
      selectedForm: input.selection,
    },
    presentation.success,
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

function companionPresentationFromCatalog(input: {
  readonly state: import("./battle-state-execution.ts").BattleState;
  readonly combatantId: CombatantId;
  readonly statBlockId: import("@dnd/shared/game-facts").StatBlockId;
  readonly catalog: StatBlockCatalog;
  readonly creatureTypeOverride: SpawnedCompanionCreatureTypeOverride;
}): Result.Result<
  | {
      readonly combatantId: CombatantId;
      readonly source: BattleStatBlockPresentationSource;
    }
  | undefined,
  BattleStateInitIssue
> {
  const statBlock = input.catalog.getStatBlock(input.statBlockId);
  /* v8 ignore start -- @preserve -- Companion admission resolved this exact stored Stat Block id through the same immutable catalog immediately before requesting presentation. */
  if (Option.isNone(statBlock)) {
    return Result.fail({
      tag: "battleStateInitIssue",
      kind: "companionPresentationStatBlockMissing",
      companionCombatantId: input.combatantId,
      statBlockId: input.statBlockId,
      message:
        "Committed companion presentation Stat Block is missing from the catalog.",
    });
  }
  /* v8 ignore stop -- @preserve */
  return companionPresentationFromSource({
    state: input.state,
    combatantId: input.combatantId,
    resolvedForm: {
      statBlock: statBlock.value,
      creatureTypeOverride: input.creatureTypeOverride,
    },
  });
}

function companionPresentationFromSource(input: {
  readonly state: import("./battle-state-execution.ts").BattleState;
  readonly combatantId: CombatantId;
  readonly resolvedForm: SpawnedCompanionResolvedForm;
}): Result.Result<
  {
    readonly combatantId: CombatantId;
    readonly source: BattleStatBlockPresentationSource;
  },
  BattleStateInitIssue
> {
  const projection = projectAuthoredStatBlockWithCreatureType(
    input.resolvedForm.statBlock,
    input.resolvedForm.creatureTypeOverride,
  );
  if (Result.isFailure(projection)) {
    return Result.fail({
      tag: "battleStateInitIssue",
      message: battleStatBlockProjectionFailureMessage(
        projection.failure,
        "Companion presentation Stat Block projection failed",
      ),
    });
  }
  const combatant = input.state.combatants.get(input.combatantId);
  /* v8 ignore start -- @preserve -- Both admission and recast call this projection only after successfully admitting the familiar as a Stat Block combatant. */
  if (combatant?.origin.kind !== "statBlock") {
    return Result.fail({
      tag: "battleStateInitIssue",
      kind: "companionPresentationCombatantMissing",
      companionCombatantId: input.combatantId,
      statBlockId: input.resolvedForm.statBlock.id,
      message:
        "Committed companion presentation requires its Stat Block combatant.",
    });
  }
  /* v8 ignore stop -- @preserve */
  return Result.succeed({
    combatantId: input.combatantId,
    source: projection.success.presentation,
  });
}
