# Validation Report

## Work Loop Status

- Current manifest source commit SHA:
  `8460cff717f7b1e66c8a1f96a9db4a206366e2bc`
- Scope file: `tasks/LEVEL_1_2_SCOPE.md`
- Work Loop instructions: `tasks/WORK_LOOP.md`
- Last completed current-manifest queued driver:
  `cleanroom-input/qnt/character-creation-runtime/character-creation-runtime.mbt.qnt`
- Next queued driver:
  `cleanroom-input/qnt/character-creation-runtime/character-creation-class-feature-projections.mbt.qnt`

Completion rule: a queued driver is complete only when this report has an entry
that names the exact `.mbt.qnt` driver, records the current manifest SHA, lists
the allowed inputs used, records MBT/QNT coverage, and records verification
results. Entries with older manifest SHAs are historical unless they include a
current-manifest revalidation note.

## T001: Manual First Vertical

- Manifest source commit SHA: `8460cff717f7b1e66c8a1f96a9db4a206366e2bc`
- Driver: `cleanroom-input/qnt/character-creation-runtime/character-creation-runtime.mbt.qnt`
- Historical note: this entry originally recorded manifest SHA
  `db121de75f5765808e5553ff371c18956f9ad903`. It was revalidated against the
  current manifest SHA above on `2026-06-13T19:01:09-07:00`; the Rust
  implementation and checked-in MBT simulation still pass.
- Allowed inputs used:
  - `cleanroom-input/MANIFEST.md`
  - `cleanroom-input/domain/UBIQUITOUS_LANGUAGE.md`
  - `cleanroom-input/domain/CLEANROOM_ASSUMPTIONS.md`
  - `cleanroom-input/qnt/character-creation-runtime/character-creation-runtime-slice.qnt`
  - `cleanroom-input/qnt/character-creation-runtime/character-creation-runtime-slice-tests.qnt`
  - `cleanroom-input/qnt/character-creation-runtime/character-creation-runtime.mbt.qnt`
  - `cleanroom-input/qnt/character-sheet-runtime/character-sheet-hit-point-maximum.mbt.qnt`
  - `cleanroom-input/qnt/character-sheet-runtime/character-sheet-armor-class-base-selected-identity.mbt.qnt`
  - `cleanroom-input/qnt/rule-core/hit-point-maximum.qnt`
  - `cleanroom-input/qnt/rule-core/armor-class-base.qnt`
  - `cleanroom-input/raw/srd-5.2.1/Character-Creation.md`
  - `cleanroom-input/raw/srd-5.2.1/Character-Origins.md`
  - `cleanroom-input/raw/srd-5.2.1/Classes/Fighter.md`
  - `cleanroom-input/raw/srd-5.2.1/Equipment.md`
  - `cleanroom-input/raw/srd-5.2.1/Feats.md`
  - `cleanroom-input/raw/srd-5.2.1/Playing-the-Game.md`
  - `cleanroom-input/raw/srd-5.2.1/Rules-Glossary.md`

Behavior implemented:

- Added the first Rust vertical in `engine/src/lib.rs` for the Orc Soldier Fighter manifest path described by `character-creation-runtime-slice.qnt`.
- Modeled the QNT draft protocol: open creation holes, revisioned batch fills, accepted/rejected batch results, finalization status, fill issue codes, and atomic rejection.
- Added a retained-selection `CharacterCreation` wrapper around the QNT-shaped `Draft`; the draft still models protocol booleans/revision, while sheet projection checks the actual selected manifest choices and ability-score assignment. The draft is private to keep retained selections coherent, and callers inspect it through `draft()`.
- Projected completed manifest choices into level-1 sheet facts: final ability scores, proficiency bonus, Hit Point Maximum, Hit Die, Armor Class, Initiative, Passive Perception, Speed, size, languages, skill/tool/saving throw proficiencies, origin feat, class/species features, Weapon Mastery choices, Second Wind uses, and Adrenaline Rush uses.
- Factored Hit Point Maximum and Armor Class projection through small Rust helpers aligned with `rule-core/hit-point-maximum.qnt` and `rule-core/armor-class-base.qnt`; the T001 Armor Class total composes Chain Mail base AC, trained Shield bonus, and the Defense fighting-style bonus.
- Added focused Rust tests with source citations for QNT draft behavior, RAW sheet projection, atomic rejection behavior, retained-choice projection, non-manifest purchase rejection, and projection across a different valid batch/revision path.
- Added a `quint_connect::Driver` for `character-creation-runtime.mbt.qnt`; action names are mapped through `switch!`, and comparable implementation state is exposed through `State::from_driver`.

Conventions established:

- Keep the first vertical in `engine/src/lib.rs` until module boundaries become necessary; use QNT names for protocol types (`Draft`, `Fill`, `HoleId`, `FinalizationStatus`) and domain names for projected sheet facts (`CharacterSheet`, `Hit Point Maximum`, `Armor Class`, `Proficiency Bonus`).
- Keep protocol revision separate from sheet eligibility: projection is from retained selected choices, not draft equality or revision count.
- Projection APIs return structured `ProjectionIssue` errors rather than `Option` so callers can distinguish incomplete drafts, invalid drafts, missing selections, unsupported selected ability scores, and unsupported selected choices.
- Avoid production-facing abbreviations that conflict with the Ubiquitous Language; background ability-score options use `BackgroundAbilityScoreIncrease` rather than `Asi`. QNT-only names may still appear in conformance modules when mirroring corpus names.
- Hand-written tests cite corpus files and headings in comments immediately above assertions.
- MBT-only serde mirror types are confined to a `#[cfg(test)]` module so production types are not shaped by trace serialization.
- `quint-connect` tests use deterministic seeds in attributes; record the seed in this report.
- QNT unit variants in ITF traces are decoded as `{ tag, value }` records in the MBT mirror types.

MBT/QNT coverage:

- Exercised `cleanroom-input/qnt/character-creation-runtime/character-creation-runtime.mbt.qnt` with `#[quint_run]`.
- Driver actions covered: `init`, `doFillInitialManifest`, `doFillInitialChoicesOnly`, `doFillAbilityScoresOnly`, `doFillManifestChoices`, `doFillManifestPurchase`, `doFillManifestLoadout`, `doRejectStaleInitialManifest`, `doRejectUnsupportedLanguage`, `doRejectDuplicateLanguage`, `doRejectTooFewLanguages`, `doRejectTooManyLanguages`, `doRejectWrongKindPrimaryClass`, `doRejectUnknownLoadoutArmor`, and `doRejectUnsupportedClassEquipment`.
- Reproduction seed: `QUINT_SEED=1`; the checked-in test also sets `seed = "1"`, `max_samples = 8`, and `max_steps = 5`.
- Consulted `character-creation-runtime-slice-tests.qnt` for supplemental Rust test cases. It is not listed as exercised conformance coverage: attempting direct `#[quint_test]` hooks with `quint-connect 0.1.2` failed before replay with `Missing mbt::actionTaken variable in the trace`, because these are pure Quint `run` assertions rather than MBT action traces.
- Inspected `character-sheet-hit-point-maximum.mbt.qnt` and `character-sheet-armor-class-base-selected-identity.mbt.qnt` for the sheet facts projected by this vertical. Attempted `quint-connect` drivers were feasible on the Rust side, but both copied MBT files currently import `../shared-algebras/proofs/rule-core/...`, a path not present in `cleanroom-input/`; `cargo test` failed during Quint trace generation with non-zero Quint exit before replay. The checked-in suite therefore does not exercise those two MBT files until the corpus supplies runnable imports or refreshed MBT files.

Remaining gaps:

- This vertical intentionally supports only the Orc Soldier Fighter manifest path and the choice protocol facts modeled by `character-creation-runtime-slice.qnt`.
- `character-creation-runtime-slice-tests.qnt` pure assertion runs are not exercised through `quint-connect` in the checked-in suite for the tool-compatibility reason above; equivalent focused Rust tests cover the cited behaviors, and the MBT runtime slice remains exercised through `quint-connect`.
- Character-sheet Hit Point Maximum and Armor Class MBT slices are not exercised through `quint-connect` because their copied import paths reference absent `cleanroom-input/qnt/shared-algebras/proofs/rule-core/**` files. Focused Rust tests cover the T001 projected sheet facts, and the Rust helpers follow the corresponding copied `cleanroom-input/qnt/rule-core/**` definitions.
- No broader character classes, species, alternate equipment packages, arbitrary purchases, spellcasting, or battle timing behavior is implemented in this task.

Verification results:

- `cargo fmt --check` passed.
- `cargo test` passed: 7 unit tests, including the `quint-connect` MBT simulation, and 0 doc tests.
- `cargo clippy --all-targets -- -D warnings` passed.
