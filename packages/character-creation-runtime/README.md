# @dnd/character-creation-runtime

`@dnd/character-creation-runtime` owns the reducer that turns a mutable
character draft into a finalized `CharacterBuild` using authored Units.

The package is a character-creation runtime boundary. It does not author classes,
backgrounds, species, feats, or equipment, and it does not build battle creature
initialization data. It consumes a `UnitCatalog` built from `@dnd/surface` and
returns draft state, creation holes, fill results, and finalized build facts.
Callers may create in-play Character Sheets from finalized builds; sheets own
in-play state outside this package.

## Mental Model

`@dnd/surface` owns the authored records. This package owns the mutable creation
process over those records.

A Character Draft is an incomplete session object with fillable holes. Filling a
hole can reveal more holes. A Character Build is the complete build-only
player-character boundary produced by finalization. It records durable identity
facts and non-derivable creation choices. Executable facts such as HP maximum,
proficiencies, armor training, resources, and battle spell slot capacity are
derived later from the build plus the Unit catalog. A build is not a Unit, not a
Stat Block, and not in-play Character Sheet state.

## Boundary

| Source outside runtime                    | Runtime operation               | Runtime output                 |
| ----------------------------------------- | ------------------------------- | ------------------------------ |
| Unit catalog                              | `discoverCreationHoles`         | fillable `CreationHole[]`      |
| caller-submitted batch of `CreationFill`s | `fillCreationHoles`             | accepted/rejected draft update |
| complete legal draft plus Unit facts      | `finalizeCharacterDraft`        | finalized `CharacterBuild`     |
| finalized `CharacterBuild`                | application composition outside | battle creature initialization |

`@dnd/character-creation-runtime` must not import `@dnd/battle-runtime` or the
legacy Core package. Battle initialization from a `CharacterBuild` belongs to
the composition layer and battle runtime boundary.

## Runtime Flow

1. Caller builds a Surface `UnitCatalog` and calls `createCharacterDraft`.
2. Caller passes the draft and Unit library to `discoverCreationHoles`.
3. Caller submits one batch of fills to `fillCreationHoles`.
4. If the batch is accepted, the returned draft has a new revision and a new
   hole set. If the batch is rejected, the original draft is returned unchanged.
5. Caller repeats discovery/fill until `finalizeCharacterDraft` returns
   `ready`.

Character creation fill semantics are intentionally different from battle
fills. Creation fills patch durable draft state in atomic batches; battle fills
are transient replay inputs for one selected battle subject.

MCP uses the same runtime protocol directly:
`create_character_draft`, `discover_creation_holes`, `fill_creation_holes`, and
`finalize_character`. The MCP boundary stores drafts by `CharacterDraftId`,
passes caller fill batches through `fillCreationHoles`, and stores a Character
Session only after `finalizeCharacterDraft` returns `ready`. A rejected fill
batch does not mutate the stored draft. MCP does not use presets or direct
selection patches; callers must answer the holes exposed by this package.

The progression fill is atomic. `draft.progression.initial` selects the durable
Character Progression profile in one choice: starting class plus any post-start
advancement entries. There is no later level-1 class-entry hole for MCP
or replay callers to keep synchronized with a starting-class field.

## Fill Issue Vocabulary

Creation fill issue codes are deliberately local to this package. They validate
the current draft frontier and the submitted batch as one optimistic-concurrency
mutation: hole ids are creation semantic addresses, choice cardinality comes from
the current `CreationHole`, and `staleRevision` only applies to draft updates.

Runtime and battle holes are analogous, not the same protocol. The shared
runtime hole algebra supplies transient action hole shapes, while battle errors
report action-resolution failures such as unavailable actions, runtime input
mismatches, unsupported subjects, or invalid replay fills. Those domains do not
share creation's draft revision semantics, creation option cardinality, or
finalization failures, so a shared fill-error enum would make unrelated states
look interchangeable.

## Terms

Package-owned terms such as Character Draft, Character Build, Creation Hole,
Creation Fill, and Unit-backed selection are defined in
[VOCABULARY.md](./VOCABULARY.md).

Key boundary terms:

- `UnitCatalog` - the Surface catalog type consumed directly by the runtime; no
  runtime-owned adapter or duplicate catalog state is kept.
- `CreationHole` - a fillable requirement in the current draft.
- `CreationFill` - caller-submitted answer for one hole.
- `CharacterBuild` - finalized build-only player-character boundary used by later
  composition code.

## Implemented Behavior

This package supports these character-creation profiles:

- SRD level-1 class-container source facts for starting class progression;
- level-2 Fighter progression and supported level-2 multiclass-entry
  progression facts;
- level-1 Wizard spellcasting creation facts;
- retained SRD level-1 class-feature Unit refs, plus supported acquisition
  choices for Divine Order, Primal Order, and Rogue Expertise;
- Orc species;
- Soldier background;
- Standard Array ability assignment;
- background ability-score increase;
- Common plus selected standard languages;
- structured alignment;
- class-owned choices needed by the supported vertical;
- equipment ownership and selected-equipment loadout slots needed by finalization.

Loadout is a runtime projection precondition for the first supported build, not
an SRD-authored character-creation choice. See `../../ASSUMPTIONS.md` A40.

Support gates are package-private runtime narrowings. They must not become
public Surface classifications or new source rules. The current
`src/support-gates.ts` support profile owns the supported
class/background/species ids, Unit choice keys, option ids, purchasable
equipment, selected-equipment loadout slots, supported progression profiles, and
remaining fixed origin facts. Legal Surface options can be discovered outside
that profile, but fill validation rejects them at this one runtime boundary
until widening work adds support-profile entries and projection logic.

## State Ownership Rules

Draft-owned holes use stable ids such as `cc:draft:<draft path>`.
Unit-choice holes use stable ids derived from the `UnitChoiceSourceKey`
source/key isomorphism. Loadout holes use stable ids derived from the
`LoadoutSourceKey` source/key isomorphism. Hole ids are semantic addresses, not
array positions.

CharacterBuild equipment item ids use the `CharacterEquipmentItemId` source/key
isomorphism. They identify a durable build equipment item slot plus its selected
equipment Unit id without leaving `main:<unit>` and `off:<unit>` string
composition in build projection code.

Accepted option ids are protocol choices. When a selected option references a
Unit, the draft records the Unit reference rather than treating the
submitted option id as authored truth.

Choice holes carry explicit cardinality. Callers submit the selected option set
in one fill, not as multiple fills for the same hole. Duplicate fills for one
hole are rejected unless a future hole type explicitly says otherwise.

Batch fill validation indexes the discovered holes and their choice options once
per mutation. Unknown-hole, duplicate-fill, invalid-choice, and unsupported-choice
checks all run against that indexed frontier instead of repeatedly scanning the
hole list. This keeps the validation boundary stable as Surface catalogs gain
more legal Units and options.

The finalized `CharacterBuild` carries Character Progression, origin identity,
final ability scores, selected proficiency evidence, selected class-choice Unit
refs, selected Expertise evidence, source-scoped spellcasting choices, owned
equipment, and initial loadout.
It deliberately does not store class feature grant lists, background origin
feat, species traits, Hit Point maximum, Hit Dice totals, total proficiencies,
armor training, activation resources, or global spell slot capacity when those
facts can be derived from retained build facts plus the Unit catalog. Supported
subclass choices, class-feature feat grants including Ability Score Improvement
and Epic Boon ability-score increases, proficiency choices, Wizard spellcasting
choices, loadout refs, and equipment item ids are projected from accepted draft
selections and Unit readers, not reauthored as parallel constants. The remaining
finalization gate rejects complete drafts whose progression profile, origin
facts, choices, or equipment are outside the support profile. `CharacterBuild`
does not carry current HP, Temporary Hit Points, expended resources or Spell
Slots, Hit Dice remaining, or battle creature-init types.

Spellcasting on a build is source-scoped. Each source records the source Unit,
spellcasting ability, cantrips, spellbook entries, prepared spells, and focus
permissions for that source. Slot pools are explicit and rigid: ordinary
`spellcasting` slots and optional `pactMagic` slots are separate pools. Battle
and session projections decide which subset they can execute.

Equipment on a build is split into durable owned equipment and initial loadout.
Loadout entries hold `CharacterEquipmentItemId`s for owned items instead of
duplicating bare equipment Unit ids. Mutable in-play equipment changes belong to
the future Character Sheet/session boundary, not character creation.

Finalization support checks are source-shaped: they reconstruct expected
choice-hole families from Surface readers plus the support profile and validate
selected choices against those hole shapes, instead of branching on
hard-coded authored feature ids in finalization logic.

`src/character-progression-algebra.ts` owns the durable Character Progression
read model. It stores the parsed starting class Unit id and ordered post-start
class advancement entries. Total character level and per-class levels are
derived from that history; class names are derived from the Unit catalog at
projection boundaries.

Multiclass prerequisite facts are deliberately outside this package's support
profile tables. They live in
`@dnd/shared-algebras/multiclass-prerequisite-algebra`; replay or widening code
that validates adding a new class must establish the character's non-empty set
of current classes plus the class being added through that shared algebra before
calling its prerequisite check. Do not reauthor prerequisite rules here.

For total character levels after 1, the current support profile projects fixed
Hit Point gains. Post-start advancement entries carry explicit Hit Point rule
evidence into `CharacterProgression`, and finalization rejects level/evidence
combinations that contradict the rules. Rolled HP is outside this support profile and must
become an explicit creation choice before it can be finalized.

Support-profile admission is runtime policy: every character-creation shape is
either admitted by support profiles with executable discovery, fill, and
finalization behavior or rejected at one typed support boundary with explicit
rationale. Manifest constants are implementation fixtures for admitted SRD
Units and option ids. When a fixture no longer owns a support boundary, remove it
rather than preserving migration labels as domain policy.

### Authored-Id Dispatch Enforcement

Task PBA13E adds a repo-local guard:

`pnpm check:authored-id-dispatch`

The guard derives forbidden authored ids from `packages/surface/content/*.json` by collecting top-level record `id` values and nested authored reference fields ending in `Id` (excluding protocol-only `holeId`), then fails when those ids appear as semantic dispatch in production source outside explicit boundary allowlists. This package keeps a narrow allowlist for `src/phase1-manifest.ts` and `src/support-gates.ts` because those files own the current support-profile boundary for admitted Unit ids and option ids.

Do not add authored-id semantic branches to `discovery.ts`, `fill-reducer.ts`, or `finalization.ts`. Those modules must derive runtime behavior from Surface reader shapes and support-profile entries, then pass narrowed values forward.

When widening support:

1. Add support-profile entries in `support-gates.ts` (and manifest constants only when needed).
2. Keep discovery/finalization logic shape-driven over choice-hole families.
3. Add focused tests proving the added support-profile path.
4. Keep authored ids as retained identity facts only, never as downstream semantic dispatch switches.

Temporary Hit Points are in-play Character Sheet/adventuring state, not creation
or build state. SRD 5.2.1 says they last until depleted or Long Rest, so a future
in-play `CharacterSheet` should persist them between battles and clear them at
that rest boundary.

## Parity

`character-creation-runtime-slice.qnt` is the deterministic package-local Quint
parity model. It models draft state, stable hole ids, atomic batch fill,
rediscovery, and finalization status for the established Fighter manifest path,
with the supported class-option width reflected at the initial class choice
boundary. Focused TypeScript tests cover the supported Fighter 2 and Wizard
1 build projection facts.

`character-creation-runtime.mbt.qnt` is the package-local randomized MBT model.
It imports the deterministic model and drives fill-batch traces against the
TypeScript reducer through `src/character-creation-runtime.mbt.test.ts`.

When changing reducer behavior in this package, update the affected `src/*`
runtime module, focused tests, `character-creation-runtime-slice.qnt`, and
`character-creation-runtime.mbt.qnt` together.

## Files And Verification

- `src/index.ts` - public API barrel.
- `src/types.ts` - public protocol and build types.
- `src/draft.ts` - draft construction.
- `src/discovery.ts` - current creation-hole frontier discovery.
- `src/fill-reducer.ts` - batch fill validation and draft mutation.
- `src/finalization.ts` - draft finalization and `CharacterBuild` projection.
- `src/hole-factories.ts` - hole ids, sources, option builders, and choice source projections.
- `src/phase1-manifest.ts` - Support manifest facts and admitted option ids.
- `src/support-gates.ts` - support-profile gates, not RAW legality.
- `src/index.test.ts` - deterministic reducer tests and Quint model checks.
- `src/character-creation-runtime.mbt.test.ts` - randomized MBT bridge.
- `character-creation-runtime-slice.qnt` - local parity model.
- `character-creation-runtime.mbt.qnt` - local randomized MBT model.
- `VOCABULARY.md` - package-owned creation terminology.

Useful checks:

```sh
pnpm --filter @dnd/character-creation-runtime typecheck
pnpm --filter @dnd/character-creation-runtime test
```
