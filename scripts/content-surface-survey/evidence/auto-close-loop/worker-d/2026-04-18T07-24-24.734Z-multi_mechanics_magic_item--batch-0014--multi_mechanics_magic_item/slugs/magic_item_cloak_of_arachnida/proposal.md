# Cloak of Arachnida

## Verdict

`surface_widening`

The item fits the existing `magic_item` kind and `composite` mechanics family in broad shape:

- passive grant: Poison Resistance
- passive grant: Climb Speed equal to walk Speed
- activated spell use: `Web`, once used until next dawn

I stopped before authoring because one rider cannot be expressed honestly with the current surface.

## Forced widening

### Relative granted-spell area override

Current `grant_spell_access.areaOverride` only accepts a concrete `AreaShapeSpec`.

That is sufficient for items that replace a spell's area with a fixed authored shape, but not for this item's text:

> "The web created by the spell fills twice its normal area."

This is a modification **relative to the granted spell's own printed area**, not a fresh fixed area descriptor. Encoding ordinary `Web` would be false, and encoding a guessed fixed replacement would also be false.

Suggested widening:

- add a relative override variant under granted-spell area overrides, e.g. a multiplier/reference form tied to the granted spell's native area

Possible direction:

```ts
type GrantedSpellAreaOverride =
  | AreaShapeSpec
  | {
      readonly kind: "relative_to_granted_spell";
      readonly operation: "multiply_area";
      readonly factor: number;
    };
```

The exact naming can change; the important point is that the override must be able to say "twice the spell's normal area" without pretending the replacement is a new fixed cube/cone/etc.

## Secondary omission

The `Spider Walk` text is also not modeled cleanly:

> "You can't be caught in webs of any sort and can move through webs as if they were Difficult Terrain."

In this prototype, web-terrain / web-geometry handling is already caller-owned in the existing `Web` spell encoding, so this rider would remain omitted even if the item were otherwise authorable. I am not classifying that as the primary widening because the doubled-area `Web` cast already blocks an honest authored unit on its own.
