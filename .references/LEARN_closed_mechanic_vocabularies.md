# Learn: Closed Mechanic Vocabularies

Pattern:

- authored content contributes through a finite mechanic vocabulary;
- runtime semantics are closed and typed;
- unknown mechanic keys fail closed instead of improvising.

Main competitor:

- PF2E

Our local counterpart:

- `features/*` pure functions
- `InitCreatureConfig -> BattleCreatureState`
- battle-owned typed payloads such as `readyableSpellPayloads` and reaction option arrays

## Why Read This

Read this if you want to see the cleanest example in the corpus of "content is data, mechanics are a closed runtime surface."

The point is not to copy PF2E's class hierarchy. The point is to see how it prevents content from inventing new runtime semantics accidentally.

Important caveat before reading:

- PF2E is not a model for good runtime architecture here.
- It is heavily OOP, heavily mutable, and strongly tied to actor lifecycle callbacks.
- What we want from it is the closed mechanic vocabulary and the typed contribution idea, not its object model or mutation style.

## Tracer Bullet

### 1. Start at the registry

Read:

- [pf2e `src/module/rules/index.ts:49`](./inspirations/pf2e/src/module/rules/index.ts)

What to notice:

- `RuleElements.builtin` is a closed map from string key to implementation.
- `fromOwnedItem()` walks `item.system.rules`.
- if a `key` is unknown, PF2E warns and does not invent behavior.

Short example:

```ts
static readonly builtin = {
  FlatModifier: FlatModifierRuleElement,
  RollOption: RollOptionRuleElement,
  Strike: StrikeRuleElement,
  EphemeralEffect: EphemeralEffectRuleElement,
}
```

Why it matters:

- the item JSON chooses among known mechanics;
- the engine owns semantics;
- content cannot smuggle in a new mechanic just by writing a new key.

What this means for us:

- the repo should keep a closed set of battle-relevant mechanic payloads;
- new SRD rules should extend typed projectors and typed runtime payloads, not introduce open scripting.

### 2. Look at the phase hooks on the base type

Read:

- [pf2e `src/module/rules/rule-element/base.ts:350`](./inspirations/pf2e/src/module/rules/rule-element/base.ts)

What to notice:

- PF2E gives each rule element named runtime hooks.
- `beforePrepareData()` and `afterPrepareData()` are explicit phase boundaries.

Short example:

```ts
onApplyActiveEffects?(): void;
beforePrepareData?(): void;
afterPrepareData?(): void;
beforeRoll?(domains: string[], rollOptions: Set<string>): void;
```

Why it matters:

- the vocabulary is not just a set of mechanic names;
- it is also a set of legal runtime entry points.

What this means for us:

- when we add a new typed mechanic, it should land at a named battle/spec phase;
- if we cannot say when it applies, it is not ready to model.

### 3. Read one concrete rule that contributes without mutating directly

Read:

- [pf2e `src/module/rules/rule-element/flat-modifier.ts:120`](./inspirations/pf2e/src/module/rules/rule-element/flat-modifier.ts)

What to notice:

- the rule resolves selectors;
- it creates a deferred constructor;
- it pushes that constructor into `actor.synthetics.modifiers[selector]`.

Short example:

```ts
const modifiers = (this.actor.synthetics.modifiers[selector] ??= []);
modifiers.push(construct);
```

Why it matters:

- the rule expresses a known contribution type: `Modifier`;
- it does not patch arbitrary actor fields.

What this means for us:

- prefer typed contribution payloads over general effect mutation;
- if a rule affects attack, damage, save, or reaction logic, represent that explicitly in a typed surface.

### 4. Read one concrete rule that defers a more complex effect

Read:

- [pf2e `src/module/rules/rule-element/ephemeral-effect.ts:35`](./inspirations/pf2e/src/module/rules/rule-element/ephemeral-effect.ts)

What to notice:

- it registers a deferred effect in `synthetics.ephemeralEffects`;
- it validates the deferred content;
- it rejects forbidden rule element combinations inside the deferred effect.

Short example:

```ts
const synthetics = (this.actor.synthetics.ephemeralEffects[selector] ??= { target: [], origin: [] });
synthetics[this.affects].push(deferredEffect);
```

And later:

```ts
if (hasForbiddenREs) {
  this.failValidation("an ephemeral effect may not include a choice set or grant");
}
```

Why it matters:

- even the "complex" mechanic still stays inside a closed semantic fence;
- deferred content is allowed, open-ended composition is not.

What this means for us:

- readyable spells, reactive effects, and temporary battle effects should stay inside a typed runtime fence;
- do not allow generic "effect contains arbitrary effect language" modeling.

### 5. Read where the actor actually consumes the contributions

Read:

- [pf2e `src/module/actor/character/document.ts:482`](./inspirations/pf2e/src/module/actor/character/document.ts)

What to notice:

- actor prep reads from `synthetics`;
- `extractModifiers` is called over named selectors like `hp` and `hp-per-level`;
- the rule contributions become concrete runtime values here.

Short example:

```ts
const hpRollOptions = this.getRollOptions(["hp"]);
modifiers.push(...extractModifiers(synthetics, ["hp"], { test: hpRollOptions }));
```

Why it matters:

- the semantic frontier is explicit end to end:
- item JSON -> closed rule key -> typed contribution -> named consumer.

## What To Carry Back Into This Repo

Take:

- a closed set of mechanic contribution types;
- typed battle-facing payloads;
- named application phases;
- rejection of unknown or underspecified mechanic surfaces.

Do not take:

- plugin-style rule registration as a product goal;
- open scripting or arbitrary field mutation;
- a second runtime semantics layer outside Quint and the battle machine.

## Read Next

- [LEARN_projection_time_synthetic_accumulation.md](./LEARN_projection_time_synthetic_accumulation.md)
