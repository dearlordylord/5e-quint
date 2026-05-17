# Level 1 Ralph Loop E - Buff Mark Smite Selected Identities

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L1E-BUFF-PRECHECK",
      "status": "done",
      "title": "Post-C Buff Mark Smite Identity Reconciliation"
    },
    {
      "number": 2,
      "id": "L1E-DIVINE-FAVOR",
      "status": "done",
      "title": "Divine Favor Selected Identity Replay"
    },
    {
      "number": 3,
      "id": "L1E-DIVINE-SMITE",
      "status": "done",
      "title": "Divine Smite Selected Identity Replay"
    },
    {
      "number": 4,
      "id": "L1E-ENSNARING-STRIKE",
      "status": "done",
      "title": "Ensnaring Strike Selected Identity Replay"
    },
    {
      "number": 5,
      "id": "L1E-FALSE-LIFE",
      "status": "ready-for-implementation-after-light-research",
      "title": "False Life Selected Identity Replay"
    },
    {
      "number": 6,
      "id": "L1E-HEROISM",
      "status": "ready-for-implementation-after-light-research",
      "title": "Heroism Selected Identity Replay"
    },
    {
      "number": 7,
      "id": "L1E-HEX",
      "status": "ready-for-implementation-after-light-research",
      "title": "Hex Selected Identity Replay"
    },
    {
      "number": 8,
      "id": "L1E-HUNTERS-MARK",
      "status": "ready-for-implementation-after-light-research",
      "title": "Hunter's Mark Selected Identity Replay"
    },
    {
      "number": 9,
      "id": "L1E-LONGSTRIDER",
      "status": "ready-for-implementation-after-light-research",
      "title": "Longstrider Selected Identity Replay"
    },
    {
      "number": 10,
      "id": "L1E-SEARING-SMITE",
      "status": "ready-for-implementation-after-light-research",
      "title": "Searing Smite Selected Identity Replay"
    },
    {
      "number": 11,
      "id": "L1E-SHILLELAGH",
      "status": "ready-for-implementation-after-light-research",
      "title": "Shillelagh Selected Identity Replay"
    },
    {
      "number": 12,
      "id": "L1E-TRUE-STRIKE",
      "status": "ready-for-implementation-after-light-research",
      "title": "True Strike Selected Identity Replay"
    }
  ]
}
-->

This loop owns selected-identity MBT expansion for level-1 buff, mark, smite,
and weapon-hosted spell Units. It should run after Loop C is merged and master
reports are refreshed.

Do not edit `plans/ACTIVE_PLAN.md`.

## Authority

- `@dnd/battle-runtime` and `packages/battle-runtime/battle-runtime.qnt` are the
  promoted battle authority.
- Read local RAW in `.references/srd-5.2.1/Spells/` and
  `UBIQUITOUS_LANGUAGE.md` before changing test expectations.
- Selected Fighting Style, mastery, invocation, and spell option execution stays
  with selected child Units. This loop must not duplicate child execution state
  into grant containers.
- No companion feature work is in scope.

## Worktree Safety Prefix

Every Ralph prompt for this loop must include:

> Before starting, run `git log --oneline -1 master` and verify your HEAD
> matches. If not, run `git rebase master`. You are not alone in the codebase:
> do not revert edits made by others, and adapt your implementation around
> existing changes. Do not edit `plans/ACTIVE_PLAN.md`.

## Review Loop

Use implementer, reviewer, handback until `accept`, then decider. Each task must
have a review artifact and decider artifact. Do not skip the review loop.

## Owned Surface

Primary write scope:

- `packages/battle-runtime/src/roll-modifier-buff-selected-identity.mbt.test.ts`
  if the existing shape cleanly fits;
- or new `packages/battle-runtime/src/level1-buff-mark-smite-selected-identity.mbt.test.ts`;
- matching qnt file if a new MBT owner is introduced;
- `plans/unit-profile-coverage/unit-evidence.jsonl`;
- generated reports under `plans/unit-profile-coverage/`.

Avoid Loop D damage-only files, Loop F spatial witness files, and Loop H special
spell files.

## MBT And Verification Protocol

Prefer deterministic selected identity replay tests. Run full MBT only after
the deterministic replay is complete and only when the task changed the
driver/spec surface. Serialize full MBT with `flock /tmp/dnd-battle-mbt.lock`
and the timed wrapper from `AGENTS.md`. If worktree dependency links are absent,
run `CI=true pnpm install` once and do not commit `node_modules`.

Every task runs:

- relevant focused deterministic replay test;
- `pnpm unit-profile-coverage:check --write`;
- `pnpm unit-profile-coverage:check`;
- `git diff --check`;
- `/simplify` convergence, minimum two rounds.

## Task Details

### Task 1 - L1E-BUFF-PRECHECK - Post-C Buff Mark Smite Identity Reconciliation

Status: `done`

After Loop C lands, reconcile this loop's Unit list against the refreshed strict
report and selected identity frontier. Remove any Unit already covered, and
record moved Units in this plan. No behavior changes.

### Task 2 - L1E-DIVINE-FAVOR - Divine Favor Selected Identity Replay

Status: `done`

Add selected identity evidence for `divine_favor`, binding the spell Unit
through the supported weapon damage rider projection.

RAW: `.references/srd-5.2.1/Spells/Descriptions-A-D.md` Divine Favor.

### Task 3 - L1E-DIVINE-SMITE - Divine Smite Selected Identity Replay

Status: `done`

Add selected identity evidence for `divine_smite`, proving after-hit damage
resolution uses the authored Unit identity and existing supported profile.

RAW: `.references/srd-5.2.1/Spells/Descriptions-A-D.md` Divine Smite.

### Task 4 - L1E-ENSNARING-STRIKE - Ensnaring Strike Selected Identity Replay

Status: `done`

Add selected identity evidence for `ensnaring_strike`, including after-hit
restraint and supported turn-start damage/save lifecycle.

RAW: `.references/srd-5.2.1/Spells/Descriptions-E-L.md` Ensnaring Strike.

### Task 5 - L1E-FALSE-LIFE - False Life Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `false_life`, asserting the supported scalar
temporary hit point buff.

RAW: `.references/srd-5.2.1/Spells/Descriptions-E-L.md` False Life.

### Task 6 - L1E-HEROISM - Heroism Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `heroism`, including Frightened immunity and
turn-start Temporary Hit Point projection if already supported.

RAW: `.references/srd-5.2.1/Spells/Descriptions-E-L.md` Heroism.

### Task 7 - L1E-HEX - Hex Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `hex`, binding the authored Unit through the
supported marked damage rider and supported transfer/lifecycle boundary.

RAW: `.references/srd-5.2.1/Spells/Descriptions-E-L.md` Hex.

### Task 8 - L1E-HUNTERS-MARK - Hunter's Mark Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `hunters_mark`. Only assert runtime-owned
mark, transfer, Concentration, and damage-rider behavior; do not model finding
or Wisdom roll-mode table facts here.

RAW: `.references/srd-5.2.1/Spells/Descriptions-E-L.md` Hunter's Mark.

### Task 9 - L1E-LONGSTRIDER - Longstrider Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `longstrider`, proving the supported scalar
speed buff binds the authored Unit identity.

RAW: `.references/srd-5.2.1/Spells/Descriptions-E-L.md` Longstrider.

### Task 10 - L1E-SEARING-SMITE - Searing Smite Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `searing_smite`, including after-hit timed
damage and save cleanup within the supported runtime boundary.

RAW: `.references/srd-5.2.1/Spells/Descriptions-S-Z.md` Searing Smite.

### Task 11 - L1E-SHILLELAGH - Shillelagh Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `shillelagh`, binding the spell Unit through
the supported weapon attack override projection.

RAW: `.references/srd-5.2.1/Spells/Descriptions-S-Z.md` Shillelagh.

### Task 12 - L1E-TRUE-STRIKE - True Strike Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `true_strike`, proving spell-hosted weapon
attack support without duplicating weapon state.

RAW: `.references/srd-5.2.1/Spells/Descriptions-S-Z.md` True Strike.
