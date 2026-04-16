# Proposal: Wild Companion (druid L2)

**Outcome:** `structural_widening`  
**Provenance:** SRD 5.2.1 — Classes/Druid#Level 2: Wild Companion

---

## Unit text

> As a Magic action, you can expend a spell slot or a use of Wild Shape to cast the *Find Familiar* spell without Material components.
>
> When you cast the spell in this way, the familiar is Fey and disappears when you finish a Long Rest.

---

## Why it does not fit

The unit is a `class_feature` with `family: "activation"` — that family exists. But three independent gaps in the surface prevent honest encoding.

### Gap 1 — `ClassFeatureActivationCost` missing `"action"` variant

The feature costs a Magic action, one of the 12 standard action kinds. `ClassFeatureActivationCost` only allows:

```typescript
| { readonly kind: "free" }
| { readonly kind: "bonus_action" }
```

A Magic action is neither. Required new variant: `{ readonly kind: "action"; readonly actionKind: StandardActionKind }` or at minimum `{ readonly kind: "magic_action" }`.

### Gap 2 — Disjunctive cross-pool resource

The druid chooses to spend **either** a spell slot **or** a Wild Shape use. These are two distinct resource pools managed by different features:

- Spell slots are `spell_slot` atoms tracked by the spellcasting feature.
- Wild Shape uses are a `use_count` resource belonging to the Wild Shape feature.

`UseCountResource` models a single homogeneous pool with a cap:

```typescript
export type UseCountResource = {
  readonly kind: "use_count";
  readonly cap: UseCountCap;
};
```

There is no way to say "consume from pool A *or* pool B, druid's choice." This requires a new resource shape — e.g.:

```typescript
export type DisjunctiveResource =
  | { readonly kind: "spell_slot"; readonly minLevel?: number }
  | { readonly kind: "feature_use_count"; readonly featureId: string };

export type AlternativeResource = {
  readonly kind: "any_of";
  readonly options: ReadonlyArray<DisjunctiveResource>;
};
```

This is the primary structural gap: neither `UseCountResource` nor any other existing surface type can represent it.

### Gap 3 — `ClassFeatureEffect` missing `invoke_spell` variant with overrides

The effect is casting a named spell (*Find Familiar*) with three parameter overrides:

1. **No material components** — the `m` component is waived.
2. **Familiar type forced to Fey** — regardless of what Find Familiar normally permits.
3. **Duration capped at Long Rest** — the familiar disappears on Long Rest, not when dispelled or killed.

`ClassFeatureEffect` is:

```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

Neither member can represent casting a spell. A new variant is required, and it must carry at minimum:

- a `spellId` reference (`"find_familiar"`);
- an optional `componentOverrides` (waive material);
- an optional `summonedCreatureTypeOverride` (force Fey);
- an optional `durationOverride` (expire on Long Rest).

v4 atom `grant_spell_access` exists in the taxonomy but is not present in `ClassFeatureEffect`. Even if it were added, the parameter-override sub-shapes would need to be specified.

---

## Proposed widening summary

| # | Kind | Name | Trigger |
|---|------|------|---------|
| 1 | `new_variant` | `ClassFeatureActivationCost.action` | Magic action activation |
| 2 | `new_subgraph` | `disjunctive_resource` | Spell slot OR Wild Shape use |
| 3 | `new_variant` | `ClassFeatureEffect.invoke_spell` | Cast Find Familiar as effect |
| 4 | `new_variant` | `invoke_spell.creature_type_override` | Familiar forced to Fey |
| 5 | `new_variant` | `invoke_spell.duration_cap` | Disappears at Long Rest |

---

## Notes on scope

Gaps 1 and 3 are surface widenings in isolation (new variants of existing types). Gap 2 is the structural gap: a disjunctive "either pool A or pool B" resource model has no ancestor shape in the current surface and would need a new type family. All three must be addressed together to honestly encode this feature.

The `invoke_spell` effect pattern (a class feature that casts a named spell with modified parameters) is likely to recur — Paladin's Faithful Steed, Ranger's Beast features, and similar "summon via cast" features share the same shape. Designing this as a reusable sub-family rather than a one-off override struct is recommended.
