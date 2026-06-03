# L3 Protection From Energy Runtime Survey

Task: `L3-SPELL-PROTECTION-FROM-ENERGY-RUNTIME-SURVEY`

## RAW And Language Check

Local RAW exists for SRD 5.2.1 Protection from Energy in
`.references/srd-5.2.1/Spells/Descriptions-M-P.md#Protection from Energy`.
The spell is a level-3 Abjuration spell with Magic Action casting, Touch range,
Verbal and Somatic components, Concentration up to 1 hour, and one willing
creature target. For the duration, the target has Resistance to one caster-chosen
damage type from Acid, Cold, Fire, Lightning, or Thunder.

`UBIQUITOUS_LANGUAGE.md` confirms the relevant terms: Magic Action, Spell Slot,
Concentration, Duration, Damage Type, Resistance, Immunity, Vulnerability, and
Creature. It also distinguishes SRD Resistance from the Resistance cantrip's
damage reduction: Resistance halves incoming damage of a specific type, is
applied once, and is applied after damage modifiers and before Vulnerability.

## Current State

`protection_from_energy` is authored in
`packages/surface/content/protection_from_energy.dhall` and generated JSON. The
record already exposes the action casting, level 3, Touch range, Concentration
up to 1 hour, and damage Resistance source facts: a `grant_resistance` effect
whose damage type is a cast-time choice hole limited to Acid, Cold, Fire,
Lightning, and Thunder.

The target hole is not yet structurally lossless. It records only
`selection.mode: "one"` and omits the RAW target eligibility facts that other
willing-creature spells encode in Surface data: `targetKinds: ["creature"]` and
`disposition: "willing"`. A runtime support task must repair that Surface target
shape before admission, so the reducer can consume typed target facts instead of
recovering them from spell identity or prose.

The active Unit matrix still reports `protection_from_energy` as an
`srd-candidate` with `not-in-unit-catalog` status. It has no Unit claim,
deterministic admission/projection evidence, selected-identity evidence, focused
runtime test, or promoted Quint parity witness.

Existing reusable pieces:

- Battle runtime already has a source-neutral `damageResistance` active effect
  carrying `sourceSpellId`, `sourceCombatantId`, `damageType`, and an active
  effect expiration.
- Target-side damage adjustment already consumes runtime `damageResistance`
  effects and halves matching damage through the normal damage pipeline.
- Concentration expiration is already representable for spell-owned active
  effects and is used by other spell profiles.
- Protection from Poison already proves that a spell-owned active
  `damageResistance` effect can feed the normal target-side damage adjustment
  pipeline, but its admission profile is intentionally composite: Poisoned
  removal, Poison save Advantage, and Poison damage Resistance.

Non-reusable pieces:

- `spell.invocation-damage-reduction` belongs to the Resistance cantrip. It
  creates a once-per-turn d4 reduction with a use marker, not SRD damage-type
  Resistance.
- `spell.invocation-condition-removal-protection` belongs to Protection from
  Poison's composite shape. It requires level-2 timed duration, Poisoned
  removal, condition-scoped Saving Throw Advantage, and fixed Poison damage
  Resistance, so it should not admit Protection from Energy by weakening those
  invariants.

## Decision

Task 19 should close as a precise follow-up split, not as support. The Surface
record is already the correct source owner for the chosen damage Resistance, and
the battle runtime has the target-side active-effect primitive needed for that
Resistance. The missing owner is a Surface target-shape repair followed by a
spell invocation/profile admission path for a single duration-bound chosen
damage-type Resistance spell, plus the Unit catalog claim/evidence and
Quint/runtime parity.

No companion AI or autonomous-control behavior is involved. The spell does not
choose actions for the target. Runtime admission must consume typed spell
procedure facts and the existing cast-time damage-type choice hole, not branch on
`spell.id === "protection_from_energy"`.

## Follow-Up Split

`L3-FOLLOWUP-PROTECTION-FROM-ENERGY-DAMAGE-RESISTANCE`

Promote Protection from Energy's active damage Resistance. Required Surface
prerequisite: repair the target hole so it structurally admits exactly one
willing creature target, matching the RAW touched willing creature and the
existing target-selection vocabulary used by sibling spells. Required runtime
work: admit the repaired Surface record into the Unit catalog; add a spell
invocation profile for Magic Action level-3+ Spell Slot casting, one willing
touched creature target, caster-owned Concentration up to 1 hour, a cast-time
damage type choice restricted to Acid, Cold, Fire, Lightning, and Thunder, and
one spell-owned `damageResistance` active effect with the selected damage type.

The active effect must feed the existing target-side damage adjustment pipeline,
halve only matching damage, compose with existing Immunity/Resistance/
Vulnerability ordering, avoid duplicate Resistance state, and clean up on
Concentration or duration ending. Required output: supported-profile or
profile-subset-supported Unit claim, deterministic admission/projection evidence,
focused runtime tests for each admitted shape including damage-type choice and
cleanup, selected-identity evidence if required by the coverage lane, generated
coverage artifacts, and promoted focused battle-runtime QNT
parity without authored-identity dispatch.

## Reviewer Loop

Round 1 RAW and ubiquitous-language pass:

- Kept the SRD damage-type set exact: Acid, Cold, Fire, Lightning, and Thunder.
- Preserved the willing touched creature target and Concentration duration.
- Split SRD Resistance from the Resistance cantrip because one halves matching
  damage while the other reduces by a rolled d4 once per turn.

Round 2 architecture and connascence pass:

- Did not add a new runtime state field. The future profile should reuse the
  existing `damageResistance` active effect and target-side damage adjustment
  owner.
- Added a Surface prerequisite for the missing willing-creature target shape so
  runtime support does not have to recover target eligibility from authored
  identity or prose.
- Did not weaken Protection from Poison's composite profile to fit another
  spell. Its Poisoned removal, Poison save Advantage, and Poison Resistance
  facts must remain colocated.
- The remaining strong coupling is local and intended: the future profile's
  allowed damage-type choices must match the authored Surface choice hole and the
  SRD spell text.

## Verification Notes

This survey does not add or change Unit claims, Surface catalog admission,
runtime reducers, or promoted Quint behavior. The appropriate verification is
coverage consistency and whitespace checking, not MBT.
