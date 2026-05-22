# Level 2 Feature Lane B - Ongoing Spell Effects And Linked Runtime Lifecycles

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {"number":1,"id":"L12G-FOLLOWUP-GENERIC-ONGOING-SPELL-EFFECT-DISPEL","status":"done","title":"Generic Ongoing Spell Effect Dispel Runtime"},
    {"number":2,"id":"L12G-FOLLOWUP-ANTIMAGIC-FIELD-GENERIC-SUPPRESSION","status":"done","title":"Antimagic Field Generic Suppression Runtime"},
    {"number":3,"id":"L12G-FOLLOWUP-PRAYER-OF-HEALING-SURFACE-REST","status":"done","title":"Prayer Of Healing Surface Rest Shape"},
    {"number":4,"id":"L12G-FOLLOWUP-PRAYER-OF-HEALING-CHARACTER-SHEET-REST","status":"done","title":"Prayer Of Healing Character Sheet Rest Runtime"},
    {"number":5,"id":"L12G-FOLLOWUP-RAY-OF-ENFEEBLEMENT-D20-LIFECYCLE","status":"done","title":"Ray Of Enfeeblement D20 Lifecycle Runtime"},
    {"number":6,"id":"L12G-FOLLOWUP-RAY-OF-ENFEEBLEMENT-DAMAGE-PENALTY","status":"ready-for-research","title":"Ray Of Enfeeblement Damage Roll Penalty Runtime"},
    {"number":7,"id":"L12G-FOLLOWUP-SPIRITUAL-WEAPON-SURFACE-PROXY-SHAPE","status":"ready-for-research","title":"Spiritual Weapon Proxy Surface Shape"},
    {"number":8,"id":"L12G-FOLLOWUP-SPIRITUAL-WEAPON-PERSISTENT-ATTACK-RUNTIME","status":"blocked","title":"Spiritual Weapon Persistent Attack Runtime"},
    {"number":9,"id":"L12G-FOLLOWUP-ENLARGE-REDUCE-CREATURE-RUNTIME","status":"ready-for-research","title":"Enlarge Reduce Creature Runtime Support"},
    {"number":10,"id":"L12G-FOLLOWUP-ENTHRALL-PERCEPTION-RUNTIME","status":"ready-for-research","title":"Enthrall Perception Penalty Runtime Support"},
    {"number":11,"id":"L12G-FOLLOWUP-BROADER-ONGOING-SPELL-EFFECT-DISPEL","status":"ready-for-research","title":"Broader Ongoing Spell Effect Dispel Runtime"},
    {"number":12,"id":"L12G-FOLLOWUP-ANTIMAGIC-FIELD-PREVENTION-AND-BROADER-SUPPRESSION","status":"ready-for-research","title":"Antimagic Field Prevention And Broader Suppression Runtime"},
    {"number":13,"id":"L12G-RECURSIVE-TAIL-LANE-B","status":"blocked","title":"Lane B Recursive Planning Tail"}
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
