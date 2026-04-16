# Proposal: surface_widening for Burning Hands

## Unit

- Slug: `burning_hands`
- Kind: `spell`
- Family: `activation`
- Phase: `save_gate` with `area / cone` attachment

---

## What Fits

Burning Hands maps cleanly to the `activation` family with a single `save_gate` phase:

| Field | Value |
|---|---|
| Casting time | `action` |
| Range | `{ kind: "self" }` |
| Area | `{ kind: "cone", lengthFeet: 15 }`, origin `point_within_range` |
| Save | `dex`, DC from `caster_spell_save_dc` |
| On fail | `damage`, fire, base 3d6, `linear_per_level` axis=slot +1d6/slot above 1 |
| On success | **"half as much damage" — cannot be expressed** |
| Duration | `instantaneous` |
| Components | V, S |

All atoms required exist in v4: `damage`, `save_gate`, `area`, `activate`, `spell_slot`, `scale_die_count`. The spell would be clean except for the `onSuccess` field.

---

## The Gap

### `half_damage_of_fail` — new variant of `EffectAtom`

**SRD text:** "taking 3d6 Fire damage on a failed save or half as much damage on a successful one"

"Half as much damage" is a **relative modifier** on the dice rolled for the fail branch, not an independent expression. It cannot be encoded as a `DiceAmount` because:

1. **Odd die counts are non-representable:** 3d6 / 2 = 1.5d6; 5d6 / 2 = 2.5d6. Neither is a valid dice expression.
2. **Any fixed approximation is wrong:**
   - Slot 1: expected fail = 10.5; expected half = 5.25. Nearest dice: 1d6 (exp 3.5) — off by 33%.
   - Slot 3: expected fail = 17.5; expected half = 8.75. Nearest dice: 2d6 (exp 7.0) — off by 20%.
3. **The approximation error is non-uniform across slot levels**, so no single `linear_per_level` formula can shadow the fail-branch scaling with consistent accuracy.

Encoding a wrong dice value in `onSuccess` would produce a misleading trace and misrepresent the spell's mechanical distribution. Per the guardrails, a misleading trace is worse than no trace.

### Proposed Shape

**Option A — sentinel `EffectAtom` variant (preferred):**

```typescript
// In EffectAtom union:
| { readonly kind: "half_damage_of_fail" }
```

This sentinel references the `onFail` damage branch and halves the result (rounding down per SRD). The tracer emits a `damage` node labeled "half of fail" and edges it to the same attachment. No additional parameters are needed.

**Option B — flag on `save_gate` activation phase:**

```typescript
| {
    readonly kind: "save_gate";
    readonly attachment: Attachment;
    readonly ability: Ability;
    readonly dc: DcSource;
    readonly onFail: EffectAtom;
    readonly onSuccess: EffectAtom;
    readonly saveHalvesDamage?: boolean;  // new optional field
  }
```

When `saveHalvesDamage` is true, `onSuccess` carries the `none` sentinel and the tracer infers the half-damage edge from `onFail`. This avoids changing `EffectAtom` but couples halving semantics into the phase type rather than the effect type.

Option A is preferable: it keeps the `onFail`/`onSuccess` symmetry, composes naturally with other effects on the same branch, and doesn't pollute the phase type with a damage-specific flag.

---

## Downstream Units Sharing This Gap

"Half damage on save" is one of the most common patterns in D&D area-of-effect spells. Confirmed examples in the SRD survey corpus that share this exact gap:

- Fireball (save for half — 8d6 fire)
- Thunderwave (save for half — 2d8 thunder)
- Cone of Cold (save for half — 8d8 cold)
- Lightning Bolt (save for half — 8d6 lightning)
- Ice Storm (save for half — 2d8 bludgeoning + 4d6 cold)
- Shatter (save for half — 3d8 thunder)
- ...and most other area damage spells

Adding `half_damage_of_fail` would unblock a large fraction of the remaining SRD activation spells.

---

## Secondary Omission (Not a Widening)

> "Flammable objects in the Cone that aren't being worn or carried start burning."

This is a DM-agenda environmental effect — unattended object state is outside the combat-mechanics core per ARCHITECTURE.md. It is legitimately omitted without requiring any atom or surface change.
