# Proposal: Widenings Required for Dwarven Plate

## Unit

**Dwarven Plate** — Armor (Half Plate or Plate), Very Rare  
SRD 5.2.1 § Magic-Items/Items-A-H#Dwarven Plate

## Outcome: `structural_widening`

The unit cannot be encoded. The primary gap is that `UnitRecord` in `types.ts` has no `magic_item` kind. Three additional surface/atom gaps follow.

---

## Gap 1 — No `MagicItemRecord` kind (structural)

`types.ts` defines:
```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

The taxonomy (`TAXONOMY_atoms_graph.md`) already includes `magic_item_root` as a source atom, but no corresponding record type or mechanics family exists in the surface. Every magic item validation pass in this survey hits this same root gap.

**Required addition:** `MagicItemRecord` added to `UnitRecord`, with appropriate mechanics families (see Gaps 2 and 3 below).

---

## Gap 2 — No `passive_while_worn` mechanics family (structural)

Dwarven Plate's first mechanic:
> *While wearing this armor, you gain a +2 bonus to Armor Class.*

This is a permanently active effect — no activation, no quota consumed, no use-count resource, no rest reset. The existing `ClassFeatureActivationMechanics` family (and its required `activationCost` + `resource` + `resetCadence` fields) cannot represent this honestly.

Magic items will routinely carry always-on passive properties. A `passive_while_equipped` (or `passive`) mechanics family is needed:

```typescript
// sketch only — not a proposal for exact shape
export type MagicItemPassiveMechanics = {
  readonly family: "passive_while_equipped";
  readonly effect: MagicItemPassiveEffect;
};
```

The `modify_ac` effect atom already exists in v4 and in `types.ts` (as a `ReactionEffect`), so the leaf effect can reuse it. The missing piece is the enclosing family.

---

## Gap 3 — No `reduce_forced_movement` effect atom (atom_widening)

Dwarven Plate's second mechanic:
> *if an effect moves you against your will along the ground, you can take a Reaction to reduce the distance you are moved by up to 10 feet.*

This reaction's effect is reducing the distance of an involuntary movement. No v4 atom covers this:

| Existing atom | What it does |
|---|---|
| `force_move` | *emits* forced displacement onto a target |
| `modify_speed` | changes a creature's movement speed |
| `modify_ac` | changes AC |

Reducing forced movement distance is a distinct mechanical operation — it intercepts an incoming displacement and decrements it. A new effect atom is needed:

```
reduce_forced_movement
  amount: DiceAmount or fixed-feet value
  axis: "ground" (Dwarven Plate restricts to ground movement)
```

This atom would appear in the effect inventory alongside `force_move`.

---

## Gap 4 — `ReactionTrigger` missing forced-movement variant (surface_widening)

The reaction trigger for this item is "moved against your will along the ground." The existing `ReactionTrigger` union covers:

```typescript
| { readonly kind: "hit_by_attack_roll" }
| { readonly kind: "targeted_by_named_spell"; readonly spellId: string }
| { readonly kind: "any_of"; readonly triggers: ReadonlyArray<ReactionTrigger> }
```

A new variant is needed:

```typescript
| { readonly kind: "moved_against_will"; readonly constraint?: "along_ground" }
```

The `constraint` field captures Dwarven Plate's "along the ground" restriction — aerial forced movement does not trigger it.

---

## Gap 5 — `attunement_slot` resource absent from `types.ts` (surface_widening)

Dwarven Plate is Very Rare and requires attunement. The v4 taxonomy lists `attunement_slot` as a resource atom, but it is not present in `types.ts`. Any `MagicItemRecord` family will need to express whether the item requires attunement (consuming one of the character's three attunement slots).

This gap is shared across all attunement-requiring magic items — it is not specific to Dwarven Plate but will surface in every attuned item encoding.

---

## Summary of proposed widenings

| # | Kind | Name | Priority |
|---|---|---|---|
| 1 | `new_subgraph` | `MagicItemRecord` + `magic_item` UnitRecord kind | Blocker |
| 2 | `new_subgraph` | `passive_while_equipped` mechanics family | Blocker |
| 3 | `new_atom` | `reduce_forced_movement` effect atom | Required for this unit |
| 4 | `new_variant` | `ReactionTrigger: moved_against_will` | Required for this unit |
| 5 | `new_variant` | `attunement_slot` resource in `types.ts` | Shared across attuned items |

Gaps 1–2 are shared across all magic items. Gaps 3–4 are specific to Dwarven Plate's forced-movement reaction. Gap 5 is shared across all attuned items.
