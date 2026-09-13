# @dnd/app

React application package for local character-creation, battle, and admin
mirror experiences.

## Run locally

From the repository root, use Node.js 22.19 or newer and the pnpm version pinned
in `package.json`:

```sh
pnpm install
pnpm --filter @dnd/app dev
```

Open `http://localhost:3000`.

| Route        | Experience                                          |
| ------------ | --------------------------------------------------- |
| `/character` | Interactive character creation                      |
| `/battle`    | Battle visualizer driven by the bundled demo steps  |
| `/admin`     | MCP Admin Mirror; requires a running mirror service |

The trace routes currently show a placeholder. The
[entry composition](src/entry.tsx) owns which experience each route renders.
For the admin view, `VITE_ADMIN_MIRROR_URL` selects the mirror origin; see the
[MCP package](../mcp/README.md) for the session and tool workflows it displays.

## Rendering and state ownership

The production image serves the built `dist/` directory through
`static-server.mjs`, a dependency-free Node entrypoint. It accepts GET and HEAD
requests, rejects paths outside the artifact root, and drains active responses
before exiting cleanly on SIGINT or SIGTERM. The final Effect 4 clean-consumer
smoke copies this exact server and built artifact to an isolated directory and
proves both signal paths while a JavaScript response is in flight.

The battle scene uses SVG-in-React with Motion. Scene components derive their
rendered state from runtime snapshots and remain inspectable through ordinary
DOM-based Vitest tests; the app does not own a second battle-state model.

Character Sheet state in app components follows the runtime boundary:
stored inputs keep mutable play state and selections, while display summaries
derive capacities through `@dnd/character-sheet-runtime` projections. Hit Point
Maximum, Hit Dice capacity, ordinary Spell Slot capacity, Pact Slot capacity,
and resource capacity are not app-owned state; they come from the finalized
Character Build and installed Unit facts. The app may render those capacities
beside current HP, spent Hit Dice, slot expenditures, and resource
expenditures, but it must not keep a parallel capacity model.
