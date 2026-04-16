# Proposal: Bead of Force — structural_widening

## Outcome

`structural_widening` — the `magic_item` kind does not exist in `UnitRecord` or the tracer.

No `.dhall`, `.json`, or `.trace.md` were authored.

---

## Primary gap: `MagicItemRecord` + `magic_item` tracer branch

`types.ts` defines:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `MagicItemRecord`. The tracer's `traceUnit()` exhaustive switch only handles
`"spell"`, `"class_feature"`, and `"mastery"` — it would throw on `"magic_item"`. The v4
taxonomy lists `magic_item_root` as a source atom, but the surface type and tracer branch
that would consume it do not exist yet.

**Required additions at this layer:**
- `MagicItemRecord` type in `types.ts` (metadata + `kind: "magic_item"` + `mechanics`)
- A `MagicItemMechanics` family (or families)
- A `traceMagicItemUnit()` branch in `tracer.ts`

---

## Secondary gaps (all block honest encoding even after the structural fix)

### 1. Consumable resource (`charge`)

The bead is destroyed on activation — a single-charge consumable. The v4 taxonomy lists
`charge` as a resource atom, but `types.ts` has no `ChargeResource` type and no item-level
resource grammar. The class-feature `UseCountResource` is conceptually close but is
class-feature–scoped; magic items need a parallel `charge`-based resource that maps to the
item being consumed or expended.

> *"The bead explodes in a 10-foot-radius Sphere on impact and is destroyed."*

### 2. Barrier / containment effect (`block_travel`, `block_targeting`)

The item creates a 1-minute impenetrable sphere that prevents attacks, spells, and egress.
v4 lists `block_travel` and `block_targeting` as effect atoms, but neither appears in the
current `Effect` union in `types.ts`. A barrier area that persists for a duration and blocks
both movement out and effects through its wall is not representable with the current surface.

> *"Only breathable air can pass through the sphere's wall. No attack or other effect can pass through."*

### 3. Creature containment (non-condition trap state)

Creatures that fail the save and are fully within the area are trapped. This is not a named
SRD condition (`Condition` in `types.ts` is currently `"prone"` only) and not a standard
`apply_condition` result. It is a movement-blocking state tied to the barrier object's
spatial boundary — closer to a positional constraint than a creature condition.

> *"Any creature that failed the save and is completely within the area is trapped inside this sphere."*

### 4. Force-push effect (`force_move`)

Creatures that succeed the save or are partially inside are pushed outward until fully
outside the sphere. v4 lists `force_move` as an effect atom, but it is absent from the
current `Effect` union in `types.ts`.

> *"Creatures that succeeded on the save or are partially within the area are pushed away from the center of the sphere until they are no longer inside it."*

### 5. Mobile area attachment

The sphere can be physically moved by an enclosed creature using a Utilize action. The
current `Attachment` `area` shape assumes a static origin; there is no grammar for an area
that translates as a result of occupant actions. This is a new `surface_widening` on
attachment mobility.

> *"An enclosed creature can take a Utilize action to push against the sphere's wall, moving the sphere up to half the creature's Speed."*

---

## Recommended widening order

1. **Structural**: Add `MagicItemRecord`, `MagicItemMechanics` family, and tracer branch.
2. **Surface**: Add `ChargeResource` (consumable item resource).
3. **Effect surface**: Add `block_travel` and `block_targeting` to the `Effect` union.
4. **Effect surface**: Add `force_move` to the `Effect` union.
5. **Surface or atom**: Model creature containment — either as a new `Condition` variant or
   as a positional-constraint effect distinct from named conditions.
6. **Attachment surface**: Consider mobility annotation on `area` attachments, or a new
   `mobile_area` attachment kind.

Items 3–6 are genuinely independent of each other and could be widened in any order once
the structural layer (1) exists.
