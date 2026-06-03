# QMBT57 Deflect Attacks Feature Widening Slice Plan

Date: 2026-05-07

## Decision

Select `monk_deflect_attacks` as the next narrow SRD feature-style widening
slice after Combat Prowess.

The slice should promote the unsupported SRD Deflect Attacks follow-up that
occurs only after the already modeled damage reduction reduces the attack's
damage to 0:

- the triggering attack roll hit the Monk;
- the attack damage includes Bludgeoning, Piercing, or Slashing damage;
- the Monk took a Reaction to reduce the attack's total damage;
- if that reduction makes the damage 0, the Monk can expend 1 Focus Point;
- if the Monk expends the Focus Point, a visible redirect target is chosen
  using the melee or ranged attack distance rule;
- the redirect target makes a Dexterity saving throw;
- on a failed save, the redirect target takes damage equal to two Martial Arts
  die rolls plus the Monk's Dexterity modifier, with the same damage type dealt
  by the attack.

This is deliberately narrower than all Monk support, all Reaction damage
reduction, all redirect effects, or all Focus Point features. It should extend
the existing attack-damage Reaction reduction boundary rather than creating an
authored-id hook or a parallel damage pipeline.

## Source Check

Local RAW anchors read for this decision:

- `.references/srd-5.2.1/Classes/Monk.md`, `Deflect Attacks`: a Reaction can
  reduce attack damage that includes Bludgeoning, Piercing, or Slashing damage;
  if reduced to 0, spending 1 Focus Point can redirect force to a visible
  target selected by melee or ranged attack distance, with Dexterity saving
  throw and same-type reflected damage.
- `.references/srd-5.2.1/Classes/Monk.md`, `Monk's Focus` and `Martial Arts`,
  because the follow-up spends Focus Points and computes damage from Martial
  Arts dice plus Dexterity.
- `.references/srd-5.2.1/Playing-the-Game.md`, `Damage Rolls`, `Damage Types`,
  and `Resistance and Vulnerability`, because Deflect Attacks reduces attack
  damage before target-side damage adjustments and the redirected damage must
  preserve the original damage type.
- `.references/srd-5.2.1/Rules-Glossary.md`, `Reaction`, because the reduction
  spends the Monk's Reaction and the redirect is a follow-up to that Reaction,
  not a second Reaction.

Additional candidate RAW checked:

- `.references/srd-5.2.1/Classes/Fighter.md`, `Tactical Mind`. Defer because
  it is an ability-check resource-augmentation slice: a failed ability check
  can spend the existing Second Wind pool, roll 1d10, and refund the spend if
  the check still fails. The battle MBT bridge explicitly does not model
  ability-check holes yet.
- `.references/srd-5.2.1/Classes/Bard.md`, `Cutting Words`. Defer because the
  remaining full-SRD gap is the successful ability-check branch of a Reaction
  feature that also covers attack rolls and damage rolls. Production already
  supports the attack-roll and damage-roll branches; selecting the remaining
  branch should wait for ability-check Reaction holes.
- `.references/srd-5.2.1/Classes/Paladin.md`, `Lay On Hands`, and
  `.references/srd-5.2.1/Rules-Glossary.md`, `Healing`. Defer because Lay On
  Hands is a creature-targeted healing pool and later shares that pool with
  condition-removal pressure.
- `.references/srd-5.2.1/Classes/Ranger.md`, `Tireless`, and
  `.references/srd-5.2.1/Playing-the-Game.md`, `Temporary Hit Points`. Defer
  because Tireless combines a Magic action Temporary Hit Point grant with
  Short Rest Exhaustion reduction.
- `.references/srd-5.2.1/Classes/Barbarian.md`, `Unarmored Defense`;
  `.references/srd-5.2.1/Classes/Monk.md`, `Unarmored Defense`; and
  `.references/srd-5.2.1/Character-Creation.md`, multiple Armor Class
  calculations. Defer because these are mutually exclusive AC base formulas
  with equipment predicates.
- `.references/srd-5.2.1/Character-Origins.md`, Dragonborn `Breath Weapon`,
  Dragonborn `Damage Resistance`, and Dwarf `Dwarven Resilience`. Defer
  because Breath Weapon is an Attack-action attack replacement with area
  save-gated damage, while the resistance traits are target-side damage
  adjustment and saving-throw-advantage pressure.
- `.references/srd-5.2.1/Equipment.md`, `Mastery Properties`. Defer because
  Weapon Mastery requires weapon ownership, weapon eligibility, and
  property-specific rider timing before individual mastery Units can be
  represented without invalid states.

`UBIQUITOUS_LANGUAGE.md` terminology checked:

- Defined UL anchors `Reaction`, `Attack Roll`, `Damage Type`, and
  `Resistance`, plus SRD-only `Damage Rolls` wording, to keep this as an
  attack-damage Reaction follow-up that preserves damage typing and
  target-side damage adjustment order.
- `Pool`, `Quota`, `Spend`, and `Long Rest`, to keep Focus Point spend and
  refresh distinct from Second Wind, Bardic Inspiration, healing pools, and
  Temporary Hit Point use pools.
- Defined UL anchors `Ability Check`, `Hit Points`, `Temporary Hit Points`,
  `Armor Class`, `Unarmored Defense`, `Weapon Mastery`, and `Mastery
  Property`, plus SRD-only or absent vocabulary gaps `D20 Test` and `Healing`,
  to keep deferred candidate lanes domain-distinct.

## Candidate Triage

| Candidate | Decision |
| --- | --- |
| `monk_deflect_attacks` | Best next slice. It is installed SRD Unit pressure, Surface already carries the `zeroDamageRedirect` fact, production already supports the reusable attack-damage Reaction reduction boundary, and the remaining unsupported gap is one follow-up gated by reduced damage being 0. |
| `fighter_tactical_mind` | Defer. It needs an ability-check outcome boundary, Second Wind resource coupling, and refund-on-still-failed semantics. That is not a Reaction damage follow-up and the current battle MBT lane does not model ability-check holes. |
| `bard_cutting_words` | Defer. The unresolved full-SRD branch is ability-check Reaction reduction. It should be planned with ability-check Reaction holes rather than mixed into an attack-damage redirect slice. |
| `paladin_lay_on_hands` | Defer. It is a variable healing pool with creature targeting and later condition-removal sharing. |
| `ranger_tireless` | Defer. It is a Magic action Temporary Hit Point feature coupled with Short Rest Exhaustion reduction. |
| `barbarian_unarmored_defense`, `monk_unarmored_defense` | Defer. These require AC base formula selection and equipment predicates, including the rule that only one base AC calculation can apply. |
| `species_dragonborn_damage_resistance`, `dwarf_dwarven_resilience` | Defer. These are resistance and saving-throw-advantage traits, not attack-damage redirect follow-ups. |
| `species_dragonborn_breath_weapon` | Defer. It replaces one Attack-action attack with a Cone or Line save-gated damage procedure and a Proficiency Bonus use pool. |
| `mastery_sap`, `mastery_cleave`, `mastery_topple` | Defer. Weapon Mastery needs ownership and weapon-eligibility modeling before individual property riders can be represented without invalid states. |
| `fire_bolt`, `thunderwave`, spells, and magic items | Defer. Task 152 is feature-widening selection and does not change spell or magic-item lane ownership. |

## Red/Green Plan

1. Add profile pressure before support.

   Add a profile id such as
   `unit-feature.attack-damage-reduction-zero-damage-redirect` to
   `plans/unit-profile-coverage/profiles.jsonl`. Keep `monk_deflect_attacks`
   unsupported until production can execute the zero-damage redirect follow-up
   from mechanics facts.

2. Model the QNT profile first.

   Extend the promoted rule-core feature profile proof with
   facts for:

   - attack hit by attack roll;
   - incoming damage includes at least one Bludgeoning, Piercing, or Slashing
     entry;
   - Reaction reduction amount of `1d10 + Dexterity modifier + Monk level`;
   - reduced attack damage being 0 as the only redirect gate;
   - optional Focus Point spend;
   - Monk Focus save DC `8 + Wisdom modifier + Proficiency Bonus`;
   - melee and ranged redirect target eligibility;
   - Dexterity saving throw success/failure;
   - same-type redirected damage on failed save.

3. Promote support from authored mechanics.

   Extend `packages/battle-runtime/src/unit-feature-support.ts` to parse the
   existing Surface shape for Deflect Attacks exactly:

   - `family: "reaction_roll_or_damage_reduction"`;
   - one `attack_damage_reduction` modifier;
   - trigger `hit_by_attack_roll`;
   - damage includes Bludgeoning, Piercing, or Slashing;
   - reduction `dice_plus_ability_modifier_plus_class_level` with `1d10` and
     Dexterity;
   - `zeroDamageRedirect: true`;
   - no ability-check branch, attack-roll branch, Bardic Inspiration resource,
     healing, Temporary Hit Points, AC formula, resistance, mastery rider,
     spell hook, or magic-item hook.

4. Execute through the existing damage Reaction boundary.

   Add the redirect as a follow-up to a successful Deflect Attacks damage
   reduction whose effective attack damage becomes 0. Reuse the existing
   Reaction spend and damage resolution ordering. The redirect should consume
   Focus Point only when the Monk chooses the redirect, not when the ordinary
   damage reduction is applied.

5. Represent redirect target and save facts explicitly.

   Use named fields rather than positional fill conventions for:

   - redirect target;
   - attack kind for melee/ranged distance rule;
   - Dexterity saving throw result;
   - redirected damage roll total;
   - original damage type selection when the source damage had more than one
     eligible type.

   If the current runtime cannot make the "same type dealt by the attack" rule
   unambiguous for mixed-damage attacks, stop the implementation task and ask
   for an owner decision rather than silently choosing a type.

6. Add deterministic admission/projection evidence.

   After runtime support is executable, classify `monk_deflect_attacks` in
   `unit-claims.jsonl` as supported with the new profile id. Add deterministic
   evidence in `unit-evidence.jsonl` owned by focused battle-runtime tests
   proving:

   - the authored SRD Unit is admitted from the mechanics shape, not Unit id;
   - damage reduction alone works when damage remains above 0;
   - redirect is unavailable unless reduction brings the damage to 0;
   - redirect spends 1 Focus Point only when chosen;
   - melee and ranged redirect target eligibility follow the SRD distances;
   - a failed Dexterity save applies same-type redirected damage;
   - a successful Dexterity save applies no redirected damage;
   - malformed redirect shapes and ability-check, healing, AC, resistance,
     Breath Weapon, Weapon Mastery, spell, and magic-item shapes remain
     unsupported for this profile.

7. Refresh generated matrix artifacts.

   Run `pnpm unit-profile-coverage:check` after claims and evidence updates and
   include generated `UNIT_REPORT.md` and `unit-matrix.json` changes in the
   implementation task.

## Verification For Implementation Task

- RAW check for Deflect Attacks, Monk's Focus, Martial Arts, Damage Rolls,
  Saving Throw, Dexterity saving throw, Monk Focus save DC, Focus Point spend,
  and same-type redirected damage. `UBIQUITOUS_LANGUAGE.md` check for defined
  anchors Reaction, Attack Roll, Damage Type, Resistance, Ability Check, Spend,
  Pool, Hit Points, Temporary Hit Points, Armor Class, Unarmored Defense,
  Weapon Mastery, and Mastery Property, plus recorded SRD-only or absent
  vocabulary gaps for Damage Rolls, D20 Test, and Healing.
- Focused QNT proof for the new attack-damage reduction zero-damage redirect
  profile.
- Focused runtime parity with the mandatory timed background MBT protocol if
  promoted battle behavior changes.
- `pnpm unit-profile-coverage:check`.
- Relevant package typecheck/tests.
- `pnpm quality` for the production behavior change.
- reviewer loop convergence, minimum two rounds.

## Task 152 Verification

- RAW checked locally against the SRD 5.2.1 files and sections listed in
  `Source Check`.
- `UBIQUITOUS_LANGUAGE.md` checked for the domain terms listed in `Source
  Check`.
- Active-plan consistency updated in the Ralph task index, DAG row, and task
  detail for QMBT57 so each marks the task done and links this decision
  artifact. QMBT58 remains unblocked for recursive planning review.
- reviewer loop round 1: selected the installed SRD redirect-on-zero pressure
  rather than ability-check, healing-pool, Temporary Hit Point, AC-formula,
  resistance, Breath Weapon, Weapon Mastery, spell, or magic-item pressure;
  kept the boundary tied to the already promoted attack-damage Reaction
  reduction.
- reviewer loop round 2: no important changes found; the plan still selects one
  feature profile and avoids duplicate damage state by requiring the existing
  damage Reaction path as the executable boundary.
- MBT not run: Task 152 is research-only and makes no promoted battle-runtime
  behavior change.

## Plan Impact

QMBT58 should review this decision and append a follow-on implementation task
for this slice before the next recursive review batch continues broad feature
family widening. Suggested task:

`QMBT59 - Promote Deflect Attacks Zero-Damage Redirect`

Scope: implement the red/green plan above and close `monk_deflect_attacks` as
a supported SRD Unit profile. Out of scope: Tactical Mind ability-check
augmentation, Cutting Words ability-check Reaction support, Lay On Hands
healing pools, Tireless Temporary Hit Points, AC base formula alternatives,
resistance traits, Dragonborn Breath Weapon, Weapon Mastery properties, spell
admission, magic-item intake, and broad Monk or Focus Point support.
