# Proposal: Dancing Sword

**Unit slug:** `magic_item_dancing_sword`
**Classification:** `structural_widening`

---

## Why no honest encoding exists

The Dancing Sword creates a **hovering weapon proxy** — a persistent autonomous entity that makes attacks using the wielder's own attack roll and ability modifier. No existing `MagicItemComponentMechanics` family can encode this honestly:

| Family | Why it fails |
|---|---|
| `passive` | No activation, no hovering state, no attack proxy. |
| `activation` (single-shot) | Cannot represent multi-turn persistence, per-turn redirect, or the 4-attack counter. |
| `triggered_reaction` | Wrong timing and trigger shape. |
| `on_hit_trigger` | This is not a weapon mastery on-hit rider. |
| `spawned_creature` | Requires `CreatureStatBlock` — the sword is not a creature; it has no HP, AC, creature type, or independent ability scores. Attacks use the wielder's stats, not a companion stat block. |
| `composite` | No combination of existing families resolves the lifecycle problem. |

---

## What the mechanic actually requires

### 1. `attack_proxy` attachment atom (v4 taxonomy §3 — already listed)

A new attachment kind distinct from `companion`. Unlike a companion:
- The proxy has no stat block, no HP, no creature type.
- Attacks resolve using the **wielder's** attack roll and ability modifier.
- The proxy's position and target are directed by the wielder.
- It carries a per-proxy attack counter (4 attacks before auto-return).

The v4 taxonomy (`TAXONOMY_atoms_graph.md` §3) already lists `attack_proxy` as an attachment atom and `create_attack_proxy` as an effect atom. Neither appears in `types.ts`.

### 2. `create_attack_proxy` effect atom (v4 taxonomy §9 — already listed)

Emitted by the initial launch activation. Distinct from `create_companion`:
- No stat block; inherits wielder attack/damage math.
- Carries a lifetime attack budget (4 uses) and auto-return on exhaustion.
- Carries early-return predicates: grasped by wielder, or wielder >30 ft away.

### 3. `weapon_proxy_lifecycle` subgraph

A new multi-turn lifecycle pattern for `MagicItemComponentMechanics`:

```
activate (Bonus Action)
  → create_attack_proxy
  → attack_proxy attachment (hovers, 30 ft range, 5 ft threat)
  → attack_roll [uses wielder stats]
  → per-proxy use_count (cap=4)

redirect (Bonus Action, repeating)
  → fly attack_proxy up to 30 ft within 30 ft of wielder
  → attack_roll [uses wielder stats]
  → decrement per-proxy use_count

on use_count exhausted → auto-return to wielder
on grasped OR wielder >30 ft → early return/fall
```

No existing `MagicItemComponentMechanics` family supports this shape. The `spawned_creature` family comes closest structurally (persistent entity, Bonus Action command) but requires a `SpawnedCreatureStatBlock` and resolves combat through the creature's own stats — which is incorrect for the Dancing Sword.

---

## Minimum surface changes required

1. **Add `attack_proxy` to `Attachment`** in `types.ts`:
   ```typescript
   | {
       readonly kind: "attack_proxy";
       readonly rangeFeet: number;       // max distance from wielder
       readonly threatFeet: number;      // attack reach of proxy
       readonly attackBudget: number;    // max attacks before auto-return
     }
   ```

2. **Add `create_attack_proxy` to `EffectAtom`** in `types.ts`:
   ```typescript
   | {
       readonly kind: "create_attack_proxy";
       readonly proxy: AttackProxySpec;  // reference to the proxy attachment
       readonly usesWielderStats: true;  // always true for Dancing Sword family
     }
   ```

3. **Add a new `MagicItemComponentMechanics` family** — either extend `ActivatedAbilityMechanics` to support multi-turn proxy management, or introduce a dedicated `weapon_proxy` family analogous to `spawned_creature` but without the creature stat block requirement.

---

## SRD reference

SRD 5.2.1, Equipment/Magic Items — Dancing Sword:

> You can take a Bonus Action to toss this magic weapon into the air. When you do so, the weapon begins to hover, flies up to 30 feet, and attacks one creature of your choice within 5 feet of itself. The weapon uses your attack roll and adds your ability modifier to damage rolls.
>
> While the weapon hovers, you can take a Bonus Action to cause it to fly up to 30 feet to another spot within 30 feet of you. As part of the same Bonus Action, you can cause the weapon to attack one creature within 5 feet of the weapon.
>
> After the hovering weapon attacks for the fourth time, it flies back to you…
