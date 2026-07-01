# Level 5 Full SRD Reachable Unit Accounting

This is pre-work for the character-level-5 SRD frontier. It is an accounting
audit and task-shaping document, not an implementation record.

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

| Class | Level-5 rows | Spell-level-3 rows | Total rows |
| --- | ---: | ---: | ---: |
| Barbarian | 3 | 0 | 3 |
| Bard | 2 | 17 | 19 |
| Cleric | 2 | 19 | 21 |
| Druid | 2 | 13 | 15 |
| Fighter | 3 | 0 | 3 |
| Monk | 3 | 0 | 3 |
| Paladin | 3 | 0 | 3 |
| Ranger | 2 | 0 | 2 |
| Rogue | 3 | 0 | 3 |
| Sorcerer | 2 | 21 | 23 |
| Warlock | 1 | 11 | 12 |
| Wizard | 2 | 29 | 31 |
| Total | 28 | 110 | 138 |

## Current Accounting Buckets

From `level1-5-sdk-raw-inventory.json`, the 138 level-5 completion rows split
as follows.

| SDK disposition | Rows | Meaning |
| --- | ---: | --- |
| `seed-scenario-present` | 6 | Existing SDK seeds already cover these row paths; verify and preserve. |
| `sdk-scenario-needed` | 35 | Runtime/support owner is resolved; add SDK RAW integration scenarios. |
| `sdk-scenario-or-owner-closure-needed` | 6 | Owner evidence exists, but SDK must choose scenario coverage or explicit SDK closure. |
| `explicit-closure-recorded` | 12 | Class-table summary rows have recorded SDK-scope table-only closure through `L5_PROGRESSION_DELTA_AUDIT.md`. |
| `future-owner-before-sdk` | 44 | Row is closed from current runtime/SDK scope until a future durable owner exists. |
| `closure-review-needed` | 35 | Owner boundary remains unresolved for SDK accounting. |

Owner-boundary status:

| Owner-boundary status | Rows |
| --- | ---: |
| resolved | 103 |
| unresolved-review | 35 |

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
runtime task. The existing Ralph queue consumes the progression audit through
the class-table closure, feature owner-review, future-owner, and SDK scenario
tasks.

## Artifact Reconciliation Findings

Generated artifacts agree on the 138-row denominator and SDK bucket counts, but
two spell identities need explicit reconciliation because the mining audit's
runtime-follow-up language is stronger than the SDK queue's future-owner closure
label.

| Unit | Rows | Mining disposition | SDK disposition | Accounting decision | Ralph task |
| --- | ---: | --- | --- | --- | --- |
| `gaseous_form` | 3 | `catalog-installed-owner-evidence-required`; battle-runtime-required; follow-up `L3-FOLLOWUP-GASEOUS-FORM-MIST-CLOUD-RUNTIME` | `future-owner-before-sdk` | Keep out of SDK scenarios until the typed mist-cloud effect owner is promoted or the checker records an explicit future-owner closure matching the mining follow-up. | `L5FULL-FUT-11-GASEOUS-FORM` |
| `phantom_steed` | 1 | `catalog-authored-executable-follow-up`; battle-runtime-required; split follow-ups for mount lifecycle, created equipment, and table travel | `future-owner-before-sdk` | Keep out of SDK scenarios until the split mount/equipment/travel owners are promoted or the checker records an explicit future-owner closure matching the mining follow-ups. | `L5FULL-FUT-15-PHANTOM-STEED` |

These four rows remain inside the 44-row `future-owner-before-sdk` bucket. The
Ralph tasks above must reconcile the generated artifacts before preserving the
closure; they are not ordinary no-op closure tasks.

## Character-Level 5 Rows

| Unit | Concept | Row kind | SRD anchor | Surface | Catalog | Profile | Final disposition | Owner boundary | SDK disposition | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `barbarian_extra_attack` | Barbarian Extra Attack | class-feature-grant | .references/srd-5.2.1/Classes/Barbarian.md:112 | authored-record-present | installed | supported-profile | catalog-installed-owner-evidence-present | character-battle-to-battle | sdk-scenario-or-owner-closure-needed | unit-profile-owner-evidence |
| `barbarian_fast_movement` | Barbarian Fast Movement | class-feature-grant | .references/srd-5.2.1/Classes/Barbarian.md:116 | authored-record-present | installed | supported-profile | catalog-installed-owner-evidence-present | character-battle-to-battle | sdk-scenario-or-owner-closure-needed | unit-profile-owner-evidence |
| `class_barbarian` | Barbarian level 5 feature table row | class-table-summary | .references/srd-5.2.1/Classes/Barbarian.md:39 | authored-record-present | installed | unsupported-profile | non-runtime | build-progression | explicit-closure-recorded | sdk-class-table-summary-closure |
| `bard_font_of_inspiration` | Bard Font of Inspiration | class-feature-grant | .references/srd-5.2.1/Classes/Bard.md:113 | missing-authored-record | not-installed | unsupported-profile | catalog-only/dead-for-now | future-runtime-owner-before-sdk | future-owner-before-sdk | battle-readiness-closure |
| `class_bard` | Bard level 5 feature table row | class-table-summary | .references/srd-5.2.1/Classes/Bard.md:40 | authored-record-present | installed | unsupported-profile | non-runtime | build-progression | explicit-closure-recorded | sdk-class-table-summary-closure |
| `cleric_sear_undead` | Cleric Sear Undead | class-feature-grant | .references/srd-5.2.1/Classes/Cleric.md:110 | missing-authored-record | not-installed | unsupported-profile | catalog-only/dead-for-now | future-runtime-owner-before-sdk | future-owner-before-sdk | battle-readiness-closure |
| `class_cleric` | Cleric level 5 feature table row | class-table-summary | .references/srd-5.2.1/Classes/Cleric.md:39 | authored-record-present | installed | unsupported-profile | non-runtime | build-progression | explicit-closure-recorded | sdk-class-table-summary-closure |
| `druid_wild_resurgence` | Druid Wild Resurgence | class-feature-grant | .references/srd-5.2.1/Classes/Druid.md:138 | missing-authored-record | not-installed | unsupported-profile | catalog-only/dead-for-now | future-runtime-owner-before-sdk | future-owner-before-sdk | battle-readiness-closure |
| `class_druid` | Druid level 5 feature table row | class-table-summary | .references/srd-5.2.1/Classes/Druid.md:36 | authored-record-present | installed | unsupported-profile | non-runtime | build-progression | explicit-closure-recorded | sdk-class-table-summary-closure |
| `fighter_extra_attack` | Fighter Extra Attack | class-feature-grant | .references/srd-5.2.1/Classes/Fighter.md:94 | authored-record-present | installed | supported-profile | catalog-installed-owner-evidence-present | character-battle-to-battle | sdk-scenario-or-owner-closure-needed | unit-profile-owner-evidence |
| `fighter_tactical_shift` | Fighter Tactical Shift | class-feature-grant | .references/srd-5.2.1/Classes/Fighter.md:98 | missing-authored-record | not-installed | unsupported-profile | catalog-only/dead-for-now | class-feature-closure-review | closure-review-needed | battle-readiness-closure |
| `class_fighter` | Fighter level 5 feature table row | class-table-summary | .references/srd-5.2.1/Classes/Fighter.md:35 | authored-record-present | installed | unsupported-profile | non-runtime | build-progression | explicit-closure-recorded | sdk-class-table-summary-closure |
| `monk_extra_attack` | Monk Extra Attack | class-feature-grant | .references/srd-5.2.1/Classes/Monk.md:120 | authored-record-present | installed | supported-profile | catalog-installed-owner-evidence-present | character-battle-to-battle | seed-scenario-present | unit-profile-owner-evidence |
| `monk_stunning_strike` | Monk Stunning Strike | class-feature-grant | .references/srd-5.2.1/Classes/Monk.md:124 | authored-record-present | installed | supported-profile | catalog-installed-owner-evidence-present | character-battle-to-battle | seed-scenario-present | unit-profile-owner-evidence |
| `class_monk` | Monk level 5 feature table row | class-table-summary | .references/srd-5.2.1/Classes/Monk.md:36 | authored-record-present | installed | unsupported-profile | non-runtime | build-progression | explicit-closure-recorded | sdk-class-table-summary-closure |
| `paladin_extra_attack` | Paladin Extra Attack | class-feature-grant | .references/srd-5.2.1/Classes/Paladin.md:126 | authored-record-present | installed | supported-profile | catalog-installed-owner-evidence-present | character-battle-to-battle | sdk-scenario-or-owner-closure-needed | unit-profile-owner-evidence |
| `paladin_faithful_steed` | Paladin Faithful Steed | class-feature-grant | .references/srd-5.2.1/Classes/Paladin.md:130 | missing-authored-record | not-installed | unsupported-profile | catalog-only/dead-for-now | future-runtime-owner-before-sdk | future-owner-before-sdk | battle-readiness-closure |
| `class_paladin` | Paladin level 5 feature table row | class-table-summary | .references/srd-5.2.1/Classes/Paladin.md:39 | authored-record-present | installed | unsupported-profile | non-runtime | build-progression | explicit-closure-recorded | sdk-class-table-summary-closure |
| `ranger_extra_attack` | Ranger Extra Attack | class-feature-grant | .references/srd-5.2.1/Classes/Ranger.md:110 | authored-record-present | installed | supported-profile | catalog-installed-owner-evidence-present | character-battle-to-battle | sdk-scenario-or-owner-closure-needed | unit-profile-owner-evidence |
| `class_ranger` | Ranger level 5 feature table row | class-table-summary | .references/srd-5.2.1/Classes/Ranger.md:39 | authored-record-present | installed | unsupported-profile | non-runtime | build-progression | explicit-closure-recorded | sdk-class-table-summary-closure |
| `rogue_cunning_strike` | Rogue Cunning Strike | class-feature-grant | .references/srd-5.2.1/Classes/Rogue.md:97 | authored-record-present | installed | supported-profile | catalog-installed-owner-evidence-present | character-battle-to-battle | seed-scenario-present | unit-profile-owner-evidence |
| `rogue_uncanny_dodge` | Rogue Uncanny Dodge | class-feature-grant | .references/srd-5.2.1/Classes/Rogue.md:109 | authored-record-present | installed | supported-profile | catalog-installed-owner-evidence-present | character-battle-to-battle | sdk-scenario-or-owner-closure-needed | unit-profile-owner-evidence |
| `class_rogue` | Rogue level 5 feature table row | class-table-summary | .references/srd-5.2.1/Classes/Rogue.md:40 | authored-record-present | installed | unsupported-profile | non-runtime | build-progression | explicit-closure-recorded | sdk-class-table-summary-closure |
| `sorcerer_sorcerous_restoration` | Sorcerer Sorcerous Restoration | class-feature-grant | .references/srd-5.2.1/Classes/Sorcerer.md:127 | authored-record-present | installed | supported-profile | catalog-installed-owner-evidence-present | character-sheet | seed-scenario-present | unit-profile-owner-evidence |
| `class_sorcerer` | Sorcerer level 5 feature table row | class-table-summary | .references/srd-5.2.1/Classes/Sorcerer.md:39 | authored-record-present | installed | unsupported-profile | non-runtime | build-progression | explicit-closure-recorded | sdk-class-table-summary-closure |
| `class_warlock` | Warlock level 5 feature table row | class-table-summary | .references/srd-5.2.1/Classes/Warlock.md:39 | authored-record-present | installed | unsupported-profile | non-runtime | build-progression | explicit-closure-recorded | sdk-class-table-summary-closure |
| `wizard_memorize_spell` | Wizard Memorize Spell | class-feature-grant | .references/srd-5.2.1/Classes/Wizard.md:116 | missing-authored-record | not-installed | unsupported-profile | catalog-only/dead-for-now | future-runtime-owner-before-sdk | future-owner-before-sdk | battle-readiness-closure |
| `class_wizard` | Wizard level 5 feature table row | class-table-summary | .references/srd-5.2.1/Classes/Wizard.md:39 | authored-record-present | installed | unsupported-profile | non-runtime | build-progression | explicit-closure-recorded | sdk-class-table-summary-closure |

## Spell-Level 3 Unique Identities

This table groups the 110 class-list rows into their 42 spell identities. The
`Rows` column is the denominator contribution.

| Unit | Spell | Classes | Rows | Surface | Catalog | Profile | Final disposition | Battle | SRD class-list anchors |
| --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| `animate_dead` | Animate Dead | Cleric, Wizard | 2 | authored-record-present | not-installed | unsupported-profile | catalog-only/dead-for-now | accepted-no-battle-effect | Cleric .references/srd-5.2.1/Classes/Cleric.md:204<br>Wizard .references/srd-5.2.1/Classes/Wizard.md:237 |
| `beacon_of_hope` | Beacon of Hope | Cleric | 1 | authored-record-present | not-installed | unsupported-profile | catalog-only/dead-for-now | accepted-no-battle-effect | Cleric .references/srd-5.2.1/Classes/Cleric.md:205 |
| `bestow_curse` | Bestow Curse | Bard, Cleric, Wizard | 3 | authored-record-present | installed | unsupported-profile | catalog-only/dead-for-now | accepted-no-battle-effect | Bard .references/srd-5.2.1/Classes/Bard.md:217<br>Cleric .references/srd-5.2.1/Classes/Cleric.md:206<br>Wizard .references/srd-5.2.1/Classes/Wizard.md:238 |
| `blink` | Blink | Sorcerer, Wizard | 2 | authored-record-present | installed | unsupported-profile | catalog-only/dead-for-now | accepted-no-battle-effect | Sorcerer .references/srd-5.2.1/Classes/Sorcerer.md:300<br>Wizard .references/srd-5.2.1/Classes/Wizard.md:239 |
| `call_lightning` | Call Lightning | Druid | 1 | authored-record-present | not-installed | unsupported-profile | catalog-only/dead-for-now | accepted-no-battle-effect | Druid .references/srd-5.2.1/Classes/Druid.md:253 |
| `clairvoyance` | Clairvoyance | Bard, Cleric, Sorcerer, Wizard | 4 | authored-record-present | not-installed | unsupported-profile | catalog-only/dead-for-now | accepted-no-battle-effect | Bard .references/srd-5.2.1/Classes/Bard.md:218<br>Cleric .references/srd-5.2.1/Classes/Cleric.md:207<br>Sorcerer .references/srd-5.2.1/Classes/Sorcerer.md:301<br>Wizard .references/srd-5.2.1/Classes/Wizard.md:240 |
| `conjure_animals` | Conjure Animals | Druid | 1 | authored-record-present | installed | unsupported-profile | catalog-only/dead-for-now | accepted-no-battle-effect | Druid .references/srd-5.2.1/Classes/Druid.md:254 |
| `counterspell` | Counterspell | Sorcerer, Warlock, Wizard | 3 | authored-record-present | installed | supported-profile | catalog-installed-owner-evidence-present | accepted | Sorcerer .references/srd-5.2.1/Classes/Sorcerer.md:302<br>Warlock .references/srd-5.2.1/Classes/Warlock.md:380<br>Wizard .references/srd-5.2.1/Classes/Wizard.md:241 |
| `create_food_and_water` | Create Food and Water | Cleric | 1 | authored-record-present | not-installed | unsupported-profile | catalog-only/dead-for-now | accepted-no-battle-effect | Cleric .references/srd-5.2.1/Classes/Cleric.md:208 |
| `daylight` | Daylight | Cleric, Druid, Sorcerer | 3 | authored-record-present | not-installed | unsupported-profile | catalog-only/dead-for-now | accepted-no-battle-effect | Cleric .references/srd-5.2.1/Classes/Cleric.md:209<br>Druid .references/srd-5.2.1/Classes/Druid.md:255<br>Sorcerer .references/srd-5.2.1/Classes/Sorcerer.md:303 |
| `dispel_magic` | Dispel Magic | Bard, Cleric, Druid, Sorcerer, Warlock, Wizard | 6 | authored-record-present | installed | profile-subset-supported | catalog-installed-owner-evidence-present | accepted | Bard .references/srd-5.2.1/Classes/Bard.md:219<br>Cleric .references/srd-5.2.1/Classes/Cleric.md:210<br>Druid .references/srd-5.2.1/Classes/Druid.md:256<br>Sorcerer .references/srd-5.2.1/Classes/Sorcerer.md:304<br>Warlock .references/srd-5.2.1/Classes/Warlock.md:381<br>Wizard .references/srd-5.2.1/Classes/Wizard.md:242 |
| `fear` | Fear | Bard, Sorcerer, Warlock, Wizard | 4 | authored-record-present | not-installed | unsupported-profile | catalog-only/dead-for-now | accepted-no-battle-effect | Bard .references/srd-5.2.1/Classes/Bard.md:220<br>Sorcerer .references/srd-5.2.1/Classes/Sorcerer.md:305<br>Warlock .references/srd-5.2.1/Classes/Warlock.md:382<br>Wizard .references/srd-5.2.1/Classes/Wizard.md:243 |
| `fireball` | Fireball | Sorcerer, Wizard | 2 | authored-record-present | installed | supported-profile | catalog-installed-owner-evidence-present | accepted | Sorcerer .references/srd-5.2.1/Classes/Sorcerer.md:306<br>Wizard .references/srd-5.2.1/Classes/Wizard.md:244 |
| `fly` | Fly | Sorcerer, Warlock, Wizard | 3 | authored-record-present | installed | profile-subset-supported | catalog-installed-owner-evidence-present | accepted | Sorcerer .references/srd-5.2.1/Classes/Sorcerer.md:307<br>Warlock .references/srd-5.2.1/Classes/Warlock.md:383<br>Wizard .references/srd-5.2.1/Classes/Wizard.md:245 |
| `gaseous_form` | Gaseous Form | Sorcerer, Warlock, Wizard | 3 | authored-record-present | installed | unsupported-profile | catalog-installed-owner-evidence-required | battle-runtime-required | Sorcerer .references/srd-5.2.1/Classes/Sorcerer.md:308<br>Warlock .references/srd-5.2.1/Classes/Warlock.md:384<br>Wizard .references/srd-5.2.1/Classes/Wizard.md:246 |
| `glyph_of_warding` | Glyph of Warding | Bard, Cleric, Wizard | 3 | authored-record-present | installed | profile-subset-supported | catalog-installed-owner-evidence-present | accepted | Bard .references/srd-5.2.1/Classes/Bard.md:221<br>Cleric .references/srd-5.2.1/Classes/Cleric.md:211<br>Wizard .references/srd-5.2.1/Classes/Wizard.md:247 |
| `haste` | Haste | Sorcerer, Wizard | 2 | authored-record-present | installed | supported-profile | catalog-installed-owner-evidence-present | accepted | Sorcerer .references/srd-5.2.1/Classes/Sorcerer.md:309<br>Wizard .references/srd-5.2.1/Classes/Wizard.md:248 |
| `hypnotic_pattern` | Hypnotic Pattern | Bard, Sorcerer, Warlock, Wizard | 4 | authored-record-present | installed | supported-profile | catalog-installed-owner-evidence-present | accepted | Bard .references/srd-5.2.1/Classes/Bard.md:222<br>Sorcerer .references/srd-5.2.1/Classes/Sorcerer.md:310<br>Warlock .references/srd-5.2.1/Classes/Warlock.md:385<br>Wizard .references/srd-5.2.1/Classes/Wizard.md:249 |
| `lightning_bolt` | Lightning Bolt | Sorcerer, Wizard | 2 | authored-record-present | installed | supported-profile | catalog-installed-owner-evidence-present | accepted | Sorcerer .references/srd-5.2.1/Classes/Sorcerer.md:311<br>Wizard .references/srd-5.2.1/Classes/Wizard.md:250 |
| `magic_circle` | Magic Circle | Cleric, Warlock, Wizard | 3 | authored-record-present | installed | unsupported-profile | catalog-only/dead-for-now | accepted-no-battle-effect | Cleric .references/srd-5.2.1/Classes/Cleric.md:212<br>Warlock .references/srd-5.2.1/Classes/Warlock.md:386<br>Wizard .references/srd-5.2.1/Classes/Wizard.md:251 |
| `major_image` | Major Image | Bard, Sorcerer, Warlock, Wizard | 4 | authored-record-present | not-installed | unsupported-profile | catalog-only/dead-for-now | accepted-no-battle-effect | Bard .references/srd-5.2.1/Classes/Bard.md:223<br>Sorcerer .references/srd-5.2.1/Classes/Sorcerer.md:312<br>Warlock .references/srd-5.2.1/Classes/Warlock.md:387<br>Wizard .references/srd-5.2.1/Classes/Wizard.md:252 |
| `mass_healing_word` | Mass Healing Word | Bard, Cleric | 2 | authored-record-present | installed | supported-profile | catalog-installed-owner-evidence-present | accepted | Bard .references/srd-5.2.1/Classes/Bard.md:224<br>Cleric .references/srd-5.2.1/Classes/Cleric.md:213 |
| `meld_into_stone` | Meld into Stone | Cleric, Druid | 2 | authored-record-present | installed | unsupported-profile | catalog-only/dead-for-now | accepted-no-battle-effect | Cleric .references/srd-5.2.1/Classes/Cleric.md:214<br>Druid .references/srd-5.2.1/Classes/Druid.md:257 |
| `nondetection` | Nondetection | Bard, Wizard | 2 | authored-record-present | installed | unsupported-profile | catalog-only/dead-for-now | accepted-no-battle-effect | Bard .references/srd-5.2.1/Classes/Bard.md:225<br>Wizard .references/srd-5.2.1/Classes/Wizard.md:253 |
| `phantom_steed` | Phantom Steed | Wizard | 1 | authored-record-present | not-installed | unsupported-profile | catalog-authored-executable-follow-up | battle-runtime-required | Wizard .references/srd-5.2.1/Classes/Wizard.md:254 |
| `plant_growth` | Plant Growth | Bard, Druid | 2 | authored-record-present | installed | unsupported-profile | catalog-only/dead-for-now | accepted-no-battle-effect | Bard .references/srd-5.2.1/Classes/Bard.md:226<br>Druid .references/srd-5.2.1/Classes/Druid.md:258 |
| `protection_from_energy` | Protection from Energy | Cleric, Druid, Sorcerer, Wizard | 4 | authored-record-present | installed | supported-profile | catalog-installed-owner-evidence-present | accepted | Cleric .references/srd-5.2.1/Classes/Cleric.md:215<br>Druid .references/srd-5.2.1/Classes/Druid.md:259<br>Sorcerer .references/srd-5.2.1/Classes/Sorcerer.md:313<br>Wizard .references/srd-5.2.1/Classes/Wizard.md:255 |
| `remove_curse` | Remove Curse | Cleric, Warlock, Wizard | 3 | authored-record-present | installed | unsupported-profile | catalog-only/dead-for-now | accepted-no-battle-effect | Cleric .references/srd-5.2.1/Classes/Cleric.md:216<br>Warlock .references/srd-5.2.1/Classes/Warlock.md:388<br>Wizard .references/srd-5.2.1/Classes/Wizard.md:256 |
| `revivify` | Revivify | Cleric, Druid | 2 | authored-record-present | installed | unsupported-profile | catalog-only/dead-for-now | accepted-no-battle-effect | Cleric .references/srd-5.2.1/Classes/Cleric.md:217<br>Druid .references/srd-5.2.1/Classes/Druid.md:260 |
| `sending` | Sending | Bard, Cleric, Wizard | 3 | authored-record-present | installed | unsupported-profile | catalog-only/dead-for-now | accepted-no-battle-effect | Bard .references/srd-5.2.1/Classes/Bard.md:227<br>Cleric .references/srd-5.2.1/Classes/Cleric.md:218<br>Wizard .references/srd-5.2.1/Classes/Wizard.md:257 |
| `sleet_storm` | Sleet Storm | Druid, Sorcerer, Wizard | 3 | authored-record-present | installed | profile-subset-supported | catalog-installed-owner-evidence-present | accepted | Druid .references/srd-5.2.1/Classes/Druid.md:261<br>Sorcerer .references/srd-5.2.1/Classes/Sorcerer.md:314<br>Wizard .references/srd-5.2.1/Classes/Wizard.md:258 |
| `slow` | Slow | Bard, Sorcerer, Wizard | 3 | authored-record-present | installed | supported-profile | catalog-installed-owner-evidence-present | accepted | Bard .references/srd-5.2.1/Classes/Bard.md:228<br>Sorcerer .references/srd-5.2.1/Classes/Sorcerer.md:315<br>Wizard .references/srd-5.2.1/Classes/Wizard.md:259 |
| `speak_with_dead` | Speak with Dead | Bard, Cleric, Wizard | 3 | authored-record-present | installed | unsupported-profile | catalog-only/dead-for-now | accepted-no-battle-effect | Bard .references/srd-5.2.1/Classes/Bard.md:229<br>Cleric .references/srd-5.2.1/Classes/Cleric.md:219<br>Wizard .references/srd-5.2.1/Classes/Wizard.md:260 |
| `speak_with_plants` | Speak with Plants | Bard, Druid | 2 | authored-record-present | installed | unsupported-profile | catalog-only/dead-for-now | accepted-no-battle-effect | Bard .references/srd-5.2.1/Classes/Bard.md:230<br>Druid .references/srd-5.2.1/Classes/Druid.md:262 |
| `spirit_guardians` | Spirit Guardians | Cleric | 1 | authored-record-present | not-installed | unsupported-profile | catalog-only/dead-for-now | accepted-no-battle-effect | Cleric .references/srd-5.2.1/Classes/Cleric.md:220 |
| `stinking_cloud` | Stinking Cloud | Bard, Sorcerer, Wizard | 3 | authored-record-present | not-installed | unsupported-profile | catalog-only/dead-for-now | accepted-no-battle-effect | Bard .references/srd-5.2.1/Classes/Bard.md:231<br>Sorcerer .references/srd-5.2.1/Classes/Sorcerer.md:316<br>Wizard .references/srd-5.2.1/Classes/Wizard.md:261 |
| `tiny_hut` | Tiny Hut | Bard, Wizard | 2 | authored-record-present | installed | unsupported-profile | catalog-only/dead-for-now | accepted-no-battle-effect | Bard .references/srd-5.2.1/Classes/Bard.md:232<br>Wizard .references/srd-5.2.1/Classes/Wizard.md:262 |
| `tongues` | Tongues | Bard, Cleric, Sorcerer, Warlock, Wizard | 5 | authored-record-present | not-installed | unsupported-profile | catalog-only/dead-for-now | accepted-no-battle-effect | Bard .references/srd-5.2.1/Classes/Bard.md:233<br>Cleric .references/srd-5.2.1/Classes/Cleric.md:221<br>Sorcerer .references/srd-5.2.1/Classes/Sorcerer.md:317<br>Warlock .references/srd-5.2.1/Classes/Warlock.md:389<br>Wizard .references/srd-5.2.1/Classes/Wizard.md:263 |
| `vampiric_touch` | Vampiric Touch | Sorcerer, Warlock, Wizard | 3 | authored-record-present | not-installed | unsupported-profile | catalog-only/dead-for-now | accepted-no-battle-effect | Sorcerer .references/srd-5.2.1/Classes/Sorcerer.md:318<br>Warlock .references/srd-5.2.1/Classes/Warlock.md:390<br>Wizard .references/srd-5.2.1/Classes/Wizard.md:264 |
| `water_breathing` | Water Breathing | Druid, Sorcerer, Wizard | 3 | authored-record-present | not-installed | unsupported-profile | catalog-only/dead-for-now | accepted-no-battle-effect | Druid .references/srd-5.2.1/Classes/Druid.md:263<br>Sorcerer .references/srd-5.2.1/Classes/Sorcerer.md:319<br>Wizard .references/srd-5.2.1/Classes/Wizard.md:265 |
| `water_walk` | Water Walk | Cleric, Druid, Sorcerer | 3 | authored-record-present | installed | unsupported-profile | catalog-only/dead-for-now | accepted-no-battle-effect | Cleric .references/srd-5.2.1/Classes/Cleric.md:222<br>Druid .references/srd-5.2.1/Classes/Druid.md:264<br>Sorcerer .references/srd-5.2.1/Classes/Sorcerer.md:320 |
| `wind_wall` | Wind Wall | Druid | 1 | authored-record-present | not-installed | unsupported-profile | catalog-only/dead-for-now | accepted-no-battle-effect | Druid .references/srd-5.2.1/Classes/Druid.md:265 |

## Next Action Mapping

Each row maps to `plans/RALPH_L5_FULL_SRD_COMPLETION.md`.

| Bucket | Rows | Ralph action |
| --- | ---: | --- |
| Existing SDK seeds | 6 | Verify existing level-5 seed scenarios and keep their evidence discoverable. |
| Explicit class-table closure | 12 | Preserve the recorded SDK-scope table-only closure for the twelve class-table summaries. |
| Owner review for supported feature rows | 6 | Decide per Unit whether to add an SDK scenario or mark SDK closure. |
| Feature owner review | 1 | Resolve Fighter Tactical Shift owner boundary before SDK admission. |
| Future owner before SDK | 44 | Preserve current runtime-detached closure; do not add SDK scenarios until the durable owner exists. |
| Artifact reconciliation before preserving future-owner closure | 4 | Reconcile `gaseous_form` and `phantom_steed` mining-vs-SDK disposition text before treating their future-owner closures as durable. This overlaps the future-owner bucket and does not change the 138-row denominator. |
| Battle spell SDK scenarios | 35 | Add one SDK scenario group per supported spell identity/access slice. |
| Spell-effect owner review | 36 | Resolve owner boundary or precise closure for twelve spell identities before SDK admission. |

## Spell Description Anchors

Every spell task must pair its class-list access anchors with the matching spell
description anchor below.

| Unit | Spell description anchor |
| --- | --- |
| `animate_dead` | .references/srd-5.2.1/Spells/Descriptions-A-D.md:134 |
| `beacon_of_hope` | .references/srd-5.2.1/Spells/Descriptions-A-D.md:451 |
| `bestow_curse` | .references/srd-5.2.1/Spells/Descriptions-A-D.md:481 |
| `blink` | .references/srd-5.2.1/Spells/Descriptions-A-D.md:580 |
| `call_lightning` | .references/srd-5.2.1/Spells/Descriptions-A-D.md:625 |
| `clairvoyance` | .references/srd-5.2.1/Spells/Descriptions-A-D.md:756 |
| `conjure_animals` | .references/srd-5.2.1/Spells/Descriptions-A-D.md:948 |
| `counterspell` | .references/srd-5.2.1/Spells/Descriptions-A-D.md:1187 |
| `create_food_and_water` | .references/srd-5.2.1/Spells/Descriptions-A-D.md:1200 |
| `daylight` | .references/srd-5.2.1/Spells/Descriptions-A-D.md:1337 |
| `dispel_magic` | .references/srd-5.2.1/Spells/Descriptions-A-D.md:1543 |
| `fear` | .references/srd-5.2.1/Spells/Descriptions-E-L.md:268 |
| `fireball` | .references/srd-5.2.1/Spells/Descriptions-E-L.md:418 |
| `fly` | .references/srd-5.2.1/Spells/Descriptions-E-L.md:569 |
| `gaseous_form` | .references/srd-5.2.1/Spells/Descriptions-E-L.md:688 |
| `glyph_of_warding` | .references/srd-5.2.1/Spells/Descriptions-E-L.md:842 |
| `haste` | .references/srd-5.2.1/Spells/Descriptions-E-L.md:1091 |
| `hypnotic_pattern` | .references/srd-5.2.1/Spells/Descriptions-E-L.md:1292 |
| `lightning_bolt` | .references/srd-5.2.1/Spells/Descriptions-E-L.md:1592 |
| `magic_circle` | .references/srd-5.2.1/Spells/Descriptions-M-P.md:37 |
| `major_image` | .references/srd-5.2.1/Spells/Descriptions-M-P.md:153 |
| `mass_healing_word` | .references/srd-5.2.1/Spells/Descriptions-M-P.md:200 |
| `meld_into_stone` | .references/srd-5.2.1/Spells/Descriptions-M-P.md:247 |
| `nondetection` | .references/srd-5.2.1/Spells/Descriptions-M-P.md:481 |
| `phantom_steed` | .references/srd-5.2.1/Spells/Descriptions-M-P.md:558 |
| `plant_growth` | .references/srd-5.2.1/Spells/Descriptions-M-P.md:626 |
| `protection_from_energy` | .references/srd-5.2.1/Spells/Descriptions-M-P.md:894 |
| `remove_curse` | .references/srd-5.2.1/Spells/Descriptions-Q-R.md:107 |
| `revivify` | .references/srd-5.2.1/Spells/Descriptions-Q-R.md:186 |
| `sending` | .references/srd-5.2.1/Spells/Descriptions-S-Z.md:145 |
| `sleet_storm` | .references/srd-5.2.1/Spells/Descriptions-S-Z.md:352 |
| `slow` | .references/srd-5.2.1/Spells/Descriptions-S-Z.md:367 |
| `speak_with_dead` | .references/srd-5.2.1/Spells/Descriptions-S-Z.md:431 |
| `speak_with_plants` | .references/srd-5.2.1/Spells/Descriptions-S-Z.md:446 |
| `spirit_guardians` | .references/srd-5.2.1/Spells/Descriptions-S-Z.md:495 |
| `stinking_cloud` | .references/srd-5.2.1/Spells/Descriptions-S-Z.md:544 |
| `tiny_hut` | .references/srd-5.2.1/Spells/Descriptions-S-Z.md:905 |
| `tongues` | .references/srd-5.2.1/Spells/Descriptions-S-Z.md:924 |
| `vampiric_touch` | .references/srd-5.2.1/Spells/Descriptions-S-Z.md:1075 |
| `water_breathing` | .references/srd-5.2.1/Spells/Descriptions-S-Z.md:1234 |
| `water_walk` | .references/srd-5.2.1/Spells/Descriptions-S-Z.md:1247 |
| `wind_wall` | .references/srd-5.2.1/Spells/Descriptions-S-Z.md:1313 |

## Stale Artifact Hygiene

The four earlier L5 lane plans and generated finalization plan were removed
from the active tree after this audit. They are historical implementation lanes,
not the remaining launch queue. The active launch source after this audit is
`plans/RALPH_L5_FULL_SRD_COMPLETION.md`.

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
- Do not run MBT for this pre-work.
