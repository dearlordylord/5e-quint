# @dnd/battle-runtime

Executes battles over composed creature inputs: initialization, turns, Act
discovery, holes/fills, interrupts, and snapshots. Surface owns authored content;
character runtimes own builds and sheets; composition supplies battle inputs.

## Boundary

| Origin                             | Initialization input          | Durable state         |
| ---------------------------------- | ----------------------------- | --------------------- |
| Character Build and selected Units | `CharacterBattleCreatureInit` | `BattleCreatureState` |
| Monster/NPC `StatBlockRecord`      | `StatBlockBattleCreatureInit` | `BattleCreatureState` |

Call `startBattle(BattleCreatureInit[])` with caller-supplied Initiative scores.
Battle orders combatants and preserves caller order for ties; it does not roll
or derive Initiative. Stat Block inputs carry explicit supported initial
conditions; initialization rejects forbidden conditions and applies the canonical
condition algebra.

Do not import character-creation runtimes or monster catalogs to reconstruct
composition-owned facts. Spell components, equipment access, focus/pouch
substitution, hand legality, and consumed-component inventory remain outside
Battle; Battle owns admitted effects and slot expenditure.

The package root exports the full API; `consumer-protocol` owns its narrower
consumer contract. Schema-only consumers can use `protocol-codecs` without
loading the full runtime.

### Admission, execution, and presentation

| Zone           | Owns                                              | Dependency rule                              |
| -------------- | ------------------------------------------------- | -------------------------------------------- |
| `admission`    | Surface/retained facts → narrowed procedure facts | May depend on execution, never presentation  |
| `execution`    | State, discovery, holes/fills, replay, resolution | Must not depend on admission or presentation |
| `presentation` | Joins execution refs with identity/display facts  | Must not feed identity into execution        |

Procedure owners live in `src/procedure-admission/`, `src/procedure-execution/`,
and `src/act-presentation/`. The registry supplied by
[battle-execution-composition.ts](src/battle-execution-composition.ts) is an
operation dependency, never stored state. Reuse canonical Surface/shared
mechanical vocabulary instead of duplicating it to avoid imports.

Specialized boundaries:

- [Restricted Stat Block invocation](src/procedure-admission/stat-block-spell-invocation-deltas.ts)
  classifies typed deltas and missing owners; classification alone does not admit
  execution or establish parity.
- [Familiar catalog lookup](src/find-familiar-stat-block-catalog.ts) stays in
  admission/presentation.
- Wild Shape separates [presentation](src/druid-wild-shape-known-form-execution.ts)
  from [known-form runtime facts](src/druid-wild-shape-known-form-runtime.ts).

## Runtime protocol

1. Initialize Battle, then call `discoverBattleActCandidates(state)` for
   presentation-free candidates.
2. Select a `BattleSubject` and call
   `resolveBattleRuntimeSubject({ session, subject, fills })`.
3. Continue from the returned `BattleCheckpointFrontierEnvelope`: exactly one
   durable checkpoint paired with `acts`, ordered non-empty `holes`, or
   `interruptDecision`.

| Outcome                                        | Continuation contract                                                                              |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Ordinary procedure needs holes                 | Preserve the incoming checkpoint; replay the subject from its root with accumulated accepted fills |
| Interrupt opens or continues                   | Commit the runtime-owned durable checkpoint before resolving or declining a Reaction               |
| Fill rejected                                  | Preserve the session and preceding envelope for retry                                              |
| Ordinary resolution or closed interrupt window | Commit once and return an Acts frontier                                                            |
| Interrupt decision leaves responders           | Return the durable checkpoint with an interrupt-decision frontier                                  |

Hole frontiers distinguish `ordinaryReplay` from `runtimeOwnedInterrupt`.
Interrupt frames retain the exact continuation; the runtime spends the admitted
Reaction, resolves nested holes, and resumes interrupted work. Callers must not
reproduce that sequencing.

For an ordinary `holes` frontier, `replaySubject` identifies the resolver input
that will be replayed with the accepted fill prefix. `pendingProcedure` identifies
the execution procedure that currently owns the Hole request. Turn-boundary
requests carry their ending actor, canonical source turn, and (for an individual
start-turn occurrence) its canonical kind and occurrence id. These are one
projection of the execution request; sequence, cohort, prefix, and continuation
facts remain in their existing runtime checkpoint structures. See
[ADR-0010](../../docs/adr/0010-battle-pending-procedures-derive-from-execution-requests.md).

The public session trace discovers `initialHoles[]` before publishing the first
envelope. Submitting an End Turn command with no fills first returns its outgoing
replay frontier; after the accepted prefix is supplied, the same replay reaches
the incoming start-turn Death Saving Throw frontier and preserves its durable
checkpoint and replay subject. A rejected or stale fill returns that correlated
frontier for retry. An active Reaction remains a singular `interruptDecision`
frontier; after it closes, the resumed boundary procedure is projected from the
canonical sequence occurrence.

Battle end is a Table Decision. There is no terminal/victory result variant;
an Acts frontier may be empty. Snapshot/presentation projections do not add
terminal state. Surface holes describe authored shapes; this API exposes only
Battle-owned holes and fills.

### Core terms

- `BattleState`: durable battle id, Initiative order, combatants, and turn facts.
- `BattleCreatureState`: state for one `CombatantId`.
- `BattleSubject`: typed replay key for a discovered Act.
- `BattleHole` / `BattleFill`: required input and its answer.
- `BattleSnapshot`: purified checkpoint excluding frontiers, execution cursors,
  and presentation joins.
- `interruptStack`: durable Reaction frames and continuations.
- `origin`: retained Character or Stat Block facts, distinct from provenance.

## State ownership

Store durable combat facts and the origin references needed for discovery.
Do not store partial ordinary procedures or duplicate derivable state.

Character origins retain selected refs, attack facts, resources, and spellcasting
state. Initialization routes each selected feature Unit through exactly one path:
`resources` for battle Pools, or `unitFeatures` for profiles without a Pool.
Admission rejects a Unit in both collections. Resource-feature procedures derive
from the canonical Unit retained by the resource input.

Stat Block admission consumes the authored record once. Discovery and resolution
use its source-free execution projection; identity stays in the presentation
companion. Armor Class uses `ArmorClassState`, turn resources use
`RuntimeActionResource[]`, and zero-HP lifecycle is a typed union.

## Reducer extensibility

Implement reusable SRD procedures. Authored identity must be inert during
execution; subjects carry typed execution refs and procedure facts.

| Need                                                                           | Change                           |
| ------------------------------------------------------------------------------ | -------------------------------- |
| Record fits an implemented profile/procedure                                   | Surface data and contract tests  |
| Expressible shape is not admitted                                              | Owning structural support parser |
| New timing, targeting, resource, interrupt, movement, save, or effect behavior | Reusable procedure               |
| Execution needs a non-derivable durable fact                                   | Battle State                     |

Parse support once and carry the narrowed profile through discovery/resolution.
Unsupported content must return a precise admission failure, never partial
execution. Allowlist additions require a narrow boundary and reason; no package
wildcards.

## Support profiles and coverage

A `SupportProfile` proves an authored shape matches an implemented procedure.
It is an admission value, not another authored DSL, status label, or stored state.
Its type/parser own the executable inventory.

- [Unit report](../../plans/unit-profile-coverage/UNIT_REPORT.md): authored breadth.
- [Rules-kernel report](../../plans/rules-kernel-coverage/REPORT.md): obligations and parity.
- Focused tests beside each owner: admission and replay evidence.

When widening behavior, update the owner, registry, and QNT/runtime evidence
together; regenerate reports through their public checks.

## Quint, MBT, and RAW parity

Mapped semantic-core slices own rules semantics; focused Battle models and
witnesses check integration. There is no package-local aggregation spec.
Find each obligation's owners in the [registry](../../plans/rules-kernel-coverage/README.md).

Use deterministic tests for catalog width; bounded MBT for risky composed
behavior. Quint authors expected semantics: never generate expected QNT state
from TypeScript results. Each MBT witness must:

- pair a small `*.mbt.qnt` root with a `src/*.mbt.test.ts` driver;
- import small pure leaves and state fixture bounds;
- project narrow mechanical facts, not full state or authored records;
- call production entrypoints and use `WitnessProtocol[h]`.

See [the death-save model](battle-runtime-death-saving-throw.mbt.qnt) and
[driver](src/death-saving-throw.mbt.test.ts) for a small example.
Cite local SRD passages in rules behavior/tests; put ambiguous modeling choices
in [ASSUMPTIONS.md](../../ASSUMPTIONS.md).

## Entry points and verification

| Work                           | Owner                                                                                                                               |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Initialization                 | [battle-init.ts](src/battle-init.ts)                                                                                                |
| Session orchestration          | [battle-session-execution.ts](src/battle-session-execution.ts)                                                                      |
| State-only dispatch            | [battle-state-execution.ts](src/battle-state-execution.ts)                                                                          |
| Subjects and replay vocabulary | [battle-subjects.ts](src/battle-subjects.ts)                                                                                        |
| Feature/spell support          | [unit-feature-support.ts](src/unit-feature-support.ts), [spells-profiles-support.ts](src/battle-reducer/spells-profiles-support.ts) |

```sh
pnpm --filter @dnd/battle-runtime typecheck
pnpm --filter @dnd/battle-runtime test
pnpm check:battle-runtime-import-ownership
pnpm check:authored-id-dispatch
pnpm check:battle-runtime-test-support-boundary
```

The import-ownership gate checks the reachable execution closure and rejects
admission/presentation paths, unresolved imports, and non-literal dynamic loading.
For proof/MBT work, follow [QNT/MBT limits](../../docs/agents/QNT-MBT.md); run
`pnpm check:qnt-inventory` with package-local proofs. The root proof/milestone
lanes already run that gate, which rejects QNT files unreachable from executable
roots.
