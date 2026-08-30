# @dnd/app

React application package for local character-creation, battle, and admin
mirror experiences.

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
