# Proposal: Control Water — Structural Widening

**Outcome:** `structural_widening`  
**Unit:** Control Water (srd-5.2.1, Level 4 Transmutation, Concentration)

---

## Root Problem: Multi-Mode Ongoing Effect

Control Water's core mechanic is a **choose-one-of-N ongoing mode** pattern with **per-turn re-selection**:

> "Until the spell ends, you control any water inside an area you choose...using one of the following effects. As a Magic action on your later turns, you can repeat the same effect or choose a different one."

No existing spell family models this. The four modes (Flood, Part Water, Redirect Flow, Whirlpool) are mechanically distinct — they are not phases (not sequential, not parallel) and not a single ongoing operation. The caster selects one mode at cast, then may re-select each turn via a Magic action.

This forces a **new family**: `multi_mode_ongoing_effect`. The family would need:
- A `modes` array of distinct effect payloads (one active at a time)
- A `reSelectorCost` field specifying the action cost to switch modes (Magic action)
- Duration/concentration header (same as existing `SpellMechanicsHeader`)

---

## Proposed Widenings

### 1. New family: `multi_mode_ongoing_effect`

```typescript
export type MultiModeOngoingEffectMechanics = SpellMechanicsHeader & {
  readonly family: "multi_mode_ongoing_effect";
  readonly anchor: Attachment;  // the area controlled (cube up to 100 ft side)
  readonly reSelectorCost: { readonly kind: "magic_action" };
  readonly modes: ReadonlyArray<OngoingMode>;
};

export type OngoingMode = {
  readonly id: string;  // "flood" | "part_water" | "redirect_flow" | "whirlpool"
  readonly label: string;
  readonly effect: OngoingModeEffect;
};
```

### 2. New variant: `OngoingOperation.save_gate`

The Whirlpool mode has a recurring save-gate that fires when a creature **enters or ends its turn** in the area:

> "When a creature enters the whirlpool for the first time on a turn or ends its turn there, it makes a Strength saving throw. On a failed save, the creature takes 2d8 Bludgeoning damage. On a successful save, the creature takes half as much damage."

This is a `save_gate` embedded in an `OngoingOperation`. The current union only has `roll_modifier` and `damage_on_hit`. A save-triggered damage operation is structurally distinct from a damage-on-attack-hit rider.

```typescript
export type SaveGateOngoingOperation = {
  readonly kind: "save_gate_on_enter_or_end_turn";
  readonly ability: Ability;       // "str"
  readonly dc: DcSource;           // caster_spell_save_dc
  readonly onFail: DamageEffect;   // 2d8 bludgeoning
  readonly onSuccess: DamageEffect; // half (2d8 bludgeoning / 2)
};
```

### 3. New variant: `OngoingOperation.force_move_aura`

The Whirlpool pulls creatures toward its center:

> "Any creature in the water and within 25 feet of the whirlpool is pulled 10 feet toward it."

`force_move` is a v4 atom but has no surface exposure in `OngoingOperation`. A recurring area-pull (fires each turn for creatures in range) is a new operation shape:

```typescript
export type ForceMoveAuraOperation = {
  readonly kind: "force_move_aura";
  readonly radiusFeet: number;       // 25
  readonly distanceFeet: number;     // 10
  readonly direction: "toward_center";
};
```

### 4. New atom: `alter_terrain`

Three of the four modes (Flood, Part Water, Redirect Flow) manipulate ambient terrain with no mechanical resolution gate:

- **Flood**: Raises water level 20 ft; OR creates a 20 ft wave that travels across the area carrying/striking vehicles
- **Part Water**: Creates a trench + wall from existing water; remains persistent
- **Redirect Flow**: Changes flow direction of water in area; continues until changed

The v4 taxonomy has `block_travel`, `create_object`, and `force_move` but no atom for **altering the state of existing terrain/environment** (water level, physical landscape division, flow direction). These are not "created objects" — they are modifications to existing environmental elements.

Proposed v4 atom: `alter_terrain` — the spell modifies the physical state of an area of terrain (water, earth, etc.) for the duration. Distinct from `create_object` (nothing new is created) and from `block_travel` (the barrier is a side effect of terrain alteration, not the primary effect).

### 5. New variant: `Resolution.probability_gate`

The Flood wave gives vehicles a 25% chance of capsizing:

> "Any Huge or smaller vehicles struck by the wave have a 25% chance of capsizing."

This is a **raw probability roll** — not a saving throw, not an ability check. No ability modifier or DC is involved. The current resolution atoms (attack_roll, save_gate, ability_check) all require some roll+modifier against a DC. A flat random-chance gate is structurally distinct and requires a new resolution variant.

Note: Vehicle capsizing mechanics are also entirely outside the current combat model scope (no vehicle tracking), so this may be `dm_agenda`-adjacent even if the probability gate atom were added.

### 6. New variant: `OngoingOperation.ability_check_escape`

The Whirlpool has an escape condition requiring an action + ability check:

> "A creature can swim away from the whirlpool only if it first takes an action to pull away and succeeds on a Strength (Athletics) check against your spell save DC."

This is an `ability_check` resolution embedded as an **escape condition** within an ongoing area effect. It fires when the creature attempts to leave — a triggered resolution with an action cost gate. Nothing in the current surface models ongoing escape conditions.

---

## Encoding Path (When Widening Is Applied)

Once the above widenings are in place, Control Water would encode as:

```
multi_mode_ongoing_effect
  anchor: area (cube ≤ 100 ft side, origin: point within 300 ft)
  reSelectorCost: magic_action
  modes:
    - flood:        alter_terrain(water_level_raise + wave) + probability_gate(25% capsize)
    - part_water:   alter_terrain(trench_and_wall) + block_travel
    - redirect_flow: alter_terrain(flow_direction)
    - whirlpool:    force_move_aura(r=25ft, 10ft toward_center)
                    + save_gate_on_enter_or_end_turn(STR, caster_spell_save_dc, 2d8 bludgeoning / half)
                    + ability_check_escape(STR Athletics, action cost, vs caster_spell_save_dc)
```

---

## Classification Notes

- **Flood/Part Water/Redirect Flow**: `dm_agenda`-adjacent in their physical consequences (DM adjudicates exactly what "raising water level" means in context), but the spell's mechanical intent is clear enough to warrant a surface atom.  
- **Vehicle capsize**: Likely out-of-core scope per ARCHITECTURE.md — vehicle state is not tracked by the combat engine. The 25% probability gate is noted as a proposed widening, but the vehicle state effect would route to a caller-owned notification.  
- **Whirlpool save_gate**: The most mechanically concrete portion of the spell, closest to existing encodable patterns. Would be clean once `save_gate_on_enter_or_end_turn` is added to `OngoingOperation`.
