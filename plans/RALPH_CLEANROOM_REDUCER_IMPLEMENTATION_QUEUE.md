# Ralph Cleanroom Reducer Implementation Queue

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "CRPI-READY-001",
      "status": "done",
      "title": "Implement route replay: battle-runtime-ability-check-choice-search"
    },
    {
      "number": 2,
      "id": "CRPI-BLOCK-001",
      "status": "done",
      "title": "Implement route replay: battle-runtime-adrenaline-rush"
    },
    {
      "number": 3,
      "id": "CRPI-BLOCK-002",
      "status": "done",
      "title": "Implement route replay: battle-runtime-after-hit-damage-riders"
    },
    {
      "number": 4,
      "id": "CRPI-BLOCK-003",
      "status": "done",
      "title": "Implement route replay: battle-runtime-attack-spell-shape-selected-identity"
    },
    {
      "number": 5,
      "id": "CRPI-READY-002",
      "status": "done",
      "title": "Implement route replay: battle-runtime-chained-attack-sequence"
    },
    {
      "number": 6,
      "id": "CRPI-BLOCK-004",
      "status": "done",
      "title": "Blocked route replay: battle-runtime-command-option-next-turn"
    },
    {
      "number": 7,
      "id": "CRPI-READY-003",
      "status": "done",
      "title": "Implement route replay: battle-runtime-command-ordering"
    },
    {
      "number": 8,
      "id": "CRP07-DSR-05",
      "status": "done",
      "title": "Concentration break teardown through public battle reducer route"
    },
    {
      "number": 9,
      "id": "CRPI-BLOCK-005",
      "status": "done",
      "title": "Blocked route replay: battle-runtime-condition-saving-throw-selected-identity"
    },
    {
      "number": 10,
      "id": "CRPI-BLOCK-006",
      "status": "done",
      "title": "Blocked route replay: battle-runtime-creature-type-protection-and-charm-selected-identity"
    },
    {
      "number": 11,
      "id": "CRPI-BLOCK-007",
      "status": "done",
      "title": "Blocked route replay: battle-runtime-danger-sense-selected-identity"
    },
    {
      "number": 12,
      "id": "CRP07-DSR-04",
      "status": "done",
      "title": "Death Saving Throw lifecycle through public battle reducer route"
    },
    {
      "number": 13,
      "id": "CRPI-BLOCK-008",
      "status": "done",
      "title": "Blocked route replay: battle-runtime-dragonborn-breath-weapon"
    },
    {
      "number": 14,
      "id": "CRPI-BLOCK-009",
      "status": "done",
      "title": "Blocked route replay: battle-runtime-druid-wild-shape-form-lifecycle"
    },
    {
      "number": 15,
      "id": "CRPI-READY-004",
      "status": "done",
      "title": "Implement route replay: battle-runtime-eldritch-blast"
    },
    {
      "number": 16,
      "id": "CRPI-BLOCK-010",
      "status": "done",
      "title": "Blocked route replay: battle-runtime-feature-selected-identity"
    },
    {
      "number": 17,
      "id": "CRPI-BLOCK-011",
      "status": "done",
      "title": "Blocked route replay: battle-runtime-find-familiar-companion-lifecycle"
    },
    {
      "number": 18,
      "id": "CRPI-BLOCK-012",
      "status": "done",
      "title": "Blocked route replay: battle-runtime-find-familiar-selected-identity"
    },
    {
      "number": 19,
      "id": "CRPI-BLOCK-013",
      "status": "done",
      "title": "Blocked route replay: battle-runtime-halfling-nimbleness-selected-identity"
    },
    {
      "number": 20,
      "id": "CRPI-BLOCK-014",
      "status": "done",
      "title": "Blocked route replay: battle-runtime-healing-stabilization-selected-identity"
    },
    {
      "number": 21,
      "id": "CRP07-DSR-03",
      "status": "done",
      "title": "Hit Point restoration ordering and zero-HP cleanup through public battle reducer route"
    },
    {
      "number": 22,
      "id": "CRPI-READY-005",
      "status": "done",
      "title": "Implement route replay: battle-runtime-interrupt-stack-resume"
    },
    {
      "number": 23,
      "id": "CRPI-BLOCK-015",
      "status": "done",
      "title": "Implement route replay: battle-runtime-level1-buff-mark-smite-selected-identity"
    },
    {
      "number": 24,
      "id": "CRPI-BLOCK-016",
      "status": "done",
      "title": "Implement route replay: battle-runtime-level1-damage-spell-selected-identity"
    },
    {
      "number": 25,
      "id": "CRPI-BLOCK-017",
      "status": "done",
      "title": "Implement route replay: battle-runtime-level1-spatial-witness-selected-identity"
    },
    {
      "number": 26,
      "id": "CRPI-BLOCK-018",
      "status": "done",
      "title": "Implement route replay: battle-runtime-level2-damage-spell-selected-identity"
    },
    {
      "number": 27,
      "id": "CRPI-BLOCK-019",
      "status": "done",
      "title": "Implement route replay: battle-runtime-level2-control-spell-selected-identity"
    },
    {
      "number": 28,
      "id": "CRPI-BLOCK-020",
      "status": "done",
      "title": "Implement route replay: battle-runtime-mage-armor-selected-identity"
    },
    {
      "number": 29,
      "id": "CRP07-DSR-01",
      "status": "done",
      "title": "Magic Missile allocation and damage through public battle reducer route"
    },
    {
      "number": 30,
      "id": "CRPI-BLOCK-021",
      "status": "done",
      "title": "Implement route replay: battle-runtime-movement-forced-movement-selected-identity"
    },
    {
      "number": 31,
      "id": "CRPI-READY-006",
      "status": "done",
      "title": "Implement route replay: battle-runtime-quickened-spell-governor"
    },
    {
      "number": 32,
      "id": "CRPI-READY-007",
      "status": "done",
      "title": "Implement route replay: battle-runtime-reaction-casting-time"
    },
    {
      "number": 33,
      "id": "CRPI-BLOCK-022",
      "status": "ready-for-research",
      "title": "Implement route replay: battle-runtime-reaction-spell-selected-identity"
    },
    {
      "number": 34,
      "id": "CRPI-BLOCK-023",
      "status": "blocked",
      "title": "Blocked route replay: battle-runtime-reducer-spine-contract"
    },
    {
      "number": 35,
      "id": "CRPI-READY-008",
      "status": "done",
      "title": "Implement route replay: battle-runtime-roll-modifier-active-effects"
    },
    {
      "number": 36,
      "id": "CRPI-BLOCK-024",
      "status": "ready-for-research",
      "title": "Implement route replay: battle-runtime-roll-modifier-buff-selected-identity"
    },
    {
      "number": 37,
      "id": "CRPI-BLOCK-025",
      "status": "ready-for-research",
      "title": "Implement route replay: battle-runtime-sanctuary-selected-identity"
    },
    {
      "number": 38,
      "id": "CRP07-DSR-02",
      "status": "done",
      "title": "Save-gated spell ordering through public battle reducer route"
    },
    {
      "number": 39,
      "id": "CRP07-DSR-06",
      "status": "done",
      "title": "Scalar-buff active effects through public battle reducer route"
    },
    {
      "number": 40,
      "id": "CRPI-READY-009",
      "status": "done",
      "title": "Implement route replay: battle-runtime-scalar-buff"
    },
    {
      "number": 41,
      "id": "CRPI-READY-010",
      "status": "blocked",
      "title": "Implement route replay: battle-runtime-sleep-repeat-save"
    },
    {
      "number": 42,
      "id": "CRPI-READY-011",
      "status": "blocked",
      "title": "Implement route replay: battle-runtime-sorcerer-metamagic-careful-selected-identity"
    },
    {
      "number": 43,
      "id": "CRPI-READY-012",
      "status": "done",
      "title": "Implement route replay: battle-runtime-sorcerer-metamagic-distant-selected-identity"
    },
    {
      "number": 44,
      "id": "CRPI-READY-013",
      "status": "done",
      "title": "Implement route replay: battle-runtime-sorcerer-metamagic-empowered-selected-identity"
    },
    {
      "number": 45,
      "id": "CRPI-READY-014",
      "status": "done",
      "title": "Implement route replay: battle-runtime-sorcerer-metamagic-extended-selected-identity"
    },
    {
      "number": 46,
      "id": "CRPI-READY-015",
      "status": "done",
      "title": "Implement route replay: battle-runtime-sorcerer-metamagic-heightened-selected-identity"
    },
    {
      "number": 47,
      "id": "CRPI-READY-016",
      "status": "done",
      "title": "Implement route replay: battle-runtime-sorcerer-metamagic-seeking-selected-identity"
    },
    {
      "number": 48,
      "id": "CRPI-READY-017",
      "status": "done",
      "title": "Implement route replay: battle-runtime-sorcerer-metamagic-selected-identity"
    },
    {
      "number": 49,
      "id": "CRPI-READY-018",
      "status": "done",
      "title": "Implement route replay: battle-runtime-sorcerer-metamagic-spell-attack-selected-identity"
    },
    {
      "number": 50,
      "id": "CRPI-READY-019",
      "status": "done",
      "title": "Implement route replay: battle-runtime-sorcerer-metamagic-spell-attack-sequence-selected-identity"
    },
    {
      "number": 51,
      "id": "CRPI-READY-020",
      "status": "done",
      "title": "Implement route replay: battle-runtime-sorcerer-metamagic-subtle-selected-identity"
    },
    {
      "number": 52,
      "id": "CRPI-READY-021",
      "status": "done",
      "title": "Implement route replay: battle-runtime-sorcerer-metamagic-transmuted-selected-identity"
    },
    {
      "number": 53,
      "id": "CRPI-READY-022",
      "status": "done",
      "title": "Implement route replay: battle-runtime-sorcerer-metamagic-twinned-selected-identity"
    },
    {
      "number": 54,
      "id": "CRPI-BLOCK-026",
      "status": "done",
      "title": "Implement route replay: battle-runtime-species-passive-trait-selected-identity"
    },
    {
      "number": 55,
      "id": "CRPI-BLOCK-027",
      "status": "done",
      "title": "Implement route replay: battle-runtime-spell-attack-ordering"
    },
    {
      "number": 56,
      "id": "CRPI-BLOCK-028",
      "status": "done",
      "title": "Implement route replay: battle-runtime-starry-wisp-object"
    },
    {
      "number": 57,
      "id": "CRPI-BLOCK-029",
      "status": "done",
      "title": "Implement route replay: battle-runtime-stat-block-action-ordering"
    },
    {
      "number": 58,
      "id": "CRPI-BLOCK-030",
      "status": "done",
      "title": "Implement route replay: battle-runtime-stat-block-multi-damage"
    },
    {
      "number": 59,
      "id": "CRPI-BLOCK-031",
      "status": "done",
      "title": "Implement route replay: battle-runtime-stat-block-size-gated-condition-rider"
    },
    {
      "number": 60,
      "id": "CRPI-BLOCK-032",
      "status": "done",
      "title": "Implement route replay: battle-runtime-thaumaturgy-selected-identity"
    },
    {
      "number": 61,
      "id": "CRPI-READY-023",
      "status": "done",
      "title": "Implement route replay: battle-runtime-turn-boundary-effect-lifecycle"
    },
    {
      "number": 62,
      "id": "CRPI-BLOCK-033",
      "status": "done",
      "title": "Implement route replay: battle-runtime-weapon-attack-ordering"
    },
    {
      "number": 63,
      "id": "CRPI-BLOCK-034",
      "status": "done",
      "title": "Implement route replay: battle-runtime-weapon-attack-skeleton"
    },
    {
      "number": 64,
      "id": "CRPI-BLOCK-035",
      "status": "done",
      "title": "Implement route replay: battle-runtime-weapon-hosted-attack-and-riders"
    },
    {
      "number": 65,
      "id": "CRPI-READY-024",
      "status": "done",
      "title": "Implement route replay: battle-runtime-weapon-mastery-selected-identity"
    },
    {
      "number": 66,
      "id": "CRPI-READY-025",
      "status": "done",
      "title": "Implement route replay: battle-runtime-zero-hit-point-mid-resolution"
    },
    {
      "number": 67,
      "id": "CRPI-BLOCK-036",
      "status": "ready-for-research",
      "title": "Implement route replay: creature-attack"
    },
    {
      "number": 68,
      "id": "CRPI-READY-026",
      "status": "done",
      "title": "Implement route replay: rule-core-ability-skill-command"
    },
    {
      "number": 69,
      "id": "CRPI-READY-027",
      "status": "done",
      "title": "Implement route replay: rule-core-attack-damage-disposition"
    },
    {
      "number": 70,
      "id": "CRPI-READY-028",
      "status": "done",
      "title": "Implement route replay: rule-core-features"
    },
    {
      "number": 71,
      "id": "CRPI-READY-029",
      "status": "done",
      "title": "Implement route replay: rule-core-hit-point-damage"
    },
    {
      "number": 72,
      "id": "CRPI-READY-030",
      "status": "done",
      "title": "Implement route replay: rule-core-movement"
    },
    {
      "number": 73,
      "id": "CRPI-READY-031",
      "status": "done",
      "title": "Implement route replay: rule-core-reactions"
    },
    {
      "number": 74,
      "id": "CRPI-READY-032",
      "status": "done",
      "title": "Implement route replay: rule-core-shove-outcome"
    },
    {
      "number": 75,
      "id": "CRPI-READY-033",
      "status": "done",
      "title": "Implement route replay: split rule-core spell connectors"
    },
    {
      "number": 76,
      "id": "CRPI-BLOCK-037",
      "status": "blocked",
      "title": "Blocked route replay: rule-core-exact-damage-projection"
    },
    {
      "number": 77,
      "id": "CRPI-READY-034",
      "status": "done",
      "title": "Implement route replay: rule-core-stat-block-controls"
    },
    {
      "number": 78,
      "id": "CRP05-SBE-01",
      "status": "done",
      "title": "Character sheet projection and composed battle runtime entry"
    },
    {
      "number": 79,
      "id": "CRPI-BLOCK-038",
      "status": "done",
      "title": "Implement route replay: character-battle-origin-feat-selected-identity"
    },
    {
      "number": 80,
      "id": "CRP05-SBE-02",
      "status": "done",
      "title": "Sheet-derived battle acts and source-exact spell-slot settlement"
    },
    {
      "number": 81,
      "id": "CRP06-SRO-01",
      "status": "done",
      "title": "Battle-to-sheet settlement and source-exact resource deltas"
    },
    {
      "number": 82,
      "id": "CRPI-BLOCK-039",
      "status": "done",
      "title": "Implement route replay: character-layer-projection-lifecycle"
    },
    {
      "number": 83,
      "id": "CRPI-BLOCK-040",
      "status": "done",
      "title": "Implement route replay: character-sheet-feature-resources"
    },
    {
      "number": 84,
      "id": "CRPI-BLOCK-041",
      "status": "done",
      "title": "Implement route replay: character-creation-class-feature-projections"
    },
    {
      "number": 85,
      "id": "CRPI-BLOCK-042",
      "status": "done",
      "title": "Implement route replay: character-creation-class-feature-selected-identity"
    },
    {
      "number": 86,
      "id": "CRPI-BLOCK-043",
      "status": "done",
      "title": "Implement route replay: character-creation-cleric-druid-order-selected-identity"
    },
    {
      "number": 87,
      "id": "CRPI-BLOCK-044",
      "status": "done",
      "title": "Implement route replay: character-creation-fighter-fighting-style-selected-identity"
    },
    {
      "number": 88,
      "id": "CRPI-BLOCK-045",
      "status": "done",
      "title": "Implement route replay: character-creation-rogue-expertise-selected-identity"
    },
    {
      "number": 89,
      "id": "CRP04-CCF-01",
      "status": "done",
      "title": "Character creation accepted fill batches, hole rediscovery, and finalization"
    },
    {
      "number": 90,
      "id": "CRP04-CCF-02",
      "status": "done",
      "title": "Character creation stale revision, duplicate fill, wrong-kind, and closed-hole rejection"
    },
    {
      "number": 91,
      "id": "CRP04-CCF-03",
      "status": "done",
      "title": "Character creation choice cardinality and support-profile rejection"
    },
    {
      "number": 92,
      "id": "CRPI-BLOCK-046",
      "status": "done",
      "title": "Implement route replay: character-creation-warlock-eldritch-invocations-selected-identity"
    },
    {
      "number": 93,
      "id": "CRPI-BLOCK-047",
      "status": "done",
      "title": "Implement route replay: character-creation-weapon-mastery-containers-selected-identity"
    },
    {
      "number": 94,
      "id": "CRPI-BLOCK-048",
      "status": "done",
      "title": "Implement route replay: character-sheet-ability-check-proficiency-bonus"
    },
    {
      "number": 95,
      "id": "CRPI-BLOCK-049",
      "status": "done",
      "title": "Implement route replay: character-sheet-arcane-recovery-selected-identity"
    },
    {
      "number": 96,
      "id": "CRPI-BLOCK-050",
      "status": "done",
      "title": "Implement route replay: character-sheet-armor-class-base-selected-identity"
    },
    {
      "number": 97,
      "id": "CRPI-BLOCK-051",
      "status": "done",
      "title": "Implement route replay: character-sheet-class-feature-selected-identity"
    },
    {
      "number": 98,
      "id": "CRPI-BLOCK-052",
      "status": "done",
      "title": "Implement route replay: character-sheet-healing-resource-selected-identity"
    },
    {
      "number": 99,
      "id": "CRPI-BLOCK-053",
      "status": "done",
      "title": "Implement route replay: character-sheet-hit-point-maximum"
    },
    {
      "number": 100,
      "id": "CRP06-SRO-02",
      "status": "done",
      "title": "Character Sheet rest, Hit Point, and Hit Dice owner boundaries"
    },
    {
      "number": 101,
      "id": "CRP06-SRO-03",
      "status": "done",
      "title": "Character Sheet Spell Slot, Pact Slot, and rest-triggered recovery owners"
    },
    {
      "number": 102,
      "id": "CRPI-BLOCK-054",
      "status": "done",
      "title": "Implement route replay: character-sheet-spellbook-ritual-selected-identity"
    },
    {
      "number": 103,
      "id": "CRPI-BLOCK-055",
      "status": "done",
      "title": "Implement route replay: character-sheet-weapon-mastery-containers-selected-identity"
    }
  ]
}
-->

## Purpose

This is the executable follow-on Ralph queue produced by `CRP-09-CLOSEOUT-EXPANDED-QUEUE`. It promotes every row from `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json` into either a runnable implementation task or an explicit blocked task. The source backlog remains the machine-readable denominator; this file is the Ralph launch plan.

## Queue Accounting

- Backlog denominator rows: 101.
- Route classes: reducer-routed 75, catalog-after-substrate 15, replay-refresh-only 1, component-first 10.
- Generated queue tasks: 103.
- Runnable tasks: 27.
- Blocked tasks: 4.
- Queue statuses: done 72, ready-for-research 27, blocked 4.

The final queue has more tasks than the provisional nine-task bootstrap because the provisional plan was a bootstrap program, not the implementation denominator. The 107 backlog rows map into 103 Ralph tasks because the character-creation full vertical row intentionally splits into three fill-batch tasks while other related rows are grouped by owner/package task shape. The former `owner-todo` rows have been resolved into durable-owner runnable tasks where current route inventory and source evidence are sufficient; the remaining blocked rows are explicit source-corpus or replay-refresh blockers.

## Global Rules

- Use pnpm, never npm.
- Implement from copied cleanroom inputs, local RAW, `UBIQUITOUS_LANGUAGE.md`, route connectors, and guidance. Dirty cleanroom reports, generated summaries, target code history, and adapter-local route tables are not acceptance evidence.
- Production behavior must route by runtime shape, typed facts, capabilities, procedure state, and durable state. It must not branch on authored ids, fixture labels, QNT branch names, witness field names, official catalog identity, or connector filenames.
- For rule-bearing tasks, read the relevant local `.references/srd-5.2.1/` passages and `UBIQUITOUS_LANGUAGE.md` before implementation. If the exact passage is missing, block rather than browsing external rules sources.
- Battle MBT is not a planning verification lane. Run only the target replay and focused verification named by the selected implementation task.

## DAG

| Task | Status | Depends On | Output |
| --- | --- | --- | --- |
| `CRPI-READY-001` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-001` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-002` | `done` | blocked by task body | blocker resolution before implementation |
| `CRPI-BLOCK-003` | `done` | none | target replay evidence and owner implementation |
| `CRPI-READY-002` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-004` | `done` | none | target replay evidence and owner implementation |
| `CRPI-READY-003` | `done` | none | target replay evidence and owner implementation |
| `CRP07-DSR-05` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-005` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-006` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-007` | `done` | none | target replay evidence and owner implementation |
| `CRP07-DSR-04` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-008` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-009` | `done` | none | target replay evidence and owner implementation |
| `CRPI-READY-004` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-010` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-011` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-012` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-013` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-014` | `done` | none | target replay evidence and owner implementation |
| `CRP07-DSR-03` | `done` | none | target replay evidence and owner implementation |
| `CRPI-READY-005` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-015` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-016` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-017` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-018` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-019` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-020` | `done` | none | target replay evidence and owner implementation |
| `CRP07-DSR-01` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-021` | `done` | none | target replay evidence and owner implementation |
| `CRPI-READY-006` | `done` | none | target replay evidence and owner implementation |
| `CRPI-READY-007` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-022` | `ready-for-research` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-023` | `blocked` | blocked by task body | blocker resolution before implementation |
| `CRPI-READY-008` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-024` | `ready-for-research` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-025` | `ready-for-research` | none | target replay evidence and owner implementation |
| `CRP07-DSR-02` | `done` | none | target replay evidence and owner implementation |
| `CRP07-DSR-06` | `done` | none | target replay evidence and owner implementation |
| `CRPI-READY-009` | `done` | none | target replay evidence and owner implementation |
| `CRPI-READY-010` | `blocked` | source-qnt-corpus-blocker | owner/source-corpus decision before implementation |
| `CRPI-READY-011` | `blocked` | source-qnt-corpus-blocker | owner/source-corpus decision before implementation |
| `CRPI-READY-012` | `done` | none | target replay evidence and owner implementation |
| `CRPI-READY-013` | `done` | none | target replay evidence and owner implementation |
| `CRPI-READY-014` | `done` | none | target replay evidence and owner implementation |
| `CRPI-READY-015` | `done` | none | target replay evidence and owner implementation |
| `CRPI-READY-016` | `done` | none | target replay evidence and owner implementation |
| `CRPI-READY-017` | `done` | none | target replay evidence and owner implementation |
| `CRPI-READY-018` | `done` | none | target replay evidence and owner implementation |
| `CRPI-READY-019` | `done` | none | target replay evidence and owner implementation |
| `CRPI-READY-020` | `done` | none | target replay evidence and owner implementation |
| `CRPI-READY-021` | `done` | none | target replay evidence and owner implementation |
| `CRPI-READY-022` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-026` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-027` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-028` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-029` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-030` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-031` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-032` | `done` | none | target replay evidence and owner implementation |
| `CRPI-READY-023` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-033` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-034` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-035` | `done` | none | target replay evidence and owner implementation |
| `CRPI-READY-024` | `done` | none | target replay evidence and owner implementation |
| `CRPI-READY-025` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-036` | `ready-for-research` | none | target replay evidence and owner implementation |
| `CRPI-READY-026` | `done` | none | target replay evidence and owner implementation |
| `CRPI-READY-027` | `done` | none | target replay evidence and owner implementation |
| `CRPI-READY-028` | `done` | none | target replay evidence and owner implementation |
| `CRPI-READY-029` | `done` | none | target replay evidence and owner implementation |
| `CRPI-READY-030` | `done` | none | target replay evidence and owner implementation |
| `CRPI-READY-031` | `done` | none | target replay evidence and owner implementation |
| `CRPI-READY-032` | `done` | none | target replay evidence and owner implementation |
| `CRPI-READY-033` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-037` | `blocked` | blocked by task body | blocker resolution before implementation |
| `CRPI-READY-034` | `done` | none | target replay evidence and owner implementation |
| `CRP05-SBE-01` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-038` | `done` | none | target replay evidence and owner implementation |
| `CRP05-SBE-02` | `done` | none | target replay evidence and owner implementation |
| `CRP06-SRO-01` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-039` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-040` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-041` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-042` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-043` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-044` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-045` | `done` | none | target replay evidence and owner implementation |
| `CRP04-CCF-01` | `done` | none | target replay evidence and owner implementation |
| `CRP04-CCF-02` | `done` | none | target replay evidence and owner implementation |
| `CRP04-CCF-03` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-046` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-047` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-048` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-049` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-050` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-051` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-052` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-053` | `done` | none | target replay evidence and owner implementation |
| `CRP06-SRO-02` | `done` | none | target replay evidence and owner implementation |
| `CRP06-SRO-03` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-054` | `done` | none | target replay evidence and owner implementation |
| `CRPI-BLOCK-055` | `done` | none | target replay evidence and owner implementation |

## Task Details

### Task 1 - CRPI-READY-001

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-ability-check-choice-search.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-ability-check-choice-search.mbt.qnt`
- `packages/battle-runtime/battle-runtime-ability-check-choice-search.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-READY-001.json`, `tasks/history/CRPI-READY-001/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-ability-check-choice-search.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-ability-check-choice-search.route.mbt.qnt`
- Durable Owner: BattleState owns Search action resources, target admission progress, hidden-target reveal state, roll-modifier active effects, and Concentration; hidden candidate discovery, vicinity, target admission facts, and roll totals remain table/caller boundary fills.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-ability-check-choice-search.mbt.qnt` and `packages/battle-runtime/battle-runtime-ability-check-choice-search.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 2 - CRPI-BLOCK-001

Status: `done`

Owner Decision Applied:

Backlog row `packages/battle-runtime/battle-runtime-adrenaline-rush.mbt.qnt` now records a durable owner from the QNT route connector, route inventory, RAW/domain language, and reducer-route owner vocabulary.

Goal:

Unblock and then implement target replay for `packages/battle-runtime/battle-runtime-adrenaline-rush.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-adrenaline-rush.mbt.qnt`
- `packages/battle-runtime/battle-runtime-adrenaline-rush.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-001.json`, `tasks/history/CRPI-BLOCK-001/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-adrenaline-rush.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-adrenaline-rush.route.mbt.qnt`
- Durable Owner: BattleState owns Adrenaline Rush battle-time `UnitFeatureBonusActionRouteSubject` execution: Bonus Action availability, feature-use spend, Dash bonus movement, and Temporary Hit Point replacement. Short/Long Rest restoration remains the character sheet feature-resource owner; Speed and Proficiency Bonus remain source/unit facts supplied to the battle feature.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public battle reducer entrypoints and record observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Target Owner Notes:

- Route connector `packages/battle-runtime/battle-runtime-adrenaline-rush.route.mbt.qnt` exposes `qRoute` for `UnitFeatureBonusActionRouteSubject` through `BattleActionEconomyOwner`, `BattleFeatureResourceOwner`, `BattleMovementResourceOwner`, and `BattleTemporaryHitPointOwner`.
- Route inventory `plans/cleanroom-branch-coverage/reducer-route-inventory.json` records the same route owner chain and two source branch obligations for this driver.
- RAW and ubiquitous language split the feature into battle-time Bonus Action Dash, Movement, feature Pool/Spend, and Temporary Hit Points; restoration on Short or Long Rest is not part of this battle route replay.

Forbidden Shortcuts:

- Do not use catalog identity, fixture labels, QNT action names, or historical target reports as a substitute for owner/source evidence.
- Do not add workaround adapters or duplicate state to bypass the blocker.
- Do not move Short/Long Rest restoration into this battle route replay.
- Do not duplicate Speed or Proficiency Bonus state in BattleState when it can be supplied from existing source/unit facts.

Verification:

- Run `pnpm cleanroom-branch-coverage:check` after updating the source queue/backlog.
- Run target replay for `packages/battle-runtime/battle-runtime-adrenaline-rush.mbt.qnt` and `packages/battle-runtime/battle-runtime-adrenaline-rush.route.mbt.qnt`; require `qRoute` route-event evidence from public battle target entrypoints.
- Run RAW and ubiquitous-language review against `.references/srd-5.2.1/Character-Origins.md#Orc`, `.references/srd-5.2.1/Playing-the-Game.md#Actions`, `#Bonus Actions`, `#Temporary Hit Points`, and `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from the QNT route connector, reducer route inventory, RAW/domain language, and reducer-route owner vocabulary. This task is now runnable and still must produce its own copied `qRoute` versus public target replay evidence.

### Task 3 - CRPI-BLOCK-002

Status: `done`

Blocker Type: none

Blocker Resolution: BattleState owns after-hit damage-rider route execution as split reducer surfaces: interrupt-stack decisions; spell-slot/action-economy and feature free-cast spends; Hit Point damage; save-gated condition lifecycle; Concentration start/break/cleanup; timed active Spell Effect damage/save cleanup; escape Ability Check and condition/concentration cleanup; and illumination active-effect admission/cleanup. Source spell/profile facts, selected spell identity, slotless permission, and table/caller target or roll inputs remain source or boundary facts, not a whole-battle rider accumulator.

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-after-hit-damage-riders.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-after-hit-damage-riders.mbt.qnt`
- `packages/battle-runtime/battle-runtime-after-hit-damage-riders.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable split owners named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-002.json`, `tasks/history/CRPI-BLOCK-002/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-after-hit-damage-riders.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-after-hit-damage-riders.route.mbt.qnt`
- Durable Owner: BattleState owns after-hit damage-rider route execution as split reducer surfaces: interrupt-stack decisions; spell-slot/action-economy and feature free-cast spends; Hit Point damage; save-gated condition lifecycle; Concentration start/break/cleanup; timed active Spell Effect damage/save cleanup; escape Ability Check and condition/concentration cleanup; and illumination active-effect admission/cleanup. Source spell/profile facts, selected spell identity, slotless permission, and table/caller target or roll inputs remain source or boundary facts, not a whole-battle rider accumulator.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public battle reducer entrypoints and record observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Target Owner Notes:

- Route connector `packages/battle-runtime/battle-runtime-after-hit-damage-riders.route.mbt.qnt` exposes `AfterHitDamageRiderRouteSubject` surfaces through `BattleInterruptStackOwner`, `BattleSpellSlotAndActionEconomyOwner`, `BattleFeatureResourceOwner`, `BattleHitPointOwner`, `BattleConditionLifecycleOwner`, `BattleConcentrationOwner`, `BattleActiveEffectOwner`, and `BattleAbilityCheckOwner`.
- Route inventory `plans/cleanroom-branch-coverage/reducer-route-inventory.json` records the same generic after-hit rider owner surfaces and separates nine fixture-sequencing rows from route obligations.
- RAW and ubiquitous language split the behavior across Bonus Action/Spend, Attack Damage Rider, Damage Rolls, Hit Points, Saving Throws, Conditions, Concentration, Spell Effects, and illumination/Invisible boundaries; none of these require a separate whole-battle after-hit rider accumulator.

Forbidden Shortcuts:

- Do not use catalog identity, fixture labels, QNT action names, or historical target reports as a substitute for owner/source evidence.
- Do not add workaround adapters or duplicate state to bypass the route owners.
- Do not introduce a whole-battle after-hit rider accumulator when the connector exposes split reducer owner surfaces.
- Do not dispatch production behavior on selected spell identity; source spell/profile facts and typed route facts must drive behavior.

Verification:

- Run `pnpm cleanroom-branch-coverage:check` after updating the source queue/backlog.
- Run target replay for `packages/battle-runtime/battle-runtime-after-hit-damage-riders.mbt.qnt` and `packages/battle-runtime/battle-runtime-after-hit-damage-riders.route.mbt.qnt`; require `qRoute` route-event evidence from public battle target entrypoints.
- Run RAW and ubiquitous-language review against `.references/srd-5.2.1/Playing-the-Game.md#Bonus Actions`, `#Making an Attack`, `#Damage Rolls`, `#Hit Points`; `.references/srd-5.2.1/Spells/Gaining-and-Casting.md#Spell Slots`, `#Casting without Slots`; `.references/srd-5.2.1/Rules-Glossary.md#Concentration`, `#Restrained [Condition]`; the cited smite/strike spell passages; and `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from the QNT route connector, reducer route inventory, RAW/domain language, and reducer-route owner vocabulary. This task is now runnable and still must produce its own copied `qRoute` versus public target replay evidence.

### Task 4 - CRPI-BLOCK-003

Status: `done`

Blocker Type: none

Blocker Resolution: BattleState owns selected spell-shape execution through generic spell-attack, save-gated spell, spell-slot/action-economy, Hit Point, active Spell Effect, turn-boundary, Attack Roll mode, movement-resource, and interrupt-stack reducer surfaces. Catalog spell selection remains a composition/support-profile boundary that supplies typed procedure facts such as target shape, damage type/dice, slot requirement, save-success damage policy, attack-hit or failed-save projections, duration, scope, and carrier; production runtime must not persist or dispatch on selected spell id, name, fixture label, or branch action.

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-attack-spell-shape-selected-identity.mbt.qnt` as a `catalog-after-substrate` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-attack-spell-shape-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-spell-attack-ordering.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-hit-point-regain-prevention.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-next-attack-roll-mode.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-opportunity-attack-denial.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the generic reducer substrates named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-003.json`, `tasks/history/CRPI-BLOCK-003/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-attack-spell-shape-selected-identity.mbt.qnt`
- Route Class: `catalog-after-substrate`
- Connector Path(s): `packages/battle-runtime/battle-runtime-spell-attack-ordering.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-hit-point-regain-prevention.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-next-attack-roll-mode.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-opportunity-attack-denial.route.mbt.qnt`
- Durable Owner: BattleState owns selected spell-shape execution through generic spell-attack, save-gated spell, spell-slot/action-economy, Hit Point, active Spell Effect, turn-boundary, Attack Roll mode, movement-resource, and interrupt-stack reducer surfaces. Catalog spell selection remains a composition/support-profile boundary that supplies typed procedure facts such as target shape, damage type/dice, slot requirement, save-success damage policy, attack-hit or failed-save projections, duration, scope, and carrier; production runtime must not persist or dispatch on selected spell id, name, fixture label, or branch action.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connectors through public battle reducer entrypoints and record observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projections and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Target Owner Notes:

- Route inventory `plans/cleanroom-branch-coverage/reducer-route-inventory.json` records this row with six in-scope branch obligations, no blockers, and five generic connector paths for selected spell attack, save-gated damage, and post-hit active-effect substrates.
- `packages/battle-runtime/battle-runtime-spell-attack-ordering.route.mbt.qnt` exposes `SpellAttackRouteSubject` evidence through action-economy discovery, Target Choice and Damage Type fills, Attack Roll fills, damage dice fills, `BattleTargetSelectionOwner`, `BattleAttackRollOwner`, `BattleHitPointOwner`, and `BattleHoleFrontierOwner`.
- `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.route.mbt.qnt` exposes `SaveGatedSpellRouteSubject` evidence through spell-slot/action-economy discovery, target/list or area frontiers, Saving Throw outcome fills, damage dice fills, `BattleSavingThrowOutcomeOwner`, `BattleHitPointOwner`, and `BattleHoleFrontierOwner`.
- `packages/battle-runtime/battle-runtime-hit-point-regain-prevention.route.mbt.qnt`, `battle-runtime-next-attack-roll-mode.route.mbt.qnt`, and `battle-runtime-opportunity-attack-denial.route.mbt.qnt` expose the post-hit active Spell Effect substrates for Hit Point healing interdiction, next-Attack-Roll mode projection, Opportunity Attack reaction interdiction, turn-boundary expiration, and active-effect cleanup.
- Rule-core spell damage/profile facts reduce the SRD spell examples to typed damage, slot, save-success, hit-projection, failed-save-projection, duration, and scope facts. The selected spell identity is admissible only at catalog/selection or support-profile admission boundaries, not as production reducer dispatch.
- RAW and ubiquitous language split the behavior across Spell Invocation, Spell Effect, Attack Roll, Saving Throw, Damage Rolls, Hit Points, Healing, Advantage, Reaction, Opportunity Attack, and Action Lifecycle; none of these require a separate selected-spell durable state table.

Forbidden Shortcuts:

- Do not use catalog identity, fixture labels, QNT action names, or historical target reports as a substitute for owner/source evidence.
- Do not add workaround adapters or duplicate state to bypass the route owners.
- Do not introduce a selected-spell durable state table or replay ledger when the route evidence already exposes generic reducer owners.
- Do not dispatch production behavior on selected spell id, spell name, authored slug, source heading, fixture label, QNT branch action, or connector filename. Use support-profile facts, procedure shape, typed projections, and BattleState-owned effect state.

Verification:

- Run `pnpm cleanroom-branch-coverage:check` after updating the source queue/backlog.
- Run target replay for `packages/battle-runtime/battle-runtime-attack-spell-shape-selected-identity.mbt.qnt` and the five connector paths named in Acceptance; require `qRoute` route-event evidence from public battle target entrypoints.
- Run RAW and ubiquitous-language review against `.references/srd-5.2.1/Spells/Gaining-and-Casting.md#Saving Throws`, `#Attack Rolls`; `.references/srd-5.2.1/Playing-the-Game.md#Making an Attack`, `#Damage Rolls`, `#Hit Points`, `#Healing`, `#Opportunity Attacks`; `.references/srd-5.2.1/Rules-Glossary.md#Advantage`, `#Opportunity Attacks`, `#Reaction`; the SRD spell passages for Chill Touch, Fire Bolt, Guiding Bolt, Inflict Wounds, and Shocking Grasp; and `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from the QNT route connectors, reducer route inventory, source branch inventory, rule-core profile/projection facts, RAW/domain language, and reducer-route owner vocabulary. This task is now runnable and still must produce its own copied `qRoute` versus public target replay evidence without selected-identity dispatch.

### Task 5 - CRPI-READY-002

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt`
- `packages/battle-runtime/battle-runtime-chained-attack-sequence.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-READY-002.json`, `tasks/history/CRPI-READY-002/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-chained-attack-sequence.route.mbt.qnt`
- Durable Owner: BattleState owns the chained spell-attack procedure fill frontier through the typed spell procedure subject: damage-type choice, per-step target history, Attack Roll resolution, Hit Point damage, and leap continuation. Table-supplied spell-target and leap-range facts stay boundary fills.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt` and `packages/battle-runtime/battle-runtime-chained-attack-sequence.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 6 - CRPI-BLOCK-004

Status: `done`

Blocker Type: none

Blocker Resolution: BattleState owns Command next-turn option execution through command-effect reducer surfaces: spell-slot/action-economy discovery, hole-frontier ordering for command option, target-list, saving-throw, held-object, movement, and reaction frontiers, target selection, saving throw outcome, movement resource, condition lifecycle, creature state, object inventory, reaction discovery, turn-boundary cleanup, and active-effect cleanup. The selected Command option remains a typed fill/procedure fact, not catalog identity dispatch.

Goal:

Unblock and then implement target replay for `packages/battle-runtime/battle-runtime-command-option-next-turn.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-command-option-next-turn.mbt.qnt`
- `packages/battle-runtime/battle-runtime-command-ordering.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the Command next-turn reducer route surfaces named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-004.json`, `tasks/history/CRPI-BLOCK-004/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-command-option-next-turn.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-command-ordering.route.mbt.qnt`
- Durable Owner: BattleState owns Command next-turn option execution through command-effect reducer surfaces: spell-slot/action-economy discovery, hole-frontier ordering for command option, target-list, saving-throw, held-object, movement, and reaction frontiers, target selection, saving throw outcome, movement resource, condition lifecycle, creature state, object inventory, reaction discovery, turn-boundary cleanup, and active-effect cleanup. The selected Command option remains a typed fill/procedure fact, not catalog identity dispatch.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public battle reducer entrypoints and record observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Target Owner Notes:

- Route connector `packages/battle-runtime/battle-runtime-command-ordering.route.mbt.qnt` exposes `CommandEffectRouteSubject` from `BattleSpellSlotAndActionEconomyOwner` discovery, `BattleHoleFrontierOwner` fill ordering, `BattleTargetSelectionOwner`, `BattleSavingThrowOutcomeOwner`, movement/reaction consequences, and cleanup owners.
- RAW and ubiquitous language split Command behavior across Spell Invocation, Spell Effect, Saving Throw, Movement, Reaction, Condition, object interaction, and turn lifecycle; none of these require reducer dispatch on the selected Command option label.

Forbidden Shortcuts:

- Do not use catalog identity, fixture labels, QNT action names, or historical target reports as a substitute for owner/source evidence.
- Do not add workaround adapters or duplicate state to bypass the route owners.
- Do not dispatch production behavior on selected Command option label, spell name, authored slug, source heading, fixture label, QNT branch action, or connector filename. Use typed fills, procedure shape, and BattleState-owned effect state.

Verification:

- Run `pnpm cleanroom-branch-coverage:check` after updating the source queue/backlog.
- Run target replay for `packages/battle-runtime/battle-runtime-command-option-next-turn.mbt.qnt` and `packages/battle-runtime/battle-runtime-command-ordering.route.mbt.qnt`; require `qRoute` route-event evidence from public battle target entrypoints.
- Run RAW and ubiquitous-language review against `.references/srd-5.2.1/Spells/Descriptions-A-D.md#Command`, `.references/srd-5.2.1/Playing-the-Game.md#Movement-and-Position`, `.references/srd-5.2.1/Rules-Glossary.md#Opportunity-Attacks`, and `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from the QNT route connector, reducer route inventory, RAW/domain language, and reducer-route owner vocabulary. This task is now runnable and still must produce its own copied `qRoute` versus public target replay evidence.

### Task 7 - CRPI-READY-003

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt`
- `packages/battle-runtime/battle-runtime-command-ordering.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-READY-003.json`, `tasks/history/CRPI-READY-003/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-command-ordering.route.mbt.qnt`
- Durable Owner: BattleState owns Command pending active effects, Prone condition application, Movement spent on Approach/Flee, and interrupt-stack opening for Flee Opportunity Attack windows; held-object inventory and route geometry stay boundary fills.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt` and `packages/battle-runtime/battle-runtime-command-ordering.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 8 - CRP07-DSR-05

Status: `done`

Goal:

Concentration break teardown through public battle reducer route.

Starting Points:

- `packages/battle-runtime/battle-runtime-concentration-break-teardown.mbt.qnt`
- `packages/battle-runtime/battle-runtime-concentration-break-teardown.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-concentration.qnt`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/Rules-Glossary.md`

Output:

- Target production and quarantined harness changes in the cleanroom target for `CRP07-DSR-05`.
- `tasks/target-replay-evidence/CRP07-DSR-05.json`, `tasks/history/CRP07-DSR-05/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/BLOCKERS.md` only if a source or target blocker remains.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-concentration-break-teardown.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-concentration-break-teardown.route.mbt.qnt`
- Durable Owner: BattleState owns the concentrating source and active Spell Effect instances; Concentration cleanup routes through BattleConcentrationOwner and BattleActiveEffectOwner, and no adapter-local concentration or active-effect ledger is allowed.
- Accepted Projection(s): route projection `qRoute` from `packages/battle-runtime/battle-runtime-concentration-break-teardown.route.mbt.qnt` with comparator `route-event-list`
- Task Family: diagnostic replay
- Target replay evidence requirement: accepted evidence must be generated by public target entrypoints, record the observed projection source, and match the source connector or semantic projection named above.
- Target replay observes qRoute from start_battle, discover_battle_acts, and resolve_battle_subject for damage-save request, failed save, voluntary end, and replacement Concentration teardown.
- Failed-save and voluntary-end cleanup resolve Concentration before active Spell Effect removal; replacement resolves prior cleanup before recording the new active effect and Concentration owner.
- Concentration and active Spell Effect teardown are durable BattleState owner behavior, not adapter-local ledgers.

Target Owner Notes:

- BattleConcentrationOwner owns the concentrating source, save request, voluntary end, replacement break, and broken Concentration fact.
- BattleActiveEffectOwner owns active Spell Effect instance cleanup and replacement recording after Concentration ownership resolves.

Forbidden Shortcuts:

- Do not keep a route-local Concentration or active-effect ledger to satisfy replay.
- Do not branch teardown on spell identity, fixture label, or sampled input names.

Verification:

- Run target replay for packages/battle-runtime/battle-runtime-concentration-break-teardown.mbt.qnt and packages/battle-runtime/battle-runtime-concentration-break-teardown.route.mbt.qnt and require qRoute comparator route-event-list from public reducer entrypoints.
- Run RAW and domain-language review against .references/srd-5.2.1/Rules-Glossary.md#Concentration, UBIQUITOUS_LANGUAGE.md#Spellcasting, and plans/cleanroom-guidance/reducer-spine.md.
- Run pnpm cleanroom-branch-coverage:check.
- Run git diff --check.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 9 - CRPI-BLOCK-005

Status: `done`

Blocker Type: none

Blocker Resolution: BattleState owns selected condition-saving-throw and repeat-save condition spell execution through save-gated spell, repeat-save condition effect, condition-rider, target-selection, saving-throw outcome, action-economy, active-effect, Concentration, condition-lifecycle, and Hit Point/zero-HP reducer surfaces. Selected spell identity remains a catalog/support-profile admission input, not production reducer dispatch.

Goal:

Unblock and then implement target replay for `packages/battle-runtime/battle-runtime-condition-saving-throw-selected-identity.mbt.qnt` as a `catalog-after-substrate` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-condition-saving-throw-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-sleep-repeat-save.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-condition-riders.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production and quarantined harness changes for the unblocked owner surfaces named below.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-condition-saving-throw-selected-identity.mbt.qnt`
- Route Class: `catalog-after-substrate`
- Connector Path(s): `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-sleep-repeat-save.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-condition-riders.route.mbt.qnt`
- Durable Owner: BattleState owns selected condition-saving-throw and repeat-save condition spell execution through save-gated spell, repeat-save condition effect, condition-rider, target-selection, saving-throw outcome, action-economy, active-effect, Concentration, condition-lifecycle, and Hit Point/zero-HP reducer surfaces. Selected spell identity remains a catalog/support-profile admission input, not production reducer dispatch.
- Required Accepted Projection: `qRoute`
- Target replay evidence requirement: after unblock, evidence must be generated by public target entrypoints and record observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Target Owner Notes:

- Route connectors `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-sleep-repeat-save.route.mbt.qnt`, and `packages/battle-runtime/battle-runtime-condition-riders.route.mbt.qnt` expose SaveGatedSpellRouteSubject, RepeatSaveConditionEffectRouteSubject, and ConditionRiderRouteSubject evidence through generic spell, Saving Throw, condition lifecycle, active-effect, Concentration, and Hit Point owners.
- RAW/domain evidence covers Color Spray, Blindness/Deafness, Entangle, Sleep, Hold Person, Hideous Laughter, condition glossary entries, Concentration, Saving Throw, Condition, Spell Effect, and Turn Structure; none require selected spell identity dispatch.

Forbidden Shortcuts:

- Do not use catalog identity, fixture labels, QNT action names, or historical target reports as a substitute for owner/source evidence.
- Do not add workaround adapters or duplicate state to bypass the blocker.

Verification:

- Run `pnpm cleanroom-branch-coverage:check` after updating the source queue/backlog.
- Run target replay for `packages/battle-runtime/battle-runtime-condition-saving-throw-selected-identity.mbt.qnt` and the connector or dependency output that resolves this blocker.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the unblocked owner plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from reducer route inventory derivability facts, QNT route connector owner evidence, RAW/domain language, and reducer-route owner vocabulary. This task is now runnable and still must produce its own copied `qRoute` versus public target replay evidence.

### Task 10 - CRPI-BLOCK-006

Status: `done`

Blocker Type: none

Blocker Resolution: BattleState owns creature-type target admission, charm application/breakage, protection active-effect admission, scoped attack/save roll modes, charm/possession prevention, Concentration, Hit Point, condition lifecycle, active effect, and creature-state reducer surfaces. Creature type and selected spell identity remain catalog/support-profile boundary facts that feed typed target admission and effect scope, not production reducer dispatch.

Goal:

Unblock and then implement target replay for `packages/battle-runtime/battle-runtime-creature-type-protection-and-charm-selected-identity.mbt.qnt` as a `catalog-after-substrate` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-creature-type-protection-and-charm-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-creature-type-protection-and-charm-selected-identity.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the protection/charm reducer surfaces named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-006.json`, `tasks/history/CRPI-BLOCK-006/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-creature-type-protection-and-charm-selected-identity.mbt.qnt`
- Route Class: `catalog-after-substrate`
- Connector Path(s): `packages/battle-runtime/battle-runtime-creature-type-protection-and-charm-selected-identity.route.mbt.qnt`
- Durable Owner: BattleState owns creature-type target admission, charm application/breakage, protection active-effect admission, scoped attack/save roll modes, charm/possession prevention, Concentration, Hit Point, condition lifecycle, active effect, and creature-state reducer surfaces. Creature type and selected spell identity remain catalog/support-profile boundary facts that feed typed target admission and effect scope, not production reducer dispatch.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public battle reducer entrypoints and record observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Target Owner Notes:

- Route connector `packages/battle-runtime/battle-runtime-creature-type-protection-and-charm-selected-identity.route.mbt.qnt` exposes `CreatureTypeTargetAdmissionRouteSubject`, `ProtectionCharmActiveEffectRouteSubject`, and `CharmSourceDamageBreakRouteSubject` through `BattleSpellSlotAndActionEconomyOwner`, `BattleTargetSelectionOwner`, `BattleSavingThrowOutcomeOwner`, `BattleConditionLifecycleOwner`, `BattleActiveEffectOwner`, `BattleHitPointOwner`, `BattleConcentrationOwner`, `BattleAttackRollOwner`, `BattleCreatureStateOwner`, and `BattleSavingThrowRollModeOwner`.
- RAW and ubiquitous language split this family across creature type target admission, Charmed condition lifecycle, Spell Effect, Concentration, Hit Points, possession/charm prevention, and D20 roll modes; none require production dispatch on selected spell identity.

Forbidden Shortcuts:

- Do not use catalog identity, fixture labels, QNT action names, or historical target reports as a substitute for owner/source evidence.
- Do not add workaround adapters or duplicate state to bypass the route owners.
- Do not dispatch production behavior on selected spell id, spell name, authored slug, source heading, fixture label, QNT branch action, or connector filename. Use support-profile facts, creature-type facts, typed effect scope, and BattleState-owned effect state.

Verification:

- Run `pnpm cleanroom-branch-coverage:check` after updating the source queue/backlog.
- Run target replay for `packages/battle-runtime/battle-runtime-creature-type-protection-and-charm-selected-identity.mbt.qnt` and `packages/battle-runtime/battle-runtime-creature-type-protection-and-charm-selected-identity.route.mbt.qnt`; require `qRoute` route-event evidence from public battle target entrypoints.
- Run RAW and ubiquitous-language review against `.references/srd-5.2.1/Spells/Descriptions-A-D.md#Animal Friendship`, `.references/srd-5.2.1/Spells/Descriptions-M-P.md#Protection from Evil and Good`, `.references/srd-5.2.1/Rules-Glossary.md#Charmed`, `.references/srd-5.2.1/Rules-Glossary.md#Possession`, `.references/srd-5.2.1/Rules-Glossary.md#Concentration`, and `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from the QNT route connector, reducer route inventory, RAW/domain language, and reducer-route owner vocabulary. This task is now runnable and still must produce its own copied `qRoute` versus public target replay evidence.

### Task 11 - CRPI-BLOCK-007

Status: `done`

Blocker Type: none

Blocker Resolution: BattleState owns Danger Sense as a passive Saving Throw roll-mode substrate: saving-throw roll mode discovery/resolution provides Dexterity save Advantage, while condition lifecycle suppresses the passive mode when the character is Incapacitated. Class feature selection remains a support/profile admission boundary, not reducer dispatch on authored identity.

Goal:

Unblock and then implement target replay for `packages/battle-runtime/battle-runtime-danger-sense-selected-identity.mbt.qnt` as a `catalog-after-substrate` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-danger-sense-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-danger-sense-substrates.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the passive Saving Throw roll-mode and Incapacitated suppression surfaces named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-007.json`, `tasks/history/CRPI-BLOCK-007/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-danger-sense-selected-identity.mbt.qnt`
- Route Class: `catalog-after-substrate`
- Connector Path(s): `packages/battle-runtime/battle-runtime-danger-sense-substrates.route.mbt.qnt`
- Durable Owner: BattleState owns Danger Sense as a passive Saving Throw roll-mode substrate: saving-throw roll mode discovery/resolution provides Dexterity save Advantage, while condition lifecycle suppresses the passive mode when the character is Incapacitated. Class feature selection remains a support/profile admission boundary, not reducer dispatch on authored identity.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public battle reducer entrypoints and record observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Target Owner Notes:

- Route connector `packages/battle-runtime/battle-runtime-danger-sense-substrates.route.mbt.qnt` exposes `PassiveSavingThrowRollModeRouteSubject` through `BattleSavingThrowRollModeOwner` discovery/resolution and `BattleConditionLifecycleOwner` suppression when Incapacitated.
- RAW and ubiquitous language split this family across Saving Throw, Advantage/Disadvantage, D20 Rolls, Condition, and Incapacitated; none require production dispatch on the Barbarian feature name.

Forbidden Shortcuts:

- Do not use catalog identity, fixture labels, QNT action names, or historical target reports as a substitute for owner/source evidence.
- Do not add workaround adapters or duplicate state to bypass the route owners.
- Do not dispatch production behavior on class feature name, authored slug, source heading, fixture label, QNT branch action, or connector filename. Use support/profile admission facts, typed Saving Throw context, and BattleState-owned condition/roll-mode state.

Verification:

- Run `pnpm cleanroom-branch-coverage:check` after updating the source queue/backlog.
- Run target replay for `packages/battle-runtime/battle-runtime-danger-sense-selected-identity.mbt.qnt` and `packages/battle-runtime/battle-runtime-danger-sense-substrates.route.mbt.qnt`; require `qRoute` route-event evidence from public battle target entrypoints.
- Run RAW and ubiquitous-language review against `.references/srd-5.2.1/Classes/Barbarian.md#Level 2: Danger Sense`, `.references/srd-5.2.1/Playing-the-Game.md#D20 Tests`, `.references/srd-5.2.1/Playing-the-Game.md#Advantage/Disadvantage`, `.references/srd-5.2.1/Rules-Glossary.md#Incapacitated`, and `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from the QNT route connector, reducer route inventory, RAW/domain language, and reducer-route owner vocabulary. This task is now runnable and still must produce its own copied `qRoute` versus public target replay evidence.

### Task 12 - CRP07-DSR-04

Status: `done`

Goal:

Death Saving Throw lifecycle through public battle reducer route.

Starting Points:

- `packages/battle-runtime/battle-runtime-death-saving-throw.mbt.qnt`
- `packages/battle-runtime/battle-runtime-death-saving-throw.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-hit-points.qnt`
- `packages/shared-algebras/proofs/rule-core/zero-hit-point-lifecycle.qnt`
- `/workspace/typescript/dnd-cleanroom-jul2/tasks/BLOCKERS.md`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `.references/srd-5.2.1/Rules-Glossary.md`

Output:

- Target production and quarantined harness changes in the cleanroom target for `CRP07-DSR-04`.
- `tasks/target-replay-evidence/CRP07-DSR-04.json`, `tasks/history/CRP07-DSR-04/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/BLOCKERS.md` only if a source or target blocker remains.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-death-saving-throw.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-death-saving-throw.route.mbt.qnt`
- Durable Owner: BattleState owns target Hit Points, Stable, Unconscious, Dead, death-save counters, turn advancement, and Death Saving Throw route progress; the adapter owns only sampled roll evidence.
- Accepted Projection(s): route projection `qRoute` from `packages/battle-runtime/battle-runtime-death-saving-throw.route.mbt.qnt` with comparator `route-event-list`
- Task Family: diagnostic replay
- Target replay evidence requirement: accepted evidence must be generated by public target entrypoints, record the observed projection source, and match the source connector or semantic projection named above.
- Target replay observes qRoute from start_battle, discover_battle_acts, and resolve_battle_subject or turn advancement for DeathSavingThrowRouteSubject discovery, fill, and wrong-actor rejection.
- Natural 1, ordinary failure, ordinary success, and natural 20 outcomes mutate battle-owned death-save counters, Stable, Unconscious, Dead, and Hit Points through the same lifecycle owner as damage and healing.
- The sampled input name roll is allowed only as target replay witness protocol tied to source evidence and adapter quarantine; no source-QNT rename is required and production runtime must not dispatch on it.

Target Owner Notes:

- BattleState owns HP, Stable, Unconscious, Dead, death-save counters, current actor/turn advancement, and the Death Saving Throw route subject.
- The adapter may record the sampled roll witness for replay evidence only; the runtime consumes a typed d20 result fact.

Forbidden Shortcuts:

- Do not implement death-save behavior as adapter replay state or as a fixture-name branch.
- Do not broaden the sampled input name roll into production vocabulary admission outside the quarantined replay evidence boundary.

Verification:

- Run target replay for packages/battle-runtime/battle-runtime-death-saving-throw.mbt.qnt and packages/battle-runtime/battle-runtime-death-saving-throw.route.mbt.qnt and require qRoute comparator route-event-list from public reducer or turn-advancement entrypoints.
- Run RAW and domain-language review against .references/srd-5.2.1/Rules-Glossary.md#Death Saving Throw, .references/srd-5.2.1/Playing-the-Game.md#Death Saving Throws, .references/srd-5.2.1/Playing-the-Game.md#Dropping to 0 Hit Points, UBIQUITOUS_LANGUAGE.md#Hit Points and Death, /workspace/typescript/dnd-cleanroom-jul2/tasks/BLOCKERS.md#T036, and plans/cleanroom-guidance/reducer-spine.md.
- Run pnpm cleanroom-branch-coverage:check.
- Run git diff --check.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 13 - CRPI-BLOCK-008

Status: `done`

Blocker Type: none

Blocker Resolution: BattleState owns Breath Weapon as an Attack-action area save damage replacement through Attack-action procedure, feature-resource use, area-shape/target selection, Saving Throw outcome, damage type, damage roll, Hit Point, and Extra Attack continuation reducer surfaces. Species trait identity remains a catalog/admission boundary that supplies typed area, damage, save, and resource facts.

Goal:

Unblock and then implement target replay for `packages/battle-runtime/battle-runtime-dragonborn-breath-weapon.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-dragonborn-breath-weapon.mbt.qnt`
- `packages/battle-runtime/battle-runtime-attack-action-area-save-damage-replacement.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production and quarantined harness changes for the unblocked owner surfaces named below.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-dragonborn-breath-weapon.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-attack-action-area-save-damage-replacement.route.mbt.qnt`
- Durable Owner: BattleState owns Breath Weapon as an Attack-action area save damage replacement through Attack-action procedure, feature-resource use, area-shape/target selection, Saving Throw outcome, damage type, damage roll, Hit Point, and Extra Attack continuation reducer surfaces. Species trait identity remains a catalog/admission boundary that supplies typed area, damage, save, and resource facts.
- Required Accepted Projection: `qRoute`
- Target replay evidence requirement: after unblock, evidence must be generated by public target entrypoints and record observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Target Owner Notes:

- Route connector `packages/battle-runtime/battle-runtime-attack-action-area-save-damage-replacement.route.mbt.qnt` exposes AttackActionAreaSaveDamageReplacementRouteSubject evidence through feature-resource, area-shape, Saving Throw outcome, damage-type, damage-roll, Hit Point, and Attack-action procedure owners.
- Extra Attack continuation routes through the generic Attack-action procedure by discovering a WeaponAttackRouteSubject, not by retaining species or trait identity.

Forbidden Shortcuts:

- Do not use catalog identity, fixture labels, QNT action names, or historical target reports as a substitute for owner/source evidence.
- Do not add workaround adapters or duplicate state to bypass the blocker.

Verification:

- Run `pnpm cleanroom-branch-coverage:check` after updating the source queue/backlog.
- Run target replay for `packages/battle-runtime/battle-runtime-dragonborn-breath-weapon.mbt.qnt` and the connector or dependency output that resolves this blocker.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the unblocked owner plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from reducer route inventory derivability facts, QNT route connector owner evidence, RAW/domain language, and reducer-route owner vocabulary. This task is now runnable and still must produce its own copied `qRoute` versus public target replay evidence.

### Task 14 - CRPI-BLOCK-009

Status: `done`

Blocker Type: none

Blocker Resolution: BattleState owns Wild Shape active-form lifecycle through action-economy, feature-resource use, Temporary Hit Points, active-effect, creature-state/stat projection, movement-resource, condition-lifecycle, Hit Point/zero-HP lifecycle, and turn-boundary reducer surfaces. Selected Beast form identity remains a catalog, known-form roster, admission, caller-selection, and SRD fixture boundary.

Goal:

Unblock and then implement target replay for `packages/battle-runtime/battle-runtime-druid-wild-shape-form-lifecycle.mbt.qnt` as a `catalog-after-substrate` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-druid-wild-shape-form-lifecycle.mbt.qnt`
- `packages/battle-runtime/battle-runtime-druid-wild-shape-form-lifecycle.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production and quarantined harness changes for the unblocked owner surfaces named below.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-druid-wild-shape-form-lifecycle.mbt.qnt`
- Route Class: `catalog-after-substrate`
- Connector Path(s): `packages/battle-runtime/battle-runtime-druid-wild-shape-form-lifecycle.route.mbt.qnt`
- Durable Owner: BattleState owns Wild Shape active-form lifecycle through action-economy, feature-resource use, Temporary Hit Points, active-effect, creature-state/stat projection, movement-resource, condition-lifecycle, Hit Point/zero-HP lifecycle, and turn-boundary reducer surfaces. Selected Beast form identity remains a catalog, known-form roster, admission, caller-selection, and SRD fixture boundary.
- Required Accepted Projection: `qRoute`
- Target replay evidence requirement: after unblock, evidence must be generated by public target entrypoints and record observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Target Owner Notes:

- Route connector `packages/battle-runtime/battle-runtime-druid-wild-shape-form-lifecycle.route.mbt.qnt` records ActiveFormLifecycleRouteSubject evidence for form assumption, reuse, turn-boundary action reset, dismissal, Incapacitated reversion, death reversion, and terminal no-op stutter.
- RAW/domain evidence covers Wild Shape, shape-shifting, Speed, Movement, creature stat projection, Temporary Hit Points, active-effect ownership, and Incapacitated/death lifecycle boundaries.

Forbidden Shortcuts:

- Do not use catalog identity, fixture labels, QNT action names, or historical target reports as a substitute for owner/source evidence.
- Do not add workaround adapters or duplicate state to bypass the blocker.

Verification:

- Run `pnpm cleanroom-branch-coverage:check` after updating the source queue/backlog.
- Run target replay for `packages/battle-runtime/battle-runtime-druid-wild-shape-form-lifecycle.mbt.qnt` and the connector or dependency output that resolves this blocker.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the unblocked owner plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from reducer route inventory derivability facts, QNT route connector owner evidence, RAW/domain language, and reducer-route owner vocabulary. This task is now runnable and still must produce its own copied `qRoute` versus public target replay evidence.

### Task 15 - CRPI-READY-004

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-eldritch-blast.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-eldritch-blast.mbt.qnt`
- `packages/battle-runtime/battle-runtime-eldritch-blast.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-READY-004.json`, `tasks/history/CRPI-READY-004/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-eldritch-blast.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-eldritch-blast.route.mbt.qnt`
- Durable Owner: BattleState owns independent spell-attack sequence progress through the typed spell procedure subject: per-beam target admission, Attack Roll resolution, Hit Point damage, and sequence continuation. Object target identity, Armor Class, range, and Hit Point facts remain table-supplied boundary fills at the object-target boundary.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-eldritch-blast.mbt.qnt` and `packages/battle-runtime/battle-runtime-eldritch-blast.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 16 - CRPI-BLOCK-010

Status: `done`

Blocker Type: none

Blocker Resolution: BattleState owns active feature spell benefits through Unit Feature bonus-action activation, feature-resource use, active-effect state, spell-slot/action-economy, target-selection, Spell Save DC projection, and spell-attack roll-mode reducer surfaces. Selected feature identity remains support/profile admission input, not production reducer dispatch.

Goal:

Unblock and then implement target replay for `packages/battle-runtime/battle-runtime-feature-selected-identity.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-feature-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-feature-selected-identity.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production and quarantined harness changes for the unblocked owner surfaces named below.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-feature-selected-identity.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-feature-selected-identity.route.mbt.qnt`
- Durable Owner: BattleState owns active feature spell benefits through Unit Feature bonus-action activation, feature-resource use, active-effect state, spell-slot/action-economy, target-selection, Spell Save DC projection, and spell-attack roll-mode reducer surfaces. Selected feature identity remains support/profile admission input, not production reducer dispatch.
- Required Accepted Projection: `qRoute`
- Target replay evidence requirement: after unblock, evidence must be generated by public target entrypoints and record observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Target Owner Notes:

- Route connector `packages/battle-runtime/battle-runtime-feature-selected-identity.route.mbt.qnt` exposes qRoute for UnitFeatureBonusActionRouteSubject, ActiveFeatureSpellSaveDcRouteSubject, and ActiveFeatureSpellAttackRollModeRouteSubject through action-economy, feature-resource, active-effect, spell-slot/action-economy, target-selection, and spell-attack procedure owners.
- RAW/domain evidence covers Innate Sorcery, Spell Save DC, spell attack rolls, Bonus Action, Spell Invocation, Spell Effect, Attack Roll, Advantage, and active feature lifecycle terms.

Forbidden Shortcuts:

- Do not use catalog identity, fixture labels, QNT action names, or historical target reports as a substitute for owner/source evidence.
- Do not add workaround adapters or duplicate state to bypass the blocker.

Verification:

- Run `pnpm cleanroom-branch-coverage:check` after updating the source queue/backlog.
- Run target replay for `packages/battle-runtime/battle-runtime-feature-selected-identity.mbt.qnt` and the connector or dependency output that resolves this blocker.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the unblocked owner plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from reducer route inventory derivability facts, QNT route connector owner evidence, RAW/domain language, and reducer-route owner vocabulary. This task is now runnable and still must produce its own copied `qRoute` versus public target replay evidence.

### Task 17 - CRPI-BLOCK-011

Status: `done`

Blocker Type: none

Blocker Resolution: BattleState owns familiar companion lifecycle, shared senses, touch spell delivery, and familiar Reaction attacks through battle companion, action-economy, spell-slot/action-economy, active-effect, stat-block action, target-selection, attack-roll, and Hit Point reducer surfaces. Companion form/spell identity remains catalog/admission/caller-selection input.

Goal:

Unblock and then implement target replay for `packages/battle-runtime/battle-runtime-find-familiar-companion-lifecycle.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-find-familiar-companion-lifecycle.mbt.qnt`
- `packages/battle-runtime/battle-runtime-find-familiar-companion-lifecycle.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production and quarantined harness changes for the unblocked owner surfaces named below.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-find-familiar-companion-lifecycle.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-find-familiar-companion-lifecycle.route.mbt.qnt`
- Durable Owner: BattleState owns familiar companion lifecycle, shared senses, touch spell delivery, and familiar Reaction attacks through battle companion, action-economy, spell-slot/action-economy, active-effect, stat-block action, target-selection, attack-roll, and Hit Point reducer surfaces. Companion form/spell identity remains catalog/admission/caller-selection input.
- Required Accepted Projection: `qRoute`
- Target replay evidence requirement: after unblock, evidence must be generated by public target entrypoints and record observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Target Owner Notes:

- Route connector `packages/battle-runtime/battle-runtime-find-familiar-companion-lifecycle.route.mbt.qnt` records CompanionLifecycleRouteSubject, CompanionSharedSensesRouteSubject, CompanionTouchDeliveryRouteSubject, and CompanionReactionAttackRouteSubject evidence through battle companion, action-economy, spell-slot/action-economy, active-effect, stat-block action, target-selection, attack-roll, and Hit Point owners.
- `packages/battle-runtime/src/companion-state.ts` stores BattleCompanions as BattleState-owned companion state rather than an adapter-local companion ledger.

Forbidden Shortcuts:

- Do not use catalog identity, fixture labels, QNT action names, or historical target reports as a substitute for owner/source evidence.
- Do not add workaround adapters or duplicate state to bypass the blocker.

Verification:

- Run `pnpm cleanroom-branch-coverage:check` after updating the source queue/backlog.
- Run target replay for `packages/battle-runtime/battle-runtime-find-familiar-companion-lifecycle.mbt.qnt` and the connector or dependency output that resolves this blocker.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the unblocked owner plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from reducer route inventory derivability facts, QNT route connector owner evidence, RAW/domain language, and reducer-route owner vocabulary. This task is now runnable and still must produce its own copied `qRoute` versus public target replay evidence.

### Task 18 - CRPI-BLOCK-012

Status: `done`

Blocker Type: none

Blocker Resolution: BattleState owns selected Find Familiar behavior through companion lifecycle, replacement, dismissal/reappearance, shared senses, touch delivery, action-economy, spell-slot/action-economy, active-effect, target-selection, Reaction, attack-roll, and Hit Point reducer surfaces. Selected spell and familiar form identity remain catalog, selection, admission, and SRD fixture boundaries.

Goal:

Unblock and then implement target replay for `packages/battle-runtime/battle-runtime-find-familiar-selected-identity.mbt.qnt` as a `catalog-after-substrate` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-find-familiar-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-find-familiar-companion-lifecycle.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production and quarantined harness changes for the unblocked owner surfaces named below.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-find-familiar-selected-identity.mbt.qnt`
- Route Class: `catalog-after-substrate`
- Connector Path(s): `packages/battle-runtime/battle-runtime-find-familiar-companion-lifecycle.route.mbt.qnt`
- Durable Owner: BattleState owns selected Find Familiar behavior through companion lifecycle, replacement, dismissal/reappearance, shared senses, touch delivery, action-economy, spell-slot/action-economy, active-effect, target-selection, Reaction, attack-roll, and Hit Point reducer surfaces. Selected spell and familiar form identity remain catalog, selection, admission, and SRD fixture boundaries.
- Required Accepted Projection: `qRoute`
- Target replay evidence requirement: after unblock, evidence must be generated by public target entrypoints and record observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Target Owner Notes:

- Route connector `packages/battle-runtime/battle-runtime-find-familiar-companion-lifecycle.route.mbt.qnt` records companion lifecycle, shared-senses, touch-delivery, and familiar Reaction attack route evidence for selected companion creation, replacement, dismissal/reappearance, and touch-delivery branches.
- RAW/domain evidence covers Find Familiar creation, one-familiar-at-a-time replacement, dismissal/reappearance, shared senses, touch spell delivery, Reaction use, companion control, and Hit Points.

Forbidden Shortcuts:

- Do not use catalog identity, fixture labels, QNT action names, or historical target reports as a substitute for owner/source evidence.
- Do not add workaround adapters or duplicate state to bypass the blocker.

Verification:

- Run `pnpm cleanroom-branch-coverage:check` after updating the source queue/backlog.
- Run target replay for `packages/battle-runtime/battle-runtime-find-familiar-selected-identity.mbt.qnt` and the connector or dependency output that resolves this blocker.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the unblocked owner plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from reducer route inventory derivability facts, QNT route connector owner evidence, RAW/domain language, and reducer-route owner vocabulary. This task is now runnable and still must produce its own copied `qRoute` versus public target replay evidence.

### Task 19 - CRPI-BLOCK-013

Status: `done`

Blocker Type: none

Blocker Resolution: BattleState owns Halfling Nimbleness as passive creature-space movement permission plus creature Size/Speed projection through passive trait support profiles, creature-state, movement-resource, creature-space movement, and roll/damage substrate route surfaces. Selected species identity remains catalog, selection, admission, and SRD fixture input.

Goal:

Unblock and then implement target replay for `packages/battle-runtime/battle-runtime-halfling-nimbleness-selected-identity.mbt.qnt` as a `catalog-after-substrate` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-halfling-nimbleness-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-species-passive-trait-substrates.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production and quarantined harness changes for the unblocked owner surfaces named below.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-halfling-nimbleness-selected-identity.mbt.qnt`
- Route Class: `catalog-after-substrate`
- Connector Path(s): `packages/battle-runtime/battle-runtime-species-passive-trait-substrates.route.mbt.qnt`
- Durable Owner: BattleState owns Halfling Nimbleness as passive creature-space movement permission plus creature Size/Speed projection through passive trait support profiles, creature-state, movement-resource, creature-space movement, and roll/damage substrate route surfaces. Selected species identity remains catalog, selection, admission, and SRD fixture input.
- Required Accepted Projection: `qRoute`
- Target replay evidence requirement: after unblock, evidence must be generated by public target entrypoints and record observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Target Owner Notes:

- Route connector `packages/battle-runtime/battle-runtime-species-passive-trait-substrates.route.mbt.qnt` records CreatureSpaceMovementPermissionRouteSubject and CreatureStatProjectionRouteSubject evidence alongside shared passive damage and roll-mode substrate subjects.
- RAW/domain evidence covers Halfling Nimbleness, movement through a larger creature space, Size, Speed, Movement, Creature, and Character Sheet projection boundaries.

Forbidden Shortcuts:

- Do not use catalog identity, fixture labels, QNT action names, or historical target reports as a substitute for owner/source evidence.
- Do not add workaround adapters or duplicate state to bypass the blocker.

Verification:

- Run `pnpm cleanroom-branch-coverage:check` after updating the source queue/backlog.
- Run target replay for `packages/battle-runtime/battle-runtime-halfling-nimbleness-selected-identity.mbt.qnt` and the connector or dependency output that resolves this blocker.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the unblocked owner plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from reducer route inventory derivability facts, QNT route connector owner evidence, RAW/domain language, and reducer-route owner vocabulary. This task is now runnable and still must produce its own copied `qRoute` versus public target replay evidence.

### Task 20 - CRPI-BLOCK-014

Status: `done`

Blocker Type: none

Blocker Resolution: BattleState owns zero-Hit-Point stabilization through action-economy target-choice discovery and Hit Point/zero-HP lifecycle mutation of Stable, Unconscious, death-save counters, Dead rejection, and non-dead target state. Selected healing or stabilization identity remains catalog/support-profile admission input.

Goal:

Unblock and then implement target replay for `packages/battle-runtime/battle-runtime-healing-stabilization-selected-identity.mbt.qnt` as a `catalog-after-substrate` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-healing-stabilization-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-zero-hit-point-stabilization.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production and quarantined harness changes for the unblocked owner surfaces named below.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-healing-stabilization-selected-identity.mbt.qnt`
- Route Class: `catalog-after-substrate`
- Connector Path(s): `packages/battle-runtime/battle-runtime-zero-hit-point-stabilization.route.mbt.qnt`
- Durable Owner: BattleState owns zero-Hit-Point stabilization through action-economy target-choice discovery and Hit Point/zero-HP lifecycle mutation of Stable, Unconscious, death-save counters, Dead rejection, and non-dead target state. Selected healing or stabilization identity remains catalog/support-profile admission input.
- Required Accepted Projection: `qRoute`
- Target replay evidence requirement: after unblock, evidence must be generated by public target entrypoints and record observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Target Owner Notes:

- Route connector `packages/battle-runtime/battle-runtime-zero-hit-point-stabilization.route.mbt.qnt` records ZeroHitPointStabilizationRouteSubject evidence through BattleActionEconomyOwner and BattleHitPointAndZeroHpLifecycleOwner.
- RAW/domain evidence covers Spare the Dying, Death Saving Throws, Stabilizing a Character, Stable state, Unconscious, Death Saving Throw counters, and the distinction between Temporary Hit Points, true healing, and stabilization.

Forbidden Shortcuts:

- Do not use catalog identity, fixture labels, QNT action names, or historical target reports as a substitute for owner/source evidence.
- Do not add workaround adapters or duplicate state to bypass the blocker.

Verification:

- Run `pnpm cleanroom-branch-coverage:check` after updating the source queue/backlog.
- Run target replay for `packages/battle-runtime/battle-runtime-healing-stabilization-selected-identity.mbt.qnt` and the connector or dependency output that resolves this blocker.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the unblocked owner plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from reducer route inventory derivability facts, QNT route connector owner evidence, RAW/domain language, and reducer-route owner vocabulary. This task is now runnable and still must produce its own copied `qRoute` versus public target replay evidence.

### Task 21 - CRP07-DSR-03

Status: `done`

Goal:

Hit Point restoration ordering and zero-HP cleanup through public battle reducer route.

Starting Points:

- `packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt`
- `packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.qnt`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `.references/srd-5.2.1/Rules-Glossary.md`

Output:

- Target production and quarantined harness changes in the cleanroom target for `CRP07-DSR-03`.
- `tasks/target-replay-evidence/CRP07-DSR-03.json`, `tasks/history/CRP07-DSR-03/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/BLOCKERS.md` only if a source or target blocker remains.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.route.mbt.qnt`
- Durable Owner: BattleState owns restored target Hit Points, zero-Hit-Point lifecycle cleanup, healing subject frontier progress, action economy, and Spell Slot expenditure; the healing frontier does not own a duplicate HP ledger.
- Accepted Projection(s): route projection `qRoute` from `packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.route.mbt.qnt` with comparator `route-event-list`
- Task Family: diagnostic replay
- Target replay evidence requirement: accepted evidence must be generated by public target entrypoints, record the observed projection source, and match the source connector or semantic projection named above.
- Target replay observes qRoute for spell healing target choice/list, healing roll, feature healing-pool distribution, and zero-HP cleanup events from discover_battle_acts and resolve_battle_subject.
- Restored Hit Points and zero-Hit-Point cleanup use the battle-owned Hit Point lifecycle; the route does not create a separate healing HP ledger.
- Spell healing target/distribution fills remain subject frontier progress through the shared reducer surface.

Target Owner Notes:

- BattleState owns current HP, restoration, zero-HP lifecycle cleanup, action economy, Spell Slot use, and healing hole frontier progress.
- Feature healing-pool distribution is an explicit fill into the same HP owner rather than a second store of pending healing.

Forbidden Shortcuts:

- Do not satisfy restoration replay with an adapter-local HP or healing-pool ledger.
- Do not skip zero-HP lifecycle cleanup when healing restores HP.

Verification:

- Run target replay for packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt and packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.route.mbt.qnt and require qRoute comparator route-event-list from discover_battle_acts and resolve_battle_subject.
- Run RAW and domain-language review against .references/srd-5.2.1/Playing-the-Game.md#Healing, .references/srd-5.2.1/Playing-the-Game.md#Dropping to 0 Hit Points, .references/srd-5.2.1/Rules-Glossary.md#Hit Points, .references/srd-5.2.1/Rules-Glossary.md#Healing, UBIQUITOUS_LANGUAGE.md#Hit Points and Death, and plans/cleanroom-guidance/reducer-spine.md.
- Run pnpm cleanroom-branch-coverage:check.
- Run git diff --check.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 22 - CRPI-READY-005

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-interrupt-stack-resume.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-interrupt-stack-resume.mbt.qnt`
- `packages/battle-runtime/battle-runtime-interrupt-stack-resume.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-READY-005.json`, `tasks/history/CRPI-READY-005/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-interrupt-stack-resume.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-interrupt-stack-resume.route.mbt.qnt`
- Durable Owner: BattleState owns interrupt-stack push/resume frames, reaction availability, spell-slot/action-economy spend, active effects, Hit Points, and continuation holes; table choices stay boundary fills.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-interrupt-stack-resume.mbt.qnt` and `packages/battle-runtime/battle-runtime-interrupt-stack-resume.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 23 - CRPI-BLOCK-015

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-level1-buff-mark-smite-selected-identity.mbt.qnt` as a `catalog-after-substrate` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-level1-buff-mark-smite-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-after-hit-damage-riders.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-scalar-buff-active-effects.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-weapon-damage-rider.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-spell-hosted-weapon-attack.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-held-weapon-active-effect.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-marked-damage-immunity-active-effects.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-015.json`, `tasks/history/CRPI-BLOCK-015/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-level1-buff-mark-smite-selected-identity.mbt.qnt`
- Route Class: `catalog-after-substrate`
- Connector Path(s): `packages/battle-runtime/battle-runtime-after-hit-damage-riders.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-scalar-buff-active-effects.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-weapon-damage-rider.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-spell-hosted-weapon-attack.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-held-weapon-active-effect.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-marked-damage-immunity-active-effects.route.mbt.qnt`
- Durable Owner: BattleState owns after-hit riders, scalar buffs, weapon-hosted/held-weapon active effects, marked damage riders, condition-immunity Temporary Hit Points, Concentration/active-effect cleanup; selected spell identity remains catalog/support-profile admission input. Risk: keep split route owners, no monolithic "level 1 buff spell" owner.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-level1-buff-mark-smite-selected-identity.mbt.qnt` and `packages/battle-runtime/battle-runtime-after-hit-damage-riders.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-scalar-buff-active-effects.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-weapon-damage-rider.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-spell-hosted-weapon-attack.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-held-weapon-active-effect.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-marked-damage-immunity-active-effects.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from reducer route inventory derivability facts, QNT route connector owner evidence, RAW/domain language, and reducer-route owner vocabulary. This task is now runnable and still must produce its own copied `qRoute` versus public target replay evidence.

### Task 24 - CRPI-BLOCK-016

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-level1-damage-spell-selected-identity.mbt.qnt` as a `catalog-after-substrate` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-level1-damage-spell-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-spell-attack-ordering.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-chained-attack-sequence.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-mixed-target-outcomes.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-starry-wisp-object.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-condition-riders.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-016.json`, `tasks/history/CRPI-BLOCK-016/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-level1-damage-spell-selected-identity.mbt.qnt`
- Route Class: `catalog-after-substrate`
- Connector Path(s): `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-spell-attack-ordering.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-chained-attack-sequence.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-mixed-target-outcomes.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-starry-wisp-object.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-condition-riders.route.mbt.qnt`
- Durable Owner: BattleState owns spell invocation/action economy, target selection, Attack Roll, Saving Throw, mixed target outcomes, condition riders, object-target boundary, and Hit Point effects; exact spell identity remains catalog/support-profile admission input. Risk: count only branches with generic route facts; exact damage details separate.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-level1-damage-spell-selected-identity.mbt.qnt` and `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-spell-attack-ordering.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-chained-attack-sequence.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-mixed-target-outcomes.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-starry-wisp-object.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-condition-riders.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from reducer route inventory derivability facts, QNT route connector owner evidence, RAW/domain language, and reducer-route owner vocabulary. This task is now runnable and still must produce its own copied `qRoute` versus public target replay evidence.

### Task 25 - CRPI-BLOCK-017

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-level1-spatial-witness-selected-identity.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-level1-spatial-witness-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-level1-spatial-witness-selected-identity.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-reaction-casting-time.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-reaction-interrupt-payload-taxonomy.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-object-light-riders.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-spatial-effects.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-movement-presentation.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-017.json`, `tasks/history/CRPI-BLOCK-017/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-level1-spatial-witness-selected-identity.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-level1-spatial-witness-selected-identity.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-reaction-casting-time.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-reaction-interrupt-payload-taxonomy.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-object-light-riders.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-spatial-effects.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-movement-presentation.route.mbt.qnt`
- Durable Owner: BattleState owns spatial effects, object/light riders, movement presentation, reaction fall mitigation, save gates, light/sight/obscurement/hazard projections; table geometry/presentation remains boundary evidence. Risk: do not accept wholesale outside route inventory categories.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-level1-spatial-witness-selected-identity.mbt.qnt` and `packages/battle-runtime/battle-runtime-level1-spatial-witness-selected-identity.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-reaction-casting-time.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-reaction-interrupt-payload-taxonomy.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-object-light-riders.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-spatial-effects.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-movement-presentation.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from reducer route inventory derivability facts, QNT route connector owner evidence, RAW/domain language, and reducer-route owner vocabulary. This task is now runnable and still must produce its own copied `qRoute` versus public target replay evidence.

### Task 26 - CRPI-BLOCK-018

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-level2-damage-spell-selected-identity.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-level2-damage-spell-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-concentration-hazard-selected-route.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-concentration-hazard-exact-damage.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-spatial-effect-route-surfaces.qnt`
- `packages/battle-runtime/battle-runtime-spatial-effects.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-018.json`, `tasks/history/CRPI-BLOCK-018/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-level2-damage-spell-selected-identity.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-concentration-hazard-selected-route.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-concentration-hazard-exact-damage.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-spatial-effect-route-surfaces.qnt`, `packages/battle-runtime/battle-runtime-spatial-effects.route.mbt.qnt`
- Durable Owner: BattleState owns concentration-backed area hazards through active-effect, Concentration, area/spatial, Saving Throw, movement, light, Hit Points, and exact-damage route owners. Scope selected concentration hazard branches named by inventory.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-level2-damage-spell-selected-identity.mbt.qnt` and `packages/battle-runtime/battle-runtime-concentration-hazard-selected-route.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-concentration-hazard-exact-damage.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-spatial-effect-route-surfaces.qnt`, `packages/battle-runtime/battle-runtime-spatial-effects.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from reducer route inventory derivability facts, QNT route connector owner evidence, RAW/domain language, and reducer-route owner vocabulary. This task is now runnable and still must produce its own copied `qRoute` versus public target replay evidence.

### Task 27 - CRPI-BLOCK-019

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-level2-control-spell-selected-identity.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-level2-control-spell-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-concentration-hazard-selected-route.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-spatial-effect-route-surfaces.qnt`
- `packages/battle-runtime/battle-runtime-spatial-effects.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-019.json`, `tasks/history/CRPI-BLOCK-019/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-level2-control-spell-selected-identity.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-concentration-hazard-selected-route.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-spatial-effect-route-surfaces.qnt`, `packages/battle-runtime/battle-runtime-spatial-effects.route.mbt.qnt`
- Durable Owner: BattleState owns concentration-backed control hazards through active-effect, Concentration, area/spatial, Saving Throw/condition lifecycle, obscurement, movement, Hit Points, and cleanup owners. Scope Spike Growth/Web hazard evidence.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-level2-control-spell-selected-identity.mbt.qnt` and `packages/battle-runtime/battle-runtime-concentration-hazard-selected-route.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-spatial-effect-route-surfaces.qnt`, `packages/battle-runtime/battle-runtime-spatial-effects.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from reducer route inventory derivability facts, QNT route connector owner evidence, RAW/domain language, and reducer-route owner vocabulary. This task is now runnable and still must produce its own copied `qRoute` versus public target replay evidence.

### Task 28 - CRPI-BLOCK-020

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-mage-armor-selected-identity.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-mage-armor-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-spell-base-armor-class-effect.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-020.json`, `tasks/history/CRPI-BLOCK-020/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-mage-armor-selected-identity.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-spell-base-armor-class-effect.route.mbt.qnt`
- Durable Owner: BattleState owns target admission, active Spell Effect, Armor Class projection, duration/turn-boundary cleanup, and spell-slot/action economy; selected spell identity remains admission input. Do not duplicate AC state beside active-effect projection.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-mage-armor-selected-identity.mbt.qnt` and `packages/battle-runtime/battle-runtime-spell-base-armor-class-effect.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from reducer route inventory derivability facts, QNT route connector owner evidence, RAW/domain language, and reducer-route owner vocabulary. This task is now runnable and still must produce its own copied `qRoute` versus public target replay evidence.

### Task 29 - CRP07-DSR-01

Status: `done`

Goal:

Magic Missile allocation and damage through public battle reducer route.

Starting Points:

- `packages/battle-runtime/battle-runtime-magic-missile.mbt.qnt`
- `packages/battle-runtime/battle-runtime-magic-missile.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-reducer-spine-contract.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `.references/srd-5.2.1/Rules-Glossary.md`

Output:

- Target production and quarantined harness changes in the cleanroom target for `CRP07-DSR-01`.
- `tasks/target-replay-evidence/CRP07-DSR-01.json`, `tasks/history/CRP07-DSR-01/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/BLOCKERS.md` only if a source or target blocker remains.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-magic-missile.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-magic-missile.route.mbt.qnt`
- Durable Owner: BattleState owns current actor, turn action resource, spell-slot expenditure, target Hit Points, and spell target/damage hole frontier progress; the adapter owns only observed replay evidence.
- Accepted Projection(s): route projection `qRoute` from `packages/battle-runtime/battle-runtime-magic-missile.route.mbt.qnt` with comparator `route-event-list`
- Task Family: diagnostic replay
- Target replay evidence requirement: accepted evidence must be generated by public target entrypoints, record the observed projection source, and match the source connector or semantic projection named above.
- Target replay observes qRoute from start_battle, discover_battle_acts, and resolve_battle_subject for SpellTargetAllocation and SpellDamageRoll route events.
- The accepted route spends the Magic action and one ordinary Spell Slot through battle-owned action economy and Spell Slot state before damage is committed.
- Target Hit Point loss, death flag projection, multiattack dispatch count, and Sneak Attack turn-use projection are derived from BattleState route facts rather than a driver-local Magic Missile ledger.

Target Owner Notes:

- BattleState owns current actor, action availability, committed Spell Slot use, target Hit Points, and spell hole frontier progress.
- Spell allocation and damage fills are route subject progress; authored spell identity is selection/provenance only and must not be production dispatch logic.

Forbidden Shortcuts:

- Do not satisfy replay with a Magic Missile-specific reducer island, expected-route table, or adapter-local HP ledger.
- Do not branch production behavior on spell id, spell name, fixture label, qRoute event name, or sampled input name.

Verification:

- Run target replay for packages/battle-runtime/battle-runtime-magic-missile.mbt.qnt and packages/battle-runtime/battle-runtime-magic-missile.route.mbt.qnt and require qRoute comparator route-event-list from start_battle, discover_battle_acts, and resolve_battle_subject.
- Run RAW and domain-language review against .references/srd-5.2.1/Spells/Gaining-and-Casting.md#Spell Slots, .references/srd-5.2.1/Playing-the-Game.md#Hit Points, .references/srd-5.2.1/Rules-Glossary.md#Hit Points, UBIQUITOUS_LANGUAGE.md#Hit Points and Death, UBIQUITOUS_LANGUAGE.md#Action Lifecycle, and plans/cleanroom-guidance/reducer-spine.md.
- Run pnpm cleanroom-branch-coverage:check.
- Run git diff --check.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 30 - CRPI-BLOCK-021

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-movement-forced-movement-selected-identity.mbt.qnt` as a `catalog-after-substrate` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-movement-forced-movement-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-movement-forced-movement-selected-identity.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-021.json`, `tasks/history/CRPI-BLOCK-021/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-movement-forced-movement-selected-identity.mbt.qnt`
- Route Class: `catalog-after-substrate`
- Connector Path(s): `packages/battle-runtime/battle-runtime-movement-forced-movement-selected-identity.route.mbt.qnt`
- Durable Owner: BattleState owns movement-resource, special-speed projection, forced movement, active effects, creature-state speed facts, interrupt-stack/reaction movement, and turn-boundary cleanup. Keep Speed source fact vs Movement budget distinction.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-movement-forced-movement-selected-identity.mbt.qnt` and `packages/battle-runtime/battle-runtime-movement-forced-movement-selected-identity.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from reducer route inventory derivability facts, QNT route connector owner evidence, RAW/domain language, and reducer-route owner vocabulary. This task is now runnable and still must produce its own copied `qRoute` versus public target replay evidence.

### Task 31 - CRPI-READY-006

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt`
- `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-READY-006.json`, `tasks/history/CRPI-READY-006/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- Durable Owner: BattleState and character-battle resource state own action economy, spell-slot spend, Sorcery Point point-pool expenditure, same-turn level-1-plus spell locks, roll-mode/damage/targeting projections, active Spell Effects, and pending reroll fills; selected Metamagic option identity stays at catalog, selection, admission, and SRD fixture boundaries.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt` and `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 32 - CRPI-READY-007

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-reaction-casting-time.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-reaction-casting-time.mbt.qnt`
- `packages/battle-runtime/battle-runtime-reaction-casting-time.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-READY-007.json`, `tasks/history/CRPI-READY-007/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-reaction-casting-time.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-reaction-casting-time.route.mbt.qnt`
- Durable Owner: BattleState owns reaction availability, reaction spell-slot spend, triggering spell slot spend or non-spend, interrupt-stack clear/resume, and Hit Point effects; table-trigger facts and chosen reaction decisions stay boundary fills.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-reaction-casting-time.mbt.qnt` and `packages/battle-runtime/battle-runtime-reaction-casting-time.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 33 - CRPI-BLOCK-022

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-reaction-spell-selected-identity.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-reaction-spell-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-reaction-interrupt-payload-taxonomy.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-022.json`, `tasks/history/CRPI-BLOCK-022/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-reaction-spell-selected-identity.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-reaction-interrupt-payload-taxonomy.route.mbt.qnt`
- Durable Owner: BattleState owns reaction availability, interrupt-stack payload/continuation, reaction spell-slot/action economy, and payload effects; trigger facts and reaction choice remain boundary fills. No selected reaction spell identity dispatch.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-reaction-spell-selected-identity.mbt.qnt` and `packages/battle-runtime/battle-runtime-reaction-interrupt-payload-taxonomy.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from reducer route inventory derivability facts, QNT route connector owner evidence, RAW/domain language, and reducer-route owner vocabulary. This task is now runnable and still must produce its own copied `qRoute` versus public target replay evidence.

### Task 34 - CRPI-BLOCK-023

Status: `blocked`

Blocker Type: dependency

Blocker Detail: Backlog row `packages/battle-runtime/battle-runtime-reducer-spine-contract.mbt.qnt` is blocked by `replay-refresh-only-baseline-witness`; the dependency must provide source connector/acceptance evidence before implementation starts.

Goal:

Unblock and then implement target replay for `packages/battle-runtime/battle-runtime-reducer-spine-contract.mbt.qnt` as a `replay-refresh-only` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-reducer-spine-contract.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output After Unblock:

- Updated backlog row and queue entry replacing the blocker with a concrete durable owner or source dependency output.
- Target production/harness changes and accepted replay evidence only after the blocker is resolved.

Acceptance After Unblock:

- Driver Path: `packages/battle-runtime/battle-runtime-reducer-spine-contract.mbt.qnt`
- Route Class: `replay-refresh-only`
- Connector Path(s): Blocker: `replay-refresh-only-baseline-witness`
- Current Owner Field: source-blocker: baseline composition witness is not a queued cleanroom implementation driver.
- Required Accepted Projection: `blocked-source-refresh`
- Target replay evidence requirement: after unblock, evidence must be generated by public target entrypoints and record observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not implement while the durable owner is `owner-todo` or while a source connector dependency is unresolved.
- Do not use catalog identity, fixture labels, QNT action names, or historical target reports as a substitute for owner/source evidence.
- Do not add workaround adapters or duplicate state to bypass the blocker.

Verification After Unblock:

- Run `pnpm cleanroom-branch-coverage:check` after updating the source queue/backlog.
- Run target replay for `packages/battle-runtime/battle-runtime-reducer-spine-contract.mbt.qnt` and the connector or dependency output that resolves this blocker.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the unblocked owner plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`update-required` when the blocker is resolved; update this queue task, the backlog row, and any dependent implementation tasks in the same planning change.

### Task 35 - CRPI-READY-008

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-roll-modifier-active-effects.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-roll-modifier-active-effects.mbt.qnt`
- `packages/battle-runtime/battle-runtime-roll-modifier-active-effects.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-READY-008.json`, `tasks/history/CRPI-READY-008/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-roll-modifier-active-effects.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-roll-modifier-active-effects.route.mbt.qnt`
- Durable Owner: BattleState owns roll-modifier active Spell Effects and Concentration teardown; table-supplied choice frontiers remain explicit fills, while the Thaumaturgy one-minute-effect count stays boundary evidence instead of a duplicate ledger.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-roll-modifier-active-effects.mbt.qnt` and `packages/battle-runtime/battle-runtime-roll-modifier-active-effects.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 36 - CRPI-BLOCK-024

Status: `ready-for-research`

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-roll-modifier-buff-selected-identity.mbt.qnt` as a `catalog-after-substrate` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-roll-modifier-buff-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-roll-modifier-active-effects.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-spell-damage-reduction.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-scalar-buff-active-effects.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-024.json`, `tasks/history/CRPI-BLOCK-024/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-roll-modifier-buff-selected-identity.mbt.qnt`
- Route Class: `catalog-after-substrate`
- Connector Path(s): `packages/battle-runtime/battle-runtime-roll-modifier-active-effects.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-spell-damage-reduction.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-scalar-buff-active-effects.route.mbt.qnt`
- Durable Owner: BattleState owns roll-modifier active effects, Concentration, damage-reduction/damage-adjustment, scalar buff active effects, and relevant target/damage-type choice frontiers. Choice frontiers are fills.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-roll-modifier-buff-selected-identity.mbt.qnt` and `packages/battle-runtime/battle-runtime-roll-modifier-active-effects.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-spell-damage-reduction.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-scalar-buff-active-effects.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from reducer route inventory derivability facts, QNT route connector owner evidence, RAW/domain language, and reducer-route owner vocabulary. This task is now runnable and still must produce its own copied `qRoute` versus public target replay evidence.

### Task 37 - CRPI-BLOCK-025

Status: `ready-for-research`

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-sanctuary-selected-identity.mbt.qnt` as a `catalog-after-substrate` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-sanctuary-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-sanctuary-selected-identity.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-025.json`, `tasks/history/CRPI-BLOCK-025/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-sanctuary-selected-identity.mbt.qnt`
- Route Class: `catalog-after-substrate`
- Connector Path(s): `packages/battle-runtime/battle-runtime-sanctuary-selected-identity.route.mbt.qnt`
- Durable Owner: BattleState owns warded-target interdiction through spell-slot/action economy, target selection, active effect, Saving Throw outcome, attack/action/area gates, Hit Points, and early ward end. Area exclusion/replacement target choice explicit route/boundary facts.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-sanctuary-selected-identity.mbt.qnt` and `packages/battle-runtime/battle-runtime-sanctuary-selected-identity.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from reducer route inventory derivability facts, QNT route connector owner evidence, RAW/domain language, and reducer-route owner vocabulary. This task is now runnable and still must produce its own copied `qRoute` versus public target replay evidence.

### Task 38 - CRP07-DSR-02

Status: `done`

Goal:

Save-gated spell ordering through public battle reducer route.

Starting Points:

- `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt`
- `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.qnt`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`

Output:

- Target production and quarantined harness changes in the cleanroom target for `CRP07-DSR-02`.
- `tasks/target-replay-evidence/CRP07-DSR-02.json`, `tasks/history/CRP07-DSR-02/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/BLOCKERS.md` only if a source or target blocker remains.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.route.mbt.qnt`
- Durable Owner: BattleState owns Magic-action spell subject frontier progress, Spell Slot expenditure, spell save outcomes, condition/damage effect route progress, and target Hit Point effects; ordering-error labels remain reducer result facts, not adapter state.
- Accepted Projection(s): route projection `qRoute` from `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.route.mbt.qnt` with comparator `route-event-list`
- Task Family: diagnostic replay
- Target replay evidence requirement: accepted evidence must be generated by public target entrypoints, record the observed projection source, and match the source connector or semantic projection named above.
- Target replay observes qRoute for area save damage, target-list condition choice, Saving Throw, condition choice, target list, and damage dice frontier events from discover_battle_acts and resolve_battle_subject.
- Ordering rejections are reducer result facts produced by the shared subject frontier; they are not implemented as a local save-gated ordering module.
- Magic-action and Spell Slot ownership are reused from the battle spell route substrate before save-gated fills can resolve effect progress.

Target Owner Notes:

- BattleState owns spell subject frontier progress, action economy, Spell Slot use, Saving Throw outcomes, condition effect progress, and damage/Hit Point effects.
- Ordering labels are derived route/result facts; there is no durable adapter-side ordering state.

Forbidden Shortcuts:

- Do not implement a driver-local ordering table or bypass Magic-action and Spell Slot ownership.
- Do not branch production behavior on authored spell identity, qRoute event names, or fixture labels.

Verification:

- Run target replay for packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt and packages/battle-runtime/battle-runtime-save-gated-spell-ordering.route.mbt.qnt and require qRoute comparator route-event-list from discover_battle_acts and resolve_battle_subject.
- Run RAW and domain-language review against .references/srd-5.2.1/Playing-the-Game.md#Saving Throws, .references/srd-5.2.1/Spells/Gaining-and-Casting.md#Saving Throws, .references/srd-5.2.1/Spells/Gaining-and-Casting.md#Spell Slots, UBIQUITOUS_LANGUAGE.md#Spellcasting, UBIQUITOUS_LANGUAGE.md#Action Lifecycle, and plans/cleanroom-guidance/reducer-spine.md.
- Run pnpm cleanroom-branch-coverage:check.
- Run git diff --check.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 39 - CRP07-DSR-06

Status: `done`

Goal:

Scalar-buff active effects through public battle reducer route.

Starting Points:

- `packages/battle-runtime/battle-runtime-scalar-buff-active-effects.mbt.qnt`
- `packages/battle-runtime/battle-runtime-scalar-buff-active-effects.route.mbt.qnt`
- `packages/shared-algebras/proofs/rule-core/spell-scalar-buff-projection-core.qnt`
- `packages/battle-runtime/battle-runtime-spell-bridge-examples.qnt`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `.references/srd-5.2.1/Playing-the-Game.md`

Output:

- Target production and quarantined harness changes in the cleanroom target for `CRP07-DSR-06`.
- `tasks/target-replay-evidence/CRP07-DSR-06.json`, `tasks/history/CRP07-DSR-06/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/BLOCKERS.md` only if a source or target blocker remains.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-scalar-buff-active-effects.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-scalar-buff-active-effects.route.mbt.qnt`
- Durable Owner: BattleState owns active Spell Effect instances, Concentration ownership, movement and special-Speed projections, Hit Point maximum changes, Temporary Hit Points, Armor Class modifiers, action economy, and Spell Slot expenditure; scalar profile facts stay source procedure facts rather than target adapter state.
- Accepted Projection(s): route projection `qRoute` from `packages/battle-runtime/battle-runtime-scalar-buff-active-effects.route.mbt.qnt` with comparator `route-event-list`
- Task Family: diagnostic replay
- Target replay evidence requirement: accepted evidence must be generated by public target entrypoints, record the observed projection source, and match the source connector or semantic projection named above.
- Target replay observes qRoute from start_battle, discover_battle_acts, and resolve_battle_subject for Armor Class, Speed, special Speed, Hit Point maximum, immediate Temporary Hit Point, and terminal stutter projections.
- Action economy, Spell Slot expenditure, active Spell Effect lifecycle, movement, Hit Point, Temporary Hit Point, and Concentration owners are all visible in observed public route events.
- Scalar profile facts are parsed procedure/source facts; the adapter does not store a parallel buff ledger or dispatch on authored spell identity.

Target Owner Notes:

- BattleState owns active Spell Effect instances, AC modifiers, Speed and special-Speed projections, HP maximum changes, current HP adjustment, Temporary Hit Points, Concentration, action economy, and Spell Slot expenditure.
- Movement consumes projected Speed facts; it does not duplicate scalar-buff speed values beside active Spell Effect state.

Forbidden Shortcuts:

- Do not implement per-spell branches for scalar-buff behavior in production runtime.
- Do not satisfy replay by storing route-local AC, Speed, HP maximum, Temporary Hit Point, Concentration, or active-effect ledgers.

Verification:

- Run target replay for packages/battle-runtime/battle-runtime-scalar-buff-active-effects.mbt.qnt and packages/battle-runtime/battle-runtime-scalar-buff-active-effects.route.mbt.qnt and require qRoute comparator route-event-list from public reducer entrypoints.
- Run RAW and domain-language review against .references/srd-5.2.1/Rules-Glossary.md#Concentration, .references/srd-5.2.1/Rules-Glossary.md#Armor Class, .references/srd-5.2.1/Rules-Glossary.md#Speed, .references/srd-5.2.1/Playing-the-Game.md#Hit Points, .references/srd-5.2.1/Playing-the-Game.md#Temporary Hit Points, UBIQUITOUS_LANGUAGE.md#Armor Class and Defense, UBIQUITOUS_LANGUAGE.md#Movement, UBIQUITOUS_LANGUAGE.md#Hit Points and Death, UBIQUITOUS_LANGUAGE.md#Spellcasting, and plans/cleanroom-guidance/reducer-spine.md.
- Run pnpm cleanroom-branch-coverage:check.
- Run git diff --check.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 40 - CRPI-READY-009

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-scalar-buff.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-scalar-buff.mbt.qnt`
- `packages/battle-runtime/battle-runtime-scalar-buff.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-READY-009.json`, `tasks/history/CRPI-READY-009/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-scalar-buff.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-scalar-buff.route.mbt.qnt`
- Durable Owner: BattleState owns the target Speed projection and active Spell Effect instance; the route connector does not introduce a duplicate speed/effect ledger.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-scalar-buff.mbt.qnt` and `packages/battle-runtime/battle-runtime-scalar-buff.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 41 - CRPI-READY-010

Status: `blocked`

Blocker Type: source-qnt-corpus-blocker

Blocker Detail: Copied connector `packages/battle-runtime/battle-runtime-sleep-repeat-save.route.mbt.qnt` expects post-Concentration-cleanup `battleTurnBoundary` no-op `qRoute` events after no reducer-owned `sleepPendingRepeatSave` frontier remains. The owner must decide whether to refresh/reclassify that copied connector obligation or introduce a durable reducer-owned route fact that permits unskipped copied `qRoute` replay without duplicate replay-history state.

Goal:

Refresh/reclassify the source route obligation, then implement target replay for `packages/battle-runtime/battle-runtime-sleep-repeat-save.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-sleep-repeat-save.mbt.qnt`
- `packages/battle-runtime/battle-runtime-sleep-repeat-save.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-READY-010.json`, `tasks/history/CRPI-READY-010/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-sleep-repeat-save.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-sleep-repeat-save.route.mbt.qnt`
- Durable Owner: BattleState owns Sleep active-effect state, Concentration, condition lifecycle, and turn-boundary repeat-save frontier; no duplicate repeat-save or condition ledger is introduced.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-sleep-repeat-save.mbt.qnt` and `packages/battle-runtime/battle-runtime-sleep-repeat-save.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 42 - CRPI-READY-011

Status: `blocked`

Blocker Type: source-qnt-corpus-blocker

Blocker Detail: Copied connector `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt#doRouteSavingThrowProtection` is damage-shaped and begins at `savingThrowOutcome` / `RolledDiceHoleKind` / `BattleDamageAdjustmentOwner`. Ralph Task 42 evidence shows the target public reducer route for Careful Burning Hands starts earlier at the protected-target `spellTargetList` frontier, while the Careful Command/no-effect branch routes as `commandEffect` with no rolled-dice damage-adjustment frontier. The owner must decide whether to refresh/reclassify the copied connector obligation or introduce an honest reducer-owned route fact; synthetic damage route events or duplicate replay-history state are not acceptable.

Goal:

Refresh/reclassify the source route obligation, then implement target replay for `packages/battle-runtime/battle-runtime-sorcerer-metamagic-careful-selected-identity.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-sorcerer-metamagic-careful-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-READY-011.json`, `tasks/history/CRPI-READY-011/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-sorcerer-metamagic-careful-selected-identity.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- Durable Owner: BattleState and character-battle resource state own action economy, spell-slot spend, Sorcery Point point-pool expenditure, same-turn level-1-plus spell locks, roll-mode/damage/targeting projections, active Spell Effects, and pending reroll fills; selected Metamagic option identity stays at catalog, selection, admission, and SRD fixture boundaries.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-sorcerer-metamagic-careful-selected-identity.mbt.qnt` and `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 43 - CRPI-READY-012

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-sorcerer-metamagic-distant-selected-identity.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-sorcerer-metamagic-distant-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-READY-012.json`, `tasks/history/CRPI-READY-012/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-sorcerer-metamagic-distant-selected-identity.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- Durable Owner: BattleState and character-battle resource state own action economy, spell-slot spend, Sorcery Point point-pool expenditure, same-turn level-1-plus spell locks, roll-mode/damage/targeting projections, active Spell Effects, and pending reroll fills; selected Metamagic option identity stays at catalog, selection, admission, and SRD fixture boundaries.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-sorcerer-metamagic-distant-selected-identity.mbt.qnt` and `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 44 - CRPI-READY-013

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-sorcerer-metamagic-empowered-selected-identity.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-sorcerer-metamagic-empowered-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-READY-013.json`, `tasks/history/CRPI-READY-013/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-sorcerer-metamagic-empowered-selected-identity.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- Durable Owner: BattleState and character-battle resource state own action economy, spell-slot spend, Sorcery Point point-pool expenditure, same-turn level-1-plus spell locks, roll-mode/damage/targeting projections, active Spell Effects, and pending reroll fills; selected Metamagic option identity stays at catalog, selection, admission, and SRD fixture boundaries.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-sorcerer-metamagic-empowered-selected-identity.mbt.qnt` and `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 45 - CRPI-READY-014

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-sorcerer-metamagic-extended-selected-identity.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-sorcerer-metamagic-extended-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-READY-014.json`, `tasks/history/CRPI-READY-014/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-sorcerer-metamagic-extended-selected-identity.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- Durable Owner: BattleState and character-battle resource state own action economy, spell-slot spend, Sorcery Point point-pool expenditure, same-turn level-1-plus spell locks, roll-mode/damage/targeting projections, active Spell Effects, and pending reroll fills; selected Metamagic option identity stays at catalog, selection, admission, and SRD fixture boundaries.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-sorcerer-metamagic-extended-selected-identity.mbt.qnt` and `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 46 - CRPI-READY-015

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-sorcerer-metamagic-heightened-selected-identity.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-sorcerer-metamagic-heightened-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-READY-015.json`, `tasks/history/CRPI-READY-015/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-sorcerer-metamagic-heightened-selected-identity.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- Durable Owner: BattleState and character-battle resource state own action economy, spell-slot spend, Sorcery Point point-pool expenditure, same-turn level-1-plus spell locks, roll-mode/damage/targeting projections, active Spell Effects, and pending reroll fills; selected Metamagic option identity stays at catalog, selection, admission, and SRD fixture boundaries.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-sorcerer-metamagic-heightened-selected-identity.mbt.qnt` and `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 47 - CRPI-READY-016

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-sorcerer-metamagic-seeking-selected-identity.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-sorcerer-metamagic-seeking-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-READY-016.json`, `tasks/history/CRPI-READY-016/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-sorcerer-metamagic-seeking-selected-identity.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- Durable Owner: BattleState and character-battle resource state own action economy, spell-slot spend, Sorcery Point point-pool expenditure, same-turn level-1-plus spell locks, roll-mode/damage/targeting projections, active Spell Effects, and pending reroll fills; selected Metamagic option identity stays at catalog, selection, admission, and SRD fixture boundaries.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-sorcerer-metamagic-seeking-selected-identity.mbt.qnt` and `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 48 - CRPI-READY-017

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-sorcerer-metamagic-selected-identity.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-sorcerer-metamagic-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-READY-017.json`, `tasks/history/CRPI-READY-017/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-sorcerer-metamagic-selected-identity.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- Durable Owner: BattleState and character-battle resource state own action economy, spell-slot spend, Sorcery Point point-pool expenditure, same-turn level-1-plus spell locks, roll-mode/damage/targeting projections, active Spell Effects, and pending reroll fills; selected Metamagic option identity stays at catalog, selection, admission, and SRD fixture boundaries.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-sorcerer-metamagic-selected-identity.mbt.qnt` and `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 49 - CRPI-READY-018

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-sorcerer-metamagic-spell-attack-selected-identity.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-sorcerer-metamagic-spell-attack-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-READY-018.json`, `tasks/history/CRPI-READY-018/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-sorcerer-metamagic-spell-attack-selected-identity.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- Durable Owner: BattleState and character-battle resource state own action economy, spell-slot spend, Sorcery Point point-pool expenditure, same-turn level-1-plus spell locks, roll-mode/damage/targeting projections, active Spell Effects, and pending reroll fills; selected Metamagic option identity stays at catalog, selection, admission, and SRD fixture boundaries.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-sorcerer-metamagic-spell-attack-selected-identity.mbt.qnt` and `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 50 - CRPI-READY-019

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-sorcerer-metamagic-spell-attack-sequence-selected-identity.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-sorcerer-metamagic-spell-attack-sequence-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-READY-019.json`, `tasks/history/CRPI-READY-019/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-sorcerer-metamagic-spell-attack-sequence-selected-identity.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- Durable Owner: BattleState and character-battle resource state own action economy, spell-slot spend, Sorcery Point point-pool expenditure, same-turn level-1-plus spell locks, roll-mode/damage/targeting projections, active Spell Effects, and pending reroll fills; selected Metamagic option identity stays at catalog, selection, admission, and SRD fixture boundaries.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-sorcerer-metamagic-spell-attack-sequence-selected-identity.mbt.qnt` and `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 51 - CRPI-READY-020

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-sorcerer-metamagic-subtle-selected-identity.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-sorcerer-metamagic-subtle-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-READY-020.json`, `tasks/history/CRPI-READY-020/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-sorcerer-metamagic-subtle-selected-identity.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- Durable Owner: BattleState and character-battle resource state own action economy, spell-slot spend, Sorcery Point point-pool expenditure, same-turn level-1-plus spell locks, roll-mode/damage/targeting projections, active Spell Effects, and pending reroll fills; selected Metamagic option identity stays at catalog, selection, admission, and SRD fixture boundaries.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-sorcerer-metamagic-subtle-selected-identity.mbt.qnt` and `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 52 - CRPI-READY-021

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-sorcerer-metamagic-transmuted-selected-identity.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-sorcerer-metamagic-transmuted-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-READY-021.json`, `tasks/history/CRPI-READY-021/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-sorcerer-metamagic-transmuted-selected-identity.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- Durable Owner: BattleState and character-battle resource state own action economy, spell-slot spend, Sorcery Point point-pool expenditure, same-turn level-1-plus spell locks, roll-mode/damage/targeting projections, active Spell Effects, and pending reroll fills; selected Metamagic option identity stays at catalog, selection, admission, and SRD fixture boundaries.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-sorcerer-metamagic-transmuted-selected-identity.mbt.qnt` and `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 53 - CRPI-READY-022

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-sorcerer-metamagic-twinned-selected-identity.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-sorcerer-metamagic-twinned-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-READY-022.json`, `tasks/history/CRPI-READY-022/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-sorcerer-metamagic-twinned-selected-identity.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- Durable Owner: BattleState and character-battle resource state own action economy, spell-slot spend, Sorcery Point point-pool expenditure, same-turn level-1-plus spell locks, roll-mode/damage/targeting projections, active Spell Effects, and pending reroll fills; selected Metamagic option identity stays at catalog, selection, admission, and SRD fixture boundaries.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-sorcerer-metamagic-twinned-selected-identity.mbt.qnt` and `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 54 - CRPI-BLOCK-026

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-species-passive-trait-selected-identity.mbt.qnt` as a `catalog-after-substrate` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-species-passive-trait-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-species-passive-trait-substrates.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-026.json`, `tasks/history/CRPI-BLOCK-026/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-species-passive-trait-selected-identity.mbt.qnt`
- Route Class: `catalog-after-substrate`
- Connector Path(s): `packages/battle-runtime/battle-runtime-species-passive-trait-substrates.route.mbt.qnt`
- Durable Owner: BattleState owns passive trait substrates through creature state, movement resource, damage adjustment, Saving Throw roll mode, Ability Check roll mode, and creature-space movement permission. Species identity stays catalog/admission.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-species-passive-trait-selected-identity.mbt.qnt` and `packages/battle-runtime/battle-runtime-species-passive-trait-substrates.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from reducer route inventory derivability facts, QNT route connector owner evidence, RAW/domain language, and reducer-route owner vocabulary. This task is now runnable and still must produce its own copied `qRoute` versus public target replay evidence.

### Task 55 - CRPI-BLOCK-027

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-spell-attack-ordering.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-spell-attack-ordering.mbt.qnt`
- `packages/battle-runtime/battle-runtime-spell-attack-ordering.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-027.json`, `tasks/history/CRPI-BLOCK-027/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-spell-attack-ordering.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-spell-attack-ordering.route.mbt.qnt`
- Durable Owner: BattleState owns spell attack action economy, target selection, Attack Roll, hole frontier, and Hit Point damage. Generic spell attack ordering only.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-spell-attack-ordering.mbt.qnt` and `packages/battle-runtime/battle-runtime-spell-attack-ordering.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from reducer route inventory derivability facts, QNT route connector owner evidence, RAW/domain language, and reducer-route owner vocabulary. This task is now runnable and still must produce its own copied `qRoute` versus public target replay evidence.

### Task 56 - CRPI-BLOCK-028

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-starry-wisp-object.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-starry-wisp-object.mbt.qnt`
- `packages/battle-runtime/battle-runtime-starry-wisp-object.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-028.json`, `tasks/history/CRPI-BLOCK-028/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-starry-wisp-object.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-starry-wisp-object.route.mbt.qnt`
- Durable Owner: BattleState owns object-target spell attack route via object-target boundary, Attack Roll, active effect, Hit Point/damage frontier, and stale hole-frontier rejection. Object facts remain table/boundary.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-starry-wisp-object.mbt.qnt` and `packages/battle-runtime/battle-runtime-starry-wisp-object.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from reducer route inventory derivability facts, QNT route connector owner evidence, RAW/domain language, and reducer-route owner vocabulary. This task is now runnable and still must produce its own copied `qRoute` versus public target replay evidence.

### Task 57 - CRPI-BLOCK-029

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-stat-block-action-ordering.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-stat-block-action-ordering.mbt.qnt`
- `packages/battle-runtime/battle-runtime-stat-block-action-ordering.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-029.json`, `tasks/history/CRPI-BLOCK-029/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-stat-block-action-ordering.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-stat-block-action-ordering.route.mbt.qnt`
- Durable Owner: BattleState owns Stat Block action dispatch, target-selection frontier, attack-roll progression, Hit Point damage, and hole-frontier stale/rejection state through BattleStatBlockActionOwner, BattleTargetSelectionOwner, BattleAttackRollOwner, BattleHitPointOwner, and BattleHoleFrontierOwner. RuleCoreStatBlockControlOwner owns reusable Multiattack dispatch control facts; authored Stat Block identity and attack notation stay catalog/source facts, not reducer dispatch keys.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public battle reducer entrypoints, using the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape unless the connector requires a narrower public surface.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Target Owner Notes:

- The route connector names `BattleStatBlockActionOwner`, `BattleHoleFrontierOwner`, `BattleTargetSelectionOwner`, `BattleAttackRollOwner`, and `BattleHitPointOwner` for the public `StatBlockActionRouteSubject` path.
- `tasks/VALIDATION_REPORT.md#CRPI-READY-034` accepts `RuleCoreStatBlockControlOwner` for reusable Multiattack dispatch controls before downstream Stat Block action routes consume that owner.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-stat-block-action-ordering.mbt.qnt` and `packages/battle-runtime/battle-runtime-stat-block-action-ordering.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against SRD 5.2.1 Playing-the-Game attack and damage rules, SRD 5.2.1 Rules Glossary Stat Block, Attack Notation, Damage Notation, Multiattack, Recharge, and `UBIQUITOUS_LANGUAGE.md` terms for Creature, Attack Roll, Damage, Hit Points, Stat Block, Multiattack, Recharge, and Condition before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` after updating the source queue/backlog.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from route connector owners and route inventory derivability facts; this task is now runnable. CRPI-READY-034 remains upstream Stat Block control evidence, not a substitute for this task's required route replay.

### Task 58 - CRPI-BLOCK-030

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-stat-block-multi-damage.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-stat-block-multi-damage.mbt.qnt`
- `packages/battle-runtime/battle-runtime-stat-block-multi-damage.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-030.json`, `tasks/history/CRPI-BLOCK-030/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-stat-block-multi-damage.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-stat-block-multi-damage.route.mbt.qnt`
- Durable Owner: BattleState owns Stat Block action dispatch, target selection, attack-roll resolution, and Hit Point updates for rolled and static damage notation through BattleStatBlockActionOwner, BattleTargetSelectionOwner, BattleAttackRollOwner, and BattleHitPointOwner. Damage notation remains a Stat Block source fact; the target must not add an alternate damage or HP ledger.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public battle reducer entrypoints, using the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape unless the connector requires a narrower public surface.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Target Owner Notes:

- The route connector names `BattleStatBlockActionOwner`, `BattleTargetSelectionOwner`, `BattleAttackRollOwner`, and `BattleHitPointOwner` for rolled and static damage notation on `StatBlockActionRouteSubject`.
- `CRPI-READY-034` is only upstream Stat Block control evidence for dispatch reuse; this task still must produce its own copied `qRoute` versus public reducer route replay evidence.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-stat-block-multi-damage.mbt.qnt` and `packages/battle-runtime/battle-runtime-stat-block-multi-damage.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against SRD 5.2.1 Playing-the-Game attack and damage rules, SRD 5.2.1 Rules Glossary Stat Block, Attack Notation, Damage Notation, Multiattack, Recharge, and `UBIQUITOUS_LANGUAGE.md` terms for Creature, Attack Roll, Damage, Hit Points, Stat Block, Multiattack, Recharge, and Condition before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` after updating the source queue/backlog.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from route connector owners and route inventory derivability facts; this task is now runnable. CRPI-READY-034 remains upstream Stat Block control evidence, not a substitute for this task's required route replay.

### Task 59 - CRPI-BLOCK-031

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-stat-block-size-gated-condition-rider.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-stat-block-size-gated-condition-rider.mbt.qnt`
- `packages/battle-runtime/battle-runtime-stat-block-size-gated-condition-rider.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-031.json`, `tasks/history/CRPI-BLOCK-031/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-stat-block-size-gated-condition-rider.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-stat-block-size-gated-condition-rider.route.mbt.qnt`
- Durable Owner: BattleState owns Stat Block action dispatch, target selection, size-gated condition lifecycle, and Hit Point updates through BattleStatBlockActionOwner, BattleTargetSelectionOwner, BattleConditionLifecycleOwner, and BattleHitPointOwner. BattleCreatureStateOwner owns target Size and condition-immunity input facts; those facts must be read from existing creature state and must not become route-local state.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public battle reducer entrypoints, using the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape unless the connector requires a narrower public surface.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Target Owner Notes:

- The route connector names `BattleStatBlockActionOwner`, `BattleTargetSelectionOwner`, `BattleConditionLifecycleOwner`, and `BattleHitPointOwner` for `StatBlockActionRouteSubject` condition-rider resolution.
- `BattleCreatureStateOwner` is an input-fact owner for target Size and condition-immunity facts, not an expected `qRoute` event owner for this connector.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-stat-block-size-gated-condition-rider.mbt.qnt` and `packages/battle-runtime/battle-runtime-stat-block-size-gated-condition-rider.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against SRD 5.2.1 Playing-the-Game attack and damage rules, SRD 5.2.1 Rules Glossary Stat Block, Attack Notation, Damage Notation, Multiattack, Recharge, and `UBIQUITOUS_LANGUAGE.md` terms for Creature, Attack Roll, Damage, Hit Points, Stat Block, Multiattack, Recharge, and Condition before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` after updating the source queue/backlog.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from route connector owners and route inventory derivability facts; this task is now runnable. CRPI-READY-034 remains upstream Stat Block control evidence, not a substitute for this task's required route replay.

### Task 60 - CRPI-BLOCK-032

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-thaumaturgy-selected-identity.mbt.qnt` as a `catalog-after-substrate` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-thaumaturgy-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-roll-modifier-active-effects.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-032.json`, `tasks/history/CRPI-BLOCK-032/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-thaumaturgy-selected-identity.mbt.qnt`
- Route Class: `catalog-after-substrate`
- Connector Path(s): `packages/battle-runtime/battle-runtime-roll-modifier-active-effects.route.mbt.qnt`
- Durable Owner: BattleState owns roll-modifier active Spell Effect and Concentration route; one-minute effect count remains boundary evidence, not reducer ledger. No Thaumaturgy-specific counter.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-thaumaturgy-selected-identity.mbt.qnt` and `packages/battle-runtime/battle-runtime-roll-modifier-active-effects.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from reducer route inventory derivability facts, QNT route connector owner evidence, RAW/domain language, and reducer-route owner vocabulary. This task is now runnable and still must produce its own copied `qRoute` versus public target replay evidence.

### Task 61 - CRPI-READY-023

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-turn-boundary-effect-lifecycle.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-turn-boundary-effect-lifecycle.mbt.qnt`
- `packages/battle-runtime/battle-runtime-turn-boundary-effect-lifecycle.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-READY-023.json`, `tasks/history/CRPI-READY-023/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-turn-boundary-effect-lifecycle.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-turn-boundary-effect-lifecycle.route.mbt.qnt`
- Durable Owner: BattleState turn-boundary state owns initiative/round advancement while HP and active effects remain with their own owners; same-timing order stays at the table/boundary frontier.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-turn-boundary-effect-lifecycle.mbt.qnt` and `packages/battle-runtime/battle-runtime-turn-boundary-effect-lifecycle.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 62 - CRPI-BLOCK-033

Status: `ready-for-research`

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-weapon-attack-ordering.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-weapon-attack-ordering.mbt.qnt`
- `packages/battle-runtime/battle-runtime-weapon-attack-ordering.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-033.json`, `tasks/history/CRPI-BLOCK-033/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-weapon-attack-ordering.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-weapon-attack-ordering.route.mbt.qnt`
- Durable Owner: BattleState owns weapon attack action economy, target selection, Attack Roll, hole frontier, and Hit Point damage. Weapon/source identity feeds typed attack facts only.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-weapon-attack-ordering.mbt.qnt` and `packages/battle-runtime/battle-runtime-weapon-attack-ordering.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from reducer route inventory derivability facts, QNT route connector owner evidence, RAW/domain language, and reducer-route owner vocabulary. This task is now runnable and still must produce its own copied `qRoute` versus public target replay evidence.

### Task 63 - CRPI-BLOCK-034

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-weapon-attack-skeleton.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-weapon-attack-skeleton.mbt.qnt`
- `packages/battle-runtime/battle-runtime-weapon-attack-skeleton.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-034.json`, `tasks/history/CRPI-BLOCK-034/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-weapon-attack-skeleton.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-weapon-attack-skeleton.route.mbt.qnt`
- Durable Owner: BattleState owns weapon action, battle action, stat-block action routing, action economy, Attack Roll, Hit Point damage, and stat-block action dispatch. Keep stat-block control reuse separate from route replay evidence.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-weapon-attack-skeleton.mbt.qnt` and `packages/battle-runtime/battle-runtime-weapon-attack-skeleton.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from reducer route inventory derivability facts, QNT route connector owner evidence, RAW/domain language, and reducer-route owner vocabulary. This task is now runnable and still must produce its own copied `qRoute` versus public target replay evidence.

### Task 64 - CRPI-BLOCK-035

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-weapon-hosted-attack-and-riders.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-weapon-hosted-attack-and-riders.mbt.qnt`
- `packages/battle-runtime/battle-runtime-spell-hosted-weapon-attack.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-held-weapon-active-effect.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-weapon-damage-rider.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-weapon-enhancement-item-target.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-held-weapon-release-cleanup.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-weapon-damage-rider-cleanup.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-weapon-enhancement-cleanup.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-035.json`, `tasks/history/CRPI-BLOCK-035/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-weapon-hosted-attack-and-riders.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-spell-hosted-weapon-attack.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-held-weapon-active-effect.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-weapon-damage-rider.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-weapon-enhancement-item-target.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-held-weapon-release-cleanup.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-weapon-damage-rider-cleanup.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-weapon-enhancement-cleanup.route.mbt.qnt`
- Durable Owner: BattleState owns spell-hosted weapon attacks, held-weapon active effects, weapon damage riders, weapon enhancement item-target boundary, Hit Point/Attack Roll, and active-effect cleanup. No selected item/spell/attack identity as behavior key.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-weapon-hosted-attack-and-riders.mbt.qnt` and `packages/battle-runtime/battle-runtime-spell-hosted-weapon-attack.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-held-weapon-active-effect.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-weapon-damage-rider.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-weapon-enhancement-item-target.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-held-weapon-release-cleanup.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-weapon-damage-rider-cleanup.route.mbt.qnt`, `packages/battle-runtime/battle-runtime-weapon-enhancement-cleanup.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from reducer route inventory derivability facts, QNT route connector owner evidence, RAW/domain language, and reducer-route owner vocabulary. This task is now runnable and still must produce its own copied `qRoute` versus public target replay evidence.

### Task 65 - CRPI-READY-024

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-weapon-mastery-selected-identity.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-weapon-mastery-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-weapon-mastery-selected-identity.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-READY-024.json`, `tasks/history/CRPI-READY-024/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-weapon-mastery-selected-identity.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-weapon-mastery-selected-identity.route.mbt.qnt`
- Durable Owner: BattleState owns the selected weapon attack, target Hit Points, Topple condition lifecycle, Sap active-effect rider, and Cleave once-per-turn rider use; selected mastery identity remains an admitted source reference, not the behavior dispatch key.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-weapon-mastery-selected-identity.mbt.qnt` and `packages/battle-runtime/battle-runtime-weapon-mastery-selected-identity.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 66 - CRPI-READY-025

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/battle-runtime-zero-hit-point-mid-resolution.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/battle-runtime-zero-hit-point-mid-resolution.mbt.qnt`
- `packages/battle-runtime/battle-runtime-zero-hit-point-mid-resolution.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-READY-025.json`, `tasks/history/CRPI-READY-025/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/battle-runtime-zero-hit-point-mid-resolution.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/battle-runtime-zero-hit-point-mid-resolution.route.mbt.qnt`
- Durable Owner: BattleState owns spell-attack procedure progress, HP/zero-HP lifecycle, conditions, Concentration, and active-effect teardown; no local Shield or HP replay ledger is introduced.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/battle-runtime-zero-hit-point-mid-resolution.mbt.qnt` and `packages/battle-runtime/battle-runtime-zero-hit-point-mid-resolution.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 67 - CRPI-BLOCK-036

Status: `ready-for-research`

Goal:

Implement target replay for `packages/battle-runtime/creature-attack.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/creature-attack.mbt.qnt`
- `packages/battle-runtime/creature-attack.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-036.json`, `tasks/history/CRPI-BLOCK-036/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/creature-attack.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/battle-runtime/creature-attack.route.mbt.qnt`
- Durable Owner: BattleState owns minimal creature attack hit/damage through Attack Roll and Hit Point owners. Narrow pilot only.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/creature-attack.mbt.qnt` and `packages/battle-runtime/creature-attack.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from reducer route inventory derivability facts, QNT route connector owner evidence, RAW/domain language, and reducer-route owner vocabulary. This task is now runnable and still must produce its own copied `qRoute` versus public target replay evidence.

### Task 68 - CRPI-READY-026

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt` as a `component-first` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `packages/battle-runtime/rule-core-component-route.qnt`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-READY-026.json`, `tasks/history/CRPI-READY-026/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt`
- Route Class: `component-first`
- Connector Path(s): `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt`
- Durable Owner: RuleCoreAbilitySkillCommandOwner
- Accepted Projection: `qComponentRoute`
- Target replay evidence requirement: Target replay must observe `qComponentRoute` from the copied component connector through the target's component admission/call/projection surface before downstream battle routes consume it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt` and require `qComponentRoute` comparator evidence from the copied component connector before any battle route consumes this component owner.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 69 - CRPI-READY-027

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/rule-core-attack-damage-disposition.mbt.qnt` as a `component-first` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/rule-core-attack-damage-disposition.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `packages/battle-runtime/rule-core-component-route.qnt`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-READY-027.json`, `tasks/history/CRPI-READY-027/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/rule-core-attack-damage-disposition.mbt.qnt`
- Route Class: `component-first`
- Connector Path(s): `packages/battle-runtime/rule-core-attack-damage-disposition.mbt.qnt`
- Durable Owner: RuleCoreAttackDamageDispositionOwner
- Accepted Projection: `qComponentRoute`
- Target replay evidence requirement: Target replay must observe `qComponentRoute` from the copied component connector through the target's component admission/call/projection surface before downstream battle routes consume it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/rule-core-attack-damage-disposition.mbt.qnt` and require `qComponentRoute` comparator evidence from the copied component connector before any battle route consumes this component owner.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 70 - CRPI-READY-028

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/rule-core-features.mbt.qnt` as a `component-first` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/rule-core-features.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `packages/battle-runtime/rule-core-component-route.qnt`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-READY-028.json`, `tasks/history/CRPI-READY-028/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/rule-core-features.mbt.qnt`
- Route Class: `component-first`
- Connector Path(s): `packages/battle-runtime/rule-core-features.mbt.qnt`
- Durable Owner: RuleCoreFeatureProfileSemanticsOwner
- Accepted Projection: `qComponentRoute`
- Target replay evidence requirement: Target replay must observe `qComponentRoute` from the copied component connector through the target's component admission/call/projection surface before downstream battle routes consume it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/rule-core-features.mbt.qnt` and require `qComponentRoute` comparator evidence from the copied component connector before any battle route consumes this component owner.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 71 - CRPI-READY-029

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/rule-core-hit-point-damage.mbt.qnt` as a `component-first` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/rule-core-hit-point-damage.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `packages/battle-runtime/rule-core-component-route.qnt`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-READY-029.json`, `tasks/history/CRPI-READY-029/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/rule-core-hit-point-damage.mbt.qnt`
- Route Class: `component-first`
- Connector Path(s): `packages/battle-runtime/rule-core-hit-point-damage.mbt.qnt`
- Durable Owner: RuleCoreHitPointDamageOwner
- Accepted Projection: `qComponentRoute`
- Target replay evidence requirement: Target replay must observe `qComponentRoute` from the copied component connector through the target's component admission/call/projection surface before downstream battle routes consume it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/rule-core-hit-point-damage.mbt.qnt` and require `qComponentRoute` comparator evidence from the copied component connector before any battle route consumes this component owner.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 72 - CRPI-READY-030

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/rule-core-movement.mbt.qnt` as a `component-first` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/rule-core-movement.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `packages/battle-runtime/rule-core-component-route.qnt`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-READY-030.json`, `tasks/history/CRPI-READY-030/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/rule-core-movement.mbt.qnt`
- Route Class: `component-first`
- Connector Path(s): `packages/battle-runtime/rule-core-movement.mbt.qnt`
- Durable Owner: RuleCoreMovementGrappleOwner
- Accepted Projection: `qComponentRoute`
- Target replay evidence requirement: Target replay must observe `qComponentRoute` from the copied component connector through the target's component admission/call/projection surface before downstream battle routes consume it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/rule-core-movement.mbt.qnt` and require `qComponentRoute` comparator evidence from the copied component connector before any battle route consumes this component owner.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 73 - CRPI-READY-031

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/rule-core-reactions.mbt.qnt` as a `component-first` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/rule-core-reactions.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `packages/battle-runtime/rule-core-component-route.qnt`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-READY-031.json`, `tasks/history/CRPI-READY-031/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/rule-core-reactions.mbt.qnt`
- Route Class: `component-first`
- Connector Path(s): `packages/battle-runtime/rule-core-reactions.mbt.qnt`
- Durable Owner: RuleCoreReactionContinuationConcentrationOwner
- Accepted Projection: `qComponentRoute`
- Target replay evidence requirement: Target replay must observe `qComponentRoute` from the copied component connector through the target's component admission/call/projection surface before downstream battle routes consume it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/rule-core-reactions.mbt.qnt` and require `qComponentRoute` comparator evidence from the copied component connector before any battle route consumes this component owner.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 74 - CRPI-READY-032

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/rule-core-shove-outcome.mbt.qnt` as a `component-first` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/rule-core-shove-outcome.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `packages/battle-runtime/rule-core-component-route.qnt`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-READY-032.json`, `tasks/history/CRPI-READY-032/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/rule-core-shove-outcome.mbt.qnt`
- Route Class: `component-first`
- Connector Path(s): `packages/battle-runtime/rule-core-shove-outcome.mbt.qnt`
- Durable Owner: RuleCoreShoveOutcomeOwner
- Accepted Projection: `qComponentRoute`
- Target replay evidence requirement: Target replay must observe `qComponentRoute` from the copied component connector through the target's component admission/call/projection surface before downstream battle routes consume it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/rule-core-shove-outcome.mbt.qnt` and require `qComponentRoute` comparator evidence from the copied component connector before any battle route consumes this component owner.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 75 - CRPI-READY-033

Status: `done`

Goal:

Implement target replay for the split rule-core spell connector corpus as a `component-first` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/rule-core-spell-damage.mbt.qnt`
- `packages/battle-runtime/rule-core-spell-restoration.mbt.qnt`
- `packages/battle-runtime/rule-core-spell-defensive-effect.mbt.qnt`
- `packages/battle-runtime/rule-core-spell-readied-response.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `packages/battle-runtime/rule-core-component-route.qnt`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-READY-033.json`, `tasks/history/CRPI-READY-033/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path(s):
  - `packages/battle-runtime/rule-core-spell-damage.mbt.qnt`
  - `packages/battle-runtime/rule-core-spell-restoration.mbt.qnt`
  - `packages/battle-runtime/rule-core-spell-defensive-effect.mbt.qnt`
  - `packages/battle-runtime/rule-core-spell-readied-response.mbt.qnt`
- Route Class: `component-first`
- Connector Path(s):
  - `packages/battle-runtime/rule-core-spell-damage.mbt.qnt`
  - `packages/battle-runtime/rule-core-spell-restoration.mbt.qnt`
  - `packages/battle-runtime/rule-core-spell-defensive-effect.mbt.qnt`
  - `packages/battle-runtime/rule-core-spell-readied-response.mbt.qnt`
- Durable Owner: RuleCoreSpellProcedureProfileOwner
- Accepted Projection: `qComponentRoute`
- Target replay evidence requirement: Target replay must observe `qComponentRoute` from the copied component connector through the target's component admission/call/projection surface before downstream battle routes consume it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for the four split rule-core spell connector drivers and require `qComponentRoute` comparator evidence from the copied component connector before any battle route consumes this component owner.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 76 - CRPI-BLOCK-037

Status: `blocked`

Blocker Type: dependency

Blocker Detail: Backlog row `packages/battle-runtime/rule-core-exact-damage-projection.mbt.qnt` is blocked by `source-qnt-corpus-blocker`; the dependency must provide source connector/acceptance evidence before implementation starts.

Goal:

Unblock and then implement target replay for `packages/battle-runtime/rule-core-exact-damage-projection.mbt.qnt` as a `component-first` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/rule-core-exact-damage-projection.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `packages/battle-runtime/rule-core-component-route.qnt`
- `.references/srd-5.2.1/`

Output After Unblock:

- Updated backlog row and queue entry replacing the blocker with a concrete durable owner or source dependency output.
- Target production/harness changes and accepted replay evidence only after the blocker is resolved.

Acceptance After Unblock:

- Driver Path: `packages/battle-runtime/rule-core-exact-damage-projection.mbt.qnt`
- Route Class: `component-first`
- Connector Path(s): `packages/battle-runtime/rule-core-exact-damage-projection.mbt.qnt`
- Current Owner Field: RuleCoreSpellProcedureProfileOwner; RuleCoreHitPointDamageOwner
- Required Accepted Projection: `qComponentRoute`
- Target replay evidence requirement: after unblock, evidence must be generated by public target entrypoints and record observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not implement while the durable owner is `owner-todo` or while a source connector dependency is unresolved.
- Do not use catalog identity, fixture labels, QNT action names, or historical target reports as a substitute for owner/source evidence.
- Do not add workaround adapters or duplicate state to bypass the blocker.

Verification After Unblock:

- Run `pnpm cleanroom-branch-coverage:check` after updating the source queue/backlog.
- Run target replay for `packages/battle-runtime/rule-core-exact-damage-projection.mbt.qnt` and the connector or dependency output that resolves this blocker.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the unblocked owner plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`update-required` when the blocker is resolved; update this queue task, the backlog row, and any dependent implementation tasks in the same planning change.

### Task 77 - CRPI-READY-034

Status: `done`

Goal:

Implement target replay for `packages/battle-runtime/rule-core-stat-block-controls.mbt.qnt` as a `component-first` reducer-convergence task.

Starting Points:

- `packages/battle-runtime/rule-core-stat-block-controls.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `packages/battle-runtime/rule-core-component-route.qnt`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-READY-034.json`, `tasks/history/CRPI-READY-034/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/battle-runtime/rule-core-stat-block-controls.mbt.qnt`
- Route Class: `component-first`
- Connector Path(s): `packages/battle-runtime/rule-core-stat-block-controls.mbt.qnt`
- Durable Owner: RuleCoreStatBlockControlOwner
- Accepted Projection: `qComponentRoute`
- Target replay evidence requirement: Target replay must observe `qComponentRoute` from the copied component connector through the target's component admission/call/projection surface before downstream battle routes consume it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/battle-runtime/rule-core-stat-block-controls.mbt.qnt` and require `qComponentRoute` comparator evidence from the copied component connector before any battle route consumes this component owner.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 78 - CRP05-SBE-01

Status: `done`

Goal:

Character sheet projection and composed battle runtime entry.

Starting Points:

- `packages/character-battle-runtime/character-battle-init-projection.mbt.qnt`
- `packages/character-battle-runtime/character-battle-init-projection.route.mbt.qnt`
- `packages/character-battle-runtime/character-battle-encounter-composition.route.mbt.qnt`
- `packages/character-battle-runtime/character-battle-reducer-route.qnt`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`

Output:

- Target production and quarantined harness changes in the cleanroom target for `CRP05-SBE-01`.
- `tasks/target-replay-evidence/CRP05-SBE-01.json`, `tasks/history/CRP05-SBE-01/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/BLOCKERS.md` only if a source or target blocker remains.

Acceptance:

- Driver Path: `packages/character-battle-runtime/character-battle-init-projection.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/character-battle-runtime/character-battle-init-projection.route.mbt.qnt`
- Durable Owner: Character Sheet and Character Build own source character facts before battle entry. CharacterBattleInitProjectionOwner owns the typed sheet-to-battle projection; CharacterBattleEncounterSetupOwner owns participant membership and Encounter Side facts; CharacterBattleSubjectProfileOwner owns subject-profile availability; CharacterBattleInitiativeOwner owns Initiative counts, stable Initiative order, and the initial current actor; CharacterBattleRuntimeOwner owns runtime entry.
- Accepted Projection(s): semantic projection `qState` from `packages/character-battle-runtime/character-battle-init-projection.mbt.qnt` with comparator `battle-init-projection-state`; route projection `qRoute` from `packages/character-battle-runtime/character-battle-init-projection.route.mbt.qnt` with comparator `route-event-list`; route projection `qRoute` from `packages/character-battle-runtime/character-battle-encounter-composition.route.mbt.qnt` with comparator `route-event-list`
- Task Family: session battle entry
- Target replay evidence requirement: accepted evidence must be generated by public target entrypoints, record the observed projection source, and match the source connector or semantic projection named above.
- Target replay observes semantic qState for sheet Hit Points, Armor Class, conditions, passive profiles, pure Pact Slot projection, mixed Spell Slot/Pact Slot init rejection, build-maximum rejection, and Stable recovery-progress rejection.
- Target replay observes qRoute from public handoff or reducer entrypoints for sheet/build projection, in-scope source-exact Pact Slot/resource facts, init rejection holes, and RouteEnterBattleRuntime through CharacterBattleInitProjectionOwner.
- The target must expose one composed battle setup or an equivalent typed pre-entry operation followed immediately by runtime entry; observed qRoute must include participant membership, non-sheet participant membership, Encounter Side relationship ownership, subject-profile availability ownership, Initiative count ownership, stable Initiative order ownership, current actor ownership, and runtime entry.
- The first current actor is derived from Initiative order inside CharacterBattleInitiativeOwner, not from a driver-local current-actor cache.

Target Owner Notes:

- Participant membership, Encounter Side, subject-profile availability, Initiative counts, stable Initiative order, and current actor are setup-owned battle facts once entry begins.
- Character Sheet and Character Build remain the source for pre-entry character facts; battle init consumes their projection and does not store duplicate sheet/build ledgers.
- Pact Slot source facts and init resource conflict facts are projected as typed resource facts so mixed or ambiguous resource states stay rejectable without claiming ordinary spell-slot capacity projection in this task.

Forbidden Shortcuts:

- Do not satisfy encounter entry with separate driver-local opponent, subject-profile, Initiative, or current-actor caches.
- Do not infer participant membership, Encounter Side, subject profiles, Initiative, or current actor from class, species, spell, monster, fixture, or catalog identity.
- Do not treat matching semantic qState alone as route acceptance; qRoute must be observed from the public entry path.

Verification:

- Run target replay for packages/character-battle-runtime/character-battle-init-projection.mbt.qnt and require semantic qState comparator battle-init-projection-state.
- Run target replay for packages/character-battle-runtime/character-battle-init-projection.route.mbt.qnt and packages/character-battle-runtime/character-battle-encounter-composition.route.mbt.qnt and require qRoute comparator route-event-list from public handoff or reducer entrypoints.
- Run RAW and domain-language review against .references/srd-5.2.1/Playing-the-Game.md#The Order of Combat, #Initiative, .references/srd-5.2.1/Rules-Glossary.md#Initiative, .references/srd-5.2.1/Spells/Gaining-and-Casting.md#Spell Slots, UBIQUITOUS_LANGUAGE.md, and plans/cleanroom-guidance/reducer-spine.md.
- Run pnpm cleanroom-branch-coverage:check.
- Run git diff --check.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 79 - CRPI-BLOCK-038

Status: `done`

Goal:

Implement target replay for `packages/character-battle-runtime/character-battle-origin-feat-selected-identity.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/character-battle-runtime/character-battle-origin-feat-selected-identity.mbt.qnt`
- `packages/character-battle-runtime/character-battle-origin-feat-selected-identity.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-038.json`, `tasks/history/CRPI-BLOCK-038/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/character-battle-runtime/character-battle-origin-feat-selected-identity.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/character-battle-runtime/character-battle-origin-feat-selected-identity.route.mbt.qnt`
- Durable Owner: CharacterBattleBuildProjectionOwner owns selected-reference retention; CharacterBattleInitProjectionOwner / CharacterBattleRuntimeOwner own Initiative handoff/runtime entry. Keep authored origin feat identity at catalog/selection/test boundary.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/character-battle-runtime/character-battle-origin-feat-selected-identity.mbt.qnt` and `packages/character-battle-runtime/character-battle-origin-feat-selected-identity.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from reducer route inventory derivability facts, QNT route connector owner evidence, RAW/domain language, and reducer-route owner vocabulary. This task is now runnable and still must produce its own copied `qRoute` versus public target replay evidence.

### Task 80 - CRP05-SBE-02

Status: `done`

Goal:

Sheet-derived battle acts and source-exact spell-slot settlement.

Starting Points:

- `packages/character-battle-runtime/character-session-sheet-derived-battle-acts.mbt.qnt`
- `packages/character-battle-runtime/character-session-sheet-derived-battle-acts.route.mbt.qnt`
- `packages/character-battle-runtime/character-battle-reducer-route.qnt`
- `packages/character-battle-runtime/README.md`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/Equipment.md`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`

Output:

- Target production and quarantined harness changes in the cleanroom target for `CRP05-SBE-02`.
- `tasks/target-replay-evidence/CRP05-SBE-02.json`, `tasks/history/CRP05-SBE-02/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/BLOCKERS.md` only if a source or target blocker remains.

Acceptance:

- Driver Path: `packages/character-battle-runtime/character-session-sheet-derived-battle-acts.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/character-battle-runtime/character-session-sheet-derived-battle-acts.route.mbt.qnt`
- Durable Owner: The finalized Character Session owns sheet/build facts before battle entry; BattleState owns generic battle subjects, action availability, target Hit Points, and ordinary spell-slot expenditure during battle; settlement writes only typed deltas back to the durable session.
- Accepted Projection(s): semantic projection `qState` from `packages/character-battle-runtime/character-session-sheet-derived-battle-acts.mbt.qnt` with comparator `sheet-derived-battle-act-state`; route projection `qRoute` from `packages/character-battle-runtime/character-session-sheet-derived-battle-acts.route.mbt.qnt` with comparator `route-event-list`
- Task Family: session battle entry
- Target replay evidence requirement: accepted evidence must be generated by public target entrypoints, record the observed projection source, and match the source connector or semantic projection named above.
- Target replay observes semantic qState for sheet-derived weapon attack capability, resource-backed spell attack capability, missing wielded-weapon rejection, missing selected-spell rejection, early spell fill rejection without spend, accepted spell invocation with one spent slot, stale open-action rejection, stale spell-fill rejection without second spend, spell-slot expenditure settlement, and exhausted slot rediscovery rejection.
- Target replay observes qRoute for sheet projection, participant membership, Encounter Side, subject-profile availability, Initiative/current actor setup, RouteEnterBattleRuntime, battle-to-sheet Hit Point settlement, resource-delta settlement, and HandoffSourceExactSpellSlotDeltaFact.
- The accepted spell invocation spends exactly one ordinary level-1-or-higher Spell Slot from the source-owned slot pool, reduces availability before stale rediscovery, and settles only the typed source-exact delta back to the durable Character Session.
- Weapon and spell subjects are derived from the finalized session's wielded weapon, prepared spell access, action availability, and Spell Slot availability; no manual SubjectProfile handoff is accepted.

Target Owner Notes:

- The finalized Character Session owns sheet/build facts before battle entry; BattleState owns action availability, target Hit Points, spell invocation state, and committed Spell Slot expenditure during battle.
- Settlement writes typed Hit Point and source-exact Spell Slot deltas back to the Character Session; it does not create a third resource ledger.
- Exhausted slot rediscovery is derived from battle-owned resource expenditure plus source slot availability rather than from an adapter-local spell availability cache.

Forbidden Shortcuts:

- Do not satisfy spell-act projection with driver-local subject-profile, opponent, Initiative, current-actor, or slot-availability caches.
- Do not spend a slot on early or stale spell fills, and do not hide missing prerequisite rejection behind a generic invalid-action result.
- Do not settle by copying the whole battle resource record back to the sheet; settlement evidence must carry source-exact Spell Slot delta facts.

Verification:

- Run target replay for packages/character-battle-runtime/character-session-sheet-derived-battle-acts.mbt.qnt and require semantic qState comparator sheet-derived-battle-act-state.
- Run target replay for packages/character-battle-runtime/character-session-sheet-derived-battle-acts.route.mbt.qnt and require qRoute comparator route-event-list from public handoff or reducer entrypoints.
- Run RAW and domain-language review against .references/srd-5.2.1/Equipment.md#Weapons, .references/srd-5.2.1/Playing-the-Game.md#The Order of Combat, #Initiative, .references/srd-5.2.1/Spells/Gaining-and-Casting.md#Spell Slots, UBIQUITOUS_LANGUAGE.md, packages/character-battle-runtime/README.md#Battle handoff settlement, and plans/cleanroom-guidance/reducer-spine.md.
- Run pnpm cleanroom-branch-coverage:check.
- Run git diff --check.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 81 - CRP06-SRO-01

Status: `done`

Goal:

Battle-to-sheet settlement and source-exact resource deltas.

Starting Points:

- `packages/character-battle-runtime/character-battle-settlement.mbt.qnt`
- `packages/character-battle-runtime/character-battle-settlement.route.mbt.qnt`
- `packages/character-battle-runtime/character-battle-reducer-route.qnt`
- `packages/character-battle-runtime/README.md`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`
- `.references/srd-5.2.1/Classes/Warlock.md`
- `.references/srd-5.2.1/Classes/Sorcerer.md`

Output:

- Target production and quarantined harness changes in the cleanroom target for `CRP06-SRO-01`.
- `tasks/target-replay-evidence/CRP06-SRO-01.json`, `tasks/history/CRP06-SRO-01/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/BLOCKERS.md` only if a source or target blocker remains.

Acceptance:

- Driver Path: `packages/character-battle-runtime/character-battle-settlement.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/character-battle-runtime/character-battle-settlement.route.mbt.qnt`
- Durable Owner: CharacterBattleSettlementOwner owns battle-to-sheet Hit Point, Temporary Hit Point, condition, Stable lifecycle, identity, and maximum-HP settlement gates; CharacterBattleResourceProjectionOwner owns source-exact ordinary Spell Slot, created Spell Slot, Pact Slot, and feature-resource delta projection. Character Sheet remains the durable state owner after settlement, and BattleState owns battle-local effects until settlement rejects or resolves them.
- Accepted Projection(s): semantic projection `qState` from `packages/character-battle-runtime/character-battle-settlement.mbt.qnt` with comparator `battle-settlement-state`; route projection `qRoute` from `packages/character-battle-runtime/character-battle-settlement.route.mbt.qnt` with comparator `route-event-list`
- Task Family: settlement/rest owner
- Target replay evidence requirement: accepted evidence must be generated by public target entrypoints, record the observed projection source, and match the source connector or semantic projection named above.
- Target replay observes semantic qState for accepted Hit Point, Temporary Hit Point, Poisoned, Prone, ordinary Spell Slot expenditure, spent Hit Dice preservation, rest-feature-use preservation, pure Pact Slot expenditure, feature-resource expenditure, accepted zero-HP Stable lifecycle, and every named settlement rejection.
- Target replay observes qRoute from the public handoff or reducer entrypoint for RouteSettleBattleToCharacterSheet, RouteRecordCharacterBattleHandoffFacts, HandoffSourceExactSpellSlotDeltaFact, HandoffSourceExactPactSlotDeltaFact, HandoffFeatureResourceDeltaFact, HandoffZeroHpStableLifecycleFact, HandoffSettlementConflictFact, HandoffIdentityMatchHoleFamily, and HandoffHitPointProjectionHoleFamily.
- Mixed ordinary Spell Slot and Pact Slot settlement, and source-ambiguous ordinary-vs-created Spell Slot settlement, must be rejected with settlement-conflict evidence rather than coerced into one aggregate slot ledger.
- Settlement writes typed deltas and fresh sheet play-state only after identity, maximum-HP, active Wild Shape, active battle-state, and in-progress Stable recovery checks pass.

Target Owner Notes:

- BattleState owns combat-time mutations until settlement; Character Sheet owns durable post-settlement HP, conditions, spent Hit Dice, rest-feature uses, ordinary Spell Slot expenditures, created Spell Slot deltas, Pact Slot expenditure, and feature-resource expenditure.
- CharacterBattleResourceProjectionOwner is the executable boundary for resource deltas, not a third durable resource store.
- Stable with no in-progress recovery timer can settle as zero-HP lifecycle state; in-progress Stable recovery elapsed time is rejected at handoff because the sheet rest owner, not settlement, must own recovery progression.

Forbidden Shortcuts:

- Do not copy the entire battle resource record into Character Sheet state.
- Do not merge ordinary Spell Slots, created Spell Slots, and Pact Slots into one settlement balance; source-exact deltas must remain distinguishable and conflict states must remain rejectable.
- Do not preserve active battle effects, Concentration, active Wild Shape form state, or in-progress Stable recovery timers by storing battle-local state on the sheet.

Verification:

- Run target replay for packages/character-battle-runtime/character-battle-settlement.mbt.qnt and require semantic qState comparator battle-settlement-state.
- Run target replay for packages/character-battle-runtime/character-battle-settlement.route.mbt.qnt and require qRoute comparator route-event-list from public handoff or reducer entrypoints.
- Run RAW and domain-language review against .references/srd-5.2.1/Playing-the-Game.md#Hit Points, #Stabilizing a Character, #Temporary Hit Points, .references/srd-5.2.1/Rules-Glossary.md#Stable, .references/srd-5.2.1/Spells/Gaining-and-Casting.md#Spell Slots, .references/srd-5.2.1/Classes/Warlock.md#Level 1: Pact Magic, .references/srd-5.2.1/Classes/Sorcerer.md#Level 2: Font of Magic, UBIQUITOUS_LANGUAGE.md, and packages/character-battle-runtime/README.md#Battle handoff settlement.
- Run pnpm cleanroom-branch-coverage:check.
- Run git diff --check.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 82 - CRPI-BLOCK-039

Status: `done`

Goal:

Implement target replay for `packages/character-battle-runtime/character-layer-projection-lifecycle.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/character-battle-runtime/character-layer-projection-lifecycle.mbt.qnt`
- `packages/character-battle-runtime/character-layer-projection-lifecycle.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-039.json`, `tasks/history/CRPI-BLOCK-039/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/character-battle-runtime/character-layer-projection-lifecycle.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/character-battle-runtime/character-layer-projection-lifecycle.route.mbt.qnt`
- Durable Owner: Existing layered owners: CharacterBattleBuildProjectionOwner, CharacterBattleSheetOwner, CharacterBattleInitProjectionOwner, CharacterBattleRuntimeOwner, CharacterBattleSettlementOwner. Do not invent monolithic lifecycle owner.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/character-battle-runtime/character-layer-projection-lifecycle.mbt.qnt` and `packages/character-battle-runtime/character-layer-projection-lifecycle.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from reducer route inventory derivability facts, QNT route connector owner evidence, RAW/domain language, and reducer-route owner vocabulary. This task is now runnable and still must produce its own copied `qRoute` versus public target replay evidence.

### Task 83 - CRPI-BLOCK-040

Status: `done`

Goal:

Implement target replay for `packages/character-battle-runtime/character-sheet-feature-resources.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/character-battle-runtime/character-sheet-feature-resources.mbt.qnt`
- `packages/character-battle-runtime/character-sheet-feature-resources.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-040.json`, `tasks/history/CRPI-BLOCK-040/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/character-battle-runtime/character-sheet-feature-resources.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/character-battle-runtime/character-sheet-feature-resources.route.mbt.qnt`
- Durable Owner: CharacterBattleSheetOwner owns sheet point/use state; CharacterBattleResourceProjectionOwner owns executable boundary deltas/holes for feature and spell resources; CharacterBattleRuntimeOwner owns battle-time metamagic/spell action state. Preserve source-exact ordinary/created/Pact distinctions.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/character-battle-runtime/character-sheet-feature-resources.mbt.qnt` and `packages/character-battle-runtime/character-sheet-feature-resources.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from reducer route inventory derivability facts, QNT route connector owner evidence, RAW/domain language, and reducer-route owner vocabulary. This task is now runnable and still must produce its own copied `qRoute` versus public target replay evidence.

### Task 84 - CRPI-BLOCK-041

Status: `done`

Goal:

Implement target replay for `packages/character-creation-runtime/character-creation-class-feature-projections.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/character-creation-runtime/character-creation-class-feature-projections.mbt.qnt`
- `packages/character-creation-runtime/character-creation-class-feature-projections.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-041.json`, `tasks/history/CRPI-BLOCK-041/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/character-creation-runtime/character-creation-class-feature-projections.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/character-creation-runtime/character-creation-class-feature-projections.route.mbt.qnt`
- Durable Owner: CharacterBuildOwner owns build fact projection; source facts remain retained build facts plus Unit catalog, not duplicate resource/source state.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/character-creation-runtime/character-creation-class-feature-projections.mbt.qnt` and `packages/character-creation-runtime/character-creation-class-feature-projections.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from reducer route inventory derivability facts, QNT route connector owner evidence, RAW/domain language, and reducer-route owner vocabulary. This task is now runnable and still must produce its own copied `qRoute` versus public target replay evidence.

### Task 85 - CRPI-BLOCK-042

Status: `done`

Goal:

Implement target replay for `packages/character-creation-runtime/character-creation-class-feature-selected-identity.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/character-creation-runtime/character-creation-class-feature-selected-identity.mbt.qnt`
- `packages/character-creation-runtime/character-creation-class-feature-selected-identity.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-042.json`, `tasks/history/CRPI-BLOCK-042/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/character-creation-runtime/character-creation-class-feature-selected-identity.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/character-creation-runtime/character-creation-class-feature-selected-identity.route.mbt.qnt`
- Durable Owner: CreationSelectedReferenceOwner owns retained selected Unit refs; CharacterBuildOwner owns projected finalized build facts.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/character-creation-runtime/character-creation-class-feature-selected-identity.mbt.qnt` and `packages/character-creation-runtime/character-creation-class-feature-selected-identity.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from reducer route inventory derivability facts, QNT route connector owner evidence, RAW/domain language, and reducer-route owner vocabulary. This task is now runnable and still must produce its own copied `qRoute` versus public target replay evidence.

### Task 86 - CRPI-BLOCK-043

Status: `done`

Goal:

Implement target replay for `packages/character-creation-runtime/character-creation-cleric-druid-order-selected-identity.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/character-creation-runtime/character-creation-cleric-druid-order-selected-identity.mbt.qnt`
- `packages/character-creation-runtime/character-creation-cleric-druid-order-selected-identity.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-043.json`, `tasks/history/CRPI-BLOCK-043/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/character-creation-runtime/character-creation-cleric-druid-order-selected-identity.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/character-creation-runtime/character-creation-cleric-druid-order-selected-identity.route.mbt.qnt`
- Durable Owner: CreationSelectedReferenceOwner owns selected Divine/Primal Order option refs; CharacterBuildOwner owns build projection.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/character-creation-runtime/character-creation-cleric-druid-order-selected-identity.mbt.qnt` and `packages/character-creation-runtime/character-creation-cleric-druid-order-selected-identity.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from reducer route inventory derivability facts, QNT route connector owner evidence, RAW/domain language, and reducer-route owner vocabulary. This task is now runnable and still must produce its own copied `qRoute` versus public target replay evidence.

### Task 87 - CRPI-BLOCK-044

Status: `done`

Goal:

Implement target replay for `packages/character-creation-runtime/character-creation-fighter-fighting-style-selected-identity.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/character-creation-runtime/character-creation-fighter-fighting-style-selected-identity.mbt.qnt`
- `packages/character-creation-runtime/character-creation-fighter-fighting-style-selected-identity.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-044.json`, `tasks/history/CRPI-BLOCK-044/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/character-creation-runtime/character-creation-fighter-fighting-style-selected-identity.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/character-creation-runtime/character-creation-fighter-fighting-style-selected-identity.route.mbt.qnt`
- Durable Owner: CreationSelectedReferenceOwner owns initial Fighting Style feat ref; CharacterBuildOwner owns Fighter level-gain replacement operation/projection.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/character-creation-runtime/character-creation-fighter-fighting-style-selected-identity.mbt.qnt` and `packages/character-creation-runtime/character-creation-fighter-fighting-style-selected-identity.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from reducer route inventory derivability facts, QNT route connector owner evidence, RAW/domain language, and reducer-route owner vocabulary. This task is now runnable and still must produce its own copied `qRoute` versus public target replay evidence.

### Task 88 - CRPI-BLOCK-045

Status: `done`

Goal:

Implement target replay for `packages/character-creation-runtime/character-creation-rogue-expertise-selected-identity.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/character-creation-runtime/character-creation-rogue-expertise-selected-identity.mbt.qnt`
- `packages/character-creation-runtime/character-creation-rogue-expertise-selected-identity.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-045.json`, `tasks/history/CRPI-BLOCK-045/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/character-creation-runtime/character-creation-rogue-expertise-selected-identity.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/character-creation-runtime/character-creation-rogue-expertise-selected-identity.route.mbt.qnt`
- Durable Owner: CreationSelectedReferenceOwner owns level-1 owned skill Expertise selection; final proficiency-level projection derives from build/proficiency facts, not duplicate skill state. Scoped: do not include level-six additional owned skill Expertise branch (inventory outside denominator).
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/character-creation-runtime/character-creation-rogue-expertise-selected-identity.mbt.qnt` and `packages/character-creation-runtime/character-creation-rogue-expertise-selected-identity.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from reducer route inventory derivability facts, QNT route connector owner evidence, RAW/domain language, and reducer-route owner vocabulary. This task is now runnable and still must produce its own copied `qRoute` versus public target replay evidence.

### Task 89 - CRP04-CCF-01

Status: `done`

Goal:

Character creation accepted fill batches, hole rediscovery, and finalization.

Starting Points:

- `packages/character-creation-runtime/character-creation-runtime.mbt.qnt`
- `packages/character-creation-runtime/character-creation-runtime-slice.qnt`
- `packages/character-creation-runtime/character-creation-runtime.route.mbt.qnt`
- `packages/character-creation-runtime/character-creation-reducer-route.qnt`
- `packages/character-creation-runtime/VOCABULARY.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/Character-Creation.md`
- `.references/srd-5.2.1/Character-Origins.md`
- `.references/srd-5.2.1/Classes/Fighter.md`
- `.references/srd-5.2.1/Equipment.md`

Output:

- Target production and quarantined harness changes in the cleanroom target for `CRP04-CCF-01`.
- `tasks/target-replay-evidence/CRP04-CCF-01.json`, `tasks/history/CRP04-CCF-01/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/BLOCKERS.md` only if a source or target blocker remains.

Acceptance:

- Driver Path: `packages/character-creation-runtime/character-creation-runtime.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/character-creation-runtime/character-creation-runtime.route.mbt.qnt`
- Durable Owner: Character Draft owns draft revision and accepted creation selections; Creation Hole Frontier is derived from the draft plus support-profile admission; Character Build owns finalized build facts. A target must not store open holes, finalization status, or issue lists as duplicate durable state beside their source facts.
- Accepted Projection(s): semantic projection `qState` from `packages/character-creation-runtime/character-creation-runtime.mbt.qnt` with comparator `character-creation-runtime-state`
- Task Family: character-creation fill batch
- Target replay evidence requirement: accepted evidence must be generated by public target entrypoints, record the observed projection source, and match the source connector or semantic projection named above.
- Target replay observes semantic qState for each accepted branch: CreationAccepted outcome, one revision increment per accepted batch, accepted fills applied to the Character Draft, openHoles equal to openCreationHoles(draft), and finalization equal to finalizeDraft(draft).
- Target replay observes route qRoute for draft creation, RouteApplyCreationFillBatch, RouteDiscoverCreationHoles after every accepted batch, RouteRecordCreationFacts for partial draft facts where the route connector names them, and RouteFinalizeCharacterDraft only after the loadout batch reaches RuntimeFinalized.
- Accepted fill application must preserve batch atomicity: validation happens for the whole submitted batch before draft mutation, and the target cannot apply a prefix of a later-rejected batch.
- Hole rediscovery is derived after each accepted batch; an empty openHoles Set means there are no holes left, while an absent open-hole projection is not accepted as a second spelling of empty.

Target Owner Notes:

- Character Draft stores accepted source facts and revision; open holes and finalization are projections from Character Draft plus support-profile facts.
- Character Build is created only through the finalization gate once holes are empty and support-profile admission succeeds.
- Empty qState.batchIssueCodes and empty qState.fillIssues mean no issues; a missing issue collection is not equivalent to an empty one.

Forbidden Shortcuts:

- Do not copy TypeScript module shape or historical Rust July projection fields as target acceptance.
- Do not branch target runtime behavior on authored ids, labels, slugs, or official catalog identity.
- Do not store a duplicate durable open-hole or finalization ledger beside the draft facts that derive it.

Verification:

- Run target replay for packages/character-creation-runtime/character-creation-runtime.mbt.qnt and require semantic qState comparator character-creation-runtime-state.
- Run target replay for packages/character-creation-runtime/character-creation-runtime.route.mbt.qnt and require qRoute comparator route-event-list from public reducer entrypoints.
- Run RAW and domain-language review against .references/srd-5.2.1/Character-Creation.md, Character-Origins.md, Classes/Fighter.md, Equipment.md, UBIQUITOUS_LANGUAGE.md, and packages/character-creation-runtime/VOCABULARY.md.
- Run pnpm cleanroom-branch-coverage:check.
- Run git diff --check.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 90 - CRP04-CCF-02

Status: `done`

Goal:

Character creation stale revision, duplicate fill, wrong-kind, and closed-hole rejection.

Starting Points:

- `packages/character-creation-runtime/character-creation-runtime.mbt.qnt`
- `packages/character-creation-runtime/character-creation-runtime-slice.qnt`
- `packages/character-creation-runtime/character-creation-runtime.route.mbt.qnt`
- `packages/character-creation-runtime/character-creation-reducer-route.qnt`
- `packages/character-creation-runtime/VOCABULARY.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/Character-Creation.md`

Output:

- Target production and quarantined harness changes in the cleanroom target for `CRP04-CCF-02`.
- `tasks/target-replay-evidence/CRP04-CCF-02.json`, `tasks/history/CRP04-CCF-02/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/BLOCKERS.md` only if a source or target blocker remains.

Acceptance:

- Driver Path: `packages/character-creation-runtime/character-creation-runtime.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/character-creation-runtime/character-creation-runtime.route.mbt.qnt`
- Durable Owner: Character Draft owns draft revision and accepted creation selections; Creation Hole Frontier is derived from the draft plus support-profile admission; Character Build owns finalized build facts. A target must not store open holes, finalization status, or issue lists as duplicate durable state beside their source facts.
- Accepted Projection(s): semantic projection `qState` from `packages/character-creation-runtime/character-creation-runtime.mbt.qnt` with comparator `character-creation-runtime-state`
- Task Family: character-creation fill batch
- Target replay evidence requirement: accepted evidence must be generated by public target entrypoints, record the observed projection source, and match the source connector or semantic projection named above.
- Target replay observes semantic qState rejection for stale revision with batchIssueCodes containing staleRevision, CreationRejected outcome, original draft preserved, original holes preserved, and finalization recomputed from the unchanged draft.
- Target replay observes semantic qState rejection for duplicate fill in one batch with fillIssues containing duplicateFill for the repeated hole and no partial draft mutation.
- Target replay observes semantic qState rejection for wrong fill kind with fillIssues containing wrongFillKind when an ability-score fill targets the progression choice hole.
- Target replay observes semantic qState rejection for closed or non-open holes with fillIssues containing unknownHole and no draft mutation.
- Target replay observes route qRoute rejection owners through RouteApplyCreationFillBatch and RouteDiscoverCreationHoles, with CreationStaleFillRejectionFact recorded for stale revision.

Target Owner Notes:

- Rejected batches return the unchanged Character Draft and the derived holes for that unchanged draft.
- Batch-level issues and fill-level issues are distinct collections; empty collection and absent collection are not interchangeable.
- Closed-hole and non-open-hole rejection is a fill validation result, not a separate durable hole-status field.

Forbidden Shortcuts:

- Do not copy TypeScript module shape or historical Rust July projection fields as target acceptance.
- Do not implement rejection by mutating and rolling back draft state; the batch must be validated before mutation.
- Do not introduce adapter-local expected routes in place of observed public reducer route events.

Verification:

- Run target replay for packages/character-creation-runtime/character-creation-runtime.mbt.qnt and require semantic qState comparator character-creation-runtime-state.
- Run target replay for packages/character-creation-runtime/character-creation-runtime.route.mbt.qnt and require qRoute comparator route-event-list from public reducer entrypoints.
- Run RAW and domain-language review against .references/srd-5.2.1/Character-Creation.md, Character-Origins.md, Classes/Fighter.md, Equipment.md, UBIQUITOUS_LANGUAGE.md, and packages/character-creation-runtime/VOCABULARY.md.
- Run pnpm cleanroom-branch-coverage:check.
- Run git diff --check.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 91 - CRP04-CCF-03

Status: `done`

Goal:

Character creation choice cardinality and support-profile rejection.

Starting Points:

- `packages/character-creation-runtime/character-creation-runtime.mbt.qnt`
- `packages/character-creation-runtime/character-creation-runtime-slice.qnt`
- `packages/character-creation-runtime/character-creation-runtime.route.mbt.qnt`
- `packages/character-creation-runtime/character-creation-reducer-route.qnt`
- `packages/character-creation-runtime/VOCABULARY.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/Character-Creation.md`
- `.references/srd-5.2.1/Character-Origins.md`
- `.references/srd-5.2.1/Classes/Fighter.md`
- `.references/srd-5.2.1/Equipment.md`

Output:

- Target production and quarantined harness changes in the cleanroom target for `CRP04-CCF-03`.
- `tasks/target-replay-evidence/CRP04-CCF-03.json`, `tasks/history/CRP04-CCF-03/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/BLOCKERS.md` only if a source or target blocker remains.

Acceptance:

- Driver Path: `packages/character-creation-runtime/character-creation-runtime.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/character-creation-runtime/character-creation-runtime.route.mbt.qnt`
- Durable Owner: Character Draft owns draft revision and accepted creation selections; Creation Hole Frontier is derived from the draft plus support-profile admission; Character Build owns finalized build facts. A target must not store open holes, finalization status, or issue lists as duplicate durable state beside their source facts.
- Accepted Projection(s): semantic projection `qState` from `packages/character-creation-runtime/character-creation-runtime.mbt.qnt` with comparator `character-creation-runtime-state`
- Task Family: character-creation fill batch
- Target replay evidence requirement: accepted evidence must be generated by public target entrypoints, record the observed projection source, and match the source connector or semantic projection named above.
- Target replay observes semantic qState rejection for duplicate choices inside one language fill with fillIssues containing invalidChoice.
- Target replay observes semantic qState rejection for too few and too many language choices with fillIssues containing tooFewChoices and tooManyChoices respectively.
- Target replay observes semantic qState rejection for unsupported but valid choices with fillIssues containing unsupportedChoice and with Character Draft unchanged.
- Target replay observes route qRoute assigning unsupported-option rejection to CreationSupportProfileAdmissionOwner where the connector names that owner, while ordinary cardinality and duplicate-choice rejection stays with CharacterDraftOwner.
- The target must preserve SRD choice counts as executable validation facts, not as display labels or authored identity dispatch.

Target Owner Notes:

- Support Profile is a package-private runtime boundary for fill admission; it is not authored provenance and not a Surface content status label.
- Valid-but-unsupported choices remain distinct from invalid choices; both issue collections must be present when non-empty and must be empty rather than absent on accepted branches.
- Choice cardinality is derived from the hole family; the target must not store a separate mutable required-count copy per draft.

Forbidden Shortcuts:

- Do not copy TypeScript module shape or historical Rust July projection fields as target acceptance.
- Do not collapse support-profile admission, authored provenance, and runtime projection into one field.
- Do not accept catalog admission alone as proof that a fill is supported by the character creation runtime.

Verification:

- Run target replay for packages/character-creation-runtime/character-creation-runtime.mbt.qnt and require semantic qState comparator character-creation-runtime-state.
- Run target replay for packages/character-creation-runtime/character-creation-runtime.route.mbt.qnt and require qRoute comparator route-event-list from public reducer entrypoints.
- Run RAW and domain-language review against .references/srd-5.2.1/Character-Creation.md, Character-Origins.md, Classes/Fighter.md, Equipment.md, UBIQUITOUS_LANGUAGE.md, and packages/character-creation-runtime/VOCABULARY.md.
- Run pnpm cleanroom-branch-coverage:check.
- Run git diff --check.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 92 - CRPI-BLOCK-046

Status: `ready-for-research`

Goal:

Implement target replay for `packages/character-creation-runtime/character-creation-warlock-eldritch-invocations-selected-identity.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/character-creation-runtime/character-creation-warlock-eldritch-invocations-selected-identity.mbt.qnt`
- `packages/character-creation-runtime/character-creation-warlock-eldritch-invocations-selected-identity.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-046.json`, `tasks/history/CRPI-BLOCK-046/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/character-creation-runtime/character-creation-warlock-eldritch-invocations-selected-identity.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/character-creation-runtime/character-creation-warlock-eldritch-invocations-selected-identity.route.mbt.qnt`
- Durable Owner: CreationSelectedReferenceOwner owns invocation choices; CharacterBuildOwner owns retained/Pact Magic projection; CreationSupportProfileAdmissionOwner owns duplicate/prerequisite rejection. Track level-5 prerequisite branch scope explicitly.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public reducer entrypoints; for battle routes this means the shared `start_battle -> discover_battle_acts -> resolve_battle_subject` shape or the named interrupt/turn-advancement public surface when the connector requires it.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/character-creation-runtime/character-creation-warlock-eldritch-invocations-selected-identity.mbt.qnt` and `packages/character-creation-runtime/character-creation-warlock-eldritch-invocations-selected-identity.route.mbt.qnt`; require `qRoute` route-event evidence from public target reducer entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by the driver plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` in the source repo package before handoff.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from reducer route inventory derivability facts, QNT route connector owner evidence, RAW/domain language, and reducer-route owner vocabulary. This task is now runnable and still must produce its own copied `qRoute` versus public target replay evidence.

### Task 93 - CRPI-BLOCK-047

Status: `done`

Owner Decision Applied:

Backlog row `packages/character-creation-runtime/character-creation-weapon-mastery-containers-selected-identity.mbt.qnt` now records a durable owner from the QNT route connector, reducer route bridge, and rules-kernel coverage evidence.

Goal:

Implement target replay for `packages/character-creation-runtime/character-creation-weapon-mastery-containers-selected-identity.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/character-creation-runtime/character-creation-weapon-mastery-containers-selected-identity.mbt.qnt`
- `packages/character-creation-runtime/character-creation-weapon-mastery-containers-selected-identity.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-047.json`, `tasks/history/CRPI-BLOCK-047/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/character-creation-runtime/character-creation-weapon-mastery-containers-selected-identity.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/character-creation-runtime/character-creation-weapon-mastery-containers-selected-identity.route.mbt.qnt`
- Durable Owner: CreationSelectedReferenceOwner owns Weapon Mastery selected weapon reference retention during character creation finalization; CharacterBuildOwner owns the finalized CharacterBuild class-choice refs. Selected mastery-property execution is not owned by this creation selected-reference replay.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public Character Creation reducer or projection entrypoints and record observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Target Owner Notes:

- Route connector `packages/character-creation-runtime/character-creation-weapon-mastery-containers-selected-identity.route.mbt.qnt` emits `routeRetainCreationSelectedReferences` for `CreationSelectedReferenceRouteSubject` owned by `CreationSelectedReferenceOwner`.
- Route bridge `packages/character-creation-runtime/src/reducer-route-connectors.mbt.test.ts` maps the same events to public creation route events with owner `creationSelectedReference`.
- Rules-kernel coverage `CREATION.WEAPON_MASTERY.CHOICE_FINALIZATION` records character creation finalization as selected `CharacterBuild` class-choice refs without owning selected mastery-property behavior.

Forbidden Shortcuts:

- Do not use catalog identity, fixture labels, QNT action names, or historical target reports as a substitute for owner/source evidence.
- Do not add workaround adapters or duplicate state to bypass the blocker.
- Do not duplicate selected weapon refs outside the CharacterBuild class-choice reference facts that finalization already owns.
- Do not move mastery-property execution into the character-creation selected-reference replay.

Verification:

- Run `pnpm cleanroom-branch-coverage:check` after updating the source queue/backlog.
- Run target replay for `packages/character-creation-runtime/character-creation-weapon-mastery-containers-selected-identity.mbt.qnt` and `packages/character-creation-runtime/character-creation-weapon-mastery-containers-selected-identity.route.mbt.qnt`; require `qRoute` route-event evidence from public Character Creation target entrypoints.
- Run RAW and ubiquitous-language review against the local `.references/srd-5.2.1/` passages selected by this route plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from the QNT route connector, Character Creation route bridge, rules-kernel coverage, and route inventory facts. This task is now runnable and still must produce its own copied `qRoute` versus public target replay evidence.

### Task 94 - CRPI-BLOCK-048

Status: `done`

Goal:

Implement target replay for `packages/character-sheet-runtime/character-sheet-ability-check-proficiency-bonus.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/character-sheet-runtime/character-sheet-ability-check-proficiency-bonus.mbt.qnt`
- `packages/character-sheet-runtime/character-sheet-ability-check-proficiency-bonus.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-048.json`, `tasks/history/CRPI-BLOCK-048/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/character-sheet-runtime/character-sheet-ability-check-proficiency-bonus.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/character-sheet-runtime/character-sheet-ability-check-proficiency-bonus.route.mbt.qnt`
- Durable Owner: CharacterSheetBuildProjectionOwner owns Ability Check Proficiency Bonus projection from CharacterBuild proficiency, Expertise, Jack of All Trades, level, and typed other-bonus gates. Character Sheet must not store a parallel proficiency or expertise ledger beside the build-derived facts.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public Character Sheet reducer or projection entrypoints and record observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Target Owner Notes:

- Route inventory records six in-scope obligations with no blockers and cites sheet build-fact projection owner evidence for the `qRoute` path.
- The target replay must use public Character Sheet projection entrypoints rather than fixture-local proficiency totals.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/character-sheet-runtime/character-sheet-ability-check-proficiency-bonus.mbt.qnt` and `packages/character-sheet-runtime/character-sheet-ability-check-proficiency-bonus.route.mbt.qnt`; require `qRoute` route-event evidence from public Character Sheet target entrypoints.
- Run RAW and ubiquitous-language review against the local SRD passages selected by this route plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` after updating the source queue/backlog.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from route connector owners, route inventory derivability facts, and accepted Character Sheet owner-boundary evidence where cited; this task is now runnable. The task still must produce its own copied `qRoute` versus public target replay evidence.

### Task 95 - CRPI-BLOCK-049

Status: `done`

Goal:

Implement target replay for `packages/character-sheet-runtime/character-sheet-arcane-recovery-selected-identity.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/character-sheet-runtime/character-sheet-arcane-recovery-selected-identity.mbt.qnt`
- `packages/character-sheet-runtime/character-sheet-arcane-recovery-selected-identity.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-049.json`, `tasks/history/CRPI-BLOCK-049/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/character-sheet-runtime/character-sheet-arcane-recovery-selected-identity.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/character-sheet-runtime/character-sheet-arcane-recovery-selected-identity.route.mbt.qnt`
- Durable Owner: CharacterSheetSpellSlotOwner owns ordinary Spell Slot refund and reset deltas; CharacterSheetFeatureResourceOwner owns Arcane Recovery use lockout; CharacterSheetPactSlotOwner owns the Pact Slot rejection boundary. Slot capacities stay build-derived projections, not duplicated sheet state.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public Character Sheet reducer or projection entrypoints and record observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Target Owner Notes:

- Route inventory records three in-scope obligations with no blockers.
- `CRP06-SRO-03` accepted the ordinary Spell Slot, Pact Slot, and rest-triggered feature-resource owner split used by this route.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/character-sheet-runtime/character-sheet-arcane-recovery-selected-identity.mbt.qnt` and `packages/character-sheet-runtime/character-sheet-arcane-recovery-selected-identity.route.mbt.qnt`; require `qRoute` route-event evidence from public Character Sheet target entrypoints.
- Run RAW and ubiquitous-language review against the local SRD passages selected by this route plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` after updating the source queue/backlog.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from route connector owners, route inventory derivability facts, and accepted Character Sheet owner-boundary evidence where cited; this task is now runnable. The task still must produce its own copied `qRoute` versus public target replay evidence.

### Task 96 - CRPI-BLOCK-050

Status: `done`

Goal:

Implement target replay for `packages/character-sheet-runtime/character-sheet-armor-class-base-selected-identity.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/character-sheet-runtime/character-sheet-armor-class-base-selected-identity.mbt.qnt`
- `packages/character-sheet-runtime/character-sheet-armor-class-base-selected-identity.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-050.json`, `tasks/history/CRPI-BLOCK-050/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/character-sheet-runtime/character-sheet-armor-class-base-selected-identity.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/character-sheet-runtime/character-sheet-armor-class-base-selected-identity.route.mbt.qnt`
- Durable Owner: CharacterSheetSelectedReferenceOwner owns selected Armor Class base references; CharacterSheetBuildProjectionOwner owns Armor Class projection from build, loadout, and Surface facts. Selected identity is retained reference evidence, not behavior dispatch.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public Character Sheet reducer or projection entrypoints and record observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Target Owner Notes:

- Route inventory records six in-scope obligations with no blockers and cites selected-reference retention plus build projection for the `qRoute` path.
- Unarmored Defense and Armor Class source facts must be projected from existing build/loadout inputs rather than copied into a route-local AC store.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/character-sheet-runtime/character-sheet-armor-class-base-selected-identity.mbt.qnt` and `packages/character-sheet-runtime/character-sheet-armor-class-base-selected-identity.route.mbt.qnt`; require `qRoute` route-event evidence from public Character Sheet target entrypoints.
- Run RAW and ubiquitous-language review against the local SRD passages selected by this route plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` after updating the source queue/backlog.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from route connector owners, route inventory derivability facts, and accepted Character Sheet owner-boundary evidence where cited; this task is now runnable. The task still must produce its own copied `qRoute` versus public target replay evidence.

### Task 97 - CRPI-BLOCK-051

Status: `done`

Goal:

Implement target replay for `packages/character-sheet-runtime/character-sheet-class-feature-selected-identity.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/character-sheet-runtime/character-sheet-class-feature-selected-identity.mbt.qnt`
- `packages/character-sheet-runtime/character-sheet-class-feature-selected-identity.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-051.json`, `tasks/history/CRPI-BLOCK-051/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/character-sheet-runtime/character-sheet-class-feature-selected-identity.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/character-sheet-runtime/character-sheet-class-feature-selected-identity.route.mbt.qnt`
- Durable Owner: CharacterSheetSelectedReferenceOwner owns retained class-feature and subclass references; CharacterSheetBuildProjectionOwner owns derived Ability Check and spell-access projections; existing Character Sheet state owns Druid land choice where the route reads that sheet fact. Selected feature identity remains retained reference evidence, not executable dispatch.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public Character Sheet reducer or projection entrypoints and record observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Target Owner Notes:

- Route inventory records eight in-scope obligations with no blockers and explicit selected-reference plus build-projection owner evidence.
- Do not overclaim existing manifest coverage for every branch; this task must still generate its own target replay evidence.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/character-sheet-runtime/character-sheet-class-feature-selected-identity.mbt.qnt` and `packages/character-sheet-runtime/character-sheet-class-feature-selected-identity.route.mbt.qnt`; require `qRoute` route-event evidence from public Character Sheet target entrypoints.
- Run RAW and ubiquitous-language review against the local SRD passages selected by this route plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` after updating the source queue/backlog.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from route connector owners, route inventory derivability facts, and accepted Character Sheet owner-boundary evidence where cited; this task is now runnable. The task still must produce its own copied `qRoute` versus public target replay evidence.

### Task 98 - CRPI-BLOCK-052

Status: `done`

Goal:

Implement target replay for `packages/character-sheet-runtime/character-sheet-healing-resource-selected-identity.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/character-sheet-runtime/character-sheet-healing-resource-selected-identity.mbt.qnt`
- `packages/character-sheet-runtime/character-sheet-healing-resource-selected-identity.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-052.json`, `tasks/history/CRPI-BLOCK-052/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/character-sheet-runtime/character-sheet-healing-resource-selected-identity.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/character-sheet-runtime/character-sheet-healing-resource-selected-identity.route.mbt.qnt`
- Durable Owner: CharacterSheetFeatureResourceOwner owns Lay On Hands pool spend; CharacterSheetHitPointOwner owns Hit Point restoration; the existing Character Sheet condition list owns Poisoned removal because the route vocabulary has no separate sheet condition owner.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public Character Sheet reducer or projection entrypoints and record observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Target Owner Notes:

- Route inventory records one in-scope obligation with no blockers and names feature-resource plus Hit Point owner evidence.
- The target must not add a parallel healing-resource, HP, or condition-removal ledger to satisfy replay.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/character-sheet-runtime/character-sheet-healing-resource-selected-identity.mbt.qnt` and `packages/character-sheet-runtime/character-sheet-healing-resource-selected-identity.route.mbt.qnt`; require `qRoute` route-event evidence from public Character Sheet target entrypoints.
- Run RAW and ubiquitous-language review against the local SRD passages selected by this route plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` after updating the source queue/backlog.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from route connector owners, route inventory derivability facts, and accepted Character Sheet owner-boundary evidence where cited; this task is now runnable. The task still must produce its own copied `qRoute` versus public target replay evidence.

### Task 99 - CRPI-BLOCK-053

Status: `done`

Goal:

Implement target replay for `packages/character-sheet-runtime/character-sheet-hit-point-maximum.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/character-sheet-runtime/character-sheet-hit-point-maximum.mbt.qnt`
- `packages/character-sheet-runtime/character-sheet-hit-point-maximum.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-053.json`, `tasks/history/CRPI-BLOCK-053/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/character-sheet-runtime/character-sheet-hit-point-maximum.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/character-sheet-runtime/character-sheet-hit-point-maximum.route.mbt.qnt`
- Durable Owner: CharacterSheetHitPointOwner owns effective and reduced Hit Point Maximum projection boundaries; CharacterSheetBuildProjectionOwner owns normal maximum arithmetic inputs from build facts. Normal Hit Point Maximum remains derived, while maximum reduction is sheet Hit Point state.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public Character Sheet reducer or projection entrypoints and record observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Target Owner Notes:

- Route inventory records six in-scope obligations with no blockers and cites Hit Point owner plus build arithmetic facts.
- `CRP06-SRO-02` accepted the split where current HP, Temporary HP, and maximum reduction are sheet HP state while normal maximum is build-derived.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/character-sheet-runtime/character-sheet-hit-point-maximum.mbt.qnt` and `packages/character-sheet-runtime/character-sheet-hit-point-maximum.route.mbt.qnt`; require `qRoute` route-event evidence from public Character Sheet target entrypoints.
- Run RAW and ubiquitous-language review against the local SRD passages selected by this route plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` after updating the source queue/backlog.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from route connector owners, route inventory derivability facts, and accepted Character Sheet owner-boundary evidence where cited; this task is now runnable. The task still must produce its own copied `qRoute` versus public target replay evidence.

### Task 100 - CRP06-SRO-02

Status: `done`

Goal:

Character Sheet rest, Hit Point, and Hit Dice owner boundaries.

Starting Points:

- `packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.mbt.qnt`
- `packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.route.mbt.qnt`
- `packages/character-sheet-runtime/character-sheet-reducer-route.qnt`
- `packages/character-sheet-runtime/src/rests.ts`
- `packages/character-sheet-runtime/README.md`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `.references/srd-5.2.1/Rules-Glossary.md`

Output:

- Target production and quarantined harness changes in the cleanroom target for `CRP06-SRO-02`.
- `tasks/target-replay-evidence/CRP06-SRO-02.json`, `tasks/history/CRP06-SRO-02/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/BLOCKERS.md` only if a source or target blocker remains.

Acceptance:

- Driver Path: `packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.route.mbt.qnt`
- Durable Owner: CharacterSheetHitPointOwner owns current Hit Points, Temporary Hit Points, Hit Point Maximum reduction, and Long Rest HP restoration; CharacterSheetHitDiceOwner owns spent Hit Dice and Short Rest Hit Die spending. CharacterSheetStateOwner owns rest duration and Long Rest calendar gates, while build-derived Hit Die capacity and normal Hit Point Maximum are projections, not duplicated rest state.
- Accepted Projection(s): semantic projection `qState` from `packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.mbt.qnt` with comparator `character-sheet-hp-rest-hit-dice-state`; route projection `qRoute` from `packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.route.mbt.qnt` with comparator `route-event-list`
- Task Family: settlement/rest owner
- Target replay evidence requirement: accepted evidence must be generated by public target entrypoints, record the observed projection source, and match the source connector or semantic projection named above.
- Target replay observes semantic qState for all rest start gates, duration gates, interruption outcomes, Short Rest Hit Die spending, sequential Hit Die spending, Long Rest HP restoration, Hit Point Maximum reduction clearing, Temporary Hit Point clearing, and spent Hit Dice restoration.
- Target replay observes qRoute from public Character Sheet rest entrypoints for SheetRestRouteSubject, SheetHitPointRouteSubject, SheetRestDurationFill, SheetHitDiceSpendFill, SheetRestBenefitChoiceHoleFamily, CharacterSheetHitPointOwner, CharacterSheetHitDiceOwner, and CharacterSheetStateOwner.
- Short Rest requires at least 1 HP and 1 hour before benefits; interrupted Short Rest confers no benefits.
- Long Rest requires at least 1 HP, the 16-hour Long Rest start wait, full required duration, and valid interruption handling; if interrupted after at least 1 hour, only Short Rest benefits owned by the sheet rest workflow may apply.

Target Owner Notes:

- Character Sheet stores current HP, Temporary Hit Points, Hit Point Maximum reduction, and spent Hit Dice; normal Hit Point Maximum, Hit Die size, and Hit Die capacity stay derived from CharacterBuild and installed Unit facts.
- Rest duration and calendar-gate facts are workflow inputs/state, not alternate HP or Hit Dice ledgers.
- Short Rest benefit choices are explicit fills; an omitted benefit choice is not accepted as a second spelling of an empty benefit list when the route exposes SheetRestBenefitChoiceHoleFamily.

Forbidden Shortcuts:

- Do not store normal Hit Point Maximum or Hit Die capacity beside the CharacterBuild facts that derive them.
- Do not grant Long Rest benefits from a too-short rest or from an invalid physical-exertion interruption.
- Do not apply Short Rest Hit Die spending to a zero-HP sheet or before the Short Rest duration gate passes.

Verification:

- Run target replay for packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.mbt.qnt and require semantic qState comparator character-sheet-hp-rest-hit-dice-state.
- Run target replay for packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.route.mbt.qnt and require qRoute comparator route-event-list from public Character Sheet rest entrypoints.
- Run RAW and domain-language review against .references/srd-5.2.1/Rules-Glossary.md#Short Rest, #Long Rest, #Hit Point Dice, #Hit Points, .references/srd-5.2.1/Playing-the-Game.md#Hit Points, UBIQUITOUS_LANGUAGE.md, and packages/character-sheet-runtime/README.md.
- Run pnpm cleanroom-branch-coverage:check.
- Run git diff --check.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 101 - CRP06-SRO-03

Status: `done`

Goal:

Character Sheet Spell Slot, Pact Slot, and rest-triggered recovery owners.

Starting Points:

- `packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.mbt.qnt`
- `packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.route.mbt.qnt`
- `packages/character-sheet-runtime/character-sheet-reducer-route.qnt`
- `packages/character-sheet-runtime/src/rests.ts`
- `packages/character-sheet-runtime/README.md`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `.references/srd-5.2.1/Classes/Warlock.md`
- `.references/srd-5.2.1/Classes/Wizard.md`

Output:

- Target production and quarantined harness changes in the cleanroom target for `CRP06-SRO-03`.
- `tasks/target-replay-evidence/CRP06-SRO-03.json`, `tasks/history/CRP06-SRO-03/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/BLOCKERS.md` only if a source or target blocker remains.

Acceptance:

- Driver Path: `packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.route.mbt.qnt`
- Durable Owner: CharacterSheetSpellSlotOwner owns ordinary Spell Slot expenditure deltas, created Spell Slot expiry, and Arcane Recovery ordinary-slot refunds; CharacterSheetPactSlotOwner owns Pact Slot expenditure and recovery; CharacterSheetFeatureResourceOwner owns rest-triggered feature-use state for Arcane Recovery and Magical Cunning. Spell Slot and Pact Slot capacities remain build-derived projections.
- Accepted Projection(s): semantic projection `qState` from `packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.mbt.qnt` with comparator `character-sheet-spell-slots-pact-slots-state`; route projection `qRoute` from `packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.route.mbt.qnt` with comparator `route-event-list`
- Task Family: settlement/rest owner
- Target replay evidence requirement: accepted evidence must be generated by public target entrypoints, record the observed projection source, and match the source connector or semantic projection named above.
- Target replay observes semantic qState for ordinary Spell Slot capacity mismatch rejection, Pact Slot over-capacity rejection, Short Rest Pact Slot recovery, Short Rest Arcane Recovery ordinary Spell Slot refund, Long Rest ordinary and Pact Slot restoration, created Spell Slot clearing, no-benefit interruption cases, Magical Cunning Pact Slot recovery, and named recovery rejections.
- Target replay observes qRoute from public Character Sheet rest and recovery entrypoints for SheetSpellResourceRouteSubject, SheetFeatureResourceRouteSubject, SheetResourceSpendFill, SheetRestDurationFill, SheetRecoverySelectionFill, SheetOrdinarySpellSlotDeltaFact, SheetPactSlotDeltaFact, SheetCreatedSlotExpiryFact, SheetFeatureRecoveryStateFact, and SheetSpellResourceRejectionFact.
- Ordinary Spell Slot capacity and Pact Slot capacity are checked against build-derived tables; invalid stored expenditures are rejected rather than normalized into a fresh capacity table.
- Arcane Recovery can refund ordinary Spell Slots only, records rest-feature use until Long Rest, and cannot be satisfied by Pact Slot recovery; Magical Cunning recovers expended Pact Slots only and records its Long Rest lockout.

Target Owner Notes:

- Character Sheet stores nonzero ordinary Spell Slot expenditures, created Spell Slot delta state, Pact Slot expenditure, and feature-use lockouts; ordinary and Pact capacities stay derived from CharacterBuild.
- CharacterSheetSpellSlotOwner and CharacterSheetPactSlotOwner are distinct executable owners because the SRD recovery triggers differ.
- CharacterSheetFeatureResourceOwner owns the rest-triggered use/lockout fact while the slot owner owns the actual slot delta.

Forbidden Shortcuts:

- Do not model Pact Slots as ordinary Spell Slots or recover ordinary Spell Slots on Short Rest except through a typed rest-triggered feature such as Arcane Recovery.
- Do not keep created Spell Slots after Long Rest.
- Do not branch recovery behavior on authored identity; use typed feature recovery facts and explicit ordinary-slot or Pact Slot owner routes.

Verification:

- Run target replay for packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.mbt.qnt and require semantic qState comparator character-sheet-spell-slots-pact-slots-state.
- Run target replay for packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.route.mbt.qnt and require qRoute comparator route-event-list from public Character Sheet rest and recovery entrypoints.
- Run RAW and domain-language review against .references/srd-5.2.1/Spells/Gaining-and-Casting.md#Spell Slots, .references/srd-5.2.1/Rules-Glossary.md#Short Rest, #Long Rest, .references/srd-5.2.1/Classes/Warlock.md#Level 1: Pact Magic, #Level 2: Magical Cunning, .references/srd-5.2.1/Classes/Wizard.md#Level 1: Arcane Recovery, UBIQUITOUS_LANGUAGE.md, and packages/character-sheet-runtime/README.md.
- Run pnpm cleanroom-branch-coverage:check.
- Run git diff --check.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`none` unless implementation discovers a durable source, owner, route, blocker, or verification change that should update this queue.

### Task 102 - CRPI-BLOCK-054

Status: `done`

Goal:

Implement target replay for `packages/character-sheet-runtime/character-sheet-spellbook-ritual-selected-identity.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/character-sheet-runtime/character-sheet-spellbook-ritual-selected-identity.mbt.qnt`
- `packages/character-sheet-runtime/character-sheet-spellbook-ritual-selected-identity.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-054.json`, `tasks/history/CRPI-BLOCK-054/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/character-sheet-runtime/character-sheet-spellbook-ritual-selected-identity.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/character-sheet-runtime/character-sheet-spellbook-ritual-selected-identity.route.mbt.qnt`
- Durable Owner: CharacterSheetSelectedReferenceOwner owns spellbook and ritual access selected references plus no-slot ritual invocation projection; CharacterSheetBuildProjectionOwner owns build spellbook and spell-access facts. Ritual selected identity is retained access evidence, not authored-name dispatch.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public Character Sheet reducer or projection entrypoints and record observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Target Owner Notes:

- Route inventory records five in-scope obligations with no blockers and covers selected-reference retention plus no-slot spell-resource projection.
- The target replay must keep Wizard Ritual Adept access facts source-shaped and avoid a duplicate ritual-casting ledger.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/character-sheet-runtime/character-sheet-spellbook-ritual-selected-identity.mbt.qnt` and `packages/character-sheet-runtime/character-sheet-spellbook-ritual-selected-identity.route.mbt.qnt`; require `qRoute` route-event evidence from public Character Sheet target entrypoints.
- Run RAW and ubiquitous-language review against the local SRD passages selected by this route plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` after updating the source queue/backlog.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from route connector owners, route inventory derivability facts, and accepted Character Sheet owner-boundary evidence where cited; this task is now runnable. The task still must produce its own copied `qRoute` versus public target replay evidence.

### Task 103 - CRPI-BLOCK-055

Status: `done`

Goal:

Implement target replay for `packages/character-sheet-runtime/character-sheet-weapon-mastery-containers-selected-identity.mbt.qnt` as a `reducer-routed` reducer-convergence task.

Starting Points:

- `packages/character-sheet-runtime/character-sheet-weapon-mastery-containers-selected-identity.mbt.qnt`
- `packages/character-sheet-runtime/character-sheet-weapon-mastery-containers-selected-identity.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/`

Output:

- Target production changes for the durable owner named below.
- Quarantined replay adapter/harness changes only where needed to compare copied source projections.
- `tasks/target-replay-evidence/CRPI-BLOCK-055.json`, `tasks/history/CRPI-BLOCK-055/`, `tasks/RUN_LEDGER.json`, and `tasks/VALIDATION_REPORT.md` updates in the cleanroom target.
- `tasks/ENGINE_DEPTH_MANIFEST.json` and `tasks/STATE_OWNER_MANIFEST.json` entries for every introduced target module or state field.

Acceptance:

- Driver Path: `packages/character-sheet-runtime/character-sheet-weapon-mastery-containers-selected-identity.mbt.qnt`
- Route Class: `reducer-routed`
- Connector Path(s): `packages/character-sheet-runtime/character-sheet-weapon-mastery-containers-selected-identity.route.mbt.qnt`
- Durable Owner: CharacterSheetSelectedReferenceOwner owns selected weapon references and Long Rest reselection; CharacterSheetBuildProjectionOwner owns eligibility and count projection from build and Surface facts. Weapon Mastery property behavior is not owned by this sheet selected-reference replay.
- Accepted Projection: `qRoute`
- Target replay evidence requirement: Target replay must observe `qRoute` from the copied route connector through public Character Sheet reducer or projection entrypoints and record observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.
- Pass/fail condition: the cleanroom target evidence file matches the copied connector projection and records target entrypoint sequence, observed projection source, reducer/public API path, source manifest SHA, and source branch inventory SHA.

Target Owner Notes:

- Route inventory records eight in-scope obligations with no blockers and uses selected-reference owner evidence for retention and reselection.
- The target must not duplicate mastery property behavior or store eligibility/count facts beside build and Surface projections.

Forbidden Shortcuts:

- Do not satisfy replay with adapter-local expected routes, generated reports, dirty cleanroom history, or target-only fixture labels.
- Do not branch production behavior on authored identity, official catalog names, QNT branch action names, witness field names, fixture labels, or connector filenames.
- Do not duplicate durable state already owned by another target layer; thread, derive, or re-export the existing fact instead.
- Do not widen MBT driver imports or add barrel/behavioral QNT imports to simulated drivers.

Verification:

- Run target replay for `packages/character-sheet-runtime/character-sheet-weapon-mastery-containers-selected-identity.mbt.qnt` and `packages/character-sheet-runtime/character-sheet-weapon-mastery-containers-selected-identity.route.mbt.qnt`; require `qRoute` route-event evidence from public Character Sheet target entrypoints.
- Run RAW and ubiquitous-language review against the local SRD passages selected by this route plus `UBIQUITOUS_LANGUAGE.md` before modeling rule behavior.
- Run `pnpm cleanroom-branch-coverage:check` after updating the source queue/backlog.
- Run `git diff --check`.
- Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review passes; fix every reasonable finding or document a concrete rejection reason, and repeat until no reasonable findings remain.

Plan Impact:

`applied`: owner-decision blocker resolved from route connector owners, route inventory derivability facts, and accepted Character Sheet owner-boundary evidence where cited; this task is now runnable. The task still must produce its own copied `qRoute` versus public target replay evidence.
