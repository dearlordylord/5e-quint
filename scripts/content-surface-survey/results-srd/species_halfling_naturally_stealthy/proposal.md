# Proposal: Naturally Stealthy (Halfling)

**Outcome:** `structural_widening`

---

## Unit

> ***Naturally Stealthy.*** You can take the Hide action even when you are obscured only by a creature that is at least one size larger than you.

---

## Gap 1 — Missing `SpeciesTraitRecord` kind (structural)

`UnitRecord` in `types.ts` is:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

`species_trait_root` exists in the v4 taxonomy atom inventory (§1 Source Atoms) but there is no corresponding `SpeciesTraitRecord` in the authored surface schema. This is the primary blocker: there is no valid JSON shape for any species trait.

### Proposed addition

```typescript
export type SpeciesTraitRecord = UnitMetadata & {
  readonly kind: "species_trait";
  readonly mechanics: SpeciesTraitMechanics;
};

export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord | SpeciesTraitRecord;
```

A `SpeciesTraitMechanics` union would need at minimum a `passive_modifier` family to handle traits like Naturally Stealthy, Darkvision, Halfling Nimbleness, Brave, etc.

---

## Gap 2 — Missing atom / family for passive action-eligibility expansion (atom-level)

The mechanic is:

- **Permanent** (no duration, no concentration, no expiry)
- **Passive** (no activation cost, no resource, no reset cadence)
- **Precondition modification** for an existing action (Hide)
- **Condition-specific:** only applies when the sole source of obscurement is a creature ≥ one size category larger than the halfling

None of the v4 effect atoms cover this shape:

| Candidate | Why it fails |
|---|---|
| `grant_extra_action` | Grants an additional action use, not a modified eligibility condition |
| `restrict_action_set` | Removes actions; there is no inverse "expand eligibility" variant |
| `modify_roll_advantage` | Modifies rolls, not preconditions |
| `grant_proficiency` | Grants proficiency, unrelated |

### Proposed new atom

**`expand_action_eligibility`** (effect category)

Represents a permanent passive modification to the set of circumstances under which a specific action (Hide, Dash, etc.) is legally available to the bearer. Carries:
- `action`: the `StandardActionKind` whose eligibility is expanded
- `condition`: a closed predicate describing the additional circumstance (e.g., `obscured_only_by_larger_creature`)

This is mechanically distinct from `grant_extra_action` (which grants an additional use of an action on a turn where it is already eligible) and from any activation-scoped effect.

---

## What a clean encoding would require

1. `SpeciesTraitRecord` added to `UnitRecord` with a `passive_modifier` family.
2. A `passive_modifier` mechanics shape that carries one or more passive effect atoms with no activation, resource, or reset fields.
3. The `expand_action_eligibility` atom (or equivalent) to represent the Hide precondition relaxation.

The creature-size constraint ("at least one size larger than you") is a filter predicate on the eligibility condition. It could be captured as a `condition` field on the atom with a closed enum value (e.g., `"obscured_by_larger_creature"`), widening similarly to how `AnchoredFilter` was introduced for Alarm.

---

## Notes

The other three Halfling traits encode cleanly against a `passive_modifier` family too:
- **Brave** → `modify_roll_advantage` on saving throws to avoid/end Frightened (already in v4)
- **Halfling Nimbleness** → movement rule modification (needs a new atom, probably `modify_movement_rule`)
- **Luck** → `modify_roll_reroll` on d20 rolls of 1 (already in v4, though the "must use new roll" detail needs a variant field)

All four traits share the structural gap (no `SpeciesTraitRecord`) and each has at least one atom-level gap, but Naturally Stealthy's gap is the most novel — it is the only one that modifies an action's eligibility precondition rather than a roll or movement rule.
