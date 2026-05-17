# L1J Installed Equipment Row Alignment

Task: L1J-INSTALLED-EQUIPMENT-ROW-ALIGNMENT.

## Inputs Read

- `plans/unit-profile-coverage/L1J_EQUIPMENT_DATA_PRECHECK.md`
- `plans/unit-profile-coverage/UNIT_REPORT.md`
- `plans/unit-profile-coverage/unit-matrix.json`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `packages/surface/content/armor_chain_mail.json`
- `packages/surface/content/equipment_shield.json`
- `packages/surface/content/weapon_club.json`
- `packages/surface/content/weapon_dagger.json`
- `packages/surface/content/weapon_flail.json`
- `packages/surface/content/weapon_greataxe.json`
- `packages/surface/content/weapon_longsword.json`
- `packages/surface/content/weapon_quarterstaff.json`
- `packages/surface/content/weapon_shortbow.json`
- `packages/surface/content/weapon_shortsword.json`
- `packages/surface/content/weapon_spear.json`
- `.references/srd-5.2.1/Equipment.md`
- `UBIQUITOUS_LANGUAGE.md`

## RAW And Domain Boundary

SRD 5.2.1 Equipment defines weapon table facts: Category, Melee or Ranged,
damage dice and damage type, Weapon Properties, Mastery Property, weight, and
cost. It also defines armor and Shield table facts: Armor Category, Armor
Class, Strength requirement when present, Stealth Disadvantage when present,
weight, cost, Shield training, and don/doff timing.

The Task 10 rows are already installed in the Unit catalog with unsupported
profile claims, but their authored Surface records have no standalone
executable mechanics payload:

| Unit | SRD row | Authored facts checked |
| --- | --- | --- |
| `armor_chain_mail` | Chain Mail | Heavy Armor, AC 16, Str 13, Stealth Disadvantage, 55 lb., 75 GP, 10 minutes to don and 5 minutes to doff |
| `equipment_shield` | Shield | +2 Armor Class benefit with Shield training, Utilize action to don or doff, 6 lb., 10 GP |
| `weapon_club` | Club | Simple, Melee, 1d4 Bludgeoning, Light, Slow, 2 lb., 1 SP |
| `weapon_dagger` | Dagger | Simple, Melee, 1d4 Piercing, Finesse, Light, Thrown (Range 20/60), Nick, 1 lb., 2 GP |
| `weapon_flail` | Flail | Martial, Melee, 1d8 Bludgeoning, no Weapon Properties, Sap, 2 lb., 10 GP |
| `weapon_greataxe` | Greataxe | Martial, Melee, 1d12 Slashing, Heavy, Two-Handed, Cleave, 7 lb., 30 GP |
| `weapon_longsword` | Longsword | Martial, Melee, 1d8 Slashing, Versatile (1d10), Sap, 3 lb., 15 GP |
| `weapon_quarterstaff` | Quarterstaff | Simple, Melee, 1d6 Bludgeoning, Versatile (1d8), Topple, 4 lb., 2 SP |
| `weapon_shortbow` | Shortbow | Simple, Ranged, 1d6 Piercing, Ammunition (Range 80/320; Arrow), Two-Handed, Vex, 2 lb., 25 GP |
| `weapon_shortsword` | Shortsword | Martial, Melee, 1d6 Piercing, Finesse, Light, Vex, 2 lb., 10 GP |
| `weapon_spear` | Spear | Simple, Melee, 1d6 Piercing, Thrown (Range 20/60), Versatile (1d8), Sap, 3 lb., 1 GP |

Project language checked Armor Class, Armor Category, Weapon Property, Mastery
Property, Weapon Mastery, Donning/Doffing, and Holding/Wielding. The authored
records use SRD provenance `srd-5.2.1` and sections `Equipment#Armor` or
`Equipment#Weapons`.

## Generated Coverage State

Before this task, `UNIT_REPORT.md` still grouped these 11 installed rows under
Unsupported Pressure Summary as `Future owner: unassigned` and
`Disposition: unsupported-profile`.

The report generator now derives a summary disposition for installed SRD
`armor`, `shield`, and `weapon` Units when all of these existing facts hold:

- `catalogAdmission.status`: `installed`
- `claim.tag`: `unsupported-profile`
- `executableMechanics`: `false`
- `collectionId`: `srd-5.2.1`

The generated Unsupported Pressure Summary reports those rows as:

- `Future owner`: `no promoted runtime lane`
- `Disposition`: `non-runtime-authored-data`

This keeps the per-Unit unsupported claim honest while preventing installed
authored equipment data from appearing as unassigned runtime pressure.

## Decision

Close Task 10 as installed authored equipment row alignment. No Unit claim,
profile, evidence manifest, Unit catalog admission, battle reducer behavior,
attack resolution, armor-equipping workflow, inventory simulation, ammunition
tracking, Shield wielding workflow, or Weapon Mastery runtime behavior is
needed for these rows.

The armor, Shield, and weapon table facts are source data. Runtime boundaries
that consume those facts remain separate: attacks consume weapon facts, Armor
Class projections consume armor and Shield facts, and selected Mastery Property
execution consumes mastery Units. The installed equipment records are not
standalone promoted Unit execution profiles.

## Reviewer Loop

Round 1 RAW/ubiquitous-language pass: the closure traces to SRD 5.2.1
Equipment weapon and armor table rows plus the relevant Weapon Property,
Mastery Property, Shield training, and don/doff text. The artifact uses project
terms for Armor Class, Armor Category, Weapon Property, Mastery Property,
Weapon Mastery, Donning/Doffing, and Holding/Wielding.

Round 1 architecture/domain pass: no runtime state is added, and no equipment
table fact is duplicated outside the existing Surface records. The report
classifier derives the installed non-runtime summary from existing Unit
metadata instead of adding repeated `futureProfileOwner` fields to every
installed equipment Unit claim.

Round 1 connascence pass: row ids, SRD table names, authored record paths, Unit
claim tags, Unit kinds, and generated report summaries must change together.
The new kind gate is a single local report helper named for the domain
invariant, so the installed armor/Shield/weapon classification is not repeated
throughout the checker.

Round 1 code-review pass: the script change is report-only and uses existing
structured fields. It does not widen schemas, alter Unit catalog admission, or
change runtime behavior.

Round 2 convergence pass: rechecked RAW traceability, project equipment
language, generated report alignment, and no-runtime-change scope after the
classifier and artifact were drafted. No additional findings remain.

## Verification

- RAW/source check: `.references/srd-5.2.1/Equipment.md:21`,
  `.references/srd-5.2.1/Equipment.md:121`, and
  `UBIQUITOUS_LANGUAGE.md:195`.
- Coverage verification: `pnpm unit-profile-coverage:check --write`, then
  `pnpm unit-profile-coverage:check`.
- Checker self-test: `pnpm unit-profile-coverage:check --self-test`.
- Whitespace verification: `git diff --check`.
- MBT: not needed; this task changes only the coverage report classifier and a
  decision artifact, with no promoted battle/runtime behavior change.
