import "#/index.css"

import { Match } from "effect"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { appRouteTarget } from "#/app-routes.ts"
import { BattlePage } from "#/battle-scene/BattlePage.tsx"
import { STAT_BLOCK_BATTLE_DEMO_META, STAT_BLOCK_BATTLE_DEMO_STATE } from "#/battle-scene/stat-block-battle-demo.ts"
import { App } from "#/components/App.tsx"
import { CharacterCreationPage } from "#/components/character-creation/CharacterCreationPage.tsx"
import { PageShell } from "#/components/PageShell.tsx"
import { EmbedMachineVizPage } from "#/components/trace-visualizer/EmbedMachineVizPage.tsx"
import { FullMachineVizPage } from "#/components/trace-visualizer/FullMachineVizPage.tsx"
import { MachineVizPage } from "#/components/trace-visualizer/MachineVizPage.tsx"

const pathname = typeof window === "undefined" ? "/" : window.location.pathname

export function HomePage() {
  return (
    <PageShell title="D&D 5e SRD Formal Spec">
      <nav className="flex justify-center gap-8">
        <a href="/character" className="text-lg text-gray-300 hover:text-amber-400 transition-colors">
          Character Creation Workflow
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

export function TracePlaceholder() {
  return (
    <PageShell title="Battle Runtime Trace Viewer Pending">
      <div className="mx-auto max-w-2xl text-center text-gray-300">
        <p>The Core-backed trace replay surface is quarantined while battle views move to battle-runtime snapshots.</p>
        <p className="mt-3 text-sm text-gray-500">
          A restored trace/debug viewer should consume battle-runtime and MCP snapshot evidence.
        </p>
      </div>
    </PageShell>
  )
}

export function RootApp({ path = pathname }: { readonly path?: string }) {
  return Match.value(appRouteTarget(path)).pipe(
    Match.when("battle", () => <BattlePage state={STAT_BLOCK_BATTLE_DEMO_STATE} meta={STAT_BLOCK_BATTLE_DEMO_META} />),
    Match.when("character", () => <CharacterCreationPage />),
    Match.when("home", () => <HomePage />),
    Match.when("machineViz", () => <MachineVizPage />),
    Match.when("machineVizEmbed", () => <EmbedMachineVizPage />),
    Match.when("machines", () => <FullMachineVizPage />),
    Match.when("tracePlaceholder", () => <TracePlaceholder />),
    Match.when("simulator", () => <App />),
    Match.exhaustive
  )
}

const root = typeof document === "undefined" ? null : document.getElementById("root")
if (root)
  createRoot(root).render(
    <StrictMode>
      <RootApp />
    </StrictMode>
  )
