# Plan: Closed Extension Surface Implementation

Purpose:

- turn the current pairing-derived surface draft into an implementation-oriented plan;
- keep the plan explicitly downstream of corpus research;
- define the smallest sequence that could move from research notes to concrete repo changes later.

Important rule:

- this is a planning artifact only;
- it does not authorize implementation by itself;
- if later enrichment contradicts this plan, the corpus notes win.

Primary inputs:

- [`CANDIDATE_closed_extension_surface_v1.md`](./CANDIDATE_closed_extension_surface_v1.md)
- [`STRESS_TEST_closed_extension_surface_v1_spells.md`](./STRESS_TEST_closed_extension_surface_v1_spells.md)
- [`STRESS_TEST_closed_extension_surface_v1_items_classes.md`](./STRESS_TEST_closed_extension_surface_v1_items_classes.md)
- [`DECISION_activation_vs_triggered_reaction.md`](./DECISION_activation_vs_triggered_reaction.md)
- [`SYNTHESIS_cross_family_pressure_matrix.md`](./SYNTHESIS_cross_family_pressure_matrix.md)

## Current Working Surface

Implementation planning should currently assume these authored payload families:

- `activation`
- `triggered_reaction`
- `anchored_trigger`
- `ongoing_effect`
- `bound_companion`
- `grant`
- `choice_registry`
- `replacement`
- `rewrite`

And these shared envelopes:

- `timing`
- `resolution`
- `reset`
- `cleanup`

## Recommended Implementation Order

### Phase 1: Define the authored closed vocabulary

Create one explicit source-of-truth schema note or type layer for:

- root unit kinds;
- payload family discriminants;
- shared envelope discriminants;
- operation vocabulary keys;
- rewrite target families.

Success criterion:

- a new candidate rule can be described entirely by naming these closed keys;
- unknown keys fail closed.

### Phase 2: Model the lowest-risk families first

Start with the families already best-supported by current enrichment:

1. `activation`
2. `triggered_reaction`
3. `ongoing_effect`
4. `rewrite`

Start with representative units already analyzed:

- `Shield`
- `Counterspell`
- `Bless`
- `Reach`
- `Nick`
- `Loading`
- `Action Surge`
- `Tactical Master`

Success criterion:

- these units can be encoded without escape hatches;
- no generic scripting or arbitrary mutation is introduced.

### Phase 3: Add registries and replacements

After the basic families work, add:

- `choice_registry`
- `replacement`
- `grant`

Representative units:

- `Magic Initiate`
- `Cunning Strike`
- `Channel Divinity`
- `Eldritch Invocation`
- `Memorize Spell`
- `Spell Mastery`

Success criterion:

- option systems remain typed and closed;
- replacement logic is explicit rather than hidden inside grant payloads.

### Phase 4: Add the spell-discovered edge families

Add the shapes identified during stress testing:

- `anchored_trigger`
- `bound_companion`

Representative units:

- `Alarm`
- `Glyph of Warding`
- `Find Familiar`

Success criterion:

- delayed-trigger wards have a clean authored home;
- persistent owned companions do not need to masquerade as ordinary ongoing effects.

### Phase 5: Expand rewrite semantics

Add the rewrite modes now known to be necessary:

- substitution
- suppression
- targeting block
- traversal block
- capacity/limit rewrite

Representative units:

- `Antimagic Field`
- `Use Magic Device`
- `Attunement`
- `Wearing and Wielding Items`

Success criterion:

- rewrite semantics remain typed by target family;
- suppression logic does not become a generic special-case hook bucket.

## Validation Strategy

Each implementation slice should be checked against:

1. the originating research note;
2. the representative corpus examples named above;
3. whether the slice introduced any new open-ended escape hatch.

Questions to ask after each slice:

- did we keep one canonical root identity?
- did we preserve provenance boundaries?
- did any payload require an untyped blob?
- did we accidentally merge `activation` and `triggered_reaction` at the authored surface?
- did we flatten anchored triggers or bound companions back into vague effects?

## Known Open Questions

These remain open even after the current plan:

- whether `bound_companion` should stay its own payload family long-term;
- whether scaling should become its own shared envelope;
- whether some rewrite target families can later collapse into a smaller common operation set;
- whether projected runtime payloads should repeat root identity or only link back to it.

## Minimal Tracer Bullet

If the repo later wants a smallest realistic tracer bullet, it should probably be:

1. define the closed type layer for:
   - `activation`
   - `triggered_reaction`
   - `ongoing_effect`
   - `rewrite`
2. encode:
   - `Shield`
   - `Bless`
   - `Reach`
   - `Nick`
   - `Action Surge`
3. test whether those five examples fit without escape hatches.

Reason:

- together they cover self-initiated activation, triggered reaction, ongoing effect, item rewrite, and class rewrite;
- they are varied enough to break a weak design quickly;
- they avoid jumping immediately into the hardest delayed-trigger and bound-companion cases.
