# Learn: Explicit Effect Phase Ownership

Pattern:

- effects apply at named phases;
- effect ordering is explicit;
- expiry and cleanup are part of the model;
- "remove effect" is semantically meaningful, not UI cleanup noise.

Main competitors:

- DAE
- Midi-QOL
- Foundry dnd5e activity/effect stack

Our local counterpart:

- `ActiveEffect` in `creature.qnt` and `types.ts`
- `processStartTurn` / `processEndTurn`
- concentration teardown and dependent cleanup in the battle machine

## Why Read This

Read this to understand why the hard part of rules execution is not attack math. It is timing, expiry, and cleanup.

The competitor code is messy because it lives inside Foundry. The goal is to extract the durable phase pattern and ignore the platform glue.

## Tracer Bullet

### 1. Read DAE’s own statement of the phase problem

Read:

- [dae `Readme.md:141`](./inspirations/dae/Readme.md)

What to notice:

- core active effects run before derived fields;
- DAE adds another pass after `prepareDerivedData()`;
- change priority is explicit and sorted.

Short example:

```md
Core system active effects are calculated before ... prepareDerivedData().
DAE adds an additional effect application pass that occurs after ... prepareDerivedData() completes.
```

And:

```md
All changes across all effects are collected and sorted by priority before application.
```

Why it matters:

- DAE is telling you the real problem directly: some effects need base data, some need derived data, and they must not be treated as the same phase.

### 2. Read the actual second-pass implementation

Read:

- [dae `src/module/Systems/DAEdnd5e.ts:1282`](./inspirations/dae/src/module/Systems/DAEdnd5e.ts)

What to notice:

- `applyBaseEffects()` runs first;
- `prepareData()` calls wrapped actor prep;
- DAE then runs another `applyDaeEffects()` pass on derived specs;
- statuses are cleared and rebuilt deliberately.

Short example:

```ts
wrapped();
applyDaeEffects.bind(this)({
  specList: ValidSpec.actorSpecs[this.type].derivedSpecsObj,
  ...
});
```

Why it matters:

- the timing boundary is not accidental;
- they had to make it explicit because effect semantics depended on it.

### 3. Read how ordering is made concrete

Read:

- [dae `src/module/Systems/DAEdnd5e.ts:1427`](./inspirations/dae/src/module/Systems/DAEdnd5e.ts)

What to notice:

- DAE flattens all effect changes into a list;
- every change gets a priority;
- the list is sorted before application.

Short example:

```ts
changes.sort((a, b) => (a.priority ?? 10) - (b.priority ?? 10));
for (const change of changes) {
  const changes = change.effect!.apply(this, change);
  Object.assign(overrides, changes);
}
```

Why it matters:

- phase ownership is necessary but not sufficient;
- intra-phase ordering also needs to be explicit.

### 4. Read where Midi-QOL applies and expires workflow-timed effects

Read:

- [midi-qol `src/module/workflow.ts:844`](./inspirations/midi-qol/src/module/workflow.ts)
- [midi-qol `src/module/workflow.ts:915`](./inspirations/midi-qol/src/module/workflow.ts)

What to notice:

- effect application happens inside workflow stages, not just actor prep;
- stacking is checked explicitly;
- some special expiries are removed at `ROLLFINISHED`.

Short example:

```ts
if ((ceEffect.flags.dae?.stackable ?? "none") === "none" && game.dfreds.effectInterface?.hasEffectApplied(...)) {
  await game.dfreds.effectInterface?.removeEffect(...);
}
...
const specialExpiries = ["isDamaged", "1Reaction"];
await this.expireTargetEffects(specialExpiries)
```

Why it matters:

- some effects belong to turn prep;
- some belong to an action workflow;
- expiry is part of resolution, not an afterthought.

### 5. Read where reaction timing is made explicit

Read:

- [midi-qol `src/module/itemhandling.ts:144`](./inspirations/midi-qol/src/module/itemhandling.ts)
- [midi-qol `src/module/GMAction.ts:229`](./inspirations/midi-qol/src/module/GMAction.ts)

What to notice:

- reaction items are explicitly identified by activation type;
- reaction prompts are an explicit workflow step.

Short example:

```ts
if (["reaction", "reactiondamage", "reactionmanual", "reactionpreattack"].includes(this.system.activation?.type)) {
  itemUsesReaction = true;
}
```

And:

```ts
const result = await promptReactions(...)
```

Why it matters:

- "reaction window" is a real semantic phase, not a UI detail.

## Now Trace The Equivalent In Our Repo

Read:

- [creature.qnt:839](../creature.qnt)
- [types.ts:233](../packages/core/src/types.ts)
- [battle-machine-helpers.ts](../packages/core/src/battle-machine-helpers.ts)

What to notice:

- our effect model already names expiry phases;
- our effect model already separates turn hooks and reactive payloads;
- we should keep strengthening this instead of importing hook webs.

Short example from our side:

```ts
export interface ActiveEffect {
  readonly expiresAt: ExpiryPhase;
  readonly startOfTurnHook?: EffectTurnHook;
  readonly endOfTurnHook?: EffectTurnHook;
  readonly reactivePayload?: ReactiveEffectPayload;
}
```

## What To Carry Back Into This Repo

Take:

- named apply phases;
- explicit expiry phases;
- explicit cleanup paths;
- explicit reaction windows;
- deterministic ordering where multiple effects compete.

Do not take:

- Foundry’s arbitrary path mutation;
- hook sprawl as the semantic carrier;
- module flags as the main source of truth.

## Read Next

- [LEARN_item_feature_scoped_runtime_payloads.md](./LEARN_item_feature_scoped_runtime_payloads.md)

