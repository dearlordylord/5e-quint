# Level 1-2 Driver Scope

This file is the Work Loop filter for the cleanroom target engine. It was
produced from the source cleanroom corpus shape only. The target task report,
not this source-owned scope snapshot, records the concrete manifest source
commit SHA from `cleanroom-input/MANIFEST.md`.

- `cleanroom-input/MANIFEST.md`
- `cleanroom-input/raw/srd-5.2.1/**`
- `cleanroom-input/qnt/**`
- `cleanroom-input/domain/UBIQUITOUS_LANGUAGE.md`
- `cleanroom-input/domain/CLEANROOM_ASSUMPTIONS.md`
- existing `tasks/**`

## Scope Rule

`in` means the whole `.mbt.qnt` driver is suitable for the character-level-1
through character-level-2 Work Loop. `out` means the driver is wholly about
later-level character access, later spell access, or other content unavailable
to a level 1-2 SRD character. `flagged` means the driver mixes in-scope and
out-of-scope obligations, or the copied cleanroom corpus does not settle the
driver's level-1-2 reachability.

Spell level and character level are separate. Cantrips and spell-level-1 spells
are reachable at character levels 1-2 when a class feature, species trait, feat,
or spell list grants them. Spell-level-2 spells first enter ordinary class spell
access at character level 3 in the copied SRD class tables.

Base combat rules with no acquisition level are `in` when they are generally
available to level-1 characters. Monster/stat-block control witnesses are `in`
when they are battle rules a level-1 or level-2 character can encounter, rather
than authored character features.

Flagged drivers are not part of the ordered in-scope queue until the owner
question is answered.

## Current Branch-Inventory-Ready Queue

This queue lists branch-inventory-ready drivers for this scaffold revision.
`tasks/ACTIVE_WORK.json` selects which ready drivers are assigned to a run.
Additional source branch inventory rows may exist for future drivers; they are
not selectable implementation tasks until the source-owned active work file,
scope snapshot, and source branch inventory are revised together.

1. `cleanroom-input/qnt/character-creation-runtime/character-creation-class-feature-projections.mbt.qnt`
2. `cleanroom-input/qnt/character-creation-runtime/character-creation-cleric-druid-order-selected-identity.mbt.qnt`
3. `cleanroom-input/qnt/character-creation-runtime/character-creation-fighter-fighting-style-selected-identity.mbt.qnt`
4. `cleanroom-input/qnt/character-creation-runtime/character-creation-runtime.mbt.qnt`
5. `cleanroom-input/qnt/character-creation-runtime/character-creation-weapon-mastery-containers-selected-identity.mbt.qnt`
6. `cleanroom-input/qnt/character-sheet-runtime/character-sheet-ability-check-proficiency-bonus.mbt.qnt`
7. `cleanroom-input/qnt/character-sheet-runtime/character-sheet-armor-class-base-selected-identity.mbt.qnt`
8. `cleanroom-input/qnt/character-sheet-runtime/character-sheet-healing-resource-selected-identity.mbt.qnt`
9. `cleanroom-input/qnt/character-sheet-runtime/character-sheet-hit-point-maximum.mbt.qnt`
10. `cleanroom-input/qnt/character-sheet-runtime/character-sheet-hp-rest-hit-dice.mbt.qnt`
11. `cleanroom-input/qnt/character-sheet-runtime/character-sheet-spellbook-ritual-selected-identity.mbt.qnt`
12. `cleanroom-input/qnt/character-sheet-runtime/character-sheet-weapon-mastery-containers-selected-identity.mbt.qnt`
13. `cleanroom-input/qnt/character-battle-runtime/character-battle-origin-feat-selected-identity.mbt.qnt`
14. `cleanroom-input/qnt/battle-runtime/battle-runtime-adrenaline-rush.mbt.qnt`
15. `cleanroom-input/qnt/battle-runtime/battle-runtime-attack-spell-shape-selected-identity.mbt.qnt`
16. `cleanroom-input/qnt/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt`
17. `cleanroom-input/qnt/battle-runtime/battle-runtime-command-option-next-turn.mbt.qnt`
18. `cleanroom-input/qnt/battle-runtime/battle-runtime-command-ordering.mbt.qnt`
19. `cleanroom-input/qnt/battle-runtime/battle-runtime-concentration-break-teardown.mbt.qnt`
20. `cleanroom-input/qnt/battle-runtime/battle-runtime-creature-type-protection-and-charm-selected-identity.mbt.qnt`
21. `cleanroom-input/qnt/battle-runtime/battle-runtime-danger-sense-selected-identity.mbt.qnt`
22. `cleanroom-input/qnt/battle-runtime/battle-runtime-death-saving-throw.mbt.qnt`
23. `cleanroom-input/qnt/battle-runtime/battle-runtime-dragonborn-breath-weapon.mbt.qnt`
24. `cleanroom-input/qnt/battle-runtime/battle-runtime-druid-wild-shape-form-lifecycle.mbt.qnt`
25. `cleanroom-input/qnt/battle-runtime/battle-runtime-eldritch-blast.mbt.qnt`
26. `cleanroom-input/qnt/battle-runtime/battle-runtime-feature-selected-identity.mbt.qnt`
27. `cleanroom-input/qnt/battle-runtime/battle-runtime-find-familiar-companion-lifecycle.mbt.qnt`
28. `cleanroom-input/qnt/battle-runtime/battle-runtime-find-familiar-selected-identity.mbt.qnt`
29. `cleanroom-input/qnt/battle-runtime/battle-runtime-healing-stabilization-selected-identity.mbt.qnt`
30. `cleanroom-input/qnt/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt`
31. `cleanroom-input/qnt/battle-runtime/battle-runtime-interrupt-stack-resume.mbt.qnt`
32. `cleanroom-input/qnt/battle-runtime/battle-runtime-level1-buff-mark-smite-selected-identity.mbt.qnt`
33. `cleanroom-input/qnt/battle-runtime/battle-runtime-level1-damage-spell-selected-identity.mbt.qnt`
34. `cleanroom-input/qnt/battle-runtime/battle-runtime-level1-spatial-witness-selected-identity.mbt.qnt`
35. `cleanroom-input/qnt/battle-runtime/battle-runtime-mage-armor-selected-identity.mbt.qnt`
36. `cleanroom-input/qnt/battle-runtime/battle-runtime-magic-missile.mbt.qnt`
37. `cleanroom-input/qnt/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt`
38. `cleanroom-input/qnt/battle-runtime/battle-runtime-roll-modifier-active-effects.mbt.qnt`
39. `cleanroom-input/qnt/battle-runtime/battle-runtime-roll-modifier-buff-selected-identity.mbt.qnt`
40. `cleanroom-input/qnt/battle-runtime/battle-runtime-sanctuary-selected-identity.mbt.qnt`
41. `cleanroom-input/qnt/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt`
42. `cleanroom-input/qnt/battle-runtime/battle-runtime-scalar-buff-active-effects.mbt.qnt`
43. `cleanroom-input/qnt/battle-runtime/battle-runtime-scalar-buff.mbt.qnt`
44. `cleanroom-input/qnt/battle-runtime/battle-runtime-sleep-repeat-save.mbt.qnt`
45. `cleanroom-input/qnt/battle-runtime/battle-runtime-sorcerer-metamagic-careful-selected-identity.mbt.qnt`
46. `cleanroom-input/qnt/battle-runtime/battle-runtime-sorcerer-metamagic-distant-selected-identity.mbt.qnt`
47. `cleanroom-input/qnt/battle-runtime/battle-runtime-sorcerer-metamagic-empowered-selected-identity.mbt.qnt`
48. `cleanroom-input/qnt/battle-runtime/battle-runtime-sorcerer-metamagic-extended-selected-identity.mbt.qnt`
49. `cleanroom-input/qnt/battle-runtime/battle-runtime-sorcerer-metamagic-heightened-selected-identity.mbt.qnt`
50. `cleanroom-input/qnt/battle-runtime/battle-runtime-sorcerer-metamagic-seeking-selected-identity.mbt.qnt`
51. `cleanroom-input/qnt/battle-runtime/battle-runtime-sorcerer-metamagic-selected-identity.mbt.qnt`
52. `cleanroom-input/qnt/battle-runtime/battle-runtime-sorcerer-metamagic-spell-attack-selected-identity.mbt.qnt`
53. `cleanroom-input/qnt/battle-runtime/battle-runtime-sorcerer-metamagic-spell-attack-sequence-selected-identity.mbt.qnt`
54. `cleanroom-input/qnt/battle-runtime/battle-runtime-sorcerer-metamagic-subtle-selected-identity.mbt.qnt`
55. `cleanroom-input/qnt/battle-runtime/battle-runtime-sorcerer-metamagic-transmuted-selected-identity.mbt.qnt`
56. `cleanroom-input/qnt/battle-runtime/battle-runtime-sorcerer-metamagic-twinned-selected-identity.mbt.qnt`
57. `cleanroom-input/qnt/battle-runtime/battle-runtime-species-passive-trait-selected-identity.mbt.qnt`
58. `cleanroom-input/qnt/battle-runtime/battle-runtime-spell-attack-ordering.mbt.qnt`
59. `cleanroom-input/qnt/battle-runtime/battle-runtime-starry-wisp-object.mbt.qnt`
60. `cleanroom-input/qnt/battle-runtime/battle-runtime-stat-block-action-ordering.mbt.qnt`
61. `cleanroom-input/qnt/battle-runtime/battle-runtime-thaumaturgy-selected-identity.mbt.qnt`
62. `cleanroom-input/qnt/battle-runtime/battle-runtime-turn-boundary-effect-lifecycle.mbt.qnt`
63. `cleanroom-input/qnt/battle-runtime/battle-runtime-weapon-attack-ordering.mbt.qnt`
64. `cleanroom-input/qnt/battle-runtime/battle-runtime-weapon-attack-skeleton.mbt.qnt`
65. `cleanroom-input/qnt/battle-runtime/battle-runtime-weapon-hosted-attack-and-riders.mbt.qnt`
66. `cleanroom-input/qnt/battle-runtime/battle-runtime-weapon-mastery-selected-identity.mbt.qnt`
67. `cleanroom-input/qnt/battle-runtime/battle-runtime-zero-hit-point-mid-resolution.mbt.qnt`
68. `cleanroom-input/qnt/battle-runtime/creature-attack.mbt.qnt`
69. `cleanroom-input/qnt/battle-runtime/rule-core-attack-damage-disposition.mbt.qnt`
70. `cleanroom-input/qnt/battle-runtime/rule-core-hit-point-damage.mbt.qnt`
71. `cleanroom-input/qnt/battle-runtime/rule-core-movement.mbt.qnt`
72. `cleanroom-input/qnt/battle-runtime/rule-core-reactions.mbt.qnt`
73. `cleanroom-input/qnt/battle-runtime/rule-core-shove-outcome.mbt.qnt`
74. `cleanroom-input/qnt/battle-runtime/rule-core-stat-block-controls.mbt.qnt`

## Future Level 1-2 Queue

Drivers are ordered by dependency lane, then lexically inside each lane unless
the current cleanroom vertical already exercised an earlier dependency.

### Creation

1. `cleanroom-input/qnt/character-creation-runtime/character-creation-runtime.mbt.qnt`
2. `cleanroom-input/qnt/character-creation-runtime/character-creation-class-feature-projections.mbt.qnt`
3. `cleanroom-input/qnt/character-creation-runtime/character-creation-cleric-druid-order-selected-identity.mbt.qnt`
4. `cleanroom-input/qnt/character-creation-runtime/character-creation-fighter-fighting-style-selected-identity.mbt.qnt`
5. `cleanroom-input/qnt/character-creation-runtime/character-creation-weapon-mastery-containers-selected-identity.mbt.qnt`

### Sheet

1. `cleanroom-input/qnt/character-sheet-runtime/character-sheet-ability-check-proficiency-bonus.mbt.qnt`
2. `cleanroom-input/qnt/character-sheet-runtime/character-sheet-armor-class-base-selected-identity.mbt.qnt`
3. `cleanroom-input/qnt/character-sheet-runtime/character-sheet-healing-resource-selected-identity.mbt.qnt`
4. `cleanroom-input/qnt/character-sheet-runtime/character-sheet-hit-point-maximum.mbt.qnt`
5. `cleanroom-input/qnt/character-sheet-runtime/character-sheet-hp-rest-hit-dice.mbt.qnt`
6. `cleanroom-input/qnt/character-sheet-runtime/character-sheet-spellbook-ritual-selected-identity.mbt.qnt`
7. `cleanroom-input/qnt/character-sheet-runtime/character-sheet-weapon-mastery-containers-selected-identity.mbt.qnt`

### Handoff

1. `cleanroom-input/qnt/character-battle-runtime/character-battle-origin-feat-selected-identity.mbt.qnt`

### Battle

1. `cleanroom-input/qnt/battle-runtime/battle-runtime-adrenaline-rush.mbt.qnt`
2. `cleanroom-input/qnt/battle-runtime/battle-runtime-attack-spell-shape-selected-identity.mbt.qnt`
3. `cleanroom-input/qnt/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt`
4. `cleanroom-input/qnt/battle-runtime/battle-runtime-command-option-next-turn.mbt.qnt`
5. `cleanroom-input/qnt/battle-runtime/battle-runtime-command-ordering.mbt.qnt`
6. `cleanroom-input/qnt/battle-runtime/battle-runtime-concentration-break-teardown.mbt.qnt`
7. `cleanroom-input/qnt/battle-runtime/battle-runtime-creature-type-protection-and-charm-selected-identity.mbt.qnt`
8. `cleanroom-input/qnt/battle-runtime/battle-runtime-danger-sense-selected-identity.mbt.qnt`
9. `cleanroom-input/qnt/battle-runtime/battle-runtime-death-saving-throw.mbt.qnt`
10. `cleanroom-input/qnt/battle-runtime/battle-runtime-dragonborn-breath-weapon.mbt.qnt`
11. `cleanroom-input/qnt/battle-runtime/battle-runtime-druid-wild-shape-form-lifecycle.mbt.qnt`
12. `cleanroom-input/qnt/battle-runtime/battle-runtime-eldritch-blast.mbt.qnt`
13. `cleanroom-input/qnt/battle-runtime/battle-runtime-feature-selected-identity.mbt.qnt`
14. `cleanroom-input/qnt/battle-runtime/battle-runtime-find-familiar-companion-lifecycle.mbt.qnt`
15. `cleanroom-input/qnt/battle-runtime/battle-runtime-find-familiar-selected-identity.mbt.qnt`
16. `cleanroom-input/qnt/battle-runtime/battle-runtime-healing-stabilization-selected-identity.mbt.qnt`
17. `cleanroom-input/qnt/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt`
18. `cleanroom-input/qnt/battle-runtime/battle-runtime-interrupt-stack-resume.mbt.qnt`
19. `cleanroom-input/qnt/battle-runtime/battle-runtime-level1-buff-mark-smite-selected-identity.mbt.qnt`
20. `cleanroom-input/qnt/battle-runtime/battle-runtime-level1-damage-spell-selected-identity.mbt.qnt`
21. `cleanroom-input/qnt/battle-runtime/battle-runtime-level1-spatial-witness-selected-identity.mbt.qnt`
22. `cleanroom-input/qnt/battle-runtime/battle-runtime-mage-armor-selected-identity.mbt.qnt`
23. `cleanroom-input/qnt/battle-runtime/battle-runtime-magic-missile.mbt.qnt`
24. `cleanroom-input/qnt/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt`
25. `cleanroom-input/qnt/battle-runtime/battle-runtime-roll-modifier-active-effects.mbt.qnt`
26. `cleanroom-input/qnt/battle-runtime/battle-runtime-roll-modifier-buff-selected-identity.mbt.qnt`
27. `cleanroom-input/qnt/battle-runtime/battle-runtime-sanctuary-selected-identity.mbt.qnt`
28. `cleanroom-input/qnt/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt`
29. `cleanroom-input/qnt/battle-runtime/battle-runtime-scalar-buff-active-effects.mbt.qnt`
30. `cleanroom-input/qnt/battle-runtime/battle-runtime-scalar-buff.mbt.qnt`
31. `cleanroom-input/qnt/battle-runtime/battle-runtime-sleep-repeat-save.mbt.qnt`
32. `cleanroom-input/qnt/battle-runtime/battle-runtime-sorcerer-metamagic-careful-selected-identity.mbt.qnt`
33. `cleanroom-input/qnt/battle-runtime/battle-runtime-sorcerer-metamagic-distant-selected-identity.mbt.qnt`
34. `cleanroom-input/qnt/battle-runtime/battle-runtime-sorcerer-metamagic-empowered-selected-identity.mbt.qnt`
35. `cleanroom-input/qnt/battle-runtime/battle-runtime-sorcerer-metamagic-extended-selected-identity.mbt.qnt`
36. `cleanroom-input/qnt/battle-runtime/battle-runtime-sorcerer-metamagic-heightened-selected-identity.mbt.qnt`
37. `cleanroom-input/qnt/battle-runtime/battle-runtime-sorcerer-metamagic-seeking-selected-identity.mbt.qnt`
38. `cleanroom-input/qnt/battle-runtime/battle-runtime-sorcerer-metamagic-selected-identity.mbt.qnt`
39. `cleanroom-input/qnt/battle-runtime/battle-runtime-sorcerer-metamagic-spell-attack-selected-identity.mbt.qnt`
40. `cleanroom-input/qnt/battle-runtime/battle-runtime-sorcerer-metamagic-spell-attack-sequence-selected-identity.mbt.qnt`
41. `cleanroom-input/qnt/battle-runtime/battle-runtime-sorcerer-metamagic-subtle-selected-identity.mbt.qnt`
42. `cleanroom-input/qnt/battle-runtime/battle-runtime-sorcerer-metamagic-transmuted-selected-identity.mbt.qnt`
43. `cleanroom-input/qnt/battle-runtime/battle-runtime-sorcerer-metamagic-twinned-selected-identity.mbt.qnt`
44. `cleanroom-input/qnt/battle-runtime/battle-runtime-species-passive-trait-selected-identity.mbt.qnt`
45. `cleanroom-input/qnt/battle-runtime/battle-runtime-spell-attack-ordering.mbt.qnt`
46. `cleanroom-input/qnt/battle-runtime/battle-runtime-starry-wisp-object.mbt.qnt`
47. `cleanroom-input/qnt/battle-runtime/battle-runtime-stat-block-action-ordering.mbt.qnt`
48. `cleanroom-input/qnt/battle-runtime/battle-runtime-thaumaturgy-selected-identity.mbt.qnt`
49. `cleanroom-input/qnt/battle-runtime/battle-runtime-turn-boundary-effect-lifecycle.mbt.qnt`
50. `cleanroom-input/qnt/battle-runtime/battle-runtime-weapon-attack-ordering.mbt.qnt`
51. `cleanroom-input/qnt/battle-runtime/battle-runtime-weapon-attack-skeleton.mbt.qnt`
52. `cleanroom-input/qnt/battle-runtime/battle-runtime-weapon-hosted-attack-and-riders.mbt.qnt`
53. `cleanroom-input/qnt/battle-runtime/battle-runtime-weapon-mastery-selected-identity.mbt.qnt`
54. `cleanroom-input/qnt/battle-runtime/battle-runtime-zero-hit-point-mid-resolution.mbt.qnt`
55. `cleanroom-input/qnt/battle-runtime/creature-attack.mbt.qnt`
56. `cleanroom-input/qnt/battle-runtime/rule-core-attack-damage-disposition.mbt.qnt`
57. `cleanroom-input/qnt/battle-runtime/rule-core-hit-point-damage.mbt.qnt`
58. `cleanroom-input/qnt/battle-runtime/rule-core-movement.mbt.qnt`
59. `cleanroom-input/qnt/battle-runtime/rule-core-reactions.mbt.qnt`
60. `cleanroom-input/qnt/battle-runtime/rule-core-shove-outcome.mbt.qnt`
61. `cleanroom-input/qnt/battle-runtime/rule-core-stat-block-controls.mbt.qnt`

## Full Driver Decisions

### Creation Drivers

| Decision | Driver | RAW citation | Reason |
| --- | --- | --- | --- |
| in | `cleanroom-input/qnt/character-creation-runtime/character-creation-class-feature-projections.mbt.qnt` | `Classes/Monk.md` "Level 2: Monk's Focus" and "Level 2: Uncanny Metabolism"; `Classes/Sorcerer.md` "Level 2: Font of Magic" and "Level 2: Metamagic" | Projects level-2 class feature resource facts. |
| flagged | `cleanroom-input/qnt/character-creation-runtime/character-creation-class-feature-selected-identity.mbt.qnt` | `Classes/Bard.md` "Level 2: Expertise"; `Classes/Wizard.md` "Level 3: Evocation Savant" | Mixed level-1/2 selections and a level-3 Wizard subclass selection. |
| in | `cleanroom-input/qnt/character-creation-runtime/character-creation-cleric-druid-order-selected-identity.mbt.qnt` | `Classes/Cleric.md` "Level 1: Divine Order"; `Classes/Druid.md` "Level 1: Primal Order" | Divine Order and Primal Order are level-1 choices. |
| in | `cleanroom-input/qnt/character-creation-runtime/character-creation-fighter-fighting-style-selected-identity.mbt.qnt` | `Classes/Fighter.md` "Level 1: Fighting Style"; `Classes/Fighter.md` class table level 2 | Fighter Fighting Style is level 1, and level gain to 2 remains in scope. |
| flagged | `cleanroom-input/qnt/character-creation-runtime/character-creation-rogue-expertise-selected-identity.mbt.qnt` | `Classes/Rogue.md` "Level 1: Expertise"; driver action `doSelectLevelSixAdditionalOwnedSkillExpertise` | Mixed level-1 Rogue Expertise and level-6 additional Expertise projection. |
| in | `cleanroom-input/qnt/character-creation-runtime/character-creation-runtime.mbt.qnt` | `Character-Creation.md` "Character Origins" and "Classes"; `Classes/Fighter.md` "Level 1: Fighting Style", "Level 1: Second Wind", and "Level 1: Weapon Mastery" | First vertical is a level-1 Fighter creation protocol. |
| flagged | `cleanroom-input/qnt/character-creation-runtime/character-creation-warlock-eldritch-invocations-selected-identity.mbt.qnt` | `Classes/Warlock.md` "Level 1: Eldritch Invocations"; driver records replacement and prerequisite checks at Warlock levels 3 and 5 | Mixed level-1/2 invocation acquisition and later-level replacement/prerequisite facts. |
| in | `cleanroom-input/qnt/character-creation-runtime/character-creation-weapon-mastery-containers-selected-identity.mbt.qnt` | `Classes/Fighter.md`, `Classes/Barbarian.md`, `Classes/Paladin.md`, `Classes/Ranger.md`, and `Classes/Rogue.md` "Level 1: Weapon Mastery" | Weapon Mastery container choices are level-1 for the represented classes. |
| out | `cleanroom-input/qnt/character-creation-runtime/character-creation-weapon-mastery-level-gain.mbt.qnt` | `Classes/Fighter.md` and `Classes/Barbarian.md` class feature tables: driver records level 3 -> 4 advancement | The driver is about level-4 Weapon Mastery gain/reselection. |
| out | `cleanroom-input/qnt/character-creation-runtime/character-creation-wizard-evocation-savant.mbt.qnt` | `Classes/Wizard.md` "Level 3: Evocation Savant" | Evocation Savant is a level-3 Wizard subclass feature. |

### Sheet Drivers

| Decision | Driver | RAW citation | Reason |
| --- | --- | --- | --- |
| in | `cleanroom-input/qnt/character-sheet-runtime/character-sheet-ability-check-proficiency-bonus.mbt.qnt` | `Classes/Bard.md` "Level 2: Jack of All Trades"; `Classes/Rogue.md` "Level 1: Expertise"; `Playing-the-Game.md` "Ability Checks" | Covers level-1/2 skill, expertise, and Jack of All Trades projections. |
| flagged | `cleanroom-input/qnt/character-sheet-runtime/character-sheet-arcane-recovery-selected-identity.mbt.qnt` | `Classes/Wizard.md` "Level 1: Arcane Recovery"; driver action `doRecoverSecondLevelSpellSlot` | Arcane Recovery is level 1, but this driver includes second-level slot recovery unavailable to ordinary level-1/2 Wizards. |
| in | `cleanroom-input/qnt/character-sheet-runtime/character-sheet-armor-class-base-selected-identity.mbt.qnt` | `Classes/Barbarian.md` "Level 1: Unarmored Defense"; `Classes/Monk.md` "Level 1: Unarmored Defense"; `Equipment.md` "Armor" | Armor and level-1 unarmored defense formulas are reachable. |
| flagged | `cleanroom-input/qnt/character-sheet-runtime/character-sheet-class-feature-selected-identity.mbt.qnt` | `Classes/Bard.md` "Level 2: Jack of All Trades"; `Classes/Cleric.md` "Level 3: Life Domain Spells"; `Classes/Paladin.md` "Level 3: Oath of Devotion Spells" | Mixed level-1/2 features with level-3 subclass spell features. |
| in | `cleanroom-input/qnt/character-sheet-runtime/character-sheet-healing-resource-selected-identity.mbt.qnt` | `Classes/Paladin.md` "Level 1: Lay On Hands" | Lay On Hands is a level-1 healing resource. |
| in | `cleanroom-input/qnt/character-sheet-runtime/character-sheet-hit-point-maximum.mbt.qnt` | `Character-Creation.md` class hit point rules; `Classes/Fighter.md` level-1 and level-2 table rows | The in-scope queue should use the level-1 and level-2 HP derivations; later-level examples in this driver are arithmetic witnesses, not acquisition gates. |
| in | `cleanroom-input/qnt/character-sheet-runtime/character-sheet-hp-rest-hit-dice.mbt.qnt` | `Playing-the-Game.md` "Resting" and "Hit Points"; `Rules-Glossary.md` "Short Rest" and "Long Rest" | Rest and Hit Point Dice transitions are base character rules. |
| out | `cleanroom-input/qnt/character-sheet-runtime/character-sheet-spell-rest-benefit-application.mbt.qnt` | `Classes/Cleric.md`, `Classes/Paladin.md` "Level 2 ... Spells"; `Spells/Descriptions-M-P.md` "Prayer of Healing" | Prayer of Healing is a spell-level-2 rest benefit, not reachable by ordinary level-1/2 characters. |
| flagged | `cleanroom-input/qnt/character-sheet-runtime/character-sheet-spell-slots-pact-slots.mbt.qnt` | `Classes/Wizard.md` and `Classes/Sorcerer.md` spell-slot tables levels 1-4; `Classes/Warlock.md` Pact Magic levels 1-2 | Mixed level-1/2 slot facts and later full-caster level-4/second-level slot examples. |
| in | `cleanroom-input/qnt/character-sheet-runtime/character-sheet-spellbook-ritual-selected-identity.mbt.qnt` | `Classes/Wizard.md` "Level 1: Ritual Adept"; `Classes/Wizard.md` level-1 spell list `Detect Magic` | Wizard ritual access to a level-1 ritual spell is reachable at level 1. |
| out | `cleanroom-input/qnt/character-sheet-runtime/character-sheet-weapon-mastery-class-level-reselection.mbt.qnt` | `Classes/Fighter.md` and `Classes/Barbarian.md` class feature tables: driver records level 4 | The driver is about level-4 class-level reselection. |
| in | `cleanroom-input/qnt/character-sheet-runtime/character-sheet-weapon-mastery-containers-selected-identity.mbt.qnt` | `Classes/Paladin.md`, `Classes/Ranger.md`, and `Classes/Rogue.md` "Level 1: Weapon Mastery" | Weapon Mastery selection and long-rest reselection are reachable for these level-1 classes. |

### Handoff Drivers

| Decision | Driver | RAW citation | Reason |
| --- | --- | --- | --- |
| flagged | `cleanroom-input/qnt/character-battle-runtime/character-battle-init-projection.mbt.qnt` | `Classes/Sorcerer.md` "Level 2: Metamagic"; driver projects spell levels 1, 2, and 3 | Mixed level-1/2 handoff facts with spell-level-2 and spell-level-3 capacity facts. |
| in | `cleanroom-input/qnt/character-battle-runtime/character-battle-origin-feat-selected-identity.mbt.qnt` | `Character-Origins.md` Criminal background feat; `Feats.md` "Alert" | Alert is an Origin feat reachable during level-1 character creation. |
| flagged | `cleanroom-input/qnt/character-battle-runtime/character-battle-settlement.mbt.qnt` | `Playing-the-Game.md` "Hit Points"; `Classes/Druid.md` "Level 2: Wild Shape"; driver has created level-3 slot ambiguity | Mixed basic battle settlement with later/ambiguous created spell-slot and active-Wild-Shape handoff questions. |
| flagged | `cleanroom-input/qnt/character-battle-runtime/character-sheet-feature-resources.mbt.qnt` | `Classes/Paladin.md` "Level 1: Lay On Hands"; `Classes/Sorcerer.md` "Level 2: Font of Magic"; driver creates a level-3 slot | Mixed level-1/2 resources with out-of-scope created level-3 slot behavior. |

### Battle Drivers

| Decision | Driver | RAW citation | Reason |
| --- | --- | --- | --- |
| out | `cleanroom-input/qnt/battle-runtime/bardic-inspiration-selected-identity.mbt.qnt` | `Classes/Bard.md` "Level 1: Bardic Inspiration" and "At Higher Levels" | Driver asserts a d12 Bardic Inspiration die, which RAW reaches at Bard level 15. |
| flagged | `cleanroom-input/qnt/battle-runtime/battle-runtime-ability-check-choice-search.mbt.qnt` | `Playing-the-Game.md` "Search" and "Ability Checks"; `Classes/Cleric.md` cantrip list `Guidance`; `Classes/Bard.md` level-2 spell list `Enhance Ability` | Mixed base/Search and Guidance behavior with spell-level-2 Enhance Ability. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-acid-arrow-timing.mbt.qnt` | `Classes/Wizard.md` "Level 2 Wizard Spells"; `Spells/Descriptions-A-D.md` "Acid Arrow" | Acid Arrow is spell level 2. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-adrenaline-rush.mbt.qnt` | `Character-Origins.md` "Orc" / "Adrenaline Rush" | Orc Adrenaline Rush is a species trait available at character creation. |
| flagged | `cleanroom-input/qnt/battle-runtime/battle-runtime-after-hit-damage-riders.mbt.qnt` | `Classes/Paladin.md` "Level 2: Paladin's Smite"; `Classes/Ranger.md` level-1 spell list `Ensnaring Strike`; `Classes/Paladin.md` level-2 spell list `Shining Smite` | Mixed level-1/2 after-hit riders with spell-level-2 Shining Smite. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-antimagic-field-action-interdiction.mbt.qnt` | `Classes/Cleric.md` and `Classes/Wizard.md` level-8 spell lists; `Spells/Descriptions-A-D.md` "Antimagic Field" | Antimagic Field is spell level 8. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-antimagic-field-magical-effect-interdiction.mbt.qnt` | `Classes/Cleric.md` and `Classes/Wizard.md` level-8 spell lists; `Spells/Descriptions-A-D.md` "Antimagic Field" | Antimagic Field is spell level 8. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-antimagic-field-ongoing-suppression.mbt.qnt` | `Classes/Cleric.md` and `Classes/Wizard.md` level-8 spell lists; `Spells/Descriptions-A-D.md` "Antimagic Field" | Antimagic Field is spell level 8. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-attack-spell-shape-selected-identity.mbt.qnt` | `Classes/Wizard.md`, `Classes/Sorcerer.md`, and `Classes/Cleric.md` cantrip and level-1 spell lists | Fire Bolt, Chill Touch, Guiding Bolt, Inflict Wounds, and Shocking Grasp are cantrips or level-1 spells. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-beam-sequence-selected-identity.mbt.qnt` | `Spells/Descriptions-E-L.md` "Eldritch Blast" cantrip upgrade; `Classes/Warlock.md` cantrip list | The driver records the two-beam level-5 cantrip upgrade. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-blur-attack-roll-defense-lifecycle.mbt.qnt` | `Classes/Sorcerer.md` and `Classes/Wizard.md` level-2 spell lists; `Spells/Descriptions-A-D.md` "Blur" | Blur is spell level 2. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt` | `Classes/Sorcerer.md` and `Classes/Wizard.md` level-1 spell lists; `Spells/Descriptions-A-D.md` "Chromatic Orb" | Chromatic Orb is spell level 1. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-command-option-next-turn.mbt.qnt` | `Classes/Bard.md`, `Classes/Cleric.md`, and `Classes/Paladin.md` level-1 spell lists; `Spells/Descriptions-A-D.md` "Command" | Command is spell level 1. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-command-ordering.mbt.qnt` | `Classes/Bard.md`, `Classes/Cleric.md`, and `Classes/Paladin.md` level-1 spell lists; `Spells/Descriptions-A-D.md` "Command" | Command frontier ordering is reachable through a level-1 spell. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-concentration-break-teardown.mbt.qnt` | `Rules-Glossary.md` "Concentration"; level-1 spell lists with concentration spells | Concentration is a base spell rule reachable through level-1 concentration spells. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-condition-removal-protection-selected-identity.mbt.qnt` | `Classes/Bard.md`, `Classes/Cleric.md`, `Classes/Druid.md`, `Classes/Paladin.md`, and `Classes/Ranger.md` level-2 spell lists | Lesser Restoration and Protection from Poison are spell level 2. |
| flagged | `cleanroom-input/qnt/battle-runtime/battle-runtime-condition-saving-throw-selected-identity.mbt.qnt` | `Classes/Bard.md` level-1 spell list `Color Spray`; `Classes/Wizard.md` level-2 spell list `Hold Person`; `Classes/Bard.md` level-3 spell list `Hypnotic Pattern` | Mixed level-1 condition spells with spell-level-2 and spell-level-3 condition spells. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-creature-size-change-lifecycle.mbt.qnt` | `Classes/Bard.md`, `Classes/Druid.md`, `Classes/Sorcerer.md`, and `Classes/Wizard.md` level-2 spell lists; `Spells/Descriptions-E-L.md` "Enlarge/Reduce" | Enlarge/Reduce is spell level 2. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-creature-type-protection-and-charm-selected-identity.mbt.qnt` | `Classes/Druid.md` and `Classes/Ranger.md` level-1 spell list `Animal Friendship`; `Classes/Cleric.md` and `Classes/Paladin.md` level-1 spell list `Protection from Evil and Good` | Covered spells are level 1. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-danger-sense-selected-identity.mbt.qnt` | `Classes/Barbarian.md` "Level 2: Danger Sense" | Danger Sense is a level-2 Barbarian feature. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-dark-ones-blessing.mbt.qnt` | `Classes/Warlock.md` "Level 3: Dark One's Blessing" | Dark One's Blessing is a level-3 subclass feature. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-death-saving-throw.mbt.qnt` | `Playing-the-Game.md` "Death Saving Throws" | Death saves are base character rules. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-direct-condition-lifecycle.mbt.qnt` | `Spells/Gaining-and-Casting.md` "Spell Level"; `Classes/Bard.md`, `Classes/Cleric.md`, `Classes/Druid.md`, `Classes/Sorcerer.md`, and `Classes/Wizard.md` class tables show no spell-level-2 slots before class level 3 | The driver is for direct spell-owned conditions with minimum slot level 2. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-disciple-of-life.mbt.qnt` | `Classes/Cleric.md` "Level 3: Disciple of Life" | Disciple of Life is a level-3 subclass feature. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-dispel-magic-ongoing-spell-ending.mbt.qnt` | `Classes/Bard.md`, `Classes/Cleric.md`, `Classes/Druid.md`, `Classes/Paladin.md`, `Classes/Sorcerer.md`, `Classes/Warlock.md`, and `Classes/Wizard.md` spell-level-3 lists; `Spells/Descriptions-A-D.md` "Dispel Magic" | Dispel Magic is spell level 3. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-dispel-magic-selected-identity.mbt.qnt` | `Classes/Bard.md`, `Classes/Cleric.md`, `Classes/Druid.md`, `Classes/Paladin.md`, `Classes/Sorcerer.md`, `Classes/Warlock.md`, and `Classes/Wizard.md` spell-level-3 lists; `Spells/Descriptions-A-D.md` "Dispel Magic" | Dispel Magic is spell level 3. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-dragonborn-breath-weapon.mbt.qnt` | `Character-Origins.md` "Dragonborn" / "Breath Weapon" | Dragonborn Breath Weapon is available at character creation. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-dragons-breath-granted-action.mbt.qnt` | `Classes/Sorcerer.md` and `Classes/Wizard.md` level-2 spell lists; `Spells/Descriptions-A-D.md` "Dragon's Breath" | Dragon's Breath is spell level 2. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-dragons-breath-initial-effect.mbt.qnt` | `Classes/Sorcerer.md` and `Classes/Wizard.md` level-2 spell lists; `Spells/Descriptions-A-D.md` "Dragon's Breath" | Dragon's Breath is spell level 2. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-druid-lands-aid.mbt.qnt` | `Classes/Druid.md` "Level 3: Land's Aid" | Land's Aid is a level-3 Circle of the Land feature. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-druid-wild-shape-form-lifecycle.mbt.qnt` | `Classes/Druid.md` "Level 2: Wild Shape" | Wild Shape is a level-2 Druid feature. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-eldritch-blast.mbt.qnt` | `Classes/Warlock.md` cantrip list; `Spells/Gaining-and-Casting.md` "Spell Level" | Eldritch Blast is a level-0 Warlock cantrip. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-extra-attack.mbt.qnt` | `Classes/Fighter.md`, `Classes/Monk.md`, `Classes/Paladin.md`, `Classes/Ranger.md`, and `Classes/Barbarian.md` "Level 5: Extra Attack" | Extra Attack is first gained at level 5. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-feature-selected-identity.mbt.qnt` | `Classes/Sorcerer.md` "Level 1: Innate Sorcery" | Innate Sorcery is a level-1 Sorcerer feature. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-find-familiar-companion-lifecycle.mbt.qnt` | `Classes/Wizard.md` level-1 spell list `Find Familiar`; `Classes/Warlock.md` "Level 1: Eldritch Invocations" and Pact of the Chain text | Find Familiar and Pact of the Chain are reachable by level-1/2 characters. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-find-familiar-selected-identity.mbt.qnt` | `Classes/Wizard.md` level-1 spell list `Find Familiar`; `Spells/Descriptions-E-L.md` "Find Familiar" | Find Familiar is spell level 1. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-fireball-selected-identity.mbt.qnt` | `Classes/Sorcerer.md` and `Classes/Wizard.md` level-3 spell lists; `Spells/Descriptions-E-L.md` "Fireball" | Fireball is spell level 3. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-flaming-sphere-hazard-ram.mbt.qnt` | `Classes/Druid.md`, `Classes/Sorcerer.md`, and `Classes/Wizard.md` level-2 spell lists; `Spells/Descriptions-E-L.md` "Flaming Sphere" | Flaming Sphere is spell level 2. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-gust-of-wind-line-lifecycle.mbt.qnt` | `Classes/Druid.md`, `Classes/Ranger.md`, `Classes/Sorcerer.md`, and `Classes/Wizard.md` level-2 spell lists; `Spells/Descriptions-E-L.md` "Gust of Wind" | Gust of Wind is spell level 2. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-healing-stabilization-selected-identity.mbt.qnt` | `Classes/Cleric.md` cantrip list `Spare the Dying`; `Playing-the-Game.md` "Death Saving Throws" | Spare the Dying is a cantrip and stabilization is a base 0-HP rule. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-heat-metal-object-contact.mbt.qnt` | `Classes/Bard.md` and `Classes/Druid.md` level-2 spell lists; `Spells/Descriptions-E-L.md` "Heat Metal" | Heat Metal is spell level 2. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt` | `Playing-the-Game.md` "Hit Points"; `Classes/Cleric.md`, `Classes/Druid.md`, and `Classes/Bard.md` level-1 healing spells | Hit point restoration ordering is reachable through level-1 healing. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-hunters-prey.mbt.qnt` | `Classes/Ranger.md` "Level 3: Hunter's Prey" | Hunter's Prey is a level-3 subclass feature. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-interrupt-stack-resume.mbt.qnt` | `Playing-the-Game.md` "Actions" / "Ready" and "Reactions" | Ready and reaction interruption are base combat rules. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-level1-buff-mark-smite-selected-identity.mbt.qnt` | `Classes/Paladin.md` level-1 `Divine Smite` and `Shield of Faith`; `Classes/Ranger.md` level-1 `Hunter's Mark`; `Classes/Warlock.md` level-1 `Hex` | Driver is explicitly level-1 buff/mark/smite spell identity. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-level1-damage-spell-selected-identity.mbt.qnt` | `Spells/Gaining-and-Casting.md` "Spell Level"; `Classes/Bard.md`, `Classes/Cleric.md`, `Classes/Druid.md`, `Classes/Sorcerer.md`, `Classes/Warlock.md`, and `Classes/Wizard.md` cantrip and level-1 spell lists | Driver is explicitly level-1/cantrip damage spell identity. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-level1-spatial-witness-selected-identity.mbt.qnt` | `Spells/Gaining-and-Casting.md` "Spell Level"; `Classes/Druid.md`, `Classes/Sorcerer.md`, and `Classes/Wizard.md` cantrip and level-1 spell lists | Driver is explicitly level-1/cantrip spatial spell identity. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-level2-control-spell-selected-identity.mbt.qnt` | `Spells/Gaining-and-Casting.md` "Spell Level"; `Classes/Bard.md`, `Classes/Druid.md`, `Classes/Sorcerer.md`, `Classes/Warlock.md`, and `Classes/Wizard.md` spell-level-2 lists | Driver is explicitly spell-level-2. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-level2-damage-spell-selected-identity.mbt.qnt` | `Spells/Gaining-and-Casting.md` "Spell Level"; `Classes/Bard.md`, `Classes/Cleric.md`, `Classes/Druid.md`, `Classes/Sorcerer.md`, and `Classes/Wizard.md` spell-level-2 lists | Driver is explicitly spell-level-2. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-level2-mobility-spell-selected-identity.mbt.qnt` | `Spells/Gaining-and-Casting.md` "Spell Level"; `Classes/Sorcerer.md`, `Classes/Warlock.md`, and `Classes/Wizard.md` spell-level-2 lists | Driver is explicitly spell-level-2. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-level2-protection-spell-selected-identity.mbt.qnt` | `Spells/Gaining-and-Casting.md` "Spell Level"; `Classes/Bard.md`, `Classes/Cleric.md`, `Classes/Druid.md`, `Classes/Paladin.md`, `Classes/Sorcerer.md`, and `Classes/Wizard.md` spell-level-2 lists | Driver is explicitly spell-level-2. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-levitated-creature-lifecycle.mbt.qnt` | `Classes/Sorcerer.md`, `Classes/Warlock.md`, and `Classes/Wizard.md` level-2 spell lists; `Spells/Descriptions-E-L.md` "Levitate" | Levitate is spell level 2. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-lightning-bolt-selected-identity.mbt.qnt` | `Classes/Sorcerer.md` and `Classes/Wizard.md` level-3 spell lists; `Spells/Descriptions-E-L.md` "Lightning Bolt" | Lightning Bolt is spell level 3. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-mage-armor-selected-identity.mbt.qnt` | `Classes/Sorcerer.md` and `Classes/Wizard.md` level-1 spell lists; `Spells/Descriptions-M-P.md` "Mage Armor" | Mage Armor is spell level 1. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-magic-missile.mbt.qnt` | `Classes/Sorcerer.md` and `Classes/Wizard.md` level-1 spell lists; `Spells/Descriptions-M-P.md` "Magic Missile" | Magic Missile is spell level 1. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-magical-darkness-point-origin-lifecycle.mbt.qnt` | `Classes/Sorcerer.md`, `Classes/Warlock.md`, and `Classes/Wizard.md` level-2 spell lists; `Spells/Descriptions-A-D.md` "Darkness" | Darkness is spell level 2. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-mind-spike-selected-identity.mbt.qnt` | `Classes/Warlock.md` and `Classes/Wizard.md` level-2 spell lists; `Spells/Descriptions-M-P.md` "Mind Spike" | Mind Spike is spell level 2. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-mirror-image-hit-interception.mbt.qnt` | `Classes/Bard.md`, `Classes/Sorcerer.md`, `Classes/Warlock.md`, and `Classes/Wizard.md` level-2 spell lists; `Spells/Descriptions-M-P.md` "Mirror Image" | Mirror Image is spell level 2. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-moonbeam-movable-zone.mbt.qnt` | `Classes/Druid.md` level-2 spell list; `Spells/Descriptions-M-P.md` "Moonbeam" | Moonbeam is spell level 2. |
| flagged | `cleanroom-input/qnt/battle-runtime/battle-runtime-movement-forced-movement-selected-identity.mbt.qnt` | `Classes/Bard.md` level-1 spell list `Dissonant Whispers`; `Classes/Ranger.md` "Level 6: Roving"; `Classes/Barbarian.md` "Level 5: Fast Movement" | Mixed level-1 forced-movement spells and level-5/6 class movement features. |
| flagged | `cleanroom-input/qnt/battle-runtime/battle-runtime-mycelium-step-feature-selected-identity.mbt.qnt` | No matching `Mycelium Step` RAW heading found in `cleanroom-input/raw/srd-5.2.1/**` | Copied RAW corpus does not establish the feature or its acquisition level. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-open-hand-technique.mbt.qnt` | `Classes/Monk.md` "Level 3: Open Hand Technique" | Open Hand Technique is a level-3 subclass feature. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-paladin-sacred-weapon-selected-identity.mbt.qnt` | `Classes/Paladin.md` "Level 3: Sacred Weapon" | Sacred Weapon is a level-3 subclass feature. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-potent-cantrip.mbt.qnt` | `Classes/Wizard.md` "Level 3: Potent Cantrip" | Potent Cantrip is a level-3 subclass feature. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-preserve-life.mbt.qnt` | `Classes/Cleric.md` "Level 3: Preserve Life" | Preserve Life is a level-3 subclass feature. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt` | `Classes/Sorcerer.md` "Level 2: Metamagic"; `Spells/Gaining-and-Casting.md` "Casting Time" and "Spell Slots" | Quickened Spell is a level-2 Metamagic option; the governor can apply to cantrips/level-1 spells. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-ray-of-enfeeblement-lifecycle.mbt.qnt` | `Classes/Warlock.md` and `Classes/Wizard.md` level-2 spell lists; `Spells/Descriptions-Q-R.md` "Ray of Enfeeblement" | Ray of Enfeeblement is spell level 2. |
| flagged | `cleanroom-input/qnt/battle-runtime/battle-runtime-reaction-casting-time.mbt.qnt` | `Playing-the-Game.md` "Reactions"; `Classes/Warlock.md`/`Classes/Wizard.md` spell lists show `Counterspell` at spell level 3; `Hellish Rebuke` is spell level 1 | Driver mixes out-of-scope Counterspell branches with a level-1 Hellish Rebuke branch. |
| flagged | `cleanroom-input/qnt/battle-runtime/battle-runtime-reaction-spell-selected-identity.mbt.qnt` | `Classes/Sorcerer.md`, `Classes/Warlock.md`, and `Classes/Wizard.md` spell lists show level-1 reaction spells and spell-level-3 `Counterspell` | Driver mixes level-1 reaction spell selections with Counterspell. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-remarkable-athlete-selected-identity.mbt.qnt` | `Classes/Fighter.md` "Level 3: Remarkable Athlete" | Remarkable Athlete is a level-3 subclass feature. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-rogue-steady-aim.mbt.qnt` | `Classes/Rogue.md` "Level 3: Steady Aim" | Steady Aim is a level-3 Rogue feature. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-roll-modifier-active-effects.mbt.qnt` | `Classes/Bard.md`, `Classes/Cleric.md`, and `Classes/Warlock.md` level-1 spell lists `Bane` and `Bless`; cantrip lists `Guidance` and `Resistance` | Roll modifier active effects are reachable through cantrips and level-1 spells. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-roll-modifier-buff-selected-identity.mbt.qnt` | `Classes/Bard.md`, `Classes/Cleric.md`, and `Classes/Warlock.md` level-1 spell lists `Bane` and `Bless`; cantrip lists `Guidance` and `Resistance` | Selected identity is for level-0/level-1 roll-modifier buffs. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-sanctuary-selected-identity.mbt.qnt` | `Classes/Cleric.md` level-1 spell list; `Spells/Descriptions-S-Z.md` "Sanctuary" | Sanctuary is spell level 1. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt` | `Classes/Bard.md`, `Classes/Cleric.md`, `Classes/Druid.md`, and `Classes/Paladin.md` level-1 spell lists containing Bane, Command, Entangle, and similar save-gated spells | Save-gated level-1 spell ordering is reachable. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-scalar-buff-active-effects.mbt.qnt` | `Classes/Cleric.md`, `Classes/Druid.md`, `Classes/Paladin.md`, and `Classes/Ranger.md` level-1 spell lists containing Longstrider, Shield of Faith, and similar scalar buffs | Scalar buff active effects are reachable through level-1 spells. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-scalar-buff.mbt.qnt` | `Classes/Cleric.md`, `Classes/Druid.md`, `Classes/Paladin.md`, and `Classes/Ranger.md` level-1 spell lists containing Longstrider, Shield of Faith, and similar scalar buffs | Scalar buff projections are reachable through level-1 spells. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-see-invisibility-observer-sight.mbt.qnt` | `Classes/Bard.md`, `Classes/Sorcerer.md`, and `Classes/Wizard.md` level-2 spell lists; `Spells/Descriptions-S-Z.md` "See Invisibility" | See Invisibility is spell level 2. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-self-teleport-lifecycle.mbt.qnt` | `Classes/Sorcerer.md`, `Classes/Warlock.md`, and `Classes/Wizard.md` level-2 spell lists; `Spells/Descriptions-M-P.md` "Misty Step" | Misty Step is spell level 2. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-self-transformation-mode-lifecycle.mbt.qnt` | `Classes/Sorcerer.md`, `Classes/Warlock.md`, and `Classes/Wizard.md` level-2 spell lists; `Spells/Descriptions-A-D.md` "Alter Self" | Alter Self is spell level 2. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-shining-smite-selected-identity.mbt.qnt` | `Classes/Paladin.md` level-2 spell list; `Spells/Descriptions-S-Z.md` "Shining Smite" | Shining Smite is spell level 2. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-sleep-repeat-save.mbt.qnt` | `Classes/Bard.md`, `Classes/Sorcerer.md`, and `Classes/Wizard.md` level-1 spell lists; `Spells/Descriptions-S-Z.md` "Sleep"; `Spells/Descriptions-E-L.md` "Hideous Laughter" | Sleep and Hideous Laughter are level-1 spells. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-sorcerer-metamagic-careful-selected-identity.mbt.qnt` | `Classes/Sorcerer.md` "Level 2: Metamagic" | Metamagic options are gained at Sorcerer level 2. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-sorcerer-metamagic-distant-selected-identity.mbt.qnt` | `Classes/Sorcerer.md` "Level 2: Metamagic" | Metamagic options are gained at Sorcerer level 2. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-sorcerer-metamagic-empowered-selected-identity.mbt.qnt` | `Classes/Sorcerer.md` "Level 2: Metamagic" | Metamagic options are gained at Sorcerer level 2. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-sorcerer-metamagic-extended-selected-identity.mbt.qnt` | `Classes/Sorcerer.md` "Level 2: Metamagic" | Metamagic options are gained at Sorcerer level 2. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-sorcerer-metamagic-heightened-selected-identity.mbt.qnt` | `Classes/Sorcerer.md` "Level 2: Metamagic" | Metamagic options are gained at Sorcerer level 2. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-sorcerer-metamagic-seeking-selected-identity.mbt.qnt` | `Classes/Sorcerer.md` "Level 2: Metamagic" | Metamagic options are gained at Sorcerer level 2. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-sorcerer-metamagic-selected-identity.mbt.qnt` | `Classes/Sorcerer.md` "Level 2: Metamagic" | Metamagic options are gained at Sorcerer level 2. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-sorcerer-metamagic-spell-attack-selected-identity.mbt.qnt` | `Classes/Sorcerer.md` "Level 2: Metamagic"; Sorcerer cantrip and level-1 spell lists | Metamagic on spell attacks is reachable with cantrips and level-1 Sorcerer spells. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-sorcerer-metamagic-spell-attack-sequence-selected-identity.mbt.qnt` | `Classes/Sorcerer.md` "Level 2: Metamagic"; Sorcerer cantrip and level-1 spell lists | Metamagic on spell-attack sequences is reachable with cantrips and level-1 Sorcerer spells. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-sorcerer-metamagic-subtle-selected-identity.mbt.qnt` | `Classes/Sorcerer.md` "Level 2: Metamagic" | Metamagic options are gained at Sorcerer level 2. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-sorcerer-metamagic-transmuted-selected-identity.mbt.qnt` | `Classes/Sorcerer.md` "Level 2: Metamagic" | Metamagic options are gained at Sorcerer level 2. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-sorcerer-metamagic-twinned-selected-identity.mbt.qnt` | `Classes/Sorcerer.md` "Level 2: Metamagic" | Metamagic options are gained at Sorcerer level 2. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-species-passive-trait-selected-identity.mbt.qnt` | `Character-Origins.md` Dragonborn, Dwarf, and Goliath species traits | Species passive traits are available at character creation. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-spell-attack-ordering.mbt.qnt` | `Spells/Gaining-and-Casting.md` "Attack Rolls"; cantrip and level-1 spell attack lists | Spell attack ordering is reachable through cantrips and level-1 spells. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-spell-created-held-object-lifecycle.mbt.qnt` | `Classes/Druid.md` level-2 spell list; `Spells/Descriptions-E-L.md` "Flame Blade" | Flame Blade is spell level 2. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-spell-sequencing-integration.mbt.qnt` | `Classes/Druid.md`, `Classes/Sorcerer.md`, and `Classes/Wizard.md` spell-level-2 lists for `Dragon's Breath` and `Heat Metal`; `Spells/Gaining-and-Casting.md` "Spell Level" | Driver's concrete sequencing path is Dragon's Breath into Heat Metal, both spell-level-2 effects first ordinarily reached at character level 3. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-spike-growth-movement-hazard.mbt.qnt` | `Classes/Druid.md` and `Classes/Ranger.md` level-2 spell lists; `Spells/Descriptions-S-Z.md` "Spike Growth" | Spike Growth is spell level 2. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-spiritual-weapon.mbt.qnt` | `Classes/Cleric.md` level-2 spell list; `Spells/Descriptions-S-Z.md` "Spiritual Weapon" | Spiritual Weapon is spell level 2. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-starry-wisp-object.mbt.qnt` | `Classes/Druid.md` and `Classes/Ranger.md` cantrip lists; `Spells/Gaining-and-Casting.md` "Spell Level" | Starry Wisp is a cantrip. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-stat-block-action-ordering.mbt.qnt` | `Monsters/Overview.md` "Stat Blocks"; `Playing-the-Game.md` "Attack Rolls" and "Actions" | Stat-block action ordering is a battle rule a level-1/2 character can encounter. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-thaumaturgy-selected-identity.mbt.qnt` | `Classes/Cleric.md` cantrip list; `Spells/Gaining-and-Casting.md` "Spell Level" | Thaumaturgy is a cantrip. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-turn-boundary-effect-lifecycle.mbt.qnt` | `Playing-the-Game.md` "Combat" and "Actions"; `Rules-Glossary.md` condition durations | Turn-boundary effect lifecycle is a base battle rule. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-warding-bond-damage-sharing.mbt.qnt` | `Classes/Cleric.md` and `Classes/Paladin.md` level-2 spell lists; `Spells/Descriptions-S-Z.md` "Warding Bond" | Warding Bond is spell level 2. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-weapon-attack-ordering.mbt.qnt` | `Playing-the-Game.md` "Attack Rolls" and "Attack Action"; `Equipment.md` "Weapons" | Weapon attacks are base combat rules. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-weapon-attack-skeleton.mbt.qnt` | `Playing-the-Game.md` "Attack Rolls" and "Damage Rolls"; `Equipment.md` "Weapons" | Weapon attack skeleton behavior is a base combat rule. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-weapon-hosted-attack-and-riders.mbt.qnt` | `Classes/Paladin.md` "Level 2: Paladin's Smite"; class cantrip lists for True Strike | True Strike and Paladin's Smite are reachable by level 1-2 characters. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-weapon-mastery-selected-identity.mbt.qnt` | `Classes/Fighter.md`, `Classes/Barbarian.md`, `Classes/Paladin.md`, `Classes/Ranger.md`, and `Classes/Rogue.md` "Level 1: Weapon Mastery" | Weapon Mastery is reachable at level 1 for represented classes. |
| out | `cleanroom-input/qnt/battle-runtime/battle-runtime-web-restraint-hazard.mbt.qnt` | `Classes/Sorcerer.md`, `Classes/Warlock.md`, and `Classes/Wizard.md` level-2 spell lists; `Spells/Descriptions-S-Z.md` "Web" | Web is spell level 2. |
| in | `cleanroom-input/qnt/battle-runtime/battle-runtime-zero-hit-point-mid-resolution.mbt.qnt` | `Playing-the-Game.md` "Dropping to 0 Hit Points", "Death Saving Throws", and "Knocking Out a Creature" | Zero-hit-point resolution is a base character combat rule. |
| in | `cleanroom-input/qnt/battle-runtime/creature-attack.mbt.qnt` | `Playing-the-Game.md` "Attack Rolls" and "Damage Rolls"; `Monsters/Overview.md` "Stat Blocks" | Creature attacks are base battle rules. |
| out | `cleanroom-input/qnt/battle-runtime/monk-martial-arts-selected-identity.mbt.qnt` | `Classes/Monk.md` "Level 1: Martial Arts" and Monk table Martial Arts die progression | Driver projects a d12 Martial Arts die, which is later-level, not level 1-2. |
| flagged | `cleanroom-input/qnt/battle-runtime/rule-core-ability-skill-command.mbt.qnt` | `Playing-the-Game.md` "Search"; `Classes/Cleric.md` cantrip `Guidance`; `Classes/Bard.md` level-2 spell list `Enhance Ability`; `Classes/*` level-1 spell lists `Command` | Mixed base/Search, cantrip, level-1 Command, and spell-level-2 Enhance Ability. |
| in | `cleanroom-input/qnt/battle-runtime/rule-core-attack-damage-disposition.mbt.qnt` | `Playing-the-Game.md` "Knocking Out a Creature"; `Playing-the-Game.md` "Damage Rolls" | Attack damage disposition is a base combat rule. |
| flagged | `cleanroom-input/qnt/battle-runtime/rule-core-features.mbt.qnt` | `Classes/Fighter.md` level-2 Action Surge and level-3 Improved Critical; `Classes/Monk.md` level-3 Deflect Attacks; `Classes/Rogue.md` level-5 Uncanny Dodge | Composite rule-core driver mixes level-1/2 and later-level feature obligations. |
| in | `cleanroom-input/qnt/battle-runtime/rule-core-hit-point-damage.mbt.qnt` | `Playing-the-Game.md` "Hit Points", "Dropping to 0 Hit Points", and "Temporary Hit Points" | Hit point damage is a base character combat rule. |
| in | `cleanroom-input/qnt/battle-runtime/rule-core-movement.mbt.qnt` | `Playing-the-Game.md` "Movement and Position", "Actions", and "Opportunity Attacks" | Movement, Dash, Disengage, Grapple, and Opportunity Attacks are base combat rules. |
| in | `cleanroom-input/qnt/battle-runtime/rule-core-reactions.mbt.qnt` | `Playing-the-Game.md` "Reactions", "Ready", and "Opportunity Attacks"; `Rules-Glossary.md` "Concentration" | Reaction and readied-action rules are base combat rules. |
| in | `cleanroom-input/qnt/battle-runtime/rule-core-shove-outcome.mbt.qnt` | `Rules-Glossary.md` "Unarmed Strike"; `Playing-the-Game.md` "Attack Action" | Shove is an Unarmed Strike option available through the base Attack action. |
| flagged | `cleanroom-input/qnt/battle-runtime/rule-core-spells.mbt.qnt` | `Classes/Wizard.md` level-1 `Magic Missile` and `Mage Armor`; `Classes/Bard.md` level-3 `Mass Healing Word`; `Classes/Cleric.md` level-5 `Mass Cure Wounds` | Composite rule-core driver mixes cantrip/level-1 spells with higher-level spell profiles. |
| in | `cleanroom-input/qnt/battle-runtime/rule-core-stat-block-controls.mbt.qnt` | `Monsters/Overview.md` "Stat Blocks"; `Playing-the-Game.md` "Actions" | Stat-block action control is a base battle rule a level-1/2 character can encounter. |

## Flagged Owner Questions

| Driver | Question |
| --- | --- |
| `character-creation-class-feature-selected-identity.mbt.qnt` | Should the level-3 Wizard Evocation Savant branch be split out, or should this whole selected-identity driver stay out of the level-1/2 Work Loop? |
| `character-creation-rogue-expertise-selected-identity.mbt.qnt` | Should the level-6 Expertise branch be split from the level-1 Rogue Expertise branch? |
| `character-creation-warlock-eldritch-invocations-selected-identity.mbt.qnt` | Should later-level replacement/prerequisite cases be split from level-1/2 Eldritch Invocation acquisition? |
| `character-sheet-arcane-recovery-selected-identity.mbt.qnt` | Should second-level spell-slot recovery be split from level-1 Arcane Recovery reset/rejection facts? |
| `character-sheet-class-feature-selected-identity.mbt.qnt` | Should level-3 subclass spell projections be split from level-1/2 class feature projections? |
| `character-sheet-spell-slots-pact-slots.mbt.qnt` | Should later full-caster slot examples be split from level-1/2 ordinary and Pact Magic slot transitions? |
| `character-battle-init-projection.mbt.qnt` | Should spell-level-2 and spell-level-3 handoff facts be split from level-1/2 handoff projection? |
| `character-battle-settlement.mbt.qnt` | Should created level-3 slot ambiguity and active-Wild-Shape handoff rejection be split from base level-1/2 settlement? |
| `character-sheet-feature-resources.mbt.qnt` | Should Font of Magic level-3 created-slot behavior be split from level-1/2 resource pools? |
| `battle-runtime-ability-check-choice-search.mbt.qnt` | Should Enhance Ability be split from Search and Guidance choice/search behavior? |
| `battle-runtime-after-hit-damage-riders.mbt.qnt` | Should spell-level-2 Shining Smite be split from level-1/2 after-hit riders? |
| `battle-runtime-condition-saving-throw-selected-identity.mbt.qnt` | Should spell-level-2 and spell-level-3 condition spells be split from level-1 condition spell witnesses? |
| `battle-runtime-movement-forced-movement-selected-identity.mbt.qnt` | Should level-5/6 movement features be split from level-1 forced-movement spells and level-2 Monk movement? |
| `battle-runtime-mycelium-step-feature-selected-identity.mbt.qnt` | What copied SRD 5.2.1 RAW passage, if any, establishes Mycelium Step and its acquisition level? |
| `battle-runtime-reaction-casting-time.mbt.qnt` | Should Counterspell branches be split from the level-1 Hellish Rebuke reaction-casting branch? |
| `battle-runtime-reaction-spell-selected-identity.mbt.qnt` | Should Counterspell be split from level-1 reaction spell selected-identity witnesses such as Shield and Hellish Rebuke? |
| `rule-core-ability-skill-command.mbt.qnt` | Should Enhance Ability be split from base Search, Guidance, and Command rule-core witnesses? |
| `rule-core-features.mbt.qnt` | Should later-level feature obligations be split from level-1/2 feature rule-core witnesses? |
| `rule-core-spells.mbt.qnt` | Should Mass Healing Word, Mass Cure Wounds, and other higher-level spell profiles be split from cantrip/level-1 spell-core witnesses? |
