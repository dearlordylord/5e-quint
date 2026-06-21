# Reducer-Spine Cleanroom Guidance

This guidance is for cleanroom target agents implementing reducer-spine
diagnostics from copied QNT. It is language-independent and intentionally does
not describe the production TypeScript implementation.

## Target Surface

The battle engine surface for reducer-spine diagnostics is:

- `start_battle`: create durable battle state from battle setup.
- `discover_battle_acts`: project the current actor's available battle acts and
  the first public subject holes.
- `resolve_battle_subject`: accept a selected subject plus table fills, advance
  that subject's hole frontier, and commit resolved effects.
- turn advancement: move to the next actor and refresh turn-owned resources.

Names may follow the target language's style, but the target engine must expose
one shared reducer path with this shape. A focused driver must not introduce a
parallel replay helper that owns its own state and bypasses the shared
`BattleState -> discover_battle_acts -> resolve_battle_subject` route.

## Subject And Fill Lifecycle

A battle subject is the reducer-owned representation of a chosen battle act or
runtime command. A fill is table-supplied information needed to continue that
subject, such as a target choice, Saving Throw outcome, Attack Roll, damage
roll, healing roll, or distribution.

For a selected driver:

- discover first, then resolve through the same reducer.
- expose typed subject variants only for that task's subject family.
- expose typed fill variants only for holes the copied QNT driver needs.
- represent commands with no table-supplied value as no-fill subject resolution;
  do not invent a synthetic fill to stand in for an absent table choice.
- keep ordering facts in reducer state or reducer results, not in driver-local
  maps.
- reject or request earlier fills according to QNT; do not silently reorder by
  adapter convention.

The reducer-spine contract witness
`cleanroom-input/qnt/battle-runtime/battle-runtime-reducer-spine-contract.mbt.qnt`
is a thin composition witness. It proves the shared route shape. It is not a
rule owner for spell targeting, damage math, attack resolution, turn-boundary
effects, or interrupt behavior.

Focused route connectors named `*.route.mbt.qnt` are the executable routing
obligations for diagnostic drivers. They project `qRoute` over the shared
reducer-route vocabulary. A target replay proves reducer routing only when its
observed route events match the copied connector; matching the focused
non-route projection alone proves behavior parity, not reducer architecture.
The reducer-route inventory is an ordering and derivability index. A
`reducer-routed` row is accepted only with copied connector evidence from
`routeConnectorPath` or the sibling `.route.mbt.qnt` driver.

Rule-core `component-first` rows use component connector evidence instead of
BattleState route evidence. The copied component connector projects
`qComponentRoute` through `rule-core-component-route.qnt`, with events for
parse input, admit input, call the reusable rule-core component, and project the
result. A target replay for a component-first row must match that route and
record the inventory's `componentOwners`; it must not satisfy the row by
building a driver-local replay helper that bypasses the reusable component API.

## Durable State Ownership

Durable facts belong to `BattleState` or a nested battle-owned record when they
must survive beyond one adapter callback. Examples include current actor, turn
resources, combatant Hit Points, Reaction availability, committed spell-slot
use, active Spell Effects, Concentration ownership, death-save counters, and
Stable/Unconscious/Dead lifecycle facts.

Before adding a durable field:

1. Search the target engine for an existing owner.
2. Search copied QNT and domain guidance for the canonical fact.
3. Record the field in `tasks/STATE_OWNER_MANIFEST.json`.
4. State whether the field is a canonical battle-state owner or an executable
   boundary projection from another owner.

Do not store driver-local duplicates of facts that `BattleState` can own. Do
not store labels, display names, QNT action names, branch ids, or witness fields
as production state.

## Adapter Quarantine

QNT/MBT replay adapters may know about:

- QNT driver paths and file hashes.
- `mbt::actionTaken` branch names.
- sampled input names from `mbt::nondetPicks`.
- trace ids, evidence hashes, and target replay evidence JSON fields.
- projection comparators used only for target replay evidence.

Production modules must not import adapter modules, branch on QNT action names,
or expose witness protocol fields as domain APIs. Adapters translate between
QNT replay and the reducer surface; they do not own rules behavior.

## Cleanroom Boundary And Identity Dispatch

Reading unapproved source code and dispatching production reducer behavior on
authored or fixture identity are the same class of cleanroom-boundary failure.
Both import knowledge from outside the reducer's runtime facts.

Production reducer code routes by shape: subject kind, typed procedure facts,
capability/profile facts, combatant state, turn resources, and durable
BattleState-owned facts. It must not select mechanics by fixture names,
authored ids, authored names, slugs, source headings, page references, or
official catalog labels.

Fixture names, QNT branch names, selected authored identities, and catalog rows
belong only in adapters, tests, replay evidence, catalog/selection boundaries,
or explicitly documented support-profile admission. If a reducer route appears
to need a selected identity, first extract the generic shape or capability it
represents. If the copied corpus does not state that shape, record a
`source-qnt-corpus` blocker instead of inferring it.

## Selected Identity And Catalog Timing

Selected-identity and catalog QNT should wait until the generic substrate
exists. Do not implement a selected spell, feature, monster, or catalog row by
branching production behavior on authored ids, names, slugs, source headings,
page references, or official catalog labels.

When the selected-identity driver is the pressure point, first ask what generic
runtime substrate the QNT actually needs: support-profile facts, spell procedure
shape, battle subject kind, resource owner, or cross-record reference. Implement
that substrate before admitting catalog selection.

## Anti-Explosion Rule

Each cleanroom task may add one small subject family or one substrate. It must
not build whole-battle QNT, a whole-battle reducer, broad selected-identity
fanout, or a large target-language accumulator that mirrors the source branch
inventory.

For reducer-spine diagnostics, use
`cleanroom-input/branch-coverage/reducer-route-inventory.json`:

- The active diagnostic batch is the intended order.
- `reducer-routed` means target replay must pass through the shared reducer
  surface and match the copied route connector's `qRoute`.
- `substrate-first` means the substrate and durable owner must be introduced or
  identified before target replay evidence is meaningful.
- `component-first` means deepen a reusable rule module before admitting it as
  a battle subject, and target evidence must match its copied `qComponentRoute`
  component connector.
- `catalog-after-substrate` means defer selected identity until the generic
  runtime substrate exists.
- `replay-refresh-only` means rerun evidence without new production behavior.

If the route needs a reducer fact not present in copied QNT, RAW, domain
language, assumptions, or this guidance, record a `source-qnt-corpus` blocker.
Do not infer the missing fact from TypeScript or from prior cleanroom code.
