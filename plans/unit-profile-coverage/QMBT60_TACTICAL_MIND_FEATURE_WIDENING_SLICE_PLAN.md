# QMBT60 Tactical Mind Feature Widening Slice Plan

Date: 2026-05-07

## Decision

Select `fighter_tactical_mind` as the next narrow SRD feature-style widening
slice after Deflect Attacks.

The selected slice is the Fighter level 2 Tactical Mind ability-check
augmentation:

- the Fighter has just failed an ability check;
- the Fighter can expend one use of the already promoted Second Wind pool;
- instead of restoring Hit Points, the Fighter rolls `1d10` and adds the result
  to the failed ability check;
- if the augmented total still fails the check, the Second Wind use is not
  expended.

This is deliberately narrower than all ability-check support, all D20 Test
augmentation, all Second Wind feature coupling, all refunding resources, all
Bardic Inspiration reactions, or all noncombat checks. The implementation
should add an explicit ability-check outcome boundary with GM/table-supplied
check facts, then thread the existing Second Wind pool through that boundary.
Do not infer ability-check DCs, skill applicability, tool applicability, or
narrative permission inside battle runtime.

## Source Check

Local RAW anchors read for this decision:

- `.references/srd-5.2.1/Classes/Fighter.md`, `Second Wind` and `Tactical
  Mind`: Second Wind has a finite use pool, restores Hit Points as a Bonus
  Action, and Tactical Mind spends that same use on a failed ability check to
  add `1d10`; if the check still fails, the use is not expended.
- `.references/srd-5.2.1/Playing-the-Game.md`, `D20 Tests` and `Ability
  Checks`: ability checks are one of the three D20 Test kinds; the GM determines
  when an ability check is called for and sets the DC.
- `.references/srd-5.2.1/Rules-Glossary.md`, `Long Rest` and `Short Rest`:
  some features recharge as their feature text specifies, preserving the
  existing Second Wind Short Rest and Long Rest refresh semantics.

Additional candidate RAW checked:

- `.references/srd-5.2.1/Classes/Bard.md`, `Bardic Inspiration` and `Cutting
  Words`. Defer because the remaining unsupported full-SRD branch is an
  ability-check Reaction reduction on a creature the Bard can see within 60
  feet. It should reuse the ability-check outcome boundary after Tactical Mind
  proves the non-Reaction self-augmentation case.
- `.references/srd-5.2.1/Classes/Paladin.md`, `Lay On Hands`. Defer because it
  is a creature-targeted variable healing pool that also spends the same pool
  for Poisoned removal; selecting only Hit Point restoration now would risk
  splitting one SRD pool across two later profiles.
- `.references/srd-5.2.1/Classes/Ranger.md`, `Tireless`. Defer because it
  combines a Magic action Temporary Hit Point feature with Short Rest Exhaustion
  reduction. The Temporary Hit Point part is narrow, but the SRD feature is not
  only a Temporary Hit Point action.
- `.references/srd-5.2.1/Classes/Barbarian.md`, `Unarmored Defense`;
  `.references/srd-5.2.1/Classes/Monk.md`, `Unarmored Defense`; and
  `.references/srd-5.2.1/Equipment.md`, `Armor`. Defer because AC base formulas
  require one-at-a-time formula selection and equipment predicates, not another
  additive passive AC bonus.
- `.references/srd-5.2.1/Character-Origins.md`, Dragonborn `Breath Weapon`,
  Dragonborn `Damage Resistance`, and Dwarf `Dwarven Resilience`. Defer because
  Breath Weapon is an Attack-action attack replacement with area save-gated
  damage and a Proficiency Bonus use pool, while resistance traits are
  target-side damage adjustment and saving-throw-advantage pressure.
- `.references/srd-5.2.1/Equipment.md`, `Mastery Properties`, `Sap`, and
  `Topple`. Defer because individual mastery properties require a prior weapon
  mastery ownership/weapon eligibility boundary, so `mastery_sap` and
  `mastery_topple` are not yet invalid-state-free standalone Unit rows.

`UBIQUITOUS_LANGUAGE.md` terminology checked:

- `Ability Check`, `D20 Test`, `Difficulty Class`, `Proficiency Bonus`,
  `Pool`, `Spend`, `Refund`, `Hit Points`, `Temporary Hit Points`, `Magic
  Action`, `Armor Class`, `Unarmored Defense`, `Resistance`, `Saving Throw`,
  `Weapon Mastery`, and `Mastery Property`.
- The selected profile should use `Refund` for the still-failed Tactical Mind
  case because RAW preserves the spent Second Wind use without rewinding any
  separate action quota.

## Candidate Triage

| Candidate | Decision |
| --- | --- |
| `fighter_tactical_mind` | Best next slice. It is installed SRD `needs-surface-widening` pressure, Surface already carries a specific `failed_ability_check_second_wind_boost` mechanics shape, and it reuses the promoted Second Wind pool while adding one explicit ability-check outcome boundary. |
| `bard_cutting_words` | Defer. It should follow Tactical Mind because it needs the same ability-check outcome facts plus a Reaction window, visibility/range facts, Bardic Inspiration die scaling, and opponent success-to-failure reduction. |
| `paladin_lay_on_hands` | Defer. The pool heals a touched creature and also removes Poisoned for 5 pool points. Keep one Lay On Hands pool rather than admitting only the healing half as a separate runtime state. |
| `ranger_tireless` | Defer. The Magic action Temporary Hit Point grant is promising, but the same feature also owns Short Rest Exhaustion reduction. A later plan should either model both or explicitly split by executable boundary without duplicating the feature's use pool. |
| `barbarian_unarmored_defense`, `monk_unarmored_defense` | Defer. These are alternative AC base formulas gated by not wearing armor, not additive AC bonuses. They need one formula-selection owner across armor, shield, Mage Armor, and Unarmored Defense. |
| `species_dragonborn_damage_resistance`, `dwarf_dwarven_resilience` | Defer. These are passive resistance and saving-throw-advantage traits. They should be planned with target-side damage adjustment and poison-condition save facts, not ability-check augmentation. |
| `species_dragonborn_breath_weapon` | Defer. It replaces one attack inside the Attack action with a Cone or Line save-gated damage procedure and a Proficiency Bonus use pool. |
| `mastery_sap`, `mastery_topple` | Defer. Weapon Mastery needs weapon ownership and eligibility before individual property riders can become stable executable Unit profiles. |
| `fire_bolt`, `thunderwave`, spells, magic items, equipment records, and content cleanup | Defer. QMBT60 is a feature/species widening selection task and does not change spell, magic-item, equipment-data, or duplicate-content lane ownership. |

## Red/Green Plan

1. Add profile pressure before support.

   Add a profile id such as
   `unit-feature.failed-ability-check-second-wind-boost` to
   `plans/unit-profile-coverage/profiles.jsonl`. Keep
   `fighter_tactical_mind` as `needs-surface-widening` until production can
   execute the authored mechanics shape from facts rather than Unit id.

2. Model the QNT profile first.

   Extend the package-local promoted rule-core feature profile proof with facts
   for:

   - original ability-check total and DC;
   - failed pre-feature outcome as the only activation gate;
   - Second Wind pool availability;
   - Tactical Mind `1d10` boost roll;
   - augmented total;
   - success after augmentation versus still failed;
   - spend on success after augmentation;
   - refund/no-spend when the augmented total still fails.

3. Add an ability-check outcome boundary.

   Introduce a narrow runtime procedure for already-rolled ability-check facts:
   actor, ability, optional skill/tool label if the caller already knows it,
   original total, DC, and Tactical Mind boost roll fill. The runtime should not
   decide whether an ability check is called for, whether a proficiency applies,
   or what the DC is; those are caller/table facts under SRD control.

4. Promote support from authored mechanics.

   Extend `packages/battle-runtime/src/unit-feature-support.ts` to parse only
   the existing Surface shape:

   - `family: "failed_ability_check_second_wind_boost"`;
   - `trigger.kind: "failed_ability_check"`;
   - `bonus.kind: "dice"` with exactly `1d10`;
   - `spends.resourceUnitId: "fighter_second_wind"`;
   - `refundSpendOnStillFailed: true`.

   Do not admit Cutting Words ability-check reduction, Bardic Inspiration,
   healing pools, Temporary Hit Points, AC formulas, Resistance, Breath Weapon,
   Weapon Mastery, spells, or magic items through this profile.

5. Thread the existing Second Wind pool.

   Reuse the resource state already used by `fighter_second_wind`. Tactical Mind
   should spend from the same pool on a converted success and leave the same
   pool unchanged when the boosted check still fails. Avoid a parallel Tactical
   Mind pool or a copied Second Wind counter.

6. Add deterministic admission/projection evidence.

   After runtime support is executable, classify `fighter_tactical_mind` as
   supported with the new profile id. Add deterministic evidence proving:

   - the authored SRD Unit is admitted from the mechanics shape, not Unit id;
   - a pre-feature successful ability check cannot trigger Tactical Mind;
   - a failed check converted to success spends one Second Wind use;
   - a failed check that remains failed does not spend the use;
   - no Bonus Action is spent by Tactical Mind because RAW says the Second Wind
     use is expended "rather than regaining Hit Points";
   - malformed dice, missing Second Wind resource references, and unrelated
     ability-check Reaction, healing, Temporary Hit Point, AC, resistance,
     Breath Weapon, Weapon Mastery, spell, and magic-item shapes remain
     unsupported for this profile.

7. Refresh generated matrix artifacts.

   Run `pnpm unit-profile-coverage:check` after claims and evidence updates and
   include generated `UNIT_REPORT.md` and `unit-matrix.json` changes in the
   implementation task.

## Active Plan Updates

The active plan records:

- QMBT60 as done with this decision artifact.
- QMBT61 as ready for recursive planning review and responsible for refining
  QMBT62 if needed, then appending the rest of the next batch.
- QMBT62 as a blocked implementation task for
  `Promote Tactical Mind Failed Ability Check Second Wind Boost`.

QMBT62 scope: implement the red/green plan above for `fighter_tactical_mind`
only. Out of scope: Bard Cutting Words ability-check Reaction reduction,
generic D20 Test augmentation, GM ability-check decision logic, Lay On Hands,
Tireless, AC base formulas, resistance traits, Breath Weapon, Weapon Mastery,
spells, magic items, and checker metric changes.

QMBT61 should keep a later feature-selection task and a recursive planning
review task in the appended batch unless the matrix lane is explicitly declared
complete.

## Verification For Implementation Task

- RAW check for Fighter Second Wind, Tactical Mind, ability checks, D20 Tests,
  Short Rest, and Long Rest.
- `UBIQUITOUS_LANGUAGE.md` check for Ability Check, Pool, Spend, Refund,
  Proficiency Bonus, Hit Points, and any boundary terms added by the
  implementation.
- Focused QNT proof for the new failed ability-check Second Wind boost profile.
- Focused runtime tests for ability-check boost conversion and still-failed
  refund behavior.
- Focused runtime parity with the mandatory timed background MBT protocol if
  promoted battle behavior changes.
- `pnpm unit-profile-coverage:check`.
- Relevant package typecheck/tests.
- `pnpm quality` for the production behavior change.
- `/simplify` convergence, minimum two rounds.

## Task 155 Verification

- RAW checked locally against the SRD 5.2.1 files and sections listed in
  `Source Check`.
- `UBIQUITOUS_LANGUAGE.md` checked for the domain terms listed in `Source
  Check`.
- Active-plan consistency updated in the Ralph task index, DAG row, and task
  detail for QMBT60 so the task is done and links this decision artifact.
  QMBT61 is unblocked for recursive planning review, and QMBT62 is recorded as
  the blocked Tactical Mind implementation task.
- `/simplify` round 1: selected the installed `fighter_tactical_mind`
  `needs-surface-widening` row before broader authored-not-catalog feature and
  species groups; kept the implementation boundary to one ability-check
  augmentation and the existing Second Wind pool.
- `/simplify` round 2: no important changes found; the plan still avoids a
  generic D20 Test framework, avoids duplicate Second Wind state, and leaves
  Cutting Words, Lay On Hands, Tireless, AC formulas, Resistance, Breath
  Weapon, Weapon Mastery, spells, and magic items in their own lanes.
- MBT not run: Task 155 is research-only and makes no promoted battle-runtime
  behavior change.
