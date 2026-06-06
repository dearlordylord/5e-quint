# Ralph Lane: L3 Morning Spell Boundary Closure

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L3MSPELL-01-ANTIMAGIC-REMAINING-BLOCKER-LEDGER",
      "status": "done",
      "title": "Close Antimagic Field remaining blocker ledger"
    },
    {
      "number": 2,
      "id": "L3MSPELL-02-DISPEL-ONGOING-EFFECT-BOUNDARY",
      "status": "done",
      "title": "Resolve Dispel Magic ongoing effect boundary"
    },
    {
      "number": 3,
      "id": "L3MSPELL-03-CONTINUAL-FLAME-COMPONENT-BOUNDARY",
      "status": "done",
      "title": "Resolve Continual Flame component boundary"
    },
    {
      "number": 4,
      "id": "L3MSPELL-04-CONTINUAL-FLAME-LIGHT-PROJECTION",
      "status": "done",
      "title": "Consolidate Continual Flame light projection evidence"
    },
    {
      "number": 5,
      "id": "L3MSPELL-05-ENLARGE-REDUCE-OBJECT-LIFECYCLE",
      "status": "done",
      "title": "Resolve Enlarge Reduce object lifecycle boundary"
    },
    {
      "number": 6,
      "id": "L3MSPELL-06-LEVITATE-LOOSE-OBJECT-BOUNDARY",
      "status": "done",
      "title": "Resolve Levitate loose object boundary"
    },
    {
      "number": 7,
      "id": "L3MSPELL-07-FIREBALL-AREA-OBJECT-CLOSURE",
      "status": "done",
      "title": "Resolve Fireball area object closure"
    },
    {
      "number": 8,
      "id": "L3MSPELL-08-SPIKE-GROWTH-SEARCH-CLOSURE",
      "status": "done",
      "title": "Resolve Spike Growth hidden hazard discovery closure"
    },
    {
      "number": 9,
      "id": "L3MSPELL-09-FLY-FALLING-SPATIAL-CLOSURE",
      "status": "done",
      "title": "Resolve Fly falling and spatial closure"
    },
    {
      "number": 10,
      "id": "L3MSPELL-10-MOONBEAM-SHAPESHIFT-CLOSURE",
      "status": "done",
      "title": "Resolve Moonbeam shapeshift trigger closure"
    },
    {
      "number": 11,
      "id": "L3MSPELL-11-SPELL-SELECTED-IDENTITY-AUDIT",
      "status": "done",
      "title": "Audit selected-identity replay for promoted spells"
    },
    {
      "number": 12,
      "id": "L3MSPELL-12-SPELL-BOUNDARY-CONSOLIDATION",
      "status": "done",
      "title": "Consolidate spell boundary evidence"
    }
  ]
}
-->

## Objective

Close remaining Level 1-3 spell-boundary pressure without turning table-only
facts into fake runtime support. This lane is intentionally deep-slice oriented:
each task must either promote one executable tracer bullet through Surface,
QNT, runtime reducer reachability, MBT replay, and coverage ledgers, or record
why the spell is outside the battle reducer boundary.

## Declared Base And Task-Base Check

Declared Base SHA:

```text
9e8ea6e4db35bc2703907697f1c291643bf94e45
```

Before each task, log:

```sh
git rev-parse HEAD
git merge-base --is-ancestor 9e8ea6e4db35bc2703907697f1c291643bf94e45 HEAD
```

If the ancestor check fails, stop and report the branch-base mismatch. Do not
repair branch state by rebasing against `master`.

## DAG / Queue Order

| Order | Task | Status | Depends On | Notes |
|---:|---|---|---|---|
| 1 | L3MSPELL-01-ANTIMAGIC-REMAINING-BLOCKER-LEDGER | done | none | Classify remaining Antimagic Field gaps as executable battle support or owner-decision blockers. |
| 2 | L3MSPELL-02-DISPEL-ONGOING-EFFECT-BOUNDARY | done | none | Broader Dispel Magic occurrence support is not represented in the real reducer path; keep it assigned to the broader ongoing Spell Effect occurrence owner. |
| 3 | L3MSPELL-03-CONTINUAL-FLAME-COMPONENT-BOUNDARY | done | none | Costly consumed Material component availability, hand/access legality, focus/component substitution eligibility, and consumed Material inventory mutation belong to the character equipment/component legality boundary, not battle runtime. |
| 4 | L3MSPELL-04-CONTINUAL-FLAME-LIGHT-PROJECTION | done | L3MSPELL-03-CONTINUAL-FLAME-COMPONENT-BOUNDARY | Continual Flame light projection is already represented by `spell.invocation-object-light`; evidence is consolidated in `plans/unit-profile-coverage/L3MSPELL_04_CONTINUAL_FLAME_LIGHT_PROJECTION.md`. |
| 5 | L3MSPELL-05-ENLARGE-REDUCE-OBJECT-LIFECYCLE | done | none | Enlarge/Reduce creature support is already represented by `spell.invocation-creature-size-change`; object Size and carried/worn item normalization remain outside battle runtime until a generic object/item lifecycle owner exists. |
| 6 | L3MSPELL-06-LEVITATE-LOOSE-OBJECT-BOUNDARY | done | none | Levitate loose-object motion remains table/object-spatial adjudication until a generic loose-object lifecycle owner exists. |
| 7 | L3MSPELL-07-FIREBALL-AREA-OBJECT-CLOSURE | done | none | Fireball object ignition is reachable through the production `saveGatedDamage` reducer path; automatic area membership, line of effect, object discovery, flammable/unworn discovery, and grid geometry remain table/spatial derivations. |
| 8 | L3MSPELL-08-SPIKE-GROWTH-SEARCH-CLOSURE | done | none | Spike Growth camouflaged terrain recognition remains a runtime-detached Search/perception witness; do not add Spike Growth-local recognized terrain state. |
| 9 | L3MSPELL-09-FLY-FALLING-SPATIAL-CLOSURE | done | none | Fly cleanup already uses the promoted scalar-buff/end-fall witness boundary; automatic elevation, landing, and can-stop-fall derivation remain table/spatial facts. |
| 10 | L3MSPELL-10-MOONBEAM-SHAPESHIFT-CLOSURE | done | none | Moonbeam shape-shift support is resolved through the shared class-feature and spell-effect shape-shift owners; stat-block Shape-Shift specials remain outside this profile until a generic Stat Block special-action active-form owner exists. |
| 11 | L3MSPELL-11-SPELL-SELECTED-IDENTITY-AUDIT | done | none | Promoted spell profiles already replay selected identity through production reducer or package-public runtime paths; evidence is consolidated in `plans/unit-profile-coverage/L3MSPELL_11_SPELL_SELECTED_IDENTITY_AUDIT.md`. |
| 12 | L3MSPELL-12-SPELL-BOUNDARY-CONSOLIDATION | done | L3MSPELL-01-ANTIMAGIC-REMAINING-BLOCKER-LEDGER, L3MSPELL-02-DISPEL-ONGOING-EFFECT-BOUNDARY, L3MSPELL-04-CONTINUAL-FLAME-LIGHT-PROJECTION, L3MSPELL-05-ENLARGE-REDUCE-OBJECT-LIFECYCLE, L3MSPELL-06-LEVITATE-LOOSE-OBJECT-BOUNDARY, L3MSPELL-07-FIREBALL-AREA-OBJECT-CLOSURE, L3MSPELL-08-SPIKE-GROWTH-SEARCH-CLOSURE, L3MSPELL-09-FLY-FALLING-SPATIAL-CLOSURE, L3MSPELL-10-MOONBEAM-SHAPESHIFT-CLOSURE, L3MSPELL-11-SPELL-SELECTED-IDENTITY-AUDIT | Ledgers regenerated and remaining spell-level-3 pressure recorded in `plans/unit-profile-coverage/L3MSPELL_12_SPELL_BOUNDARY_CONSOLIDATION.md`. |

## Task Details

### Task 1 - L3MSPELL-01-ANTIMAGIC-REMAINING-BLOCKER-LEDGER

Read Antimagic Field RAW and current support rows, then replace any stale
remaining labels with explicit runtime-owned slices or owner-decision blockers.

### Task 2 - L3MSPELL-02-DISPEL-ONGOING-EFFECT-BOUNDARY

Decide whether broader ongoing spell effect occurrences are represented in the
real battle reducer path. If not, document the missing owner instead of adding a
table-only profile.

Outcome: the current Dispel Magic reducer path only enumerates tracked
spell-light emitters, tracked `spellObjectContactDamage` active-effect
occurrences, tracked Spiritual Weapon active-effect occurrences, and the
Antimagic Field no-effect exception. Broader creature-attached, area, object,
and spell-specific exception families remain assigned to the existing broader
ongoing Spell Effect occurrence follow-up owner, not a table-only profile.

### Task 3 - L3MSPELL-03-CONTINUAL-FLAME-COMPONENT-BOUNDARY

Resolve whether component consumption and inventory state are within the current
runtime boundary. Do not duplicate inventory facts.

Outcome: costly consumed Material component availability and consumption for
Continual Flame are outside the current battle-runtime boundary. Surface already
records the authored component facts, and battle runtime owns Spell Slot
spending plus the admitted object-attached light Spell Effect. Do not add a
battle-runtime component stock field, component-spend ledger, copied inventory
field, or spell-local inventory flag.

### Task 4 - L3MSPELL-04-CONTINUAL-FLAME-LIGHT-PROJECTION

Consolidate Continual Flame light projection evidence against the existing
`spell.invocation-object-light` support profile. Confirm Surface shape, QNT
witness/proof ownership, production reducer reachability, MBT replay evidence,
and coverage ledgers all point at the existing object-light implementation. Do
not build a second Continual Flame-specific light reducer or a fresh promoted
unit tracer bullet unless research finds a concrete evidence gap in the existing
profile.

Outcome: Continual Flame light projection is already represented by the existing
`spell.invocation-object-light` implementation. Surface content, the object-light
QNT owner/proofs, production reducer admission and resolution, deterministic
admission tests, selected-identity MBT replay metadata, and coverage ledgers all
point at the shared object-light path. Do not add a Continual Flame-specific
light reducer, remover registry, duplicate light projection state, or fresh
promoted unit tracer bullet. Evidence is consolidated in
`plans/unit-profile-coverage/L3MSPELL_04_CONTINUAL_FLAME_LIGHT_PROJECTION.md`.

### Task 5 - L3MSPELL-05-ENLARGE-REDUCE-OBJECT-LIFECYCLE

Classify object growth, object carried/worn interactions, and creature size
support against the current reducer and object boundaries.

Outcome: Enlarge/Reduce creature Size support remains under the promoted
`spell.invocation-creature-size-change` profile. Object Size-category lifecycle,
carried or worn item size changes, dropped-item normalization, and thrown weapon
or ammunition normalization are real SRD mechanics, but the current battle
runtime has no canonical object Size or generic item lifecycle owner to mutate
and clean up those facts. Do not add Enlarge/Reduce-local object or item Size
state. Evidence is consolidated in
`plans/unit-profile-coverage/L3MSPELL_05_ENLARGE_REDUCE_OBJECT_LIFECYCLE.md`.

### Task 6 - L3MSPELL-06-LEVITATE-LOOSE-OBJECT-BOUNDARY

Classify loose-object support and avoid adding unreachable object state to the
battle reducer.

Outcome: Levitate creature support remains under the promoted
`spell.invocation-levitated-creature` profile. The loose-object branch is real
SRD behavior and Surface already records its loose-object target shape,
500-pound weight gate, suspension, movement restriction, caster altitude
control, range constraint, and gentle-grounding text, but the current battle
runtime has no canonical loose-object position, weight, aloft/grounded state,
fixed-object attachment, surface reach, range derivation, map geometry, or
gentle-grounding lifecycle owner to mutate and clean up. Do not add
Levitate-local object altitude state or reuse the creature active effect for
objects. Evidence is consolidated in
`plans/unit-profile-coverage/L3MSPELL_06_LEVITATE_LOOSE_OBJECT_BOUNDARY.md`.

### Task 7 - L3MSPELL-07-FIREBALL-AREA-OBJECT-CLOSURE

Audit flammable object and area-effect support. Promote only if object effects
are reachable from the real reducer path.

Outcome: Fireball is promoted to `supported-profile` for the existing
`spell.invocation-damage-save-or-attack` path. Its runtime-owned slice is Magic
Action and level-3-or-higher Spell Slot casting, caller-supplied point-origin
Sphere affected-creature facts, Dexterity save-gated Fire damage, slot scaling,
explicit caller-supplied unattended flammable-object ignition facts, and emitted
starts-burning outcomes through the production `saveGatedDamage` reducer path.
Automatic area membership, line of effect, object inventory discovery,
flammable-material discovery, worn/carried discovery, grid geometry, and ongoing
Burning hazard damage remain outside the Fireball reducer. Evidence is
consolidated in
`plans/unit-profile-coverage/L3MSPELL_07_FIREBALL_AREA_OBJECT_CLOSURE.md`.

### Task 8 - L3MSPELL-08-SPIKE-GROWTH-SEARCH-CLOSURE

Resolve hidden terrain discovery and search-state ownership using RAW and
ubiquitous language.

Outcome: Spike Growth movement hazard support remains under the promoted
`spell.invocation-spike-growth-movement-hazard` profile. The camouflaged
terrain recognition clause is real SRD behavior, but it is per creature and
depends on table-owned cast-time sight, Search Action declaration before entry,
Skill/check result, caster Spell Save DC comparison, and a recognized-hazard
witness. Do not add Spike Growth-local recognized/unrecognized terrain state or
reuse hidden-combatant Search state for terrain recognition. Evidence is
consolidated in
`plans/unit-profile-coverage/L3MSPELL_08_SPIKE_GROWTH_SEARCH_CLOSURE.md`.

### Task 9 - L3MSPELL-09-FLY-FALLING-SPATIAL-CLOSURE

Resolve whether Fly needs a runtime falling/spatial slice now or an explicit
owner blocker for absent spatial mechanics.

Outcome: Fly does not need a new falling/spatial runtime slice now. The
promoted `spell.scalar-buff` path already owns cast admission, Spell Slot spend,
Concentration, fixed Fly Speed, hover, movement/Dash projection, cleanup, and
the spell-end fall handoff through explicit not-aloft, can-stop-fall, and
cannot-stop-fall witnesses. Automatic elevation, landing legality, map/path
geometry, and can-stop-fall derivation remain table/spatial facts. Evidence is
consolidated in
`plans/unit-profile-coverage/L3MSPELL_09_FLY_FALLING_SPATIAL_CLOSURE.md`.

### Task 10 - L3MSPELL-10-MOONBEAM-SHAPESHIFT-CLOSURE

Resolve Moonbeam shapechanger/shapeshift trigger support without dispatching on
authored identity.

Outcome: Moonbeam shape-shift support is resolved for the current battle
runtime. Failed saves revert admitted class-feature and spell-effect
shape-shifted targets through the shared restoration owner and apply Moonbeam
suppression until Cylinder exit or spell cleanup; successful saves do not
revert. Stat-block Shape-Shift specials are not admitted because the current SRD
Stat Block catalog stores those facts as prose-only specials and battle runtime
has no generic Stat Block special-action active-form owner. Evidence is
consolidated in
`plans/unit-profile-coverage/L3MSPELL_10_MOONBEAM_SHAPESHIFT_CLOSURE.md`.

### Task 11 - L3MSPELL-11-SPELL-SELECTED-IDENTITY-AUDIT

Audit promoted spell profiles to make sure selected identity flows through the
same production reducer path the app/MCP would reach, and that every MBT replay
is connected to that path rather than a dead test-only projection.

Outcome: promoted supported and profile-subset-supported spell Units have
selected-identity replay evidence connected to the production reducer or
package-public runtime path. The remaining `selectedIdentityMbtCoverage`
denominator gap is non-spell deterministic projection work and does not block
spell boundary consolidation. Evidence is consolidated in
`plans/unit-profile-coverage/L3MSPELL_11_SPELL_SELECTED_IDENTITY_AUDIT.md`.

### Task 12 - L3MSPELL-12-SPELL-BOUNDARY-CONSOLIDATION

Regenerate profile ledgers, remove stale plan leftovers made obsolete by this
lane, and record remaining spell pressure. Include the Task 3 Continual Flame
component-boundary note, the Task 4 Continual Flame light-projection evidence
note, the Task 5 Enlarge/Reduce object-lifecycle note, the Task 6 Levitate
loose-object boundary note, the Task 7 Fireball area-object closure note, the
Task 8 Spike Growth Search/perception closure note, the Task 10 Moonbeam
shape-shift closure note, the Task 11 selected-identity audit note, and
regenerated ledgers.

Outcome: spell-boundary consolidation is complete. The generated Unit profile
ledgers were refreshed, the lane status was closed, and remaining
spell-level-3 pressure was recorded in
`plans/unit-profile-coverage/L3MSPELL_12_SPELL_BOUNDARY_CONSOLIDATION.md`.
No runtime promotion was added; future spell work should start from the
recorded missing-authored-record and owner-evidence-required spell candidates.

## Task Rules

- `in reducer = in QNT` remains the guidance for executable battle support.
- Table-only or object-system-only decisions must not claim promoted unit tracer
  bullet status.
- Runtime promotions must be vertical and narrow. Do not start a wide spell
  subsystem refactor from this lane.
- Do not dispatch on PHB+ authored identity. Use parsed shape, typed procedure
  facts, support profiles, and explicit runtime state.
- MBT may run only after code changes are complete and only with the global
  `.ralph/mbt-global.lock`.

## Verification

- RAW/ubiquitous-language check: read the relevant spell passage in
  `.references/srd-5.2.1/Spells/` and check `UBIQUITOUS_LANGUAGE.md` before
  modeling any rule.
- Reviewer-loop convergence: run RAW, ubiquitous-language/domain,
  architecture/connascence, and code-review passes until no reasonable findings
  remain.
- Run `pnpm unit-profile-coverage:check -- --write` and
  `pnpm unit-profile-coverage:check` for profile/evidence changes.
- Run `pnpm rules-kernel-coverage:check -- --write` and
  `pnpm rules-kernel-coverage:check` when rule-core obligation evidence changes.
- Run focused runtime tests and relevant package typechecks when code changes.
- Run battle MBT only for completed battle-runtime behavior changes, one at a
  time, with the global `.ralph/mbt-global.lock`.
