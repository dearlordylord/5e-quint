# Shillelagh surface gap

`Shillelagh` does not fit the current authored surface cleanly.

The current closed spell surface can only express it as an `ongoing_effect` with a single `operation`. In practice that forced `content/shillelagh.json` into a lossy placeholder that traces as `self + modify_roll_numeric`. That is not the SRD mechanic.

## Why the current surface is insufficient

- The spell binds to a held weapon, not to the caster generally and not to a free target.
- The spell substitutes the attack and damage ability source (`spellcasting` instead of `Strength`) rather than adding a numeric bonus.
- The spell rewrites the weapon's damage die, with cantrip scaling at levels 5, 11, and 17.
- The spell allows a per-hit damage-type choice between Force and the weapon's normal damage type.
- The spell has weapon-bound early-break clauses: it ends if recast or if the caster lets go of the weapon.

## Recommended widenings

- Add `Attachment.weapon` so ongoing effects can bind to a held weapon object.
- Add an ongoing-operation variant that emits `modify_roll_substitute` for attack and damage rolls scoped to attacks with the bound weapon.
- Add a weapon-attack override subgraph for weapon-bound rewrites:
  - override the damage expression on that weapon's melee attacks
  - carry cantrip scaling (`scale_die_size` / `scale_die_count`)
  - allow damage-type choice between inherited and replaced typing
  - emit lifecycle break semantics for recast and for losing hold of the weapon

## Evidence

- "A Club or Quarterstaff you are holding is imbued with nature's power."
- "you can use your spellcasting ability instead of Strength for the attack and damage rolls of melee attacks using that weapon"
- "the weapon's damage die becomes a d8"
- "it can be Force damage or the weapon's normal damage type (your choice)"
- "The spell ends early if you cast it again or if you let go of the weapon."
- "The damage die changes when you reach levels 5 (d10), 11 (d12), and 17 (2d6)."
