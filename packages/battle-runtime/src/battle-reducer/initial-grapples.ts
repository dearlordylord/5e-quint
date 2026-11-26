// KERNEL-COVERAGE: runtime-owner BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND
// SRD 5.2.1 Grappling: an already established hold follows the shared
// condition and ending rules. This admission supports hand-held 5-foot
// grapples only; it does not reconstruct arbitrary initiation or anatomy.

import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import { Match } from "effect";
import type {
  BattleGrappleEndingCause,
  BattleGrappleLink,
  BattleInitialHandGrapple,
  BattleInitialHandGrappleRejection,
  BattleState,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import { grappleEndingCause } from "./creature-state-leaves.ts";
import { grappleHoldForTarget } from "./movement-speed.ts";

/** One initial grapple the battle can't start with, and why. */
export type InitialGrappleRejectionFact = {
  readonly grappleIndex: number;
  readonly grapplerId: CombatantId;
  readonly targetId: CombatantId;
  readonly rejection: BattleInitialHandGrappleRejection;
  readonly message: string;
};

/**
 * Admit table-declared hand-held 5-foot grapples in order, using each first
 * free hand and the actual supplied escape DC. Reject a hold that cannot be
 * maintained or would already have ended; do not repeat initiation checks.
 */
export function admitInitialHandGrapples(
  state: BattleState,
  initialHandGrapples:
    | ReadonlyNonEmptyArray<BattleInitialHandGrapple>
    | undefined,
): {
  readonly grapples: readonly BattleGrappleLink[];
  readonly rejections: readonly InitialGrappleRejectionFact[];
} {
  const grapples: BattleGrappleLink[] = [...state.grapples];
  const rejections: InitialGrappleRejectionFact[] = [];
  for (const [grappleIndex, initial] of (initialHandGrapples ?? []).entries()) {
    const admitted = initialGrappleLink({ ...state, grapples }, initial);
    if (admitted.tag === "ok") {
      grapples.push(admitted.link);
      continue;
    }
    rejections.push({
      grappleIndex,
      grapplerId: initial.grapplerId,
      targetId: initial.targetId,
      rejection: admitted.rejection,
      message: admitted.message,
    });
  }
  return { grapples, rejections };
}

function initialGrappleLink(
  state: BattleState,
  initial: BattleInitialHandGrapple,
):
  | { readonly tag: "ok"; readonly link: BattleGrappleLink }
  | {
      readonly tag: "rejected";
      readonly rejection: BattleInitialHandGrappleRejection;
      readonly message: string;
    } {
  const hold = grappleHoldForTarget(
    state,
    initial.grapplerId,
    initial.targetId,
  );
  if (hold.tag === "rejected") return hold;
  // The same ending causes normalizeBattleGrapples applies.
  const endingCause = grappleEndingCause(hold.grappler, hold.target);
  if (endingCause !== null) {
    return {
      tag: "rejected",
      rejection: endingCause,
      message: initialGrappleEndingMessage(endingCause),
    };
  }
  return { tag: "ok", link: { ...hold.link, escapeDc: initial.escapeDc } };
}

function initialGrappleEndingMessage(cause: BattleGrappleEndingCause): string {
  return Match.value(cause).pipe(
    Match.when(
      "grapplerIncapacitated",
      () =>
        "Initial grapple ends at once: the grappler has the Incapacitated condition.",
    ),
    Match.when(
      "combatantDead",
      () =>
        "Initial grapple ends at once: a dead creature can't grapple or be grappled.",
    ),
    Match.exhaustive,
  );
}
