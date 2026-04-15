# Round 1 Group D

Spells:

- `Shield`
- `Shield of Faith`
- `Shocking Grasp`
- `Sleep`
- `Spiritual Weapon`

## `Shield`

- Atoms used:
  - `spell_root`
  - `respond`
  - `prepare`
  - `commit`
  - `self`
  - `reaction_window`
  - `spell_slot`
  - `modify_ac`
  - `expire`
- Relations used:
  - `roots`
  - `opens_window`
  - `requires`
  - `prepares`
  - `commits`
  - `attaches_to`
  - `modifies`
  - `persists_until`
- What leaks into prose:
  - the exact interrupt trigger: hit by an attack roll or targeted by `Magic Missile`
  - the fact that the spell is both a reactive choice and an immediate defensive state
  - the `Magic Missile` exception, which is not just an AC bonus
  - the exact expiry boundary: start of your next turn
- Verdict:
  - strengthens `respond`, `prepare`, `commit`, and `modify_ac`
  - weakly supports `reaction_window` and `persists_until`
  - falsifies the current effect vocabulary because `modify_ac` alone does not capture the `Magic Missile` damage negation
  - the taxonomy also overstates `block_targeting` if it treats `Shield` as a targeting-block spell; it is a resolve-time mitigation spell, not primarily a targeting blocker

## `Shield of Faith`

- Atoms used:
  - `spell_root`
  - `activate`
  - `choose`
  - `bonus_action_window`
  - `target`
  - `concentrate`
  - `modify_ac`
  - `persist`
  - `break`
- Relations used:
  - `roots`
  - `opens_window`
  - `requires`
  - `choose`
  - `attaches_to`
  - `modifies`
  - `persists_until`
- What leaks into prose:
  - the target is “a creature of your choice within range”
  - the bonus is not self-only; it is a remote buff with an explicit chosen recipient
  - concentration is doing real architectural work here, not just serving as flavor text
  - the shimmering field is a prose wrapper around a persistent target-bound modifier
- Verdict:
  - strengthens `choose`, `target`, `concentrate`, `modify_ac`, and `persists_until`
  - supports `bonus_action_window` as a first-class timing atom
  - does not falsify the current taxonomy, but it shows that persistent buffs on other creatures need explicit target attachment rather than being modeled as self-buffs with a range note

## `Shocking Grasp`

- Atoms used:
  - `spell_root`
  - `activate`
  - `action_window`
  - `target`
  - `damage`
- Relations used:
  - `roots`
  - `opens_window`
  - `requires`
  - `attaches_to`
  - `modifies`
- What leaks into prose:
  - the attack mode: “make a melee spell attack”
  - the touch-delivery shape
  - the reaction denial rider: the target cannot make opportunity attacks until the start of its next turn
  - the cantrip scaling rule
- Verdict:
  - this spell falsifies the current atom set more than the others in this group
  - the taxonomy is missing a first-class `attack_roll` or `melee_spell_attack` atom
  - it is also missing a clear `reaction_denial` / `remove_reaction` style atom
  - `deliver_touch_spell` is too vague to carry this spell by itself; it hides the real rule shape under prose residue

## `Sleep`

- Atoms used:
  - `spell_root`
  - `activate`
  - `choose`
  - `area`
  - `target`
  - `apply_condition`
  - `duration_window`
  - `persist`
  - `break`
- Relations used:
  - `roots`
  - `opens_window`
  - `requires`
  - `attaches_to`
  - `branches_on_completion`
  - `modifies`
  - `persists_until`
- What leaks into prose:
  - the two-stage save structure
  - the automatic-success exemption for certain creatures
  - the second-stage worsening from `Incapacitated` to `Unconscious`
  - the spell-ending interruption conditions: damage or shaking the target awake
  - the fact that the spell is both a condition applier and a turn-over-time state machine
- Verdict:
  - strengthens `apply_condition`, `choose`, `area`, `duration_window`, and `persist`
  - also shows that the taxonomy needs better condition progression vocabulary, not just condition application
  - `branches_on_completion` is not enough here; this spell is interrupted and rechecked, not merely branched at a clean end state
  - the current graph is missing save-resolution atoms, so `Sleep` cannot be described honestly without prose escape hatches

## `Spiritual Weapon`

- Atoms used:
  - `spell_root`
  - `activate`
  - `bonus_action_window`
  - `object`
  - `create_object`
  - `move`
  - `damage`
  - `persist`
- Relations used:
  - `roots`
  - `opens_window`
  - `requires`
  - `attaches_to`
  - `grants`
  - `modifies`
  - `persists_until`
- What leaks into prose:
  - the spectral force is a created persistent entity, not just a visual effect
  - the spell attacks immediately on creation and then repeats on later turns
  - the later-turn attack is tied to a bonus action loop
  - the slot-level damage scaling is part of the spell’s operation, not a side note
- Verdict:
  - strengthens `create_object`, `move`, `persist`, and `bonus_action_window`
  - the spell also exposes a missing scaling atom or relation; `slot-level scaling` is not currently named well enough
  - if the taxonomy expects `create_object` to cover both inert objects and autonomous force proxies, it is too coarse
  - this spell is close to the line where the graph wants an `attack_proxy` or similar concept, even if we do not add it yet

## Cross-Spell Findings

1. The taxonomy is missing a first-class attack-mode atom. `Shocking Grasp` and `Spiritual Weapon` both force `melee spell attack` into prose residue.
2. The taxonomy is missing a first-class save / repeat-save / condition-progression shape. `Sleep` is not just `apply_condition`; it is staged resolution with interruption and worsening.
3. `Shield` shows that `modify_ac` is necessary but not sufficient. The `Magic Missile` clause is damage negation, not AC, and the current graph does not name that cleanly.
4. `Shield of Faith` supports the existing `choose`, `target`, `concentrate`, and `modify_ac` atoms, but it shows that persistent buffs on other creatures need explicit attachment rather than being treated as self-only effects with a range note.
5. `Spiritual Weapon` strengthens `create_object` and `bonus_action_window`, but it also shows that the graph still undernames persistent attack proxies and slot-scaled repeat effects.
6. The current taxonomy is still too prose-dependent for several of these spells. That is the real result of this group: the graph can describe the broad shape, but it is not yet honest enough about attack, save, denial, and interruption behavior.

Files edited:
- `.references/xphb-srd-pairing/spell-validation/ROUND_1_group_D.md`
