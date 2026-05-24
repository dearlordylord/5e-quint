# Ralph Lane A - QNT Generator Closure

Purpose: close the remaining QNT generator-readiness frontier without touching
Unit selected-identity gates or broad product-support metrics.

Hard workload rule: this lane is underloaded if it completes before at least 15
tasks land. The recursive task must append at least 12 new atomic runnable tasks
or prove from checker-owned artifacts that no such work remains.

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "A1-SPELL-FIXTURE-BOUND-SURVEY",
      "status": "done",
      "title": "Survey spell procedure generator blockers"
    },
    {
      "number": 2,
      "id": "A2-INVOCATION-CARDINALITY-CORE",
      "status": "done",
      "title": "Extract invocation target cardinality core"
    },
    {
      "number": 3,
      "id": "A3-INVOCATION-ACTION-SLOT-CORE",
      "status": "done",
      "title": "Extract invocation action and slot mapping core"
    },
    {
      "number": 4,
      "id": "A4-SAVE-DAMAGE-PROJECTION-CORE",
      "status": "done",
      "title": "Split save-gated damage projection core"
    },
    {
      "number": 5,
      "id": "A5-SAVE-CONDITION-PROJECTION-CORE",
      "status": "done",
      "title": "Split save-gated condition projection core"
    },
    {
      "number": 6,
      "id": "A6-SPELL-ATTACK-DAMAGE-CORE",
      "status": "done",
      "title": "Split spell attack damage projection core"
    },
    {
      "number": 7,
      "id": "A7-SCALAR-BUFF-CORE",
      "status": "done",
      "title": "Split scalar buff projection core"
    },
    {
      "number": 8,
      "id": "A8-DAMAGE-RIDER-CORE",
      "status": "done",
      "title": "Split damage rider projection core"
    },
    {
      "number": 9,
      "id": "A9-CHAINED-ATTACK-CORE",
      "status": "done",
      "title": "Split chained attack projection core"
    },
    {
      "number": 10,
      "id": "A10-INDEPENDENT-ATTACK-SEQUENCE-CORE",
      "status": "done",
      "title": "Split independent attack sequence core"
    },
    {
      "number": 11,
      "id": "A11-SPELL-TURN-HOOK-CORE",
      "status": "done",
      "title": "Split spell turn hook semantic core"
    },
    {
      "number": 12,
      "id": "A12-OBJECT-HP-DAMAGE-CORE",
      "status": "done",
      "title": "Split object hit point damage core"
    },
    {
      "number": 13,
      "id": "A13-SLEEP-LIFECYCLE-CORE",
      "status": "done",
      "title": "Split Sleep repeat-save lifecycle core"
    },
    {
      "number": 14,
      "id": "A14-QNT-OWNER-ROLE-REFRESH",
      "status": "blocked",
      "title": "Refresh owner roles for new semantic cores"
    },
    {
      "number": 15,
      "id": "A15-GENERATOR-SUBSET-TOKEN-AUDIT",
      "status": "blocked",
      "title": "Audit generator subset tokens for spell cores"
    },
    {
      "number": 16,
      "id": "A16-FIXTURE-BOUND-STATUS-CLOSURE",
      "status": "blocked",
      "title": "Close spell procedure fixture-bound readiness row"
    },
    {
      "number": 17,
      "id": "A17-CHECKER-REGRESSION-TEST",
      "status": "blocked",
      "title": "Add generator-readiness regression coverage"
    },
    {
      "number": 18,
      "id": "A18-END-TO-END-QNT-VERIFICATION",
      "status": "blocked",
      "title": "Run and document lane A verification"
    },
    {
      "number": 19,
      "id": "A19-RECURSIVE-NEXT-BATCH",
      "status": "blocked",
      "title": "Mine next QNT generator-readiness batch"
    },
    {
      "number": 20,
      "id": "A20-DIRECT-SPELL-DAMAGE-CORE",
      "status": "done",
      "title": "Split direct spell damage projection core"
    },
    {
      "number": 21,
      "id": "A21-DEFENSIVE-SPELL-EFFECT-CORE",
      "status": "done",
      "title": "Split defensive spell effect projection core"
    },
    {
      "number": 22,
      "id": "A22-READIED-SPELL-RESPONSE-CORE",
      "status": "ready-for-implementation-after-light-research",
      "title": "Split Readied Spell Response core"
    },
    {
      "number": 23,
      "id": "A23-ATTACK-BURST-SAVE-DAMAGE-CORE",
      "status": "ready-for-implementation-after-light-research",
      "title": "Split attack-burst save damage core"
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

## Boundaries

Lane A owns:

- `packages/shared-algebras/proofs/rule-core/*spell*.qnt`
- `plans/rules-kernel-coverage/generator-readiness.jsonl`
- `plans/rules-kernel-coverage/qnt-owner-roles.jsonl`
- `scripts/rules-kernel-coverage-*.cjs` only when the checker contract is wrong

Lane A must not:

- add or change Unit selected-identity policy;
- implement new battle reducer spell behavior;
- edit Level 1/2 support denominators except generated fallout from the checker.

## DAG / Queue Order

| # | Task | Status | Depends | Notes |
|---:|---|---|---|---|
| 1 | A1-SPELL-FIXTURE-BOUND-SURVEY - Survey spell procedure generator blockers | done | none | Established exact blocker list. |
| 2 | A2-INVOCATION-CARDINALITY-CORE - Extract invocation target cardinality core | done | none | Pure projection split. |
| 3 | A3-INVOCATION-ACTION-SLOT-CORE - Extract invocation action and slot mapping core | done | none | Preserved slot-expenditure atom. |
| 4 | A4-SAVE-DAMAGE-PROJECTION-CORE - Split save-gated damage projection core | done | none | Pure profile facts only. |
| 5 | A5-SAVE-CONDITION-PROJECTION-CORE - Split save-gated condition projection core | done | none | Pure profile facts only. |
| 6 | A6-SPELL-ATTACK-DAMAGE-CORE - Split spell attack damage projection core | done | none | Pure profile facts only. |
| 7 | A7-SCALAR-BUFF-CORE - Split scalar buff projection core | done | none | Pure profile facts only. |
| 8 | A8-DAMAGE-RIDER-CORE - Split damage rider projection core | done | none | Pure profile facts only. |
| 9 | A9-CHAINED-ATTACK-CORE - Split chained attack projection core | done | none | Pure profile facts only. |
| 10 | A10-INDEPENDENT-ATTACK-SEQUENCE-CORE - Split independent attack sequence core | done | none | Pure finite sequence facts. |
| 11 | A11-SPELL-TURN-HOOK-CORE - Split spell turn hook semantic core | done | none | Temporary HP, duration, once-per-turn facts. |
| 12 | A12-OBJECT-HP-DAMAGE-CORE - Split object hit point damage core | done | none | Keep object state minimal. |
| 13 | A13-SLEEP-LIFECYCLE-CORE - Split Sleep repeat-save lifecycle core | done | none | No table adjudication expansion. |
| 14 | A14-QNT-OWNER-ROLE-REFRESH - Refresh owner roles for new semantic cores | blocked | A2-A13,A20-A23 | Generated role closure. |
| 15 | A15-GENERATOR-SUBSET-TOKEN-AUDIT - Audit generator subset tokens for spell cores | blocked | A2-A13,A20-A23 | Ensure row vocabulary is exact. |
| 16 | A16-FIXTURE-BOUND-STATUS-CLOSURE - Close spell procedure fixture-bound readiness row | blocked | A14,A15 | Only if blockers are actually gone. |
| 17 | A17-CHECKER-REGRESSION-TEST - Add generator-readiness regression coverage | blocked | A16 | Prevent silent fallback to fixture-bound. |
| 18 | A18-END-TO-END-QNT-VERIFICATION - Run and document lane A verification | blocked | A17 | Coverage, examples, typecheck if touched. |
| 19 | A19-RECURSIVE-NEXT-BATCH - Mine next QNT generator-readiness batch | blocked | A18 | Must append >=12 tasks or prove exhaustion. |
| 20 | A20-DIRECT-SPELL-DAMAGE-CORE - Split direct spell damage projection core | done | none | Magic Missile fixture split. |
| 21 | A21-DEFENSIVE-SPELL-EFFECT-CORE - Split defensive spell effect projection core | done | none | Mage Armor fixture split. |
| 22 | A22-READIED-SPELL-RESPONSE-CORE - Split Readied Spell Response core | ready-for-implementation-after-light-research | none | Ready spell hold/release split. |
| 23 | A23-ATTACK-BURST-SAVE-DAMAGE-CORE - Split attack-burst save damage core | ready-for-implementation-after-light-research | none | Ice Knife fixture split. |

## Task Details

### Task 1 - A1-SPELL-FIXTURE-BOUND-SURVEY - Survey spell procedure generator blockers

Status: `done`

Input: `plans/rules-kernel-coverage/generator-readiness.jsonl`,
`packages/shared-algebras/proofs/rule-core/spell-procedure-profiles.qnt`, and
the spell-related proof/example files.

Output: a concise update to this plan's Findings section identifying each
remaining fixture-bound cause and which later task owns it. Do not mark the
generator row clean in this task.

Acceptance: `pnpm rules-kernel-coverage:check` passes and every listed blocker
has a concrete owning task in this lane.

### Task 2 - A2-INVOCATION-CARDINALITY-CORE - Extract invocation target cardinality core

Status: `done`

Output: move target-count/cardinality pure definitions out of
`spell-procedure-profiles.qnt` into a focused semantic-core file, preserving
names or adding clear forwarding functions where callers already exist.

Acceptance: spell procedure examples pass; coverage check passes.

### Task 3 - A3-INVOCATION-ACTION-SLOT-CORE - Extract invocation action and slot mapping core

Status: `done`

Output: isolate action-cost, slot-spend, one-slot-spell-per-turn, and access
admission mapping while continuing to use `spell-slot-expenditure.qnt` as the
single slot expenditure atom.

Acceptance: no duplicate slot ledger transition remains in spell profile code;
spell procedure examples and coverage check pass.

### Task 4 - A4-SAVE-DAMAGE-PROJECTION-CORE - Split save-gated damage projection core

Status: `done`

Output: pure semantic-core file for save-gated damage profile targeting,
damage type, success result, slot/concentration flags, and failed-save effects.

Acceptance: examples continue to cover Acid Splash, Sacred Flame, Fireball,
Lightning Bolt, Thunderwave, Dissonant Whispers, Hellish Rebuke, and Mind Spike.

### Task 5 - A5-SAVE-CONDITION-PROJECTION-CORE - Split save-gated condition projection core

Status: `done`

Output: pure semantic-core file for save-gated condition targeting, saving
throw ability, creature-type legality, save advantage, and failed-save effects.

Acceptance: examples cover Color Spray, Entangle, Animal Friendship,
Charm Person, Blindness/Deafness, Hold Person, and Faerie Fire.

### Task 6 - A6-SPELL-ATTACK-DAMAGE-CORE - Split spell attack damage projection core

Status: `done`

Output: pure semantic-core file for spell attack damage types, hit effects, and
object-target support.

Acceptance: examples cover Ray of Frost, Poison Spray, Chill Touch, Starry
Wisp, Fire Bolt, Shocking Grasp, Guiding Bolt, Ray of Sickness, and Produce
Flame.

### Task 7 - A7-SCALAR-BUFF-CORE - Split scalar buff projection core

Status: `done`

Output: pure semantic-core file for scalar buffs, maximum targets,
concentration, and temporary hit point formulas.

Acceptance: examples cover False Life, Longstrider, Shield of Faith, Spider
Climb, Fly, Barkskin, Heroism, and Aid.

### Task 8 - A8-DAMAGE-RIDER-CORE - Split damage rider projection core

Status: `done`

Output: pure semantic-core file for Divine Favor, Divine Smite, Hunter's Mark,
Ensnaring Strike, Searing Smite, and Shining Smite projection facts.

Acceptance: examples and coverage check pass.

### Task 9 - A9-CHAINED-ATTACK-CORE - Split chained attack projection core

Status: `done`

Output: pure semantic-core file for Chromatic Orb chained attack damage choices,
dice count, duplicate-face detection, and leap availability.

Acceptance: examples preserve duplicate and non-duplicate face cases.

### Task 10 - A10-INDEPENDENT-ATTACK-SEQUENCE-CORE - Split independent attack sequence core

Status: `done`

Output: pure semantic-core file for Eldritch Blast and Scorching Ray sequence
attack counts and step-state projection.

Acceptance: examples preserve needs-targets, needs-attack-roll,
needs-damage-roll, complete, and unavailable states.

### Task 11 - A11-SPELL-TURN-HOOK-CORE - Split spell turn hook semantic core

Status: `done`

Output: pure semantic-core file for turn-start temporary hit points, timed
effect duration decrement, and one-round Shield expiry facts.

Acceptance: examples and coverage check pass.

### Task 12 - A12-OBJECT-HP-DAMAGE-CORE - Split object hit point damage core

Status: `done`

Output: pure semantic-core file for object damage threshold and destruction
calculation.

Acceptance: destroyed and threshold-blocked examples remain executable.

### Task 13 - A13-SLEEP-LIFECYCLE-CORE - Split Sleep repeat-save lifecycle core

Status: `done`

Output: pure semantic-core file for automatic save success, initial pending
state, repeat save, unconscious state, and end-on-damage/shake facts.

Acceptance: examples and coverage check pass.

### Task 14 - A14-QNT-OWNER-ROLE-REFRESH - Refresh owner roles for new semantic cores

Status: `blocked`

Output: update `qnt-owner-roles.jsonl` for every new semantic-core owner and
remove stale role rows only when the path is no longer an owner.

Acceptance: `pnpm rules-kernel-coverage:check -- --write` then check pass.

### Task 15 - A15-GENERATOR-SUBSET-TOKEN-AUDIT - Audit generator subset tokens for spell cores

Status: `blocked`

Output: update the spell procedure generator-readiness row so
`generatorSubset` exactly matches the remaining semantic-core constructs. Add
token vocabulary only when a real construct is present and documented.

Acceptance: checker self-test and coverage check pass.

### Task 16 - A16-FIXTURE-BOUND-STATUS-CLOSURE - Close spell procedure fixture-bound readiness row

Status: `blocked`

Output: change `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` from
`fixture-bound` to `generation-subset-clean` only if fixture/example/proof
coupling is absent from every semantic-core path.

Acceptance: generated report shows no fixture-bound generator-readiness rows.

### Task 17 - A17-CHECKER-REGRESSION-TEST - Add generator-readiness regression coverage

Status: `blocked`

Output: add or extend self-test coverage so a semantic-core readiness row fails
when it contains proof/example files, fixture-world coupling, or omitted array
fields.

Acceptance: `pnpm rules-kernel-coverage:check:self-test` and normal check pass.

### Task 18 - A18-END-TO-END-QNT-VERIFICATION - Run and document lane A verification

Status: `blocked`

Output: run focused spell examples, rules-kernel coverage write/check,
`git diff --check`, and package typecheck if any TS checker code changed.

Acceptance: this plan records only durable findings, not a work log.

### Task 19 - A19-RECURSIVE-NEXT-BATCH - Mine next QNT generator-readiness batch

Status: `blocked`

Output: inspect `QNT_COVERAGE_PROGRAM.md`, `REPORT.md`,
`generator-readiness.jsonl`, and the remaining QCP tasks. Append at least 12
new atomic ready tasks to this plan if any QNT generator-readiness, checker
hardening, or slice-cleanliness work remains.

Acceptance: do not mark this task done unless either at least 12 new runnable
tasks were added to the Ralph index, DAG, and task details, or the plan records
a checker-backed proof that no such tasks remain.

### Task 20 - A20-DIRECT-SPELL-DAMAGE-CORE - Split direct spell damage projection core

Status: `done`

Output: pure semantic-core file for Magic Missile direct damage facts: dart
count, Force damage type, allocated dart bounds, per-dart damage bounds, and
slot-level legality, continuing to use `spell-damage-projection-core.qnt` as
the reusable direct-damage atom.

Acceptance: Magic Missile examples pass; no Magic Missile direct-damage
fixture facts remain in `spell-procedure-profiles.qnt`.

### Task 21 - A21-DEFENSIVE-SPELL-EFFECT-CORE - Split defensive spell effect projection core

Status: `done`

Output: pure semantic-core file for Mage Armor defensive effect facts:
willing-target admission, armor-wearing exclusion, Dexterity modifier bounds,
base Armor Class calculation, active effect projection, and ending the effect
when the target dons armor.

Acceptance: Mage Armor examples pass; no Mage Armor defensive-effect fixture
facts remain in `spell-procedure-profiles.qnt`.

### Task 22 - A22-READIED-SPELL-RESPONSE-CORE - Split Readied Spell Response core

Status: `ready-for-implementation-after-light-research`

Output: pure semantic-core file for Readied Spell Response hold/release facts:
action-time spell admission, resource expenditure at the hold boundary,
Concentration while held, dissipation on broken Concentration, reaction-window
offer, Reaction spend on release, held-effect clearing, and released-profile
projection.

Acceptance: Readied Spell Response examples pass; no Readied Spell Response
fixture facts remain in `spell-procedure-profiles.qnt`.

### Task 23 - A23-ATTACK-BURST-SAVE-DAMAGE-CORE - Split attack-burst save damage core

Status: `ready-for-implementation-after-light-research`

Output: pure semantic-core file for Ice Knife attack-burst save damage facts:
slot requirement, attack damage type, burst damage type, slot-scaled burst dice,
and successful-save burst damage policy.

Acceptance: Ice Knife examples pass; no Ice Knife attack-burst save-damage
fixture facts remain in `spell-procedure-profiles.qnt`.

## Verification

- `pnpm --filter @dnd/shared-algebras exec quint test proofs/rule-core/spell-procedure-profiles-examples.qnt`
- `pnpm rules-kernel-coverage:check -- --write`
- `pnpm rules-kernel-coverage:check`
- `pnpm rules-kernel-coverage:check:self-test` when checker code changes
- `pnpm typecheck` when TypeScript changes
- `git diff --check`

## Findings

- Previous recursive tasks failed because they could mark themselves done after
  adding too little follow-up work. This plan's recursive task has a minimum
  appended-task gate.
- Task 1 survey: `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` remains
  `fixture-bound` in `plans/rules-kernel-coverage/generator-readiness.jsonl`
  because the semantic core still includes
  `packages/shared-algebras/proofs/rule-core/spell-procedure-profiles.qnt`,
  whose executable facts are organized around closed SRD spell profile case
  tables. The checked blocker token is `fixture-world-coupled`; do not change
  this row to `generation-subset-clean` until the later split tasks remove the
  closed fixture-world coupling from every generator-input path.
- Remaining fixture-bound causes and owners:
  - Invocation target cardinality is still encoded as `SpellDefinitionProfile`
    branches in `spellInvocationTargetCardinality` and
    `legalSpellInvocationTargetCount`; A2 owns the target-cardinality core.
  - Invocation action cost, minimum slot level, slot spend, one-slot-spell
    admission, and access/target admission are still projected through
    spell-profile branches in `spellProfileAction`,
    `spellProfileMinimumSlotLevel`, `spellProfileSlotSpend`, and
    `spellInvocationResourceFacts`; A3 owns the action/slot/admission core.
  - Save-gated damage targeting, success policy, damage type,
    slot/concentration flags, failed-save effects, and Acid Splash
    save-damage effect resolution are still closed save-damage fixture facts;
    A4 owns the save-damage projection core.
  - Save-gated condition targeting, Saving Throw ability, max-target scaling,
    failed-save condition effects, creature-type legality, and hostile-target
    advantage are still one closed `SpellSaveGatedConditionProfile` table; A5
    owns the save-condition projection core.
  - Spell attack damage type, hit effects, object-target support, and Ray of
    Frost spell-attack effect resolution are still closed attack-damage
    fixture facts; A6 owns the spell attack damage core.
  - Scalar buff action timing, max-target scaling, temporary HP, effect
    projection, and Concentration flags are still one closed
    `ScalarBuffSpellProfile` table; A7 owns the scalar buff core.
  - Damage-rider action timing, Concentration flags, damage dice/types,
    duration, range, light, and save-advantage facts remain closed around the
    listed rider profiles; A8 owns the damage rider core.
  - Chained spell attack damage choices, d8 face-count validation, duplicate
    detection, and leap availability remain closed around the Chromatic Orb
    profile; A9 owns the chained attack core.
  - Independent attack sequence attack counts, object-target support, and
    needs-targets/attack-roll/damage-roll/complete state projection remain
    closed around Eldritch Blast and Scorching Ray profiles; A10 owns the
    independent attack sequence core.
  - Turn-start temporary HP, once-per-turn reset, one-round Shield expiry, and
    timed duration ticking remain colocated with spell procedure fixture
    profiles; A11 owns the spell turn-hook core.
  - Object damage threshold, effective damage, next HP, and destruction
    calculation remain colocated with spell procedure fixture profiles; A12
    owns the object HP damage core.
  - Sleep automatic save success, pending/unconscious lifecycle, and
    damage/shake-awake ending facts remain colocated with spell procedure
    fixture profiles; A13 owns the Sleep lifecycle core.
  - Magic Missile direct damage now lives in
    `spell-direct-damage-projection-core.qnt` over dart count, Force damage,
    allocated dart bounds, per-dart damage bounds, and slot-level legality;
    A20 is complete.
  - Mage Armor defensive-effect facts now live in
    `spell-defensive-effect-core.qnt` over willing-target admission,
    armor-wearing exclusion, Dexterity modifier bounds, base Armor Class
    calculation, active defensive Spell Effect projection, and ending the
    effect when the target dons armor; A21 is complete.
  - Readied Spell Response profile admission, held-effect projection,
    resource expenditure at the hold boundary, Concentration, reaction-window
    offer, Reaction spend, dissipation, and release projection remain closed
    Readied Spell fixture facts; A22 owns the Readied Spell Response core.
  - Ice Knife attack-burst save damage remains a closed attack-burst fixture
    over slot requirement, attack damage type, burst damage type, slot-scaled
    burst dice, and successful-save burst policy; A23 owns the attack-burst
    save damage core.
- Direct hit point restoration definitions in
  `spell-procedure-profiles.qnt` are co-owned by
  `BATTLE.SPELL.HIT_POINT_RESTORATION` rather than a remaining
  `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` generator-input blocker family
  for this lane. A16 must still verify that any residual hit-point restoration
  definitions are either outside the procedure readiness row's generator input
  or separately owned before closing the fixture-bound status.
- After A2-A13 and A20-A23 split the semantic cores, A14 must refresh
  `qnt-owner-roles.jsonl`, A15 must audit the generator-subset tokens against
  the new cores, and A16 is the first task allowed to change
  `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` out of `fixture-bound`. A17 should
  then add regression coverage so proof/example files, fixture-world coupling,
  or omitted readiness arrays cannot silently re-enter generator inputs.
