import { type BattleState, snapshotBattle } from "@dnd/battle-runtime"
import { computeLayout } from "@dnd/core/battle-scene/layout.ts"
import { useMemo } from "react"

import { PageShell } from "#/components/PageShell.tsx"

import {
  type PromotedBattleSceneMeta,
  promotedBattleSceneSnapshot,
  STATIC_BATTLE_CUES
} from "./battle-snapshot-scene.ts"
import { BattleField } from "./BattleField.tsx"
import { InitiativeTracker } from "./InitiativeTracker.tsx"

export function BattlePage({ meta, state }: { state: BattleState; meta: PromotedBattleSceneMeta }) {
  const snapshot = useMemo(() => snapshotBattle(state), [state])
  const sceneSnapshot = useMemo(() => promotedBattleSceneSnapshot(snapshot, meta), [snapshot, meta])
  const layout = useMemo(() => computeLayout(sceneSnapshot, STATIC_BATTLE_CUES), [sceneSnapshot])
  const currentActor = snapshot.combatants.find((combatant) => combatant.combatantId === snapshot.currentActorId)

  return (
    <PageShell title="Battle Visualizer">
      <div className="flex flex-col items-center">
        <div className="sticky top-0 z-20 w-full bg-gray-900 border-b border-gray-800/50 px-3 py-3">
          <div className="w-full max-w-3xl mx-auto flex items-center gap-3 text-sm text-gray-200">
            <span className="text-amber-400 font-semibold">{currentActor?.displayName ?? snapshot.currentActorId}</span>
            <span className="text-gray-500">Round {snapshot.round}</span>
            <span className="ml-auto text-gray-400">{snapshot.acts.length} acts</span>
          </div>
        </div>

        <div className="relative w-full max-w-3xl">
          <BattleField layout={layout} />
          <div className="absolute top-2 right-2 z-10">
            <InitiativeTracker creatures={sceneSnapshot.creatures} round={sceneSnapshot.round} />
          </div>
        </div>
      </div>
    </PageShell>
  )
}
