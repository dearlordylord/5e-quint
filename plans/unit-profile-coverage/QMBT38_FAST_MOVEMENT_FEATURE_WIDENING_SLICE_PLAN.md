# QMBT38 Fast Movement Feature Widening Slice Plan

Date: 2026-05-07

## Decision

Select `barbarian_fast_movement` as the next SRD feature-style widening slice
after Extra Attack.

The slice should promote a new `unit-feature.passive-speed-bonus` profile for
the SRD Barbarian Fast Movement feature: the creature's Speed increases by 10
feet while the creature is not wearing Heavy armor.

This is deliberately narrower than "all movement features." It excludes Ranger
Roving's Climb Speed and Swim Speed grants, Dash-as-Bonus-Action traits,
Temporary Hit Point grants, Breath Weapon attack replacement, Unarmored Defense
AC base calculation choices, target-side Resistance, and Weapon Mastery
properties. The selected boundary is only the authored passive `modify_speed`
projection with `delta: 10`, `unit: "feet"`, and a `not_wearing_armor`
condition for Heavy armor.

## Source Check

Local RAW anchors read for this decision:

- `.references/srd-5.2.1/Classes/Barbarian.md`, `Level 5: Fast Movement`: the
  Barbarian's Speed increases by 10 feet while not wearing Heavy armor.
- `.references/srd-5.2.1/Rules-Glossary.md`, `Speed`: Speed is the distance a
  creature can cover when it moves on its turn.
- `.references/srd-5.2.1/Rules-Glossary.md`, `Dash [Action]`: Dash increases
  current-turn movement by the creature's Speed after modifiers, so a Speed
  projection must feed movement-budget derivation instead of adding a separate
  movement allowance.
- `.references/srd-5.2.1/Rules-Glossary.md`, `Speed`, `Changes to Your
  Speeds`: Speed increases also affect special speeds. This slice should keep
  the runtime boundary honest by either deriving all represented speed kinds
  from the same Speed projection or explicitly limiting itself to builds with
  no authored special speed projection until Roving widens that boundary.

Additional candidate RAW checked:

- `.references/srd-5.2.1/Classes/Ranger.md`, `Roving` and `Tireless`;
  `.references/srd-5.2.1/Classes/Barbarian.md`, `Unarmored Defense`;
  `.references/srd-5.2.1/Classes/Monk.md`, `Unarmored Defense`;
  `.references/srd-5.2.1/Classes/Paladin.md`, `Lay On Hands` and `Restoring
  Touch`; `.references/srd-5.2.1/Character-Origins.md`, Dragonborn `Breath
  Weapon` and `Damage Resistance`, Dwarf `Dwarven Resilience`, and Orc
  `Adrenaline Rush`; `.references/srd-5.2.1/Equipment.md`, `Mastery
  Properties`, `Cleave`, and `Topple`; `.references/srd-5.2.1/Rules-Glossary.md`,
  `Armor Class`, `Healing`, `Hit Points`, `Temporary Hit Points`,
  `Resistance`, `Cone`, `Line`, and `Prone`.

`UBIQUITOUS_LANGUAGE.md` anchors checked:

- `Speed` and `Movement`, to keep Speed capacity distinct from movement spent
  on a turn.
- `Action` and `Dash`, to keep Fast Movement out of alternate action-cost and
  Bonus Action Dash scope.
- `Unarmored Defense` and `Armor Class`, to keep AC base formula selection out
  of a Speed projection slice.
- `Hit Points`, `Temporary Hit Points`, `Pool`, `Quota`, and `Spend`, to keep
  healing and temporary-HP resources out of this slice.
- `Resistance` and `Damage Type`, to keep target-side damage adjustment
  separate.
- `Weapon Mastery`, `Mastery Property`, `Cleave`, and `Topple`, to keep weapon
  ownership and on-hit mastery riders separate from passive Speed projection.

## Candidate Triage

| Candidate | Decision |
| --- | --- |
| `barbarian_fast_movement` | Best next slice. It is one passive class feature with one authored `modify_speed` grant, one equipment predicate, and direct pressure on the existing `speed.walkFeet` and movement-budget projection already used by battle runtime. |
| `ranger_roving` | Defer. It includes the same +10 Speed pressure but also grants Climb Speed and Swim Speed equal to Speed, so it should follow the first Speed projection slice and widen special-speed kinds deliberately. |
| `barbarian_unarmored_defense`, `monk_unarmored_defense` | Defer. These are alternative base AC calculations, not flat bonuses like Defense; the SRD also requires choosing only one base AC calculation when multiple rules provide alternatives. |
| `paladin_lay_on_hands` | Defer. It uses a Long Rest healing pool, variable spend amount at activation time, creature targeting, and later shares the same pool with Restoring Touch condition removal. |
| `ranger_tireless`, `orc_adrenaline_rush` | Defer. Tireless grants Temporary Hit Points through a Magic action and has a separate Short Rest exhaustion benefit. Adrenaline Rush combines Bonus Action Dash, Temporary Hit Points, Proficiency Bonus uses, and Short or Long Rest recharge. |
| `species_dragonborn_breath_weapon` | Defer. It replaces one attack inside the Attack action with a Cone or Line save-gated damage procedure, ancestry-selected damage type, Proficiency Bonus uses, and tiered damage. |
| `species_dragonborn_damage_resistance`, `dwarf_dwarven_resilience` | Defer. Resistance is target-side damage adjustment and typed damage-source admission. Dragonborn also depends on the Draconic Ancestry choice shared with Breath Weapon, while Dwarven Resilience combines poison Resistance with saving throw Advantage against Poisoned. |
| `mastery_cleave`, `mastery_topple` | Defer. Mastery properties require Weapon Mastery ownership, weapon-specific eligibility, and on-hit rider timing. Cleave adds a spatially constrained once-per-turn attack; Topple adds a weapon-attack DC and Prone application. |

## Red/Green Plan

1. Add profile pressure before support.

   Add `unit-feature.passive-speed-bonus` to
   `plans/unit-profile-coverage/profiles.jsonl` with QCORE/QMBT owner
   placeholders. Keep `barbarian_fast_movement` unsupported or absent from the
   installed SRD Unit catalog until the executable profile lands.

2. Promote the Unit catalog boundary.

   Import `packages/surface/content/barbarian_fast_movement.json` into
   `packages/surface/src/surface/unit-catalog.ts` and add it to the SRD Unit
   collection only when the battle runtime support profile is executable.
   Update `unit-catalog.test.ts` so the SRD collection admits the Unit with SRD
   provenance.

3. Model the QNT profile first.

   Extend the package-local promoted rule-core feature profile proof with a
   passive Speed bonus profile. The model should use procedure facts rather
   than the authored Unit id:

   - base Speed in feet;
   - Heavy armor worn vs not worn;
   - fixed +10-foot Speed increase while not wearing Heavy armor;
   - movement budget derived from effective Speed at turn start;
   - Dash movement bonus derived from effective Speed after modifiers.

4. Promote production support from authored mechanics.

   Extend `packages/battle-runtime/src/unit-feature-support.ts` with a precise
   support parser for class-feature Units whose mechanics are exactly:

   - `kind: "class_feature"`;
   - `mechanics.family: "passive"`;
   - one grant with `kind: "modify_speed"`, `delta: 10`, and `unit: "feet"`;
   - `condition: { kind: "not_wearing_armor", categories: ["heavy"] }`;
   - no unrelated passive grants, activation phases, operations, or authored-id
     registry.

5. Make Speed executable without duplicating state.

   Use retained Unit support profiles, the character build's species Speed, and
   the build equipment loadout as the canonical source facts. Do not store a
   second per-Unit Speed cache. Character battle initialization should derive
   the effective Speed once for the battle creature, and turn setup plus Dash
   should continue to derive movement budget from that effective Speed.

6. Keep special-speed connascence explicit.

   Fast Movement's RAW uses Speed, and the glossary says Speed changes can
   affect special speeds. If the implementation does not yet project special
   speed kinds, the support test should prove this selected Unit only changes
   represented walk Speed and should keep Roving unsupported until Climb and
   Swim Speed projection is modeled. If special speeds are added in the same
   lower-layer change, derive all affected speeds from one Speed projection
   helper so the +10 fact cannot diverge by speed kind.

7. Add deterministic admission/projection evidence.

   After runtime support is executable, classify `barbarian_fast_movement` in
   `unit-claims.jsonl` as supported with profile id
   `unit-feature.passive-speed-bonus`. Add deterministic evidence in
   `unit-evidence.jsonl` owned by
   `packages/battle-runtime/src/unit-profile-admission.test.ts` or the
   character battle projection test that proves:

   - a Barbarian not wearing Heavy armor projects +10 Speed;
   - a Barbarian wearing Heavy armor does not receive the bonus;
   - movement remaining and Dash bonus use the effective Speed;
   - adjacent `modify_speed` shapes, such as a different delta, a different
     unit, multiple grants, or a missing Heavy-armor predicate, stay
     unsupported for this slice.

8. Refresh generated matrix artifacts.

   Run `pnpm unit-profile-coverage:check` after claims and evidence updates and
   include the generated `UNIT_REPORT.md` and `unit-matrix.json` changes in the
   implementation task.

## Verification For Implementation Task

- RAW and `UBIQUITOUS_LANGUAGE.md` check for Fast Movement, Speed, Movement,
  Dash, Heavy armor predicates, and the distinction between Speed capacity and
  movement spent.
- Focused QNT proof for the new passive Speed bonus profile.
- Focused runtime parity with the mandatory timed background MBT protocol if
  promoted battle behavior changes.
- `pnpm unit-profile-coverage:check`.
- Relevant package typecheck/tests.
- `pnpm quality` for the production behavior change.
- `/simplify` convergence, minimum two rounds.

## Task 133 Verification

- RAW checked locally against `.references/srd-5.2.1/Classes/Barbarian.md`,
  `.references/srd-5.2.1/Classes/Ranger.md`,
  `.references/srd-5.2.1/Classes/Paladin.md`,
  `.references/srd-5.2.1/Classes/Monk.md`,
  `.references/srd-5.2.1/Character-Origins.md`,
  `.references/srd-5.2.1/Equipment.md`, and
  `.references/srd-5.2.1/Rules-Glossary.md` for the candidate boundaries
  listed above.
- `UBIQUITOUS_LANGUAGE.md` checked for Speed, Movement, Action, Dash,
  Unarmored Defense, Armor Class, Hit Points, Temporary Hit Points, Pool,
  Quota, Spend, Resistance, Damage Type, Weapon Mastery, Mastery Property,
  Cleave, and Topple terminology.
- `/simplify` round 1: kept the selected slice to Fast Movement's one passive
  Speed bonus and made the special-speed relationship explicit so Roving's
  Climb and Swim Speed grants are not silently admitted.
- `/simplify` round 2: no important changes found; the plan still selects one
  feature procedure profile and does not mix AC base calculation, healing or
  Temporary Hit Point resources, attack replacement, resistance, mastery,
  spell, or magic-item scope.
- MBT not run: Task 133 is research-only and makes no promoted battle-runtime
  behavior change.
- `pnpm unit-profile-coverage:check` not run: matrix docs and generated
  artifacts were not changed.

## Plan Impact

QMBT39 should append a follow-on implementation task for this slice before the
next recursive review batch continues broad feature-family widening. Suggested
task:

`QMBT40 - Promote Fast Movement Passive Speed Bonus`

Scope: implement the red/green plan above and close
`barbarian_fast_movement` as a supported SRD Unit profile. Out of scope:
Ranger Roving special speeds, Dash-as-Bonus-Action traits, Temporary Hit Point
features, Unarmored Defense AC base calculation alternatives, Dragonborn
Breath Weapon, resistance traits, Weapon Mastery properties, spell admission,
magic items, and general movement feature families beyond the Fast
Movement-shaped passive Speed bonus.
