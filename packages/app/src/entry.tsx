import "#/index.css"

import { FIREBALL_BATTLE, FIREBALL_BATTLE_META } from "@dnd/core/demo/fireball-battle.ts"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { BattlePage } from "#/battle-scene/BattlePage.tsx"
import { EmbedBattlePage } from "#/battle-scene/EmbedBattlePage.tsx"
import { PROMOTED_BATTLE_DEMO_META, PROMOTED_BATTLE_DEMO_STATE } from "#/battle-scene/promoted-battle-demo.ts"
import { App } from "#/components/App.tsx"
import { CharacterCreationPage } from "#/components/character-creation/CharacterCreationPage.tsx"
import { PageShell } from "#/components/PageShell.tsx"
import { EmbedMachineVizPage } from "#/components/trace-visualizer/EmbedMachineVizPage.tsx"
import { FullMachineVizPage } from "#/components/trace-visualizer/FullMachineVizPage.tsx"
import { MachineVizPage } from "#/components/trace-visualizer/MachineVizPage.tsx"
import { EmbedTraceVisualizer, TraceVisualizer } from "#/components/trace-visualizer/TraceVisualizer.tsx"

const pathname = window.location.pathname

function HomePage() {
  return (
    <PageShell title="D&D 5e SRD Formal Spec">
      <nav className="flex justify-center gap-8">
        <a href="/character" className="text-lg text-gray-300 hover:text-amber-400 transition-colors">
          Character Creation Workflow
        </a>
        <a href="/trace" className="text-lg text-gray-300 hover:text-amber-400 transition-colors">
          MBT Trace Replay Visualizer
        </a>
        <a href="/battle" className="text-lg text-gray-300 hover:text-amber-400 transition-colors">
          Battle Visualizer
        </a>
        <a href="/machines" className="text-lg text-gray-300 hover:text-amber-400 transition-colors">
          Full Machine Viz
        </a>
      </nav>
      <div className="mt-8 text-center">
        <a
          href="https://www.dearlordylord.com/blog/dnd-quint/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          Blog
        </a>
      </div>
    </PageShell>
  )
}

function RootApp() {
  if (pathname === "/character") return <CharacterCreationPage />
  if (pathname === "/simulator") return <App />
  if (pathname === "/machines") return <FullMachineVizPage />
  if (pathname === "/machine-viz") return <MachineVizPage />
  if (pathname === "/embed/battle")
    return <EmbedBattlePage scenario={{ events: FIREBALL_BATTLE, meta: FIREBALL_BATTLE_META }} />
  if (pathname === "/embed/trace") return <EmbedTraceVisualizer />
  if (pathname === "/embed/machine-viz") return <EmbedMachineVizPage />
  if (pathname === "/battle" || pathname === "/battle/machine" || pathname === "/battle/interrupts")
    return <BattlePage state={PROMOTED_BATTLE_DEMO_STATE} meta={PROMOTED_BATTLE_DEMO_META} />
  if (pathname === "/trace") return <TraceVisualizer />
  return <HomePage />
}

const root = document.getElementById("root")
if (root)
  createRoot(root).render(
    <StrictMode>
      <RootApp />
    </StrictMode>
  )
