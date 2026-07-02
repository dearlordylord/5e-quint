# L3 Spell Tongues Closure Survey

Date: 2026-05-21

## Decision

Task 54 preserves the Task 28 `tongues` closure as an accepted
runtime-detached `unsupported-profile` Unit claim and tightens its SDK owner
boundary to table-social communication. No battle-runtime behavior, QNT
behavior, catalog admission, companion/control model, autonomous behavior, or
authored-identity runtime dispatch is introduced.

The spell changes language intelligibility for a touched creature. Promoted
battle runtime must not infer conversation content, social outcomes, language
knowledge, hearing or sight availability, or commanded behavior from this Unit.

## Source Check

Local RAW checked:

- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md`: Tongues.
- `.references/srd-5.2.1/Classes/Bard.md`: Level 3 Bard spell list.
- `.references/srd-5.2.1/Classes/Cleric.md`: Level 3 Cleric spell list.
- `.references/srd-5.2.1/Classes/Sorcerer.md`: Level 3 Sorcerer spell list.
- `.references/srd-5.2.1/Classes/Warlock.md`: Level 3 Warlock spell list.
- `.references/srd-5.2.1/Classes/Wizard.md`: Level 3 Wizard spell list.

Ubiquitous-language terms checked:

- Spell Definition, Spell Access, Spell Invocation, Spell Effect, Duration,
  Creature, Deafened, Blinded, Vision and Light, and Senses.

Current artifacts checked:

- `packages/surface/content/tongues.json` records the SRD spell as a level-3
  Divination Spell Definition with Action casting, Touch range, V/M
  miniature-ziggurat components, 1-hour duration, one target hole, and
  `grant_language_understanding`.
- `packages/surface/content/tongues.dhall` matches that JSON source shape.
- `packages/surface/src/surface/schema-spell.ts` already has the
  `grant_language_understanding` atom with `spoken_or_signed` scope and
  outward intelligibility to language-knowers.
- `plans/unit-profile-coverage/L1K_DETECTION_COMMUNICATION_SPELL_CANDIDATE_INTAKE.md`
  already classified Tongues as runtime-detached language and communication
  need.
- Task 54 rechecks the same local RAW anchors for the level-5 SDK inventory
  rows and records the owner boundary as table-social communication closure
  rather than an unresolved spell-effect owner review.
- `plans/unit-profile-coverage/unit-matrix.json` and
  `plans/unit-profile-coverage/srd-unit-inventory.json` carry the
  unsupported-profile closure for the Bard, Cleric, Sorcerer, Warlock, and
  Wizard spell-list rows.

## Closure

RAW requires:

- a touched creature target;
- understanding any spoken or signed language the target hears or sees;
- outward intelligibility when the target speaks or signs;
- an audience gate requiring a creature that knows at least one language;
- hearing the speech or seeing the signing.

Those facts are table/social communication facts, not promoted battle Unit
profiles. Hearing, sight, signing, speech, known-language membership,
language comprehension, and conversation outcomes require table witnesses or a
future communication owner. The existing battle runtime has no promoted owner
for active language-comprehension projection, and adding one here would create
conversation or social-result semantics outside the battle reducer boundary.

The checker-visible owner is therefore:

- `unsupported-profile`
- `battleReadinessClosure.kind`: `social-knowledge-effect`
- `battleReadinessClosure.owner`: runtime-detached language/communication
  owner

## Reviewer Loop

Round 1 RAW and ubiquitous-language pass:

- Confirmed RAW grants language understanding and outward intelligibility, not
  damage, conditions, movement, target control, companion behavior, or action
  automation.
- Confirmed hearing and sight gates are existing perception/table facts rather
  than new spell-owned reducer state.
- Kept the at-least-one-language audience gate with the communication owner
  instead of duplicating language table state in battle runtime.

Round 2 architecture and connascence pass:

- Added one Unit claim rather than duplicating catalog state, profile evidence,
  language tables, or runtime support gates.
- The closure is keyed by the Unit claim boundary only; runtime code does not
  dispatch on authored identity.
- Strong remaining coupling is local to the claim text and this report: if
  Tongues later receives a communication owner, both documents and the
  generated coverage artifacts must be updated together.

## Verification For This Closure

- `pnpm unit-profile-coverage:check -- --write`
- `pnpm unit-profile-coverage:check`
- `pnpm sdk-raw-integration-inventory:check -- --write`
- `pnpm sdk-raw-integration-inventory:check`
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

MBT is not required because this task changes only profile/planning artifacts
and does not modify QNT, runtime behavior, catalog admission, or supported
profile evidence.
