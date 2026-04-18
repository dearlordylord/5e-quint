# Proposal: Shapechange surface widenings

## Unit
- **Slug**: shapechange
- **Kind**: spell (level 9, transmutation, concentration 1h)
- **Outcome**: `surface_widening`

## Summary

Shapechange is a polymorph-family spell targeting the caster (`self`). The correct payload family is `ongoing_effect` with a `direct` phase applying `transform_target` on a `self` attachment, with `tempHpFromForm: true`. The tracer path is sound. However, three variants of existing surface types are missing.

---

## Widening 1: `PolymorphFormSource` — open creature type with exclusions

### RAW text
> "it can't be a Construct or an Undead"

### Current surface
```typescript
export type PolymorphFormSource = {
  readonly kind: "catalog_ref";
  readonly creatureType: CreatureType;       // single type only
  readonly crBound: ...;
};
```

### Problem
`creatureType: CreatureType` forces authoring to name exactly one creature type. Shapechange allows transformation into **any** creature type except Construct and Undead — an open set with two exclusions. There is no way to express this without picking an arbitrary single type (which would be dishonest).

### Proposed extension
Add a second variant to `PolymorphFormSource`:

```typescript
export type PolymorphFormSource =
  | {
      readonly kind: "catalog_ref";
      readonly creatureType: CreatureType;
      readonly crBound: ...;
    }
  | {
      readonly kind: "catalog_ref_any_except";
      readonly excludedTypes: ReadonlyNonEmptyArray<CreatureType>;
      readonly crBound: ...;
    };
```

Shapechange would use `catalog_ref_any_except` with `excludedTypes: ["construct", "undead"]`.

---

## Widening 2: `PolymorphRetainedField` — `"proficiencies"` and `"spellcasting_feature"`

### RAW text
> "you retain your…proficiencies…If you have the Spellcasting feature, you retain it too."

### Current surface
```typescript
export type PolymorphRetainedField =
  | "alignment" | "personality" | "creature_type"
  | "hit_points" | "hit_point_dice"
  | "intelligence" | "wisdom" | "charisma"
  | "skill_proficiencies" | "languages";
```

### Problem
- `"skill_proficiencies"` covers only skill proficiencies. Shapechange retains **all** proficiencies: weapon, armor, saving throw, and skill. A broader `"proficiencies"` variant is needed.
- `"spellcasting_feature"` does not exist. Shapechange uniquely retains the ability to use spells in the new form — a key distinguishing mechanic vs. Polymorph.

### Proposed extension
Add two variants to `PolymorphRetainedField`:

```typescript
| "proficiencies"          // all proficiencies (weapon, armor, saving throw, skill)
| "spellcasting_feature"   // retain spellcasting even in new form
```

---

## Widening 3: `transform_target` — `midDurationSwitchAs` for open-catalog re-form

### RAW text
> "until you take a Magic action to shape-shift into a different eligible form"

### Current surface
`CastTimeEffectModeChoice` has `allowsMidDurationSwitchAs?: "magic_action"` but this only models switching among **predefined authored options** (e.g., Alter Self's three named modes). It cannot express open-catalog re-selection.

`transform_target` has no mid-duration switch field at all.

### Proposed extension
Add an optional field to `transform_target`:

```typescript
| {
    readonly kind: "transform_target";
    readonly newForm: PolymorphFormSource;
    readonly retainedFields: ReadonlyNonEmptyArray<PolymorphRetainedField>;
    readonly tempHpFromForm?: true;
    readonly actionRestriction?: PolymorphActionRestriction;
    readonly revertTriggers: ReadonlyNonEmptyArray<PolymorphRevertTrigger>;
    readonly midDurationSwitchAs?: "magic_action";  // NEW: open-catalog re-form
  }
```

When present, the bearer may spend a Magic action to re-invoke the full form-selection from the same `PolymorphFormSource` constraints, replacing the current form.

**Note**: This is distinct from `CastTimeEffectModeChoice.allowsMidDurationSwitchAs` because it is not switching among predefined authored branches — it is re-running the open-catalog selection.

---

## DM-agenda items (not modeled, correctly omitted)

- **"must have seen the creature before"** — eligibility tracking is DM context; no deterministic mechanical resolution.
- **Equipment handling** — "drops to the ground or changes in size and shape to fit" is a player/DM choice at shift time; not a mechanical atom.
- **THP from first form only** — the `tempHpFromForm: true` flag fires at initial cast; subsequent re-forms per the mid-duration switch do not re-grant THP (SRD text: "equal to the Hit Points of the **first** form"). This nuance may need a `tempHpFromFormOnce?: true` clarification if re-form THP confusion becomes a problem in future content.

---

## What a clean encoding would look like (after widenings applied)

```dhall
{ kind = "spell"
, id = "shapechange"
, name = "Shapechange"
, provenance = { kind = "srd-5.2.1", section = "Spells/Descriptions-S#Shapechange" }
, description = "..."
, mechanics =
    { family = "ongoing_effect"
    , level = 9
    , school = "transmutation"
    , castingTime = { kind = "action" }
    , range = { kind = "self" }
    , components = { v = True, s = True, m = Some "a jade circlet worth 1,500+ GP", materialCostGp = Some 1500 }
    , duration = { kind = "concentration", upTo = { unit = "hour", amount = 1 } }
    , attachment = { kind = "self" }
    , operations =
        [ { trigger = { kind = "passive" }
          , effect =
              { kind = "transform_target"
              , newForm =
                  { kind = "catalog_ref_any_except"         -- WIDENING 1
                  , excludedTypes = [ "construct", "undead" ]
                  , crBound = { kind = "caster_level" }
                  }
              , retainedFields =
                  [ "creature_type", "alignment", "personality"
                  , "intelligence", "wisdom", "charisma"
                  , "hit_points", "hit_point_dice"
                  , "proficiencies"                         -- WIDENING 2a
                  , "languages"
                  , "spellcasting_feature"                  -- WIDENING 2b
                  ]
              , tempHpFromForm = True
              , revertTriggers = [ { kind = "spell_ends" }, { kind = "zero_hp" } ]
              , midDurationSwitchAs = Some "magic_action"   -- WIDENING 3
              }
          }
        ]
    }
}
```
