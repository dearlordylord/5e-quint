# Proposal: Move Earth — atom_widening

## Unit

- **Name:** Move Earth
- **Kind:** spell / level 6 transmutation
- **Provenance:** SRD 5.2.1
- **Outcome:** `atom_widening`

## Why the unit does not fit

Move Earth is a concentration spell (up to 2 hours) that reshapes physical terrain —
dirt, sand, or clay — within a chosen area. Structurally it belongs to the
`ongoing_effect` family (concentration attachment, timed operation on an area).
However, the `OngoingOperation` type only supports two variants:

- `roll_modifier` — adds a dice delta to attack rolls or saving throws.
- `damage_on_hit` — grants a damage rider when the caster hits the attachment.

Terrain manipulation is neither. No honest coercion is possible.

The v4 atom inventory was also checked. The closest candidate, `create_object`,
is semantically wrong: Move Earth does not conjure new objects into existence. It
deforms *existing* terrain geometry in place. There is no `alter_terrain` or
`reshape_terrain` atom in v4.

A secondary gap is the **10-minute periodic re-targeting** mechanic: while
concentrating, the caster may choose a new 40-foot area at the end of every 10
minutes. No existing window atom (turn_start_window, rest_window,
post_action_window, duration_window, etc.) maps to "end of every N minutes of
concentration." This would require a new `periodic_concentration_window` or a
`duration_interval` mechanism.

## Required widenings

### 1. New v4 atom: `alter_terrain`

**Category:** effect

**Semantics:** Mutate the geometry of terrain in a bounded area in place. The
target terrain material (dirt, sand, clay) is reshaped — elevation raised/lowered,
trenches dug, walls erected/flattened, pillars formed — without conjuring new
material from nothing.

**Distinguishes from `create_object`:** `create_object` conjures a new persistent
entity (a wall of force, a pit from Bones of the Earth, etc.) into existence.
`alter_terrain` modifies the geometry of already-present terrain; the material
remains the same, only its shape changes.

**Evidence:**
> "You can reshape dirt, sand, or clay in the area in any manner you choose for
> the duration. You can raise or lower the area's elevation, create or fill in a
> trench, erect or flatten a wall, or form a pillar."

**Future pressure candidates:** Transmute Rock, Bones of the Earth (partial),
Mold Earth cantrip (if added), any spell that reshapes existing surfaces rather
than conjuring new ones.

---

### 2. New `OngoingOperation` variant: `terrain_reshape`

**Surface change:** Add a third variant to the `OngoingOperation` union in
`types.ts`:

```typescript
export type TerrainReshapeOperation = {
  readonly kind: "terrain_reshape";
  readonly material: "dirt_sand_clay" | "stone" | "any";  // closed enum of SRD-named materials
  readonly maxAreaSideFeet: number;
  readonly maxDeltaFeet: number;          // half the largest dimension
  readonly completionMinutes: number;     // how long each reshape takes
};
```

This variant's tracer branch would emit an `alter_terrain` effect node attached
to the area attachment, gated behind a `persist` lifecycle node (changes take
10 minutes and are permanent if concentration drops after completion).

---

### 3. New window mechanism: `periodic_concentration_window` (or `duration_interval`)

**Surface change:** Add a new `WindowAtom` variant (or a modifier on `Duration`)
that fires every N minutes/rounds while concentration holds.

```typescript
// Proposed duration addition or new window atom
export type PeriodicConcentrationWindow = {
  readonly kind: "periodic_concentration_window";
  readonly intervalMinutes: number;     // e.g., 10
  readonly effect: "retarget_attachment";  // closed enum
};
```

Alternatively this could be modeled as an `anchor`-style re-targeting event on
the concentration lifecycle node.

**Evidence:**
> "At the end of every 10 minutes you spend Concentrating on the spell, you can
> choose a new area of terrain to affect within range."

---

## Encoding path once widenings land

Once the three gaps above are filled:

1. `family: "ongoing_effect"` — concentration attachment on an area.
2. `attachment.kind: "area"` with shape `{ kind: "cube", maxSideFeet: 40 }` (or
   a square variant — the current area shape only models spheres, another potential
   surface widening).
3. `operation.kind: "terrain_reshape"` with the new operation fields.
4. `duration.kind: "concentration"` plus a `periodicWindow` sub-field for the
   10-minute re-targeting.

The attachment shape (`square` / `cube side`) is a minor additional surface gap:
Move Earth targets "an area no larger than 40 feet on a side" — a square/cube,
not a sphere. The current `area` attachment shape only models spheres
(`{ kind: "sphere"; radiusFeet }`) — so a `square` or `side` shape variant would
also be needed.
