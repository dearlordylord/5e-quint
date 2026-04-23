import { Option } from "effect";
import { currentActing } from "@dnd/shared/initiative-algebra";
import type { CreatureId } from "@dnd/shared/types";

import { coreAttackTargetHole } from "#/reducer-core-attack-holes.ts";
import { canUseCoreAttack } from "#/reducer-core-acts.ts";
import { projectPhaseHoles } from "#/runtime-holes.ts";
import type { State } from "#/reducer-state.ts";
import { getCurrentSliceSupportedActivationUnit } from "#/reducer-support.ts";
import { holeStepKey } from "#/reducer-types.ts";
import type { AvailableAct } from "#/reducer-types.ts";
import type { UnitRecord } from "@dnd/prototype-content-surface/surface/types";

type DiscoverableActionCantrip = UnitRecord & {
  readonly kind: "spell";
  readonly mechanics: {
    readonly family: "activation";
    readonly level: 0;
    readonly castingTime: { readonly kind: "action" };
    readonly phases: readonly [unknown];
  };
};

// Current discovery slice only surfaces action cantrips.
// marked for review: this is fishy; we have bonus action stuff too, and bonus action things can be cast using an action. we also have spell levels. taxonomy doesn't seem to hold well
function getDiscoverableActionCantrip(
  unit: UnitRecord,
): DiscoverableActionCantrip | null {
  const supportedUnit = getCurrentSliceSupportedActivationUnit(unit);
  if (Option.isNone(supportedUnit)) {
    return null;
  }
  const unitValue = supportedUnit.value;

  if (unitValue.kind !== "spell") {
    return null;
  }

  if (
    unitValue.mechanics.level !== 0 ||
    unitValue.mechanics.castingTime.kind !== "action"
  ) {
    return null;
  }

  return unitValue as DiscoverableActionCantrip;
}

function discoverUnitBackedActs(
  state: State,
  actorId: CreatureId,
): ReadonlyArray<AvailableAct> {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return [];
  }

  return actor.units.flatMap((unit) => {
    const cantripUnit = getDiscoverableActionCantrip(unit);
    if (cantripUnit === null) {
      return [];
    }

    const [phase] = cantripUnit.mechanics.phases;
    return [
      {
        subject: {
          tag: "unit",
          actorId,
          unitId: cantripUnit.id,
        },
        label: cantripUnit.name,
        summary: cantripUnit.description,
        initialHoles: projectPhaseHoles(phase, holeStepKey("activation:0")),
      },
    ];
  });
}

export function discoverAvailableActs(
  state: State,
): ReadonlyArray<AvailableAct> {
  const actorId = currentActing(state.initiative);
  const acts: Array<AvailableAct> = [];

  if (
    canUseCoreAttack(state) &&
    [...state.combatants.keys()].some((id) => id !== actorId)
  ) {
    acts.push({
      subject: {
        tag: "coreAct",
        actorId,
        act: "attack",
      },
      label: "Attack",
      summary: "Make an attack.",
      initialHoles: [coreAttackTargetHole()],
    });
  }

  acts.push({
    subject: {
      tag: "coreAct",
      actorId,
      act: "endTurn",
    },
    label: "End Turn",
    summary: "End the current turn.",
    initialHoles: [],
  });

  acts.push(...discoverUnitBackedActs(state, actorId));

  return acts;
}
