# Level 1-3 No-Matrix SRD Pressure Audit

Date: 2026-05-26

Task: L13UG-A12-LEVEL13-SRD-PRESSURE-AUDIT

## Decision

Task 12 found no hidden blocker in the 13 no-matrix spell-list rows: every one
is covered by an adopted frontier decision artifact.

Task 12 found one legitimately non-executable level-3 class-feature row:
`ranger_hunters_lore`. Its RAW effect reveals existing target Immunity,
Resistance, and Vulnerability facts while the target is marked by Hunter's Mark.
That is table/stat-block knowledge disclosure, not new battle state.

The remaining 15 level-3 class-feature rows are real missing Unit rows. They
are not hidden from planning because `srd-unit-inventory.json` already records
checker-visible `level-3-follow-up-required` dispositions and concrete
`nextAction` text for each row, and `L3_CLASS_SUBCLASS_FEATURE_OWNER_SPLIT.md`
records the owner split. They should become follow-up tasks before any claim
that level-3 class features are fully admitted to the Unit matrix.

## Inputs

- `plans/unit-profile-coverage/LEVEL1_3_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/level1-3-full-support.json`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `plans/unit-profile-coverage/unit-matrix.json`
- `plans/unit-profile-coverage/L3_CLASS_SUBCLASS_FEATURE_OWNER_SPLIT.md`
- `plans/unit-profile-coverage/frontier-decisions/*.md` for adopted spell
  decisions
- `UBIQUITOUS_LANGUAGE.md`

## RAW And Vocabulary Check

Checked local RAW:

- `.references/srd-5.2.1/Classes/Barbarian.md:102-107` for Primal Knowledge.
- `.references/srd-5.2.1/Classes/Cleric.md:313-316` for Disciple of Life.
- `.references/srd-5.2.1/Classes/Cleric.md:330-333` for Preserve Life.
- `.references/srd-5.2.1/Classes/Druid.md:406-411` for Land's Aid.
- `.references/srd-5.2.1/Classes/Fighter.md:140-145` for Remarkable Athlete.
- `.references/srd-5.2.1/Classes/Monk.md:192-201` for Open Hand Technique.
- `.references/srd-5.2.1/Classes/Paladin.md:100-117` for Channel Divinity.
- `.references/srd-5.2.1/Classes/Paladin.md:263-270` for Sacred Weapon.
- `.references/srd-5.2.1/Classes/Ranger.md:239-250` for Hunter's Lore and
  Hunter's Prey.
- `.references/srd-5.2.1/Classes/Rogue.md:89-92` for Steady Aim.
- `.references/srd-5.2.1/Classes/Rogue.md:159-174` for Fast Hands and
  Second-Story Work.
- `.references/srd-5.2.1/Classes/Sorcerer.md:413-418` for Draconic Resilience.
- `.references/srd-5.2.1/Classes/Warlock.md:460-463` for Dark One's Blessing.
- `.references/srd-5.2.1/Classes/Wizard.md:417-420` for Potent Cantrip.

Checked `UBIQUITOUS_LANGUAGE.md` for Ability Check, Saving Throw, Attack Roll,
Advantage, Magic Action, Bonus Action, Opportunity Attack, Speed, Movement, Hit
Points, Temporary Hit Points, Hit Point Maximum, Armor Class, Damage Type,
Resistance, Immunity, Vulnerability, and Character Sheet ownership vocabulary.

## Generated State

`level1-3-full-support.json` currently reports 29 no-matrix SRD pressure rows.

| Classification | Rows | Audit result |
| --- | ---: | --- |
| Adopted no-matrix spell frontier decision | 13 | Covered by existing decision artifacts; no new Unit-row task from this audit. |
| Runtime-detached knowledge disclosure | 1 | `ranger_hunters_lore` is legitimately non-executable for promoted battle state. |
| Real missing level-3 class-feature Unit row | 15 | Needs follow-up Unit admission/profile work; not a current hidden blocker because generated inventory already records the exact owner action. |

## Adopted Spell Frontier Rows

These rows are covered by existing no-matrix decision artifacts and do not need
new Task 12 follow-up:

| Unit | Decision artifact |
| --- | --- |
| `create_or_destroy_water` | `plans/unit-profile-coverage/frontier-decisions/create_or_destroy_water.md` |
| `disguise_self` | `plans/unit-profile-coverage/frontier-decisions/disguise_self.md` |
| `druidcraft` | `plans/unit-profile-coverage/frontier-decisions/druidcraft.md` |
| `elementalism` | `plans/unit-profile-coverage/frontier-decisions/elementalism.md` |
| `floating_disk` | `plans/unit-profile-coverage/frontier-decisions/floating_disk.md` |
| `goodberry` | `plans/unit-profile-coverage/frontier-decisions/goodberry.md` |
| `illusory_script` | `plans/unit-profile-coverage/frontier-decisions/illusory_script.md` |
| `mage_hand` | `plans/unit-profile-coverage/frontier-decisions/mage_hand.md` |
| `mending` | `plans/unit-profile-coverage/frontier-decisions/mending.md` |
| `message` | `plans/unit-profile-coverage/frontier-decisions/message.md` |
| `prestidigitation` | `plans/unit-profile-coverage/frontier-decisions/prestidigitation.md` |
| `purify_food_and_drink` | `plans/unit-profile-coverage/frontier-decisions/purify_food_and_drink.md` |
| `unseen_servant` | `plans/unit-profile-coverage/frontier-decisions/unseen_servant.md` |

## Level-3 Class-Feature Rows

| Unit | Current inventory disposition | Audit classification | Follow-up |
| --- | --- | --- | --- |
| `barbarian_primal_knowledge` | `level-3-follow-up-required` | Real missing Unit row: durable skill choice plus Rage-active Ability Check substitution. | Add to L3 durable/ability-check Unit admission task. |
| `cleric_disciple_of_life` | `level-3-follow-up-required` | Real missing Unit row: slot-spell Hit Point restoration modifier. | Add to L3 healing/damage Unit admission task. |
| `cleric_preserve_life` | `level-3-follow-up-required` | Real missing Unit row: Magic Action, Channel Divinity spend, bounded healing pool. | Add to L3 healing/damage Unit admission task. |
| `druid_lands_aid` | `level-3-follow-up-required` | Real missing Unit row: Magic Action, Wild Shape spend, Constitution save damage plus one target heal. | Add to L3 healing/damage Unit admission task. |
| `fighter_remarkable_athlete` | `level-3-follow-up-required` | Real missing Unit row: Initiative and Athletics Advantage plus post-Critical-Hit movement release. | Add to L3 attack/movement Unit admission task. |
| `monk_open_hand_technique` | `level-3-follow-up-required` | Real missing Unit row: Flurry of Blows hit rider choices. | Add to L3 attack/movement Unit admission task. |
| `paladin_channel_divinity` | `level-3-follow-up-required` | Real missing Unit row: Paladin Channel Divinity resource plus runtime-detached Divine Sense split. | Add to L3 resource/action Unit admission task. |
| `paladin_sacred_weapon` | `level-3-follow-up-required` | Real missing Unit row: Attack-action Channel Divinity spend, weapon-bound attack bonus, damage-type choice, and light effect. | Add to L3 attack/movement Unit admission task. |
| `ranger_hunters_lore` | `catalog-only/dead-for-now` | Legitimately non-executable: table/stat-block knowledge disclosure of existing Immunity, Resistance, and Vulnerability facts. | None. |
| `ranger_hunters_prey` | `level-3-follow-up-required` | Real missing Unit row: rest-replaceable option plus Colossus Slayer or Horde Breaker attack riders. | Add to L3 attack/movement Unit admission task. |
| `rogue_fast_hands` | `level-3-follow-up-required` | Real missing Unit row: Bonus Action permission split across table-owned Sleight of Hand, Utilize, and magic-item Magic Action ownership. | Add to L3 resource/action Unit admission task. |
| `rogue_second_story_work` | `level-3-follow-up-required` | Real missing Unit row: Climb Speed projection and Dexterity-based jump-distance substitution. | Add to L3 durable/ability-check Unit admission task. |
| `rogue_steady_aim` | `level-3-follow-up-required` | Real missing Unit row: Bonus Action, same-turn attack Advantage, no-prior-movement gate, and Speed 0 until turn end. | Add to L3 attack/movement Unit admission task. |
| `sorcerer_draconic_resilience` | `level-3-follow-up-required` | Real missing Unit row: Hit Point Maximum increase and unarmored Armor Class formula. | Add to L3 durable/ability-check Unit admission task. |
| `warlock_dark_ones_blessing` | `level-3-follow-up-required` | Real missing Unit row: enemy-to-0-HP trigger and Temporary Hit Point grant. | Add to L3 healing/damage Unit admission task. |
| `wizard_potent_cantrip` | `level-3-follow-up-required` | Real missing Unit row: damaging-cantrip miss or successful-save half damage with no additional effect. | Add to L3 attack/movement Unit admission task. |

## Follow-Up Tasks

Add only these follow-ups for real missing Unit rows:

- `L13UG-A15-L3-DURABLE-ABILITY-UNITS`: author/admit Unit rows and owner
  evidence for `barbarian_primal_knowledge`, `rogue_second_story_work`, and
  `sorcerer_draconic_resilience`. Required output: Surface authored records,
  Unit matrix rows, Character Creation or Character Sheet owner evidence, and
  focused tests for the durable facts and Ability Check or Armor Class
  projections.
- `L13UG-A16-L3-HEAL-DAMAGE-UNITS`: author/admit Unit rows and runtime
  profiles for `cleric_disciple_of_life`, `cleric_preserve_life`,
  `druid_lands_aid`, and `warlock_dark_ones_blessing`. Required output:
  Surface authored records, Unit claims, deterministic admission/projection
  evidence, focused runtime tests, and promoted Quint parity where reducer
  behavior changes.
- `L13UG-A17-L3-RESOURCE-ACTION-UNITS`: author/admit Unit rows and owner
  decisions for `paladin_channel_divinity` and `rogue_fast_hands`. Required
  output: Paladin Channel Divinity resource ownership without duplicating
  Divine Sense table knowledge, plus Fast Hands action-economy support that
  delegates lock/trap/pocket, Utilize, and magic-item execution to their
  existing owners.
- `L13UG-A18-L3-ATTACK-MOVEMENT-UNITS`: author/admit Unit rows and runtime
  profiles for `fighter_remarkable_athlete`, `monk_open_hand_technique`,
  `paladin_sacred_weapon`, `ranger_hunters_prey`, `rogue_steady_aim`, and
  `wizard_potent_cantrip`. Required output: Surface authored records, Unit
  claims, deterministic admission/projection evidence, focused runtime tests,
  and promoted Quint parity for attack, movement, rider, and cantrip-damage
  behavior.

Do not add follow-up tasks for the 13 adopted spell frontier rows or
`ranger_hunters_lore` from this audit.

## Reviewer Loop

Round 1 findings:

- The generated report's no-matrix reason was too generic: level-3 class
  features were rendered as "level-1 spell pressure." The checker wording now
  derives the pressure source from the source row kind and level band.
- The 13 spell rows are not hidden gaps because each has an adopted frontier
  decision artifact and the checker validates that adopted decisions still have
  backing SRD pressure rows and no Unit matrix row.
- The level-3 class rows are not container-only. Fifteen need real Unit-row
  work; `ranger_hunters_lore` is the only non-executable closure.

Round 2 findings:

- No additional data source was introduced. The audit projects from generated
  inventory, the Unit matrix, and existing decision artifacts.
- The proposed follow-ups are grouped by execution invariant and do not include
  adopted no-matrix spell decisions or runtime-detached Hunter's Lore.
- No runtime code, QNT, Surface content, Unit claim, profile, or evidence row
  changed in this task.

## Verification

- RAW/source files read: listed above.
- `pnpm unit-profile-coverage:check -- --write`: failed before writing on
  pre-existing selected-identity replay validation issues across battle-runtime
  MBT evidence files outside this task's touched surface.
- `pnpm unit-profile-coverage:check && pnpm rules-kernel-coverage:check`:
  failed in `unit-profile-coverage:check` on the same pre-existing
  selected-identity replay validation issues; `rules-kernel-coverage:check` was
  not reached by the shell `&&`.
- Focused mechanical regeneration: rebuilt `level1-full-support.json`,
  `LEVEL1_FULL_SUPPORT.md`, `level1-2-full-support.json`,
  `LEVEL1_2_FULL_SUPPORT.md`, `level1-3-full-support.json`, and
  `LEVEL1_3_FULL_SUPPORT.md` from existing checked-in `unit-matrix.json` and
  `srd-unit-inventory.json` after the report wording fix.
- `git diff --check`
- MBT: not run. This task changes checker/report wording and planning audit
  documentation only; no promoted runtime behavior or Quint model changed.
