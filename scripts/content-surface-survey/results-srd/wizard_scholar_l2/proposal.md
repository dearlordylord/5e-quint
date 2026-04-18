# Proposal: wizard_scholar_l2 (Scholar, Wizard L2)

## Outcome: `surface_widening`

The unit encodes successfully (typechecks, tracer produces a clean graph) using:
- `passive` family
- `modify_roll_numeric` with `proficiency_bonus` delta on `ability_check`
- `skillFilter.choice` from `[arcana, history, investigation, medicine, nature, religion]`

Two surface gaps prevent a `clean` classification.

---

## Gap 1 — `SkillFilter.choice` has wrong timing semantics

### What the surface provides

```typescript
export type SkillFilter =
  | { readonly kind: "fixed"; readonly skills: ReadonlyNonEmptyArray<Skill> }
  | { readonly kind: "choice"; readonly options: ReadonlyNonEmptyArray<Skill> };
```

The `choice` variant is documented with Guidance as the pressure case: _"you choose a skill at cast time from any of the 18 SRD skills."_ The `choice` variant resolves once per activation of the carrying effect.

### What Scholar needs

Scholar's choice is a **build-time** (level-up) decision made exactly once when the character acquires the feature at Wizard level 2. The chosen skill is fixed for the character's lifetime; the effect always applies to that one skill. There is no "cast time" in a `passive` mechanic.

### Proposed widening

Add a timing discriminant to `SkillFilter.choice`, or introduce a parallel variant:

```typescript
export type SkillFilter =
  | { readonly kind: "fixed"; readonly skills: ReadonlyNonEmptyArray<Skill> }
  | {
      readonly kind: "choice";
      readonly options: ReadonlyNonEmptyArray<Skill>;
      // "cast_time" = resolved per activation (Guidance)
      // "build_time" = resolved once at feature/feat acquisition (Scholar, Expertise feats)
      readonly timing?: "cast_time" | "build_time";
    };
```

Or, paralleling how `CastTimeChoice<T>` already explicitly handles both build-time and cast-time choices for other type families, `SkillFilter` could be extended to use the same primitive:

```typescript
export type SkillFilter =
  | { readonly kind: "fixed"; readonly skills: ReadonlyNonEmptyArray<Skill> }
  | { readonly kind: "choice"; readonly options: ReadonlyNonEmptyArray<Skill> }        // cast-time (Guidance)
  | { readonly kind: "build_time_choice"; readonly options: ReadonlyNonEmptyArray<Skill> }; // build-time (Scholar)
```

**Other units that would use this**: Any SRD feature that grants Expertise at character-build time:
- Rogue's Expertise (L1, L5)
- Bard's Expertise (L2, L9)
- Ranger's expertise-granting subclass features
- The Skill Expert feat

---

## Gap 2 — Missing proficiency prerequisite constraint

### SRD text

> "Choose one of the following skills **in which you have proficiency**."

### What the surface provides

No mechanism exists to gate build-time skill choices to skills the character already has proficiency in. The current surface can only express the 6-option list; it cannot assert "the choice must be drawn from your current proficiencies."

### Proposed widening

A `requiresProficiency: true` flag on the `SkillFilter.build_time_choice` (or on the existing `choice` variant) could express this constraint:

```typescript
| {
    readonly kind: "build_time_choice";
    readonly options: ReadonlyNonEmptyArray<Skill>;
    readonly requiresProficiency?: true;  // only skills you already have proficiency in are valid
  }
```

This is a build-time validation concern (character builder / level-up UI), not a runtime combat concern. It could reasonably remain caller-owned rather than being encoded in the surface — but the gap is worth recording since Expertise is one of 5e's most common build-time skill interactions.

---

## Summary

| Gap | Kind | Urgency |
|-----|------|---------|
| `SkillFilter.choice` timing (cast vs build) | `surface_widening` | Medium — several Expertise-granting features will hit this |
| Proficiency prerequisite on skill choice | `surface_widening` | Low — caller-owned build validation, but frequently cited in RAW |

The current encoding is mechanically correct and produces a valid trace. The `surface_widening` classification reflects that `SkillFilter.choice` needs timing disambiguation before Expertise-granting features can be encoded without semantic leakage.
