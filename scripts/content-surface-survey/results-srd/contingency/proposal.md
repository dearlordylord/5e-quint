# Proposal: Contingency widening

## Classification: `structural_widening`

Contingency (L6 Abjuration) is closest to the `anchored_trigger` spell family but cannot be honestly encoded under the current surface. Three structural gaps and one atom gap block an honest encoding.

---

## Gap 1: `AnchorTarget` missing `self` variant

**Current:** `AnchorTarget` = `{ kind: "location"; description: "door_or_window" } | { kind: "area"; shape: ... }`

**Problem:** Contingency anchors to the caster's person, not a location in space or an area. The trigger fires on events that involve or are evaluated relative to the caster directly.

**Proposed addition:**
```typescript
| { readonly kind: "self" }
```

**SRD evidence:** "the contingent spell takes effect only on you" / "Contingency ends on you if its material component is ever not on your person"

---

## Gap 2: `AnchoredEvent` missing an open player-described trigger

**Current:** `AnchoredEvent` = `{ kind: "physical_contact" } | { kind: "enters_area" }`

**Problem:** Contingency's trigger is an arbitrary natural-language condition described by the player at cast time. This is fundamentally different from Alarm's fixed event vocabulary. It cannot be expressed as a closed enum variant without making the field DM-adjudicated freeform text.

**Options:**
1. Add `{ kind: "player_described"; description: string }` — surface records the authoring intent; runtime evaluation is DM/table-owned. This is the honest representation: the trigger condition is real but its detection is caller-resolved.
2. Classify the trigger detection as `dm_agenda` and model only the storage and release structure.

Option 1 is recommended. The mechanics of arming and releasing are deterministic; only the trigger-condition evaluation is DM-resolved.

**SRD evidence:** "You describe that trigger when you cast the two spells. For example, a Contingency cast with Water Breathing might stipulate that Water Breathing comes into effect when you are engulfed in water or a similar liquid."

---

## Gap 3: `stored_spell` attachment atom missing from types.ts

**Current:** The v4 taxonomy (TAXONOMY_atoms_graph.md) lists `stored_spell` as an attachment atom. It is absent from `types.ts`.

**Problem:** The output of Contingency's anchored trigger is not an `AnchoredSignal` (audible/mental notification) but a full stored arbitrary spell that fires with its own effect chain. The stored spell is chosen at cast time from any qualifying spell (level ≤5, action cast time, can target self).

**Proposed addition to `types.ts`:**

The `anchored_trigger` mechanics family would need a `storedSpell` field alongside or replacing `signals`:

```typescript
export type AnchoredStoredSpell = {
  readonly kind: "stored_spell";
  // The spell stored at cast time (player-chosen, subject to qualifications)
  readonly qualifications: {
    readonly maxLevel: SpellLevel;
    readonly castingTimeKind: "action";
    readonly mustTargetSelf: true;
  };
  // At fire time, the stored spell resolves using its own mechanics.
  // The stored spell ID is resolved at runtime (player choice at cast time),
  // not authored statically.
  readonly selectionMode: "player_chosen_at_cast";
};
```

This is the `stored_spell` v4 attachment atom realized in the surface.

**SRD evidence:** "Choose a spell of level 5 or lower that you can cast, that has a casting time of an action, and that can target you. You cast that spell—called the contingent spell—as part of casting Contingency..."

---

## Gap 4: Dual spell-slot expenditure has no surface representation

**Current:** A spell's header models a single slot expenditure (`level` field). No mechanism exists for expressing that casting a spell also consumes a second variable-level slot from the player's resources.

**Problem:** Contingency requires two simultaneous slot expenditures: the Contingency L6 slot AND the contingent spell's slot (level 1–5, player-chosen). This is not upcast scaling — it is a second independent slot.

**Proposed addition:**

```typescript
type SpellMechanicsHeader = {
  // ... existing fields ...
  readonly additionalSlotCost?: {
    readonly maxLevel: SpellLevel;
    readonly description: string;  // e.g. "contingent spell slot"
  };
};
```

**SRD evidence:** "You cast that spell—called the contingent spell—as part of casting Contingency, expending spell slots for both"

---

## Gap 5: `DurationEndTrigger` missing material-component-not-on-person

**Current:** `DurationEndTrigger` includes `caster_recasts_spell` (covers the "casting again ends prior Contingency" clause) but has no variant for "material component leaves caster's person."

**Proposed addition:**
```typescript
| { readonly kind: "material_component_leaves_person" }
```

This is narrow but distinct from all existing end triggers.

**SRD evidence:** "Contingency ends on you if its material component is ever not on your person."

---

## Summary of required widenings

| # | Kind | Name | Blocking? |
|---|------|------|-----------|
| 1 | `new_variant` | `AnchorTarget.self` | Yes — anchor target has no self variant |
| 2 | `new_variant` | `AnchoredEvent.player_described_condition` | Yes — trigger vocabulary is closed to two event kinds |
| 3 | `new_atom` | `stored_spell` attachment | Yes — the output of the trigger is a stored spell, not a signal |
| 4 | `new_variant` | dual slot cost on spell header | Yes — two simultaneous slots have no representation |
| 5 | `new_variant` | `DurationEndTrigger.material_component_leaves_person` | No — the recast-ends-prior clause is already covered by `caster_recasts_spell`; this gap only affects the material-component clause |

Gaps 1–4 are all blocking. No honest encoding is possible without resolving them.

## Recommended path forward

The `anchored_trigger` family is the right conceptual home for Contingency. The required widenings are all coherent extensions of the existing shape:

- Add `self` to `AnchorTarget`
- Add `player_described_condition` to `AnchoredEvent` (with DM-tag on detection)
- Realize `stored_spell` from the v4 taxonomy into `types.ts`
- Add `additionalSlotCost` to `SpellMechanicsHeader`

These enable honest encoding of Contingency and future spells in the same family (Glyph of Warding, which has similar store-and-release structure with a more constrained trigger vocabulary).
