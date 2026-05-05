import {
  battleCombatantSide,
  battleCreatureInitFromStatBlock,
  battleId,
  type BattleSnapshot,
  type BattleState,
  combatantId,
  initiativeScore,
  snapshotBattle,
  startBattle
} from "@dnd/battle-runtime"
import { buildStatBlockCatalog, srdStatBlockCollection } from "@dnd/surface/surface/stat-block-catalog"
import { Either } from "effect"

import type { PromotedBattleSceneMeta } from "./battle-snapshot-scene.ts"

const warriorId = combatantId("warrior")
const skeletonId = combatantId("skeleton")
const statBlockCatalog = requirePromotedDemoStatBlockCatalog()

export const PROMOTED_BATTLE_DEMO_META: PromotedBattleSceneMeta = {
  names: {
    [warriorId]: "Goblin Warrior",
    [skeletonId]: "Skeleton"
  },
  teams: { blue: [warriorId], red: [skeletonId] },
  gridPositions: {
    [warriorId]: { row: 5, col: 3 },
    [skeletonId]: { row: 5, col: 7 }
  }
}

function requirePromotedDemoStatBlockCatalog() {
  const result = buildStatBlockCatalog({ collections: [srdStatBlockCollection] })
  if (result.tag !== "ok") {
    throw new Error("Promoted battle demo Stat Block catalog is invalid.")
  }
  return result.catalog
}

export const PROMOTED_BATTLE_DEMO_STATE: BattleState = requirePromotedBattleDemoState()
export const PROMOTED_BATTLE_DEMO_SNAPSHOT: BattleSnapshot = snapshotBattle(PROMOTED_BATTLE_DEMO_STATE)

function requirePromotedBattleDemoState(): BattleState {
  const state = startBattle({
    battleId: battleId("battle:promoted-demo"),
    combatants: [
      battleCreatureInitFromStatBlock({
        combatantId: warriorId,
        statBlock: statBlockCatalog.requireStatBlock("stat_block_goblin_warrior"),
        initiative: initiativeScore(18),
        side: battleCombatantSide("party")
      }),
      battleCreatureInitFromStatBlock({
        combatantId: skeletonId,
        statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
        initiative: initiativeScore(12),
        side: battleCombatantSide("opposition")
      })
    ]
  })
  if (Either.isLeft(state)) {
    throw new Error(`Promoted battle demo fixture is invalid: ${state.left.message}`)
  }
  return state.right
}
