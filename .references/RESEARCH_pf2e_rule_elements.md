# PF2E Rule Elements

## What It Is

PF2E treats item-authored mechanics as a closed set of `RuleElement` classes, not as ad hoc script hooks. The registry lives in `/.references/inspirations/pf2e/src/module/rules/index.ts`, where `RuleElements.fromOwnedItem()` walks `item.system.rules`, validates the `key`, instantiates a typed class, and drops unrecognized entries instead of improvising.

The important split is between content and execution. Rule data lives on items as serialized JSON; executable behavior lives in the rule-element class hierarchy in `/.references/inspirations/pf2e/src/module/rules/rule-element/*.ts`. That keeps authored content data-driven while still giving the engine explicit runtime phases.

## Modeling Pattern

Rule elements are schema-validated `DataModel` objects. The base class in `/.references/inspirations/pf2e/src/module/rules/rule-element/base.ts` defines common fields like `key`, `slug`, `priority`, `predicate`, and equip/investment gating. Construction resolves injected references such as `{actor|...}` and `{item|...}`, marks invalid rules ignored, and uses predicates as the main semantic gate.

The key modeling move is the synthetic bag in `/.references/inspirations/pf2e/src/module/rules/synthetics.ts`. Instead of mutating actor state directly from every rule, many rules contribute deferred outputs into typed collections: modifiers, damage dice, notes, roll substitutions, roll-twice, strike adjustments, token overrides, auras, ephemeral effects, and special statistics. That gives PF2E a two-step model: capture rule intent first, realize it later.

This is a good fit for a spec-first engine because it keeps the semantic frontier explicit. A rule can say "I add a modifier if this predicate holds" without forcing the consumer to know whether the modifier will matter for AC, a strike, a save, or a token property.

## Runtime Pattern

Actor preparation in `/.references/inspirations/pf2e/src/module/actor/base.ts` is staged around owned items:

1. `prepareDataFromItems()` collects conditions, runs sibling/actor prep on items, and builds `this.rules`.
2. `prepareRuleElements()` sorts items so ancestry/heritage/background/class resolve predictably, then sorts rules by `priority`.
3. `prepareEmbeddedDocuments()` runs `onApplyActiveEffects()` hooks after embedded documents exist.
4. `prepareData()` runs `afterPrepareData()` hooks after the actor has finalized its main derived state.

That phase split matters. PF2E uses `onApplyActiveEffects()` for mutations that need to happen during effect application, `beforePrepareData()` for rule contributions that should shape derived values, and `afterPrepareData()` for cleanup or token-facing outputs that need final actor state. The exact hook is visible in the interface comments in `base.ts`, and the concrete implementations are spread across rules like `flat-modifier.ts`, `roll-option/rule-element.ts`, `ephemeral-effect.ts`, `token-light.ts`, and `special-statistic.ts`.

The runtime also distinguishes immediate data from deferred execution. `EphemeralEffectRuleElement` in `ephemeral-effect.ts` does not apply an effect immediately; it registers a thunk in `actor.synthetics.ephemeralEffects`, and that thunk later decides whether to clone a condition/effect source, adjust its name, and inject it into a contextual clone. That is the cleanest example of PF2E’s staging model: declare now, materialize later, and only materialize if the predicate still passes.

## Content/Code Boundary

PF2E keeps authored mechanics inside item JSON, but the code boundary is still real. The allowed behavior is defined by the finite class registry in `index.ts` and the hook phases in `base.ts`; the item JSON only chooses which keys and predicates to use.

That boundary gets sharp around ephemerals. `ephemeral-effect.ts` refuses content that depends on interactive composition like `ChoiceSet` or non-in-memory `GrantItem`, because those rules cannot be safely realized inside a single deferred effect clone. That is a useful import rule for this repo: content can describe a deferred outcome, but it should not smuggle in interactive authoring flows that belong to build-time or UI-time tooling.

The other importable part is the roll-option vocabulary. PF2E’s `rollOptions` are a semantic layer, not noise; they encode actor/item/scene facts that downstream rules query in a closed way. The implementation in `roll-option/rule-element.ts` shows how to keep those facts phase-aware and consensus-driven across merged rules.

## Verification Signals

PF2E does a few things that are worth copying as validation signals even though the system is not formally verified:

- Schema validation and constructor-time invalidation keep bad rules from leaking past the boundary.
- Priority sorting makes rule application order explicit instead of incidental.
- `ignored` and `invalid` are part of the model, so a rule can be present in content without becoming runtime-active.
- Predicate checks are uniform and centralized instead of spread across consumer code.
- Synthetic outputs are typed by category, which makes it easier to reason about what a rule is allowed to influence.

The strongest signal for our repo is not the rule catalog itself but the phase discipline. If a mechanic cannot be assigned to pre-create, apply-active-effects, before-prepare, or after-prepare, it is probably too vague for a spec-first engine.

## Import Path For This Repo

Model PF2E rule elements as closed Quint feature records with an explicit phase and a typed output bag. The closest analogue is "feature contributes synthetics during actor prep, then consumers realize those synthetics during derived-data or roll resolution." Keep the following importable:

- closed rule keys, not plugin-registered string dispatch;
- predicate-gated contributions;
- priority-ordered synthesis;
- deferred ephemeral outputs;
- item-authored data as the source of truth.

Treat `beforePrepareData()` / `afterPrepareData()` as the two phases that matter most for our spec. The first is where a feature can safely influence derived state; the second is where final actor-local projections, token-facing changes, and cleanup belong.

## Avoid/Ignore

- Ignore the exact Foundry `DataModel` inheritance and JSDoc-heavy runtime plumbing. That is platform noise.
- Ignore UI sheet affordances and editor scaffolding.
- Ignore open-ended custom rule registration as a design goal. Our engine should stay closed where the SRD is closed.
- Ignore any mechanic that only exists to support one Foundry module or one migration path.
- Ignore `ChoiceSet`-style interactive authoring inside runtime effect clones; that belongs in content tooling, not execution.

