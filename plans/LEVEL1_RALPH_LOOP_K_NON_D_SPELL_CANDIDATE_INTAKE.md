# Level 1 Ralph Loop K - Non-D Spell Candidate Intake

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L1K-PRECHECK",
      "status": "done",
      "title": "Non-D Spell Candidate Precheck"
    },
    {
      "number": 2,
      "id": "L1K-DAMAGE-SPELL-CANDIDATES",
      "status": "ready-for-research",
      "title": "Damage Spell Candidate Intake"
    },
    {
      "number": 3,
      "id": "L1K-CONDITION-CONTROL-CANDIDATES",
      "status": "ready-for-research",
      "title": "Condition Control Spell Candidate Intake"
    },
    {
      "number": 4,
      "id": "L1K-PROTECTION-RESTORATION-CANDIDATES",
      "status": "ready-for-research",
      "title": "Protection Restoration Spell Candidate Intake"
    },
    {
      "number": 5,
      "id": "L1K-MOBILITY-TRANSFORMATION-CANDIDATES",
      "status": "ready-for-research",
      "title": "Mobility Transformation Spell Candidate Intake"
    },
    {
      "number": 6,
      "id": "L1K-ZONE-WALL-CANDIDATES",
      "status": "ready-for-research",
      "title": "Zone Wall Emanation Spell Candidate Intake"
    },
    {
      "number": 7,
      "id": "L1K-DETECTION-COMMUNICATION-CANDIDATES",
      "status": "ready-for-research",
      "title": "Detection Communication Spell Candidate Intake"
    },
    {
      "number": 8,
      "id": "L1K-COUNTER-DISPEL-CANDIDATES",
      "status": "ready-for-research",
      "title": "Counter Dispel Spell Candidate Intake"
    },
    {
      "number": 9,
      "id": "L1K-WEAPON-ITEM-HOSTED-CANDIDATES",
      "status": "ready-for-research",
      "title": "Weapon Item Hosted Spell Candidate Intake"
    },
    {
      "number": 10,
      "id": "L1K-COMPANION-EXCLUSION-CANDIDATES",
      "status": "ready-for-research",
      "title": "Companion Summon Exclusion Candidate Intake"
    }
  ]
}
-->

This loop owns non-D SRD spell candidate intake from the authored spell pressure
reported in `UNIT_REPORT.md`. It should classify and pre-plan spell admission
or closure groups outside D's strict level-1 work. It must not implement D's
current level-1 spell/no-matrix tasks.

D-owned spell exclusions: `charm_person`, `disguise_self`, `druidcraft`,
`elementalism`, `illusory_script`, `message`, `prestidigitation`,
`thaumaturgy`, `unseen_servant`, `hunters_mark`, and all D character/container
selected identity Units.

Companion/familiar behavior is excluded. If a spell candidate requires a
companion/summon lifecycle, record the exclusion or route it to the separate
companion worktree; do not implement it here. Self-origin Emanation spells are
area-effect candidates, not companion exclusions solely because their spell
names use "Conjure."

## Worktree Safety Prefix

Every Ralph prompt for this loop must include:

> Before starting, run `git log --oneline -1 master` and verify your HEAD
> matches. If not, run `git rebase master`. You are not alone in the codebase:
> do not revert edits made by others, and adapt your implementation around
> existing changes. Do not edit `plans/ACTIVE_PLAN.md`.

## Review Loop

Use implementer, reviewer, handback until `accept`, then decider. Reviewers
should reject broad spell-runtime implementation hidden inside candidate intake.
Each task should produce a concrete admission/closure decision and, when
obvious, a small follow-up task proposal rather than a large reducer.

## Owned Surface

Primary write scope:

- `plans/unit-profile-coverage/*SPELL_CANDIDATE*` decision artifacts;
- generated coverage artifacts under `plans/unit-profile-coverage/`;
- `plans/unit-profile-coverage/unit-claims.jsonl` only for assigned non-D spell
  ids if a disposition claim is needed;
- no battle reducer behavior unless the task narrows to a small already-modeled
  profile and proves it from local SRD text.

Avoid D plan files, D-owned spell Units, and companion/familiar runtime files.

## Verification

Every task runs:

- `pnpm unit-profile-coverage:check --write`;
- `pnpm unit-profile-coverage:check`;
- `git diff --check`;
- focused tests only if checker or runtime code changes;
- reviewer loop convergence.

## Task Table

| Order | Task | Status | Blocks On | Output |
| ---: | --- | --- | --- | --- |
| 1 | L1K-PRECHECK - Non-D Spell Candidate Precheck | done | none | refreshed non-D spell candidate set and exclusion list |
| 2 | L1K-DAMAGE-SPELL-CANDIDATES - Damage Spell Candidate Intake | ready-for-research | 1 | candidate split for damage spells outside D |
| 3 | L1K-CONDITION-CONTROL-CANDIDATES - Condition Control Spell Candidate Intake | ready-for-research | 1 | candidate split for condition/control spells outside D |
| 4 | L1K-PROTECTION-RESTORATION-CANDIDATES - Protection Restoration Spell Candidate Intake | ready-for-research | 1 | candidate split for protection/restoration spells outside D |
| 5 | L1K-MOBILITY-TRANSFORMATION-CANDIDATES - Mobility Transformation Spell Candidate Intake | ready-for-research | 1 | candidate split for mobility/transformation spells outside D |
| 6 | L1K-ZONE-WALL-CANDIDATES - Zone Wall Emanation Spell Candidate Intake | ready-for-research | 1 | candidate split for zones/walls/emanations outside D |
| 7 | L1K-DETECTION-COMMUNICATION-CANDIDATES - Detection Communication Spell Candidate Intake | ready-for-research | 1 | runtime-detached versus runtime-witness split for detection/communication spells |
| 8 | L1K-COUNTER-DISPEL-CANDIDATES - Counter Dispel Spell Candidate Intake | ready-for-research | 1 | candidate split for counter/dispel/anti-magic spells |
| 9 | L1K-WEAPON-ITEM-HOSTED-CANDIDATES - Weapon Item Hosted Spell Candidate Intake | ready-for-research | 1 | candidate split for weapon/item hosted spells |
| 10 | L1K-COMPANION-EXCLUSION-CANDIDATES - Companion Summon Exclusion Candidate Intake | ready-for-research | 1 | explicit companion/summon exclusions or handoff targets |

### Task 1 - L1K-PRECHECK - Non-D Spell Candidate Precheck

Status: `done`

Refresh the authored spell candidate set from `UNIT_REPORT.md` and
`srd-unit-inventory.json`. Produce a decision artifact with the non-D spell
groups this loop owns and the D/companion exclusions.

Decision artifact: `plans/unit-profile-coverage/L1K_NON_D_SPELL_CANDIDATE_PRECHECK.md`.

### Task 2 - L1K-DAMAGE-SPELL-CANDIDATES - Damage Spell Candidate Intake

Status: `ready-for-research`

Initial candidates: `acid_arrow`, `scorching_ray`, `shatter`,
`lightning_bolt`, `cone_of_cold`, `blight`, and `mind_spike`.

Classify by existing damage profile fit, new profile need, or later expansion
queue. Do not implement a broad spell runtime.

### Task 3 - L1K-CONDITION-CONTROL-CANDIDATES - Condition Control Spell Candidate Intake

Status: `ready-for-research`

Initial candidates: `blindness_deafness`, `hold_person`, `fear`,
`hypnotic_pattern`, `ray_of_enfeeblement`, and `dominate_person`.

Split social/control and combat-condition pressure precisely.

### Task 4 - L1K-PROTECTION-RESTORATION-CANDIDATES - Protection Restoration Spell Candidate Intake

Status: `ready-for-research`

Initial candidates: `aid`, `barkskin`, `death_ward`, `lesser_restoration`,
`protection_from_poison`, and `protection_from_energy`.

Classify by existing scalar buff, condition removal, damage prevention, or new
profile needs.

### Task 5 - L1K-MOBILITY-TRANSFORMATION-CANDIDATES - Mobility Transformation Spell Candidate Intake

Status: `ready-for-research`

Initial candidates: `misty_step`, `fly`, `spider_climb`,
`freedom_of_movement`, `alter_self`, and `polymorph`.

Keep table geometry and companion/stat-block replacement boundaries explicit.

### Task 6 - L1K-ZONE-WALL-CANDIDATES - Zone Wall Emanation Spell Candidate Intake

Status: `ready-for-research`

Initial candidates: `web`, `moonbeam`, `spike_growth`, `wall_of_fire`,
`wall_of_force`, `wall_of_stone`, `stinking_cloud`,
`conjure_minor_elementals`, and `conjure_woodland_beings`.

Do not convert table-owned area membership/pathfinding into runtime-owned map
automation. Treat `conjure_minor_elementals` and `conjure_woodland_beings` as
self-origin Emanation candidates under SRD 5.2.1, not companion/summon
lifecycle exclusions.

### Task 7 - L1K-DETECTION-COMMUNICATION-CANDIDATES - Detection Communication Spell Candidate Intake

Status: `ready-for-research`

Initial candidates: `clairvoyance`, `arcane_eye`, `see_invisibility`,
`tongues`, `true_seeing`, and `water_breathing`.

Separate runtime-detached information/communication from runtime-consumed
witness facts.

### Task 8 - L1K-COUNTER-DISPEL-CANDIDATES - Counter Dispel Spell Candidate Intake

Status: `ready-for-research`

Initial candidates: `counterspell`, `dispel_magic`, `antimagic_field`, and
`sequester`.

Classify interruption, ongoing effect removal, and exploration-only boundaries.

### Task 9 - L1K-WEAPON-ITEM-HOSTED-CANDIDATES - Weapon Item Hosted Spell Candidate Intake

Status: `ready-for-research`

Initial candidates: `magic_weapon`, `flame_blade`, `spiritual_weapon`,
`fire_shield`, and `warding_bond`.

Keep weapon/item hosted spell profiles separate from authored weapon data and
from D's selected identity work.

### Task 10 - L1K-COMPANION-EXCLUSION-CANDIDATES - Companion Summon Exclusion Candidate Intake

Status: `ready-for-research`

Initial candidates: `find_steed`, `animate_dead`, `animate_objects`, and
`summon_dragon`.

Record companion/summon exclusions or handoff targets only. Do not implement
companion behavior in this loop.
