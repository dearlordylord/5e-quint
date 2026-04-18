# Proposal: surface_widening for Conjure Woodland Beings

**Unit:** Conjure Woodland Beings (4th-level Conjuration, concentration 10 min)  
**Outcome:** `surface_widening` — all required atoms exist in v4; three surface type variants are missing.

---

## Spell Summary

Conjure Woodland Beings creates a 10-ft Emanation centered on the caster that persists for up to 10 minutes (concentration). Each time the emanation enters a creature's space, a creature enters the emanation, or a creature ends its turn there, the caster **may** force that creature to make a **Wisdom saving throw** (once per turn per creature): 5d8 Force on a failed save, half on a success. Additionally, the caster may take **Disengage as a Bonus Action** for the spell's duration. Damage scales by +1d8 per slot level above 4.

---

## Gap 1 — `AreaOrigin::emanates_from_caster`

**Current type:**
```typescript
export type AreaOrigin =
  | { readonly kind: "point_within_range" }
  | { readonly kind: "on_primary_target" };
```

**Problem:** The emanation is self-centered and **moves with the caster** for the full duration. Neither existing origin variant models this. `point_within_range` implies a static point chosen at cast; `on_primary_target` implies attachment to another creature. A moving self-anchored area is a distinct geometric and mechanical concept.

**Proposed variant:**
```typescript
| { readonly kind: "emanates_from_caster" }
```

This matches the SRD Emanation rule: the area always originates from the caster's space and repositions with them each turn.

---

## Gap 2 — `OngoingOperation::area_contact_save_gate`

**Current type:**
```typescript
export type OngoingOperation = RollModifierOperation | DamageOnHitOperation;
```

**Problem:** The spell's damage is gated by a **Wisdom saving throw** that fires on **area-contact events** (entry, emanation-entry, turn-end-inside) — not on an attack roll hit. `damage_on_hit` requires a weapon/spell attack hit event; `roll_modifier` applies a persistent roll bonus. Neither can model: "when a creature contacts the area, optionally open a save gate → damage (fail) / half damage (success)."

**Proposed variant:**
```typescript
export type AreaContactSaveGateOperation = {
  readonly kind: "area_contact_save_gate";
  readonly triggers: ReadonlyArray<
    | "enters_area"
    | "area_enters_creature_space"
    | "ends_turn_in_area"
  >;
  readonly optional: boolean;            // caster chooses whether to trigger
  readonly perTurnLimit: number | null;  // 1 = "only once per turn"
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly onFail: EffectAtom;
  readonly onSuccess: EffectAtom;
};
```

This generalises to Cloudkill, Incendiary Cloud, Spirit Guardians, and other ongoing area save-gate spells — all of which share this subgraph shape.

---

## Gap 3 — Bonus-Action-Activated `deny_opportunity_attack` rider

**Current situation:** `deny_opportunity_attack` exists as a passive `EffectAtom`. The spell grants the caster a **repeatable** ability: spend a Bonus Action → deny OA for that turn's movement. This is a persistent per-turn cost-to-activate pattern.

**Problem:** No existing surface type models "an ongoing ability where spending a resource each turn activates an effect for that turn." The current `EffectAtom` union has no cost-to-activate variant. Encoding this as a plain `deny_opportunity_attack` effect would be dishonest (it would imply the OA is always denied, not just on turns the caster spends a Bonus Action).

**Proposed approach (two options):**

*Option A* — New `EffectAtom` variant:
```typescript
| {
    readonly kind: "conditional_deny_opportunity_attack";
    readonly activationCost: "bonus_action";
  }
```

*Option B* — Widen `OngoingOperation` with a second new variant:
```typescript
export type BonusActionRiderOperation = {
  readonly kind: "bonus_action_rider";
  readonly effect: EffectAtom;  // the effect granted when Bonus Action is spent
};
```

Option B is more composable and generalises to other "spend Bonus Action to get X this turn" riders (e.g., certain concentration spells with optional per-turn bonus action sub-effects).

---

## Scale Widening (minor)

The upcast scaling (+1d8 per slot level above 4) is expressible with the existing `DiceAmount::linear_per_level` shape with `axis: "slot"`. No new surface type needed for scaling.

---

## Summary of Proposed Widenings

| # | Location | Kind | Name |
|---|---|---|---|
| 1 | `AreaOrigin` | new_variant | `emanates_from_caster` |
| 2 | `OngoingOperation` | new_variant | `area_contact_save_gate` |
| 3 | `EffectAtom` or `OngoingOperation` | new_variant | bonus-action-activated deny_opportunity_attack rider |

All required **v4 atoms** (`save_gate`, `damage`, `area`, `emanation`, `deny_opportunity_attack`) are already in the taxonomy. The gaps are entirely at the surface (TypeScript type) layer.

---

## Related Spells That Share These Gaps

The `area_contact_save_gate` operation shape (Gap 2) is the same subgraph needed for:
- **Spirit Guardians** (Wisdom save on enter/end-turn, radiant/necrotic damage)
- **Cloudkill** (Constitution save on enter/end-turn, poison damage)
- **Incendiary Cloud** (Dexterity save on enter/end-turn, fire damage)
- **Hunger of Hadar** (Dexterity save on end-turn, cold damage)

Widening `OngoingOperation` to include `area_contact_save_gate` would unblock all of these.
