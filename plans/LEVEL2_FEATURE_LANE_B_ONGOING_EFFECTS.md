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
      "status": "ready-for-research",
      "title": "Ray Of Enfeeblement Damage Roll Penalty Runtime"
    },
    {
      "number": 7,
      "id": "L12G-FOLLOWUP-SPIRITUAL-WEAPON-SURFACE-PROXY-SHAPE",
      "status": "ready-for-research",
      "title": "Spiritual Weapon Proxy Surface Shape"
    },
    {
      "number": 8,
      "id": "L12G-FOLLOWUP-SPIRITUAL-WEAPON-PERSISTENT-ATTACK-RUNTIME",
      "status": "blocked",
      "title": "Spiritual Weapon Persistent Attack Runtime"
    },
    {
      "number": 9,
      "id": "L12G-FOLLOWUP-ENLARGE-REDUCE-CREATURE-RUNTIME",
      "status": "ready-for-research",
      "title": "Enlarge Reduce Creature Runtime Support"
    },
    {
      "number": 10,
      "id": "L12G-FOLLOWUP-ENTHRALL-PERCEPTION-RUNTIME",
      "status": "ready-for-research",
      "title": "Enthrall Perception Penalty Runtime Support"
    },
    {
      "number": 11,
      "id": "L12G-FOLLOWUP-BROADER-ONGOING-SPELL-EFFECT-DISPEL",
      "status": "ready-for-research",
      "title": "Broader Ongoing Spell Effect Dispel Runtime"
    },
    {
      "number": 12,
      "id": "L12G-FOLLOWUP-ANTIMAGIC-FIELD-PREVENTION-AND-BROADER-SUPPRESSION",
      "status": "ready-for-research",
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
      "id": "L12G-SPELL-HEAT-METAL",
      "status": "ready-for-research",
      "title": "Heat Metal Runtime Support"
    },
    {
      "number": 15,
      "id": "L12G-SPELL-LESSER-RESTORATION",
      "status": "ready-for-research",
      "title": "Lesser Restoration Runtime Support"
    },
    {
      "number": 16,
      "id": "L12G-SPELL-MAGIC-WEAPON",
      "status": "ready-for-research",
      "title": "Magic Weapon Runtime Support Or Closure"
    },
    {
      "number": 17,
      "id": "L12G-SPELL-MIND-SPIKE",
      "status": "ready-for-research",
      "title": "Mind Spike Runtime Support And Knowledge Closure"
    },
    {
      "number": 18,
      "id": "L12G-SPELL-WEB",
      "status": "ready-for-research",
      "title": "Web Runtime Support Or Closure"
    },
    {
      "number": 19,
      "id": "L12G-FOLLOWUP-ACID-ARROW-SURFACE-DAMAGE-SHAPE",
      "status": "ready-for-research",
      "title": "Acid Arrow Surface Damage Shape"
    },
    {
      "number": 20,
      "id": "L12G-FOLLOWUP-ACID-ARROW-DELAYED-RUNTIME-SUPPORT",
      "status": "blocked",
      "title": "Acid Arrow Delayed Runtime Support"
    },
    {
      "number": 21,
      "id": "L12G-FOLLOWUP-CONTINUAL-FLAME-DISPEL-REMOVAL",
      "status": "ready-for-research",
      "title": "Continual Flame Dispel And Suppression Removal"
    },
    {
      "number": 22,
      "id": "L12G-FOLLOWUP-FLAME-BLADE-SURFACE-LIFECYCLE",
      "status": "ready-for-research",
      "title": "Flame Blade Surface Lifecycle Shape"
    },
    {
      "number": 23,
      "id": "L12G-FOLLOWUP-FLAME-BLADE-RUNTIME-SUPPORT",
      "status": "blocked",
      "title": "Flame Blade Runtime Support"
    }
  ]
}
-->

This is an active Ralph execution plan for level-2 feature/runtime coverage. It replaces stale Loop B continuation work; do not merge or replay old B worktree commits.

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

Status: `ready-for-research`

Depends on:
- Task B5.

Output:
- Generic damage-roll subtraction owner for Ray of Enfeeblement's failed-save effect.
- It must compose with target-side Resistance/reductions and Concentration saves without duplicated damage state.

### Task 7 - L12G-FOLLOWUP-SPIRITUAL-WEAPON-SURFACE-PROXY-SHAPE - Spiritual Weapon Proxy Surface Shape

Status: `ready-for-research`

Input:
- Current Spiritual Weapon Surface content and SRD text.

Output:
- Surface shape for spell-owned spectral force placement, immediate attack, later Bonus Action movement plus repeat attack, Concentration, and slot scaling.
- Do not model it as a creature companion or ordinary object.

### Task 8 - L12G-FOLLOWUP-SPIRITUAL-WEAPON-PERSISTENT-ATTACK-RUNTIME - Spiritual Weapon Persistent Attack Runtime

Status: `blocked`

Depends on:
- Task B7.

Output:
- Runtime profile subset for proxy placement, immediate melee spell attack, later Bonus Action movement/repeat attack, slot scaling, and cleanup.
- Automatic geometry and adjacency remain table-supplied facts.

### Task 9 - L12G-FOLLOWUP-ENLARGE-REDUCE-CREATURE-RUNTIME - Enlarge Reduce Creature Runtime Support

Status: `ready-for-research`

Input:
- Existing size, weapon damage, Strength check/save, and concentration effect projections.
- SRD Enlarge/Reduce text.

Output:
- Creature-target profile subset for size change, Strength D20 roll mode, weapon damage adjustment, save gate, and cleanup.
- Object branch stays separate unless it remains atomic after research.

### Task 10 - L12G-FOLLOWUP-ENTHRALL-PERCEPTION-RUNTIME - Enthrall Perception Penalty Runtime Support

Status: `ready-for-research`

Input:
- Existing roll-mode profile readers and observer/target table facts.
- SRD Enthrall text.

Output:
- Supported profile or closure for the Perception check penalty subset.
- Avoid storing conversation or attention state outside executable roll-mode needs.

### Task 11 - L12G-FOLLOWUP-BROADER-ONGOING-SPELL-EFFECT-DISPEL - Broader Ongoing Spell Effect Dispel Runtime

Status: `ready-for-research`

Input:
- Task 1 Dispel Magic support for tracked spell-light emitters and tracked `spellObjectContactDamage` active-effect occurrences.
- Existing active-effect, area-effect, and concentration lifecycle models.

Output:
- Promote Dispel Magic beyond tracked spell-light emitters and tracked `spellObjectContactDamage` occurrences only where broader ongoing Spell Effect occurrences have stable identity, source spell level, target association, and cleanup semantics without duplicated state.
- Keep spell-specific dispel exceptions or immunities as explicit typed closures instead of identity-dispatched special cases.

### Task 12 - L12G-FOLLOWUP-ANTIMAGIC-FIELD-PREVENTION-AND-BROADER-SUPPRESSION - Antimagic Field Prevention And Broader Suppression Runtime

Status: `ready-for-research`

Input:
- Task 2 Antimagic Field support for tracked spell-light emitters and tracked `spellObjectContactDamage` active-effect occurrences.
- Existing active-effect, area-effect, spellcasting, targeting, item, teleportation, and portal ownership boundaries.
- SRD Antimagic Field prevention/suppression clauses.

Output:
- Split and promote Antimagic Field clauses whose owners are still absent: spellcasting prevention, Magic Action prevention, magical targeting prevention, magic item suppression, magical area clipping, teleportation/planar travel blocking, portal closure, Dispel Magic immunity on the aura, and suppression of ongoing Spell Effects beyond tracked spell-light emitters and tracked `spellObjectContactDamage` occurrences.
- Model only owner-specific executable subsets with focused tests and promoted Quint/runtime parity; close or split clauses that still lack precise owners.
- Suppressed occurrences must keep ticking and must not be deleted while suppressed.

### Task 13 - L12G-RECURSIVE-TAIL-LANE-B - Lane B Recursive Planning Tail

Status: `blocked`

Unblock only after all ready Lane B tasks are done or explicitly closed.

Output:
- Refresh level-2 ongoing-effect metrics.
- Add the next concrete, Ralph-sized Lane B tasks only if real frontier remains.

## Overnight Backlog Refill

### Task 14 - L12G-SPELL-HEAT-METAL - Heat Metal Runtime Support

Status: `ready-for-research`

Unit: `heat_metal`. Gate task: 33 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `heat_metal`.

Outputs:

- one concrete end state from the Task Output Contract for `heat_metal`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `heat_metal` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A; observed-statuses: ready-for-research -->

### Task 15 - L12G-SPELL-LESSER-RESTORATION - Lesser Restoration Runtime Support

Status: `ready-for-research`

Unit: `lesser_restoration`. Gate task: 36 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `lesser_restoration`.

Outputs:

- one concrete end state from the Task Output Contract for `lesser_restoration`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `lesser_restoration` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A; observed-statuses: ready-for-research -->

### Task 16 - L12G-SPELL-MAGIC-WEAPON - Magic Weapon Runtime Support Or Closure

Status: `ready-for-research`

Unit: `magic_weapon`. Gate task: 37 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `magic_weapon`.

Outputs:

- one concrete end state from the Task Output Contract for `magic_weapon`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `magic_weapon` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A; observed-statuses: ready-for-research -->

### Task 17 - L12G-SPELL-MIND-SPIKE - Mind Spike Runtime Support And Knowledge Closure

Status: `ready-for-research`

Unit: `mind_spike`. Gate task: 38 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `mind_spike`.

Outputs:

- one concrete end state from the Task Output Contract for `mind_spike`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `mind_spike` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A, B; observed-statuses: deferred, ready-for-research -->

### Task 18 - L12G-SPELL-WEB - Web Runtime Support Or Closure

Status: `ready-for-research`

Unit: `web`. Gate task: 53 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `web`.

Outputs:

- one concrete end state from the Task Output Contract for `web`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `web` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A, B; observed-statuses: deferred, ready-for-research -->

### Task 19 - L12G-FOLLOWUP-ACID-ARROW-SURFACE-DAMAGE-SHAPE - Acid Arrow Surface Damage Shape

Status: `ready-for-research`

Unit: `acid_arrow`. Follow-up split from Task 21.

Dependency: Task 21 (`L12G-SPELL-ACID-ARROW`) done.

Inputs:

- `packages/surface/content/acid_arrow.json`;
- `packages/surface/content/acid_arrow.dhall`;
- the `acid_arrow` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Spells/Descriptions-A-D.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- Surface spell schema, Dhall generation, tracer, and focused tests for spell damage shapes.

Outputs:

- Acid Arrow authored content represents the RAW initial hit damage, later end-of-target-next-turn damage, miss-only immediate half-of-initial damage, and slot scaling for both initial and later damage as lossless executable Spell Definition facts;
- the miss branch is derived from the initial damage relationship rather than stored as an independently fixed 2d4 approximation;
- schema/tracer support is updated only if the current Surface shape cannot represent those facts;
- regenerated coverage artifacts.

Acceptance:

- the Surface damage-shape portion of `acid_arrow` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no battle-runtime Acid Arrow invocation/effect execution is implemented in this task;
- authored facts trace to SRD Acid Arrow without duplicating Spell Invocation or Spell Effect state;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A; observed-statuses: ready-for-research -->

### Task 20 - L12G-FOLLOWUP-ACID-ARROW-DELAYED-RUNTIME-SUPPORT - Acid Arrow Delayed Runtime Support

Status: `blocked`

Unit: `acid_arrow`. Follow-up split from Task 21.

Dependency: Task 88 (`L12G-FOLLOWUP-ACID-ARROW-SURFACE-DAMAGE-SHAPE`) done.

Inputs:

- `packages/surface/content/acid_arrow.json`;
- the `acid_arrow` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Spells/Descriptions-A-D.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- battle-runtime, spell invocation/effect lifecycle, Unit profile, owner-evidence, and focused tests for Acid Arrow execution.

Outputs:

- supported runtime profile and owner evidence for Acid Arrow as a level-2 prepared Spell Invocation that spends the Magic Action and Spell Slot;
- runtime resolves a ranged Spell Attack, applies immediate Acid damage on hit, stores the Acid Spell Effect that applies at the end of the target's next turn on hit, applies immediate half-of-initial Acid damage on miss only, and scales RAW damage amounts by slot level;
- runtime consumes the repaired Spell Definition facts from Task 88 rather than duplicating or reinterpreting authored damage state;
- Quint/runtime parity updates if promoted battle-runtime behavior changes;
- regenerated coverage artifacts.

Acceptance:

- the delayed runtime support portion of `acid_arrow` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- runtime behavior traces to SRD Acid Arrow without homebrew extensions and consumes projected Spell Definition facts rather than storing redundant damage formulas;
- no unrelated level-1 Loop D/L spell frontier work is implemented in this task;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, package-local promoted MBT if runtime behavior changes, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A; observed-statuses: ready-for-research -->

### Task 21 - L12G-FOLLOWUP-CONTINUAL-FLAME-DISPEL-REMOVAL - Continual Flame Dispel And Suppression Removal

Status: `ready-for-research`

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

### Task 22 - L12G-FOLLOWUP-FLAME-BLADE-SURFACE-LIFECYCLE - Flame Blade Surface Lifecycle Shape

Status: `ready-for-research`

Unit: `flame_blade`. Follow-up split from Task 29.

Dependency: Task 29 (`L12G-SPELL-FLAME-BLADE`) done.

Inputs:

- `packages/surface/content/flame_blade.json`;
- `packages/surface/content/flame_blade.dhall`;
- the `flame_blade` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Spells/Descriptions-E-L.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- Surface spell schema, Dhall generation, tracer, and focused tests for spell-created held objects and action-gated spell attacks.

Outputs:

- Flame Blade authored content represents Bonus Action creation and re-evocation, free-hand requirement, let-go disappearance, Concentration up to 10 minutes, self-attached held Bright Light 10 feet plus Dim Light for an additional 10 feet, active-blade-gated Magic Action melee spell attack, Fire damage equal to 3d6 plus the caster's spellcasting ability modifier, and +1d6 per slot level above 2 as lossless executable Spell Definition facts;
- schema/tracer support is updated only if the current Surface shape cannot represent those facts;
- battle-runtime Flame Blade invocation, active blade state, attacks, cleanup, and re-evocation are not implemented in this task;
- regenerated coverage artifacts.

Acceptance:

- the Surface lifecycle-shape portion of `flame_blade` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- authored facts trace to SRD Flame Blade without duplicating Spell Invocation, Spell Effect, held-object runtime, light-emitter runtime, attack-roll runtime, or Spell Slot state;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: C; observed-statuses: ready-for-research -->

### Task 23 - L12G-FOLLOWUP-FLAME-BLADE-RUNTIME-SUPPORT - Flame Blade Runtime Support

Status: `blocked`

Unit: `flame_blade`. Follow-up split from Task 29.

Dependency: Task 94 (`L12G-FOLLOWUP-FLAME-BLADE-SURFACE-LIFECYCLE`) must be done before implementation.

Inputs:

- `packages/surface/content/flame_blade.json`;
- the `flame_blade` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Spells/Descriptions-E-L.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- battle-runtime spell-created held object lifecycle, spell invocation/effect lifecycle, light emitter projection, melee Spell Attack execution, Unit profile, owner-evidence, and promoted Quint parity tests for Flame Blade execution.

Outputs:

- supported runtime profile and owner evidence for Flame Blade as a level-2-or-higher prepared spell that spends a Bonus Action and Spell Slot, starts caster-owned Concentration, consumes caller-supplied free-hand and holding witnesses, creates active spell-created blade state, projects source-owned held light, and cleans up on Concentration, duration, or let-go events;
- runtime permits Magic Action melee spell attacks only while the blade is active, applies Fire damage with slot scaling and spellcasting ability modifier, and supports Bonus Action re-evocation from the same active spell occurrence without a second Spell Slot spend while the spell lasts;
- runtime consumes the repaired Flame Blade Spell Definition facts from Task 94 rather than duplicating free-hand, let-go, re-evocation, light, attack, or damage constants;
- Quint/runtime parity updates if promoted battle-runtime behavior changes;
- regenerated coverage artifacts.

Acceptance:

- Flame Blade runtime support is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- runtime behavior traces to SRD Flame Blade without homebrew extensions and consumes projected Spell Definition facts rather than storing redundant spell-created blade formulas;
- no unrelated level-1 Loop D/L spell frontier, companion boundary, or object inventory behavior is implemented in this task;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, package-local promoted MBT if runtime behavior changes, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: C; observed-statuses: ready-for-research -->
