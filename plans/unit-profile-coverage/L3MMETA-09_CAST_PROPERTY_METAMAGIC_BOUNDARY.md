# L3MMETA-09 Cast-Property Metamagic Boundary

## Scope

Task 9 resolves Distant Spell, Extended Spell, and Subtle Spell as a planned
generic cast-property owner. It does not promote new runtime behavior.

RAW and domain checks consulted:

- `.references/srd-5.2.1/Classes/Sorcerer.md#Distant Spell`
- `.references/srd-5.2.1/Classes/Sorcerer.md#Extended Spell`
- `.references/srd-5.2.1/Classes/Sorcerer.md#Subtle Spell`
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md#Range`
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md#Components`
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md#Duration`
- `.references/srd-5.2.1/Rules-Glossary.md#Concentration`
- `.references/srd-5.2.1/Rules-Glossary.md#Spellcasting Focus`
- `UBIQUITOUS_LANGUAGE.md#Concentration`
- `UBIQUITOUS_LANGUAGE.md#Spell Component`
- `UBIQUITOUS_LANGUAGE.md#Duration`

Distant Spell costs 1 Sorcery Point when the caster casts an eligible spell and
modifies that casting's range: a spell with range of at least 5 feet has its
range doubled, while a spell with range Touch has its range become 30 feet.
Extended Spell costs 1 Sorcery Point when the caster casts a spell with duration
of 1 minute or longer, doubles that duration to a maximum of 24 hours, and gives
the caster Advantage on any Saving Throw made to maintain Concentration on the
spell. Subtle Spell costs 1 Sorcery Point when the caster casts a spell and
suppresses Verbal, Somatic, and ordinary Material components, while preserving
Material components consumed by the spell or with a specified cost.

## Current Runtime Boundary

The current runtime truthfully rejects these options before Sorcery Point
spending:

- `packages/battle-runtime/src/battle-reducer/metamagic.ts`
- `packages/battle-runtime/src/battle-runtime-metamagic-resource.test.ts`

The evidence ledger already records the closure as
`L12G-FOLLOWUP-SORCERER-METAMAGIC-CAST-PROPERTY-OPTIONS` with
`accepted-runtime-closure`. The `sorcerer_metamagic` Unit claim keeps Distant,
Extended, and Subtle in deferred mechanics with an `outside-battle-runtime`
closure owner named "generic spell cast-property witness owner."

That boundary remains correct. Promoting any one of these options inside a
single spell procedure would overclaim a cast-property rule as if it were local
to that spell's authored identity. The property change belongs to the Spell
Invocation boundary that reads selected typed Metamagic facts, spends Sorcery
Points, and then hands cast-local range, duration, component, and Concentration
facts to procedure owners.

## Owner Decision

Create a generic Spell Invocation cast-property owner before opening support for
Distant, Extended, or Subtle.

The owner should consume the existing canonical Surface spell facts for range,
duration, and components. It must not add a parallel registry keyed by spell id,
spell name, provenance section, or procedure name. It should produce cast-local
facts that procedure owners can consume when they already own a corresponding
runtime boundary:

- target or origin range admission;
- active-effect duration or cleanup timers;
- component availability and component visibility;
- Concentration-maintenance Saving Throw roll mode.

Do not store both a source property and a derived property unless the derived
property is executable state at the boundary that consumes it. For example,
Surface remains the source for a spell's authored range; an active effect may
store computed duration ticks because duration cleanup executes from those ticks.

## Distant Spell Shape

Distant needs range-bearing Spell Invocation witnesses, not authored identity
dispatch.

The owner should admit only the eligible Surface range shapes:

- point or distance range with at least 5 feet: cast-local range modifier is
  "double this casting's range";
- Touch range: cast-local range modifier is "Touch becomes 30 feet";
- Self or other non-range-bearing shapes: reject before Sorcery Point spending.

The range modifier applies to the spell's range, not to area dimensions, light
radii, movement distances, or later movable-effect limits unless that procedure
owner explicitly consumes the cast-local range fact for the rule text it owns.
This follows the SRD Range rule: a spell's range tells how far the effect can
originate, and the description specifies which part of the effect is limited by
range.

Recommended first Distant slice:

1. Add a cast-local range modifier fact derived from selected Distant Spell and
   Surface range shape.
2. Thread it through a narrow target or origin admission owner that already uses
   typed range facts.
3. Use an SRD spell whose runtime owner already consumes table-supplied
   within-range facts, so the witness proves the rewritten range boundary
   without adding automatic map geometry.
4. Add focused runtime and QNT parity only for that owner, then add
   selected-identity MBT evidence.

## Extended Spell Shape

Extended has two separate runtime consequences that must be carried by the same
cast-local owner:

- duration extension for eligible duration-bearing Spell Effects;
- Advantage on Saving Throws the caster makes to maintain Concentration on the
  affected spell.

The duration fact should be consumed where the procedure creates executable
duration state: active-effect expiration, area/emitter duration, or another
owned cleanup timer. The Concentration save Advantage fact should be tied to the
specific Concentration spell occurrence, so it cannot grant blanket Advantage on
unrelated Constitution saves or on Concentration saves for a different spell.

Recommended first Extended slice:

1. Add a cast-local duration modifier fact for timed or Concentration durations
   of at least 1 minute, capped at 24 hours.
2. Attach a same-occurrence Concentration-maintenance roll-mode rider only when
   the affected spell requires Concentration.
3. Start with one single-occurrence SRD spell whose owner already stores a
   duration cleanup timer and uses the shared Concentration lifecycle.
4. Verify both duration cleanup and Concentration-save roll-mode projection
   before claiming support.

## Subtle Spell Shape

Subtle needs component witnesses, not a blanket "spell is hidden" marker.

The owner should derive a cast-local component requirement projection from the
canonical Surface component facts:

- Verbal is suppressed for this casting;
- Somatic is suppressed for this casting;
- Material is suppressed only when the Material component is not consumed and
  has no specified cost;
- consumed or priced Material components remain required.

Do not mutate the authored spell's component record and do not infer stealth,
audibility, visibility, Counterspell eligibility, or hidden-state changes from
Subtle alone. Those are downstream owners that may consume component facts
where their rules need them. For example, a future Reaction spell-cast window
can read whether a triggering cast has a perceptible component witness; Subtle
should provide the component projection, not a bespoke Counterspell branch.

Recommended first Subtle slice:

1. Parse spell components into suppressible and preserved component facts at the
   Spell Invocation boundary.
2. Add a cast-local component projection for selected Subtle Spell.
3. Prove ordinary V/S/M suppression and priced or consumed Material preservation
   with synthetic or SRD-safe fixtures that do not introduce PHB+ authored
   identity.
4. Add runtime and QNT witnesses before using the projection in any visibility,
   silence, free-hand, or Reaction-spell owner.

## Plan Impact

Task 9 should be marked done as a boundary resolution. No existing runtime
profile should be promoted by this task.

The future implementation work should be split instead of tracked as one vague
cast-property task:

- Distant first-slice task: generic cast-local range modifier plus one
  range-bearing Spell Invocation witness.
- Extended first-slice task: generic cast-local duration modifier plus
  same-occurrence Concentration-maintenance roll-mode rider.
- Subtle first-slice task: generic cast-local component projection, including
  preservation of priced or consumed Material components.

These tasks may share one cast-property module only if the shared module owns
the common selected-Metamagic admission and produces distinct typed facts for
range, duration, Concentration, and components. A single untyped
`castPropertySupported` marker would reintroduce the invalid state this
boundary is meant to avoid.

## Verification Guidance

No MBT run is needed for this boundary task because no runtime behavior changed.

Future implementation slices should verify with focused runtime tests, focused
QNT owner tests, selected-identity MBT only after runtime and QNT witnesses
exist, and then:

- `pnpm unit-profile-coverage:check -- --write`
- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check -- --write`
- `pnpm rules-kernel-coverage:check`
- `pnpm quality`
