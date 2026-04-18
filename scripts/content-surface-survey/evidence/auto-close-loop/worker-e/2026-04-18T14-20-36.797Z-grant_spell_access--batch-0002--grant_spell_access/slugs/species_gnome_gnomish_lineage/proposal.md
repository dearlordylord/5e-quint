## Why this is structural widening

`Gnomish Lineage` is not one fixed `species_trait` payload. It is a required build-time choice between two different lineage packages:

- `Forest Gnome`: spell-access grants.
- `Rock Gnome`: spell-access grants plus a device-creation subsystem.

The current surface for species traits only allows:

- one `passive` payload, or
- one `activation` payload.

It does not allow a top-level lineage-selection variant analogous to spell mode choice, variant collections, or composite species-trait payloads. Encoding only one branch would misrepresent the authored unit.

## Secondary gaps exposed by the branches

### Forest Gnome

The Forest Gnome branch still does not fit cleanly even if branch selection existed.

Needed widening:

- `SpellAccessMode.prepared_with_use_count` or equivalent.

Why:

- `Minor Illusion` fits `grant_spell_access` with `known`.
- `Speak with Animals` does not fit any existing mode.

The surface currently supports:

- `prepared`
- `prepared_once_per_long_rest`
- `known`
- `known_once_per_long_rest`
- `at_will`
- `once_per_long_rest`
- `charge_cast`

It does not support:

- always prepared,
- plus free casts equal to Proficiency Bonus,
- plus normal spell-slot casting.

RAW pressure:

> "You also always have the Speak with Animals spell prepared. You can cast it without a spell slot a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest. You can also use any spell slots you have to cast the spell."

### Rock Gnome

The Rock Gnome branch requires a larger subgraph, not just one missing atom.

Needed widening:

- object/device creation with stored spell effect,
- later bonus-action touch activation by any creature,
- max-3-extant cap,
- 8-hour expiry,
- dismantle-via-Utilize cleanup.

Why the current surface is insufficient:

- `grant_spell_access` can represent `Mending` and `Prestidigitation` known cantrips.
- The clockwork-device mechanic is neither a passive grant nor a single activation phase.
- Existing non-spell payloads have no way to represent creating an object that carries a chosen spell effect for later activation by another creature.
- The v4 taxonomy mentions `create_object`, but the current TS surface and tracer do not expose a corresponding authored shape.

RAW pressure:

> "you can spend 10 minutes casting Prestidigitation to create a Tiny clockwork device"

> "the device produces that effect whenever you or another creature takes a Bonus Action to activate it with a touch"

> "You can have three such devices in existence at a time"

> "each falls apart 8 hours after its creation or when you dismantle it with a touch as a Utilize action"

## Spellcasting ability note

The trait also says:

> "Intelligence, Wisdom, or Charisma is your spellcasting ability for the spells you cast with this trait (choose the ability when you select the lineage)"

For this specific unit, that choice has no surfaced mechanical consequence on the currently granted spells:

- `Minor Illusion`
- `Speak with Animals`
- `Mending`
- `Prestidigitation`

So it is not the blocker. The blockers are the missing lineage-choice structure, the Forest Gnome free-cast mode, and the Rock Gnome device subgraph.
