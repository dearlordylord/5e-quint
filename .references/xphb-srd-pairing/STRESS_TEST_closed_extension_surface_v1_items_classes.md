# Stress Test: Closed Extension Surface v1 Against Item And Class-Feature Shapes

Purpose:

- test [`CANDIDATE_closed_extension_surface_v1.md`](./CANDIDATE_closed_extension_surface_v1.md) against item-heavy and class-feature-heavy shapes;
- check whether the candidate still holds once rewrite-heavy and registry-heavy material is emphasized;
- sharpen the `activation` vs `triggered_reaction` decision with non-spell evidence.

Primary inputs:

- [`CANDIDATE_closed_extension_surface_v1.md`](./CANDIDATE_closed_extension_surface_v1.md)
- [`ENRICHED_equipment_magic_items_pilot.md`](./ENRICHED_equipment_magic_items_pilot.md)
- [`ENRICHED_classes_features_pilot.md`](./ENRICHED_classes_features_pilot.md)

Representative units:

- `Loading`
- `Nick`
- `Attunement`
- `Wearing and Wielding Items`
- `Fighter > Action Surge`
- `Fighter > Tactical Master`
- `Cleric > Channel Divinity > Divine Spark`
- `Warlock > Eldritch Invocation`
- `Rogue > Thief > Use Magic Device`

## Short Answer

`v1` still holds on the item/class-feature side.

The added pressure here does not force new top-level execution models. It mostly confirms:

- rewrites must stay typed and explicit;
- registries and replacements are genuinely first-class;
- `activation` and `triggered_reaction` should stay separate.

## Fit Check

## Loading

- Shape:
  - legality and throughput cap on weapon firing;
  - keyed to firing with an action, bonus action, or reaction;
  - no persistent effect ownership.
- `v1` fit:
  - root: `item-property`
  - payload family: `rewrite`
  - target family: `attack`
  - operations: legality guard / throughput cap
- Result:
  - `fits v1`
  - confirms some item properties are pure rewrite surfaces, not activations.

## Nick

- Shape:
  - rewrites an already-existing Light extra-attack window;
  - moves attack timing from later bonus action to the Attack action;
  - preserves bonus-action capacity;
  - once-per-turn fence.
- `v1` fit:
  - root: `item-mastery`
  - payload family: `rewrite`
  - target families: `attack`, `resource`
  - timing consequence without becoming a distinct activation itself
- Result:
  - `fits v1`
  - strong evidence that timing-rewrite and activation are not the same thing.

## Attunement

- Shape:
  - item-local lifecycle procedure;
  - focused short-rest start condition;
  - capability unlock on completion;
  - multiple explicit end conditions.
- `v1` fit:
  - root: `magic-item-procedure`
  - payload family: `ongoing_effect` plus `rewrite`
  - cleanup: explicit attunement-end conditions
- Result:
  - `fits v1`
  - confirms cleanup and lifecycle procedures belong inside the closed surface, not in ambient item flags.

## Wearing and Wielding Items

- Shape:
  - occupancy and pairing constraints;
  - benefit gating based on intended wear/wield state.
- `v1` fit:
  - root: `magic-item-procedure`
  - payload family: `rewrite`
  - target family: `item`
  - operations: legality/eligibility gating
- Result:
  - `fits v1`
  - confirms item-local legality is distinct from activation.

## Fighter > Action Surge

- Shape:
  - player-initiated feature use;
  - grants an additional action with an explicit `Magic` exclusion;
  - short/long-rest reset and later per-turn fence.
- `v1` fit:
  - root: `class-feature`
  - payload family: `activation`
  - timing: self-initiated on turn
  - operations: resource spend, action-capacity expansion
- Result:
  - `fits v1`
  - good anchor for why `activation` should remain a first-class family.

## Fighter > Tactical Master

- Shape:
  - passive rewrite of mastery behavior on qualifying attacks;
  - no resource spend;
  - substitutes among typed mastery payloads per attack.
- `v1` fit:
  - root: `class-feature`
  - payload family: `rewrite`
  - target family: `mastery`
- Result:
  - `fits v1`
  - confirms cross-family rewrite remains essential.

## Cleric > Channel Divinity > Divine Spark

- Shape:
  - chosen option from a shared registry;
  - user-initiated Magic action;
  - consumes shared pool;
  - dual-mode heal-or-harm resolution.
- `v1` fit:
  - root: `class-feature-option`
  - payload families: `choice_registry` plus `activation`
  - operations: resource spend, healing, damage
- Result:
  - `fits v1`
  - confirms registry and activation often compose, but should remain distinguishable.

## Warlock > Eldritch Invocation

- Shape:
  - persistent typed option registry;
  - prerequisite filters;
  - replacement rules;
  - repeatable-with-different-choice constraints;
  - options expand into other payload families.
- `v1` fit:
  - root: `class-feature-system`
  - payload families: `choice_registry` plus `replacement`
- Result:
  - `fits v1`
  - very strong support that registries are a first-class family rather than just metadata on grants.

## Rogue > Thief > Use Magic Device

- Shape:
  - passive rewrite of attunement cap;
  - chance not to expend charges;
  - spell-scroll special-use model.
- `v1` fit:
  - root: `subclass-feature`
  - payload family: `rewrite`
  - target families: `item`, `spell`
- Result:
  - `fits v1`
  - confirms rewrite target-family visibility is still necessary.

## What This Adds To The Decision Surface

The item/class-feature side pushes three clear conclusions:

### 1. `activation` and `triggered_reaction` should stay separate

Why:

- `Action Surge` and `Divine Spark` are self-initiated uses selected by the acting creature on its turn.
- `Shield` and `Counterspell` are availability windows created by external triggers.
- `Nick`, `Loading`, and `Tactical Master` show that many timing-affecting rules are not activations at all, but rewrites on other payloads.

If `activation` and `triggered_reaction` collapse too early, the model loses:

- trigger ownership;
- eligibility-window structure;
- the distinction between "I choose to use this now" and "this becomes available because a trigger occurred."

### 2. Registries are not optional ornament

`Channel Divinity`, `Cunning Strike`, and `Eldritch Invocation` all show:

- typed menus;
- constrained selection;
- replacement and repeatability rules;
- options that fan out into other payload families.

That is real runtime-shaping pressure, not editorial grouping.

### 3. Rewrite is the main cross-family glue

Items and class features repeatedly modify:

- attack timing;
- mastery substitution;
- attunement limits;
- item charge spending;
- spell-use constraints.

So `rewrite` remains a necessary first-class family even after the spell stress test added anchored triggers and bound companions.

## Current Working Conclusion

After the item/class-feature stress test:

- `v1` still looks structurally right;
- `activation` and `triggered_reaction` should remain separate;
- `rewrite`, `choice_registry`, and `replacement` are fully justified as first-class families;
- no new top-level family is forced here beyond what the spell stress test already added.
