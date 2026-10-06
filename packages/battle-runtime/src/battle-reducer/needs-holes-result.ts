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
} from "../battle-state-execution.ts";
import type { BattlePendingProcedure } from "../battle-pending-procedure.ts";
import { snapshotBattle } from "./battle-snapshot.ts";
import { invalidResult } from "./result-helpers.ts";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";

const SUBJECT_RESOLUTION_PENDING_PROCEDURE = {
  kind: "subjectResolution",
} as const satisfies BattlePendingProcedure;

export function needsHolesResult<
  const Holes extends ReadonlyNonEmptyArray<BattleOrdinaryHole>,
  const Subject extends BattleSubject,
>(
  state: BattleState,
  subject: Subject,
  holes: Holes,
  checkpointBoundary?: BattleResolutionCheckpointBoundary,
): BattleOrdinaryNeedsHolesResult<Holes, Subject> {
  return needsHolesResultWithProcedure(
    state,
    subject,
    holes,
    SUBJECT_RESOLUTION_PENDING_PROCEDURE,
    checkpointBoundary,
  );
}

export function needsHolesResultWithProcedure<
  const Holes extends ReadonlyNonEmptyArray<BattleOrdinaryHole>,
  const Subject extends BattleSubject,
>(
  state: BattleState,
  subject: Subject,
  holes: Holes,
  pendingProcedure: BattlePendingProcedure,
  checkpointBoundary?: BattleResolutionCheckpointBoundary,
): BattleOrdinaryNeedsHolesResult<Holes, Subject> {
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

type SpellSelection<Hole extends BattleOrdinaryHole> =
  | { readonly tag: "ok" }
  | { readonly tag: "needsHoles"; readonly hole: Hole }
  | { readonly tag: "invalid"; readonly message: string };

export function spellSelectionResolution<
  const Hole extends BattleOrdinaryHole,
  S extends SpellSelection<Hole>,
  const Subject extends BattleSubject,
>(
  state: BattleState,
  subject: Subject,
  selection: S & SpellSelection<Hole>,
):
  | {
      readonly tag: "ok";
      readonly selection: Extract<S, { readonly tag: "ok" }>;
    }
  | {
      readonly tag: "resolution";
      readonly result:
        | ReturnType<typeof invalidResult>
        | BattleOrdinaryNeedsHolesResult<readonly [Hole], Subject>;
    } {
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
    // Both other tags were handled above; TypeScript does not narrow the generic S itself.
    selection: selection as Extract<S, { readonly tag: "ok" }>,
  };
}
