# Proposal: Ring of Regeneration

**Outcome**: `atom_widening`  
**Unit**: `magic_item_ring_of_regeneration` (Very Rare, requires attunement)

## Unit Text

> While wearing this ring, you regain 1d6 Hit Points every 10 minutes if you have at least 1 Hit Point. If you lose a body part, the ring causes the missing part to regrow and return to full functionality after 1d6 + 1 days if you have at least 1 Hit Point the whole time.

---

## Gap 1 — `restore_body_part` atom (atom_widening)

Limb regrowth is mechanically distinct from every existing `EffectAtom` variant:

- Not `heal_hp` — current HP is unchanged by regrowth.
- Not `remove_condition` — the SRD does not model "missing limb" as a named condition; even if it did, the atom would restore function, not end a condition.
- Not `alter_appearance` — the effect restores full functionality, not just appearance.
- Not `modify_max_hp` — maximum HP is unaffected.

The concept is simply absent from v4. A new atom is needed:

```typescript
| {
    readonly kind: "restore_body_part";
    readonly durationDice: DiceExpr;   // 1d6+1 days
    readonly predicate: "hp_gte_1_throughout";
  }
```

The `predicate` field captures the "must have at least 1 HP for the entire regrowth window" gate, which is a sustained-condition predicate (distinct from the instant `at_hp_threshold` predicate on `OngoingOperation`).

---

## Gap 2 — `OngoingTrigger.on_time_interval` (surface_widening)

The HP regeneration fires "every 10 minutes" — an exploration-time (real-time) interval with no turn-based analogue. No existing `OngoingTrigger` variant covers this:

| Existing variant | Why it doesn't fit |
|---|---|
| `passive` | Always-on, not periodic |
| `on_attached_turn_start` | Per combat turn (~6 seconds), not 10 minutes |
| `on_caster_turn_start` | Same |
| All others | Attack/movement/entry events, not time intervals |

Proposed new variant:

```typescript
| { readonly kind: "on_time_interval"; readonly minutes: number }
```

Note: the "if at least 1 HP" gate would map cleanly to the existing `OngoingPredicate`:
```typescript
{ kind: "at_hp_threshold", threshold: 1, comparison: "gte" }
```
No new predicate type is needed — this gap resolves if the trigger variant is added.

---

## Gap 3 — `MagicItemMechanics` lacks ongoing_effect family (structural_widening)

Even if Gaps 1 and 2 were resolved, `MagicItemMechanics` is:

```typescript
type MagicItemMechanics = PassiveMechanics | ActivatedAbilityMechanics;
```

Neither family supports `OngoingOperation` (the `trigger + predicate? + effect` grammar). `OngoingEffectMechanics` with its `operations` array is spell-only. There is no way to express "while wearing this item, on event X with predicate Y, apply effect Z" for a magic item.

Two resolution paths:

**Option A**: Extend `MagicItemMechanics` to include a third family `ongoing_effect` mirroring the spell family:
```typescript
type MagicItemMechanics =
  | PassiveMechanics
  | ActivatedAbilityMechanics
  | { readonly family: "ongoing_effect"; readonly operations: ReadonlyNonEmptyArray<OngoingOperation> };
```

**Option B**: Promote `OngoingEffectMechanics` (or a stripped version without spell-header fields) to be shared by non-spell unit kinds.

Option A is lower surface area.

---

## Additional gap — duration timer on passive item effects

The 1d6+1 day regrowth window has no representation. Spell durations (`Duration`) exist but are anchored to a cast event. There is no "passive timer that begins when a trigger event fires and resolves after N days" concept in the surface. This is a secondary gap — likely resolved as part of the `restore_body_part` atom design.

---

## Summary

| Gap | Classification | Blocking? |
|---|---|---|
| `restore_body_part` atom | atom_widening | Yes — limb regrowth has no atom |
| `OngoingTrigger.on_time_interval` | surface_widening | Yes — periodic trigger missing |
| `MagicItemMechanics` ongoing_effect family | structural_widening | Yes — magic items can't have operations |
| Sustained-condition predicate for regrowth window | surface_widening | Secondary |

All three primary gaps must be resolved before this unit can be encoded honestly.
