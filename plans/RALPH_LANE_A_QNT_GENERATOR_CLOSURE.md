# Ralph Lane A - Unit Feature QNT Cores

Purpose: finish the unit-feature side of QNT generator readiness. This lane owns
shared-algebra unit-feature semantic cores and their generated accounting. It
must not work on battle-runtime spell lifecycle cores now owned by Lane B, and
must not work on aggregate ultra-golden metric gates now owned by Lane C.

Current baseline note: previous A work completed the spell-profile splits and
the first unit-feature splits through action count, Rage/Reckless, attack rider,
and save-damage. If an integration branch already contains those commits, merge
them before continuing this narrowed queue.

Hard workload rule: this lane is underloaded if it completes before at least 15
tasks land after the current narrowing. The recursive task must append at least
12 new atomic runnable tasks or prove from checker-owned artifacts that no such
work remains.

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "A38-UNIT-FEATURE-ACTION-COUNT-CORE",
      "status": "done",
      "title": "Split unit feature action grant and attack-count core"
    },
    {
      "number": 2,
      "id": "A39-UNIT-FEATURE-RAGE-RECKLESS-CORE",
      "status": "done",
      "title": "Split Rage, Reckless Attack, and Frenzy core"
    },
    {
      "number": 3,
      "id": "A40-UNIT-FEATURE-ATTACK-RIDER-CORE",
      "status": "done",
      "title": "Split unit feature attack roll and damage rider core"
    },
    {
      "number": 4,
      "id": "A41-UNIT-FEATURE-SAVE-DAMAGE-CORE",
      "status": "done",
      "title": "Split unit feature Saving Throw and save-damage core"
    },
    {
      "number": 5,
      "id": "A42-UNIT-FEATURE-REACTION-REDUCTION-CORE",
      "status": "done",
      "title": "Split unit feature reaction reduction and redirect core"
    },
    {
      "number": 6,
      "id": "A43-UNIT-FEATURE-PASSIVE-MOVEMENT-DEFENSE-CORE",
      "status": "done",
      "title": "Split passive movement and defense feature core"
    },
    {
      "number": 7,
      "id": "A44-UNIT-FEATURE-MARTIAL-ARTS-CORE",
      "status": "done",
      "title": "Split Martial Arts projection core"
    },
    {
      "number": 8,
      "id": "A45-UNIT-FEATURE-ZERO-HP-CORE",
      "status": "done",
      "title": "Split zero-Hit-Point feature replacement core"
    },
    {
      "number": 9,
      "id": "A46-MONK-FOCUS-BATTLE-CORE",
      "status": "done",
      "title": "Split Monk Focus battle option core"
    },
    {
      "number": 10,
      "id": "A56-UNIT-FEATURE-OWNER-ROLE-CLOSURE",
      "status": "done",
      "title": "Refresh unit-feature owner roles after semantic-core splits"
    },
    {
      "number": 11,
      "id": "A57-UNIT-FEATURE-READINESS-ROW-CLOSURE",
      "status": "done",
      "title": "Close unit-feature generator-readiness row"
    },
    {
      "number": 12,
      "id": "A58-UNIT-FEATURE-PROFILE-JOIN-AUDIT",
      "status": "done",
      "title": "Audit supported feature profile to rules-kernel joins"
    },
    {
      "number": 13,
      "id": "A59-UNIT-FEATURE-MBT-BRIDGE-AUDIT",
      "status": "done",
      "title": "Audit unit-feature MBT bridge coverage"
    },
    {
      "number": 14,
      "id": "A60-UNIT-FEATURE-GENERATOR-SUBSET-AUDIT",
      "status": "done",
      "title": "Audit unit-feature generator subset tokens"
    },
    {
      "number": 15,
      "id": "A61-UNIT-FEATURE-RUN-BLOCK-SCANNER-CLOSURE",
      "status": "ready-for-research",
      "title": "Close unit-feature run-block scanner findings"
    },
    {
      "number": 16,
      "id": "A62-UNIT-FEATURE-EXAMPLE-FILE-ROLE-CLOSURE",
      "status": "ready-for-research",
      "title": "Classify unit-feature example files as proof-only"
    },
    {
      "number": 17,
      "id": "A63-UNIT-FEATURE-SELECTED-IDENTITY-CHECK",
      "status": "ready-for-research",
      "title": "Check selected-identity fallout from feature splits"
    },
    {
      "number": 18,
      "id": "A64-UNIT-FEATURE-END-TO-END-VERIFY",
      "status": "ready-for-research",
      "title": "Verify unit-feature QNT core closure"
    },
    {
      "number": 19,
      "id": "A65-UNIT-FEATURE-STRICT-DENOMINATOR-AUDIT",
      "status": "ready-for-research",
      "title": "Audit strict level 1-2 denominator fallout"
    },
    {
      "number": 20,
      "id": "A66-UNIT-FEATURE-RULES-KERNEL-REPORT-CLOSURE",
      "status": "ready-for-research",
      "title": "Refresh rules-kernel reports after unit-feature closure"
    },
    {
      "number": 21,
      "id": "A67-RECURSIVE-NEXT-BATCH",
      "status": "ready-for-research",
      "title": "Mine next unit-feature QNT generator batch"
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
- the SRD class/species/feat passages named by the profile being changed;
- `plans/rules-kernel-coverage/README.md`;
- the relevant rows in `generator-readiness.jsonl`, `obligations.jsonl`,
  `qnt-owner-roles.jsonl`, and `profile-obligations.jsonl`;
- the QNT/runtime files named by those rows.

Do not read historical Ralph plans or work logs. Use generated checker artifacts
instead of transcripts.

## Boundaries

Lane A owns:

- `packages/shared-algebras/proofs/rule-core/*unit-feature*.qnt`;
- `packages/battle-runtime/battle-runtime-monk-focus.qnt` only for Monk Focus
  semantic-core extraction;
- unit-feature rows in `plans/rules-kernel-coverage/generator-readiness.jsonl`;
- unit-feature rows in `plans/rules-kernel-coverage/qnt-owner-roles.jsonl`;
- generated unit-profile artifacts only when ownership changes require them.

Lane A must not:

- touch battle-runtime spell lifecycle core tasks B1-B17;
- add or change Unit selected-identity policy;
- implement new battle reducer behavior;
- edit aggregate ultra-golden metric/checker work owned by Lane C.

## Verification

Run for every task:

- `pnpm rules-kernel-coverage:check -- --write`
- `pnpm rules-kernel-coverage:check`
- the focused QNT test or typecheck for changed unit-feature files
- `pnpm unit-profile-coverage:check` when ownership artifacts change
- `git diff --check`

Do not run battle MBT for exploratory questions.

## Tasks

### Task 1 - A38-UNIT-FEATURE-ACTION-COUNT-CORE - Split unit feature action grant and attack-count core

Status: `done`

Carry-forward marker for follow-up validation. The implementation is in the
current A integration branch.

### Task 2 - A39-UNIT-FEATURE-RAGE-RECKLESS-CORE - Split Rage, Reckless Attack, and Frenzy core

Status: `done`

Carry-forward marker for follow-up validation. The implementation is in the
current A integration branch.

### Task 3 - A40-UNIT-FEATURE-ATTACK-RIDER-CORE - Split unit feature attack roll and damage rider core

Status: `done`

Carry-forward marker for follow-up validation. The implementation is in the
current A integration branch.

### Task 4 - A41-UNIT-FEATURE-SAVE-DAMAGE-CORE - Split unit feature Saving Throw and save-damage core

Status: `done`

Carry-forward marker for follow-up validation. The implementation is in the
current A integration branch.

### Task 5 - A42-UNIT-FEATURE-REACTION-REDUCTION-CORE - Split unit feature reaction reduction and redirect core

Status: `done`

Task 42 is already landed on this integration branch.

Input: Cutting Words, Uncanny Dodge, Deflect Attacks, and related
reaction-reduction/redirect rows.

Output: focused unit-feature semantic core, proof-only examples, owner-role row,
readiness row update, and regenerated unit-profile artifacts if ownership moved.

Acceptance: checker green; unit-profile check green when artifacts changed.

### Task 6 - A43-UNIT-FEATURE-PASSIVE-MOVEMENT-DEFENSE-CORE - Split passive movement and defense feature core

Status: `done`

Input: passive Armor Class, ranged attack roll, saving throw roll mode, Speed,
and speed-kind grant facts.

Output: focused semantic core and readiness rows for passive feature projection.

Acceptance: checker green; focused QNT checks green.

### Task 7 - A44-UNIT-FEATURE-MARTIAL-ARTS-CORE - Split Martial Arts projection core

Status: `done`

Input: Martial Arts eligibility, die scaling, ability modifier, DC, and Bonus
Unarmed Strike facts.

Output: focused semantic core/readiness rows without profile fixture coupling.

Acceptance: checker green; focused QNT checks green.

### Task 8 - A45-UNIT-FEATURE-ZERO-HP-CORE - Split zero-Hit-Point feature replacement core

Status: `done`

Input: Relentless Endurance and zero-Hit-Point replacement facts.

Output: focused semantic core/readiness rows.

Acceptance: checker green; focused QNT checks green.

### Task 9 - A46-MONK-FOCUS-BATTLE-CORE - Split Monk Focus battle option core

Status: `done`

Input: Flurry of Blows, Patient Defense, Step of the Wind, and Focus Point facts.

Output: focused Monk Focus semantic core/readiness rows that keep feature facts
separate from broad battle-runtime spell lifecycle owners.

Acceptance: checker green; focused QNT/parity checks green.

### Task 10 - A56-UNIT-FEATURE-OWNER-ROLE-CLOSURE - Refresh unit-feature owner roles after semantic-core splits

Status: `done`

Output: `qnt-owner-roles.jsonl` has correct semantic-core/proof-only roles for
all unit-feature owners.

Acceptance: checker green.

Closed by checker evidence: current owner-role artifacts classify the split
unit-feature semantic owners as `semantic-core`; example and inductive owners
remain proof-only closure work under Task 16.

### Task 11 - A57-UNIT-FEATURE-READINESS-ROW-CLOSURE - Close unit-feature generator-readiness row

Status: `done`

Output: the `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS` readiness row no
longer carries stale blockers or stale follow-up ids.

Acceptance: checker green; remaining blockers have live task ids.

Closed by checker evidence: current `generator-readiness.jsonl` marks the row
`generation-subset-clean`, has `blockedBy: []`, and carries no follow-up task
ids.

### Task 12 - A58-UNIT-FEATURE-PROFILE-JOIN-AUDIT - Audit supported feature profile to rules-kernel joins

Status: `done`

Output: supported unit-feature profiles join to rules-kernel obligations without
missing or stale owner evidence.

Acceptance: `pnpm unit-profile-coverage:check` and rules-kernel check green.

Closed by checker evidence: supported `unit-feature.` profile joins now require
rules-kernel coverage, and feature procedure evidence reports use profile-scoped
QNT owner evidence so broad obligation owners cannot satisfy unrelated
profiles.

### Task 13 - A59-UNIT-FEATURE-MBT-BRIDGE-AUDIT - Audit unit-feature MBT bridge coverage

Status: `done`

Output: document any missing focused parity witness tasks in this plan or close
the audit with checker evidence.

Acceptance: no hidden MBT/parity gap for supported unit-feature procedure rows.

Closed by checker evidence in
`plans/unit-profile-coverage/A59_UNIT_FEATURE_MBT_BRIDGE_AUDIT.md`: the feature
procedure QNT/MBT evidence gate is green for supported `unit-feature.` rows in
the level-support scopes, and no missing focused parity witness follow-up task is
required under the current checker policy.

### Task 14 - A60-UNIT-FEATURE-GENERATOR-SUBSET-AUDIT - Audit unit-feature generator subset tokens

Status: `done`

Output: generator subset tokens for unit-feature rows match observed QNT
constructs.

Acceptance: checker green; no unsupported construct hidden behind broad tokens.

### Task 15 - A61-UNIT-FEATURE-RUN-BLOCK-SCANNER-CLOSURE - Close unit-feature run-block scanner findings

Status: `ready-for-research`

Output: scanner findings for unit-feature semantic-core owners are zero or have
live follow-up tasks.

Acceptance: checker green.

### Task 16 - A62-UNIT-FEATURE-EXAMPLE-FILE-ROLE-CLOSURE - Classify unit-feature example files as proof-only

Status: `ready-for-research`

Output: example/inductive files are proof-only and not generator input.

Acceptance: checker green.

### Task 17 - A63-UNIT-FEATURE-SELECTED-IDENTITY-CHECK - Check selected-identity fallout from feature splits

Status: `ready-for-research`

Output: selected-identity metrics remain green after unit-feature ownership
changes, or gaps are assigned to Lane C.

Acceptance: unit-profile check green.

### Task 18 - A64-UNIT-FEATURE-END-TO-END-VERIFY - Verify unit-feature QNT core closure

Status: `ready-for-research`

Output: focused verification for the unit-feature closure set.

Acceptance: checker green; focused QNT tests green; no stale generated files.

### Task 19 - A65-UNIT-FEATURE-STRICT-DENOMINATOR-AUDIT - Audit strict level 1-2 denominator fallout

Status: `ready-for-research`

Output: level 1 and level 1-2 strict support gates remain green after ownership
changes.

Acceptance: `pnpm unit-profile-coverage:check` green.

### Task 20 - A66-UNIT-FEATURE-RULES-KERNEL-REPORT-CLOSURE - Refresh rules-kernel reports after unit-feature closure

Status: `ready-for-research`

Output: generated rules-kernel reports reflect the new unit-feature core shape.

Acceptance: generated reports have no stale broad-owner claims for unit-feature
rows.

### Task 21 - A67-RECURSIVE-NEXT-BATCH - Mine next unit-feature QNT generator batch

Status: `ready-for-research`

Input: current checker-owned artifacts after A66.

Output: append at least 12 new atomic runnable tasks or prove from
`generator-readiness.jsonl`, `profile-obligations.jsonl`, and
`qnt-owner-roles.jsonl` that no unit-feature QNT generator work remains.

Acceptance: plan has new runnable tasks or a concise durable closure note.
