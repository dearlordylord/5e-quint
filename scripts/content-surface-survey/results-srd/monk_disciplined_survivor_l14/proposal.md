# Proposal: Disciplined Survivor (Monk L14)

**Outcome:** `surface_widening`  
**Confidence:** high

## Unit Text

> Your physical and mental discipline grant you proficiency in all saving throws.
>
> Additionally, whenever you make a saving throw and fail, you can expend 1 Focus Point to reroll it, and you must use the new roll.

## Intended Shape

The unit maps naturally to `CompositeClassFeatureMechanics` with two parts:

1. **Passive part** — `PassiveMechanics` granting saving throw proficiency in all six abilities.
2. **Activated part** — `ActivatedAbilityMechanics` (or reaction-shaped) triggered by any failed saving throw, costing 1 Focus Point, applying a forced reroll of that save.

The composite family exists and is the correct shape. Both parts are blocked by missing surface pieces.

---

## Gap 1: `ProficiencyGrantSubject` missing saving throw variant

**Classification:** surface_widening (new variant of existing surface type)

`ProficiencyGrantSubject` currently covers:
```typescript
| { readonly kind: "skill"; readonly skill: Skill }
| { readonly kind: "weapon_category"; readonly category: WeaponProficiencyCategory }
| { readonly kind: "armor_category"; readonly category: ArmorTrainingCategory }
```

Saving throw proficiency is a first-class D&D mechanic (adding PB to a specific ability's save rolls). Multiple class features grant it for all six abilities (Paladin Aura of Protection grants Cha to saves, Monk Disciplined Survivor grants all-save proficiency). The v4 taxonomy `grant_proficiency` atom already exists; only the subject discriminant is missing.

**Proposed addition:**
```typescript
| { readonly kind: "saving_throw"; readonly ability: Ability }
```

For "all saving throws" — encode as six separate grants (one per ability) via `ProficiencyGrant.fixed` with a six-element proficiencies array, or add an `all_saving_throws` shorthand if the all-six pattern recurs frequently.

---

## Gap 2: `modify_roll_reroll` absent from `types.ts`

**Classification:** surface_widening (v4 atom exists in taxonomy, not in TS surface)

The v4 taxonomy lists `modify_roll_reroll` in Section 9 (Effect Atoms). It is not present in `types.ts`'s `EffectAtom` union. The mechanic is: after the d20 has been rolled and an outcome determined, the result can be discarded and re-rolled. "You must use the new roll" specifies keep-new semantics (Disadvantage-inverse, distinct from Advantage's keep-higher).

**Proposed addition to `EffectAtom`:**
```typescript
| {
    readonly kind: "modify_roll_reroll";
    readonly on: ReadonlyNonEmptyArray<RollKind>;
    readonly keepRoll: "new" | "higher" | "lower";
    // Optional count — absent = applies for the host effect's full active window
    readonly count?: number;
  }
```

For this unit: `on: ["saving_throw"]`, `keepRoll: "new"`, `count: 1` (one reroll per trigger).

---

## Gap 3: `ReactionTrigger` missing general failed-save trigger

**Classification:** surface_widening (new variant of existing surface type)

The existing `spell_save_outcome` trigger fires after a saving throw caused by a spell:
```typescript
| {
    readonly kind: "spell_save_outcome";
    readonly outcome: "success" | "failure";
    readonly spellLevelAtMost?: SpellLevel;
    readonly spellSchool?: SpellSchool;
    ...
  }
```

Disciplined Survivor triggers on **any** failed saving throw — not just spell-induced ones. Ability-check-DCs, creature abilities, environmental effects, and traps can all cause saving throws that this feature can reroll.

**Proposed addition to `ReactionTrigger`:**
```typescript
| {
    readonly kind: "failed_saving_throw";
    readonly ability?: ReadonlyNonEmptyArray<Ability>;  // narrow to specific abilities; absent = any
  }
```

This generalizes `spell_save_outcome` to any cause of a saving throw. A separate variant is cleaner than adding a `spellCause?: false` boolean to `spell_save_outcome`, which would make the spell-scoped filter fields nonsensical.

---

## Gap 4: Shared class resource pool (Focus Points)

**Classification:** surface_widening (possibly structural_widening)

Focus Points are a Monk class resource pool established at Level 2 (`Monk Discipline Points / Focus Points`) and shared across many Monk features (Flurry of Blows, Patient Defense, Step of the Wind, Stunning Strike, etc.). Every feature that references Focus Points would need to express "deduct from the character's existing Focus Point pool."

The current surface models each activated feature as owning its own resource (`ActivationResource` = `use_count | charge_pool`). There is no way to express "this feature does not own a resource; it draws from an existing named class pool." Encoding Focus Point cost by declaring a new per-feature `charge_pool` would be dishonest: it would imply each Monk feature has an independent charge pool rather than one shared pool that depletes across all features simultaneously.

**Proposed addition:**

A `shared_class_resource_reference` activation resource variant:
```typescript
| {
    readonly kind: "class_resource";
    readonly resourceId: string;  // e.g., "monk_focus_points"
    readonly cost: number;        // how many points/uses this activation costs
  }
```

The resource pool itself would be declared once on the feature that establishes it (e.g., `monk_focus_l2`) and referenced by all downstream features. The tracer would emit a `use_count` or `charge` resource node labeled with the `resourceId` and wire it as `consumes`.

This gap is wider than Gaps 1–3 because it requires a cross-feature referencing mechanism, not just a new type variant within an isolated field. The deepest fix is a `class_resource` kind on `ActivationResource` plus a declaration site on the establishing feature. It is recorded as surface_widening rather than structural_widening because the v4 atom inventory (`charge`, `use_count`) already covers shared pools conceptually — the gap is in the TS surface's lack of a reference-vs-declaration distinction.

---

## Summary

| Gap | Classification | Blocking Part |
|-----|---------------|---------------|
| `ProficiencyGrantSubject.saving_throw` variant | surface_widening | Passive part |
| `modify_roll_reroll` effect atom | surface_widening | Activated part |
| `ReactionTrigger.failed_saving_throw` variant | surface_widening | Activated part |
| Shared Focus Point pool reference | surface_widening | Activated part |

No dhall/json/trace authored. Encoding without these widenings would require inventing false structures for all four gaps.
