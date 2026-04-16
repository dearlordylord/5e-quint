# Proposal: Adamantine Armor widening

## Outcome: `structural_widening`

Two orthogonal gaps prevent encoding. Both must be resolved.

---

## Gap 1 — Missing `magic_item` UnitRecord kind (structural)

`types.ts` defines:
```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

The v4 TAXONOMY lists `magic_item_root` as a source atom (§1), but there is no `MagicItemRecord` in `types.ts` and no `magic_item` discriminant in `UnitRecord`. Any attempt to encode an item would require coercing it into `SpellRecord`, `ClassFeatureRecord`, or `MasteryRecord` — all of which would be structurally dishonest.

**Required addition:** A new `MagicItemRecord` type and its inclusion in `UnitRecord`:
```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly requiresAttunement: boolean;
  readonly mechanics: MagicItemMechanics;
};

export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord | MagicItemRecord;
```

---

## Gap 2 — Missing `passive_persistent` mechanics family

Adamantine Armor is an always-on passive modifier: no activation, no cost, no use count, no rest reset. The effect is simply "while worn, property X holds."

The three existing families do not cover this:
- `ongoing_effect` (spell) — requires a casting time, spell level, school, concentration or duration; models a caster projecting an effect onto targets.
- `activation` (class feature) — requires an activation cost and use-count resource; models a deliberate triggered action.
- `on_hit_trigger` (mastery) — models a weapon-hit rider on outgoing attacks.

**Required addition:** A `passive_persistent` (or `worn_passive`) mechanics family for magic items whose properties are unconditionally active while the item is equipped:
```typescript
export type MagicItemPassiveMechanics = {
  readonly family: "passive_persistent";
  readonly effects: ReadonlyArray<MagicItemEffect>;
};
```

---

## Gap 3 — Missing atom: crit suppression

The SRD text: **"any Critical Hit against you becomes a normal hit."**

This effect downgrades the outcome of an incoming attack roll from `critical` to `normal hit`. No v4 atom covers this:

- `modify_roll_numeric` — adjusts the numeric value of a roll, not its categorical outcome.
- `modify_roll_advantage` — grants/removes advantage/disadvantage.
- `interrupt_resolution` — cancels the triggering spell (Counterspell-style), not an attack-roll outcome category.
- `crit_window` — explicitly deferred in v4 §12: "single-feat pressure, not promoted."

Adamantine Armor is a **second independent pressure stream** for `crit_window` (magic item stream, separate from the Boon of Irresistible Offense feat stream noted in §12). Together they represent multi-stream pressure that historically triggers promotion in this taxonomy.

**Required addition:** Promote `crit_window` from deferred to v4, or introduce a new `suppress_crit` effect atom. Suggested shape:
```
suppress_crit  (effect category)
  → attaches to: incoming attack_roll resolution against self
  → effect: categorical outcome "critical" → "hit"
```

---

## Gap 4 — Missing trigger variant: incoming attack roll against wearer

All existing `attack_roll` resolution atoms model outgoing attacks (the bearer rolls to hit a target). Adamantine Armor fires on *incoming* attack rolls targeting the wearer.

The existing `MasteryTrigger` shape (`weapon_hit` / `weapon_hit_melee_only`) is for outgoing hits. There is no trigger scoped to "attack roll targeting me."

**Required addition:** A new trigger variant (in whichever new `MagicItemMechanics` family is introduced) for incoming attack resolution:
```typescript
export type IncomingAttackTrigger =
  | { readonly kind: "incoming_attack_roll" }
  | { readonly kind: "incoming_critical_hit" };
```

---

## Summary table

| # | Kind | Name | Blocking? |
|---|------|------|-----------|
| 1 | `new_subgraph` | `MagicItemRecord` + `magic_item` in `UnitRecord` | Yes — no kind exists |
| 2 | `new_subgraph` | `passive_persistent` mechanics family | Yes — no honest family exists |
| 3 | `new_atom` | `suppress_crit` / promote `crit_window` | Yes — no atom exists |
| 4 | `new_variant` | Incoming attack_roll trigger | Yes — only outgoing triggers exist |

All four gaps must be addressed before Adamantine Armor can be encoded honestly. Gaps 1 and 2 are structural (family/kind missing); gaps 3 and 4 are atom/surface.
