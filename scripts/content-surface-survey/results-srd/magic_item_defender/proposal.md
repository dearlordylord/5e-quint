# Proposal: Widenings Required for Defender

## Outcome

`structural_widening` — The `magic_item` kind does not exist in `UnitRecord`. No encoding is possible.

---

## Gap 1 — Missing `MagicItemRecord` kind (primary blocker)

`types.ts` exports:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `MagicItemRecord`. The tracer's `traceUnit` switch has no `magic_item` arm. Any attempt to produce a `magic_item` JSON would fail typecheck and throw at the tracer.

**Required:** A new `MagicItemRecord` top-level type, with metadata fields analogous to `UnitMetadata` plus at minimum an `attunement: boolean` field and a mechanics payload.

---

## Gap 2 — No `attunement` procedure/resource on the surface

The item requires attunement. The v4 taxonomy names `attune` (procedure) and `attunement_slot` (resource) but neither is in `types.ts`. Encoding the attunement lifecycle requires:

- A surface type for the `attune` procedure atom.
- A surface type for the `attunement_slot` resource atom.

SRD text: *"Legendary (Requires Attunement)"*

---

## Gap 3 — No passive enchantment mechanics family

The +3 bonus to attack rolls and damage rolls is unconditional and always-on while the weapon is held and attuned. No existing family models this:

| Existing family | Why it doesn't fit |
|---|---|
| `activation` (class feature) | Requires an activation cost + use count; the bonus is not activated |
| `ongoing_effect` (spell) | Requires a spell slot and casting time; this is an item property |
| `on_hit_trigger` (mastery) | Fires only on a weapon hit; the bonus applies before the roll |

**Required:** A new `passive_property` (or `item_enchantment`) mechanics family for always-on numeric bonuses attached to a weapon or item. This would cover the broad class of magic weapons (+1/+2/+3 weapons, Bracers of Archery, etc.).

SRD text: *"You gain a +3 bonus to attack rolls and damage rolls made with this magic weapon."*

---

## Gap 4 — No variable bonus-split operation

The Defender's signature mechanic allows the wielder to dynamically partition a shared +3 pool between two destinations:

- Attack rolls + damage rolls (kept)
- Armor Class (transferred)

The split is a free integer choice at the moment of the turn's first attack, bounded by [0, +3]. Both halves must sum to the weapon's enchantment bonus.

Current surface types model **fixed-delta** effects:
- `modify_roll_numeric` — a fixed `DiceDelta`
- `modify_ac` (reaction effect) — a fixed integer delta

Neither can represent a runtime-variable split of a shared budget.

**Required:** A new surface type for a shared bonus pool with configurable per-target allocation. Candidate name: `allocate_bonus` operation, with:
- `pool: number` — the total bonus (3 for Defender)
- `targets: ReadonlyArray<BonusTarget>` — the destinations (attack_rolls_and_damage, ac)
- `trigger: "first_attack_of_turn"` — when the allocation decision is made
- `expiry: "start_of_next_turn"` — when the AC component expires
- `condition: "while_held"` — the AC bonus requires holding the weapon

This is likely unique to Defender among SRD items and may justify a narrow `defender_transfer` variant rather than a generic allocation primitive.

SRD text: *"The first time you attack with the weapon on each of your turns, you can transfer some or all of the weapon's bonus to your Armor Class."*

---

## Summary table

| Gap | Classification | Blocking? |
|---|---|---|
| Missing `MagicItemRecord` kind | `structural_widening` | Yes — no encoding path exists |
| Missing `attunement` procedure/resource | `structural_widening` | Yes |
| Missing passive enchantment family | `structural_widening` | Yes |
| Missing variable bonus-split operation | `surface_widening` | Yes (even if family existed) |

All four gaps must be resolved before Defender can be encoded. The primary unblock is adding `MagicItemRecord` to `UnitRecord` and at least one magic-item mechanics family to `types.ts`.
