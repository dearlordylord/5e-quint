# Crystal Ball of Mind Reading

## Verdict

`surface_widening`

The unit fits the existing top-level `magic_item` kind, and its core mechanics are still "this item grants spell access." The surface already covers:

- attunement-gated magic items;
- fixed-DC granted casts via `grant_spell_access.dcOverride`;
- sensor-origin targeting via `GrantedSpellTargetRestriction.visible_target_within_feet` with `origin = "spell_sensor"`.

What does **not** fit is the special handling of the granted `Detect Thoughts` cast.

## Missing surface shape

### 1. Override concentration on a granted spell cast

Current `grant_spell_access` can say:

- which spell is granted;
- how often or with what charges it can be cast;
- whether its DC is overridden;
- whether its targeting is narrowed.

It cannot say that a normally concentration-based spell is maintained without concentration when cast through the item.

Evidence:

> "You don't need to concentrate on this Detect Thoughts spell to maintain it during its duration"

Suggested widening:

- add a `grant_spell_access`-local variant such as `concentrationOverride = "not_required"`.

### 2. Bind one granted spell's lifetime to another granted spell

The item also says the extra `Detect Thoughts` cast terminates when the associated `Scrying` cast ends.

Evidence:

> "but it ends if the Scrying spell ends"

That is not a new v4 atom. It is a missing surface-level lifecycle link on a granted spell cast. Today the surface cannot express "this granted cast is sustained by, and expires with, another granted cast from the same item."

Suggested widening:

- add a `grant_spell_access`-local lifecycle dependency such as `durationBoundToGrantedSpell = "scrying"` or equivalent.

## Why I did not author the unit

I could encode the item dishonestly as a passive/composite magic item with two `grant_spell_access` effects:

- `Scrying` with `dcOverride = 17`;
- `Detect Thoughts` with `dcOverride = 17` and a `spell_sensor` target restriction.

That would silently drop the two mechanics above, which are not flavor text. Because the task explicitly forbids misleading traces, I stopped before authoring `content/magic_item_crystal_ball_of_mind_reading.dhall`.
