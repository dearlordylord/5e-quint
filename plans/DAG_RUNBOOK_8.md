# DAG Runbook 8

## Status

Ready for implementation.

This is the final mechanical/rulewise DAG wrap-up before switching back to MCP/product work. It intentionally excludes:

- `dm-override`
- `transcript-port-to-dnd`
- Hellenvald transcript pipeline porting
- generic modifier registries
- broad spell automation / spell AST work

## Purpose

Use:

- [DAG.md](./DAG.md) for dependency truth
- `DAG_RUNBOOK_8.md` for the execution plan

This batch closes the remaining rules-owned caveat from Runbook 6:

- Fire Shield's automatic reactive active-effect payload is still TS-owned.
- Ready-spell payload parity and attack-derived after-damage trigger qualifier parity already landed in `battle.qnt`.
- Fire Shield now needs the same spec-first treatment so the final after-damage reactive effect is not hidden in TypeScript action-surface logic.

## Current Mission

Repository-shaping priority remains:

1. Quint/spec-side correctness and clarity
2. domain language and ownership
3. TypeScript architecture only as support for `1` and `2`

The work should:

- move Fire Shield reactive payload semantics into `creature.qnt` / `battle.qnt`
- update the MBT bridge so TS and Quint agree on the new payload shape
- keep the payload narrow: Fire Shield warm/chill retaliation only, not a generic reaction registry
- update stale mechanical status docs after parity lands
- close mechanical umbrella nodes that no longer have real work

## DAG Completion Percentages

Current scheduler state after Runbook 7 and the partial Runbook 6 parity merge:

- Node count: 50 complete / 54 total = **92.6% complete**, **7.4% left**.
- Mechanical/rulewise DAG: only `fire-shield-reactive-effect-payload-parity` remains as implementation work. That is roughly **97-98% complete**, **2-3% left** effort-weighted.
- Full DAG including product/MCP tail: after this runbook, `dm-override` and `transcript-port-to-dnd` remain intentionally later. Counting them, the full DAG is roughly **88-91% complete**, **9-12% left** effort-weighted because product nodes are heavier than typical mechanical candidates.

Interpretation:

- This runbook should complete the mechanical/rulewise DAG.
- It should not attempt to complete the MCP/product DAG.
- After this runbook lands, the next planning conversation should switch to MCP/product work, starting from `dm-override` only if that is still desired before transcript work.

## Default In-Scope Nodes

1. `fire-shield-reactive-effect-payload-parity`
2. mechanical/rulewise DAG closure pass

## Default Out Of Scope

Do not schedule these in this runbook:

- `dm-override`
- `transcript-port-to-dnd`
- transcript interpretation, audio, buffering, ObservationLog, or Hellenvald porting
- generic `generic-per-attack-type-bonus-surface`
- broad `fighting-styles-in-battle`
- new non-SRD reactions from `PLAN_AUDIT.md` F1
- all-spell reactive payload framework

Reason:

- The user wants to wrap the mechanical/rulewise DAG before switching back to MCP work.
- Fire Shield is the only known mechanical parity exception left from Runbook 6.
- The local SRD 5.2.1 Fighting Style feats are already covered by concrete consumers: Archery, Two-Weapon Fighting, Defense, and Great Weapon Fighting.
- A generic attack-modifier abstraction still lacks real multi-source pressure and should not be invented to make the DAG look cleaner.

## SRD And Architecture Guardrails

Read before implementation:

- [ARCHITECTURE.md](../ARCHITECTURE.md)
- [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md)
- [DAG.md](./DAG.md)
- [DAG_RUNBOOK_6.md](./DAG_RUNBOOK_6.md)
- [plans/available-actions.md](./available-actions.md)
- [creature.qnt](../creature.qnt)
- [battle.qnt](../battle.qnt)
- [packages/core/src/types.ts](../packages/core/src/types.ts)
- [packages/core/src/battle-machine-actions-attack.ts](../packages/core/src/battle-machine-actions-attack.ts)
- [packages/core/src/available-actions.ts](../packages/core/src/available-actions.ts)
- [.references/srd-5.2.1/Spells/Descriptions-E-L.md](../.references/srd-5.2.1/Spells/Descriptions-E-L.md)

Required local SRD anchors:

- Fire Shield creates warm or chill shield effects.
- A creature that hits the shielded creature with a melee attack roll while within 5 feet takes 2d8 Fire damage for chill shield or 2d8 Cold damage for warm shield.
- The retaliation is automatic from the active spell effect; it must not be inferred from a spell name in `available-actions.ts` or MCP.

## Lane A: Fire Shield Reactive Payload Parity

Node:

- `fire-shield-reactive-effect-payload-parity`

Goal:

- give Quint active effects the same narrow reactive payload ownership that TS already uses for Fire Shield, then wire battle after-damage reaction semantics through that owned payload.

Current useful state:

- TS has `ReactiveEffectPayload` in [packages/core/src/types.ts](../packages/core/src/types.ts):
  - `trigger: "meleeHitWithin5ft"`
  - `damageType: "fire" | "cold"`
- TS `ActiveEffect` has optional `reactivePayload`.
- TS `battleAfterDamageReactiveEffect` finds the payload on the damaged creature's active effects and requires:
  - reactor is the damaged creature
  - reactor is eligible in the interrupt window
  - source is within 5 feet of the damaged creature
  - source hit with a melee attack roll
  - event damage type matches the stored payload damage type
- `available-actions.ts` surfaces `TRIGGER_FIRE_SHIELD` from the active-effect payload, not from a spell-name check.
- `battle.qnt` now owns after-damage trigger qualifiers for Hellish Rebuke and Retaliation, but `ActiveEffect` in `creature.qnt` still has no Fire Shield reactive payload equivalent.

Implementation shape:

1. Add a narrow Quint payload type in `creature.qnt`.
   - Use variants, not strings-as-tags, for the trigger/damage choice.
   - Keep it Fire Shield specific or narrowly reactive-effect specific; do not introduce a broad reaction registry.
   - Preserve existing `ActiveEffect` lifecycle fields and parent/dependency metadata.

2. Extend `ActiveEffect` in `creature.qnt`.
   - Add the payload field with a no-payload sentinel variant if needed for total record shape.
   - Update constructors/helpers that create active effects so existing effects default to no reactive payload.
   - Update tests/normalizers that depend on exact record shape.

3. Add or refactor the Quint battle action.
   - Prefer adding a `bAfterDamageReactiveEffect` action if that best mirrors TS.
   - It must inspect the damaged creature's active effects for the stored Fire Shield payload.
   - It must require `sourceWithin5ftOfDamagedCreature`.
   - It must require `sourceHitWithMeleeAttackRoll`.
   - It must apply the stored payload damage type to `ad.damageSource`.
   - It must not infer warm/chill or damage type from a spell name in the action surface.

4. Update MBT bridge and tests.
   - Update ITF decoding / normalization for the new `ActiveEffect` field.
   - Add focused deterministic battle scenario coverage for warm and chill payloads if a suitable existing battle scenario file exists.
   - Update `battle-projection.mbt.test.ts` handlers for the new Quint action if a new action is added.

5. Update stale status docs.
   - [FEATURES.md](../FEATURES.md) currently still describes Hellish Rebuke / Fire Shield / Retaliation as planned. Update only the facts proven by implementation.
   - [DAG.md](./DAG.md) should mark `fire-shield-reactive-effect-payload-parity` complete after code lands.
   - [plans/available-actions.md](./available-actions.md) should no longer describe Fire Shield reactive payload parity as open after it lands.

Non-goals:

- no all-spell reactive-effect framework
- no generic reaction registry
- no transcript/MCP product work
- no broader active-effect lifecycle redesign
- no new non-SRD reactions from `PLAN_AUDIT.md` F1

Stop condition:

- If the implementation reveals that Quint `ActiveEffect` cannot safely carry a narrow payload without a wider effect-shape redesign, stop and write a design note. Do not work around it in TypeScript or MCP.

## Lane B: Mechanical DAG Closure Pass

Goal:

- make the planning artifact truthful after Lane A lands.

Actions after Lane A is implemented and verified:

1. Mark `fire-shield-reactive-effect-payload-parity` complete in [DAG.md](./DAG.md).
2. Update `available-actions-main` notes to say the mechanical/rulewise available-actions frontier is complete.
3. Keep `dm-override` and `transcript-port-to-dnd` as later product/MCP nodes.
4. Keep `fighting-styles-in-battle` closed as an umbrella because all four local SRD Fighting Style feats have concrete battle consumers.
5. Keep `generic-per-attack-type-bonus-surface` closed unless implementation found real multi-source attack-bonus pressure.
6. Update this runbook status to complete with a short result summary.

## Handoff To Coding Agent

Use this instruction shape:

1. Before starting, run `git log --oneline -1 master` and verify your HEAD matches. If not, run `git rebase master`.
2. Read [DAG.md](./DAG.md), [DAG_RUNBOOK_8.md](./DAG_RUNBOOK_8.md), [DAG_RUNBOOK_6.md](./DAG_RUNBOOK_6.md), [ARCHITECTURE.md](../ARCHITECTURE.md), and [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).
3. Read Fire Shield in the local SRD 5.2.1 corpus before changing code.
4. Implement Lane A spec-first: `creature.qnt` / `battle.qnt` before TypeScript bridge adjustments.
5. Preserve the TS rule: Fire Shield comes from active-effect reactive payload, not from spell-name inference in `available-actions.ts` or MCP.
6. Do Lane B only after Lane A has tests and parity validation.
7. Do not implement `dm-override`, transcript work, or generic modifier registries in this runbook.

## Verification

Required:

1. RAW check against the local SRD 5.2.1 Fire Shield text.
2. Quint typecheck or focused Quint tests covering the changed active-effect shape.
3. Focused TS tests for Fire Shield reactive payload projection/execution.
4. Battle MBT Tier 1 after code changes are complete:
   - `cd packages/core && MBT_TRACES=1 MBT_MAX_SAMPLES=1 MBT_STEPS=3 npx vitest run src/battle-projection.mbt.test.ts`
5. `/simplify` convergence, minimum two rounds after implementation.

Use the MBT run rules in [AGENTS.md](../AGENTS.md): one battle MBT at a time, backgrounded with timing wrapper, and no exploratory MBT runs.

## Completion Criteria

This runbook is complete when:

- Fire Shield reactive payload semantics are represented in Quint active effects.
- Battle after-damage Fire Shield retaliation is spec-visible and MBT-bridged.
- TS available-actions and battle execution still derive Fire Shield from the active-effect payload.
- No spell-name inference is added to MCP or the action surface.
- `fire-shield-reactive-effect-payload-parity` is marked complete in [DAG.md](./DAG.md).
- The mechanical/rulewise DAG has no remaining ready/blocked mechanical implementation nodes.
- `dm-override` and `transcript-port-to-dnd` remain explicitly later product/MCP work.
