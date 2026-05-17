# QMBT48 Adrenaline Rush Feature Widening Slice Plan

Date: 2026-05-07

## Decision

Select `orc_adrenaline_rush` as the next narrow SRD feature-style widening
slice after Relentless Endurance.

The slice should promote an Orc Adrenaline Rush Unit feature profile that
executes the SRD-coupled boundary:

- the Orc can take the Dash action as a Bonus Action;
- when the Orc takes that Bonus Action Dash through this trait, the Orc gains
  Temporary Hit Points equal to Proficiency Bonus;
- the trait has a Proficiency Bonus use pool;
- expended uses refresh on a Short or Long Rest.

This is deliberately narrower than "all Temporary Hit Point features," "all
Bonus Action movement features," or "all Dash riders." The feature's RAW
trigger couples the Bonus Action Dash and Temporary Hit Point grant, so the
runtime profile should model one Dash-coupled Temporary Hit Point boundary
rather than two independent support markers that can diverge. It excludes AC
base calculations, healing pools, generic Temporary Hit Point grants,
resistance traits, attack replacement, Weapon Mastery properties, spells, and
magic items.

## Source Check

Local RAW anchors read for this decision:

- `.references/srd-5.2.1/Character-Origins.md`, Orc `Adrenaline Rush`: the Orc
  can take Dash as a Bonus Action, gains Temporary Hit Points equal to
  Proficiency Bonus when doing so, has Proficiency Bonus uses, and regains all
  expended uses on a Short or Long Rest.
- `.references/srd-5.2.1/Rules-Glossary.md`, `Dash [Action]`: Dash grants
  extra Movement for the current turn equal to Speed after modifiers.
- `.references/srd-5.2.1/Rules-Glossary.md`, `Temporary Hit Points`, and
  `.references/srd-5.2.1/Playing-the-Game.md`, `Temporary Hit Points`: Temporary
  Hit Points are a damage buffer, are lost before real Hit Points, do not stack,
  cannot be healed, do not count as healing, and do not restore consciousness
  at 0 Hit Points.
- `.references/srd-5.2.1/Rules-Glossary.md`, `Proficiency Bonus`, plus the
  project vocabulary `Pool`, `Quota`, `Spend`, `Short Rest`, and `Long Rest`
  anchors in `UBIQUITOUS_LANGUAGE.md`, to keep the use pool and rest reset as
  resource facts rather than duplicated counters.

Additional candidate RAW checked:

- `.references/srd-5.2.1/Classes/Ranger.md`, `Tireless`, and Temporary Hit
  Point rules. Defer because full Tireless also includes Short Rest Exhaustion
  reduction, while the authored runtime mechanics represent the Temporary Hit
  Point action without that separate rest benefit.
- `.references/srd-5.2.1/Classes/Paladin.md`, `Lay On Hands`, and
  `.references/srd-5.2.1/Rules-Glossary.md`, `Healing` and `Hit Points`. Defer
  because this is a variable creature-targeted healing pool with later
  condition-removal pressure, not a Temporary Hit Point boundary.
- `.references/srd-5.2.1/Classes/Barbarian.md`, `Unarmored Defense`;
  `.references/srd-5.2.1/Classes/Monk.md`, `Unarmored Defense`; and
  `.references/srd-5.2.1/Rules-Glossary.md`, `Armor Class`. Defer because these
  are mutually exclusive AC base formulas and equipment predicates.
- `.references/srd-5.2.1/Character-Origins.md`, Dragonborn `Breath Weapon` and
  `Damage Resistance`, and Dwarf `Dwarven Resilience`; plus
  `.references/srd-5.2.1/Playing-the-Game.md`, `Resistance and Vulnerability`.
  Defer because attack replacement and target-side damage adjustment are
  separate boundaries.
- `.references/srd-5.2.1/Feats.md`, Boon of Combat Prowess `Peerless Aim`, and
  `.references/srd-5.2.1/Classes/Fighter.md`, `Tactical Mind`. Defer because
  miss-to-hit conversion and failed ability-check augmentation are roll-outcome
  replacement/augmentation boundaries.
- `.references/srd-5.2.1/Equipment.md`, `Mastery Properties`, especially
  `Cleave`, `Sap`, and `Topple`. Defer because mastery use requires weapon
  ownership, weapon eligibility, on-hit rider timing, and property-specific
  follow-up effects.

`UBIQUITOUS_LANGUAGE.md` anchors checked:

- `Action`, `Movement`, `Speed`, and `Dash`, to keep Dash as a turn Movement
  budget increase rather than a Speed mutation.
- `Temporary Hit Points`, `Hit Points`, `Healing`, `Instant Death`, and
  `Death Saving Throw`, to keep this slice separate from Relentless Endurance,
  healing, and zero-Hit-Point recovery.
- `Pool`, `Quota`, `Spend`, `Short Rest`, and `Long Rest`, to model the
  Proficiency Bonus use count and rest refresh as one resource boundary.
- `Armor Class`, `Unarmored Defense`, `Resistance`, `Damage Type`,
  `Attack Roll`, `Ability Check`, `Weapon Mastery`, `Mastery Property`,
  `Cleave`, `Sap`, and `Topple`, to keep deferred candidates domain-distinct.

## Candidate Triage

| Candidate                                                                    | Decision                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `orc_adrenaline_rush`                                                        | Best next slice. It is installed SRD species-trait pressure, has a single authored `activation` mechanics shape, composes with the existing Dash movement boundary, and adds the smallest remaining battle-runtime surface for Temporary Hit Points without selecting a broad THP family. |
| `ranger_tireless`                                                            | Defer. Its SRD text combines a Magic action Temporary Hit Point use pool with Short Rest Exhaustion reduction, while the authored mechanics represent the THP action without that separate rest benefit. Selecting it now would risk claiming full SRD support for a partial feature.     |
| `paladin_lay_on_hands`                                                       | Defer. It is a creature-targeted healing pool with variable spend and condition-removal follow-up. That should be a healing-pool slice, not a Temporary Hit Point slice.                                                                                                                  |
| `barbarian_unarmored_defense`, `monk_unarmored_defense`                      | Defer. These require base AC formula selection and equipment predicates, including the "can't use more than one base AC calculation" boundary.                                                                                                                                            |
| `species_dragonborn_damage_resistance`, `dwarf_dwarven_resilience`           | Defer. These are Resistance and saving-throw-advantage traits; Dragonborn Damage Resistance also depends on the Draconic Ancestry damage-type choice.                                                                                                                                     |
| `species_dragonborn_breath_weapon`                                           | Defer. It replaces one attack during the Attack action with a Cone or Line save-gated damage procedure and Proficiency Bonus use pool.                                                                                                                                                    |
| `mastery_sap`, `mastery_cleave`, `mastery_topple`                            | Defer. Weapon Mastery needs a separate ownership and weapon-eligibility boundary before property riders are representable without invalid states.                                                                                                                                         |
| `fighter_tactical_mind`, `bard_cutting_words`, `feat_boon_of_combat_prowess` | Defer. These belong to ability-check, attack-roll, damage-roll, or miss-to-hit outcome modification boundaries rather than a Temporary Hit Point feature slice.                                                                                                                           |
| `fire_bolt`, `thunderwave`, spells, and magic items                          | Defer. Task 143 keeps spell admission and magic-item intake out of this feature widening decision unless a review explicitly changes lane ownership; this review does not.                                                                                                                |

## Red/Green Plan

1. Add profile pressure before support.

   Add a profile id such as
   `unit-feature.bonus-action-dash-temporary-hit-points` to
   `plans/unit-profile-coverage/profiles.jsonl`. Keep
   `orc_adrenaline_rush` unsupported until production can execute the authored
   activation shape and prove deterministic admission evidence.

2. Model the QNT profile first.

   Extend the package-local rule-core feature profile proof with a
   Dash-coupled Temporary Hit Point profile. Model facts, not Unit ids:
   - Bonus Action availability;
   - Dash as the chosen action;
   - extra Movement for the current turn from Dash;
   - Temporary Hit Point amount equal to Proficiency Bonus;
   - existing Temporary Hit Points and the keep-existing-or-take-new choice;
   - Proficiency Bonus use pool;
   - Short or Long Rest refresh.

3. Promote production support from authored mechanics.

   Extend `packages/battle-runtime/src/unit-feature-support.ts` with a precise
   parser for species-trait Units whose mechanics are exactly:
   - `kind: "species_trait"`;
   - `mechanics.family: "activation"`;
   - `activationCost.kind: "bonus_action"`;
   - `activationCost.action: "dash"`;
   - one self-attached direct phase;
   - one `grant_temp_hp` effect;
   - effect amount `kind: "proficiency_bonus"`;
   - resource `kind: "use_count"` with cap `kind: "proficiency_bonus"`;
   - reset cadence `kind: "short_or_long_rest"`.

   Adjacent Magic-action Temporary Hit Point features, spells such as False
   Life, and magic-item Temporary Hit Point effects must remain unsupported for
   this Unit-feature slice unless their own boundary is selected later.

4. Execute through one Bonus Action Dash boundary.

   Thread the supported Unit profile into the same runtime action path that
   already handles Dash and Bonus Action alternatives. Do not duplicate Speed,
   Movement spent, Bonus Action consumption, current Hit Points, or Temporary
   Hit Points. The trait should spend its use, consume the Bonus Action, add
   Dash Movement for the current turn, and then apply the Temporary Hit Point
   keep-or-replace rule at one executable boundary.

5. Add deterministic admission/projection evidence.

   After runtime support is executable, classify `orc_adrenaline_rush` in
   `unit-claims.jsonl` as supported with the new profile id. Add deterministic
   evidence in `unit-evidence.jsonl` owned by
   `packages/battle-runtime/src/unit-profile-admission.test.ts` or an
   Adrenaline Rush focused battle-runtime test proving:
   - the SRD Orc trait is admitted from the authored `activation` shape;
   - Bonus Action Dash through the trait grants Dash Movement and Temporary Hit
     Points equal to Proficiency Bonus;
   - existing Temporary Hit Points can be kept when higher or replaced when the
     new amount is chosen;
   - the use is spent on application and restored by Short or Long Rest;
   - no healing, zero-Hit-Point replacement, or death-save state changes occur;
   - malformed activation cost, wrong effect amount, wrong resource cap, wrong
     reset cadence, non-self targets, Magic-action THP features, spells, and
     magic items remain unsupported for this profile.

6. Refresh generated matrix artifacts.

   Run `pnpm unit-profile-coverage:check` after claims and evidence updates and
   include generated `UNIT_REPORT.md` and `unit-matrix.json` changes in the
   implementation task.

## Verification For Implementation Task

- RAW and `UBIQUITOUS_LANGUAGE.md` check for Orc Adrenaline Rush, Dash,
  Temporary Hit Points, Hit Points, Healing, Proficiency Bonus, Short Rest,
  Long Rest, Pool, Quota, Spend, Movement, and Speed.
- Focused QNT proof for the Dash-coupled Temporary Hit Point feature profile.
- Focused runtime parity with the mandatory timed background MBT protocol if
  promoted battle behavior changes.
- `pnpm unit-profile-coverage:check`.
- Relevant package typecheck/tests.
- `pnpm quality` for the production behavior change.
- reviewer loop convergence, minimum two rounds.

## Task 143 Verification

- RAW checked locally against the SRD 5.2.1 files and sections listed in
  `Source Check`.
- `UBIQUITOUS_LANGUAGE.md` checked for the domain terms listed above.
- Active-plan consistency updated in the Ralph task index, DAG row, and task
  detail for QMBT48 so each marks the task done and links this decision
  artifact. QMBT49-QMBT52 are unblocked; QMBT52 should append the implementation
  task for this slice if the matrix lane remains active.
- reviewer loop round 1: kept the selected slice tied to installed SRD Unit
  pressure and rejected generic Temporary Hit Point, generic Dash, spell, and
  magic-item widening.
- reviewer loop round 2: no important changes found; the plan still selects one
  feature profile and keeps AC base formulas, healing pools, resistance, attack
  replacement, Weapon Mastery properties, spell admission, and magic-item intake
  out of the slice.
- MBT not run: Task 143 is research-only and makes no promoted battle-runtime
  behavior change.

## Plan Impact

QMBT49-QMBT51 can proceed unchanged. QMBT52 should append a follow-on
implementation task for this slice before the next recursive review batch
continues broad feature-family widening. Suggested task:

`QMBT53 - Promote Adrenaline Rush Bonus Action Dash Temporary Hit Points`

Scope: implement the red/green plan above and close `orc_adrenaline_rush` as a
supported SRD Unit profile. Out of scope: generic Temporary Hit Point features,
Ranger Tireless, False Life and other spells, magic items, AC base calculation
alternatives, Lay On Hands and other healing pools, Dragonborn Breath Weapon
attack replacement, resistance traits, Weapon Mastery properties, and broad
Dash rider families.
