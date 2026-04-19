# proposal-control_water.md

## Unit: Control Water (Spell, Level 4 Transmutation, SRD 5.2.1)

## Outcome: surface_widening

---

## Summary

Control Water is a concentration spell (10 min) that lets the caster control water in a 100-ft cube within 300 ft, choosing one of four persistent modes at cast time. On later turns, the caster can use a Magic action to repeat or switch modes.

The top-level structure (ongoing concentration spell with a mode-choice switchable via Magic action) matches the `CastTimeEffectModeChoice` + `allowsMidDurationSwitchAs: "magic_action"` pattern. The Whirlpool mode's mechanical atoms (`force_move pull`, `save_gate` with STR save for 2d8 bludgeoning) exist in v4. Despite this, honest encoding is blocked by missing surface support for mode-conditional ongoing operations and a missing trigger variant for creature-action escape.

---

## What Fits

- **Family**: `ongoing_effect` with concentration, 10-minute duration.
- **Mode-choice structure**: `CastTimeEffectModeChoice` with `allowsMidDurationSwitchAs: "magic_action"` correctly captures "pick one mode at cast, switch via Magic action on later turns."
- **Attachment**: `area` with `cube` shape (up to 100 ft side), `origin: point_within_range`, range 300 ft.
- **Whirlpool atoms** (all exist in v4):
  - `force_move { direction: "pull", distanceFeet: 10 }` — creatures within 25 ft pulled toward whirlpool.
  - `save_gate { ability: "str", dc: caster_spell_save_dc, onFail: 2d8 bludgeoning, onSuccess: half_damage }` — on enter or end turn in whirlpool.
  - `on_creature_enters_area` and `on_creature_ends_turn_in_area` triggers.
- **Three narrative modes** (Flood / Part Water / Redirect Flow) could each be encoded as DM-owned options with no `effects`.

---

## Blocking Gaps

### 1. Mode-conditional ongoing operations (`surface_widening`)

`OngoingEffectMechanics.operations` is a fixed `ReadonlyNonEmptyArray<OngoingOperation>` — every operation fires for the full spell duration regardless of which mode is currently active.

Control Water needs Whirlpool mode's ongoing effects to fire **only while Whirlpool is the active mode**:
- `on_attached_turn_start → force_move pull 10 ft` (creatures within 25 ft)
- `on_creature_enters_area → save_gate (2d8 bludgeoning, STR)`
- `on_creature_ends_turn_in_area → save_gate (2d8 bludgeoning, STR)`

If these are placed unconditionally in `operations`, they misrepresent the spell — they would always fire even during Flood or Part Water mode.

`CastTimeEffectModeChoice.options[].effects` is `EffectAtom[]` (one-shot application at mode selection), not `OngoingOperation[]`, so ongoing effects cannot live inside the mode choice either.

**Proposed fix**: Add a `whenMode?: string` field on `OngoingOperation` (referencing a mode `id` from the `CastTimeEffectModeChoice`), or widen `CastTimeEffectModeChoice.options[].effects` to also accept an optional `operations?: ReadonlyNonEmptyArray<OngoingOperation>` sub-list.

### 2. Creature-action escape trigger (`surface_widening`)

Whirlpool: "A creature can swim away from the whirlpool only if it first takes an action to pull away and succeeds on a Strength (Athletics) check against your spell save DC."

`OngoingTrigger` has `on_caster_spends_action` but nothing for **the targeted creature spending its own action attempting escape**. This pattern also appears in other restraining effects and is worth a general trigger variant.

**Proposed fix**: Add `on_target_spends_action` (or `on_creature_spends_action_to_escape`) to `OngoingTrigger`, paired with `ability_check_gate` as the `OngoingEffect`.

---

## Missing Atoms

### Flood mode — raise water level / create wave

The Flood effect raises standing water up to 20 ft and creates a traveling wave that:
- Carries Huge-or-smaller vehicles to the other side of the area.
- Has a **25% chance** of capsizing Huge-or-smaller vehicles struck by the wave (random-table mechanic).

No v4 atom covers water-level manipulation or wave creation. The capsizing chance would need a `random_table` phase (die=100, outcome 1–25 = capsize), but "capsize" itself lacks an atom.

### Part Water mode — trench + water walls

Creates a traversable trench through the area with walls of water on each side. The trench changes terrain traversability meaningfully (creatures and vehicles can walk/sail through the gap). No v4 atom for water-parting or terrain-reshaping at this specificity.

### Redirect Flow mode — directed water flow

Causes flowing water to move in a caster-chosen direction, overcoming obstacles and gravity for the spell's duration. No v4 atom for environmental flow direction control.

---

## Encoding Decision

**No `content/control_water.dhall` authored.** Encoding any partial version would either:
- Omit the Whirlpool's ongoing effects entirely (silently dropping the spell's only combat mechanic), or
- Place those effects unconditionally in `operations` (misrepresenting them as always-active regardless of mode).

Both produce a misleading trace that claims the spell round-trips when it does not.

---

## Proposed Widenings Summary

| Kind | Name | Priority |
|------|------|----------|
| `new_subgraph` | `mode_conditional_operations` | High — blocks encoding of every multi-mode ongoing spell (Alter Self also benefits) |
| `new_variant` | `on_target_spends_action_to_escape` | Medium — also needed for other restraining/ongoing-pull effects |
| `new_atom` | `raise_water_level` / `create_wave` | Low — water-specific; Flood is DM-agenda-adjacent |
| `new_atom` | `part_water` | Low — DM-agenda-adjacent (no combat stat) |
| `new_atom` | `redirect_water_flow` | Low — DM-agenda-adjacent |
