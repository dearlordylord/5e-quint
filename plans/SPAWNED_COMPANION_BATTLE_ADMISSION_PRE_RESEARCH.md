# Source-Linked Stat Block Battle Admission Pre-Research

This note parks the design question for later implementation. It is not an
active plan and should not trigger code work by itself.

## Problem Statement

The common table scenario is not "cast Find Familiar during battle." It is:

- a Wizard already has a familiar before initiative is rolled;
- a Pact of the Chain Warlock already has an enhanced familiar before
  initiative is rolled;
- a later feature may start battle with another active source-linked Stat Block
  combatant, such as a steed, summoned spirit, controlled Undead, or animated
  object, if the relevant source and table state allow it.

The current promoted runtime can represent a present Find Familiar companion
once it is in battle state, but the MCP `start_battle` surface admits only
ordinary character sessions and ordinary Stat Block combatants. That means MCP
can start "a Wizard and a Cat" but cannot say "this Owl Stat Block combatant
was admitted because of the Wizard's Find Familiar source occurrence" without
losing owner, lifecycle, no-attack, touch delivery, and one-familiar-only
semantics.

## Architecture Facts

- A Stat Block combatant is not necessarily an enemy. It can be a monster,
  townsfolk, ally, familiar, steed, summoned spirit, controlled Undead, or
  animated object. "Monster" is not the battle-side relationship.
- Surface authored content and battle runtime projection are distinct.
  Surface remains the authored rules vocabulary; battle runtime projects
  supported procedure facts at its own boundary.
- `Find Familiar` is currently authored as `mechanics.family =
  "spawned_creature"`. That is a Surface/content mechanics family, not the
  MCP `start_battle` input shape and not a sibling category beside familiars.
- The existing Find Familiar runtime state is owner-linked familiar state. A
  present familiar is a combatant, but the familiar record is keyed by owner
  and carries the chosen form, Creature Type override, presence state, and
  lifecycle facts.
- The familiar form is not copied spell data. Normal forms are typed Stat Block
  references, "another CR 0 Beast" is an eligibility rule over the Stat Block
  catalog, and Pact of the Chain special forms are additional eligible Stat
  Block references.
- Pact of the Chain is Find Familiar spell access plus form widening and a
  later attack exception. It must not create a parallel Warlock-familiar runtime
  or duplicate familiar state inside invocation state.
- Reducer extension follows SRD procedure families, not authored prose names or
  concrete Unit ids. Support gates classify authored mechanics and project
  reusable reducer lanes.
- Out-of-battle time is not a battle clock. Animate Dead/Create Undead 24-hour
  control maintenance must not be modeled as a battle expiry unless a session
  time layer exists.
- Between-battle source-linked combatant state is not currently traced as a
  durable session object. If a familiar, steed, controlled Undead, animated
  object, or summoned spirit survives one battle and later enters another with
  changed HP, resources, equipment, dismissal state, or other mutable facts,
  battle admission cannot reconstruct that history from the authored source
  alone. Persisting and re-admitting that state is TODO session-layer work.

## Naming Boundary

Avoid `origin` for this new concept. The current reducer uses `origin` for
"which source object projected this BattleCreatureState" (`character` or
`statBlock`), but "origin" becomes misleading for source-linked creatures: an
owl's in-world origin is not the Find Familiar spell, and an Undead creature's
in-world origin is not the same thing as its battle admission source.

Prefer `admissionSource` for MCP/battle-start input:

```ts
type StatBlockCombatantAdmissionSource =
  | { readonly kind: "encounterParticipant" }
  | {
      readonly kind: "sourceLinked";
      readonly sourceActorId: CombatantId;
      readonly sourceUnitId: UnitId;
      readonly sourceOccurrenceId: SourceOccurrenceId;
      readonly selection: SourceLinkedCombatantSelection;
    };
```

`admissionSource` means "what source facts admitted this combatant into this
BattleState." It does not mean creature provenance, metaphysical origin, or an
executable rule bundle.

The raw MCP boundary may provide convenience defaults for ordinary Stat Block
combatants, but the parsed internal shape should be explicit. Do not use
`undefined` as a second spelling for ordinary encounter participation.

## Domain Boundary

Do not model this as a top-level sibling bucket:

```ts
preexistingCompanions: [
  { kind: "findFamiliar", ... },
  { kind: "spawnedCompanion", ... }
]
```

That implies companions are not combatants and makes Find Familiar look like a
sibling of a broader spawned-companion category.

Prefer direct composition into `initialCombatants`:

```ts
initialCombatants: [
  {
    kind: "statBlockCombatant",
    combatantId: "wizard-familiar",
    statBlockId: "stat_block_owl",
    side: "party",
    initiative: 18,
    admissionSource: {
      kind: "sourceLinked",
      sourceActorId: "wizard",
      sourceUnitId: "find_familiar",
      sourceOccurrenceId: "ff-1",
      selection: {
        kind: "familiarForm",
        formId: "owl",
        creatureTypeOverride: "fey"
      }
    }
  }
]
```

The same composition principle should later cover other source-linked Stat
Block combatants. The source and selection may vary, but the battle participant
remains a Stat Block-backed combatant.

## Executable Projection Boundary

`admissionSource` must not become hidden executable IR. It preserves source
identity for ownership, replacement, diagnostics, and cleanup links. Executable
behavior must be projected through explicit reducer procedure lanes only when
the reducer consumes those facts.

Examples of reusable mechanical lanes to consider later:

- commanded combatants: controller, command timing, default behavior when no
  command is issued;
- initiative links: shares initiative and acts immediately after an anchor
  combatant;
- presence links: disappearance, reversion, or removal tied to modeled battle
  events such as 0 HP, dismissal, or concentration ending;
- action restrictions: for example, a familiar cannot attack.

The support gate should derive those lanes from the authored Surface mechanics
shape, not from branches such as "if sourceUnitId is `find_familiar`." Concrete
Unit ids are identity and diagnostics, not semantic switches.

Do not store static control or lifecycle facts that are already derivable from
the authored source mechanics. For example, a source-linked Animate Dead
Skeleton should not copy "Bonus Action command, 60 ft, Dodge fallback" into
combatant state if those facts are available through the authored mechanics
projection. Store only mutable battle facts that actually change during battle.

Mutable facts that survive beyond a single battle, such as a source-linked
combatant's current HP after a previous encounter, are not authored mechanics
and are not derivable from `admissionSource`. Until the repo has a durable
between-battle state owner for those facts, MCP battle admission should either
require the caller to provide them as encounter-local init facts or explicitly
report that preserving them across battles is unsupported.

## Holes And Witnesses

Projected procedure lanes should drive holes only at the resolution point where
RAW requires table knowledge that the reducer does not own.

The hole carries the rule requirement derived by the reducer:

```ts
{
  kind: "distanceRequirement",
  subject: {
    fromCombatantId: "wizard",
    toCombatantId: "wizard-familiar"
  },
  maximumFeet: 100
}
```

The fill carries only the table fact:

```ts
{
  kind: "distanceWitness",
  distanceFeet: 35
}
```

The fill must not restate authored constants such as `maximumFeet`. The reducer
compares the table fact to the rule requirement.

For yes/no facts where the table cannot or should not provide a numeric
measurement, use a plain domain witness:

```ts
{
  kind: "visibilityWitness",
  canSee: true
}
```

Do not invent witnesses for rules that do not need them. For Animate Dead, the
60-foot range matters when the controller issues the command; the creature can
then continue following the order until complete. Do not require a fresh range
witness on every later creature action unless the authored rule requires it.

## Proposed Product Behavior

As an MCP user, I want `start_battle` to admit source-linked Stat Block
combatants directly in `initialCombatants`, so that the initial battle roster is
atomic and cannot be partially linked by a follow-up tool call.

As an MCP user, I want to start battle with a Wizard's existing familiar, so
that the battle state matches the table state before the first turn.

As an MCP user, I want the familiar to appear in initiative as a real combatant,
so that it can move, Dash, Disengage, Dodge, Help, take other supported
non-attack actions, and end its own turn.

As an MCP user, I want MCP to preserve familiar ownership, so that the familiar
cannot be confused with an ordinary Cat/Owl/Rat Stat Block.

As an MCP user, I want Pact of the Chain to use the same Find Familiar runtime,
so that special forms and later attack exceptions extend the same owner-linked
familiar behavior instead of creating a second model.

As an MCP user, I want unsupported source-linked combatant shapes to fail with
clear typed errors, so that the API does not imply broad summon, reanimation,
animated-object, or transformation support before those reducer projections are
ready.

## Implementation Shape To Revisit Later

Add direct `initialCombatants` support for source-linked Stat Block combatants.

MCP should:

- decode source-linked `statBlockCombatant` entries inside `initialCombatants`;
- validate that each `sourceActorId` exists in the same starting roster;
- validate that the source actor has the relevant spell/feature access where
  required;
- resolve user-facing ids and return precise typed errors;
- call one atomic runtime battle-admission path that either accepts the full
  roster and all projected procedure lanes or rejects it with issues.

Battle runtime should remain the authority for:

- familiar identity collision checks;
- one familiar per caster;
- form eligibility and Stat Block resolution;
- Creature Type override application;
- initiative insertion;
- action and Reaction ownership;
- no-attack gate;
- temporary dismissal, reappearance, permanent dismissal, and 0-HP
  disappearance;
- shared senses and touch-spell delivery;
- projecting reusable procedure lanes from supported authored mechanics shapes.

Surface/content should remain the authority for:

- authored mechanics families such as `spawned_creature`,
  `reanimated_creature`, and `templated_multi_spawn`;
- source spell/feature facts;
- form catalog, catalog Stat Block source, or inline Stat Block source;
- source-specific selection modes;
- command model;
- dismissal/reversion/disappearance model;
- Pact of the Chain form widening.

## Deferred Work

Do not implement generic demons, reanimation, animated objects, polymorph, or
session-time maintenance through this pre-research item.

Specifically deferred:

- `find_steed` and `summon_dragon` admission;
- XPHB summon-family support;
- Pact of the Chain familiar Reaction attack exception if not already promoted
  at the time this resumes;
- catalog reanimation such as Animate Dead/Create Undead;
- templated multi-spawn such as Animate Objects;
- target replacement such as Polymorph, Shapechange, True Polymorph, and Wild
  Shape;
- out-of-battle time tracking such as Animate Dead/Create Undead 24-hour
  control maintenance and reassertion;
- durable between-battle state for source-linked combatants, including carried
  HP, resources, equipment, dismissal/presence state, and other mutable facts;
- full geometry for unoccupied spaces beyond caller-supplied placement facts;
- inventory execution beyond existing familiar item-drop boundary events.

## Testing Notes For Later

Good tests should assert externally visible battle behavior, not internal
helper calls:

- MCP `start_battle` accepts a Wizard with a source-linked Owl familiar in
  `initialCombatants` and returns `findFamiliars` plus an Owl combatant in
  initiative.
- MCP rejects a source-linked Stat Block combatant whose `sourceActorId` is
  missing from the starting roster.
- MCP rejects a familiar id that collides with an ordinary combatant.
- MCP rejects a normal Find Familiar form outside the eligible form catalog.
- MCP rejects Pact-only forms for a non-Pact owner.
- Familiar turn discovery exposes non-attack actions and does not expose
  ordinary attacks.
- Holes expose reducer-derived requirements while fills provide only table
  facts, such as `distanceFeet` or `canSee`.
- Reusing the same runtime path preserves existing Find Familiar lifecycle
  tests for replacement, dismissal, reappearance, zero-HP disappearance, shared
  senses, and touch delivery.

## References

- `plans/DESIGN_C4a_spawned_companion.md`
- `plans/RESEARCH_summons_and_polymorph.md`
- `plans/unit-profile-coverage/SRDINV84I_FIND_FAMILIAR_COMPANION_RUNTIME_SPLIT_RESEARCH.md`
- `packages/surface/content/find_familiar.dhall`
- `packages/surface/content/animate_dead.dhall`
- `packages/surface/content/animate_objects.dhall`
- `packages/battle-runtime/ARCHITECTURE_GRAPH.md`
- `packages/battle-runtime/src/find-familiar-lifecycle.test.ts`
- `packages/mcp/src/start-battle-tool-input.ts`
- `ASSUMPTIONS.md` A33 and A36
