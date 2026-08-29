# @dnd/battle-runtime

`@dnd/battle-runtime` owns battle execution for already-composed creature
inputs: initialization, turn state, act discovery, hole/fill replay, resolution,
interrupts, and caller snapshots.

It is not an authored-content or character-building package. Surface owns Units,
Spells, and Stat Blocks; character runtimes own build legality and persistent
character state; composition projects those facts into battle initialization.

## Boundary

| Source outside battle                          | Composition output            | Battle-owned state    |
| ---------------------------------------------- | ----------------------------- | --------------------- |
| Character Build plus selected Units            | `CharacterBattleCreatureInit` | `BattleCreatureState` |
| Surface `StatBlockRecord` for a monster or NPC | `StatBlockBattleCreatureInit` | `BattleCreatureState` |

Callers construct `BattleCreatureInit[]` and then call `startBattle`. Every init
contains a caller-supplied Initiative score. Stat-block inputs also carry an
explicit collection of the currently supported standalone initial conditions;
the initializer rejects a condition forbidden by that Stat Block. The runtime
orders combatants, preserves caller order for ties, and reduces admitted initial
conditions through the canonical condition algebra; it does not roll or derive
Initiative.

Do not conflate a Character Build, Stat Block, Unit, initialization input, and
durable battle state. The package must not import character-creation runtimes or
monster catalogs to reconstruct facts composition already owns.

Spell component text and cost/consumption flags are authored Spell facts.
Battle may spend a Spell Slot and apply admitted battle-visible effects, but
equipment access, focus/pouch substitution, hand legality, and consumed
component inventory mutation belong outside battle.

### Admission, execution, and presentation

Procedure code has three one-way ownership zones:

| Zone           | Owns                                                                 | Dependency rule                              |
| -------------- | -------------------------------------------------------------------- | -------------------------------------------- |
| `admission`    | Parses Surface and retained composition facts into procedure facts   | May depend on execution, never presentation  |
| `execution`    | Authored-free state, discovery, holes/fills, replay, and resolution  | Must not depend on admission or presentation |
| `presentation` | Joins execution refs to retained identity and caller-facing displays | Must not feed identity back into execution   |

New procedure owners live under `src/procedure-admission/`,
`src/procedure-execution/`, and when needed `src/act-presentation/`.
`battle-session-execution.ts` orchestrates admitted session work;
`battle-state-execution.ts` owns state-only dispatch;
`battle-execution-composition.ts` supplies the authored-free procedure registry.
The registry is an operation dependency, never Battle State or session state.

Restricted Stat Block spell invocation currently has an admission foundation,
not an execution owner. `admitStatBlockSpellInvocationDeltas` accepts only the
non-empty typed Surface deltas and returns one precise missing-owner result per
delta. It cannot receive spell or Stat Block identity, provenance, or authored
expression. Adding this classification does not admit an invocation, change its
procedure-pressure disposition, or claim Battle or Quint parity.

Find Familiar's authored Stat Block lookup is owned by
`find-familiar-stat-block-catalog.ts` and is threaded only through admission
and presentation; runtime state retains projected source-free execution facts
and the presentation companion, not the authored record.
Druid Wild Shape keeps its authored presentation projection in
`druid-wild-shape-known-form-execution.ts`, while the source-free known-form
facts used by execution are owned by `druid-wild-shape-known-form-runtime.ts`.

Canonical mechanical vocabulary may still come from Surface or shared owners.
Do not duplicate abilities, damage types, dice, ranges, or durations merely to
avoid a package import.

`pnpm check:battle-runtime-import-ownership` starts from the declared execution
entry points, checks their complete reachable import closure, and rejects paths
into admission or presentation. Unresolved local imports and non-literal
dynamic loading fail the gate.

## Reducer extensibility

The reducer implements reusable SRD procedure families, not one branch per
Unit, Spell, feature, monster action, name, id, or slug.

Choose the smallest appropriate change:

- **Data-only:** widen Surface data and contract tests when the record already
  fits an implemented profile and procedure.
- **Admission:** widen a structural support-profile parser when Surface can
  express the facts but the current gate does not admit them.
- **Procedure:** add or widen execution only for a distinct reusable resolution
  shape such as timing, targeting, resource, interrupt, movement, save, or
  persistent-effect behavior.
- **State:** add durable Battle State only when execution needs a fact that
  cannot be derived from existing state or retained origin records.

Parse support once and carry the narrowed profile through discovery and
resolution. Unsupported legal content should produce a precise unsupported-shape
result at admission, never partial reducer behavior.

Authored identity may be retained at catalog, composition, admission, and
presentation boundaries, but it must be inert during execution. Runtime subjects
use typed execution references and procedure facts. The standing enforcement is:

```sh
pnpm check:authored-id-dispatch
pnpm check:battle-runtime-import-ownership
pnpm check:battle-runtime-test-support-boundary
```

Allowlist additions must name a narrow boundary and reason. Do not add broad
package wildcards.

Surface holes describe authored source shapes. Battle holes are runtime asks
needed to resolve a selected subject. This package may reuse shared hole identity
primitives, but its public API exposes only battle-owned holes and fills.

Reusable semantics belong in the relevant rule-core QNT algebra. Focused battle
QNT owns integration with reducer state, replay, and cleanup. Catalog breadth is
a deterministic report/contract-test concern; QNT and MBT target procedure
behavior and high-risk composition, not one trace per authored record.

## Support profiles and coverage

A `SupportProfile` is a parsed proof that an authored Surface shape matches an
implemented runtime procedure. It is an admission/dispatch value, not a second
authored DSL, support-status label, or durable state.

The profile type and parser are the executable inventory of admitted shapes.
Do not duplicate that evolving list here. Current breadth and evidence are owned
by:

- [`plans/unit-profile-coverage/UNIT_REPORT.md`](../../plans/unit-profile-coverage/UNIT_REPORT.md)
  for Surface Units and support-profile breadth;
- [`plans/rules-kernel-coverage/REPORT.md`](../../plans/rules-kernel-coverage/REPORT.md)
  for reducer-semantic obligations and parity;
- focused tests beside `src/` for admission and replay evidence.

`admitCompleteUnitMechanicsGraph` is the context-independent catalog-install
view of that same parser. It checks every composite branch separately, checks
every represented passive branch against the admitted profile projection,
checks schema-declared authored dependencies and references through Surface's
canonical authored-link walker, requires the root to be the exact member of
that decoded Surface, and returns typed non-empty rejection issues or a
parse-once support plan. That plan retains static typed families needed to
apply Character class levels, source facts, and an authored selection later;
binding never reparses the authored Unit. Battle installation adds a private
nominal proof that only these Unit and Stat Block authorities can establish.
It does not create a support registry, admission receipt, or Runtime Hole.
This boundary changes no rule or reducer semantics, so it has no RAW, QNT, or
battle-MBT owner of its own.

When behavior widens, update the registry source, executable owner, and focused
QNT/runtime evidence together, then regenerate the reports through their public
checks.

## Runtime protocol

1. Call `startBattle(BattleCreatureInit[])` to create durable `BattleState`.
2. Read `snapshotBattle(state)` and `discoverBattleActs(state)`.
3. Choose a `BattleSubject` and call
   `resolveBattleSubject({ state, subject, fills })`.
4. On `needsHoles`, retain submitted fills outside Battle State and replay the
   same subject against the returned durable state with all accumulated fills.
5. On `resolved`, commit the returned state. On `invalid`, do not commit a new
   state.

Subject resolution is replay-from-root. Battle State stores durable combat facts,
not partially answered forms or derivable projections.

Reaction windows carry an `interruptStack` in returned durable state. The caller
must commit that state before resolving or declining the Reaction. The runtime
then spends the admitted Reaction, resolves its nested holes, and resumes the
interrupted continuation; callers must not reproduce that sequencing.

### Core terms

- `BattleState` — durable battle id, Initiative order, combatants, and turn
  resources.
- `BattleCreatureState` — durable runtime state for one `CombatantId`.
- `BattleSubject` — replay key for one discovered act; add one for a reusable
  procedure, not a named authored ability.
- `BattleHole` / `BattleFill` — missing runtime input and its caller answer.
- `SupportProfile` — admitted structural proof for one procedure family.
- `origin` — retained Character or Stat Block facts; origin is not provenance.
- `BattleSnapshot` — JSON-friendly caller view that excludes internal maps and
  implementation-only state.
- `interruptStack` — durable Reaction frame and continuation state.

## State ownership

Battle State stores durable combat facts and origin references needed to
rediscover acts. It does not copy scalars already owned by structured state or
retained records.

Character-origin creatures retain selected Unit refs, resolved attack facts,
feature resources, and spellcasting runtime state. Character Build owns starting
access and capacity; battle owns uses and slots expended during combat.

Stat Block-origin creatures retain a source-free execution projection and its
presentation companion. Admission consumes the authored `StatBlockRecord` once;
discovery and resolution use projected supported attacks, limits, and damage
adjustments rather than reading the authored record at runtime.

Armor Class uses `ArmorClassState`, turn resources use
`RuntimeActionResource[]`, and zero-HP lifecycle is a typed union. New state must
follow the repository-wide no-redundant-state rule.

## Quint, MBT, and RAW parity

The TypeScript runtime owns promoted execution. Semantic authority lives in the
mapped semantic-core rule slices; focused battle projections and witnesses
provide parity evidence. There is no package-local aggregation spec. Locate the
obligation and its role-classified owners through the
[`rules-kernel-coverage` registry](../../plans/rules-kernel-coverage/README.md).

Use deterministic tests for ordinary catalog width. Add integrated MBT only for
bounded, implemented behavior crossing reducer responsibilities where replay,
ordering, interrupts, or state transitions create meaningful risk. Quint must
author expected semantics; never generate expected QNT state from TypeScript.

Package-specific witness rules:

- simulate a small `*.mbt.qnt` root with one matching `src/*.mbt.test.ts` driver;
- import only small pure leaves and keep fixture bounds explicit;
- project narrow semantic facts, not full Battle State or authored records;
- call production entrypoints instead of reimplementing reducer decisions;
- use `WitnessProtocol[h]` for typed replay outcomes.

The canonical small example is `battle-runtime-death-saving-throw.mbt.qnt` with
`src/death-saving-throw.mbt.test.ts`. Process safety, closure limits, seed
reproduction, and Quint syntax guidance live in
[`docs/agents/QNT-MBT.md`](../../docs/agents/QNT-MBT.md).

`pnpm check:qnt-inventory` rejects every package QNT file that is neither an
executable root nor transitively imported by one. The guarded root `pnpm
proof:qnt` and `pnpm quality` lanes run this gate; package-local proof work must
run the listed inventory check separately. This README therefore does not
maintain a parallel QNT file inventory.

Runtime behavior and focused tests must cite the relevant local SRD 5.2.1
passage. Modeling choices belong in `ASSUMPTIONS.md`; coverage accounting belongs
in the generated reports above.

## Entry points and verification

Key entrypoints:

- `src/index.ts` — public API facade;
- `src/battle-init.ts` — caller initialization contracts;
- `src/battle-session-execution.ts` — admitted session orchestration;
- `src/battle-state-execution.ts` — state-only execution;
- `src/battle-subjects.ts` — public subject and replay vocabulary;
- `src/unit-feature-support.ts` and
  `src/battle-reducer/spells-profiles-support.ts` — support-profile boundaries;
- focused tests beside their executable owners — deterministic evidence.

Useful checks:

```sh
pnpm --filter @dnd/battle-runtime typecheck
pnpm --filter @dnd/battle-runtime test
pnpm check:battle-runtime-import-ownership
pnpm check:authored-id-dispatch
pnpm check:qnt-inventory
pnpm --filter @dnd/battle-runtime test:qnt-proofs
```

Proof and MBT commands are opt-in and resource-guarded. Run them only when the
change requires them, following `docs/agents/QNT-MBT.md`.
