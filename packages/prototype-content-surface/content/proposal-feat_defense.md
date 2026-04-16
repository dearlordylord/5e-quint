# Proposal: Widenings Required for Defense (feat_defense)

## Unit

**Defense** — Fighting Style Feat  
*While you're wearing Light, Medium, or Heavy armor, you gain a +1 bonus to Armor Class.*

## Outcome: `structural_widening`

Three gaps prevent encoding, all structural.

---

## Gap 1 — No `FeatRecord` kind in `UnitRecord`

`types.ts` defines:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

`feat_root` exists in the v4 atom taxonomy (§1 Source Atoms), but there is no corresponding `FeatRecord` surface type and no `"feat"` discriminant in `UnitRecord`. Every feat in the survey queue will hit this gap.

**Required widening:** Add `FeatRecord` to `UnitRecord` with at minimum:
- `kind: "feat"`
- `acquiredAtLevel?: number` (for Fighting Style Feat, this is a prerequisite, not a level)
- `prerequisite?: string` (Fighting Style Feature)
- `mechanics: FeatMechanics`

---

## Gap 2 — No passive AC-modifier effect in any existing family

`ClassFeatureEffect` is:

```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

`modify_ac` exists as a `ReactionEffect` (used by Shield spell), but that shape is tied to the `triggered_reaction` spell family — it fires on a reaction trigger, commits through Prepare/Prompt/Commit, and interrupts the trigger. None of that applies here.

Defense is a **passive, always-on** bonus. It has no activation cost, no use-count resource, no reset cadence — it is a permanent character-state modifier that persists as long as the prerequisite equipment condition holds.

**Required widening:** A new `ClassFeatureEffect` variant (or a new `FeatMechanics` family) with a passive-modifier shape:

```typescript
// Candidate shape
export type PassiveAcModifierEffect = {
  readonly kind: "modify_ac";
  readonly delta: number;                      // +1
  readonly condition?: EquipmentCondition;     // see Gap 3
};
```

This also implies a new or extended `FeatMechanics` family — something like `passive_modifier` — since there is no activation cost, resource, or reset cadence to model. Forcing Defense into `ClassFeatureActivationMechanics` would require fabricating a `free` activation cost and a nonsensical `use_count` resource, producing a false trace.

---

## Gap 3 — No equipment-state predicate

The AC bonus is conditional: *while wearing Light, Medium, or Heavy armor*. There is no existing surface type for an equipment-state precondition. The closest existing atoms are `attachment` atoms (`self`, `target`, `area`, `mark`, etc.) — none of which model "worn item category."

**Required widening:** A closed predicate type for equipment conditions:

```typescript
export type EquipmentCondition =
  | { readonly kind: "wearing_armor"; readonly categories: ReadonlyArray<"light" | "medium" | "heavy"> };
  // future: "wielding_weapon_with_property", "not_wearing_armor", etc.
```

This predicate would serve as an optional `condition` on passive effects, allowing the engine to evaluate it at runtime without modeling each armor category as a separate attachment.

---

## Atom inventory check

`modify_ac` is already in the v4 atom inventory (§9 Effect Atoms). No new atom is needed — only new surface variants to carry it in a passive/feat context. The missing pieces are surface types (FeatRecord, passive effect variant, equipment predicate), not taxonomy atoms.

---

## Summary table

| Gap | Kind | Name | Blocks encoding? |
|---|---|---|---|
| No FeatRecord in UnitRecord | `new_subgraph` | `FeatRecord` / `feat` kind | Yes — unit kind rejected immediately |
| No passive modify_ac effect | `new_variant` | `PassiveAcModifierEffect` / `passive_modifier` family | Yes — no honest mechanics shape |
| No equipment-state predicate | `new_variant` | `EquipmentCondition` | Yes — precondition unrepresentable |

All three gaps must land together. Defense is a minimal, clean test case — one numeric delta, one armor filter, no resource, no activation. Once these three widenings exist, Defense should encode as a one-node passive effect with a single equipment predicate attached.
