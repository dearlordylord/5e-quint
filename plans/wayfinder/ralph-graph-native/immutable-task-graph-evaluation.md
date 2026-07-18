# Ralph Immutable Task-Graph Evaluation

Research resolution for [Evaluate immutable task-graph representations for Ralph](https://github.com/dearlordylord/5e-quint/issues/181), under [Wayfinder: Ralph graph-native orchestration](https://github.com/dearlordylord/5e-quint/issues/175).

## Decision

Own a minimal, opaque Ralph `TaskDag` whose canonical in-memory representation is a persistent map from branded tracker `TaskId` to a task projection containing exactly one persistent set of prerequisite `TaskId`s. On Effect V4, use its immutable `HashMap` and `HashSet` as implementation primitives. Do not use Effect V4 `Graph`, `@thi.ng/dgraph`, Graphology, or Graphlib as the authoritative revision-scoped projection.

This is a representation decision, not a second task ledger. The tracker remains authoritative. Each accepted `TaskDagSnapshot` is a value projected from one complete tracker revision; the durable journal may refer to its revision but does not mutate or reconstruct tracker task facts independently.

Effect V4 `Graph` remains useful as an optional disposable analysis or visualization tool if a prototype needs one. It must not cross the Ralph graph-module boundary, and its allocated `NodeIndex` must never appear in task identity, serialization, journal events, claims, logs, or port contracts.

## Sources and version frame

The repository currently pins Effect 3.21.5, whose Graph API is marked experimental. The candidate control plane is future work, so this evaluation used the owner-provided Effect V4 skill and the Effect V4 beta sources rather than treating the repository's V3 package as V4 documentation.

The current [registry beta](https://registry.npmjs.org/effect/4.0.0-beta.99) on 2026-07-17 was `effect@4.0.0-beta.99`; `beta.98` has a source tag and no later Graph commit was present on `main`. Relevant primary sources:

- [Effect V4 Graph source at beta.98](https://github.com/Effect-TS/effect-smol/blob/3e4abbcb0d0e9a5e82b6b88c7ef7ab69900105ec/packages/effect/src/Graph.ts)
- [Effect V4 HashMap source at beta.98](https://github.com/Effect-TS/effect-smol/blob/3e4abbcb0d0e9a5e82b6b88c7ef7ab69900105ec/packages/effect/src/HashMap.ts)
- [Effect V4 HashSet source at beta.98](https://github.com/Effect-TS/effect-smol/blob/3e4abbcb0d0e9a5e82b6b88c7ef7ab69900105ec/packages/effect/src/HashSet.ts)
- [June 2026 Graph fixes and directed-neighbor API change](https://github.com/Effect-TS/effect-smol/commit/90ae23cf07284da5e1bcd9dffa882e85df7e617b)
- [`@thi.ng/dgraph` README at the evaluated commit](https://codeberg.org/thi.ng/umbrella/src/commit/4fc0df9a97bec92742f288aa059c04e9ff24cf41/packages/dgraph/README.md) and [implementation](https://codeberg.org/thi.ng/umbrella/src/commit/4fc0df9a97bec92742f288aa059c04e9ff24cf41/packages/dgraph/src/index.ts)
- [Graphology core](https://github.com/graphology/graphology/blob/249ec5e668ff5e89bf37a10330981579f8759525/src/graphology/src/graph.js) and [DAG topological sort](https://github.com/graphology/graphology/blob/249ec5e668ff5e89bf37a10330981579f8759525/src/dag/topological-sort.js)
- [Graphlib graph](https://github.com/dagrejs/graphlib/blob/85afa4e6d30f308d445edcd51ca6b06f705a92c6/lib/graph.ts), [topological sort](https://github.com/dagrejs/graphlib/blob/85afa4e6d30f308d445edcd51ca6b06f705a92c6/lib/alg/topsort.ts), and [JSON projection](https://github.com/dagrejs/graphlib/blob/85afa4e6d30f308d445edcd51ca6b06f705a92c6/lib/json.ts)

The installed owner skill is explicitly V4-only: its description names Effect V4, its compatibility field says `Requires Effect v4`, and it requires checking the project-pinned version and current upstream source before guessing. That prevents later agents working on Effect V3 code from silently treating this evaluation as V3 API guidance.

## Required domain shape

### Identity

`TaskId` is the tracker-neutral, branded identity supplied by the tracker port. It is the key of the canonical map. Task data must not repeat its own `TaskId`, because a key and embedded identity could disagree.

The graph module may use internal hashes, HAMT nodes, array positions, traversal counters, or temporary colors. None is domain identity. There is no durable `TaskId <-> NodeIndex` registry.

### Dependency direction

Use the domain relation **prerequisite precedes dependant**. An edge described generically as `u -> v` therefore means:

> task `u` is a prerequisite of task `v`.

Do not expose generic `source` and `target` fields at the tracker or Ralph boundary. Use named fields or operations: `prerequisite`, `dependant`, `prerequisitesOf`, and `dependantsOf`. GitHub's native `blockedBy` relation projects by reversing the read perspective: if `v` is blocked by `u`, store `u` in `v`'s prerequisite set.

This direction makes blockers the predecessors of a task, dependants its successors, and tasks with no prerequisites graph sources. Whether a source is runnable still depends on typed lifecycle and claim facts; graph source and runnable frontier are not synonyms.

### Canonical storage

The representation should be equivalent to this conceptual shape, while the real fields and constructors remain module-private:

```typescript
interface TaskDagSnapshot<TaskProjection> {
  readonly revision: TrackerRevision;
  readonly dag: TaskDag<TaskProjection>;
}

// Opaque outside its owning module.
interface TaskDag<TaskProjection> {
  readonly tasks: HashMap<
    TaskId,
    {
      readonly projection: TaskProjection;
      readonly prerequisites: HashSet<TaskId>;
    }
  >;
}
```

The actual public API must not export a constructible interface with these fields. A total parser/builder accepts one complete wire snapshot and returns a typed accumulated-error result or an opaque `TaskDagSnapshot`. That constructor is the boundary making invalid graph states unrepresentable to consumers.

Each dependency is stored once, in the dependant's prerequisite set. A persistent reverse-adjacency map would duplicate the same fact and could contradict the canonical set. `dependantsOf` should initially scan the task map. If profiling later proves that insufficient, derive a reverse index within one query/scheduling pass or introduce a private representation whose constructor and update operation make the paired indexes atomic; do not serialize or journal both directions.

### Snapshot revision

`TrackerRevision` is a branded value produced by the tracker port from one complete read. Its concrete GitHub representation belongs to [Define Ralph's tracker port and graph reconciliation contract](https://github.com/dearlordylord/5e-quint/issues/185), not this graph type.

A revision identifies the tracker observation, not the graph's allocation history or content hash. Two snapshots may have equal task content and different tracker revisions. Conversely, two values claiming the same revision but decoding to unequal canonical content are a typed reconciliation contradiction.

The snapshot wrapper must contain exactly one revision and one DAG. Do not repeat revision identity on nodes, edges, or derived indexes.

## Construction and validation

Decode the boundary payload with Effect Schema, then build the opaque DAG while accumulating independent projection issues. Do not throw for malformed tracker data, missing endpoints, cycles, or contradictions; those are expected reconciliation failures.

The builder must reject at least:

- duplicate task records for one `TaskId`, even if their bodies happen to match;
- duplicate dependency declarations, because they expose a tracker-adapter or snapshot-completeness defect rather than meaningful multiedges;
- a prerequisite `TaskId` absent from the same complete snapshot;
- self-dependency;
- every directed cycle, with a deterministic cycle or strongly connected component witness.

Lifecycle, claim, native-parent/sub-issue, partial-read, and same-revision/unequal-content contradictions belong to the tracker projection and reconciliation algebra. The DAG builder should accept only the tracker facts its graph invariants require; it must not infer grouping from dependencies or dependencies from grouping.

Build deterministically:

1. Decode and brand task and revision identifiers.
2. Sort task records by the canonical `TaskId` comparator.
3. Detect duplicates before constructing a map, so map overwrite cannot erase evidence.
4. Sort each dependency list by that same comparator and detect duplicates.
5. Check endpoints and self-edges.
6. Run cycle detection over sorted tasks and sorted prerequisite sets.
7. Construct the opaque persistent value only when the complete issue set is empty.

Use Kahn's algorithm for the deterministic topological order. If nodes remain, run a deterministic DFS or SCC pass over the sorted remainder to produce stable cycle witnesses. The algorithm is small enough to own and test; Ralph does not need shortest paths, undirected graphs, multigraphs, graph mutation scopes, GraphViz state, or general walkers.

## Queries

Expose only domain queries with deterministic `TaskId` ordering:

- `task(snapshot, taskId)` returns a typed `Option`.
- `prerequisitesOf(snapshot, taskId)` reads the canonical set.
- `dependantsOf(snapshot, taskId)` derives the reverse relation.
- `topologicalOrder(snapshot)` derives the deterministic total order and cannot fail for a valid opaque DAG.
- `dependencyFrontier(snapshot)` selects typed tracker candidates whose every prerequisite task has the lifecycle fact that satisfies the dependency.
- `transitiveDependantsOf(snapshot, taskId)` supports quarantine propagation without changing unrelated branches.

The runnable frontier is an orchestration projection, not graph state. It combines graph prerequisites with the same snapshot's typed tracker lifecycle and claim facts. The tracker-port/lifecycle algebra must supply one domain helper used inside `dependencyFrontier`; callers must not pass arbitrary predicates or remember which lifecycle variants count. Do not store `isFrontier`, `isRunnable`, in-degree, or eligibility beside their sources. Do not accept a separate set of completed task IDs when the task projections already carry completion; that would create a second spelling of lifecycle state.

Traversal tie-breaking must use one explicit canonical `TaskId` order. That order guarantees replayable output but does not assert scheduling priority. If the tracker port later provides a real priority or rank, scheduling should model that as a separate typed policy fact and use `TaskId` only as the final tie-breaker.

## Serialization

Do not serialize a library graph object or Effect's HAMT layout. Define a versioned Schema wire projection containing:

- schema version;
- tracker revision;
- task records sorted by `TaskId`;
- for each task, its projection and a present (possibly empty) sorted prerequisite array.

An empty prerequisite array is the single representation of no prerequisites; omission is not a second spelling. Encoding sorts all map/set iteration explicitly. Decoding re-runs the complete DAG builder. A decode followed by encode therefore yields canonical bytes independent of insertion or hash order.

This wire form is evidence and cache material, not a canonical task ledger. Restart must refresh/reconcile it against the tracker and journal under the contracts selected by the tracker and journal tickets.

## Candidate comparison

| Criterion               | Effect V4 `Graph`                                                         | Graphology                                                              | Graphlib                                           | Ralph-owned persistent DAG                                     |
| ----------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------- |
| Task identity           | Allocated numeric `NodeIndex`; requires a separate mapping to `TaskId`    | String-coerced node keys                                                | String node IDs                                    | Branded `TaskId` is the canonical key                          |
| Dependency direction    | Directed edges, but generic source/target                                 | Directed graph option                                                   | Directed by default                                | Domain-named prerequisite/dependant relation                   |
| Cycles                  | `isAcyclic`; `topo` throws `GraphError`                                   | DAG add-on throws ordinary `Error`                                      | `topsort` throws `CycleException`                  | Typed accumulated projection issues with deterministic witness |
| Predecessors/successors | Both exist as of the June 2026 beta change                                | Both available                                                          | Both available                                     | Predecessor direct; successor derived from one edge source     |
| Frontier                | Generic sources/externals only                                            | Generic in-degree traversal                                             | `sources()` only                                   | Lifecycle-aware derived domain query                           |
| Determinism             | Allocation and insertion order affect indices and walkers                 | Insertion order affects traversal                                       | Object-key and insertion behavior affect traversal | Explicit `TaskId` comparator at every boundary                 |
| Structural sharing      | None; mutation scope copies maps and every adjacency array                | Mutable event-emitting graph                                            | Mutable object graph                               | Effect V4 HAMT `HashMap`/persistent `HashSet`                  |
| Snapshot immutability   | Public `Map`/array fields remain mutable; acyclic cache mutates reads     | Mutable instance; copy/import required                                  | Mutable instance; copy/read required               | Opaque persistent value constructed once                       |
| Revision identity       | Not modeled                                                               | Could be graph attributes, still mutable                                | Could be graph label, still mutable                | Branded revision in one snapshot wrapper                       |
| Serialization           | `toJSON` reports only counts/type; diagram exporters are not state codecs | Export/import supported, requires canonical sorting and domain decoding | JSON read/write supported, uses untyped values     | Exact versioned Schema projection, sorted and revalidated      |
| Surface area            | General directed/undirected algorithms and visualization                  | General multigraph ecosystem                                            | General graph algorithms and compound graphs       | Only Ralph DAG construction and queries                        |

## Follow-up candidate: `@thi.ng/dgraph`

[`@thi.ng/dgraph` 2.1.210](https://registry.npmjs.org/@thi.ng%2Fdgraph/2.1.210) is the closest surveyed library to Ralph's actual problem. It is a small, stable, production-used DAG package rather than a general graph toolkit. It accepts generic node values directly, detects cycles during dependency insertion, exposes immediate and transitive dependencies/dependants, identifies roots and leaves, and topologically sorts. A branded string `TaskId` could therefore remain the node key without an allocated-index registry. Its `addDependency(node, dependency)` orientation also maps directly to the canonical prerequisite set selected above.

It nevertheless fails the authoritative snapshot requirements:

- `DGraph` is mutable, and its `dependencies` and `dependents` maps are public mutable fields.
- Each edge is stored in both maps. Library methods update them together, but the public representation can express contradictory directions and therefore does not make invalid states unrepresentable.
- `copy()` deep-copies both maps and every adjacency set. `sort()` makes that full copy and destructively removes edges from the copy; there is no persistent structural sharing between revisions.
- Cycle and self-edge detection throw an illegal-argument exception on the first offending insertion rather than returning accumulated typed projection issues with deterministic witnesses.
- Traversal tie-breaking follows `EquivMap`/`ArraySet` iteration and insertion order; the API has no canonical comparator.
- The core package has no revision identity or state serialization contract. Its companion serializer targets Graphviz DOT, not a round-trippable task snapshot.
- `removeNode` deletes only the node's dependency-map entry; it does not remove the reverse entry or all incident relationships, so it is not the total graph-update operation Ralph would require.

Wrapping `DGraph` would still require Ralph to own immutability, a non-duplicated canonical edge source, typed accumulated errors, deterministic ordering, revision identity, Schema serialization, and lifecycle-aware frontier logic. Those are nearly the entire Ralph-specific structure, while the package would also add five declared `@thi.ng` dependencies to an Effect control plane.

Disposition: retain `@thi.ng/dgraph` as useful prior art for the domain vocabulary and compact dependency-query surface, and add it to the prototype comparison only if a mutable-copy baseline is informative. It does not change the decision to own the persistent DAG.

## Why Effect V4 Graph is not the domain representation

Effect V4 `Graph` has useful algorithms, and the June 2026 additions now provide explicit `predecessors` and `successors`. Those benefits do not overcome four mismatches.

First, node identity is an allocated plain number. Ralph would need a second bidirectional mapping between tracker identity and `NodeIndex`, plus insertion-order discipline to make serialized evidence and tests stable. That is exactly the distant identity/position connascence the ticket forbids.

Second, its immutable boundary is shallow. `Proto` publicly exposes native mutable `Map`s and mutable adjacency arrays. `beginMutation` clones all node and edge maps and every adjacency array; `endMutation` copies the maps again and reuses the mutable adjacency maps. This is copy-on-mutation, not structural sharing. `isAcyclic` also memoizes by assigning to the graph during a query. Ralph would still need an opaque wrapper to enforce snapshot immutability.

Third, ordinary projection failures do not match Ralph's typed boundary. Missing nodes and cyclic topological sorts throw `GraphError`; serialization does not preserve graph state. A wrapper would need to reimplement boundary decoding, error accumulation, canonical identity mapping, revision handling, and deterministic encoding—the difficult parts.

Fourth, V4 remains fast-moving. Twenty-five beta versions were published between 2026-05-28 and 2026-07-17, and Graph's directed-neighbor API and algorithm behavior changed in June. Owning the small domain surface localizes that churn to persistent-collection imports rather than binding the orchestration contract to an experimental general graph API.

Disposition: do not qualify Effect V4 `Graph` for authoritative use. A disposable prototype may compare it behind the same fixtures, but success does not promote `NodeIndex` into Ralph's model.

## Why Graphology and Graphlib are not selected

Graphology is a credible, mature graph ecosystem with serialization and a DAG algorithm package. Its reference implementation is an event-emitting mutable graph, coerces node keys to strings, allows self-loops by default, and reports DAG misuse/cycles by throwing ordinary errors. Making it a Ralph snapshot requires an opaque copy boundary, branded-key parsing, typed issue accumulation, deterministic sorting, revision wrapping, and lifecycle-aware frontier logic.

Graphlib 4.0.1 is active and now TypeScript-native. It supplies string node IDs, predecessors, successors, sources, cycle algorithms, and JSON read/write. Its graph is nevertheless mutable, its generic labels default to `any`, its topological sort throws, and it stores several paired adjacency indexes internally. It solves more general graph problems than Ralph needs while still leaving the domain boundary work to Ralph.

Immutable.js is a credible persistent-collection alternative, but it supplies collections rather than a task-DAG contract. Adding it beside an Effect V4 control plane would not reduce Ralph-owned graph code and would create another collection/equality/version surface. Effect V4's existing HAMT `HashMap` and persistent `HashSet` are the smaller substrate.

## Prototype and implementation consequences

[Prototype Ralph's graph-native control-plane seams](https://github.com/dearlordylord/5e-quint/issues/182) should use the Ralph-owned representation as the baseline and may compare Effect V4 `Graph` only through identical black-box fixtures. The comparison must not add a durable identity registry.

The prototype evidence should include:

1. Equal canonical encodings from multiple task/dependency insertion orders.
2. Aggregated duplicate, missing-endpoint, self-edge, and multi-cycle issues.
3. Stable predecessor, dependant, topological, frontier, and transitive-dependant results.
4. A snapshot update that preserves the old value and demonstrates persistent update semantics; source qualification records the HAMT structural-sharing guarantee without coupling tests to its layout.
5. Quarantining one task blocks only its transitive dependants.
6. Round-trip Schema decoding/encoding, normalization of unordered input to canonical output, and rejection of contradictory input.

[Define Ralph's tracker port and graph reconciliation contract](https://github.com/dearlordylord/5e-quint/issues/185) must decide the concrete `TaskId`, `TrackerRevision`, completeness, lifecycle, and claim algebras. It should supply the full typed task projection and the one dependency-satisfaction helper consumed inside `dependencyFrontier`; the graph module and its callers must not invent parallel completion or claim state.

[Design deterministic verification for Ralph's orchestrator](https://github.com/dearlordylord/5e-quint/issues/187) should include property-based generation of valid DAGs and invalid cyclic snapshots. Useful properties are insertion-order invariance, every topological edge ordering, encode/decode idempotence, frontier equivalence to the mathematical definition, transitive-dependant locality, and preservation of prior snapshots after updates.

## Connascence and state-space review

- Changing dependency direction must change exactly one named builder and its domain queries; no generic `source`/`target` convention crosses modules.
- Changing tracker identity encoding affects the tracker port's brand/parser and the one canonical comparator, not graph allocation indexes.
- Changing serialization order affects the one codec; internal hash iteration is never evidence order.
- Cycle safety is established once by the opaque constructor; downstream topological traversal accepts `TaskDag`, not a wider unchecked graph, and therefore does not revalidate or throw.
- Prerequisites are stored once. Reverse adjacency, frontier membership, in-degree, runnable state, and transitive dependants are derived.
- Empty prerequisite collections are present and meaningful; no optional field duplicates the empty state.
- Snapshot revision, task lifecycle, claim facts, dependencies, journal history, and derived scheduling state remain distinct concepts with one owner each.

## Review result

RAW and D&D ubiquitous-language review found no modeled D&D rule or terminology change; this is orchestration infrastructure. Tooling-architecture/domain review found the owned opaque DAG consistent with tracker authority, Git authority, durable-journal boundaries, bounded leaves, quarantine locality, and the existing graph-native tooling architecture decision. Connascence review rejected the `NodeIndex` mapping and paired durable adjacency indexes. Code-review rules were applied to the proposed type/error/serialization boundaries: external failures remain typed data, invalid graph states are hidden behind one constructor, and derivable state is not stored.
