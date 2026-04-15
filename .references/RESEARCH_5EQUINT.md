# Research: 5EQuint Patterns To Take

Scope:

- Read the newly generated `RESEARCH_*.md` set against this repo's actual architecture.
- Focus on importable patterns for `battle.qnt`, `creature.qnt`, the battle XState runtime, projection seams, and verification.
- Exclude generic ecosystem praise and platform-specific noise.

Primary local inputs:

- [`ARCHITECTURE.md`](../ARCHITECTURE.md)
- [`battle.qnt`](../battle.qnt)
- [`creature.qnt`](../creature.qnt)
- [`packages/core/src/types.ts`](../packages/core/src/types.ts)
- [`packages/core/src/machine-types.ts`](../packages/core/src/machine-types.ts)
- [`packages/core/src/battle-machine-types.ts`](../packages/core/src/battle-machine-types.ts)
- [`packages/core/src/battle-machine-actions-turn.ts`](../packages/core/src/battle-machine-actions-turn.ts)
- [`RESEARCH_ecosystem_map.md`](./RESEARCH_ecosystem_map.md)
- [`RESEARCH_pf2e_rule_elements.md`](./RESEARCH_pf2e_rule_elements.md)
- [`RESEARCH_foundry_effect_staging.md`](./RESEARCH_foundry_effect_staging.md)
- [`RESEARCH_runtime_replay_patterns.md`](./RESEARCH_runtime_replay_patterns.md)
- [`RESEARCH_verification_scenario_mining.md`](./RESEARCH_verification_scenario_mining.md)
- [`RESEARCH_content_packaging_boundaries.md`](./RESEARCH_content_packaging_boundaries.md)
- [`RESEARCH_srd_payload_and_licensed_packs.md`](./RESEARCH_srd_payload_and_licensed_packs.md)

## Executive Takeaway

This project already has the correct top-level architecture. The authoritative spec in `battle.qnt`, the runtime commit layer in the battle XState machine, and the projection seam through `InitCreatureConfig -> BattleCreatureState` are all stronger than the dominant patterns in the ecosystem.

The useful imports are therefore not whole architectures. They are a small set of structural patterns:

- closed mechanic vocabularies instead of open scripting;
- staged effect lifecycle with explicit cleanup;
- projection-time derivation instead of duplicated runtime state;
- replay-first deterministic scenario infrastructure;
- hard provenance boundaries for packaged content.

The main discipline is to strengthen the current architecture, not replace it.

## What Already Fits

### Spec authority plus commit layer

`ARCHITECTURE.md` already states the right ownership rule: `battle.qnt` is authoritative for combat semantics, and the XState battle machine commits those outcomes at runtime. That is the best version of the "phase-owned runtime" pattern found in the external corpus because parity is checked against a separate model rather than inferred from tests alone.

Import conclusion:

- keep semantic ownership in Quint;
- keep runtime ownership in the battle machine;
- reject any pattern that tries to move correctness back into mutable runtime helpers.

### Projection seam is already the right boundary

The project already has the most important separation boundary most engines lack:

- source-owned authored truth;
- `InitCreatureConfig` as battle participation projection;
- `BattleCreatureState` as battle-owned runtime fact.

That seam appears in `ARCHITECTURE.md` and in `buildCreatureState()` in `packages/core/src/battle-machine-actions-turn.ts`. This is the correct place to import patterns from PF2E and content-packaging systems: not by adding runtime registries, but by improving source-to-battle compilation.

### Active effect shape is already importable

`creature.qnt` and `packages/core/src/types.ts` already define a compact effect core:

- `spellId`
- `turnsRemaining`
- `expiresAt`
- `casterId`
- `startOfTurnHook`
- `endOfTurnHook`
- optional reactive payload

That is already closer to a durable formal model than Foundry's string-path mutation approach. The right move is to deepen this model, not replace it with hook registries or document-patch effects.

## Patterns To Take

### 1. Closed mechanic contribution vocabularies

Best source:

- [`RESEARCH_pf2e_rule_elements.md`](./RESEARCH_pf2e_rule_elements.md)

PF2E's useful lesson is not "use RuleElement classes." The useful lesson is "content contributes through a finite mechanic vocabulary."

Important caveat:

- PF2E is still a bad architectural fit for this repo in one major way: it is deeply OOP, mutation-heavy, and lifecycle-callback driven.
- The import is the closed mechanic vocabulary and staging discipline, not the object model, not the mutable actor-preparation pipeline, and not the class-heavy runtime style.

For this repo, the import path is:

- define typed contribution records in the TS feature/projection layer;
- keep the set closed and explicit;
- project those contributions into battle-owned runtime facts only when battle semantics require them.

This fits the repo better than open-ended effect expressions or plugin-installed runtime rules.

Examples of the right direction in the existing code:

- `readyableSpellPayloads`
- `battleReactionOptions`
- `battleBonusActionOptions`
- owned battle weapon payloads

Design rule:

- if a mechanic matters in battle, represent it as a typed contribution or payload;
- do not encode it as arbitrary script, macro text, or string-key mutation.

### 2. Synthetic bag, but only at projection time

Best source:

- [`RESEARCH_pf2e_rule_elements.md`](./RESEARCH_pf2e_rule_elements.md)

PF2E's `synthetics` pattern is valuable if narrowed aggressively. The transfer is:

- source layers may compute derived contributions in a temporary structured bag;
- those contributions are then compiled into battle/runtime facts;
- battle does not maintain a second floating derived bag beyond its owned state.

This matters because the repo explicitly forbids redundant state. The "synthetic bag" is only safe if it is an intermediate compile step, not a second owner.

Import rule:

- use synthetic-style accumulation in source compilers;
- do not add a second mutable contribution layer inside battle state.

### 3. Explicit apply / expire / cleanup phases for effects

Best source:

- [`RESEARCH_foundry_effect_staging.md`](./RESEARCH_foundry_effect_staging.md)

The strongest transferable lesson from Foundry + DAE + Midi-QOL is not hooks. It is phase ownership:

- effect becomes active at a known point;
- effect contributes known state while active;
- effect expires at a declared phase;
- cleanup is explicit, not incidental.

This already matches the current `ActiveEffect` direction in `creature.qnt` and `types.ts`.

Import rule:

- every new effect must name its activation point, expiry point, and cleanup behavior;
- if an effect cannot state those clearly, it is underspecified for this engine.

This is especially important for:

- concentration cleanup;
- reaction-granted temporary state;
- start/end-of-turn damage or condition processing;
- one-shot reactive effects that must remove themselves symmetrically.

### 4. Item-scoped or feature-scoped action payloads

Best sources:

- [`RESEARCH_ecosystem_map.md`](./RESEARCH_ecosystem_map.md)
- [`RESEARCH_foundry_effect_staging.md`](./RESEARCH_foundry_effect_staging.md)

Foundry dnd5e and A5E are right about one thing: actions belong closer to the spell, weapon, or feature payload than to a giant flat creature switchboard.

This repo should import that idea in a spec-first form:

- model action-capable content as typed payloads;
- project only the battle-facing pieces needed at runtime;
- let battle resolve actions over those payloads rather than accumulating more creature-wide ad hoc flags.

Good examples already present:

- battle-owned weapon profiles;
- readyable spell payloads;
- reaction option payloads;
- monster action option payloads.

This is the direction to continue.

### 5. Replay-first deterministic scenario infrastructure

Best sources:

- [`RESEARCH_runtime_replay_patterns.md`](./RESEARCH_runtime_replay_patterns.md)
- [`RESEARCH_verification_scenario_mining.md`](./RESEARCH_verification_scenario_mining.md)

The runtime architecture itself should not become `boardgame.io` or XMage. But the verification tooling should steal aggressively from them.

Importable patterns:

- trace IDs and seed visibility;
- compact deterministic scenario setup;
- small replayable action sequences;
- scenario injection that bypasses irrelevant setup;
- a human-authored scenario layer separate from MBT traces.

This fits the current repo well because:

- MBT already proves parity;
- deterministic scenario tests already exist;
- the missing leverage is better replay ergonomics and smaller, more explicit fixtures.

### 6. Hard provenance boundaries for content packages

Best sources:

- [`RESEARCH_content_packaging_boundaries.md`](./RESEARCH_content_packaging_boundaries.md)
- [`RESEARCH_srd_payload_and_licensed_packs.md`](./RESEARCH_srd_payload_and_licensed_packs.md)

The repo's provenance rules in `AGENTS.md` are already stricter than most external systems. The import here is repository topology:

- keep SRD-shipped facts in an SRD-only payload boundary;
- keep structured input sources separate from provenance;
- keep runtime projection types separate from both;
- if non-SRD packs ever exist, give them separate artifacts and manifests.

Do not allow one runtime loader to normalize mixed-provenance content into a single undifferentiated bucket.

## Patterns To Avoid

### 1. Arbitrary path mutation

Foundry-style `ActiveEffect` path patching is flexible, but it is the opposite of the repo's modeling discipline. It hides ownership, weakens parity, and makes invalid states representable.

Avoid:

- arbitrary dot-path effect mutations;
- generic "set any field" effect payloads;
- effect definitions whose semantic target is discoverable only at runtime.

### 2. Hook-heavy ambient semantics

Midi-QOL and DAE are useful because they expose hard problems. They are not useful as a design to copy.

Avoid:

- ambient hook webs;
- semantics distributed across plugin callbacks;
- hidden ordering dependencies between modules;
- cleanup rules that depend on matching opaque hook names.

The spec should own interrupt points explicitly instead.

### 3. Runtime plugin systems for mechanics

PF2E's registry is interesting, but this repo should not optimize for third-party mechanic extensibility. The SRD semantic frontier is intentionally closed.

Avoid:

- user-registered rule implementations;
- plugin-defined effect semantics;
- runtime extension points that can change battle semantics without spec changes.

### 4. Mixed-provenance loaders

The 5etools-style "merge everything in one loader" pattern is exactly what this repo should avoid.

Avoid:

- one content bucket containing SRD, structured inputs, homebrew, prerelease, and optional packs;
- loaders that erase provenance distinctions;
- schemas that can represent contradictory provenance.

### 5. Giant string-command scenario APIs

XMage's scripted harness is useful as inspiration for scenario setup, not as the surface to reproduce.

Avoid:

- stringly typed runtime scenario languages;
- runtime APIs that hide semantics behind textual commands;
- broad fixture vocabularies that become a second engine.

Prefer typed scenario builders or compact declarative fixtures.

## Concrete Recommendations For This Repo

### Strengthen the projection layer

Add more typed mechanic contribution records at the source-to-battle boundary instead of threading additional one-off booleans or duplicative fields directly through battle.

Practical rule:

- when a new rule appears, first ask whether it should be represented as a typed payload or contribution record in the projector;
- only then decide which battle-owned fields are the minimal persistent facts needed to resolve it.

### Make effect lifecycle stricter

For every new effect added to `creature.qnt`, `battle.qnt`, and the TS mirror:

- declare activation timing;
- declare expiry timing;
- declare cleanup semantics;
- declare whether it contributes static state, turn hooks, or reactive payload.

Do not accept "misc effect" modeling.

### Add a compact deterministic scenario layer

Keep MBT for parity, but add a smaller deterministic replay layer for battle regressions:

- named initial state setup;
- short action sequence;
- explicit expected end state or intermediate checkpoints.

This should sit beside current battle scenario tests, not replace MBT.

### Keep package boundaries hard when content work expands

If the repo starts shipping more structured content:

- SRD payloads should live in their own package or directory boundary;
- structured input imports should live elsewhere;
- optional licensed packs should be separate artifacts;
- runtime projection output should remain code-owned and derivable.

### Prefer payloads over scattered flags

When the same rule shape starts appearing in multiple places, move toward:

- action payloads;
- reaction payloads;
- effect payloads;
- readyable spell payloads;

rather than growing the creature or battle state with unrelated booleans that only one branch reads.

## What Changes Our Thinking

The outside research does not argue for a new architecture. It argues for sharper discipline inside the existing one.

The main changes in thinking are:

- the most valuable import is not "more declarative rules"; Quint already provides that;
- the real leverage is in closed mechanic vocabularies and stricter projection seams;
- effect lifecycle deserves as much modeling attention as attack resolution;
- deterministic scenario ergonomics are the biggest verification improvement still available;
- provenance boundaries must be reflected in package structure, not just in docs.

## Final Position

What to take:

- closed typed mechanic vocabularies;
- projection-time synthetic accumulation;
- explicit effect phase ownership;
- item/feature-scoped runtime payloads;
- replay-first deterministic scenarios;
- hard provenance/package boundaries.

What to ignore:

- platform hook surfaces;
- arbitrary mutation systems;
- plugin-extensible mechanics;
- mixed-provenance loaders;
- string-command runtime harnesses.

What to imitate:

- phase discipline;
- typed contribution surfaces;
- cleanup symmetry;
- explicit version/provenance partitioning;
- seed-visible replay tooling.

What to avoid:

- duplicate ownership;
- hidden mutable registries;
- semantic drift between content and engine;
- content packaging that erases provenance;
- verification that depends on platform behavior instead of modeled state.
