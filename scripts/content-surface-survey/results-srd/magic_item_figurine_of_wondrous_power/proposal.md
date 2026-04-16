# Proposal: Figurine of Wondrous Power

**Outcome:** `structural_widening`

## Why it does not fit

The surface type `UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord` has no `magic_item` branch. The v4 taxonomy lists `magic_item_root` as a source atom, but `types.ts` has no `MagicItemRecord`, no `MagicItemMechanics`, and no mechanics family to house it. No honest coercion into an existing record shape is possible.

The figurine's core loop is:

```
magic_item_root
  → attune (optional, item-level)
  → activate (Magic action: throw to ground within 60 ft)
  → create_companion (named creature type, initiative-slotted after owner)
  → persist (duration per variant)
  → expire OR (creature drops to 0 HP) OR (owner dismisses via Magic action + touch)
  → revert (figurine form restored; day-count cooldown begins)
```

None of this maps to `SpellMechanics`, `ClassFeatureMechanics`, or `MasteryMechanics`.

---

## Required widenings

### 1. `MagicItemRecord` + `MagicItemMechanics` (structural)

A new top-level record kind and mechanics family. Minimum shape:

```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly requiresAttunement: boolean;
  readonly variants: ReadonlyArray<MagicItemVariant>; // see §4
  readonly mechanics: MagicItemMechanics;
};
```

`MagicItemMechanics` needs at minimum a `companion_summoning` family that covers the throw-activate → create_companion → persist/expire → revert lifecycle.

### 2. `ItemRechargeKind` — day-count cooldown

`RestResetCadence` only covers short/long rest cadences. Figurine recharge is calendar-time-based:

| Variant | Cooldown |
|---|---|
| Ebony Fly | 2 days |
| Serpentine Owl | 2 days |
| Silver Raven | 2 days |
| Bronze Griffon | 5 days |
| Obsidian Steed | 5 days |
| Golden Lions | 7 days |
| Marble Elephant | 7 days |
| Onyx Dog | 7 days |
| Goat of Traveling | 7 days (when charges depleted) |
| Goat of Terror | 15 days |
| Goat of Travail | 30 days |

Proposed:

```typescript
export type ItemRechargeKind =
  | { readonly kind: "day_cooldown"; readonly days: number }
  | { readonly kind: "rest"; readonly cadence: RestResetCadence };
```

### 3. Charge pool with time-rate consumption (Goat of Traveling)

The Goat of Traveling has 24 charges. Each hour (or partial hour) of creature-form time costs 1 charge. When the pool is empty the item reverts and triggers a 7-day cooldown; it regains all charges at the end of that cooldown. This is structurally distinct from `use_count` (discrete activations) and `spell_slot` (level-gated resource):

```typescript
export type ChargePoolResource = {
  readonly kind: "charge_pool";
  readonly maxCharges: number;
  readonly costPerUnit: { readonly amount: number; readonly unit: "hour" | "minute" | "action" };
  readonly recharge: ItemRechargeKind;
};
```

### 4. Named sub-variant structure

The Figurine is one item category covering 9+ named variants, each with different creature kinds, durations, cooldowns, and rider mechanics. No existing surface type models a one-to-many item/variant relationship. Options:

- Model each variant as a separate `MagicItemRecord` with a `parentId` back-reference.
- Model the parent as a single record with a `variants` array, each variant carrying its own mechanics.

Either way the surface currently has no affordance for this.

### 5. `create_companion` mechanics subgraph

The v4 atom `create_companion` exists but there is no surface mechanics shape that expresses:

- **Throw-to-point activation** (Magic action, range 60 ft, requires clear space)
- **Creature-kind binding** (which stat block the companion uses)
- **Initiative placement** (takes turn immediately after owner)
- **Command obedience** (follows verbal commands; defends self if no commands)
- **Revert trigger options**: duration expiry, 0 HP, or owner dismissal (Magic action + touch)

The closest existing subgraph is `anchored_trigger`, but the figurine is not a planted trigger — it is an active companion with its own turn and ongoing behavior.

### 6. Per-use probabilistic override (Obsidian Steed)

The Obsidian Steed has a 10% per-use chance to ignore all commands, including the revert command. This is not representable by `attack_roll`, `save_gate`, or `ability_check`. It requires a probability-weighted branch:

```
evidence: "The figurine has a 10 percent chance each time you use it 
           to ignore your orders, including a command to revert to 
           figurine form."
```

This likely needs a new resolution atom (e.g., `probability_check`) or a new `OverrideRisk` surface type.

---

## Rider mechanics expressible once family exists

Several per-variant riders use existing v4 atoms and would be encodable once the `MagicItemRecord`/`companion_summoning` family exists:

| Variant | Rider | Atoms required |
|---|---|---|
| Goat of Terror | Per-turn DC 15 WIS save_gate → Frightened (1 min, repeat save) | `save_gate`, `apply_condition`, `area` (30 ft emanation), `turn_start_window` |
| Goat of Terror | Removable horn → weapon creation (+1 Lance, +2 Longsword) | `create_object`, `alter_item_kind` |
| Onyx Dog | Modified stat block (Int 8, Common, Blindsight 60 ft) | `grant_sense` (with range), companion stat override |
| Serpentine Owl | Telepathic link at any range (same plane) | `telepathic_link` |
| Silver Raven | Grants Animal Messenger access while in raven form | `grant_spell_access` |

---

## Summary

The Figurine of Wondrous Power requires:
1. A `magic_item` branch in `UnitRecord` with `MagicItemRecord` and `MagicItemMechanics`.
2. A `companion_summoning` mechanics family (distinct from all spell families).
3. A day-count `ItemRechargeKind` (replacing/extending `RestResetCadence`).
4. A charge-pool resource with time-rate consumption (Goat of Traveling).
5. A named sub-variant structure for items with multiple configurations.
6. A `probability_check` or `probabilistic_override` resolution atom (Obsidian Steed).
