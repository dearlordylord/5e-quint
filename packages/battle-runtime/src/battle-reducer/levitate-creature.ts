// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-levitated-creature
// Levitate creature-branch state and caller-witnessed altitude controls.

import { movementFeet, type MovementFeet } from "@dnd/shared/types";
import type { SpellRecord } from "@dnd/surface/surface/types";
import type { CombatantId } from "../identity.ts";
import type {
  BattleCreatureState,
  BattleLevitateAltitudeChangeHole,
  BattleLevitateAltitudeDirection,
  BattleLevitateInitialRiseHole,
  BattleLevitatedMovementFact,
  BattleMovementFillValue,
  BattleState,
  BattleTargetSpatialFact,
  SpellLevitatedCreatureActiveEffect,
} from "../battle-reducer.ts";
import {
  LEVITATE_ALTITUDE_CHANGE_HOLE_ID,
  LEVITATE_ALTITUDE_CHANGE_HOLE_INSTANCE,
  LEVITATE_INITIAL_RISE_HOLE_ID,
  LEVITATE_INITIAL_RISE_HOLE_INSTANCE,
} from "./battle-runtime-protocol.ts";

export const LEVITATE_INITIAL_RISE_FEET = movementFeet(20);
export const LEVITATE_ALTITUDE_CONTROL_FEET = movementFeet(20);

export function activeLevitatedCreatureEffect(
  combatant: BattleCreatureState | undefined,
  source?: {
    readonly sourceCombatantId: CombatantId;
    readonly sourceSpellId: SpellRecord["id"];
  },
): SpellLevitatedCreatureActiveEffect | undefined {
  return combatant?.activeEffects.find(
    (effect): effect is SpellLevitatedCreatureActiveEffect =>
      effect.kind === "spellLevitatedCreature" &&
      (source === undefined ||
        (effect.sourceCombatantId === source.sourceCombatantId &&
          effect.sourceSpellId === source.sourceSpellId)),
  );
}

export function activeLevitatedCreatureTargetsControlledBy(
  state: BattleState,
  sourceCombatantId: CombatantId,
): readonly {
  readonly targetId: CombatantId;
  readonly effect: SpellLevitatedCreatureActiveEffect;
}[] {
  return [...state.combatants].flatMap(([targetId, combatant]) => {
    const effects = combatant.activeEffects.filter(
      (effect): effect is SpellLevitatedCreatureActiveEffect =>
        targetId !== sourceCombatantId &&
        effect.kind === "spellLevitatedCreature" &&
        effect.sourceCombatantId === sourceCombatantId,
    );
    return effects.map((effect) => ({ targetId, effect }));
  });
}

export function levitateAltitudeChangeHole(input: {
  readonly actorId: CombatantId;
  readonly targetId: CombatantId;
  readonly maxDistanceFeet: MovementFeet;
}): BattleLevitateAltitudeChangeHole {
  return {
    kind: "levitateAltitudeChange",
    holeInstanceKey: LEVITATE_ALTITUDE_CHANGE_HOLE_INSTANCE,
    holeId: LEVITATE_ALTITUDE_CHANGE_HOLE_ID,
    label: "Levitate altitude change",
    actorId: input.actorId,
    targetId: input.targetId,
    maxDistanceFeet: input.maxDistanceFeet,
    directions: ["up", "down"],
    requiresTargetWithinRangeFact: true,
  };
}

export function levitateInitialRiseHole(input: {
  readonly actorId: CombatantId;
  readonly targetId: CombatantId;
  readonly maxDistanceFeet: MovementFeet;
}): BattleLevitateInitialRiseHole {
  return {
    kind: "levitateInitialRise",
    holeInstanceKey: LEVITATE_INITIAL_RISE_HOLE_INSTANCE,
    holeId: LEVITATE_INITIAL_RISE_HOLE_ID,
    label: "Levitate initial rise",
    actorId: input.actorId,
    targetId: input.targetId,
    maxDistanceFeet: input.maxDistanceFeet,
  };
}

export function altitudeAfterChange(
  altitudeFeet: MovementFeet,
  change: {
    readonly direction: BattleLevitateAltitudeDirection;
    readonly distanceFeet: MovementFeet;
  },
): MovementFeet {
  const next =
    change.direction === "up"
      ? Number(altitudeFeet) + Number(change.distanceFeet)
      : Math.max(0, Number(altitudeFeet) - Number(change.distanceFeet));
  return movementFeet(next);
}

export function updateLevitatedCreatureAltitude(input: {
  readonly state: BattleState;
  readonly targetId: CombatantId;
  readonly sourceCombatantId: CombatantId;
  readonly sourceSpellId: SpellRecord["id"];
  readonly change: {
    readonly direction: BattleLevitateAltitudeDirection;
    readonly distanceFeet: MovementFeet;
  };
}): BattleState {
  const target = input.state.combatants.get(input.targetId);
  const effect = activeLevitatedCreatureEffect(target, input);
  if (target === undefined || effect === undefined) {
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

export function levitatedTargetWithinSpellRangeFactPresent(input: {
  readonly facts: readonly BattleTargetSpatialFact[];
  readonly sourceCombatantId: CombatantId;
  readonly sourceSpellId: SpellRecord["id"];
  readonly targetId: CombatantId;
  readonly rangeFeet: MovementFeet;
}): boolean {
  return input.facts.some(
    (fact) =>
      fact.kind === "levitatedTargetWithinSpellRange" &&
      fact.sourceCombatantId === input.sourceCombatantId &&
      fact.sourceSpellId === input.sourceSpellId &&
      fact.targetId === input.targetId &&
      fact.rangeFeet === input.rangeFeet,
  );
}

export function validateLevitatedMovementFact(input: {
  readonly combatant: BattleCreatureState;
  readonly fact: BattleLevitatedMovementFact | undefined;
  readonly speedKind: BattleMovementFillValue["speedKind"];
  readonly movementCostFeet: BattleMovementFillValue["movementCostFeet"];
  readonly areaExtraCostFeet: MovementFeet;
}): string | null {
  const effect = activeLevitatedCreatureEffect(input.combatant);
  if (effect === undefined) {
    return input.fact === undefined
      ? null
      : "Levitated movement witness was supplied for a target that is not levitated.";
  }
  if (input.fact === undefined) {
    return "Levitated targets require a fixed-object or surface-within-reach movement witness.";
  }
  if (
    input.fact.sourceCombatantId !== effect.sourceCombatantId ||
    input.fact.sourceSpellId !== effect.sourceSpellId
  ) {
    return "Levitated movement witness does not match the active Levitate effect.";
  }
  if (!input.fact.fixedObjectOrSurfaceWithinReach) {
    return "Levitated movement requires a fixed object or surface within reach.";
  }
  const altitudeChange = input.fact.altitudeChange;
  if (altitudeChange === undefined) {
    return null;
  }
  if (
    altitudeChange.distanceFeet <= 0 ||
    altitudeChange.distanceFeet > effect.maxAltitudeChangeFeet ||
    !Number.isInteger(altitudeChange.distanceFeet)
  ) {
    return "Levitated movement altitude change must be a positive whole number no greater than the spell limit.";
  }
  const expectedMovementCostFeet = movementFeet(
    Number(altitudeChange.distanceFeet) *
      (input.speedKind === "climb" ? 1 : 2) +
      Number(input.areaExtraCostFeet),
  );
  if (input.movementCostFeet !== expectedMovementCostFeet) {
    return "Levitated movement must spend the altitude-change distance as climbing, plus any area movement costs.";
  }
  return null;
}
