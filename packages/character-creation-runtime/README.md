# @dnd/character-creation-runtime

`@dnd/character-creation-runtime` owns the reducer that turns a mutable
character draft into a finalized `CharacterBuild` using authored Surface Units.

The package is a character-creation runtime boundary. It does not author classes,
backgrounds, species, feats, or equipment, and it does not build battle creature
initialization data. It consumes a `UnitLibrary` built from `@dnd/surface` and
returns draft state, creation holes, fill results, and finalized build facts for
callers to store at the session boundary.

## Mental Model

`@dnd/surface` owns the authored records. This package owns the mutable creation
process over those records.

A Character Draft is an incomplete session object with fillable holes. Filling a
hole can reveal more holes. A Character Build is the complete build-only
player-character boundary produced by finalization. It can reference selected
Units and carry derived build facts, but it is not a Unit, not a Stat Block, and
not in-play Character Sheet state.

## Boundary

| Source outside runtime                       | Runtime operation               | Runtime output                 |
| -------------------------------------------- | ------------------------------- | ------------------------------ |
| Surface Unit library                         | `discoverCreationHoles`         | fillable `CreationHole[]`      |
| caller-submitted batch of `CreationFill`s    | `fillCreationHoles`             | accepted/rejected draft update |
| complete legal draft plus Surface Unit facts | `finalizeCharacterDraft`        | finalized `CharacterBuild`     |
| finalized `CharacterBuild`                   | application composition outside | battle creature initialization |

`@dnd/character-creation-runtime` must not import `@dnd/battle-runtime` or
`@dnd/core`. Battle initialization from a `CharacterBuild` belongs to the
composition layer and battle runtime boundary.

## Runtime Flow

1. Caller builds a Surface `UnitLibrary` and calls `createCharacterDraft`.
2. Caller passes the draft and Unit library to `discoverCreationHoles`.
3. Caller submits one batch of fills to `fillCreationHoles`.
4. If the batch is accepted, the returned draft has a new revision and a new
   hole set. If the batch is rejected, the original draft is returned unchanged.
5. Caller repeats discovery/fill until `finalizeCharacterDraft` returns
   `ready`.

Character creation fill semantics are intentionally different from battle
fills. Creation fills patch durable draft state in atomic batches; battle fills
are transient replay inputs for one selected battle subject.

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

- `UnitLibrary` - type alias for the Surface `UnitCatalog`; it avoids an adapter
  or duplicate catalog state.
- `CreationHole` - a fillable requirement in the current draft.
- `CreationFill` - caller-submitted answer for one hole.
- `CharacterBuild` - finalized build-only player-character boundary used by later
  composition code.

## Implemented Behavior

This package supports the first legal character-creation vertical:

- level-1 Fighter;
- Orc species;
- Soldier background;
- Standard Array ability assignment;
- background ability-score increase;
- Common plus selected standard languages;
- structured alignment;
- class-owned choices needed by the supported vertical;
- equipment ownership and loadout choices needed by finalization.

Loadout is a runtime projection precondition for the first supported build, not
an SRD-authored character-creation choice. See `../../ASSUMPTIONS.md` A40.

Support gates are package-private runtime narrowings. They must not become
public Surface classifications or new source rules.

## State Ownership Rules

Draft-owned holes use stable ids such as `cc:draft:<draft path>`. Unit-granted
holes use stable ids such as `cc:unit:<unit id>:<choice key>`. Hole ids are
semantic addresses, not array positions.

Accepted option ids are protocol choices. When a selected option references a
Surface Unit, the draft records the Unit reference rather than treating the
submitted option id as authored truth.

Choice holes carry explicit cardinality. Callers submit the selected option set
in one fill, not as multiple fills for the same hole. Duplicate fills for one
hole are rejected unless a future hole type explicitly says otherwise.

The finalized `CharacterBuild` carries selected Unit refs plus derived build
facts needed by later boundaries: final ability scores, level-1 Hit Point
maximum and Hit Die pool, proficiencies, granted feature refs, activation
resources, and equipment/loadout refs. It does not carry current HP, Temporary
Hit Points, expended resources, Hit Dice remaining, or battle creature-init
types.

Temporary Hit Points are in-play Character Sheet/adventuring state, not creation
or build state. SRD 5.2.1 says they last until depleted or Long Rest, so a future
in-play `CharacterSheet` should persist them between battles and clear them at
that rest boundary.

## Parity

`character-creation-runtime-slice.qnt` is the deterministic package-local Quint
parity slice. It models draft state, stable hole ids, atomic batch fill,
rediscovery, and finalization status for the same behavior the TypeScript
reducer exposes.

`character-creation-runtime.mbt.qnt` is the package-local randomized MBT model.
It imports the deterministic slice and drives fill-batch traces against the
TypeScript reducer through `src/character-creation-runtime.mbt.test.ts`.

When changing reducer behavior in this package, update `src/index.ts`, focused
tests, `character-creation-runtime-slice.qnt`, and
`character-creation-runtime.mbt.qnt` together.

## Files And Verification

- `src/index.ts` - public API and reducer implementation.
- `src/index.test.ts` - deterministic reducer tests and Quint-slice checks.
- `src/character-creation-runtime.mbt.test.ts` - randomized MBT bridge.
- `character-creation-runtime-slice.qnt` - local parity slice.
- `character-creation-runtime.mbt.qnt` - local randomized MBT model.
- `VOCABULARY.md` - package-owned creation terminology.

Useful checks:

```sh
pnpm --filter @dnd/character-creation-runtime typecheck
pnpm --filter @dnd/character-creation-runtime test
```
