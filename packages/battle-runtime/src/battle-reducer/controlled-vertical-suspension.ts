// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-levitated-creature
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.LEVITATED_CREATURE_LIFECYCLE
// ControlledVerticalSuspension creature-branch state and caller-witnessed altitude controls.

import { movementFeet, type MovementFeet } from "@dnd/shared/types";
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import type {
  BattleEffectExecutionRef,
  BattleProcedureExecutionRef,
  CombatantId,
} from "../identity.ts";
import type {
  BattleCreatureState,
  BattleControlledVerticalSuspensionAltitudeChangeHole,
  BattleVerticalSuspensionAltitudeDirection,
  BattleControlledVerticalSuspensionInitialRiseHole,
  BattleControlledVerticalSuspensionMovementFact,
  BattleMovementPath,
  BattleState,
  BattleTargetSpatialFact,
  ControlledVerticalSuspensionActiveEffect,
} from "../battle-state-execution.ts";
import { Match } from "effect";
import { spellProcedureBoundToActiveEffect } from "./spell-active-effect-binding.ts";
import {
  battleMovementPathIsClimbing,
  plainStepMovementActivity,
  type BattleMovementPathCost,
} from "./movement-path.ts";

const CONTROLLED_VERTICAL_SUSPENSION_ALTITUDE_CHANGE_HOLE_ID = holeId(
  "battle:controlled-vertical-suspension:altitude-change",
);
const CONTROLLED_VERTICAL_SUSPENSION_ALTITUDE_CHANGE_HOLE_INSTANCE =
  holeInstanceKey("battle:controlled-vertical-suspension:altitude-change");
export const CONTROLLED_VERTICAL_SUSPENSION_INITIAL_RISE_HOLE_ID = holeId(
  "battle:controlled-vertical-suspension:initial-rise",
);
const CONTROLLED_VERTICAL_SUSPENSION_INITIAL_RISE_HOLE_INSTANCE =
  holeInstanceKey("battle:controlled-vertical-suspension:initial-rise");

export const CONTROLLED_VERTICAL_SUSPENSION_INITIAL_RISE_FEET =
  movementFeet(20);
export const CONTROLLED_VERTICAL_SUSPENSION_ALTITUDE_CONTROL_FEET =
  movementFeet(20);

export function activeControlledVerticalSuspensionEffect(
  combatant: BattleCreatureState | undefined,
  occurrence?: {
    readonly effectRef: BattleEffectExecutionRef;
  },
): ControlledVerticalSuspensionActiveEffect | undefined {
  return combatant?.activeEffects.find(
    (effect): effect is ControlledVerticalSuspensionActiveEffect =>
      effect.kind === "controlledVerticalSuspension" &&
      (occurrence === undefined || effect.effectRef === occurrence.effectRef),
  );
}

export function activeControlledVerticalSuspensionTargetsControlledBy(
  state: BattleState,
  sourceCombatantId: CombatantId,
): readonly {
  readonly targetId: CombatantId;
  readonly effect: ControlledVerticalSuspensionActiveEffect;
}[] {
  return [...state.combatants].flatMap(([targetId, combatant]) => {
    const effects = combatant.activeEffects.filter(
      (effect): effect is ControlledVerticalSuspensionActiveEffect =>
        targetId !== sourceCombatantId &&
        effect.kind === "controlledVerticalSuspension" &&
        effect.sourceCombatantId === sourceCombatantId,
    );
    return effects.map((effect) => ({ targetId, effect }));
  });
}

export function controlledVerticalSuspensionAltitudeChangeHole(input: {
  readonly actorId: CombatantId;
  readonly targetId: CombatantId;
  readonly effectRef: BattleEffectExecutionRef;
  readonly maxDistanceFeet: MovementFeet;
}): BattleControlledVerticalSuspensionAltitudeChangeHole {
  return {
    kind: "controlledVerticalSuspensionAltitudeChange",
    effectRef: input.effectRef,
    holeInstanceKey:
      CONTROLLED_VERTICAL_SUSPENSION_ALTITUDE_CHANGE_HOLE_INSTANCE,
    holeId: CONTROLLED_VERTICAL_SUSPENSION_ALTITUDE_CHANGE_HOLE_ID,
    label: "ControlledVerticalSuspension altitude change",
    actorId: input.actorId,
    targetId: input.targetId,
    maxDistanceFeet: input.maxDistanceFeet,
    directions: ["up", "down"],
    requiresTargetWithinRangeFact: true,
  };
}

export function controlledVerticalSuspensionInitialRiseHole(input: {
  readonly actorId: CombatantId;
  readonly targetId: CombatantId;
  readonly maxDistanceFeet: MovementFeet;
}): BattleControlledVerticalSuspensionInitialRiseHole {
  return {
    kind: "controlledVerticalSuspensionInitialRise",
    holeInstanceKey: CONTROLLED_VERTICAL_SUSPENSION_INITIAL_RISE_HOLE_INSTANCE,
    holeId: CONTROLLED_VERTICAL_SUSPENSION_INITIAL_RISE_HOLE_ID,
    label: "ControlledVerticalSuspension initial rise",
    actorId: input.actorId,
    targetId: input.targetId,
    maxDistanceFeet: input.maxDistanceFeet,
  };
}

export function altitudeAfterChange(
  altitudeFeet: MovementFeet,
  change: {
    readonly direction: BattleVerticalSuspensionAltitudeDirection;
    readonly distanceFeet: MovementFeet;
  },
): MovementFeet {
  const next =
    change.direction === "up"
      ? Number(altitudeFeet) + Number(change.distanceFeet)
      : Math.max(0, Number(altitudeFeet) - Number(change.distanceFeet));
  return movementFeet(next);
}

export function updateControlledVerticalSuspensionAltitude(input: {
  readonly state: BattleState;
  readonly targetId: CombatantId;
  readonly effectRef: BattleEffectExecutionRef;
  readonly sourceCombatantId: CombatantId;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly change: {
    readonly direction: BattleVerticalSuspensionAltitudeDirection;
    readonly distanceFeet: MovementFeet;
  };
}): BattleState {
  const target = input.state.combatants.get(input.targetId);
  const effect = activeControlledVerticalSuspensionEffect(target, input);
  if (
    target === undefined ||
    effect === undefined ||
    effect.sourceCombatantId !== input.sourceCombatantId ||
    effect.sourceProcedureRef !== input.sourceProcedureRef
  ) {
    return input.state;
  }
  const nextEffect = {
    ...effect,
    altitudeFeet: altitudeAfterChange(effect.altitudeFeet, input.change),
  };
  return {
    ...input.state,
    combatants: new Map(input.state.combatants).set(input.targetId, {
      ...target,
      activeEffects: target.activeEffects.map((candidate) =>
        candidate === effect ? nextEffect : candidate,
      ),
    }),
  };
}

export function controlledVerticalSuspensionTargetWithinRangeFactPresent(input: {
  readonly facts: readonly BattleTargetSpatialFact[];
  readonly effectRef: BattleEffectExecutionRef;
  readonly sourceCombatantId: CombatantId;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly targetId: CombatantId;
  readonly rangeFeet: MovementFeet;
}): boolean {
  return input.facts.some(
    (fact) =>
      fact.kind === "controlledVerticalSuspensionTargetWithinRange" &&
      fact.effectRef === input.effectRef &&
      fact.sourceCombatantId === input.sourceCombatantId &&
      fact.sourceProcedureRef === input.sourceProcedureRef &&
      fact.targetId === input.targetId &&
      fact.rangeFeet === input.rangeFeet,
  );
}

export function validateControlledVerticalSuspensionMovementFact(input: {
  readonly state: BattleState;
  readonly combatant: BattleCreatureState;
  readonly fact: BattleControlledVerticalSuspensionMovementFact | undefined;
  readonly path: BattleMovementPath;
  readonly pathCost: BattleMovementPathCost;
}): string | null {
  return Match.value(
    controlledVerticalSuspensionMovementEffectAdmission(
      input.state,
      input.combatant,
      input.fact,
    ),
  ).pipe(
    Match.discriminatorsExhaustive("tag")({
      notApplicable: () => null,
      invalid: ({ message }) => message,
      matched: ({ effect, fact }) =>
        validateMatchedControlledVerticalSuspensionMovementFact(
          input,
          effect,
          fact,
        ),
    }),
  );
}

type ControlledVerticalSuspensionMovementEffectAdmission =
  | { readonly tag: "notApplicable" }
  | { readonly tag: "invalid"; readonly message: string }
  | {
      readonly tag: "matched";
      readonly effect: ControlledVerticalSuspensionActiveEffect & {
        readonly maxAltitudeChangeFeet: MovementFeet;
      };
      readonly fact: BattleControlledVerticalSuspensionMovementFact;
    };

function controlledVerticalSuspensionMovementEffectAdmission(
  state: BattleState,
  combatant: BattleCreatureState,
  fact: BattleControlledVerticalSuspensionMovementFact | undefined,
): ControlledVerticalSuspensionMovementEffectAdmission {
  const activeEffect = activeControlledVerticalSuspensionEffect(combatant);
  if (fact === undefined) {
    return activeEffect === undefined
      ? { tag: "notApplicable" }
      : {
          tag: "invalid",
          message:
            "ControlledVerticalSuspension targets require a fixed-object or surface-within-reach movement witness.",
        };
  }
  const effect = activeControlledVerticalSuspensionEffect(combatant, fact);
  if (effect === undefined) {
    return {
      tag: "invalid",
      message:
        controlledVerticalSuspensionMovementEffectMismatchMessage(activeEffect),
    };
  }
  /* v8 ignore start -- @preserve -- Stale ControlledVerticalSuspension witness: discovery copies the active effect's source combatant and procedure identity into the movement fact. */
  if (
    fact.sourceCombatantId !== effect.sourceCombatantId ||
    fact.sourceProcedureRef !== effect.sourceProcedureRef
  ) {
    return {
      tag: "invalid",
      message:
        "ControlledVerticalSuspension movement witness does not match the active ControlledVerticalSuspension effect.",
    };
  }
  /* v8 ignore stop -- @preserve */
  const sourceProcedure = spellProcedureBoundToActiveEffect(state, effect);
  return sourceProcedure?.procedure === "controlledVerticalSuspension"
    ? {
        tag: "matched",
        effect: {
          ...effect,
          maxAltitudeChangeFeet: sourceProcedure.maxAltitudeChangeFeet,
        },
        fact,
      }
    : {
        tag: "invalid",
        message:
          "ControlledVerticalSuspension movement source procedure is unavailable.",
      };
}

function controlledVerticalSuspensionMovementEffectMismatchMessage(
  activeEffect: ControlledVerticalSuspensionActiveEffect | undefined,
): string {
  return activeEffect === undefined
    ? "ControlledVerticalSuspension movement witness was supplied for a target that is not controlledVerticalSuspension."
    : "ControlledVerticalSuspension movement witness does not match the active ControlledVerticalSuspension effect.";
}

/**
 * SRD 5.2.1 Levitate: the target "can move only by pushing or pulling against
 * a fixed object or surface within reach ..., which allows it to move as if it
 * were climbing", and its altitude can change by up to the spell's limit. So
 * every segment of its path is climbing, and the altitude change is part of
 * that path.
 */
function validateMatchedControlledVerticalSuspensionMovementFact(
  input: {
    readonly combatant: BattleCreatureState;
    readonly path: BattleMovementPath;
    readonly pathCost: BattleMovementPathCost;
  },
  effect: ControlledVerticalSuspensionActiveEffect & {
    readonly maxAltitudeChangeFeet: MovementFeet;
  },
  fact: BattleControlledVerticalSuspensionMovementFact,
): string | null {
  /* v8 ignore start -- @preserve -- Malformed ControlledVerticalSuspension witness: movement discovery publishes altitude movement only when a fixed object or surface is within reach. */
  if (!fact.fixedObjectOrSurfaceWithinReach) {
    return "ControlledVerticalSuspension movement requires a fixed object or surface within reach.";
  }
  /* v8 ignore stop -- @preserve */
  if (plainStepMovementActivity(input.combatant) === "crawling") {
    return "A Prone ControlledVerticalSuspension target can't move along a path: it can only right itself (ASSUMPTIONS.md A61).";
  }
  if (!battleMovementPathIsClimbing(input.path)) {
    return "ControlledVerticalSuspension movement must climb along every segment of its path.";
  }
  return fact.altitudeChange === undefined
    ? null
    : controlledVerticalSuspensionAltitudeChangeIssue(
        fact.altitudeChange,
        effect.maxAltitudeChangeFeet,
        input.pathCost,
      );
}

/** The altitude change must fit the spell's limit and the path climbed. */
function controlledVerticalSuspensionAltitudeChangeIssue(
  altitudeChange: NonNullable<
    BattleControlledVerticalSuspensionMovementFact["altitudeChange"]
  >,
  maxAltitudeChangeFeet: MovementFeet,
  pathCost: BattleMovementPathCost,
): string | null {
  /* v8 ignore start -- @preserve -- Malformed raw altitude change: the ControlledVerticalSuspension movement choice offers positive whole feet no greater than the active spell limit or the path climbed. */
  if (
    altitudeChange.distanceFeet <= 0 ||
    altitudeChange.distanceFeet > maxAltitudeChangeFeet ||
    !Number.isInteger(altitudeChange.distanceFeet) ||
    Number(altitudeChange.distanceFeet) > Number(pathCost.distanceFeet)
  ) {
    return "ControlledVerticalSuspension movement altitude change must be a positive whole number no greater than the spell limit or the distance climbed.";
  }
  /* v8 ignore stop -- @preserve */
  return null;
}
