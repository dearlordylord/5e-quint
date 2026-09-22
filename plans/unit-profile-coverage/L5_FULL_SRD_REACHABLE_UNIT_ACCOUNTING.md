# Level 5 Full SRD Reachable Unit Accounting

This is the final accounting snapshot for the character-level-5 SRD frontier.
It summarizes generated local artifacts after the level-5 Ralph queue landed;
it is not a semantic implementation record.

## Scope

Full means SRD 5.2.1 only. PHB+ content remains out of scope.

The level-5 frontier is row-grained:

- 28 character-level rows from the level-5 class table and level-5 feature
  anchors.
- 110 spell-level-3 class-list rows reachable by Bard, Cleric, Druid,
  Sorcerer, Warlock Pact Magic, and Wizard at character level 5.
- Total: 138 rows.

The 110 spell rows deduplicate to 42 unique spell identities. Class-list rows
remain denominator rows because each class access path is independently
reachable; unique spell identities are task-shaping groups, not the denominator.

## Source Basis

- RAW corpus: `.references/srd-5.2.1/Classes/*.md`,
  `.references/srd-5.2.1/Spells/*.md`.
- Progression delta audit:
  `plans/unit-profile-coverage/L5_PROGRESSION_DELTA_AUDIT.md`.
- Ubiquitous language: `UBIQUITOUS_LANGUAGE.md`, especially Magic Action,
  Table Decision, Companion Control, runtime-detached owners, and active
  occurrence terminology.
- Mining snapshot:
  `plans/unit-profile-coverage/level1-7-mining-audit.json` and
  `plans/unit-profile-coverage/LEVEL1_7_MINING_AUDIT.md`.
- SDK inventory:
  `plans/sdk-raw-integration/level1-5-sdk-raw-inventory.json` and
  `plans/sdk-raw-integration/LEVEL1_5_SDK_RAW_INVENTORY.md`.
- Superseded L5 Ralph lane files were removed from the active tree after this
  audit; use git history for those completed implementation records.

## Denominator Check

The local SRD class tables show level 5 grants third-level spell access for
Bard, Cleric, Druid, Sorcerer, Warlock Pact Magic, and Wizard. Paladin and
Ranger are excluded from spell-level-3 pressure at character level 5 because
their class tables only grant level-2 spell slots at that level.

| Class     | Level-5 rows | Spell-level-3 rows | Total rows |
| --------- | -----------: | -----------------: | ---------: |
| Barbarian |            3 |                  0 |          3 |
| Bard      |            2 |                 17 |         19 |
| Cleric    |            2 |                 19 |         21 |
| Druid     |            2 |                 13 |         15 |
| Fighter   |            3 |                  0 |          3 |
| Monk      |            3 |                  0 |          3 |
| Paladin   |            3 |                  0 |          3 |
| Ranger    |            2 |                  0 |          2 |
| Rogue     |            3 |                  0 |          3 |
| Sorcerer  |            2 |                 21 |         23 |
| Warlock   |            1 |                 11 |         12 |
| Wizard    |            2 |                 29 |         31 |
| Total     |           28 |                110 |        138 |

## Final Accounting Buckets

From `level1-5-sdk-raw-inventory.json`, the 138 level-5 completion rows split
as follows.

| SDK disposition             | Rows | Meaning                                                                                                      |
| --------------------------- | ---: | ------------------------------------------------------------------------------------------------------------ |
| `explicit-closure-recorded` |   12 | Class-table summary rows have recorded SDK-scope table-only closure through `L5_PROGRESSION_DELTA_AUDIT.md`. |
| `future-owner-before-sdk`   |   64 | Row is closed from current runtime/SDK scope until a future durable owner exists.                            |
| `seed-scenario-present`     |   47 | Existing SDK tracer bullets cover these row paths; preserve their evidence.                                  |
| `table-only-closure-needed` |   15 | Explicit table-only closure evidence is recorded, but no SDK runtime scenario is expected.                   |

Owner-boundary status:

| Owner-boundary status | Rows |
| --------------------- | ---: |
| resolved              |  138 |

## Progression Delta Closure

Level 5 changes more than the visible 28 feature/table rows: every class also
crosses the Proficiency Bonus `+2 -> +3` threshold, spellcasting classes gain
new Spell Access and Spell Slot facts, and several existing feature resources
derive new numeric values from class level.

Those deltas are fully accounted in
`plans/unit-profile-coverage/L5_PROGRESSION_DELTA_AUDIT.md`. The key closure is
that they are generic progression facts, not new per-class runtime dispatch:

- Proficiency Bonus is owned by Character Sheet proficiency-bonus derivation
  and character-battle handoff projection.
- Spell Access, ordinary Spell Slots, Pact Slots, and Pact Magic advancement
  are owned by existing Character Creation and Character Sheet spellcasting
  owners.
- Feature-resource deltas such as Bardic Die `D6 -> D8`, Sorcery Points
  `4 -> 5`, Monk Focus Points `4 -> 5`, Lay On Hands `20 -> 25`, Slow Fall
  `20 -> 25`, Wild Shape Temporary Hit Points `4 -> 5`, and Arcane Recovery
  budget `2 -> 3` are derived from their existing Unit/profile owners.
- Paladin and Ranger level-5 tables grant level-2 Spell Slots, not level-3
  spell pressure; they remain excluded from the spell-level-3 denominator.

Therefore this audit does not add a separate "finish level-5 progression"
runtime task. The completed Ralph queue consumes the progression audit through
class-table closure, future-owner closure, table-only closure, and SDK scenario
evidence.

## Artifact Reconciliation Findings

Generated artifacts agree on the 138-row denominator, SDK bucket counts, and
owner-boundary status. No level-5 completion row remains in the
`sdk-scenario-needed` bucket. The two earlier reconciliation rows now both use
typed future-owner closure language in the mining audit and SDK inventory.

| Unit            | Rows | Mining disposition                                                                                                                                                              | SDK disposition           | Accounting decision                                                                                                                                                                    | Ralph task                    |
| --------------- | ---: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `gaseous_form`  |    3 | `catalog-only/dead-for-now`; accepted-no-battle-effect; closure `table-spatial-derivation: future battle-runtime mist-cloud form Spell Effect plus table/spatial witness owner` | `future-owner-before-sdk` | Explicit future-owner closure is now recorded; keep out of SDK scenarios until the typed mist-cloud effect owner is promoted. The structured follow-up task remains on the Unit claim. | `L5FULL-FUT-11-GASEOUS-FORM`  |
| `phantom_steed` |    1 | `catalog-only/dead-for-now`; accepted-no-battle-effect; explicit split owner boundary for mount lifecycle/control, created-equipment cleanup, and table travel                  | `future-owner-before-sdk` | Explicit future-owner closure is now recorded; keep out of SDK scenarios until the split mount/equipment/travel owners are promoted.                                                   | `L5FULL-FUT-15-PHANTOM-STEED` |

These four rows remain inside the 64-row `future-owner-before-sdk` bucket. All
level-5 completion rows now have a resolved generated owner boundary.

## Character-Level 5 Rows

| Unit                             | Concept                             | Row kind            | SRD anchor                             | Surface                 | Catalog       | Profile             | Final disposition                        | Owner boundary                  | SDK disposition           | Evidence                                               |
| -------------------------------- | ----------------------------------- | ------------------- | -------------------------------------- | ----------------------- | ------------- | ------------------- | ---------------------------------------- | ------------------------------- | ------------------------- | ------------------------------------------------------ |
| `barbarian_extra_attack`         | Barbarian Extra Attack              | class-feature-grant | .references/srd-5.2.1/classes.md:290   | authored-record-present | installed     | supported-profile   | catalog-installed-owner-evidence-present | character-battle-to-battle      | seed-scenario-present     | unit-profile-owner-evidence; level5-sdk-tracer-bullets |
| `barbarian_fast_movement`        | Barbarian Fast Movement             | class-feature-grant | .references/srd-5.2.1/classes.md:294   | authored-record-present | installed     | supported-profile   | catalog-installed-owner-evidence-present | character-battle-to-battle      | seed-scenario-present     | unit-profile-owner-evidence; level5-sdk-tracer-bullets |
| `class_barbarian`                | Barbarian level 5 feature table row | class-table-summary | .references/srd-5.2.1/classes.md:104   | authored-record-present | installed     | unsupported-profile | non-runtime                              | build-progression               | explicit-closure-recorded | sdk-class-table-summary-closure                        |
| `bard_font_of_inspiration`       | Bard Font of Inspiration            | class-feature-grant | .references/srd-5.2.1/classes.md:908   | missing-authored-record | not-installed | unsupported-profile | catalog-only/dead-for-now                | future-runtime-owner-before-sdk | future-owner-before-sdk   | battle-readiness-closure                               |
| `class_bard`                     | Bard level 5 feature table row      | class-table-summary | .references/srd-5.2.1/classes.md:546   | authored-record-present | installed     | unsupported-profile | non-runtime                              | build-progression               | explicit-closure-recorded | sdk-class-table-summary-closure                        |
| `cleric_sear_undead`             | Cleric Sear Undead                  | class-feature-grant | .references/srd-5.2.1/classes.md:2235  | missing-authored-record | not-installed | unsupported-profile | catalog-only/dead-for-now                | future-runtime-owner-before-sdk | future-owner-before-sdk   | battle-readiness-closure                               |
| `class_cleric`                   | Cleric level 5 feature table row    | class-table-summary | .references/srd-5.2.1/classes.md:1907  | authored-record-present | installed     | unsupported-profile | non-runtime                              | build-progression               | explicit-closure-recorded | sdk-class-table-summary-closure                        |
| `druid_wild_resurgence`          | Druid Wild Resurgence               | class-feature-grant | .references/srd-5.2.1/classes.md:3600  | missing-authored-record | not-installed | unsupported-profile | catalog-only/dead-for-now                | future-runtime-owner-before-sdk | future-owner-before-sdk   | battle-readiness-closure                               |
| `class_druid`                    | Druid level 5 feature table row     | class-table-summary | .references/srd-5.2.1/classes.md:3185  | authored-record-present | installed     | unsupported-profile | non-runtime                              | build-progression               | explicit-closure-recorded | sdk-class-table-summary-closure                        |
| `fighter_extra_attack`           | Fighter Extra Attack                | class-feature-grant | .references/srd-5.2.1/classes.md:4826  | authored-record-present | installed     | supported-profile   | catalog-installed-owner-evidence-present | character-battle-to-battle      | seed-scenario-present     | unit-profile-owner-evidence; level5-sdk-tracer-bullets |
| `fighter_tactical_shift`         | Fighter Tactical Shift              | class-feature-grant | .references/srd-5.2.1/classes.md:4830  | missing-authored-record | not-installed | unsupported-profile | catalog-only/dead-for-now                | future-runtime-owner-before-sdk | future-owner-before-sdk   | battle-readiness-closure                               |
| `class_fighter`                  | Fighter level 5 feature table row   | class-table-summary | .references/srd-5.2.1/classes.md:4674  | authored-record-present | installed     | unsupported-profile | non-runtime                              | build-progression               | explicit-closure-recorded | sdk-class-table-summary-closure                        |
| `monk_extra_attack`              | Monk Extra Attack                   | class-feature-grant | .references/srd-5.2.1/classes.md:5194  | authored-record-present | installed     | supported-profile   | catalog-installed-owner-evidence-present | character-battle-to-battle      | seed-scenario-present     | unit-profile-owner-evidence                            |
| `monk_stunning_strike`           | Monk Stunning Strike                | class-feature-grant | .references/srd-5.2.1/classes.md:5198  | authored-record-present | installed     | supported-profile   | catalog-installed-owner-evidence-present | character-battle-to-battle      | seed-scenario-present     | unit-profile-owner-evidence                            |
| `class_monk`                     | Monk level 5 feature table row      | class-table-summary | .references/srd-5.2.1/classes.md:5000  | authored-record-present | installed     | unsupported-profile | non-runtime                              | build-progression               | explicit-closure-recorded | sdk-class-table-summary-closure                        |
| `paladin_extra_attack`           | Paladin Extra Attack                | class-feature-grant | .references/srd-5.2.1/classes.md:5686  | authored-record-present | installed     | supported-profile   | catalog-installed-owner-evidence-present | character-battle-to-battle      | seed-scenario-present     | unit-profile-owner-evidence; level5-sdk-tracer-bullets |
| `paladin_faithful_steed`         | Paladin Faithful Steed              | class-feature-grant | .references/srd-5.2.1/classes.md:5690  | missing-authored-record | not-installed | unsupported-profile | catalog-only/dead-for-now                | future-runtime-owner-before-sdk | future-owner-before-sdk   | battle-readiness-closure                               |
| `class_paladin`                  | Paladin level 5 feature table row   | class-table-summary | .references/srd-5.2.1/classes.md:5425  | authored-record-present | installed     | unsupported-profile | non-runtime                              | build-progression               | explicit-closure-recorded | sdk-class-table-summary-closure                        |
| `ranger_extra_attack`            | Ranger Extra Attack                 | class-feature-grant | .references/srd-5.2.1/classes.md:6449  | authored-record-present | installed     | supported-profile   | catalog-installed-owner-evidence-present | character-battle-to-battle      | seed-scenario-present     | unit-profile-owner-evidence; level5-sdk-tracer-bullets |
| `class_ranger`                   | Ranger level 5 feature table row    | class-table-summary | .references/srd-5.2.1/classes.md:6202  | authored-record-present | installed     | unsupported-profile | non-runtime                              | build-progression               | explicit-closure-recorded | sdk-class-table-summary-closure                        |
| `rogue_cunning_strike`           | Rogue Cunning Strike                | class-feature-grant | .references/srd-5.2.1/classes.md:7071  | authored-record-present | installed     | supported-profile   | catalog-installed-owner-evidence-present | character-battle-to-battle      | seed-scenario-present     | unit-profile-owner-evidence                            |
| `rogue_uncanny_dodge`            | Rogue Uncanny Dodge                 | class-feature-grant | .references/srd-5.2.1/classes.md:7085  | authored-record-present | installed     | supported-profile   | catalog-installed-owner-evidence-present | character-battle-to-battle      | seed-scenario-present     | unit-profile-owner-evidence; level5-sdk-tracer-bullets |
| `class_rogue`                    | Rogue level 5 feature table row     | class-table-summary | .references/srd-5.2.1/classes.md:6935  | authored-record-present | installed     | unsupported-profile | non-runtime                              | build-progression               | explicit-closure-recorded | sdk-class-table-summary-closure                        |
| `sorcerer_sorcerous_restoration` | Sorcerer Sorcerous Restoration      | class-feature-grant | .references/srd-5.2.1/classes.md:7704  | authored-record-present | installed     | supported-profile   | catalog-installed-owner-evidence-present | character-sheet                 | seed-scenario-present     | unit-profile-owner-evidence                            |
| `class_sorcerer`                 | Sorcerer level 5 feature table row  | class-table-summary | .references/srd-5.2.1/classes.md:7331  | authored-record-present | installed     | unsupported-profile | non-runtime                              | build-progression               | explicit-closure-recorded | sdk-class-table-summary-closure                        |
| `class_warlock`                  | Warlock level 5 feature table row   | class-table-summary | .references/srd-5.2.1/classes.md:8800  | authored-record-present | installed     | unsupported-profile | non-runtime                              | build-progression               | explicit-closure-recorded | sdk-class-table-summary-closure                        |
| `wizard_memorize_spell`          | Wizard Memorize Spell               | class-feature-grant | .references/srd-5.2.1/classes.md:10269 | missing-authored-record | not-installed | unsupported-profile | catalog-only/dead-for-now                | future-runtime-owner-before-sdk | future-owner-before-sdk   | battle-readiness-closure                               |
| `class_wizard`                   | Wizard level 5 feature table row    | class-table-summary | .references/srd-5.2.1/classes.md:9951  | authored-record-present | installed     | unsupported-profile | non-runtime                              | build-progression               | explicit-closure-recorded | sdk-class-table-summary-closure                        |

## Spell-Level 3 Unique Identities

This table groups the 110 class-list rows into their 42 spell identities. The
`Rows` column is the denominator contribution.

| Unit                     | Spell                  | Classes                                        | Rows | Surface                 | Catalog       | Profile                  | Final disposition                        | Battle                    | SRD class-list anchors                                                                                                                                                                                                                                                                        |
| ------------------------ | ---------------------- | ---------------------------------------------- | ---: | ----------------------- | ------------- | ------------------------ | ---------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `animate_dead`           | Animate Dead           | Cleric, Wizard                                 |    2 | authored-record-present | not-installed | unsupported-profile      | catalog-only/dead-for-now                | accepted-no-battle-effect | Cleric .references/srd-5.2.1/classes.md:2520<br>Wizard .references/srd-5.2.1/classes.md:10745                                                                                                                                                                                                 |
| `beacon_of_hope`         | Beacon of Hope         | Cleric                                         |    1 | authored-record-present | not-installed | unsupported-profile      | catalog-only/dead-for-now                | accepted-no-battle-effect | Cleric .references/srd-5.2.1/classes.md:2525                                                                                                                                                                                                                                                  |
| `bestow_curse`           | Bestow Curse           | Bard, Cleric, Wizard                           |    3 | authored-record-present | installed     | unsupported-profile      | catalog-only/dead-for-now                | accepted-no-battle-effect | Bard .references/srd-5.2.1/classes.md:1267<br>Cleric .references/srd-5.2.1/classes.md:2530<br>Wizard .references/srd-5.2.1/classes.md:10750                                                                                                                                                   |
| `blink`                  | Blink                  | Sorcerer, Wizard                               |    2 | authored-record-present | installed     | unsupported-profile      | catalog-only/dead-for-now                | accepted-no-battle-effect | Sorcerer .references/srd-5.2.1/classes.md:8161<br>Wizard .references/srd-5.2.1/classes.md:10755                                                                                                                                                                                               |
| `call_lightning`         | Call Lightning         | Druid                                          |    1 | authored-record-present | not-installed | unsupported-profile      | catalog-only/dead-for-now                | accepted-no-battle-effect | Druid .references/srd-5.2.1/classes.md:3948                                                                                                                                                                                                                                                   |
| `clairvoyance`           | Clairvoyance           | Bard, Cleric, Sorcerer, Wizard                 |    4 | authored-record-present | not-installed | unsupported-profile      | catalog-only/dead-for-now                | accepted-no-battle-effect | Bard .references/srd-5.2.1/classes.md:1272<br>Cleric .references/srd-5.2.1/classes.md:2535<br>Sorcerer .references/srd-5.2.1/classes.md:8166<br>Wizard .references/srd-5.2.1/classes.md:10760                                                                                                 |
| `conjure_animals`        | Conjure Animals        | Druid                                          |    1 | authored-record-present | installed     | unsupported-profile      | catalog-only/dead-for-now                | accepted-no-battle-effect | Druid .references/srd-5.2.1/classes.md:3953                                                                                                                                                                                                                                                   |
| `counterspell`           | Counterspell           | Sorcerer, Warlock, Wizard                      |    3 | authored-record-present | installed     | supported-profile        | catalog-installed-owner-evidence-present | accepted                  | Sorcerer .references/srd-5.2.1/classes.md:8171<br>Warlock .references/srd-5.2.1/classes.md:9438<br>Wizard .references/srd-5.2.1/classes.md:10765                                                                                                                                              |
| `create_food_and_water`  | Create Food and Water  | Cleric                                         |    1 | authored-record-present | not-installed | unsupported-profile      | catalog-only/dead-for-now                | accepted-no-battle-effect | Cleric .references/srd-5.2.1/classes.md:2540                                                                                                                                                                                                                                                  |
| `daylight`               | Daylight               | Cleric, Druid, Sorcerer                        |    3 | authored-record-present | not-installed | unsupported-profile      | catalog-only/dead-for-now                | accepted-no-battle-effect | Cleric .references/srd-5.2.1/classes.md:2545<br>Druid .references/srd-5.2.1/classes.md:3958<br>Sorcerer .references/srd-5.2.1/classes.md:8176                                                                                                                                                 |
| `dispel_magic`           | Dispel Magic           | Bard, Cleric, Druid, Sorcerer, Warlock, Wizard |    6 | authored-record-present | installed     | profile-subset-supported | catalog-installed-owner-evidence-present | accepted                  | Bard .references/srd-5.2.1/classes.md:1277<br>Cleric .references/srd-5.2.1/classes.md:2550<br>Druid .references/srd-5.2.1/classes.md:3963<br>Sorcerer .references/srd-5.2.1/classes.md:8181<br>Warlock .references/srd-5.2.1/classes.md:9443<br>Wizard .references/srd-5.2.1/classes.md:10770 |
| `fear`                   | Fear                   | Bard, Sorcerer, Warlock, Wizard                |    4 | authored-record-present | not-installed | unsupported-profile      | catalog-only/dead-for-now                | accepted-no-battle-effect | Bard .references/srd-5.2.1/classes.md:1282<br>Sorcerer .references/srd-5.2.1/classes.md:8186<br>Warlock .references/srd-5.2.1/classes.md:9448<br>Wizard .references/srd-5.2.1/classes.md:10775                                                                                                |
| `fireball`               | Fireball               | Sorcerer, Wizard                               |    2 | authored-record-present | installed     | supported-profile        | catalog-installed-owner-evidence-present | accepted                  | Sorcerer .references/srd-5.2.1/classes.md:8191<br>Wizard .references/srd-5.2.1/classes.md:10780                                                                                                                                                                                               |
| `fly`                    | Fly                    | Sorcerer, Warlock, Wizard                      |    3 | authored-record-present | installed     | profile-subset-supported | catalog-installed-owner-evidence-present | accepted                  | Sorcerer .references/srd-5.2.1/classes.md:8196<br>Warlock .references/srd-5.2.1/classes.md:9453<br>Wizard .references/srd-5.2.1/classes.md:10785                                                                                                                                              |
| `gaseous_form`           | Gaseous Form           | Sorcerer, Warlock, Wizard                      |    3 | authored-record-present | installed     | unsupported-profile      | catalog-only/dead-for-now                | accepted-no-battle-effect | Sorcerer .references/srd-5.2.1/classes.md:8201<br>Warlock .references/srd-5.2.1/classes.md:9458<br>Wizard .references/srd-5.2.1/classes.md:10790                                                                                                                                              |
| `glyph_of_warding`       | Glyph of Warding       | Bard, Cleric, Wizard                           |    3 | authored-record-present | installed     | profile-subset-supported | catalog-installed-owner-evidence-present | accepted                  | Bard .references/srd-5.2.1/classes.md:1287<br>Cleric .references/srd-5.2.1/classes.md:2555<br>Wizard .references/srd-5.2.1/classes.md:10795                                                                                                                                                   |
| `haste`                  | Haste                  | Sorcerer, Wizard                               |    2 | authored-record-present | installed     | supported-profile        | catalog-installed-owner-evidence-present | accepted                  | Sorcerer .references/srd-5.2.1/classes.md:8206<br>Wizard .references/srd-5.2.1/classes.md:10800                                                                                                                                                                                               |
| `hypnotic_pattern`       | Hypnotic Pattern       | Bard, Sorcerer, Warlock, Wizard                |    4 | authored-record-present | installed     | supported-profile        | catalog-installed-owner-evidence-present | accepted                  | Bard .references/srd-5.2.1/classes.md:1292<br>Sorcerer .references/srd-5.2.1/classes.md:8211<br>Warlock .references/srd-5.2.1/classes.md:9463<br>Wizard .references/srd-5.2.1/classes.md:10805                                                                                                |
| `lightning_bolt`         | Lightning Bolt         | Sorcerer, Wizard                               |    2 | authored-record-present | installed     | supported-profile        | catalog-installed-owner-evidence-present | accepted                  | Sorcerer .references/srd-5.2.1/classes.md:8216<br>Wizard .references/srd-5.2.1/classes.md:10810                                                                                                                                                                                               |
| `magic_circle`           | Magic Circle           | Cleric, Warlock, Wizard                        |    3 | authored-record-present | installed     | unsupported-profile      | catalog-only/dead-for-now                | accepted-no-battle-effect | Cleric .references/srd-5.2.1/classes.md:2560<br>Warlock .references/srd-5.2.1/classes.md:9468<br>Wizard .references/srd-5.2.1/classes.md:10815                                                                                                                                                |
| `major_image`            | Major Image            | Bard, Sorcerer, Warlock, Wizard                |    4 | authored-record-present | not-installed | unsupported-profile      | catalog-only/dead-for-now                | accepted-no-battle-effect | Bard .references/srd-5.2.1/classes.md:1297<br>Sorcerer .references/srd-5.2.1/classes.md:8221<br>Warlock .references/srd-5.2.1/classes.md:9473<br>Wizard .references/srd-5.2.1/classes.md:10820                                                                                                |
| `mass_healing_word`      | Mass Healing Word      | Bard, Cleric                                   |    2 | authored-record-present | installed     | supported-profile        | catalog-installed-owner-evidence-present | accepted                  | Bard .references/srd-5.2.1/classes.md:1302<br>Cleric .references/srd-5.2.1/classes.md:2565                                                                                                                                                                                                    |
| `meld_into_stone`        | Meld into Stone        | Cleric, Druid                                  |    2 | authored-record-present | installed     | unsupported-profile      | catalog-only/dead-for-now                | accepted-no-battle-effect | Cleric .references/srd-5.2.1/classes.md:2570<br>Druid .references/srd-5.2.1/classes.md:3968                                                                                                                                                                                                   |
| `nondetection`           | Nondetection           | Bard, Wizard                                   |    2 | authored-record-present | installed     | unsupported-profile      | catalog-only/dead-for-now                | accepted-no-battle-effect | Bard .references/srd-5.2.1/classes.md:1307<br>Wizard .references/srd-5.2.1/classes.md:10825                                                                                                                                                                                                   |
| `phantom_steed`          | Phantom Steed          | Wizard                                         |    1 | authored-record-present | not-installed | unsupported-profile      | catalog-only/dead-for-now                | accepted-no-battle-effect | Wizard .references/srd-5.2.1/classes.md:10830                                                                                                                                                                                                                                                 |
| `plant_growth`           | Plant Growth           | Bard, Druid                                    |    2 | authored-record-present | installed     | unsupported-profile      | catalog-only/dead-for-now                | accepted-no-battle-effect | Bard .references/srd-5.2.1/classes.md:1312<br>Druid .references/srd-5.2.1/classes.md:3973                                                                                                                                                                                                     |
| `protection_from_energy` | Protection from Energy | Cleric, Druid, Sorcerer, Wizard                |    4 | authored-record-present | installed     | supported-profile        | catalog-installed-owner-evidence-present | accepted                  | Cleric .references/srd-5.2.1/classes.md:2575<br>Druid .references/srd-5.2.1/classes.md:3978<br>Sorcerer .references/srd-5.2.1/classes.md:8226<br>Wizard .references/srd-5.2.1/classes.md:10835                                                                                                |
| `remove_curse`           | Remove Curse           | Cleric, Warlock, Wizard                        |    3 | authored-record-present | installed     | unsupported-profile      | catalog-only/dead-for-now                | accepted-no-battle-effect | Cleric .references/srd-5.2.1/classes.md:2580<br>Warlock .references/srd-5.2.1/classes.md:9478<br>Wizard .references/srd-5.2.1/classes.md:10840                                                                                                                                                |
| `revivify`               | Revivify               | Cleric, Druid                                  |    2 | authored-record-present | installed     | unsupported-profile      | catalog-only/dead-for-now                | accepted-no-battle-effect | Cleric .references/srd-5.2.1/classes.md:2585<br>Druid .references/srd-5.2.1/classes.md:3983                                                                                                                                                                                                   |
| `sending`                | Sending                | Bard, Cleric, Wizard                           |    3 | authored-record-present | installed     | unsupported-profile      | catalog-only/dead-for-now                | accepted-no-battle-effect | Bard .references/srd-5.2.1/classes.md:1317<br>Cleric .references/srd-5.2.1/classes.md:2590<br>Wizard .references/srd-5.2.1/classes.md:10845                                                                                                                                                   |
| `sleet_storm`            | Sleet Storm            | Druid, Sorcerer, Wizard                        |    3 | authored-record-present | installed     | profile-subset-supported | catalog-installed-owner-evidence-present | accepted                  | Druid .references/srd-5.2.1/classes.md:3988<br>Sorcerer .references/srd-5.2.1/classes.md:8231<br>Wizard .references/srd-5.2.1/classes.md:10850                                                                                                                                                |
| `slow`                   | Slow                   | Bard, Sorcerer, Wizard                         |    3 | authored-record-present | installed     | supported-profile        | catalog-installed-owner-evidence-present | accepted                  | Bard .references/srd-5.2.1/classes.md:1322<br>Sorcerer .references/srd-5.2.1/classes.md:8236<br>Wizard .references/srd-5.2.1/classes.md:10855                                                                                                                                                 |
| `speak_with_dead`        | Speak with Dead        | Bard, Cleric, Wizard                           |    3 | authored-record-present | installed     | unsupported-profile      | catalog-only/dead-for-now                | accepted-no-battle-effect | Bard .references/srd-5.2.1/classes.md:1327<br>Cleric .references/srd-5.2.1/classes.md:2595<br>Wizard .references/srd-5.2.1/classes.md:10860                                                                                                                                                   |
| `speak_with_plants`      | Speak with Plants      | Bard, Druid                                    |    2 | authored-record-present | installed     | unsupported-profile      | catalog-only/dead-for-now                | accepted-no-battle-effect | Bard .references/srd-5.2.1/classes.md:1332<br>Druid .references/srd-5.2.1/classes.md:3993                                                                                                                                                                                                     |
| `spirit_guardians`       | Spirit Guardians       | Cleric                                         |    1 | authored-record-present | not-installed | unsupported-profile      | catalog-only/dead-for-now                | accepted-no-battle-effect | Cleric .references/srd-5.2.1/classes.md:2600                                                                                                                                                                                                                                                  |
| `stinking_cloud`         | Stinking Cloud         | Bard, Sorcerer, Wizard                         |    3 | authored-record-present | not-installed | unsupported-profile      | catalog-only/dead-for-now                | accepted-no-battle-effect | Bard .references/srd-5.2.1/classes.md:1337<br>Sorcerer .references/srd-5.2.1/classes.md:8241<br>Wizard .references/srd-5.2.1/classes.md:10865                                                                                                                                                 |
| `tiny_hut`               | Tiny Hut               | Bard, Wizard                                   |    2 | authored-record-present | installed     | unsupported-profile      | catalog-only/dead-for-now                | accepted-no-battle-effect | Bard .references/srd-5.2.1/classes.md:1342<br>Wizard .references/srd-5.2.1/classes.md:10870                                                                                                                                                                                                   |
| `tongues`                | Tongues                | Bard, Cleric, Sorcerer, Warlock, Wizard        |    5 | authored-record-present | not-installed | unsupported-profile      | catalog-only/dead-for-now                | accepted-no-battle-effect | Bard .references/srd-5.2.1/classes.md:1347<br>Cleric .references/srd-5.2.1/classes.md:2605<br>Sorcerer .references/srd-5.2.1/classes.md:8246<br>Warlock .references/srd-5.2.1/classes.md:9483<br>Wizard .references/srd-5.2.1/classes.md:10875                                                |
| `vampiric_touch`         | Vampiric Touch         | Sorcerer, Warlock, Wizard                      |    3 | authored-record-present | not-installed | unsupported-profile      | catalog-only/dead-for-now                | accepted-no-battle-effect | Sorcerer .references/srd-5.2.1/classes.md:8251<br>Warlock .references/srd-5.2.1/classes.md:9488<br>Wizard .references/srd-5.2.1/classes.md:10880                                                                                                                                              |
| `water_breathing`        | Water Breathing        | Druid, Sorcerer, Wizard                        |    3 | authored-record-present | not-installed | unsupported-profile      | catalog-only/dead-for-now                | accepted-no-battle-effect | Druid .references/srd-5.2.1/classes.md:3998<br>Sorcerer .references/srd-5.2.1/classes.md:8256<br>Wizard .references/srd-5.2.1/classes.md:10885                                                                                                                                                |
| `water_walk`             | Water Walk             | Cleric, Druid, Sorcerer                        |    3 | authored-record-present | installed     | unsupported-profile      | catalog-only/dead-for-now                | accepted-no-battle-effect | Cleric .references/srd-5.2.1/classes.md:2610<br>Druid .references/srd-5.2.1/classes.md:4003<br>Sorcerer .references/srd-5.2.1/classes.md:8261                                                                                                                                                 |
| `wind_wall`              | Wind Wall              | Druid                                          |    1 | authored-record-present | not-installed | unsupported-profile      | catalog-only/dead-for-now                | accepted-no-battle-effect | Druid .references/srd-5.2.1/classes.md:4008                                                                                                                                                                                                                                                   |

## Next Action Mapping

Each row maps to the generated coverage registries and tracker-owned follow-up
work.

| Bucket                       | Rows | Ralph action                                                                                                |
| ---------------------------- | ---: | ----------------------------------------------------------------------------------------------------------- |
| Existing SDK seeds           |   47 | Preserve existing level-5 tracer bullets and keep their evidence discoverable.                              |
| Explicit class-table closure |   12 | Preserve the recorded SDK-scope table-only closure for the twelve class-table summaries.                    |
| Future owner before SDK      |   64 | Preserve current runtime-detached closure; do not add SDK scenarios until the durable owner exists.         |
| Table-only spell closure     |   15 | Preserve explicit table-only closure evidence for Clairvoyance, Sending, Speak with Dead, and Tongues rows. |

## Spell Description Anchors

Every spell task must pair its class-list access anchors with the matching spell
description anchor below.

| Unit                     | Spell description anchor             |
| ------------------------ | ------------------------------------ |
| `animate_dead`           | .references/srd-5.2.1/spells.md:377  |
| `beacon_of_hope`         | .references/srd-5.2.1/spells.md:728  |
| `bestow_curse`           | .references/srd-5.2.1/spells.md:754  |
| `blink`                  | .references/srd-5.2.1/spells.md:2850 |
| `call_lightning`         | .references/srd-5.2.1/spells.md:882  |
| `clairvoyance`           | .references/srd-5.2.1/spells.md:996  |
| `conjure_animals`        | .references/srd-5.2.1/spells.md:1190 |
| `counterspell`           | .references/srd-5.2.1/spells.md:1488 |
| `create_food_and_water`  | .references/srd-5.2.1/spells.md:1499 |
| `daylight`               | .references/srd-5.2.1/spells.md:1643 |
| `dispel_magic`           | .references/srd-5.2.1/spells.md:1823 |
| `fear`                   | .references/srd-5.2.1/spells.md:2256 |
| `fireball`               | .references/srd-5.2.1/spells.md:2431 |
| `fly`                    | .references/srd-5.2.1/spells.md:2564 |
| `gaseous_form`           | .references/srd-5.2.1/spells.md:2669 |
| `glyph_of_warding`       | .references/srd-5.2.1/spells.md:842  |
| `haste`                  | .references/srd-5.2.1/spells.md:3072 |
| `hypnotic_pattern`       | .references/srd-5.2.1/spells.md:3246 |
| `lightning_bolt`         | .references/srd-5.2.1/spells.md:3507 |
| `magic_circle`           | .references/srd-5.2.1/spells.md:3602 |
| `major_image`            | .references/srd-5.2.1/spells.md:3706 |
| `mass_healing_word`      | .references/srd-5.2.1/spells.md:3747 |
| `meld_into_stone`        | .references/srd-5.2.1/spells.md:3790 |
| `nondetection`           | .references/srd-5.2.1/spells.md:3997 |
| `phantom_steed`          | .references/srd-5.2.1/spells.md:4065 |
| `plant_growth`           | .references/srd-5.2.1/spells.md:4124 |
| `protection_from_energy` | .references/srd-5.2.1/spells.md:4425 |
| `remove_curse`           | .references/srd-5.2.1/spells.md:4594 |
| `revivify`               | .references/srd-5.2.1/spells.md:4663 |
| `sending`                | .references/srd-5.2.1/spells.md:4843 |
| `sleet_storm`            | .references/srd-5.2.1/spells.md:5024 |
| `slow`                   | .references/srd-5.2.1/spells.md:5037 |
| `speak_with_dead`        | .references/srd-5.2.1/spells.md:5093 |
| `speak_with_plants`      | .references/srd-5.2.1/spells.md:5106 |
| `spirit_guardians`       | .references/srd-5.2.1/spells.md:5149 |
| `stinking_cloud`         | .references/srd-5.2.1/spells.md:5192 |
| `tiny_hut`               | .references/srd-5.2.1/spells.md:5594 |
| `tongues`                | .references/srd-5.2.1/spells.md:5611 |
| `vampiric_touch`         | .references/srd-5.2.1/spells.md:5744 |
| `water_breathing`        | .references/srd-5.2.1/spells.md:5884 |
| `water_walk`             | .references/srd-5.2.1/spells.md:5895 |
| `wind_wall`              | .references/srd-5.2.1/spells.md:5953 |

## Stale Artifact Hygiene

The L4 planning precedent included a separate progression-delta audit. L5 now
has the same accounting layer at
`plans/unit-profile-coverage/L5_PROGRESSION_DELTA_AUDIT.md`; future work should
cite that file instead of re-deriving level-5 generic progression facts.

## Verification Plan

- RAW and ubiquitous-language check: before any later task changes behavior,
  reread the listed local SRD anchor and `UBIQUITOUS_LANGUAGE.md`. This audit
  used only `.references/srd-5.2.1/` and generated local artifacts.
- Reviewer-loop convergence: run RAW traceability, ubiquitous-language/domain,
  architecture/connascence, and code-review passes until no reasonable findings
  remain.
- Read-only or plan-only commands:
  `pnpm unit-profile-coverage:check:self-test`,
  `pnpm unit-profile-coverage:check`,
  `pnpm rules-kernel-coverage:check:self-test`,
  `pnpm rules-kernel-coverage:check`,
  `pnpm sdk-raw-integration-inventory:check`,
  `pnpm cleanroom-branch-coverage:check`,
  `git diff --check`.
- Do not run MBT for this accounting refresh.
