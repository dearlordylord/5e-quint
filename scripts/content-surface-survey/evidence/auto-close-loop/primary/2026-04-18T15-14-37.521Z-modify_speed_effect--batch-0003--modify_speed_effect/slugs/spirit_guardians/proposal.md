# Widening Proposal: Spirit Guardians

**Outcome:** `surface_widening`  
**Family:** `ongoing_effect` (correct — no structural change needed)  
**All required v4 atoms exist** in the taxonomy (`area`, `save_gate`, `damage`, `modify_speed`).

---

## Unit summary

Spirit Guardians (3rd-level Conjuration, Concentration ≤ 10 minutes, Range: Self):

- Creates a 15-foot **Emanation centered on the caster that moves with them**.
- Non-exempt creatures in the emanation have their **Speed halved**.
- When the emanation enters a creature's space, or a creature enters or **ends its turn** in the emanation → **Wisdom save**:  
  - Fail: 3d8 Radiant (good/neutral caster) or 3d8 Necrotic (evil caster)  
  - Success: half damage  
  - Once per turn per creature.
- Slot scaling: +1d8 per slot above 3rd.

---

## Gap 1 — `AreaOrigin` missing `on_caster` variant

**Current type:**
```typescript
export type AreaOrigin =
  | { readonly kind: "point_within_range" }
  | { readonly kind: "on_primary_target" };
```

**Problem:** A 15-foot Emanation centered on the caster moves with the caster each turn. Neither existing variant covers this:
- `point_within_range` — a static point chosen at cast time.
- `on_primary_target` — the area follows a targeted creature.

The caster IS the origin, and the origin relocates every time the caster moves.

**Proposed addition:**
```typescript
| { readonly kind: "on_caster" }
```

**Evidence:** *"Protective spirits flit around you in a 15-foot Emanation for the duration."*

---

## Gap 2 — `OngoingOperation` missing `area_save_gate` variant

**Current type:**
```typescript
export type OngoingOperation = RollModifierOperation | DamageOnHitOperation;
```

**Problem:** Spirit Guardians deals damage via a saving throw triggered by area entry and turn-end — not by the caster making an attack roll. The existing variants model:
- `roll_modifier` — adds a die to attack or saving throw rolls (Bless pattern).
- `damage_on_hit` — rider on the caster's own attack-roll hits (Hunter's Mark pattern).

Neither covers: *"a creature enters or ends its turn in the area → save, full damage on fail, half on success."*

**Proposed addition:**
```typescript
export type AreaSaveGateOperation = {
  readonly kind: "area_save_gate";
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly onFail: DamageEffect;
  readonly onSuccess: DamageEffect;          // typically half of onFail
  readonly triggers: ReadonlyArray<"enter" | "end_of_turn">;
  readonly usageLimit?: { readonly kind: "once_per_turn" };
};
```

This would compose with the `area` attachment under `ongoing_effect`, with the area attachment carrying the `on_caster` origin (Gap 1).

**Evidence:** *"whenever the Emanation enters a creature's space and whenever a creature enters the Emanation or ends its turn there, the creature must make a Wisdom saving throw. On a failed save, the creature takes 3d8 Radiant damage... On a successful save, the creature takes half as much damage. A creature makes this save only once per turn."*

---

## Gap 3 — `OngoingOperation` missing `modify_speed` variant

**Current type:**
```typescript
export type OngoingOperation = RollModifierOperation | DamageOnHitOperation;
```

**Problem:** The spell persistently halves Speed for any non-exempt creature while it is in the emanation. The `modify_speed` atom exists in v4, but there is no `OngoingOperation` variant to attach it to an area.

**Proposed addition:**
```typescript
export type ModifySpeedOperation = {
  readonly kind: "modify_speed";
  readonly multiplier?: number;   // 0.5 for half
  readonly delta?: number;        // flat reduction alternative
};
```

**Evidence:** *"Any other creature's Speed is halved in the Emanation"*

---

## Gap 4 (secondary) — Conditional damage type by caster state

The damage type is Radiant if the caster is good/neutral, Necrotic if evil. `DamageEffect` holds a single fixed `DamageType`. This alignment-based conditional is not expressible.

**Note:** Alignment is determined at character-build time, so this could be handled by authoring two variant encodings (one for each). The surface does not currently model "caster character state" as a DamageType selector. This gap is secondary — the unit can't be encoded regardless due to Gaps 1–3.

---

## Secondary structural gap: creature exemption at cast time

The caster can designate creatures as unaffected at cast time. The `AnchoredFilter::creature_exemption_list` shape exists for Alarm's grammar but has no equivalent in the `OngoingOperation` / area attachment grammar. A future `area_save_gate` variant would need a `filters?: ReadonlyArray<AnchoredFilter>` field or equivalent.

**Evidence:** *"you can designate creatures to be unaffected by it"*

---

## Recommended widening scope

Priority order for encoding Spirit Guardians:
1. `AreaOrigin::on_caster` — needed for any caster-following emanation (also relevant for Aura of Protection, Aura of Life, Aura of Purity, etc.)
2. `OngoingOperation::area_save_gate` — core mechanic of Spirit Guardians; also relevant for Cloudkill, Incendiary Cloud, etc.
3. `OngoingOperation::modify_speed` — needed for Speed reduction in area (also Slow, Web, etc.)
4. Conditional damage type — lower priority; could be deferred by encoding as a note or single-type simplification.
