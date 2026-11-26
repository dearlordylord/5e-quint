// KERNEL-COVERAGE: runtime-owner BATTLE.ACTION.OBJECT_INTERACTION_COST
//
// Object interactions on a creature's own turn, and its readied Utilize action.
// SRD 5.2.1 "Your Turn",
// Interacting with Things: "You can interact with one object or feature of
// the environment for free, during either your move or action ... If you want
// to interact with a second object, you need to take the Utilize action."
// Every object interaction, whether the table describes it or Battle owns its
// transition, is charged by `chargeObjectInteraction`. The table rules whether
// the object needs an action for its use and what happens to the world.
import {
  canChargeObjectInteraction,
  chargeObjectInteraction,
  type ObjectInteractionRuling,
} from "@dnd/shared-algebras/action-economy-algebra";
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { Match, Result } from "effect";
import type {
  BattleActDiscoveryCandidate,
  BattleCreatureState,
  BattleFill,
  BattleObjectInteractionRulingHole,
  BattleResolutionInput,
  BattleResolutionResult,
  BattleState,
} from "../battle-state-execution.ts";
import type {
  BattleRuntimeCommand,
  BattleSubject,
} from "../battle-subjects.ts";
import type { CombatantId } from "../identity.ts";
import {
  groundedLoadoutWeaponPickups,
  stateWithOwnedWeaponChange,
} from "./owned-weapon-custody.ts";
import {
  combatantCanTakeActions,
  currentActorId,
} from "./creature-state-leaves.ts";
import { needsHolesResult } from "./needs-holes-result.ts";
import { invalidResult, resolvedResult } from "./result-helpers.ts";

export const OBJECT_INTERACTION_COMMANDS = [
  "interactWithObject",
  "pickUpHeldWeapon",
] as const satisfies readonly BattleRuntimeCommand[];

export type ObjectInteractionSubject = Extract<
  BattleSubject,
  {
    readonly tag: "runtimeCommand";
    readonly command: (typeof OBJECT_INTERACTION_COMMANDS)[number];
  }
>;

export function isObjectInteractionSubject(
  subject: BattleSubject,
): subject is ObjectInteractionSubject {
  return (
    subject.tag === "runtimeCommand" &&
    OBJECT_INTERACTION_COMMANDS.some((command) => command === subject.command)
  );
}

const OBJECT_INTERACTION_RULING_HOLE_INSTANCE = holeInstanceKey(
  "battle:object-interaction:ruling",
);

const FREE_INTERACTION_RULING: ObjectInteractionRuling = {
  requiresUtilize: false,
};

/**
 * Whether the actor can interact with an object with the resources it holds:
 * able to act, with the free interaction or the Utilize action left. On its
 * own turn these are its turn's resources; a released readied interaction
 * holds only the readied Utilize action (ASSUMPTIONS.md A60). The dispatcher
 * admits the actor.
 */
function objectInteractionAvailable(
  state: BattleState,
  actor: BattleCreatureState,
): boolean {
  return (
    combatantCanTakeActions(actor) &&
    canChargeObjectInteraction(
      state.currentTurnResources,
      FREE_INTERACTION_RULING,
    )
  );
}

/** The object interactions the current actor can start on its own turn. */
export function objectInteractionActs(
  state: BattleState,
  actor: BattleCreatureState,
): BattleActDiscoveryCandidate[] {
  if (
    actor.combatantId !== currentActorId(state) ||
    !objectInteractionAvailable(state, actor)
  ) {
    return [];
  }
  const actorId = actor.combatantId;
  return [
    {
      subject: {
        tag: "runtimeCommand",
        actorId,
        command: "interactWithObject",
      },
      initialHoles: [objectInteractionRulingHole(state, actorId)],
    },
    ...groundedLoadoutWeaponPickups(state, actor).map(
      ({ objectId }): BattleActDiscoveryCandidate => ({
        subject: {
          tag: "runtimeCommand",
          actorId,
          command: "pickUpHeldWeapon",
          objectId,
        },
        initialHoles: [objectInteractionRulingHole(state, actorId)],
      }),
    ),
  ];
}

export function objectInteractionRulingHole(
  state: BattleState,
  actorId: CombatantId,
): BattleObjectInteractionRulingHole {
  return {
    holeInstanceKey: OBJECT_INTERACTION_RULING_HOLE_INSTANCE,
    holeId: holeId(`battle:object-interaction:ruling:${actorId}`),
    kind: "objectInteractionRuling",
    label: "Does this object need an action for its use?",
    actorId,
    objectInteraction: state.currentTurnResources.objectInteraction,
  };
}

export function resolveObjectInteraction(
  input: BattleResolutionInput & { readonly subject: ObjectInteractionSubject },
): BattleResolutionResult {
  const actor = input.state.combatants.get(input.subject.actorId);
  if (actor === undefined || !objectInteractionAvailable(input.state, actor)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "An object interaction is no longer available to this creature.",
    );
  }
  const hole = objectInteractionRulingHole(input.state, actor.combatantId);
  const [fill, ...extraFills] = input.fills;
  if (fill === undefined) {
    return needsHolesResult(input.state, input.subject, [hole]);
  }
  const ruling = objectInteractionRulingFill(fill, hole);
  if (ruling === null || extraFills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "An object interaction takes exactly one objectInteractionRuling fill for its hole.",
    );
  }
  const charged = chargeObjectInteraction(
    input.state.currentTurnResources,
    ruling,
  );
  if (Result.isFailure(charged)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "This object needs the Utilize action, and the creature has no action left to take it.",
    );
  }
  const chargedState: BattleState = {
    ...input.state,
    currentTurnResources: charged.success,
  };
  return Match.value(input.subject).pipe(
    Match.when({ command: "interactWithObject" }, () =>
      resolvedResult(chargedState),
    ),
    Match.when({ command: "pickUpHeldWeapon" }, (subject) => {
      const pickup = groundedLoadoutWeaponPickups(input.state, actor).find(
        ({ objectId }) => objectId === subject.objectId,
      );
      const pickedUp =
        pickup === undefined
          ? {
              tag: "invalid" as const,
              message:
                "That weapon is not on the ground for this creature to pick up.",
            }
          : stateWithOwnedWeaponChange(chargedState, subject.actorId, pickup);
      return pickedUp.tag === "applied"
        ? resolvedResult(pickedUp.state)
        : invalidResult(input.state, "staleSubject", pickedUp.message);
    }),
    Match.exhaustive,
  );
}

function objectInteractionRulingFill(
  fill: BattleFill,
  hole: BattleObjectInteractionRulingHole,
): ObjectInteractionRuling | null {
  return fill.kind === "objectInteractionRuling" && fill.holeId === hole.holeId
    ? fill.value
    : null;
}
