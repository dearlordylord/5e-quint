# SRDINV83 Recursive Level-1 Battle Feature Review

Task 306 reviewed the completed SRDINV79, SRDINV80A-G, SRDINV81, and
SRDINV82 batch. The lane is not ready for final closure: SRDINV80A-G closed
the remaining Surface-widening blockers, SRDINV79 closed Starry Wisp's object
Invisible-benefit projection, and SRDINV81/SRDINV82 promoted narrow Warlock
Spell Access boundaries, but installed spell rows still need promoted
battle-runtime owner evidence before they can count as operationally supported.

## Inventory State

Generated inventory metrics from
`plans/unit-profile-coverage/srd-unit-inventory.json` after
`pnpm unit-profile-coverage:check --write`:

- Total generated rows: 367.
- Level-1 rows: 156.
- Spell-list pressure rows for cantrips and level-1 spells: 211.
- Missing level-1 class containers: 0.
- Default level-1 battle readiness: 286/367 (77.9%).
- Accepted rows: 217.
- Accepted no-battle-effect rows: 69.
- Battle-runtime-required rows: 41.
- Partial-battle-runtime rows: 40.
- Surface-widening-required rows: 0.
- Level-1 rows by disposition: 144
  `catalog-installed-owner-evidence-present`, 12 `non-runtime`.
- Spell Unit pressure by disposition: 120
  `catalog-installed-owner-evidence-present`, 16
  `catalog-installed-owner-evidence-required`, 75
  `catalog-only/dead-for-now`.

The remaining acceptance gap for "all battle-related level-1 features,
including spells, can be used in battle" is therefore 81 rows: 41
battle-runtime-required and 40 partial-battle-runtime rows. The checker-visible
installed Spell Definition gap is the 16
`catalog-installed-owner-evidence-required` spell-list rows below.

## Remaining Installed Spell Rows

The 16 owner-evidence-required rows collapse to nine Spell Definitions. These
are not catalog or Surface gaps; each needs promoted battle-runtime execution
and deterministic admission/projection evidence before the class spell-list row
can close.

| Unit | Rows | Owner | Remaining runtime reason |
|---|---:|---|---|
| `fire_bolt` | 2 | `battle-runtime` spell invocation/projection | Ranged spell attack already has creature support, but object targeting and unattended flammable-object ignition are not executed for this Spell Definition. |
| `sorcerous_burst` | 1 | `battle-runtime` spell invocation/projection | Needs cast-time damage type choice, exploding d8 loop capped by spellcasting ability modifier, object target branch, and cantrip damage scaling. |
| `spare_the_dying` | 2 | `battle-runtime` spell invocation/projection | Needs zero-Hit-Point not-dead target admission, Stable lifecycle application, and character-level range scaling. |
| `hex` | 1 | `battle-runtime` spell invocation/projection | Needs curse retargeting, chosen-ability Ability Check Disadvantage, attack-hit Necrotic damage, and slot-scaled Concentration duration. |
| `fog_cloud` | 4 | `battle-runtime`; table/spatial caller facts | Needs area-created Heavily Obscured projection, slot-scaled area geometry, and strong-wind dispersal lifecycle without runtime-owned map derivation. |
| `hideous_laughter` | 3 | `battle-runtime` spell invocation/projection | Needs multi-trigger repeat saves, damage-triggered repeat-save Advantage, Prone and Incapacitated lifecycle, Prone self-end suppression, and slot-scaled additional targets. |
| `sanctuary` | 1 | `battle-runtime` targeting/interdiction | Needs warded-target Wisdom-save targeting interdiction, choose-new-target-or-lose outcome, area-effect exclusion, and early-end lifecycle. |
| `shillelagh` | 1 | `battle-runtime`; caller-supplied held/wielded facts | Needs held Club or Quarterstaff admission, spellcasting ability attack and damage option, level-scaled damage die, Force-or-normal damage choice, and recast/let-go early end. |
| `find_familiar` | 1 | future companion lifecycle boundary | Needs familiar creation, selected form/stat-block resolution, Celestial/Fey/Fiend type choice, one-familiar lifecycle and replacement, familiar Initiative/turns, telepathy, touch-spell delivery, dismissal, and disappearance/reappearance. |

### Unsupported and Subset-Supported Row Accounting

The rows below are the remaining unsupported/profile-subset-supported
battle-adjacent Unit rows from `UNIT_REPORT.md` that could otherwise be
mistaken for closed battle support. "Owner" names the runtime or boundary that
owns the supported subset or explicitly owns the reason the row is outside
promoted battle execution.

#### Profile-Subset-Supported Rows

| Unit | Owner | Remaining gap or exclusion reason | Task impact |
|---|---|---|---|
| `bard_bardic_inspiration` | `battle-runtime` | Level-1 grant and failed-D20-Test spend are supported; later-level die-size scaling remains. | Not a level-1 blocker. |
| `monk_martial_arts` | `battle-runtime`; `character-battle-runtime` | Level-1 attack projection and Bonus Action Unarmed Strike are supported; later-level Martial Arts die scaling remains. | Not a level-1 blocker. |
| `ranger_favored_enemy` | `battle-runtime`; `character-battle-runtime` | Level-1 two-use no-slot Hunter's Mark casting is supported; later free-cast scaling is non-level-1, and Hunter's Mark finding Advantage remains SRDINV66 ability-check roll-mode work. | Not a level-1 blocker. |
| `chill_touch` | `battle-runtime` | Combatant-target spell attack damage, cantrip scaling, healing prevention, and readied release are supported; non-combatant target eligibility remains deferred to SRDINV34. | Excluded from this level-1 batch; older target-boundary task owns it. |
| `faerie_fire` | `battle-runtime` | Area save-gated creature outline, Invisible-benefit denial, object outlines, and object attack Advantage are supported; Dim Light emission remains SRDINV70A light work. | Excluded from this batch; light-emitter work owns it. |
| `feather_fall` | `battle-runtime` | Reaction trigger, up-to-five falling targets, mitigation effect, landing cleanup, and no-fall-damage outcome are supported; fall-distance/elevation/landing geometry remain SRDINV55 spatial work. | Excluded from this batch; spatial owner owns it. |
| `grease` | `battle-runtime` | Ground hazard lifecycle, on-cast and recurring Dexterity saves, Prone application, and caller-supplied Difficult Terrain movement facts are supported; automatic area membership and pathfinding remain SRDINV66 spatial work. | Excluded from this batch; spatial owner owns it. |
| `hunters_mark` | `battle-runtime`; `character-battle-runtime` | Mark, Force damage rider, transfer after 0 HP, slot-scaled duration, and Concentration cleanup are supported; Perception/Survival finding Advantage remains SRDINV66 ability-check roll-mode work. | Excluded from this batch; ability-check owner owns it. |
| `jump` | `battle-runtime` | Cast, target admission, duration, per-turn use marker, Movement spend, legal landing facts, and caller-supplied Difficult Terrain landing outcome are supported; jump arc/path/collision/final-position derivation remains SRDINV55 spatial work. | Excluded from this batch; spatial owner owns it. |
| `light` | `battle-runtime` | Object-target cast, size/worn-carried admission, source-owned Bright/Dim Light emitter, duration cleanup, and recast replacement are supported; opaque-cover suppression, map illumination, obscured-area derivation, Darkvision-adjusted sight, and colored-light presentation remain outside the object-emitter boundary. | Leave deferred unless a later illumination/visibility owner is planned. |
| `protection_from_evil_and_good` | `battle-runtime` | Spell Slot spend, Concentration effect, scoped attacker Disadvantage, possession-attempt prevention, and Charmed/Frightened prevention are supported; already-applied repeat-save/possession saves and willing-touch target nuance remain SRDINV66 work. | Excluded from this batch; repeat-save/target owner owns it. |
| `produce_flame` | `battle-runtime` | Held flame state, later hurl action, creature-or-object attack, object damage facts, Fire damage, and cantrip scaling are supported; held-flame Bright/Dim Light interaction remains SRDINV70A light work. | Excluded from this batch; light-emitter work owns it. |
| `sleep` | `battle-runtime` | Target admission, save holes, Exhaustion-immunity automatic success, pending repeat save, Unconscious escalation, damage cleanup, and shake-awake action are supported; non-sleeper automatic success waits for an executable non-sleeper fact. | Excluded from this batch; SRDINV41 owns the remaining fact. |
| `thunderwave` | `battle-runtime` | Self-origin Cube save damage, slot scaling, caller-supplied creature push, unsecured-object push, and audible-boom evidence are supported; push geometry/pathfinding/final-position and broad object/sound propagation simulation remain SRDINV55 work. | Excluded from this batch; spatial/object owner owns it. |
| `charm_person` | `battle-runtime` | Humanoid target filter, save-gated Charmed condition, hostile-target save Advantage, duration, damage early end, and slot-scaled targets are supported; friendly disposition/social effects and target knowledge on spell end remain outside battle state. | Excluded from this batch; SRDINV41 owns social/knowledge gap. |

`starry_wisp` no longer appears in this table: SRDINV79 closed the remaining
object-target Invisible-benefit projection for the installed Spell Definition.

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
| `orc_darkvision` | vision/sense owner not promoted | Sense grant is authored data with no promoted execution profile. | Excluded from battle queue. |
| `wizard_arcane_recovery` | `character-sheet-runtime` rest/spell-slot recovery boundary | Spell Slot recovery outside battle is not a promoted Unit profile yet. | Excluded from battle queue. |
| `warlock_eldritch_invocations` | `character-creation-runtime`; selected invocation option tasks | Invocation choice source facts are authored; individual invocation option execution belongs to narrower selected-option tasks. | Chain/Tome access is done; familiar lifecycle and selected Spell Definition execution remain separate. |
| `detect_evil_and_good` | exploration/detection owner not promoted | Detection, occlusion search semantics, and Hallow discovery are not promoted as battle Unit profiles. | Excluded from battle queue. |
| `detect_magic` | exploration/detection owner not promoted | Detection and Concentration search semantics are not promoted as a battle Unit profile. | Excluded from battle queue. |
| `detect_poison_and_disease` | exploration/detection owner not promoted | Detection, occlusion search, and poison/disease identification are not promoted as battle Unit profiles. | Excluded from battle queue. |
| `minor_illusion` | illusion/exploration owner not promoted | Sound/image illusion creation, physical-interaction reveal, faint rendering after Study, and recast expiry are outside promoted battle runtime owners. | Excluded from battle queue. |

## Source Review

Local SRD 5.2.1 source check:

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md` for Fire Bolt, Fog Cloud,
  Hex, Hideous Laughter, and Find Familiar.
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md` for Sanctuary,
  Shillelagh, Sorcerous Burst, and Spare the Dying.
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md` for spell targeting,
  Ritual casting, Material components, and Spellcasting Focus rules that affect
  later Find Familiar/Book of Shadows boundaries.
- `.references/srd-5.2.1/Rules-Glossary.md` for Ability Check, Area of Effect,
  Attack Roll, Bonus Action, Concentration, Heavily Obscured, Incapacitated,
  Invisible, Object, Prone, Reaction, Ritual, Saving Throw, Spellcasting Focus,
  Stable, Target, and Unconscious.

`UBIQUITOUS_LANGUAGE.md` was checked for Spell Definition, Spell Access, Spell
Invocation, Spell Effect, Spell Slot, Pact Slot, Ritual, Spellcasting Focus,
Object, Target, Prone, Stable, Attack Roll, Saving Throw, Ability Check,
Concentration, Bonus Action, Magic Action, and companion ownership vocabulary.

## Appended Batch

SRDINV83 selects another concrete implementation batch rather than final
closure:

- `SRDINV84A`: promote Fire Bolt's object-target and ignition runtime.
- `SRDINV84B`: promote Sorcerous Burst's chosen damage type, exploding d8 cap,
  object target branch, and cantrip scaling.
- `SRDINV84C`: promote Spare the Dying's Stable lifecycle.
- `SRDINV84D`: promote Hex's curse, attack-hit damage rider, ability-check
  Disadvantage, retargeting, and slot-scaled duration.
- `SRDINV84E`: promote Fog Cloud's caller-supplied fog-area obscurement and
  strong-wind dispersal lifecycle.
- `SRDINV84F`: promote Hideous Laughter's multi-trigger repeat-save lifecycle.
- `SRDINV84G`: promote Sanctuary's targeting interdiction and early-end
  lifecycle.
- `SRDINV84H`: promote Shillelagh's held-weapon override.
- `SRDINV84I`: research and split the Find Familiar companion lifecycle
  boundary; do not smuggle companion state into generic spell access.
- `SRDINV85`: recursive review after this batch lands.

## /simplify Convergence

- Round 1: rejected final closure because the generated default readiness
  metric is still 286/367 and 16 installed spell-list rows still require
  battle-runtime owner evidence.
- Round 2: grouped the 16 rows by the nine Spell Definitions that actually own
  the runtime work, so shared spells such as Fog Cloud and Hideous Laughter get
  one implementation task each instead of one task per class list row.
- Round 3: kept Find Familiar as a research/split task because the remaining
  gap is companion lifecycle, Initiative, turn, and touch-delivery state rather
  than a narrow spell invocation procedure. No further important planning split
  was found.
