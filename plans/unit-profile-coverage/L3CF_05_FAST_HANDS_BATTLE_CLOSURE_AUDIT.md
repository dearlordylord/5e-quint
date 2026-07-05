# L3CF-05 Fast Hands Battle Closure Audit

## Decision

Fast Hands remains a deterministic battle-admission profile only. Task
L3CF-05 does not promote a reducer, QNT witness, or selected-identity replay
because there is no battle-owned Bonus Action shell independent of the concrete
delegated procedures.

## RAW Trace

- `.references/srd-5.2.1/Classes/Rogue.md:159-166`: Fast Hands lets the Rogue
  use a Bonus Action to do one listed branch.
- The Sleight of Hand branch is a Dexterity (Sleight of Hand) check for picking
  a lock, disarming a trap with Thieves' Tools, or picking a pocket.
- The object-use branch permits the Utilize action, or the Magic action to use a
  magic item that requires that action.
- `UBIQUITOUS_LANGUAGE.md`: a Bonus Action is an action-resource cost; a Magic
  Action is broader than spellcasting and can include features or magic items.

## Current Runtime Boundary

- `packages/surface/content/rogue_fast_hands.json` already models the authored
  shape as `bonus_action_delegated_standard_actions`.
- `packages/battle-runtime/src/unit-feature-support.ts` admits that shape and
  projects typed metadata for the declared Bonus Action cost and delegated
  options.
- Current battle subjects have generic alternate-cost support for concrete
  battle actions such as Dash, Disengage, and Hide. They do not have concrete
  lock, trap, pocket, generic Utilize object-use, or magic-item activation
  procedures for Fast Hands to wrap.
- The only current `utilize` mapping found in battle action dispatch is a
  specific escape-spell-restraint procedure, not a generic object interaction
  or magic-item activation boundary.

## Closure

Promoting an isolated Fast Hands shell would spend a Bonus Action without an
executable delegated procedure, or it would require inventing item/object state
owned by future table, object-use, or magic-item activation owners. The precise
closure is:

- lock, trap, and pocket checks: table/tool-check owner;
- generic Utilize object effects: Utilize action owner;
- magic-item Magic action activation: magic-item activation owner.

Those concrete owners should consume the admitted Fast Hands profile and spend
the Bonus Action when they exist. Until then, the Unit profile has no QNT owner
and no selected-identity replay boundary beyond deterministic admission and
projection evidence.

## Verification Notes

- No D&D rule behavior was newly modeled in a reducer.
- No item, object, or table-check state was added.
- Connascence check: the repeated ownership wording is localized to
  `unit-claims.jsonl`, `profiles.jsonl`, `task-claims.jsonl`, and generated
  unit-profile reports.
