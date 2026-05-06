import { describe, expect, test } from "vitest"

import { battleSceneFromSnapshot, STATIC_BATTLE_CUES } from "./battle-snapshot-scene.ts"
import { STAT_BLOCK_BATTLE_DEMO_META, STAT_BLOCK_BATTLE_DEMO_SNAPSHOT } from "./stat-block-battle-demo.ts"

describe("battle snapshot scene projection", () => {
  test("active battle page consumes BattleSnapshot fields", () => {
    const scene = battleSceneFromSnapshot(STAT_BLOCK_BATTLE_DEMO_SNAPSHOT, STAT_BLOCK_BATTLE_DEMO_META)

    expect(scene).toMatchObject({
      round: 1,
      activeCreatureId: "warrior",
      phase: { type: "activeTurn" },
      creatures: [
        {
          id: "warrior",
          name: "Goblin Warrior",
          team: "blue",
          currentHp: 10,
          maxHp: 10,
          tempHp: 0,
          isActive: true
        },
        {
          id: "skeleton",
          name: "Skeleton",
          team: "red",
          currentHp: 13,
          maxHp: 13,
          isActive: false
        }
      ]
    })
    expect(STAT_BLOCK_BATTLE_DEMO_SNAPSHOT.acts.map((act) => act.label)).toEqual(
      expect.arrayContaining(["Attack", "Attack", "Nimble Escape", "Move", "End Turn"])
    )
    expect(STAT_BLOCK_BATTLE_DEMO_SNAPSHOT.turn).toMatchObject({
      actionResources: [{ kind: "action", source: "turn" }],
      bonusActionAvailable: true
    })
    expect(STATIC_BATTLE_CUES.creatureCues).toEqual({})
  })
})
