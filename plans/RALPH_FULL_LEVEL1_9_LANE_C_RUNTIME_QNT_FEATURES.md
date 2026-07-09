# Ralph Full Level 1-9 Lane C: Runtime and QNT Features

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    { "number": 1, "id": "L19C-01-LEVEL9-PROGRESSION-SHEET-FACTS", "status": "already-applied", "title": "Implement level-9 character progression and Character Sheet facts" },
    { "number": 2, "id": "L19C-02-RANGER-EXPERTISE-GENERIC-OWNER", "status": "already-applied", "title": "Admit Ranger Expertise through the generic Expertise owner" },
    { "number": 3, "id": "L19C-03-LEVEL9-SPELL-ACCESS", "status": "already-applied", "title": "Implement level-9 spell access for full casters, Warlock, Paladin, and Ranger" },
    { "number": 4, "id": "L19C-04-CONTACT-PATRON-SHEET-SESSION", "status": "already-applied", "title": "Implement Warlock Contact Patron sheet resource and nonbattle session support" },
    { "number": 5, "id": "L19D-01-BRUTAL-STRIKE-RECKLESS-DAMAGE", "status": "already-applied", "title": "Promote Brutal Strike Reckless Attack opt-out and extra damage" },
    { "number": 6, "id": "L19D-02-BRUTAL-STRIKE-FORCEFUL-BLOW", "status": "already-applied", "title": "Promote Forceful Blow push and Barbarian movement" },
    { "number": 7, "id": "L19D-03-BRUTAL-STRIKE-HAMSTRING", "status": "already-applied", "title": "Promote Hamstring Blow speed reduction" },
    { "number": 8, "id": "L19D-04-FIGHTER-INDOMITABLE", "status": "already-applied", "title": "Promote Fighter Indomitable failed-save reroll support" },
    { "number": 9, "id": "L19D-05-FIGHTER-TACTICAL-MASTER", "status": "already-applied", "title": "Promote Fighter Tactical Master mastery replacement support" },
    { "number": 10, "id": "L19D-06-PALADIN-ABJURE-FOES", "status": "already-applied", "title": "Promote Paladin Abjure Foes Channel Divinity support" },
    { "number": 11, "id": "L19D-07-MONK-ACROBATIC-MOVEMENT", "status": "already-applied", "title": "Promote Monk Acrobatic Movement support" },
    { "number": 12, "id": "L19D-08-ROGUE-SUPREME-SNEAK", "status": "already-applied", "title": "Promote Rogue Supreme Sneak Cunning Strike and Hide interaction support" }
  ]
}
-->

## Lane Scope

Lane C owns Character Sheet/progression support and level-9 class feature
runtime/QNT promotion. Runtime changes are rule-core/QNT-first; Character Sheet
and session support are used when the rule is not battle-runtime-owned.

This lane is complete only after the actual Character Sheet, runtime, QNT, and
evidence changes land and focused verification passes. Task decomposition is
allowed to keep work small; it is not a substitute for implementation.

Lane execution must continue into owner changes. A lane-only rewrite,
decomposition pass, or report refresh is incomplete unless the user explicitly
asked for planning only.

Canonical task bodies are in `plans/RALPH_FULL_LEVEL1_9_SUPPORT.md`.

## Implementation Convergence

This lane must change Character Sheet, runtime, QNT/rule-core, or evidence
owners for playable level-9 class-feature support. Decomposition is allowed only
to isolate the next executable feature subset; the run must continue into that
subset before reporting completion.

If a level-9 feature blocker is runnable, the lane output must include a real
owner change plus focused verification and regenerated evidence. A design note,
task split, or refreshed blocker list is incomplete.

## Task DAG

| Task | Depends on | Output |
| --- | --- | --- |
| L19C-01-LEVEL9-PROGRESSION-SHEET-FACTS | L19A-06-STRICT-DISPOSITION-GATE | Level-9 Proficiency Bonus, slots, Pact Slot level, preparation, and resource deltas. |
| L19C-02-RANGER-EXPERTISE-GENERIC-OWNER | L19B-01-LEVEL9-FEATURE-DHALL-GRANTS, L19C-01-LEVEL9-PROGRESSION-SHEET-FACTS | Applied: Generic Expertise owner evidence for `ranger_expertise`. |
| L19C-03-LEVEL9-SPELL-ACCESS | L19B-02-MISSING-L5-SPELL-DHALL-BATCH, L19B-03-MASS-CURE-WOUNDS-ACCESS-ADMISSION, L19C-01-LEVEL9-PROGRESSION-SHEET-FACTS | Level-5 and half-caster spell access rows. |
| L19C-04-CONTACT-PATRON-SHEET-SESSION | L19B-02-MISSING-L5-SPELL-DHALL-BATCH, L19C-01-LEVEL9-PROGRESSION-SHEET-FACTS, L19C-03-LEVEL9-SPELL-ACCESS | Applied: `warlock_contact_patron` no-slot Long Rest/session support. |
| L19D-01-BRUTAL-STRIKE-RECKLESS-DAMAGE | L19B-01-LEVEL9-FEATURE-DHALL-GRANTS, L19C-01-LEVEL9-PROGRESSION-SHEET-FACTS | Brutal Strike opt-out and extra damage support. |
| L19D-02-BRUTAL-STRIKE-FORCEFUL-BLOW | L19D-01-BRUTAL-STRIKE-RECKLESS-DAMAGE | Forceful Blow push plus Barbarian movement. |
| L19D-03-BRUTAL-STRIKE-HAMSTRING | L19D-01-BRUTAL-STRIKE-RECKLESS-DAMAGE | Hamstring speed reduction. |
| L19D-04-FIGHTER-INDOMITABLE | L19B-01-LEVEL9-FEATURE-DHALL-GRANTS, L19C-01-LEVEL9-PROGRESSION-SHEET-FACTS | Failed-Saving-Throw reroll, Fighter-level bonus, Long Rest resource, must-use-new-roll behavior. |
| L19D-05-FIGHTER-TACTICAL-MASTER | L19B-01-LEVEL9-FEATURE-DHALL-GRANTS, L19C-01-LEVEL9-PROGRESSION-SHEET-FACTS | Push/Sap/Slow mastery replacement. |
| L19D-06-PALADIN-ABJURE-FOES | L19B-01-LEVEL9-FEATURE-DHALL-GRANTS, L19C-01-LEVEL9-PROGRESSION-SHEET-FACTS | Channel Divinity Magic Action, Wisdom save, Frightened, damage-ending, duration, action restriction. |
| L19D-07-MONK-ACROBATIC-MOVEMENT | L19B-01-LEVEL9-FEATURE-DHALL-GRANTS, L19C-01-LEVEL9-PROGRESSION-SHEET-FACTS | Armor/Shield-gated vertical/liquid movement with falling semantics. |
| L19D-08-ROGUE-SUPREME-SNEAK | L19B-01-LEVEL9-FEATURE-DHALL-GRANTS, L19C-01-LEVEL9-PROGRESSION-SHEET-FACTS | Cunning Strike dice cost plus Hide Invisible end suppression. |

## Required Verification

- RAW/ubiquitous-language review before modeling.
- Focused Character Sheet and character creation tests for sheet-owned work.
- Focused QNT/runtime tests for battle-owned work.
- Focused MBT only after runtime/QNT implementation, following the repo MBT protocol.
- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`

## Forbidden Shortcuts

- Do not dispatch on class or feature authored identity in runtime reducers.
- Do not duplicate progression, resource, condition, movement, or spell-access state.
- Do not run MBT for exploratory questions.
- Do not end with a design note or owner split while a feature subset remains
  runnable.
