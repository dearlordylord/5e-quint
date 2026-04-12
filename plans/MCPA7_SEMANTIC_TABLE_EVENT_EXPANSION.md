# MCPA7 — Semantic Table Event Expansion

## Purpose

Define the next honest `record_table_event` expansion so MCP can expose
semantic table/world facts without becoming a passthrough for raw internal
`DndEvent` payloads.

## Non-Goal

This task does not wire new table events end to end. It settles which items
deserve new semantic table-event routes, which must stay source-owned elsewhere,
and which lower-layer state changes future implementation slices will need.

## RAW Anchors

- `.references/srd-5.2.1/Playing-the-Game.md`:
  a creature dies if its Hit Point maximum reaches 0, and some effects reduce a
  creature's Hit Point maximum.
- `.references/srd-5.2.1/Rules-Glossary.md` (`Concentration`):
  if the effect's creator loses Concentration, the effect ends.
- `.references/srd-5.2.1/Rules-Glossary.md` (`Dehydration`):
  drinking less than half the required water for a day causes 1 Exhaustion
  level at day's end, and exhaustion caused by dehydration can't be removed
  until the creature drinks the full amount required for a day.
- `.references/srd-5.2.1/Rules-Glossary.md` (`Malnutrition`):
  eating less than half the required food for a day can cause 1 Exhaustion
  level at day's end on a failed DC 10 Constitution save; eating nothing for 5
  days causes automatic Exhaustion progression; exhaustion caused by
  malnutrition can't be removed until the creature eats the full required
  amount for a day.
- `.references/srd-5.2.1/Rules-Glossary.md` (`Suffocation`):
  after a creature runs out of breath or is choking, it gains 1 Exhaustion
  level at the end of each of its turns, and when it can breathe again it
  removes all levels of Exhaustion it gained from suffocating.
- `.references/srd-5.2.1/Rules-Glossary.md` (`Long Rest`):
  if a creature's Hit Point maximum was reduced, it returns to normal when the
  creature finishes a Long Rest unless a more specific effect says otherwise.

## Existing Code Findings

- `record_table_event` is intentionally narrow today. It accepts damage, heal,
  temporary HP, condition changes, exhaustion changes, falling, concentration
  break, failed-save/check semantic triggers, and `BATTLE_HEAL`.
- The blocked raw events are blocked for good reasons:
  - `REDUCE_MAX_HP` / `RESTORE_MAX_HP` are amount-only internal deltas. They do
    not say what caused the change, whether the source caps the reduction above
    0 or 1, or what restores it.
  - `ADD_EFFECT` / `REMOVE_EFFECT` expose internal runtime structure:
    `spellId`, expiry ownership, turn hooks, granted resistances/immunities,
    one-shot rider triggers, and other engine-facing fields that are not stable
    public schemas.
  - `SUFFOCATE`, `APPLY_STARVATION`, and `APPLY_DEHYDRATION` are shortcut
    internals rather than SRD-shaped public commands. In particular,
    `SUFFOCATE` currently drops a creature to 0 HP immediately, which does not
    match SRD 5.2.1 suffocation.
- The repo already has safer semantic patterns to copy:
  - `BREAK_CONCENTRATION` records an external table fact rather than exposing
    raw effect-removal internals.
  - `RECORD_FAILED_SAVING_THROW` and `RECORD_FAILED_ABILITY_CHECK` expose the
    semantic trigger, not the internal `TRIGGER_*` event.
  - conditions and exhaustion already have narrow semantic routes instead of a
    generic "status blob" event.

## Ownership Decision

### Max-HP Change Is Not A Generic Table Event

- Do not add public `REDUCE_MAX_HP` or `RESTORE_MAX_HP` table commands.
- Max-HP reduction must stay on the owning source surface:
  - battle attack / spell / monster-ability resolution when the reduction is
    tied to damage or a combat action;
  - a named curse, disease, or other ongoing effect route when the reduction
    is part of that source's authored progression.
- Max-HP restoration must stay on the owning source surface as well:
  - `LONG_REST` already restores ordinary max-HP reduction to normal;
  - source-specific exceptions must remain authored by that source rather than
    a free-floating restore amount.
- If a future out-of-band table route is needed, it must be named for a source
  family and carry that source's restoration semantics. An amount-only generic
  route is not an honest public contract.

### Lasting Effect Application And Removal Are Source-Owned

- Do not add public `ADD_EFFECT` or `REMOVE_EFFECT` table commands.
- Lasting magical or feature-created effects belong to their owning source:
  - spell/battle action routes for spell-caused effects;
  - source-specific feature or monster-control routes for feature-caused
    effects;
  - existing condition/exhaustion/concentration semantic commands for the
    narrow world facts that already have stable public meaning.
- Effect removal should surface through parent semantics such as:
  - `BREAK_CONCENTRATION`;
  - condition removal;
  - effect-specific expiry or save-success semantics;
  - source-specific end/remove commands where the source text defines them.
- Public MCP input must never supply internal effect-hook payloads,
  granted-fact blobs, or engine-owned effect identifiers as the primary schema.

### Environmental Hazards Do Need Semantic Table Routes

- Hazard progression is the part of this task that should expand
  `record_table_event`.
- The public route must report the semantic world fact for the relevant hazard
  clock, not a pre-baked exhaustion or 0-HP shortcut.

#### Suffocation

- Replace any future public `SUFFOCATE` route with a semantic suffocation
  family:
  - `RECORD_HOLD_BREATH_EXPIRED`
  - `RECORD_SUFFOCATION_TURN_END`
  - `RECORD_BREATHING_RESTORED`
- Recommended ownership split:
  - the external table/session adapter can own minute-scale breath-holding
    timing and submit the semantic transition when breath actually runs out;
  - core should own the post-expiry suffocation progression and the bookkeeping
    needed to remove only suffocation-caused Exhaustion when breathing is
    restored.

#### Malnutrition

- Replace any future public `APPLY_STARVATION` route with a semantic daily
  intake route such as `RECORD_DAILY_FOOD_INTAKE`.
- The public payload should describe the day-level semantic outcome, not raw
  Exhaustion:
  - `intake`: `full` | `atLeastHalf` | `lessThanHalf` | `none`
  - `conSaveSucceeded?` for the `lessThanHalf` case
- Core should own the ongoing hazard state:
  - consecutive days with no food;
  - the automatic Exhaustion threshold after 5 days;
  - the "can't remove this Exhaustion until a full day's food" lock.

#### Dehydration

- Replace any future public `APPLY_DEHYDRATION` route with a semantic daily
  intake route such as `RECORD_DAILY_WATER_INTAKE`.
- The public payload should describe intake relative to the day's requirement,
  not raw Exhaustion:
  - `intake`: `full` | `atLeastHalf` | `lessThanHalf`
- Core should own the dehydration-specific recovery lock:
  - less-than-half intake causes the day's Exhaustion progression;
  - only a full day's water removes the "dehydration-caused Exhaustion can't be
    removed yet" restriction.

## Recommended Follow-Up Slice Shape

- Slice 1: hazard progression ownership in core for suffocation,
  malnutrition, and dehydration, plus semantic command schemas on
  `record_table_event`.
- Slice 2: first source-owned max-HP reduction implementation on the owning
  attack/spell/control surface rather than as a generic table event.
- Slice 3: first source-owned lasting-effect application/removal
  implementation, reusing parent semantics instead of a generic effect payload.

These should remain separate. Hazard progression is the only table-event
expansion slice. Max-HP and lasting effects are ownership constraints for other
source-specific follow-up tasks, not a reason to widen `record_table_event`
into a generic mutation surface.

## Summary

- `record_table_event` should expand only for semantic hazard progression, not
  for raw max-HP or raw effect payloads.
- Max-HP change must stay source-owned; `LONG_REST` and specific source rules
  own restoration semantics.
- Lasting effects must stay source-owned; semantic condition/concentration
  routes remain the safe public table-fact layer.
- Suffocation, malnutrition, and dehydration should use SRD-shaped progression
  commands instead of the current shortcut internals.
