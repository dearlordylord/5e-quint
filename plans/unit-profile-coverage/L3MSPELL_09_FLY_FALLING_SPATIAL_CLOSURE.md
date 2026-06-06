# L3MSPELL-09 Fly Falling Spatial Closure

Task 9 resolved Fly's spell-end falling and spatial ownership boundary against
RAW, ubiquitous language, and the promoted battle reducer. No runtime behavior,
Surface shape, QNT owner, or MBT driver was added.

## Source Review

Local RAW sources checked:

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md#Fly` for the Action
  casting, Touch range, willing creature target, Concentration up to 10
  minutes, fixed 60-foot Fly Speed grant, hover, spell-end falling clause, and
  higher-slot target scaling.
- `.references/srd-5.2.1/Rules-Glossary.md#Flying` and
  `.references/srd-5.2.1/Rules-Glossary.md#Fly Speed` for the general rule
  that a flying creature can fall when Incapacitated, Prone, or reduced to 0
  Fly Speed, and that hover can keep it aloft in those circumstances.
- `.references/srd-5.2.1/Rules-Glossary.md#Falling Hazard` for falling damage
  and Prone-on-landing consequences.
- `UBIQUITOUS_LANGUAGE.md#Movement` for the distinction between Speed as a
  capacity and Movement as turn-budget expenditure.
- `UBIQUITOUS_LANGUAGE.md#Environmental Hazards` for Falling terminology.
- `UBIQUITOUS_LANGUAGE.md#Spell Ownership Terms` for Spell Definition, Spell
  Invocation, and Spell Effect ownership.

Relevant RAW facts:

- Fly is a level-3 Action spell with Touch range and Concentration up to 10
  minutes.
- The target is a willing creature.
- The target gains a fixed 60-foot Fly Speed and can hover for the duration.
- When the spell ends, the target falls only if it is still aloft and cannot
  stop the fall.
- Higher-level Spell Slots add one target per slot level above 3.

## Existing Evidence Chain

Surface shape:

- `packages/surface/content/fly.dhall` and generated
  `packages/surface/content/fly.json` record the SRD-authored spell facts,
  Concentration duration, fixed Fly Speed grant, hover flag, and slot-scaled
  touched willing creature target selection.
- The Dhall note keeps the spell-end falling clause at the explicit witness
  boundary: runtime consumes not-aloft, can-stop-fall, and cannot-stop-fall
  witnesses instead of storing elevation or deriving landing geometry.

QNT witness/proof ownership:

- `packages/shared-algebras/proofs/rule-core/spell-scalar-buff-projection-core.qnt`
  models Fly as the scalar-buff spell profile that grants fixed Fly Speed and
  hover.
- `packages/battle-runtime/battle-runtime-restoration-and-buffs.qnt` defines
  `FlySpeedGrantEndFallWitness` as not aloft, can stop the fall, or cannot stop
  the fall with Feather Fall reaction facts.
- `packages/battle-runtime/battle-runtime-hp-armor-buff-spatial-tests.qnt`
  proves the promoted facts: Fly grants fixed Fly Speed, Speed changes compose
  with that grant, cleanup emits an end-fall witness frame, invalid pre-cleanup
  witness resolution is rejected, not-aloft and can-stop-fall witnesses close
  without a fall, and cannot-stop-fall hands off through the Feather Fall
  falling pipeline.

Production reducer reachability:

- `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/scalar-buff.ts`
  admits Fly from parsed Surface facts as an Action level-3+ scalar-buff
  invocation with caster-owned Concentration, known willing target fills, fixed
  Fly Speed, hover, and slot-scaled targets.
- `packages/battle-runtime/src/battle-reducer/fly-speed-grant-end-fall-cleanup.ts`
  emits pending cleanup frames only when a removed active effect is a Fly
  special-Speed grant.
- `packages/battle-runtime/src/battle-reducer/dispatcher.ts` owns
  `resolveFlySpeedGrantEndFallCleanup`. The resolver requires a pending cleanup
  frame, rejects resolution while the ended Fly grant is still active, records
  not-aloft and can-stop-fall outcomes without opening a fall, and routes
  cannot-stop-fall into the existing `creatureFalls` Reaction window and
  Feather Fall landing owner.
- `packages/battle-runtime/src/battle-reducer/movement-speed.ts` projects the
  active fixed Fly Speed grant into effective movement and Dash budgets while
  the effect remains active.

Runtime and replay evidence:

- `packages/battle-runtime/src/unit-profile-admission-scalar-buff-and-heroism-spells.test.ts`
  covers Fly catalog admission, willing-target rejection, fixed 60-foot Fly
  Speed and hover active effects, slot scaling, Concentration cleanup, duration
  cleanup, Dash projection, recast replacement cleanup, pre-cleanup rejection,
  not-aloft and can-stop-fall witnesses, and cannot-stop-fall handoff into the
  Feather Fall Reaction and landing pipeline.
- No Fly-specific scalar-buff MBT replay is claimed here:
  `packages/battle-runtime/src/scalar-buff.mbt.test.ts` covers the Longstrider
  scalar-buff path, and
  `packages/battle-runtime/src/scalar-buff-active-effects.mbt.test.ts` covers
  Aid, False Life, Longstrider, Shield of Faith, and Spider Climb active-effect
  examples.
- `packages/battle-runtime/src/level2-mobility-spell-selected-identity.mbt.test.ts`
  replays selected identity for Fly discovery through the production mobility
  spell projection path.

Coverage ledgers:

- `plans/unit-profile-coverage/unit-claims.jsonl` records `fly` as
  `profile-subset-supported` under `spell.scalar-buff`.
- The supported mechanics include Magic Action and level-3-or-higher Spell Slot
  casting, known willing touched-creature target admission, caster-owned
  Concentration, fixed 60-foot Fly Speed, hover retention, effective movement
  and Dash projection, Speed-change composition, and spell-end fall cleanup
  through explicit caller witnesses.
- The deferred mechanic is already closed as `table-spatial-derivation`:
  automatic elevation state, can-stop-fall derivation, landing legality, and
  map/path geometry remain table/spatial facts.
- `plans/unit-profile-coverage/task-claims.jsonl` records QNT proof and
  completed runtime parity for `L3-FOLLOWUP-FLY-SPECIAL-SPEED-RUNTIME` and
  `L3-FOLLOWUP-FLY-END-FALL-WITNESS`.

## Boundary Decision

Fly does not need a new falling/spatial runtime slice in this task. The
battle-owned spell lifecycle is already promoted: spell resource spending,
willing target admission, Concentration, fixed Fly Speed, hover, movement and
Dash projection, active-effect cleanup, and the spell-end fall handoff all run
through the existing `spell.scalar-buff` reducer path.

The missing facts are not spell-local runtime state. Whether the target is
still aloft, whether it has another way to stop the fall, where it lands, how
far it falls, and which route or terrain facts matter are table/spatial
derivations. Adding Fly-specific elevation, aloft, landing, or can-stop-fall
fields to `BattleState` would duplicate future map and falling-state ownership
and would make contradictory states representable beside the already-promoted
cleanup witness.

The correct boundary is the one already implemented: Fly cleanup removes the
Fly Speed grant and requires a caller/table witness. `notAloft` and
`canStopFall` close the cleanup without falling. `cannotStopFall` hands off to
the existing falling Reaction and Feather Fall landing pipeline without deriving
map elevation or landing legality inside Fly.

## Plan Impact

- L3MSPELL-09 can close as boundary resolved.
- L3MSPELL-10 should remain unchanged; this task did not create a generic
  shapeshift, form-state, or shapechanger owner.
- L3MSPELL-11 should keep Fly's selected-identity and runtime-reachability
  audit in scope, but this task did not find a replay gap in the promoted Fly
  scalar-buff branch.
- L3MSPELL-12 should include this note and the existing Fly ledger claim when
  consolidating spell-boundary evidence.

## Reviewer Loop Convergence

- Round 1: rejected adding Fly-local elevation, aloft, landing, or
  can-stop-fall state. Those facts belong to a table/spatial owner or future
  generic falling owner, not to the Fly spell reducer.
- Round 2: retained the existing promoted scalar-buff and cleanup-witness path.
  The spell-end falling clause is real SRD behavior, but its executable battle
  boundary is an explicit caller witness followed by the existing falling
  Reaction and Feather Fall landing pipeline.
