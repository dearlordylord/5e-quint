import { optionalProperty } from "../optional-property.ts";
import {
  battleSubjectForReplay,
  type BattleSubject,
} from "../battle-subjects.ts";
import type {
  BattleOrdinaryHole,
  BattleOrdinaryNeedsHolesResult,
  BattleResolutionCheckpointBoundary,
  BattleState,
  BattleResolutionResult,
} from "../battle-state-execution.ts";
import type { BattlePendingProcedure } from "../battle-pending-procedure.ts";
import { snapshotBattle } from "./battle-snapshot.ts";
import { invalidResult } from "./result-helpers.ts";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";

const SUBJECT_RESOLUTION_PENDING_PROCEDURE = {
  kind: "subjectResolution",
} as const satisfies BattlePendingProcedure;

export function needsHolesResult(
  state: BattleState,
  subject: BattleSubject,
  holes: ReadonlyNonEmptyArray<BattleOrdinaryHole>,
  checkpointBoundary?: BattleResolutionCheckpointBoundary,
): BattleOrdinaryNeedsHolesResult {
  return needsHolesResultWithProcedure(
    state,
    subject,
    holes,
    SUBJECT_RESOLUTION_PENDING_PROCEDURE,
    checkpointBoundary,
  );
}

export function needsHolesResultWithProcedure(
  state: BattleState,
  subject: BattleSubject,
  holes: ReadonlyNonEmptyArray<BattleOrdinaryHole>,
  pendingProcedure: BattlePendingProcedure,
  checkpointBoundary?: BattleResolutionCheckpointBoundary,
): BattleOrdinaryNeedsHolesResult {
  return {
    tag: "needsHoles",
    state,
    frontier: {
      kind: "holes",
      replaySubject: battleSubjectForReplay(subject),
      holes,
      pendingProcedure,
    },
    snapshot: snapshotBattle(state),
    ...optionalProperty("checkpointBoundary", checkpointBoundary),
  };
}

type SpellSelection =
  | { readonly tag: "ok" }
  | { readonly tag: "needsHoles"; readonly hole: BattleOrdinaryHole }
  | { readonly tag: "invalid"; readonly message: string };

export function spellSelectionResolution<S extends SpellSelection>(
  state: BattleState,
  subject: BattleSubject,
  selection: S,
):
  | {
      readonly tag: "ok";
      readonly selection: Extract<S, { readonly tag: "ok" }>;
    }
  | { readonly tag: "resolution"; readonly result: BattleResolutionResult } {
  if (selection.tag === "needsHoles") {
    return {
      tag: "resolution",
      result: needsHolesResult(state, subject, [selection.hole]),
    };
  }
  if (selection.tag === "invalid") {
    return {
      tag: "resolution",
      result: invalidResult(state, "invalidFill", selection.message),
    };
  }
  return {
    tag: "ok",
    selection: selection as Extract<S, { readonly tag: "ok" }>,
  };
}
