// SRD 5.2.1 Grappling: "However a grapple is initiated, it follows these
// rules." A battle can start with a grapple already in place. It is the same
// grapple link an in-battle Grapple makes, so Speed, attack Disadvantage,
// Escape Grapple, release and the ways a grapple ends all follow from it.

import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import { Match } from "effect";
import type {
  BattleGrappleEndingCause,
  BattleGrappleLink,
  BattleInitialGrapple,
  BattleInitialGrappleRejection,
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
  readonly rejection: BattleInitialGrappleRejection;
  readonly message: string;
};

/**
 * The grapple links a battle starts with, from the table's initial grapples in
 * order. Each one follows the rules every grapple follows, however it began,
 * with the grappler's first free hand left after the grapples before it, and
 * keeps the escape DC the table gives. A grapple that couldn't hold, or that would
 * already have ended, is rejected rather than dropped.
 */
export function admitInitialGrapples(
  state: BattleState,
  initialGrapples: ReadonlyNonEmptyArray<BattleInitialGrapple> | undefined,
): {
  readonly grapples: readonly BattleGrappleLink[];
  readonly rejections: readonly InitialGrappleRejectionFact[];
} {
  const grapples: BattleGrappleLink[] = [...state.grapples];
  const rejections: InitialGrappleRejectionFact[] = [];
  for (const [grappleIndex, initial] of (initialGrapples ?? []).entries()) {
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
  initial: BattleInitialGrapple,
):
  | { readonly tag: "ok"; readonly link: BattleGrappleLink }
  | {
      readonly tag: "rejected";
      readonly rejection: BattleInitialGrappleRejection;
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
