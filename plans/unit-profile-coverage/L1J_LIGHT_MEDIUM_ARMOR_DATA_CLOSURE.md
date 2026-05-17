# L1J Light Medium Armor Data Closure

Task: L1J-LIGHT-MEDIUM-ARMOR-DATA.

## Inputs Read

- `plans/unit-profile-coverage/L1J_EQUIPMENT_DATA_PRECHECK.md`
- `plans/unit-profile-coverage/UNIT_REPORT.md`
- `plans/unit-profile-coverage/unit-matrix.json`
- `packages/surface/content/armor_breastplate.json`
- `packages/surface/content/armor_chain_shirt.json`
- `packages/surface/content/armor_half_plate_armor.json`
- `packages/surface/content/armor_hide_armor.json`
- `packages/surface/content/armor_leather.json`
- `packages/surface/content/armor_padded_armor.json`
- `packages/surface/content/armor_scale_mail.json`
- `packages/surface/content/armor_studded_leather_armor.json`
- `.references/srd-5.2.1/Equipment.md`
- `UBIQUITOUS_LANGUAGE.md`

## RAW And Domain Boundary

SRD 5.2.1 Equipment defines armor table facts: Armor Category, Armor
Class formula, Strength requirement when present, Stealth Disadvantage when
present, weight, cost, and don/doff timing. The Task 2 rows are the light and
medium armor table entries:

| Unit | SRD row | Authored facts checked |
| --- | --- | --- |
| `armor_padded_armor` | Padded Armor | Light Armor, 11 + Dex modifier, Stealth Disadvantage, 8 lb., 5 GP, 1 minute to don or doff |
| `armor_leather` | Leather Armor | Light Armor, 11 + Dex modifier, 10 lb., 10 GP, 1 minute to don or doff |
| `armor_studded_leather_armor` | Studded Leather Armor | Light Armor, 12 + Dex modifier, 13 lb., 45 GP, 1 minute to don or doff |
| `armor_hide_armor` | Hide Armor | Medium Armor, 12 + Dex modifier (max 2), 12 lb., 10 GP, 5 minutes to don and 1 minute to doff |
| `armor_chain_shirt` | Chain Shirt | Medium Armor, 13 + Dex modifier (max 2), 20 lb., 50 GP, 5 minutes to don and 1 minute to doff |
| `armor_scale_mail` | Scale Mail | Medium Armor, 14 + Dex modifier (max 2), Stealth Disadvantage, 45 lb., 50 GP, 5 minutes to don and 1 minute to doff |
| `armor_breastplate` | Breastplate | Medium Armor, 14 + Dex modifier (max 2), 20 lb., 400 GP, 5 minutes to don and 1 minute to doff |
| `armor_half_plate_armor` | Half Plate Armor | Medium Armor, 15 + Dex modifier (max 2), Stealth Disadvantage, 40 lb., 750 GP, 5 minutes to don and 1 minute to doff |

Project language checked Armor Class, Armor Category, and Donning/Doffing. The
authored records use SRD provenance `srd-5.2.1` and section `Equipment#Armor`.

## Generated Coverage State

`unit-matrix.json` already records all eight rows with:

- `catalogAdmission.status`: `not-in-unit-catalog`
- `catalogAdmission.disposition.category`: `non-runtime-authored-data`
- `catalogAdmission.disposition.planningLane`: `no promoted runtime lane`
- `kind`: `armor`
- `executableMechanics`: `false`
- `profiles`: `[]`
- `evidence`: `[]`

The generated report also lists the rows under Authored Catalog Admission
Triage as `non-runtime-authored-data`, with no promoted runtime lane.

## Decision

Close Task 2 as authored armor table data. No classifier change, Unit claim,
profile, evidence manifest, Unit catalog admission, battle reducer behavior, or
character runtime behavior is needed for these rows.

The armor table facts are source data consumed by existing or future character
equipment projections. They are not standalone promoted Unit execution
profiles, and admitting them to the Unit catalog in this task would create
unowned runtime pressure rather than close the authored-data accounting gap.

## Reviewer Loop

RAW/ubiquitous-language pass: the closure traces to SRD 5.2.1 Equipment armor
table rows and uses project terms for Armor Class, Armor Category, and
Donning/Doffing.

Architecture/domain pass: no runtime state is added, and no armor table fact is
duplicated outside the existing Surface records. The closure points to the
authored SRD-provenance records and generated matrix disposition.

Connascence pass: row ids, SRD table names, authored record paths, and generated
matrix entries must change together. That coupling is limited to this closure
artifact plus the existing Surface content and generated coverage artifacts; no
parallel runtime list was introduced.

Code-review pass: no code, schema, Unit catalog, Unit claim, Unit evidence, or
runtime behavior changes are required.

## Verification

- RAW/source check: `.references/srd-5.2.1/Equipment.md:170-212` and
  `UBIQUITOUS_LANGUAGE.md:170-213`.
- Coverage verification: `pnpm unit-profile-coverage:check --write`, then
  `pnpm unit-profile-coverage:check`.
- Whitespace verification: `git diff --check`.
- MBT: not needed; this task changes only a decision artifact and does not
  change promoted battle/runtime behavior.
