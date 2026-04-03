import "#/index.css"

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { BattlePage } from "#/battle-scene/BattlePage.tsx"
import { App } from "#/components/App.tsx"
import { MachineVizPage } from "#/components/trace-visualizer/MachineVizPage.tsx"
import { TraceVisualizer } from "#/components/trace-visualizer/TraceVisualizer.tsx"

const pathname = window.location.pathname

function RootApp() {
  if (pathname === "/simulator") return <App />
  if (pathname === "/machine-viz") return <MachineVizPage />
  if (pathname === "/battle") return <BattlePage />
  return <TraceVisualizer />
}

const root = document.getElementById("root")
if (root)
  createRoot(root).render(
    <StrictMode>
      <RootApp />
    </StrictMode>
  )
