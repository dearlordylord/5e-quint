# SRDINV74B Cleave and Topple Split Research

Task 282 reviewed the Weapon Mastery Cleave and Topple runtime boundary. No
runtime behavior was implemented in this task.

## Source Review

Local RAW sources checked:

- `.references/srd-5.2.1/Equipment.md` lines 82-84 for Mastery Property
  unlocking through a feature such as Weapon Mastery.
- `.references/srd-5.2.1/Equipment.md` lines 89-91 for Cleave.
- `.references/srd-5.2.1/Equipment.md` lines 113-115 for Topple.
- `.references/srd-5.2.1/Rules-Glossary.md` lines 802-808 for the Prone
  condition.
- `UBIQUITOUS_LANGUAGE.md` lines 202-204 and 210 for Mastery Property, Weapon
  Mastery, Cleave, and Topple terminology.

Relevant RAW facts:

- A Mastery Property is usable only when a character has a feature, such as
  Weapon Mastery, that unlocks that property for the character.
- Cleave triggers after a hit with a melee attack roll using the weapon, is
  optional, grants a melee attack roll with the same weapon against a second
  creature, requires the second creature to be within 5 feet of the first and
  within the attacker's reach, deals the weapon's damage on a hit, omits the
  attack ability modifier from damage unless that modifier is negative, and is
  limited to once per turn.
- Topple triggers after a hit with the weapon, is optional, forces a
  Constitution saving throw with DC 8 plus the attack ability modifier plus
  Proficiency Bonus, and applies Prone on a failed save.
- Prone changes movement options and attack-roll modes: the prone creature has
  Disadvantage on attack rolls, attacks within 5 feet against it have
  Advantage, and farther attacks against it have Disadvantage.

## Existing Boundary

The Surface source records for `mastery_cleave` and `mastery_topple` already
encode the SRD mechanics with typed `on_hit_trigger` mechanics:

- `mastery_cleave` uses `weapon_hit_melee_only`, optional `true`,
  `grant_weapon_attack`, `adjacent_to_primary` with
  `within_5ft_and_reach`, `weapon_damage` with `negative_only`, and a
  `once_per_turn` usage limit.
- `mastery_topple` uses `weapon_hit`, optional `true`, a Constitution
  `save_gate`, `weapon_attack_dc` base 8, failed-save `apply_condition:
  prone`, and success `none`.

That means this is not currently a Surface shape gap. The missing work is the
promoted runtime boundary: catalog admission/support profiles, Quint facts, runtime reducer/projection, character-battle projection from
selected Weapon Mastery choices, focused tests, and Unit evidence.

The current promoted path admits only Sap:

- `character-battle-runtime` maps selected Weapon Mastery weapons only from
  `sap` to `mastery_sap`.
- `battle-runtime` has only a `weaponMasterySap` support profile and parser.
- runtime on-hit logic has a Sap-specific selected-weapon gate and active
  effect.
- the Unit matrix still records `mastery_cleave` and `mastery_topple` as
  executable authored Surface records absent from the admitted Unit catalog.

## Boundary Decision

Cleave and Topple should be split into two follow-up runtime tasks. They share
the selected-weapon mastery gate established by Sap, but their execution
surfaces are distinct enough that combining them would hide important boundary
work.

Topple is the narrower follow-up. It can reuse the existing weapon-hit path,
selected-weapon mastery projection, support-profile pattern, save machinery,
and existing `prone` condition representation if present. Its new domain fact
is the Weapon Mastery save DC: `8 + ability modifier used for the attack roll +
Proficiency Bonus`. The runtime should derive that DC from the resolved attack
context instead of storing a parallel Topple DC on the creature or weapon.

Cleave is a separate follow-up because it grants a second attack, has a
once-per-turn usage limit, has an explicit second-target spatial predicate,
and changes damage modifier treatment on that second attack. The runtime should
not derive adjacency or reach from hidden map state. The caller/table should
supply the second target and the fact that it is within 5 feet of the first
target and within the attacker's reach at the Cleave declaration boundary. The
runtime should own the once-per-turn Cleave use and the second attack/damage
procedure after those facts are supplied.

## Follow-Up Runtime Slices

Recommended future task:

### SRDINV74C - Promote Weapon Mastery Topple Runtime

Scope:

- admit `mastery_topple` through a `weaponMasteryTopple` support profile;
- project selected Topple weapon choices from character creation into
  battle-runtime Unit refs using the existing selected-weapon mastery boundary;
- gate Topple on weapon attack hit, selected weapon mastery ownership, the
  attacked weapon's authored Topple Mastery Property, and the Topple support
  profile;
- model Topple as an optional rider chosen after the hit;
- derive the save DC from the attack ability modifier and the attacker's
  Proficiency Bonus;
- apply Prone on failed Constitution save and no effect on success;
- update focused battle-runtime QNT, runtime reducer code,
  focused tests, character-battle projection tests, and Unit evidence.

Out of scope:

- generic save DC storage on weapons or creatures;
- Prone movement/crawl/righting behavior beyond any already promoted condition
  effects unless the Topple tests need the attack-roll consequences;
- Cleave's extra attack, second-target facts, and once-per-turn state.

Recommended future task:

### SRDINV74D - Promote Weapon Mastery Cleave Runtime

Scope:

- admit `mastery_cleave` through a `weaponMasteryCleave` support profile;
- project selected Cleave weapon choices from character creation into
  battle-runtime Unit refs using the existing selected-weapon mastery boundary;
- gate Cleave on a hit with a melee attack roll using the selected Cleave
  weapon, selected weapon mastery ownership, the weapon's authored Cleave
  Mastery Property, and the Cleave support profile;
- model Cleave as an optional rider chosen after the primary hit;
- require caller/table-supplied second-target eligibility facts: the second
  creature is within 5 feet of the first target and within the attacker's reach;
- make the granted second attack with the same weapon and apply weapon damage
  on hit without adding a positive ability modifier, while preserving a negative
  ability modifier;
- enforce once-per-turn Cleave use in battle state;
- update focused battle-runtime QNT, runtime reducer code,
  focused tests, character-battle projection tests, and Unit evidence.

Out of scope:

- deriving adjacency, reach, line of sight, cover, or target identity from a
  grid or map;
- conflating Cleave with Extra Attack, Light/Nick extra attacks, Bonus Actions,
  or Multiattack;
- Topple's save-gated Prone behavior.

## Plan Impact

- SRDINV74B is closed as research complete.
- SRDINV74C is added as the Topple implementation task.
- SRDINV74D is added as the Cleave implementation task.
- SRDINV78 depends on SRDINV74C and SRDINV74D instead of treating SRDINV74B
  alone as the mastery closure point.

## reviewer loop Convergence

- Round 1: rejected a combined Cleave/Topple implementation slice. It would
  couple save-gated condition application to an extra-attack flow with
  once-per-turn and spatial facts, making the follow-up acceptance criteria too
  broad.
- Round 2: rejected adding new Surface fields. The current typed Surface
  records already represent Cleave and Topple; the missing boundary is runtime
  support/admission, not authored source shape.
