# Promoted Battle Runtime MBT Strategy

Date: 2026-05-01

Task: BA10 - Define Promoted Runtime MBT Strategy.

This strategy applies to promoted `@dnd/battle-runtime` behavior after BA8 made
`packages/battle-runtime/battle-runtime.qnt` the canonical package-local spec.
It does not widen battle behavior and does not make old Core battle MBT the
default proof shape again.

## Decision

Promoted battle proof is layered by boundary:

| Boundary | Default proof shape | Why |
| --- | --- | --- |
| Small reusable reducer algebra | Modular Quint MBT in `packages/surface-runtime-correction/*-mbt.qnt` replayed against `@dnd/shared-algebras` modules | These models stay small, fast, and focused on algebraic state transitions. |
| Package-local battle-runtime behavior | `battle-runtime.qnt` self-tests plus generated deterministic parity assertions | The package-local spec is the canonical reference for implemented runtime facts, but assertions alone do not explore composed public reducer traces. |
| Broad Surface, Unit, Spell, and Stat Block catalog coverage | Table-driven contract tests for decode, support gates, projected battle init, available subjects, holes, and unsupported-frontier results | Ordinary catalog entries should prove their contract without multiplying every authored record by every battle state. |
| Selected composed battle-runtime flows | Narrow integrated QNT/MBT against public `@dnd/battle-runtime` APIs | Trace generation is reserved for high-risk interactions where discovery, replay holes, action resources, damage, and snapshots must move together. |
| Surface projection MBT | Separate future decision | Battle-runtime MBT starts from battle-runtime inputs and subjects. It does not implicitly decide whether Surface projection contracts need MBT. |

The integrated layer must stay selective. It exists to prove composition through
`discoverBattleActs`, `resolveBattleSubject`, and `snapshotBattle`; it is not a
new giant Core-style battle model and is not a per-authored-Unit test mandate.

## Selection Criteria

Add integrated battle-runtime MBT when a promoted behavior meets most of these
conditions:

- It is already implemented and deterministically tested.
- It crosses at least two reducer responsibilities, such as discovery plus
  hole replay, action economy plus damage, or Unit/Stat Block origin facts plus
  battle-owned state.
- A nondeterministic trace can expose ordering, replay, or state-transition
  mistakes that isolated assertions would miss.
- The state space can stay small with one or two combatants and bounded fills.

Prefer table-driven contract tests instead when the change is ordinary catalog
width: another weapon, spell, Unit, or Stat Block that exercises an already
proved reducer family without changing its semantic shape.

Do not use integrated MBT to prove old-only Core breadth before that behavior is
restored in the promoted runtime. Old root `battle.qnt` and Core MBT remain
reference/proof source material, not active promoted authority.

## BA11 Candidate

BA11 should add the first integrated promoted battle-runtime MBT for:

**Fighter weapon Attack against a Skeleton Stat Block target.**

Minimum trace frontier:

- initialize a two-combatant battle from promoted battle-runtime inputs;
- discover the current Fighter's public `action.attack` subject;
- replay the selected Attack through target, attack-roll, and damage holes;
- cover at least hit and miss branches;
- on hit, apply action spend, supported weapon damage, Skeleton Bludgeoning
  vulnerability when the selected weapon damage type is Bludgeoning, HP clamp,
  and snapshot projection;
- reject stale or illegal replay state through the public result shape when the
  trace chooses an invalid fill.

This is the first candidate because it graduates the already implemented
weapon-attack reducer path from package-local `.qnt` assertions and
deterministic tests toward trace-driven parity. It composes public discovery,
hole replay, attack-roll adjudication, runtime dice validation, action-economy
spend, Stat Block damage modifiers, HP mutation, and snapshot projection. Those
facts are intentionally spread across runtime helpers and shared algebras, so
the integrated trace adds coverage that a pure algebra MBT cannot provide.

BA11 should not include Action Surge, Magic Missile, Ray of Frost, MCP transient
fill storage, or Surface projection MBT in the first integrated test. Those are
valid later candidates after the first promoted MBT shape exists.

## Later Candidates

After BA11 establishes the integrated runner shape, good follow-up candidates
are:

- Action Surge: Unit-feature discovery, no-hole resolution, restricted extra
  action grant, use-count spend, and once-per-turn rejection.
- Magic Missile: actionSpell discovery, target and damage holes, Magic action
  spend, Force damage, and level-1 Spell Slot expenditure.
- Ray of Frost: spell attack hit/miss, no slot spend, Cold damage, Critical Hit
  dice, Speed effect refresh, and start-of-caster-turn expiry.

Each later candidate should be added only when its trace interactions justify
MBT over deterministic tests.

## Verification Notes

This task is documentation and planning only. It changes no D&D rule model,
runtime reducer behavior, QNT semantics, or test command. No battle MBT should
be run for this task.

Source-only checks:

- Cross-checked the selected candidate against
  `plans/battle-runtime-proof-coverage.md` and
  `packages/surface-runtime-correction/MBT_TO_REDUCER_GRAPH.md`.
- Cross-checked public reducer API names against
  `packages/battle-runtime/README.md` and
  `packages/battle-runtime/ARCHITECTURE_GRAPH.md`.
- Verified the strategy does not require per-authored-Unit MBT, rebuild old Core
  battle MBT, or make Surface projection MBT implicit in battle-runtime MBT.

`/simplify` convergence:

- Round 1 found one missing verification-record issue from review and fixed it
  by adding these source-only checks and convergence notes.
- Round 2 found no remaining task-scope simplification, duplication, or
  plan-handoff changes.
