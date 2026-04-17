# Candle of Invocation

## Verdict

`structural_widening`

I did not author `content/magic_item_candle_of_invocation.dhall`.

## Why it does not fit honestly

`Candle of Invocation` is not a normal passive magic item and not a normal activation item.

Existing `MagicItemRecord` mechanics support:

- `passive` for always-on grants
- `activation` for a one-shot use with resource/reset semantics

This item instead has a stateful lifecycle:

1. A Magic action lights the candle.
2. While lit, it projects a persistent aura with benefits to creatures in its light.
3. The lit state can be paused by snuffing the candle out.
4. The item tracks cumulative burn time in 1-minute increments up to 4 hours total.
5. On the first lighting only, the user may instead cast `Gate`, which destroys the candle immediately.

That combination is a missing family/subgraph, not a small variant on an existing one.

## Forced widenings

### 1. Stateful lit-item subgraph

Need a magic-item shape that can represent:

- an activation that enters a persistent item state
- pausing/resuming that state
- cumulative timed consumption
- deterministic destruction when lifetime is exhausted
- persistent aura effects while the state is active

RAW evidence:

> "This candle's magic is activated when the candle is lit, which requires a Magic action. After burning for 4 hours, the candle is destroyed. You can snuff it out early for use at a later time. Deduct the time it burned in increments of 1 minute from its total burn time."

### 2. First-use branch on activation

The item has a mutually exclusive branch on first light:

- normal lit-state behavior, or
- cast `Gate` and destroy the candle

That is not expressible as current `activation` phases without lying about the item's future state/lifecycle.

RAW evidence:

> "Alternatively, when you light the candle for the first time, you can cast Gate with it. Doing so destroys the candle."

### 3. Missing `D20 Tests` umbrella selector

The current surface can target:

- `attack_roll`
- `saving_throw`
- `ability_check`
- `initiative`
- `death_saving_throw`

It cannot honestly say "all D20 Tests" as one rules term.

RAW evidence:

> "While you are within that light, you have Advantage on D20 Tests."

### 4. Missing slot-waiver effect for prepared spell subsets

`grant_spell_access` only grants named spells through fixed modes. The candle instead waives slot expenditure for:

- a class-filtered caster set: Cleric or Druid
- a spell-level filter: level 1
- a prepared-spells subset: spells they already have prepared
- an area gate: while in the light

That is a different mechanic than granting access to `gate`, `knock`, or `magic_missile`.

RAW evidence:

> "a Cleric or Druid in the light can cast level 1 spells they have prepared without expending spell slots."

## Non-blocking note

The `Gate` destination plane choice is not the main classification driver. The text explicitly delegates that plane choice to the GM or a table roll, so that part is caller-owned/DM-owned on top of the structural blocker:

> "The portal created by the spell links to a particular Outer Plane chosen by the GM or determined by rolling on the following table."

