# 2026-06-16 Legacy Rust Cleanroom Source Gap Analysis

## Scope

This report compares the legacy Rust cleanroom target at
`/workspace/typescript/dnd-cleanroom-rust-agent` against the current TypeScript
source architecture in `/workspace/typescript/dnd`.

It is a source-side architecture analysis, not a new cleanroom input. The goal is
to identify which major TS concepts/features the cleanroom lacks, and where the
cleanroom architecture is fragmented rather than holistic. The companion
full-run report remains the stronger audit of branch replay coverage and harness
provenance:

- `plans/cleanroom-scaffolds/trials/2026-06-16-rust-agent-full-run-analysis.md`

## Executive Summary

The completed legacy Rust cleanroom run is replay-complete for its copied
selected branch inventory, but it is not source-equivalent to the TS runtime
architecture. Its strongest work is a set of per-driver Rust rule Modules and
QNT Adapters that replay 74 selected drivers and 452 branch obligations. That is
useful evidence for local rule kernels. It does not yet amount to a
caller-facing character/session/battle engine.

The biggest missing source concept is the character lifecycle composition now
made explicit in source QNT:

```text
Draft -> Build -> Sheet -> BattleInitProjection -> BattleRuntime -> Settlement
```

The cleanroom has pieces of this sequence, but not the sequence as an Interface.
It has a local creation draft loop and local sheet/battle kernels. It does not
have a Rust `CharacterBuild`/`CharacterSheet` aggregate compatible with TS, a
generic battle runtime entrypoint, a sheet-to-battle projection, or a settlement
workflow that writes battle-owned deltas back to the sheet.

The main architecture issue is shallow cross-slice Depth. Most cleanroom
Implementations are one-driver Modules with local protocol/result enums. The
Adapters are well quarantined, which is good. But composition mostly lives in
tests, validation reports, and the branch work loop, not in public Rust
Interfaces with Leverage across creation, sheet, battle, and settlement.

Some fragmentation is acceptable and expected. The source QNT architecture is a
forest of focused slices, not a whole-battle spec. A cleanroom target should not
invent a monolithic battle model just to look holistic. The missing piece is a
small number of deeper composition Modules over the already-good local kernels.

## Evidence Base

Source-side evidence:

- `ARCHITECTURE.md` defines the package flow: Surface authored records,
  character creation, character sheet, character-battle projection, battle
  runtime, MCP, and app.
- `docs/adr/0001-forest-of-qnt-slices.md` explains why QNT is deliberately a
  forest of focused slices instead of a whole-battle model.
- `docs/adr/0002-character-creature-monster-ownership.md` defines the one-way
  character sheet to Creature projection.
- `docs/adr/0003-monster-stat-blocks-authored-data-provenance.md` separates
  provenance, structured input, normalized stat block, and runtime projection.
- `packages/character-creation-runtime/README.md` defines Character Draft,
  holes/fills, and finalized `CharacterBuild`.
- `packages/character-sheet-runtime/README.md` defines `CharacterSheet` as the
  owner of mutable in-play PC state.
- `packages/character-battle-runtime/README.md` defines
  `characterSheetBattleInit`, `battleCreatureInitFromCharacterBuild`, and
  `settleCharacterSheetFromBattle`.
- `packages/character-battle-runtime/character-layer-projection-lifecycle.mbt.qnt`
  defines the new closed lifecycle witness.
- `packages/character-battle-runtime/src/character-layer-projection-lifecycle.mbt.test.ts`
  replays that lifecycle through real TS public runtime functions.
- `packages/mcp/src/server.test.ts` and
  `packages/mcp/src/end-user-vertical.acceptance.test.ts` exercise the
  user-facing tool workflow: create/fill/finalize character, start battle,
  discover battle acts, resolve acts, end battle, and list settled characters.

Cleanroom evidence:

- `/workspace/typescript/dnd-cleanroom-rust-agent/src/lib.rs` exposes only
  `pub mod rules`.
- `/workspace/typescript/dnd-cleanroom-rust-agent/src/rules/` currently has 50
  Rust rule Modules.
- `/workspace/typescript/dnd-cleanroom-rust-agent/src/qnt_adapters/` currently
  has 74 QNT Adapter Modules.
- `/workspace/typescript/dnd-cleanroom-rust-agent/tasks/target-replay-evidence/`
  has 74 evidence JSON files.
- The copied legacy branch inventory has 452 obligations across 74 selected
  drivers.
- `/workspace/typescript/dnd-cleanroom-rust-agent/tasks/VALIDATION_REPORT.md`
  says the last queued driver is complete and the next queued driver is `_none_`.
- The current cleanroom snapshot does not contain
  `cleanroom-input/qnt/character-battle-runtime/character-layer-projection-lifecycle.mbt.qnt`.
- The current source branch inventory now selects
  `packages/character-battle-runtime/character-battle-origin-feat-selected-identity.mbt.qnt`
  and
  `packages/character-battle-runtime/character-layer-projection-lifecycle.mbt.qnt`
  from `character-battle-runtime`.
- The current source branch inventory also selects
  `packages/battle-runtime/battle-runtime-stat-block-multi-damage.mbt.qnt` and
  `packages/battle-runtime/battle-runtime-stat-block-size-gated-condition-rider.mbt.qnt`.

## Branch Inventory Selection Counts

The current source branch inventory marks 77 unique MBT/QNT drivers as active
cleanroom work. Those 77 drivers contain 463 branch obligations. The lifecycle
driver contributes five obligations:

- `doFinalizeDraftToBuild`
- `doCreateSheetFromBuild`
- `doProjectSheetToBattleInit`
- `doResolveSkeletonShortswordAttack`
- `doSettleBattleToSheet`

The two added stat-block battle drivers contribute six more battle obligations.

Against the current source tree, the cleanroom-sync roots contain 152
`*.mbt.qnt` driver files. So the current source split is:

| Scope | Total MBT drivers | Selected as active work | Copied/input only |
| --- | ---: | ---: | ---: |
| All synced source roots | 152 | 77 | 75 |
| `battle-runtime` | 125 | 63 | 62 |
| `character-battle-runtime` | 5 | 2 | 3 |
| Battle plus character-battle | 130 | 65 | 65 |
| `character-creation-runtime` | 10 | 5 | 5 |
| `character-sheet-runtime` | 12 | 7 | 5 |

The already-rendered legacy cleanroom snapshot is slightly older than current
source. It contains 148 copied `*.mbt.qnt` files, not 150. That snapshot's
copied inventory selects 74 and leaves 74 copied-but-unselected.

The current source's three unselected `character-battle-runtime` drivers are:

- `character-battle-init-projection.mbt.qnt`
- `character-battle-settlement.mbt.qnt`
- `character-sheet-feature-resources.mbt.qnt`

## Major Missing Concepts And Features

### 1. Character Lifecycle Composition

TS now has an explicit lifecycle witness:

```text
Draft -> Build -> Sheet -> BattleInitProjection -> BattleRuntime -> Settlement
```

The lifecycle QNT models these as closed variants, not open string statuses. The
TS parity test drives the sequence through the real public functions:

- `createCharacterDraft`
- `discoverCreationHoles`
- `fillCreationHoles`
- `finalizeCharacterDraft`
- `createFreshCharacterSheet`
- `characterSheetBattleInit`
- `startBattle`
- `discoverBattleActs`
- `resolveBattleSubject`
- `settleCharacterSheetFromBattle`

The cleanroom has only local pieces:

- `src/rules/character_creation.rs` has `Draft`, local holes/fills, and
  `finalize_draft`.
- `src/rules/hit_points.rs` has `SheetHitPointState` and hit point/rest kernels.
- `src/rules/origin_feats.rs` covers one origin-feat handoff slice.
- There is no Rust lifecycle Module that owns the sequence as an Interface.

This is the most important gap because it explains why the cleanroom can pass
many branch drivers and still not answer "can I make a character, enter battle,
take damage, and settle back to the sheet?"

### 2. TS-Compatible Character Build And Sheet Aggregates

TS separates build facts from sheet state:

- `CharacterBuild` is finalized build-only evidence from legal creation.
- `CharacterSheet` owns mutable play state: HP, temporary HP, conditions, spent
  Hit Dice, spell slot expenditure, created slots, Pact Slots, feature-resource
  expenditure, rest state, and retained companion state.

The cleanroom has a bounded creation slice and isolated sheet kernels, but no
aggregate Rust type that plays the same role as TS `CharacterBuild` or
`CharacterSheet`. The absence matters because downstream source concepts depend
on those aggregates:

- battle init needs build and sheet facts together;
- settlement must preserve build identity while changing only sheet-owned play
  state;
- MCP/app workflows need durable character records, not only local rule facts.

### 3. Generic Battle Runtime Workflow

TS battle runtime has a broad public Interface:

- `startBattle`
- `discoverBattleActs`
- `resolveBattleSubject`
- `resolveBattleInterrupt`
- `endTurn`
- `snapshotBattle`
- `BattleState`
- `BattleCreatureState`
- battle subjects, holes, fills, resources, interrupt stack, companions, and
  snapshots.

The cleanroom has many focused rule Modules for selected procedures: weapon
attack ordering, spell attack ordering, command options, concentration,
interrupt stack resume, stat-block controls, and similar slices. Those are real
rule kernels, but they do not compose into a generic `BattleState` Interface.

The architecture gap is not that every procedure is separate. That part follows
the QNT forest. The gap is that no deeper Module owns the common battle
workflow: actor turn, discover legal acts, receive fills, resolve the selected
subject, update battle state, and expose a stable snapshot.

Battle is therefore not merely "missing some drivers" in the cleanroom. The
cleanroom has battle leaves, but not the TS battle tree:

- no generic `BattleState` that owns combatants, initiative, current turn
  resources, interrupt stack, companions, active effects, object/light state,
  grapples, and snapshots together;
- no public `startBattle` Interface that admits a mixed character/stat-block
  roster into that state;
- no generic act discovery Interface that returns a current list of battle
  subjects across attacks, spells, movement, feature actions, reactions,
  companion commands, and turn/end actions;
- no generic battle fill protocol that lets callers answer currently open holes
  without knowing the selected procedure Module;
- no generic resolver that dispatches one selected subject through the relevant
  procedure and returns the next battle state/result;
- no snapshot/session shape comparable to the TS MCP battle tools.

The existing Rust battle Modules are still useful. They are closer to
procedure-level engines or rule-core kernels than to the current TS
`@dnd/battle-runtime` package. A caller could learn how a selected weapon attack
or selected spell procedure behaves, but could not run an encounter through the
same Interface that TS exposes.

### 4. Character-Battle Init And Settlement

TS has a dedicated composition package, `@dnd/character-battle-runtime`, because
character sheet and battle reducer ownership must stay separate:

- `characterSheetBattleInit` projects sheet/build facts into battle creature
  initialization.
- `battleCreatureInitFromCharacterBuild` supports build-derived initialization
  with caller choices where needed.
- `settleCharacterSheetFromBattle` writes accepted battle-owned deltas back to
  the sheet and preserves/rejects source-owned facts.

The cleanroom lacks this composition layer. The selected
`character-battle-runtime` drivers in the current source branch inventory are
`character-battle-origin-feat-selected-identity.mbt.qnt` and
`character-layer-projection-lifecycle.mbt.qnt`; init projection and settlement
remain copied-but-unselected.

This is where branch replay most clearly diverges from product utility: the run
can finish all selected work while never proving battle-to-sheet persistence.

### 5. Surface Catalogs, Provenance, And Support-Profile Admission

TS has a source-content architecture:

- `@dnd/surface` owns authored records and provenance.
- Unit and Stat Block catalogs are separate authored record families.
- Runtime packages consume typed Surface records through readers and
  support-profile admission.
- Runtime behavior dispatches on parsed shape and typed facts, not authored id or
  record name.

The cleanroom does not have equivalent `UnitCatalog`, `StatBlockCatalog`,
provenance, structured input, support-profile, or runtime-projection Modules.
Selected-identity QNT Adapters prove behavior for concrete selected examples,
but the target crate does not yet expose the admission Interface that explains
why an authored record is supported.

This is a major source-side concept gap, not just a missing data file. Without a
support-profile admission Module, future cleanroom Implementations can drift
toward rule dispatch by selected identity even when Adapters quarantine witness
names correctly.

### 6. MCP/App Session Workflow

TS has MCP workflows over the runtime stack:

- create a character draft;
- discover and fill creation holes;
- finalize a stored character;
- start battle from stored characters and stat blocks;
- discover battle acts;
- fill battle holes;
- resolve battle acts;
- end battle and settle back to characters;
- list durable character sessions.

The cleanroom crate exposes rules, not a session engine. There is no session
store, MCP tool Interface, serialized workflow layer, or app-ready orchestration.
That is acceptable for a replay target, but it is a product-level feature gap
relative to `.ts`.

### 7. Source Fact, Table Witness, Runtime Projection

TS documentation distinguishes:

- source facts owned by authored Surface data or durable sheet/build state;
- table-supplied witnesses consumed by runtime procedures;
- runtime projections derived for execution.

The cleanroom has local facts that play these roles, especially in spatial,
light, spell, and battle slices, but it does not expose the distinction as a
general architecture concept. The risk is redundant state: a future Module can
store derivable facts beside source facts because no shared Interface names the
owner of each fact.

### 8. Runtime Occurrence State

TS ubiquitous language defines active ongoing feature occurrences as mutable
engine state for a source feature that is currently contributing rules riders.
TS has many specific runtime occurrence shapes: concentration, roll modifiers,
scalar buffs, wild shape forms, ongoing spell effects, and similar procedures.

The cleanroom has local occurrence-like states in individual Modules, but no
shared occurrence vocabulary or manifest pressure. That is acceptable for
small rule kernels. It becomes fragmented when several Modules independently
invent `protocol`, `outcome`, `active`, `selected`, and `resolved` fields for the
same concept of a durable runtime occurrence.

### 9. Encounter Relationships And Side

TS models combatant side and relationship-sensitive discovery in battle
composition. The cleanroom currently has no broad `Side`, ally/enemy,
combatant-roster, or relationship Module. That gap appears to be scope-driven:
the current queue did not select a combatant-side driver.

## Architecture Fragmentation

### Useful Fragmentation

The QNT source is intentionally fragmented. Focused drivers keep MBT tractable
and make each obligation easier to replay. Cleanroom Adapters should remain
per-driver and should quarantine QNT witness names.

The current cleanroom does this well:

- QNT Adapter Modules live under `src/qnt_adapters`.
- The public crate does not expose those Adapters through `src/lib.rs`.
- Production rule Modules such as `character_creation`, `hit_points`, and
  `rule_core_stat_block_controls` carry source rule logic rather than direct
  evidence protocol.

This fragmentation is not the problem.

### Harmful Fragmentation

The weak point is that cross-slice concepts have not been promoted into deeper
Modules. Similar protocol shapes recur locally:

- local `Protocol` enums;
- local `ScenarioOutcome` enums;
- local `State` records;
- local result tags;
- local holes/fills;
- local selected-identity projections.

These are not automatically wrong. They become weak when two conditions hold:

1. The same concept appears in multiple distant Modules.
2. A caller cannot use one public Interface to execute the workflow that the TS
   runtime exposes.

That is the current shape for battle workflow, sheet settlement, support-profile
admission, occurrence state, and source/table/runtime fact ownership.

### Test Harness As Composition Layer

The cleanroom test Module imports every QNT Adapter and many production rule
Modules. That is acceptable for replay, but it means composition is mostly in
tests and artifacts. Public Rust callers do not get an equivalent composition
Interface.

The architecture would be deeper if tests exercised a smaller number of public
Interfaces:

- `CharacterLifecycle`
- `CharacterSheet`
- `BattleRuntime`
- `CharacterBattleHandoff`
- `SurfaceAdmission`

Each Interface could still delegate to the existing focused rule Modules.

### Authored Identity Pressure

The cleanroom rightly quarantines many QNT witness names in Adapters. Still,
selected-identity pressure remains visible in production Module names and local
types. That is not always a bug: selected SRD examples are valid fixtures. The
risk is semantic dispatch by authored identity.

The source architecture wants this split:

- authored identity can appear in Surface/catalog/test/composition selection;
- runtime Implementations should dispatch on support-profile facts and typed
  procedure shapes.

The cleanroom needs a public admission Module to make that split executable
rather than only checker-enforced.

### TS Is Also Fragmented

This comparison should not pretend TS is already perfectly holistic. TS battle
runtime still has extraction scars from a large reducer. The source itself
tracks reducer refactor work and cycles, and the spell procedure profile
registry is a deepening move over behavior that used to be scattered.

The important difference is that TS already has several higher-Depth Interfaces
above the fragmentation:

- public battle lifecycle and discovery/resolution;
- character creation draft/fill/finalization;
- character sheet aggregate and parser;
- character-battle init/settlement;
- Surface catalogs and support gates;
- MCP workflows.

The cleanroom mostly has the local leaves without those composition Interfaces.

## Recommended Deepening Path

### 1. Add A CharacterLifecycle Module

Problem: the cleanroom has lifecycle pieces but no lifecycle Interface.

Solution: once the new lifecycle QNT is selected, add a thin Rust
`character_lifecycle` Module that composes existing creation, sheet, battle-init,
battle-runtime, and settlement operations. It should not own all character rules.
It should witness the sequence and preserve ownership:

- Draft is mutable creation state with holes.
- Build is finalized build-only evidence.
- Sheet owns in-play PC state.
- BattleInitProjection is a projection step, not durable state.
- BattleRuntime owns battle reducer state.
- Settlement writes accepted battle-owned deltas back to sheet state.

Benefit: this creates one source-aligned Interface with high Leverage over the
existing kernels.

### 2. Add A BattleRuntime Workflow Module

Problem: selected procedure Modules do not provide a generic battle workflow.

Solution: add a minimal public `battle_runtime` Module with a durable
`BattleState` and operations equivalent in shape to:

- start battle from combatant init records;
- discover current acts;
- fill current holes;
- resolve selected subject;
- end turn;
- snapshot state.

Per-procedure Modules should remain separate Implementations behind this
Interface.

Benefit: keeps QNT-slice Locality while giving callers the same battle workflow
Depth TS already has.

### 3. Add SurfaceAdmission And Projection Modules

Problem: selected-identity replay does not prove runtime admission by shape.

Solution: add a small admission layer that separates:

- provenance and authored record identity;
- structured input facts;
- support-profile admission;
- runtime projection facts.

Benefit: prevents authored id/name dispatch from becoming the hidden rule
selector, and gives selected-identity QNT drivers an architectural home.

### 4. Add A Sheet Aggregate And Settlement Module

Problem: cleanroom sheet logic is split into HP/rest/resource kernels with no
durable `CharacterSheet` owner.

Solution: introduce a sheet aggregate only where it prevents duplication:

- build-derived capacities remain derived;
- sheet-owned mutable play state is stored;
- settlement writes only battle-owned deltas;
- build identity remains unchanged.

Benefit: makes invalid ownership states harder to represent and lets battle
handoff become a real workflow.

### 5. Add Concept Metadata To Branch Inventory

Problem: the branch queue pushes implementers toward local branch replay, not
concept formation.

Solution: extend branch inventory rows with concept tags such as:

- `character-lifecycle`
- `support-profile-admission`
- `source-table-runtime-fact-ownership`
- `runtime-occurrence-state`
- `sheet-state-owner`
- `battle-runtime-workflow`
- `authored-identity-admission`

Benefit: cleanroom Implementations can be judged on concept coverage, not only
branch action coverage.

### 6. Add Public Workflow Probes

Problem: the current run can finish with `_none_` queued while still lacking
app-level utility.

Solution: add target-language workflow probes for utility goals:

- create/fill/finalize a character;
- create a sheet;
- start a battle;
- discover and resolve a battle act;
- settle battle results back to the sheet.

Benefit: keeps branch replay as the detailed evidence lane while making
workflow usefulness visible.

## Lifecycle QNT Copy Answer

The new lifecycle QNT will be copied by the next source-side cleanroom sync
because `scripts/sync-cleanroom-input.cjs` allowlists `.qnt` files from
`packages/character-battle-runtime` with package-relative destinations.

But copied does not mean queued. The branch inventory is the source-side task
index that says which copied MBT/QNT drivers have branch obligations the
cleanroom worker must replay and implement. "Selected" means the driver appears
in that inventory/scope as work to do. A copied-but-unselected QNT file is
available input, not an implementation requirement.

The current legacy cleanroom snapshot predates the new lifecycle QNT. The
current source branch inventory now selects
`character-layer-projection-lifecycle.mbt.qnt`, so the next source-side
cleanroom sync will copy both the file and its active branch-obligation rows. A
future cleanroom run still must be regenerated from that current source
inventory; the already-rendered legacy snapshot will not learn about it by
itself.

## Bottom Line

The legacy cleanroom lacks the TS system's high-Depth composition Interfaces,
especially battle composition: full character lifecycle, sheet aggregate,
generic battle runtime, handoff settlement, Surface/support-profile admission,
and MCP/app session workflow.

Its local rule Modules are not throwaway work. They are useful leaves. The next
architecture move should be to add a few source-aligned composition Modules that
make those leaves callable through the same concepts the TS code already uses.

## Verification

Analysis/report verification. No MBT, TypeScript, or Rust test suites were run.

Commands and inspections used:

```text
git status --short
rg -n "character-battle-runtime|ALLOWLIST|packagesRelative|\\.qnt" scripts/sync-cleanroom-input.cjs
test -f /workspace/typescript/dnd-cleanroom-rust-agent/cleanroom-input/qnt/character-battle-runtime/character-layer-projection-lifecycle.mbt.qnt
jq -r '.branchObligations[].driverPath' plans/cleanroom-branch-coverage/source-branch-inventory.json | rg 'character-layer|character-battle-runtime'
jq '.branchObligations | length' plans/cleanroom-branch-coverage/source-branch-inventory.json
jq -r '.branchObligations[].driverPath' plans/cleanroom-branch-coverage/source-branch-inventory.json | sort -u | wc -l
find /workspace/typescript/dnd-cleanroom-rust-agent/src/rules -name '*.rs' | wc -l
find /workspace/typescript/dnd-cleanroom-rust-agent/src/qnt_adapters -name '*.rs' | wc -l
find /workspace/typescript/dnd-cleanroom-rust-agent/tasks/target-replay-evidence -name '*.json' | wc -l
find /workspace/typescript/dnd-cleanroom-rust-agent/cleanroom-input/qnt -name '*.mbt.qnt' | wc -l
rg -n "pub fn start_battle|startBattle|BattleState|CharacterSheet|CharacterBuild|UnitCatalog|StatBlockCatalog|provenance|SupportProfile|support_profile|settle|Settlement" /workspace/typescript/dnd-cleanroom-rust-agent/src -g '*.rs'
rg -n "create_character_draft|start_battle|discover_battle_acts|resolve_battle_act|end_battle|list_characters" packages/mcp/src/server.test.ts packages/mcp/src -g '*.ts'
pnpm cleanroom-branch-coverage:check -- --write
pnpm cleanroom-branch-coverage:check
pnpm cleanroom-scaffold:check
git diff --check -- plans/cleanroom-branch-coverage/branch-scope.jsonl plans/cleanroom-branch-coverage/source-branch-inventory.json plans/cleanroom-branch-coverage/REPORT.md plans/cleanroom-scaffolds/tasks/ACTIVE_WORK.template.json plans/cleanroom-scaffolds/tasks/LEVEL_1_2_SCOPE.snapshot.md plans/cleanroom-scaffolds/trials/2026-06-16-cleanroom-qnt-scope-gap-report.md plans/cleanroom-scaffolds/trials/2026-06-16-rust-agent-source-gap-analysis.md
```

Key negative checks:

- current legacy cleanroom input lacks the new lifecycle QNT file;
- current source branch inventory selects the lifecycle QNT, but the already
  rendered legacy cleanroom snapshot predates that selection;
- cleanroom Rust source has no generic `BattleState`, `CharacterSheet`,
  `CharacterBuild`, `UnitCatalog`, `StatBlockCatalog`, support-profile, or
  settlement Interface matching the TS architecture.
