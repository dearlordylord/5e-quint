# Proposal: Mace of Smiting — `structural_widening`

## Unit

**Name:** Mace of Smiting  
**Slug:** `magic_item_mace_of_smiting`  
**Kind:** `magic_item`  
**Rarity:** Rare  
**Provenance:** SRD 5.2.1, Equipment/Magic-Items/Items-I-P.md § Mace of Smiting

---

## Why it doesn't fit

### 1. No `MagicItemRecord` in `UnitRecord` (structural)

`UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord`

The taxonomy lists `magic_item_root` as a v4 source atom, but `types.ts` has no corresponding record type. The unit cannot be represented as any existing record kind without falsifying its nature. This alone is a `structural_widening`.

### 2. Passive weapon bonus — no `passive_property` family (structural)

> "You gain a +1 bonus to attack rolls and damage rolls made with this magic weapon."

This is a permanent, always-on weapon property — not an activation, not a spell, not a mastery on-hit rider. The bonus applies to every attack roll and damage roll made with the weapon without any action, quota, or trigger. No existing mechanics family (spell `ongoing_effect`, class feature `activation`, mastery `on_hit_trigger`) fits:

- `ongoing_effect` requires concentration/timed spell duration and caster action
- `class_feature activation` requires an explicit use-count resource and player action
- `on_hit_trigger` fires on a hit, not passively on every roll

A **passive property family** is needed for magic item always-on modifiers.

### 3. `crit_window` atom missing (atom widening)

> "When you roll a **20** on an attack roll made with this weapon..."

The extra damage triggers specifically on a **critical hit** (natural 20). This is mechanically distinct from `on_hit_window` (which fires on any hit). The taxonomy already acknowledges `crit_window` as a known weak spot ("single-feat pressure from Boon of Irresistible Offense"). The Mace of Smiting is a second independent pressure case from the magic item stream.

### 4. Creature-type conditional — no target-type filter (surface widening)

> "The bonus increases to **+3** when you use the weapon to attack a **Construct**."  
> "...or **14** Bludgeoning damage if it's a **Construct**."

Both the bonus magnitude and the crit extra damage scale based on whether the target is a Construct. No creature-type predicate exists in any surface type: `Attachment`, `DcSource`, `DiceAmount`, or effect variants are all type-agnostic with respect to target creature type. A **`creature_type_filter`** variant (or a general target predicate) is needed.

### 5. HP-threshold instant kill — no matching effect atom (atom widening)

> "If a Construct has **25 Hit Points or fewer** after taking this damage, it is **destroyed**."

This is a deterministic instant-kill conditioned on post-damage remaining HP. v4 has:
- `apply_condition` — applies a status condition, not destruction
- `damage` — deals damage, does not query post-damage HP
- No atom for "if creature HP ≤ N, destroy it"

A new **`instant_kill_at_hp_threshold`** effect atom is needed (or a more general `hp_threshold_branch` subgraph).

---

## Summary of gaps

| Gap | Classification | Evidence |
|-----|---------------|----------|
| `MagicItemRecord` type missing from `UnitRecord` | `structural_widening` | Item kind = `magic_item`; not in type union |
| Passive weapon bonus family missing | `structural_widening` | "+1 bonus to attack rolls and damage rolls" — always-on, no action/resource |
| `crit_window` atom missing | `atom_widening` | "When you roll a 20 on an attack roll" |
| Creature-type filter missing | `surface_widening` | "+3 when attacking a Construct", "14 damage if it's a Construct" |
| HP-threshold instant kill missing | `atom_widening` | "If a Construct has 25 HP or fewer... it is destroyed" |

Primary classification: **`structural_widening`** (no `MagicItemRecord`; no passive-property family).

---

## Recommended widening path

To encode Mace of Smiting cleanly, the surface needs at minimum:

1. **`MagicItemRecord`** — a new top-level record in `UnitRecord` with `kind: "magic_item"` and fields for attunement, item type, rarity.
2. **`passive_property` mechanics family** — covers always-on weapon/armor/wondrous bonuses that require no action or resource.
3. **`crit_window`** atom in the window category — fires when the attack roll result is a natural 20.
4. **Creature-type filter** variant — a predicate on attachment or effect gating behavior on target creature type (Construct, Undead, etc.).
5. **`instant_kill_at_hp_threshold`** or a more general `hp_branch` effect atom — conditional destruction/kill based on post-damage HP.

Items 3–5 would benefit multiple future magic items (Dragon Slayer, Mace of Disruption, Vorpal Sword all share related patterns).
