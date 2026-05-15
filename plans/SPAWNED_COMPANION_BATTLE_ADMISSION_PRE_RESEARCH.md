# Spawned Companion Battle Admission Pre-Research

This note parks the design question for later implementation. It is not an
active plan and should not trigger code work by itself.

## Problem Statement

The common table scenario is not "cast Find Familiar during battle." It is:

- a Wizard already has a familiar before initiative is rolled;
- a Pact of the Chain Warlock already has an enhanced familiar before
  initiative is rolled;
- a later feature may start battle with another active spawned companion, such
  as a steed or summoned spirit, if the relevant spell duration and table state
  allow it.

The current promoted runtime can represent a present Find Familiar companion
once it is in battle state, but the MCP `start_battle` surface admits only
ordinary character sessions and ordinary Stat Block combatants. That means MCP
can start "a Wizard and a Cat" but cannot say "this Cat is the Wizard's
Find Familiar companion" without losing owner, lifecycle, no-attack, touch
delivery, and one-familiar-only semantics.

## Existing Architecture Facts

- `Find Familiar` is a `spawned_creature` spell in content. It is the first
  validation reference for the spawned-companion/spawned-creature family, not a
  category beside it.
- The existing Find Familiar runtime state is owner-linked companion state.
  A present familiar is a combatant, but the familiar record is keyed by owner
  and carries the chosen form, Creature Type override, presence state, and
  lifecycle facts.
- The familiar form is not copied spell data. Normal forms are typed Stat Block
  references, "another CR 0 Beast" is an eligibility rule over the Stat Block
  catalog, and Pact of the Chain special forms are additional eligible Stat
  Block references.
- Pact of the Chain is Find Familiar spell access plus form widening and a
  later attack exception. It must not create a parallel Warlock-familiar runtime
  or duplicate familiar state inside invocation state.
- `ASSUMPTIONS.md` separates mid-combat creature roster mutation from summoning
  spell content. The caller supplies initiative when a creature is inserted,
  while each spell/profile owns its control and initiative model.

## Domain Boundary

Use domain-family first, then spell/profile-specific selection.

Do not model this as:

```ts
preexistingCompanions: [
  { kind: "findFamiliar", ... },
  { kind: "spawnedCompanion", ... }
]
```

That makes Find Familiar look like a sibling of spawned companions, which is
domain-wrong.

Prefer:

```ts
preexistingCompanions: [
  {
    kind: "spawnedCompanion",
    source: { spellId: "find_familiar" },
    ownerCombatantId: "wizard",
    companionId: "wizard-familiar",
    selection: {
      tag: "findFamiliarForm",
      form: { tag: "normalNamedForm", formId: "owl" },
      creatureTypeOverride: "fey"
    },
    initiative: 18,
    placement: { kind: "unoccupiedSpaceWithinSpellRange" }
  }
]
```

Future spawned-companion sources, such as `summon_dragon` or `find_steed`,
should remain inside `kind: "spawnedCompanion"` with source-specific selection
payloads. Reanimation, object animation, and target replacement are separate
families and should not be forced into this shape.

## Proposed Product Behavior

As an MCP user, I want to start battle with a Wizard's existing familiar, so
that the battle state matches the table state before the first turn.

As an MCP user, I want the familiar to appear in initiative as a real combatant,
so that it can move, Dash, Disengage, Dodge, Help, take other supported
non-attack actions, and end its own turn.

As an MCP user, I want MCP to preserve familiar ownership, so that the familiar
cannot be confused with an ordinary Cat/Owl/Rat Stat Block.

As an MCP user, I want Pact of the Chain to use the same Find Familiar
companion runtime, so that special forms and later attack exceptions extend the
same owner-linked companion instead of creating a second model.

As an MCP user, I want unsupported spawned-companion sources to fail with clear
typed errors, so that the API does not imply broad summon support before the
runtime/content family is ready.

## Implementation Shape To Revisit Later

Add an optional battle-start admission input for preexisting companions.

MCP should:

- decode the `preexistingCompanions` input;
- validate that each owner combatant exists in the starting roster;
- validate that the owner has the relevant spell access where required;
- resolve user-facing ids and return precise errors;
- call runtime companion admission functions after the base battle state is
  created.

Battle runtime should remain the authority for:

- one familiar per caster;
- familiar identity collision checks;
- form eligibility and Stat Block resolution;
- Creature Type override application;
- initiative insertion;
- action and Reaction ownership;
- no-attack gate;
- temporary dismissal, reappearance, permanent dismissal, and 0-HP
  disappearance;
- shared senses and touch-spell delivery.

Surface/content should remain the authority for:

- the spawned-companion family payload;
- source spell;
- form catalog or inline companion-stat source;
- source-specific selection modes;
- command model;
- dismissal model;
- Pact of the Chain form widening.

## Deferred Work

Do not implement generic demons, reanimation, animated objects, or polymorph
through this pre-research item.

Specifically deferred:

- `find_steed` and `summon_dragon` spawned-companion admission;
- XPHB summon-family support;
- Pact of the Chain familiar Reaction attack exception if not already promoted
  at the time this resumes;
- catalog reanimation such as Animate Dead/Create Undead;
- templated multi-spawn such as Animate Objects;
- target replacement such as Polymorph, Shapechange, True Polymorph, and Wild
  Shape;
- full geometry for unoccupied spaces beyond caller-supplied placement facts;
- inventory execution beyond existing familiar item-drop boundary events.

## Testing Notes For Later

Good tests should assert externally visible battle behavior, not internal
helper calls:

- MCP `start_battle` accepts a Wizard with a preexisting Owl familiar and
  returns `findFamiliars` plus an Owl combatant in initiative.
- MCP rejects a familiar whose owner is missing from the roster.
- MCP rejects a familiar id that collides with an ordinary combatant.
- MCP rejects a normal Find Familiar form outside the eligible form catalog.
- MCP rejects Pact-only forms for a non-Pact owner.
- Familiar turn discovery exposes non-attack actions and does not expose
  ordinary attacks.
- Reusing the same runtime path preserves existing Find Familiar lifecycle
  tests for replacement, dismissal, reappearance, zero-HP disappearance, shared
  senses, and touch delivery.

## References

- `plans/DESIGN_C4a_spawned_companion.md`
- `plans/unit-profile-coverage/SRDINV84I_FIND_FAMILIAR_COMPANION_RUNTIME_SPLIT_RESEARCH.md`
- `packages/surface/content/find_familiar.dhall`
- `packages/battle-runtime/src/find-familiar-lifecycle.test.ts`
- `packages/mcp/src/start-battle-tool-input.ts`
- `ASSUMPTIONS.md` A33 and A36
