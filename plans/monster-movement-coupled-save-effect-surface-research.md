# MONFAC1C Research: Movement-Coupled Save Effect Surface

Date: 2026-04-14

Task: `MONFAC1C - Movement-Coupled Save Effect Surface`

## Outcome

Choose a movement-owned traversal surface as the prerequisite owner.

`MONFAC1C` should complete as research, and the next implementation task should land a generic traversal movement action surface before any `Trampling Charge` save-effect runtime work begins.

## RAW Check

Relevant SRD text:

- `.references/srd-5.2.1/Monsters/Monsters-C-D.md` > `Centaur Trooper`
  - `Trampling Charge (Recharge 5-6).` The centaur moves up to its Speed without provoking Opportunity Attacks and can move through the spaces of Medium or smaller creatures. Each creature whose space the centaur enters is targeted once by the following effect. `Strength Saving Throw:` DC 14. `Failure:` 7 (1d6 + 4) Bludgeoning damage, and the target has the Prone condition.
- `.references/srd-5.2.1/Monsters/Monsters-E-G.md` > `Gelatinous Cube`
  - `Engulf.` The cube moves up to its Speed without provoking Opportunity Attacks. The cube can move through the spaces of Large and smaller creatures ... each creature whose space the cube enters for the first time during this move ...
- `.references/srd-5.2.1/Monsters/Monsters-P-S.md` > `Sahuagin`
  - `Aquatic Charge.` The sahuagin swims up to its Swim Speed straight toward an enemy it can see.
- `.references/srd-5.2.1/Monsters/Monsters-T-Z.md` > `Unicorn`
  - `Charging Horn.` The unicorn moves up to half its Speed without provoking Opportunity Attacks, and it makes one Radiant Horn attack.

Relevant ubiquitous language:

- `Saving Throw`
- `Prone`
- `Movement`
- `Speed`
- `Opportunity Attack`
- `Size`

## Decision

The hard boundary is movement ownership, not the save rider.

`Trampling Charge` cannot be modeled as another `saveEffectAction` variant because the current generic save-effect lane assumes:

- one chosen target before resolution;
- a fixed sight/range check from the actor's current position; and
- no path traversal facts.

The current battle movement lane also is not enough by itself:

- `BATTLE_MOVE` spends 5 feet and optionally opens an opportunity-attack window;
- it receives only a threatened set and provocation kind;
- it does not carry destination/path facts; and
- it does not update `battlePosition`.

That means the engine currently has no generic owner for:

- a caller-supplied traversal path;
- entered-creature enumeration in traversal order;
- once-per-creature targeting during one movement sequence; or
- authored permission to move through other creatures' spaces by size.

## Family Boundary

Use a movement-owned traversal family, not a `Trampling Charge` one-off.

`Centaur Trooper` proves the first tracer bullet, but the reusable shell is broader than one stat block:

- movement up to a bounded speed budget;
- optional no-opportunity-attack traversal;
- optional pass-through size cap for creature spaces;
- explicit caller-owned entered-creature facts;
- one trigger per creature per movement sequence; and
- a hook for a rider resolved against entered creatures.

Nearby SRD actions confirm where this task stops:

- `Gelatinous Cube` `Engulf` shares the traversal shell, but its engulf state, success reposition rule, and ongoing containment effects are a later rider family.
- `Aquatic Charge` is movement-only and should stay a separate mobility slice.
- `Charging Horn`, dragon `Pounce`, `Onslaught`, and similar move-then-attack actions are move-plus-attack families, not traversal-triggered save-effect families.

## Implementation Handoff

The next implementation task should:

1. Add a generic monster traversal movement action surface owned by movement, not by the save-effect lane.
2. Require explicit runtime traversal facts from the caller:
   - total movement spent or final destination
   - ordered entered-creature ids
   - once-per-creature guarantee for the current traversal
   - visibility / path legality facts still owned by the caller
3. Let the movement surface project authored clauses such as:
   - `move up to its Speed`
   - `without provoking Opportunity Attacks`
   - `can move through the spaces of Medium or smaller creatures`
4. Hang a narrow entered-creature rider hook off that movement surface for the first tracer bullet:
   - `Strength Saving Throw`
   - fail: Bludgeoning damage + `Prone`
5. Leave these out of scope:
   - `Engulf` containment / escape / success reposition
   - move-then-attack actions such as `Charging Horn`
   - pure movement actions such as `Aquatic Charge`

## Verification Guidance

When the follow-on implementation lands:

- verify the movement shell is generic and movement-owned rather than `Trampling Charge`-named;
- verify `Centaur Trooper` becomes the first consumer of that shell;
- keep `Gelatinous Cube` and other adjacent actions text-only unless they match the landed shell plus rider exactly;
- run narrow core tests first; MBT remains unnecessary unless creature-level projection semantics change.
