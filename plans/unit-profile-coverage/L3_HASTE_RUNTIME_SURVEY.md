# L3 Haste Runtime Survey

Task: `L3-SPELL-HASTE-RUNTIME-SURVEY`

## RAW And Language Check

Local RAW exists for SRD 5.2.1 Haste in
`.references/srd-5.2.1/Spells/Descriptions-E-L.md#Haste`.
The spell is a level-3 Transmutation spell with Magic Action casting, 30-foot
range, Concentration up to 1 minute, and one willing creature target the caster
can see.

The runtime-visible clauses are:

- the target's Speed is doubled until the spell ends;
- the target gains a +2 bonus to Armor Class;
- the target has Advantage on Dexterity Saving Throws;
- the target gains one additional action on each of its turns, usable only for
  Attack with one attack only, Dash, Disengage, Hide, or Utilize;
- when the spell ends, the target is Incapacitated and has Speed 0 until the end
  of its next turn.

`UBIQUITOUS_LANGUAGE.md` confirms the relevant terms: Magic Action, Spell Slot,
Concentration, Speed versus Movement, Armor Class, Saving Throw, Advantage,
Action, Attack action, Dash, Disengage, Hide, Utilize, and Incapacitated. It
also confirms that Incapacitated blocks actions, Bonus Actions, and Reactions
but does not itself set Speed to 0, so Haste's end rider needs an explicit Speed
0 projection in addition to the Incapacitated condition.

## Current State

`haste` is present in the local SRD corpus but not authored in
`packages/surface/content/`, not imported by `packages/surface/src/surface/unit-catalog.ts`,
and not present in `plans/unit-profile-coverage/unit-claims.jsonl`. The active
Unit matrix therefore has no Haste row to mark supported or unsupported.

Legacy root Quint files mention Haste, but promoted Unit/StatBlock-backed battle
behavior is owned by `@dnd/battle-runtime` and its distributed QNT evidence:
shared rule-core slices, focused runtime slices, and focused witnesses.
The promoted model and runtime do not currently claim a Haste Unit
profile.

Existing reusable pieces:

- Surface has `modify_ac`, `set_speed_ratio`, `modify_roll_advantage`, and
  `grant_extra_action` effect atoms.
- Surface `ActionRestriction` only supports `none` and `exclude`; it cannot
  express Haste's allow-list or the Attack branch's "one attack only" rider.
- Battle runtime already projects scalar spell AC bonuses and additive Speed
  deltas for `spell.scalar-buff`, but not Speed ratios, ongoing Dexterity
  Saving Throw Advantage from scalar buffs, spell-granted extra action
  resources, or end-of-effect lethargy.
- Battle runtime has action-resource machinery for feature-granted extra
  actions such as Action Surge, but the current restriction type cannot model
  Haste exactly and the spell active-effect lifecycle does not grant a target
  action resource each turn from a spell effect.

## Decision

Task 6 should close as a follow-up split, not as support. Adding a Haste Unit
claim now would collapse missing Surface authoring, action-economy widening,
active AC/Speed/Saving Throw projections, and lethargy lifecycle into one
unsupported row with no executable owner.

The split should keep authored identity at Surface/catalog boundaries. Runtime
admission must use typed spell procedure facts and support profiles, not a
branch on `spell.id === "haste"`.

## Follow-Up Split

`L3-FOLLOWUP-HASTE-SURFACE-AUTHORING`

Author `packages/surface/content/haste.dhall` and generated JSON only after
Surface can represent the Haste extra-action restriction and the end-of-effect
lethargy rider without loss. Required Surface work: extend
`ActionRestriction` within the existing `grant_extra_action` shape to represent
an allow-list with Attack limited to one attack only; add or reuse a typed
operation for end-of-effect Incapacitated plus Speed 0 until the end of the
target's next turn; and encode Magic Action casting, level-3 Spell Slot,
30-foot visible willing-creature targeting, Concentration, doubled Speed, +2
Armor Class, Dexterity Saving Throw Advantage, restricted additional action,
and lethargy.

`L3-FOLLOWUP-HASTE-POSITIVE-RUNTIME`

Promote Haste's active positive effect after Surface authoring. Required runtime
work: Magic Action and level-3+ Spell Slot spend, caster-owned Concentration,
known willing target admission, active Speed ratio projection used by Movement
and Dash budgets, +2 Armor Class projection, Dexterity Saving Throw Advantage
with normal roll-mode cancellation, and one spell-granted action resource on
each target turn restricted to Attack with one attack only, Dash, Disengage,
Hide, or Utilize. Required output: Supported-profile or profile-subset-supported
Unit claim, deterministic admission/projection evidence, focused runtime tests,
and promoted Quint/runtime parity without authored-identity dispatch.

`L3-FOLLOWUP-HASTE-LETHARGY-RUNTIME`

Promote Haste's end rider after the active spell lifecycle exists. Required
runtime work: when the Haste spell effect ends for a target, remove the positive
effect and apply a source-owned lethargy state that gives Incapacitated and
Speed 0 until the end of that target's next turn. The state must preserve any
pre-existing Incapacitated source and must not use Incapacitated as an implicit
Speed-0 shortcut. Required output: focused end-of-concentration, duration
expiration, recast/replacement, and target-turn cleanup tests plus promoted
Quint/runtime parity.

## Verification Notes

This survey does not add or change Unit claims, Surface catalog admission,
runtime reducers, or promoted Quint behavior. The appropriate verification is
coverage consistency and whitespace checking, not MBT.
