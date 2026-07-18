# Ralph Full Level 1-9 Lane D: Spell Frontier

> **Historical execution format:** the `ralph-task-index` below belongs to the
> one-off shell harness. It is retained as evidence, not as an input or
> compatibility contract for the new Ralph orchestrator.

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    { "number": 1, "id": "L19E-01-L5-AREA-SAVE-DAMAGE", "status": "already-applied", "title": "Promote level-5 area save-damage spell profiles" },
    { "number": 2, "id": "L19E-02-L5-SAVE-CONDITION-CONTROL", "status": "already-applied", "title": "Promote level-5 save-gated condition and control spell profiles" },
    { "number": 3, "id": "L19E-03-L5-ACTIVE-AREA-HAZARD", "status": "already-applied", "title": "Promote level-5 active area hazard spell profiles" },
    { "number": 4, "id": "L19E-04-L5-BARRIER-WALL", "status": "already-applied", "title": "Promote level-5 barrier and wall spell profiles" },
    { "number": 5, "id": "L19E-05-L5-SUMMONED-OBJECT-LIFECYCLE", "status": "already-applied", "title": "Promote level-5 summoned and object lifecycle spell profiles" },
    { "number": 6, "id": "L19E-06-L5-RESTORATION-DEATH", "status": "already-applied", "title": "Promote level-5 restoration and death-state spell profiles" },
    { "number": 7, "id": "L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION", "status": "already-applied", "title": "Promote level-5 divination, social, and exploration spell profiles" },
    { "number": 8, "id": "L19E-08-L5-TELEPORT-TRAVEL", "status": "already-applied", "title": "Promote level-5 teleport and travel spell profiles" }
  ]
}
-->

## Lane Scope

Lane D owns spell-level-5 support grouped by durable owner. A spell row must end
with battle runtime support, Character Sheet/session support, MCP/table-facing
support, or an explicit product rejection represented in checker data.

This lane is complete only after spell-level-5 rows have playable support or
checker-enforced product rejections and the strict level-1-9 gate stops
reporting them as blockers.

Canonical task bodies are in `plans/RALPH_FULL_LEVEL1_9_SUPPORT.md`.

## Implementation Convergence

This lane must turn spell-level-5 rows into runnable battle, Character
Sheet/session, MCP, or table-facing support. Discovery about which durable owner
applies is only an intermediate step; the run must continue into the owner
change and evidence row that closes the strict blocker.

If a spell-level-5 blocker is runnable, implement the spell owner path and its
verification before stopping. A classification table, owner-routing note, or
refreshed blocker list is incomplete.

## Task DAG

| Task | Depends on | Output |
| --- | --- | --- |
| L19E-01-L5-AREA-SAVE-DAMAGE | L19B-02-MISSING-L5-SPELL-DHALL-BATCH, L19C-03-LEVEL9-SPELL-ACCESS | Area save-damage spell evidence, such as `cone_of_cold` and `flame_strike` if generated. |
| L19E-02-L5-SAVE-CONDITION-CONTROL | L19B-02-MISSING-L5-SPELL-DHALL-BATCH, L19C-03-LEVEL9-SPELL-ACCESS | Save-gated condition/control support for generated level-5 rows. |
| L19E-03-L5-ACTIVE-AREA-HAZARD | L19B-02-MISSING-L5-SPELL-DHALL-BATCH, L19C-03-LEVEL9-SPELL-ACCESS | Active hazard lifecycle and trigger evidence. |
| L19E-04-L5-BARRIER-WALL | L19B-02-MISSING-L5-SPELL-DHALL-BATCH, L19C-03-LEVEL9-SPELL-ACCESS | Barrier/wall lifecycle, crossing, cover, and placement evidence. |
| L19E-05-L5-SUMMONED-OBJECT-LIFECYCLE | L19B-02-MISSING-L5-SPELL-DHALL-BATCH, L19C-03-LEVEL9-SPELL-ACCESS | Summoned/object occurrence identity and command/control evidence. |
| L19E-06-L5-RESTORATION-DEATH | L19B-02-MISSING-L5-SPELL-DHALL-BATCH, L19C-03-LEVEL9-SPELL-ACCESS | Restoration/death-state Character Sheet or session support. |
| L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION | L19B-02-MISSING-L5-SPELL-DHALL-BATCH, L19C-03-LEVEL9-SPELL-ACCESS, L19C-04-CONTACT-PATRON-SHEET-SESSION | Divination/social/exploration session and MCP support. |
| L19E-08-L5-TELEPORT-TRAVEL | L19B-02-MISSING-L5-SPELL-DHALL-BATCH, L19C-03-LEVEL9-SPELL-ACCESS | Teleport/travel table-facing support. |

## Required Verification

- RAW/ubiquitous-language review for every admitted spell.
- Focused runtime/QNT/MBT for battle-owned support.
- Focused Character Sheet/session/MCP tests for nonbattle support.
- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`

## Forbidden Shortcuts

- Do not group by authored spell identity when a durable owner exists.
- Do not close a row by saying "not battle runtime" without a playable owner.
- Do not duplicate map, object, creature, or condition state inside spell reducers.
- Do not stop after classifying spell blockers while a spell owner change remains
  runnable.
