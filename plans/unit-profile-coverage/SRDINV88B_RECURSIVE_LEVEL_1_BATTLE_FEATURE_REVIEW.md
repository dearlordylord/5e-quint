# SRDINV88B Recursive Level-1 Battle Feature Review

Task 329 reviewed the completed SRDINV88A Dancing Lights runtime slice against
the default level-1 battle readiness metric, the generated Unit matrix, and the
remaining unsupported/subset-supported rows. SRDINV88A closed the last installed
Spell Definition row that lacked battle-runtime owner evidence. The lane is not
complete: several remaining subset-supported rows still name battle-adjacent
runtime owners rather than explicit non-battle/non-runtime closure. SRDINV88B
therefore appends the next concrete runnable batch instead of closing with
`Blocks: none`.

## Inventory State

Generated inventory metrics from
`plans/unit-profile-coverage/srd-unit-inventory.json` after SRDINV88A:

- Total generated rows: 367.
- Level-1 rows: 156.
- Spell-list pressure rows for cantrips and level-1 spells: 211.
- Missing level-1 class containers: 0.
- Default level-1 battle readiness: 301/367 (82%).
- Accepted rows: 235.
- Accepted no-battle-effect rows: 66.
- Battle-runtime-required rows: 25.
- Partial-battle-runtime rows: 41.
- Level-1 rows by disposition: 144
  `catalog-installed-owner-evidence-present`, 12 `non-runtime`.
- Spell Unit pressure by disposition: 139
  `catalog-installed-owner-evidence-present`, 72 `catalog-only/dead-for-now`.

The distinct generated Unit runtime metric is supported executable Unit
coverage: 83/117 (70.9%). That metric is not the product readiness numerator:
it intentionally measures a supported executable Unit subset, while the default
product metric also includes accepted non-runtime closures and battle-specific
owner decisions.

## SRDINV88A Review

`dancing_lights` now has deterministic admission/projection evidence and
package-local QNT/runtime parity for the supported battle slice:

- Magic Action cantrip invocation.
- Concentration up to 1 minute.
- Four movable torch-size light sources or one combined Medium-form choice.
- 10-foot Dim Light emitter projection.
- Bonus Action repositioning.
- 20-foot spacing, 120-foot range expiry, recast cleanup, concentration cleanup,
  and duration cleanup.

The review does not reopen map illumination, Darkvision adjustment, line of
sight, color rendering, or generic illusion adjudication. Those were explicitly
outside SRDINV88A and remain outside the object/light emitter boundary.

## Remaining Checker Gap

The 66 rows not counted by the default readiness numerator split into explicit
non-battle/container exclusions and residual battle-adjacent subset work:

| Category                                  | Rows | Decision                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------- | ---: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unsupported class/choice containers       |    7 | No direct battle task. Fighter Fighting Style is a choice/grant container; selected Fighting Style feat Units carry executable pressure. Weapon Mastery class features are choice/grant containers; selected mastery property Units carry execution. Warlock Eldritch Invocations is a choice container; selected invocation option tasks own execution. |
| Detection and illusion/exploration spells |   18 | No promoted battle-runtime task in this lane. Detect Evil and Good, Detect Magic, Detect Poison and Disease, and Minor Illusion are exploration/detection/illusion state, not currently promoted battle Unit profiles.                                                                                                                                   |
| Profile-subset-supported rows             |   41 | Not all rows satisfy non-battle/non-runtime closure. Some residuals are battle-adjacent runtime work, including target-boundary, repeat-save/possession-save, and illumination/visibility mechanics. SRDINV88B appends SRDINV89A-SRDINV89C plus SRDINV89D review for the next runnable batch.                                                            |

The generated metric remains 82%, and that is not a final closure condition.
Do not treat the generated supported-profile coverage, catalog admission, or
ACTIVE_PLAN exhaustion as product completion. The next batch selects concrete
residual subset rows instead of broad cleanup.

## Remaining Owner Accounting

### Unsupported Rows

| Unit                           | Owner                                                            | Reason                                                                                                                                           |
| ------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `fighter_fighting_style`       | `character-creation-runtime`; selected Fighting Style feat Units | Choice/grant container; selected Fighting Style feat carries executable pressure.                                                                |
| `fighter_weapon_mastery`       | `character-creation-runtime`; mastery property Units             | Weapon Mastery grant container; selected mastery Units carry execution.                                                                          |
| `barbarian_weapon_mastery`     | `character-creation-runtime`; mastery property Units             | Weapon Mastery grant container; selected mastery Units carry execution.                                                                          |
| `paladin_weapon_mastery`       | `character-creation-runtime`; mastery property Units             | Weapon Mastery grant container; selected mastery Units carry execution.                                                                          |
| `ranger_weapon_mastery`        | `character-creation-runtime`; mastery property Units             | Weapon Mastery grant container; selected mastery Units carry execution.                                                                          |
| `rogue_weapon_mastery`         | `character-creation-runtime`; mastery property Units             | Weapon Mastery grant container; selected mastery Units carry execution.                                                                          |
| `warlock_eldritch_invocations` | `character-creation-runtime`; selected invocation option tasks   | Invocation choice source facts are authored; individual invocation option execution belongs to narrower selected-option tasks.                   |
| `detect_evil_and_good`         | exploration/detection owner not promoted                         | Detection, occlusion search semantics, and Hallow discovery are outside promoted battle profiles.                                                |
| `detect_magic`                 | exploration/detection owner not promoted                         | Detection and Concentration search semantics are outside promoted battle profiles.                                                               |
| `detect_poison_and_disease`    | exploration/detection owner not promoted                         | Detection, occlusion search, and poison/disease identification are outside promoted battle profiles.                                             |
| `minor_illusion`               | illusion/exploration owner not promoted                          | Sound/image illusion creation, physical-interaction reveal, faint rendering after Study, and recast expiry are outside promoted battle profiles. |

### Profile-Subset Rows

| Unit                            | Supported owner                              | Remaining owner/reason                                                                                                                                                                                  |
| ------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bard_bardic_inspiration`       | `battle-runtime`                             | Later-level die-size scaling is non-level-1 work already classified by SRDINV78.                                                                                                                        |
| `monk_martial_arts`             | `battle-runtime`; `character-battle-runtime` | Later-level Martial Arts die scaling is non-level-1 work already classified by SRDINV78.                                                                                                                |
| `ranger_favored_enemy`          | `battle-runtime`; `character-battle-runtime` | Later free-cast scaling is non-level-1; Hunter's Mark finding Advantage is now covered by SRDINV87C.                                                                                                    |
| `chill_touch`                   | `battle-runtime`                             | Non-combatant target eligibility remains a battle target-boundary residual; SRDINV89A owns the next runnable slice.                                                                                     |
| `charm_person`                  | `battle-runtime`                             | Friendly disposition, social effects, and target knowledge when the spell ends belong to SRDINV41 social/knowledge work.                                                                                |
| `faerie_fire`                   | `battle-runtime`                             | Illuminated-area projection, line of sight, and Darkvision interaction remain battle-adjacent visibility residuals; SRDINV89C owns the next light/visibility boundary.                                  |
| `feather_fall`                  | `battle-runtime`                             | Fall distance, elevation, and landing geometry belong to SRDINV55 spatial work.                                                                                                                         |
| `find_familiar`                 | `battle-runtime`                             | Generic command AI and unsupported familiar-form attacks remain outside the promoted subset; SRDINV86 closed the companion runtime lane.                                                                |
| `fog_cloud`                     | `battle-runtime`; table/spatial caller facts | Area membership, line of sight, map illumination, pathfinding, and wind derivation belong to SRDINV66 spatial/table work.                                                                               |
| `grease`                        | `battle-runtime`                             | Automatic area membership and pathfinding belong to SRDINV66 spatial work.                                                                                                                              |
| `hunters_mark`                  | `battle-runtime`; `character-battle-runtime` | Mark damage and retargeting are supported; SRDINV87C covers finding Advantage.                                                                                                                          |
| `jump`                          | `battle-runtime`                             | Jump arc, pathfinding, collision, final-position, and Difficult Terrain landing derivation belong to SRDINV55 spatial work.                                                                             |
| `light`                         | `battle-runtime`                             | Cover suppression, illuminated-area projection, obscured-area derivation, and Darkvision-adjusted sight remain battle-adjacent visibility residuals; SRDINV89C owns the next light/visibility boundary. |
| `protection_from_evil_and_good` | `battle-runtime`                             | Repeat-save/possession-save and willing-touch target nuance remain battle-adjacent protection residuals; SRDINV89B owns the next runnable slice.                                                        |
| `thunderwave`                   | `battle-runtime`                             | Push geometry/pathfinding/final-position, broad object simulation, and sound propagation belong to SRDINV55.                                                                                            |

## Source Review

Local SRD 5.2.1 source check:

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md` lines 1292-1303 for
  Dancing Lights' SRDINV88A-supported light-source runtime.
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md` lines 1407-1450 for
  the Detect spells' sensing, occlusion, Hallow, aura, poison/disease, and
  exploration-facing identification clauses.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md` lines 337-361 for Minor
  Illusion's created sound/image, Study action, faint rendering, and physical
  interaction clauses.
- `.references/srd-5.2.1/Classes/Fighter.md` lines 56-74 and
  `.references/srd-5.2.1/Equipment.md` lines 84-127 for Fighting Style and
  Weapon Mastery as selection/unlock facts whose selected feat/mastery property
  Units carry executable pressure.
- `.references/srd-5.2.1/Classes/Warlock.md` lines 280-295 for selected
  Eldritch Invocation options already split into narrower option owners.
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md` lines 707-720 for Chill
  Touch's creature-or-object target and noncombatant wording.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md` lines 219-231 and
  1577-1589 for Faerie Fire and Light emitter/visibility clauses.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md` lines 907-921 for
  Protection from Evil and Good's scoped attacker, possession, condition
  prevention, and new-saving-throw Advantage clauses.
- `.references/srd-5.2.1/Rules-Glossary.md` lines 177-179, 357-359, 412-414,
  656-658, 794-796, and 1020-1022 for Bright Light, Darkvision, Dim Light,
  Lightly Obscured, Possession, and Target vocabulary.

`UBIQUITOUS_LANGUAGE.md` was checked for Spell Definition, Spell Invocation,
Spell Effect, Magic Action, Bonus Action, Concentration, Dim Light, Obscurement,
Darkvision, Study action, Weapon Mastery, Mastery Property, Fighting Style, and
choice/container vocabulary.

## Appended Batch

SRDINV88B selects another concrete implementation batch rather than final
closure:

- `SRDINV89A`: promote Chill Touch's noncombatant target boundary for the
  residual cantrip spell-list rows.
- `SRDINV89B`: promote Protection from Evil and Good's already-applied
  possession/condition repeat-save Advantage and willing Touch target boundary.
- `SRDINV89C`: promote the next light/visibility boundary for Light and Faerie
  Fire, covering opaque-cover suppression, illuminated-area projection, and
  Darkvision/Lightly Obscured sight consequences without taking ownership of
  map pathfinding or color rendering.
- `SRDINV89D`: recursive review after SRDINV89A-SRDINV89C land.

## reviewer loop Convergence

- Round 1: rejected final closure with `Blocks: none`. The 41
  profile-subset-supported rows do not all satisfy the task's stricter
  non-battle/non-runtime exit condition.
- Round 2: selected the smallest next runnable residual batch from battle
  subset rows instead of broad cleanup: Chill Touch target boundary, Protection
  from Evil and Good repeat-save/possession-save boundary, and Light/Faerie Fire
  illumination/visibility boundary.
