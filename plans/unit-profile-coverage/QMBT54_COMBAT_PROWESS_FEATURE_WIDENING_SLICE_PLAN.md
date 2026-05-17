# QMBT54 Combat Prowess Feature Widening Slice Plan

Date: 2026-05-07

## Decision

Select `feat_boon_of_combat_prowess` as the next narrow SRD feature-style
widening slice after Adrenaline Rush.

The slice should promote the Boon of Combat Prowess `Peerless Aim` benefit as
one attack-roll outcome replacement Unit-feature profile:

- when the creature misses with an attack roll;
- the creature can hit instead;
- once the benefit is used, it cannot be used again until the start of the
  creature's next turn.

This is deliberately narrower than "all attack replacement," "all Epic Boons,"
"all miss or hit manipulation," or "all d20 outcome replacement." It should use
the existing battle attack-roll outcome boundary and current-turn resource
reset facts rather than adding an authored-id hook or a parallel attack result
state. It excludes Temporary Hit Point features, healing pools, AC base
formulas, resistance traits, Weapon Mastery properties, spells, and magic-item
intake.

## Source Check

Local RAW anchors read for this decision:

- `.references/srd-5.2.1/Feats.md`, `Boon of Combat Prowess`: Ability Score
  Increase plus `Peerless Aim`, which says that when the creature misses with
  an attack roll, it can hit instead, and the benefit cannot be reused until
  the start of the creature's next turn.
- `.references/srd-5.2.1/Rules-Glossary.md`, `Attack Roll`: an attack roll is
  a D20 Test for making an attack with a weapon, an Unarmed Strike, or a spell.
- `.references/srd-5.2.1/Rules-Glossary.md`, `D20 Test`, `Armor Class`,
  `Damage Roll`, and `Reaction`, to keep this as an attack-roll outcome
  replacement rather than a generic d20 modifier, damage modifier, or Reaction
  feature.

Additional candidate RAW checked:

- `.references/srd-5.2.1/Classes/Fighter.md`, `Tactical Mind`. Defer because
  the feature augments a failed ability check, spends the existing Second Wind
  pool only if the augmented check succeeds, and is explicitly useful on and
  off the battlefield. That is an ability-check resource-augmentation slice,
  not an attack replacement slice.
- `.references/srd-5.2.1/Classes/Bard.md`, `Cutting Words`. Defer because full
  SRD Cutting Words spans damage rolls plus successful ability checks and
  attack rolls, is a Reaction, and spends Bardic Inspiration. Production
  already has attack-roll and damage-roll branches, while the remaining matrix
  pressure is the ability-check branch.
- `.references/srd-5.2.1/Classes/Monk.md`, `Deflect Attacks`. Defer because
  the unsupported pressure is the redirect-on-zero follow-up, which adds Focus
  Point spend, target choice, a Dexterity save, and reflected damage after the
  already promoted damage-reduction branch.
- `.references/srd-5.2.1/Classes/Paladin.md`, `Lay On Hands`, and
  `.references/srd-5.2.1/Rules-Glossary.md`, `Healing` and `Hit Points`. Defer
  because this is a variable creature-targeted healing pool and later shares
  the pool with condition-removal pressure.
- `.references/srd-5.2.1/Classes/Ranger.md`, `Tireless`, and Temporary Hit
  Point rules. Defer because full Tireless combines a Magic action Temporary
  Hit Point use pool with Short Rest Exhaustion reduction.
- `.references/srd-5.2.1/Classes/Barbarian.md`, `Unarmored Defense`;
  `.references/srd-5.2.1/Classes/Monk.md`, `Unarmored Defense`; and
  `.references/srd-5.2.1/Rules-Glossary.md`, `Armor Class`. Defer because
  these are mutually exclusive base AC formulas with equipment predicates.
- `.references/srd-5.2.1/Character-Origins.md`, Dragonborn `Breath Weapon` and
  `Damage Resistance`, and `.references/srd-5.2.1/Playing-the-Game.md`,
  `Resistance and Vulnerability`. Defer because attack replacement with an
  area save procedure and target-side damage adjustment are separate lanes.
- `.references/srd-5.2.1/Equipment.md`, `Mastery Properties`, especially
  `Cleave`, `Sap`, and `Topple`. Defer because mastery requires weapon
  ownership, weapon eligibility, and property-specific on-hit rider timing.

`UBIQUITOUS_LANGUAGE.md` anchors checked:

- `Attack Roll`, `Armor Class`, `Critical Hit`, and `Damage Roll`, to keep
  Peerless Aim at the miss-to-hit boundary before damage is rolled.
- `Ability Check`, `D20 Test`, `Reaction`, and `Pool`, to keep Tactical Mind
  and Cutting Words in their own resource and reaction lanes.
- `Hit Points`, `Healing`, `Temporary Hit Points`, `Pool`, `Quota`, `Spend`,
  `Short Rest`, and `Long Rest`, to keep healing and Temporary Hit Point
  features out of this slice.
- `Armor Class`, `Unarmored Defense`, `Resistance`, `Damage Type`, `Weapon
  Mastery`, `Mastery Property`, `Cleave`, `Sap`, and `Topple`, to keep deferred
  candidates domain-distinct.

## Candidate Triage

| Candidate | Decision |
| --- | --- |
| `feat_boon_of_combat_prowess` | Best next slice. It is installed SRD feature pressure, its missing executable fact is one Peerless Aim miss-to-hit replacement, and battle-runtime already owns attack-roll hit/miss adjudication. Selecting it closes one installed `needs-surface-widening` feature without mixing ability checks, healing, AC, resistance, mastery, spells, or magic items. |
| `fighter_tactical_mind` | Defer. It spends the existing Second Wind pool after a failed ability check and refunds the spend if the check still fails. That needs an ability-check outcome boundary and conditional resource spend, not attack replacement. |
| `bard_cutting_words` | Defer. The remaining full-SRD gap is ability-check reduction. Selecting it would broaden into Reaction resource spending across ability checks, attack rolls, and damage rolls rather than one attack replacement profile. |
| `monk_deflect_attacks` | Defer. The unresolved branch is redirect-on-zero after damage reduction, with Focus Point spend, target selection, save-gated reflected damage, and damage-type inheritance. |
| `paladin_lay_on_hands` | Defer. It is a variable healing pool with creature targeting and later condition-removal sharing. |
| `ranger_tireless` | Defer. It is a Magic action Temporary Hit Point feature coupled in RAW with Short Rest Exhaustion reduction. |
| `barbarian_unarmored_defense`, `monk_unarmored_defense` | Defer. These require base AC formula selection and equipment predicates, including the rule that only one base AC calculation can apply. |
| `species_dragonborn_damage_resistance`, `dwarf_dwarven_resilience` | Defer. These are target-side resistance and saving-throw-advantage traits, not attack outcome replacement. |
| `species_dragonborn_breath_weapon` | Defer. It replaces one Attack-action attack with a Cone or Line save-gated damage procedure and a Proficiency Bonus use pool. |
| `mastery_sap`, `mastery_cleave`, `mastery_topple` | Defer. Weapon Mastery needs ownership and weapon-eligibility modeling before individual property riders can be represented without invalid states. |
| `fire_bolt`, `thunderwave`, spells, and magic items | Defer. Task 149 keeps spell admission and magic-item intake out of this feature widening decision unless a review explicitly changes lane ownership; this review does not. |

## Red/Green Plan

1. Add profile pressure before support.

   Add a profile id such as
   `unit-feature.attack-roll-miss-to-hit-replacement` to
   `plans/unit-profile-coverage/profiles.jsonl`. Keep
   `feat_boon_of_combat_prowess` unsupported until production can represent the
   Peerless Aim mechanics shape and prove deterministic admission evidence.

2. Repair the authored Surface shape from RAW.

   Extend the nonspell Surface mechanics schema with an attack-roll
   miss-to-hit replacement shape that can represent:

   - trigger `miss_with_attack_roll`;
   - effect `replace_miss_with_hit`;
   - optional use by the acting creature;
   - reset at the start of the creature's next turn.

   Update `packages/surface/content/feat_boon_of_combat_prowess.*` so the
   Ability Score Increase remains character-creation data and `Peerless Aim`
   becomes executable battle mechanics. Do not encode the Unit id as the
   runtime behavior.

3. Model the QNT profile first.

   Extend the package-local promoted rule-core feature profile proof with a
   miss-to-hit replacement profile. Model facts, not Unit ids:

   - attack roll natural d20 and total;
   - Armor Class comparison and natural-1 miss behavior before replacement;
   - eligible miss outcome;
   - optional replacement to hit;
   - once-per-turn use state;
   - start-turn reset.

4. Promote production support from authored mechanics.

   Extend `packages/battle-runtime/src/unit-feature-support.ts` with a precise
   parser for feat Units whose mechanics exactly describe Peerless Aim:

   - `kind: "feat"`;
   - attack-roll miss trigger;
   - miss-to-hit replacement effect;
   - once-per-turn reset at the start of the user's next turn;
   - no damage modifier, ability-check modifier, saving-throw modifier,
     Reaction cost, spell-specific hook, or authored-id registry.

5. Execute through the existing attack-roll outcome boundary.

   Thread the supported profile into the same attack-roll adjudication path
   that already determines hit, miss, natural 1, critical hit, and later damage
   holes. Do not duplicate attack result state. The replacement should turn an
   eligible miss into the same downstream hit shape used by an ordinary hit,
   while preserving the natural d20 result and avoiding new damage until the
   existing damage-fill path asks for it.

6. Add deterministic admission/projection evidence.

   After runtime support is executable, classify `feat_boon_of_combat_prowess`
   in `unit-claims.jsonl` as supported with the new profile id. Add
   deterministic evidence in `unit-evidence.jsonl` owned by
   `packages/battle-runtime/src/unit-profile-admission.test.ts` or a focused
   battle-runtime test proving:

   - the SRD feat is admitted from the authored Peerless Aim shape;
   - a missed weapon, Unarmed Strike, or spell attack can be replaced with a
     hit when the profile is unused;
   - declining replacement leaves the ordinary miss result;
   - the replacement cannot be reused before the start of the creature's next
     turn;
   - the start-turn reset restores the replacement;
   - damage rolls are still requested and resolved through the existing hit
     path;
   - malformed replacement shapes, ability-check augmentation, damage-roll
     reduction, Reaction features, Weapon Mastery riders, spells, and magic
     items remain unsupported for this profile.

7. Refresh generated matrix artifacts.

   Run `pnpm unit-profile-coverage:check` after claims and evidence updates and
   include generated `UNIT_REPORT.md` and `unit-matrix.json` changes in the
   implementation task.

## Verification For Implementation Task

- RAW and `UBIQUITOUS_LANGUAGE.md` check for Boon of Combat Prowess, Peerless
  Aim, Attack Roll, D20 Test, Armor Class, hit/miss outcomes, Damage Roll,
  start-turn reset, and the distinction between attack replacement,
  ability-check augmentation, Reaction roll reduction, and Weapon Mastery.
- Focused QNT proof for the new attack-roll miss-to-hit replacement profile.
- Focused runtime parity with the mandatory timed background MBT protocol if
  promoted battle behavior changes.
- `pnpm unit-profile-coverage:check`.
- Relevant package typecheck/tests.
- `pnpm quality` for the production behavior change.
- reviewer loop convergence, minimum two rounds.

## Task 149 Verification

- RAW checked locally against the SRD 5.2.1 files and sections listed in
  `Source Check`.
- `UBIQUITOUS_LANGUAGE.md` checked for the domain terms listed in `Source
  Check`.
- Active-plan consistency updated in the Ralph task index, DAG row, and task
  detail for QMBT54 so each marks the task done and links this decision
  artifact. QMBT55 is unblocked for recursive planning review.
- reviewer loop round 1: selected the installed SRD attack replacement pressure
  rather than ability-check, healing-pool, AC-formula, resistance, Weapon
  Mastery, spell, or magic-item pressure; kept the boundary tied to one
  attack-roll miss-to-hit replacement.
- reviewer loop round 2: no important changes found; the plan still selects one
  feature profile and avoids duplicate attack result state by requiring the
  existing attack-roll outcome path as the executable boundary.
- MBT not run: Task 149 is research-only and makes no promoted battle-runtime
  behavior change.

## Plan Impact

QMBT55 should review this decision and append a follow-on implementation task
for this slice before the next recursive review batch continues broad
feature-family widening. Suggested task:

`QMBT56 - Promote Boon of Combat Prowess Peerless Aim Miss-to-Hit Replacement`

Scope: implement the red/green plan above and close
`feat_boon_of_combat_prowess` as a supported SRD Unit profile. Out of scope:
Tactical Mind ability-check augmentation, Cutting Words ability-check
Reaction support, Deflect Attacks redirect-on-zero, Temporary Hit Point
features, healing pools, AC base formula alternatives, resistance traits,
Dragonborn Breath Weapon, Weapon Mastery properties, spell admission,
magic-item intake, and broad Epic Boon support.
