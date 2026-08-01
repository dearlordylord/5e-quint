// KERNEL-COVERAGE: runtime-owner BATTLE.ATTACK.MINIMAL_RESOLUTION

// Resolution is separate from creature-attack.ts so the discovery leaf does
// not depend back on snapshot-backed reducer results through battle discovery.

import { spendAction } from "@dnd/shared-algebras/action-economy-algebra";
import { damageAmount as toDamageAmount } from "@dnd/shared/types";
import * as Either from "effect/Either";
import type {
  BattleResolutionInputForSubject,
  BattleResolutionResult,
} from "../battle-state-execution.ts";
import {
  battleStateAfterCreatureAttackDamage,
  creatureAttackDamageHole,
  creatureAttackDamageTotal,
  creatureAttackFillSequence,
  creatureAttackHit,
  creatureAttackPilotActor,
  creatureAttackRollHole,
  creatureAttackSubjectCombatants,
  type CreatureAttackSubject,
} from "./creature-attack.ts";
import { combatantCanTakeActions } from "./creature-state-execution.ts";
import {
  damageRelationshipDecisionHole,
  DamageRelationshipDecisionsByHole,
} from "./damage-relationship-decisions.ts";
import { needsHolesResult } from "./needs-holes-result.ts";
import { invalidResult, resolvedResult } from "./result-helpers.ts";

export function resolveCreatureAttack(
  input: BattleResolutionInputForSubject<CreatureAttackSubject>,
): BattleResolutionResult {
  const combatants = creatureAttackSubjectCombatants(input);
  if (combatants.tag === "missing") {
    return invalidResult(
      input.state,
      "missingCombatant",
      `Creature Attack combatant is not in this battle: ${combatants.combatantId}`,
    );
  }
  if (!creatureAttackPilotActor(combatants.actor)) {
    return invalidResult(
      input.state,
      "unsupportedSubject",
      "Creature Attack is available only for the narrow stat-block no-actions pilot.",
    );
  }
  if (!combatantCanTakeActions(combatants.actor)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Creature Attack requires an actor that can take actions.",
    );
  }
  const spentAttackResources = spendAction(
    input.state.currentTurnResources,
    "attack",
  );
  if (Either.isLeft(spentAttackResources)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Creature Attack requires an available Attack action.",
    );
  }
  const fills = creatureAttackFillSequence(input);
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fills.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", fills.message);
  }
  /* v8 ignore stop */
  if (fills.tag === "empty") {
    return needsHolesResult(input.state, input.subject, [
      creatureAttackRollHole(input.subject),
    ]);
  }
  const hit = creatureAttackHit({
    state: input.state,
    target: combatants.target,
    attackRoll: fills.attackRoll,
  });
  if (!hit) {
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (fills.tag === "damageRoll") {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        "Creature Attack damage cannot be supplied after a missed Attack Roll.",
      );
    }
    /* v8 ignore stop */
    return resolvedResult({
      ...input.state,
      currentTurnResources: spentAttackResources.right,
    });
  }
  if (fills.tag === "attackRoll") {
    return needsHolesResult(input.state, input.subject, [
      creatureAttackDamageHole(input.subject),
    ]);
  }
  const parsedRelationships = DamageRelationshipDecisionsByHole.parse({
    fills: input.fills,
    damageEventHoleIds: new Set([fills.damageRoll.holeId]),
    owner: "an Attack",
  });
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (parsedRelationships.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      parsedRelationships.message,
    );
  }
  /* v8 ignore stop */
  const damage = creatureAttackDamageTotal(fills.damageRoll);
  const relationshipCheck =
    parsedRelationships.decisionsByRelationshipHole.check(
      fills.damageRoll.holeId,
      damage <= 0
        ? null
        : damageRelationshipDecisionHole({
            state: input.state,
            damageEventHoleId: fills.damageRoll.holeId,
            damageSourceId: input.subject.actorId,
            targets: [
              {
                targetId: input.subject.targetId,
                damageAmount: toDamageAmount(damage),
              },
            ],
            spatialFacts: [],
          }),
    );
  if (relationshipCheck.tag === "needsHoles") {
    return needsHolesResult(
      input.state,
      input.subject,
      relationshipCheck.holes,
    );
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (relationshipCheck.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", relationshipCheck.message);
  }
  /* v8 ignore stop */
  return resolvedResult(
    battleStateAfterCreatureAttackDamage({
      state: {
        ...input.state,
        currentTurnResources: spentAttackResources.right,
      },
      actor: combatants.actor,
      target: combatants.target,
      damage,
      ...(relationshipCheck.decisions === undefined
        ? {}
        : { relationshipDecisions: relationshipCheck.decisions }),
    }),
  );
}
