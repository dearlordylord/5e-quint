# L1I Barbarian Danger Sense Profile Decision

Task 14 keeps `barbarian_danger_sense` unsupported and decides the smallest
future supported-profile owner. No runtime behavior, Surface schema, Unit
catalog admission, or generic `modify_roll_advantage` support changed.

## RAW Sources

- `.references/srd-5.2.1/Classes/Barbarian.md:90-92`: Danger Sense is a
  Barbarian level 2 feature that grants Advantage on Dexterity Saving Throws
  unless the Barbarian has the Incapacitated condition.
- `.references/srd-5.2.1/Playing-the-Game.md:116-131`: Saving Throws are
  named for the ability modifiers they use, and Dexterity Saving Throws are
  used to dodge out of harm's way.
- `.references/srd-5.2.1/Playing-the-Game.md:185-199`: Advantage is a d20
  roll mode and multiple Advantage or Disadvantage sources do not stack.
- `.references/srd-5.2.1/Rules-Glossary.md:594-604`: Incapacitated is the
  condition named by the suppression gate.
- `UBIQUITOUS_LANGUAGE.md:7-20`: Saving Throw and Advantage are the canonical
  roll and roll-mode terms.
- `UBIQUITOUS_LANGUAGE.md:103-127`: Incapacitated and the condition consequence
  index keep the suppression gate centralized.

## Surface Record Read

- `packages/surface/content/barbarian_danger_sense.dhall`
- `packages/surface/content/barbarian_danger_sense.json`

## Existing Owners Read

- `packages/surface/src/surface/schema-spell.ts:2018-2043` defines the generic
  `modify_roll_advantage` atom, including `on`, `conditionFilter`, and
  `saveAbilityFilter`.
- `packages/surface/src/surface/schema-nonspell.ts:322-325` and
  `packages/surface/src/surface/schema-nonspell.ts:551-556` define passive
  condition suppressors and passive grants.
- `packages/character-battle-runtime/src/battle-creature-init.ts:433-455`
  already forwards retained class-feature and species-trait Units into battle
  creature initialization when those Units are admitted.
- `packages/battle-runtime/src/battle-reducer/spells-damage-fills.ts:779-824`
  projects Saving Throw roll modes for Dodge and a narrow spell-hosted
  hostile-target rule, but does not consume class-feature Unit passive grants.
- `packages/battle-runtime/src/unit-feature-support.ts:2992-3015` accepts
  ongoing-feature `modify_roll_advantage` only for attack rolls and rejects
  `saveAbilityFilter`, so it cannot admit Danger Sense.
- `packages/shared-algebras/src/conditions-algebra.ts:28-33` already derives
  Incapacitated from direct Incapacitated plus stronger conditions, which is the
  suppression predicate the future owner should reuse.

## Current State

`barbarian_danger_sense` is authored as a passive class-feature Surface record.
Its payload already names the rule facts the future executable owner needs:

- `on = ["saving_throw"]`;
- `saveAbilityFilter = ["dex"]`;
- `suppressedBy = [{ kind = "condition_active", conditions = ["incapacitated"] }]`.

Those authored facts are necessary but not enough for supported-profile
admission. The generic `modify_roll_advantage` atom can also express unrelated
roll-mode shapes, and the current promoted Unit feature parser does not execute
Saving Throw roll-mode grants or the passive Incapacitated suppressor.

## Decision

The smallest future supported profile should be:

`unit-feature.passive-saving-throw-roll-mode`

That profile should live at the battle Saving Throw hole/projection boundary,
with Character Battle init supplying the retained class-feature Unit identity
from CharacterBuild and Battle Runtime applying the projection from the current
target state. A supported Danger Sense claim is valid only when one operation
can execute all of these facts together:

- the target combatant has the `barbarian_danger_sense` feature retained from a
  Barbarian level 2 CharacterBuild;
- the Saving Throw witness is an ordinary ability-tied Saving Throw, not a
  Death Saving Throw;
- the Saving Throw ability is Dexterity;
- the current target conditions do not satisfy the Incapacitated predicate,
  including Paralyzed, Petrified, Stunned, and Unconscious through the shared
  condition algebra;
- the projected mode composes with other Advantage and Disadvantage sources
  through the existing non-stacking roll-mode rules.

Until that boundary exists, keep `barbarian_danger_sense` as
`unsupported-profile`.

## Follow-Up

Add a future battle-runtime profile task only when later-level class-feature
retention and Saving Throw roll-mode projection are in scope. That task should
extend the existing Saving Throw roll-mode projection helper rather than add a
Danger-Sense-specific adapter, and it should parse only the exact passive
Saving Throw profile shape before admitting the Unit.

Task 19 can reuse this boundary for Dwarven Resilience's condition-scoped
Saving Throw Advantage if it lands. Powerful Build's Ability Check Advantage
should be a sibling roll-mode boundary or a shared d20 roll-mode helper only
after both Saving Throw and Ability Check witnesses have explicit typed gates.

## Review Notes

- RAW and ubiquitous-language pass: checked Danger Sense, Saving Throw,
  Dexterity, Advantage, and Incapacitated against the local SRD corpus and
  project vocabulary.
- Architecture/domain pass: the owner is a Unit feature passive Saving Throw
  roll-mode profile at the battle Saving Throw projection boundary because the
  necessary facts are class-feature identity, a concrete Saving Throw witness,
  and current battle conditions.
- Connascence pass: the future profile name is intentionally not added to
  `profiles.jsonl` until executable support exists; the repeated Unit id is
  localized to the claim row, this decision artifact, and generated coverage
  output.
- Code-review pass: no executable parser, reducer, support gate, or runtime
  behavior changed.
- Round 1: rejected promoting generic `modify_roll_advantage`; it cannot make
  the Saving Throw ability filter and Incapacitated suppression gate executable
  at admission.
- Round 2: rechecked that the claim remains `unsupported-profile` after
  generated coverage refresh.

## Verification

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `git diff --check`
- MBT not run: this changes coverage/decision metadata, with no promoted battle
  runtime behavior.
