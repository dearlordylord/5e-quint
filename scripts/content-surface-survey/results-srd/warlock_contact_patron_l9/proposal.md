# Proposal: Contact Patron (warlock L9)

## Outcome: `surface_widening`

The unit's mechanics require three new variants of existing surface types. No new v4 atoms or structural families are forced — the gaps are entirely within `ClassFeatureEffect`.

---

## What the rule says

```
you always have the Contact Other Plane spell prepared. With this feature,
you can cast the spell without expending a spell slot to contact your
patron, and you automatically succeed on the spell's saving throw.
Once you cast the spell with this feature, you can't do so in this way
again until you finish a Long Rest.
```

The rule has two mechanically distinct parts:

1. **Permanent**: Contact Other Plane is always prepared (passive, no use-count).
2. **Once per Long Rest**: Cast it free (no slot), auto-succeed on the spell's INT saving throw.

---

## Why it does not fit

`ClassFeatureEffect` is defined as:

```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

None of the three required effect shapes exist:

### Gap 1 — `grant_spell_access` as a `ClassFeatureEffect` variant

The v4 taxonomy includes `grant_spell_access` as an effect atom. It is used elsewhere in the system (e.g., Eldritch Invocations granting spells). The surface type needs a corresponding `ClassFeatureEffect` variant:

```typescript
export type GrantSpellAccessEffect = {
  readonly kind: "grant_spell_access";
  readonly spellId: string;
  readonly prepared: "always";
};
```

Evidence: *"you always have the Contact Other Plane spell prepared"*

### Gap 2 — `grant_free_spell_cast` as a `ClassFeatureEffect` variant

The feature's once-per-long-rest activation triggers a slot-free cast of a named spell. No `ClassFeatureEffect` variant models this. A possible shape:

```typescript
export type GrantFreeSpellCastEffect = {
  readonly kind: "grant_free_spell_cast";
  readonly spellId: string;
  // modifiers on the triggered cast go here (e.g. save overrides)
};
```

Evidence: *"you can cast the spell without expending a spell slot"*

### Gap 3 — save auto-succeed modifier on the triggered cast

When cast via this feature, the caster automatically succeeds on Contact Other Plane's DC 10 INT save (which normally causes a form of madness on failure). The closest v4 atom is `modify_roll_substitute`, but no surface shape exists for an "auto-succeed" override on a specific spell's cast-time saving throw within a class feature context.

This modifier would naturally nest inside `GrantFreeSpellCastEffect` (Gap 2). It needs a new `CastTimeModifier` surface concept:

```typescript
export type SaveAutoSucceed = {
  readonly kind: "save_auto_succeed";
  readonly ability: Ability;  // "int" for Contact Other Plane
};
```

Evidence: *"you automatically succeed on the spell's saving throw"*

---

## Additional structural note

The current `ClassFeatureMechanics` (activation family) binds a single `effect` field:

```typescript
export type ClassFeatureActivationMechanics = ClassFeatureMechanicsHeader & {
  readonly family: "activation";
  readonly effect: ClassFeatureEffect;  // single effect only
};
```

Contact Patron has two logically distinct sub-effects:
- A permanent passive (always-prepared — no use_count)
- A once-per-long-rest active (free cast + auto-succeed)

These cannot be collapsed into a single effect without losing information. A future widening of `ClassFeatureMechanics` may need a `effects: ReadonlyArray<ClassFeatureEffect>` or a separate `passiveEffects` field. This is noted but not promoted as a required widening here — it depends on how the grant_spell_access permanent benefit is modeled (it could live on the feature header rather than the activation).

---

## Summary table

| # | Shape needed | Widening kind | v4 atom | Blocker |
|---|---|---|---|---|
| 1 | `grant_spell_access` in `ClassFeatureEffect` | `new_variant` | exists (`grant_spell_access`) | ClassFeatureEffect missing it |
| 2 | `grant_free_spell_cast` in `ClassFeatureEffect` | `new_variant` | no direct match | new shape needed |
| 3 | `save_auto_succeed` modifier on triggered cast | `new_variant` | `modify_roll_substitute` (partial) | no cast-time modifier surface shape |
