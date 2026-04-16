# Proposal: Widenings Required for Reincarnate

**Unit:** Reincarnate (spell, level 5, necromancy, SRD 5.2.1)  
**Outcome:** `atom_widening`

## What fits

- **Family:** `activation` is the right shape — Reincarnate is instantaneous and one-shot.
- **Casting time:** `CastingTime.minutes` with `amount: 60, ritual: false` covers the 1-hour cast.
- **Range:** `{ kind: "touch" }` ✓
- **Duration:** `{ kind: "instantaneous" }` ✓
- **Components:** `v: true, s: true, m: "rare oils worth 1,000+ GP, which the spell consumes"` — fits the `m: string` field. (Minor: no `consume` flag on `Components`; see below.)

## Atom gaps (blocking)

### 1. `restore_life` — new v4 atom needed

**Category:** effect  
**Justification:** Reincarnate restores a dead creature to life. The existing `heal` atom restores hit points; it cannot represent resurrection. The target is not merely at 0 HP — it is dead, and the spell calls the soul back into a new body. This is a mechanically distinct operation from HP healing.

**Evidence:** *"the spell forms a new body for it and calls the soul to enter that body"*

**Sketch:**
```
restore_life {
  target: creature (dead, ≤ N days)
  result: creature is alive (at 1 HP or per spell, in new body)
}
```

### 2. `replace_species_traits` — new v4 atom needed

**Category:** effect  
**Justification:** Reincarnate permanently replaces the target's species traits. The new species is determined by a 1d10 table roll (or DM choice). No v4 atom covers permanent species-trait replacement on a creature. `alter_item_kind` is the closest structural analog but applies to items, not creature species. This is a distinct operation: strip all traits from species A, install all traits from species B.

**Evidence:** *"it loses the traits of its previous species and gains the traits of its new one"*

**Sketch:**
```
replace_species_traits {
  from: previous_species (implicit, on target)
  to: new_species (chosen by table roll or DM)
}
```

**Note on species selection:** The 1d10 roll and the DM's option to substitute another playable species introduce non-determinism at the selection step. The mechanical consequences of the selected species are deterministic. This is not classified as `dm_agenda` — the mechanical effect (trait swap) has a clear deterministic structure once species is known. The table roll could be modeled as a `choose` procedure atom if needed, but that is a secondary concern.

## Surface gap (non-blocking, subordinate)

### 3. `ActivationPhase.unconditional` — new surface variant

**Justification:** Even with new effect atoms, `ActivationPhase` currently requires either `attack_roll` or `save_gate` as its kind. Reincarnate has no attack roll and no saving throw — it fires directly on a valid target. An `unconditional` phase variant is needed:

```typescript
| {
    readonly kind: "unconditional";
    readonly attachment: Attachment;
    readonly effect: Effect;  // once Effect includes restore_life etc.
  }
```

This is a `surface_widening` subordinate to the atom gaps: without the effect atoms, even this variant would be inexpressible.

## Minor surface gap (non-blocking)

### 4. `Components.consume` — missing flag

`Components` has `m: false | string` but no flag for whether the material component is consumed. Reincarnate's rare oils (1,000+ GP) are consumed by the spell. For now the consume note is folded into the string. A `consume: boolean` field on `Components` could be added as a future surface widening.

## Encoding path once widenings land

1. Add `restore_life` and `replace_species_traits` to the v4 atom inventory and to `Effect` in `types.ts`.
2. Add `unconditional` variant to `ActivationPhase`.
3. Author `content/reincarnate.dhall` in the `activation` family with a single `unconditional` phase targeting the dead humanoid, granting `restore_life` + `replace_species_traits` effects.
