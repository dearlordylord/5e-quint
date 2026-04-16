# Proposal: Storm of Vengeance

**Outcome:** `structural_widening`
**Slug:** `storm_of_vengeance`
**Level:** 9 Conjuration, Concentration up to 1 minute

---

## Why this unit does not fit any existing family

Storm of Vengeance is a **turn-indexed effect-schedule spell**: each caster turn during the concentration duration fires a completely different mechanical resolution. The entire spell description is a lookup table:

| Turn | Mechanic | Type |
|------|----------|------|
| 1 (cast) | CON save → 2d6 Thunder + Deafened (duration) | save_gate + apply_condition |
| 2 | Auto 4d6 Acid to area | unconditional area damage |
| 3 | 6 bolts → 6 DEX saves, 10d6 Lightning (half on success) | multi-target save_gate |
| 4 | Auto 2d6 Bludgeoning to area | unconditional area damage |
| 5–10 | 1d6 Cold + difficult terrain + heavily obscured + block ranged weapons + wind | recurring area damage + environmental effects |

No existing payload family can represent this honestly:

- **`activation`**: Phases fire at cast time. They sequence immediately on the casting turn; there is no mechanism to schedule phase N for "the start of caster turn N."
- **`ongoing_effect`**: Holds a single persistent operation (e.g., Bless's roll modifier). It has no mechanism for a rotating schedule of distinct resolutions.
- **`triggered_reaction`**: Reaction-shaped spells only — wrong axis.
- **`anchored_trigger`**: Planted-location triggers waiting for external events — wrong axis.

The turn-start trigger is internal (tied to the caster's turn cycle), not an external event the anchor waits for. Even if we tried to force this into `anchored_trigger`, the multi-resolution schedule (different effect each turn) has no honest encoding.

---

## Widenings required

### 1. New subgraph: `turn_scheduled_effect_sequence` (structural)

A new family or subgraph for spells that register a turn-indexed schedule of effects, each firing automatically at the start of the caster's turn. Graph shape sketch:

```
spell_root → activate → area(300ft sphere, range 1 mile)
           → turn_schedule
               → turn_1_window → save_gate(CON) → damage(2d6 thunder) + apply_condition(deafened)
               → turn_2_window → unconditional_damage(4d6 acid, area)
               → turn_3_window → multi_target(6) → save_gate(DEX) → damage(10d6 lightning, half on success)
               → turn_4_window → unconditional_damage(2d6 bludgeoning, area)
               → turns_5_10_window → unconditional_damage(1d6 cold, area) + modify_terrain(difficult) + heavily_obscured_zone + block_ranged_weapons
```

The `turn_start_window` atom exists in v4 but only as an expiry terminus (persists_until). It would need to serve as a recurring trigger node within the schedule.

### 2. New `ActivationPhase` variant: `unconditional_damage` (surface widening)

Turns 2 and 4 deal damage to all creatures in the area with no save and no attack roll. Current `ActivationPhase` only has `attack_roll` and `save_gate`. A third variant is needed:

```typescript
| {
    readonly kind: "unconditional_damage";
    readonly attachment: Attachment;
    readonly onApply: Effect;
  }
```

### 3. New `Condition` variant: `"deafened"` (surface widening)

The spell applies Deafened on a failed Turn 1 CON save. `Condition` currently only has `"prone"`. This is a minimal extension; Deafened is a standard SRD condition.

### 4. New `TargetSelection` variant: `fixed_n_distinct` (surface widening)

Turn 3 targets 6 **different** creatures with independent saves. Current selections: `{ mode: "one" }` and `{ mode: "choose_up_to", count: SlotScaling<number> }`. Neither captures "choose exactly 6 distinct targets, each resolved separately."

```typescript
| { readonly mode: "choose_n_distinct"; readonly count: number }
```

### 5. New atom: `modify_terrain` (atom widening)

Turns 5-10 make the area Difficult Terrain. No v4 atom covers terrain modification. `block_travel` models a barrier/wall, not area-wide movement cost doubling.

Proposed atom: `modify_terrain` (effect category), carrying a terrain kind (e.g., `"difficult"`).

### 6. New atom: `heavily_obscured_zone` or `modify_visibility` (atom widening)

Turns 5-10 make the area Heavily Obscured. This is mechanically distinct from `block_targeting` (which concerns targeting legality, not vision). A dedicated vision-obscurement area atom is needed.

---

## What fits cleanly

- **Kind**: `spell` — no issue.
- **CastingTime**: `{ kind: "action" }` — fits.
- **Range**: `{ kind: "point", feet: 5280 }` (1 mile) — representable.
- **Components**: `{ v: true, s: true, m: false }` — fits.
- **Duration**: `{ kind: "concentration", upTo: { unit: "minute", amount: 1 } }` — fits.
- **School**: `"conjuration"` — fits.
- **Level**: `9` — fits.
- **Area shape**: `{ kind: "sphere", radiusFeet: 300 }` — fits.

---

## Recommendation

Do not encode until the `turn_scheduled_effect_sequence` subgraph (or equivalent family) is designed. The turn-schedule pattern is load-bearing — everything else follows from it. Once the scheduling subgraph exists, the secondary gaps (deafened condition, unconditional-damage phase, multi-target selection, terrain/vision atoms) are individually small and can be addressed in a single widening pass alongside other pressure cases (Sleet Storm, Incendiary Cloud, and similar turn-recurring area spells likely share this pattern).
