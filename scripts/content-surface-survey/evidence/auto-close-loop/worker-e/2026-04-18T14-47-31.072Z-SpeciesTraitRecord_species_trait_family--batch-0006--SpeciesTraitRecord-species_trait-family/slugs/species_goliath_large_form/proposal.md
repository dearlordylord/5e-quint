# Large Form (Goliath)

Verdict: `atom_widening`

I did not author `content/species_goliath_large_form.dhall`.

`Large Form` mostly wants the existing `species_trait` + `activation` scaffold:

- activation cost: `bonus_action`
- resource: `use_count` with `cap = proficiency_bonus`? No. This trait is once per long rest, so fixed 1 use
- reset cadence: `long_rest`
- duration: timed 10 minutes
- attachment: `self`
- supported secondary rider: `modify_speed` `+10 feet`

But the unit does not fit honestly because its main mechanical payload is unsupported:

- `change your size to Large` has no effect atom in the authored surface.
- `Advantage on Strength checks` cannot be expressed precisely because ability-check riders can narrow by skill or condition, but not by the governing ability.
- `until you end it (no action required)` has no duration/manual-dismiss variant for self-buffs.

Why I stopped instead of partially encoding:

- Omitting the size increase would erase the trait's headline rule.
- Encoding only the speed bonus and some approximation of the check rider would produce a misleading trace.

Suggested widenings:

1. New atom: `modify_size`
   Evidence: "you can change your size to Large as a Bonus Action"
   Why: this is not polymorph, not a catalog-form replacement, and not DM agenda. It is a deterministic temporary size-state change on the existing creature.

2. New variant: `modify_roll_advantage.abilityCheckAbilityFilter`
   Evidence: "you have Advantage on Strength checks"
   Why: current narrowing supports `skillFilter`, `conditionFilter`, and `saveAbilityFilter`, but not the ability axis for generic ability checks.

3. New variant: manual early end on timed durations
   Evidence: "This transformation lasts for 10 minutes or until you end it (no action required)"
   Why: current `Duration` early ends are trigger-shaped; voluntary self-ending is only modeled on summon dismissal, not ordinary activated self-buffs.
