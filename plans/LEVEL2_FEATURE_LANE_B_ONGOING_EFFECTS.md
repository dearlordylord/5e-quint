# Level 2 Feature Lane B - Ongoing Spell Effects And Linked Runtime Lifecycles

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L12G-FOLLOWUP-GENERIC-ONGOING-SPELL-EFFECT-DISPEL",
      "status": "done",
      "title": "Generic Ongoing Spell Effect Dispel Runtime"
    },
    {
      "number": 2,
      "id": "L12G-FOLLOWUP-ANTIMAGIC-FIELD-GENERIC-SUPPRESSION",
      "status": "done",
      "title": "Antimagic Field Generic Suppression Runtime"
    },
    {
      "number": 3,
      "id": "L12G-FOLLOWUP-PRAYER-OF-HEALING-SURFACE-REST",
      "status": "done",
      "title": "Prayer Of Healing Surface Rest Shape"
    },
    {
      "number": 4,
      "id": "L12G-FOLLOWUP-PRAYER-OF-HEALING-CHARACTER-SHEET-REST",
      "status": "done",
      "title": "Prayer Of Healing Character Sheet Rest Runtime"
    },
    {
      "number": 5,
      "id": "L12G-FOLLOWUP-RAY-OF-ENFEEBLEMENT-D20-LIFECYCLE",
      "status": "done",
      "title": "Ray Of Enfeeblement D20 Lifecycle Runtime"
    },
    {
      "number": 6,
      "id": "L12G-FOLLOWUP-RAY-OF-ENFEEBLEMENT-DAMAGE-PENALTY",
      "status": "done",
      "title": "Ray Of Enfeeblement Damage Roll Penalty Runtime"
    },
    {
      "number": 7,
      "id": "L12G-FOLLOWUP-SPIRITUAL-WEAPON-SURFACE-PROXY-SHAPE",
      "status": "done",
      "title": "Spiritual Weapon Proxy Surface Shape"
    },
    {
      "number": 8,
      "id": "L12G-FOLLOWUP-SPIRITUAL-WEAPON-PERSISTENT-ATTACK-RUNTIME",
      "status": "done",
      "title": "Spiritual Weapon Persistent Attack Runtime"
    },
    {
      "number": 9,
      "id": "L12G-FOLLOWUP-ENLARGE-REDUCE-CREATURE-RUNTIME",
      "status": "done",
      "title": "Enlarge Reduce Creature Runtime Support"
    },
    {
      "number": 10,
      "id": "L12G-FOLLOWUP-ENTHRALL-PERCEPTION-RUNTIME",
      "status": "done",
      "title": "Enthrall Perception Penalty Runtime Support"
    },
    {
      "number": 11,
      "id": "L12G-FOLLOWUP-BROADER-ONGOING-SPELL-EFFECT-DISPEL",
      "status": "done",
      "title": "Broader Ongoing Spell Effect Dispel Runtime"
    },
    {
      "number": 12,
      "id": "L12G-FOLLOWUP-ANTIMAGIC-FIELD-PREVENTION-AND-BROADER-SUPPRESSION",
      "status": "done",
      "title": "Antimagic Field Prevention And Broader Suppression Runtime"
    },
    {
      "number": 13,
      "id": "L12G-RECURSIVE-TAIL-LANE-B",
      "status": "blocked",
      "title": "Lane B Recursive Planning Tail"
    },
    {
      "number": 14,
      "id": "L12G-FOLLOWUP-ENLARGE-REDUCE-OBJECT-RUNTIME",
      "status": "done",
      "title": "Enlarge Reduce Object Runtime Support"
    },
    {
      "number": 21,
      "id": "L12G-FOLLOWUP-CONTINUAL-FLAME-DISPEL-REMOVAL",
      "status": "done",
      "title": "Continual Flame Dispel And Suppression Removal"
    },
    {
      "number": 22,
      "id": "L12G-FOLLOWUP-ACID-ARROW-RAW-CORPUS-RECONCILIATION",
      "status": "blocked",
      "title": "Acid Arrow RAW Corpus Reconciliation"
    },
    {
      "number": 23,
      "id": "L12G-FOLLOWUP-ACID-ARROW-SURFACE-DAMAGE-SHAPE",
      "status": "blocked",
      "title": "Acid Arrow Surface Damage Shape"
    },
    {
      "number": 24,
      "id": "L12G-FOLLOWUP-ACID-ARROW-DELAYED-RUNTIME-SUPPORT",
      "status": "blocked",
      "title": "Acid Arrow Delayed Runtime Support"
    },
    {
      "number": 25,
      "id": "L3-SPELL-FIREBALL-RUNTIME-SURVEY",
      "status": "deferred",
      "title": "Level 3 Fireball Runtime Survey And Task Split"
    },
    {
      "number": 26,
      "id": "L3-SPELL-MASS-HEALING-WORD-RUNTIME-SURVEY",
      "status": "deferred",
      "title": "Level 3 Mass Healing Word Runtime Survey And Task Split"
    },
    {
      "number": 27,
      "id": "L3-SPELL-VAMPIRIC-TOUCH-RUNTIME-SURVEY",
      "status": "deferred",
      "title": "Level 3 Vampiric Touch Runtime Survey And Task Split"
    }
  ]
}
-->

This is an active Ralph execution plan for level-2 feature/runtime coverage. It replaces stale Loop B continuation work; do not merge or replay old B worktree commits.


Planning policy update, 2026-05-22: until the owner explicitly reopens level-3 expansion, recursive tails and deciders must add only level-1/level-2 closure tasks. Park not-yet-started level-3 tasks as `deferred` instead of expanding this lane with more level-3 work.

Every Ralph prompt for this lane must include:

> Before starting, run `git log --oneline -1 master` and verify your HEAD matches. If not, run `git rebase master`.

Ralph must run the implementer, reviewer, handback, and decider loop until `accept`. The reviewer loop must include RAW traceability, ubiquitous-language/domain-language, architecture/connascence, and code-review passes. Fix every reasonable finding, explicitly reject only findings with a concrete reason, and repeat until no reasonable findings remain.

Do not redo completed Darkness spell-created-light overlap or Antimagic tracked-light suppression. Those landed on `master` in `f57b1594`.

## Verification

Every task must include:

- RAW/ubiquitous-language check before implementation, using `.references/srd-5.2.1/` and `UBIQUITOUS_LANGUAGE.md`.
- Focused runtime and/or Surface tests for the changed behavior.
- Promoted `packages/battle-runtime/battle-runtime.qnt` parity where battle behavior changes.
- `pnpm unit-profile-coverage:check -- --write`, then `pnpm unit-profile-coverage:check`.
- Relevant package typechecks and focused tests.
- Reviewer-loop convergence.

## Tasks

### Task 1 - L12G-FOLLOWUP-GENERIC-ONGOING-SPELL-EFFECT-DISPEL - Generic Ongoing Spell Effect Dispel Runtime

Status: `done`

Input:
- Current Dispel Magic tracked spell-light ending support.
- Existing active-effect lifecycle model.

Output:
- Promote Dispel Magic beyond tracked light emitters only where a generic ongoing Spell Effect occurrence can be represented without duplicating state.
- Preserve spell-specific dispel exceptions as explicit follow-ups or typed closures.

### Task 2 - L12G-FOLLOWUP-ANTIMAGIC-FIELD-GENERIC-SUPPRESSION - Antimagic Field Generic Suppression Runtime

Status: `done`

Input:
- Current Antimagic Field tracked-light suppression subset on `master`.
- SRD Antimagic Field prevention/suppression clauses.

Output:
- Promoted a safe tracked ongoing Spell Effect suppression subset: tracked spell-created light emitters and tracked `spellObjectContactDamage` active-effect occurrences are suppressed without deleting their occurrences, and suppressed duration keeps ticking.
- Artifact/deity spell-effect sources remain excluded from suppression.
- Spellcasting prevention, Magic Action prevention, magical targeting, magic item suppression, magical area clipping, teleport/planar travel blocking, portal closure, aura Dispel Magic immunity, and broader ongoing Spell Effect suppression remain in Task B12.

### Task 3 - L12G-FOLLOWUP-PRAYER-OF-HEALING-SURFACE-REST - Prayer Of Healing Surface Rest Shape

Status: `done`

Input:
- Current Prayer of Healing Surface content and SRD text.

Output:
- Surface shape for 10-minute casting, up-to-five recipients, slot-scaled healing, Short Rest benefit, and per-recipient Long Rest lockout.
- No runtime claim until the character-sheet rest owner consumes the shape.

### Task 4 - L12G-FOLLOWUP-PRAYER-OF-HEALING-CHARACTER-SHEET-REST - Prayer Of Healing Character Sheet Rest Runtime

Status: `done`

Depends on:
- Task B3.

Output:
- Character Sheet rest-benefit application, healing, Spell Slot spend timing, and recipient Long Rest lockout.
- Automatic range tracking and interruption remain caller/table facts.

### Task 5 - L12G-FOLLOWUP-RAY-OF-ENFEEBLEMENT-D20-LIFECYCLE - Ray Of Enfeeblement D20 Lifecycle Runtime

Status: `done`

Input:
- Existing save-gated condition/effect lifecycle and roll-mode projections.

Output:
- Cast/save/lifecycle profile subset: success-side next attack Disadvantage, failed-save Strength D20 Test Disadvantage, end-turn repeat saves, Concentration cleanup.
- Damage-roll subtraction remains separate.

### Task 6 - L12G-FOLLOWUP-RAY-OF-ENFEEBLEMENT-DAMAGE-PENALTY - Ray Of Enfeeblement Damage Roll Penalty Runtime

Status: `done`

Depends on:
- Task B5.

Output:
- Generic damage-roll subtraction owner for Ray of Enfeeblement's failed-save effect.
- It must compose with target-side Resistance/reductions and Concentration saves without duplicated damage state.

### Task 7 - L12G-FOLLOWUP-SPIRITUAL-WEAPON-SURFACE-PROXY-SHAPE - Spiritual Weapon Proxy Surface Shape

Status: `done`

Input:
- Current Spiritual Weapon Surface content and SRD text.

Output:
- Surface shape for spell-owned spectral force placement, immediate attack, later Bonus Action movement plus repeat attack, Concentration, and slot scaling.
- Do not model it as a creature companion or ordinary object.

### Task 8 - L12G-FOLLOWUP-SPIRITUAL-WEAPON-PERSISTENT-ATTACK-RUNTIME - Spiritual Weapon Persistent Attack Runtime

Status: `done`

Depends on:
- Task B7.

Output:
- Runtime profile subset for proxy placement, immediate melee spell attack, later Bonus Action movement/repeat attack, slot scaling, and cleanup.
- Automatic geometry and adjacency remain table-supplied facts.

### Task 9 - L12G-FOLLOWUP-ENLARGE-REDUCE-CREATURE-RUNTIME - Enlarge Reduce Creature Runtime Support

Status: `done`

Input:
- Existing size, weapon damage, Strength check/save, and concentration effect projections.
- SRD Enlarge/Reduce text.

Output:
- Creature-target profile subset for size change, Strength D20 roll mode, weapon damage adjustment, save gate, and cleanup.
- Object branch stays separate unless it remains atomic after research.

### Task 10 - L12G-FOLLOWUP-ENTHRALL-PERCEPTION-RUNTIME - Enthrall Perception Penalty Runtime Support

Status: `done`

Input:
- Existing roll-mode profile readers and observer/target table facts.
- SRD Enthrall text.

Output:
- Supported profile or closure for the Perception check penalty subset.
- Avoid storing conversation or attention state outside executable roll-mode needs.

### Task 11 - L12G-FOLLOWUP-BROADER-ONGOING-SPELL-EFFECT-DISPEL - Broader Ongoing Spell Effect Dispel Runtime

Status: `done`

Input:
- Task 1 Dispel Magic support for tracked spell-light emitters and tracked `spellObjectContactDamage` active-effect occurrences.
- Existing active-effect, area-effect, and concentration lifecycle models.

Output:
- Promoted Dispel Magic for tracked `spiritualWeapon` active-effect occurrences as stable magical-effect targets with source spell level, occurrence identity, source target association through the hosted active effect, concentration cleanup, and the existing higher-level spellcasting ability check gate.
- Preserved Antimagic Field's narrower suppression boundary by keeping `spiritualWeapon` out of the Antimagic suppressible occurrence type until Task 12 researches broader suppression.
- Remaining broader Dispel Magic frontiers, including other creature active effects, area effects, object effects, and spell-specific exceptions or immunities, stay visible through Task 13's recursive planning tail rather than being identity-dispatched here.

### Task 12 - L12G-FOLLOWUP-ANTIMAGIC-FIELD-PREVENTION-AND-BROADER-SUPPRESSION - Antimagic Field Prevention And Broader Suppression Runtime

Status: `done`

Input:
- Task 2 Antimagic Field support for tracked spell-light emitters and tracked `spellObjectContactDamage` active-effect occurrences.
- Existing active-effect, area-effect, spellcasting, targeting, item, teleportation, and portal ownership boundaries.
- SRD Antimagic Field prevention/suppression clauses.

Output:
- Promoted Antimagic Field suppression for tracked `spiritualWeapon` active-effect occurrences alongside the existing tracked spell-light and `spellObjectContactDamage` occurrences.
- Suppressed tracked Spiritual Weapon occurrences keep ticking, are not deleted while suppressed, and previously discovered repeat-attack subjects reject as stale while the occurrence is suppressed.
- Spellcasting prevention, Magic Action prevention, Emanation origin-inclusion choice for the caster, other-creature aura membership, magical targeting prevention, magic item suppression, magical area clipping, teleportation/planar travel blocking, portal closure, and Dispel Magic immunity on the aura are closed from this runtime-promotion task because the promoted battle runtime does not yet own explicit origin-inclusion, aura-membership, item, portal, planar-travel, or magical-target witness facts.
- Remaining not-yet-tracked ongoing Spell Effect suppression beyond tracked spell-light emitters, tracked `spellObjectContactDamage` active-effect occurrences, and tracked `spiritualWeapon` active-effect occurrences stays visible through Task 13's recursive planning tail.

### Task 13 - L12G-RECURSIVE-TAIL-LANE-B - Lane B Recursive Planning Tail

Status: `blocked`

Unblock only after all ready Lane B tasks are done or explicitly closed.

Output:
- Refresh level-2 ongoing-effect metrics.
- Add the next concrete, Ralph-sized Lane B tasks only if real frontier remains.
- Split or close remaining Dispel Magic ongoing Spell Effect frontiers from Task 11's residual set: other creature active effects, area effects, object effects, and spell-specific exceptions or immunities.
- Split or close remaining Antimagic Field frontiers from Task 12's residual set: not-yet-tracked ongoing Spell Effect suppression plus any future prevention task that first introduces explicit origin-inclusion, aura-membership, item, portal, planar-travel, or magical-target witness ownership.

### Task 14 - L12G-FOLLOWUP-ENLARGE-REDUCE-OBJECT-RUNTIME - Enlarge Reduce Object Runtime Support

Status: `done`

Completed: pruned on 2026-05-22 because Lane A already closed the Enlarge/Reduce object branch as an accepted runtime-detached object/item lifecycle boundary; rerunning object runtime support here would duplicate a closed frontier.

Depends on:
- Task 9 creature-target Enlarge/Reduce runtime support.

Input:
- Existing Enlarge/Reduce creature-target runtime support and Surface target shape.
- SRD Enlarge/Reduce object branch text.
- Current object, item, attack-damage, Concentration, and active-effect lifecycle owners.

Output:
- Research and either promote or split the object-target branch: visible non-worn/non-carried object targeting, object Size-category lifecycle and cleanup, carried or worn item size changes while a creature branch is active, dropped-item normalization, and thrown weapon or ammunition normalization immediately after hit or miss.
- Do not rework the Task 9 creature-target profile unless object support exposes a shared owner that must change to avoid duplicated state.

### Task 21 - L12G-FOLLOWUP-CONTINUAL-FLAME-DISPEL-REMOVAL - Continual Flame Dispel And Suppression Removal

Status: `done`

Unit: `continual_flame`. Follow-up split from Task 28.

Dependency: Task 28 (`L12G-SPELL-CONTINUAL-FLAME`) done.

Inputs:

- `packages/surface/content/continual_flame.json`;
- the `continual_flame` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Spells/Descriptions-A-D.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- promoted battle-runtime light emitter lifecycle, spell-effect removal or suppression owners, Unit profile evidence, and focused tests for until-dispelled object light cleanup.

Outputs:

- supported runtime profile and owner evidence for removing or suppressing object-attached until-dispelled spell occurrences through a generic spell-effect removal or suppression owner;
- Continual Flame object emitters are consumed through the generic owner rather than a Continual Flame-specific removal registry;
- Dispel Magic, antimagic, or the selected suppression/removal procedure remains the owner of the triggering removal semantics;
- Quint/runtime parity updates if promoted battle-runtime behavior changes;
- regenerated coverage artifacts.

Acceptance:

- Continual Flame cleanup through the generic until-dispelled spell-effect removal or suppression owner is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no presentation-only flame appearance, heat/fuel, covering/hiding, smothering, quenching, or costly Material component inventory behavior is implemented in this task;
- runtime behavior traces to SRD Continual Flame and the selected removal or suppression RAW without homebrew extensions and consumes existing until-dispelled spell-effect markers instead of duplicating emitter ownership;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, package-local promoted MBT if runtime behavior changes, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: D; observed-statuses: ready-for-research -->

## Level 2 Completion And Level 3 Kickoff Refill

### Task 22 - L12G-FOLLOWUP-ACID-ARROW-RAW-CORPUS-RECONCILIATION - Acid Arrow RAW Corpus Reconciliation

Status: `blocked`

Blocked Detail: Owner decision required. The local SRD 5.2.1 Acid Arrow passage states only 4d4 Acid damage at the end of the target's next turn on a hit, but also refers to "initial" and "later" damage in the miss and higher-level clauses. The owner must approve a local corpus correction or `ASSUMPTIONS.md` entry that defines whether initial hit damage exists, its timing and base amount, the end-of-next-turn hit damage amount, miss damage derivation, and higher-level scaling.

Input:

- Local RAW under `.references/srd-5.2.1/`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Surface content, Unit/profile claims, owner evidence, and focused tests.

Output:

- Resolve the local SRD Acid Arrow damage-timing contradiction by producing an owner-ready ASSUMPTIONS/corpus decision patch or by marking the task blocked with exact missing owner input.
- Updated plan/profile/evidence/report artifacts only when they are the correct owner.
- Focused verification, `git diff --check`, and reviewer-loop convergence.
- Current blocker detail is recorded in `plans/unit-profile-coverage/ACID_ARROW_RAW_CORPUS_RECONCILIATION.md`.

Acceptance:

- The task lands as supported, accepted-closed/runtime-detached, or a smaller precise follow-up split.
- No companion AI/autonomous-control behavior is introduced.
- No authored identity dispatch is introduced in runtime code.

### Task 23 - L12G-FOLLOWUP-ACID-ARROW-SURFACE-DAMAGE-SHAPE - Acid Arrow Surface Damage Shape

Status: `blocked`

Depends on:
- Task B22.

Blocked Detail: Task B22 must first supply the owner-approved Acid Arrow damage relationship. Surface authoring cannot honestly encode immediate, miss, delayed, or slot-scaled damage facts from the contradictory local RAW passage alone.

Input:

- Local RAW under `.references/srd-5.2.1/`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Surface content, Unit/profile claims, owner evidence, and focused tests.

Output:

- After RAW reconciliation exists, represent Acid Arrow damage timing, miss branch, delayed damage, and scaling as executable Surface facts; otherwise leave blocked on the RAW decision.
- Updated plan/profile/evidence/report artifacts only when they are the correct owner.
- Focused verification, `git diff --check`, and reviewer-loop convergence.

Acceptance:

- The task lands as supported, accepted-closed/runtime-detached, or a smaller precise follow-up split.
- No companion AI/autonomous-control behavior is introduced.
- No authored identity dispatch is introduced in runtime code.

### Task 24 - L12G-FOLLOWUP-ACID-ARROW-DELAYED-RUNTIME-SUPPORT - Acid Arrow Delayed Runtime Support

Status: `blocked`

Depends on:
- Task B23.

Blocked Detail: Task B23 must first produce a lossless approved Surface damage shape. Runtime support must project from that shape rather than dispatching on Acid Arrow identity or reinterpreting the contradictory local RAW passage.

Input:

- Local RAW under `.references/srd-5.2.1/`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Surface content, Unit/profile claims, owner evidence, and focused tests.

Output:

- After RAW and Surface shape are ready, promote Acid Arrow spell attack, approved immediate/miss damage, delayed target-turn Acid damage, scaling, cleanup, and coverage evidence.
- Updated plan/profile/evidence/report artifacts only when they are the correct owner.
- Focused verification, `git diff --check`, and reviewer-loop convergence.

Acceptance:

- The task lands as supported, accepted-closed/runtime-detached, or a smaller precise follow-up split.
- No companion AI/autonomous-control behavior is introduced.
- No authored identity dispatch is introduced in runtime code.

### Task 25 - L3-SPELL-FIREBALL-RUNTIME-SURVEY - Level 3 Fireball Runtime Survey And Task Split

Status: `deferred`

Deferred Detail: Owner instruction on 2026-05-22: park not-yet-started level-3 work while the level-1/level-2 closure frontier remains active.

Input:

- Local RAW under `.references/srd-5.2.1/`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Surface content, Unit/profile claims, owner evidence, and focused tests.

Output:

- Read SRD Fireball and current blast/save damage support; ensure level-3 profile accounting is supportable or split the missing runtime work.
- Updated plan/profile/evidence/report artifacts only when they are the correct owner.
- Focused verification, `git diff --check`, and reviewer-loop convergence.

Acceptance:

- The task lands as supported, accepted-closed/runtime-detached, or a smaller precise follow-up split.
- No companion AI/autonomous-control behavior is introduced.
- No authored identity dispatch is introduced in runtime code.

### Task 26 - L3-SPELL-MASS-HEALING-WORD-RUNTIME-SURVEY - Level 3 Mass Healing Word Runtime Survey And Task Split

Status: `deferred`

Deferred Detail: Owner instruction on 2026-05-22: park not-yet-started level-3 work while the level-1/level-2 closure frontier remains active.

Input:

- Local RAW under `.references/srd-5.2.1/`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Surface content, Unit/profile claims, owner evidence, and focused tests.

Output:

- Read SRD Mass Healing Word and existing healing/target allocation support; close or split runtime work for multi-target bonus-action healing.
- Updated plan/profile/evidence/report artifacts only when they are the correct owner.
- Focused verification, `git diff --check`, and reviewer-loop convergence.

Acceptance:

- The task lands as supported, accepted-closed/runtime-detached, or a smaller precise follow-up split.
- No companion AI/autonomous-control behavior is introduced.
- No authored identity dispatch is introduced in runtime code.

### Task 27 - L3-SPELL-VAMPIRIC-TOUCH-RUNTIME-SURVEY - Level 3 Vampiric Touch Runtime Survey And Task Split

Status: `deferred`

Deferred Detail: Owner instruction on 2026-05-22: park not-yet-started level-3 work while the level-1/level-2 closure frontier remains active.

Input:

- Local RAW under `.references/srd-5.2.1/`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Surface content, Unit/profile claims, owner evidence, and focused tests.

Output:

- Read SRD Vampiric Touch and existing attack/heal/ongoing effect support; close or split runtime work for repeat spell attack plus self healing.
- Updated plan/profile/evidence/report artifacts only when they are the correct owner.
- Focused verification, `git diff --check`, and reviewer-loop convergence.

Acceptance:

- The task lands as supported, accepted-closed/runtime-detached, or a smaller precise follow-up split.
- No companion AI/autonomous-control behavior is introduced.
- No authored identity dispatch is introduced in runtime code.
