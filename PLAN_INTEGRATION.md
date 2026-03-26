# Integration Plan — Class Features, Spells, Species, Feats

**Generated from SRD 5.2.1 audit.** Every feature traces to a specific SRD passage.

## Legend

- **Pure Fn**: exported function exists in `app/src/features/class-*.ts`
- **Wired**: connected through feature-store → feature-bridge → useFeatures → FeaturePanel
- **Pattern**: one-shot resource | extra action | ongoing toggle | passive modifier | reaction | conditional damage | resource pool | config-only | spell-dependent

---

## Per-Class Status

### Barbarian

| Feature | Level | Task | Pure Fn | Wired | Pattern |
|---------|-------|------|---------|-------|---------|
| Rage | 1 | T10 ✓ | ✓ | ✓ | ongoing toggle |
| Unarmored Defense | 1 | — | — | — | passive modifier |
| Reckless Attack | 2 | T11 ✓ | ✓ | ✓ | declaration |
| Danger Sense | 2 | T12 | — | — | passive modifier |
| Primal Knowledge | 3 | T12 | — | — | passive modifier |
| Extra Attack | 5 | core | ✓ | ✓ | config-only |
| Fast Movement | 5 | T12 | — | — | passive modifier |
| Feral Instinct | 7 | T12 | — | — | passive modifier |
| Instinctive Pounce | 7 | T12 | — | — | extra action |
| Brutal Strike | 9,13,17 | T11 ✓ | ✓ | ✓ | conditional damage |
| Relentless Rage | 11 | T12 | — | — | one-shot resource |
| Persistent Rage | 15 | T10 ✓ | ✓ | ✓ | resource pool |
| Indomitable Might | 18 | T12 | — | — | passive modifier |
| Primal Champion | 20 | — | — | — | config-only |
| **Berserker: Frenzy** | 3 | T13 ✓ | ✓ | — | conditional damage |
| **Berserker: Mindless Rage** | 6 | T13 ✓ | ✓ | — | passive modifier |
| **Berserker: Retaliation** | 10 | T13 ✓ | ✓ | — | reaction |
| **Berserker: Intimidating Presence** | 14 | T13 ✓ | ✓ | — | one-shot resource |

### Fighter

| Feature | Level | Task | Pure Fn | Wired | Pattern |
|---------|-------|------|---------|-------|---------|
| Fighting Style | 1 | T05 ✓ | ✓ | — | config-only |
| Second Wind | 1 | T20 ✓ | ✓ | ✓ | one-shot resource |
| Action Surge | 2 | T21 ✓ | ✓ | ✓ | extra action |
| Tactical Mind | 2 | T20 ✓ | ✓ | — | one-shot resource |
| Extra Attack | 5 | core | ✓ | ✓ | config-only |
| Tactical Shift | 5 | T20 ✓ | ✓ | — | passive modifier |
| Tactical Master | 9 | T20b | — | — | conditional damage |
| Indomitable | 9 | T22 | ✓ | — | one-shot resource |
| Two Extra Attacks | 11 | core | ✓ | ✓ | config-only |
| Studied Attacks | 13 | T20b | — | — | passive modifier |
| Three Extra Attacks | 20 | core | ✓ | ✓ | config-only |
| **Champion: Improved Critical** | 3 | T23 ✓ | ✓ | — | passive modifier |
| **Champion: Remarkable Athlete** | 3 | T23 ✓ | ✓ | — | passive modifier |
| **Champion: Additional Fighting Style** | 7 | T23 ✓ | ✓ | — | config-only |
| **Champion: Heroic Warrior** | 10 | T23 ✓ | ✓ | — | passive modifier |
| **Champion: Superior Critical** | 15 | T23 ✓ | ✓ | — | passive modifier |
| **Champion: Survivor** | 18 | T23 ✓ | ✓ | — | passive modifier |

### Rogue

| Feature | Level | Task | Pure Fn | Wired | Pattern |
|---------|-------|------|---------|-------|---------|
| Expertise | 1,6 | — | — | — | config-only |
| Sneak Attack | 1 | T30 ✓ | ✓ | — | conditional damage |
| Cunning Action | 2 | T31 ✓ | ✓ | — | extra action |
| Steady Aim | 3 | T30 ✓ | ✓ | — | one-shot resource |
| Cunning Strike | 5 | T30 ✓ | ✓ | — | conditional damage |
| Uncanny Dodge | 5 | T04 ✓ | ✓ | — | reaction |
| Evasion | 7 | T03 ✓ | ✓ | — | reaction |
| Reliable Talent | 7 | T32 | ✓ | — | passive modifier |
| Improved Cunning Strike | 11 | T30 ✓ | ✓ | — | conditional damage |
| Devious Strikes | 14 | T30 ✓ | ✓ | — | conditional damage |
| Slippery Mind | 15 | T32 | ✓ | — | passive modifier |
| Elusive | 18 | T32 | ✓ | — | passive modifier |
| Stroke of Luck | 20 | T32 | ✓ | — | one-shot resource |
| **Thief: Fast Hands** | 3 | T33 | — | — | extra action |
| **Thief: Second-Story Work** | 3 | T33 | — | — | passive modifier |
| **Thief: Supreme Sneak** | 9 | T33 | — | — | passive modifier |
| **Thief: Use Magic Device** | 13 | T33 | — | — | config-only |
| **Thief: Thief's Reflexes** | 17 | T33 | — | — | extra action |

### Monk

| Feature | Level | Task | Pure Fn | Wired | Pattern |
|---------|-------|------|---------|-------|---------|
| Martial Arts | 1 | T41 ✓ | ✓ | — | passive modifier |
| Unarmored Defense | 1 | — | — | — | passive modifier |
| Monk's Focus | 2 | T40 ✓ | ✓ | — | resource pool |
| Unarmored Movement | 2 | T44 | ✓ | — | passive modifier |
| Uncanny Metabolism | 2 | T40 ✓ | ✓ | — | one-shot resource |
| Deflect Attacks | 3 | T45 | ✓ | — | reaction |
| Slow Fall | 4 | T45 | ✓ | — | reaction |
| Extra Attack | 5 | core | ✓ | ✓ | config-only |
| Stunning Strike | 5 | T43 ✓ | ✓ | — | conditional damage |
| Empowered Strikes | 6 | T44 | — | — | passive modifier |
| Evasion | 7 | T03 ✓ | ✓ | — | reaction |
| Acrobatic Movement | 9 | T44 | — | — | passive modifier |
| Self-Restoration | 10 | T44 | — | — | passive modifier |
| Deflect Energy | 13 | T45 | ✓ | — | passive modifier |
| Disciplined Survivor | 14 | T44 | ✓ | — | passive modifier |
| Perfect Focus | 15 | T40 ✓ | ✓ | — | resource pool |
| Superior Defense | 18 | T44 | ✓ | — | ongoing toggle |
| Body and Mind | 20 | — | — | — | config-only |
| **Open Hand: Technique** | 3 | T46 | — | — | conditional damage |
| **Open Hand: Wholeness of Body** | 6 | T46 | — | — | one-shot resource |
| **Open Hand: Fleet Step** | 11 | T46 | — | — | extra action |
| **Open Hand: Quivering Palm** | 17 | T46 | — | — | resource pool |
| Flurry of Blows | 2 | T42 ✓ | ✓ | — | resource pool |
| Patient Defense | 2 | T42 ✓ | ✓ | — | resource pool |
| Step of the Wind | 2 | T42 ✓ | ✓ | — | resource pool |

### Ranger (no implementation file)

| Feature | Level | Task | Pure Fn | Wired | Pattern |
|---------|-------|------|---------|-------|---------|
| Spellcasting | 1 | T01 ✓ | — | — | spell-dependent |
| Favored Enemy | 1 | T70 | — | — | one-shot resource |
| Deft Explorer | 2 | T70 | — | — | passive modifier |
| Fighting Style | 2 | T05 ✓ | — | — | config-only |
| Extra Attack | 5 | core | ✓ | ✓ | config-only |
| Roving | 6 | T70 | — | — | passive modifier |
| Expertise | 9 | T70 | — | — | config-only |
| Tireless | 10 | T70 | — | — | one-shot resource |
| Nature's Veil | 14 | T70 | — | — | one-shot resource |
| Foe Slayer | 20 | T70 | — | — | passive modifier |
| **Hunter: Hunter's Prey** | 3 | T71 | — | — | conditional damage |
| **Hunter: Defensive Tactics** | 7 | T71 | — | — | passive modifier |
| **Hunter: Multiattack** | 11 | T71 | — | — | extra action |
| **Hunter: Superior Defense** | 15 | T71 | — | — | reaction |

### Paladin

| Feature | Level | Task | Pure Fn | Wired | Pattern |
|---------|-------|------|---------|-------|---------|
| Spellcasting | 1 | T01 ✓ | — | — | spell-dependent |
| Lay on Hands | 1 | T60 ✓ | ✓ | — | resource pool |
| Paladin's Smite | 2 | T61 ✓ | ✓ | — | one-shot resource |
| Channel Divinity | 3 | T07 ✓ | ✓ | — | resource pool |
| Extra Attack | 5 | core | ✓ | ✓ | config-only |
| Aura of Protection | 6 | T62 | — | — | passive modifier |
| Abjure Foes | 9 | T62 | ✓ | — | one-shot resource |
| Aura of Courage | 10 | T62 | — | — | passive modifier |
| Radiant Strikes | 11 | T62 | ✓ | — | passive modifier |
| Restoring Touch | 14 | T62 | — | — | one-shot resource |
| **Devotion: Sacred Weapon** | 3 | T63 | — | — | ongoing toggle |
| **Devotion: Aura of Devotion** | 7 | T63 | — | — | passive modifier |
| **Devotion: Smite of Protection** | 15 | T63 | — | — | reaction |
| **Devotion: Holy Nimbus** | 20 | T63 | — | — | ongoing toggle |

### Cleric (no implementation file)

| Feature | Level | Task | Pure Fn | Wired | Pattern |
|---------|-------|------|---------|-------|---------|
| Spellcasting | 1 | T01 ✓ | — | — | spell-dependent |
| Divine Order | 1 | T90 | — | — | config-only |
| Channel Divinity | 2 | T07 ✓ | ✓ | — | resource pool |
| Turn Undead | 2 | T90 | — | — | one-shot resource |
| Sear Undead | 5 | T90 | — | — | passive modifier |
| Blessed Strikes | 7 | T90 | — | — | passive modifier |
| Divine Intervention | 10 | T90 | — | — | one-shot resource |
| **Life: Disciple of Life** | 3 | T91 | — | — | passive modifier |
| **Life: Preserve Life** | 3 | T91 | — | — | one-shot resource |
| **Life: Blessed Healer** | 6 | T91 | — | — | passive modifier |
| **Life: Supreme Healing** | 17 | T91 | — | — | passive modifier |

### Druid

| Feature | Level | Task | Pure Fn | Wired | Pattern |
|---------|-------|------|---------|-------|---------|
| Spellcasting | 1 | T01 ✓ | — | — | spell-dependent |
| Primal Order | 1 | T100 ✓ | ✓ | — | config-only |
| Wild Shape | 2 | T100 ✓ | ✓ | — | resource pool |
| Wild Companion | 2 | T100 ✓ | ✓ | — | one-shot resource |
| Wild Resurgence | 5 | T100 ✓ | ✓ | — | one-shot resource |
| Elemental Fury | 7 | T100 ✓ | ✓ | — | passive modifier |
| Beast Spells | 18 | T100 ✓ | ✓ | — | ongoing toggle |
| Archdruid | 20 | T100 ✓ | ✓ | — | resource pool |
| **Land: Land's Aid** | 3 | T101 | — | — | spell-dependent |
| **Land: Natural Recovery** | 6 | T101 | — | — | one-shot resource |
| **Land: Nature's Ward** | 10 | T101 | — | — | passive modifier |
| **Land: Nature's Sanctuary** | 14 | T101 | — | — | ongoing toggle |

### Sorcerer

| Feature | Level | Task | Pure Fn | Wired | Pattern |
|---------|-------|------|---------|-------|---------|
| Spellcasting | 1 | T01 ✓ | — | — | spell-dependent |
| Innate Sorcery | 1 | T110 ✓ | ✓ | — | ongoing toggle |
| Font of Magic | 2 | T110 ✓ | ✓ | — | resource pool |
| Metamagic (10 options) | 2 | T111 | — | — | resource pool |
| Sorcerous Restoration | 5 | T110 ✓ | ✓ | — | one-shot resource |
| Arcane Apotheosis | 20 | T110 ✓ | ✓ | — | passive modifier |
| **Draconic: Resilience** | 3 | T112 | — | — | passive modifier |
| **Draconic: Elemental Affinity** | 6 | T112 | — | — | spell-dependent |
| **Draconic: Dragon Wings** | 14 | T112 | — | — | ongoing toggle |
| **Draconic: Dragon Companion** | 18 | T112b | — | — | spell-dependent |

### Warlock (no implementation file)

| Feature | Level | Task | Pure Fn | Wired | Pattern |
|---------|-------|------|---------|-------|---------|
| Pact Magic | 1 | T01 ✓ | — | — | spell-dependent |
| Eldritch Invocations | 1 | T121 | — | — | config-only |
| Magical Cunning | 2 | T120 | — | — | one-shot resource |
| Contact Patron | 9 | T120 | — | — | spell-dependent |
| Mystic Arcanum | 11+ | T120 | — | — | spell-dependent |
| Eldritch Master | 20 | T120 | — | — | one-shot resource |
| **Fiend: Dark One's Blessing** | 1 | T122 | — | — | reaction |
| **Fiend: Dark One's Own Luck** | 6 | T122 | — | — | one-shot resource |
| **Fiend: Fiendish Resilience** | 10 | T122 | — | — | passive modifier |
| **Fiend: Hurl Through Hell** | 14 | T122 | — | — | one-shot resource |

### Wizard (no implementation file)

| Feature | Level | Task | Pure Fn | Wired | Pattern |
|---------|-------|------|---------|-------|---------|
| Spellcasting | 1 | T01 ✓ | — | — | spell-dependent |
| Arcane Recovery | 1 | T130 | — | — | one-shot resource |
| Scholar | 2 | T130 | — | — | config-only |
| Memorize Spell | 5 | T130 | — | — | ongoing toggle |
| Spell Mastery | 18 | T130 | — | — | passive modifier |
| Signature Spells | 20 | T130 | — | — | spell-dependent |
| **Evoker: Sculpt Spells** | 6 | T131 | — | — | spell-dependent |
| **Evoker: Potent Cantrip** | 6 | T131 | — | — | passive modifier |
| **Evoker: Empowered Evocation** | 10 | T131 | — | — | spell-dependent |
| **Evoker: Overchannel** | 14 | T131 | — | — | one-shot resource |

### Bard (no implementation file)

| Feature | Level | Task | Pure Fn | Wired | Pattern |
|---------|-------|------|---------|-------|---------|
| Spellcasting | 1 | T01 ✓ | — | — | spell-dependent |
| Bardic Inspiration | 1 | T80 | — | — | resource pool |
| Expertise | 2,9 | T80 | — | — | config-only |
| Jack of All Trades | 2 | T80 | — | — | passive modifier |
| Font of Inspiration | 5 | T80 | — | — | resource pool |
| Countercharm | 7 | T80 | — | — | reaction |
| Superior Inspiration | 18 | T80 | — | — | passive modifier |
| Words of Creation | 20 | T80 | — | — | spell-dependent |
| **Lore: Cutting Words** | 3 | T81 | — | — | reaction |
| **Lore: Peerless Skill** | 14 | T81 | — | — | passive modifier |

---

## Cross-Cutting Features

### Weapon Mastery (T170) — ✓ DONE
All 8 effects implemented: Cleave, Graze, Nick, Push, Sap, Slow, Topple, Vex.

### Feats (T200-T201) — ✓ Framework DONE
Grappler feat implemented. 13 other SRD feats need mechanics (Origin, General, Epic Boon).

### Species Traits (T140-T141) — NOT STARTED
10 species in SRD 5.2.1. Combat-relevant: Dragonborn Breath Weapon, Orc Relentless Endurance, Goliath Giant Ancestry, Halfling Lucky, Gnome Cunning, Dwarf Resilience, Elf Fey Ancestry, Tiefling Fiendish Legacy.

### Spells (T150-T161) — 35% DONE
T150 (7 damage spells), T152 (8 defense spells), T153 (10 condition debuffs) done. T154-T161 (~40 spells) not started.

### Multiclass (T01.5) — NOT STARTED
Proficiency rules per class, attack resolution integration.

---

## Integration Pattern Groups

### Pattern: Passive Modifier (35 features — most common)
Examples: Danger Sense, Fast Movement, Evasion, Reliable Talent, Jack of All Trades, Unarmored Defense
**Machine interaction:** None. Computed at query time by bridge functions.
**Integration:** Add query functions to bridge, expose on hook. Batch-implementable.

### Pattern: One-Shot Resource (15 features)
Examples: Second Wind, Tactical Mind, Indomitable, Relentless Rage, Stroke of Luck, Arcane Recovery
**Machine interaction:** Sends existing events (HEAL, USE_BONUS_ACTION, etc.)
**Integration:** Already validated (Second Wind). Mechanical to add more.

### Pattern: Ongoing Toggle (8 features)
Examples: Rage, Innate Sorcery, Sacred Weapon, Wild Shape, Beast Spells, Superior Defense
**Machine interaction:** May send BREAK_CONCENTRATION; resistance/advantage via query.
**Integration:** Already validated (Rage). Similar pattern for each.

### Pattern: Reaction (8 features)
Examples: Uncanny Dodge, Deflect Attacks, Slow Fall, Retaliation, Countercharm, Cutting Words
**Machine interaction:** Sends USE_REACTION.
**Integration:** New pattern — not yet validated. Priority for next wire-up.

### Pattern: Resource Pool (10 features)
Examples: Focus Points, Lay on Hands, Sorcery Points, Bardic Inspiration, Channel Divinity
**Machine interaction:** Various (HEAL, USE_BONUS_ACTION, conditions).
**Integration:** Similar to Fighter charges but with multiple consumers per pool.

### Pattern: Conditional Damage (12 features)
Examples: Sneak Attack, Brutal Strike, Hunter's Prey, Stunning Strike, Divine Smite
**Machine interaction:** Modifies damage in TAKE_DAMAGE events.
**Integration:** Not yet wired — pure functions exist but bridge needs damage composition.

### Pattern: Extra Action (6 features)
Examples: Action Surge, Cunning Action, Focus Actions, Thief's Reflexes
**Machine interaction:** GRANT_EXTRA_ACTION or USE_BONUS_ACTION.
**Integration:** Already validated (Action Surge).

---

## Recommended Wiring Order

### Batch 1: Wire existing pure functions (no new code needed)
Features that have pure functions but aren't wired yet. Mechanical work — add to bridge/hook/panel.

1. **Fighter:** Tactical Mind, Indomitable, Champion features (T20, T22, T23) — all pure fns exist
2. **Rogue:** Sneak Attack, Cunning Action, Steady Aim (T30, T31) — pure fns exist
3. **Monk:** Focus Pool, Martial Arts, Focus Actions, Stunning Strike (T40-T43) — pure fns exist
4. **Paladin:** Lay on Hands, Smite (T60, T61) — pure fns exist
5. **Barbarian:** Berserker features (T13) — pure fns exist but not wired

### Batch 2: Reactions (new integration pattern)
6. Uncanny Dodge, Deflect Attacks, Slow Fall — validate reaction pattern

### Batch 3: P2 class passives (new pure functions + wiring)
7. T12 Barbarian Passives, T32 Rogue Passives, T44/T45 Monk Passives/Reactions
8. T62/T63 Paladin Passives + Oath of Devotion

### Batch 4: Missing classes (new implementation files)
9. T80 Bard, T90 Cleric, T120 Warlock, T130 Wizard, T70 Ranger

### Batch 5: Cross-cutting
10. T140-T141 Species, T111 Metamagic, T01.5 Multiclass

### Batch 6: Spells
11. T154-T161 remaining spell effects

---

## Summary Stats

| Metric | Count |
|--------|-------|
| Total SRD class features | ~200 |
| Pure functions implemented | ~170 exports across 7 files |
| Features wired (integration layer) | 6 (Rage, Reckless, Second Wind, Action Surge + queries) |
| Features with pure fns but not wired | ~50 |
| Features not started | ~80 |
| Classes with no implementation file | 5 (Ranger, Bard, Cleric, Warlock, Wizard) |
| Incomplete tasks in PLAN_NONCORE.md | 42 |
