// Mirror Image hit interception. Owns the d6-per-remaining-duplicate hole,
// duplicate pool state transition, and RAW bypass conditions.
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MIRROR_IMAGE_HIT_INTERCEPTION

import { hasCondition } from "@dnd/shared-algebras/conditions-algebra";
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { Match } from "effect";
import type {
  BattleActiveEffect,
  BattleCreatureState,
  BattleHoleId,
  BattleDuplicateHitInterceptionRollHole,
  BattleRolledDiceFill,
  BattleState,
  BattleTargetSpatialFact,
} from "../battle-state-execution.ts";
import { validateRolledDiceFillForDiceExpr } from "../battle-state-execution.ts";
import {
  MIRROR_IMAGE_DUPLICATE_COUNTS,
  MIRROR_IMAGE_DUPLICATE_DIE_SIZE,
  MIRROR_IMAGE_DUPLICATE_ROLL_HOLE_KEY_PREFIX,
  MIRROR_IMAGE_DUPLICATE_SUCCESS_AT_LEAST,
  type MirrorImageDuplicateCount as DuplicateHitInterceptionCount,
} from "./domain-constants.ts";

type DuplicateHitInterception = Extract<
  BattleActiveEffect,
  { readonly kind: "duplicateHitInterception" }
>;

export const MIRROR_IMAGE_HIT_INTERCEPTION_DUPLICATE_COUNTS = [
  0,
  ...MIRROR_IMAGE_DUPLICATE_COUNTS,
] as const;
export type DuplicateHitInterceptionDuplicateCount =
  (typeof MIRROR_IMAGE_HIT_INTERCEPTION_DUPLICATE_COUNTS)[number];

export type DuplicateHitInterceptionState = {
  readonly remainingDuplicates: DuplicateHitInterceptionDuplicateCount;
  readonly normalDamageContinues: boolean;
};

export type DuplicateHitInterceptionInputState = Pick<
  DuplicateHitInterceptionState,
  "remainingDuplicates"
>;

export type DuplicateHitInterceptionFills = {
  readonly attackHits: boolean;
  readonly attackerBlinded: boolean;
  readonly attackerHasBlindsight: boolean;
  readonly attackerHasTruesight: boolean;
  readonly duplicateRollSucceeds: boolean;
};

export type DuplicateHitInterceptionResult =
  | { readonly tag: "notAvailable" }
  | {
      readonly tag: "needsHoles";
      readonly hole: BattleDuplicateHitInterceptionRollHole;
    }
  | { readonly tag: "invalid"; readonly message: string }
  | { readonly tag: "hitCaster" }
  | { readonly tag: "hitDuplicate"; readonly state: BattleState };

export function duplicateHitInterceptionRollHoleId(
  triggeringAttackRollHoleId: BattleHoleId,
): BattleHoleId {
  return holeId(
    `${MIRROR_IMAGE_DUPLICATE_ROLL_HOLE_KEY_PREFIX}${String(
      triggeringAttackRollHoleId,
    )}`,
  );
}

export function isDuplicateHitInterceptionDuplicateRollFill(
  fill: BattleRolledDiceFill,
): boolean {
  return String(fill.holeId).startsWith(
    MIRROR_IMAGE_DUPLICATE_ROLL_HOLE_KEY_PREFIX,
  );
}

export function duplicateHitInterceptionAttackerUnaffectedByFacts(
  fills: Pick<
    DuplicateHitInterceptionFills,
    "attackerBlinded" | "attackerHasBlindsight" | "attackerHasTruesight"
  >,
): boolean {
  return (
    fills.attackerBlinded ||
    fills.attackerHasBlindsight ||
    fills.attackerHasTruesight
  );
}

export function resolveDuplicateHitInterception(
  state: DuplicateHitInterceptionInputState,
  fills: DuplicateHitInterceptionFills,
): DuplicateHitInterceptionState {
  if (!fills.attackHits) {
    return {
      remainingDuplicates: state.remainingDuplicates,
      normalDamageContinues: false,
    };
  }
  const remainingDuplicates = activeDuplicateHitInterceptionDuplicates(
    state.remainingDuplicates,
  );
  if (
    remainingDuplicates === null ||
    duplicateHitInterceptionAttackerUnaffectedByFacts(fills)
  ) {
    return {
      remainingDuplicates: state.remainingDuplicates,
      normalDamageContinues: true,
    };
  }
  if (!fills.duplicateRollSucceeds) {
    return {
      remainingDuplicates: state.remainingDuplicates,
      normalDamageContinues: true,
    };
  }
  return {
    remainingDuplicates:
      duplicateHitInterceptionDuplicateCountAfterDestroy(remainingDuplicates),
    normalDamageContinues: false,
  };
}

export function duplicateHitInterceptionCheck(input: {
  readonly state: BattleState;
  readonly attacker: BattleCreatureState;
  readonly target: BattleCreatureState;
  readonly targetSpatialFacts: readonly BattleTargetSpatialFact[];
  readonly triggeringAttackRollHoleId: BattleHoleId;
  readonly fill: BattleRolledDiceFill | undefined;
}): DuplicateHitInterceptionResult {
  const effect = activeDuplicateHitInterception(input.target);
  if (effect === null) {
    return input.fill === undefined
      ? { tag: "notAvailable" }
      : {
          tag: "invalid",
          message:
            "Duplicate-interception roll requires a hit against a target with active duplicates.",
        };
  }

  if (
    duplicateHitInterceptionDoesNotAffectAttacker({
      attacker: input.attacker,
      target: input.target,
      targetSpatialFacts: input.targetSpatialFacts,
    })
  ) {
    return input.fill === undefined
      ? { tag: "notAvailable" }
      : {
          tag: "invalid",
          message:
            "Duplicate-interception roll is invalid when the attacker bypasses the active duplicates.",
        };
  }

  const hole = duplicateHitInterceptionRollHole(
    input.triggeringAttackRollHoleId,
    input.target.combatantId,
    effect,
  );
  if (input.fill === undefined) {
    return { tag: "needsHoles", hole };
  }
  const validation = validateDuplicateHitInterceptionDuplicateRoll(
    input.fill,
    hole,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (validation !== null) {
    return { tag: "invalid", message: validation };
  }
  /* v8 ignore stop -- @preserve */
  const result = resolveDuplicateHitInterception(
    { remainingDuplicates: effect.remainingDuplicates },
    {
      attackHits: true,
      attackerBlinded: false,
      attackerHasBlindsight: false,
      attackerHasTruesight: false,
      duplicateRollSucceeds: duplicateHitInterceptionRollSucceeds(input.fill),
    },
  );
  return result.normalDamageContinues
    ? { tag: "hitCaster" }
    : {
        tag: "hitDuplicate",
        state: stateAfterDuplicateHitInterceptionDuplicateDestroyed(
          input.state,
          input.target.combatantId,
          effect,
          result.remainingDuplicates,
        ),
      };
}

export function duplicateHitInterceptionRollHole(
  triggeringAttackRollHoleId: BattleHoleId,
  targetId: BattleCreatureState["combatantId"],
  effect: DuplicateHitInterception,
): BattleDuplicateHitInterceptionRollHole {
  const protocolId = String(
    duplicateHitInterceptionRollHoleId(triggeringAttackRollHoleId),
  );
  return {
    kind: "rolledDice",
    holeId: holeId(protocolId),
    holeInstanceKey: holeInstanceKey(protocolId),
    label: `Mirror Image duplicate roll (${effect.remainingDuplicates}d${MIRROR_IMAGE_DUPLICATE_DIE_SIZE})`,
    duplicateHitInterceptionRoll: {
      targetId,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      remainingDuplicates: effect.remainingDuplicates,
      dieSize: MIRROR_IMAGE_DUPLICATE_DIE_SIZE,
      successAtLeast: MIRROR_IMAGE_DUPLICATE_SUCCESS_AT_LEAST,
    },
  };
}

function activeDuplicateHitInterception(
  target: BattleCreatureState,
): DuplicateHitInterception | null {
  return (
    target.activeEffects.find(
      (effect): effect is DuplicateHitInterception =>
        effect.kind === "duplicateHitInterception",
    ) ?? null
  );
}

function duplicateHitInterceptionDoesNotAffectAttacker(input: {
  readonly attacker: BattleCreatureState;
  readonly target: BattleCreatureState;
  readonly targetSpatialFacts: readonly BattleTargetSpatialFact[];
}): boolean {
  return duplicateHitInterceptionAttackerUnaffectedByFacts({
    attackerBlinded: hasCondition(input.attacker.conditions, "blinded"),
    attackerHasBlindsight: input.targetSpatialFacts.some(
      (fact) =>
        fact.kind === "attackerUnaffectedByDuplicateHitInterceptionWithSense" &&
        fact.attackerId === input.attacker.combatantId &&
        fact.targetId === input.target.combatantId &&
        fact.sense === "blindsight",
    ),
    attackerHasTruesight: input.targetSpatialFacts.some(
      (fact) =>
        fact.kind === "attackerUnaffectedByDuplicateHitInterceptionWithSense" &&
        fact.attackerId === input.attacker.combatantId &&
        fact.targetId === input.target.combatantId &&
        fact.sense === "truesight",
    ),
  });
}

function duplicateHitInterceptionRollSucceeds(
  fill: BattleRolledDiceFill,
): boolean {
  return fill.value.some((group) =>
    group.results.some(
      (roll) => Number(roll) >= MIRROR_IMAGE_DUPLICATE_SUCCESS_AT_LEAST,
    ),
  );
}

/* v8 ignore start -- @preserve -- Malformed Mirror Image roll: discovery fixes the duplicate-roll hole and dice expression and does not offer attack-damage choices. */
function validateDuplicateHitInterceptionDuplicateRoll(
  fill: BattleRolledDiceFill,
  hole: BattleDuplicateHitInterceptionRollHole,
): string | null {
  if (fill.holeId !== hole.holeId) {
    return "Mirror Image duplicate roll uses the wrong hole.";
  }
  if (
    fill.selectedAttackDamageRiderProcedureRefs !== undefined ||
    fill.weaponDamageDiceRollChoice !== undefined ||
    fill.attackDamageDieFloorChoice !== undefined
  ) {
    return "Mirror Image duplicate roll cannot select attack damage riders, weapon damage dice choices, or attack damage die floor choices.";
  }
  const validation = validateRolledDiceFillForDiceExpr(fill, {
    dice: hole.duplicateHitInterceptionRoll.remainingDuplicates,
    dieSize: hole.duplicateHitInterceptionRoll.dieSize,
  });
  return validation;
}
/* v8 ignore stop -- @preserve */

function stateAfterDuplicateHitInterceptionDuplicateDestroyed(
  state: BattleState,
  targetId: BattleCreatureState["combatantId"],
  effect: DuplicateHitInterception,
  remainingDuplicates: DuplicateHitInterceptionDuplicateCount,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    return state;
  }
  const nextDuplicateCount =
    activeDuplicateHitInterceptionDuplicates(remainingDuplicates);
  const activeEffects =
    nextDuplicateCount === null
      ? target.activeEffects.filter((candidate) => candidate !== effect)
      : target.activeEffects.map((candidate) =>
          candidate === effect
            ? { ...effect, remainingDuplicates: nextDuplicateCount }
            : candidate,
        );
  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, {
      ...target,
      activeEffects,
    }),
  };
}

function activeDuplicateHitInterceptionDuplicates(
  count: DuplicateHitInterceptionDuplicateCount,
): DuplicateHitInterceptionCount | null {
  return (
    MIRROR_IMAGE_DUPLICATE_COUNTS.find((candidate) => candidate === count) ??
    null
  );
}

function duplicateHitInterceptionDuplicateCountAfterDestroy(
  count: DuplicateHitInterceptionCount,
): DuplicateHitInterceptionDuplicateCount {
  return Match.value(count).pipe(
    Match.when(1, () => 0 as const),
    Match.when(2, () => 1 as const),
    Match.when(3, () => 2 as const),
    Match.exhaustive,
  );
}
