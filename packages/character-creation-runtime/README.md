# @dnd/character-creation-runtime

`@dnd/character-creation-runtime` owns the reducer that turns a mutable
character draft into a finalized `CharacterSheet` using authored Surface Units.

The package is a character-creation runtime boundary. It does not author classes,
backgrounds, species, feats, or equipment, and it does not build battle creature
initialization data. It consumes a `UnitLibrary` built from `@dnd/surface` and
returns draft state, creation holes, fill results, and finalized sheet facts for
callers to store at the session boundary.

## Mental Model

`@dnd/surface` owns the authored records. This package owns the mutable creation
process over those records.

A Character Draft is an incomplete session object with fillable holes. Filling a
hole can reveal more holes. A Character Sheet is the complete player-character
boundary produced by finalization. It can reference selected Units and carry
derived character facts, but it is not a Unit, not a Stat Block, and not battle
state.

## Boundary

| Source outside runtime                       | Runtime operation               | Runtime output                 |
| -------------------------------------------- | ------------------------------- | ------------------------------ |
| Surface Unit library                         | `discoverCreationHoles`         | fillable `CreationHole[]`      |
| caller-submitted batch of `CreationFill`s    | `fillCreationHoles`             | accepted/rejected draft update |
| complete legal draft plus Surface Unit facts | `finalizeCharacterDraft`        | finalized `CharacterSheet`     |
| finalized `CharacterSheet`                   | application composition outside | battle creature initialization |

`@dnd/character-creation-runtime` must not import `@dnd/battle-runtime` or
`@dnd/core`. Battle initialization from a `CharacterSheet` belongs to the
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

## Terms

Package-owned terms such as Character Draft, Character Sheet, Creation Hole,
Creation Fill, and Unit-backed selection are defined in
[VOCABULARY.md](./VOCABULARY.md).

Key boundary terms:

- `UnitLibrary` - type alias for the Surface `UnitCatalog`; it avoids an adapter
  or duplicate catalog state.
- `CreationHole` - a fillable requirement in the current draft.
- `CreationFill` - caller-submitted answer for one hole.
- `CharacterSheet` - finalized player-character boundary used by later
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
- Fighter choices needed by the first vertical;
- purchased equipment/loadout needed by the first battle fixture.

Loadout is a runtime projection precondition for the first supported sheet, not
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

The finalized `CharacterSheet` carries selected Unit refs plus derived
character-sheet facts needed by later boundaries: final ability scores, level-1
Hit Point maximum and Hit Die, proficiencies, granted feature refs, activation
resources, and equipment/loadout refs. It does not carry battle-current HP and
does not export battle creature-init types.

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
