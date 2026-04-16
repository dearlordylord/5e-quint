# Proposal: Widening for Portable Hole (magic_item)

## Outcome: structural_widening

---

## Primary blocker: MagicItemRecord is missing from UnitRecord

`types.ts` exports:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `MagicItemRecord`. The v4 taxonomy (TAXONOMY_atoms_graph.md §1) lists `magic_item_root` as a source atom — it has been through validation — but the prototype surface has never had a record kind wired up for it. The survey queue contains hundreds of `magic_item` slugs, all of which will hit this same wall.

**No encoding is possible until `MagicItemRecord` is defined and `UnitRecord` is widened to include it.**

---

## Secondary gaps (would apply even after the record type exists)

### 1. Toggle-state item mechanics family

The Portable Hole has two operational modes:

- **Open**: placed on a solid surface, creates extradimensional hole 10 ft deep; creatures inside can exit by climbing out.
- **Closed**: cloth folded up; contents remain in extradimensional space; usable as normal storage.

Each state is reached by a **Magic action** (`activate`). The transition is a reversible toggle. No existing mechanics family handles this:

- `activation` (class feature) models a one-shot activated feature consuming a use-count resource.
- Spell families model casting a spell that persists or resolves.
- Neither models a stateful physical object that alternates between two persistent operational states with no resource other than the Magic action itself.

A proposed `toggle_state` family for magic items would look like:

```
magic_item_mechanics.family = "toggle_state"
  openAction: { cost: "magic_action", effect: ... }
  closeAction: { cost: "magic_action", effect: ... }
  persistentState: "open" | "closed"
```

### 2. Ability-check gate surface variant (escape mechanic)

The escape rule:

> a creature within the hole's extradimensional space can take an action to make a DC 10 Strength (Athletics) check. On a successful check, the creature forces its way out and appears within 5 feet of the Portable Hole.

This is an `ability_check` resolution (v4 atom exists) with a **fixed DC 10** — not a save_gate, not a spell-save-DC-sourced check. The surface has no `ActivationPhase` variant for ability checks, and no `DcSource` variant for a fixed numeric DC independent of the item holder.

Proposed additions:
- `DcSource` variant: `{ kind: "fixed"; value: number }` (DC 10 here)
- Surface mechanism for an **item-internal** ability check triggered by a creature inside the item's extradimensional space

### 3. Item-interaction destruction trigger (Bag of Holding hazard)

> Placing a Portable Hole inside an extradimensional space created by a Bag of Holding, Handy Haversack, or similar item instantly destroys both items and opens a gate to the Astral Plane. Any creature within 10 feet of the gate and not behind Total Cover is sucked through it and deposited in a random location on the Astral Plane. The gate then closes.

This is a **conditional item-on-item interaction** that triggers when a specific kind of object is placed inside another. The result is:
- Both items destroyed (no v4 atom for item destruction)
- `transport_exile` for nearby creatures (v4 atom exists)
- The gate is one-way and closes immediately (lifecycle: `expire` after single use)

Missing surface concepts:
- Item-interaction trigger (placed-inside-extradimensional-item condition)
- Item destruction effect atom (currently absent from v4 effect section)
- The `transport_exile` atom could cover the creature movement if the trigger mechanism existed

This rider is lower priority than the toggle-state family but would be required for a complete encoding.

---

## Proposed widening summary

| # | Kind | Name | Blocking? |
|---|------|------|-----------|
| 1 | `new_subgraph` | `MagicItemRecord` + `magic_item` kind in `UnitRecord` | **Yes** |
| 2 | `new_subgraph` | `toggle_state` mechanics family for magic items | Yes (after #1) |
| 3 | `new_variant` | `DcSource: { kind: "fixed"; value: number }` | No (surface widening) |
| 4 | `new_atom` | Item destruction effect | No (atom widening) |
| 5 | `new_subgraph` | Item-on-item interaction trigger | No (structural, lower priority) |

The smallest viable widening to attempt encoding again: add `MagicItemRecord` to types.ts and define a `toggle_state` mechanics family. The escape check and destruction interaction can be deferred or partially omitted with a note.
