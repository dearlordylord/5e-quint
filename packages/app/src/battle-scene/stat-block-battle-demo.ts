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

const warriorId = combatantId("warrior")
const skeletonId = combatantId("skeleton")
const statBlockCatalog = requireStatBlockDemoCatalog()
const WARRIOR_INITIATIVE = 18
const SKELETON_INITIATIVE = 12

export type BattleSnapshotSceneMeta = {
  readonly names: Readonly<Record<string, string>>
  readonly gridPositions: Readonly<Partial<Record<string, { readonly row: number; readonly col: number }>>>
}

export const STAT_BLOCK_BATTLE_DEMO_META: BattleSnapshotSceneMeta = {
  names: {
    [warriorId]: "Goblin Warrior",
    [skeletonId]: "Skeleton"
  },
  gridPositions: {
    [warriorId]: { row: 5, col: 3 },
    [skeletonId]: { row: 5, col: 7 }
  }
}

function requireStatBlockDemoCatalog() {
  const result = buildStatBlockCatalog({ collections: [srdStatBlockCollection] })
  if (result.tag !== "ok") {
    throw new Error("Stat Block battle demo SRD catalog is invalid.")
  }
  return result.catalog
}

export const STAT_BLOCK_BATTLE_DEMO_STATE: BattleState = requireStatBlockBattleDemoState()
export const STAT_BLOCK_BATTLE_DEMO_SNAPSHOT: BattleSnapshot = snapshotBattle(STAT_BLOCK_BATTLE_DEMO_STATE)

function requireStatBlockBattleDemoState(): BattleState {
  const state = startBattle({
    battleId: battleId("battle:stat-block-demo"),
    combatants: [
      battleCreatureInitFromStatBlock({
        combatantId: warriorId,
        statBlock: statBlockCatalog.requireStatBlock("stat_block_goblin_warrior"),
        initiative: initiativeScore(WARRIOR_INITIATIVE),
        side: battleCombatantSide("party")
      }),
      battleCreatureInitFromStatBlock({
        combatantId: skeletonId,
        statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
        initiative: initiativeScore(SKELETON_INITIATIVE),
        side: battleCombatantSide("opposition")
      })
    ]
  })
  if (Either.isLeft(state)) {
    throw new Error(`Stat Block battle demo fixture is invalid: ${state.left.message}`)
  }
  return state.right
}
