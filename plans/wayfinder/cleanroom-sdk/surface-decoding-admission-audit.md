# Surface Decoding and Admission Boundary Audit

Wayfinder research for [Audit the authoritative Surface decoding and admission
boundary](https://github.com/dearlordylord/5e-quint/issues/14), investigated at
source commit `2d83615da722975e1a51932386fb454cc54220fe`.

Commit-specific inventory and parser observations in this audit are reproducible
with read-only commands:

```sh
rg --files packages/surface/content -g '*.dhall' | wc -l
rg --files packages/surface/content -g '*.json' | wc -l
comm -23 \
  <(rg --files packages/surface/content -g '*.dhall' | sed 's/\.dhall$//' | sort) \
  <(rg --files packages/surface/content -g '*.json' | sed 's/\.json$//' | sort)
comm -13 \
  <(rg --files packages/surface/content -g '*.dhall' | sed 's/\.dhall$//' | sort) \
  <(rg --files packages/surface/content -g '*.json' | sed 's/\.json$//' | sort)
rg -n 'magic_item_staff_of_charming' \
  packages/surface/src/surface/unit-catalog.ts \
  packages/surface/src/surface/stat-block-catalog.ts
```

The outputs are 604 Dhall files, 604 JSON files, Dhall-only `_types`, JSON-only
`magic_item_staff_of_charming`, and no catalog import for the JSON-only file.
The Effect parser behavior was checked with:

```sh
pnpm --filter @dnd/surface exec tsx -e \
  'import { Schema } from "effect"; const loose = Schema.decodeUnknownEither(Schema.Struct({ a: Schema.String }))({ a: "kept", extra: "stripped" }); const strict = Schema.decodeUnknownEither(Schema.Struct({ a: Schema.String }).annotations({ parseOptions: { onExcessProperty: "error" } }))({ a: "kept", extra: "rejected" }); console.log(JSON.stringify({ loose, strict }, null, 2))'
```

The ordinary struct decoded to `{ a: "kept" }`, stripping the excess property;
the annotated struct returned a parse error for `extra`.

## Scope

This audit establishes current ownership and current conflations. It does not
select a portable schema format, define the future Static Mechanics Admission
API, or implement source repairs.

The terms below are kept distinct throughout:

- **Surface structural validity**: whether unknown JSON decodes as a legal
  `UnitRecord` or `StatBlockRecord`.
- **Dhall authoring validity**: whether a canonical authored Dhall expression
  type-checks and compiles.
- **generated JSON integrity**: whether a committed JSON artifact is the
  deterministic projection of its canonical Dhall source.
- **catalog integrity**: whether installed records satisfy collection identity,
  reference, and provenance invariants.
- **Static Mechanics Admission**: the context-independent installation step
  that recognizes a decoded record's mechanics as typed production-reducer
  facts (which may be parameterized), or returns a typed unsupported-shape
  reason. It does not consume character, actor, session, or battle state.
- **selection/build binding** (an analytical label, not a selected API or
  canonical glossary term): a later composition step that supplies durable
  selected facts such as class level or a chosen option to admitted parametric
  mechanics. These facts are neither authored-record structure nor mutable
  runtime availability.
- **dynamic availability**: whether admitted mechanics can be used by this
  actor now, given ownership, resources, action economy, conditions, targets,
  and other runtime facts.

## Current ownership map

```text
canonical Dhall
  |  dhall-to-json --omit-empty
  v
committed JSON
  |  Effect Schema decode
  v
decoded UnitRecord / StatBlockRecord
  |  manually assembled SRD collection + catalog checks
  v
installed catalog of decoded authored records
  |  package-specific readers / support recognition / build binding
  v
typed execution facts, null, boolean, or []
  |  actor/session/resource checks (often in the same operation)
  v
discovered holes, invocations, or battle acts
```

| Concern                           | Current owner                                                | What it establishes                                                 | What it does not establish                                             |
| --------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Authored values                   | `packages/surface/content/*.dhall`                           | Canonical per-record authored expression                            | Complete Surface vocabulary or runtime executability                   |
| Structural parsing                | `@dnd/surface` Effect schemas                                | TypeScript `UnitRecord` / `StatBlockRecord` shape and refinements   | Portable language-neutral contract or reducer support                  |
| Generated artifact                | `dhall-to-json` plus a subset sync script                    | JSON generation for the checked class records                       | Whole-corpus pairing, decoding, provenance, or deterministic integrity |
| Installed SRD identity/provenance | Unit and Stat Block collection/catalog builders              | Duplicate ids, SRD collection homogeneity, and selected references  | Static mechanics support                                               |
| Character-creation support        | support manifest, Surface readers, discovery/finalization    | Curated choice and progression support plus readable creation facts | A decoded-to-admitted catalog state                                    |
| Battle Unit support               | character-to-battle projection and `unit-feature-support.ts` | Typed Unit support profiles and some typed unsupported issues       | Context-independent catalog admission or one canonical stored result   |
| Spell and Stat Block support      | battle profile/readers invoked from discovery                | Executable invocation/action projections for recognized shapes      | Typed installation failure distinct from current unavailability        |
| Current usability                 | character and battle discovery/reducers                      | Actor-, state-, resource-, and target-dependent availability        | Proof that every installed record was statically admitted              |

## Findings

### 1. Effect Schema is the structural authority; Dhall is not a second Surface schema

The Surface package declares Dhall canonical for authored values and generated
JSON as the runtime artifact
(`packages/surface/README.md:249-273`). The actual unknown-input boundary is the
handwritten Effect Schema entrypoint: `decodeUnitRecordSync` and
`decodeStatBlockRecordSync` decode against `UnitRecordSchema` and
`StatBlockRecordSchema` (`packages/surface/src/surface/schema.ts:454-485`).

`packages/surface/content/_types.dhall` explicitly exists to make heterogeneous
Dhall lists type-check. Its discriminants are broad `Text`, variant fields are
optional, and defaults contain empty sentinels
(`packages/surface/content/_types.dhall:1-13`, `19-63`, `116-170`). Dhall
compilation therefore proves the local Dhall expression is consistent, not that
the emitted value satisfies the closed Surface vocabulary.

The TypeScript decoder is not uniformly exact-object, either. The parser probe
above confirms that ordinary `Schema.Struct` strips excess properties, while
`strictStruct` opts into excess-property rejection
(`packages/surface/src/surface/schema-helpers.ts:8-13`), while public record and
mechanics schemas also use ordinary `Schema.Struct`, including provenance,
Spell records, Stat Block records, and many Unit variants
(`packages/surface/src/surface/schema-base.ts:679-682`,
`packages/surface/src/surface/schema-spell.ts:5559-5566`,
`packages/surface/src/surface/schema.ts:467-474`,
`packages/surface/src/surface/schema-nonspell.ts:4763-4821`). The future portable
contract cannot safely infer one excess-property policy from the current mix.

Effect Schema also owns semantic refinements beyond basic JSON structure, such
as distinct Spell Slot creation levels and class-specific Spell Access/
progression relationships
(`packages/surface/src/surface/schema-nonspell.ts:596-611`, `3800-3866`,
`3911-3947`). A portable contract will need to classify each such rule as
schema-expressible, fixture-backed, or collection-level; merely exporting object
shapes would be weaker than the authoritative decoder.

### 2. No portable Surface contract or whole-corpus generated-integrity gate exists

The Surface package exports TypeScript schemas, types, catalogs, and readers
only (`packages/surface/package.json:6-14`). There is no language-neutral schema
artifact and no portable valid/invalid conformance fixture corpus.

The root quality lane runs `check:surface-class-json-sync`
(`package.json:7-10`, `28`). That check compiles and byte-compares only files
matching `^class_.*\.dhall$`
(`scripts/check-surface-content-json-sync.cjs:11`, `42-67`, `71-107`). At the
audited commit that is 12 class sources, not the whole authored corpus. It does
not decode the generated output through Surface, prove installed membership,
or validate provenance.

The content directory currently contains 604 Dhall files and 604 JSON files,
but the apparent equality hides different membership: `_types.dhall` is an
authoring helper with no JSON peer, while
`magic_item_staff_of_charming.json` has no Dhall peer and is not installed by
either catalog. Thus “in the content directory,” “canonically authored,”
“generated,” “shipped,” and “installed” are not presently equivalent sets.

Installed membership is hand-maintained through JSON imports and collection
array assembly (`packages/surface/src/surface/unit-catalog.ts:507-901`,
`packages/surface/src/surface/stat-block-catalog.ts:108-120`). The separate SRD
provenance report reconstructs that membership by parsing imports
(`scripts/srd521-surface-authored-corpus-audit.cjs:76-130`) and is not invoked by
the root quality command. These are distant interpretations of the same
membership fact.

### 3. Catalog installation proves decoded collection integrity, not executable support

The collection types make SRD provenance explicit, and catalog builders return
typed issues for duplicate identity, mixed provenance, and selected Unit
reference invariants
(`packages/surface/src/surface/unit-catalog.ts:405-470`, `904-951`,
`1068-1083`; `packages/surface/src/surface/stat-block-catalog.ts:23-67`,
`122-172`). Their successful catalogs expose decoded authored `UnitRecord` and
`StatBlockRecord` values. No admitted mechanics type is produced.

The installed-corpus path decodes and narrows with throwing helpers, while the
catalog build phase aggregates typed issues
(`packages/surface/src/surface/schema.ts:476-500`,
`packages/surface/src/surface/unit-catalog.ts:472-505`,
`packages/surface/src/surface/stat-block-catalog.ts:69-106`). The MCP composition
root then treats an invalid built-in catalog as an exception
(`packages/mcp/src/composition-root.ts:36-64`). There is no unified diagnostic
contract spanning Dhall compilation, JSON drift, Surface decoding, provenance,
references, and mechanics admission.

Collection provenance is explicitly represented at both collection and member
boundaries. ADR-0003 sanctions inspectable per-record provenance repetition and
requires the collection boundary to enforce homogeneity
(`docs/adr/0003-monster-stat-blocks-authored-data-provenance.md:5`, `15-18`).
The member types narrow the common case, and runtime validation keeps the two
declarations in agreement
(`packages/surface/src/surface/unit-catalog.ts:405-423`,
`packages/surface/src/surface/stat-block-catalog.ts:23-41`). This is a deliberate
provenance invariant, not ordinary runtime-projection duplication; the portable
contract still needs to say how that invariant is expressed and diagnosed.

### 4. Character creation mixes legitimate selection identity with executable support scope

Character-creation discovery combines a draft with the decoded Unit catalog
(`packages/character-creation-runtime/src/discovery.ts:183-205`). Surface readers
return typed `readable` / `unreadable` results, but their unreadable reason is
principally wrong Unit kind, not reducer-mechanics admission
(`packages/surface/src/surface/character-creation-readers.ts:26-39`,
`135-166`, `191-263`).

The broader support boundary is a manifest of authored Unit ids, option ids,
and exact progressions (`packages/character-creation-runtime/src/phase1-manifest.ts:42-145`,
`packages/character-creation-runtime/src/support-gates.ts:152-216`). Some of this
identity is legitimate catalog/selection identity. Other entries decide which
selected records become execution resources, so selection scope and executable
admission are not represented as distinct workflow states.

Discovery commonly returns `[]` for an unsupported progression, an absent
catalog record, or unreadable facts
(`packages/character-creation-runtime/src/discovery.ts:209-227`, `829-848`,
`1036-1062`). The result does not distinguish “this decoded content is not
supported” from “this supported workflow has no hole to offer now.”

### 5. Character-to-battle Unit projection is the strongest existing admission seam, but it is not canonical installation

`characterUnitRefsWithBattleSupportProfiles` resolves selected Units and
returns either typed `BattleUnitRef`s or typed support-profile issues
(`packages/character-battle-runtime/src/battle-support-profiles.ts:45-149`).
`battleUnitRefWithSupportProfiles` verifies the selected Unit/ref pairing and
projects recognized mechanics into typed support profiles
(`packages/battle-runtime/src/unit-feature-support.ts:1266-1299`, `1934-1985`).
`BattleUnitRef` then retains authored selection identity beside typed execution
facts (`packages/battle-runtime/src/battle-init.ts:50-53`). This is the closest
current shape to decoded-then-admitted content.

The support-profile union mixes rich records with payloadless literal variants
via an `Exclude` over the profile-name array
(`packages/battle-runtime/src/unit-feature-support.ts:1153-1236`). A literal
variant can be a complete typed projection when the admitted mechanic is fixed;
its lack of a payload is not itself a defect. The current union does not by
itself reveal which literals are complete singleton projections and which still
depend on reparsing or distant facts. Moreover, the `Exclude` default means a
new profile name is silently classified as payloadless unless the exclusion is
updated. Each consumer path must therefore be classified before this type can
be treated as the canonical admitted state.

It is nevertheless a character-build/battle-handoff operation that currently
combines mechanics recognition with selection/build binding: profile creation
may depend on class levels and selected source facts
(`packages/character-battle-runtime/src/battle-support-profiles.ts:61-78`,
`128-145`). Battle initialization also retains decoded Units/resources plus
several derived profile maps. Some consumers later reparse the decoded Unit; for example,
resource act discovery falls back to `parseSupportedUnitFeatureProfile`
(`packages/battle-runtime/src/battle-reducer/unit-features.ts:189-220`,
`726-735`). That parser is an ordered first-match `??` chain returning a profile
or `null` (`packages/battle-runtime/src/unit-feature-support.ts:6024-6081`).

Consequences:

- an unsupported resource profile can become `null` and then no act, the same
  observable discovery result as a supported feature with no current resource;
- collector, first-match parser, stored support-profile list, derived maps, and
  consumers must stay algorithmically aligned;
- if one Surface shape matches multiple Unit readers, parser order chooses the
  result without the type system exposing that choice.

### 6. Spell “admission” currently includes dynamic state and collapses shape mismatch into absence

A Spell Procedure Profile defines `admit(spell, context)` as discovery-time
enumeration and explicitly returns `[]` when the spell does not fit the profile
(`packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/profile.ts:199-225`).
Its admission context includes a character actor, current battle turn, and
antimagic suppression state
(`packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/profile.ts:36-61`,
`73-115`). It is therefore not context-independent Static Mechanics Admission.

`supportedSpellActs` runs every prepared Spell record through a hand-ordered
fan-out of profile `admit` functions and flattens every rejection to absence
(`packages/battle-runtime/src/battle-reducer/spells-profiles.ts:166-218` and the
continuing fan-out through line 380). `discoverSupportedSpellInvocations` then
applies clearly dynamic checks for antimagic, spend availability, caster
prerequisites, Action/Bonus Action resources, and metamagic
(`packages/battle-runtime/src/battle-reducer/spells-discovery.ts:109-180`).

The resulting empty act set can mean at least: unsupported Surface shape, no
spellcasting state, no spend, antimagic interdiction, unmet prerequisite, or no
turn resource.

Admission fan-out and dispatch registration are separate enumerations
(`packages/battle-runtime/src/battle-reducer/spells-profiles.ts:184-380`,
`packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts:104-230`).
Registry completeness proves procedure-union membership, not that every profile
participates exactly once in admission. Adding or removing a profile therefore
has distant meaning/order connascence.

`SupportedSpellInvocation` values also retain the full `SpellRecord` beside
independently derived targeting, damage, range, attack, and effect facts (one
representative union is `packages/battle-runtime/src/battle-reducer.ts:3213-3249`).
The runtime invocation codec represents the embedded Spell as
`Record<string, any>`
(`packages/battle-runtime/src/battle-reducer/codec-building-blocks.ts:48-51`,
`packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/spell-attack-damage.ts:195-240`),
then casts the profile schema to its narrower invocation type
(`packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/profile.ts:250-260`).
The codec therefore does not make disagreement between decoded authored
mechanics and independently projected execution facts unrepresentable.

The procedure profile also carries `knownWillingTargetSpellIds`
(`packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/profile.ts:212-225`),
with concrete spell ids in the damage-reduction and roll-modifier profiles
(`packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/damage-reduction.ts:364-379`,
`packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/roll-modifier.ts:467-484`);
targeting consumes the list through `includes(invocation.spell.id)`
(`packages/battle-runtime/src/battle-reducer/spells-targeting.ts:1150-1165`).
That is authored-identity dispatch inside the executable profile boundary,
consistent with the broader authored-id gate findings already recorded by the
map's quality-gate audit.

### 7. Stat Block executable support is delayed, boolean/null-based, and lossy

Generic Stat Block battle initialization accepts and retains a decoded authored
`StatBlockRecord` (`packages/battle-runtime/src/battle-init.ts:306-333`). Attack
support is recognized later with `Supported... | null`; action enumeration
silently drops unsupported attacks
(`packages/battle-runtime/src/battle-reducer/statblock.ts:48-105`, `130-156`).
The broad support reader returns only a boolean and excludes unsupported action
sections/shapes without a reason
(`packages/battle-runtime/src/statblock-action-support.ts:165-223`).

Multiattack and Bonus Action discovery repeat the pattern: unsupported dispatch
counts, ambiguous authored-name references, unavailable resources, and current
action-economy failures all eventually become `[]`
(`packages/battle-runtime/src/battle-reducer/battle-discovery.ts:1810-1903`,
`1906-1990`). The name join for Multiattack is a legitimate authored
record-to-record-part reference, but failure is still indistinguishable from
dynamic unavailability.

Wild Shape makes the asymmetry especially clear. Form eligibility and projection
failures return typed issues, but an eligible form whose action Surface is not
supported is simply skipped
(`packages/battle-runtime/src/battle-init.ts:150-185`). This does not realize the
ADR-0003 expectation that executable versus text/table-owned mechanics have a
type/runtime consequence (`docs/adr/0003-monster-stat-blocks-authored-data-provenance.md:9-18`).

The Wild Shape support module also owns category arrays and prose
`closedBoundary` records in parallel with the boolean execution gate
(`packages/battle-runtime/src/statblock-action-support.ts:21-89`, `91-165`).
Those categories support inventory/tests but do not narrow the value used by
execution. They are evidence metadata, not an admitted mechanics state.

### 8. Character-sheet spell execution repeats admission per authored spell and duplicates rule facts

The quality-gate audit already found the dominant authored-id problem in
character-sheet runtime. A representative module, `awaken.ts`, looks up a
hard-coded Spell id, checks prepared access by that id, rechecks the same id plus
mechanics shape, and duplicates level, time, duration, ability-score, and
material constants before execution
(`packages/character-sheet-runtime/src/awaken.ts:22-57`, `65-81`, `97-170`).

This combines authored selection, mechanics recognition, and execution in a
spell-specific operation. The mechanics checks are useful admission evidence,
but they are not retained as a narrowed typed fact for a generic production
reducer. Changing the Surface record, constants, access check, invocation type,
and executor requires coordinated edits.

### 9. Dynamic availability itself has identifiable, valid owners

The problem is not that discovery consults current state. Battle discovery
correctly owns current actor, procedure/interrupt state, action economy,
movement, conditions, targets, effects, and resources
(`packages/battle-runtime/src/battle-reducer/battle-discovery.ts:210-360`). Spell
discovery's post-profile gates are likewise recognizably dynamic
(`packages/battle-runtime/src/battle-reducer/spells-discovery.ts:117-165`). MCP
re-discovers an addressed act before execution and reports it unavailable when
the snapshot is stale (`packages/mcp/src/battle-tools.ts:74-79`, `127-183`).

These are appropriate dynamic-availability checks. The ambiguity arises because
static shape recognition is invoked inside the same workflows and uses the same
absence result.

## Facts established for the downstream decisions

1. The authoritative source-side decoder is Effect Schema. Canonical Dhall owns
   authored values; `_types.dhall` is an authoring convenience, not a portable
   schema.
2. No current artifact gives another language the complete decoder contract or
   portable valid/invalid examples.
3. Whole-corpus Dhall/JSON pairing and generated integrity are not current
   quality invariants. File-corpus membership and installed-catalog membership
   differ and are manually connascent.
4. A successfully built `UnitCatalog` or `StatBlockCatalog` proves decoded
   collection integrity only. It does not prove that declared mechanics are
   executable.
5. The codebase already demonstrates a useful typed pattern at the
   character-to-battle Unit boundary: preserve authored identity, project
   mechanics shape into typed facts, and return typed issues. That pattern is
   build-dependent and not yet a canonical installation state.
6. Existing admitted-looking types still need invariant classification: Unit
   support profiles mix rich projections with payloadless variants (some of
   which may be complete singleton facts), and Spell invocations store authored
   records beside separately derived facts without a codec-enforced relationship.
7. Current spell and Stat Block support recognition is performed during
   discovery. Unsupported shape and supported-but-unavailable both commonly
   become `[]`.
8. Unit, Spell, and Stat Block domains do not currently agree on admission
   cardinality: the Unit parser is first-match, spells may emit multiple
   invocations across profiles, and Stat Blocks contain independently executable
   sections/abilities.
9. Dynamic availability has legitimate runtime owners and should remain
   state-dependent. The missing distinction is an executable boundary before
   those checks, not removal of state from discovery.
10. Provenance, structured input, authored identity, decoded structure, derived
    execution facts, and mutable runtime availability are already distinct domain
    concepts in repository guidance. Current implementation gaps must not be
    repaired by collapsing them into one record or status ledger.

## Questions now sharp enough for existing frontier tickets

The following are decision inputs, not decisions made by this audit.

For **Define the portable Surface content contract**:

- Is the exported corpus every paired authored file, only installed collection
  members, or an explicitly classified subset?
- Are single-record versus list-valued file containers part of the portable
  contract?
- What is the exact excess-property policy for each object shape?
- Which Effect Schema refinements belong in the portable schema, which require
  negative fixtures, and which are collection-level checks?
- What deterministic identity is required of generated JSON: bytes, canonical
  JSON values, and which pinned compiler/options?
- Which diagnostic stages must remain distinguishable: Dhall compile, missing or
  orphan artifact, drift, structural decode, identity/reference, provenance,
  and collection failure?
- What version identifies the contract without duplicating derivable catalog or
  hash facts into a manual status manifest?

For **Define Static Mechanics Admission and dynamic availability**:

- What installed support scope is promised: every decoded record, selected
  rule-area subsets, or another collection-owned declaration?
- Which mechanics admit as complete typed facts, and which admit as parametric
  facts requiring a later selection/build binding step?
- May one authored record admit multiple procedures? If so, what is the domain
  cardinality for Unit, Spell, and Stat Block families?
- Is Stat Block admission record-wide, section-wide, or per ability, including
  explicit table/text-owned branches?
- Which decoded authored facts must remain for identity, replay, and presentation,
  and which execution projections are the single canonical admitted facts?
- What typed reason vocabulary distinguishes unsupported shape or procedure,
  an unbound required selection/build parameter, and current unavailability
  without creating a redundant status ledger?
- Does discovery promise a stable order or a set of addressable subjects? Current
  sequential assembly makes order connascent even though no domain type owns it.

## Map impact

This audit resolves the ownership question and makes no implementation choice.
The two downstream questions above already exist as named child tickets, so no
new ticket or dependency is required. The related `docs/cleanroom/CONTEXT.md` material remains
protected and in scope: portable Surface validation, Static Mechanics Admission,
typed unsupported reasons, dynamic discovery, authored-identity independence,
source readiness, and Cleanroom composition are not retired or narrowed by this
research.
