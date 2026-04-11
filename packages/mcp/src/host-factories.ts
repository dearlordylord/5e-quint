import { createActor } from "xstate";

import { battleMachine } from "@dnd/core/battle-machine.ts";
import { creatureMachine } from "@dnd/core/machine.ts";
import type { DndMachineInput } from "@dnd/core/machine-types.ts";
import { classLevel } from "@dnd/core/types.ts";

import type { BattleActor, DndActor } from "./server-shared.ts";

export const DEMO_ACTOR_INPUT: DndMachineInput = {
  maxHp: 44,
  fighterLevel: classLevel(5),
  baseWalkSpeed: 30,
  effectiveSpeed: 30,
};
const DEMO_STARTING_DAMAGE = 10;

export type CreatureActionHost = {
  readonly scope: "creature";
  readonly actor: DndActor;
};

export type BattleActionHost = {
  readonly scope: "battle";
  readonly actor: BattleActor;
};

export function createDemoActor(
  input: DndMachineInput = DEMO_ACTOR_INPUT,
): DndActor {
  const actor = createActor(creatureMachine, { input });
  actor.start();
  actor.send({
    type: "TAKE_DAMAGE",
    amount: DEMO_STARTING_DAMAGE,
    damageType: "slashing",
    resistances: new Set(),
    vulnerabilities: new Set(),
    immunities: new Set(),
    isCritical: false,
  });
  return actor;
}

export function createDemoHost(
  input: DndMachineInput = DEMO_ACTOR_INPUT,
): CreatureActionHost {
  return { scope: "creature", actor: createDemoActor(input) };
}

export function createBattleHost(actor?: BattleActor): BattleActionHost {
  const battleActor = actor ?? createActor(battleMachine);
  battleActor.start();
  return { scope: "battle", actor: battleActor };
}
