# Ralph Lane: Level 3 Metamagic Tracer Bullets

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L3META-01-QUICKENED-SAVE-DAMAGE-SPELLS",
      "status": "ready-for-implementation-after-light-research",
      "title": "Promote Quickened Spell for save-gated damage spell procedures"
    },
    {
      "number": 2,
      "id": "L3META-02-QUICKENED-SPELL-ATTACKS",
      "status": "ready-for-implementation-after-light-research",
      "title": "Promote Quickened Spell for spell attack procedures"
    },
    {
      "number": 3,
      "id": "L3META-03-QUICKENED-CONDITION-AND-BUFF-PROFILES",
      "status": "ready-for-implementation-after-light-research",
      "title": "Promote Quickened Spell for condition and buff action-spell procedures"
    },
    {
      "number": 4,
      "id": "L3META-04-CAREFUL-SPELL-SAVE-PROFILES",
      "status": "ready-for-implementation-after-light-research",
      "title": "Promote Careful Spell for supported save profiles"
    },
    {
      "number": 5,
      "id": "L3META-05-HEIGHTENED-SPELL-SAVE-PROFILES",
      "status": "ready-for-implementation-after-light-research",
      "title": "Promote Heightened Spell for supported save profiles"
    },
    {
      "number": 6,
      "id": "L3META-06-TRANSMUTED-SPELL-DAMAGE-TYPE",
      "status": "ready-for-implementation-after-light-research",
      "title": "Promote Transmuted Spell damage type substitution"
    },
    {
      "number": 7,
      "id": "L3META-07-TWINNED-SPELL-UPCAST-TARGETING",
      "status": "ready-for-implementation-after-light-research",
      "title": "Promote Twinned Spell higher-slot target-count projection"
    },
    {
      "number": 8,
      "id": "L3META-08-METAMAGIC-GOLDEN-LEDGER-CONSOLIDATION",
      "status": "ready-for-implementation-after-light-research",
      "title": "Consolidate Metamagic golden tracer bullet evidence"
    }
  ]
}
-->

## Objective

Deepen `sorcerer_metamagic` from admitted/profile-subset support toward
promoted reducer/QNT tracer bullets. Keep each task procedure-shaped and avoid
rewriting all spell profiles at once.

## Global Acceptance Criteria

1. Read SRD 5.2.1 Sorcerer Metamagic text and `UBIQUITOUS_LANGUAGE.md`.
2. Runtime behavior must consume typed Metamagic option facts and Sorcery Point
   resources. Do not dispatch on option Unit id or authored names.
3. Each reducer change must have QNT witness plus focused runtime/MBT replay.
4. Do not duplicate Spell Slot, Sorcery Point, selected-option, or spell
   procedure state.
5. Keep unsupported procedure families explicit in the Unit claim instead of
   silently claiming full Metamagic support.

## Concurrent Ralph Constraints

Multiple Ralph lanes may run at once. Any MBT command must be globally locked:

```sh
flock /workspace/typescript/dnd/.ralph/mbt-global.lock -c 'START=$(date +%s); <cmd> 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"'
```

Inside the lock, still run the AGENTS precheck for `vitest` and
`quint_evaluator`.

## Verification

Every task must run:

```sh
git diff --check
pnpm unit-profile-coverage:check
pnpm check:mbt-driver-closure
```

When ledgers or QNT owner rows change, run the rules/unit coverage write/read
pair. Reducer behavior requires focused runtime tests and focused QNT/MBT
parity. Reviewer-loop convergence is required.

### Task 1 - L3META-01-QUICKENED-SAVE-DAMAGE-SPELLS

Status: `ready-for-implementation-after-light-research`

Promote Quickened Spell for supported Magic Action save-gated damage spells.

Required behavior:

- admit Quickened rewrite for action-cast save-gated damage spell procedures;
- spend Sorcery Points from existing battle resource state;
- convert action cost to Bonus Action without duplicating Spell Slot state;
- preserve existing target/save/damage behavior.

Expected outputs:

- QNT/parity for at least one representative save-damage spell;
- selected-identity replay for `sorcerer_metamagic`;
- runtime tests for success and rejection: unknown option, unaffordable option,
  non-action spell, and spent Bonus Action.

### Task 2 - L3META-02-QUICKENED-SPELL-ATTACKS

Status: `ready-for-implementation-after-light-research`

Promote Quickened Spell for supported spell attack procedures.

Required behavior:

- apply the same typed Quickened rewrite to spell attack profiles;
- preserve attack roll, hit/miss, damage, resource spend, and stale-subject
  behavior;
- avoid per-spell authored identity dispatch.

Expected outputs:

- QNT/parity and selected-identity replay for representative spell attack.

### Task 3 - L3META-03-QUICKENED-CONDITION-AND-BUFF-PROFILES

Status: `ready-for-implementation-after-light-research`

Promote Quickened Spell for remaining supported action-cast condition, roll
modifier, scalar buff, and direct condition spell procedures where the existing
procedure shape can honestly support the rewrite.

Expected outputs:

- QNT/parity for each procedure family admitted;
- explicit not-supported notes for procedure families that need a separate
  owner or RAW repair.

### Task 4 - L3META-04-CAREFUL-SPELL-SAVE-PROFILES

Status: `ready-for-implementation-after-light-research`

Promote Careful Spell for supported save profiles.

Required behavior:

- consume selected protected-target facts;
- protected creatures automatically succeed on relevant saves;
- successful-save damage/effects remain exactly what the base spell procedure
  defines;
- reject over-targeting, non-save spells, and unaffordable use.

Expected outputs:

- QNT/parity for save-for-half and save-gated no-effect representatives.

### Task 5 - L3META-05-HEIGHTENED-SPELL-SAVE-PROFILES

Status: `ready-for-implementation-after-light-research`

Promote Heightened Spell for supported save profiles.

Required behavior:

- consume one selected target;
- apply Disadvantage to that target's first Saving Throw against the spell;
- preserve ordinary save outcomes and resource spend.

Expected outputs:

- QNT/parity and runtime tests for target-specific Disadvantage and rejection.

### Task 6 - L3META-06-TRANSMUTED-SPELL-DAMAGE-TYPE

Status: `ready-for-implementation-after-light-research`

Promote Transmuted Spell for supported damage spell profiles.

Required behavior:

- accept only Acid, Cold, Fire, Lightning, Poison, or Thunder source and target
  damage types allowed by RAW;
- substitute damage type through existing damage resolution facts;
- do not mutate authored spell identity or duplicate damage dice state.

Expected outputs:

- QNT/parity for attack and save-damage representatives where supported.

### Task 7 - L3META-07-TWINNED-SPELL-UPCAST-TARGETING

Status: `ready-for-implementation-after-light-research`

Promote Twinned Spell for supported spells whose higher-slot profile targets
one additional creature.

Required behavior:

- increase effective spell level by 1 only through existing target-count
  projection;
- preserve actual Spell Slot spend and Sorcery Point spend;
- reject spells that cannot target an additional creature by upcast.

Expected outputs:

- QNT/parity and runtime tests for target count, resource spend, and rejection.

### Task 8 - L3META-08-METAMAGIC-GOLDEN-LEDGER-CONSOLIDATION

Status: `ready-for-implementation-after-light-research`

Consolidate `sorcerer_metamagic` claims after Tasks 1-7.

Required behavior:

- update Unit/profile claims to list supported and deferred Metamagic options
  precisely;
- remove stale follow-ups only when their behavior is covered;
- keep remaining unsupported spell families visible.
