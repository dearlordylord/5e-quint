# Proposal: Censer of Controlling Air Elementals

**Outcome:** `structural_widening`  
**Confidence:** high

---

## Why encoding was blocked

The unit cannot be encoded at all: `UnitRecord` is `SpellRecord | ClassFeatureRecord | MasteryRecord`. There is no `magic_item` kind. The v4 taxonomy lists `magic_item_root` as a source atom, but the surface type system (`types.ts`) has no corresponding record type or mechanics family.

Even if a `MagicItemRecord` shell were added, four additional gaps block honest encoding:

---

## Gap 1 — Missing record kind: `magic_item`

**Classification:** `structural_widening`

`UnitRecord` must gain a `MagicItemRecord` variant with a `kind: "magic_item"` discriminant before any magic item can typecheck. The taxonomy already names `magic_item_root` (§1 Source Atoms), so the atom inventory is ready; the surface type and tracer switch need adding.

---

## Gap 2 — Missing mechanics family: summoning / create_companion

**Classification:** `structural_widening`

The core mechanic is conjuring a named creature type (Air Elemental) that:
- appears in an unoccupied space near the item,
- understands the wielder's languages,
- obeys the wielder's commands,
- acts on its own initiative count (immediately after the wielder).

The v4 taxonomy has `create_companion` in §9 Effect Atoms, but no existing mechanics family emits it. A new `summoning` (or `conjure_companion`) mechanics family is needed, covering at minimum:
- the creature type summoned,
- the companion's behavioural contract (obeys commands),
- the companion's initiative slot (relative to wielder's count),
- the multi-condition expiry: timed (1 hour) OR death OR wielder-dismiss.

This pattern recurs across many SRD magic items (Bowl of Commanding Water Elementals, Brazier of Commanding Fire Elementals, Stone of Controlling Earth Elementals, Efreeti Bottle, etc.) and conjure spells, so the family is high-value to design correctly.

---

## Gap 3 — Missing reset cadence variant: `dawn`

**Classification:** `surface_widening`

`RestResetCadence` only knows rest-based refills. "Until the next dawn" is a wall-clock / day-cycle reset tied to neither a short rest nor a long rest. Many magic items use this pattern. A `dawn` (or `daily_dawn`) variant of `RestResetCadence` is needed.

SRD text: *"The censer can't be used this way again until the next dawn."*

---

## Gap 4 — Missing activation cost variant: `magic_action`

**Classification:** `surface_widening`

`ClassFeatureActivationCost` only allows `free | bonus_action`. This item is activated by taking the Magic action — one of the twelve standard action kinds already modeled in `StandardActionKind`. A `magic_action` variant (or a generalised `standard_action` variant carrying a `StandardActionKind`) is needed for activation costs that spend the Magic action.

SRD text: *"you can take a Magic action to summon an Air Elemental"*

---

## Gap 5 — Missing dismiss lifecycle: bonus-action wielder dismiss

**Classification:** `surface_widening`

The elemental can be prematurely dismissed by the wielder spending a Bonus Action. The current lifecycle atoms (`expire`, `dismiss`) do not carry an action cost on the dismissal itself. A `dismiss` variant with an explicit `cost` field (analogous to `MarkTransferCost`) is needed for wielder-triggered early termination.

SRD text: *"when you dismiss it as a Bonus Action"*

---

## Recommended sequencing

1. Add `MagicItemRecord` + `magic_item` to `UnitRecord` and the tracer switch.
2. Design the `summoning` mechanics family (this is the heaviest lift; it recurs across ~6 elemental-control items in the SRD plus all conjure spells).
3. Add `dawn` to `RestResetCadence`.
4. Add `magic_action` to `ClassFeatureActivationCost` (or generalise to `standard_action`).
5. Add cost field to dismiss lifecycle.
