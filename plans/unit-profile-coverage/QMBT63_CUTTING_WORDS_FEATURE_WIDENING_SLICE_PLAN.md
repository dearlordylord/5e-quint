# QMBT63 Cutting Words Feature Widening Slice Plan

Date: 2026-05-07

## Decision

Select `bard_cutting_words` as the next narrow SRD feature-style widening slice
after Tactical Mind.

The selected slice is the missing ability-check branch of the existing
`unit-feature.reaction-roll-or-damage-reduction` profile:

- a creature the Bard can see within 60 feet succeeds on an Ability Check;
- the Bard can take a Reaction;
- the Bard expends one Bardic Inspiration use;
- the Bard rolls the Bardic Inspiration die and subtracts it from the already
  rolled Ability Check total;
- the reduced total can turn the success into a failure.

This is deliberately narrower than all D20 Test modification, all Bardic
Inspiration use, all reactions to successful rolls, all spell or magic-item
roll manipulation, all healing pools, all Temporary Hit Point features, all AC
base formulas, all Resistance traits, all Breath Weapon execution, and all
Weapon Mastery properties. The implementation should extend the existing
reaction roll-or-damage reduction profile instead of adding a parallel Cutting
Words-only profile or duplicating Bardic Inspiration resource state.

## Source Check

Local RAW anchors read for this decision:

- `.references/srd-5.2.1/Classes/Bard.md`, `Bardic Inspiration` and `Cutting
  Words`: Bardic Inspiration has a Charisma-modifier use pool, a level-scaled
  Bardic die, Long Rest recovery before Font of Inspiration, and Cutting Words
  uses a Reaction to expend one Bardic Inspiration use and subtract the roll
  from a damage roll or from a successful Ability Check or Attack Roll by a
  visible creature within 60 feet.
- `.references/srd-5.2.1/Playing-the-Game.md`, `D20 Tests`, `Ability Checks`,
  `Attack Rolls`, and `Reactions`: Ability Checks are one D20 Test kind; the
  GM determines whether an Ability Check is called for and sets the DC; a
  Reaction is an instant response to a trigger and consumes the creature's
  reaction until the start of its next turn.
- `.references/srd-5.2.1/Rules-Glossary.md`, `Ability Check`, `D20 Test`,
  `Difficulty Class`, and `Reaction`: these terms match the existing project
  boundary for already-rolled check facts and reaction windows.

Additional candidate RAW checked:

- `.references/srd-5.2.1/Classes/Paladin.md`, `Lay On Hands`. Defer because it
  is one healing pool with two executable spend modes: Hit Point restoration
  and Poisoned removal. Admitting only the healing half would split one SRD
  pool across profiles.
- `.references/srd-5.2.1/Classes/Ranger.md`, `Tireless`. Defer because the
  feature combines a Magic action Temporary Hit Point pool with Short Rest
  Exhaustion reduction.
- `.references/srd-5.2.1/Classes/Barbarian.md`, `Unarmored Defense`;
  `.references/srd-5.2.1/Classes/Monk.md`, `Unarmored Defense`; and
  `.references/srd-5.2.1/Playing-the-Game.md`, `Armor Class`. Defer because
  these are alternative base AC formulas, not additive passive AC bonuses, and
  the SRD requires exactly one base AC calculation to be in effect.
- `.references/srd-5.2.1/Character-Origins.md`, Dragonborn `Breath Weapon`,
  Dragonborn `Damage Resistance`, and Dwarf `Dwarven Resilience`. Defer because
  Breath Weapon replaces one Attack-action attack with area save-gated damage
  and a Proficiency Bonus pool, while the resistance traits are target-side
  damage adjustment and Poisoned-condition saving throw pressure.
- `.references/srd-5.2.1/Equipment.md`, `Mastery Properties`, `Sap`, and
  `Topple`. Defer because mastery riders must be gated by weapon choice,
  proficiency, and a Weapon Mastery feature before individual property Units can
  become stable executable rows.

`UBIQUITOUS_LANGUAGE.md` terminology checked:

- `Ability Check`, `D20 Test`, `Difficulty Class`, `Reaction`, `Pool`,
  `Spend`, `Proficiency Bonus`, `Attack Roll`, `Damage Type`, `Armor Class`,
  `Unarmored Defense`, `Resistance`, `Temporary Hit Points`, `Magic Action`,
  `Weapon Mastery`, and `Mastery Property`.
- The selected boundary should say `Ability Check`, not `skill check`, because
  a skill can modify an Ability Check but is not a separate roll type.

## Candidate Triage

| Candidate | Decision |
| --- | --- |
| `bard_cutting_words` | Best next slice. It is the only remaining installed feature/species/mastery row with `needs-surface-widening`, and Tactical Mind has now proved the already-rolled Ability Check outcome boundary needed by its missing branch. |
| `paladin_lay_on_hands` | Defer. The SRD feature owns one Long Rest healing pool that can restore Hit Points or remove Poisoned for 5 pool points. Keep the pool whole. |
| `ranger_tireless` | Defer. The Temporary Hit Point action is narrow, but the feature also owns Short Rest Exhaustion reduction. |
| `barbarian_unarmored_defense`, `monk_unarmored_defense` | Defer. These require base AC formula selection and equipment predicates, not another passive AC bonus. |
| `species_dragonborn_damage_resistance`, `dwarf_dwarven_resilience` | Defer. These belong with target-side Resistance and poison save-advantage modeling, not reaction roll reduction. |
| `species_dragonborn_breath_weapon` | Defer. It is an Attack-action attack replacement with area targeting, Dexterity saves, half damage on success, scaling damage dice, and a Proficiency Bonus pool. |
| `mastery_sap`, `mastery_topple` | Defer. Weapon Mastery needs a weapon ownership and eligibility boundary before individual mastery riders can be admitted safely. |
| `fire_bolt`, `thunderwave`, spells, magic items, equipment records, and content cleanup | Defer. Task 158 excludes spell admission, magic-item intake, checker metric changes, non-runtime equipment data, and content cleanup. |

## Red/Green Plan

1. Preserve the existing profile identity.

   Extend `unit-feature.reaction-roll-or-damage-reduction` for
   `ability_check_reduction`; do not add a new Cutting Words-specific profile.
   Cutting Words already shares the Bardic Inspiration pool, Reaction cost, and
   reduction die with the supported attack-roll and damage-roll branches.

2. Model the missing Ability Check reaction branch in QNT.

   Add already-rolled Ability Check facts for the target creature, original
   total, DC, Bardic Inspiration reduction roll, visibility/range eligibility,
   reaction availability, and Bardic Inspiration pool availability. Prove:

   - pre-reduction failure does not trigger Cutting Words;
   - successful Ability Check can open the reaction boundary;
   - reduction can convert success into failure;
   - reduction that still leaves the total at or above DC remains success;
   - resolving the reaction spends the Bard's Reaction and one Bardic
     Inspiration pool use.

3. Add the runtime Ability Check outcome boundary.

   Introduce a narrow caller-supplied outcome procedure for an already-rolled
   Ability Check. Runtime must accept the actor, check ability, optional
   skill/tool label if already known, original total, DC, and reducer facts; it
   must not decide whether the check is warranted, what the DC is, or whether a
   skill/tool proficiency applies.

4. Promote authored mechanics support.

   Extend `packages/battle-runtime/src/unit-feature-support.ts` so the existing
   `reaction_roll_or_damage_reduction` parser admits
   `ability_check_reduction` only when its trigger is
   `creature_succeeds_ability_check`, it requires a visible creature within 60
   feet, and its reduction is `bardic_inspiration_die`.

5. Keep one Bardic Inspiration pool.

   Use the same class-level Bardic Inspiration use pool and die-size derivation
   already used by the attack-roll and damage-roll Cutting Words branches.
   Avoid adding a separate ability-check reduction pool or copied class-level
   die table.

6. Add deterministic admission/projection evidence.

   After runtime support is executable, classify `bard_cutting_words` as
   supported with `unit-feature.reaction-roll-or-damage-reduction`. Add evidence
   proving the authored SRD Unit is admitted from its mechanics shape, malformed
   ability-check branches remain unsupported, and unrelated healing,
   Temporary Hit Point, AC, Resistance, Breath Weapon, Weapon Mastery, spell,
   magic-item, and content-cleanup shapes are not admitted through this profile.

7. Refresh generated matrix artifacts.

   Run `pnpm unit-profile-coverage:check` after claims/evidence updates and
   include `UNIT_REPORT.md` and `unit-matrix.json` changes in the
   implementation task.

## Active Plan Updates

The active Ralph plan now records:

- QMBT63 as done with this decision artifact.
- QMBT64 as ready for recursive planning review.
- QMBT64 should decide whether to append a future implementation task for
  `Promote Cutting Words Ability Check Reaction Reduction`, or revise the next
  batch shape if its recursive review finds a higher-priority boundary.

## Verification For Implementation Task

- RAW check for Bardic Inspiration, Cutting Words, Ability Checks, D20 Tests,
  Difficulty Class, Reactions, and Bardic Inspiration rest recovery.
- `UBIQUITOUS_LANGUAGE.md` check for Ability Check, D20 Test, Difficulty Class,
  Reaction, Pool, Spend, Proficiency Bonus, Attack Roll, and any boundary terms
  added by the implementation.
- Focused QNT proof for the added ability-check reduction branch of
  `unit-feature.reaction-roll-or-damage-reduction`.
- Focused runtime tests for converted-success-to-failure and still-successful
  reduction behavior.
- Focused runtime tests that malformed ability-check reduction shapes remain
  unsupported.
- Tier 1 battle-runtime MBT with the mandatory timed background protocol if the
  promoted battle-runtime reaction behavior changes.
- `pnpm unit-profile-coverage:check`.
- Relevant package typecheck/tests.
- `pnpm quality` for the production behavior change.
- reviewer loop convergence, minimum two rounds.

## Task 158 Verification

- RAW checked locally against the SRD 5.2.1 files and sections listed in
  `Source Check`.
- `UBIQUITOUS_LANGUAGE.md` checked for the domain terms listed in `Source
  Check`.
- Active-plan consistency was reviewed across the Ralph task index, DAG row,
  and task details for QMBT63-QMBT64.
- reviewer loop round 1: kept the selected slice to the missing Ability Check
  branch of an existing reaction profile and avoided a new Cutting Words-only
  profile or duplicate Bardic Inspiration state.
- reviewer loop round 2: no important changes found; the plan still keeps
  ability-check reaction reduction separate from healing pools, Temporary Hit
  Points, AC formulas, Resistance, Breath Weapon, Weapon Mastery, spells,
  magic items, content cleanup, and checker metrics.
- `pnpm unit-profile-coverage:check` not run because Task 158 changed planning
  docs only and did not change matrix inputs or generated artifacts.
- MBT not run because Task 158 is research-only and makes no promoted
  battle-runtime behavior change.
