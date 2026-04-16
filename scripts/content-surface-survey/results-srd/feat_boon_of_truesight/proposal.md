# Proposal: feat_boon_of_truesight

## Outcome: `structural_widening`

Boon of Truesight cannot be encoded. The blocker is at the `UnitRecord` level — no `feat` kind exists — and both individual mechanics also lack surface types.

---

## Gap 1 — Missing `FeatRecord` / feat mechanics family (structural)

`UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord`. There is no `FeatRecord`.

The v4 taxonomy defines `feat_root` as a source atom, but nothing in `types.ts` gives feats a payload family or mechanics header. The tracer's top-level `switch (unit.kind)` would throw `unhandled unit kind: feat` immediately.

### Minimum shape needed

```typescript
export type FeatRecord = UnitMetadata & {
  readonly kind: "feat";
  readonly mechanics: FeatMechanics;
};
```

Where `FeatMechanics` is a union of feat payload families (at minimum a `passive_grant` family for always-on sense/stat riders).

---

## Gap 2 — Missing `grant_sense` surface type (surface_widening)

Truesight is a special sense. The v4 atom `grant_sense` exists, but there is no corresponding surface type in `types.ts` to carry:
- the sense kind (darkvision / truesight / blindsight / tremorsense)
- the range in feet
- whether the grant is permanent (feat / species trait) or timed (spell)

### Minimum shape needed

```typescript
export type SenseKind = "darkvision" | "truesight" | "blindsight" | "tremorsense";

export type GrantSenseEffect = {
  readonly kind: "grant_sense";
  readonly sense: SenseKind;
  readonly rangeFeet: number;
};
```

This also unblocks species traits like Dragonborn Darkvision and Elf Darkvision which share the same mechanic.

---

## Gap 3 — Missing `ability_score_increase` surface type (atom_widening / deferred)

The Ability Score Increase rider (`+1 to a chosen ability score, max 30`) is common to all Epic Boon feats and to the Ability Score Improvement feat. The v4 taxonomy explicitly defers `modify_ability_score` as "out-of-scope for the core mechanics graph" — it is treated as pre-runtime character state rather than a runtime effect.

Two options:
1. **Keep deferred** — document that feat ASI is out-of-scope for the surface; the feat record carries it as uninterpreted metadata.
2. **Promote** — add a `modify_ability_score` effect atom and surface type if feat records are introduced and ASI needs tracing (e.g., to verify the max-30 cap constraint).

Given the current taxonomy posture, option 1 is appropriate. The `grant_sense` half is the mechanically interesting part for feat encoding.

---

## Summary of required widenings (ordered by dependency)

| Priority | Kind | Name | Blocks |
|---|---|---|---|
| 1 | `new_subgraph` | `FeatRecord` + `FeatMechanics` | Everything feat-shaped |
| 2 | `new_variant` | `GrantSenseEffect` surface type | Truesight (this feat), Darkvision (species), Blindsight |
| 3 | `deferred` | `modify_ability_score` | ASI on feats / species (currently out-of-scope) |
