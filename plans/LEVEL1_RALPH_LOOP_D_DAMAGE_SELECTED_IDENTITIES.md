# Level 1 Ralph Loop D - Damage Spell Selected Identities

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L1D-DAMAGE-PRECHECK",
      "status": "done",
      "title": "Post-C Strict Damage Identity Reconciliation"
    },
    {
      "number": 2,
      "id": "L1D-BURNING-HANDS",
      "status": "done",
      "title": "Burning Hands Selected Identity Replay"
    },
    {
      "number": 3,
      "id": "L1D-ICE-KNIFE",
      "status": "done",
      "title": "Ice Knife Selected Identity Replay"
    },
    {
      "number": 4,
      "id": "L1D-POISON-SPRAY",
      "status": "done",
      "title": "Poison Spray Selected Identity Replay"
    },
    {
      "number": 5,
      "id": "L1D-RAY-OF-SICKNESS",
      "status": "done",
      "title": "Ray Of Sickness Selected Identity Replay"
    },
    {
      "number": 6,
      "id": "L1D-SACRED-FLAME",
      "status": "ready-for-implementation-after-light-research",
      "title": "Sacred Flame Selected Identity Replay"
    },
    {
      "number": 7,
      "id": "L1D-SORCEROUS-BURST",
      "status": "ready-for-implementation-after-light-research",
      "title": "Sorcerous Burst Selected Identity Replay"
    },
    {
      "number": 8,
      "id": "L1D-STARRY-WISP",
      "status": "ready-for-implementation-after-light-research",
      "title": "Starry Wisp Selected Identity Replay"
    },
    {
      "number": 9,
      "id": "L1D-VICIOUS-MOCKERY",
      "status": "ready-for-implementation-after-light-research",
      "title": "Vicious Mockery Selected Identity Replay"
    },
    {
      "number": 10,
      "id": "L1D-CHROMATIC-ORB",
      "status": "ready-for-implementation-after-light-research",
      "title": "Chromatic Orb Selected Identity Replay"
    }
  ]
}
-->

This loop owns selected-identity MBT expansion for strict level-1 direct damage
spell Units. It should run after Loop C is merged and the strict report has been
refreshed on master. The precheck task reconciles exact membership, then the
remaining tasks add checker-visible `selected-identity-mbt` evidence paired with
owner-local `UNIT-IDENTITY-MBT-REPLAY` markers.

Do not edit `plans/ACTIVE_PLAN.md`.

## Authority

- `@dnd/battle-runtime` plus
  `packages/battle-runtime/battle-runtime.qnt` is the promoted authority for
  Unit/StatBlock-backed battle behavior.
- Use local SRD 5.2.1 text in `.references/srd-5.2.1/Spells/` and
  `UBIQUITOUS_LANGUAGE.md` before modeling or asserting rule behavior.
- This plan is evidence work over already supported profiles unless a task finds
  a real runtime gap. If behavior must change, update the promoted Quint spec or
  explain why the existing spec already owns the behavior.
- Keep product readiness separate from supported profile and selected identity
  MBT coverage.
- No companion feature work is in scope. `find_familiar` and companion AI stay
  excluded unless the owner explicitly retasks them.

## Worktree Safety Prefix

Every Ralph prompt for this loop must include:

> Before starting, run `git log --oneline -1 master` and verify your HEAD
> matches. If not, run `git rebase master`. You are not alone in the codebase:
> do not revert edits made by others, and adapt your implementation around
> existing changes. Do not edit `plans/ACTIVE_PLAN.md`.

## Review Loop

Use the normal Ralph harness loop: implementer, immediate reviewer, hand back
`accept-with-fixes` or `reject` until the reviewer returns `accept`, then
decider. Do not skip review or decider. Every task must leave review and decider
artifacts under `.ralph/runs/<run-id>/`.

## Owned Surface

Primary write scope:

- new or existing battle-runtime selected-identity test/qnt files for this
  damage spell family;
- `plans/unit-profile-coverage/unit-evidence.jsonl`;
- generated reports under `plans/unit-profile-coverage/`.

Avoid touching Loop E/H special spell files unless the precheck explicitly moves
a Unit between loops. Preserve existing selected identity evidence rows.

Preferred owner file if a new file is cleaner:

- `packages/battle-runtime/src/level1-damage-spell-selected-identity.mbt.test.ts`
- `packages/battle-runtime/battle-runtime-level1-damage-spell-selected-identity.mbt.qnt`

## MBT And Verification Protocol

- First prove each identity with the deterministic replay test:
  `pnpm --filter @dnd/battle-runtime exec vitest run <owner-file> -t "replays selected Unit identities deterministically"`.
- If the worktree lacks package-local Vitest links, repair the worktree once with
  `CI=true pnpm install`, then keep `node_modules` out of commits.
- Run full selected identity MBT only after the deterministic replay is complete
  and only when the task changed the driver/spec surface. Serialize any full MBT
  with `flock /tmp/dnd-battle-mbt.lock`, check for existing `vitest` and
  `quint_evaluator` processes first, and use the timed wrapper required by
  `AGENTS.md`.
- Always run `pnpm unit-profile-coverage:check --write`,
  `pnpm unit-profile-coverage:check`, and `git diff --check`.
- Run reviewer loop to convergence, minimum two rounds.

## Task Details

### Task 1 - L1D-DAMAGE-PRECHECK - Post-C Strict Damage Identity Reconciliation

Status: `done`

After Loop C is merged and the strict report is refreshed, read
`plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md`,
`plans/unit-profile-coverage/UNIT_REPORT.md`, and
`plans/unit-profile-coverage/unit-matrix.json`. Confirm which of this loop's
Units are strict supported profiles still lacking selected identity MBT. Move
out any Unit that is no longer in this frontier and record the reason in this
plan. Do not implement behavior in this task.

Verification:
`pnpm unit-profile-coverage:check`; RAW/UL check for the spell names only;
no MBT.

### Task 2 - L1D-BURNING-HANDS - Burning Hands Selected Identity Replay

Status: `done`

Add selected identity evidence for `burning_hands`. The replay should bind the
authored Unit id through production spell discovery/resolution and assert the
SRD cone damage save profile already supported by runtime.

RAW: `.references/srd-5.2.1/Spells/Descriptions-A-D.md` Burning Hands; spell
targets and saving throws in `Spells/Gaining-and-Casting.md` and
`Rules-Glossary.md`.

### Task 3 - L1D-ICE-KNIFE - Ice Knife Selected Identity Replay

Status: `done`

Add selected identity evidence for `ice_knife`, including the attack hit or miss
boundary and the burst saving throw projection that the supported profile owns.

RAW: `.references/srd-5.2.1/Spells/Descriptions-E-L.md` Ice Knife.

### Task 4 - L1D-POISON-SPRAY - Poison Spray Selected Identity Replay

Status: `done`

Add selected identity evidence for `poison_spray`, binding the authored cantrip
Unit through the supported damage save or attack profile.

RAW: `.references/srd-5.2.1/Spells/Descriptions-M-P.md` Poison Spray.

### Task 5 - L1D-RAY-OF-SICKNESS - Ray Of Sickness Selected Identity Replay

Status: `done`

Add selected identity evidence for `ray_of_sickness`, including poison damage
and the on-hit Poisoned condition rider already supported by runtime.

RAW: `.references/srd-5.2.1/Spells/Descriptions-Q-R.md` Ray of Sickness.

### Task 6 - L1D-SACRED-FLAME - Sacred Flame Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `sacred_flame`, proving the authored Unit
identity reaches the supported saving throw damage procedure.

RAW: `.references/srd-5.2.1/Spells/Descriptions-S-Z.md` Sacred Flame.

### Task 7 - L1D-SORCEROUS-BURST - Sorcerous Burst Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `sorcerous_burst`, including the supported
attack/damage identity and any existing burst-specific projection in runtime.

RAW: `.references/srd-5.2.1/Spells/Descriptions-S-Z.md` Sorcerous Burst.

### Task 8 - L1D-STARRY-WISP - Starry Wisp Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `starry_wisp`, binding the authored cantrip
Unit and asserting the supported attack/damage and object-light interaction
boundary already modeled by runtime.

RAW: `.references/srd-5.2.1/Spells/Descriptions-S-Z.md` Starry Wisp.

### Task 9 - L1D-VICIOUS-MOCKERY - Vicious Mockery Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `vicious_mockery`, including damage plus the
supported next-attack-roll disadvantage projection if that is the existing
runtime-owned profile.

RAW: `.references/srd-5.2.1/Spells/Descriptions-S-Z.md` Vicious Mockery.

### Task 10 - L1D-CHROMATIC-ORB - Chromatic Orb Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `chromatic_orb`, binding the authored spell
Unit through the existing chained attack/damage support. Do not broaden the
spell beyond currently supported chain behavior.

RAW: `.references/srd-5.2.1/Spells/Descriptions-A-D.md` Chromatic Orb.
