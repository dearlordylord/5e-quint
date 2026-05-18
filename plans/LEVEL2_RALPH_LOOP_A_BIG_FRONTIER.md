# Level 2 Ralph Loop A - Big Frontier

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L12G-OWNER-BARBARIAN-RECKLESS-ATTACK",
      "status": "done",
      "title": "Barbarian Reckless Attack Owner Evidence"
    },
    {
      "number": 2,
      "id": "L12G-OWNER-FIGHTER-ACTION-SURGE",
      "status": "done",
      "title": "Fighter Action Surge Owner Evidence"
    },
    {
      "number": 3,
      "id": "L12G-OWNER-FIGHTER-TACTICAL-MIND",
      "status": "done",
      "title": "Fighter Tactical Mind Owner Evidence"
    },
    {
      "number": 4,
      "id": "L12G-OWNER-ROGUE-CUNNING-ACTION",
      "status": "done",
      "title": "Rogue Cunning Action Owner Evidence"
    },
    {
      "number": 5,
      "id": "L12G-CLASS-BARBARIAN-DANGER-SENSE",
      "status": "done",
      "title": "Barbarian Danger Sense Support"
    },
    {
      "number": 6,
      "id": "L12G-CLASS-BARD-JACK-OF-ALL-TRADES",
      "status": "done",
      "title": "Bard Jack Of All Trades Support"
    },
    {
      "number": 7,
      "id": "L12G-CLASS-PALADIN-FIGHTING-STYLE",
      "status": "done",
      "title": "Paladin Fighting Style Support"
    },
    {
      "number": 8,
      "id": "L12G-CLASS-PALADINS-SMITE",
      "status": "done",
      "title": "Paladins Smite Spell Access And Free Cast"
    },
    {
      "number": 9,
      "id": "L12G-CLASS-WIZARD-SCHOLAR",
      "status": "done",
      "title": "Wizard Scholar Constrained Expertise"
    },
    {
      "number": 10,
      "id": "L12G-AUTHOR-BARD-EXPERTISE",
      "status": "done",
      "title": "Bard Expertise Authoring And Support"
    },
    {
      "number": 11,
      "id": "L12G-AUTHOR-CLERIC-CHANNEL-DIVINITY",
      "status": "done",
      "title": "Cleric Channel Divinity Authoring And Support"
    },
    {
      "number": 12,
      "id": "L12G-AUTHOR-DRUID-WILD-SHAPE",
      "status": "done",
      "title": "Druid Wild Shape Authoring And Support"
    },
    {
      "number": 13,
      "id": "L12G-AUTHOR-MONK-MONKS-FOCUS",
      "status": "done",
      "title": "Monk Monks Focus Authoring And Support"
    },
    {
      "number": 14,
      "id": "L12G-AUTHOR-MONK-UNARMORED-MOVEMENT",
      "status": "done",
      "title": "Monk Unarmored Movement Authoring And Support"
    },
    {
      "number": 15,
      "id": "L12G-AUTHOR-MONK-UNCANNY-METABOLISM",
      "status": "done",
      "title": "Monk Uncanny Metabolism Authoring And Support"
    },
    {
      "number": 16,
      "id": "L12G-AUTHOR-RANGER-DEFT-EXPLORER",
      "status": "done",
      "title": "Ranger Deft Explorer Authoring And Support"
    },
    {
      "number": 17,
      "id": "L12G-AUTHOR-RANGER-FIGHTING-STYLE",
      "status": "done",
      "title": "Ranger Fighting Style Authoring And Support"
    },
    {
      "number": 18,
      "id": "L12G-AUTHOR-SORCERER-FONT-OF-MAGIC",
      "status": "done",
      "title": "Sorcerer Font Of Magic Authoring And Support"
    },
    {
      "number": 19,
      "id": "L12G-AUTHOR-SORCERER-METAMAGIC",
      "status": "done",
      "title": "Sorcerer Metamagic Authoring And Support"
    },
    {
      "number": 20,
      "id": "L12G-AUTHOR-WARLOCK-MAGICAL-CUNNING",
      "status": "done",
      "title": "Warlock Magical Cunning Authoring And Support"
    },
    {
      "number": 21,
      "id": "L12G-SPELL-ACID-ARROW",
      "status": "done",
      "title": "Acid Arrow Runtime Support"
    },
    {
      "number": 22,
      "id": "L12G-SPELL-AID",
      "status": "done",
      "title": "Aid Runtime Support"
    },
    {
      "number": 23,
      "id": "L12G-SPELL-ALTER-SELF",
      "status": "done",
      "title": "Alter Self Runtime Support Or Closure"
    },
    {
      "number": 24,
      "id": "L12G-SPELL-ARCANE-LOCK",
      "status": "done",
      "title": "Arcane Lock Runtime-Detached Closure"
    },
    {
      "number": 25,
      "id": "L12G-SPELL-BARKSKIN",
      "status": "done",
      "title": "Barkskin Runtime Support"
    },
    {
      "number": 26,
      "id": "L12G-SPELL-BLINDNESS-DEAFNESS",
      "status": "done",
      "title": "Blindness Deafness Runtime Support"
    },
    {
      "number": 27,
      "id": "L12G-SPELL-BLUR",
      "status": "done",
      "title": "Blur Runtime Support"
    },
    {
      "number": 28,
      "id": "L12G-SPELL-CONTINUAL-FLAME",
      "status": "done",
      "title": "Continual Flame Runtime-Detached Or Light Support"
    },
    {
      "number": 29,
      "id": "L12G-SPELL-FLAME-BLADE",
      "status": "done",
      "title": "Flame Blade Runtime Support"
    },
    {
      "number": 30,
      "id": "L12G-SPELL-GENTLE-REPOSE",
      "status": "done",
      "title": "Gentle Repose Runtime-Detached Closure"
    }
  ]
}
-->

This is the level-2 execution lane prepared from
`plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`. It is running as Loop A. Tasks
37-42 and 76-87 were split into Loop C, Tasks 43-58 were split into Loop B,
and Tasks 59-75 were split into Loop D. Only tasks with status
`ready-for-research` in this file are runnable.

This lane deliberately excludes:

- level-1-only work already owned by Loop D or Loop L;
- `counterspell`, because strict runtime/profile support is already complete
  and any remaining selected-identity accounting belongs to Loop D;
- all companion/familiar runtime execution, including `find_steed` and
  `druid_wild_companion`; the Wild Companion table-choice boundary moved to
  Loop C;
- any generated metric row already accepted, ignored, or outside the current
  level-2 frontier.

## Worktree Safety Prefix

Every Ralph prompt for this lane must include:

> Before starting, run `git log --oneline -1 master` and verify your HEAD
> matches. If not, run `git rebase master`. You are not alone in the codebase:
> do not revert edits made by others, and adapt your implementation around
> existing changes. Do not edit `plans/ACTIVE_PLAN.md`.

## Source Of Truth

For each task id in this plan, use the matching row in
`plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` as the pre-researched owner shape
and required output. This lane is an execution manifest over that gate, not a
second copy of the same domain details.

Each task starts by reading:

- the matching row in `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`
  or `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- the local RAW source under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, Unit profiles, owner-evidence
  manifests, and focused tests for the Unit id.

## Review Loop

Use implementer, reviewer, handback until `accept`, then decider. The reviewer
loop must include RAW traceability, ubiquitous-language/domain-language,
architecture/connascence, and code-review passes. Fix every reasonable finding,
explicitly reject only findings with a concrete reason, and repeat until no
reasonable findings remain.

Reviewers should reject:

- support claims without executable owner evidence;
- catalog admission treated as runtime support;
- table-detached detection/social/exploration facts added as runtime state;
- object, geometry, light, or pathfinding derivation hidden inside spell
  support;
- duplicated Spell Definition, Spell Access, Spell Invocation, Spell Effect,
  Character Sheet, or resource state;
- companion behavior.

## Task Output Contract

Every task must leave its Unit in one concrete end state:

- `supported-profile` with deterministic admission/projection evidence and
  focused owner tests;
- `profile-subset-supported` only when the executable subset is precise and
  every residual has an accepted closure kind;
- `unsupported-profile` with an accepted runtime-detached closure when the rule
  is outside product runtime;
- a smaller follow-up split only when RAW proves the listed task cannot fit in
  one coding session, with the original metric row left in a precise blocked
  state rather than generic todo wording.

Every implementation task runs:

- relevant focused package tests;
- package typecheck for touched packages when dependencies are available;
- `pnpm unit-profile-coverage:check --write`;
- `pnpm unit-profile-coverage:check`;
- `git diff --check`;
- reviewer-loop convergence.

Do not run battle-runtime MBT unless the task changes promoted battle-runtime
behavior and focused tests cannot cover the changed boundary. If MBT is needed,
use the repository MBT scarcity protocol.

## Included Work

Loop A owns Tasks 22-36, Acid Arrow follow-up Tasks 88-89, Alter Self
follow-up Tasks 90-92, Continual Flame follow-up Task 93, and Flame Blade
follow-up Tasks 94-95.
Tasks 1-21 are already done in this lane. Tasks 37-42 and 76-87 moved to
`plans/LEVEL2_RALPH_LOOP_C_BIG_FRONTIER.md`, Tasks 43-58 moved to
`plans/LEVEL2_RALPH_LOOP_B_BIG_FRONTIER.md`, and Tasks 59-75 moved to
`plans/LEVEL2_RALPH_LOOP_D_BIG_FRONTIER.md`. The historical manifest rows for
sibling lanes remain below, but they stay `deferred` here so Loop A cannot pick
them. Keep this lane out of Loop D's level-1 recursive frontier and Loop L's
language-access frontier.

| Lane | Gate | Task | Unit |
| ---: | ---: | --- | --- |
| 1 | 1 | `L12G-OWNER-BARBARIAN-RECKLESS-ATTACK` | `barbarian_reckless_attack` |
| 2 | 2 | `L12G-OWNER-FIGHTER-ACTION-SURGE` | `fighter_action_surge` |
| 3 | 3 | `L12G-OWNER-FIGHTER-TACTICAL-MIND` | `fighter_tactical_mind` |
| 4 | 4 | `L12G-OWNER-ROGUE-CUNNING-ACTION` | `rogue_cunning_action` |
| 5 | 5 | `L12G-CLASS-BARBARIAN-DANGER-SENSE` | `barbarian_danger_sense` |
| 6 | 6 | `L12G-CLASS-BARD-JACK-OF-ALL-TRADES` | `bard_jack_of_all_trades` |
| 7 | 7 | `L12G-CLASS-PALADIN-FIGHTING-STYLE` | `paladin_fighting_style` |
| 8 | 8 | `L12G-CLASS-PALADINS-SMITE` | `paladin_paladins_smite` |
| 9 | 9 | `L12G-CLASS-WIZARD-SCHOLAR` | `wizard_scholar` |
| 10 | 10 | `L12G-AUTHOR-BARD-EXPERTISE` | `bard_expertise` |
| 11 | 11 | `L12G-AUTHOR-CLERIC-CHANNEL-DIVINITY` | `cleric_channel_divinity` |
| 12 | 12 | `L12G-AUTHOR-DRUID-WILD-SHAPE` | `druid_wild_shape` |
| 13 | 14 | `L12G-AUTHOR-MONK-MONKS-FOCUS` | `monk_monks_focus` |
| 14 | 15 | `L12G-AUTHOR-MONK-UNARMORED-MOVEMENT` | `monk_unarmored_movement` |
| 15 | 16 | `L12G-AUTHOR-MONK-UNCANNY-METABOLISM` | `monk_uncanny_metabolism` |
| 16 | 17 | `L12G-AUTHOR-RANGER-DEFT-EXPLORER` | `ranger_deft_explorer` |
| 17 | 18 | `L12G-AUTHOR-RANGER-FIGHTING-STYLE` | `ranger_fighting_style` |
| 18 | 19 | `L12G-AUTHOR-SORCERER-FONT-OF-MAGIC` | `sorcerer_font_of_magic` |
| 19 | 20 | `L12G-AUTHOR-SORCERER-METAMAGIC` | `sorcerer_metamagic` |
| 20 | 21 | `L12G-AUTHOR-WARLOCK-MAGICAL-CUNNING` | `warlock_magical_cunning` |
| 21 | 22 | `L12G-SPELL-ACID-ARROW` | `acid_arrow` |
| 22 | 23 | `L12G-SPELL-AID` | `aid` |
| 23 | 24 | `L12G-SPELL-ALTER-SELF` | `alter_self` |
| 24 | 25 | `L12G-SPELL-ARCANE-LOCK` | `arcane_lock` |
| 25 | 26 | `L12G-SPELL-BARKSKIN` | `barkskin` |
| 26 | 27 | `L12G-SPELL-BLINDNESS-DEAFNESS` | `blindness_deafness` |
| 27 | 28 | `L12G-SPELL-BLUR` | `blur` |
| 28 | 29 | `L12G-SPELL-CONTINUAL-FLAME` | `continual_flame` |
| 29 | 31 | `L12G-SPELL-FLAME-BLADE` | `flame_blade` |
| 30 | 32 | `L12G-SPELL-GENTLE-REPOSE` | `gentle_repose` |
| 31 | 33 | `L12G-SPELL-HEAT-METAL` | `heat_metal` |
| 32 | 34 | `L12G-SPELL-HOLD-PERSON` | `hold_person` |
| 33 | 35 | `L12G-SPELL-INVISIBILITY` | `invisibility` |
| 34 | 36 | `L12G-SPELL-LESSER-RESTORATION` | `lesser_restoration` |
| 35 | 37 | `L12G-SPELL-MAGIC-WEAPON` | `magic_weapon` |
| 36 | 38 | `L12G-SPELL-MIND-SPIKE` | `mind_spike` |
| 37 | 39 | `L12G-SPELL-MISTY-STEP` | `misty_step` |
| 38 | 40 | `L12G-SPELL-MOONBEAM` | `moonbeam` |
| 39 | 41 | `L12G-SPELL-PASS-WITHOUT-TRACE` | `pass_without_trace` |
| 40 | 42 | `L12G-SPELL-PRAYER-OF-HEALING` | `prayer_of_healing` |
| 41 | 43 | `L12G-SPELL-PROTECTION-FROM-POISON` | `protection_from_poison` |
| 42 | 44 | `L12G-SPELL-RAY-OF-ENFEEBLEMENT` | `ray_of_enfeeblement` |
| 43 | 45 | `L12G-SPELL-SCORCHING-RAY` | `scorching_ray` |
| 44 | 46 | `L12G-SPELL-SEE-INVISIBILITY` | `see_invisibility` |
| 45 | 47 | `L12G-SPELL-SHATTER` | `shatter` |
| 46 | 48 | `L12G-SPELL-SHINING-SMITE` | `shining_smite` |
| 47 | 49 | `L12G-SPELL-SPIDER-CLIMB` | `spider_climb` |
| 48 | 50 | `L12G-SPELL-SPIKE-GROWTH` | `spike_growth` |
| 49 | 51 | `L12G-SPELL-SPIRITUAL-WEAPON` | `spiritual_weapon` |
| 50 | 52 | `L12G-SPELL-WARDING-BOND` | `warding_bond` |
| 51 | 53 | `L12G-SPELL-WEB` | `web` |
| 52 | 54 | `L12G-MISSING-ANIMAL-MESSENGER` | `animal_messenger` |
| 53 | 55 | `L12G-MISSING-ARCANISTS-MAGIC-AURA` | `arcanists_magic_aura` |
| 54 | 56 | `L12G-MISSING-AUGURY` | `augury` |
| 55 | 57 | `L12G-MISSING-CALM-EMOTIONS` | `calm_emotions` |
| 56 | 58 | `L12G-MISSING-DARKNESS` | `darkness` |
| 57 | 59 | `L12G-MISSING-DARKVISION` | `darkvision` |
| 58 | 60 | `L12G-MISSING-DETECT-THOUGHTS` | `detect_thoughts` |
| 59 | 61 | `L12G-MISSING-DRAGONS-BREATH` | `dragons_breath` |
| 60 | 62 | `L12G-MISSING-ENHANCE-ABILITY` | `enhance_ability` |
| 61 | 63 | `L12G-MISSING-ENLARGE-REDUCE` | `enlarge_reduce` |
| 62 | 64 | `L12G-MISSING-ENTHRALL` | `enthrall` |
| 63 | 65 | `L12G-MISSING-FIND-TRAPS` | `find_traps` |
| 64 | 66 | `L12G-MISSING-FLAMING-SPHERE` | `flaming_sphere` |
| 65 | 67 | `L12G-MISSING-GUST-OF-WIND` | `gust_of_wind` |
| 66 | 68 | `L12G-MISSING-KNOCK` | `knock` |
| 67 | 69 | `L12G-MISSING-LEVITATE` | `levitate` |
| 68 | 70 | `L12G-MISSING-LOCATE-ANIMALS-OR-PLANTS` | `locate_animals_or_plants` |
| 69 | 71 | `L12G-MISSING-LOCATE-OBJECT` | `locate_object` |
| 70 | 72 | `L12G-MISSING-MAGIC-MOUTH` | `magic_mouth` |
| 71 | 73 | `L12G-MISSING-MIRROR-IMAGE` | `mirror_image` |
| 72 | 74 | `L12G-MISSING-ROPE-TRICK` | `rope_trick` |
| 73 | 75 | `L12G-MISSING-SILENCE` | `silence` |
| 74 | 76 | `L12G-MISSING-SUGGESTION` | `suggestion` |
| 75 | 77 | `L12G-MISSING-ZONE-OF-TRUTH` | `zone_of_truth` |
| 76 | 13 | `L12G-AUTHOR-DRUID-WILD-COMPANION` | `druid_wild_companion` |
| 77 | 12a | `L12G-FOLLOWUP-DRUID-WILD-SHAPE-CHARACTER-FACTS` | `druid_wild_shape` |
| 78 | 12b | `L12G-FOLLOWUP-DRUID-WILD-SHAPE-SHAPE-SHIFTING-RUNTIME` | `druid_wild_shape` |
| 79 | 14a | `L12G-FOLLOWUP-MONK-MONKS-FOCUS-CHARACTER-FACTS` | `monk_monks_focus` |
| 80 | 14b | `L12G-FOLLOWUP-MONK-MONKS-FOCUS-BATTLE-OPTIONS` | `monk_monks_focus` |
| 81 | 16a | `L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-CHARACTER-FACTS` | `monk_uncanny_metabolism` |
| 82 | 16b | `L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-RUNTIME` | `monk_uncanny_metabolism` |
| 83 | 19a | `L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS` | `sorcerer_font_of_magic` |
| 84 | 19b | `L12G-FOLLOWUP-SORCERER-FONT-SLOT-TO-POINTS` | `sorcerer_font_of_magic` |
| 85 | 19c | `L12G-FOLLOWUP-SORCERER-FONT-POINTS-TO-SLOTS` | `sorcerer_font_of_magic` |
| 86 | 20a | `L12G-FOLLOWUP-SORCERER-METAMAGIC-CHARACTER-FACTS` | `sorcerer_metamagic` |
| 87 | 20b | `L12G-FOLLOWUP-SORCERER-METAMAGIC-OPTION-EXECUTION` | `sorcerer_metamagic` |
| 88 | 22a | `L12G-FOLLOWUP-ACID-ARROW-SURFACE-DAMAGE-SHAPE` | `acid_arrow` |
| 89 | 22b | `L12G-FOLLOWUP-ACID-ARROW-DELAYED-RUNTIME-SUPPORT` | `acid_arrow` |
| 90 | 24a | `L12G-FOLLOWUP-ALTER-SELF-SURFACE-OPTION-SHAPE` | `alter_self` |
| 91 | 24b | `L12G-FOLLOWUP-ALTER-SELF-AQUATIC-RUNTIME` | `alter_self` |
| 92 | 24c | `L12G-FOLLOWUP-ALTER-SELF-NATURAL-WEAPONS-RUNTIME` | `alter_self` |
| 93 | 29a | `L12G-FOLLOWUP-CONTINUAL-FLAME-DISPEL-REMOVAL` | `continual_flame` |
| 94 | 31a | `L12G-FOLLOWUP-FLAME-BLADE-SURFACE-LIFECYCLE` | `flame_blade` |
| 95 | 31b | `L12G-FOLLOWUP-FLAME-BLADE-RUNTIME-SUPPORT` | `flame_blade` |

## Follow-Up Dependencies

| Task | Depends on | Dependency reason |
| --- | --- | --- |
| `L12G-AUTHOR-DRUID-WILD-COMPANION` | `L12G-AUTHOR-DRUID-WILD-SHAPE` | Druid level-2 admission must retain both level-2 feature refs without treating companion execution as Wild Shape support. |
| `L12G-FOLLOWUP-DRUID-WILD-SHAPE-CHARACTER-FACTS` | `L12G-AUTHOR-DRUID-WILD-COMPANION` | Character creation/sheet projection needs the Druid level-2 feature boundary closed before projecting Wild Shape resources and known forms. |
| `L12G-FOLLOWUP-DRUID-WILD-SHAPE-SHAPE-SHIFTING-RUNTIME` | `L12G-FOLLOWUP-DRUID-WILD-SHAPE-CHARACTER-FACTS` | Shape-shifting runtime should consume the projected Wild Shape resource, duration, and known-form facts instead of duplicating class progression state. |
| `L12G-FOLLOWUP-MONK-MONKS-FOCUS-CHARACTER-FACTS` | `L12G-AUTHOR-MONK-MONKS-FOCUS`, `L12G-AUTHOR-MONK-UNARMORED-MOVEMENT`, `L12G-AUTHOR-MONK-UNCANNY-METABOLISM` | Monk level-2 admission should retain the full level-2 feature grant set before projecting Focus Point resources from the authored Monk's Focus record. |
| `L12G-FOLLOWUP-MONK-MONKS-FOCUS-BATTLE-OPTIONS` | `L12G-FOLLOWUP-MONK-MONKS-FOCUS-CHARACTER-FACTS` | Battle option execution should consume the projected shared Focus Point resource instead of creating per-feature pools. |
| `L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-CHARACTER-FACTS` | `L12G-AUTHOR-MONK-UNCANNY-METABOLISM`, `L12G-FOLLOWUP-MONK-MONKS-FOCUS-CHARACTER-FACTS` | Uncanny Metabolism use-state projection should retain the authored feature and link to the already-owned shared Focus Point resource and Martial Arts die source. |
| `L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-RUNTIME` | `L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-CHARACTER-FACTS`, `L12G-FOLLOWUP-MONK-MONKS-FOCUS-BATTLE-OPTIONS` | Initiative-window recovery should consume the projected once-per-Long-Rest use state and shared Focus Point battle handoff instead of creating a per-feature pool. |
| `L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS` | `L12G-AUTHOR-SORCERER-FONT-OF-MAGIC`, `L12G-AUTHOR-SORCERER-METAMAGIC` | Sorcerer level-2 admission should retain the full level-2 feature grant set before projecting the shared Sorcery Point resource from Font of Magic. |
| `L12G-FOLLOWUP-SORCERER-FONT-SLOT-TO-POINTS` | `L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS` | Spell Slot to Sorcery Point conversion should consume existing Spell Slot state and the projected shared Sorcery Point resource instead of creating per-feature resource state. |
| `L12G-FOLLOWUP-SORCERER-FONT-POINTS-TO-SLOTS` | `L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS` | Sorcery Point to temporary Spell Slot creation should consume the projected shared Sorcery Point resource and own the temporary slot lifecycle without duplicating class progression state. |
| `L12G-FOLLOWUP-SORCERER-METAMAGIC-CHARACTER-FACTS` | `L12G-AUTHOR-SORCERER-METAMAGIC`, `L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS` | Metamagic option projection should retain the authored Metamagic feature and link known option facts to the shared Sorcery Point resource projected from Font of Magic instead of duplicating point-pool state. |
| `L12G-FOLLOWUP-SORCERER-METAMAGIC-OPTION-EXECUTION` | `L12G-FOLLOWUP-SORCERER-METAMAGIC-CHARACTER-FACTS`, `L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS` | Cast-time Metamagic execution should consume known-option and shared Sorcery Point resource facts rather than creating a Metamagic-local point pool. |
| `L12G-FOLLOWUP-ACID-ARROW-SURFACE-DAMAGE-SHAPE` | `L12G-SPELL-ACID-ARROW` | Acid Arrow runtime support needs a lossless Spell Definition shape for initial, later, miss-only, and slot-scaling damage facts before runtime projection can consume the authored record. |
| `L12G-FOLLOWUP-ACID-ARROW-DELAYED-RUNTIME-SUPPORT` | `L12G-FOLLOWUP-ACID-ARROW-SURFACE-DAMAGE-SHAPE` | Delayed runtime support should consume the repaired Acid Arrow Spell Definition rather than duplicating or reinterpreting lossy authored damage state. |
| `L12G-FOLLOWUP-ALTER-SELF-SURFACE-OPTION-SHAPE` | `L12G-SPELL-ALTER-SELF` | Alter Self runtime support needs a lossless Spell Definition option shape for Aquatic Adaptation, Change Appearance, and the Natural Weapons growth and damage-type choices before runtime projection can consume the authored record. |
| `L12G-FOLLOWUP-ALTER-SELF-AQUATIC-RUNTIME` | `L12G-FOLLOWUP-ALTER-SELF-SURFACE-OPTION-SHAPE` | Aquatic Adaptation runtime should consume spell-owned option state, linked Speed projection, and Concentration cleanup from the repaired option shape rather than copying creature Speed into parallel spell state. |
| `L12G-FOLLOWUP-ALTER-SELF-NATURAL-WEAPONS-RUNTIME` | `L12G-FOLLOWUP-ALTER-SELF-SURFACE-OPTION-SHAPE`, `L12G-FOLLOWUP-ALTER-SELF-AQUATIC-RUNTIME` | Natural Weapons should build on the shared Alter Self mode-replacement and cleanup runtime while consuming the lossless Natural Weapons option facts instead of duplicating Unarmed Strike state. |
| `L12G-FOLLOWUP-CONTINUAL-FLAME-DISPEL-REMOVAL` | `L12G-SPELL-CONTINUAL-FLAME` | Generic dispel or suppression cleanup should consume until-dispelled spell-effect markers such as Continual Flame object emitters instead of adding per-spell removal registries. |
| `L12G-FOLLOWUP-FLAME-BLADE-SURFACE-LIFECYCLE` | `L12G-SPELL-FLAME-BLADE` | Flame Blade runtime support needs a lossless Spell Definition shape for the spell-created held blade lifecycle before runtime projection can consume the authored record. |
| `L12G-FOLLOWUP-FLAME-BLADE-RUNTIME-SUPPORT` | `L12G-FOLLOWUP-FLAME-BLADE-SURFACE-LIFECYCLE` | Runtime support should consume the repaired held-created-object shape rather than duplicating free-hand creation, let-go disappearance, re-evocation, light, attack, and damage-scaling facts. |

## Task Details

## Wrap-Up Directive

This lane is in organic shutdown mode. Complete only Task 30 - L12G-SPELL-GENTLE-REPOSE - Gentle Repose Runtime-Detached Closure, run reviewer-loop convergence, merge the completed task through this integration branch, and then stop. Do not start another task from this file.

All other unfinished tasks from this lane were moved to `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`. That backlog is storage for future orchestration, not active work for this lane.

### Task 1 - L12G-OWNER-BARBARIAN-RECKLESS-ATTACK - Barbarian Reckless Attack Owner Evidence

Status: `done`

Unit: `barbarian_reckless_attack`. Gate task: 1 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `barbarian_reckless_attack`.

Outputs:

- one concrete end state from the Task Output Contract for `barbarian_reckless_attack`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `barbarian_reckless_attack` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 2 - L12G-OWNER-FIGHTER-ACTION-SURGE - Fighter Action Surge Owner Evidence

Status: `done`

Unit: `fighter_action_surge`. Gate task: 2 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `fighter_action_surge`.

Outputs:

- one concrete end state from the Task Output Contract for `fighter_action_surge`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `fighter_action_surge` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 3 - L12G-OWNER-FIGHTER-TACTICAL-MIND - Fighter Tactical Mind Owner Evidence

Status: `done`

Unit: `fighter_tactical_mind`. Gate task: 3 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `fighter_tactical_mind`.

Outputs:

- one concrete end state from the Task Output Contract for `fighter_tactical_mind`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `fighter_tactical_mind` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 4 - L12G-OWNER-ROGUE-CUNNING-ACTION - Rogue Cunning Action Owner Evidence

Status: `done`

Unit: `rogue_cunning_action`. Gate task: 4 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `rogue_cunning_action`.

Outputs:

- one concrete end state from the Task Output Contract for `rogue_cunning_action`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `rogue_cunning_action` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 5 - L12G-CLASS-BARBARIAN-DANGER-SENSE - Barbarian Danger Sense Support

Status: `done`

Unit: `barbarian_danger_sense`. Gate task: 5 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `barbarian_danger_sense`.

Outputs:

- one concrete end state from the Task Output Contract for `barbarian_danger_sense`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `barbarian_danger_sense` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 6 - L12G-CLASS-BARD-JACK-OF-ALL-TRADES - Bard Jack Of All Trades Support

Status: `done`

Unit: `bard_jack_of_all_trades`. Gate task: 6 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `bard_jack_of_all_trades`.

Outputs:

- one concrete end state from the Task Output Contract for `bard_jack_of_all_trades`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `bard_jack_of_all_trades` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 7 - L12G-CLASS-PALADIN-FIGHTING-STYLE - Paladin Fighting Style Support

Status: `done`

Unit: `paladin_fighting_style`. Gate task: 7 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `paladin_fighting_style`.

Outputs:

- one concrete end state from the Task Output Contract for `paladin_fighting_style`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `paladin_fighting_style` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 8 - L12G-CLASS-PALADINS-SMITE - Paladins Smite Spell Access And Free Cast

Status: `done`

Unit: `paladin_paladins_smite`. Gate task: 8 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `paladin_paladins_smite`.

Outputs:

- one concrete end state from the Task Output Contract for `paladin_paladins_smite`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `paladin_paladins_smite` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 9 - L12G-CLASS-WIZARD-SCHOLAR - Wizard Scholar Constrained Expertise

Status: `done`

Unit: `wizard_scholar`. Gate task: 9 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `wizard_scholar`.

Outputs:

- one concrete end state from the Task Output Contract for `wizard_scholar`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `wizard_scholar` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 10 - L12G-AUTHOR-BARD-EXPERTISE - Bard Expertise Authoring And Support

Status: `done`

Unit: `bard_expertise`. Gate task: 10 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `bard_expertise`.
- continuation WIP, if still available, on branch `backup/level2-a-task-10-bard-expertise-wip-20260518-024127`
  at commit `852a47eebfe4a477f33682efdc04124efa9880bc`; inspect and cherry-pick/rework it only
  if it still matches RAW, ubiquitous language, architecture, and the task output contract.

Outputs:

- one concrete end state from the Task Output Contract for `bard_expertise`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `bard_expertise` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 11 - L12G-AUTHOR-CLERIC-CHANNEL-DIVINITY - Cleric Channel Divinity Authoring And Support

Status: `done`

Unit: `cleric_channel_divinity`. Gate task: 11 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `cleric_channel_divinity`.

Outputs:

- one concrete end state from the Task Output Contract for `cleric_channel_divinity`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `cleric_channel_divinity` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 12 - L12G-AUTHOR-DRUID-WILD-SHAPE - Druid Wild Shape Authoring And Support

Status: `done`

Unit: `druid_wild_shape`. Gate task: 12 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `druid_wild_shape`.

Outputs:

- one concrete end state from the Task Output Contract for `druid_wild_shape`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `druid_wild_shape` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 13 - L12G-AUTHOR-MONK-MONKS-FOCUS - Monk Monks Focus Authoring And Support

Status: `done`

Unit: `monk_monks_focus`. Gate task: 14 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `monk_monks_focus`.

Outputs:

- one concrete end state from the Task Output Contract for `monk_monks_focus`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `monk_monks_focus` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 14 - L12G-AUTHOR-MONK-UNARMORED-MOVEMENT - Monk Unarmored Movement Authoring And Support

Status: `done`

Unit: `monk_unarmored_movement`. Gate task: 15 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `monk_unarmored_movement`.

Outputs:

- one concrete end state from the Task Output Contract for `monk_unarmored_movement`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `monk_unarmored_movement` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 15 - L12G-AUTHOR-MONK-UNCANNY-METABOLISM - Monk Uncanny Metabolism Authoring And Support

Status: `done`

Unit: `monk_uncanny_metabolism`. Gate task: 16 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `monk_uncanny_metabolism`.

Outputs:

- one concrete end state from the Task Output Contract for `monk_uncanny_metabolism`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `monk_uncanny_metabolism` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 16 - L12G-AUTHOR-RANGER-DEFT-EXPLORER - Ranger Deft Explorer Authoring And Support

Status: `done`

Unit: `ranger_deft_explorer`. Gate task: 17 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `ranger_deft_explorer`.

Outputs:

- one concrete end state from the Task Output Contract for `ranger_deft_explorer`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `ranger_deft_explorer` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 17 - L12G-AUTHOR-RANGER-FIGHTING-STYLE - Ranger Fighting Style Authoring And Support

Status: `done`

Unit: `ranger_fighting_style`. Gate task: 18 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `ranger_fighting_style`.

Outputs:

- one concrete end state from the Task Output Contract for `ranger_fighting_style`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `ranger_fighting_style` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 18 - L12G-AUTHOR-SORCERER-FONT-OF-MAGIC - Sorcerer Font Of Magic Authoring And Support

Status: `done`

Unit: `sorcerer_font_of_magic`. Gate task: 19 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `sorcerer_font_of_magic`.

Outputs:

- one concrete end state from the Task Output Contract for `sorcerer_font_of_magic`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `sorcerer_font_of_magic` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 19 - L12G-AUTHOR-SORCERER-METAMAGIC - Sorcerer Metamagic Authoring And Support

Status: `done`

Unit: `sorcerer_metamagic`. Gate task: 20 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `sorcerer_metamagic`.

Outputs:

- one concrete end state from the Task Output Contract for `sorcerer_metamagic`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `sorcerer_metamagic` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- Metamagic execution support must consume the shared Sorcery Point resource projected from `sorcerer_font_of_magic`; do not claim option execution support with a synthetic Metamagic-local point pool;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 20 - L12G-AUTHOR-WARLOCK-MAGICAL-CUNNING - Warlock Magical Cunning Authoring And Support

Status: `done`

Unit: `warlock_magical_cunning`. Gate task: 21 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `warlock_magical_cunning`.

Outputs:

- one concrete end state from the Task Output Contract for `warlock_magical_cunning`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `warlock_magical_cunning` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 21 - L12G-SPELL-ACID-ARROW - Acid Arrow Runtime Support

Status: `done`

Unit: `acid_arrow`. Gate task: 22 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `acid_arrow`.

Outputs:

- one concrete end state from the Task Output Contract for `acid_arrow`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `acid_arrow` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 22 - L12G-SPELL-AID - Aid Runtime Support

Status: `done`

Unit: `aid`. Gate task: 23 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `aid`.

Outputs:

- one concrete end state from the Task Output Contract for `aid`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `aid` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 23 - L12G-SPELL-ALTER-SELF - Alter Self Runtime Support Or Closure

Status: `done`

Unit: `alter_self`. Gate task: 24 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `alter_self`.

Outputs:

- one concrete end state from the Task Output Contract for `alter_self`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `alter_self` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 24 - L12G-SPELL-ARCANE-LOCK - Arcane Lock Runtime-Detached Closure

Status: `done`

Unit: `arcane_lock`. Gate task: 25 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `arcane_lock`.

Outputs:

- one concrete end state from the Task Output Contract for `arcane_lock`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `arcane_lock` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 25 - L12G-SPELL-BARKSKIN - Barkskin Runtime Support

Status: `done`

Unit: `barkskin`. Gate task: 26 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `barkskin`.

Outputs:

- one concrete end state from the Task Output Contract for `barkskin`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `barkskin` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 26 - L12G-SPELL-BLINDNESS-DEAFNESS - Blindness Deafness Runtime Support

Status: `done`

Unit: `blindness_deafness`. Gate task: 27 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `blindness_deafness`.

Outputs:

- one concrete end state from the Task Output Contract for `blindness_deafness`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `blindness_deafness` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 27 - L12G-SPELL-BLUR - Blur Runtime Support

Status: `done`

Unit: `blur`. Gate task: 28 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `blur`.

Outputs:

- one concrete end state from the Task Output Contract for `blur`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `blur` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 28 - L12G-SPELL-CONTINUAL-FLAME - Continual Flame Runtime-Detached Or Light Support

Status: `done`

Unit: `continual_flame`. Gate task: 29 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `continual_flame`.

Outputs:

- one concrete end state from the Task Output Contract for `continual_flame`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `continual_flame` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 29 - L12G-SPELL-FLAME-BLADE - Flame Blade Runtime Support

Status: `done`

Unit: `flame_blade`. Gate task: 31 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `flame_blade`.

Outputs:

- one concrete end state from the Task Output Contract for `flame_blade`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `flame_blade` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 30 - L12G-SPELL-GENTLE-REPOSE - Gentle Repose Runtime-Detached Closure

Status: `done`

Unit: `gentle_repose`. Gate task: 32 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `gentle_repose`.

Outputs:

- one concrete end state from the Task Output Contract for `gentle_repose`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `gentle_repose` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.
