# Ralph L5 Lane C: Spell-Level 3 Missing Authored Records 1

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L5-C01-BESTOW-CURSE",
      "status": "done",
      "title": "Close Bestow Curse missing authored record"
    },
    {
      "number": 2,
      "id": "L5-C02-BLINK",
      "status": "done",
      "title": "Close Blink missing authored record"
    },
    {
      "number": 3,
      "id": "L5-C03-CONJURE-ANIMALS",
      "status": "done",
      "title": "Close Conjure Animals missing authored record"
    },
    {
      "number": 4,
      "id": "L5-C04-GASEOUS-FORM",
      "status": "done",
      "title": "Close Gaseous Form missing authored record"
    },
    {
      "number": 5,
      "id": "L5-C05-GLYPH-OF-WARDING",
      "status": "done",
      "title": "Close Glyph of Warding missing authored record"
    },
    {
      "number": 6,
      "id": "L5-C06-HASTE",
      "status": "done",
      "title": "Close Haste missing authored record"
    },
    {
      "number": 7,
      "id": "L5-C07-MAGIC-CIRCLE",
      "status": "done",
      "title": "Close Magic Circle missing authored record"
    },
    {
      "number": 8,
      "id": "L5-C08-MELD-INTO-STONE",
      "status": "done",
      "title": "Close Meld into Stone missing authored record"
    },
    {
      "number": 9,
      "id": "L5-C09-NONDETECTION",
      "status": "done",
      "title": "Close Nondetection missing authored record"
    },
    {
      "number": 10,
      "id": "L5-C10-PHANTOM-STEED",
      "status": "done",
      "title": "Close Phantom Steed missing authored record"
    },
    {
      "number": 11,
      "id": "L5-C11-BESTOW-CURSE-SURFACE-WIDENING",
      "status": "done",
      "title": "Widen Bestow Curse Surface Spell Definition"
    },
    {
      "number": 12,
      "id": "L5-C12-BLINK-SURFACE-WIDENING",
      "status": "done",
      "title": "Widen Blink Surface Spell Definition"
    },
    {
      "number": 13,
      "id": "L5-C13-CONJURE-ANIMALS-SURFACE-WIDENING",
      "status": "done",
      "title": "Widen Conjure Animals Surface Spell Definition"
    },
    {
      "number": 14,
      "id": "L5-C14-GASEOUS-FORM-SURFACE-WIDENING",
      "status": "done",
      "title": "Widen Gaseous Form Surface Spell Definition"
    },
    {
      "number": 15,
      "id": "L5-C15-GLYPH-OF-WARDING-SURFACE-WIDENING",
      "status": "done",
      "title": "Widen Glyph of Warding Surface Spell Definition"
    },
    {
      "number": 16,
      "id": "L5-C16-HASTE-SURFACE-WIDENING",
      "status": "done",
      "title": "Widen Haste Surface Spell Definition"
    },
    {
      "number": 17,
      "id": "L5-C17-HASTE-POSITIVE-RUNTIME",
      "status": "ready-for-research",
      "title": "Promote Haste positive runtime effect"
    },
    {
      "number": 18,
      "id": "L5-C18-HASTE-LETHARGY-RUNTIME",
      "status": "ready-for-research",
      "title": "Promote Haste lethargy runtime cleanup"
    },
    {
      "number": 19,
      "id": "L5-C19-MAGIC-CIRCLE-SURFACE-WIDENING",
      "status": "ready-for-research",
      "title": "Widen Magic Circle Surface Spell Definition"
    },
    {
      "number": 20,
      "id": "L5-C20-MELD-INTO-STONE-SURFACE-WIDENING",
      "status": "ready-for-research",
      "title": "Widen Meld into Stone Surface Spell Definition"
    },
    {
      "number": 21,
      "id": "L5-C21-PHANTOM-STEED-MOUNT-LIFECYCLE",
      "status": "ready-for-research",
      "title": "Promote Phantom Steed mount lifecycle owner"
    },
    {
      "number": 22,
      "id": "L5-C22-GLYPH-OF-WARDING-RUNTIME",
      "status": "ready-for-research",
      "title": "Promote Glyph of Warding runtime release owner"
    }
  ]
}
-->

## Lane Scope

This lane closes the first half of spell-level-3 identities that the level 1-7
mining audit marks as `missing-authored-record`.

Each task owns one missing SRD Spell Definition decision first, then a separate
catalog admission or owner-boundary decision. Author a redistributable
SRD-provenance Surface record when the local SRD body is representable; if it is
not representable yet, record the catalog-boundary reason and any typed
follow-up split. Do not touch Lane B authored-review spells or Lane D
missing-record spells unless a RAW dependency is unavoidable and documented.

## Source Artifacts

- `plans/unit-profile-coverage/LEVEL1_7_MINING_AUDIT.md`
- `plans/unit-profile-coverage/level1-7-mining-audit.json`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `plans/unit-profile-coverage/L3_HASTE_RUNTIME_SURVEY.md`
- `packages/surface/content/*.json`
- `packages/surface/content/*.dhall`
- `packages/battle-runtime/src/`
- `.references/srd-5.2.1/Classes/*.md`
- `.references/srd-5.2.1/Spells/*.md`
- `UBIQUITOUS_LANGUAGE.md`
- `ASSUMPTIONS.md`

## Lane Rules

- Run the Ralph task-base check before research or implementation.
- Use only local SRD 5.2.1 sources under `.references/srd-5.2.1/`.
- If RAW is ambiguous or a task requires a modeling choice the SRD does not
  prescribe, do not silently choose; document the proposed assumption in
  `ASSUMPTIONS.md` or stop for owner direction.
- Do not browse external rules sources.
- Do not add PHB+ authored identity.
- One task equals one unique spell Unit identity. Class-list rows are evidence
  for that Unit, not separate implementation tasks.
- Keep provenance, structured input, and runtime projection separate.
- Missing authored record closure requires resolving the Surface Spell
  Definition/provenance question first: author the SRD-provenance record when
  the local SRD body is representable, or record a catalog-boundary reason it is
  not representable yet. A battle-runtime-detached owner statement alone does
  not close a missing authored record.
- Runtime behavior must not dispatch on spell id, name, or provenance section.

## DAG / Queue Order

| # | Task | Status | Depends on | Notes |
| ---: | --- | --- | --- | --- |
| 1 | L5-C01-BESTOW-CURSE - Close Bestow Curse missing authored record | done | none | Closed as a Surface widening boundary, not an authored-record admission. |
| 2 | L5-C02-BLINK - Close Blink missing authored record | done | none | Closed as a Surface widening boundary, not an authored-record admission. |
| 3 | L5-C03-CONJURE-ANIMALS - Close Conjure Animals missing authored record | done | none | Closed as a Surface widening boundary, not an authored-record admission. |
| 4 | L5-C04-GASEOUS-FORM - Close Gaseous Form missing authored record | done | none | Closed as a Surface widening boundary, not an authored-record admission. |
| 5 | L5-C05-GLYPH-OF-WARDING - Close Glyph of Warding missing authored record | done | none | Closed as a Surface widening boundary, not an authored-record admission; follow-up is L5-C15 for Glyph trigger, stored spell, movement invalidation, and table object/location facts. |
| 6 | L5-C06-HASTE - Close Haste missing authored record | done | none | Closed as a Surface widening boundary, not an authored-record admission; follow-ups are L5-C16, L5-C17, and L5-C18 for Surface authoring, positive runtime, and lethargy cleanup. |
| 7 | L5-C07-MAGIC-CIRCLE - Close Magic Circle missing authored record | done | none | Closed as a Surface widening boundary, not an authored-record admission; follow-up is L5-C19 for warded-cylinder, direction, travel-gate, and protected-target facts. |
| 8 | L5-C08-MELD-INTO-STONE - Close Meld into Stone missing authored record | done | none | Closed as a Surface widening boundary, not an authored-record admission; follow-up is L5-C20 for stone-merge occupancy, perception, damage, and forced-exit facts. |
| 9 | L5-C09-NONDETECTION - Close Nondetection missing authored record | done | none | Independent missing spell Unit. |
| 10 | L5-C10-PHANTOM-STEED - Close Phantom Steed missing authored record | done | none | Closed by an SRD-provenance Surface record plus unsupported-profile mount lifecycle/travel/fade owner boundary; follow-up is L5-C21. |
| 11 | L5-C11-BESTOW-CURSE-SURFACE-WIDENING - Widen Bestow Curse Surface Spell Definition | done | L5-C01-BESTOW-CURSE | Add typed Surface facts for Bestow Curse curse-option selection, curse-removal targeting, and slot-dependent duration/Concentration before authoring/admitting the Spell Definition. |
| 12 | L5-C12-BLINK-SURFACE-WIDENING - Widen Blink Surface Spell Definition | done | L5-C02-BLINK | Blink is authored/admitted as an SRD Surface Spell Definition with typed turn-end random-table and Ethereal phase facts; runtime remains closed at the planar lifecycle/table-spatial owner boundary. |
| 13 | L5-C13-CONJURE-ANIMALS-SURFACE-WIDENING - Widen Conjure Animals Surface Spell Definition | done | L5-C03-CONJURE-ANIMALS | Add typed Surface/table-spatial facts for Conjure Animals' spectral pack occurrence, pack reposition, Strength Saving Throw Advantage predicate, Dexterity Saving Throw trigger eligibility, and once-per-turn limit before authoring/admitting the Spell Definition. |
| 14 | L5-C14-GASEOUS-FORM-SURFACE-WIDENING - Widen Gaseous Form Surface Spell Definition | done | L5-C04-GASEOUS-FORM | Add typed Surface/table-spatial facts for Gaseous Form's mist-cloud form state, movement replacement, Magic-action self-ending, B/P/S Resistance, Prone Immunity, Strength/Dexterity/Constitution Saving Throw Advantage, action/object/speech limits, creature-space occupancy, narrow-opening passage, and liquid-surface treatment before authoring/admitting the Spell Definition. |
| 15 | L5-C15-GLYPH-OF-WARDING-SURFACE-WIDENING - Widen Glyph of Warding Surface Spell Definition | done | L5-C05-GLYPH-OF-WARDING | Glyph of Warding is authored/admitted as an SRD Surface Spell Definition with typed durable glyph occurrence, trigger, movement invalidation, explosive-rune, and spell-glyph facts; runtime follow-up is L5-C22. |
| 16 | L5-C16-HASTE-SURFACE-WIDENING - Widen Haste Surface Spell Definition | done | L5-C06-HASTE | Haste is authored/admitted as an SRD Surface Spell Definition with typed restricted additional-action and spell-end lethargy facts; runtime follow-ups remain L5-C17 and L5-C18. |
| 17 | L5-C17-HASTE-POSITIVE-RUNTIME - Promote Haste positive runtime effect | ready-for-research | L5-C16-HASTE-SURFACE-WIDENING | Promote the active Haste effects: Speed ratio, +2 Armor Class, Dexterity Saving Throw Advantage, Concentration, and restricted spell-granted per-turn action resource. |
| 18 | L5-C18-HASTE-LETHARGY-RUNTIME - Promote Haste lethargy runtime cleanup | ready-for-research | L5-C17-HASTE-POSITIVE-RUNTIME | Promote the spell-end lethargy rider: Incapacitated plus Speed 0 until the end of the target's next turn without treating Incapacitated as a Speed shortcut. |
| 19 | L5-C19-MAGIC-CIRCLE-SURFACE-WIDENING - Widen Magic Circle Surface Spell Definition | ready-for-research | L5-C07-MAGIC-CIRCLE | Add typed Surface/table-spatial facts for Magic Circle's warded Cylinder, selected creature types, normal or reversed direction, nonmagical crossing prevention, teleportation or interplanar-travel Saving Throw gate, Attack Roll Disadvantage, and source-scoped possession plus Charmed/Frightened prevention before authoring/admitting the Spell Definition. |
| 20 | L5-C20-MELD-INTO-STONE-SURFACE-WIDENING - Widen Meld into Stone Surface Spell Definition | ready-for-research | L5-C08-MELD-INTO-STONE | Add typed Surface/table terrain facts for Meld into Stone's stone object-or-surface containment target, hidden merged occupancy, outside-sense limits, self-spell and Movement-limited exit permissions, destructive expulsion damage, closest-unoccupied-space placement, and Prone rider before authoring/admitting the Spell Definition. |
| 21 | L5-C21-PHANTOM-STEED-MOUNT-LIFECYCLE - Promote Phantom Steed mount lifecycle owner | ready-for-research | L5-C10-PHANTOM-STEED | Promote the spell-created mount lifecycle, Riding Horse Speed override, rider permission, damage-ended spell cleanup, fade/dismount grace, equipment vanish, and table travel boundary from the typed Surface record. |
| 22 | L5-C22-GLYPH-OF-WARDING-RUNTIME - Promote Glyph of Warding runtime release owner | ready-for-research | L5-C15-GLYPH-OF-WARDING-SURFACE-WIDENING | Promote the durable glyph occurrence/release workflow from the typed Surface record, preserving table object/location, trigger-event, area-membership, hostile placement, stored spell invocation, and stored Concentration witnesses without authored spell identity dispatch. |

## Shared Verification

- RAW and ubiquitous-language check: read the listed spell description, class
  spell-list anchors, and `UBIQUITOUS_LANGUAGE.md` before authoring or closing
  the Unit.
- Reviewer-loop convergence: RAW traceability, ubiquitous-language/domain,
  architecture/connascence, and code-review passes until no reasonable findings
  remain.
- `pnpm --filter @dnd/surface typecheck`
- `pnpm --filter @dnd/surface exec vitest run src/surface/unit-catalog.test.ts`
- Run focused tests/typechecks for any touched owner package.
- If battle-runtime behavior changes, update the relevant QNT/spec first and
  run the focused MBT only after code changes are complete, one MBT run at a
  time per `AGENTS.md`.
- If a unit task changes coverage inputs, run
  `pnpm unit-profile-coverage:check --write` locally. Shared generated
  inventory/matrix refresh is owned by
  `plans/RALPH_L5_POST_LANE_GENERATED_COVERAGE_FINALIZATION.md` after all four
  lanes merge; individual unit-task agents should not hand-resolve cross-lane
  generated artifact conflicts.
- `pnpm unit-profile-coverage:check`
- `git diff --check`

## Task Details

### Task 1 - L5-C01-BESTOW-CURSE

Status: `done`

Depends on:

- merged L17 mining audit

Unit:

- `bestow_curse`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md:481`
- `.references/srd-5.2.1/Classes/Bard.md:217`
- `.references/srd-5.2.1/Classes/Cleric.md:206`
- `.references/srd-5.2.1/Classes/Wizard.md:238`

Current state:

- Authored record is missing; catalog state is `not-installed`.
- Mining disposition is `needs-surface-widening`.
- Surface cannot yet express the Bestow Curse Spell Definition without losing
  the exact curse-option choice, curse-removal target, and slot-dependent
  duration/Concentration facts.

Output:

- Resolve the SRD Spell Definition record or record a catalog-boundary reason it
  is not representable yet.
- Own the shared runtime Spell Effect curse occurrence and curse-removal target
  boundary consumed by Remove Curse; if admitted, add support-profile/evidence
  for curse options, Saving Throw timing, and Concentration ownership.

Acceptance:

- `bestow_curse` leaves `missing-authored-record` by becoming
  `needs-surface-widening`.

Verification:

- Shared lane verification.

Plan Impact:

- Follow-up work is split into L5-C11 before any SRD-provenance Bestow Curse
  Spell Definition is authored or admitted.

### Task 11 - L5-C11-BESTOW-CURSE-SURFACE-WIDENING

Status: `done`

Depends on:

- L5-C01-BESTOW-CURSE

Unit:

- `bestow_curse`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md:481`
- `.references/srd-5.2.1/Classes/Bard.md:217`
- `.references/srd-5.2.1/Classes/Cleric.md:206`
- `.references/srd-5.2.1/Classes/Wizard.md:238`

Current state:

- The generated inventory classifies the three Bestow Curse class-list rows as
  `needs-surface-widening` / `surface-widening-required`.
- Existing Surface spell atoms can express some adjacent facts, but not the
  complete Bestow Curse shape as one SRD Spell Definition without a partial
  record.

Output:

- Widen Surface so a Bestow Curse Spell Definition can represent exactly one
  chosen ongoing curse option: chosen-ability Ability Check and Saving Throw
  Disadvantage, caster-targeted Attack Roll Disadvantage, start-of-turn Wisdom
  save or forced Dodge, or caster attack/spell damage rider.
- Represent the target as a curse-removal target consumed by Remove Curse or a
  shared named-effect removal owner without dispatching on spell id/name in
  runtime behavior.
- Represent the higher-slot duration facts, including the level 5+ transition
  away from Concentration and the level 9 lasts-until-dispelled case.
- Author/admit the SRD-provenance Bestow Curse record only after the typed
  Surface facts can preserve those RAW distinctions.

Acceptance:

- `bestow_curse` has an SRD-provenance Surface Spell Definition or remains
  explicitly classified with a narrower executable blocker.
- The record does not omit one of the four curse options or encode all options
  as simultaneously active.
- Duration/Concentration slot behavior is representable without a misleading
  approximation.
- Runtime support, if added, dispatches on typed Surface/profile facts rather
  than authored spell identity.

Verification:

- Shared lane verification.

### Task 2 - L5-C02-BLINK

Status: `done`

Depends on:

- merged L17 mining audit

Unit:

- `blink`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md:580`
- `.references/srd-5.2.1/Classes/Sorcerer.md:300`
- `.references/srd-5.2.1/Classes/Wizard.md:239`

Current state:

- Authored record is missing; catalog state is `not-installed`.
- Mining disposition is `needs-surface-widening`.
- Surface cannot yet express the Blink Spell Definition without losing the
  turn-end d6 roll, Ethereal Plane transition, already-on-plane ending
  predicate, and return-position availability facts.

Output:

- Author or close Blink with an explicit owner for turn-end roll, plane
  transition, and return-position table facts.

Acceptance:

- `blink` leaves `missing-authored-record` by becoming
  `needs-surface-widening`.

Verification:

- Shared lane verification.

Plan Impact:

- Follow-up work is split into L5-C12 before any SRD-provenance Blink Spell
  Definition is authored or admitted.

### Task 12 - L5-C12-BLINK-SURFACE-WIDENING

Status: `done`

Depends on:

- L5-C02-BLINK

Unit:

- `blink`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md:580`
- `.references/srd-5.2.1/Classes/Sorcerer.md:300`
- `.references/srd-5.2.1/Classes/Wizard.md:239`

Current state:

- The generated inventory classifies the two Blink class-list rows as
  `needs-surface-widening` / `surface-widening-required`.
- Existing Surface spell facts cannot represent the complete Blink shape as one
  SRD Spell Definition without a partial record.

Output:

- Widen Surface so a Blink Spell Definition can represent the end-of-turn d6
  roll, including the 4-6 threshold outcome.
- Represent the Ethereal Plane transition, the spell-ending predicate when the
  caster is already on that plane, and the start-of-next-turn/spell-end return
  timing without dispatching on spell id/name in runtime behavior.
- Assign table/spatial ownership for the origin space, visible unoccupied-space
  choice within 10 feet, no-available-space condition, and nearest-unoccupied
  fallback before any battle-runtime projection admits the Spell Definition.
- Author/admit the SRD-provenance Blink record only after the typed Surface and
  table/spatial facts can preserve those RAW distinctions.

Acceptance:

- `blink` has an SRD-provenance Surface Spell Definition or remains explicitly
  classified with a narrower executable blocker.
- The record does not omit the turn-end roll, the already-on-Ethereal-Plane
  spell-ending case, or the return-position availability/fallback facts.
- Runtime support, if added, dispatches on typed Surface/profile facts rather
  than authored spell identity.

Verification:

- Shared lane verification.

### Task 3 - L5-C03-CONJURE-ANIMALS

Status: `done`

Depends on:

- merged L17 mining audit

Unit:

- `conjure_animals`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md:948`
- `.references/srd-5.2.1/Classes/Druid.md:254`

Current state:

- Authored record is missing; catalog state is `not-installed`.
- Mining disposition is `needs-surface-widening`.
- Surface cannot yet express the Conjure Animals Spell Definition without
  losing the spectral pack occurrence, pack position/reposition, caster
  proximity, creature-visibility trigger eligibility, and shared once-per-turn
  limit facts.

Output:

- Resolve the SRD Spell Definition record for Conjure Animals, then classify
  owner facts for the spectral nature-spirit pack form, pack movement, Strength
  Saving Throw Advantage near the pack, Dexterity Saving Throw damage trigger,
  and once-per-turn trigger limit.

Acceptance:

- `conjure_animals` leaves `missing-authored-record` by becoming
  `needs-surface-widening`.

Verification:

- Shared lane verification.

Plan Impact:

- Follow-up work is split into L5-C13 before any SRD-provenance Conjure Animals
  Spell Definition is authored or admitted.

### Task 13 - L5-C13-CONJURE-ANIMALS-SURFACE-WIDENING

Status: `done`

Depends on:

- L5-C03-CONJURE-ANIMALS

Unit:

- `conjure_animals`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md:948`
- `.references/srd-5.2.1/Classes/Druid.md:254`

Current state:

- The generated inventory classifies the Druid Conjure Animals class-list row as
  `needs-surface-widening` / `surface-widening-required`.
- Existing Surface spell facts cannot represent the complete Conjure Animals
  shape as one SRD Spell Definition without a partial record.

Output:

- Widen Surface so a Conjure Animals Spell Definition can represent a Large
  spectral, intangible pack occurrence placed in a visible unoccupied space.
- Represent caster-turn movement of the pack up to 30 feet to a visible
  unoccupied space, separate from ordinary creature movement or companion
  control.
- Represent the caster's Strength Saving Throw Advantage predicate while within
  5 feet of the pack.
- Represent the optional Dexterity Saving Throw Slashing damage trigger when
  the pack moves within 10 feet of a caster-visible creature, or when a
  caster-visible creature enters or ends its turn within 10 feet of the pack.
- Represent the shared once-per-turn-per-creature trigger limit and higher-slot
  damage scaling before any battle-runtime projection admits the Spell
  Definition.
- Author/admit the SRD-provenance Conjure Animals record only after the typed
  Surface, table/spatial, and future pack Spell Effect facts can preserve those
  RAW distinctions.

Acceptance:

- `conjure_animals` has an SRD-provenance Surface Spell Definition or remains
  explicitly classified with a narrower executable blocker.
- The record does not omit the pack occurrence, pack reposition, Strength Saving
  Throw Advantage predicate, caster-visible Dexterity Saving Throw trigger
  eligibility, once-per-turn limit, or higher-slot damage scaling.
- Runtime support, if added, dispatches on typed Surface/profile facts rather
  than authored spell identity.

Verification:

- Shared lane verification.

### Task 4 - L5-C04-GASEOUS-FORM

Status: `done`

Depends on:

- merged L17 mining audit

Unit:

- `gaseous_form`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md:688`
- `.references/srd-5.2.1/Classes/Sorcerer.md:308`
- `.references/srd-5.2.1/Classes/Warlock.md:384`
- `.references/srd-5.2.1/Classes/Wizard.md:246`

Current state:

- Authored record is missing; catalog state is `not-installed`.
- Mining disposition is `needs-surface-widening`.
- Surface cannot yet express the Gaseous Form Spell Definition without losing
  the mist-cloud form state, movement replacement, Magic-action self-ending,
  object/speech/action limits, creature-space occupancy, narrow-opening
  passage, or liquid-surface treatment facts.

Output:

- Author or close Gaseous Form with owner facts for movement, resistance,
  action limits, and form state.

Acceptance:

- `gaseous_form` leaves `missing-authored-record` by becoming
  `needs-surface-widening`.

Verification:

- Shared lane verification.

Plan Impact:

- Follow-up work is split into L5-C14 before any SRD-provenance Gaseous Form
  Spell Definition is authored or admitted.

### Task 14 - L5-C14-GASEOUS-FORM-SURFACE-WIDENING

Status: `done`

Depends on:

- L5-C04-GASEOUS-FORM

Unit:

- `gaseous_form`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md:688`
- `.references/srd-5.2.1/Classes/Sorcerer.md:308`
- `.references/srd-5.2.1/Classes/Warlock.md:384`
- `.references/srd-5.2.1/Classes/Wizard.md:246`

Current state:

- The generated inventory classifies the three Gaseous Form class-list rows as
  `needs-surface-widening` / `surface-widening-required`.
- Existing Surface spell atoms can express some adjacent facts, but not the
  complete Gaseous Form shape as one SRD Spell Definition without a partial
  record.

Output:

- Widen Surface so a Gaseous Form Spell Definition can represent a
  spell-effect mist-cloud form that includes the target's worn and carried
  objects without pretending the form is a catalog Stat Block or known-form
  roster choice.
- Represent replacement movement: the target's only movement method is 10-foot
  Fly Speed with hover, rather than an additive special Speed grant.
- Represent the target's Magic-action self-ending trigger and the
  target-drops-to-0-Hit-Points ending trigger.
- Represent the passive form facts: Bludgeoning, Piercing, and Slashing
  Resistance; Prone Immunity; and Advantage on Strength, Dexterity, and
  Constitution Saving Throws.
- Represent action/object/speech limits precisely: no talking, no object
  manipulation/drop/use/interaction, no attacks, and no spellcasting while
  preserving the Magic-action self-ending exception.
- Assign table/spatial ownership for entering and occupying another creature's
  space, passing through narrow openings, and treating liquids as solid
  surfaces before any battle-runtime projection admits the Spell Definition.
- Author/admit the SRD-provenance Gaseous Form record only after the typed
  Surface and table/spatial facts can preserve those RAW distinctions.

Acceptance:

- `gaseous_form` has an SRD-provenance Surface Spell Definition or remains
  explicitly classified with a narrower executable blocker.
- The record does not omit the form state, movement replacement, action/object
  limits, creature-space occupancy, narrow-opening passage, liquid-surface
  treatment, or Magic-action self-ending facts.
- Runtime support, if added, dispatches on typed Surface/profile facts rather
  than authored spell identity.

Verification:

- Shared lane verification.

### Task 5 - L5-C05-GLYPH-OF-WARDING

Status: `done`

Depends on:

- merged L17 mining audit

Unit:

- `glyph_of_warding`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md:842`
- `.references/srd-5.2.1/Classes/Bard.md:221`
- `.references/srd-5.2.1/Classes/Cleric.md:211`
- `.references/srd-5.2.1/Classes/Wizard.md:247`

Current state:

- Authored record is missing; catalog state is `not-installed`.
- Mining disposition is `needs-surface-widening`.
- Surface cannot yet express the Glyph of Warding Spell Definition without
  losing the anchored surface/object inscription, maximum 10-foot-diameter
  glyph coverage, caster-defined trigger, movement invalidation,
  explosive-rune branch, stored-spell branch, or table object/location facts.

Output:

- Author or close Glyph of Warding with a precise owner for stored spell,
  trigger, movement invalidation, and table object/location facts.

Acceptance:

- `glyph_of_warding` leaves `missing-authored-record` by becoming
  `needs-surface-widening`.

Verification:

- Shared lane verification.

Plan Impact:

- Follow-up work is split into
  L5-C15-GLYPH-OF-WARDING-SURFACE-WIDENING before any SRD-provenance Glyph of
  Warding Spell Definition is authored or admitted.

### Task 15 - L5-C15-GLYPH-OF-WARDING-SURFACE-WIDENING

Status: `done`

Depends on:

- L5-C05-GLYPH-OF-WARDING

Unit:

- `glyph_of_warding`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md:842`
- `.references/srd-5.2.1/Classes/Bard.md:221`
- `.references/srd-5.2.1/Classes/Cleric.md:211`
- `.references/srd-5.2.1/Classes/Wizard.md:247`

Current state:

- Generated inventory classifies the three Glyph of Warding class-list rows as
  `needs-surface-widening` with battle-readiness
  `surface-widening-required`.
- Existing Surface spell facts cannot represent Glyph of Warding as one
  complete SRD-provenance Spell Definition without losing its durable glyph
  occurrence, maximum coverage constraint, trigger, movement, branch, and
  table object/location distinctions.

Output:

- Widen Surface so a Glyph of Warding Spell Definition can represent a durable
  glyph occurrence inscribed on either a surface or an object that can be
  closed and carry the maximum 10-foot-diameter glyph coverage constraint.
- Represent caster-defined and refined trigger conditions, including
  creature-type activation filters and password or other non-trigger
  exclusions, without dispatching on spell id or name in runtime behavior.
- Represent table object/location ownership for cast location, movement of the
  inscribed surface or object more than 10 feet from that location,
  covered-area placement within the maximum, glyph concealment and noticing,
  trigger occurrence, area membership, and close-as-possible hostile placement.
- Represent the explosive-rune branch with caster-chosen Acid, Cold, Fire,
  Lightning, or Thunder damage, Dexterity Saving Throw half damage, a
  20-foot-radius Sphere centered on the glyph, and higher-slot damage scaling.
- Represent the spell-glyph branch with stored prepared spell eligibility
  (level plus single-creature or area target shape), no immediate effect at
  storage time, release retargeting to or around the triggering creature,
  hostile summon/object/trap placement, and full-duration execution for stored
  Concentration spells.
- Author or admit the SRD-provenance Glyph of Warding record only after typed
  Surface and table object/location facts can preserve those RAW distinctions.

Acceptance:

- `glyph_of_warding` has an SRD-provenance Surface Spell Definition or remains
  explicitly classified with a narrower executable blocker.
- The record does not omit the inscription anchor choice, trigger refinement
  and exclusions, maximum 10-foot-diameter coverage constraint, movement
  invalidation, explosive-rune branch, stored-spell branch,
  retargeting/placement facts, or stored Concentration duration override.
- Runtime support, if added, dispatches on typed Surface/profile facts rather
  than authored spell identity.

Verification:

- Shared lane verification.

Plan Impact:

- Glyph of Warding is authored/admitted as an SRD-provenance Surface Spell
  Definition. Remaining promoted runtime work is split into
  L5-C22-GLYPH-OF-WARDING-RUNTIME before any supported Glyph runtime profile
  claims the durable glyph occurrence/release workflow.

### Task 6 - L5-C06-HASTE

Status: `done`

Depends on:

- merged L17 mining audit
- plans/unit-profile-coverage/L3_HASTE_RUNTIME_SURVEY.md

Unit:

- `haste`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md:1091`
- `.references/srd-5.2.1/Classes/Sorcerer.md:309`
- `.references/srd-5.2.1/Classes/Wizard.md:248`

Current state:

- Authored record is missing; catalog state is `not-installed`.
- Mining disposition is `needs-surface-widening`.
- Surface cannot yet express the Haste Spell Definition without losing the
  additional-action allow-list, Attack one-attack-only rider, or spell-end
  lethargy state.

Output:

- Preserve the survey's follow-up split: Surface authoring, positive runtime
  effect, and lethargy cleanup. Do not collapse those prerequisites into a
  single support or unsupported label.

Acceptance:

- `haste` leaves `missing-authored-record` by becoming
  `needs-surface-widening`.

Verification:

- Shared lane verification.

Plan Impact:

- Follow-up work is split into L5-C16, L5-C17, and L5-C18 before any
  SRD-provenance Haste Spell Definition is authored, admitted, or promoted at
  runtime.

### Task 16 - L5-C16-HASTE-SURFACE-WIDENING

Status: `done`

Depends on:

- L5-C06-HASTE

Unit:

- `haste`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md:1091`
- `.references/srd-5.2.1/Classes/Sorcerer.md:309`
- `.references/srd-5.2.1/Classes/Wizard.md:248`

Current state:

- Haste is authored/admitted as an SRD-provenance Surface Spell Definition.
- The generated inventory classifies Haste as
  `catalog-installed-owner-evidence-required` / `battle-runtime-required`
  until L5-C17 and L5-C18 promote the runtime owners.
- Surface now represents Haste's exact action allow-list with Attack capped at
  one attack and the spell-end lethargy rider as typed facts.

Output:

- Widen Surface so a Haste Spell Definition can represent the additional action
  allow-list: Attack with one attack only, Dash, Disengage, Hide, or Utilize.
- Represent spell-end lethargy as an end-of-effect fact applying Incapacitated
  plus Speed 0 until the end of the target's next turn.
- Author/admit the SRD-provenance Haste record only after those typed Surface
  facts preserve the RAW distinctions.

Acceptance:

- `haste` has an SRD-provenance Surface Spell Definition or remains explicitly
  classified with a narrower executable blocker.
- The record does not treat Haste's additional action as an unrestricted Action
  or as the Action Surge exclusion shape.
- Lethargy does not rely on Incapacitated as an implicit Speed-0 shortcut.
- Runtime support, if added, dispatches on typed Surface/profile facts rather
  than authored spell identity.

Verification:

- Shared lane verification.

Plan Impact:

- L5-C17 is unblocked for positive runtime promotion from the typed Surface
  record.
- L5-C18 remains dependency-ordered after L5-C17 for spell-end lethargy runtime
  cleanup.

### Task 17 - L5-C17-HASTE-POSITIVE-RUNTIME

Status: `ready-for-research`

Depends on:

- L5-C16-HASTE-SURFACE-WIDENING

Unit:

- `haste`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md:1091`
- `.references/srd-5.2.1/Classes/Sorcerer.md:309`
- `.references/srd-5.2.1/Classes/Wizard.md:248`

Current state:

- Haste has a typed SRD Surface record/profile from L5-C16 for positive runtime
  promotion.
- Battle runtime already has adjacent scalar AC and action-resource machinery,
  but does not yet promote Haste's Speed ratio, Dexterity Saving Throw
  Advantage, or restricted spell-granted per-turn action resource.

Output:

- Promote Magic Action and level-3+ Spell Slot spend, caster-owned
  Concentration, known willing target admission, doubled Speed projection, +2
  Armor Class projection, Dexterity Saving Throw Advantage, and one
  spell-granted action resource on each target turn restricted to Attack with
  one attack only, Dash, Disengage, Hide, or Utilize.
- Add supported-profile or profile-subset-supported Unit evidence and focused
  runtime tests.
- Maintain promoted Quint/runtime parity without authored-identity dispatch.

Acceptance:

- Haste's active positive effects are executable from typed Surface/profile
  facts.
- The additional action is granted per target turn and cannot be spent on
  disallowed actions or multiple attacks.
- Runtime reducers do not branch on Haste id, name, slug, or provenance section.

Verification:

- Shared lane verification.
- Focused battle-runtime tests and MBT per `AGENTS.md` after QNT/spec updates.

### Task 18 - L5-C18-HASTE-LETHARGY-RUNTIME

Status: `ready-for-research`

Depends on:

- L5-C17-HASTE-POSITIVE-RUNTIME

Unit:

- `haste`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md:1091`
- `.references/srd-5.2.1/Classes/Sorcerer.md:309`
- `.references/srd-5.2.1/Classes/Wizard.md:248`

Current state:

- Haste lethargy promotion depends on the active spell lifecycle from L5-C17.
- The repo must model Incapacitated and Speed 0 as separate spell-end effects,
  because Incapacitated alone does not set Speed to 0.

Output:

- When the Haste spell effect ends for a target, remove the positive effect and
  apply source-owned lethargy that gives Incapacitated and Speed 0 until the end
  of that target's next turn.
- Preserve any pre-existing Incapacitated source and avoid using Incapacitated
  as an implicit Speed-0 shortcut.
- Add focused end-of-concentration, duration expiration, recast/replacement,
  and target-turn cleanup tests plus promoted Quint/runtime parity.

Acceptance:

- Haste's spell-end rider is executable for concentration loss, duration end,
  replacement/recast, and target-turn cleanup.
- Existing Incapacitated sources are not removed by Haste lethargy cleanup.
- Speed 0 ends with the lethargy state rather than with unrelated
  Incapacitated sources.

Verification:

- Shared lane verification.
- Focused battle-runtime tests and MBT per `AGENTS.md` after QNT/spec updates.

### Task 7 - L5-C07-MAGIC-CIRCLE

Status: `done`

Depends on:

- merged L17 mining audit

Unit:

- `magic_circle`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-M-P.md:37`
- `.references/srd-5.2.1/Classes/Cleric.md:212`
- `.references/srd-5.2.1/Classes/Warlock.md:386`
- `.references/srd-5.2.1/Classes/Wizard.md:251`

Current state:

- Authored record is missing; catalog state is `not-installed`.
- Mining disposition is `needs-surface-widening`.
- Surface cannot yet express the Magic Circle Spell Definition without losing
  the warded Cylinder, selected creature types, normal or reversed direction,
  nonmagical crossing prevention, teleportation or interplanar-travel Saving
  Throw gate, scoped Attack Roll Disadvantage, and protected-target
  possession/Charmed/Frightened prevention facts.

Output:

- Resolve the SRD Spell Definition record or record a catalog-boundary reason it
  is not representable yet.
- Own the split between Surface Spell Definition facts, table/spatial movement
  and area witnesses, and future battle-runtime warded-area Spell Effect
  projection before admitting the record.

Acceptance:

- `magic_circle` leaves `missing-authored-record` by becoming
  `needs-surface-widening`.

Verification:

- Shared lane verification.

Plan Impact:

- Follow-up work is split into L5-C19 before any SRD-provenance Magic Circle
  Spell Definition is authored or admitted.

### Task 19 - L5-C19-MAGIC-CIRCLE-SURFACE-WIDENING

Status: `ready-for-research`

Depends on:

- L5-C07-MAGIC-CIRCLE

Unit:

- `magic_circle`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-M-P.md:37`
- `.references/srd-5.2.1/Classes/Cleric.md:212`
- `.references/srd-5.2.1/Classes/Warlock.md:386`
- `.references/srd-5.2.1/Classes/Wizard.md:251`

Current state:

- Generated inventory classifies the three Magic Circle class-list rows as
  `needs-surface-widening` / `surface-widening-required`.
- Existing Surface spell facts cannot represent Magic Circle as one complete
  SRD-provenance Spell Definition without losing its warded Cylinder, direction,
  creature-type filter, crossing/travel gate, and protected-target
  distinctions.

Output:

- Widen Surface so a Magic Circle Spell Definition can represent a
  10-foot-radius, 20-foot-tall Cylinder centered on a visible ground point
  within 10 feet, plus duration scaling of 1 extra hour for each Spell Slot
  level above 3.
- Represent the cast-time choice of one or more Celestial, Elemental, Fey,
  Fiend, or Undead creature types.
- Represent normal and reversed ward direction: preventing affected creatures
  from entering while protecting targets within the Cylinder, or preventing
  affected creatures from leaving while protecting targets outside it.
- Assign table/spatial ownership for ground-point placement, Cylinder
  membership, inside/outside protected-target witnesses, nonmagical entry or
  exit attempts, and teleportation or interplanar-travel crossing witnesses.
- Represent the Charisma Saving Throw gate for magical crossing, affected
  creature Attack Roll Disadvantage against protected targets, and
  source-scoped possession plus Charmed/Frightened prevention without
  dispatching on spell id or name in runtime behavior.
- Author/admit the SRD-provenance Magic Circle record only after typed Surface
  and table/spatial facts can preserve those RAW distinctions.

Acceptance:

- `magic_circle` has an SRD-provenance Surface Spell Definition or remains
  explicitly classified with a narrower executable blocker.
- The record does not omit Cylinder dimensions, selected creature types, ward
  direction, nonmagical crossing prevention, teleportation or interplanar-travel
  Saving Throw gates, Attack Roll Disadvantage, or source-scoped possession plus
  Charmed/Frightened prevention.
- Runtime support, if added, dispatches on typed Surface/profile facts rather
  than authored spell identity.

Verification:

- Shared lane verification.

### Task 8 - L5-C08-MELD-INTO-STONE

Status: `done`

Depends on:

- merged L17 mining audit

Unit:

- `meld_into_stone`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-M-P.md:247`
- `.references/srd-5.2.1/Classes/Cleric.md:214`
- `.references/srd-5.2.1/Classes/Druid.md:257`

Current state:

- Authored record is missing; catalog state is `not-installed`.
- Mining disposition is `needs-surface-widening`.
- Surface cannot yet express the Meld into Stone Spell Definition without losing
  the stone object-or-surface containment target, hidden merged occupancy,
  outside-sense limits, self-spell permission, Movement-limited voluntary exit,
  otherwise-no-movement restriction, destructive expulsion damage, closest
  unoccupied-space placement, and Prone rider facts.

Output:

- Resolve the SRD Spell Definition record or record a catalog-boundary reason it
  is not representable yet.
- Own the split between Surface Spell Definition facts, table terrain/object
  occupancy witnesses, and future battle-runtime merged-state, perception,
  damage, and forced-exit projection before admitting the record.

Acceptance:

- `meld_into_stone` leaves `missing-authored-record` by becoming
  `needs-surface-widening`.

Verification:

- Shared lane verification.

Plan Impact:

- Follow-up work is split into L5-C20 before any SRD-provenance Meld into Stone
  Spell Definition is authored or admitted.

### Task 20 - L5-C20-MELD-INTO-STONE-SURFACE-WIDENING

Status: `ready-for-research`

Depends on:

- L5-C08-MELD-INTO-STONE

Unit:

- `meld_into_stone`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-M-P.md:247`
- `.references/srd-5.2.1/Classes/Cleric.md:214`
- `.references/srd-5.2.1/Classes/Druid.md:257`

Current state:

- Generated inventory classifies the two Meld into Stone class-list rows as
  `needs-surface-widening` / `surface-widening-required`.
- Existing Surface spell facts cannot represent Meld into Stone as one complete
  SRD-provenance Spell Definition without losing its stone containment,
  occupancy, perception, movement, damage, and forced-exit distinctions.

Output:

- Widen Surface so a Meld into Stone Spell Definition can represent the
  self-only touch cast into a stone object or surface large enough to contain
  the caster's body and equipment.
- Represent hidden merged occupancy, blocked outside sight, nonmagical
  undetectability, outside-sound Wisdom (Perception) Disadvantage, passage of
  time awareness, self-spell permission, voluntary exit by spending 5 feet of
  Movement where the caster entered, and the otherwise-no-movement restriction.
- Assign table terrain/object occupancy ownership for stone size, shape,
  material, entry location, damage/destruction/transmutation events,
  fit-after-shape-change predicates, and closest-unoccupied-space placement.
- Represent minor stone damage as harmless, partial destruction or shape change
  that makes the caster no longer fit as 6d6 Force damage plus expulsion, and
  complete destruction or transmutation as 50 Force damage plus expulsion.
- Represent the Prone rider on expulsion without dispatching on spell id or name
  in runtime behavior.
- Author/admit the SRD-provenance Meld into Stone record only after typed
  Surface and table terrain/object facts can preserve those RAW distinctions.

Acceptance:

- `meld_into_stone` has an SRD-provenance Surface Spell Definition or remains
  explicitly classified with a narrower executable blocker.
- The record does not omit stone containment, hidden occupancy, outside-sense
  limits, self-spell permission, Movement-limited voluntary exit, destructive
  expulsion damage, closest-unoccupied-space placement, or the Prone rider.
- Runtime support, if added, dispatches on typed Surface/profile facts rather
  than authored spell identity.

Verification:

- Shared lane verification.

### Task 9 - L5-C09-NONDETECTION

Status: `done`

Depends on:

- merged L17 mining audit

Unit:

- `nondetection`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-M-P.md:481`
- `.references/srd-5.2.1/Classes/Bard.md:225`
- `.references/srd-5.2.1/Classes/Wizard.md:253`

Current state:

- Authored record is missing; catalog state is `not-installed`.
- Mining disposition is `missing-authored-record`.

Output:

- Author or close Nondetection with a precise owner for divination targeting
  and magical scrying detection boundaries.

Acceptance:

- `nondetection` leaves `missing-authored-record`.

Verification:

- Shared lane verification.

### Task 10 - L5-C10-PHANTOM-STEED

Status: `done`

Depends on:

- merged L17 mining audit

Unit:

- `phantom_steed`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-M-P.md:558`
- `.references/srd-5.2.1/Classes/Wizard.md:254`

Current state:

- Authored record is missing; catalog state is `not-installed`.
- Mining disposition is `missing-authored-record`.

Output:

- Author or close Phantom Steed with a precise owner for mount creation,
  riding speed, dismissal/fade timing, and table travel facts.

Acceptance:

- `phantom_steed` leaves `missing-authored-record`.

Verification:

- Shared lane verification.

Plan Impact:

- Follow-up runtime work is split into
  L5-C21-PHANTOM-STEED-MOUNT-LIFECYCLE before any promoted Phantom Steed
  battle/table runtime profile claims support for the spell-created mount.

### Task 21 - L5-C21-PHANTOM-STEED-MOUNT-LIFECYCLE

Status: `ready-for-research`

Depends on:

- L5-C10-PHANTOM-STEED

Unit:

- `phantom_steed`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-M-P.md:558`
- `.references/srd-5.2.1/Classes/Wizard.md:254`
- `.references/srd-5.2.1/Playing-the-Game.md:445`
- `.references/srd-5.2.1/Playing-the-Game.md:642`

Current state:

- The SRD-provenance Phantom Steed Surface Spell Definition is authored.
- Generated coverage classifies the Unit as `unsupported-profile` /
  `catalog-only/dead-for-now` with a `companion-control-boundary` owner.
- No promoted runtime profile executes the spell-created mount lifecycle,
  Riding Horse Speed override, rider state, damage-ended spell cleanup,
  fade/dismount grace, created-equipment vanish boundary, or table travel fact.

Output:

- Promote or further split an executable owner for Phantom Steed's
  spell-created mount occurrence, caller-supplied unoccupied placement, Riding
  Horse stat-block projection with the spell Speed override, caster-or-chosen
  rider permission, damage-triggered spell end, one-minute fade and dismount
  grace, saddle/bit/bridle vanish boundary, and 13 miles/hour travel fact.
- Reuse the existing stat-block catalog and Surface spawned-creature/mount
  facts; do not copy Riding Horse data into a parallel Phantom Steed runtime
  table or dispatch on spell id/name/provenance in generic runtime behavior.
- If this remains larger than one runtime owner, split the remaining work into
  concrete follow-up task IDs before closing the task.

Acceptance:

- Phantom Steed has a supported or explicitly narrower profile/owner boundary
  whose typed facts cover every represented Surface mount clause.
- Runtime support, if added, consumes typed Surface/profile facts and explicit
  placement/rider/travel witnesses rather than authored spell identity.
- The damage-ended spell cleanup and fade/dismount grace are not silently
  treated as ordinary 0-HP disappearance or immediate spell-end disappearance.

Verification:

- Shared lane verification.
- Focused owner-package tests, and if battle-runtime behavior changes, update
  the relevant QNT/spec first and run focused MBT per `AGENTS.md`.

### Task 22 - L5-C22-GLYPH-OF-WARDING-RUNTIME

Status: `ready-for-research`

Depends on:

- L5-C15-GLYPH-OF-WARDING-SURFACE-WIDENING

Unit:

- `glyph_of_warding`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md:842`
- `.references/srd-5.2.1/Classes/Bard.md:221`
- `.references/srd-5.2.1/Classes/Cleric.md:211`
- `.references/srd-5.2.1/Classes/Wizard.md:247`

Current state:

- Glyph of Warding is authored and installed as an SRD Surface Spell Definition
  with typed facts for inscription anchor, maximum covered area, hidden-noticing
  DC source, trigger refinement/exclusion, movement invalidation,
  explosive-rune save/damage/scaling, stored prepared-spell eligibility,
  stored-spell retargeting, hostile close-as-possible placement, and stored
  Concentration full-duration override.
- Generated coverage classifies the Unit as `unsupported-profile` with
  `catalog-installed-owner-evidence-required` / `battle-runtime-required`.
- No promoted runtime profile executes the durable glyph occurrence/release
  workflow.

Output:

- Promote or further split an executable owner for Glyph of Warding's durable
  glyph occurrence and release workflow.
- Consume typed Surface facts for inscription anchor, maximum covered area,
  hidden-noticing DC source, trigger refinement/exclusion, movement
  invalidation, explosive-rune Dexterity Saving Throw half damage,
  caster-chosen damage type and scaling, stored prepared-spell eligibility,
  stored-spell retargeting, hostile close-as-possible placement, and stored
  Concentration full-duration override.
- Preserve table-owned object location, covered-area placement, trigger-event,
  area-membership, hostile placement, stored spell invocation, and stored
  Concentration witnesses instead of duplicating map, object, or stored-spell
  state in a generic spell-id adapter.

Acceptance:

- Glyph of Warding has a supported or explicitly narrower profile/owner boundary
  whose typed facts cover every represented Surface glyph clause.
- Runtime support, if added, consumes typed Surface/profile facts and explicit
  table witnesses rather than authored spell identity.
- Stored spell release and Concentration override are not collapsed into an
  ordinary immediate spell cast or ordinary Concentration ownership rule.

Verification:

- Shared lane verification.
- Focused owner-package tests, and if battle-runtime behavior changes, update
  the relevant QNT/spec first and run focused MBT per `AGENTS.md`.
