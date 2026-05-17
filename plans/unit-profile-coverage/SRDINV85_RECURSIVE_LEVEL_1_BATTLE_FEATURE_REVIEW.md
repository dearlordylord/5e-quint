# SRDINV85 Recursive Level-1 Battle Feature Review

Task 316 reviewed the completed SRDINV84A-I batch. The lane is not ready for
final closure: SRDINV84A-H closed eight installed Spell Definition runtime
gaps, and SRDINV84I split Find Familiar into concrete companion-runtime slices,
but the Wizard spell-list Find Familiar row still requires promoted runtime
owner evidence.

## Inventory State

Generated inventory metrics from
`plans/unit-profile-coverage/srd-unit-inventory.json` after closing the
Spare the Dying evidence drift and running
`pnpm unit-profile-coverage:check --write`:

- Total generated rows: 367.
- Level-1 rows: 156.
- Spell-list pressure rows for cantrips and level-1 spells: 211.
- Missing level-1 class containers: 0.
- Default level-1 battle readiness: 297/367 (80.9%).
- Accepted rows: 228.
- Accepted no-battle-effect rows: 69.
- Battle-runtime-required rows: 26.
- Partial-battle-runtime rows: 44.
- Level-1 rows by disposition: 144
  `catalog-installed-owner-evidence-present`, 12 `non-runtime`.
- Spell Unit pressure by disposition: 135
  `catalog-installed-owner-evidence-present`, 1
  `catalog-installed-owner-evidence-required`, 75
  `catalog-only/dead-for-now`.

The remaining acceptance gap for "all battle-related level-1 features,
including spells, can be used in battle" is therefore 70 rows: 26
`battle-runtime-required` and 44 `partial-battle-runtime` rows. The
checker-visible installed Spell Definition gap is now the one
`catalog-installed-owner-evidence-required` spell-list row below.

## SRDINV84 Batch Review

| Task | Result |
|---|---|
| SRDINV84A | Fire Bolt object targeting, object damage facts, cantrip scaling, and unattended flammable-object ignition now have battle-runtime evidence. |
| SRDINV84B | Sorcerous Burst damage-type choice, capped exploding d8s, object targeting, and cantrip scaling now have battle-runtime evidence. |
| SRDINV84C | Spare the Dying zero-Hit-Point non-dead target admission, Stable lifecycle, Magic action spend, and character-level range scaling are supported. SRDINV85 added the missing deterministic evidence row. |
| SRDINV84D | Hex curse lifecycle, chosen-ability Ability Check Disadvantage, attack-hit Necrotic rider, retargeting, and slot-scaled duration now have battle-runtime evidence. |
| SRDINV84E | Fog Cloud's caller-supplied fog-area occurrence, Heavily Obscured projection, radius scaling, Concentration cleanup, and strong-wind dispersal are subset-supported. |
| SRDINV84F | Hideous Laughter's save-gated Prone/Incapacitated lifecycle, end-turn and damage-triggered repeat saves, and Concentration cleanup now have battle-runtime evidence. |
| SRDINV84G | Sanctuary targeting interdiction, Wisdom-save outcomes, area-effect exclusion, and early-end cleanup now have battle-runtime evidence. |
| SRDINV84H | Shillelagh held Club/Quarterstaff gate, spellcasting ability attack/damage projection, damage die scaling, damage-type choice, replacement, and let-go cleanup now have battle-runtime evidence. |
| SRDINV84I | Find Familiar was correctly left unsupported and split into form catalog, lifecycle/replacement, turn/action, telepathy/touch delivery, and Pact of the Chain attack slices. |

## Remaining Installed Spell Row

| Unit | Rows | Owner | Remaining runtime reason |
|---|---:|---|---|
| `find_familiar` | 1 | future companion lifecycle boundary | Needs familiar creation, selected form/stat-block resolution, Celestial/Fey/Fiend type choice, one-familiar lifecycle and replacement, familiar Initiative and turns, telepathy, touch-spell delivery, dismissal, disappearance/reappearance, and Pact of the Chain's Reaction attack exception before the Wizard spell-list row can close. |

## Unsupported and Subset-Supported Row Accounting

The rows below are the remaining unsupported/profile-subset-supported
battle-adjacent Unit rows from `UNIT_REPORT.md` and the generated inventory.
"Owner" names the runtime or boundary that owns the supported subset or
explicitly owns the reason the row is outside promoted battle execution.

### Profile-Subset-Supported Rows

| Unit | Owner | Remaining gap or exclusion reason | Task impact |
|---|---|---|---|
| `bard_bardic_inspiration` | `battle-runtime` | Level-1 grant and failed-D20-Test spend are supported; later-level die-size scaling remains. | Not a level-1 blocker. |
| `monk_martial_arts` | `battle-runtime`; `character-battle-runtime` | Level-1 attack projection and Bonus Action Unarmed Strike are supported; later-level Martial Arts die scaling remains. | Not a level-1 blocker. |
| `ranger_favored_enemy` | `battle-runtime`; `character-battle-runtime` | Level-1 two-use no-slot Hunter's Mark casting is supported; later free-cast scaling is non-level-1, and Hunter's Mark finding Advantage remains SRDINV66 ability-check roll-mode work. | Not a level-1 blocker. |
| `chill_touch` | `battle-runtime` | Combatant-target spell attack damage, cantrip scaling, healing prevention, and readied release are supported; non-combatant target eligibility remains deferred to SRDINV34. | Excluded from this level-1 batch; older target-boundary task owns it. |
| `faerie_fire` | `battle-runtime` | Area save-gated creature outline, Invisible-benefit denial, object outlines, and object attack Advantage are supported; Dim Light emission remains SRDINV70A light work. | Excluded from this batch; light-emitter work owns it. |
| `feather_fall` | `battle-runtime` | Reaction trigger, up-to-five falling targets, mitigation effect, landing cleanup, and no-fall-damage outcome are supported; fall-distance/elevation/landing geometry remain SRDINV55 spatial work. | Excluded from this batch; spatial owner owns it. |
| `fog_cloud` | `battle-runtime`; table/spatial caller facts | Fog-area lifecycle and Heavily Obscured projection are supported; automatic area membership, line of sight, map illumination, pathfinding, and wind derivation remain caller/table owned. | Excluded from the next Find Familiar batch. |
| `grease` | `battle-runtime` | Ground hazard lifecycle, on-cast and recurring Dexterity saves, Prone application, and caller-supplied Difficult Terrain movement facts are supported; automatic area membership and pathfinding remain SRDINV66 spatial work. | Excluded from this batch; spatial owner owns it. |
| `hunters_mark` | `battle-runtime`; `character-battle-runtime` | Mark, Force damage rider, transfer after 0 HP, slot-scaled duration, and Concentration cleanup are supported; Perception/Survival finding Advantage remains SRDINV66 ability-check roll-mode work. | Excluded from this batch; ability-check owner owns it. |
| `jump` | `battle-runtime` | Cast, target admission, duration, per-turn use marker, Movement spend, legal landing facts, and caller-supplied Difficult Terrain landing outcome are supported; jump arc/path/collision/final-position derivation remains SRDINV55 spatial work. | Excluded from this batch; spatial owner owns it. |
| `light` | `battle-runtime` | Object-target cast, object admission, source-owned Bright/Dim Light emitter, duration cleanup, and recast replacement are supported; opaque-cover suppression, map illumination, obscured-area derivation, Darkvision-adjusted sight, and colored-light presentation remain outside the object-emitter boundary. | Leave deferred unless a later illumination/visibility owner is planned. |
| `protection_from_evil_and_good` | `battle-runtime` | Spell Slot spend, Concentration effect, scoped attacker Disadvantage, possession-attempt prevention, and Charmed/Frightened prevention are supported; already-applied repeat-save/possession saves and willing-touch target nuance remain SRDINV66 work. | Excluded from this batch; repeat-save/target owner owns it. |
| `produce_flame` | `battle-runtime` | Held flame state, later hurl action, creature-or-object attack, object damage facts, Fire damage, and cantrip scaling are supported; held-flame Bright/Dim Light interaction remains SRDINV70A light work. | Excluded from this batch; light-emitter work owns it. |
| `sleep` | `battle-runtime` | Target admission, save holes, Exhaustion-immunity automatic success, pending repeat save, Unconscious escalation, damage cleanup, and shake-awake action are supported; non-sleeper automatic success waits for an executable non-sleeper fact. | Excluded from this batch; SRDINV41 owns the remaining fact. |
| `thunderwave` | `battle-runtime` | Self-origin Cube save damage, slot scaling, caller-supplied creature push, unsecured-object push, and audible-boom evidence are supported; push geometry/pathfinding/final-position and broad object/sound propagation simulation remain SRDINV55 work. | Excluded from this batch; spatial/object owner owns it. |
| `charm_person` | `battle-runtime` | Humanoid target filter, save-gated Charmed condition, hostile-target save Advantage, duration, damage early end, and slot-scaled targets are supported; friendly disposition/social effects and target knowledge on spell end remain outside battle state. | Excluded from this batch; SRDINV41 owns social/knowledge gap. |

### Unsupported-Profile Rows With Explicit Non-Battle Owners

| Unit | Owner | Reason this is not claimed as battle support | Task impact |
|---|---|---|---|
| `fighter_fighting_style` | `character-creation-runtime`; selected Fighting Style feat Units | Choice/grant container; selected Fighting Style feat carries executable pressure. | No direct battle task here. |
| `fighter_weapon_mastery` | `character-creation-runtime`; mastery property Units | Weapon Mastery grant container; selected mastery property Units carry execution. | No direct battle task here. |
| `barbarian_weapon_mastery` | `character-creation-runtime`; mastery property Units | Weapon Mastery grant container; selected mastery property Units carry execution. | No direct battle task here. |
| `paladin_weapon_mastery` | `character-creation-runtime`; mastery property Units | Weapon Mastery grant container; selected mastery property Units carry execution. | No direct battle task here. |
| `ranger_weapon_mastery` | `character-creation-runtime`; mastery property Units | Weapon Mastery grant container; selected mastery property Units carry execution. | No direct battle task here. |
| `rogue_weapon_mastery` | `character-creation-runtime`; mastery property Units | Weapon Mastery grant container; selected mastery property Units carry execution. | No direct battle task here. |
| `cleric_divine_order` | `character-creation-runtime` | Class feature source facts are authored for character-creation choices; no promoted battle Unit profile consumes the suborder choice directly. | Excluded from battle queue. |
| `druid_primal_order` | `character-creation-runtime` | Class feature source facts are authored for character-creation choices; no promoted battle Unit profile consumes the suborder choice directly. | Excluded from battle queue. |
| `rogue_expertise` | `character-creation-runtime` | Expertise choices are character-creation skill facts; no promoted battle Unit profile consumes the choice directly. | Excluded from battle queue. |
| `feat_ability_score_improvement` | `character-creation-runtime` | Ability Score mutation is character-creation/progression state, not a promoted battle Unit profile. | Excluded from battle queue. |
| `druid_druidic` | exploration/language owner not promoted | Language, hidden-message, and prepared-spell source facts are authored; exploration/language execution is not a promoted battle Unit profile. | Excluded from battle queue. |
| `rogue_thieves_cant` | exploration/language owner not promoted | Language source facts are authored; exploration/language execution is not a promoted battle Unit profile. | Excluded from battle queue. |
| `orc_darkvision` | vision/sense owner not promoted | Sense grant is authored data with no promoted execution profile. | Excluded from battle queue. |
| `wizard_arcane_recovery` | `character-sheet-runtime` rest/spell-slot recovery boundary | Spell Slot recovery outside battle is not a promoted Unit profile yet. | Excluded from battle queue. |
| `warlock_eldritch_invocations` | `character-creation-runtime`; selected invocation option tasks | Invocation choice source facts are authored; individual invocation option execution belongs to narrower selected-option tasks. | Chain/Tome access is done; familiar lifecycle and selected Spell Definition execution remain separate. |
| `detect_evil_and_good` | exploration/detection owner not promoted | Detection, occlusion search semantics, and Hallow discovery are not promoted as battle Unit profiles. | Excluded from battle queue. |
| `detect_magic` | exploration/detection owner not promoted | Detection and Concentration search semantics are not promoted as a battle Unit profile. | Excluded from battle queue. |
| `detect_poison_and_disease` | exploration/detection owner not promoted | Detection, occlusion search, and poison/disease identification are not promoted as battle Unit profiles. | Excluded from battle queue. |
| `minor_illusion` | illusion/exploration owner not promoted | Sound/image illusion creation, physical-interaction reveal, faint rendering after Study, and recast expiry are outside promoted battle runtime owners. | Excluded from battle queue. |

## Source Review

Local SRD 5.2.1 source check:

- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md` lines 401-410 for
  Spare the Dying's 0-Hit-Point non-dead target and Stable result.
- `.references/srd-5.2.1/Rules-Glossary.md` lines 930-932 for Stable.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md` lines 296-315 for Find
  Familiar's companion creation, form, type override, telepathy, touch-spell
  delivery, combat participation, disappearance, dismissal, and replacement.
- `.references/srd-5.2.1/Classes/Warlock.md` lines 280-286 for Pact of the
  Chain's Find Familiar access, special forms, and attack exception.
- `.references/srd-5.2.1/Rules-Glossary.md` for Action, Attack action, Attack
  Roll, Bonus Action, Initiative, Magic action, Reaction, and Telepathy.

`UBIQUITOUS_LANGUAGE.md` was checked for Death Saving Throw, Stable, Action
lifecycles, Magic Action, Reaction, Spell Definition, Spell Access, Spell
Invocation, Spell Effect, Creature, Monster, Stat Block, Creature Type, and
Challenge Rating vocabulary.

## Appended Batch

SRDINV85 selects another concrete implementation batch rather than final
closure or cleanup. The next queue should implement the SRDINV84I companion
split in order:

- `SRDINV84I1`: promote Find Familiar's form catalog boundary.
- `SRDINV84I2`: promote Find Familiar lifecycle and replacement.
- `SRDINV84I3`: promote familiar turn and no-attack action gate.
- `SRDINV84I4`: promote telepathic connection and touch-spell delivery.
- `SRDINV84I5`: promote Pact of the Chain familiar Reaction attack.
- `SRDINV86`: recursive review after those slices land.

## reviewer loop Convergence

- Round 1: found the Spare the Dying evidence drift. The Unit claim and runtime
  tests existed, but `unit-evidence.jsonl` and the checker marker were missing,
  leaving two class spell-list rows incorrectly evidence-required.
- Round 2: rejected final closure because Find Familiar remains an installed
  Spell Definition with no companion-runtime owner evidence. Reusing Pact of
  the Chain Spell Access or the Surface inline placeholder would falsely claim
  familiar lifecycle support.
- Round 3: selected the SRDINV84I1-I5 order because form resolution must be
  typed before lifecycle, lifecycle must exist before familiar turns, and touch
  delivery/Pact attacks depend on present familiar identity and Reaction
  ownership. No further important split was found.
