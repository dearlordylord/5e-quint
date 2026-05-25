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
      "status": "done",
      "title": "Close unit-feature run-block scanner findings"
    },
    {
      "number": 16,
      "id": "A62-UNIT-FEATURE-EXAMPLE-FILE-ROLE-CLOSURE",
      "status": "done",
      "title": "Classify unit-feature example files as proof-only"
    },
    {
      "number": 17,
      "id": "A63-UNIT-FEATURE-SELECTED-IDENTITY-CHECK",
      "status": "done",
      "title": "Check selected-identity fallout from feature splits"
    },
    {
      "number": 18,
      "id": "A64-UNIT-FEATURE-END-TO-END-VERIFY",
      "status": "done",
      "title": "Verify unit-feature QNT core closure"
    },
    {
      "number": 19,
      "id": "A65-UNIT-FEATURE-STRICT-DENOMINATOR-AUDIT",
      "status": "done",
      "title": "Audit strict level 1-2 denominator fallout"
    },
    {
      "number": 20,
      "id": "A66-UNIT-FEATURE-RULES-KERNEL-REPORT-CLOSURE",
      "status": "done",
      "title": "Refresh rules-kernel reports after unit-feature closure"
    },
    {
      "number": 21,
      "id": "A67-RECURSIVE-NEXT-BATCH",
      "status": "done",
      "title": "Mine next unit-feature QNT generator batch"
    },
    {
      "number": 22,
      "id": "A68-METAMAGIC-OPTION-FACT-CORE",
      "status": "done",
      "title": "Split Metamagic option fact and cost core"
    },
    {
      "number": 23,
      "id": "A69-METAMAGIC-STACKING-ADMISSION-CORE",
      "status": "done",
      "title": "Split Metamagic known option and stacking admission core"
    },
    {
      "number": 24,
      "id": "A70-QUICKENED-PROCEDURE-SUPPORT-CORE",
      "status": "done",
      "title": "Split Quickened action spell procedure support core"
    },
    {
      "number": 25,
      "id": "A71-QUICKENED-RESTORATION-CORE",
      "status": "deferred",
      "title": "Split Quickened direct restoration execution core"
    },
    {
      "number": 26,
      "id": "A72-QUICKENED-SCALAR-BUFF-CORE",
      "status": "deferred",
      "title": "Split Quickened scalar buff execution core"
    },
    {
      "number": 27,
      "id": "A73-QUICKENED-SAME-TURN-LEDGER-CORE",
      "status": "deferred",
      "title": "Split Quickened same-turn level-1-plus spell ledger core"
    },
    {
      "number": 28,
      "id": "A74-SAVE-METAMAGIC-ADMISSION-CORE",
      "status": "deferred",
      "title": "Split save-affecting Metamagic admission core"
    },
    {
      "number": 29,
      "id": "A75-CAREFUL-SPELL-TARGET-CORE",
      "status": "deferred",
      "title": "Split Careful Spell protected-target core"
    },
    {
      "number": 30,
      "id": "A76-HEIGHTENED-SPELL-ROLL-MODE-CORE",
      "status": "deferred",
      "title": "Split Heightened Spell save roll-mode core"
    },
    {
      "number": 31,
      "id": "A77-METAMAGIC-RUN-BLOCK-EXAMPLES-SPLIT",
      "status": "deferred",
      "title": "Move Metamagic run blocks into proof-only examples"
    },
    {
      "number": 32,
      "id": "A78-METAMAGIC-GENERATOR-READINESS-ROW",
      "status": "deferred",
      "title": "Refresh Metamagic generator-readiness row after splits"
    },
    {
      "number": 33,
      "id": "A79-METAMAGIC-GENERATOR-CLOSURE-VERIFY",
      "status": "deferred",
      "title": "Verify Metamagic generator closure"
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
are closed as proof-only readiness-row evidence by Task 16.

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

Status: `done`

Output: scanner findings for unit-feature semantic-core owners are zero or have
live follow-up tasks.

Acceptance: checker green.

### Task 16 - A62-UNIT-FEATURE-EXAMPLE-FILE-ROLE-CLOSURE - Classify unit-feature example files as proof-only

Status: `done`

Output: example/inductive files are proof-only and not generator input.

Acceptance: checker green.

Closed by checker evidence: the current generator-readiness rows classify the
unit-feature example and inductive files in `proofOnly`, while
`qnt-owner-roles.jsonl` remains limited to covered obligation QNT owners.

### Task 17 - A63-UNIT-FEATURE-SELECTED-IDENTITY-CHECK - Check selected-identity fallout from feature splits

Status: `done`

Output: selected-identity metrics remain green after unit-feature ownership
changes, or gaps are assigned to Lane C.

Acceptance: unit-profile check green.

Closed by checker evidence: selected-identity replay coverage remains
`144/144`, selected-identity replay gaps are zero, and all 37 supported
`unit-feature.` Units carry `selected-identity-mbt` evidence. No Lane C
selected-identity gap assignment is required for the current unit-feature split
fallout.

### Task 18 - A64-UNIT-FEATURE-END-TO-END-VERIFY - Verify unit-feature QNT core closure

Status: `done`

Output: focused verification for the unit-feature closure set.

Acceptance: checker green; focused QNT tests green; no stale generated files.

Closed by checker and focused QNT evidence: rules-kernel coverage and
unit-profile coverage checks are green, checker write passes produce no tracked
diff, unit-feature semantic-core typechecks are green, focused unit-feature QNT
examples plus Monk Focus tests are green, and no generated artifact staleness
remains in the unit-feature closure set.

### Task 19 - A65-UNIT-FEATURE-STRICT-DENOMINATOR-AUDIT - Audit strict level 1-2 denominator fallout

Status: `done`

Output: level 1 and level 1-2 strict support gates remain green after ownership
changes.

Acceptance: `pnpm unit-profile-coverage:check` green.

Closed by checker evidence in
`plans/unit-profile-coverage/A65_UNIT_FEATURE_STRICT_DENOMINATOR_AUDIT.md`:
level 1 and level 1-2 full-support claim gates remain `pass`, strict target
open counts remain zero, selected-identity blocker counts remain zero, and no
additional strict-denominator follow-up is required for the unit-feature split
fallout. Task 20 still owns the broader rules-kernel report refresh.

### Task 20 - A66-UNIT-FEATURE-RULES-KERNEL-REPORT-CLOSURE - Refresh rules-kernel reports after unit-feature closure

Status: `done`

Output: generated rules-kernel reports reflect the new unit-feature core shape.

Acceptance: generated reports have no stale broad-owner claims for unit-feature
rows.

Closed by checker-owned report projection: the broad
`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS` obligation now points readers to
unit-feature profile-scoped owner rows, and QNT owner-role reporting renders
unit-feature evidence by profile instead of as stale broad-owner claims.

### Task 21 - A67-RECURSIVE-NEXT-BATCH - Mine next unit-feature QNT generator batch

Status: `done`

Input: current checker-owned artifacts after A66.

Output: append at least 12 new atomic runnable tasks or prove from
`generator-readiness.jsonl`, `profile-obligations.jsonl`, and
`qnt-owner-roles.jsonl` that no unit-feature QNT generator work remains.

Acceptance: plan has new runnable tasks or a concise durable closure note.

Closed by checker-owned artifacts after A66: the broad
`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS` row is `generation-subset-clean`,
but `profile-obligations.jsonl` still maps
`unit-feature.metamagic-cast-governor-quickened` to
`BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR`. That obligation is covered,
`qnt-owner-roles.jsonl` classifies
`packages/battle-runtime/battle-runtime-metamagic.qnt` as `semantic-core`, and
the generated semantic-core run-block report finds the remaining generator
blocker there. The durable next batch is therefore A68-A79 below, all scoped to
splitting the Metamagic semantic core and proof-only run blocks without changing
selected-identity policy or adding new battle reducer behavior outside the
existing covered obligation.

### Task 22 - A68-METAMAGIC-OPTION-FACT-CORE - Split Metamagic option fact and cost core

Status: `done`

Depends on: A67

Input: `BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR`,
`packages/battle-runtime/battle-runtime-metamagic.qnt`, Sorcerer Metamagic RAW,
and `UBIQUITOUS_LANGUAGE.md` Pool/Spend terms.

Output: focused QNT semantic core for typed Metamagic option facts, Sorcery
Point cost projection, and supported option effect kinds, with examples kept
outside the semantic-core owner.

Acceptance: focused QNT check green; `pnpm rules-kernel-coverage:check` remains
green.

Closed by the split Metamagic option fact core and refreshed
rules-kernel coverage owner artifacts.

### Task 23 - A69-METAMAGIC-STACKING-ADMISSION-CORE - Split Metamagic known option and stacking admission core

Status: `done`

Depends on: A68

Input: selected known-option, affordability, and one-option-per-spell predicates
from `battle-runtime-metamagic.qnt`.

Output: focused QNT semantic core for known-option membership, total selected
Sorcery Point cost, one-option-per-spell default, and explicit stacking
exceptions, without authored option identity dispatch.

Acceptance: focused QNT examples cover known, unknown, affordable,
unaffordable, stackable, and non-stackable selections; checker green.

### Task 24 - A70-QUICKENED-PROCEDURE-SUPPORT-CORE - Split Quickened action spell procedure support core

Status: `done`

Depends on: A69

Input: `BattleRuntimeQuickenedActionSpellProcedure` and
`quickenedActionSpellProcedureSupportsBonusActionRewrite`.

Output: focused QNT semantic core for which supported action-casting Spell
Invocation procedure classes admit Quickened's Bonus Action rewrite in the
current profile subset, preserving deferred all-action-spell expansion tasks.

Acceptance: examples cover admitted direct restoration and scalar buff
procedures plus currently closed damage, control, ongoing-effect, and other
procedure classes; checker green.

### Task 25 - A71-QUICKENED-RESTORATION-CORE - Split Quickened direct restoration execution core

Status: `deferred`

Depends on: A70

Input: `resolveQuickenedDirectHitPointRestoration` and the direct Hit Point
restoration action-cost predicates.

Output: focused QNT semantic core for Quickened direct restoration resolution:
Bonus Action spend, Spell Slot spend, Sorcery Point spend, target healing, and
rejection without state change when admission fails.

Acceptance: focused QNT examples cover successful Cure Wounds-style resolution,
Healing Word-style non-action rejection, invalid target count, insufficient
Sorcery Points, and state preservation on rejection; checker green.

### Task 26 - A72-QUICKENED-SCALAR-BUFF-CORE - Split Quickened scalar buff execution core

Status: `deferred`

Depends on: A70

Input: `resolveQuickenedScalarBuffSpell` and scalar buff action-cost predicates.

Output: focused QNT semantic core for Quickened scalar buff resolution: Bonus
Action spend, Spell Slot spend, Sorcery Point spend, resolved buff projection,
and rejection without state change when admission fails.

Acceptance: focused QNT examples cover successful False Life-style resolution,
Bonus Action spell rejection, failed target/willingness resolution, and state
preservation on rejection; checker green.

### Task 27 - A73-QUICKENED-SAME-TURN-LEDGER-CORE - Split Quickened same-turn level-1-plus spell ledger core

Status: `deferred`

Depends on: A71, A72

Input: Quickened level-1-plus spell cast turn facts in
`battle-runtime-metamagic.qnt` and `battle-runtime-turn-order.qnt`.

Output: focused QNT semantic core or existing-core reuse for the same-turn
level-1-plus spell prohibition, including slot and free-cast witnesses, with no
duplicate Spell Slot state.

Acceptance: focused QNT examples cover prior slot spell, prior free level-1-plus
spell, Quickened spell commit, and same-turn post-Quickened cast blocking;
checker green.

### Task 28 - A74-SAVE-METAMAGIC-ADMISSION-CORE - Split save-affecting Metamagic admission core

Status: `deferred`

Depends on: A69

Input: `BattleRuntimeSaveMetamagicProcedure`,
`saveMetamagicCanModifySaveSpell`, and Sorcerer Careful/Heightened RAW.

Output: focused QNT semantic core for Careful and Heightened admission against
supported save-gated procedures, including known-option, stacking, cost, and
Sleep/non-save closure predicates.

Acceptance: examples cover supported save-for-half and non-damage save
procedures, Sleep target admission rejection, non-save rejection, unknown
selection, unaffordable selection, and unsupported stacking; checker green.

### Task 29 - A75-CAREFUL-SPELL-TARGET-CORE - Split Careful Spell protected-target core

Status: `deferred`

Depends on: A74

Input: `carefulSpellMaxProtectedTargets`,
`carefulSpellProtectedTargetSelectionValid`, and
`carefulSpellSuppressesSuccessfulHalfDamage`.

Output: focused QNT semantic core for Charisma-modifier-limited protected target
selection, automatic save success boundary facts, and successful-save half-damage
suppression.

Acceptance: examples cover minimum one protected target, Charisma modifier
limit, target membership, non-empty selection, half-damage suppression, and
no-damage-on-success non-suppression; checker green.

### Task 30 - A76-HEIGHTENED-SPELL-ROLL-MODE-CORE - Split Heightened Spell save roll-mode core

Status: `deferred`

Depends on: A74

Input: `heightenedSpellTargetSelectionValid`,
`savingThrowRollModeWithHeightenedSpell`, and
`combineSavingThrowRollModes`.

Output: focused QNT semantic core for one-target Heightened selection and
Saving Throw roll-mode projection, using existing Advantage/Disadvantage
combination semantics.

Acceptance: examples cover selected target Disadvantage, unselected target
unchanged mode, invalid target rejection, existing Advantage cancellation, and
duplicate Disadvantage idempotence; checker green.

### Task 31 - A77-METAMAGIC-RUN-BLOCK-EXAMPLES-SPLIT - Move Metamagic run blocks into proof-only examples

Status: `deferred`

Depends on: A68-A76

Input: the eight current `run` blocks in
`packages/battle-runtime/battle-runtime-metamagic.qnt`.

Output: semantic-core Metamagic QNT files contain no `run` blocks or `assert`
forms; proof-only examples preserve the behavioral checks without becoming
generator input.

Acceptance: generated semantic-core run-block findings no longer list
`BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR`; focused QNT examples green;
checker green.

### Task 32 - A78-METAMAGIC-GENERATOR-READINESS-ROW - Refresh Metamagic generator-readiness row after splits

Status: `deferred`

Depends on: A77

Input: refreshed Metamagic semantic-core owners, proof-only example owners,
`generator-readiness.jsonl`, and `qnt-owner-roles.jsonl`.

Output: `BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR` readiness row
records the split semantic cores, proof-only examples, observed
`generatorSubset`, and no stale A67 blocker.

Acceptance: `pnpm rules-kernel-coverage:check -- --write` produces stable
reports; `pnpm rules-kernel-coverage:check` green.

### Task 33 - A79-METAMAGIC-GENERATOR-CLOSURE-VERIFY - Verify Metamagic generator closure

Status: `deferred`

Depends on: A78

Input: A68-A78 outputs and generated rules-kernel reports.

Output: durable closure note confirming no unit-feature generator-readiness
backlog rows or run-block findings remain for covered `BATTLE.FEATURE.*`
obligations owned by Lane A.

Acceptance: `pnpm rules-kernel-coverage:check`; `pnpm unit-profile-coverage:check`;
focused Metamagic QNT checks; `git diff --check`; reviewer loop convergence
with RAW, ubiquitous-language/domain, architecture/connascence, and code-review
passes.
