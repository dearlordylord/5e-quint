# QMBT45 Relentless Endurance Feature Widening Slice Plan

Date: 2026-05-07

## Decision

Select `orc_relentless_endurance` as the next narrow SRD feature-style
widening slice after Roving.

The slice should promote a new zero-Hit-Point replacement Unit feature profile
for the SRD Orc Relentless Endurance trait:

- when the creature is reduced to 0 Hit Points;
- when the creature is not killed outright;
- optionally replace the drop to 0 with 1 Hit Point instead;
- spend a once-per-Long-Rest trait use.

This is deliberately narrower than "all death-prevention effects" or "all
zero-Hit-Point features." It should use the existing battle-runtime zero-HP
lifecycle and authored `triggered_replacement` mechanics shape rather than
adding an authored-id registry or a parallel death-prevention state. It excludes
movement and special Speed kinds, AC base calculation alternatives, healing
pools, Temporary Hit Points, resistance traits, attack replacement, Weapon
Mastery properties, spells, and magic items.

## Source Check

Local RAW anchors read for this decision:

- `.references/srd-5.2.1/Character-Origins.md`, Orc `Relentless Endurance`:
  when reduced to 0 Hit Points but not killed outright, the Orc can drop to 1
  Hit Point instead, and the trait refreshes after a Long Rest.
- `.references/srd-5.2.1/Playing-the-Game.md`, `Dropping to 0 Hit Points` and
  `Instant Death`: a creature at 0 Hit Points either dies outright or falls
  unconscious; massive damage can kill a character outright.
- `.references/srd-5.2.1/Rules-Glossary.md`, `Hit Points` and `Death Saving
  Throw`: Hit Points cannot be less than 0, and character death-save lifecycle
  begins from 0 Hit Points rather than from a replacement to 1 Hit Point.

Additional candidate RAW checked:

- `.references/srd-5.2.1/Classes/Barbarian.md`, `Unarmored Defense`;
  `.references/srd-5.2.1/Classes/Monk.md`, `Unarmored Defense`;
  `.references/srd-5.2.1/Rules-Glossary.md`, `Armor Class`.
- `.references/srd-5.2.1/Classes/Paladin.md`, `Lay On Hands`; `.references/srd-5.2.1/Rules-Glossary.md`,
  `Healing` and `Hit Points`.
- `.references/srd-5.2.1/Classes/Ranger.md`, `Tireless`;
  `.references/srd-5.2.1/Character-Origins.md`, Orc `Adrenaline Rush`;
  `.references/srd-5.2.1/Playing-the-Game.md`, `Temporary Hit Points`.
- `.references/srd-5.2.1/Character-Origins.md`, Dragonborn `Breath Weapon`
  and `Damage Resistance`, and Dwarf `Dwarven Resilience`;
  `.references/srd-5.2.1/Playing-the-Game.md`, `Resistance and Vulnerability`.
- `.references/srd-5.2.1/Equipment.md`, `Mastery Properties`, especially
  `Cleave`, `Nick`, `Push`, and the already installed `Sap` pressure.

`UBIQUITOUS_LANGUAGE.md` anchors checked:

- `Hit Points`, `Instant Death`, `Death Saving Throw`, `Unconscious`,
  `Stable`, and `Healing`, to keep Relentless Endurance as a drop-to-0
  replacement rather than healing or positive-HP recovery.
- `Pool`, `Quota`, `Spend`, and `Long Rest`, to keep the once-per-Long-Rest
  trait use explicit without mixing it with Lay On Hands style healing pools.
- `Armor Class` and `Unarmored Defense`, to keep AC base formulas out of this
  zero-HP replacement slice.
- `Temporary Hit Points`, to keep Adrenaline Rush and Tireless outside the
  selected boundary.
- `Resistance`, `Damage Type`, `Weapon Mastery`, `Mastery Property`, `Cleave`,
  `Sap`, and `Topple`, to keep target-side damage adjustment and weapon riders
  separate.

## Candidate Triage

| Candidate | Decision |
| --- | --- |
| `orc_relentless_endurance` | Best next slice. It is installed SRD Unit pressure, has a single authored `triggered_replacement` shape, and should compose with the already promoted zero-HP lifecycle without mixing resource-pool healing, Temporary Hit Points, AC, resistance, attack replacement, or mastery scope. |
| `barbarian_unarmored_defense`, `monk_unarmored_defense` | Defer. These are authored but not installed in the current SRD Unit catalog and require an AC base formula choice boundary, equipment predicates, and "one base AC calculation" semantics rather than a feature procedure replay boundary. |
| `paladin_lay_on_hands` | Defer. It is a variable healing pool, creature-targeted Bonus Action, and later feeds condition removal through Restoring Touch. That should be a healing-pool slice, not a zero-HP replacement slice. |
| `ranger_tireless`, `orc_adrenaline_rush` | Defer. Tireless is a Magic action Temporary Hit Point grant plus Short Rest exhaustion reduction; Adrenaline Rush combines Dash-as-Bonus-Action, Temporary Hit Points, a Proficiency Bonus use pool, and Short or Long Rest recharge. |
| `species_dragonborn_breath_weapon` | Defer. It replaces one attack during the Attack action with a Cone or Line save-gated damage procedure, ancestry-selected damage type, scaling dice, and a Proficiency Bonus use pool. |
| `species_dragonborn_damage_resistance`, `dwarf_dwarven_resilience` | Defer. These are target-side typed damage adjustment traits. Dragonborn also shares Draconic Ancestry with Breath Weapon; Dwarven Resilience combines poison Resistance with saving throw Advantage against Poisoned. |
| `mastery_sap`, `mastery_cleave`, `mastery_topple` | Defer. Mastery properties require Weapon Mastery ownership, weapon eligibility, and on-hit rider timing. Sap is installed pressure, but selecting it before the ownership boundary would make invalid mastery-use states representable. |
| `fighter_tactical_mind`, `bard_cutting_words`, `feat_boon_of_combat_prowess` | Defer. Each belongs to a roll-modification or ability-check/miss-to-hit boundary, not the post-Roving zero-HP replacement boundary. |

## Red/Green Plan

1. Add profile pressure before support.

   Add a profile id such as
   `unit-feature.zero-hit-point-replacement` to
   `plans/unit-profile-coverage/profiles.jsonl`. Keep
   `orc_relentless_endurance` unsupported until production can execute the
   authored replacement shape and prove deterministic admission evidence.

2. Model the QNT profile first.

   Extend the package-local rule-core feature profile proof with a zero-HP
   replacement profile. Model facts, not Unit ids:

   - current Hit Points and Hit Point maximum before damage;
   - effective incoming damage after existing damage projection;
   - killed-outright vs not-killed-outright outcome;
   - optional choice to use the feature;
   - once-per-Long-Rest use pool;
   - replacement Hit Points fixed at 1;
   - no death-save initialization and no Unconscious condition when the
     replacement applies.

3. Promote production support from authored mechanics.

   Extend `packages/battle-runtime/src/unit-feature-support.ts` with a precise
   parser for species-trait Units whose mechanics are exactly:

   - `kind: "species_trait"`;
   - `mechanics.family: "triggered_replacement"`;
   - `trigger.kind: "reduced_to_0_hp_not_killed_outright"`;
   - `effect.kind: "prevent_drop_to_0_hp"`;
   - `effect.replacementHp: 1`;
   - `optional: true`;
   - `resetCadence.kind: "long_rest"`.

   Adjacent Death Ward-like spell mechanics and magic-item effects must remain
   outside this Unit-feature profile unless their own spell or magic-item
   boundary is selected later.

4. Execute through one zero-HP lifecycle boundary.

   Thread supported Unit profiles into the existing damage/drop-to-zero
   lifecycle. Do not duplicate current Hit Points, death-save state, or
   "killed outright" facts. The replacement decision should happen at the same
   boundary that already distinguishes ordinary drop-to-zero, monster death,
   character death-save initialization, and massive damage.

5. Add deterministic admission/projection evidence.

   After runtime support is executable, classify `orc_relentless_endurance` in
   `unit-claims.jsonl` as supported with the new profile id. Add deterministic
   evidence in `unit-evidence.jsonl` owned by
   `packages/battle-runtime/src/unit-profile-admission.test.ts` or a
   zero-HP-focused battle-runtime test that proves:

   - the SRD Orc trait is admitted from the authored `triggered_replacement`
     shape;
   - a non-outright drop to 0 can be replaced with 1 Hit Point;
   - declining the optional replacement follows the normal zero-HP lifecycle;
   - killed-outright or already-spent cases do not apply the replacement;
   - the use is spent on application and restored by Long Rest;
   - malformed shapes, wrong replacement HP, non-optional replacement, wrong
     trigger, wrong reset cadence, or spell/magic-item sources remain
     unsupported for this Unit-feature slice.

6. Refresh generated matrix artifacts.

   Run `pnpm unit-profile-coverage:check` after claims and evidence updates and
   include the generated `UNIT_REPORT.md` and `unit-matrix.json` changes in the
   implementation task.

## Verification For Implementation Task

- RAW and `UBIQUITOUS_LANGUAGE.md` check for Relentless Endurance, Hit Points,
  Dropping to 0 Hit Points, Instant Death, Death Saving Throws, Unconscious,
  Long Rest reset, and the distinction between zero-HP replacement and healing.
- Focused QNT proof for the new zero-HP replacement feature profile.
- Focused runtime parity with the mandatory timed background MBT protocol if
  promoted battle behavior changes.
- `pnpm unit-profile-coverage:check`.
- Relevant package typecheck/tests.
- `pnpm quality` for the production behavior change.
- reviewer loop convergence, minimum two rounds.

## Task 140 Verification

- RAW checked locally against the SRD 5.2.1 files and sections listed in
  `Source Check`.
- `UBIQUITOUS_LANGUAGE.md` checked for the domain terms listed in `Source
  Check`.
- Active-plan consistency updated in the Ralph task index, DAG row, and task
  detail for QMBT45 so each marks the task done and links this decision
  artifact; QMBT46 is unblocked for recursive planning review.
- reviewer loop round 1: selected the installed SRD zero-HP replacement pressure
  rather than continuing movement after Roving, and kept the implementation
  boundary tied to the existing zero-HP lifecycle so there is no duplicate
  Hit Point or death-save state.
- reviewer loop round 2: no important changes found; the plan still selects one
  feature profile and does not mix AC base calculation, healing pools,
  Temporary Hit Points, attack replacement, resistance, mastery, spell, or
  magic-item scope.
- MBT not run: Task 140 is research-only and makes no promoted battle-runtime
  behavior change.

## Plan Impact

QMBT46 should append a follow-on implementation task for this slice before the
next recursive review batch continues broad feature-family widening. Suggested
task:

`QMBT47 - Promote Relentless Endurance Zero-Hit-Point Replacement`

Scope: implement the red/green plan above and close
`orc_relentless_endurance` as a supported SRD Unit profile. Out of scope:
general death-prevention effects, Death Ward and other spells, magic items,
AC base calculation alternatives, Lay On Hands and other healing pools,
Temporary Hit Point resources, Breath Weapon attack replacement, resistance
traits, Weapon Mastery properties, and broad zero-Hit-Point feature families.
