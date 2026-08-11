import { applyCondition } from "@dnd/shared-algebras/conditions-algebra";
import { damageAmount as toDamageAmount } from "@dnd/shared/types";
import type {
  BattleCreatureState,
  BattleFeatherFallLandingResult,
  BattleFallDamageLandingResult,
  BattleInterruptFrame,
  BattleRawFallDamage,
  BattleResolutionResult,
  BattleSnapshot,
  BattleState,
  BattleTargetSpatialFact,
  EndedFlySpeedGrant,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import { currentActorId } from "./creature-state-leaves.ts";
import { battleCreatureStateWithKnockOutPreservedConditions } from "./creature-hit-point-state.ts";
import { maybeOpenInterruptWindow } from "./interrupt-execution.ts";
import {
  battleReducerRouteForCreatureFallsInterruptWindow,
  battleReducerRouteForFeatherFallLanding,
} from "./interrupt-route-projection.ts";
import { snapshotBattle } from "./battle-snapshot.ts";
import { featherFallLandingCleanupForCombatant } from "./spells-holes-fills.ts";

export function openCreatureFallsInterruptWindow(input: {
  readonly state: BattleState;
  readonly fallingCreatureId: CombatantId;
  readonly reactionSpellTargetFacts: readonly BattleTargetSpatialFact[];
}): BattleResolutionResult {
  const reactionWindow = maybeOpenInterruptWindow(
    input.state,
    {
      trigger: "creatureFalls",
      fallingCreatureId: input.fallingCreatureId,
      reactionSpellTargetFacts: input.reactionSpellTargetFacts,
      landingMitigations: [],
      continuation: {
        kind: "resolved",
        subject: {
          tag: "runtimeCommand",
          actorId: currentActorId(input.state),
          command: "creatureFalls",
          fallingCreatureId: input.fallingCreatureId,
        },
      },
    },
    undefined,
  );
  const result = reactionWindow ?? {
    tag: "resolved" as const,
    state: input.state,
    snapshot: snapshotBattle(input.state),
  };
  const routeEvents = battleReducerRouteForCreatureFallsInterruptWindow(result);
  return routeEvents === undefined ? result : { ...result, routeEvents };
}

export type FlyEndCanStopFallReason = "hovering" | "otherMeans";

export type FlySpeedGrantEndFallWitness =
  | { readonly kind: "notAloft" }
  | {
      readonly kind: "canStopFall";
      readonly reason: FlyEndCanStopFallReason;
    }
  | {
      readonly kind: "cannotStopFall";
      readonly reactionSpellTargetFacts: readonly BattleTargetSpatialFact[];
    };

export type FlySpeedGrantEndFallWitnessResult =
  | {
      readonly tag: "notAloft";
      readonly state: BattleState;
      readonly snapshot: BattleSnapshot;
      readonly targetId: CombatantId;
      readonly endedEffect: EndedFlySpeedGrant;
    }
  | {
      readonly tag: "canStopFall";
      readonly state: BattleState;
      readonly snapshot: BattleSnapshot;
      readonly targetId: CombatantId;
      readonly endedEffect: EndedFlySpeedGrant;
      readonly reason: FlyEndCanStopFallReason;
    }
  | {
      readonly tag: "falls";
      readonly state: BattleState;
      readonly snapshot: BattleSnapshot;
      readonly targetId: CombatantId;
      readonly endedEffect: EndedFlySpeedGrant;
      readonly reaction: BattleResolutionResult;
    }
  | {
      readonly tag: "invalid";
      readonly state: BattleState;
      readonly snapshot: BattleSnapshot;
      readonly reason:
        | "missingCombatant"
        | "cleanupFrameMissing"
        | "effectStillActive";
      readonly message: string;
    };

export function resolveFlySpeedGrantEndFallCleanup(input: {
  readonly state: BattleState;
  readonly targetId: CombatantId;
  readonly witness: FlySpeedGrantEndFallWitness;
}): FlySpeedGrantEndFallWitnessResult {
  const target = input.state.combatants.get(input.targetId);
  if (target === undefined) {
    return {
      tag: "invalid",
      state: input.state,
      snapshot: snapshotBattle(input.state),
      reason: "missingCombatant",
      message: "Fly Speed end-fall witness target is not in this battle.",
    };
  }
  const cleanup = flySpeedGrantEndFallCleanupFrame(input.state, input.targetId);
  if (cleanup === null) {
    return {
      tag: "invalid",
      state: input.state,
      snapshot: snapshotBattle(input.state),
      reason: "cleanupFrameMissing",
      message:
        "Fly Speed end-fall witness requires a pending cleanup frame emitted by Fly effect cleanup.",
    };
  }
  const cleanupFrame = cleanup.frame;
  /* v8 ignore start -- Malformed internal state: cleanup frames are emitted only after the ended Fly Speed grant has been removed, so a frame retaining that exact effect contradicts the cleanup transition. */
  if (target.activeEffects.includes(cleanupFrame.endedEffect)) {
    return {
      tag: "invalid",
      state: input.state,
      snapshot: snapshotBattle(input.state),
      reason: "effectStillActive",
      message:
        "Fly Speed end-fall witness can only resolve after the emitted Fly effect cleanup removed the ended grant.",
    };
  }
  /* v8 ignore stop */
  const cleanedState = battleStateWithoutInterruptStackFrame(
    input.state,
    cleanup.frameIndex,
  );
  if (input.witness.kind === "notAloft") {
    return {
      tag: "notAloft",
      state: cleanedState,
      snapshot: snapshotBattle(cleanedState),
      targetId: input.targetId,
      endedEffect: cleanupFrame.endedEffect,
    };
  }
  if (input.witness.kind === "canStopFall") {
    return {
      tag: "canStopFall",
      state: cleanedState,
      snapshot: snapshotBattle(cleanedState),
      targetId: input.targetId,
      endedEffect: cleanupFrame.endedEffect,
      reason: input.witness.reason,
    };
  }
  const reaction = openCreatureFallsInterruptWindow({
    state: cleanedState,
    fallingCreatureId: input.targetId,
    reactionSpellTargetFacts: input.witness.reactionSpellTargetFacts,
  });
  return {
    tag: "falls",
    state: reaction.tag === "invalid" ? cleanedState : reaction.state,
    snapshot: reaction.snapshot,
    targetId: input.targetId,
    endedEffect: cleanupFrame.endedEffect,
    reaction,
  };
}

function flySpeedGrantEndFallCleanupFrame(
  state: BattleState,
  targetId: CombatantId,
): {
  readonly frameIndex: number;
  readonly frame: Extract<
    BattleInterruptFrame,
    { readonly kind: "flySpeedGrantEndFallCleanup" }
  >;
} | null {
  for (let index = state.interruptStack.length - 1; index >= 0; index -= 1) {
    const frame = state.interruptStack[index];
    if (
      frame?.kind === "flySpeedGrantEndFallCleanup" &&
      frame.targetId === targetId
    ) {
      return { frameIndex: index, frame };
    }
  }
  return null;
}

export function resolveFeatherFallLanding(input: {
  readonly state: BattleState;
  readonly targetId: CombatantId;
}): BattleFeatherFallLandingResult {
  const target = input.state.combatants.get(input.targetId);
  if (target === undefined) {
    return {
      tag: "invalid",
      state: input.state,
      snapshot: snapshotBattle(input.state),
      reason: "missingCombatant",
      message: "Feather Fall landing target is not in this battle.",
    };
  }
  return resolveFeatherFallLandingForTarget(input.state, target);
}

function resolveFeatherFallLandingForTarget(
  state: BattleState,
  target: BattleCreatureState,
): Exclude<BattleFeatherFallLandingResult, { readonly tag: "invalid" }> {
  const cleanup = featherFallLandingCleanupForCombatant(target);
  if (cleanup.tag === "unmitigated") {
    return {
      tag: "unmitigated",
      state,
      snapshot: snapshotBattle(state),
      targetId: target.combatantId,
      fallDamagePrevented: false,
      fallingPronePrevented: false,
    };
  }
  const nextState = {
    ...state,
    combatants: new Map(state.combatants).set(
      target.combatantId,
      cleanup.combatant,
    ),
  };
  const result = {
    tag: "mitigated",
    state: nextState,
    snapshot: snapshotBattle(nextState),
    targetId: target.combatantId,
    fallDamagePrevented: true,
    fallingPronePrevented: true,
  } as const satisfies BattleFeatherFallLandingResult;
  const routeEvents = battleReducerRouteForFeatherFallLanding(result);
  return routeEvents === undefined ? result : { ...result, routeEvents };
}

export function resolveFallDamageLanding(input: {
  readonly state: BattleState;
  readonly targetId: CombatantId;
  readonly fallDamage: BattleRawFallDamage;
}): BattleFallDamageLandingResult {
  const target = input.state.combatants.get(input.targetId);
  if (target === undefined) {
    return {
      tag: "invalid",
      state: input.state,
      snapshot: snapshotBattle(input.state),
      reason: "missingCombatant",
      message: "Fall damage landing target is not in this battle.",
    };
  }
  const featherFall = resolveFeatherFallLandingForTarget(input.state, target);
  const mitigationFrameIndex = fallDamageLandingMitigationFrameIndex(
    featherFall.state,
    input.targetId,
  );
  const mitigationFrame =
    mitigationFrameIndex === null
      ? null
      : featherFall.state.interruptStack[mitigationFrameIndex];
  const slowFallReductionAmount =
    mitigationFrame?.kind === "fallDamageLandingMitigation"
      ? Number(mitigationFrame.reductionAmount)
      : 0;
  const effectiveFallDamageNumber = featherFall.fallDamagePrevented
    ? 0
    : Math.max(0, Number(input.fallDamage.amount) - slowFallReductionAmount);
  const withoutMitigationFrame =
    mitigationFrameIndex === null
      ? featherFall.state
      : battleStateWithoutInterruptStackFrame(
          featherFall.state,
          mitigationFrameIndex,
        );
  const landedTarget = withoutMitigationFrame.combatants.get(input.targetId);
  const afterFallingProne =
    landedTarget === undefined || effectiveFallDamageNumber === 0
      ? withoutMitigationFrame
      : {
          ...withoutMitigationFrame,
          combatants: new Map(withoutMitigationFrame.combatants).set(
            input.targetId,
            battleCreatureAfterFallingProne(landedTarget),
          ),
        };
  const effectiveFallDamage = toDamageAmount(effectiveFallDamageNumber);
  return {
    tag: "landed",
    state: afterFallingProne,
    snapshot: snapshotBattle(afterFallingProne),
    targetId: input.targetId,
    incomingFallDamage: input.fallDamage.amount,
    effectiveFallDamage,
    fallDamagePrevented: effectiveFallDamage === 0,
    fallingPronePrevented: effectiveFallDamage === 0,
    slowFallReductionAmount: toDamageAmount(slowFallReductionAmount),
    featherFallMitigated: featherFall.tag === "mitigated",
  };
}

function fallDamageLandingMitigationFrameIndex(
  state: BattleState,
  targetId: CombatantId,
): number | null {
  for (let index = state.interruptStack.length - 1; index >= 0; index -= 1) {
    const frame = state.interruptStack[index];
    if (
      frame?.kind === "fallDamageLandingMitigation" &&
      frame.targetId === targetId
    ) {
      return index;
    }
  }
  return null;
}

function battleStateWithoutInterruptStackFrame(
  state: BattleState,
  frameIndex: number,
): BattleState {
  return {
    ...state,
    interruptStack: [
      ...state.interruptStack.slice(0, frameIndex),
      ...state.interruptStack.slice(frameIndex + 1),
    ],
  };
}

function battleCreatureAfterFallingProne(
  combatant: BattleCreatureState,
): BattleCreatureState {
  return battleCreatureStateWithKnockOutPreservedConditions(
    combatant,
    applyCondition(combatant.conditions, "prone"),
  );
}
