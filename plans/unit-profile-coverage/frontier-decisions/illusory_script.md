# Illusory Script Frontier Decision

## RAW Sources

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md:1354` defines
  Illusory Script as a level 1 Illusion spell for Bard, Warlock, and Wizard.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md:1358` through
  `.references/srd-5.2.1/Spells/Descriptions-E-L.md:1361` define 1 minute or
  Ritual casting time, Touch range, Somatic/Material components, consumed
  10+ GP ink, and 10-day duration.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md:1363` defines the writing
  illusion on parchment, paper, or another suitable material; designated
  readers; apparent normal writing in the caster's hand; intended meaning; the
  unintelligible unknown or magical script seen by others; and the alternate
  altered meaning, handwriting, and known-language mode.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md:1365` says the original
  script and illusion both disappear if the spell is dispelled.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md:1367` says a creature that
  has Truesight can read the hidden message.
- `.references/srd-5.2.1/Classes/Bard.md:178`,
  `.references/srd-5.2.1/Classes/Warlock.md:356`, and
  `.references/srd-5.2.1/Classes/Wizard.md:180` are the level-1 spell-list
  pressure rows.
- `.references/srd-5.2.1/Rules-Glossary.md:572` through
  `.references/srd-5.2.1/Rules-Glossary.md:576` define Illusions as effects
  whose source defines what the illusion does and what senses or mental
  faculties it deceives.
- `.references/srd-5.2.1/Rules-Glossary.md:1052` through
  `.references/srd-5.2.1/Rules-Glossary.md:1060` define Truesight's interaction
  with visual illusions.
- `UBIQUITOUS_LANGUAGE.md:234` through `UBIQUITOUS_LANGUAGE.md:244`
  distinguish Spell Definition, Spell Access, Spell Invocation, and Spell
  Effect ownership.
- `UBIQUITOUS_LANGUAGE.md:270` defines Illusion as deception magic.
- `UBIQUITOUS_LANGUAGE.md:288` defines Truesight as a special sense that can
  detect visual illusions.

## Current Generated State

- Unit pressure id: `illusory_script`.
- `plans/unit-profile-coverage/srd-unit-inventory.json` has three level-1 spell
  pressure rows: Bard, Warlock, and Wizard.
- Each row has `surface.state: outside-surface-runtime-mechanics`,
  `authoredContent.state: missing-authored-record`,
  `catalogAdmission.state: not-installed`, no owner evidence, and
  `finalDisposition: catalog-only/dead-for-now`.
- Each row has `battleReadinessStatus: accepted-no-battle-effect`.
- `plans/unit-profile-coverage/unit-matrix.json` has no `illusory_script` Unit
  matrix row.
- `packages/surface/content/illusory_script.json` and
  `packages/surface/content/illusory_script.dhall` do not exist.
- `plans/unit-profile-coverage/unit-claims.jsonl`,
  `plans/unit-profile-coverage/profiles.jsonl`,
  `plans/unit-profile-coverage/unit-evidence.jsonl`, and
  `plans/unit-profile-coverage/task-claims.jsonl` have no `illusory_script`
  rows.
- `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md` lists
  `illusory_script` under No Matrix SRD Pressure, outside the strict executable
  denominator.

## Owner Classification

- `packageOwner: null`
- `closureKind: catalog-only/no-runtime-profile`

No promoted runtime package currently owns authored document state, hidden
message text, designated-reader access, altered text meaning, handwriting or
language presentation, document cleanup when a spell is dispelled, or
Truesight-based reading of written illusions. Existing battle-runtime vision
work owns executable combat-facing senses and conditions where a UnitRecord
exists; it does not own durable document contents, social/exploration reading
permissions, or table-facing interpretation of written text.

## Effect Classification

| RAW effect | Classification | Rationale |
| --- | --- | --- |
| Writing illusion on parchment, paper, or suitable material | Runtime-detached document/illusion adjudication | The spell creates a persistent written-message presentation on a document-like object. No current runtime owner stores document contents or presentation variants. |
| Designated readers see normal writing and intended meaning | Runtime-detached access/knowledge adjudication | Reader designation and message comprehension are table-facing access and knowledge facts, not battle-owned Spell Effect state. |
| Non-designated readers see unintelligible unknown or magical script | Runtime-detached presentation | The altered appearance is document text presentation with no attack, save, damage, condition, movement, targeting, light, or obscurement consequence. |
| Alternate altered meaning, handwriting, and language | Runtime-detached document/illusion adjudication | The alternate mode changes presentation and meaning of written text, including a known-language constraint, which belongs with a future document or language/presentation owner if one is created. |
| Dispel cleanup removes original script and illusion | Future document owner pressure only if such an owner is created | Cleanup changes persistent document contents. Without a document subsystem, there is no runtime state to update. |
| Truesight reads the hidden message | Runtime-detached sense/reading adjudication | Truesight has a rules interaction with visual illusions, but reading hidden document text is a document/illusion adjudication result rather than a promoted battle-runtime reducer boundary. |

## Decision

Keep `illusory_script` as no-matrix spell pressure with no runtime profile. Its
SRD mechanics are persistent written illusion, reader-specific presentation,
hidden-message comprehension, and dispel-time document cleanup. Those facts are
document, language, and exploration adjudication outside the promoted runtime
owner boundary.

The existing Strict Level 1 report treatment is correct: the Bard, Warlock, and
Wizard spell-list pressures are product readiness accepted/no-battle-effect
pressure and remain outside strict support accounting because no executable Unit
matrix row exists.

## Promotion Gate

Do not promote this pressure into a Unit claim or strict-support closure until
the base Unit gates are true:

- a SRD-provenance `illusory_script` Surface UnitRecord exists;
- the UnitRecord is admitted into the relevant catalog boundary;

After those gates, promotion still needs one of these owner decisions:

- a document/illusion owner explicitly accepts hidden message contents,
  designated-reader access, altered writing presentation, dispel cleanup, and
  Truesight reading as durable runtime state; or
- the decider chooses to close an admitted Unit as runtime-detached document and
  illusion adjudication.

Without those gates, adding a Unit claim, support profile, evidence row, or
runtime behavior would treat a spell-list pressure row as a Unit that does not
exist.

## Follow-Up Tasks

None for the current plan. A future document/illusion subsystem would be a new
product boundary, not a Task 10 prerequisite. If that boundary is created later,
add a separate implementation atom to author/admit `illusory_script` before
adding any Unit claim, runtime closure, or runtime behavior.

## Verification

- RAW checked against `.references/srd-5.2.1/Spells/Descriptions-E-L.md:1354`
  through `.references/srd-5.2.1/Spells/Descriptions-E-L.md:1367`.
- Spell-list pressure checked against `.references/srd-5.2.1/Classes/Bard.md:178`,
  `.references/srd-5.2.1/Classes/Warlock.md:356`, and
  `.references/srd-5.2.1/Classes/Wizard.md:180`.
- Rules glossary checked for Illusions and Truesight.
- Ubiquitous language checked for Spell Definition, Spell Access, Spell
  Invocation, Spell Effect, Illusion, and Truesight terminology.
- Generated state checked against `srd-unit-inventory.json`,
  `unit-matrix.json`, `LEVEL1_FULL_SUPPORT.md`, Surface content paths, and
  existing claim/profile/evidence row files.
