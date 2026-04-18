# Proposal: Figurine of Wondrous Power — Surface Widenings

## Classification: `structural_widening`

The Figurine of Wondrous Power is a collection magic item with 9 named variants. Five variants (Bronze Griffon, Ebony Fly, Golden Lions, Marble Elephant, Goat of Travail) fit the existing `MagicItemSpawnedCreatureMechanics` + `catalog_ref` pattern. The remaining four require new mechanics shapes that the current surface cannot express honestly.

---

## Gap 1 — Per-active-time charge drain (Goat of Traveling)

**Classification:** structural\_widening

**SRD text:**
> It has 24 charges, and each hour or portion thereof it spends in goat form costs 1 charge. While it has charges, you can use it as often as you wish. When it runs out of charges, it reverts to a figurine and can't be used again until 7 days have passed, when it regains all expended charges.

**Gap:** The current `charge_pool` resource model attaches a charge cost to each activation (via `grant_spell_access.mode = charge_cast` or similar). There is no shape for "drain N charges per unit of time while the summoned creature is active." This is a fundamentally different charge-consumption model — the cost is time-in-form, not activation count.

**Proposed addition:** A new `PassiveOperation`-like trigger on the spawned-creature lifecycle, e.g.:

```typescript
readonly activeTimeDrain?: {
  readonly chargesPerUnit: number;
  readonly unit: "hour" | "minute";
};
```

wired to the `charge_pool` resource, where the pool depletes at the stated rate while the creature is active and the creature reverts when the pool reaches zero.

Alternatively, this could be a new `ResetCadence` variant that works in reverse (charges drain over time rather than refill), but that conflates reset semantics with active-drain semantics.

---

## Gap 2 — "While ridden" conditional creature aura (Goat of Terror)

**Classification:** structural\_widening

**SRD text:**
> While you ride the goat, any Hostile creature that starts its turn within a 30-foot Emanation originating from the goat must succeed on a DC 15 Wisdom saving throw or have the Frightened condition for 1 minute, until you are no longer riding the goat, or until the goat reverts to figurine form. The Frightened creature repeats the save at the end of each of its turns, ending the effect on itself on a success.

**Gap:** `CreatureTraitEffect` only covers two shapes: `caster_shared_resistance` and `caster_heal_link`. An emanation-based save-gate aura active on the summoned creature's turn — conditional on the owner riding the creature — has no representation. The aura is:
- A 30-ft emanation from the creature (not the owner)
- Active only while the "riding" condition holds
- Fires a DC 15 Wis save for hostile creatures starting their turn in the emanation
- Has a 24-hour per-creature immunity after success

**Proposed addition:** Widen `CreatureTrait.effect` to support aura-style ongoing operations, or expose a `CreatureOngoingOperation` shape parallel to spell `OngoingOperation` that can express `on_attached_turn_start` triggers on the summoned creature, gated by an optional `whileRidden` condition. The repeat-save pattern (save at end of each turn to end effect) is already modeled in `RepeatSaveSpec` for spells and could be reused.

---

## Gap 3 — Weapon creation from creature anatomy (Goat of Terror)

**Classification:** atom\_widening

**SRD text:**
> you can (harmlessly) remove its horns and use them as weapons. One horn becomes a +1 Lance, and the other becomes a +2 Longsword. Removing a horn requires a Magic action, and the weapons disappear and the horns return when the goat reverts to figurine form.

**Gap:** No `EffectAtom` models the creation of magical weapon items from a summoned creature's body parts. This is distinct from:
- `create_object` — creates environmental objects, not carried items with magic weapon properties
- `modify_damage_numeric` — modifies existing weapon rolls, doesn't create a new item
- `grant_spell_access` — grants spell casting ability, not a physical item

The resulting weapons are `+1 Lance` and `+2 Longsword` — existing item types with rarity-bonus modifications. The creation is temporary (tied to the creature's active state) and costs a Magic action.

**Proposed addition:** A new `EffectAtom` kind, e.g. `create_magic_item_from_source`, or a widening of `create_object` to support `weaponId` + `magicBonus` fields for temporary weapon grants sourced from the creature.

---

## Gap 4 — Unlimited same-plane telepathy (Serpentine Owl)

**Classification:** surface\_widening

**SRD text:**
> The owl can communicate telepathically with you at any range if you and it are on the same plane of existence.

**Gap:** `CreatureControl.telepathy` is typed as `{ rangeFeet: number; sharedSenses?: "bonus_action" }`. The field accepts only a fixed distance, not an "unlimited while on same plane" semantic.

**Proposed addition:** Widen `telepathy` to:

```typescript
readonly telepathy?: {
  readonly range: number | "same_plane_unlimited";
  readonly sharedSenses?: "bonus_action";
};
```

This follows the existing pattern where speed values accept `number | LinkedSpeed`.

---

## Gap 5 — Owner gains spell while summoned creature is active (Silver Raven)

**Classification:** surface\_widening

**SRD text:**
> While in raven form, the figurine grants you the ability to cast Animal Messenger on it.

**Gap:** There is no surface shape for "while the summoned creature is active, confer an effect (here: spell access) to the owner." The current `SpawnedCreaturePayload` models the creature's stats, control, and dismissal — all creature-facing. Owner-facing passive grants tied to the creature's active state have no representation.

This differs from a passive `grant_spell_access` on the item itself because the spell is specifically grantable **while in raven form** — if the raven has been dismissed or is in figurine form, the grant does not apply.

**Proposed addition:** A new optional field on `SpawnedCreaturePayload`:

```typescript
readonly ownerGrantsWhileActive?: ReadonlyNonEmptyArray<EffectAtom>;
```

This would be emitted as a passive `grant` node in the trace that persists only for the duration of the creature's active window.

---

## Gap 6 — Probabilistic command failure with persistent ignore state (Obsidian Steed)

**Classification:** surface\_widening

**SRD text:**
> The figurine has a 10 percent chance each time you use it to ignore your orders, including a command to revert to figurine form. If you mount the nightmare while it is ignoring your orders, you and the nightmare are instantly transported to a random location on the plane of Hades, where the nightmare reverts to figurine form.

**Gap:** The `random_table` activation phase could model a 10% branch (e.g., d10, result = 1 → malfunction). But the resulting "ignoring orders" state is **persistent** across the duration of that activation — it affects subsequent interactions with the creature (specifically: mounting it). Tracking "the creature is currently in an ignoring-orders state" requires either:

1. A persistent creature-state flag (no analog in the current surface)
2. A triggered effect on mount (no "on_owner_mounts_creature" trigger exists)
3. The transport_exile effect itself could be expressed (`destination: "different_plane"` exists in `ExileDestination`), but the trigger condition has no representation.

**Partial fits:** The `random_table` phase can fire with a 10% branch, and `transport_exile` to `"different_plane"` could express the Hades destination. But the conditional "if mounted while ignoring orders" trigger is a new trigger kind with no surface analog.

---

## Gap 7 — catalog\_ref with stat overrides (Onyx Dog)

**Classification:** surface\_widening

**SRD text:**
> The mastiff has an Intelligence of 8 and can speak Common. It also has Blindsight with a range of 60 feet.

**Gap:** `SpawnedCreatureStatBlock` only supports `inline` (full stat block) or `catalog_ref` (monsterId + displayName, no overrides). The Onyx Dog is semantically a Mastiff with specific stat modifications. Encoding it as `inline` would require restating all Mastiff base stats, losing the catalog reference and making the encoding brittle to catalog updates.

**Proposed addition:**

```typescript
| {
    readonly kind: "catalog_ref_with_overrides";
    readonly monsterId: string;
    readonly displayName: string;
    readonly overrides: CreatureStatBlockOverrides;
  }
```

This parallels the existing `CreatureMode.options[].overrides: CreatureStatBlockOverrides` pattern, reusing the already-defined `CreatureStatBlockOverrides` type.

---

## Clean variants (for reference)

The following five variants could be encoded immediately under the current surface with no changes:

| Variant | Pattern | Reset |
|---|---|---|
| Bronze Griffon | `catalog_ref` "griffon", 6 hours | elapsed_days 5 |
| Ebony Fly | `inline` (Giant Fly stat block), 12 hours | elapsed_days 2 |
| Golden Lions | `catalog_ref` "lion", 1 hour | elapsed_days 7 |
| Goat of Travail | `catalog_ref` "giant_goat", 3 hours | elapsed_days 30 |
| Marble Elephant | `catalog_ref` "elephant", 24 hours | elapsed_days 7 |

All five use `activationCost: { kind: "standard_action", action: "magic" }`, `manualDismiss: "magic_action"`, and `control.turnOrder: "immediately_after_caster"`.
