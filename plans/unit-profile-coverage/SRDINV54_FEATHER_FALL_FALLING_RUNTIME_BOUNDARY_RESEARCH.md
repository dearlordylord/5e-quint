# SRDINV54 Feather Fall Falling Runtime Boundary Research

Task 247 reviewed Feather Fall's falling Reaction and landing mitigation
boundary. No runtime behavior was implemented in this task.

## Source Review

Local RAW sources checked:

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md` for Feather Fall.
- `.references/srd-5.2.1/Rules-Glossary.md` for Falling, Prone, Reaction,
  and Target.
- `.references/srd-5.2.1/Playing-the-Game.md` for Reaction timing and
  Opportunity Attack exclusion for falling movement.
- `UBIQUITOUS_LANGUAGE.md` for Reaction, Spell Invocation, Spell Effect,
  Falling, Movement, Prone, and Target.

Relevant RAW facts:

- Feather Fall is a level-1 Reaction spell triggered when the caster or a
  visible creature within 60 feet falls.
- The spell chooses up to five falling creatures within the spell's range.
  The trigger visibility fact is not the same as target admission; target
  admission needs falling-creature and range facts.
- Each affected falling creature's descent rate slows to 60 feet per round
  until the spell ends.
- If an affected creature lands before the spell ends, it takes no damage
  from the fall and the spell ends for that creature.
- Falling damage is applied at the end of the fall, and the creature lands
  Prone unless it avoids taking any damage from the fall.
- Falling past an enemy does not provoke Opportunity Attacks because falling
  movement is not movement using movement, an action, a Bonus Action, or a
  Reaction.

## Existing Boundary

SRDINV47 already installed Feather Fall as Surface data with:

- a `self_or_visible_creature_falls` Reaction trigger;
- `choose_up_to` five creature targets with `stateFilter: ["falling"]`;
- a `feather_fall_mitigation` atom carrying the 60-foot-per-round descent cap
  and the per-target landing outcome.

That Surface record is authored grammar only. The promoted battle runtime does
not currently discover falling-trigger Reaction windows, create per-target
Feather Fall Spell Effects, expose the active descent cap, or consume landing
events that clear the effect and prevent falling damage.

## Boundary Decision

Table-supplied fall-start and landing facts are enough for a Feather Fall
promotion task. A generic falling hazard simulator, map elevation model, and
fall-distance derivation are not prerequisites.

The smallest executable boundary is a dedicated Feather Fall falling event
contract:

- The table/caller supplies a fall-start event for the trigger creature plus
  target facts for the chosen falling creatures. Runtime does not infer
  falling from elevation, flight, forced movement, or map geometry.
- The runtime owns the Reaction spell invocation: Reaction availability,
  Spell Slot spend, component/profile admission, up-to-five target count, and
  target admission against caller-supplied falling and range facts.
- Successful invocation creates one per-target `FeatherFallMitigation` Spell
  Effect. The effect identity implies the SRD 60-foot-per-round cap; avoid
  storing a second mutable cap value beside the Surface source fact unless the
  execution boundary needs a checked projection.
- The runtime exposes the active descent-rate cap as a spell-owned effect fact
  for the table to consume. It does not advance falling position per round.
- The table/caller supplies a landing event for each affected target. If the
  target lands before the effect expires, runtime removes that target's
  Feather Fall effect and emits the no-fall-damage outcome.
- Fall-damage prevention and Falling-Prone prevention must be resolved at the
  same landing boundary. The Falling rule makes Prone depend on not avoiding
  fall damage, so a target that takes no fall damage because of Feather Fall
  must not separately receive the Falling hazard's Prone outcome.

This keeps invalid states out of the runtime: there is no persisted fall
distance that can disagree with the table, no duplicated falling-position
state, and no independent "prevent fall damage" marker that can outlive the
per-target spell effect.

## Follow-Up Runtime Slice

SRDINV55 should keep Feather Fall as a single future runtime slice unless the
implementer discovers that the existing Reaction or spell-effect machinery
cannot admit a falling-trigger event without a smaller enabling task.

Recommended scope for that slice:

- add the falling-trigger Reaction to `packages/battle-runtime/battle-runtime.qnt`
  and the TypeScript runtime trigger vocabulary;
- discover and resolve Feather Fall as a Reaction Spell Invocation with
  caller-supplied trigger, range, and falling target facts;
- create per-target timed Feather Fall Spell Effects;
- expose the active 60-foot-per-round descent cap as an effect projection;
- resolve caller-supplied landing events by clearing the target's effect,
  preventing falling damage, and suppressing the Falling hazard Prone outcome;
- add focused admission/reducer tests plus package-local QNT parity evidence
  before claiming Unit support.

Out of scope for that slice:

- automatic elevation, fall distance, or landing-position derivation;
- generic falling hazard damage for unmitigated falls;
- fall-into-liquid Reaction checks, unless a later task promotes generic
  Falling hazard resolution;
- Opportunity Attack derivation from falling movement, because RAW excludes
  falling past an enemy from provoking Opportunity Attacks.

## reviewer loop Convergence

- Round 1: rejected a prerequisite generic falling hazard runtime. Feather Fall
  can be executed from table-supplied fall-start and landing events.
- Round 2: rejected storing fall distance, per-round descent progress, or a
  duplicate mutable descent-cap value in battle state. The spell effect should
  carry duration/identity, while fall geometry remains caller/table-owned.
