# Proposal: Create Undead — Structural Widening

## Outcome: `structural_widening`

Create Undead does not fit any existing spell payload family. No Dhall or JSON was authored.

---

## Why no existing family applies

### `activation` — fails at ActivationPhase and Effect

The nearest candidate. The spell is instantaneous, so `ongoing_effect` (which requires concentration or a timed duration) and `anchored_trigger` (which requires a location-bound release) are ruled out immediately.

`ActivationMechanics` requires:
```typescript
phases: ReadonlyArray<ActivationPhase>
```
`ActivationPhase` is a closed union of `attack_roll | save_gate`. Create Undead has neither. It has no resolution at all — it transforms corpses into companion creatures. There is no honest phase to populate.

`Effect` is `DamageEffect | NoneEffect`. No companion-creation variant exists.

### `ongoing_effect` — fails on duration and operation type

Requires a concentration or timed duration. Create Undead is instantaneous. The ongoing command loop operates on the *companions* across their turns — it is not a persistent modifier on the caster's rolls or a damage rider.

### `triggered_reaction` / `anchored_trigger` — clearly inapplicable

Neither trigger-by-reaction nor planted-location-release matches this pattern.

---

## Gaps identified

### 1. No companion-creation spell family

Create Undead belongs to a pattern — "instantaneous cast produces autonomous companions that persist beyond the spell's own duration" — that none of the four existing spell families model. A new family is needed, provisionally: `companion_creation`.

Required graph shape:
```
spell_root → activate → create_companion (×N) → companion (type, count)
                      → command_companion (BA/turn, range 120 ft)
                      → control_window (24h, expires unless refreshed)
```

### 2. No `create_companion` effect in spell surface types

The v4 atom `create_companion` exists in `TAXONOMY_atoms_graph.md §9 Effect Atoms`. But `Effect = DamageEffect | NoneEffect` has no variant for it. The atom exists at the taxonomy layer with no surface expression path for spells.

### 3. No `command_companion` operation in spell surface types

> "As a Bonus Action on each of your turns, you can mentally command any creature you animated with this spell if the creature is within 120 feet of you"

This is a per-turn operation the *caster* takes on the companion. The v4 atom `command_companion` exists but has no surface expression. `OngoingOperation = RollModifierOperation | DamageOnHitOperation` — neither fits.

### 4. No control-duration-with-recast-maintenance lifecycle

> "The creature is under your control for 24 hours, after which it stops obeying any command you've given it. To maintain control... you must cast this spell on the creature before the current 24-hour period ends. This use of the spell reasserts your control over up to three creatures you have animated with this spell rather than animating new ones."

This is a lifecycle pattern not expressible with existing atoms:
- The control expires on a clock (not a rest, not the end of a fight, not concentration loss)
- Expiry is *preventable* by recasting the specific spell before deadline
- Recasting in maintenance mode does not create new companions — it refreshes control over existing ones

Existing lifecycle atoms: `concentrate`, `persist`, `expire`, `dismiss`, `complete`, `break`, `self_break`, `return_on_end`, `replace_on_recast`. None capture "expires in 24h unless refreshed by recast before deadline" or the "reassert vs. animate" dual-mode recast.

### 5. No time-of-day precondition

> "You can cast this spell only at night."

No surface type or `CastingTime` variant encodes a time-of-day gate. This is a precondition on the *cast itself*, not a duration, a component, or a casting-time cost. A new variant would be needed — e.g., `{ kind: "time_of_day_restriction"; timeOfDay: "night" }` — though this may be caller-owned rather than core-mechanics.

### 6. No creature-type substitution in slot scaling

Higher-level upcasting does not scale a quantity linearly. It offers *type alternatives*:

| Slot | Options |
|------|---------|
| 6    | 3 Ghouls |
| 7    | 4 Ghouls |
| 8    | 5 Ghouls **or** 2 Ghasts/Wights |
| 9    | 6 Ghouls **or** 3 Ghasts/Wights **or** 2 Mummies |

`SlotScaling<number>` and `ThresholdTiers<number>` handle quantity only. The type substitution pattern (same slot level unlocks a choice of *which creature kind* at *what count*) requires a new surface shape — provisionally a `CompanionTierChoice` type with named creature-type alternatives per slot.

---

## Recommended widening path

Priority order for unblocking a summoning/companion-creation unit class:

1. **New spell family**: `companion_creation` (or `summon_companion`) with:
   - `companionType` — closed enum of named creature kinds (initially Ghoul, Ghast, Wight, Mummy; widen as more summoning spells land)
   - `count: SlotScaling<number>` — base count + slot scaling
   - `commandProtocol` — describes the BA-per-turn command mechanic (range, cost)
   - `controlDuration` — clock-based expiry with recast-refresh mechanic

2. **New `Effect` variant**: `create_companion` in the spell `Effect` union (if the family is decomposed into phases rather than a single top-level structure).

3. **New `command_companion` surface expression** in `OngoingOperation` or as a companion-family field.

4. **New slot-tier creature-type selection** shape for the upcasting alternatives.

5. **Time-of-day precondition** — lower priority; may be caller-owned metadata rather than core mechanics.

---

## Comparison to similar pattern

Animate Dead (also in the survey queue) has the same structural shape: instantaneous necromancy that produces animated undead companions (skeletons/zombies) controlled for 24h with recast-to-maintain. The two spells will share the same new family. Any widening adopted for Create Undead should be validated against Animate Dead simultaneously.

The Summon-* family (Summon Aberration, Summon Undead, etc.) is a related but distinct pattern: those spells summon a single creature for a concentration-bounded duration. Create Undead/Animate Dead are different in that they are instantaneous, produce multiple creatures, and use the 24h-recast-maintain lifecycle rather than concentration.
