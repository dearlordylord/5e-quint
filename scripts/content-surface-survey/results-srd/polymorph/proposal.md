# Proposal: Widening for Polymorph

**Unit:** Polymorph (spell, level 4, transmutation, SRD 5.2.1)
**Outcome:** `atom_widening`

## Why Polymorph doesn't fit

Polymorph is a concentration spell (up to 1 hour) that:
1. Requires the target to fail a **Wisdom saving throw** before the effect applies
2. On failure: **replaces the target's stat block** with a chosen Beast's (subject to CR constraint)
3. **Grants temporary HP** equal to the Beast form's HP
4. **Ends early** if the target's temporary HP reach 0 (in addition to normal concentration break)

None of the four existing `SpellMechanics` families can encode this honestly:

| Family | Why it fails |
|---|---|
| `ongoing_effect` | No save-gated entry; `OngoingOperation` = `roll_modifier \| damage_on_hit` — no transform atom |
| `activation` | `save_gate` phase exists, but `Effect = DamageEffect \| NoneEffect` — cannot express stat block replacement; also one-shot, not concentration-ongoing |
| `triggered_reaction` | Not a reaction spell |
| `anchored_trigger` | Not a planted trigger |

## Required widenings

### 1. New atom: `stat_block_replacement` (operation)

The target's entire stat block is replaced by a chosen Beast's. This is a new
`OngoingOperation` variant (or a new operation family) with:

```
{
  kind: "stat_block_replacement";
  replaceWith: { creatureType: "beast"; maxCR: "target_level_or_cr" };
  retains: ["alignment", "personality", "creature_type", "hp", "hit_dice"];
}
```

The CR constraint ("equal to or less than the target's level/CR") implies a
resolution-time parameter this surface currently has no grammar for.

### 2. New atom: `grant_temp_hp` (effect / operation)

The target gains temporary HP equal to the Beast form's HP at onset. This is
distinct from `heal_hp` (which restores current HP). Should be a new atom:

```
{
  kind: "grant_temp_hp";
  amount: { kind: "beast_form_hp" }   // derived from chosen Beast stat block
}
```

The amount source is itself novel — it's derived from the replaced stat block,
not a fixed dice expression.

### 3. New surface variant: `save_gated_onset` on `ongoing_effect`

The ongoing transformation only applies if the target fails its saving throw.
The current `OngoingEffectMechanics` has no `onset` or `entry` field. Options:

- **Option A:** Add an optional `onset` field to `OngoingEffectMechanics`:
  ```
  readonly onset?: {
    kind: "save_gate";
    ability: Ability;
    dc: DcSource;
  };
  ```
- **Option B:** New family: `save_gated_ongoing_effect` combining the
  `activation` family's `save_gate` phase with the ongoing/concentration
  lifecycle. This is the more structurally honest option given how many spells
  share this pattern (Hold Person, Banishment, Polymorph, etc.).

### 4. New surface variant: `temp_hp_depletion` in `Duration` / lifecycle

The spell ends early when temp HP reach 0 — an early-termination condition
not representable by any current `Duration` variant. This would require either:
- A new `Duration` kind: `{ kind: "concentration_or_temp_hp_depletion"; ... }`
- Or a lifecycle-level signal: `terminatesOn: [{ kind: "temp_hp_depleted" }]`

## Out-of-core omissions (not proposed)

The following Polymorph mechanics are legitimately narrative / out-of-core
per ARCHITECTURE.md and are **not** proposed as new atoms:
- "can't speak or cast spells" — action restriction on the polymorphed creature (creature state, not spell atom)
- "gear melds into the new form" — equipment handling, outside combat atom scope

## Classification justification

`atom_widening` (not `structural_widening`) because the `ongoing_effect` family
*conceptually* maps to Polymorph's shape: concentration, single-target, timed.
The blocker is that the operations and entry conditions needed are absent from v4
— especially `stat_block_replacement`, which is a concept not present anywhere
in the current atom taxonomy.

The `save_gated_onset` gap is borderline structural (many concentration spells
share this pattern — Hold Person, Banishment, Dominate Person), suggesting the
surface should model a `save_gated_ongoing` family once more pressure cases land.
