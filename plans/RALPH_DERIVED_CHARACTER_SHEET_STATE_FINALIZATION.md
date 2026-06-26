# Ralph: Derived Character Sheet State Finalization

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "DCSF-01-STORED-SHEET-STRICTNESS",
      "status": "done",
      "title": "Reject stale capacity fields at the stored Character Sheet boundary"
    },
    {
      "number": 2,
      "id": "DCSF-02-TEST-HELPER-CANONICAL-STATE",
      "status": "done",
      "title": "Remove capacity-bearing Character Sheet test helper inputs"
    },
    {
      "number": 3,
      "id": "DCSF-03-RESOURCE-CAPACITY-AUDIT",
      "status": "done",
      "title": "Harden class-feature resource capacities as build-derived projections"
    },
    {
      "number": 4,
      "id": "DCSF-04-BATTLE-HANDOFF-HARDENING",
      "status": "done",
      "title": "Harden Character Sheet battle handoff capacity drift checks"
    },
    {
      "number": 5,
      "id": "DCSF-05-MCP-APP-SCHEMA-DOCS",
      "status": "done",
      "title": "Split input/store and output/display capacity schemas in MCP and app docs"
    }
  ]
}
-->

## Goal

Finish the Character Sheet capacity-state invariant:

> Stored Character Sheet and user/session inputs contain only mutable play state
> and selections. Every capacity shown to UI, MCP, battle, or tests is derived
> from `build`, unit catalog facts, or explicit created/temporary play state at
> the projection boundary.

## Base

- Declared base ref: `master`
- Declared base SHA:
  `564376fd95218a209bb9eae5c9ccb54ca3e04a52`

Every Ralph task agent must run the project-required base check before
implementation:

```bash
git log --oneline -1 564376fd95218a209bb9eae5c9ccb54ca3e04a52
git log --oneline -1 HEAD
git merge-base --is-ancestor 564376fd95218a209bb9eae5c9ccb54ca3e04a52 HEAD
```

If the ancestor check fails, stop and report the branch-base mismatch. Do not
repair the branch in the task worktree.

## Source Anchors

- `.references/srd-5.2.1/Character-Creation.md`
  - Hit Points
  - Hit Point Dice
  - Spell Slots, Cantrips, and Prepared Spells
  - Level advancement
  - Multiclass Spell Slots and Pact Magic
- `.references/srd-5.2.1/Rules-Glossary.md`
  - Hit Point Dice
  - Hit Points
  - Short Rest
  - Long Rest
  - Temporary Hit Points
- `.references/srd-5.2.1/Playing-the-Game.md`
  - Hit Points
  - Healing
  - Temporary Hit Points
- `UBIQUITOUS_LANGUAGE.md`
  - Hit Points and Death
  - Resource Consumption
  - Resting
  - Spellcasting

## Lane Rules

- Use pnpm only.
- Read the relevant RAW anchors and `UBIQUITOUS_LANGUAGE.md` before modeling
  changes.
- No compatibility layer or migration path. This is greenfield and internal.
- Do not store derived capacities beside their source facts.
- Keep these as Character Sheet state: current HP, Temporary Hit Points, Hit
  Point maximum reduction, conditions, spent Hit Dice, resource expenditures,
  rest feature uses, Heroic Inspiration, companion state, Book of Shadows
  presence, Wild Shape known forms, Circle Land selection, created Spell Slots.
- Keep these derived from build or unit facts: Hit Point Maximum, Hit Dice
  capacity, ordinary Spell Slot capacity, Pact Slot capacity, class-feature
  resource capacity.
- Battle runtime may carry projected capacities as a battle snapshot, but
  Character Sheet handoff must derive/check them and settle only deltas back to
  the sheet.

## Dependency Table

| Task | Status | Depends On | Blocks | Intent |
| --- | --- | --- | --- | --- |
| 1 / DCSF-01 | done | none | DCSF-02 | Stored sheet rejects stale capacity-bearing fields. |
| 2 / DCSF-02 | done | DCSF-01 | DCSF-03 | Tests stop accepting capacity-bearing sheet helper inputs. |
| 3 / DCSF-03 | done | DCSF-02 | DCSF-04 | Resource capacities are projection-only and tested. |
| 4 / DCSF-04 | done | DCSF-03 | DCSF-05 | Battle handoff rejects capacity drift and writes only sheet state. |
| 5 / DCSF-05 | done | DCSF-04 | none | MCP/app/docs distinguish input/store state from output/display projections. |

## Pre-Research Findings

- `CharacterSheetInput` already takes `spellSlotExpenditures` and
  `pactSlots` expenditure only, not ordinary `spellSlots`:
  `packages/character-sheet-runtime/src/sheet-types.ts`.
- Stored `maximumHp` is rejected by `parseCharacterSheet`.
- `spentHitDice` is stored state and `characterSheetHitDice` projects build
  Hit Dice capacity plus spent count.
- `resourceExpendituresFromInput` derives supported resource capacity from
  build/unit facts and stores only nonzero expenditures.
- `characterSheetBattleInit` derives HP maximum from the sheet/build, and
  battle settlement checks battle maximum HP and Spell Slot/Pact Slot capacity
  against sheet projections before settling back.
- Remaining gaps from audit:
  - stored ordinary `spellSlots` is not rejected;
  - stored `pactSlotExpenditure` permits extra stale capacity keys;
  - stored resource expenditure and spent Hit Dice records permit extra keys;
  - test helpers still accept capacity-bearing `spellSlots` shortcuts;
  - MCP/app inputs and outputs need a final naming/schema/docs split pass.

### Task 1 - DCSF-01-STORED-SHEET-STRICTNESS

Status: `done`

Scope:

- Make stored Character Sheet parsing reject stale capacity-bearing fields
  rather than ignore them.
- Reject stored ordinary `spellSlots` on `CharacterSheet`.
- Reject stale `pactSlots` and reject `pactSlotExpenditure` records that carry
  any key other than `expended`.
- Reject extra keys on stored ordinary Spell Slot expenditure records.
- Reject extra keys on stored spent Hit Dice records.
- Reject extra keys on stored resource expenditure records, allowing only the
  exact keys required by that expenditure variant.
- Preserve created Spell Slots as state: `createdSpellSlots` may still carry
  `spellLevel`, `count`, and `expended` because created slots are play-created
  state rather than build-derived ordinary/Pact capacity.
- Add focused parser tests proving stale capacity fields are rejected.

Out of scope:

- Test-helper cleanup beyond tests required by this task.
- MCP/app schema changes.
- Battle handoff behavior changes unless a parser test reveals a direct issue.

Verification:

- RAW/UBL check for Hit Dice, Spell Slots, Pact Magic, and rests.
- `pnpm --filter @dnd/character-sheet-runtime typecheck`
- `pnpm --filter @dnd/character-sheet-runtime exec vitest run src/sheet-lifecycle.test.ts src/spell-slots.test.ts src/resources.test.ts`
- `git diff --check`

Plan Impact:

- Mark DCSF-01 done when landed.
- Unblock DCSF-02.
- If a stale capacity shape remains accepted intentionally, record the concrete
  reason in this plan and add a follow-up task if it still needs cleanup.

### Task 2 - DCSF-02-TEST-HELPER-CANONICAL-STATE

Status: `done`

Scope:

- Remove or rename Character Sheet test-helper inputs that accept
  capacity-bearing ordinary `spellSlots` to initialize stored sheet state.
- Update tests to pass `spellSlotExpenditures` for sheet input/state and call
  projection helpers such as `characterSheetSpellSlots` when asserting derived
  slot `count`.
- Keep battle-specific projected slot fixtures only where they are explicitly
  battle snapshot state, not Character Sheet stored state.
- Remove duplicated helper conversion from `{ count, expended }` to sparse
  expenditures where it is no longer needed.

Out of scope:

- Production API behavior changes unless helper cleanup exposes stale
  production names.

Verification:

- RAW/UBL check for sheet state vs projected capacity terminology.
- `pnpm --filter @dnd/character-sheet-runtime typecheck`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `pnpm --filter @dnd/character-sheet-runtime exec vitest run src/sheet-lifecycle.test.ts src/spell-slots.test.ts src/rests.test.ts src/resources.test.ts`
- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/index.test.ts src/character-battle-init-projection.mbt.test.ts src/character-battle-settlement.mbt.test.ts src/character-sheet-feature-resources.mbt.test.ts`
- `git diff --check`

Plan Impact:

- Mark DCSF-02 done when landed.
- Unblock DCSF-03.

### Task 3 - DCSF-03-RESOURCE-CAPACITY-AUDIT

Status: `done`

Scope:

- Audit and harden class-feature resource projections:
  - Lay on Hands healing pool;
  - Wild Shape use-count resource;
  - Monk Focus use-count resource;
  - Font of Magic Sorcery Point point pool;
  - class-feature spell free-cast resources;
  - rest feature use flags such as Arcane Recovery, Magical Cunning, Uncanny
    Metabolism, Sorcerous Restoration, and spell-recipient lockouts.
- Ensure every displayed/projected resource `count` is derived from build/unit
  facts and every sheet field stores only expenditure/use state.
- Add or tighten tests that omitted expenditure state projects as zero, nonzero
  expenditure validates against build-derived capacity, and over-capacity
  expenditure is rejected.
- Keep support gates explicit; do not widen support by shape alone where the
  current code intentionally uses a narrow support profile.

Out of scope:

- Adding support for new class features or PHB+ identities.
- Battle settlement behavior except where it reuses resource projections.

Verification:

- RAW/UBL check for resources and rests.
- `pnpm --filter @dnd/character-sheet-runtime typecheck`
- `pnpm --filter @dnd/character-sheet-runtime exec vitest run src/resources.test.ts src/rests.test.ts src/healing-rest-benefit.test.ts src/spell-slots.test.ts`
- `git diff --check`

Plan Impact:

- Mark DCSF-03 done when landed.
- Unblock DCSF-04.
- If an existing resource support gate is intentionally authored-identity-based,
  document whether it remains debt or was replaced by typed support facts.

### Task 4 - DCSF-04-BATTLE-HANDOFF-HARDENING

Status: `done`

Scope:

- Audit `characterSheetBattleInit`, `settleCharacterSheetFromBattle`, and
  helper projections for capacity drift.
- Battle state may carry capacities as a runtime snapshot; every such capacity
  must derive from sheet/build on init or be checked against sheet projections
  before settlement.
- Settlement must write only Character Sheet state/deltas back:
  current HP, temp HP, conditions, zero-HP lifecycle, sparse Spell Slot
  expenditures, sparse Pact Slot expenditure, spent resources, companion state,
  Book of Shadows presence, known-form state.
- Add or tighten tests for drift rejection:
  HP maximum, ordinary Spell Slot count/levels, Pact Slot count/level,
  point-pool/use-count/free-cast resource capacity, and Wild Shape resource
  capacity.

Out of scope:

- Battle reducer mechanics unrelated to sheet handoff.
- Broad battle MBT unless handoff behavior changes require focused parity.

Verification:

- RAW/UBL check for battle handoff terminology and sheet-state boundaries.
- Before any MBT, check for existing `vitest` and `quint_evaluator` processes.
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/index.test.ts src/character-battle-init-projection.mbt.test.ts src/character-battle-settlement.mbt.test.ts src/character-sheet-feature-resources.mbt.test.ts src/level5-sdk-tracer-bullets.test.ts`
- If a focused MBT fails with a seed, reproduce with `QUINT_SEED` before fixing.
- `git diff --check`

Plan Impact:

- Mark DCSF-04 done when landed.
- Unblock DCSF-05.

### Task 5 - DCSF-05-MCP-APP-SCHEMA-DOCS

Status: `done`

Scope:

- Audit MCP/session/app inputs for stale capacity-bearing Character Sheet state.
- Keep output/display rows capacity-rich by deriving maximum HP, Spell Slot
  count, Pact Slot count, Hit Dice capacity, and resource count through
  projections.
- Make names and docs explicit:
  - input/store schema = mutable state and selections;
  - output/display schema = derived capacities plus mutable state.
- Update package READMEs to state that Hit Point Maximum, Hit Dice capacity,
  ordinary Spell Slot capacity, Pact Slot capacity, and resource capacity are
  derived from build/unit facts; sheet stores only deltas/state.
- Add/adjust MCP/app tests where schema behavior changes.

Out of scope:

- UI redesign.
- New MCP tool features.

Verification:

- RAW/UBL terminology pass.
- `pnpm --filter @dnd/mcp typecheck`
- `pnpm --filter @dnd/app typecheck`
- `pnpm --filter @dnd/mcp test`
- `pnpm --filter @dnd/app test`
- `pnpm --filter @dnd/character-sheet-runtime typecheck`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `git diff --check`
- Final reviewer-loop convergence: RAW traceability, ubiquitous-language/domain
  language, architecture/connascence, and code-review pass. Fix every
  reasonable finding and repeat until clean.

Plan Impact:

- Mark DCSF-05 done when landed.
- If final review finds further work, add a concrete DCSF follow-up task rather
  than leaving prose.
