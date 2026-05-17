# L1I Class Species Monk Body And Mind Closure

Task 8 closes the loop-owned Monk Body and Mind class-feature record as an
explicit unsupported-profile disposition. No runtime behavior, Surface schema,
Unit catalog admission, Martial Arts scaling, or D-owned selected identity work
changed.

## RAW Sources

- `.references/srd-5.2.1/Classes/Monk.md:30-51`: the Monk Features table
  places Body and Mind at Monk level 20.
- `.references/srd-5.2.1/Classes/Monk.md:180-182`: Body and Mind increases
  Dexterity and Wisdom by 4, to a maximum of 25.
- `UBIQUITOUS_LANGUAGE.md:61-68`: Ability Score and Ability define the durable
  Dexterity and Wisdom facts changed by Body and Mind.
- `UBIQUITOUS_LANGUAGE.md:320-321` and
  `UBIQUITOUS_LANGUAGE.md:359-360`: Character Sheet facts produce
  creature-level combat statistics, while Class and level facts are
  Character Sheet-only rather than Stat Block facts.

## Surface Records Read

- `packages/surface/content/monk_body_and_mind.json`

## Existing Owners Read

- `packages/surface/src/surface/unit-catalog.ts:251-288`: the installed SRD
  Unit catalog includes `class_monk`, `monk_martial_arts`,
  `monk_unarmored_defense`, and `monk_deflect_attacks`, but not
  `monk_body_and_mind`.
- `packages/surface/content/monk_body_and_mind.json:1-29`: the authored Surface
  record already represents the SRD text as passive `modify_ability_score`
  grants for Dexterity and Wisdom, each with `delta: 4` and `maximum: 25`.
- `packages/character-creation-runtime/src/finalization.ts:697-710` and
  `packages/character-creation-runtime/src/finalization.ts:2256-2310`:
  Character Creation finalization owns current supported ability-score output
  and selected class-feature ability-score increases, but there is no
  level-20 Body and Mind advancement admission profile.

## Current Generated State

Before this task, `monk_body_and_mind` was an authored SRD Surface record with
an executable mechanics payload, but it was absent from the installed Unit
catalog and had no explicit `unit-claims.jsonl` disposition. `UNIT_REPORT.md`
therefore listed it as `unsupported-widening-pressure`.

## Decision

Add an `unsupported-profile` Unit claim for:

- `monk_body_and_mind`

Body and Mind is a level-20 durable Character Sheet ability-score projection:
Dexterity and Wisdom each increase by 4, capped at 25. It is not a standalone
promoted battle Unit profile. Battle runtime should consume the resulting
creature statistics after Character Sheet derivation instead of storing
parallel class-feature ability-score state.

This task deliberately does not touch `monk_martial_arts`. Martial Arts' level
1 supported subset and later-level die scaling remain owned by the existing
D-owned work.

## Follow-Up Tasks

- No Loop I follow-up is added for Body and Mind. A future all-level
  character-advancement plan can promote later-level permanent ability-score
  increases with caps above 20 if that owner is expanded.
- If that future owner is created, Body and Mind should move with other
  level-20 permanent ability-score features such as Barbarian Primal Champion
  through a Character Sheet advancement boundary, not through Monk-specific
  battle-runtime state.

## Review Notes

- RAW and ubiquitous-language pass: the closure uses Ability Score, Ability,
  Character Sheet, Stat Block, Class, and level terminology from the local
  corpus and traces the modeled fact to the Monk table and Body and Mind text.
- Architecture/domain pass: no lower-layer workaround or duplicate state was
  added. The authored Surface record remains the source fact, with an explicit
  unsupported Unit disposition and future owner recorded at the profile
  boundary.
- Connascence pass: the repeated `monk_body_and_mind` Unit id is localized to
  `unit-claims.jsonl`, this decision artifact, and generated coverage output.
  The claim intentionally mirrors the Barbarian Primal Champion closure shape
  because both are level-20 permanent Ability Score projections with a maximum
  of 25.
- Code-review pass: no executable code, casts, assertions, parsers, schemas, or
  runtime reducers changed.
- Round 1: confirmed the claim does not install Body and Mind and does not
  touch `monk_martial_arts`.
- Round 2: rechecked generated report and matrix output after `--write`; the
  task-owned generated change is the new Body and Mind unsupported-profile
  projection.

## Verification

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `git diff --check`
- MBT not run: this changes coverage/decision metadata and generated reports,
  with no promoted battle runtime behavior.
