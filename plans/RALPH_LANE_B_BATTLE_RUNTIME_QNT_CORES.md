# Ralph Lane B - Battle Runtime QNT Cores

Purpose: split the broad `packages/battle-runtime/battle-runtime.qnt`
generator-readiness frontier into focused battle-runtime semantic cores. This
lane owns battle-runtime QNT cleanliness only; it must not add new Unit support
claims, broaden SRD level scope, or rewrite runtime reducers except for tiny
parity fallout required by a focused QNT split.

Hard workload rule: this lane is underloaded if it completes before at least 15
tasks land. The recursive task must append at least 12 new atomic runnable tasks
or prove from checker-owned artifacts that no such work remains.

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "B1-BATTLE-RUNTIME-SLICE-OWNER-CLOSURE",
      "status": "done",
      "title": "Close already-sliced battle-runtime owner markers"
    },
    {
      "number": 2,
      "id": "B2-BATTLE-RUNTIME-LIGHT-EMITTER-CORE",
      "status": "done",
      "title": "Split light emitter and held object lifecycle core"
    },
    {
      "number": 3,
      "id": "B3-BATTLE-RUNTIME-GROUND-HAZARD-CORE",
      "status": "ready-for-research",
      "title": "Split ground, obscurement, and restraint hazard core"
    },
    {
      "number": 4,
      "id": "B4-BATTLE-RUNTIME-MOVEMENT-REACTION-CORE",
      "status": "ready-for-research",
      "title": "Split movement and reaction spell lifecycle core"
    },
    {
      "number": 5,
      "id": "B5-BATTLE-RUNTIME-OBJECT-CONTACT-ENDING-CORE",
      "status": "ready-for-research",
      "title": "Split object-contact and ongoing spell ending core"
    },
    {
      "number": 6,
      "id": "B6-BATTLE-RUNTIME-DRAGONS-BREATH-CORE",
      "status": "ready-for-research",
      "title": "Split Dragon's Breath effect and granted action core"
    },
    {
      "number": 7,
      "id": "B7-BATTLE-RUNTIME-COMPANION-FORM-CORE",
      "status": "ready-for-research",
      "title": "Split companion and form lifecycle core"
    },
    {
      "number": 8,
      "id": "B8-BATTLE-RUNTIME-BLUR-DEFENSE-CORE",
      "status": "ready-for-research",
      "title": "Split Blur attack-roll defense lifecycle core"
    },
    {
      "number": 9,
      "id": "B9-BATTLE-RUNTIME-ABILITY-HOLE-CLOSURE",
      "status": "ready-for-research",
      "title": "Classify ability-check and Search hole readiness"
    },
    {
      "number": 10,
      "id": "B10-BATTLE-RUNTIME-CONCENTRATION-CLEANUP-CORE",
      "status": "ready-for-research",
      "title": "Split concentration cleanup and duration-expiry facts"
    },
    {
      "number": 11,
      "id": "B11-BATTLE-RUNTIME-TURN-END-EFFECT-CORE",
      "status": "ready-for-research",
      "title": "Split turn-end active-effect processing facts"
    },
    {
      "number": 12,
      "id": "B12-BATTLE-RUNTIME-AREA-EFFECT-ENTRY-CORE",
      "status": "ready-for-research",
      "title": "Split area-entry and start-turn trigger facts"
    },
    {
      "number": 13,
      "id": "B13-BATTLE-RUNTIME-REACTION-OFFER-CORE",
      "status": "ready-for-research",
      "title": "Split reaction offer and continuation facts"
    },
    {
      "number": 14,
      "id": "B14-BATTLE-RUNTIME-DAMAGE-APPLICATION-CORE",
      "status": "ready-for-research",
      "title": "Split damage application and concentration-save facts"
    },
    {
      "number": 15,
      "id": "B15-BATTLE-RUNTIME-SPELL-ACTIVE-EFFECT-INDEX",
      "status": "ready-for-research",
      "title": "Index remaining broad battle-runtime semantic-core owners"
    },
    {
      "number": 16,
      "id": "B16-BATTLE-RUNTIME-END-TO-END-VERIFY",
      "status": "ready-for-research",
      "title": "Verify battle-runtime QNT core closure"
    },
    {
      "number": 17,
      "id": "B17-RECURSIVE-NEXT-BATCH",
      "status": "ready-for-research",
      "title": "Mine next battle-runtime QNT core batch"
    }
  ]
}
-->

Every Ralph prompt must include:

> Before starting, run `git log --oneline -1 master` and verify your HEAD
> matches. If not, run `git rebase master`.

Reviewer loop: RAW traceability, ubiquitous-language/domain-language,
architecture/connascence, and code review. Repeat until no reasonable findings
remain. Do not claim success from metadata alone.

## Context Budget

Read only:

- this plan;
- `AGENTS.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- the SRD passages named by the obligation row being changed;
- `plans/rules-kernel-coverage/README.md`;
- the relevant rows in `generator-readiness.jsonl`, `obligations.jsonl`,
  `qnt-owner-roles.jsonl`, and `battle-hole-frontier.jsonl`;
- the QNT/runtime files named by those rows.

Do not read historical Ralph plans or work logs. If a task needs background
rationale, prefer checker-owned artifacts and the current source files.

## Boundaries

Lane B owns:

- `packages/battle-runtime/*.qnt` semantic-core splits;
- `packages/battle-runtime/src/*mbt*.test.ts` only when a split needs a focused
  parity witness update;
- `plans/rules-kernel-coverage/generator-readiness.jsonl`;
- `plans/rules-kernel-coverage/qnt-owner-roles.jsonl`;
- `plans/rules-kernel-coverage/obligations.jsonl` only for owner/witness fallout.

Lane B must not:

- change Unit support claims or selected-identity policy;
- add broad reducer behavior;
- touch Lane A unit-feature shared-algebra cores;
- touch Lane C aggregate metric/checker work except generated fallout from the
  rules-kernel checker.

## Verification

Run for every task:

- `pnpm rules-kernel-coverage:check -- --write`
- `pnpm rules-kernel-coverage:check`
- the focused package-local QNT or parity test named by the changed row
- `git diff --check`

Run `pnpm unit-profile-coverage:check` when a task changes any Unit/profile
matrix artifact. Do not run battle MBT for exploratory questions.

## Tasks

### Task 1 - B1-BATTLE-RUNTIME-SLICE-OWNER-CLOSURE - Close already-sliced battle-runtime owner markers

Status: `done`

Input: generator-readiness rows for Direct Condition, Flaming Sphere, and
Moonbeam that still point at broad `battle-runtime.qnt` despite existing focused
owners or witnesses.

Output: update owner roles/readiness rows so already-sliced semantics no longer
look fixture-bound on the broad owner.

Acceptance: checker green; no new runtime behavior.

### Task 2 - B2-BATTLE-RUNTIME-LIGHT-EMITTER-CORE - Split light emitter and held object lifecycle core

Status: `done`

Input: OBJECT_LIGHT_EMITTER, HELD_LIGHT_EMITTER, SPELL_CREATED_HELD_OBJECT, and
DANCING_LIGHTS readiness rows.

Output: focused QNT semantic core(s), role rows, readiness rows, and focused
verification for light/object lifecycle semantics.

Acceptance: checker green; relevant focused tests green.

### Task 3 - B3-BATTLE-RUNTIME-GROUND-HAZARD-CORE - Split ground, obscurement, and restraint hazard core

Status: `ready-for-research`

Input: Web, Grease, Fog Cloud, Darkness, and related hazard/obscurement rows.

Output: focused QNT semantic core(s) that model reducer-owned hazard state and
table-provided spatial witnesses without owning geometry.

Acceptance: checker green; focused QNT/parity tests green.

### Task 4 - B4-BATTLE-RUNTIME-MOVEMENT-REACTION-CORE - Split movement and reaction spell lifecycle core

Status: `ready-for-research`

Input: Expeditious Retreat, Feather Fall, Jump, forced Reaction movement, and
self-teleport readiness rows.

Output: focused QNT semantic core(s) for reducer-owned movement/reaction state.

Acceptance: checker green; focused tests green.

### Task 5 - B5-BATTLE-RUNTIME-OBJECT-CONTACT-ENDING-CORE - Split object-contact and ongoing spell ending core

Status: `ready-for-research`

Input: Heat Metal, Dispel Magic, and Antimagic Field readiness rows.

Output: focused QNT semantic core(s) for object-contact damage and ongoing spell
ending/suppression state transitions.

Acceptance: checker green; focused tests green.

### Task 6 - B6-BATTLE-RUNTIME-DRAGONS-BREATH-CORE - Split Dragon's Breath effect and granted action core

Status: `ready-for-research`

Input: Dragon's Breath initial-effect and granted-action rows.

Output: focused QNT semantic core(s), owner roles, readiness rows, and focused
verification for both initial state and granted Magic action.

Acceptance: checker green; focused tests green.

### Task 7 - B7-BATTLE-RUNTIME-COMPANION-FORM-CORE - Split companion and form lifecycle core

Status: `ready-for-research`

Input: Find Familiar companion lifecycle and Wild Shape form lifecycle rows.

Output: focused QNT semantic core(s) for runtime state. Do not introduce game AI;
table choices enter through existing holes/facts.

Acceptance: checker green; focused tests green.

### Task 8 - B8-BATTLE-RUNTIME-BLUR-DEFENSE-CORE - Split Blur attack-roll defense lifecycle core

Status: `ready-for-research`

Input: Blur attack-roll defense readiness row and existing focused witness.

Output: focused QNT owner/readiness cleanup that removes broad-owner coupling.

Acceptance: checker green; focused tests green.

### Task 9 - B9-BATTLE-RUNTIME-ABILITY-HOLE-CLOSURE - Classify ability-check and Search hole readiness

Status: `ready-for-research`

Input: ability-check and Search battle-hole frontier rows.

Output: decide whether each row is semantic reducer ownership, generator input,
or runtime-detached table education; update rows accordingly.

Acceptance: checker green; classification rationale is executable row data, not
only prose.

### Task 10 - B10-BATTLE-RUNTIME-CONCENTRATION-CLEANUP-CORE - Split concentration cleanup and duration-expiry facts

Status: `ready-for-research`

Input: obligations and QNT owners involving concentration ending, duration
cleanup, and active-effect removal.

Output: focused semantic core or proof-only classification for cleanup facts
currently hidden in broad battle-runtime owners.

Acceptance: checker green; focused tests green when behavior changes.

### Task 11 - B11-BATTLE-RUNTIME-TURN-END-EFFECT-CORE - Split turn-end active-effect processing facts

Status: `ready-for-research`

Input: turn-end movement/effect obligations and broad owner markers.

Output: focused turn-end semantic core(s) or documented proof-only boundary.

Acceptance: checker green; no geometry ownership expansion.

### Task 12 - B12-BATTLE-RUNTIME-AREA-EFFECT-ENTRY-CORE - Split area-entry and start-turn trigger facts

Status: `ready-for-research`

Input: area-entry/start-turn trigger rows across hazards and emanations.

Output: reusable semantic core for reducer-owned trigger timing where possible.

Acceptance: checker green; no table-owned spatial projection added.

### Task 13 - B13-BATTLE-RUNTIME-REACTION-OFFER-CORE - Split reaction offer and continuation facts

Status: `ready-for-research`

Input: reaction continuation obligations and existing focused witnesses.

Output: focused semantic core/readiness rows for offer, decline, spend, and
resume protocol.

Acceptance: checker green; focused reaction tests green.

### Task 14 - B14-BATTLE-RUNTIME-DAMAGE-APPLICATION-CORE - Split damage application and concentration-save facts

Status: `ready-for-research`

Input: damage application obligations, concentration save trigger facts, and
current QNT owners.

Output: focused semantic core/readiness rows that keep damage arithmetic and
save-trigger ownership explicit.

Acceptance: checker green; focused damage tests green.

### Task 15 - B15-BATTLE-RUNTIME-SPELL-ACTIVE-EFFECT-INDEX - Index remaining broad battle-runtime semantic-core owners

Status: `ready-for-research`

Input: all remaining `generator-readiness.jsonl` rows whose `semanticCore`
contains `packages/battle-runtime/battle-runtime.qnt`.

Output: update this plan with new atomic tasks for any remaining broad-owner
frontier, or record that no battle-runtime broad-owner blocker remains.

Acceptance: at least 8 new tasks are appended when frontier remains; otherwise
checker evidence proves closure.

### Task 16 - B16-BATTLE-RUNTIME-END-TO-END-VERIFY - Verify battle-runtime QNT core closure

Status: `ready-for-research`

Input: completed B tasks.

Output: run and document the final B-lane verification commands in the plan
Findings section only if a future Ralph needs the result.

Acceptance: checker green; focused tests green; no untracked plan noise.

### Task 17 - B17-RECURSIVE-NEXT-BATCH - Mine next battle-runtime QNT core batch

Status: `ready-for-research`

Input: current checker-owned artifacts after B16.

Output: append at least 12 new atomic runnable tasks or prove from
`generator-readiness.jsonl`, `obligations.jsonl`, and `qnt-owner-roles.jsonl`
that no battle-runtime QNT core work remains.

Acceptance: plan has new runnable tasks or a concise durable closure note.
