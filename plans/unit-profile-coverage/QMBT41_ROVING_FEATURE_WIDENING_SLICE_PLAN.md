# QMBT41 Roving Feature Widening Slice Plan

Date: 2026-05-07

## Decision

Select `ranger_roving` as the next SRD feature-style widening slice after Fast
Movement.

The slice should promote a new
`unit-feature.passive-speed-kind-grants` profile for the SRD Ranger Roving
feature shape already authored as a composite passive class feature:

- a +10-foot Speed increase while the creature is not wearing Heavy armor;
- a Climb Speed equal to the creature's Speed;
- a Swim Speed equal to the creature's Speed.

This is deliberately narrower than "all movement features." It should reuse
the Fast Movement passive Speed-bonus projection rather than adding a second
walk-Speed path, then widen only the represented special-speed facts needed for
Roving. It excludes Dash-as-Bonus-Action traits, AC base calculation
alternatives, healing pools, Temporary Hit Points, Breath Weapon attack
replacement, target-side Resistance, and Weapon Mastery properties.

## Source Check

Local RAW anchors read for this decision:

- `.references/srd-5.2.1/Classes/Ranger.md`, `Level 6: Roving`: the Ranger's
  Speed increases by 10 feet while not wearing Heavy armor, and the Ranger has
  a Climb Speed and Swim Speed equal to Speed.
- `.references/srd-5.2.1/Rules-Glossary.md`, `Speed`: a creature can have
  special speeds, can switch between speeds during movement, and must subtract
  distance already moved from the new speed when switching.
- `.references/srd-5.2.1/Rules-Glossary.md`, `Changes to Your Speeds`: if an
  effect increases or decreases Speed for a time, existing special speeds
  increase or decrease by an equal amount for the same duration.
- `.references/srd-5.2.1/Rules-Glossary.md`, `Dash [Action]`: Dash can use a
  chosen special speed, so the implementation boundary must make Dash derive
  from the same effective speed-kind projection used by movement.
- `.references/srd-5.2.1/Rules-Glossary.md`, `Climb Speed` and `Swim Speed`:
  these are special speeds that avoid the extra movement cost normally
  associated with climbing or swimming.

Additional candidate RAW checked:

- `.references/srd-5.2.1/Classes/Barbarian.md`, `Unarmored Defense`;
  `.references/srd-5.2.1/Classes/Monk.md`, `Unarmored Defense`;
  `.references/srd-5.2.1/Rules-Glossary.md`, `Armor Class`.
- `.references/srd-5.2.1/Classes/Paladin.md`, `Lay On Hands` and `Restoring
  Touch`; `.references/srd-5.2.1/Rules-Glossary.md`, `Healing` and `Hit
  Points`.
- `.references/srd-5.2.1/Classes/Ranger.md`, `Tireless`;
  `.references/srd-5.2.1/Character-Origins.md`, Orc `Adrenaline Rush`;
  `.references/srd-5.2.1/Rules-Glossary.md`, `Temporary Hit Points`.
- `.references/srd-5.2.1/Character-Origins.md`, Dragonborn `Breath Weapon` and
  `Damage Resistance`, and Dwarf `Dwarven Resilience`;
  `.references/srd-5.2.1/Rules-Glossary.md`, `Resistance`, `Cone`, `Line`, and
  `Prone`.
- `.references/srd-5.2.1/Equipment.md`, `Mastery Properties`, `Cleave`, and
  `Topple`.

`UBIQUITOUS_LANGUAGE.md` anchors checked:

- `Speed` and `Movement`, to keep Speed capacity and per-turn movement budget
  distinct.
- `Difficult Terrain`, `Action`, and `Dash`, to keep Climb/Swim Speed
  movement costs and Dash derivation inside the speed-kind boundary rather
  than treating Roving as alternate action economy.
- `Unarmored Defense` and `Armor Class`, to keep AC base formula selection out
  of this movement slice.
- `Hit Points`, `Temporary Hit Points`, `Pool`, `Quota`, and `Spend`, to keep
  healing and Temporary Hit Point resources separate.
- `Resistance` and `Damage Type`, to keep target-side damage adjustment
  separate.
- `Weapon Mastery`, `Mastery Property`, `Cleave`, and `Topple`, to keep weapon
  ownership and on-hit mastery riders separate.

## Candidate Triage

| Candidate | Decision |
| --- | --- |
| `ranger_roving` | Best next slice. Fast Movement already forces passive walk-Speed derivation and Heavy-armor predicates. Roving is the adjacent SRD feature that should deliberately widen special speed kinds by granting Climb Speed and Swim Speed equal to effective Speed. |
| `barbarian_unarmored_defense`, `monk_unarmored_defense` | Defer. These are alternative base AC calculations with equipment predicates and "choose one base AC calculation" semantics, not flat AC bonuses and not movement projection. |
| `paladin_lay_on_hands` | Defer. It uses a Long Rest healing pool, variable spend amount at activation time, creature targeting, and the same pool later feeds Restoring Touch condition removal. |
| `ranger_tireless`, `orc_adrenaline_rush` | Defer. Tireless grants Temporary Hit Points through a Magic action and has a separate Short Rest exhaustion benefit. Adrenaline Rush combines Bonus Action Dash, Temporary Hit Points, Proficiency Bonus uses, and Short or Long Rest recharge. |
| `species_dragonborn_breath_weapon` | Defer. It replaces one attack inside the Attack action with a Cone or Line save-gated damage procedure, ancestry-selected damage type, Proficiency Bonus uses, and tiered damage. |
| `species_dragonborn_damage_resistance`, `dwarf_dwarven_resilience` | Defer. Resistance is target-side damage adjustment and typed damage-source admission. Dragonborn also depends on the Draconic Ancestry choice shared with Breath Weapon, while Dwarven Resilience combines poison Resistance with saving throw Advantage against Poisoned. |
| `mastery_cleave`, `mastery_topple` | Defer. Mastery properties require Weapon Mastery ownership, weapon-specific eligibility, and on-hit rider timing. Cleave adds a spatially constrained once-per-turn attack; Topple adds a weapon-attack DC and Prone application. |

## Red/Green Plan

1. Add profile pressure before support.

   Add `unit-feature.passive-speed-kind-grants` to
   `plans/unit-profile-coverage/profiles.jsonl` with QCORE/QMBT owner
   placeholders. Keep `ranger_roving` unsupported until Climb and Swim Speed
   projection is executable.

2. Model the QNT profile first.

   Extend the promoted rule-core feature profile proof with a
   speed-kind grant profile. The model should use procedure facts rather than
   the authored Unit id:

   - base walk Speed in feet;
   - Heavy armor worn vs not worn;
   - fixed +10-foot Speed increase while not wearing Heavy armor;
   - Climb Speed and Swim Speed granted equal to effective Speed;
   - movement budget and Dash budget derived from the chosen effective speed
     kind;
   - switching between speed kinds subtracts distance already moved from the
     newly chosen speed.

3. Promote production support from authored mechanics.

   Extend `packages/battle-runtime/src/unit-feature-support.ts` with a precise
   support parser for class-feature Units whose mechanics are exactly:

   - `kind: "class_feature"`;
   - `mechanics.family: "composite"`;
   - one passive `modify_speed` grant with `delta: 10`, `unit: "feet"`, and
     `condition: { kind: "not_wearing_armor", categories: ["heavy"] }`;
   - one passive grant set containing `grant_speed` for `speedKind: "climb"`
     and `speedKind: "swim"`;
   - each granted speed is derived from `{ kind: "walk_speed" }`;
   - no unrelated passive grants, activation phases, operations, or authored-id
     registry.

4. Make speed kinds executable without duplicating state.

   Use retained Unit support profiles, species/base Speed, equipment loadout,
   and the current turn's distance already moved as canonical source facts.
   Do not store per-Unit Speed caches. Derive effective walk, climb, and swim
   speeds through one helper so the +10-foot fact and "equal to Speed" facts
   cannot diverge.

5. Keep Roving distinct from Fast Movement.

   Fast Movement remains the one passive walk-Speed bonus profile. Roving may
   reuse that lower-level projection, but its supported profile should require
   the special-speed grant facts. A malformed Roving-like Unit with the +10
   Speed bonus but no Climb/Swim grants should remain a Fast Movement-shaped
   profile, not a Roving profile.

6. Add deterministic admission/projection evidence.

   After runtime support is executable, classify `ranger_roving` in
   `unit-claims.jsonl` as supported with profile id
   `unit-feature.passive-speed-kind-grants`. Add deterministic evidence in
   `unit-evidence.jsonl` owned by
   `packages/battle-runtime/src/unit-profile-admission.test.ts` or the
   character battle projection test that proves:

   - a Ranger not wearing Heavy armor projects +10 walk Speed;
   - the same Ranger projects Climb Speed and Swim Speed equal to effective
     Speed;
   - wearing Heavy armor removes the +10 increase and makes Climb/Swim equal
     to the unmodified effective Speed;
   - movement and Dash can choose a represented speed kind;
   - switching between represented speed kinds subtracts distance already moved;
   - adjacent shapes, such as only one special speed, a fixed special-speed
     value, a different Speed delta, a different unit, or a missing Heavy-armor
     predicate, stay unsupported for this slice.

7. Refresh generated matrix artifacts.

   Run `pnpm unit-profile-coverage:check` after claims and evidence updates and
   include the generated `UNIT_REPORT.md` and `unit-matrix.json` changes in the
   implementation task.

## Verification For Implementation Task

- RAW and `UBIQUITOUS_LANGUAGE.md` check for Roving, Speed, special speeds,
  Climb Speed, Swim Speed, Dash, Heavy armor predicates, and the distinction
  between Speed capacity and Movement spent.
- Focused QNT proof for the new speed-kind grant profile.
- Focused runtime parity with the mandatory timed background MBT protocol if
  promoted battle behavior changes.
- `pnpm unit-profile-coverage:check`.
- Relevant package typecheck/tests.
- `pnpm quality` for the production behavior change.
- reviewer loop convergence, minimum two rounds.

## Task 136 Verification

- RAW checked locally against the SRD 5.2.1 files and sections listed in
  `Source Check`.
- `UBIQUITOUS_LANGUAGE.md` checked for the domain terms listed in `Source
  Check`.
- Active-plan consistency updated in the Ralph task index, DAG row, and task
  detail for QMBT41 so each marks the task done and links this decision
  artifact.
- reviewer loop round 1: kept the selected slice to Roving's passive speed-kind
  grants and explicitly required reuse of Fast Movement's Speed-bonus
  projection so there is no duplicate walk-Speed state.
- reviewer loop round 2: no important changes found; the plan still selects one
  feature profile and does not mix AC base calculation, healing pools,
  Temporary Hit Points, attack replacement, resistance, mastery, spell, or
  magic-item scope.
- MBT not run: Task 136 is research-only and makes no promoted battle-runtime
  behavior change.
- `pnpm unit-profile-coverage:check` passed: the refreshed matrix remains
  consistent after the research doc change.
- `pnpm quality` passed for this research-only change.

## Plan Impact

QMBT43 should append a follow-on implementation task for this slice before the
next recursive review batch continues broad feature-family widening. Suggested
task:

`QMBT44 - Promote Roving Passive Speed Kind Grants`

Scope: implement the red/green plan above and close `ranger_roving` as a
supported SRD Unit profile. Out of scope: AC base calculation alternatives,
Lay On Hands and other healing pools, Temporary Hit Point resources, Breath
Weapon attack replacement, resistance traits, Weapon Mastery properties, spell
admission, magic items, and general movement feature families beyond Roving's
authored passive Speed increase plus Climb/Swim Speed grants.
