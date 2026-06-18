# Ralph LT4 Lane B: Species Admission Closure

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "LT4-B01-GNOME-ADMISSION-OWNER-RESEARCH",
      "status": "done",
      "title": "Research the Gnome admission owner boundary"
    },
    {
      "number": 2,
      "id": "LT4-B02-GNOMISH-LINEAGE-CHOICE-OWNER",
      "status": "done",
      "title": "Implement Gnomish Lineage choice ownership"
    },
    {
      "number": 3,
      "id": "LT4-B03-GNOME-LINEAGE-TRAIT-PROJECTION",
      "status": "ready-for-research",
      "title": "Retain Forest and Rock Gnome lineage facts without duplicate state"
    },
    {
      "number": 4,
      "id": "LT4-B04-GNOME-SPECIES-ADMISSION-EVIDENCE",
      "status": "ready-for-research",
      "title": "Admit Gnome as a selectable SRD species and close coverage"
    }
  ]
}
-->

## Lane Scope

This lane closes the generated level <4 blocker for `species_gnome`.

The Gnome Surface records are installed, but Gnome is not yet in
`SRD_CHARACTER_ADMISSION_SPECIES_UNIT_IDS`. That is acceptable only as a visible
blocker while Gnomish Lineage lacks a typed character-creation owner. Full
level <4 parity requires selectable Gnome with its lineage choice represented
explicitly.

## Source Artifacts

- `plans/unit-profile-coverage/LEVEL_LT4_CHOICE_CLOSURE.md`
- `plans/unit-profile-coverage/level-lt4-choice-closure.json`
- `packages/surface/content/species_gnome.json`
- `packages/surface/content/species_gnome_darkvision.json`
- `packages/surface/content/species_gnome_gnomish_cunning.json`
- `packages/surface/content/species_gnome_gnomish_lineage.json`
- `packages/surface/src/surface/unit-catalog.test.ts`
- `packages/character-creation-runtime/src/`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `.references/srd-5.2.1/Character-Origins.md`
- `UBIQUITOUS_LANGUAGE.md`

## Lane Rules

- Run the Ralph task-base check before research or implementation.
- Do not admit Gnome as a broad unsupported blob. Gnome admission depends on a
  typed Gnomish Lineage owner.
- Keep species identity, species trait identity, lineage selection, spell access,
  and clockwork-device table behavior as separate facts.
- If a lineage fact is outside active runtime, close it with a typed
  battle-readiness boundary rather than storing duplicate character state.

## Task DAG

| Task | Depends on | Dependency reason |
| --- | --- | --- |
| LT4-B01-GNOME-ADMISSION-OWNER-RESEARCH | LT4-CHOICE-CLOSURE-PREWORK | Establish exact owner boundary before implementation. |
| LT4-B02-GNOMISH-LINEAGE-CHOICE-OWNER | LT4-B01-GNOME-ADMISSION-OWNER-RESEARCH | The lineage choice owner is required before selectable Gnome. |
| LT4-B03-GNOME-LINEAGE-TRAIT-PROJECTION | LT4-B02-GNOMISH-LINEAGE-CHOICE-OWNER | Forest/Rock retained facts depend on the selected lineage. |
| LT4-B04-GNOME-SPECIES-ADMISSION-EVIDENCE | LT4-B02-GNOMISH-LINEAGE-CHOICE-OWNER, LT4-B03-GNOME-LINEAGE-TRAIT-PROJECTION | Admit Gnome and regenerate closure only after lineage facts are owned. |

## Shared Verification

- RAW and ubiquitous-language check against
  `.references/srd-5.2.1/Character-Origins.md:177-193` and
  `UBIQUITOUS_LANGUAGE.md`.
- Reviewer-loop convergence: RAW traceability, ubiquitous-language/domain,
  architecture/connascence, and code-review passes until no reasonable findings
  remain.
- `pnpm --filter @dnd/surface exec vitest run src/surface/unit-catalog.test.ts`
- `pnpm --filter @dnd/surface typecheck`
- `pnpm --filter @dnd/character-creation-runtime exec vitest run src/index.test.ts`
- `pnpm --filter @dnd/character-creation-runtime typecheck`
- `pnpm level-lt4-choice-closure:check -- --write`
- `pnpm level-lt4-choice-closure:check`
- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `git diff --check`

### Task 1 - LT4-B01-GNOME-ADMISSION-OWNER-RESEARCH

Status: `done`

Depends on:

- LT4-CHOICE-CLOSURE-PREWORK

Unit:

- `species_gnome`

SRD anchor:

- `.references/srd-5.2.1/Character-Origins.md:177-193`

Current state:

- Gnome and its trait Units are cataloged.
- Gnome is not character-creation selectable.
- Unit claim closes the species container as needing a future Gnomish Lineage
  owner.

Output:

- Document the exact Gnome admission owner boundary in code comments only where
  needed and in generated coverage claims.
- Identify which facts are character-creation facts, which are spell-access
  facts, and which are runtime/table closures.

Acceptance:

- Follow-up tasks have concrete source and owner boundaries.
- No implementation admits Gnome before lineage choice facts are represented.

Verification:

- Shared lane verification, except implementation-specific tests may be skipped
  if this task only updates claims/planning evidence.

### Task 2 - LT4-B02-GNOMISH-LINEAGE-CHOICE-OWNER

Status: `done`

Depends on:

- LT4-B01-GNOME-ADMISSION-OWNER-RESEARCH

Unit:

- `species_gnome_gnomish_lineage`

SRD anchor:

- `.references/srd-5.2.1/Character-Origins.md:189-193`

Current state:

- Surface has a Gnomish Lineage trait Unit.
- Character creation does not expose a Forest/Rock Gnome lineage choice.

Output:

- Add a typed character-creation choice for Gnomish Lineage.
- Finalized CharacterBuild must retain the selected lineage without duplicating
  spell-access or device behavior state.

Acceptance:

- Gnome lineage choice is discoverable and finalizable.
- Forest and Rock are represented as domain lineage options, not as arbitrary
  strings scattered through callers.

Verification:

- Shared lane verification.

### Task 3 - LT4-B03-GNOME-LINEAGE-TRAIT-PROJECTION

Status: `ready-for-research`

Depends on:

- LT4-B02-GNOMISH-LINEAGE-CHOICE-OWNER

Unit:

- `species_gnome_gnomish_lineage`

SRD anchor:

- `.references/srd-5.2.1/Character-Origins.md:189-193`

Current state:

- Forest Gnome and Rock Gnome facts are authored in SRD prose.
- No selected-lineage projection owner exists.

Output:

- Retain Forest Gnome spell-access facts and Rock Gnome spell/device facts at
  the appropriate character-sheet or runtime-detached boundary.
- Do not duplicate selected spell state beside the selected lineage source fact.

Acceptance:

- Selected lineage facts are available to downstream character-sheet owners.
- The Rock Gnome clockwork device behavior is either typed as outside active
  runtime or given a concrete owner; it is not silently ignored.

Verification:

- Shared lane verification.

### Task 4 - LT4-B04-GNOME-SPECIES-ADMISSION-EVIDENCE

Status: `ready-for-research`

Depends on:

- LT4-B02-GNOMISH-LINEAGE-CHOICE-OWNER
- LT4-B03-GNOME-LINEAGE-TRAIT-PROJECTION

Unit:

- `species_gnome`

SRD anchor:

- `.references/srd-5.2.1/Character-Origins.md:177-193`

Current state:

- `species_gnome` is cataloged but absent from the character-creation species
  option list.

Output:

- Add Gnome to the SRD species admission option set.
- Add deterministic character-creation evidence for selected Gnome, selected
  Gnomish Lineage, and retained trait refs.
- Regenerate level <4 choice closure and unit-profile coverage.

Acceptance:

- `species_gnome` is no longer a blocker in
  `LEVEL_LT4_CHOICE_CLOSURE.md`.
- Species denominator remains 9 SRD species.

Verification:

- Shared lane verification.
