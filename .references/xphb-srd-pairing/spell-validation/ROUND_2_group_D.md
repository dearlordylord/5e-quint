# Round 2 Group D

Spells:

- `Shield`
- `Shield of Faith`
- `Shocking Grasp`
- `Sleep`
- `Spiritual Weapon`

Grounding: local `spells-xphb.json` entries for the five spells, read against `TAXONOMY_atoms_graph.md`.

## `Shield`

- Round 1 failures fixed:
  - `v1` now has `interrupt_resolution`, so the spell is no longer forced to read as plain AC buff plus expiry.
  - `prepare` / `prompt` / `commit` are a better match for the spell’s reactive choice shape than the round-1 writeup implied.
- Still remaining:
  - the `Magic Missile` clause is still not named cleanly as damage negation or resolve-time cancellation;
  - `modify_ac` still carries too much of the spell by itself;
  - `block_targeting` remains the wrong broad bucket for this spell.
- New problems:
  - the spell pushes harder toward a dry-run / commit model than the current graph names explicitly.

## `Shield of Faith`

- Round 1 failures fixed:
  - none materially; `v1` already fit this spell better than `v0`.
- Still remaining:
  - the spell is still only honest if `choose`, `target`, `concentrate`, and `modify_ac` stay explicitly separated;
  - the target-attached buff shape still depends on attachment, not self-only wording.
- New problems:
  - none.

## `Shocking Grasp`

- Round 1 failures fixed:
  - `attack_roll` and `melee_spell_attack` now exist, so the attack delivery is no longer prose-only;
  - `deliver_touch_spell` is now a usable attachment concept instead of an empty gloss.
- Still remaining:
  - the opportunity-attack denial rider is still not typed as a distinct atom or relation;
  - the cantrip scaling remains undernamed;
  - the graph still has to carry touch delivery without flattening it into generic attack language.
- New problems:
  - `v1` makes the missing denial atom more visible, not less, because the attack half is now covered.

## `Sleep`

- Round 1 failures fixed:
  - `save_gate` and `repeat_save` now cover the spell’s staged save structure better than `v0` did;
  - the condition application path is less prose-dependent.
- Still remaining:
  - the awake/damage interruption behavior is still not explicit enough;
  - the condition progression from `Incapacitated` to `Unconscious` still wants a more typed transition path;
  - `branches_on_completion` is still too blunt for the spell’s actual lifecycle.
- New problems:
  - the spell now exposes that save typing alone is not enough; interruption and worsening are separate shapes.

## `Spiritual Weapon`

- Round 1 failures fixed:
  - `attack_proxy` / `create_attack_proxy` now exist, so the persistent attacker shape is no longer prose-only;
  - the bonus-action attack loop is better supported by `bonus_action_window`.
- Still remaining:
  - the slot-based scaling is still not named cleanly;
  - the attack proxy’s ownership and persistence still need a sharper lifecycle contract;
  - `create_object` is still too generic if it has to stand in for both inert objects and autonomous force proxies.
- New problems:
  - the spell now shows that the graph needs a clearer distinction between creation and ongoing proxy control, not just creation plus persistence.

## Cross-Spell Findings

1. `Shield` is better in `v1`, but it still shows that resolve-time mitigation needs a named cancellation/negation shape, not only `modify_ac`.
2. `Shield of Faith` remains a clean example of target-attached concentration buffing, and it confirms the attachment split is still worth keeping separate.
3. `Shocking Grasp` and `Spiritual Weapon` both validate the new attack/proxy atoms, but they also show the graph still lacks a clean denial and scaling vocabulary.
4. `Sleep` is the clearest proof in this group that save structure and lifecycle structure are different problems.
5. None of these five spells now force a new top-level family, but they do show that `v1` is still a coarse graph with several missing sub-shapes.

## File Edited

- `.references/xphb-srd-pairing/spell-validation/ROUND_2_group_D.md`
