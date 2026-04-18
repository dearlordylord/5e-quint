# Proposal: Stone Shape — atom_widening

## Unit

**Stone Shape** · Level 4 Transmutation · SRD 5.2.1 · `Spells/Descriptions-Q-Z#Stone Shape`

Instantaneous, Touch range, Action cast. Touch a stone object (≤ Medium, or ≤ 5 ft section) and reshape it into any form the caster chooses.

---

## Gap 1 — `ObjectMaterial` missing `"stone"` (surface_widening)

`ObjectFilter.material` is typed as `ObjectMaterial = "metal" | "flammable"`.

Stone Shape's target predicate is "a stone object or section of stone." There is no way to express this filter with the current closed enum.

**Proposed fix:** add `"stone"` to `OBJECT_MATERIALS` and `ObjectMaterial`.

---

## Gap 2 — No atom for open-ended object reshaping (atom_widening, primary)

Stone Shape's effect is "reshape this object into any form you like." The only existing atom with adjacent semantics is:

- **`alter_item_kind { newKind: string }`** — changes an item to a *specific pre-authored destination form* (Folding Boat: box → rowboat → keelboat). The `newKind` field is a fixed authored string, not a player-defined open value.
- **`create_object`** — creates new matter from nothing; Stone Shape reshapes *existing* stone.

Neither is honest. Stone Shape's destination is entirely open-ended (weapon, statue, coffer, passage, sealed door frame, etc.) and is described by the player at cast time. A closed authored `newKind` string cannot capture this.

### Proposed atom: `reshape_object`

```typescript
| {
    readonly kind: "reshape_object";
    // Optional mechanical constraints from RAW text; omitted = unconstrained
    readonly maxHinges?: number;       // "up to two hinges"
    readonly finerDetailPossible?: false; // "finer mechanical detail isn't possible"
  }
```

**Semantics:** The object targeted by the host `Attachment.object` is transformed into a new physical form chosen by the caster at cast time. The new form is player/DM-described narrative; no closed option set is representable. Mechanical consequences of the new form (passage through a wall, sealed door, etc.) are DM-adjudicated from the physical change.

**Relationship to `alter_item_kind`:** `alter_item_kind` carries a fixed authored `newKind` string — it models items with a known finite set of forms (Folding Boat, glamoured armor). `reshape_object` models open-ended material transformation where the destination form is free at cast time. These are distinct semantic families.

**Relationship to `create_object`:** `create_object` generates new matter (Fabricate, Instant Fortress, Wall of Stone panels). `reshape_object` transforms existing matter in-place with no net mass change.

---

## Encoding plan (once widenings land)

```
family: activation
phases:
  - kind: direct
    attachment:
      kind: object
      count: 1
      filter:
        material: stone          # Gap 1
        maxSize: medium
    effects:
      - kind: reshape_object     # Gap 2
        maxHinges: 2
        finerDetailPossible: false
```

Level, school, castingTime, range, components, duration all encode cleanly with existing surface types.
