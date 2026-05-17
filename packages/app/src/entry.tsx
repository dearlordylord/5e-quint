import "#/index.css"

import { Match } from "effect"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { appRouteTarget } from "#/app-routes.ts"
import { BattlePage } from "#/battle-scene/BattlePage.tsx"
import { WIZARD_BATTLE_DEMO_META, WIZARD_BATTLE_DEMO_STEPS } from "#/battle-scene/wizard-battle-demo.ts"
import { CharacterCreationPage } from "#/components/character-creation/CharacterCreationPage.tsx"
import { PageShell } from "#/components/PageShell.tsx"

const pathname = typeof window === "undefined" ? "/" : window.location.pathname

export function HomePage() {
  return (
    <PageShell title="D&D 5e SRD Character Tools">
      <nav className="flex justify-center gap-8">
        <a href="/character" className="text-lg text-gray-300 hover:text-amber-400 transition-colors">
          Character Creation Workflow
        </a>
        <a href="/battle" className="text-lg text-gray-300 hover:text-amber-400 transition-colors">
          Battle Visualizer
        </a>
      </nav>
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
    Match.when("battle", () => <BattlePage steps={WIZARD_BATTLE_DEMO_STEPS} meta={WIZARD_BATTLE_DEMO_META} />),
    Match.when("character", () => <CharacterCreationPage />),
    Match.when("home", () => <HomePage />),
    Match.when("tracePlaceholder", () => <TracePlaceholder />),
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
