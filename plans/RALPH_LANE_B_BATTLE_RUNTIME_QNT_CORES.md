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
      "status": "done",
      "title": "Split ground, obscurement, and restraint hazard core"
    },
    {
      "number": 4,
      "id": "B4-BATTLE-RUNTIME-MOVEMENT-REACTION-CORE",
      "status": "done",
      "title": "Split movement and reaction spell lifecycle core"
    },
    {
      "number": 5,
      "id": "B5-BATTLE-RUNTIME-OBJECT-CONTACT-ENDING-CORE",
      "status": "done",
      "title": "Split object-contact and ongoing spell ending core"
    },
    {
      "number": 6,
      "id": "B6-BATTLE-RUNTIME-DRAGONS-BREATH-CORE",
      "status": "done",
      "title": "Split Dragon's Breath effect and granted action core"
    },
    {
      "number": 7,
      "id": "B7-BATTLE-RUNTIME-COMPANION-FORM-CORE",
      "status": "done",
      "title": "Split companion and form lifecycle core"
    },
    {
      "number": 8,
      "id": "B8-BATTLE-RUNTIME-BLUR-DEFENSE-CORE",
      "status": "done",
      "title": "Split Blur attack-roll defense lifecycle core"
    },
    {
      "number": 9,
      "id": "B9-BATTLE-RUNTIME-ABILITY-HOLE-CLOSURE",
      "status": "done",
      "title": "Classify ability-check and Search hole readiness"
    },
    {
      "number": 10,
      "id": "B10-BATTLE-RUNTIME-CONCENTRATION-CLEANUP-CORE",
      "status": "done",
      "title": "Split concentration cleanup and duration-expiry facts"
    },
    {
      "number": 11,
      "id": "B11-BATTLE-RUNTIME-TURN-END-EFFECT-CORE",
      "status": "done",
      "title": "Split turn-end active-effect processing facts"
    },
    {
      "number": 12,
      "id": "B12-BATTLE-RUNTIME-AREA-EFFECT-ENTRY-CORE",
      "status": "done",
      "title": "Split area-entry and start-turn trigger facts"
    },
    {
      "number": 13,
      "id": "B13-BATTLE-RUNTIME-REACTION-OFFER-CORE",
      "status": "done",
      "title": "Split reaction offer and continuation facts"
    },
    {
      "number": 14,
      "id": "B14-BATTLE-RUNTIME-DAMAGE-APPLICATION-CORE",
      "status": "done",
      "title": "Split damage application and concentration-save facts"
    },
    {
      "number": 15,
      "id": "B15-BATTLE-RUNTIME-SPELL-ACTIVE-EFFECT-INDEX",
      "status": "done",
      "title": "Index remaining broad battle-runtime semantic-core owners"
    },
    {
      "number": 16,
      "id": "B16-BATTLE-RUNTIME-END-TO-END-VERIFY",
      "status": "done",
      "title": "Verify battle-runtime QNT core closure"
    },
    {
      "number": 17,
      "id": "B17-RECURSIVE-NEXT-BATCH",
      "status": "done",
      "title": "Mine next battle-runtime QNT core batch"
    },
    {
      "number": 18,
      "id": "B18-SEE-INVISIBILITY-READINESS",
      "status": "done",
      "title": "Classify See Invisibility observer-sight generator readiness"
    },
    {
      "number": 19,
      "id": "B19-RAY-ENFEEBLEMENT-SAVE-GATE-READINESS",
      "status": "done",
      "title": "Classify Ray of Enfeeblement save-gated effect readiness"
    },
    {
      "number": 20,
      "id": "B20-RAY-ENFEEBLEMENT-ATTACK-MODE-READINESS",
      "status": "done",
      "title": "Classify Ray of Enfeeblement attack-roll mode readiness"
    },
    {
      "number": 21,
      "id": "B21-RAY-ENFEEBLEMENT-CLEANUP-READINESS",
      "status": "ready-for-research",
      "title": "Classify Ray of Enfeeblement cleanup readiness"
    },
    {
      "number": 22,
      "id": "B22-GUST-OF-WIND-READINESS",
      "status": "ready-for-research",
      "title": "Classify Gust of Wind line lifecycle readiness"
    },
    {
      "number": 23,
      "id": "B23-LEVITATE-CREATURE-READINESS",
      "status": "ready-for-research",
      "title": "Classify Levitate creature lifecycle readiness"
    },
    {
      "number": 24,
      "id": "B24-QUICKENED-SPELL-READINESS",
      "status": "ready-for-research",
      "title": "Classify Quickened Spell governor readiness"
    },
    {
      "number": 25,
      "id": "B25-DIRECT-CONDITION-REMOVAL-READINESS",
      "status": "ready-for-research",
      "title": "Classify direct condition removal readiness"
    },
    {
      "number": 26,
      "id": "B26-PROTECTION-FROM-POISON-READINESS",
      "status": "ready-for-research",
      "title": "Classify Protection from Poison readiness"
    },
    {
      "number": 27,
      "id": "B27-SELF-TRANSFORMATION-READINESS",
      "status": "ready-for-research",
      "title": "Classify self-transformation mode readiness"
    },
    {
      "number": 28,
      "id": "B28-MIRROR-IMAGE-READINESS",
      "status": "ready-for-research",
      "title": "Classify Mirror Image hit-interception readiness"
    },
    {
      "number": 29,
      "id": "B29-MINIMAL-ATTACK-READINESS",
      "status": "ready-for-research",
      "title": "Classify minimal creature attack readiness"
    }
  ]
}
-->

Every Ralph task prompt must include its task-base check: compare the declared
base ref and `HEAD`, then verify the declared Base SHA is an ancestor of
`HEAD`. If the ancestor check fails, stop and report the branch-base mismatch.
Do not use this lane plan as authority to rebase a task worktree.

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

Status: `done`

Input: Web, Grease, Fog Cloud, Darkness, and related hazard/obscurement rows.

Output: focused QNT semantic core(s) that model reducer-owned hazard state and
table-provided spatial witnesses without owning geometry.

Acceptance: checker green; focused QNT/parity tests green.

### Task 4 - B4-BATTLE-RUNTIME-MOVEMENT-REACTION-CORE - Split movement and reaction spell lifecycle core

Status: `done`

Input: Expeditious Retreat, Feather Fall, Jump, forced Reaction movement, and
self-teleport readiness rows.

Output: focused QNT semantic core(s) for reducer-owned movement/reaction state.

Acceptance: checker green; focused tests green.

### Task 5 - B5-BATTLE-RUNTIME-OBJECT-CONTACT-ENDING-CORE - Split object-contact and ongoing spell ending core

Status: `done`

Input: Heat Metal, Dispel Magic, and Antimagic Field readiness rows.

Output: focused QNT semantic core(s) for object-contact damage and ongoing spell
ending/suppression state transitions.

Acceptance: checker green; focused tests green.

### Task 6 - B6-BATTLE-RUNTIME-DRAGONS-BREATH-CORE - Split Dragon's Breath effect and granted action core

Status: `done`

Input: Dragon's Breath initial-effect and granted-action rows, plus any
`later-task-typecheck-coupled` focused verification blockers introduced by
earlier battle-runtime QNT core splits.

Output: focused QNT semantic core(s), owner roles, readiness rows, and focused
verification for both initial state and granted Magic action. Clear earlier
focused-core verification blockers that are caused by the Dragon's Breath broad
owner still importing through `battle-runtime.qnt`.

Acceptance: checker green; focused tests green.

### Task 7 - B7-BATTLE-RUNTIME-COMPANION-FORM-CORE - Split companion and form lifecycle core

Status: `done`

Input: Find Familiar companion lifecycle and Wild Shape form lifecycle rows.

Output: focused QNT semantic core(s) for runtime state. Do not introduce game AI;
table choices enter through existing holes/facts.

Acceptance: checker green; focused tests green.

### Task 8 - B8-BATTLE-RUNTIME-BLUR-DEFENSE-CORE - Split Blur attack-roll defense lifecycle core

Status: `done`

Input: Blur attack-roll defense readiness row and existing focused witness.

Output: focused QNT owner/readiness cleanup that removes broad-owner coupling.

Acceptance: checker green; focused tests green.

### Task 9 - B9-BATTLE-RUNTIME-ABILITY-HOLE-CLOSURE - Classify ability-check and Search hole readiness

Status: `done`

Input: ability-check and Search battle-hole frontier rows.

Output: decide whether each row is semantic reducer ownership, generator input,
or runtime-detached table education; update rows accordingly.

Acceptance: checker green; classification rationale is executable row data, not
only prose.

### Task 10 - B10-BATTLE-RUNTIME-CONCENTRATION-CLEANUP-CORE - Split concentration cleanup and duration-expiry facts

Status: `done`

Input: obligations and QNT owners involving concentration ending, duration
cleanup, and active-effect removal.

Output: focused semantic core or proof-only classification for cleanup facts
currently hidden in broad battle-runtime owners.

Acceptance: checker green; focused tests green when behavior changes.

### Task 11 - B11-BATTLE-RUNTIME-TURN-END-EFFECT-CORE - Split turn-end active-effect processing facts

Status: `done`

Input: turn-end movement/effect obligations and broad owner markers.

Output: focused turn-end semantic core(s) or documented proof-only boundary.

Acceptance: checker green; no geometry ownership expansion.

### Task 12 - B12-BATTLE-RUNTIME-AREA-EFFECT-ENTRY-CORE - Split area-entry and start-turn trigger facts

Status: `done`

Input: area-entry/start-turn trigger rows across hazards and emanations.

Output: reusable semantic core for reducer-owned trigger timing where possible.

Acceptance: checker green; no table-owned spatial projection added.

### Task 13 - B13-BATTLE-RUNTIME-REACTION-OFFER-CORE - Split reaction offer and continuation facts

Status: `done`

Input: reaction continuation obligations and existing focused witnesses.

Output: focused semantic core/readiness rows for offer, decline, spend, and
resume protocol.

Acceptance: checker green; focused reaction tests green.

### Task 14 - B14-BATTLE-RUNTIME-DAMAGE-APPLICATION-CORE - Split damage application and concentration-save facts

Status: `done`

Input: damage application obligations, concentration save trigger facts, and
current QNT owners.

Output: focused semantic core/readiness rows that keep damage arithmetic and
save-trigger ownership explicit.

Acceptance: checker green; focused damage tests green.

### Task 15 - B15-BATTLE-RUNTIME-SPELL-ACTIVE-EFFECT-INDEX - Index remaining broad battle-runtime semantic-core owners

Status: `done`

Input: all remaining `generator-readiness.jsonl` rows whose `semanticCore`
contains `packages/battle-runtime/battle-runtime.qnt`.

Output: update this plan with new atomic tasks for any remaining broad-owner
frontier, or record that no battle-runtime broad-owner blocker remains.

Acceptance: at least 8 new tasks are appended when frontier remains; otherwise
checker evidence proves closure.

Closure evidence: `generator-readiness.jsonl` has 69 rows and no exact or
substring `semanticCore` references to
`packages/battle-runtime/battle-runtime.qnt`; the rules-kernel coverage checker
passes with 97 obligations, so no broad-owner frontier remains for this task to
split.

### Task 16 - B16-BATTLE-RUNTIME-END-TO-END-VERIFY - Verify battle-runtime QNT core closure

Status: `done`

Input: completed B tasks.

Output: run and document the final B-lane verification commands in the plan
Findings section only if a future Ralph needs the result.

Acceptance: checker green; focused tests green; no untracked plan noise.

Closure evidence: the rules-kernel checker passes with 97 obligations after
`--write`, and the package-local battle-runtime QNT self-test passes on the
integration result. No generated plan or matrix fallout remains for this task.

### Task 17 - B17-RECURSIVE-NEXT-BATCH - Mine next battle-runtime QNT core batch

Status: `done`

Input: current checker-owned artifacts after B16.

Output: append at least 12 new atomic runnable tasks or prove from
`generator-readiness.jsonl`, `obligations.jsonl`, and `qnt-owner-roles.jsonl`
that no battle-runtime QNT core work remains.

Acceptance: plan has new runnable tasks or a concise durable closure note.

Batch evidence: 12 runnable follow-up tasks are appended as B18-B29. They cover
the nine remaining `BATTLE.*` `not-assessed` generator-readiness rows that also
have covered battle-runtime QNT owners in `obligations.jsonl`: See
Invisibility, Ray of Enfeeblement, Gust of Wind, Levitate, Quickened Spell,
condition removal/protection, self-transformation, Mirror Image, and minimal
creature attack resolution. Ray of Enfeeblement is split by save-gated effect,
attack-roll mode, and cleanup owner responsibilities; condition
removal/protection is split by direct condition removal and Protection from
Poison owner responsibilities.

### Task 18 - B18-SEE-INVISIBILITY-READINESS - Classify See Invisibility observer-sight generator readiness

Status: `done`

Input: `BATTLE.SPELL.SEE_INVISIBILITY_OBSERVER_SIGHT` rows in
`generator-readiness.jsonl`, `obligations.jsonl`, and `qnt-owner-roles.jsonl`;
QNT owner `packages/battle-runtime/battle-runtime-see-invisibility.qnt`; witness
`packages/battle-runtime/src/see-invisibility-observer-sight.mbt.test.ts`.

Output: classify the generator-readiness row with semantic-core/proof-only
paths, subset tokens, blockers, or a checked non-generator rationale.

Acceptance: checker green; focused See Invisibility witness green when row
classification changes rely on its executable evidence.

### Task 19 - B19-RAY-ENFEEBLEMENT-SAVE-GATE-READINESS - Classify Ray of Enfeeblement save-gated effect readiness

Status: `done`

Input: `BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_D20_LIFECYCLE` rows, focused on
`packages/battle-runtime/battle-runtime-save-gated-spell.qnt` and the
save-gated next-attack/Strength D20 Test effect facts.

Output: update readiness for the save-gated Ray of Enfeeblement effect slice,
or record a blocker with a concrete follow-up task id.

Acceptance: checker green; Ray of Enfeeblement lifecycle witness green if the
task changes semantic-core/proof-only classification.

### Task 20 - B20-RAY-ENFEEBLEMENT-ATTACK-MODE-READINESS - Classify Ray of Enfeeblement attack-roll mode readiness

Status: `done`

Input: `BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_D20_LIFECYCLE` rows, focused on
`packages/battle-runtime/battle-runtime-spell-attack.qnt` and attack-roll mode
projection facts.

Output: classify whether the attack-roll mode owner is generator-subset-clean,
proof-only, or blocked, keeping this row synchronized with Task 19/21 outcomes.

Acceptance: checker green; Ray of Enfeeblement lifecycle witness green when
classification changes depend on this owner.

### Task 21 - B21-RAY-ENFEEBLEMENT-CLEANUP-READINESS - Classify Ray of Enfeeblement cleanup readiness

Status: `ready-for-research`

Input: `BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_D20_LIFECYCLE` rows, focused on
`packages/battle-runtime/battle-runtime-timed-effects.qnt`,
`packages/battle-runtime/battle-runtime-concentration.qnt`, and repeat-save /
Concentration cleanup facts.

Output: classify cleanup-owner readiness for the Ray of Enfeeblement D20
lifecycle, or record specific blockers with follow-up ownership.

Acceptance: checker green; Ray of Enfeeblement lifecycle witness green when
classification changes depend on cleanup semantics.

### Task 22 - B22-GUST-OF-WIND-READINESS - Classify Gust of Wind line lifecycle readiness

Status: `ready-for-research`

Input: `BATTLE.SPELL.GUST_OF_WIND_LINE_LIFECYCLE` rows; QNT owner
`packages/battle-runtime/battle-runtime-gust-of-wind.qnt`; witness
`packages/battle-runtime/src/gust-of-wind-line-lifecycle.mbt.test.ts`.

Output: classify line lifecycle generator readiness, preserving table-owned
spatial witness boundaries.

Acceptance: checker green; focused Gust of Wind witness green when
classification changes use executable behavior.

### Task 23 - B23-LEVITATE-CREATURE-READINESS - Classify Levitate creature lifecycle readiness

Status: `ready-for-research`

Input: `BATTLE.SPELL.LEVITATED_CREATURE_LIFECYCLE` rows; QNT owner
`packages/battle-runtime/battle-runtime-levitate-creature.qnt`; runtime witness
`packages/battle-runtime/src/unit-profile-admission-levitate.test.ts`.

Output: classify creature-branch lifecycle readiness, including altitude scalar,
caster Magic Action control, and cleanup ownership, without taking over map
geometry.

Acceptance: checker green; focused Levitate runtime witness green if the row
classification changes.

### Task 24 - B24-QUICKENED-SPELL-READINESS - Classify Quickened Spell governor readiness

Status: `ready-for-research`

Input: `BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR` rows; QNT owner
`packages/battle-runtime/battle-runtime-metamagic.qnt`; witnesses
`packages/battle-runtime/src/battle-runtime-metamagic-resource.test.ts` and
`packages/battle-runtime/src/quickened-spell-governor.mbt.test.ts`.

Output: classify metamagic governor generator readiness for Sorcery Point spend,
selection gates, Bonus Action rewrite, and same-turn leveled-spell limit.

Acceptance: checker green; focused metamagic witnesses green when
classification changes use executable behavior.

### Task 25 - B25-DIRECT-CONDITION-REMOVAL-READINESS - Classify direct condition removal readiness

Status: `ready-for-research`

Input: `BATTLE.SPELL.CONDITION_REMOVAL_AND_PROTECTION` rows, focused on
`packages/battle-runtime/battle-runtime-direct-condition-removal.qnt` and direct
condition-removal semantics.

Output: classify the direct-removal owner as semantic-core/proof-only/blocked
for generator readiness, keeping it synchronized with Task 26.

Acceptance: checker green; condition-removal/protection witness green if the
classification changes rely on executable behavior.

### Task 26 - B26-PROTECTION-FROM-POISON-READINESS - Classify Protection from Poison readiness

Status: `ready-for-research`

Input: `BATTLE.SPELL.CONDITION_REMOVAL_AND_PROTECTION` rows, focused on
`packages/battle-runtime/battle-runtime-protection-from-poison.qnt`, poison
condition removal, Poison Resistance, and poison Saving Throw Advantage.

Output: classify Protection from Poison generator readiness, or record concrete
blockers with follow-up ownership.

Acceptance: checker green; condition-removal/protection and unit-profile
witnesses green when classification changes use executable behavior.

### Task 27 - B27-SELF-TRANSFORMATION-READINESS - Classify self-transformation mode readiness

Status: `ready-for-research`

Input: `BATTLE.SPELL.SELF_TRANSFORMATION_MODE` rows; QNT owner
`packages/battle-runtime/battle-runtime-self-transformation.qnt`; witnesses
`packages/battle-runtime/src/unit-profile-admission-alter-self.test.ts` and
`packages/battle-runtime/src/self-transformation-mode-lifecycle.mbt.test.ts`.

Output: classify self-transformation mode generator readiness for mode choice,
Magic Action replacement, natural weapon override, and Aquatic projections.

Acceptance: checker green; focused self-transformation witnesses green when
classification changes use executable behavior.

### Task 28 - B28-MIRROR-IMAGE-READINESS - Classify Mirror Image hit-interception readiness

Status: `ready-for-research`

Input: `BATTLE.SPELL.MIRROR_IMAGE_HIT_INTERCEPTION` rows; QNT owner
`packages/battle-runtime/battle-runtime-mirror-image.qnt`; witness
`packages/battle-runtime/src/mirror-image-hit-interception.mbt.test.ts`.

Output: classify duplicate pool, interception roll, duplicate destruction,
bypass witness, and normal damage continuation readiness.

Acceptance: checker green; focused Mirror Image witness green when
classification changes use executable behavior.

### Task 29 - B29-MINIMAL-ATTACK-READINESS - Classify minimal creature attack readiness

Status: `ready-for-research`

Input: `BATTLE.ATTACK.MINIMAL_RESOLUTION` rows; QNT owner
`packages/battle-runtime/creature-attack.qnt`; witness
`packages/battle-runtime/src/creature-attack.mbt.test.ts`.

Output: classify the pilot creature-vs-creature attack slice readiness, including
whether its bounded HP and nondet hit/damage shape is semantic-core,
fixture-bound, or blocked for generator use.

Acceptance: checker green; focused creature attack witness green when
classification changes use executable behavior.
