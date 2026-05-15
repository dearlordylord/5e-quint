# SRDINV86 Recursive Level-1 Battle Feature Review

Task 322 reviewed the completed SRDINV84I1-I5 Find Familiar companion-runtime
batch. The lane does not need another concrete Find Familiar batch: the
remaining installed Spell Definition owner-evidence drift was a manifest gap,
not missing runtime behavior.

## Inventory State

Generated inventory metrics from
`plans/unit-profile-coverage/srd-unit-inventory.json` after adding the
Find Familiar deterministic admission/projection evidence marker and running
`pnpm unit-profile-coverage:check --write`:

- Total generated rows: 367.
- Level-1 rows: 156.
- Spell-list pressure rows for cantrips and level-1 spells: 211.
- Missing level-1 class containers: 0.
- Default level-1 battle readiness: 297/367 (80.9%).
- Accepted rows: 228.
- Accepted no-battle-effect rows: 69.
- Battle-runtime-required rows: 25.
- Partial-battle-runtime rows: 45.
- Level-1 rows by disposition: 144
  `catalog-installed-owner-evidence-present`, 12 `non-runtime`.
- Spell Unit pressure by disposition: 136
  `catalog-installed-owner-evidence-present`, 75
  `catalog-only/dead-for-now`.

The checker-visible installed Spell Definition owner-evidence gap is now
closed. The readiness numerator does not increase because Find Familiar remains
`profile-subset-supported`: the promoted runtime owns the usable battle
companion subset, while generic command AI and unsupported familiar-form
attacks remain outside the claimed subset.

## SRDINV84I1-I5 Batch Review

| Task | Result |
|---|---|
| SRDINV84I1 | Form catalog support now uses typed familiar form references, normal named forms, CR 0 Beast eligibility, eligible Creature Type override choices, and Pact special-form references where SRD Stat Blocks exist. |
| SRDINV84I2 | Companion lifecycle now records one active familiar per caster, atomic recast replacement, present/temporarily dismissed/0-HP disappeared states, Magic-action dismissal/reappearance, and item-drop boundary events. |
| SRDINV84I3 | Present familiars are allied combatants with their own Initiative turn, action, Reaction, and Movement resources; ordinary Find Familiar attacks and Opportunity Attacks are rejected while supported non-attack actions remain available. |
| SRDINV84I4 | Telepathic communication, Bonus Action shared senses, and Touch spell delivery through a present familiar are promoted; Touch delivery atomically spends the familiar Reaction. |
| SRDINV84I5 | Pact of the Chain's attack exception is promoted by requiring selected Pact access, one owner Attack-action attack to forgo, a present owned familiar, familiar Reaction availability, and a supported familiar Stat Block action attack. |

## Evidence Drift Closed

`unit-claims.jsonl` and `profiles.jsonl` already described the
`spell.find-familiar-lifecycle` subset and owners. SRDINV86 added the missing
checker-readable deterministic admission/projection evidence for
`find_familiar` at
`packages/battle-runtime/src/find-familiar-lifecycle.test.ts`, then regenerated
the Unit matrix and SRD inventory. The Wizard spell-list Find Familiar row now
has `catalog-installed-owner-evidence-present`.

## Remaining Profile-Subset-Supported Rows

These are the remaining subset-supported battle-adjacent rows in
`UNIT_REPORT.md`. Each row has a runtime owner for the supported subset and an
explicit owner/reason for the deferred subset; SRDINV86 does not append a new
batch for them.

| Unit | Supported owner | Remaining owner/reason |
|---|---|---|
| `bard_bardic_inspiration` | `battle-runtime` | Later-level die-size scaling is non-level-1 work already classified by SRDINV78. |
| `monk_martial_arts` | `battle-runtime`; `character-battle-runtime` | Later-level Martial Arts die scaling is non-level-1 work already classified by SRDINV78. |
| `ranger_favored_enemy` | `battle-runtime`; `character-battle-runtime` | Later free-cast scaling is non-level-1; Hunter's Mark finding Advantage belongs to SRDINV66 ability-check roll-mode work. |
| `chill_touch` | `battle-runtime` | Non-combatant target eligibility belongs to SRDINV34 target-boundary work. |
| `faerie_fire` | `battle-runtime` | Dim Light emission belongs to SRDINV70A light-emitter work. |
| `feather_fall` | `battle-runtime` | Fall distance, elevation, and landing geometry belong to SRDINV55 spatial work. |
| `find_familiar` | `battle-runtime` | Generic command AI and unsupported familiar-form attacks remain outside the promoted subset; SRDINV86 records the closure decision without starting another batch. |
| `fog_cloud` | `battle-runtime`; table/spatial caller facts | Area membership, line of sight, map illumination, pathfinding, and wind derivation belong to SRDINV66 spatial/table work. |
| `grease` | `battle-runtime` | Automatic area membership and pathfinding belong to SRDINV66 spatial work. |
| `hunters_mark` | `battle-runtime`; `character-battle-runtime` | Perception/Survival finding Advantage belongs to SRDINV66 ability-check roll-mode work. |
| `jump` | `battle-runtime` | Jump arc, pathfinding, collision, final-position, and Difficult Terrain landing derivation belong to SRDINV55 spatial work. |
| `light` | `battle-runtime` | Cover suppression, map illumination, obscured-area derivation, Darkvision-adjusted sight, and color presentation remain outside the object-emitter boundary. |
| `protection_from_evil_and_good` | `battle-runtime` | Repeat-save/possession-save and willing-touch target nuance belong to SRDINV66 work. |
| `produce_flame` | `battle-runtime` | Held-flame Bright/Dim Light interaction belongs to SRDINV70A light work. |
| `sleep` | `battle-runtime` | Non-sleeper automatic success waits for executable non-sleeper facts, owned by SRDINV41. |
| `thunderwave` | `battle-runtime` | Push geometry/pathfinding/final-position, broad object simulation, and sound propagation belong to SRDINV55. |
| `charm_person` | `battle-runtime` | Friendly disposition, social effects, and target knowledge on spell end belong to SRDINV41 social/knowledge work. |

## Unsupported-Profile Battle-Adjacent Rows

These unsupported-profile rows are intentionally not claimed as direct promoted
battle support. The owner column names the boundary that owns the source fact or
the reason no battle profile is promoted.

| Unit | Owner | Reason |
|---|---|---|
| `fighter_fighting_style` | `character-creation-runtime`; selected Fighting Style feat Units | Choice/grant container; selected Fighting Style feat carries executable pressure. |
| `fighter_weapon_mastery` | `character-creation-runtime`; mastery property Units | Weapon Mastery grant container; selected mastery Units carry execution. |
| `barbarian_weapon_mastery` | `character-creation-runtime`; mastery property Units | Weapon Mastery grant container; selected mastery Units carry execution. |
| `paladin_weapon_mastery` | `character-creation-runtime`; mastery property Units | Weapon Mastery grant container; selected mastery Units carry execution. |
| `ranger_weapon_mastery` | `character-creation-runtime`; mastery property Units | Weapon Mastery grant container; selected mastery Units carry execution. |
| `rogue_weapon_mastery` | `character-creation-runtime`; mastery property Units | Weapon Mastery grant container; selected mastery Units carry execution. |
| `cleric_divine_order` | `character-creation-runtime` | Character-creation suborder source facts; no promoted battle Unit profile consumes the choice directly. |
| `druid_primal_order` | `character-creation-runtime` | Character-creation suborder source facts; no promoted battle Unit profile consumes the choice directly. |
| `rogue_expertise` | `character-creation-runtime` | Skill Expertise choices; no promoted battle Unit profile consumes the choice directly. |
| `feat_ability_score_improvement` | `character-creation-runtime` | Ability Score mutation is character-creation/progression state, not promoted battle execution. |
| `druid_druidic` | exploration/language owner not promoted | Language, hidden-message, and prepared-spell source facts are authored; exploration/language execution is outside promoted battle profiles. |
| `rogue_thieves_cant` | exploration/language owner not promoted | Language source facts are authored; exploration/language execution is outside promoted battle profiles. |
| `orc_darkvision` | vision/sense owner not promoted | Sense grant is authored data with no promoted execution profile. |
| `wizard_arcane_recovery` | `character-sheet-runtime` rest/spell-slot recovery boundary | Spell Slot recovery outside battle is not a promoted Unit profile yet. |
| `warlock_eldritch_invocations` | `character-creation-runtime`; selected invocation option tasks | Invocation choice source facts are authored; individual invocation option execution belongs to narrower selected-option tasks. |
| `detect_evil_and_good` | exploration/detection owner not promoted | Detection, occlusion search semantics, and Hallow discovery are outside promoted battle profiles. |
| `detect_magic` | exploration/detection owner not promoted | Detection and Concentration search semantics are outside promoted battle profiles. |
| `detect_poison_and_disease` | exploration/detection owner not promoted | Detection, occlusion search, and poison/disease identification are outside promoted battle profiles. |
| `minor_illusion` | illusion/exploration owner not promoted | Sound/image illusion creation, physical-interaction reveal, faint rendering after Study, and recast expiry are outside promoted battle profiles. |

## Source Review

Local SRD 5.2.1 source check:

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md` lines 296-315 for Find
  Familiar's companion creation, form choice, type override, telepathic
  connection, touch-spell delivery, combat participation, disappearance,
  dismissal, and one-familiar replacement.
- `.references/srd-5.2.1/Classes/Warlock.md` lines 280-286 for Pact of the
  Chain's Find Familiar access, special forms, and attack exception.
- `.references/srd-5.2.1/Rules-Glossary.md` lines 53-61, 75-77, 102-112,
  138-140, 630-634, 698-702, 814-816, and 1024-1030 for Action, Ally, Attack
  action, Attack Roll, Bonus Action, Initiative, Magic Action, Reaction, and
  Telepathy.

`UBIQUITOUS_LANGUAGE.md` was checked for action lifecycle, Magic Action,
Reaction, Spell Definition, Spell Access, Spell Invocation, Spell Effect,
Creature, Monster, Stat Block, Creature Type, and Challenge Rating vocabulary.

## Lane Decision

Do not append another recursive-only continuation. The SRDINV84I1-I5 batch
closed the Find Familiar companion-runtime operational owner gap, and SRDINV86
closed the evidence-only drift. Remaining subset-supported rows are already
assigned to existing owners or explicitly outside promoted battle execution.

## /simplify Convergence

- Round 1: found the missing `find_familiar` deterministic
  admission/projection evidence marker. The runtime profile and tests existed,
  but the generated SRD inventory could not close the Wizard spell-list row
  until the manifest and in-file marker agreed.
- Round 2: rejected a new Find Familiar batch. Ordinary attacks are already
  rejected, Pact of the Chain attacks are supported through the Stat Block
  attack path, and generic command AI is not a distinct SRD battle-runtime
  owner for this lane.
