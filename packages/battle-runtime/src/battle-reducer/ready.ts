import { isReadiedWeaponChangeActionSubject } from "../battle-subjects.ts";
// KERNEL-COVERAGE: runtime-owner BATTLE.REACTION.OFFER_DECLINE_RESUME

import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  boundAttackExecutionSelectionMatchesOption,
  attackExecutionSelectionIdentitiesEqual,
} from "../battle-action-options.ts";
import type { BattleReadyResponse } from "../battle-subjects.ts";
import {
  sameBattleSubject,
  type BattleReadyActionSubject,
} from "../battle-subjects.ts";
import type {
  BattleActDiscoveryCandidate,
  BattleFill,
  BattleReadyDeclarationHole,
  BattleState,
} from "../battle-state-execution.ts";
import { attackActionOptionsForActor } from "./attack-damage-apply.ts";
import { combatantCanMoveInState } from "./movement-speed.ts";
import type { CombatantId } from "../identity.ts";
import { optionalProperty } from "../optional-property.ts";
import type { BoundSupportedAttackActionOption } from "../battle-action-options.ts";
import { attackTargetChoices } from "./hole-helpers.ts";
import { isObjectInteractionSubject } from "./object-interaction.ts";

export const READY_DECLARATION_HOLE_ID = holeId("battle:ready:declaration");
export const READY_DECLARATION_HOLE_INSTANCE = holeInstanceKey(
  "battle:ready:declaration",
);

export function readyResponseChoices(
  state: BattleState,
  actorId: CombatantId,
  candidates: readonly BattleActDiscoveryCandidate[],
): readonly BattleReadyResponse[] {
  const responses = candidates.flatMap((candidate): BattleReadyResponse[] => {
    const subject = candidate.subject;
    if (
      subject.tag === "action" &&
      subject.actorId === actorId &&
      subject.action === "attack"
    ) {
      return [
        {
          kind: "attack",
          selection:
            subject.attackAbility === undefined
              ? {
                  procedureRef: subject.procedureRef,
                  statBlockDamageSelection: subject.statBlockDamageSelection,
                }
              : {
                  procedureRef: subject.procedureRef,
                  attackAbility: subject.attackAbility,
                  attackDamageType: subject.attackDamageType,
                  ...optionalProperty("weaponDelivery", subject.weaponDelivery),
                },
        },
      ];
    }
    const actionSubject = readyActionSubject(subject);
    return actionSubject === null
      ? []
      : [{ kind: "action", subject: actionSubject }];
  });
  const withMovement = combatantCanMoveInState(state, actorId)
    ? [{ kind: "movement" as const }, ...responses]
    : responses;
  return withMovement.filter(
    (candidate, index) =>
      withMovement.findIndex((other) =>
        readyResponsesEqual(candidate, other),
      ) === index,
  );
}

export function readyDeclarationHole(
  actorId: CombatantId,
  responseChoices: readonly BattleReadyResponse[],
): BattleReadyDeclarationHole {
  return {
    holeId: READY_DECLARATION_HOLE_ID,
    holeInstanceKey: READY_DECLARATION_HOLE_INSTANCE,
    kind: "readyDeclaration",
    label: "Choose a perceivable trigger and the response to Ready",
    actorId,
    responseChoices,
  };
}

export function readyDeclarationFill(
  fills: readonly BattleFill[],
): Extract<BattleFill, { readonly kind: "readyDeclaration" }> | null {
  const [fill, extra] = fills;
  return fill?.kind === "readyDeclaration" &&
    fill.holeId === READY_DECLARATION_HOLE_ID &&
    extra === undefined
    ? fill
    : null;
}

export function readyResponseIsOffered(
  offered: readonly BattleReadyResponse[],
  selected: BattleReadyResponse,
): boolean {
  return offered.some((candidate) => readyResponsesEqual(candidate, selected));
}

function readyResponsesEqual(
  left: BattleReadyResponse,
  right: BattleReadyResponse,
): boolean {
  if (left.kind !== right.kind) return false;
  if (left.kind === "movement" || right.kind === "movement") return true;
  if (left.kind === "attack" && right.kind === "attack") {
    return attackExecutionSelectionIdentitiesEqual(
      left.selection,
      right.selection,
    );
  }
  return (
    left.kind === "action" &&
    right.kind === "action" &&
    sameBattleSubject(left.subject, right.subject)
  );
}

export function readyActionSubject(
  subject: import("../battle-subjects.ts").BattleSubject,
): BattleReadyActionSubject | null {
  if (isObjectInteractionSubject(subject)) return subject;
  if (subject.tag !== "action") return null;
  if (isReadiedWeaponChangeActionSubject(subject)) {
    return { tag: "action", actorId: subject.actorId, action: subject.action };
  }
  return subject.action !== "attack" &&
    subject.action !== "multiattack" &&
    subject.action !== "ready"
    ? subject
    : null;
}

/**
 * The readied attack against this target, if the reactor can make it: among
 * the attacks it can make now, or among `attacks`, the ones it could make
 * after a weapon change.
 */
export function readiedAttackOption(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  procedureRef: Extract<
    BattleReadyResponse,
    { readonly kind: "attack" }
  >["selection"]["procedureRef"],
  attacks?: readonly BoundSupportedAttackActionOption[],
): BoundSupportedAttackActionOption | undefined {
  const readied = state.readiedResponses.get(actorId);
  if (
    readied?.response.kind !== "attack" ||
    readied.response.selection.procedureRef !== procedureRef
  ) {
    return undefined;
  }
  const selection = readied.response.selection;
  return (attacks ?? attackActionOptionsForActor(state, actorId)).find(
    (attack) =>
      boundAttackExecutionSelectionMatchesOption(selection, attack) &&
      attackTargetChoices(state, actorId, attack).includes(targetId),
  );
}
