# @dnd/character-creation-runtime

Turns a Character Draft and Surface `UnitCatalog` into a finalized
`CharacterBuild`, and advances that build through supported class level gains.

Surface owns authored records. This package owns creation choices and legality;
[Character Sheet](../character-sheet-runtime/README.md) owns in-play state;
[Character Battle](../character-battle-runtime/README.md) owns battle projection
and settlement. This package must not import Battle Runtime.

## Boundary

The package root exports the complete application API.
`@dnd/character-creation-runtime/consumer-protocol` owns the narrower consumer
contract, re-exported by the root.

| Operation                         | Result                                                 |
| --------------------------------- | ------------------------------------------------------ |
| `createCharacterDraft`            | Empty draft                                            |
| `discoverCreationHoles`           | Current fillable requirements                          |
| `fillCreationHoles`               | Atomic accepted/rejected draft update                  |
| `finalizeCharacterDraft`          | `ready` build, `incomplete` holes, or `invalid` issues |
| `advanceCharacterBuildClassLevel` | Advanced build or rejection                            |
| `projectCharacterDefinition`      | Source-free static creation facts                      |

[Character Definition projection](src/character-definition-projection.ts)
handles decoded class, subclass, background, and species roots. It strips root
identity from mechanics and admits declared dependency/reference paths against
the call-local Surface. Aggregate composition supplies the admission profile;
this projection neither selects Slice membership nor replaces draft reduction.

## Runtime Flow

1. Create a draft and supply a Surface `UnitCatalog`.
2. Discover requirements with `discoverCreationHoles`.
3. Submit a batch to `fillCreationHoles` with the expected draft revision.
4. Acceptance returns the updated draft, incremented revision, rediscovered
   holes, and finalization status. Rejection preserves the original draft and
   reports its holes, issues, and finalization status.
5. Repeat discovery/fill until `finalizeCharacterDraft` returns `ready`.

Creation fills patch durable draft state. Battle fills use a separate replay
protocol. [MCP](../mcp/README.md#tool-workflows) calls these operations directly;
presets and direct selection patches must not bypass discovered holes.

The `draft.progression.initial` fill selects the starting class and ordered
post-start advancement entries atomically. There is no separate level-1 class
entry to synchronize. After finalization, `advanceCharacterBuildClassLevel`
appends one class level; replacement choices tied to that gain belong in the
same operation and rewrite existing selected refs.

## Fill Issue Vocabulary

Issue codes belong to this package: hole ids address creation requirements,
cardinality comes from the discovered hole, and `staleRevision` applies to draft
updates. Do not merge these failures with Battle action/replay errors.

Submit a choice's complete option set in one fill. Duplicate fills for a hole
are rejected. Batch validation indexes the current holes and options once;
unknown-hole, duplicate-fill, invalid-choice, and unsupported-choice checks use
that same frontier before mutation.

`CREATION.DRAFT.FILL_BATCH_SLICE_REPLAY` owns the atomic fill invariant, including
revision changes, rediscovery, rejection, and finalization status. The
[MBT driver](src/character-creation-runtime.mbt.test.ts) compares accepted and
rejected Quint batches with production `fillCreationHoles`.

Payloads that cannot parse as `CreationFill`, `CreationHoleId`, or ability-score
assignments fail before the reducer. MCP codecs and protocol tests own those
failures under `CREATION.PROTOCOL.MALFORMED_FILL_REJECTION`; they need no QNT
owner.

## Terms

[VOCABULARY.md](VOCABULARY.md) defines Character Draft, Character Build, Creation
Hole, Creation Fill, and Unit-backed selection. Consume `UnitCatalog` directly;
do not add duplicate runtime catalog state.

## Implemented Behavior

[Support gates](src/support-gates.ts) own executable admission: class-level
frontiers, multiclass-entry capabilities, origins, choices, purchases, and
loadout requirements. Consult the [level-1–10 report](../../plans/unit-profile-coverage/LEVEL1_10_FULL_SUPPORT.md)
for the product's checked scope and [profile coverage](../../plans/unit-profile-coverage/README.md)
for authored breadth. Direct creation and subsequent advancement have distinct
entry paths; do not infer direct-draft support from a product-level claim.

Support profiles are package-private runtime policy, not Surface classifications
or additional RAW. Discovery may expose legal options outside the profile;
fills reject unsupported choices, and finalization rejects complete drafts
outside supported progression, origin, choice, or equipment capabilities.
Progressions are derived from capabilities rather than stored as endpoint presets.

## State Ownership Rules

### Build and identity

`CharacterBuild` retains progression, origin selections, final ability scores,
non-derivable proficiency/feature choices, source-scoped spellcasting, owned
equipment, and initial loadout. Derive grants, total proficiencies, armor
training, HP/Hit Dice capacity, and resources from retained facts and the catalog.
Current HP, Temporary HP, expenditures, and remaining Hit Dice belong to Character
Sheet.

- Hole ids are semantic addresses, never array positions. Draft holes use
  `cc:draft:<draft path>`; Unit-choice and loadout holes use their respective
  `UnitChoiceSourceKey` and `LoadoutSourceKey` isomorphisms.
- A Unit-backed option retains the selected Unit ref; its submitted option id
  is not authored truth. Derive build projections from accepted selections and
  Surface readers rather than duplicate grant constants.
- `CharacterEquipmentItemId` identifies an owned slot plus its equipment Unit.
  Do not compose `main:<unit>` or `off:<unit>` ids in projection code.
- Feature replacement rewrites the existing selected class-choice ref. Do not
  add another selected-option store beside `CharacterBuild.features`.
- Eldritch Invocation options are creation-owned option evidence from
  [eldritch-invocations.ts](src/eldritch-invocations.ts), not Unit refs. The
  granting feature remains a retained Unit ref; execution belongs downstream.

### Progression and spellcasting

[Character Progression](src/character-progression-algebra.ts) stores the starting
class Unit id and ordered advancement entries. Derive total/per-class levels
from that history and class names from the catalog.

Use `@dnd/shared-algebras/multiclass-prerequisite-algebra` for multiclass checks.
Establish the non-empty existing class set and proposed class before calling it;
do not reauthor prerequisite tables in support profiles. Post-start gains carry
explicit HP rule evidence. The current profile uses fixed HP gains; rolled HP
requires an explicit creation choice before it can be finalized.

Each spellcasting source retains its Unit, ability, cantrip/spellbook/prepared
Spell Access, and focus permissions. Keep ordinary `spellcasting` and
`pactMagic` slot pools distinct. Selecting Spell Access does not admit individual
Spell Definitions for execution; downstream runtimes determine that support.
Non-Wizard list-prepared choices come from the Surface class record.

`characterBuildGnomishLineageTraitProjection` derives selected lineage spell and
device facts from `speciesChoiceFacts` and the catalog. Do not store those
projections on the build; clockwork-device execution belongs to the table/object
owner.

### Equipment

Owned equipment and initial loadout are distinct. Catalog items retain owned-item
ids; non-Unitized starting items retain authored name and quantity; selected
tools retain the chosen proficiency. A starting item can retain authored identity
and focus capability while projecting a weapon shape through a catalog Unit.
Another purchase of that Unit does not inherit the focus capability.

Loadout stores owned-item id and grip; derive focus capability from the matching
item. Spellbook possession does not imply a wielded focus or battle-ready loadout.
Loadout is a runtime projection precondition, not an authored creation choice.
Require choices per occupied slot and purchased category: several weapons need
one main-weapon selection; a weapon-only purchase needs no armor/shield choices.
Mutable equipment changes belong to Character Sheet/session workflows.

### Authored-Identity Dispatch Enforcement

`pnpm check:authored-id-dispatch` guards the boundary. Explicit admission
allowlists cover [support gates](src/support-gates.ts) and
[manifest facts](src/phase1-manifest.ts). Discovery, fill, and finalization must
dispatch on Surface shapes and narrowed support facts, never authored ids,
names, slugs, labels, or provenance sections.

When widening support:

1. Update the owning support profile and only necessary manifest constants.
   Remove constants when they cease to own admission.
2. Keep discovery/finalization source-shaped: reconstruct expected choice-hole
   families from readers and support facts, then validate selected choices.
3. Add focused discovery, fill, and projection tests. Unsupported shapes must
   fail at a typed admission boundary with an explicit reason.
4. Connect changed reducer semantics to the parity evidence below.

## Parity

[The deterministic Quint slice](character-creation-runtime-slice.qnt) models
draft state, stable hole ids, atomic fills, rediscovery, and finalization.
[The MBT model](character-creation-runtime.mbt.qnt) drives traces through the
[TypeScript bridge](src/character-creation-runtime.mbt.test.ts). Their modeled
scope does not imply parity for every authored choice.

When changing reducer behavior, update its runtime owner, focused tests, affected
Quint models, and bridge together. Add or extend the obligation in
[rules-kernel coverage](../../plans/rules-kernel-coverage/README.md), connecting
production TypeScript to its QNT owner through MBT or deterministic QNT replay.
For proof/MBT execution, follow [the resource and verification rules](../../docs/agents/QNT-MBT.md).

## Files And Verification

| Work                             | Start here                                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Public contracts                 | [index.ts](src/index.ts), [consumer-protocol.ts](src/consumer-protocol.ts), [types.ts](src/types.ts)   |
| Draft construction and discovery | [draft.ts](src/draft.ts), [discovery.ts](src/discovery.ts), [hole-factories.ts](src/hole-factories.ts) |
| Atomic fills and finalization    | [fill-reducer.ts](src/fill-reducer.ts), [finalization.ts](src/finalization.ts)                         |
| Deterministic reducer evidence   | [index.test.ts](src/index.test.ts) and focused tests beside each owner                                 |

From the workspace root:

```sh
pnpm --filter @dnd/character-creation-runtime typecheck
pnpm --filter @dnd/character-creation-runtime test
```
