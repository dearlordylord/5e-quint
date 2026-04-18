# Proposal: surface_widening for Ranger Expertise L9

## Unit

- **Slug**: `ranger_expertise_l9`
- **Kind**: `class_feature`
- **SRD text**: "Choose two of your skill proficiencies with which you lack Expertise. You gain Expertise in those skills."

## Family fit

The unit maps cleanly to `class_feature` + `passive` mechanics. The grants list is always-on once acquired at level 9. No activation cost, no use count, no reset cadence.

## Gaps

### 1. No expertise tier in `ProficiencyGrantSubject`

`grant_proficiency` is the natural atom for this unit. However, `ProficiencyGrantSubject` only models _regular_ proficiency in a skill:

```typescript
| { readonly kind: "skill"; readonly skill: Skill }
```

Expertise is mechanically distinct — it doubles the proficiency bonus on ability checks rather than adding it once. It cannot be expressed as a `modify_roll_numeric` on `ability_check` either, because:
- the bonus is PB (not a fixed dice delta), and
- `modify_roll_numeric` with `kind: "proficiency_bonus"` would add PB on top of an existing PB, which is mathematically equivalent, but semantically wrong: expertise is a _character sheet state_ (the doubled-PB flag), not a persistent roll rider.

**Proposed widening**: Add an expertise level to `ProficiencyGrantSubject`:

```typescript
| { readonly kind: "skill_expertise"; readonly skill: Skill }
```

Or equivalently, add a `level` discriminant to the existing `skill` variant:

```typescript
| { readonly kind: "skill"; readonly skill: Skill; readonly level?: "expertise" }
```

Either form is sufficient. The former is cleaner for exhaustive matching.

### 2. No character-state-dependent choice in `ProficiencyGrant`

The current `ProficiencyGrant.choice` variant requires a static `options` list:

```typescript
| {
    readonly kind: "choice";
    readonly count: number;
    readonly options: ReadonlyNonEmptyArray<ProficiencyGrantSubject>;
  }
```

Ranger Expertise L9 restricts the eligible options to "skill proficiencies you already have but lack Expertise in." This is character-state-dependent at build time — no static list can be authored in the content file.

**Proposed widening**: Add a new choice mode that expresses dynamic eligibility:

```typescript
| {
    readonly kind: "choice_from_existing";
    readonly count: number;
    readonly existingKind: "skill_proficiencies";
    readonly restriction?: "lacking_expertise";
  }
```

This parallels the `ProficiencyGrant.choice` shape but defers option resolution to character advancement time rather than content-authoring time.

## Scope

Both widenings are variants of the existing `ProficiencyGrant` / `ProficiencyGrantSubject` surface types. No new v4 taxonomy atoms are required — `grant_proficiency` covers the concept; the schema just needs finer resolution within that atom's payload.

## Similar units that will need the same widening

- `rogue_expertise_l1` / `rogue_expertise_l6` — same "choose from proficient skills" pattern
- `bard_expertise_l2` / `bard_expertise_l10` — same
- Any other class or feat granting Expertise (e.g., Skill Expert feat's expertise grant)
