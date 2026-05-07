# QMBT35 Extra Attack Feature Widening Slice Plan

Date: 2026-05-07

## Decision

Select the level-5 `Extra Attack` class features as the next SRD
feature-style widening slice after Savage Attacker.

The slice should promote a new
`unit-feature.attack-action-attack-count-scaling` profile for the SRD feature
shape already authored by `fighter_extra_attack`, `paladin_extra_attack`, and
`ranger_extra_attack`: when the creature takes the Attack action on its turn,
it can attack twice instead of once.

This is deliberately narrower than "all attack-count features." It excludes
Fighter's `Two Extra Attacks` and `Three Extra Attacks`, Warlock invocation
variants, Monk feature intake, two-weapon fighting, Nick, Cleave, Dragonborn
Breath Weapon attack replacement, and Stat Block Multiattack. The selected
boundary is only the class-feature passive `scale_attack_count` projection for
one additional attack inside one Attack action.

## Source Check

Local RAW anchors read for this decision:

- `.references/srd-5.2.1/Classes/Fighter.md`, `Level 5: Extra Attack`: the
  Fighter can attack twice instead of once when taking the Attack action on
  its turn.
- `.references/srd-5.2.1/Classes/Paladin.md`, `Level 5: Extra Attack`: the
  Paladin has the same attack-twice wording.
- `.references/srd-5.2.1/Classes/Ranger.md`, `Level 5: Extra Attack`: the
  Ranger has the same attack-twice wording.
- `.references/srd-5.2.1/Rules-Glossary.md`, `Attack [Action]`: the default
  Attack action makes one weapon or Unarmed Strike attack roll, and features
  such as Extra Attack allow moving between attacks.
- `.references/srd-5.2.1/Playing-the-Game.md`, `Combat` and `Movement and
  Position`: a turn allows Movement and one action, and movement can be broken
  up before and after actions.
- `.references/srd-5.2.1/Character-Creation.md`, `Extra Attack`: Extra Attack
  features from more than one class do not stack, and this feature cannot
  grant more than two attacks unless a feature says it can.

Additional candidate RAW checked:

- `.references/srd-5.2.1/Classes/Barbarian.md`, `Fast Movement` and
  `Unarmored Defense`; `.references/srd-5.2.1/Classes/Ranger.md`, `Roving`
  and `Tireless`; `.references/srd-5.2.1/Classes/Paladin.md`, `Lay On Hands`;
  `.references/srd-5.2.1/Character-Origins.md`, Dragonborn `Breath Weapon`
  and `Damage Resistance`, Orc `Adrenaline Rush`; `.references/srd-5.2.1/Equipment.md`,
  `Mastery Properties`, `Cleave`, and `Topple`; `.references/srd-5.2.1/Rules-Glossary.md`,
  `Armor Class`, `Speed`, `Dash`, `Resistance`, `Cone`, `Line`, `Healing`,
  `Hit Points`, `Temporary Hit Points`, and `Prone`.

`UBIQUITOUS_LANGUAGE.md` anchors checked:

- `Multiattack`, to keep PC class-feature Extra Attack distinct from Stat
  Block Multiattack.
- `Speed` and `Movement`, to keep attack-count sequencing separate from speed
  projection and movement-budget capacity.
- `Unarmored Defense` and `Armor Class`, to keep base AC calculation choices
  out of an attack-count slice.
- `Hit Points`, `Temporary Hit Points`, `Pool`, `Quota`, and `Spend`, to keep
  healing and temporary-HP resource features out of this slice.
- `Resistance`, `Damage Type`, and the resistance/vulnerability/immunity
  relationship note, to keep target-side damage adjustment separate.
- `Weapon Mastery`, `Mastery Property`, `Cleave`, and `Topple`, to keep
  mastery ownership and on-hit mastery riders separate from class-feature
  attack-count scaling.

## Candidate Triage

| Candidate | Decision |
| --- | --- |
| `fighter_extra_attack`, `paladin_extra_attack`, `ranger_extra_attack` | Best next slice. The authored Surface shape already exists as passive `scale_attack_count` with `additional: 1`, the RAW wording is identical for all three installed Units, and the runtime boundary is one Attack action producing two ordinary attack resolutions with Movement allowed between them. |
| `barbarian_fast_movement` | Defer. It is narrower than Roving, but it widens Speed derivation and Movement-budget projection, including the "not wearing Heavy armor" equipment predicate, rather than attack sequencing. |
| `ranger_roving` | Defer. It combines a Speed increase with Climb Speed and Swim Speed grants equal to Speed, so it should wait for a common Speed-kind projection boundary. |
| `barbarian_unarmored_defense`, `monk_unarmored_defense` | Defer. These are alternative base AC calculations with equipment predicates and multiclass non-stacking choice rules, not flat AC bonuses like Defense. |
| `paladin_lay_on_hands` | Defer. It uses a Long Rest healing pool whose spend amount is chosen at activation time and consumes the same pool that later Restoring Touch spends for condition removal. |
| `ranger_tireless`, `orc_adrenaline_rush` | Defer. Tireless grants Temporary Hit Points from a Magic action and has a separate Short Rest exhaustion benefit; Adrenaline Rush combines Bonus Action Dash with Temporary Hit Points and a Short or Long Rest use pool. Temporary Hit Points are explicitly not healing. |
| `species_dragonborn_breath_weapon` | Defer. It replaces one attack inside the Attack action with a Cone or Line area save, ancestry-selected damage type, PB-based uses, and tiered damage. It should come after ordinary Extra Attack establishes the attack-slot sequencing boundary. |
| `species_dragonborn_damage_resistance`, `dwarf_dwarven_resilience` | Defer. Resistance is target-side damage adjustment and typed damage-source admission, not an actor-side procedure sequencing feature. Dragonborn also depends on the Draconic Ancestry choice shared with Breath Weapon. |
| `mastery_cleave`, `mastery_topple` | Defer. Mastery properties require Weapon Mastery ownership, weapon-specific eligibility, and on-hit rider windows. Cleave also grants a once-per-turn extra attack against a spatially constrained second target, which should not be conflated with Extra Attack. |

## Red/Green Plan

1. Add profile pressure before support.

   Add `unit-feature.attack-action-attack-count-scaling` to
   `plans/unit-profile-coverage/profiles.jsonl` with QCORE/QMBT owner
   placeholders. Keep `fighter_extra_attack`, `paladin_extra_attack`, and
   `ranger_extra_attack` unsupported until the executable profile lands.

2. Model the QNT profile first.

   Extend the package-local promoted rule-core feature profile proof with a
   class-feature Attack action count profile. The model should use procedure
   facts rather than authored Unit ids:

   - ordinary Attack action availability;
   - one passive `additional = 1` attack-count fact;
   - first and second attack resolution slots;
   - Movement allowed before, between, and after those slots;
   - End Turn closes any unspent attack slots;
   - the extra slot is not a new action and not a Bonus Action.

3. Promote production support from authored mechanics.

   Extend `packages/battle-runtime/src/unit-feature-support.ts` with a precise
   support parser for class-feature Units whose mechanics are exactly:

   - `kind: "class_feature"`;
   - `mechanics.family: "passive"`;
   - one grant with `kind: "scale_attack_count"` and `additional: 1`.

   Do not add an authored-id registry. The support profile should be a typed
   projection of the Surface mechanics shape and reject adjacent passive grants
   that alter action economy in other ways.

4. Make the Attack action sequencing executable without duplicating state.

   Use the retained Unit support profile plus current-turn action resources as
   the canonical source facts. The runtime should not store a second per-Unit
   attack-count cache. Taking the Attack action should spend the action once
   and open exactly one remaining attack slot for this slice. Resolving the
   second slot should not spend another action. Movement can interleave because
   the SRD explicitly allows movement between attacks.

5. Keep Extra Attack distinct from Stat Block Multiattack.

   Stat Block Multiattack remains a monster-authored named dispatch procedure.
   Extra Attack is a PC class-feature modifier to the ordinary Attack action.
   They may share low-level continuation helpers if that weakens connascence,
   but the public projected profiles and subject names should stay distinct.

6. Add deterministic admission/projection evidence.

   After runtime support is executable, change the three selected Units in
   `unit-claims.jsonl` to supported with profile id
   `unit-feature.attack-action-attack-count-scaling`. Add deterministic
   evidence in `unit-evidence.jsonl` owned by
   `packages/battle-runtime/src/unit-profile-admission.test.ts`. The test
   should load each authored Unit through the SRD Unit catalog, project support
   through production support gates, and prove:

   - Fighter, Paladin, and Ranger level-5 Extra Attack Units admit through the
     same profile;
   - one Attack action can resolve two attack slots;
   - the second attack slot does not spend a second action;
   - Movement may occur between the two attacks;
   - End Turn closes an unspent second slot;
   - adjacent `scale_attack_count` shapes, such as `additional: 2`, stay
     unsupported for this slice.

7. Refresh generated matrix artifacts.

   Run `pnpm unit-profile-coverage:check` after claims and evidence updates and
   include the generated `UNIT_REPORT.md` and `unit-matrix.json` changes in the
   implementation task.

## Verification For Implementation Task

- RAW and `UBIQUITOUS_LANGUAGE.md` check for Extra Attack, Attack action,
  Movement between attacks, action spending, multiclass Extra Attack
  non-stacking, and the Multiattack distinction.
- Focused QNT proof for the new attack-count scaling profile.
- Focused feature runtime parity with the mandatory timed background protocol
  if promoted battle behavior changes.
- `pnpm unit-profile-coverage:check`.
- Relevant package typecheck/tests.
- `pnpm quality` for the production behavior change.
- `/simplify` convergence, minimum two rounds.

## Task 130 Verification

- RAW checked locally against the SRD 5.2.1 files and sections listed in
  `Source Check`.
- `UBIQUITOUS_LANGUAGE.md` checked for the domain terms listed in `Source
  Check`.
- `/simplify` round 1: kept the selected slice bounded to level-5
  `additional: 1` Extra Attack Units and excluded Fighter higher-tier attacks,
  Warlock invocation variants, Breath Weapon attack replacement, Weapon
  Mastery properties, and Stat Block Multiattack.
- `/simplify` round 2: no important changes found; the plan still selects one
  feature procedure profile and does not mix speed projection, AC base
  selection, healing/temp-HP resources, resistance, mastery, spell, or magic
  item scope.
- MBT not run: Task 130 is research-only and makes no promoted battle-runtime
  behavior change.
- `pnpm unit-profile-coverage:check` not run: matrix docs and generated
  artifacts were not changed.

## Plan Impact

QMBT36 should append a follow-on implementation task for this slice before
starting broad feature-family widening. Suggested task:

`QMBT37 - Promote Level 5 Extra Attack Sequencing`

Scope: implement the red/green plan above and close `fighter_extra_attack`,
`paladin_extra_attack`, and `ranger_extra_attack` as supported SRD Unit
profiles. Out of scope: Fighter level-11/20 Extra Attacks, Warlock invocation
variants, Monk catalog intake, Stat Block Multiattack, Dragonborn Breath
Weapon, Weapon Mastery properties, two-weapon fighting, Nick, Cleave, speed
projection, AC base calculation alternatives, healing/temp-HP resource
features, resistance traits, spell admission, and magic items.
