import { createActor } from "xstate"

import { battleMachine } from "#/battle-machine.ts"
import type { BattleContext } from "#/battle-machine-types.ts"
import { FIREBALL_BATTLE, FIREBALL_BATTLE_META } from "#/demo/fireball-battle.ts"

import { deriveSnapshot, type ScenarioMeta, type SceneSnapshot } from "./scene-snapshot.ts"

export const META: ScenarioMeta = FIREBALL_BATTLE_META

export function replayTo(eventCount: number): BattleContext {
  const actor = createActor(battleMachine)
  actor.start()
  for (let i = 0; i < eventCount; i++) actor.send(FIREBALL_BATTLE[i])
  return actor.getSnapshot().context
}

export function snapshotAt(eventCount: number, aoeEventIndex: string | null = null): SceneSnapshot {
  return deriveSnapshot(replayTo(eventCount), META, aoeEventIndex)
}
