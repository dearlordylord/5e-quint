import { Match } from "effect";

import type { DamageType } from "@dnd/shared/types";
import type { ActionRestriction, DiceExpr } from "@dnd/surface/surface/types";

import type {
  BattleSpellEffectEarlyEnd,
  BattleTurnAnchor,
} from "./active-effect/types.ts";
import type { SpellTargeting } from "./battle-reducer.ts";
import type {
  BattleActiveEffectExecutionRef,
  BattleProcedureExecutionRef,
  CombatantId,
} from "./identity.ts";
import { samePrimitiveSet, sameSetByKey } from "./mechanical-equality.ts";
import { sameDiceExpr } from "./spell-procedure-execution-equality-ability-insect-plague.ts";

export function sameSpellTargeting(
  left: SpellTargeting,
  right: SpellTargeting,
): boolean {
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("kind")({
      singleCombatant: () => right.kind === "singleCombatant",
      singleCreatureOrObject: () => right.kind === "singleCreatureOrObject",
      targetList: (value) =>
        right.kind === "targetList" &&
        value.minTargets === right.minTargets &&
        value.maxTargets === right.maxTargets,
      pointOriginSphere: (value) =>
        right.kind === "pointOriginSphere" &&
        value.radiusFeet === right.radiusFeet,
      pointOriginSphereDiameter: (value) =>
        right.kind === "pointOriginSphereDiameter" &&
        value.diameterFeet === right.diameterFeet,
      pointOriginCylinder: (value) =>
        right.kind === "pointOriginCylinder" &&
        value.radiusFeet === right.radiusFeet &&
        value.heightFeet === right.heightFeet,
      pointOriginCubeExcludingCaster: (value) =>
        right.kind === "pointOriginCubeExcludingCaster" &&
        value.sideFeet === right.sideFeet,
      pointOriginCube: (value) =>
        right.kind === "pointOriginCube" && value.sideFeet === right.sideFeet,
      selfOriginCube: (value) =>
        right.kind === "selfOriginCube" && value.sideFeet === right.sideFeet,
      selfOriginCone: (value) =>
        right.kind === "selfOriginCone" &&
        value.lengthFeet === right.lengthFeet,
      selfOriginLine: (value) =>
        right.kind === "selfOriginLine" &&
        value.lengthFeet === right.lengthFeet &&
        value.widthFeet === right.widthFeet,
      selfOriginEmanation: (value) =>
        right.kind === "selfOriginEmanation" &&
        value.radiusFeet === right.radiusFeet,
      primaryTargetOriginEmanation: (value) =>
        right.kind === "primaryTargetOriginEmanation" &&
        value.radiusFeet === right.radiusFeet,
    }),
  );
}

export function sameCombatantTargetSet(
  left: readonly CombatantId[],
  right: readonly CombatantId[],
): boolean {
  return samePrimitiveSet(left, right);
}

export type SpellDamageFacts = {
  readonly expr: DiceExpr;
  readonly damageType: DamageType;
};

export function sameSpellDamageFacts(
  left: SpellDamageFacts,
  right: SpellDamageFacts,
): boolean {
  return (
    left.damageType === right.damageType && sameDiceExpr(left.expr, right.expr)
  );
}

export function sameBattleTurnAnchor(
  left: BattleTurnAnchor,
  right: BattleTurnAnchor,
): boolean {
  return left.actorId === right.actorId && left.round === right.round;
}

export function sameSpellEffectEarlyEnds(
  left: readonly BattleSpellEffectEarlyEnd[],
  right: readonly BattleSpellEffectEarlyEnd[],
): boolean {
  return sameSetByKey(
    left,
    right,
    (earlyEnd) => earlyEnd.kind,
    (leftEarlyEnd, rightEarlyEnd) => leftEarlyEnd.kind === rightEarlyEnd.kind,
  );
}

export function sameActiveEffectSource(
  left: { readonly sourceCombatantId: CombatantId },
  right: { readonly sourceCombatantId: CombatantId },
): boolean {
  return left.sourceCombatantId === right.sourceCombatantId;
}

export function sameActiveEffectExecutionIdentity(
  left: {
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly effectRef: BattleActiveEffectExecutionRef;
  },
  right: {
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly effectRef: BattleActiveEffectExecutionRef;
  },
): boolean {
  return (
    left.sourceProcedureRef === right.sourceProcedureRef &&
    left.effectRef === right.effectRef
  );
}

export function sameActionRestriction(
  left: ActionRestriction,
  right: ActionRestriction,
): boolean {
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("kind")({
      none: () => right.kind === "none",
      exclude: (value) =>
        right.kind === "exclude" &&
        samePrimitiveSet(value.actions, right.actions),
      allow_only: (value) =>
        right.kind === "allow_only" &&
        sameSetByKey(
          value.actions,
          right.actions,
          (action) => action.action,
          (leftAction, rightAction) =>
            leftAction.action === rightAction.action &&
            (leftAction.action !== "attack" ||
              (rightAction.action === "attack" &&
                leftAction.attackLimit.kind === rightAction.attackLimit.kind &&
                leftAction.attackLimit.count ===
                  rightAction.attackLimit.count)),
        ),
    }),
  );
}
