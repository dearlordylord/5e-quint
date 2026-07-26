import {
  battleSubjectForReplay,
  type BattleSubject,
} from "../battle-subjects.ts";
import type {
  BattleHole,
  BattleResolutionResult,
  BattleState,
} from "../battle-state-execution.ts";
import { snapshotBattle } from "./battle-snapshot.ts";
import { invalidResult } from "./result-helpers.ts";

export function needsHolesResult(
  state: BattleState,
  subject: BattleSubject,
  holes: readonly BattleHole[],
): Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> {
  return {
    tag: "needsHoles",
    state,
    subject: battleSubjectForReplay(subject),
    holes,
    snapshot: snapshotBattle(state),
  };
}

type SpellSelection =
  | { readonly tag: "ok" }
  | { readonly tag: "needsHoles"; readonly hole: BattleHole }
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
