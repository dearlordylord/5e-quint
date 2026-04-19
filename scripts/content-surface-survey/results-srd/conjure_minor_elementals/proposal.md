# Surface Widening Proposal: Conjure Minor Elementals

**Outcome:** `surface_widening`  
**Encoded:** Yes (attack-damage rider only; difficult-terrain clause omitted)  
**Typecheck:** Pass  
**Tracer:** Clean (no throws)

---

## What was encoded

The 15-ft emanation attack-damage rider:
- `ongoing_effect` family, concentration 10 min
- Area attachment: `{ kind: "area", shape: { kind: "emanation", radiusFeet: 15 }, origin: { kind: "self" } }`
- One operation: `on_caster_attack_hit` → `damage` (CastTimeChoice over acid/cold/fire/lightning, 2d8 base + 1d8/slot, linear_per_level, axis=slot, startingAtLevel=4)

## What was omitted

**"the ground in the Emanation is Difficult Terrain for your enemies"** — omitted per corpus precedent. Both `spike_growth` and `grease` defer their difficult-terrain clauses as DM-agenda spatial geometry. Additionally, `area_is_difficult_terrain` carries no filter parameter, making the "enemies only" restriction inexpressible regardless.

---

## Gap 1: `on_caster_attack_hit` + `area` attachment — undocumented scope

**RAW:** "any attack you make deals an extra 2d8 damage when you hit a creature in the Emanation"

The `on_caster_attack_hit` trigger comment documents two scopes:
- `self` → any attack hit by caster (Divine Favor)
- `mark/target` → caster's attack against the attached creature (Hunter's Mark)

This spell requires a third: **area** → caster hits a creature inside the area. The grammar says "scope derived from attachment," which implies the area case is intended to work, but no prior encoding exercises it.

**Proposed surface clarification:** Extend the trigger documentation to cover `area` attachment explicitly: "area → caster hits a creature that is currently within the area." No type change required — this is a documentation/specification gap, not a type gap. The tracer already handles it correctly (emits `on_hit_window (caster hits attachment)` for any attachment kind).

**Impact:** Low. The encoded trace is correct. This is a documentation gap only.

---

## Gap 2: `area_is_difficult_terrain` needs a `dispositionFilter`

**RAW:** "the ground in the Emanation is Difficult Terrain for your enemies"

The current atom:
```typescript
| { readonly kind: "area_is_difficult_terrain" }
```

No parameters. Applying the atom without filter would make the entire emanation difficult terrain for ALL creatures, including allies. The spell explicitly scopes it to enemies.

**Proposed widening:**
```typescript
| {
    readonly kind: "area_is_difficult_terrain";
    readonly dispositionFilter?: AreaOccupantDispositionFilter;
  }
```

Where `AreaOccupantDispositionFilter = "friendly_to_source" | "hostile_to_source"`. This matches the existing filter vocabulary already used on `Attachment`.

**Impact:** Medium. Multiple spells would benefit (Conjure Minor Elementals, and any future spell with ally-safe difficult terrain). The omission in this encoding is intentional — forcing `area_is_difficult_terrain` without filter would produce an inaccurate trace.

---

## Gap 3: Per-attack damage type choice — timing label mismatch

**RAW:** "your choice when you make the attack"

`CastTimeChoice<DamageType>` is documented as "caster picks one at cast/build time." This spell's choice happens at each individual attack resolution, not once at cast time. Structurally the JSON shape is correct (closed option set), but the label implies a once-at-cast semantic.

**Proposed widening:** A `PerResolutionChoice<T>` variant or a `timing: "cast" | "per_resolution"` field on `CastTimeChoice`. Alternatively, rename `CastTimeChoice` to `ClosedMenuChoice` to be timing-agnostic and add an optional `timing` field.

**Impact:** Low. The tracer renders the choice correctly regardless of timing. The gap is a semantic label issue, not a structural one. Chromatic Orb (cast-time) and this spell (per-attack) would be distinguished.

---

## Summary

| Gap | Blocking? | Proposed fix | Scope |
|-----|-----------|--------------|-------|
| `on_caster_attack_hit` + area scope undocumented | No (tracer works) | Document the area case | Docs only |
| `area_is_difficult_terrain` no dispositionFilter | Yes (clause omitted) | Add `dispositionFilter?: AreaOccupantDispositionFilter` | types.ts widening |
| `CastTimeChoice` timing label mismatch | No (structural fit) | Add timing discriminant or rename | Minor refactor |
