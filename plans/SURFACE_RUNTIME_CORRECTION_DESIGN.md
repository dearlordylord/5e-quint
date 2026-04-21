# Surface Runtime Correction Design

## Purpose

This document captures the design direction for `packages/surface-runtime-correction`.

It exists to lock down the architectural intent before more code is written, especially where the existing `core` package is already carrying confusing execution-projection patterns that we do not want to blindly copy.

This package is not a toy in the throwaway sense. Its job is to prove a cleaner vertical slice for:

- real `Surface` schema usage
- authored unit loading and validation
- runtime ownership/access wrapping
- battle prompt and resolution flow
- reducer purity
- battle-turn architecture that can later inform `core`

## Status Of This Document

This document is intended to be handoff-ready for an implementer who has not followed the whole discussion.

It is therefore doing two jobs:

- locking architectural constraints
- giving a concrete first implementation shape

It is not meant to be a full changelog or a full package walkthrough.

## Landed Slice Status

`SRC1`-`SRC4` have now landed in TS.

The package no longer just carries candidate shapes for the first slice; it has
an implemented correction flow for:

- initiative-aware battle init
- prompt discovery from battle state
- complete prompt answers only
- prompt resolution that can either resolve immediately or open a follow-up prompt
- pure battle reduction for `attack`, `endTurn`, `cure_wounds`, `fireball`, and `fighter_action_surge_l2`

The remaining work for this document is to stay honest about the landed shape so
the Quint follow-up is based on discovered reality rather than earlier
speculation.

## Non-Goals

This package is **not** trying to:

- reproduce the entire `core` battle machine
- freeze a second execution language parallel to `Surface`
- model every combat subsystem immediately
- decide repo-wide final architecture for all of `core` before a small slice works

## Main Warning From Core

`core` already has a second execution language in:

- [packages/core/src/projected-executable.ts](/workspace/typescript/dnd/packages/core/src/projected-executable.ts:1)
- [packages/core/src/projected-compiler.ts](/workspace/typescript/dnd/packages/core/src/projected-compiler.ts:1)

That layer may or may not have been justified when introduced, but it is now confusing enough that it must be treated as a warning rather than as a template.

The correction package should therefore prefer:

- `Surface`
- runtime wrappers
- structural helper interpretation

before introducing any narrowing IR.

If a narrowing step is ever introduced here later, it must be:

- structurally derived
- generic
- strictly smaller than `Surface`

If it mirrors `Surface` broadly, it is just another confusing parallel language and should be rejected.

## Current Code And Rewrite Target

Current package under rewrite:

- `packages/toy-surface-hydration`

Target package name:

- `packages/surface-runtime-correction`

The current package already has useful pieces:

- real `Surface` decode boundary via `@dnd/prototype-content-surface`
- Effect service wiring for authored/runtime libraries
- a small character/roster layer
- a small battle layer

But it currently still has the wrong shape in important places:

- flat battle choice objects that skip the prompt boundary
- no explicit turn/initiative model
- too much “already-resolved” input handed straight to reducers
- not enough distinction between:
  - available prompt
  - complete prompt answer
  - resolved battle action

So the next work is a rewrite of the package’s battle-facing flow, not a minor cleanup.

## Stable Conclusions

### 1. Surface stays the semantic language

The package should use the real `Surface` codec and real `Surface` types from `@dnd/prototype-content-surface`.

Semantic dispatch must happen by **structural interpretation of `Surface`**, not by authored unit ids.

That means this kind of code is wrong:

```ts
if (unit.id === "cure_wounds") { ... }
if (unit.id === "fireball") { ... }
```

because it assumes the runtime knows the authored catalog in advance and it hardcodes specific units as semantic categories.

Instead, dispatch must happen on shape, for example:

- unit kind
- mechanics family
- activation shape
- targeting shape
- save/damage/heal structure
- scaling structure
- resource structure

### 2. Runtime wrappers are allowed; duplicate identity is not

The package should use runtime wrappers around `Surface` units where needed for ownership, battle participation, and later access-path distinctions.

But it must not duplicate authored identity in a contradictory way.

Bad:

```ts
{
  authoredUnitId: "...",
  unit: SpellRecord | ClassFeatureRecord
}
```

because `authoredUnitId` can disagree with `unit.id`.

Better:

```ts
{
  unit: SpellRecord | ClassFeatureRecord,
  ...
}
```

and read authored identity from `unit.id`.

If the model later needs a distinct access-path identity, that is different:

```ts
{
  accessId: "...",
  unit: SpellRecord | ClassFeatureRecord,
  ...
}
```

That is valid because `accessId` is not duplicated by `unit.id`.

### 3. Available prompts are derived from state

The current set of possible battle interactions should be derived from state by pure functions, not stored redundantly.

So the preferred pattern is:

- battle state owns battle facts
- `discoverAvailableBattlePrompts(state)` derives what the frontend can currently do

### 4. Open interaction windows are real state

If the system is in the middle of resolving a multi-step interaction, that unresolved interaction window is real runtime state and may be stored.

This is different from storing a redundant copy of all available options.

So the intended distinction is:

- available prompts: derived
- current unresolved prompt/window: owned state

### 5. Prompt answers must be complete

If the frontend is answering a prompt, the answer for that prompt must be complete at the type level.

We do **not** want a model where the frontend can partially fill a prompt and leave half of its currently requested fields unset.

So the type system should represent:

- prompt not yet answered
- prompt fully answered

and should not represent:

- prompt half answered

### 6. Iterative prompting is real and should be representable

The architecture must allow a completed prompt answer to cause a **new** prompt to appear.

This is SRD-supported, not just a theoretical nicety.

Concrete example:

- [Spells/Descriptions-A-D.md](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md:733)

`Chromatic Orb` can require a new target choice if a certain roll outcome occurs.

That means the model must allow:

1. a prompt is answered completely
2. resolution occurs
3. new required input appears

This is different from “the frontend failed to answer the current prompt fully.”

So there are two distinct situations:

- invalid: incomplete answer to the current prompt
- valid: complete answer to the current prompt, followed by a new prompt created by resolution

### 7. Reducers stay pure and ask for input by returning data

Reducers should not perform hidden I/O.

They may still “call the frontend” in the architectural sense, but only by returning prompt data that the frontend must fulfill.

So the intended pattern is:

- reducer/discovery exposes prompt data
- frontend/MCP fulfills it
- resolution/reducer consumes that answer

This keeps the system:

- pure
- testable
- replayable
- MBT-friendly

### 8. The package should prove patterns for core, not copy its current accidents

The correction package should be used to discover a cleaner pattern that could later inform `core`.

It should not inherit confusing names or structures merely because they already exist in `core`.

### 9. TS-first now, Quint-led later

This package must eventually have Quint parity and Quint-driven MBT just like the main combat stack.

However, the sequencing for this package is:

1. first discover and stabilize the pattern in TS
2. then formalize that pattern in Quint
3. after Quint exists, Quint becomes the semantic lead again

So the current phase is allowed to be TS-first, but it is not allowed to become TS-only architecture drift.

Implication:

- TS structures chosen now should already be easy to formalize in Quint later
- once the discovered pattern is frozen, Quint becomes the semantic lead for the slice again

That favors:

- explicit prompts
- explicit completed prompt answers
- explicit resolved actions
- explicit open interaction windows
- explicit initiative insertion behavior

## Initiative And Turn Modeling

### SRD facts

From [Playing-the-Game.md](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md:494):

```md
The Initiative order remains the same from round to round.
```

From [Playing-the-Game.md](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md:497):

```md
If a tie occurs, the GM decides the order among tied monsters, and the players decide the order among tied characters. The GM decides the order if the tie is between a monster and a player character.
```

### What this means for the package

The model should keep:

- each combatant's initiative count
- the current initiative order for creatures currently participating

But it must **not** treat the battle order as a forever-frozen list independent of battle membership.

Creatures may join or leave the battle.

So the stable thing is:

- a participating creature's initiative count
- the ordered position of currently participating creatures

If a new creature joins during battle:

- it must be inserted according to initiative
- ties are resolved by frontend-supplied adjudication

So the first correction slice should model initiative as:

- initiative counts per combatant
- initiative order for current participants
- turn actor id
- round / turn counters

and should be easy to extend to mid-battle joins without redesign.

## Surface Interpretation Strategy

The first approach should be:

- no large compiled execution IR
- pure structural helper functions over `Surface`

Examples of the kind of helpers expected:

- predicates
  - `isActivationSpell`
  - `isSingleTargetHealingUnit`
  - `isAreaSaveDamageUnit`
  - `usesSpellSaveDc`
  - `requiresSlotChoice`
- readers
  - `activationCostOf(unit)`
  - `targetingOf(unit)`
  - `saveSpecOf(unit)`
  - `scalingOf(unit)`
  - `resourceGateOf(unit)`

These helpers should centralize the structural interpretation so reducers do not each rediscover `Surface` semantics ad hoc.

This is the preferred first attempt before introducing any narrower execution representation.

## Runtime Representation Direction

The intended first slice should look more like:

- validated `Surface` units from a service
- runtime ownership/access wrappers around those units
- battle state over creatures and participation
- pure prompt discovery from battle state
- pure prompt resolution into battle actions
- pure reducer execution over resolved battle actions

Not like:

- hardcoded authored-unit-specific compilers
- runtime dispatch on known unit ids
- a large new language parallel to `Surface`

## Landed Prompt Lifecycle

The landed TS flow now distinguishes four different things explicitly:

- available prompt discovery from `BattleState`
- complete prompt answers in `BattlePromptAnswer`
- resolution results in `BattleResolutionResult`
- reducer-owned state updates in `reduceBattleState`

The key distinction from the earlier pre-implementation notes is:

- an incomplete answer to the current prompt is invalid and unrepresentable at the type level
- a complete answer may still yield a new prompt when resolution discovers more required table input

The slice currently demonstrates that with concrete paths:

- `chooseAction -> endTurn -> resolvedAction`
- `chooseAction -> attack -> openedPrompt(chooseAttackTarget)`
- `chooseAction -> cure_wounds -> openedPrompt(chooseSingleTargetUnit)`
- `chooseAction -> fireball -> openedPrompt(chooseAreaEffect)`
- `chooseAction -> fighter_action_surge_l2 -> resolvedAction`

That is the pattern Quint must formalize next. The Quint task should not
re-infer a different prompt contract from the old candidate shapes below.

## Discovered Pattern Freeze (SRC5.5)

This section is the freeze point for the next batch. `SRC6`, `SRC7`, and
`SRC8` should treat it as the discovered source of truth rather than reusing
older pre-implementation guesses.

### What stayed true

- `Surface` stayed the semantic language and reducers still interpret units by
  structural `Surface` helpers rather than by authored unit ids.
- authored identity still lives only on `unit.id`; runtime ownership is carried
  by `RuntimeUnitAccess.ownerId`
- available prompts are still derived from `BattleState`
- open interaction windows are still real runtime state
- prompt answers are still complete-answer-only at the type level
- reducers are still pure and request more table input by returning data rather
  than by performing I/O
- the package is still TS-first only as a discovery phase, with Quint required
  next

### What changed from the pre-implementation design

- the slice did not land a generic `fillActionInputs` prompt; it landed one
  top-level `chooseAction` prompt plus typed follow-up prompt variants:
  `chooseAttackTarget`, `chooseSingleTargetUnit`, and `chooseAreaEffect`
- `openPrompt` is not a stored full prompt object; `BattleState.openPrompt`
  stores only minimal prompt-owned state and the visible prompt is re-derived
  from current state
- the resolved action vocabulary is concrete and structural:
  `endTurn`, `attack`, `singleTargetHeal`, `areaSaveDamage`, and
  `grantExtraAction`
- the end-to-end proof surface is now explicit and bounded to five paths:
  `attack`, `endTurn`, `cure_wounds`, `fireball`, and
  `fighter_action_surge_l2`
- the package now has deterministic slice tests that cover prompt discovery,
  follow-up prompting, reduction, and next-turn prompt discovery, so the next
  Quint task can model a known flow instead of designing from scratch

### Assumptions rejected by the landed code

- rejected: a generic pending-action plus required-input bag is the right first
  prompt shape
  landed instead: explicit prompt variants with domain-specific payloads
- rejected: storing the full current prompt object in state
  landed instead: minimal in-flight prompt state plus derived prompt discovery
- rejected: letting TS discovery keep drifting while Quint catches up later
  landed instead: this freeze point closes the TS-only discovery phase and
  hands semantic leadership back to Quint for the next task
- rejected: planning `core` integration before the exact prompt/action contract
  is frozen and MBT-backed
  landed instead: `core` stays downstream of the Quint spec and MBT bridge

### Frozen implementation facts Quint must model

- `BattleState` owns:
  - combatants
  - initiative counts
  - stable initiative order
  - `round`, `turnNumber`, and `turnActorId`
  - `openPrompt` as minimal prompt-owned state
  - action-economy counters:
    `standardActionsRemaining` and `restrictedActionsRemaining`
- prompt discovery starts from `discoverAvailableBattlePrompt(state)`
- prompt fulfillment goes through `answerBattlePrompt(state, answer)`
- prompt resolution returns either:
  - `resolvedAction`, or
  - `openedPrompt`
- state mutation happens only in `reduceBattleState(state, action)`

### Frozen sequencing for the next batch

1. `SRC6` should formalize this exact prompt/action/open-window contract in
   Quint.
2. `SRC7` should build a correction-slice MBT bridge against that Quint model.
3. `SRC8` should port one bounded `core` path only after the Quint+MBT lane is
   proving the slice.

## Effect Usage

This package should use Effect properly, but not indiscriminately.

### Use Effect DI for true services

Examples:

- validated authored unit library
- validated `Surface` unit library
- runtime battle setup/fixture providers if needed later

### Keep domain logic pure where possible

Examples:

- surface interpretation helpers
- available prompt discovery
- prompt resolution
- battle reducer transitions

### Use `Effect.gen` and `yield*` at orchestration boundaries

When code is orchestrating service access or assembling multiple domain steps around injected services, `Effect.gen` with `yield*` is the right style.

The package should therefore avoid both extremes:

- bad: manual `Either.isLeft(...)` branching everywhere
- also bad: turning every small pure domain function into `Effect` just because DI exists

Preferred split:

- pure domain logic first
- Effect for orchestration and services

## Access Identity

The package should stay simple initially, but it must leave room for access-path identity.

Why this matters:

- one creature can have the same authored unit through multiple access paths
- for example, the same spell from preparation and from a magic item

That is RAW-relevant because spellcasting can come from:

- normal spell slots
- special abilities
- magic items

See [Spells/Gaining-and-Casting.md](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Gaining-and-Casting.md:54).

So:

- authored unit id alone is not always enough long-term
- but the first slice does not need to force access identity unless the slice itself models that case

The design requirement is therefore:

- do not require `accessId` immediately
- but do not choose a design that makes `accessId` awkward or contradictory later

## Frontend Fulfillment

The package should assume that prompts are fulfilled by the frontend.

An important target frontend is MCP, just like in `core`.

So prompt shapes should be designed as frontend-fulfillable data, not as internal-only helper objects.

## Package Naming

The package should be renamed from:

- `toy-surface-hydration`

to:

- `surface-runtime-correction`

because it is no longer a throwaway toy. It is the correction/proving ground for the architecture.

## Implementation Skeleton

The next implementer should aim for a shape close to this.

### Candidate runtime wrapper

```ts
type RuntimeUnitAccess = {
  readonly unit: SpellRecord | ClassFeatureRecord;
  readonly ownerId: CreatureId;
  readonly sourceKind: "characterSheet" | "statBlock";
};
```

Notes:

- no duplicate `authoredUnitId`
- authored identity comes from `unit.id`
- this shape intentionally leaves room for later `accessId` if multi-access cases are added

### Candidate prompt shape

```ts
type AvailableBattlePrompt =
  | {
      readonly tag: "chooseAction";
      readonly actorId: CreatureId;
      readonly options: ReadonlyArray<AvailableActionOption>;
    }
  | {
      readonly tag: "fillActionInputs";
      readonly actorId: CreatureId;
      readonly action: PendingAction;
      readonly requiredInputs: PromptRequirement;
    };
```

The important property is not the exact names; it is that prompts represent unresolved frontend/Table requirements explicitly.

Status note:

- this exact candidate shape was superseded by the landed `chooseAction` plus typed follow-up prompt variants
- keep this section as architectural rationale, not as the current source of truth

### Candidate resolved action shape

```ts
type ResolvedBattleAction =
  | {
      readonly tag: "useCoreAction";
      readonly actorId: CreatureId;
      readonly action: "attack" | "endTurn";
      readonly ...
    }
  | {
      readonly tag: "useUnit";
      readonly actorId: CreatureId;
      readonly unit: RuntimeUnitAccess;
      readonly ...
    };
```

### Candidate resolution result shape

```ts
type BattleResolutionResult =
  | { readonly tag: "ready"; readonly action: ResolvedBattleAction }
  | { readonly tag: "needsPrompt"; readonly prompt: AvailableBattlePrompt };
```

This is where iterative prompting fits:

- a complete prompt answer may still produce a new prompt

Status note:

- the landed names are `resolvedAction` and `openedPrompt`
- the important invariant survived the rename: complete prompt answers do not imply immediate state mutation, and they may still create a new prompt

### Candidate battle state additions

```ts
type BattleState = {
  readonly combatants: ReadonlyArray<BattleCombatant>;
  readonly initiativeOrder: ReadonlyArray<CreatureId>;
  readonly round: number;
  readonly turnNumber: number;
  readonly turnActorId: CreatureId | null;
  readonly openPrompt?: AvailableBattlePrompt;
};
```

Status note:

- the landed state stores `openPrompt` as minimal prompt-owned state rather than a full duplicated derived prompt object
- this keeps prompt discovery derived while still making the in-flight interaction window real state

This is not meant to be copied literally, but it is the intended direction.

### Candidate file split

- `types.ts`
  - domain types
  - battle state
  - prompt/action/result types
- `surface-interpretation.ts`
  - structural helpers over `Surface`
- `battle-discovery.ts`
  - derive available prompts from state
- `battle-resolution.ts`
  - turn complete prompt answers into resolved actions or new prompts
- `battle-reducer.ts`
  - apply resolved actions to state
- `battle-init.ts`
  - start battle, initiative ordering, participant insertion

Exact filenames can differ, but the concerns should stay separated like this.

## Worked Example Flow

The package should support a flow like this:

1. Battle is initialized with participating creatures and initiative counts.
2. `initiativeOrder` is established, including any frontend/Table tie decision.
3. `turnActorId` points at the first acting creature.
4. Prompt discovery derives what that creature can currently do.
5. The frontend answers the current prompt completely.
6. Resolution either:
   - yields a final action, or
   - yields a new prompt created by earlier resolution
7. A reducer applies the resolved action.
8. Battle state advances:
   - same turn if more interaction remains
   - next turn otherwise

This example flow is important because it shows the intended boundary:

- prompts are not hidden
- frontend fulfillment is explicit
- multi-step resolution is representable

## First Implementation Slice

The next implementation slice should do the following:

1. Rename the package to `surface-runtime-correction`.
2. Replace the current flat battle choice object with:
   - available battle prompts
   - resolved battle actions
   - optional open prompt state when a multi-step interaction is in progress
3. Enforce complete prompt answers at the type level.
4. Add initiative-aware battle turn state:
   - initiative
   - initiative order
   - turn actor id
   - round / turn counters
5. Keep available prompts derived from state.
6. Add support for “new prompt appears after prior resolution.”
7. Include both:
   - a core battle mechanic such as attack or end turn
   - unit-based interactions such as cure wounds, fireball, and action surge
8. Use Effect-idiomatic pure composition:
   - `Either.flatMap`
   - `Either.map`
   - `Match`
   - service boundaries only where actual services are needed

## Handoff Notes For Implementers

If you are implementing from this document without prior context, keep these rules in mind:

1. Do not dispatch on specific unit ids for semantics.
   Use structural matching over `Surface`.
2. Do not duplicate authored identity outside `unit.id`.
3. Do not store the full current choice set in state.
   Derive it.
4. Do store an open unresolved prompt if a multi-step interaction is in flight.
5. Do not allow partial prompt answers.
6. Do not add a new execution IR unless you can prove it is smaller and more generic than `Surface`.
7. If your implementation starts stretching these rules, stop and redesign instead of patching around them.

## Code Smells To Reject Immediately

The following should be treated as immediate design failures in this package:

- dispatch by specific authored unit id for semantics
- duplicate authored identity fields
- storing available choices redundantly in state
- allowing partially answered prompts
- a broad second execution language that mirrors `Surface`
- hidden reducer I/O
- using `core` naming or structure merely because it already exists there

## Diagram Follow-Up

The diagram work should be updated to reflect one explicit point:

- resolution can create a new prompt after a complete prior prompt answer

This should be shown as distinct from the simple reducer/table loop, because the distinction matters:

- incomplete answer to current prompt is invalid
- complete answer followed by newly created prompt is valid
