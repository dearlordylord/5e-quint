## Verdict

`Crystal Ball of Mind Reading` fits the existing `magic_item` top-level kind, but it does not fit the current spell-access surface honestly. The nearest family is a magic item with passive `grant_spell_access` effects, but two mechanics are missing from that surface:

1. The item-granted `Detect Thoughts` cast is anchored to the active `Scrying` spell sensor.
2. That `Detect Thoughts` cast has concentration overridden and its duration is coupled to the parent `Scrying` spell ending.

Because those are missing variants on existing surfaces, this is `surface_widening`, not `structural_widening` or `atom_widening`.

## Existing Fit

- `MagicItemRecord` exists.
- `PassiveMechanics` can honestly carry spell grants while the item is being used.
- `grant_spell_access` already supports:
  - `dcOverride` for the fixed DC 17.
  - `targetRestriction = { kind = "visible_target_within_feet", feet = 30, origin = "spell_sensor" }`, which matches the remote targeting clause.

## Missing Surface Shapes

### 1. Spell-access lifecycle coupling to another granted spell

The item says:

> "You can cast Detect Thoughts (save DC 17) targeting creatures you can see within 30 feet of the spell's sensor."

and

> "You don't need to concentrate on this Detect Thoughts spell to maintain it during its duration, but it ends if the Scrying spell ends."

The current `grant_spell_access` shape can grant the spell and restrict its target origin, but it cannot say that this cast is only valid in the context of an active `Scrying` sensor, nor that the granted spell instance ends when the linked `Scrying` instance ends.

Suggested widening:

- Add a new `grant_spell_access`-adjacent variant for linked remote-origin casting requirements, or
- Add fields on `grant_spell_access` such as:
  - `requiresLinkedSpell = { spellId = "scrying", provides = "spell_sensor" }`
  - `endsWhenLinkedSpellEnds = true`

### 2. Spell-access concentration override

The item says:

> "You don't need to concentrate on this Detect Thoughts spell to maintain it during its duration"

The current surface has no way to override a granted spell's printed concentration requirement for casts made through a specific magic item grant.

Suggested widening:

- Add a per-grant override on `grant_spell_access`, for example:
  - `durationOverride = { concentrationRemoved = true }`
  - or a narrower `ignoreConcentration = true`

## Why Not Author a Placeholder

Authoring this as a plain passive item with two `grant_spell_access` entries would be misleading:

- it would imply `Detect Thoughts` can be cast independently of `Scrying`;
- it would lose the rule that the target must be near the `Scrying` sensor specifically in the context of that linked spell instance;
- it would incorrectly preserve normal concentration behavior or incorrectly omit the early-end coupling.

That would produce a cleaner trace at the cost of a false rule model, which this task explicitly forbids.
