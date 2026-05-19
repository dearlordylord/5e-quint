// Mirror Image hit interception. Owns the d6-per-remaining-duplicate hole,
// duplicate pool state transition, and RAW bypass conditions.

import { hasCondition } from "@dnd/shared-algebras/conditions-algebra";
import { validateRolledDiceForDiceExpr } from "@dnd/shared-algebras/runtime-dice-algebra";
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import type {
  BattleActiveEffect,
  BattleCreatureState,
  BattleHoleId,
  BattleMirrorImageDuplicateRollHole,
  BattleRolledDiceFill,
  BattleState,
  BattleTargetSpatialFact,
} from "../battle-reducer.ts";
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
  const duplicateWasHit = input.fill.value.some((group) =>
    group.results.some(
      (roll) => Number(roll) >= MIRROR_IMAGE_DUPLICATE_SUCCESS_AT_LEAST,
    ),
  );
  return duplicateWasHit
    ? {
        tag: "hitDuplicate",
        state: stateAfterMirrorImageDuplicateDestroyed(
          input.state,
          input.target.combatantId,
          effect,
        ),
      }
    : { tag: "hitCaster" };
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
  return (
    hasCondition(input.attacker.conditions, "blinded") ||
    input.targetSpatialFacts.some(
      (fact) =>
        fact.kind === "attackAttackerUnaffectedByMirrorImageWithSense" &&
        fact.attackerId === input.attacker.combatantId &&
        fact.targetId === input.target.combatantId,
    )
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
    fill.weaponDamageDiceRollChoice !== undefined
  ) {
    return "Mirror Image duplicate roll cannot select attack damage riders or weapon damage dice choices.";
  }
  const validation = validateRolledDiceForDiceExpr(fill.value, {
    dice: hole.mirrorImageDuplicateRoll.remainingDuplicates,
    dieSize: hole.mirrorImageDuplicateRoll.dieSize,
  });
  return validation?.reason ?? null;
}

function stateAfterMirrorImageDuplicateDestroyed(
  state: BattleState,
  targetId: BattleCreatureState["combatantId"],
  effect: MirrorImageDuplicates,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    return state;
  }
  const nextDuplicateCount = duplicateCountAfterDestroy(
    effect.remainingDuplicates,
  );
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

function duplicateCountAfterDestroy(
  count: MirrorImageDuplicateCount,
): MirrorImageDuplicateCount | null {
  return (
    MIRROR_IMAGE_DUPLICATE_COUNTS.find(
      (candidate) => candidate === count - 1,
    ) ?? null
  );
}
