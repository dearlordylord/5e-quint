# Proposal: Iron Flask — structural_widening

## Summary

The Iron Flask cannot be encoded in the current surface. The primary blocker is structural: `UnitRecord` has no `magic_item` kind. Even if that kind existed, five distinct gaps remain in the surface types. This document records all gaps for the next widening pass.

---

## Primary blocker: missing `magic_item` kind

`types.ts` defines `UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord`. There is no `MagicItemRecord` and no corresponding mechanics family.

The TAXONOMY v4 defines `magic_item_root` as a source atom and records that 24 items have been through validation passes, confirming this unit type is intended to be in scope. The surface has simply not been widened yet.

**Required additions (minimum):**

```typescript
// New record shape
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly requiresAttunement: boolean;
  readonly mechanics: MagicItemMechanics;
};

// UnitRecord union must expand:
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord | MagicItemRecord;
```

The mechanics family shape for Iron Flask would be something like `activation_with_item_state` — an activated item that maintains mutable state between uses.

---

## Secondary gaps (would block encoding even after kind widening)

### 1. Item state as activation precondition

The trap action requires "the flask is empty". This is a mutable boolean state on the item instance — no current surface type models item-level state that gates activation.

**Proposed shape:**
```typescript
export type ItemStateGuard =
  | { readonly kind: "item_empty" }
  | { readonly kind: "item_charged"; readonly minCharges: number };
```

**Evidence:** *"If the flask is empty and the target is native to a plane of existence other than the one you're on"*

---

### 2. Planar origin filter on save gate precondition

The save only fires against creatures "native to a plane of existence other than the one you're on". This is a planar-origin guard condition — not a targeting restriction (you can target any creature with the Magic action), but a predicate that determines whether the save gate even opens.

No current surface type models planar origin as a filter on resolution.

**Evidence:** *"if the target is native to a plane of existence other than the one you're on, the target must succeed on a DC 17 Wisdom saving throw"*

---

### 3. Per-target usage history as advantage modifier

"If the target has been trapped by the flask before, it has Advantage on the save."

This is a save advantage modifier conditioned on the target's personal history with this specific item. The existing `modify_roll_advantage` rider requires an expiry window (turn-scoped); this one requires querying a per-target flag that persists indefinitely across all uses.

**Evidence:** *"If the target has been trapped by the flask before, it has Advantage on the save."*

---

### 4. Indefinite extradimensional imprisonment effect

The v4 `transport_exile` atom covers temporary banishment with a repeated-save escape path (e.g., Banishment). The Iron Flask imposes indefinite imprisonment: the creature stays until explicitly released, with no timed exit, no repeated save. It also has special properties (no aging, no sustenance) that are flavor-adjacent but establish the container as a hermetically sealed extradimensional space.

**Evidence:** *"Once trapped, a creature remains in the flask until released."*

**Proposed atom:** `extradimensional_imprisonment` — distinct from `transport_exile` in that duration is indefinite, release requires an explicit holder action, and capacity is bounded (one creature at a time).

---

### 5. Post-release timed obedience effect

After releasing the creature, it "obeys your commands for 1 hour". This is closest to the v4 `command_companion` atom, but `command_companion` is scoped to actual companions (summoned/created creatures under the owner's control). The Iron Flask's obedience applies to any arbitrary creature for a fixed 1-hour window immediately after release.

The edge-case behavior ("if you issue no commands or give a command likely to result in its death or imprisonment, it defends itself but otherwise takes no actions") is DM-agenda and does not need surface encoding, but the timed obedience window itself is deterministic.

**Evidence:** *"The creature then obeys your commands for 1 hour"*

---

## DM-agenda components (correctly excluded from core)

- "An Identify spell reveals if the flask contains a creature, but the only way to determine the type of creature is to open the flask." — informational/GM-narrative.
- "A newly discovered Iron Flask might already contain a creature chosen by the GM." — GM prep decision.
- Determining whether a given command "is likely to result in [the creature's] death or imprisonment" — DM adjudication.
- Creature behavior "in accordance with its normal disposition and alignment" after the hour ends — DM-owned narrative state.

---

## Recommended widening order

1. Add `MagicItemRecord` kind to `UnitRecord` + `magic_item_root` source tracing in tracer.
2. Add `ItemStateGuard` as a precondition type for magic item mechanics.
3. Add planar origin filter to the resolution precondition vocabulary.
4. Add `extradimensional_imprisonment` as a distinct effect atom (separate from `transport_exile`).
5. Generalize `command_companion` or add `command_obedience` for the post-release window.
6. Per-target history modifier (needed for the advantage-on-repeat-trap rule) — lowest priority, possibly deferred until another item forces it.
