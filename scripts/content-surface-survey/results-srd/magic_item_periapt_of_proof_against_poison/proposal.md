# Proposal: Widening for Periapt of Proof against Poison

## Outcome: `structural_widening`

The unit cannot be encoded at all in the current surface. Three layers of widening are required.

---

## Blocker 1 — No `MagicItemRecord` in `UnitRecord` (structural)

`types.ts` defines:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

The Periapt is `kind: "magic_item"`. This variant does not exist. The TAXONOMY v4 lists `magic_item_root` as a source atom, but the surface types have never been extended to include a `MagicItemRecord`.

**Minimum addition:** A new `MagicItemRecord` type added to `UnitRecord`, analogous to the existing record shapes.

---

## Blocker 2 — No passive/always-on mechanics family (structural)

The item's core mechanic is:

> *While you wear it, you have Immunity to the Poisoned condition and Poison damage.*

This is a passive always-on effect that requires no activation, no cost, no quota, and no reset. It is gated only on wearing (and attuning to) the item.

Existing families:
- `activation` — requires explicit activation with a cost
- `ongoing_effect` — spell-rooted, concentration/timed persistence
- `triggered_reaction` — reaction-shaped
- `anchored_trigger` — stores a deferred release
- `on_hit_trigger` — weapon hit rider

None of these honestly represent "passive while worn/attuned." A new family is needed, tentatively `passive_while_worn` or `passive_while_attuned`, with:
- An optional `requiresAttunement: boolean` gate
- An `effects` array of always-on effect atoms

---

## Blocker 3 — No `grant_immunity` effect atom (atom widening)

v4 has `grant_resistance` (halves damage from a type) but not `grant_immunity` (fully negates damage from a type). These are mechanically distinct in SRD 5.2.1:

- Resistance: take half damage
- Immunity: take no damage

Encoding poison immunity as `grant_resistance` would be a false trace. A new `grant_immunity` atom is required in the Effect category.

**Proposed atom:** `grant_immunity` — grants full immunity to a specified damage type. Parallel structure to `grant_resistance`.

---

## Blocker 4 — No condition immunity atom (atom widening)

The item also grants immunity to the Poisoned *condition*, not just Poison *damage*. v4 has:
- `apply_condition` — applies a condition
- `remove_condition` — removes a condition instance

Neither represents a permanent standing immunity to a condition. A new atom is needed:

**Proposed atom:** `grant_condition_immunity` — grants immunity to a named condition (the bearer cannot receive that condition while the effect persists).

This is mechanically distinct from `remove_condition` (which fires once) and from `grant_resistance` (which applies only to damage).

---

## Blocker 5 — Attunement gate on item record (surface widening)

The item requires attunement. v4 has `attunement_slot` as a resource atom and `attune` as a procedure atom, but the surface has no field to express "this item requires attunement" at the record level.

A `MagicItemRecord` should include:
```typescript
readonly requiresAttunement: boolean;
```

This gates all item effects on the attunement procedure having fired. Without this field, the item's attunement prerequisite is unrepresentable.

---

## Summary of required widenings

| # | Kind | Name | Category |
|---|------|------|----------|
| 1 | new_subgraph | `MagicItemRecord` + `passive_while_attuned` family | structural |
| 2 | new_atom | `grant_immunity` | atom |
| 3 | new_atom | `grant_condition_immunity` | atom |
| 4 | new_variant | `requiresAttunement` field on `MagicItemRecord` | surface |

All four are required before this item can be encoded cleanly.
