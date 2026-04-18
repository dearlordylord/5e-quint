# Proposal: Reliable Talent (Rogue L7)

## Unit

**SRD text**: "Whenever you make an ability check that uses one of your skill or tool proficiencies, you can treat a d20 roll of 9 or lower as a 10."

## Why it doesn't fit cleanly

The outer structure is fine: `class_feature` + `passive` family with a single `grants` entry. The problem is the effect atom — the mechanic is a **d20 floor**, not an additive bonus:

- `modify_roll_numeric` — additive delta (+N). Cannot express "minimum 10".
- `modify_roll_advantage` — advantage/disadvantage. Not this.
- No other existing `EffectAtom` variant models threshold-based substitution.

## Gap 1: `modify_roll_substitute` atom

The v4 taxonomy (TAXONOMY_atoms_graph.md, section 9 Effect Atoms) already names `modify_roll_substitute`. It is absent from `types.ts`.

Proposed addition to `EffectAtom`:

```typescript
| {
    readonly kind: "modify_roll_substitute";
    readonly on: ReadonlyNonEmptyArray<RollKind>;
    // If the raw d20 result is <= threshold, treat it as floor_value instead.
    readonly threshold: number;
    readonly floor_value: number;
    readonly skillFilter?: SkillFilter;
  }
```

RAW text maps directly: `threshold = 9`, `floor_value = 10`, `on = ["ability_check"]`.

This atom would also be reusable for similar RAW features (e.g., Bard's Peerless Skill if added to a future campaign source).

## Gap 2: `SkillFilter.proficient` variant

Reliable Talent applies to "any ability check using one of your skill or tool proficiencies." The current `SkillFilter` union:

```typescript
type SkillFilter =
  | { kind: "fixed"; skills: ReadonlyNonEmptyArray<Skill> }
  | { kind: "choice"; options: ReadonlyNonEmptyArray<Skill> };
```

Neither variant can express "the check uses a skill/tool the character is proficient in at runtime." A new variant is needed:

```typescript
| { kind: "proficient" }   // applies when the check uses any skill/tool proficiency the character holds
```

This is distinct from listing skills by name — it defers to the character's actual proficiency set, which is runtime state. The authored unit should not need to enumerate all possible skills the rogue might have.

Note: tool proficiency is a separate concern from skill proficiency. If the surface already models tool proficiencies as a distinct category (via `ProficiencyGrantSubject.kind = "weapon_category"` for weapons, and `armor_category` for armor), a `SkillFilter.proficient` covering both skills and tools may need a `scope` field. At minimum, the simplest valid form — `{ kind: "proficient" }` meaning "any skill or tool check you're proficient in" — covers Reliable Talent.

## Proposed encoding (once both gaps are filled)

```dhall
{ kind = "class_feature"
, id = "rogue_reliable_talent"
, name = "Reliable Talent"
, className = "rogue"
, acquiredAtLevel = 7
, provenance = { kind = "srd-5.2.1", section = "Classes/Rogue#Reliable Talent" }
, description = "Whenever you make an ability check that uses one of your skill or tool proficiencies, you can treat a d20 roll of 9 or lower as a 10."
, mechanics =
    { family = "passive"
    , grants =
        [ { kind = "modify_roll_substitute"
          , on = [ "ability_check" ]
          , threshold = 9
          , floor_value = 10
          , skillFilter = { kind = "proficient" }
          }
        ]
    }
}
```

## Classification

`surface_widening` — both gaps correspond to surface-level additions:

1. `modify_roll_substitute` is a named v4 atom not yet in `types.ts`.
2. `SkillFilter.proficient` is a new variant of an existing surface type.

No new top-level family is needed. No new v4 taxonomy atom beyond what is already named in the taxonomy.
