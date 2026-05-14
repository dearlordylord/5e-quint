# Manual MCP Battle Checks - Latest Level-1 Abilities - 2026-05-14

RAW checked before changing behavior:

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md` `Fire Bolt`
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md` `Sorcerous Burst`, `Spare the Dying`, `Starry Wisp`
- `.references/srd-5.2.1/Classes/Bard.md` `Bardic Inspiration`
- `.references/srd-5.2.1/Classes/Monk.md` `Martial Arts`
- `.references/srd-5.2.1/Classes/Ranger.md` `Favored Enemy`
- `.references/srd-5.2.1/Classes/Sorcerer.md` `Innate Sorcery`
- `.references/srd-5.2.1/Classes/Warlock.md` `Armor of Shadows`, `Pact of the Chain`, `Pact of the Tome`
- `.references/srd-5.2.1/Equipment.md` `Weapon Mastery`
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md` `Command`
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md` `Animal Friendship`
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md` `Faerie Fire`, `Grease`, `Light`
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md` `Hunter's Mark`
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md` `Protection from Evil and Good`, `Produce Flame`
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md` `Sleep`
- `.references/srd-5.2.1/Playing-the-Game.md` `Stabilizing a Character`
- `.references/srd-5.2.1/Rules-Glossary.md` `Stable`
- `UBIQUITOUS_LANGUAGE.md` `Death Saving Throw`, `Stable`

| Ability | Build/Battle fixture | MCP path tested | Expected | Actual | Result | Follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| Fire Bolt object runtime | Level-1 Wizard-style spellcaster with `fire_bolt`, Goblin Warrior battle | `discover_battle_acts` -> `fill_battle_hole` object target with `spellObjectTarget` + `spellObjectIgnition` -> attack roll -> damage | Object target appears; hit emits Fire object damage and flammable unattended object ignition | MCP now returns both `objectDamages` and `objectIgnitions` | Fixed and covered | None for this path |
| Sorcerous Burst runtime | Level-5 Sorcerer progression with `sorcerous_burst`, Goblin Warrior battle | `discover_battle_acts` -> damage type fill -> creature target fill -> attack roll -> exploding d8 damage | Damage type choices appear; creature/object target holes appear; chosen Thunder damage accepts max-die extra die | Resolved through MCP with `Sorcerous Burst damage (2d8-thunder)` and action spent | Fixed and covered | Object target hole is visible; a creature-damage vertical is covered |
| Spare the Dying stable lifecycle | Wizard-style caster session with `spare_the_dying`; allied Character Build target put at 0 HP and not dead in battle | `start_battle` -> mutate battle target to zero-HP lifecycle fixture -> `discover_battle_acts` -> target fill | Spell appears only for eligible zero-HP non-dead character target; target becomes Stable | Resolved through MCP; death saves reset and Stable is true | Covered | None for this path |
| Starry Wisp object damage | Existing Wizard-style spellcaster with `starry_wisp`, Goblin Warrior battle | Existing `fill_battle_hole` object target -> attack roll -> damage | Object damage visible through MCP | Existing test remains aligned with object damage output | Covered | Invisible-benefit denial is still runtime-covered; no new MCP assertion added here |
| Bardic Inspiration | Level-1 Bard fixture with Bardic resource, Goblin Warrior target | `discover_battle_acts` -> `fill_battle_hole` target with `bardicInspirationTargetWithinRange` | Bonus Action grants die to target and spends one Bardic use | Resolved through MCP; target gets `bardicInspirationDie`, Bard resource decrements | Covered | None |
| Innate Sorcery | Level-1 Sorcerer with `sorcerer_innate_sorcery` and `sorcerous_burst` | `resolve_battle_act` Innate Sorcery -> `discover_battle_acts` Sorcerous Burst -> damage type + target fills | Bonus Action activates; following Sorcerer spell attack gets Advantage | MCP returned `attackRoll` with `rollMode: "advantage"` | Covered | None |
| Martial Arts | Level-1 Monk with Martial Arts support and unarmored/unshielded loadout | `discover_battle_acts` -> `fill_battle_hole` target -> attack roll -> Martial Arts die damage | Bonus Action Unarmed Strike is visible and resolvable | Resolved through MCP and spent Bonus Action | Covered | None |
| Weapon Mastery Sap | Fighter with Longsword mastery Sap, Goblin Warrior | MCP attack target -> roll -> damage, then Goblin attack target | Sap applies next self attack Disadvantage to hit target | Goblin attack-roll hole returned `rollMode: "disadvantage"` | Covered | None |
| Weapon Mastery Topple | Fighter with Quarterstaff mastery Topple, Goblin Warrior | MCP attack target -> roll | Hit asks for Topple saving throw before resolution | MCP returned `savingThrowOutcome` hole | Covered | None |
| Weapon Mastery Cleave | Fighter with Greataxe mastery Cleave, two adjacent targets | MCP primary attack target/roll/damage -> Cleave decision -> second target | Cleave decision remains usable after primary action is spent | Fixed MCP pending-fill base-state replay; Cleave continuation now reaches second attack roll | Fixed and covered | None |
| Armor of Shadows | Warlock fixture with `armorOfShadowsMageArmor`, no armor, one slot | `discover_battle_acts` -> Mage Armor target fill | Mage Armor is visible through invocation access, targets self, does not spend slot | Resolved through MCP; AC becomes 15 and spell slot expended remains 0 | Covered | None |
| Pact of the Chain | Warlock fixture with `pactOfTheChainFindFamiliar` access | Direct battle init plus `discover_battle_acts` snapshot | Pact access retains Find Familiar special access but no combat act is emitted | MCP-visible battle state retains invocation access; no Find Familiar combat act appears | Covered | Find Familiar special forms are stored, not a battle action |
| Pact of the Tome | Warlock fixture with on-person Book of Shadows cantrips and rituals | `discover_battle_acts` -> Book cantrip Fire Bolt target fill | On-person Book of Shadows contributes effective cantrip access | Fire Bolt from the book appears and reaches attack-roll hole through MCP | Covered | Ritual access is retained in spellcasting state; battle action tested via cantrip |
| Favored Enemy Hunter's Mark | Level-1 Ranger with Favored Enemy resource and feature-prepared Hunter's Mark | `discover_battle_acts` -> Hunter's Mark target fill | Free cast uses Favored Enemy resource, starts Concentration, and spends no Spell Slot | Resolved through MCP; resource decrements, Concentration starts, slot remains unexpended | Covered | None |
| Older promoted spell discovery | Prepared caster with Animal Friendship, Command, Faerie Fire, Grease, Protection from Evil and Good, Sleep, Chill Touch, Produce Flame, Light | `discover_battle_acts` through MCP | Rich spell holes must serialize and all supported procedures must be visible | Fixed MCP output to carry richer spell snapshots/holes; all listed spell acts discover through MCP using a Beast fixture for Animal Friendship | Fixed and covered | None for these discovered procedures |
| Generic MCP battle surface drift | Orc Soldier Fighter/Goblin and Fighter 2/Wizard/Skeleton acceptance verticals | `discover_battle_acts`, `fill_battle_hole`, `end_turn`, `end_battle` | Newly promoted Shove and attack-roll modes should not break accepted MCP verticals | Fixture expectations now distinguish character Shove from stat-block actions, reuse pending subjects, and replay returned attack-roll mode | Fixed and covered | Full `src/server.test.ts` passes |
| Spellcasting class battle load | Bard/Cleric/Druid/Paladin/Ranger/Sorcerer content | Unit catalog load and battle init support boundary | Class `spellcasting` field is the spellcasting source; class `featureGrants` must not point at missing `*_spellcasting` Units | Removed dangling redundant `*_spellcasting` feature grants from class content | Fixed | Keep spellcasting as class-level structured data unless real feature Units are authored later |

## Verification

- `pnpm --filter @dnd/mcp typecheck`
- `pnpm exec vitest run src/manual-mcp-battle-surface.test.ts --pool=forks --maxWorkers=1 --minWorkers=1 --reporter=verbose`
- `pnpm exec vitest run src/server.test.ts --pool=forks --maxWorkers=1 --minWorkers=1 --reporter=dot`
- `pnpm exec vitest run src/server.test.ts -t "fills one battle hole at a time|Weapon Mastery|Fire Bolt|Sorcerous Burst|Spare the Dying|Starry Wisp|Acid Splash" --pool=forks --maxWorkers=1 --minWorkers=1 --reporter=verbose`
- `pnpm exec vitest run src/end-user-vertical.acceptance.test.ts --pool=forks --maxWorkers=1 --minWorkers=1 --reporter=verbose`
- `pnpm --filter @dnd/surface test -- src/surface/unit-catalog.test.ts`
