# Proposal: Widening for `magic_item_elven_chain`

## Outcome: `structural_widening`

Elven Chain cannot be encoded. The blocking gap is at the schema layer: `UnitRecord` has no `magic_item` variant and `types.ts` defines no `MagicItemRecord` type.

---

## Unit text

> **Elven Chain** — *Armor (Chain Mail or Chain Shirt), Rare*
>
> You gain a +1 bonus to Armor Class while you wear this armor. You are considered trained with this armor even if you lack training with Medium or Heavy armor.

---

## Mechanics breakdown

| Mechanic | Description | Atom needed | Gap |
|---|---|---|---|
| +1 AC while worn | Passive, always-on addend to AC while the armor is equipped | `modify_ac` (passive variant) | Exists in v4 and in types.ts, but only as `ReactionEffect` (Shield-style). No passive/worn variant. |
| Training override | Wearer counts as proficient regardless of class proficiency | `grant_proficiency` | Exists in v4 taxonomy (§9) but absent from types.ts surface. |

Both mechanics are tractable at the atom level. The blocker is the missing container.

---

## Gap 1 — Structural: no `magic_item` kind in `UnitRecord`

```typescript
// types.ts today
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `MagicItemRecord`. The v4 taxonomy defines `magic_item_root` as a source atom and `attune` as a procedure atom, but the schema layer never connected them to a `UnitRecord` variant. Every magic item hits this wall before any atom-level question can be asked.

**Proposed addition:**

```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly requiresAttunement: boolean;
  readonly mechanics: MagicItemMechanics;
};

export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord | MagicItemRecord;
```

---

## Gap 2 — Structural: no `passive_property` mechanics family

All existing mechanics families require an active trigger:
- `activation` (class feature) — action or bonus action cost
- `on_hit_trigger` (mastery) — weapon-hit rider
- Spell families — action/bonus action/reaction cast

Elven Chain's effects fire continuously while worn. No activation, no use-count, no trigger. A new family is needed:

```typescript
// Proposed
export type PassivePropertyMechanics = {
  readonly family: "passive_property";
  readonly effects: ReadonlyArray<PassiveEffect>;
};
```

Where `PassiveEffect` covers:
- `modify_ac` (flat bonus while worn)
- `grant_proficiency` (armor training override)
- Future: `grant_resistance`, `modify_speed`, `grant_sense`, etc.

The tracer would emit: `magic_item_root → attune (if required) → persist → <effect atoms>`.

---

## Gap 3 — Surface: `modify_ac` only as `ReactionEffect`

`modify_ac` appears in types.ts as:

```typescript
export type ReactionEffect =
  | { readonly kind: "modify_ac"; readonly delta: number }
  | ...
```

This is a one-shot reaction-window effect (Shield: +5 AC until start of next turn). Elven Chain's +1 AC is a permanent addend while worn. The same atom name covers two mechanically distinct operations. A passive `modify_ac` variant (or a `PassiveEffect` wrapper) is needed.

---

## Gap 4 — Surface: `grant_proficiency` missing from types.ts

v4 taxonomy §9 lists `grant_proficiency` as an effect atom. It does not appear anywhere in types.ts. Elven Chain's training override is a canonical `grant_proficiency` — armor category, conditional (bypasses the normal prerequisite). This needs surface exposure.

---

## Recommended widening order

1. **Add `MagicItemRecord` and `magic_item` to `UnitRecord`** — structural prerequisite for all magic items.
2. **Add `passive_property` mechanics family** — covers the large class of always-on worn/attuned effects.
3. **Add `PassiveEffect` union** including passive `modify_ac` and `grant_proficiency` — these two atoms cover Elven Chain completely and are reused across many items (Cloak of Protection, Ring of Protection, Armor +1/+2/+3, etc.).
4. Wire `attune` procedure atom into the tracer for items requiring attunement (Elven Chain does not require attunement, so this is deferred).

Elven Chain is a clean pressure case: two well-understood, non-exotic effects, no DM agenda, no probabilistic mechanic. It is a good first target for the magic item structural pass.
