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
  BattleMirrorImageDuplicateRollHole,
  BattleRolledDiceFill,
  BattleState,
  BattleTargetSpatialFact,
} from "../battle-reducer.ts";
import { validateRolledDiceFillForDiceExpr } from "../battle-reducer.ts";
import {
  MIRROR_IMAGE_DUPLICATE_COUNTS,
  MIRROR_IMAGE_DUPLICATE_DIE_SIZE,
  MIRROR_IMAGE_DUPLICATE_ROLL_HOLE_KEY_PREFIX,
  MIRROR_IMAGE_DUPLICATE_SUCCESS_AT_LEAST,
  type MirrorImageDuplicateCount,
} from "./domain-constants.ts";

type MirrorImageDuplicates = Extract<
  BattleActiveEffect,
  { readonly kind: "mirrorImageDuplicates" }
>;

export const MIRROR_IMAGE_HIT_INTERCEPTION_DUPLICATE_COUNTS = [
  0,
  ...MIRROR_IMAGE_DUPLICATE_COUNTS,
] as const;
export type MirrorImageHitInterceptionDuplicateCount =
  (typeof MIRROR_IMAGE_HIT_INTERCEPTION_DUPLICATE_COUNTS)[number];

export type MirrorImageHitInterceptionState = {
  readonly remainingDuplicates: MirrorImageHitInterceptionDuplicateCount;
  readonly normalDamageContinues: boolean;
};

export type MirrorImageHitInterceptionInputState = Pick<
  MirrorImageHitInterceptionState,
  "remainingDuplicates"
>;

export type MirrorImageHitInterceptionFills = {
  readonly attackHits: boolean;
  readonly attackerBlinded: boolean;
  readonly attackerHasBlindsight: boolean;
  readonly attackerHasTruesight: boolean;
  readonly duplicateRollSucceeds: boolean;
};

export type MirrorImageHitInterceptionResult =
  | { readonly tag: "notAvailable" }
  | {
      readonly tag: "needsHoles";
      readonly hole: BattleMirrorImageDuplicateRollHole;
    }
  | { readonly tag: "invalid"; readonly message: string }
  | { readonly tag: "hitCaster" }
  | { readonly tag: "hitDuplicate"; readonly state: BattleState };

export function mirrorImageDuplicateRollHoleId(
  triggeringAttackRollHoleId: BattleHoleId,
): BattleHoleId {
  return holeId(
    `${MIRROR_IMAGE_DUPLICATE_ROLL_HOLE_KEY_PREFIX}${String(
      triggeringAttackRollHoleId,
    )}`,
  );
}

export function isMirrorImageDuplicateRollFill(
  fill: BattleRolledDiceFill,
): boolean {
  return String(fill.holeId).startsWith(
    MIRROR_IMAGE_DUPLICATE_ROLL_HOLE_KEY_PREFIX,
  );
}

export function mirrorImageAttackerUnaffectedByFacts(
  fills: Pick<
    MirrorImageHitInterceptionFills,
    "attackerBlinded" | "attackerHasBlindsight" | "attackerHasTruesight"
  >,
): boolean {
  return (
    fills.attackerBlinded ||
    fills.attackerHasBlindsight ||
    fills.attackerHasTruesight
  );
}

export function resolveMirrorImageHitInterception(
  state: MirrorImageHitInterceptionInputState,
  fills: MirrorImageHitInterceptionFills,
): MirrorImageHitInterceptionState {
  if (!fills.attackHits) {
    return {
      remainingDuplicates: state.remainingDuplicates,
      normalDamageContinues: false,
    };
  }
  const remainingDuplicates = activeMirrorImageHitInterceptionDuplicates(
    state.remainingDuplicates,
  );
  if (
    remainingDuplicates === null ||
    mirrorImageAttackerUnaffectedByFacts(fills)
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
      mirrorImageHitInterceptionDuplicateCountAfterDestroy(remainingDuplicates),
    normalDamageContinues: false,
  };
}

export function mirrorImageHitInterceptionCheck(input: {
  readonly state: BattleState;
  readonly attacker: BattleCreatureState;
  readonly target: BattleCreatureState;
  readonly targetSpatialFacts: readonly BattleTargetSpatialFact[];
  readonly triggeringAttackRollHoleId: BattleHoleId;
  readonly fill: BattleRolledDiceFill | undefined;
}): MirrorImageHitInterceptionResult {
  const effect = activeMirrorImageDuplicates(input.target);
  if (effect === null) {
    return input.fill === undefined
      ? { tag: "notAvailable" }
      : {
          tag: "invalid",
          message:
            "Mirror Image duplicate roll is only valid for a hit against a target with active Mirror Image duplicates.",
        };
  }

  if (
    mirrorImageDoesNotAffectAttacker({
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
            "Mirror Image duplicate roll is not valid when the attacker is unaffected by Mirror Image.",
        };
  }

  const hole = mirrorImageDuplicateRollHole(
    input.triggeringAttackRollHoleId,
    input.target.combatantId,
    effect,
  );
  if (input.fill === undefined) {
    return { tag: "needsHoles", hole };
  }
  const validation = validateMirrorImageDuplicateRoll(input.fill, hole);
  if (validation !== null) {
    return { tag: "invalid", message: validation };
  }
  const result = resolveMirrorImageHitInterception(
    { remainingDuplicates: effect.remainingDuplicates },
    {
      attackHits: true,
      attackerBlinded: false,
      attackerHasBlindsight: false,
      attackerHasTruesight: false,
      duplicateRollSucceeds: mirrorImageDuplicateRollSucceeds(input.fill),
    },
  );
  return result.normalDamageContinues
    ? { tag: "hitCaster" }
    : {
        tag: "hitDuplicate",
        state: stateAfterMirrorImageDuplicateDestroyed(
          input.state,
          input.target.combatantId,
          effect,
          result.remainingDuplicates,
        ),
      };
}

export function mirrorImageDuplicateRollHole(
  triggeringAttackRollHoleId: BattleHoleId,
  targetId: BattleCreatureState["combatantId"],
  effect: MirrorImageDuplicates,
): BattleMirrorImageDuplicateRollHole {
  const protocolId = String(
    mirrorImageDuplicateRollHoleId(triggeringAttackRollHoleId),
  );
  return {
    kind: "rolledDice",
    holeId: holeId(protocolId),
    holeInstanceKey: holeInstanceKey(protocolId),
    label: `Mirror Image duplicate roll (${effect.remainingDuplicates}d${MIRROR_IMAGE_DUPLICATE_DIE_SIZE})`,
    mirrorImageDuplicateRoll: {
      targetId,
      sourceSpellId: effect.sourceSpellId,
      sourceCombatantId: effect.sourceCombatantId,
      remainingDuplicates: effect.remainingDuplicates,
      dieSize: MIRROR_IMAGE_DUPLICATE_DIE_SIZE,
      successAtLeast: MIRROR_IMAGE_DUPLICATE_SUCCESS_AT_LEAST,
    },
  };
}

function activeMirrorImageDuplicates(
  target: BattleCreatureState,
): MirrorImageDuplicates | null {
  return (
    target.activeEffects.find(
      (effect): effect is MirrorImageDuplicates =>
        effect.kind === "mirrorImageDuplicates",
    ) ?? null
  );
}

function mirrorImageDoesNotAffectAttacker(input: {
  readonly attacker: BattleCreatureState;
  readonly target: BattleCreatureState;
  readonly targetSpatialFacts: readonly BattleTargetSpatialFact[];
}): boolean {
  return mirrorImageAttackerUnaffectedByFacts({
    attackerBlinded: hasCondition(input.attacker.conditions, "blinded"),
    attackerHasBlindsight: input.targetSpatialFacts.some(
      (fact) =>
        fact.kind === "attackAttackerUnaffectedByMirrorImageWithSense" &&
        fact.attackerId === input.attacker.combatantId &&
        fact.targetId === input.target.combatantId &&
        fact.sense === "blindsight",
    ),
    attackerHasTruesight: input.targetSpatialFacts.some(
      (fact) =>
        fact.kind === "attackAttackerUnaffectedByMirrorImageWithSense" &&
        fact.attackerId === input.attacker.combatantId &&
        fact.targetId === input.target.combatantId &&
        fact.sense === "truesight",
    ),
  });
}

function mirrorImageDuplicateRollSucceeds(fill: BattleRolledDiceFill): boolean {
  return fill.value.some((group) =>
    group.results.some(
      (roll) => Number(roll) >= MIRROR_IMAGE_DUPLICATE_SUCCESS_AT_LEAST,
    ),
  );
}

function validateMirrorImageDuplicateRoll(
  fill: BattleRolledDiceFill,
  hole: BattleMirrorImageDuplicateRollHole,
): string | null {
  if (fill.holeId !== hole.holeId) {
    return "Mirror Image duplicate roll uses the wrong hole.";
  }
  if (
    fill.selectedAttackDamageRiderUnitIds !== undefined ||
    fill.weaponDamageDiceRollChoice !== undefined ||
    fill.attackDamageDieFloorChoice !== undefined
  ) {
    return "Mirror Image duplicate roll cannot select attack damage riders, weapon damage dice choices, or attack damage die floor choices.";
  }
  const validation = validateRolledDiceFillForDiceExpr(fill, {
    dice: hole.mirrorImageDuplicateRoll.remainingDuplicates,
    dieSize: hole.mirrorImageDuplicateRoll.dieSize,
  });
  return validation;
}

function stateAfterMirrorImageDuplicateDestroyed(
  state: BattleState,
  targetId: BattleCreatureState["combatantId"],
  effect: MirrorImageDuplicates,
  remainingDuplicates: MirrorImageHitInterceptionDuplicateCount,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    return state;
  }
  const nextDuplicateCount =
    activeMirrorImageHitInterceptionDuplicates(remainingDuplicates);
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

function activeMirrorImageHitInterceptionDuplicates(
  count: MirrorImageHitInterceptionDuplicateCount,
): MirrorImageDuplicateCount | null {
  return (
    MIRROR_IMAGE_DUPLICATE_COUNTS.find((candidate) => candidate === count) ??
    null
  );
}

function mirrorImageHitInterceptionDuplicateCountAfterDestroy(
  count: MirrorImageDuplicateCount,
): MirrorImageHitInterceptionDuplicateCount {
  return Match.value(count).pipe(
    Match.when(1, () => 0 as const),
    Match.when(2, () => 1 as const),
    Match.when(3, () => 2 as const),
    Match.exhaustive,
  );
}
