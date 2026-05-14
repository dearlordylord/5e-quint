# SRDINV78 Recursive Level-1 Battle Feature Review

Task 288 reviewed the completed SRDINV58C, SRDINV72A/B, SRDINV73A/B,
SRDINV74A/C/D, SRDINV75A/B, SRDINV76A-F, and SRDINV77 batch. The lane is not
ready for final closure: level-1 character-creation ownership is closed, but
the generated spell-pressure denominator still has battle-runtime and Surface
gaps.

## Inventory State

Generated inventory metrics from
`plans/unit-profile-coverage/srd-unit-inventory.json` after
`pnpm unit-profile-coverage:check --write`:

- Total generated rows: 367.
- Level-1 rows: 156.
- Spell-list pressure rows for cantrips and level-1 spells: 211.
- Missing level-1 class containers: 0.
- Default level-1 battle readiness: 284/367 (77.4%).
- Accepted rows: 215.
- Accepted no-battle-effect rows: 69.
- Battle-runtime-required rows: 26.
- Partial-battle-runtime rows: 42.
- Surface-widening-required rows: 15.
- Level-1 rows by disposition: 144
  `catalog-installed-owner-evidence-present`, 12 `non-runtime`.
- Spell Unit pressure by disposition: 120
  `catalog-installed-owner-evidence-present`, 76 `catalog-only/dead-for-now`,
  15 `needs-surface-widening`.

The remaining acceptance gap for "all battle-related level-1 features,
including spells, can be used in battle" is therefore 83 rows: 26
battle-runtime-required, 42 partial-battle-runtime, and 15
surface-widening-required.

## Remaining Rows

The 15 `needs-surface-widening` rows collapse to eight Spell Definition
surfaces:

- `hideous_laughter`: Bard, Warlock, and Wizard list rows need multi-trigger
  repeat saves, damage-triggered Advantage, Prone self-end suppression, and
  slot-scaled additional targets.
- `spare_the_dying`: Cleric and Druid list rows need Stable zero-HP lifecycle
  application and character-level range scaling.
- `sanctuary`: Cleric list row needs targeting interdiction, choose-new-target
  or lose outcome, area exclusion, and early end on warded attack, spell, or
  damage.
- `shillelagh`: Druid list row needs held Club or Quarterstaff weapon override,
  spellcasting ability attacks and damage, level-scaled damage die,
  Force-or-normal damage choice, and early end on recast or let-go.
- `fog_cloud`: Druid, Ranger, Sorcerer, and Wizard list rows need slot-scaled
  area dimensions and strong-wind dispersal for a Heavily Obscured fog Sphere.
- `fire_bolt`: Sorcerer and Wizard list rows need an explicit object-target
  branch and object-ignition outcome. Table-supplied object facts remain
  required but are not a complete runtime boundary by themselves.
- `sorcerous_burst`: Sorcerer list row needs the exploding d8 loop capped by
  spellcasting ability modifier, cast-time damage type choice, object target
  branch, and cantrip damage scaling.
- `hex`: Warlock list row needs curse retargeting after the target drops to 0
  Hit Points, ability-choice Ability Check Disadvantage, attack-hit bonus
  damage, and slot-scaled Concentration duration.

### Unsupported and Subset-Supported Row Accounting

The rows below are the remaining unsupported/profile-subset-supported
battle-adjacent Unit rows from `UNIT_REPORT.md` that could otherwise be
mistaken for closed battle support. "Owner" names the runtime or boundary that
currently owns the supported subset or explicitly owns the reason the row is
outside promoted battle execution.

#### Profile-Subset-Supported Rows

| Unit | Owner | Remaining gap or exclusion reason | Task impact |
|---|---|---|---|
| `bard_bardic_inspiration` | `battle-runtime` | Level-1 grant and failed-D20-Test spend are supported; only later-level die-size scaling remains. | Not a level-1 blocker. |
| `monk_martial_arts` | `battle-runtime`; `character-battle-runtime` | Level-1 attack projection and Bonus Action Unarmed Strike are supported; only later-level Martial Arts die scaling remains. | Not a level-1 blocker. |
| `ranger_favored_enemy` | `battle-runtime`; `character-battle-runtime` | Level-1 two-use no-slot Hunter's Mark casting is supported; later free-cast scaling is non-level-1, and Hunter's Mark finding Advantage remains in SRDINV66 ability-check roll-mode work. | Not a level-1 blocker. |
| `chill_touch` | `battle-runtime` | Combatant-target spell attack damage, cantrip scaling, healing prevention, and readied release are supported; non-combatant target eligibility remains deferred to SRDINV34. | Excluded from this level-1 batch; older target-boundary task owns it. |
| `faerie_fire` | `battle-runtime` | Area save-gated creature outline, Invisible-benefit denial, object outlines, and object attack Advantage are supported; Dim Light emission remains SRDINV70A light work. | Excluded from this batch; light-emitter work owns it. |
| `feather_fall` | `battle-runtime` | Reaction trigger, up-to-five falling targets, mitigation effect, landing cleanup, and no-fall-damage outcome are supported; fall-distance/elevation/landing geometry remain SRDINV55 spatial work. | Excluded from this batch; spatial owner owns it. |
| `grease` | `battle-runtime` | Ground hazard lifecycle, on-cast and recurring Dexterity saves, Prone application, and caller-supplied Difficult Terrain movement facts are supported; automatic area membership and pathfinding remain SRDINV66 spatial work. | Excluded from this batch; spatial owner owns it. |
| `hunters_mark` | `battle-runtime`; `character-battle-runtime` | Mark, Force damage rider, transfer after 0 HP, slot-scaled duration, and Concentration cleanup are supported; Perception/Survival finding Advantage remains SRDINV66 ability-check roll-mode work. | Excluded from this batch; ability-check owner owns it. |
| `jump` | `battle-runtime` | Cast, target admission, duration, per-turn use marker, Movement spend, legal landing facts, and caller-supplied Difficult Terrain landing outcome are supported; jump arc/path/collision/final-position derivation remains SRDINV55 spatial work. | Excluded from this batch; spatial owner owns it. |
| `light` | `battle-runtime` | Object-target cast, size/worn-carried admission, source-owned Bright/Dim Light emitter, duration cleanup, and recast replacement are supported; opaque-cover suppression, map illumination, obscured-area derivation, Darkvision-adjusted sight, and colored-light presentation remain outside the object-emitter boundary. | Leave deferred unless a later illumination/visibility owner is planned. |
| `protection_from_evil_and_good` | `battle-runtime` | Spell Slot spend, Concentration effect, scoped attacker Disadvantage, possession-attempt prevention, and Charmed/Frightened prevention are supported; already-applied repeat-save/possession saves and willing-touch target nuance remain SRDINV66 work. | Excluded from this batch; repeat-save/target owner owns it. |
| `produce_flame` | `battle-runtime` | Held flame state, later hurl action, creature-or-object attack, object damage facts, Fire damage, and cantrip scaling are supported; held-flame Bright/Dim Light interaction remains SRDINV70A light work. | Excluded from this batch; light-emitter work owns it. |
| `starry_wisp` | `battle-runtime` | Creature and object attack damage, object damage disposition, Dim Light emitter, and combatant Invisible-benefit denial are supported; object-target Invisible-condition benefit denial still lacks a promoted object condition-benefit projection boundary. | SRDINV79. |
| `sleep` | `battle-runtime` | Target admission, save holes, Exhaustion-immunity automatic success, pending repeat save, Unconscious escalation, damage cleanup, and shake-awake action are supported; non-sleeper automatic success waits for an executable non-sleeper fact. | Excluded from this batch; SRDINV41 owns the remaining fact. |
| `thunderwave` | `battle-runtime` | Self-origin Cube save damage, slot scaling, caller-supplied creature push, unsecured-object push, and audible-boom evidence are supported; push geometry/pathfinding/final-position and broad object/sound propagation simulation remain SRDINV55 work. | Excluded from this batch; spatial/object owner owns it. |
| `charm_person` | `battle-runtime` | Humanoid target filter, save-gated Charmed condition, hostile-target save Advantage, duration, damage early end, and slot-scaled targets are supported; friendly disposition/social effects and target knowledge on spell end remain outside battle state. | Excluded from this batch; SRDINV41 owns social/knowledge gap. |

#### Unsupported-Profile Rows With Explicit Non-Battle Owners

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
| `orc_darkvision` | vision/sense owner not promoted | Sense grant is authored data with no promoted battle execution profile. | Excluded from battle queue. |
| `wizard_arcane_recovery` | `character-sheet-runtime` rest/spell-slot recovery boundary | Spell Slot recovery outside battle is not a promoted battle Unit profile. | Excluded from battle queue. |
| `warlock_eldritch_invocations` | `character-creation-runtime`; selected invocation option tasks | Invocation choice source facts are authored; individual invocation option execution belongs to narrower selected-option tasks. | SRDINV81/SRDINV82 handle Chain/Tome access; other selected options already split. |
| `detect_evil_and_good` | exploration/detection owner not promoted | Detection, occlusion search semantics, and Hallow discovery are not promoted as battle Unit profiles. | Excluded from battle queue. |
| `detect_magic` | exploration/detection owner not promoted | Detection and Concentration search semantics are not promoted as a battle Unit profile. | Excluded from battle queue. |
| `detect_poison_and_disease` | exploration/detection owner not promoted | Detection, occlusion search, and poison/disease identification are not promoted as battle Unit profiles. | Excluded from battle queue. |
| `minor_illusion` | illusion/exploration owner not promoted | Sound/image illusion creation, physical-interaction reveal, faint rendering after Study, and recast expiry are outside promoted battle runtime owners. | Excluded from battle queue. |

SRDINV75B's runtime work for Innate Sorcery spell DC and spell attack
projection is present in `packages/battle-runtime/src/index.test.ts`; the
matrix now records `sorcerer_innate_sorcery` as fully supported instead of
leaving a stale SRDINV75B deferred-mechanic row.

## Source Review

Local SRD 5.2.1 source check:

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md` for Fire Bolt, Fog Cloud,
  Hex, Hideous Laughter, and Find Familiar.
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md` for Sanctuary,
  Shillelagh, Sorcerous Burst, Spare the Dying, and Starry Wisp.
- `.references/srd-5.2.1/Classes/Warlock.md` for Pact of the Chain, Pact of
  the Tome, Pact Magic, and Warlock Spellcasting Focus.
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md` for Ritual casting,
  Material components, Spellcasting Focus substitution, and spell targets.
- `.references/srd-5.2.1/Rules-Glossary.md` for Object, Target, Invisible,
  Heavily Obscured, Prone, Stable, Ritual, and Spellcasting Focus.

`UBIQUITOUS_LANGUAGE.md` was checked for Spell Definition, Spell Access, Spell
Invocation, Spell Effect, Spell Slot, Pact Slot, Ritual, Spellcasting Focus,
Object, Target, Invisible, Prone, Stable, Attack Roll, Saving Throw, Ability
Check, Concentration, Bonus Action, Magic Action, and companion ownership
vocabulary.

## Appended Batch

SRDINV78 selects another concrete implementation batch rather than final
closure:

- `SRDINV79`: close the Starry Wisp object-target Invisible-benefit projection
  gap without adding object inventory or visibility state.
- `SRDINV80A` through `SRDINV80G`: widen the eight remaining Spell Definition
  surfaces behind the 15 `needs-surface-widening` rows.
- `SRDINV81`: promote Pact of the Chain's Find Familiar Spell Access boundary
  from the completed SRDINV76E research, without implementing generic companion
  lifecycle or the familiar Reaction attack.
- `SRDINV82`: promote Pact of the Tome's Book of Shadows Spell Access boundary
  from the completed SRDINV76F research, without claiming unsupported selected
  Spell Definitions.
- `SRDINV83`: recursive review after this batch lands.

## /simplify Convergence

- Round 1: rejected final closure because the generated default readiness
  metric is still 284/367 and Starry Wisp has a checker-visible
  object-target Invisible-benefit gap.
- Round 2: grouped the 15 Surface blockers by Spell Definition rather than by
  class list row, so shared spells such as Hideous Laughter and Fog Cloud have
  one source-shape task each.
- Round 3: kept Pact of the Chain and Pact of the Tome as narrow Spell Access
  follow-ups from their research notes; companion runtime, familiar attacks,
  component legality, and unsupported selected spell execution remain later
  boundaries. No further important planning split was found.
