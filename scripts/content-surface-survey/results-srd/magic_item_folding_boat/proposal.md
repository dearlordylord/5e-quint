# Proposal: magic_item_folding_boat

## Outcome: `surface_widening`

The core transformation mechanic encodes cleanly. One secondary mechanic requires a new `ItemDestructionPolicy` variant.

---

## Encoding summary

The Folding Boat has three command words (each a Magic action) that switch the item between three forms: box, rowboat, and keelboat. The `alter_item_kind` atom — already in `types.ts` with this item named in its comment — covers each transformation. The three command words are modeled as three separate `ActivatedAbilityMechanics` parts inside a `CompositeMagicItemMechanics`, each with:

- `activationCost = { kind: "standard_action", action: "magic" }`
- `resource = { kind: "use_count", cap: { kind: "unlimited" } }`
- `resetCadence = { kind: "never" }` (command words have no resource cost)
- A single `direct` phase applying `alter_item_kind` to the relevant new form.

TypeCheck and tracer pass with no errors.

---

## Surface widening required

### `ItemDestructionPolicy.zero_hp_vessel`

**Evidence:** "If either vessel is reduced to 0 Hit Points, the Folding Boat is destroyed."

**Problem:** `ItemDestructionPolicy` currently has three variants:
- `none` — item is never destroyed by use
- `last_charge_roll` — probabilistic destruction when the last charge is spent
- `permanent_on_empty` — deterministic destruction when the resource pool empties

None of these applies here. The Folding Boat is destroyed by **incoming damage to the vessel form**, not by charge exhaustion. The trigger is combat damage (HP depletion), not resource depletion.

**Proposed variant:**
```typescript
| { readonly kind: "zero_hp_vessel" }
```

This would indicate that the item is destroyed when the currently-active vessel form (rowboat or keelboat) is reduced to 0 HP. The tracer would emit an `item_destruction` lifecycle node triggered by HP depletion of the spawned/transformed vessel.

**Placeholder used:** `{ kind: "none" }` — semantically incorrect but required for the field. Noted here.

---

## Omissions (DM-agenda)

### "No creatures aboard" precondition (third command word)

**Evidence:** "The Folding Boat folds back into a box if no creatures are aboard."

The third command word (box activation) has a conditional: it only works when the vessel is unoccupied. There is no `EquipmentPredicate` variant or `ActivatedAbilityHeader.condition` for occupant checks. This is DM-resolved at the table (the DM enforces that the command word has no effect if creatures are aboard). Omitted as DM-agenda.

### Cargo handling

**Evidence:** "Any objects in the vessel that can't fit inside the box remain outside the box as it folds. Any objects in the vessel that can fit inside the box do so."

This is a narrative/DM-adjudicated rule about where objects end up when the box closes. No mechanical atom exists for item placement within containers during form transitions. Omitted as DM-agenda.

### Weight change

**Evidence:** "When the box becomes a vessel, its weight becomes that of a normal vessel its size."

The item's carry weight changes based on form. No atom models item-weight-as-state. Omitted as DM-agenda (DM tracks the current form's weight).
