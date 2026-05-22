# L3 Hypnotic Pattern Runtime Survey

Task: `L3-SPELL-HYPNOTIC-PATTERN-RUNTIME-SURVEY`

## RAW And Language Check

Local RAW exists for SRD 5.2.1 Hypnotic Pattern in
`.references/srd-5.2.1/Spells/Descriptions-E-L.md#Hypnotic Pattern`. The
spell is a level-3 Illusion spell with Action casting, 120-foot range, Somatic
and Material components, Concentration up to 1 minute, and a 30-foot Cube
within range. The pattern appears for a moment and vanishes. Each creature in
the area who can see the pattern makes a Wisdom Saving Throw. Failed-save
targets have the Charmed condition for the duration; while Charmed, they also
have the Incapacitated condition and Speed 0. The spell ends for an affected
creature if it takes any damage or if someone else uses an action to shake the
creature out of its stupor.

The Rules Glossary confirms the relevant condition and area terms:

- Charmed prevents harming the charmer and grants the charmer social Advantage.
- Incapacitated blocks actions, Bonus Actions, and Reactions; breaks
  Concentration; and blocks speech.
- A Cube is an Area of Effect whose point of origin is located anywhere on a
  face of the Cube, with the point of origin excluded unless the creator
  decides otherwise.
- Area membership is blocked by Total Cover from the point of origin.

`UBIQUITOUS_LANGUAGE.md` confirms the relevant terms: Spell Definition, Spell
Access, Spell Invocation, Spell Effect, Area of Effect, Saving Throw,
Concentration, Charmed, Incapacitated, Speed, Movement, Action, and Damage. It
also warns that Charmed is not only a social-control marker here: Hypnotic
Pattern uses Charmed as the carrier for a battle-visible Incapacitated plus
Speed 0 control bundle.

## Current State

`hypnotic_pattern` is authored in
`packages/surface/content/hypnotic_pattern.dhall` and generated JSON. The record
already exposes the static spell facts, a point-origin 30-foot Cube attachment,
Wisdom Saving Throw, caster Spell Save DC, and a failed-save composite of
Charmed, Incapacitated, and Speed 0. It records `target_takes_damage` in
duration `earlyEnd`.

The Surface record still leaves two exact runtime facts understructured for
admission:

- the target predicate is "creature in the area who can see the pattern", which
  requires caller-supplied area membership plus sight witness facts rather than
  an unconstrained area target set;
- the "someone else uses an action to shake the creature out of its stupor"
  escape is present in prose only and must be represented as a target-specific
  escape operation before exact runtime support.

The active Unit matrix reports `hypnotic_pattern` as an `srd-candidate` with
`not-in-unit-catalog` status. It has no Unit claim, deterministic
admission/projection evidence, selected-identity evidence, focused runtime
test, or promoted package-local Quint parity witness.

Existing reusable pieces:

- Battle runtime can spend Magic Actions and Spell Slots, own Concentration, resolve
  Saving Throw outcomes, and clean up spell-owned conditions on Concentration
  or duration end.
- The generic condition-save profile supports fixed spell-owned condition
  application such as Hold Person.
- The Hideous Laughter profile is useful precedent for applying a paired
  condition bundle and reacting to damage, but it is spell-shape-specific and
  uses damage-triggered repeat saves rather than automatic target cleanup.
- Area spell profiles already consume caller-supplied affected target sets so
  automatic geometry and Total Cover derivation can remain table-owned.

Non-reusable or incomplete pieces:

- The generic condition-save profile does not admit a linked Charmed,
  Incapacitated, and Speed 0 bundle whose latter two projections are active
  only while the spell-owned Charmed effect remains.
- Runtime active effects do not have a general source-owned Speed 0 projection
  tied to a save-gated condition bundle.
- Damage currently opens repeat-save lifecycles for Hideous Laughter; Hypnotic
  Pattern needs target-specific automatic cleanup when the affected target
  takes any damage.
- No generic battle command exists for another creature spending an action to
  shake a specific affected target out of a spell-owned stupor.
- Surface/catalog admission should not recover sight eligibility or shake-awake
  escape behavior from `spell.id === "hypnotic_pattern"`.

## Decision

Task 21 should close as a follow-up split, not as support and not as
runtime-detached closure. Hypnotic Pattern has an executable battle-facing core:
Magic Action and Spell Slot spend, Concentration, area Saving Throw, failed-save
control effect, and target-specific escape. However, exact support requires a
general structured Surface escape shape and a runtime profile for a linked
condition plus Speed effect with damage and action-spend cleanup.

Automatic Cube placement, point-of-origin inclusion, Total Cover, area
membership, and the "can see the pattern" predicate remain caller/table witness
facts. Battle runtime should consume typed witnesses and own the spell
lifecycle and target effects only.

No companion AI or autonomous-control behavior is involved. The spell prevents
affected targets from acting; it does not choose actions for them or introduce
an autonomous controller. Runtime admission must use typed spell procedure facts
and support profiles, not authored identity dispatch.

## Follow-Up Split

`L3-FOLLOWUP-HYPNOTIC-PATTERN-SURFACE-ESCAPE-REPAIR`

Repair Hypnotic Pattern's Surface admission shape before runtime promotion.
Required Surface work: keep the existing SRD spell definition, Action casting,
level-3 Spell Slot, 120-foot range, 30-foot Cube attachment, Wisdom Saving
Throw, Charmed plus Incapacitated plus Speed 0 failed-save bundle,
Concentration up to 1 minute, and damage early end, but structurally encode the
affected target predicate as caller-supplied area membership plus sight witness
facts and encode the "someone else spends an action to shake the target awake"
target-specific escape. Required output: updated Dhall and generated JSON
content plus focused Surface/unit-catalog tests proving the repaired record
round-trips without prose-only runtime escape facts.

`L3-FOLLOWUP-HYPNOTIC-PATTERN-CONTROL-RUNTIME`

Promote Hypnotic Pattern's battle control lifecycle after Surface repair.
Required runtime work: admit the repaired Surface record into the Unit catalog;
spend the caster's Magic Action and level-3-or-higher Spell Slot; consume a
caller-supplied 30-foot Cube affected-creature set with per-target sight
witnesses; resolve Wisdom Saving Throws; apply one source-owned target effect
that projects Charmed, Incapacitated, and Speed 0 while preserving independent
condition or Speed sources; own caster Concentration and duration cleanup;
remove only the spell-owned target effect when the affected target takes damage;
and add a typed action-spend command for another creature to shake the target
out of the stupor. Required output: supported-profile or
profile-subset-supported Unit claim, deterministic admission/projection
evidence, focused runtime tests, generated coverage artifacts, and promoted
Quint/runtime parity for cast admission, Spell Slot spend, Concentration,
Saving Throw outcomes, linked condition and Speed projection, damage cleanup,
shake-awake cleanup, and duration cleanup.

## Reviewer Loop

Round 1 RAW and ubiquitous-language pass:

- Kept the SRD target exact: creatures in the 30-foot Cube who can see the
  pattern, not every creature in a Cube by default.
- Kept Charmed as the source condition while preserving Incapacitated and Speed
  0 as separate battle-visible projections.
- Kept both target-specific exits: any damage to the affected target and
  another creature spending an action to shake the target out of its stupor.
- Left Cube placement, Total Cover, point-of-origin inclusion, area membership,
  and sight derivation with caller/table witnesses.

Round 2 architecture and connascence pass:

- Did not add runtime support or Unit catalog admission from authored Surface
  presence alone.
- Split Surface escape/sight repair from runtime promotion so reducers do not
  infer exact behavior from authored identity or prose.
- Kept the linked condition plus Speed 0 effect as one future source-owned
  target effect, avoiding duplicated state where Charmed, Incapacitated, and
  Speed 0 could diverge for the same spell occurrence.
- Reused existing condition, damage, action-resource, Concentration, and area
  witness concepts in the follow-up shape rather than proposing a parallel
  social-control or map-geometry store.
- The remaining strong coupling is intentional and must be made type-visible in
  the follow-up: Surface effect atoms, battle active-effect cleanup,
  damage-lifecycle hooks, action-spend commands, codecs, package-local Quint
  state, and selected-identity replay projections must all change together when
  the control lifecycle is promoted.

## Verification Notes

This survey records a Unit claim only to make the follow-up split
checker-visible. It does not add Surface catalog admission, runtime reducers,
or promoted Quint behavior. The appropriate verification is coverage
consistency and whitespace checking, not MBT.
