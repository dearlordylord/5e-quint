import "#/index.css"

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { BattlePage } from "#/battle-scene/BattlePage.tsx"
import { App } from "#/components/App.tsx"
import { PageShell } from "#/components/PageShell.tsx"
import { FullMachineVizPage } from "#/components/trace-visualizer/FullMachineVizPage.tsx"
import { MachineVizPage } from "#/components/trace-visualizer/MachineVizPage.tsx"
import { TraceVisualizer } from "#/components/trace-visualizer/TraceVisualizer.tsx"
import { FIREBALL_BATTLE, FIREBALL_BATTLE_META } from "#/demo/fireball-battle.ts"

const pathname = window.location.pathname

function HomePage() {
  return (
    <PageShell title="D&D 5e SRD Formal Spec">
      <nav className="flex justify-center gap-8">
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
  if (pathname === "/simulator") return <App />
  if (pathname === "/machines") return <FullMachineVizPage />
  if (pathname === "/machine-viz") return <MachineVizPage />
  if (pathname === "/battle" || pathname === "/battle/machine" || pathname === "/battle/interrupts")
    return <BattlePage scenario={{ events: FIREBALL_BATTLE, meta: FIREBALL_BATTLE_META }} />
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
