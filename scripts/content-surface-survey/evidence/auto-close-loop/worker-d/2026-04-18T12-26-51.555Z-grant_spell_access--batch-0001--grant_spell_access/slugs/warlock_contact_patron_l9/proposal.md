## Contact Patron

`Contact Patron` fits the existing `class_feature` + `passive` family for its
main payload:

- always have `Contact Other Plane` prepared
- one free cast per Long Rest

The remaining rider does not fit the current surface honestly:

- "you automatically succeed on the spell's saving throw"

This success override is scoped to casts made through this feature, not to the
spell globally. The current surface can model save-gate auto-success on the
spell definition itself (`ActivationPhase.save_gate.autoSuccessIfCasterSlotGte`)
and can grant access to a spell (`grant_spell_access`), but it cannot attach a
grant-specific resolution override to the granted cast.

### Proposed widening

- Kind: `new_variant`
- Name: `grant_spell_access.saveOverride`
- Why:
  The feature modifies the resolution of an existing spell only when cast
  through this feature's grant path.
- Evidence:
  "With this feature, you can cast the spell without expending a spell slot to
  contact your patron, and you automatically succeed on the spell's saving
  throw."

One honest shape would be a grant-local override such as:

```ts
type GrantedSpellSaveOverride =
  | { readonly kind: "auto_succeed_self_save" }
```

attached to `grant_spell_access`, so the prepared access remains ordinary while
the once-per-long-rest cast path carries the automatic success rider.
