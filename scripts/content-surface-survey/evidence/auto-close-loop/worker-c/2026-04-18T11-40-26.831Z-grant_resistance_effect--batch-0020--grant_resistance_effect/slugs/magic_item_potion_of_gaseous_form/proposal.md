## Potion of Gaseous Form

Family fit is fine: this is a `magic_item` with `activation` mechanics.

The authored file captures the supported subset:

- `grant_speed` for Fly Speed 10 ft with hover
- `grant_resistance` for bludgeoning, piercing, and slashing
- `grant_condition_immunity` for Prone
- `modify_roll_advantage` for Str/Dex/Con saving throws

Unsupported mechanics that prevented a clean encoding:

1. Surface widening: `EffectAtom.restrict_action_set`

- Why: while gaseous, the target can't attack or cast spells.
- Evidence: "Finally, the target can't attack or cast spells."
- Notes: v4 already has `restrict_action_set`, but the authored surface only exposes that restriction nested under `grant_extra_action.restriction`, not as a standalone effect atom.

2. Surface widening: `DurationEndTrigger.target_uses_bonus_action_to_end_effect`

- Why: the potion changes the inherited spell's self-end action from Magic action to Bonus Action.
- Evidence: "or until you end the effect as a Bonus Action."

3. Surface widening: `DurationEndTrigger.target_drops_to_0_hp`

- Why: the imported spell ends on the target when it reaches 0 HP.
- Evidence: "The spell ends on the target if it drops to 0 Hit Points..."

4. Atom widening: `bypass_space_and_barrier_constraints`

- Why: gaseous form grants deterministic movement/occupancy exceptions that are not represented by any current atom.
- Evidence: "The target can enter and occupy the space of another creature. ... The target can pass through narrow openings, but it treats liquids as though they were solid surfaces."

5. Atom widening: `suppress_speech_and_object_interaction`

- Why: gaseous form removes communication and object-use capabilities in a way that is broader than action denial.
- Evidence: "The target can't talk or manipulate objects, and any objects it was carrying or holding can't be dropped, used, or otherwise interacted with."

Resulting verdict: `atom_widening`.

The trace is still useful, but it is intentionally partial and omits the unsupported riders above.
