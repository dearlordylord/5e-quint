# Surface Runtime Correction Reducer Design

This document records the reducer-direction decisions for
`packages/surface-runtime-correction`.

It is intentionally narrower than
`SURFACE_RUNTIME_CORRECTION_DESIGN.md`.

Its purpose is to lock down the first reducer architecture before more code is
written.

## Goal

Load authored `Surface` units from JSON, interpret a small supported subset
structurally, and have reducer code handle them generically without branching on
 spell or feature ids.

Examples:

- `fireball` should work because its authored structure matches a supported
  family, not because code checks `"fireball"`.
- `fire_bolt` should work for the same reason.
- If `chromatic_orb` is later supported, it should be because its authored
  structure and continuation semantics are recognized structurally, not because
  code checks `"chromatic_orb"`.

## Main Principle

The reducer is generic over a small set of supported structural families.

It is **not** generic over all raw `Surface`, and it is **not** allowed to grow
a second authored language parallel to `Surface`.

So the architecture has one small interpretation step:

- `State + subject -> interpreted supported structure`

That interpretation step is allowed to fail fast when the subject is outside the
currently supported subset.

## Replay-From-Root Model

The first reducer slice uses replay-from-root.

This means:

- the caller sends the chosen subject plus the full currently known filled-hole
  assignment for that subject;
- the reducer replays resolution from the root each time;
- the reducer either resolves fully or returns the next missing holes;
- there is no continuation frame stored in reducer state for the first slice.

Why this model was chosen:

- the system is deterministic;
- replay is cheap;
- it avoids early continuation-frame design;
- it gets us to real reducer code faster for the supported subset.

Implication:

- reducer state should contain only durable battle state;
- chosen subject and filled holes live in the caller payload, not reducer state.

## State Ownership

Reducer state owns only durable battle facts.

It does **not** own:

- available actions
- initial holes
- chosen subject
- continuation transcript

Those are derived or caller-supplied per replay.

## Subject Identity

Resolution subject identity must include `actorId`.

Reason:

- active turn actor is not the only possible actor;
- reaction windows can admit zero to many eligible actors;
- legendary actions and similar windows are not initiative-equals-actor flows.

So execution identity is singular and explicit, even when eligibility is plural
and state-derived.

Recommended shape:

```ts
type ResolutionSubject =
  | {
      readonly tag: "coreAction";
      readonly actorId: CreatureId;
      readonly action: "attack" | "endTurn";
    }
  | {
      readonly tag: "unit";
      readonly actorId: CreatureId;
      readonly unitId: UnitRecord["id"];
    };
```

## Discovery Contract

`discoverAvailableActions(state)` returns only actions that are currently legal
to begin.

Unavailable actions are hidden in the first slice.

Discovery should return:

- `subject`
- `initialHoles`
- light metadata such as `label` and `summary`
- optional structural `family` for debugging/tests

Discovery should **not** return:

- reducer instructions
- cached interpreted units
- stale legality payloads intended to be trusted later

Resolution always re-derives interpretation from `state + subject`.

## Holes

The term is **holes**.

Do not call them `slots` in this design because `slot` is already overloaded in
the repo by spell slots and similar resource concepts.

Meaning:

- a hole is a caller/table-supplied missing piece needed for resolution to
  continue;
- hole sets are derived from supported authored structure plus current runtime
  context.

Examples:

- chosen slot level
- chosen target
- chosen damage type
- supplied attack roll
- supplied damage dice
- supplied area membership or per-target outcomes when the supported structure
  needs them

## Hole Ownership

Initial holes are derived.

Continuation holes, in the replay-from-root model, are also derived during
replay and returned as the next missing holes.

So the first slice does not store holes in reducer state at all.

## Hole Ids

Hole ids are derived automatically, not authored.

Why:

- avoids widening Surface too early;
- replay-from-root needs stable matching between derived holes and caller-filled
  values;
- deterministic structural derivation is sufficient for the first slice.

Hole ids should come from:

- subject identity
- structural path in the interpreted authored shape
- continuation path label plus occurrence index if continuation later enters the
  supported set

## Strict Validation

The reducer fails hard on invalid hole payloads.

Invalid means:

- unknown hole id
- duplicate hole id
- wrong value shape for a known hole
- extra hole values that are not currently expected

The caller must send exactly the currently accumulated filled-hole assignment for
that subject.

## Requirements

Requirements are factored separately from delivery.

This split is important.

Examples:

- `fireball` delivery may be `save_gate`;
- but one requirement is still that a legal spell slot exists right now.

So requirements answer:

- what must already be true or currently legal?
- what caller-supplied holes are still needed?

We split them into:

- legality requirements
- hole requirements

Example:

- slot choice is both:
  - legality: at least one legal slot must exist;
  - hole: the caller must still choose which slot level to expend.

## Interpreter Axes

Supported units are interpreted into one composed shape with separate axes:

- `requirements`
- `delivery`
- `targeting`
- `effect`
- `continuation`

This is preferred over one large union because those are real independent axes.

Recommended shape:

```ts
type InterpretedUnit = {
  readonly requirements: DerivedRequirements;
  readonly delivery: DerivedDelivery;
  readonly targeting: DerivedTargeting;
  readonly effect: DerivedEffect;
  readonly continuation: DerivedContinuation;
};
```

## Unsupportedness

Unsupportedness exists only at the interpreter boundary.

That means:

- interpreter returns either a fully supported interpreted shape or an
  unsupported reason;
- downstream reducer code only consumes supported interpreted units.

Do **not** put `unsupported` on every axis.

That would infect every downstream type and blur the boundary.

Recommended style:

```ts
interpretSubject(state, subject): Either<UnsupportedReason, InterpretedUnit>
```

## First Supported Subset

The first supported subset is deliberately small.

Core actions:

- `attack`
- `endTurn`

Units:

- `fire_bolt`
- `fireball`
- `cure_wounds`
- `fighter_action_surge_l2`

Those are enough to pressure the first slice without pretending the whole
language is done.

They cover:

- `attack_roll`
- `save_gate`
- `direct_apply`
- damage
- heal
- turn-economy change
- legality requirements
- hole requirements

Explicitly out of scope for the first slice:

- reactions
- legendary actions
- continuation semantics
- random-table branching
- counterspell-style interrupt windows
- any authored structure outside the supported subset

The architecture must remain ready for those later, but the interpreter should
fail fast on them now.

## Hole Value Typing

Hole values use a mixed strategy.

Do **not** make everything `unknown`.
Do **not** fully type a giant hole language yet.

Instead:

- type only the hole values required by the first supported subset;
- leave unsupported structures unsupported.

This means:

- small reusable domain value shapes for simple holes;
- derived hole descriptors that say which value shape applies and what its
  constraints are.

Examples for the first slice:

- slot choice value
- target choice value
- attack roll value
- damage roll value

## Discovery vs Resolution

Discovery does **not** return the full interpreted unit.

Reason:

- replay-from-root already means resolution will reinterpret from
  `state + subject`;
- returning interpreted internals from discovery risks stale cached meaning if
  state changes before resolution.

So:

- discovery returns a lightweight action view;
- resolution re-derives supported interpretation authoritatively.

## Resolution API

The first reducer-resolution API should be one pure function:

```ts
resolveSubject(
  state: State,
  subject: ResolutionSubject,
  filledHoles: ReadonlyArray<FilledHoleValue>,
):
  | { readonly tag: "resolved"; readonly state: State }
  | { readonly tag: "needsHoles"; readonly holes: RuntimeHoleSet }
  | { readonly tag: "unsupported"; readonly reason: UnsupportedReason }
  | { readonly tag: "invalid"; readonly reason: string }
```

Meaning:

- `resolved`: replay finished and produced the next state
- `needsHoles`: replay reached the next missing holes
- `unsupported`: supported subset boundary was crossed
- `invalid`: caller payload for a supported subject was malformed

## File Split

The first reducer implementation should use this minimal split:

- `reducer-state.ts`
- `reducer-interpretation.ts`
- `reducer-resolution.ts`

Why:

- state stays about durable battle facts;
- interpretation stays about supported structural recognition;
- resolution stays about replay, validation, and state transition flow.

Do not split further until the first slice is real.

## Chromatic Orb Position

`Chromatic Orb` is not in the first supported subset.

But the architecture must be ready for it.

What this design says about Orb:

- it should eventually be supported structurally, not by spell id;
- replay-from-root is a good fit for its continuation chain;
- hole ids and continuation labels must be derivable deterministically;
- authored Surface may later need minimal widening for first-class continuation
  semantics, but reducer state should not pre-author that language now.

## Immediate Next Step

Do not write full resolution first.

Write `reducer-interpretation.ts` first, minimally:

- `ResolutionSubject`
- `UnsupportedReason`
- `InterpretedUnit`
- the five derived axes
- `interpretSubject(state, subject)`

Support only:

- `attack`
- `endTurn`
- `fire_bolt`
- `fireball`
- `cure_wounds`
- `fighter_action_surge_l2`

Fail fast on everything else.
