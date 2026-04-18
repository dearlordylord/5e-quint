## Crystal Ball of Mind Reading

Outcome: `surface_widening`

The unit fits the existing `magic_item` kind and a passive/composite magic-item family in broad shape:

- grant `Scrying` from the item with fixed DC 17
- grant `Detect Thoughts` from the item with fixed DC 17
- restrict `Detect Thoughts` targeting to visible creatures within 30 feet of the spell sensor

That last part already has surface support via `GrantedSpellTargetRestriction.visible_target_within_feet` plus `origin: "spell_sensor"`.

The blocker is the linked lifecycle override on the granted `Detect Thoughts` cast:

> "You don't need to concentrate on this Detect Thoughts spell to maintain it during its duration, but it ends if the Scrying spell ends."

The current surface has no honest way to say all of the following about casts made through a specific `grant_spell_access` path:

- concentration is waived for this granted cast
- the granted spell still has its normal duration
- the granted spell's lifecycle is subordinated to another ongoing spell (`Scrying`) from the same item

Authoring this today as a plain `grant_spell_access` would be false in two ways:

- it would incorrectly require concentration on `Detect Thoughts`
- it would incorrectly allow `Detect Thoughts` to persist independently of `Scrying`

Suggested widening:

- `new_variant`: add a granted-spell lifecycle override on `EffectAtom.grant_spell_access`

Sketch:

```ts
type GrantedSpellLifecycleOverride = {
  readonly concentration?: "waived";
  readonly endsWhenHostSpellEnds?: string; // spellId, here "scrying"
};
```

or equivalent closed wording tied to an existing granted spell on the same item.

This is a surface widening, not an atom widening:

- remote targeting from a spell sensor already exists in the surface
- concentration / expire / persist already exist in the taxonomy/tracer vocabulary
- what is missing is a way for `grant_spell_access` to override lifecycle rules for casts made through that grant
