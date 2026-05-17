# L1I Class Species Paladin Smite Style Closure

Task 6 closes the two loop-owned Paladin level-2 class-feature records as
explicit unsupported-profile dispositions. No runtime behavior, Surface schema,
Unit catalog admission, D-owned Weapon Mastery work, or selected Divine Smite
spell identity evidence changed.

## RAW Sources

- `.references/srd-5.2.1/Classes/Paladin.md:35-36`: the Paladin class table
  lists Fighting Style and Paladin's Smite at Paladin level 2.
- `.references/srd-5.2.1/Classes/Paladin.md:90-94`: Fighting Style grants a
  Fighting Style feat choice or the Blessed Warrior option, which learns two
  Cleric cantrips as Paladin spells and allows replacing one when gaining a
  Paladin level.
- `.references/srd-5.2.1/Classes/Paladin.md:96-99`: Paladin's Smite always
  prepares Divine Smite and grants one Long Rest no-slot cast.
- `.references/srd-5.2.1/Feats.md:89-114`: Fighting Style feat definitions own
  the executable battle effects of the selected Fighting Style feat.
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md:1601-1612`: Divine Smite
  is the Spell Definition for the after-hit Radiant damage procedure.
- `UBIQUITOUS_LANGUAGE.md:227-244`: Spell Definition, Spell Access, Spell
  Invocation, and Spell Effect are distinct ownership layers.
- `UBIQUITOUS_LANGUAGE.md:320-321` and
  `UBIQUITOUS_LANGUAGE.md:359-360`: Character Sheet facts produce
  creature-level combat statistics while class level and class-derived access
  remain Character Sheet-owned rather than Stat Block-owned.

## Surface Records Read

- `packages/surface/content/paladin_fighting_style.json`
- `packages/surface/content/paladin_paladins_smite.json`
- `packages/surface/content/divine_smite.json`

## Existing Owners Read

- `packages/surface/src/surface/unit-catalog.ts:24-39` and
  `packages/surface/src/surface/unit-catalog.ts:305-307`: the installed SRD
  Unit catalog includes `class_paladin`, `divine_smite`,
  `paladin_lay_on_hands`, `paladin_extra_attack`, and
  `paladin_weapon_mastery`, but not the two Task 6 records.
- `packages/character-creation-runtime/src/discovery.ts:1271-1283` and
  `packages/character-creation-runtime/src/discovery.ts:1412-1435`: generic
  passive `grant_feat` records can discover a Unit-backed feat-choice hole when
  the source feature is installed, but the current promoted owner does not
  install `paladin_fighting_style` or model its Blessed Warrior alternative.
- `packages/character-creation-runtime/src/support-gates.ts:274-281`: the
  character-creation support profile admits supported Fighting Style feat
  option ids for class-feature feat choices.
- `packages/battle-runtime/README.md:225-234`: the promoted class-feature
  free-cast boundary is currently Favored Enemy's Hunter's Mark support; other
  passive prepared-spell grants remain outside that boundary until their own
  support claims are updated.
- `packages/character-battle-runtime/src/index.test.ts:562-577` and
  `packages/character-battle-runtime/src/index.test.ts:810-819`: current
  character-to-battle projection proves Favored Enemy feature-prepared Spell
  Access and also proves unrelated passive prepared Spell Access is not
  promoted by that owner.
- `plans/unit-profile-coverage/unit-claims.jsonl`: `divine_smite` already has
  a supported `spell.invocation-after-hit-damage` claim; this task does not
  duplicate that selected spell identity work.

## Current Generated State

Before this task, both Paladin records were authored SRD Surface records with
passive mechanics payloads, but they were absent from the installed Unit
catalog and had no `unit-claims.jsonl` disposition. `UNIT_REPORT.md` therefore
listed both as `unsupported-widening-pressure`.

## Decision

Add `unsupported-profile` Unit claims for:

- `paladin_fighting_style`
- `paladin_paladins_smite`

`paladin_fighting_style` is a level-2 selection/grant container. Selected
Fighting Style feat Units own executable battle behavior. Blessed Warrior is a
different choice branch that grants two Cleric cantrips as Paladin Spell Access
and permits one replacement when gaining a Paladin level; that belongs to a
Character Sheet Spell Access and advancement owner, not to duplicate battle
state on this class-feature record.

`paladin_paladins_smite` is a level-2 Spell Access and free-cast grant for
Divine Smite. The Divine Smite Spell Definition already owns the supported
after-hit damage Spell Invocation profile. A future Paladin feature owner should
retain `paladin_paladins_smite` as the source Unit for always-prepared Spell
Access and a one-use Long Rest class-feature free-cast resource, reusing the
existing Divine Smite spell procedure instead of creating parallel spell
identity logic.

## Follow-Up Tasks

- Task 15 (`L1I-PALADIN-SMITE-FREE-CAST-PROFILE`) keeps future Paladin's Smite
  runtime support visible. It is blocked on the owner decision to expand
  Paladin battle support past level 1. If unblocked, it should widen the
  existing class-feature free-cast resource boundary beyond Favored Enemy to
  Divine Smite's after-hit spell procedure and prove the source Unit identity
  through character-to-battle projection.
- No Loop I battle follow-up is needed for `paladin_fighting_style`. Future
  character-creation or character-advancement work can install the class
  feature and model the Fighting Style feat versus Blessed Warrior choice
  without copying selected feat effects or selected cantrip Spell Access into
  this class-feature Unit.

## Review Notes

- RAW and ubiquitous-language pass: the closure keeps Fighting Style feat
  selection, Blessed Warrior Spell Access, Divine Smite Spell Definition, Spell
  Access, Spell Invocation, and Character Sheet ownership distinct.
- Architecture/domain pass: no workaround adapter or parallel spell state was
  added. The authored Surface facts remain source records, the selected
  Fighting Style feat Units own feat execution, and Divine Smite keeps its
  existing spell invocation profile.
- Connascence pass: the repeated Unit ids are localized to `unit-claims.jsonl`,
  this decision artifact, and generated coverage output. Paladin's Smite
  intentionally names the existing Divine Smite Unit because that identity is
  the source fact the future free-cast owner must retain.
- Code-review pass: no executable code, casts, assertions, parsers, schemas, or
  runtime reducers changed.
- Round 1: confirmed the claims do not install either Paladin feature or add
  runtime behavior, and do not touch D-owned Weapon Mastery or selected spell
  identity work.
- Round 2: rechecked the generated report and matrix output after `--write`;
  the only task-owned generated changes are the two new unsupported-profile
  claim projections.

## Verification

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `git diff --check`
- MBT not run: this changes coverage/decision metadata and generated reports,
  with no promoted battle runtime behavior.
