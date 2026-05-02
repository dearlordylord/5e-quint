# Promoted Quint Parity And Composition Archive

Date: 2026-05-01

Task: PBA0 - Archive Promoted Quint Parity And Composition Boundary.

This archive is the maximum promoted proof and composition boundary for the
current architecture. It closes the post-BA question "what proves what?" before
old Core feature restoration or broad catalog widening starts.

The active promoted path is:

```text
@dnd/surface
  -> @dnd/character-creation-runtime
  -> @dnd/mcp composition
  -> @dnd/battle-runtime

@dnd/shared-algebras
  -> @dnd/character-creation-runtime
  -> @dnd/battle-runtime

@dnd/surface
  -> @dnd/battle-runtime
```

`@dnd/mcp` is the tool-facing composition root. It may see authored Surface
records, character sessions, battle sessions, battle initialization inputs, and
transient tool fills together. That composition visibility does not make MCP the
semantic owner of character creation or battle behavior.

Old root `battle.qnt`, old Core battle machines, and old Core MBT are legacy
proof-source and restore-source material. They are not active authority for
promoted Unit/StatBlock-backed behavior.

## Package Boundaries

| Package | Owns | Does not own |
| --- | --- | --- |
| `@dnd/surface` | Provenance-bearing authored Unit and Stat Block records, structural readers, SRD collections, and decode/catalog boundaries. | Runtime state, reducer legality, character draft sessions, battle sessions, or projected executable IR. |
| `@dnd/shared-algebras` | Reusable reducer algebras such as action economy, Initiative, Armor Class, attack rolls, conditions, Death Saving Throw counters, runtime dice, and runtime hole identity. | Unit support gates, act subjects, authored-content catalogs, MCP sessions, or complete character/battle reducers. |
| `@dnd/character-creation-runtime` | Character Draft mutation, creation holes/fills, support gates, finalization, and `CharacterBuild` projection from Surface Unit facts. | Battle initialization, battle state, current HP, in-play resource expenditure, or authored content provenance. |
| `@dnd/battle-runtime` | Battle initialization from caller-built creature inputs, durable battle state, act discovery, replay fills, action resources, damage/HP mutation, supported feature/spell/attack resolution, and snapshots. | Character draft legality, catalog installation, MCP transient fill storage, post-battle character-session persistence, or old Core authority. |
| `@dnd/mcp` | Tool schemas, session storage, installed Surface catalogs, Character Build to battle-init projection, selected Stat Block identity, transient battle fills, and cross-runtime workflow tests. | Reducer semantics, authored content rules, package-local QNT authority, or duplicated executable content. |

The composition rule is direct use of owned package APIs, not an adapter layer.
If a future task needs a lower layer to expose a stronger fact, change that
layer and its proof owner. Do not add parallel MCP state or a private MCP
registry to compensate for a missing runtime or Surface shape.

## Proof Layers

| Boundary | Proof owner | Default proof shape | Escalate when |
| --- | --- | --- | --- |
| Authored Surface records and catalogs | `@dnd/surface` | Decode/reader tests, trace review, provenance/cross-collection constraints, and table-driven catalog contract tests. | A new record family or structural reader changes runtime-visible meaning. |
| Small reusable reducer algebra | `@dnd/shared-algebras` with MBT specs currently stored under `packages/surface-runtime-correction/*-mbt.qnt` | Focused deterministic tests plus modular Quint MBT replay against the shared TypeScript algebra. | The algebra's state transition semantics change or a new reusable algebra is introduced. |
| Character creation reducer | `@dnd/character-creation-runtime` | Focused reducer tests, `character-creation-runtime-slice.qnt`, and package-local randomized `character-creation-runtime.mbt.qnt`. | Draft mutation, hole/fill semantics, support gates, or final `CharacterBuild` projection changes. |
| Battle reducer deterministic semantics | `@dnd/battle-runtime` | Focused reducer tests plus generated parity/self-tests against `battle-runtime.qnt`. | Implemented battle behavior, action resources, HP lifecycle, act discovery, replay, or snapshots change. |
| Selected composed battle-runtime flows | `@dnd/battle-runtime` | Narrow integrated promoted MBT through public `discoverBattleActs`, `resolveBattleSubject`, and `snapshotBattle`; current runner is `src/battle-runtime.mbt.test.ts` with `battle-runtime.mbt.qnt`. | Trace generation adds value across discovery, replay holes, action resources, damage, and snapshots. |
| MCP runtime composition | `@dnd/mcp` | Deterministic MCP server/protocol tests and end-user acceptance scenarios over real tool calls and in-memory sessions. | Tool schema, session ownership, cross-runtime projection, battle fill storage, handoff, or workflow recovery changes. |
| Multiple runtime/package composition | Owning composition package plus affected runtime packages | Contract tests at the composition boundary, package-local runtime tests for changed semantics, and docs synchronized with package ownership. | A change moves facts between Surface, character creation, battle runtime, shared algebras, and MCP sessions. |

No layer requires MBT per authored Unit, Spell, weapon, feature, or Stat Block.
Ordinary catalog width belongs in Surface reader/contract tests and package
support-gate tests unless it changes a reusable reducer procedure family or a
selected high-risk composition flow.

## Maximum Promoted Quint Parity

Maximum promoted Quint parity for the current architecture means:

- each runtime package has a package-local QNT owner for implemented reducer
  semantics;
- shared reducer algebras can keep small independent MBT models rather than
  being re-proved through every consuming runtime trace;
- integrated battle-runtime MBT is selective and public-API-facing, not a
  recreated old Core battle model;
- MCP composition is proved by deterministic composition and workflow tests,
  not by embedding session storage into package-local QNT;
- Surface authored content remains input to runtime packages and is not itself a
  runtime reducer or projected executable language.

This is the ceiling for promoted parity until a future task explicitly changes
the architecture. Feature restoration tasks should widen the promoted runtime
and its package-local proof owner first, then add integrated MBT only when the
selection criteria in
[`promoted-battle-runtime-mbt-strategy.md`](./promoted-battle-runtime-mbt-strategy.md)
are met.

## Follow-Up Gaps

These are explicit follow-up owners, not vague parity debt:

- PBA1 documents reducer extensibility discipline so reducers interpret SRD
  procedure families instead of one branch per Unit, spell, feature, monster
  action, or slug.
- PBA2 audits the promoted battle runtime and MCP composition for named-ability
  drift after that discipline is written.
- PBA3 applies the first correction if PBA2 finds real drift.
- PBA4 aligns protocol docs and promotes the first feature-parity candidate.
- PBA5-PBA14 restore old Core feature breadth through promoted runtime tasks.
- PBA15 plans broader battle widening only after the feature-parity queue
  reaches its planned closeout point.

Proof gaps already cataloged in
[`battle-runtime-proof-coverage.md`](./battle-runtime-proof-coverage.md) stay
with their listed owner until PBA15 copies any still-actionable proof gaps into
durable successor tasks and deletes the temporary BA2 inventory. They should
become implementation tasks only when they represent missing promoted behavior
or selected integrated proof value.

## Source Checks

This task changed documentation/planning only. It models no new D&D rule.
RAW traceability was checked by reading
[`UBIQUITOUS_LANGUAGE.md`](../UBIQUITOUS_LANGUAGE.md), which confirms the terms
used here for Initiative, Action lifecycle, Resource Consumption, Hit Points and
Death, Damage, Surface/Unit, and Spell ownership. No SRD passage needed new
interpretation because no rule behavior changed.

`/simplify` convergence:

- Round 1 checked for duplicated authority claims and collapsed the archive
  around package ownership, proof layer, and follow-up owner tables.
- Round 2 checked for accidental per-authored-record MBT requirements and old
  Core authority wording. The archive keeps old Core as reference material and
  leaves ordinary catalog width to deterministic contract tests.
