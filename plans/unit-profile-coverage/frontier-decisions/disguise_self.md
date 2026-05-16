# Disguise Self Frontier Decision

## RAW Sources

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md:1490` defines
  Disguise Self as a level 1 Illusion spell for Bard, Sorcerer, and Wizard.
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md:1494` through
  `.references/srd-5.2.1/Spells/Descriptions-A-D.md:1497` define Action
  casting time, Self range, Verbal/Somatic components, and 1-hour duration.
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md:1499` defines the
  self-appearance illusion covering the caster and carried belongings, with
  size/weight appearance limits and same-basic-limb-arrangement constraint.
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md:1501` says the illusion
  fails physical inspection.
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md:1503` makes discovery a
  Study action plus Intelligence (Investigation) check against spell save DC.
- `.references/srd-5.2.1/Classes/Bard.md:170`,
  `.references/srd-5.2.1/Classes/Sorcerer.md:250`, and
  `.references/srd-5.2.1/Classes/Wizard.md:169` are the level-1 spell-list
  pressure rows.
- `UBIQUITOUS_LANGUAGE.md:158` confirms Study is an SRD 5.2.1 Action kind.
- `UBIQUITOUS_LANGUAGE.md:270` classifies Illusion as deception magic.

## Current Generated State

- Unit pressure id: `disguise_self`.
- `plans/unit-profile-coverage/srd-unit-inventory.json` has three level-1 spell
  pressure rows: Bard, Sorcerer, and Wizard.
- Each row has `surface.state: outside-surface-runtime-mechanics`,
  `authoredContent.state: missing-authored-record`,
  `catalogAdmission.state: not-installed`, no owner evidence, and
  `finalDisposition: catalog-only/dead-for-now`.
- Each row has `battleReadinessStatus: accepted-no-battle-effect`.
- `plans/unit-profile-coverage/unit-matrix.json` has no `disguise_self` Unit
  matrix row.
- `packages/surface/content/disguise_self.json` and
  `packages/surface/content/disguise_self.dhall` do not exist.
- `packages/surface/content/magic_item_hat_of_disguise.*` references the spell
  id in a granted-spell-access payload, but that is not an authored/admitted
  Disguise Self UnitRecord.
- `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md` lists `disguise_self`
  under No Matrix SRD Pressure, outside the strict executable denominator.
- The strict denominator rule is unique candidate Unit ids joined to executable
  Unit matrix rows, so `disguise_self` is outside the `93`-Unit strict
  denominator until a real authored/admitted UnitRecord exists.

## Owner Classification

- `packageOwner: null`
- `closureKind: catalog-only/no-runtime-profile`

No promoted runtime package currently owns self-disguise appearance state,
carried-belonging presentation, physical-inspection mismatch results, or the
social/exploration knowledge produced by a Study/Investigation success. If a
future UI or illusion subsystem owns persistent appearance state, that owner
must first admit a real Surface UnitRecord before any Unit claim, profile,
evidence, or runtime behavior is added.

## Decision

Keep `disguise_self` as no-matrix spell pressure with no runtime profile. The
spell's executable-looking rule text is adjudication over appearance,
inspection, and knowledge, not a battle-runtime reducer boundary. The existing
Strict Level 1 report treatment is correct: the spell-list pressure is product
readiness accepted/no-battle-effect pressure and remains outside strict support
accounting because no executable Unit matrix row exists.

If a future task authors and admits `disguise_self` as a UnitRecord, the likely
claim shape is `unsupported-profile` with a runtime-detached illusion/social
adjudication closure. That future task must perform the UnitRecord admission
first; this decision artifact does not create the Unit.

## Promotion Gate

Do not promote this pressure into a Unit claim or strict-support closure until
the base Unit gates are true:

- a SRD-provenance `disguise_self` Surface UnitRecord exists;
- the UnitRecord is admitted into the relevant catalog boundary;

After those gates, promotion still needs one of these owner decisions:

- an owning package explicitly accepts illusion appearance state or Study-result
  knowledge as runtime state; or
- the decider chooses to close an admitted Unit as runtime-detached table
  adjudication.

Without those gates, adding a Unit claim, support profile, evidence row, or
runtime behavior would treat a spell-list pressure row as a Unit that does not
exist.

## Follow-Up Tasks

None for the current plan. A future UI/illusion owner would be a new product
boundary, not a Task 7 prerequisite. If that boundary is created later, add a
separate implementation atom to author/admit `disguise_self` before adding any
Unit claim or runtime closure.

## Verification

- RAW checked against `.references/srd-5.2.1/Spells/Descriptions-A-D.md:1490`
  through `.references/srd-5.2.1/Spells/Descriptions-A-D.md:1503`.
- Spell-list pressure checked against Bard, Sorcerer, and Wizard class spell
  tables.
- Ubiquitous language checked for Action/Study and Illusion terminology.
- Generated state checked against `srd-unit-inventory.json`,
  `unit-matrix.json`, `LEVEL1_FULL_SUPPORT.md`, and Surface content paths.
