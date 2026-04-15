# Foundry Effect Staging

## What It Is

The Foundry dnd5e stack is not one effect system; it is a layered runtime. Core dnd5e provides the document model and the activity lifecycle in `/.references/competitors/foundryvtt-dnd5e/dnd5e.mjs`, the system architecture note in `/.references/inspirations/ARCHITECTURE-foundryvtt-dnd5e.md` describes the main pipeline, DAE extends ActiveEffect behavior in `/.references/inspirations/dae/Readme.md`, and Midi-QOL wraps item usage and workflow timing in `/.references/inspirations/midi-qol/README.md`.

The useful mental model is: data prep first, staged roll/workflow second, cleanup last. The noise is all the extra hook surface and module-specific flags that accumulate around that core.

## Modeling Pattern

The dnd5e system uses a reactive document pipeline: `prepareBaseData -> applyActiveEffects -> prepareDerivedData`. The architecture note in `/.references/inspirations/ARCHITECTURE-foundryvtt-dnd5e.md` is explicit about that sequence, and `dnd5e.mjs` wires the runtime by installing custom document classes, config registries, and effect listeners.

Effects are string-path mutations. `ActiveEffect5e` changes arbitrary dot-path keys, and the architecture note calls out that as the core extension mechanism. That is flexible but intentionally unbounded: any effect can touch any path. For this repo, that is a cautionary pattern, not a target.

DAE makes the stage ordering more explicit. In `/.references/inspirations/dae/Readme.md`, DAE says core ActiveEffects resolve before dnd5e derived data, then DAE adds another effect-application pass after `prepareDerivedData()`. It also introduces priority ordering across changes, stackable policies, and special durations. That is the strongest importable idea from the extension stack: staged, ordered application of declarative effect deltas.

Midi-QOL contributes a different layer: item-use workflow orchestration. The README shows the `use -> consume -> roll -> message` shape plus hookable points before and after each stage. It also makes reaction-aware timing visible through workflow flags, OnUse macros, DamageBonusMacros, and effect application/removal callbacks.

Important caveat:

- Midi-QOL is useful here as a map of timing pressure and effect-lifecycle edge cases.
- It is not a good architectural model for this repo.
- The codebase is heavily workflow-driven, mutable, special-case heavy, and often leans on hardcoded branches, weak type boundaries, and `ts-ignore`-style escape hatches.
- The import is "what timing problems exist," not "how to structure a rules engine."

## Runtime Pattern

The runtime front door is activity usage. In `ARCHITECTURE-foundryvtt-dnd5e.md` and `dnd5e.mjs`, the activity flow is `use()` -> `consume()` -> roll/message, with hooks that can cancel or mutate at several points. That is where item usage, concentration start, and subsequent auto-rolls happen.

The effect side is separate but coupled. `CONFIG.ActiveEffect.documentClass = documents.ActiveEffect5e` in `dnd5e.mjs` installs the system effect class, and the architecture note shows how conditions like exhaustion and concentration are represented as special ActiveEffects plus flags. The runtime pattern is therefore:

1. build or update documents;
2. apply ActiveEffects during prep;
3. derive final actor values;
4. run workflow timing for an item use;
5. apply or remove effects, macros, and cleanup hooks.

DAE’s staging rules matter here. Its `Readme.md` says the core applyEffects pass sorts changes by priority, supports expressions, and evaluates some fields immediately while leaving others for later roll-time interpolation. That means DAE is not just "effects with more flags"; it is a second-order staging layer that controls when a change becomes data, when it remains text, and when it should be evaluated on the target versus the source.

Midi-QOL then uses that staged data to drive reactions and interrupts. The README’s Spirit Guardian example is the clearest pattern: an effect can be applied, trigger a macro on apply, trigger again on remove, and use workflow context to decide whether to roll damage, ask for a save, or suppress reactions. The important runtime fact is that cleanup is not implicit; it is part of the workflow contract.

That said, the mechanism is mostly the opposite of what we want:

- mutable workflow objects carry too much semantic load;
- hook ordering becomes part of correctness;
- special cases accrete around narrow interactions;
- the result is useful as a warning sign, not as a template.

## Content/Code Boundary

The importable pieces are the ones that define stable runtime semantics:

- explicit preparation phases;
- priority-ordered declarative deltas;
- special duration rules;
- effect apply/remove symmetry;
- workflow-local context for reactions and interrupts;
- cleanup hooks tied to effect deletion or expiry.

The non-importable pieces are the Foundry-specific binding surface:

- arbitrary string-path mutation on unknown document schemas;
- hook proliferation as the primary extensibility mechanism;
- module flags like `flags.midi-qol` and `flags.dae` as semantic carriers;
- UI/editor behavior for effect configuration;
- compatibility shims for unrelated modules.

DAE is especially noisy on the boundary. Its README exposes a lot of editor and module-integration behavior, but the durable idea is simpler: effect application can be staged, ordered, and reversed, and the source/target of evaluation can differ from the source/target of ownership.

## Verification Signals

These are the signals worth preserving if we borrow the model:

- DAE’s change priority makes effect ordering explicit.
- DAE’s stackable policy makes duplicate handling deterministic.
- DAE’s special durations define exactly when an effect should expire.
- Midi-QOL’s apply/remove macro symmetry gives a place for undo and cleanup.
- The dnd5e activity lifecycle gives a bounded frontier for item use, rather than letting every rule act at any time.
- Condition handling via a central map, described in `ARCHITECTURE-foundryvtt-dnd5e.md`, keeps mechanical consequences discoverable instead of burying them in per-condition code.

Negative signal worth preserving too:

- if effect timing only makes sense by tracing mutable workflow control flow, the model is too implicit;
- if correctness depends on module flags, hook names, or ignored type errors, the semantic frontier is in the wrong place.

For our repo, the best verification signal is whether a modeled effect can be assigned to a phase and reversed by the inverse phase. If it cannot, it is probably platform noise or a UI concern.

## Import Path For This Repo

Use this stack as a reference for runtime staging only. The spec-first equivalent should be:

- a closed action/effect phase model in Quint;
- explicit source-versus-target evaluation points;
- priority-ordered derived-data contributions;
- reversible effect application with declared expiry;
- reaction windows and interrupt points that are part of the spec, not ambient hooks.

The clean import is "declare now, resolve later, clean up on expiry or removal." The rest of the Foundry stack should collapse away into a small number of spec-visible transitions.

For Midi-QOL specifically:

- mine the reaction, concentration, and late-targeting cases;
- mine the cleanup triggers;
- reject the mutable workflow architecture itself.

## Avoid/Ignore

- Ignore the raw hook surface in `dnd5e.mjs` except as evidence that the platform is highly extensible.
- Ignore arbitrary path mutation as a verification strategy.
- Ignore module-specific flags unless they change runtime behavior we actually need.
- Ignore UI conveniences such as effect editors and helper dialogs.
- Ignore platform compatibility layers, deprecated shims, and integration glue with unrelated modules.
