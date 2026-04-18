# Crystal Ball of Mind Reading

Outcome: `surface_widening`

## Why it does not fit cleanly

The item already fits the existing top-level shape:

- `kind = "magic_item"` exists
- `requiresAttunement = true` exists
- spell-grant mechanics exist via `grant_spell_access`
- fixed item DC exists via `grant_spell_access.dcOverride`

The blocker is narrower. The `Detect Thoughts` cast granted by the orb is not a normal cast of the base spell:

- it targets from the active `Scrying` sensor rather than from the caster / granted spell's own range origin
- it does not require concentration
- it ends when the linked `Scrying` spell ends

The current surface can express only:

- spell id
- access mode
- optional DC override
- optional `self_only` target restriction

That is not enough to encode this item without dropping real mechanics.

## Narrowest honest widenings

### 1. Sensor-relative target restriction on granted spells

Add a `GrantedSpellTargetRestriction` variant for sensor-based targeting, for example:

```ts
{
  kind: "sensor_visible_within_feet",
  feet: 30
}
```

Why this is needed:

> "you can cast Detect Thoughts (save DC 17) targeting creatures you can see within 30 feet of the spell's sensor"

This is a surface-shape gap, not a new top-level family.

### 2. Granted-spell duration/lifecycle override

Add a granted-spell override shape that can express both:

- concentration removed for the granted cast
- early end linked to another named granted spell

Example direction:

```ts
{
  concentrationOverride: "none",
  endsWhenNamedSpellEnds: "scrying"
}
```

Why this is needed:

> "You don't need to concentrate on this Detect Thoughts spell to maintain it during its duration, but it ends if the Scrying spell ends."

This is still a surface widening. The underlying mechanics are existing spell-duration concerns, but `grant_spell_access` cannot currently override them.

## Why I did not author a placeholder unit

I did not write `content/magic_item_crystal_ball_of_mind_reading.dhall` because any valid current encoding would be misleading:

- encoding only `Scrying` would omit a major item mechanic
- encoding `Detect Thoughts` as a normal at-will spell grant would lie about both targeting and duration semantics
- encoding the item as `clean` would hide the actual surface pressure
