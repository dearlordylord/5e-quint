# Authored Content Dispatch Cleanup Plan

## Context

The repository rule is not "SRD ids are allowed in runtime." SRD content is
publishable in this repo, but concrete authored Unit, Spell, Stat Block, feature
names, slugs, prose labels, and source-section strings are not runtime
abstractions. Production runtime semantics must come from Surface shape,
support-profile readers, typed procedure facts, and explicit runtime state.

Concrete authored ids may appear only at explicit boundaries:

- Surface catalog/schema/content boundaries.
- Tests and fixtures.
- Composition or user-selection boundaries that retain identity selected
  elsewhere.
- Narrow documented support-profile boundaries.
- Data references whose domain is "reference another authored record" when the
  source rule actually names that other record.

PHB+ or private non-SRD content is stricter: publishable code and tests must not
copy real private ids, names, prose, or source references. Use visibly synthetic
records for non-SRD examples.

## Current Status

Commits already landed in this worktree:

- `68212a31` removes spell-id-derived `beam`/`ray` cosmetic labels.
- `c9340e37` removes the reported authored-id dispatch from profile parsers,
  Warding Bond `bondId`, character feature gates, and Thaumaturgy hole protocol
  ids.
- `8a8ad32f` removes Thaumaturgy's remaining name/provenance gate.

`pnpm check:authored-id-dispatch` now passes. The remaining work is the broader
authored-name/provenance dispatch cleanup indexed below.

## Research Method

Completed scans on May 19, 2026:

```bash
pnpm check:authored-id-dispatch
rg -n "\b(?:spell|unit)\.name\s*(?:===|!==)|\b(?:spell|unit)\.provenance\.section\s*(?:===|!==)|\binvocation\.(?:spell|unit)\.name\s*(?:===|!==)|\binvocation\.(?:spell|unit)\.provenance\.section\s*(?:===|!==)|\binput\.(?:spell|unit)\.name\s*(?:===|!==)|\binput\.(?:spell|unit)\.provenance\.section\s*(?:===|!==)" packages -g '*.ts' | rg -v "\.test\.|test-support|surface/src|surface/content|classic-non-srd"
rg -n "(?:SPELL_NAME|PROVENANCE_SECTION|provenanceSection|name:)" packages/battle-runtime/src packages/character-creation-runtime/src packages/character-sheet-runtime/src -g '*.ts' | rg -v "\.test\.|test-support|classic-non-srd"
```

Scope notes:

- Tests, fixtures, Surface catalog/schema/content, and classic non-SRD fixtures
  are excluded by rule.
- No production `unit.name` dispatch sites remain in the filtered scan.
- The remaining direct production sites are all `SpellRecord.name` and
  `SpellRecord.provenance.section` support gates, except the spell-access
  boundary exceptions below.

## Valid Exceptions

These are not fix targets unless the boundary policy changes.

| Site | Why allowed |
| --- | --- |
| `packages/battle-runtime/src/character-battle-resources.ts:775` | Armor of Shadows explicitly references the Mage Armor spell. This file is the battle-runtime spell-access boundary and is already allowlisted for authored spell access identity. |
| `packages/battle-runtime/src/character-battle-resources.ts:786` | Pact of the Chain explicitly references Find Familiar. Same spell-access boundary exception. |
| `packages/battle-runtime/src/battle-reducer/domain-constants.ts` `SHIELD_MAGIC_MISSILE_SPELL_ID` | Shield explicitly references Magic Missile. This is the cross-record reference exception documented in code. |

If the name/provenance guard is automated, it should allow these narrowly by
file plus exact helper/constant, not by broad package path.

## Completed Authored-ID Violations

These were the original guard-backed violations and are fixed by the commits
listed above.

| Site | Original violation | Fix class | Status |
| --- | --- | --- | --- |
| `packages/battle-runtime/src/battle-reducer/spells-profile-shared.ts` | `spellAttackSequencePartName` mapped concrete Spell ids to `beam`/`ray` display words. | Cosmetic implementation mistake | Done |
| `packages/battle-runtime/src/battle-reducer/spells-profiles-attack-damage.ts` | Scorching Ray support gated on `scorching_ray`. | Support-profile parser mistake | Done |
| `packages/battle-runtime/src/battle-reducer/spells-profiles-attack-damage.ts` | Eldritch Blast support gated on `eldritch_blast`. | Support-profile parser mistake | Done |
| `packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts` | Warding Bond support gated on `warding_bond`. | Support-profile parser mistake | Done |
| `packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts` | Warding Bond support gated on authored `bondId` value `warding_bond_mystic_connection`. | Surface language mistake | Done |
| `packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts` | Blur support gated on `blur`. | Support-profile parser mistake | Done |
| `packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts` | Mirror Image support gated on `mirror_image`. | Support-profile parser mistake with taxonomy smell | Done |
| `packages/battle-runtime/src/battle-reducer/spells-resolve-fill-set.ts` | Thaumaturgy runtime hole protocol embedded `thaumaturgy` in a hard-coded id. | Runtime protocol naming mistake | Done |
| `packages/character-creation-runtime/src/druid-wild-shape.ts` | Wild Shape feature parser gated on `druid_wild_shape` outside the documented support boundary. | Boundary placement or parser mistake | Done |
| `packages/character-sheet-runtime/src/index.ts` | Magical Cunning parser gated on `warlock_magical_cunning`. | Support-profile parser mistake | Done |

## Remaining Violations: Full Index

All rows below are production support or execution gates that still use authored
spell names and/or source-section strings as dispatch facts. The fix direction is
the same throughout: replace the name/provenance clause with shape parsing and
typed projection facts. If a row has multiple line sites, fix them together so
one profile cannot be half shape-based and half name-based.

The profile tables list fix units. Within a table, `.../file.ts` abbreviates the
same `packages/battle-runtime/src/battle-reducer/file.ts` path used by the
nearest fully qualified row. The raw scan appendix below lists every exact
production comparison line from the filtered scan.

### Save-Gate Profiles

| Item | Sites | Fix direction |
| --- | --- | --- |
| Command | `packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts:435` | Parse action level-1 Wisdom save, 60 ft point range, target-list scaling, Command options/effects. |
| Grease | `.../spells-profiles-save-gates.ts:535` | Parse 10-foot cube ground hazard, Dex save, prone on fail, 1-minute duration. |
| Sleep | `.../spells-profiles-save-gates.ts:601` | Parse concentration 1 minute, 5-foot sphere target admission, Incapacitated/Unconscious repeat-save shape and damage early end. |
| Hideous Laughter | `.../spells-profiles-save-gates.ts:670` | Parse Wisdom save, concentration, target-list scaling, Prone/Incapacitated plus end-turn and damage repeat saves. |
| Faerie Fire | `.../spells-profiles-save-gates.ts:764`, `packages/battle-runtime/src/battle-reducer/spells-active-effects.ts:186` | Parse Dex save cube, concentration, outline active effect, Invisible benefit suppression, and attack-advantage projection. |
| Animal Friendship | `.../spells-profiles-save-gates.ts:834`, `.../spells-profiles-save-gates.ts:1068` | Replace helper input `name`/`provenanceSection` with a creature-type charm profile parameterized only by duration and target creature type. |
| Charm Person | `.../spells-profiles-save-gates.ts:847`, `.../spells-profiles-save-gates.ts:1068` | Same helper as Animal Friendship; hostile-target advantage remains a shape fact, not an authored-name branch. |
| Blindness/Deafness | `.../spells-profiles-save-gates.ts:177`, `.../spells-profiles-save-gates.ts:879` | Rename constants away from authored spell identity and parse condition-choice save shape: Con save, upcast target count, Blinded/Deafened choices, timed repeat save. |
| Hold Person | `.../spells-profiles-save-gates.ts:186`, `.../spells-profiles-save-gates.ts:974` | Rename constants away from authored spell identity and parse humanoid-only Wis save, concentration, Paralyzed, upcast targets, repeat save. |
| Fireball | `.../spells-profiles-save-gates.ts:161`, `.../spells-profiles-save-gates.ts:1412`, `.../spells-profiles-save-gates.ts:1899` | Replace authored identity with point-origin sphere fire-damage shape plus object-ignition post-save area effect. Keep all radius/range/damage scaling checks. |
| Shatter | `.../spells-profiles-save-gates.ts:169`, `.../spells-profiles-save-gates.ts:1436`, `.../spells-profiles-save-gates.ts:1956` | Replace authored identity with point-origin sphere thunder-damage shape plus construct disadvantage and object-damage post-save effect. |
| Starry Wisp | `.../spells-profiles-save-gates.ts:1631` | Parse cantrip ranged spell attack dim-light/invisible-benefit denial rider shape. |
| Chill Touch | `.../spells-profiles-save-gates.ts:1645` | Parse cantrip melee spell attack hit-point-regain prevention rider shape. |
| Ray of Sickness | `.../spells-profiles-save-gates.ts:1659` | Parse level-1 ranged spell attack Poison damage plus one-round Poisoned rider shape. |
| Shocking Grasp | `.../spells-profiles-save-gates.ts:1675` | Parse cantrip melee spell attack opportunity-attack prevention rider shape. |
| Guiding Bolt | `.../spells-profiles-save-gates.ts:1689` | Parse level-1 ranged spell attack next-attack advantage rider shape. |
| Dissonant Whispers | `.../spells-profiles-save-gates.ts:1810` | Parse Wisdom save, Psychic damage, half on success, forced reaction movement away from caster. |
| Thunderwave | `.../spells-profiles-save-gates.ts:1994`, `.../spells-profiles-save-gates.ts:2053` | Parse self-origin cube thunder save, creature push, unsecured object push, and audible boom post-save area effect. |
| Vicious Mockery | `.../spells-profiles-save-gates.ts:2090` | Parse cantrip Wisdom save, Psychic damage, next attack Disadvantage rider. |

### Support, Buff, Smite, And Marked-Damage Profiles

| Item | Sites | Fix direction |
| --- | --- | --- |
| Feather Fall | `packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts:276`, `packages/battle-runtime/src/battle-reducer/reaction-triggered-spells.ts:307` | Parse falling reaction trigger, up-to-5 falling-creature target selection, timed descent-rate mitigation. Reaction matching should rely on typed procedure/trigger facts. |
| Jump | `.../spells-profiles-support.ts:525` | Parse willing creature touch target, one-minute timed effect, once-per-turn jump replacement facts. |
| Misty Step | `.../spells-profiles-support.ts:588` | Parse bonus-action self teleport, 30-foot unoccupied visible destination. |
| Expeditious Retreat | `.../spells-profiles-support.ts:653` | Parse self concentration ongoing effect, immediate Dash, bonus-action Dash operation. |
| Protection from Poison | `.../spells-profiles-support.ts:1048` | Parse touch target, Poisoned removal, Poison save advantage, Poison resistance. |
| Protection from Evil and Good | `.../spells-profiles-support.ts:1144` | Parse touch target, concentration, supported creature type protection, prevented conditions. |
| Heroism | `.../spells-profiles-support.ts:1274` | Parse touch concentration target, Frightened immunity, spellcasting-mod turn-start Temporary Hit Points. |
| Divine Favor | `.../spells-profiles-support.ts:1357` | Parse self timed/bonus-action weapon damage rider and Radiant damage amount. |
| Shining Smite | `.../spells-profiles-support.ts:1660` | Parse after-hit bonus-action smite, Radiant damage, illumination, attack advantage, Invisible suppression. |
| Searing Smite | `.../spells-profiles-support.ts:1747` | Parse after-hit timed smite, immediate Fire damage, turn-start Fire damage, Con save to end. |
| Ensnaring Strike | `.../spells-profiles-support.ts:1827` | Parse after-hit weapon trigger, Strength save, Restrained, turn-start Piercing damage. |
| Divine Smite | `.../spells-profiles-support.ts:1879` | Parse after-hit trigger, instantaneous Radiant damage, undead/fiend bonus if represented structurally. |
| Hunter's Mark | `.../spells-profiles-support.ts:2069` | Split marked-damage rider by operation shape: Force damage plus Wisdom Perception/Survival finding advantage and same-turn retarget timing. |
| Hex | `.../spells-profiles-support.ts:2087` | Split marked-damage rider by operation shape: Necrotic damage plus chosen ability-check Disadvantage and later-turn retarget timing. |
| Resistance | `.../spells-profiles-support.ts:2853` | Parse touch concentration damage-reduction profile with damage-type choice and `1d4` reduction amount. |

### General Spell Profiles

| Item | Sites | Fix direction |
| --- | --- | --- |
| Dancing Lights | `packages/battle-runtime/src/battle-reducer/spells-profiles.ts:566` | Parse cantrip concentration, light emission, bonus-action reposition operation, attachment/count shape. |
| Spare the Dying | `.../spells-profiles.ts:790` | Parse cantrip Magic Action, zero-HP-not-dead creature target, make-stable effect, range scaling. |
| Fog Cloud | `.../spells-profiles.ts:870` | Parse concentration point sphere, heavy obscurity, wind dispersal, slot-scaled radius. |
| Flaming Sphere | `.../spells-profiles.ts:1008` | Parse concentration sphere area, end-turn/ram save effects, bonus-action reposition, object ignition, light emission. |
| Light | `.../spells-profiles.ts:1172` | Parse touch object light, timed duration, recast early end. |
| Continual Flame | `.../spells-profiles.ts:1201` | Parse permanent touched-object light with consumed costly Material component and dispel end condition. |
| Produce Flame | `.../spells-profiles.ts:1234` | Parse self ongoing light, timed duration, recast early end, and hurl action if present. |
| Hellish Rebuke | `.../spells-profiles.ts:1317`, `packages/battle-runtime/src/battle-reducer/reaction-triggered-spells.ts:263` | Parse damage-triggered reaction, visible damaging creature target, Dex save, Fire damage, half on success. Reaction matching should use typed procedure/trigger facts. |
| Counterspell | `.../spells-profiles.ts:1390`, `packages/battle-runtime/src/battle-reducer/counterspell-reaction-discovery.ts:85`, `packages/battle-runtime/src/battle-reducer/reaction-triggered-spells.ts:226` | Parse spell-cast reaction trigger, component intersection, range/visibility facts, interrupted trigger, counterspell procedure. |

### Attack-Damage And Weapon-Hosted Profiles

| Item | Sites | Fix direction |
| --- | --- | --- |
| Shillelagh | `packages/battle-runtime/src/battle-reducer/spells-profiles-attack-damage.ts:379` | Replace `isCanonicalSrdShillelaghSpellDefinition` with shape parser over ongoing weapon attack override facts. |
| True Strike | `.../spells-profiles-attack-damage.ts:387` | Replace `isCanonicalSrdTrueStrike` with hosted-weapon attack shape parser. |
| Chromatic Orb | `.../spells-profiles-attack-damage.ts:626` | Replace canonical name/provenance helper with chained spell-attack shape: damage choices, same attack kind, leap continuation limits. |
| Ice Knife | `.../spells-profiles-attack-damage.ts:690` | Parse attack-burst-save shape: single target attack, Cold/Piercing hit damage as represented, primary-target-origin emanation burst save. |
| Sorcerous Burst | `.../spells-profiles-attack-damage.ts:939` | Replace canonical helper with damage-type-choice exploding cantrip shape. |
| Fire Bolt object ignition | `.../spells-profiles-attack-damage.ts:1179` | Parse ranged cantrip Fire damage plus flammable not-worn/carried object ignition rider. |

### Other Focused Profiles

| Item | Sites | Fix direction |
| --- | --- | --- |
| Invisibility | `packages/battle-runtime/src/battle-reducer/spells-profiles-direct-condition.ts:64` | Parse concentration touch target, Invisible condition, upcast target count. |
| Sanctuary | `packages/battle-runtime/src/battle-reducer/sanctuary-targeting-interdiction.ts:63` | Parse ongoing bonus-action protection effect, targeting interdiction, Wisdom save and end conditions. |

## Raw Filtered Scan Hit Index

This is the full direct `name` / `provenance.section` production comparison
index from the filtered scan. The two `character-battle-resources.ts` pairs are
valid exceptions listed above; every `battle-reducer` pair is a cleanup target.

```text
packages/battle-runtime/src/character-battle-resources.ts:780: spell.name === ARMOR_OF_SHADOWS_SPELL_NAME
packages/battle-runtime/src/character-battle-resources.ts:782: spell.provenance.section === ARMOR_OF_SHADOWS_SPELL_PROVENANCE_SECTION
packages/battle-runtime/src/character-battle-resources.ts:793: spell.name === FIND_FAMILIAR_SPELL_NAME
packages/battle-runtime/src/character-battle-resources.ts:795: spell.provenance.section === FIND_FAMILIAR_SPELL_PROVENANCE_SECTION

packages/battle-runtime/src/battle-reducer/spells-profiles.ts:566: spell.name !== "Dancing Lights"
packages/battle-runtime/src/battle-reducer/spells-profiles.ts:568: spell.provenance.section !== "Spells/Descriptions-A-D#Dancing Lights"
packages/battle-runtime/src/battle-reducer/spells-profiles.ts:790: spell.name !== "Spare the Dying"
packages/battle-runtime/src/battle-reducer/spells-profiles.ts:792: spell.provenance.section !== "Spells/Descriptions-S-Z#Spare the Dying"
packages/battle-runtime/src/battle-reducer/spells-profiles.ts:870: spell.name !== "Fog Cloud"
packages/battle-runtime/src/battle-reducer/spells-profiles.ts:872: spell.provenance.section !== "Spells/Descriptions-E-L#Fog Cloud"
packages/battle-runtime/src/battle-reducer/spells-profiles.ts:1008: spell.name !== "Flaming Sphere"
packages/battle-runtime/src/battle-reducer/spells-profiles.ts:1010: spell.provenance.section !== "Spells/Descriptions-E-L#Flaming Sphere"
packages/battle-runtime/src/battle-reducer/spells-profiles.ts:1172: spell.name === "Light"
packages/battle-runtime/src/battle-reducer/spells-profiles.ts:1174: spell.provenance.section === "Spells/Descriptions-E-L#Light"
packages/battle-runtime/src/battle-reducer/spells-profiles.ts:1201: spell.name === "Continual Flame"
packages/battle-runtime/src/battle-reducer/spells-profiles.ts:1203: spell.provenance.section === "Spells/Descriptions-A-D#Continual Flame"
packages/battle-runtime/src/battle-reducer/spells-profiles.ts:1234: spell.name === "Produce Flame"
packages/battle-runtime/src/battle-reducer/spells-profiles.ts:1236: spell.provenance.section === "Spells/Descriptions-M-P#Produce Flame"
packages/battle-runtime/src/battle-reducer/spells-profiles.ts:1317: spell.name !== "Hellish Rebuke"
packages/battle-runtime/src/battle-reducer/spells-profiles.ts:1319: spell.provenance.section !== "Spells/Descriptions-E-L#Hellish Rebuke"
packages/battle-runtime/src/battle-reducer/spells-profiles.ts:1390: spell.name !== "Counterspell"
packages/battle-runtime/src/battle-reducer/spells-profiles.ts:1392: spell.provenance.section !== "Spells/Descriptions-A-D#Counterspell"

packages/battle-runtime/src/battle-reducer/spells-profiles-attack-damage.ts:379: spell.name === "Shillelagh"
packages/battle-runtime/src/battle-reducer/spells-profiles-attack-damage.ts:381: spell.provenance.section === "Spells/Descriptions-S-Z#Shillelagh"
packages/battle-runtime/src/battle-reducer/spells-profiles-attack-damage.ts:387: spell.name === "True Strike"
packages/battle-runtime/src/battle-reducer/spells-profiles-attack-damage.ts:389: spell.provenance.section === "Spells/Descriptions-S-Z#True Strike"
packages/battle-runtime/src/battle-reducer/spells-profiles-attack-damage.ts:626: spell.name === "Chromatic Orb"
packages/battle-runtime/src/battle-reducer/spells-profiles-attack-damage.ts:628: spell.provenance.section === "Spells/Descriptions-A-D#Chromatic Orb"
packages/battle-runtime/src/battle-reducer/spells-profiles-attack-damage.ts:690: spell.name !== "Ice Knife"
packages/battle-runtime/src/battle-reducer/spells-profiles-attack-damage.ts:692: spell.provenance.section !== "Spells/Descriptions-E-L#Ice Knife"
packages/battle-runtime/src/battle-reducer/spells-profiles-attack-damage.ts:939: spell.name === "Sorcerous Burst"
packages/battle-runtime/src/battle-reducer/spells-profiles-attack-damage.ts:941: spell.provenance.section === "Spells/Descriptions-S-Z#Sorcerous Burst"
packages/battle-runtime/src/battle-reducer/spells-profiles-attack-damage.ts:1179: input.spell.name === "Fire Bolt"
packages/battle-runtime/src/battle-reducer/spells-profiles-attack-damage.ts:1181: input.spell.provenance.section === "Spells/Descriptions-E-L#Fire Bolt"

packages/battle-runtime/src/battle-reducer/sanctuary-targeting-interdiction.ts:63: spell.name !== "Sanctuary"
packages/battle-runtime/src/battle-reducer/sanctuary-targeting-interdiction.ts:65: spell.provenance.section !== "Spells/Descriptions-S-Z#Sanctuary"

packages/battle-runtime/src/battle-reducer/reaction-triggered-spells.ts:226: invocation.spell.name !== "Counterspell"
packages/battle-runtime/src/battle-reducer/reaction-triggered-spells.ts:228: invocation.spell.provenance.section !== "Spells/Descriptions-A-D#Counterspell"
packages/battle-runtime/src/battle-reducer/reaction-triggered-spells.ts:263: invocation.spell.name === "Hellish Rebuke"
packages/battle-runtime/src/battle-reducer/reaction-triggered-spells.ts:265: invocation.spell.provenance.section === "Spells/Descriptions-E-L#Hellish Rebuke"
packages/battle-runtime/src/battle-reducer/reaction-triggered-spells.ts:307: invocation.spell.name === "Feather Fall"
packages/battle-runtime/src/battle-reducer/reaction-triggered-spells.ts:309: invocation.spell.provenance.section === "Spells/Descriptions-E-L#Feather Fall"

packages/battle-runtime/src/battle-reducer/spells-profiles-direct-condition.ts:64: spell.name !== "Invisibility"
packages/battle-runtime/src/battle-reducer/spells-profiles-direct-condition.ts:66: spell.provenance.section !== "Spells/Descriptions-E-L#Invisibility"

packages/battle-runtime/src/battle-reducer/counterspell-reaction-discovery.ts:85: invocation.spell.name === "Counterspell"
packages/battle-runtime/src/battle-reducer/counterspell-reaction-discovery.ts:87: invocation.spell.provenance.section === "Spells/Descriptions-A-D#Counterspell"

packages/battle-runtime/src/battle-reducer/spells-active-effects.ts:186: invocation.spell.name === "Faerie Fire"
packages/battle-runtime/src/battle-reducer/spells-active-effects.ts:188: invocation.spell.provenance.section === "Spells/Descriptions-E-L#Faerie Fire"

packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts:435: spell.name !== "Command"
packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts:437: spell.provenance.section !== "Spells/Descriptions-A-D#Command"
packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts:535: spell.name !== "Grease"
packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts:537: spell.provenance.section !== "Spells/Descriptions-E-L#Grease"
packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts:601: spell.name !== "Sleep"
packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts:603: spell.provenance.section !== "Spells/Descriptions-S-Z#Sleep"
packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts:670: spell.name !== "Hideous Laughter"
packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts:672: spell.provenance.section !== "Spells/Descriptions-E-L#Hideous Laughter"
packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts:764: spell.name !== "Faerie Fire"
packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts:766: spell.provenance.section !== "Spells/Descriptions-E-L#Faerie Fire"
packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts:879: spell.name !== BLINDNESS_DEAFNESS_SPELL_NAME
packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts:881: spell.provenance.section !== BLINDNESS_DEAFNESS_PROVENANCE_SECTION
packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts:974: spell.name !== HOLD_PERSON_SPELL_NAME
packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts:976: spell.provenance.section !== HOLD_PERSON_PROVENANCE_SECTION
packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts:1068: spell.name !== input.name
packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts:1070: spell.provenance.section !== input.provenanceSection
packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts:1412: spell.name === FIREBALL_SPELL_NAME
packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts:1414: spell.provenance.section === FIREBALL_PROVENANCE_SECTION
packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts:1436: spell.name === SHATTER_SPELL_NAME
packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts:1438: spell.provenance.section === SHATTER_PROVENANCE_SECTION
packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts:1631: spell.name === "Starry Wisp"
packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts:1633: spell.provenance.section === "Spells/Descriptions-S-Z#Starry Wisp"
packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts:1645: spell.name === "Chill Touch"
packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts:1647: spell.provenance.section === "Spells/Descriptions-A-D#Chill Touch"
packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts:1659: spell.name === "Ray of Sickness"
packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts:1661: spell.provenance.section === "Spells/Descriptions-Q-R#Ray of Sickness"
packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts:1675: spell.name === "Shocking Grasp"
packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts:1677: spell.provenance.section === "Spells/Descriptions-S-Z#Shocking Grasp"
packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts:1689: spell.name === "Guiding Bolt"
packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts:1691: spell.provenance.section === "Spells/Descriptions-E-L#Guiding Bolt"
packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts:1810: spell.name === "Dissonant Whispers"
packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts:1812: spell.provenance.section === "Spells/Descriptions-A-D#Dissonant Whispers"
packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts:1899: spell.name !== FIREBALL_SPELL_NAME
packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts:1901: spell.provenance.section !== FIREBALL_PROVENANCE_SECTION
packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts:1956: spell.name === SHATTER_SPELL_NAME
packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts:1958: spell.provenance.section === SHATTER_PROVENANCE_SECTION
packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts:1994: spell.name !== "Thunderwave"
packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts:1996: spell.provenance.section !== "Spells/Descriptions-S-Z#Thunderwave"
packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts:2053: spell.name === "Thunderwave"
packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts:2055: spell.provenance.section === "Spells/Descriptions-S-Z#Thunderwave"
packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts:2090: spell.name === "Vicious Mockery"
packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts:2092: spell.provenance.section === "Spells/Descriptions-S-Z#Vicious Mockery"

packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts:276: spell.name !== "Feather Fall"
packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts:278: spell.provenance.section !== "Spells/Descriptions-E-L#Feather Fall"
packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts:525: spell.name !== "Jump"
packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts:527: spell.provenance.section !== "Spells/Descriptions-E-L#Jump"
packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts:588: spell.name !== "Misty Step"
packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts:590: spell.provenance.section !== "Spells/Descriptions-M-P#Misty Step"
packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts:653: spell.name !== "Expeditious Retreat"
packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts:655: spell.provenance.section !== "Spells/Descriptions-E-L#Expeditious Retreat"
packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts:1048: spell.name !== "Protection from Poison"
packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts:1050: spell.provenance.section !== "Spells/Descriptions-M-P#Protection from Poison"
packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts:1144: spell.name !== "Protection from Evil and Good"
packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts:1146: spell.provenance.section !== "Spells/Descriptions-M-P#Protection from Evil and Good"
packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts:1274: spell.name !== "Heroism"
packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts:1276: spell.provenance.section !== "Spells/Descriptions-E-L#Heroism"
packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts:1357: spell.name !== "Divine Favor"
packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts:1359: spell.provenance.section !== "Spells/Descriptions-A-D#Divine Favor"
packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts:1660: spell.name !== "Shining Smite"
packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts:1662: spell.provenance.section !== "Spells/Descriptions-S-Z#Shining Smite"
packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts:1747: spell.name !== "Searing Smite"
packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts:1749: spell.provenance.section !== "Spells/Descriptions-S-Z#Searing Smite"
packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts:1827: spell.name !== "Ensnaring Strike"
packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts:1829: spell.provenance.section !== "Spells/Descriptions-E-L#Ensnaring Strike"
packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts:1879: spell.name !== "Divine Smite"
packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts:1881: spell.provenance.section !== "Spells/Descriptions-A-D#Divine Smite"
packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts:2069: spell.name === "Hunter's Mark"
packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts:2071: spell.provenance.section === "Spells/Descriptions-G-P#Hunter's Mark"
packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts:2087: spell.name === "Hex"
packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts:2089: spell.provenance.section === "Spells/Descriptions-E-L#Hex"
packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts:2853: spell.name !== "Resistance"
packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts:2855: spell.provenance.section !== "Spells/Descriptions-Q-R#Resistance"
```

## Implementation Phases

1. Add an automated name/provenance dispatch guard.
   - Extend `scripts/check-authored-id-dispatch-boundary.cjs` or add a sibling
     check that flags production comparisons against `SpellRecord.name`,
     `UnitRecord.name`, and `provenance.section`.
   - Add narrow allowlist entries only for the spell-access and cross-record
     exceptions above.
   - Verification target: the new guard fails before fixes and passes after all
     rows in this plan are complete.
2. Save-gate batch.
   - Start with low-coupling rows where complete shape checks already exist:
     Command, Grease, Sleep, Hideous Laughter, Faerie Fire, Blindness/Deafness,
     Hold Person, Animal Friendship, Charm Person.
   - Then fix multi-site rider/post-save rows: Fireball, Shatter, Thunderwave,
     Dissonant Whispers, Vicious Mockery, Starry Wisp, Chill Touch, Ray of
     Sickness, Shocking Grasp, Guiding Bolt.
3. Support/profile batch.
   - Remove direct name/provenance gates where complete shape checks already
     exist.
   - Handle Hunter's Mark and Hex carefully because current branching uses
     authored identity to choose two nearby marked-damage variants; split on
     operation shape instead.
4. General profile and attack-damage batch.
   - Remove canonical helper names and replace them with shape parser names.
   - Rename constants such as `FIREBALL_SPELL_NAME` to domain-invariant names or
     remove them once no authored name is used.
5. Reaction/discovery batch.
   - Counterspell, Hellish Rebuke, and Feather Fall reaction matching should
     trust typed procedure plus casting-time trigger facts, not spell name or
     source section.
6. Final convergence.
   - Run the new guard, existing authored-id guard, affected typechecks, focused
     deterministic tests, and reviewer-loop passes until no reasonable finding
     remains.

## Verification

1. Run `pnpm check:authored-id-dispatch` after every authored-id or
   authored-reference cleanup.
2. Run the new name/provenance dispatch guard after it exists. Until then,
   re-run the exact `rg` scans from this plan and update this index if any line
   moves or a new site appears.
3. Run package-local typechecks for touched packages.
4. Run focused deterministic tests for affected profiles. Use MBT only after
   completed behavior changes that need promoted end-to-end validation.
5. RAW/ubiquitous-language check: before changing any rule-bearing parser, read
   the relevant SRD 5.2.1 passage in `.references/srd-5.2.1/` and check
   `UBIQUITOUS_LANGUAGE.md`. Confirm modeled rules trace to specific SRD text and
   names use repo domain language rather than migration or authored-id language.
6. Reviewer-loop convergence: after implementation, run RAW traceability,
   ubiquitous-language/domain, architecture/connascence, and code-review passes.
   Fix every reasonable finding, explicitly reject only findings with concrete
   reasons, and repeat until no reasonable findings remain.
