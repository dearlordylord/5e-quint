# Widening Proposal: Demiplane

**Unit:** Demiplane (spell, level 8 conjuration)  
**Outcome:** `atom_widening`  
**Blocking gaps:** 3 missing atoms/variants

---

## What fits

- **Family:** `activation` (instant delivery, 1-hour timed duration via `persist → expire`)
- **Attachment:** `object` (the door is placed on a flat surface within 60 ft) or a `location` attachment
- **Door creation:** `create_object` (Medium, manufactured) covers the door object itself
- **Casting time / range / components / duration:** all encode cleanly

## What does not fit

### Gap 1: Traversable portal to an extradimensional space

**Missing atom:** `create_portal` (or equivalent)

The door isn't an inert object — it's a traversable opening to a persistent extradimensional room. Neither existing atom covers this:

- `create_object` — creates an inert object. Has no concept of extradimensional destination, traversal, or connecting two spaces.
- `transport_exile { destination: "demiplane" }` — one-way involuntary exile of a targeted creature. Demiplane's door is a voluntary two-way passage that the caster creates and controls.
- `container_storage` — passive carrying-capacity profile for item-holding magic items (Bag of Holding). Doesn't model creature habitation, traversal, or a room-scale environment.

**What a `create_portal` atom would need to carry:**

```
{
  kind: "create_portal",
  destination: ExileDestination | "new_extradimensional_space",
  portalObject: { size: Size, description: string },
  bidirectional: boolean,
}
```

Or the portal and the room can be separate atoms linked by the spell's design.

### Gap 2: Persistent extradimensional room / demiplane space

**Missing atom:** `create_extradimensional_space`

The demiplane is a 30ft-cube room that:
- Persists between castings (objects left inside survive until the demiplane is revisited)
- Can hold creatures (habitable environment, not just item storage)
- Is caster-owned (connects to the caster's identity across multiple spell instances)

`container_storage` is not the right shape: it models carrying capacity with weight/volume caps for a passive magic item, not a habitable room with cube dimensions and creature-accessible interior.

**What a `create_extradimensional_space` atom would need to carry:**

```
{
  kind: "create_extradimensional_space",
  dimensions: { feet: number } | AreaShapeDescriptor,
  material: string,            // "wood" or "stone" — cast-time choice
  persists: "between_castings" // contents survive spell end
}
```

### Gap 3: Shunt-on-end lifecycle effect

**Missing variant:** A `DurationEndTrigger` (or expiry-phase mechanism) that applies effects to creatures inside the extradimensional space when the duration expires.

SRD text: *"Any creatures inside also remain unless they opt to be shunted through the door as it vanishes, landing with the Prone condition in the unoccupied spaces closest to the door's former space."*

This is an opt-in expiry effect: creatures choosing to exit are force-moved + gain Prone. Existing `DurationEndTrigger` variants are all **early-end predicates** (conditions that end the spell before its full duration). None model a cleanup effect delivered to subjects inside an extradimensional space at the moment of normal expiry.

A new variant or expiry-phase hook would be needed:

```
// on spell expire, for creatures inside who opt to exit:
{ kind: "target_shunted_from_extradimensional_space" }
// paired with force_move + apply_condition prone
```

### Gap 4 (secondary): Dynamic cast-time routing

**Missing variant:** `CastTimeEffectModeChoice` with a dynamic self-referential option

SRD text: *"each time you cast this spell, you can create a new demiplane or connect the shadowy door to a demiplane you created with a previous casting of this spell."*

The `CastTimeEffectModeChoice` surface requires a closed enumerable `options` array. "Connect to a prior casting of this spell" is a runtime reference to a specific past spell instance — its options are not fixed at content-authoring time. This is narrowly inexpressible without a mechanism for referencing caster-specific spell history.

This is the least blocking gap (it's a configuration choice, not a mechanical atom), but it prevents full round-tripping of the spell's routing semantics.

---

## Encoding path once widened

Once the above atoms/variants exist, Demiplane would encode as an `activation` spell:

```
family = "activation"
phases = [
  { kind = "direct"
  , attachment = { kind = "location" or "object" (flat surface within 60 ft) }
  , effects = [
      { kind = "create_portal", ... },    -- the door
      { kind = "create_extradimensional_space", ... }  -- the room
    ]
  , mode = { label = "Routing", options = ["new_demiplane", "connect_to_prior"] }
  }
]
duration = { kind = "timed", value = { unit = "hour", amount = 1 },
             earlyEnd = [] }
-- expiry cleanup: shunt creatures (needs new lifecycle hook)
```
