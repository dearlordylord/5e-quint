import "#/index.css"

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { App } from "#/components/App.tsx"
import { TraceVisualizer } from "#/components/trace-visualizer/TraceVisualizer.tsx"

const pathname = window.location.pathname

function RootApp() {
  if (pathname === "/simulator") return <App />
  return <TraceVisualizer />
}

const root = document.getElementById("root")
if (root)
  createRoot(root).render(
    <StrictMode>
      <RootApp />
    </StrictMode>
  )
