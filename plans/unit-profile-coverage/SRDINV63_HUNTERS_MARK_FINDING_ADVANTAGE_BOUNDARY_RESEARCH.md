# SRDINV63 Hunter's Mark Finding-Advantage Boundary Research

Task 265 reviewed Hunter's Mark's finding Advantage clause. No runtime behavior
was implemented in this task.

## Source Review

Local RAW sources checked:

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md` lines 1275-1288 for
  Hunter's Mark.
- `.references/srd-5.2.1/Rules-Glossary.md` lines 45-65 for Ability Check and
  Advantage.
- `.references/srd-5.2.1/Rules-Glossary.md` lines 315-317 for D20 Test.
- `.references/srd-5.2.1/Rules-Glossary.md` lines 858-869 for Search and its
  Perception/Survival examples.
- `UBIQUITOUS_LANGUAGE.md` lines 1-24 and 343-346 for Ability Check,
  Advantage, Disadvantage, and Passive Check vocabulary.

Relevant RAW facts:

- Hunter's Mark marks one visible creature as the caster's quarry.
- While the spell lasts, the caster has Advantage on any Wisdom (Perception or
  Survival) check made to find the marked creature.
- Ability Checks are D20 Tests. Advantage is a binary D20 roll modifier, not a
  numeric bonus.
- The GM decides whether a D20 Test is warranted.
- Search is a battle action candidate when something is not obvious. Its table
  names Perception for concealed creatures or objects and Survival for tracks
  or food.

## Existing Boundary

Hunter's Mark is a profile-subset-supported Unit. The promoted runtime owns
the combat mark, attack-roll damage rider, Bonus Action transfer,
Concentration cleanup, and slot-scaled maximum duration. Runtime state already
carries the marked target identity in the Hunter's Mark active effect.

The Surface schema can author roll Advantage effects with `on:
["ability_check"]` and a fixed skill filter, but Hunter's Mark's clause is also
target-purpose-scoped: the check must be made to find the marked creature. A
standalone Surface roll modifier would lose that target relationship unless
the runtime projected it from the active mark.

The battle runtime already has a narrow ability-check boundary:

- Hide asks for a Dexterity (Stealth) check.
- Search asks for a Wisdom (Perception) check against a hidden combatant's
  discovery DC.
- spell restraint escapes ask for Strength (Athletics) checks.

Those ability-check holes accept a final total. They do not carry an
Advantage/Disadvantage roll mode, and the allowed hole skills are `stealth`,
`perception`, and `athletics`; there is no promoted Survival or tracking
procedure.

## Boundary Decision

The Hunter's Mark finding clause is not exploration-only metadata. RAW makes it
an Advantage modifier on a Wisdom ability check, and the battle runtime already
has a Search action that can ask for a Wisdom (Perception) check to find a
hidden combatant.

It is also not a generic always-on battle roll modifier. The clause applies
only when the caster is making a Wisdom (Perception or Survival) check to find
the marked creature. The table/caller owns the decision that a check
exists, the purpose of that check, and any Survival/tracking facts not already
represented by battle state.

The correct battle boundary is a caller-supplied ability-check modifier:

- The existing Hunter's Mark active effect remains the canonical source for
  marked target identity. Do not add a parallel "tracking target" or "finding
  advantage" state field.
- At an explicit battle ability-check hole whose actor is the Hunter's Mark
  caster, whose target/purpose is finding the marked creature, and whose check
  is Wisdom (Perception or Survival), the runtime may project Advantage onto
  that hole.
- Existing Search against a hidden marked combatant is the first executable
  battle case: the target choice already identifies the hidden combatant, and
  the hole is Wisdom (Perception).
- Survival tracking remains outside the promoted battle runtime until a
  caller-supplied tracking/Search ability-check boundary exists. Do not add a
  Hunter's-Mark-specific tracking action.
- The fill should still carry the adjudicated total. If a future task widens
  ability-check holes with roll mode, the caller rolls with the projected mode
  and submits the final total; the runtime should not store d20 dice beside the
  final check result unless a separate executable boundary needs them.

This keeps invalid states unrepresentable at the boundary that matters: a
future Advantage projection is derived from the live mark and the requested
ability-check purpose, so it cannot outlive the mark or point at a different
creature.

## Follow-Up Runtime Shape

No dedicated SRDINV63 implementation task is needed before SRDINV66. If a later
planning review decides to close Hunter's Mark's remaining deferred mechanic,
the smallest runtime slice should be a generic ability-check roll-mode widening
that Hunter's Mark can use:

- add an optional roll mode to `BattleAbilityCheckHole`;
- extend Search's hidden-target Wisdom (Perception) hole to project Advantage
  when the searching actor has an active Hunter's Mark on that hidden target;
- keep the mark identity sourced from the existing Hunter's Mark active effect;
- avoid a separate Hunter's-Mark-specific tracking state or action;
- add Survival only through a general caller-supplied tracking/Search check
  boundary, not as a bespoke spell procedure.

## Plan Impact

- SRDINV63 can close as research complete.
- SRDINV66 should treat SRDINV63 as unblocked/done for the deferred-clause
  planning review.
- Hunter's Mark remains profile-subset-supported until an ability-check
  Advantage roll-mode boundary is promoted. The coverage matrix should point
  the classified gap at SRDINV66, which owns deciding whether to append later
  generic ability-check roll-mode work.
- No new task is required immediately; a later generic ability-check roll-mode
  task can be appended if SRDINV66 wants full Hunter's Mark closure.

## /simplify Convergence

- Round 1: rejected exploration-only classification. The SRD clause modifies an
  Ability Check, and battle Search can be a check to find a hidden marked
  combatant.
- Round 2: rejected duplicate Hunter's Mark tracking state and a bespoke
  Survival tracking action. The mark identity already exists in the active
  effect, while check existence and tracking facts remain caller/table owned.
