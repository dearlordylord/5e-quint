# Ecosystem Map

This synthesis is ranked by **mining value for our Quint/XState/MBT stack**, not by general popularity.

## Ranked Ecosystem Map By Mining Value

1. **`foundryvtt-dnd5e`**  
   Best source for action vocabulary, action-scoped data shape, activity lifecycles, active-effect mutation semantics, and the field inventory a real 5e UI expects.
2. **`midi-qol`**  
   Best source for workflow orchestration, hook choreography, concentration automation, reaction timing, late targeting, and the ugly reality of integration glue.
3. **`dae`**  
   Best source for effect expiry policy, stacking semantics, derived-field mutation, and the operational shape of Active Effect power-user tooling.
4. **`avrae`**  
   Best source for JSON-serializable automation trees, metavars, parent/child effect cleanup, and content-as-data spell automation.
5. **`natural_20`**  
   Best source for seeded scenario fixtures, resolve/commit separation, and battle cases that are easy to turn into deterministic replays.
6. **`dnd_engine`**  
   Best source for explicit event phases, condition lifecycles, modifier channels, and interrupt-window decomposition.
7. **`opencombatengine`**  
   Best source for subsystem decomposition, stat pipelines, reaction wiring, and interface-first design.
8. **`Level Up: Advanced 5th Edition`** (`foundry-level-up-a5e`)  
   Best source for richer action modeling, contextual bonuses, effect panels, and content-centric automation UX.
9. **`PF2e`**  
   Best source for predicate-driven rule expression, action glyphs, roll-option discipline, and a mature content/license boundary.
10. **`boardgame.io`**  
   Best source for pure move reducers, phase/turn staging, server-authoritative logs, replay, and bot-friendly state flow.
11. **`XMage`**  
   Best source for replay/test-mode culture, stack/trigger discipline, and authoritative server/client separation at large scale.
12. **`open5e-api`**  
   Best source for content-corpus pipelines, schema-driven SRD ingestion, and provenance-aware publishing mechanics.
13. **`5e-srd-api`**  
   Best source for normalized SRD API shape, versioned data surfaces, and the field inventory expected by downstream consumers.
14. **`libsrd5`**  
   Best source for simple procedural 5.1-era rule coverage and a concrete contrast case for what not to keep.
15. **`DnDSimulator`**  
   Best source for combat-simulation fixtures, but too mutable and too heuristic to trust as a semantic reference.
16. **`dnd-5e-core`**  
   Best source for content-normalization noise and prose-parsing edge cases.
17. **`cmdli/dndsim`**  
   Best source for 2024 DPR snapshots, mastery hooks, and lightweight damage-curve regression ideas.
18. **`Py5e`**  
   Mostly a negative control.

## Shortlist

These are the systems I would actually mine first and what each is useful for:

- `foundryvtt-dnd5e`: action schema, activity lifecycle, condition/effect lookup tables, resource consumption, actor/item field discovery.
- `midi-qol`: workflow state machine design, hook ordering, concentration and reaction edge cases, late targeting, chat-card side effects.
- `dae`: effect expiry, stackability, special-duration rules, derived-field mutation, actor/item-linked active effects.
- `avrae`: effect trees, metavars, recursive spell automation, parent/child cleanup, one-shot resource spending.
- `natural_20`: seeded replays, death saves, Shield, Shocking Grasp, Ray of Frost, grapple/shove, resistance/vulnerability.
- `dnd_engine`: phase boundaries, condition injection/removal, modifier channel decomposition, opportunity attacks.
- `opencombatengine`: stat pipelines, reaction interfaces, optional grid boundary, Result-style action outcomes.
- `foundry-level-up-a5e`: contextual bonus system, actions-per-item, condition UI, grants, spellbook structure.
- `PF2e`: predicate language, roll options, action glyphs, strong content and rule packaging discipline.
- `boardgame.io`: pure reducers, turn/phase structure, logs/time travel, bot integration.
- `XMage`: replay/test harness culture and authoritative server state under a complex rules engine.

## Pattern Taxonomy

### Modeling

- **Action taxonomy**: `foundryvtt-dnd5e` and `PF2e` are the strongest examples of named, typed action vocabularies instead of ad hoc commands.
- **Effect lifecycle**: `dae`, `midi-qol`, `avrae`, and `opencombatengine` all model ongoing effects as first-class state with duration, cleanup, and removal paths.
- **Modifier composition**: `dnd_engine` is the most explicit modifier algebra; `foundry-level-up-a5e` is the most usable contextual bonus system; `DAE` is the most flexible mutation layer.
- **Provenance vs structured input vs runtime projection**: `open5e-api` and `5e-srd-api` are the clearest reminders that content corpus shape is not mechanics shape and neither is runtime state.
- **Condition semantics**: the field clusters around two approaches. One is central lookup tables (`foundryvtt-dnd5e`, `DAE`, `A5E`). The other is scattered inline checks (`natural_20`, `libsrd5`). The first is the only one worth imitating.

### Runtime

- **State machine / phase pipeline**: `dnd_engine`, `midi-qol`, `boardgame.io`, and `natural_20` all split intent, resolution, and commit in different ways.
- **Hook choreography**: `midi-qol`, `DAE`, `foundryvtt-dnd5e`, and `A5E` show that integrations live or die on hook ordering and cancellation semantics.
- **Replay and logs**: `boardgame.io` and `XMage` push hard on logs, replays, and deterministic rehydration. That is the right mental model for our ITF/MBT posture.
- **Automation trees**: `avrae` proves that a content tree can be more expressive than a flat command API, but only if the tree is serializable and strongly bounded.

### Separation

- **Platform-shaped engines**: `foundryvtt-dnd5e`, `midi-qol`, `DAE`, `PF2e`, and `A5E` are useful because they show what happens when rules live inside a host platform. The downside is obvious: the platform leaks everywhere.
- **Pure library engines**: `boardgame.io`, `opencombatengine`, and parts of `dnd_engine` show the opposite end of the spectrum. This is the only direction that really helps our spec/runtime split.
- **Content pipelines**: `open5e-api` and `5e-srd-api` separate data normalization from game logic better than most engine repos, even if they are not combat engines.

### Licensing

- **Safe implementation references**: MIT and Apache-licensed repos are the easiest places to mine structure from. That includes `foundryvtt-dnd5e`, `boardgame.io`, `natural_20`, `opencombatengine`, and `5e-srd-api`.
- **Content-corpus references**: `PF2e`, `A5E`, `open5e-api`, and `5e-srd-api` are valuable for schema and content shape, but they are not mechanics authorities for our SRD model.
- **Copyleft caution**: `avrae`, `libsrd5`, and `rpg-toolkit` are still useful as ideas, but they should be treated as architecture references, not code-copy candidates.

### Verification

- **Best verification posture overall**: our own Quint + MBT stack still stands alone.
- **Closest operational analogs**: `natural_20` for scenario tests, `boardgame.io` for replay/time travel, `XMage` for test-mode setup, `opencombatengine` for test breadth.
- **Weak or absent verification**: `foundryvtt-dnd5e`, `midi-qol`, `DAE`, and `dnd_engine` are architecturally interesting but not verification-rich.

## Scenario-Mining Targets By Likely Import Path

### `creature.qnt`

- `natural_20`: death saves fail / stabilize / nat 20 recovery.
- `natural_20`: resistance vs vulnerability damage.
- `natural_20`: prone target melee advantage / ranged disadvantage.
- `natural_20`: grapple apply / escape / release on incapacitation.
- `natural_20`: Ray of Frost speed reduction and expiry.
- `natural_20`: Chill Touch healing lockout and expiry.
- `natural_20`: Mage Armor persistence and removal.
- `cmdli/dndsim`: Vex / Hunter's Mark cleanup and short-rest expiry if we want a 2024-style effect fence.
- `DAE` / `midi-qol`: turn-start / turn-end expiry and concentration cleanup cases.

### `battle.qnt`

- `natural_20`: basic attack miss/hit/kill loop.
- `natural_20`: Shield reaction and Magic Missile negation.
- `natural_20`: Shocking Grasp removes reaction.
- `opencombatengine`: opportunity attack consumes reaction when enemy leaves reach.
- `dnd_engine`: movement-triggered opportunity attack and phase cancellation.
- `midi-qol`: late targeting, workflow gating, reaction timing, and concentration checks on damage.
- `boardgame.io`: phase/turn transitions as a model for explicit turn staging.

### `packages/core/src/battle-machine.mbt.test.ts`

- `natural_20`: basic attack replay.
- `opencombatengine`: reaction consumption.
- `midi-qol`: workflow ordering and post-attack hooks.
- `cmdli/dndsim`: extra-attack and mastery-triggered follow-up action sequences.

### `packages/core/src/inspiration-battle-scenarios.test.ts`

- `natural_20`: Shield, Magic Missile, Ray of Frost, Expeditious Retreat.
- `DnDSimulator`: concentration-linked cleanup for Hex, Hunter's Mark, summons, Polymorph.
- `avrae`: parent/child effect teardown and effect-granted attacks.
- `cmdli/dndsim`: Graze, Topple, Vex, Nick, Improved Critical.

### `packages/core/src/inspiration-scenarios.test.ts`

- `open5e-api`: content-shape and provenance assertions.
- `5e-srd-api`: normalized SRD field inventory checks.
- `PF2e`: action/condition taxonomy imports as a vocabulary audit, not as mechanics.
- `foundry-level-up-a5e`: action/contextual-bonus shape review.

### `scripts/qa/`

- `open5e-api`: schema/provenance normalization.
- `5e-srd-api`: API contract assertions.
- `PF2e` and `A5E`: content packaging and field discovery checks.

## What Changes Our Thinking

- **The center of gravity in the ecosystem is not “combat resolution”; it is “effect lifecycle.”** `midi-qol`, `DAE`, `avrae`, and `A5E` all spend more design energy on effect creation, expiry, cleanup, and integration hooks than on raw attack math.
- **A mature action model is item-scoped, not character-scoped.** `foundryvtt-dnd5e` and `A5E` make items the container for multiple action variants. That is the right mental model for class features, weapons, and spells in our codebase too.
- **Deterministic replay is the real dividing line.** `boardgame.io` and `XMage` show that if you want serious state debugging or AI, you need logs/replay/test modes. Our ITF/MBT setup is the stronger version of that idea.
- **Predicate/roll-option style modeling is a better fit than ad hoc boolean flags.** `PF2e` shows how much cleaner rules become when selectors are explicit and reusable.
- **Content corpora need stricter provenance boundaries than most engines bother with.** `open5e-api` and `5e-srd-api` reinforce that structured data, provenance, and runtime state should not be conflated.

## What To Mine / What To Ignore / What To Imitate / What To Avoid

### What To Mine

- Condition/effect lifecycle patterns from `DAE`, `midi-qol`, and `avrae`.
- Item-scoped action models from `foundryvtt-dnd5e` and `A5E`.
- Predicate and roll-option discipline from `PF2e`.
- Seeded scenario fixtures from `natural_20`.
- Replay/log ideas from `boardgame.io` and `XMage`.
- Provenance-aware content pipelines from `open5e-api` and `5e-srd-api`.

### What To Ignore

- UI-heavy code paths that only exist because they are inside Foundry.
- Mutable object graphs presented as if they were a correctness strategy.
- Heuristic prose parsing as a replacement for typed SRD content.
- Negative-control repos like `Py5e` except as a reminder of how little signal an underspecified engine provides.

### What To Imitate

- Explicit phase boundaries.
- First-class effect cleanup.
- Logged, replayable, server-authoritative state transitions.
- Strong separation between structured input and runtime projection.
- Action vocabularies that are stable enough to drive UI, tests, and content import.

### What To Avoid

- Dual-path condition logic.
- Hidden mutable registries.
- “Works in the UI” as a proxy for semantic correctness.
- Treating content packs as proof of rules correctness.
- Copying platform-coupled architectures into a spec-first project.

