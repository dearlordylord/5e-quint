# DAG Runbook 7

## Status

Completed on 2026-04-10.

Final shape landed the Runbook 7 lanes as battle-owned facilities and concrete
consumers:

- concentration-linked active effects now carry parent spell/caster dependency
  metadata and teardown removes dependents without broad same-spell deletion
- Defense uses battle-owned `isWearingArmor` plus a named
  `defenseArmorClassBonus`
- Great Weapon Fighting uses explicit weapon damage die faces and rejects
  eligible GWF attacks that omit per-die data
- hidden state lives on the battle combatant as `hiddenDiscoveryDc`; Hide,
  Search, unseen-attacker advantage, attack reveal, and verbal-spell reveal are
  wired without adding a geometry engine

This runbook is intentionally independent of [DAG_RUNBOOK_6.md](./DAG_RUNBOOK_6.md). Runbook 6 closes the remaining available-actions product-surface honesty gaps; Runbook 7 promotes separate SRD/domain facilities that can be worked in parallel without waiting for those action-surface results.

## Purpose

Use:

- [DAG.md](./DAG.md) for dependency truth
- `DAG_RUNBOOK_7.md` for orchestrated coding-agent execution

This batch should promote and implement remaining high-confidence domain facilities that are already grounded in local SRD text and existing repo architecture:

- explicit effect dependency ownership for parent/child teardown
- battle-owned armor-worn state for the Defense fighting style
- battle-owned damage die-face/reroll ownership for Great Weapon Fighting
- battle-owned hidden state for the Hide/Search/unseen-attacker chain

## Current Mission

Repository-shaping priority remains:

1. Quint/spec-side correctness and clarity
2. domain language and ownership
3. TypeScript architecture only as support for `1` and `2`

This batch should:

- add missing battle-owned facts before adding consumers
- keep concrete SRD consumers decomposed instead of reviving broad umbrella nodes
- avoid generic registries, callback modifiers, or product-layer workarounds
- keep spatial facts caller-owned unless the SRD rule specifically requires persistent battle state

## Default In-Scope Nodes

1. `effect-dependency-graph`
2. `parent-child-effect-teardown`
3. `battle-armor-worn-state`
4. `defense-fighting-style-in-battle`
5. `damage-die-face-resolution`
6. `great-weapon-fighting-in-battle`
7. `battle-hidden-state`
8. `hide-stealth-chain`

## Default Out Of Scope

Do not schedule these in the same run unless explicit new research promotes them first:

- `dm-override`
- `transcript-port-to-dnd`
- `generic-per-attack-type-bonus-surface`
- broad `fighting-styles-in-battle` as a single node
- broad spell automation / spell AST work
- broad geometry, map, grid, or line-of-sight engine
- all remaining SRD reactions from `F1`

Reason:

- product-surface work should wait for Runbook 6 to finish the readied-spell and after-damage action-surface gaps
- Runbook 5 proved the fighting-style umbrella should remain decomposed into concrete consumers
- Hide needs persistent hidden state and caller-provided visibility/precondition facts, not a full spatial engine

## SRD And Architecture Guardrails

Read before implementation:

- [ARCHITECTURE.md](../ARCHITECTURE.md)
- [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md)
- [battle/DOMAIN.md](../battle/DOMAIN.md)
- [battle/REQUIREMENTS.md](../battle/REQUIREMENTS.md)
- [PLAN_AUDIT.md](../PLAN_AUDIT.md)
- [FEATURES.md](../FEATURES.md)
- [.references/srd-5.2.1/Feats.md](../.references/srd-5.2.1/Feats.md)
- [.references/srd-5.2.1/Equipment.md](../.references/srd-5.2.1/Equipment.md)
- [.references/srd-5.2.1/Playing-the-Game.md](../.references/srd-5.2.1/Playing-the-Game.md)
- [.references/srd-5.2.1/Rules-Glossary.md](../.references/srd-5.2.1/Rules-Glossary.md)

Required local SRD anchors:

- Defense: while wearing Light, Medium, or Heavy armor, gain +1 AC
- Great Weapon Fighting: when rolling damage for an attack made with a Melee weapon held with two hands, treat any 1 or 2 on a damage die as a 3; weapon must have Two-Handed or Versatile
- Hide: successful DC 15 Dexterity (Stealth) check while Heavily Obscured or behind Three-Quarters/Total Cover and out of enemy line of sight grants Invisible while hidden; check total becomes the DC to find the creature
- Search: Wisdom check, Perception for concealed creature or object
- Unseen attackers/targets: attacking a target you cannot see imposes Disadvantage; when a creature cannot see you, you have Advantage; attacking while hidden gives away your location
- Concentration links: effects from a concentration spell must be removed from linked targets when concentration breaks

## Handoff To Orchestrator

Give the orchestrator this instruction shape:

1. Use [DAG.md](./DAG.md) as the dependency source of truth.
2. Use this file as the execution plan.
3. Land each facility before its consumer.
4. Keep the four lanes separate until final integration.
5. Prefer named battle-owned facts over generic modifier registries.
6. If a lane appears to need a product-layer adapter workaround, stop that lane and return a design note.
7. If Hide appears to need full geometry/line-of-sight ownership, stop at the caller-owned precondition boundary instead of building a map engine.

## Parallelization Plan

### Lane A: Effect Dependency Graph

Nodes:

- `effect-dependency-graph`
- `parent-child-effect-teardown`

Goal:

- give active effects enough explicit identity and dependency ownership to remove dependent child effects when a parent expires, is removed, or concentration breaks

Current useful state:

- `ActiveEffect` already has `spellId` and `casterId`
- battle already removes effects by caster on concentration break
- `battle/DOMAIN.md` already defines Links, including concentration links
- competitor research strongly supports token/effect-linked cleanup as the right shape

Problem to solve:

- `spellId` + `casterId` is enough for current concentration cleanup, but it is not a general dependency graph
- future dependent effects need to distinguish parent identity from same-spell identity
- teardown should remove children because they depend on the parent, not because a helper happened to match spell names broadly

Expected shape:

- add stable battle effect identity, likely an `effectId`
- add optional parent reference or dependency reference on `ActiveEffect`
- add teardown helpers that remove an effect plus descendants across creatures
- preserve current concentration-break behavior as a first consumer, not as a special-case replacement

Likely files:

- [battle.qnt](../battle.qnt)
- [packages/core/src/battle-machine-types.ts](../packages/core/src/battle-machine-types.ts)
- [packages/core/src/battle-machine-creature.ts](../packages/core/src/battle-machine-creature.ts)
- [packages/core/src/battle-machine-helpers.ts](../packages/core/src/battle-machine-helpers.ts)
- [packages/core/src/battle-rules-scenarios.test.ts](../packages/core/src/battle-rules-scenarios.test.ts)
- MBT bridge files if `ActiveEffect` shape changes

Non-goals:

- no generic spell automation tree
- no event-bus subscription system
- no mutable token engine
- no broad rewrite of all active effects

Required tests:

- removing a parent removes a child effect on the same creature
- removing a parent removes a child effect on another creature
- concentration break still removes linked effects
- unrelated same-spell effects from another caster are not removed

### Lane B: Defense Fighting Style

Nodes:

- `battle-armor-worn-state`
- `defense-fighting-style-in-battle`

Goal:

- add the smallest battle-owned armor-worn fact needed to apply the Defense fighting style's +1 AC while wearing Light, Medium, or Heavy armor

Current useful state:

- TS content already has `defenseACBonus(styles, isWearingArmor)`
- battle hand occupancy already owns shield use, but armor worn is not currently a battle combatant fact
- Runbook 5 intentionally did not force Defense through the additive attack modifier seam

Expected shape:

- add battle-owned `isWearingArmor` or `wornArmorCategory` fact to `Combatant` / `BattleCreatureState`
- project the concrete Defense style into a battle-owned AC bonus field, or compute a named `defenseArmorClassBonus` during battle creature projection
- apply the bonus in the battle attack hit comparison, including hit-reaction revalidation paths

Likely files:

- [battle.qnt](../battle.qnt)
- [packages/core/src/features/class-fighter.ts](../packages/core/src/features/class-fighter.ts)
- [packages/core/src/battle-machine-types.ts](../packages/core/src/battle-machine-types.ts)
- [packages/core/src/battle-machine-creature.ts](../packages/core/src/battle-machine-creature.ts)
- [packages/core/src/battle-machine-actions-attack.ts](../packages/core/src/battle-machine-actions-attack.ts)
- [packages/core/src/battle-rules-scenarios.test.ts](../packages/core/src/battle-rules-scenarios.test.ts)

Non-goals:

- no armor inventory/don/doff system
- no full AC formula rewrite
- no Monk/Barbarian Unarmored Defense redesign
- no generic AC modifier registry

Required tests:

- Defense adds +1 AC while wearing Light, Medium, or Heavy armor
- Defense adds no AC while unarmored
- non-Defense fighter in armor gains no style bonus
- Shield and Shield spell interactions still stack through their existing SRD mechanisms without absorbing Defense into a generic registry

### Lane C: Great Weapon Fighting

Nodes:

- `damage-die-face-resolution`
- `great-weapon-fighting-in-battle`

Goal:

- add battle-owned damage die-face ownership so Great Weapon Fighting can treat 1 or 2 on eligible damage dice as 3

Current useful state:

- TS content already has `gwfDamageDie(styles, dieResult)`
- battle attack resolution currently receives aggregate `damage`, which loses individual die faces
- hand occupancy and weapon property-aware resolution already know whether the attack is melee, held with two hands, and Two-Handed/Versatile eligible

Expected shape:

- change the relevant battle attack event/resolution path to carry enough damage die-face data for weapon damage dice
- apply Great Weapon Fighting before flat modifiers, Sneak Attack additions, resistance/vulnerability/immunity, and after-damage reactions
- keep the feature as a concrete battle-owned rule, not a generic reroll/reroute callback

Likely files:

- [battle.qnt](../battle.qnt)
- [packages/core/src/features/class-fighter.ts](../packages/core/src/features/class-fighter.ts)
- [packages/core/src/battle-machine-events.ts](../packages/core/src/battle-machine-events.ts)
- [packages/core/src/battle-machine-types.ts](../packages/core/src/battle-machine-types.ts)
- [packages/core/src/battle-machine-actions-attack.ts](../packages/core/src/battle-machine-actions-attack.ts)
- [packages/core/src/battle-rules-scenarios.test.ts](../packages/core/src/battle-rules-scenarios.test.ts)
- MBT bridge files if battle event shape changes

Non-goals:

- no full dice-provenance combat log
- no general reroll engine
- no spell-damage die rewrite
- no Great Weapon Master feat rollout

Required tests:

- eligible melee attack held with two hands treats weapon damage die result 1 as 3
- eligible melee attack held with two hands treats weapon damage die result 2 as 3
- result 3+ is unchanged
- one-handed Versatile use does not gain the benefit
- non-Two-Handed/non-Versatile weapon does not gain the benefit
- ranged weapon attack does not gain the benefit

### Lane D: Hidden State And Hide/Search Chain

Nodes:

- `battle-hidden-state`
- `hide-stealth-chain`

Goal:

- add the smallest battle-owned hidden state needed for Hide, Search, unseen-attacker advantage, unseen-target disadvantage, and attack/spell breakage

Current useful state:

- `invisible` condition already exists and affects attack advantage/disadvantage
- TS Rogue content already knows Cunning Action can choose `hide`
- local SRD text gives a concrete Hide precondition and Search Perception detection path

Problem to solve:

- the repo currently has Invisible as a condition, but Hidden is not equivalent to Invisible
- Hide grants Invisible while hidden and stores a check total as the DC to find the creature
- Hidden ends when the creature makes a sound louder than a whisper, an enemy finds it, it makes an attack roll, or it casts a spell with a Verbal component

Expected shape:

- add battle-owned hidden state keyed by hidden creature, including the Hide check total / discovery DC
- make Hide consume an action and use caller/runtime-provided facts for:
  - Stealth check total
  - whether the creature is Heavily Obscured or behind Three-Quarters/Total Cover
  - whether it is out of enemy line of sight
- make Search use caller/runtime-provided Wisdom (Perception) check total against the stored DC
- add attack-resolution effects:
  - hidden attacker gets the appropriate unseen-attacker advantage through the existing modifier pipeline
  - hidden attacker loses hidden state after the attack hits or misses
  - attacking a target the attacker cannot see imposes Disadvantage through a caller-owned or battle-owned sight fact for that attack

Likely files:

- [battle.qnt](../battle.qnt)
- [packages/core/src/battle-machine-types.ts](../packages/core/src/battle-machine-types.ts)
- [packages/core/src/battle-machine-events.ts](../packages/core/src/battle-machine-events.ts)
- [packages/core/src/battle-machine-actions-turn.ts](../packages/core/src/battle-machine-actions-turn.ts)
- [packages/core/src/battle-machine-actions-attack.ts](../packages/core/src/battle-machine-actions-attack.ts)
- [packages/core/src/features/class-rogue.ts](../packages/core/src/features/class-rogue.ts)
- [packages/core/src/battle-rules-scenarios.test.ts](../packages/core/src/battle-rules-scenarios.test.ts)
- available-actions files only if this lane also exposes Hide/Search tokens; otherwise defer token surfacing

Non-goals:

- no map/grid engine
- no full line-of-sight ownership model
- no cover system rollout beyond caller-owned Hide precondition facts
- no broad stealth exploration rules
- no Supreme Sneak / Stealth Attack consumer unless the base hidden state lands cleanly first

Required tests:

- successful Hide stores hidden state and applies Invisible while hidden
- failed Hide does not store hidden state
- Search with Perception total at or above the stored DC removes hidden state
- Search below the stored DC does not remove hidden state
- hidden attacker gains the unseen-attacker advantage source and loses hidden state after the attack
- attacking a target the attacker cannot see imposes Disadvantage

## Merge Order

1. Lane A facility: `effect-dependency-graph`
2. Lane B facility: `battle-armor-worn-state`
3. Lane C facility: `damage-die-face-resolution`
4. Lane D facility: `battle-hidden-state`
5. Lane A consumer: `parent-child-effect-teardown`
6. Lane B consumer: `defense-fighting-style-in-battle`
7. Lane C consumer: `great-weapon-fighting-in-battle`
8. Lane D consumer: `hide-stealth-chain`

Parallelization rule:

- The four facility lanes may be implemented in parallel if workers coordinate shared files such as `battle.qnt`, battle type definitions, and MBT bridge mapping.
- Each consumer must wait for its own facility.
- Final integration should be single-owner because all four lanes touch battle state shape and scenario tests.

## Stop Conditions

Stop the affected lane and return a design note instead of pushing through if any of these become necessary:

1. adding generic modifier registries or callback evaluators
2. adding a full spell/effect automation tree
3. adding a map/grid/line-of-sight engine
4. adding product-surface `dm-override` or transcript behavior
5. widening Hide into every stealth-adjacent rogue feature before base hidden state is stable
6. widening Great Weapon Fighting into full damage-provenance logging
7. rewriting all AC calculation just to support Defense

## Questions To Resolve For Later Runbooks

Record short answers in the PR description or follow-up DAG notes if implementation makes them clear.

1. Does explicit effect dependency identity also simplify Runbook 6's `Fire Shield` reactive payload, or should that remain a narrow active-effect payload?
2. Does Defense prove `wornArmorCategory` is enough, or is a richer armor equipment model needed before additional armor features?
3. Does Great Weapon Fighting reveal broader dice-provenance pressure, or is a local weapon-die-face event shape enough?
4. Does base hidden state unblock `Search`, `Cunning Action: Hide`, and unseen-attacker semantics without a geometry engine?
5. Is `fighting-styles-in-battle` still useful as an umbrella after Defense and Great Weapon Fighting land, or should the DAG retire it in favor of concrete done nodes?

## Verification Floor

Minimum acceptable validation for the full run:

1. RAW check against local SRD 5.2.1 passages cited above
2. focused battle scenario tests for each lane
3. `pnpm --filter @dnd/core exec tsc --noEmit`
4. `pnpm exec quint typecheck battle.qnt`
5. Tier 1 battle MBT if battle state/event/bridge semantics materially change
6. minimum two `/simplify` rounds, continuing until convergence if either round finds important fixes

## Exit Criteria

This runbook is complete when:

- effect dependency identity exists and parent/child teardown works without deleting unrelated effects
- Defense works in battle through a named armor-worn ownership seam
- Great Weapon Fighting works in battle through damage die-face ownership
- Hide/Search/hidden state works in battle without a geometry engine
- no generic modifier registry, spell AST, product-surface workaround, or broad spatial engine was introduced
