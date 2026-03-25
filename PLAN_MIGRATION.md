# SRD 5.1 -> 5.2.1 Migration Plan

Migrate the formal spec, XState machine, MBT bridge, QA pipeline, and docs from SRD 5.1 (2014 rules) to SRD 5.2.1 (2024 rules).

**SRD parity principle:** the spec formalizes the SRD and nothing else. Every rule traces to a specific SRD passage. No homebrew or interpretive extensions. Where the formalization requires choices the SRD doesn't prescribe, those are documented in `ASSUMPTIONS.md`. This migration changes the source of truth from SRD 5.1 to SRD 5.2.1.

Two plan files to migrate, strictly in order:
1. **PLAN.md** (core) — generic mechanics in `dnd.qnt`. Migrated first.
2. **PLAN_NONCORE.md** (non-core) — class features, spells, racial traits in TS/caller. Migrated second, after core is stable.

References:
- `.references/srd-5.2.1/` — full SRD 5.2.1 text (Classes/, Spells/, Monsters/, Magic-Items/, plus top-level Playing-the-Game.md, Rules-Glossary.md, Equipment.md, etc.)
- `.references/srd-5.2.1-conversion/` — official conversion guide (delta manifest: lists every new, renamed, and revised element per section — use this to drive the migration, look up actual rules in the full text)
- `.references/srd/` — SRD 5.1 (current spec source)

Note: `Magic-Items/` may be incomplete (only `Items-Q-Z.md` + `Overview.md`, no A-P file).

---

## Phase 0 — Preserve 5.1 Artifacts ✅ DONE

Completed: `81c0554`. Tag: `v5.1-final`.

- M0.1: `dnd2014.qnt` + `dnd2014Test.qnt` archived, `quint test` passes
- M0.2: `PLAN_2014.md` + `PLAN_NONCORE_2014.md` archived
- M0.3: **Option B** chosen — evolve in-place, git history as 5.1 reference
- M0.4: `v5.1-final` tag set. Continuing on `master` (greenfield)

---

## Phase 1 — QA Pipeline Version Tagging ✅ SUPERSEDED

Pipeline already targets 5.2.1 only: `parse_se.py` filters for `dnd-5e-2024` tag, `generate_assertions.py` imports from `dnd.qnt` (5.2.1 spec). Dual-edition support unnecessary — 2014 spec archived, pipeline only produces 2024 assertions.

---

## Phase 2 — Migrate PLAN.md (Core) to 5.2.1 ✅ DONE

Port every task in PLAN.md from SRD 5.1 rules to SRD 5.2.1 rules. This is a rule-checking task: read the conversion guide and full SRD 5.2.1 text, update each task's description to reflect 2024 mechanics.

Use `.references/srd-5.2.1-conversion/` as the delta manifest. Look up actual rules in `.references/srd-5.2.1/`.

### M2.1 Core rules delta

Changes that affect PLAN.md tasks:

| 5.1 | 5.2.1 | Location in current spec (needs updating) |
|-----|-------|-------------------------------------------|
| Surprise skips turn | Surprise = disadvantage on Initiative | TA3, TA4 |
| Bonus-action spell rule | One Spell with Spell Slot per Turn | dnd.qnt spellcasting section |
| Knock out -> 0 HP | Knock out -> 1 HP + start Short Rest | dnd.qnt pKnockOut |
| Exhaustion: 6 tiers, cumulative | Exhaustion: conditions-based (revised) | dnd.qnt pAddExhaustion |
| Stunned: can't move | Stunned: can move, can't speak | dnd.qnt pApplyCondition |
| Grappled: speed 0 | Grappled: speed 0 + disadvantage on attacks vs non-grappler + drag costs 1 extra ft/ft | dnd.qnt pStartTurn, pOwnAttackModifiers |
| Saving throws: must roll | Can choose to fail | dnd.qnt saveSucceeds |
| Cast a Spell action | Magic action | dnd.qnt ActionType |
| Use an Object action | Utilize action | dnd.qnt ActionType |
| Race | Species | Non-core T01 (CharConfig identity) |
| Hit Dice | Hit Point Dice | Rename throughout |
| Armor proficiency | Armor training | Rename |
| Concentration DC: no cap | Concentration DC: max 30 | dnd.qnt pConcentrationDC |
| Unarmed Strike: separate | Unarmed Strike: includes grapple/shove | dnd.qnt section 13 (grapple/shove) |
| Attack action: fixed | Equip/unequip per attack, move between | dnd.qnt section 11 (turn structure) |

### M2.2 Type/enum renames in core
- `HitDice` -> `HitPointDice`
- `ACastSpell` -> `AMagic`
- `AUseObject` -> `AUtilize`
- Add new action types: `AStudy`, `AInfluence`
- Note: `Race` -> `Species` rename is non-core (T01 in PLAN_NONCORE.md)

### M2.3 Condition revisions in core
- Exhaustion: completely new system (replace 6-tier with new)
- Stunned: can move, can't speak (reverse current behavior)
- Grappled: revised
- Charmed, Incapacitated, Invisible, Petrified: revised

### M2.4 New core mechanics
- Weapon Mastery framework (property system, not individual mastery effects)
- Concentration DC cap at 30
- Voluntary save failure
- Unarmed Strike restructure (grapple/shove as options within Unarmed Strike)

### M2.5 Implement migrated core spec
- Apply all M2.1-M2.4 changes to `dnd.qnt`
- Write new `dndTest.qnt` (or adapt from `dnd2014Test.qnt`)
- `quint test dndTest.qnt` must pass

---

## Phase 3 — Migrate PLAN_NONCORE.md to 5.2.1 ✅ DONE

Port every task in PLAN_NONCORE.md from SRD 5.1 rules to SRD 5.2.1 rules. Same rule-checking approach as Phase 2. Depends on Phase 2 being complete (non-core composes on core).

**Scope decisions:** minimal for new spells and feats — document names + TODO markers, no full descriptions until implementation. Strict SRD 5.2.1 parity throughout (no 5.1 holdovers like Dueling).

**Execution order:** M3.2 (renames) -> M3.5 (feat framework) -> M3.1 (class deltas) -> M3.3/M3.4/M3.6 (independent, any order)

### M3.1 Class feature delta

Every class gains new features and has existing ones revised. 5 classes pick subclass at L3 (was L1-2): Cleric, Druid, Sorcerer, Warlock, Wizard. Features moved from subclass to class level for Cleric (Divine Order, Blessed Strikes) and Druid (Primal Order, Elemental Fury).

Per-class rewrites in PLAN_NONCORE.md:

**T05 Fighting Styles** — restructure as feat framework. Only 4 feats in SRD 5.2.1: Archery, Defense, Great Weapon Fighting, Two-Weapon Fighting. Dueling and Protection removed (not in SRD 5.2.1). Prerequisite: "Fighting Style Feature" — only Fighter (L1), Paladin (L2), Ranger (L2) can take them. Fighters can swap on level-up. Champion gets second at L7. Paladin alternative: Blessed Warrior (2 Cleric cantrips). Ranger alternative: Druidic Warrior (2 Druid cantrips).

**T10-T13 Barbarian:**
- T10 Rage: maintenance rules changed (attack roll OR force save OR BA), duration up to 10 min. Persistent Rage (L15): regain all uses on Initiative 1/LR, lasts 10 min without extension
- T11 Reckless: add Brutal Strike interaction — forgo advantage for +1d10 + effect at L9, 2d10 + two effects at L17. Effects: Forceful Blow (push 15ft), Hamstring Blow (Speed -15ft), Staggering Blow (L13, disadv next save), Sundering Blow (L13, +5 next attack vs target)
- T12 Barbarian Passives: add Primal Knowledge (L3), Instinctive Pounce (L7, move half speed on rage entry)
- T13 Berserker: **Frenzy no longer causes exhaustion**. Frenzy, Retaliation, Intimidating Presence all revised

**T20-T23 Fighter:**
- T20 Second Wind: scales uses (2 at L2, 3 at L?, 4 at L?). Add Tactical Mind (L2, expend SW use on failed check +1d10), Tactical Shift (L5, half-speed move without OAs on SW)
- T21 Action Surge: 1 use, 2 at L17, once/turn (unchanged)
- T22 Indomitable: 1/2/3 uses at L9/L13/L17
- T23 Champion: add Heroic Warrior (L10, gain Heroic Inspiration each turn if lacking). Survivor revised (Bloodied = <=50% HP threshold). Additional Fighting Style at L7 = second Fighting Style feat
- NEW features: Tactical Master (L9, swap weapon mastery for Push/Sap/Slow), Studied Attacks (L13, Advantage on next attack after miss)

**T30-T33 Rogue:**
- T30 Sneak Attack: base unchanged. Add Cunning Strike system (L5): spend SA dice for effects — Poison (1d6 cost, CON save or Poisoned), Trip (1d6, DEX save or Prone), Withdraw (1d6, move half speed no OAs)
- NEW: Steady Aim (L3, BA for Advantage on next attack, Speed->0). Improved Cunning Strike (L11, two effects per SA). Devious Strikes (L14): Daze (2d6, CON save or limited actions), Knock Out (6d6, CON save or Unconscious), Obscure (3d6, DEX save or Blinded)
- T33 Thief: Supreme Sneak adds Stealth Attack Cunning Strike option

**T40-T46 Monk (Ki -> Focus):**
- T40: Focus Pool (was Ki Pool). Martial Arts die now d6/d8/d10/d12 (was d4/d6/d8/d10)
- T41 Martial Arts: revised die progression
- T42: Focus Actions (was Ki Actions). Flurry scales to 3 strikes at L10. Patient Defense grants temp HP at L10. Step of the Wind can carry ally at L10
- T43 Stunning Strike: on save success, Speed halved + Advantage on next attack vs target (not just "nothing")
- T44 Monk Passives: Self-Restoration replaces Stillness of Mind + Purity of Body (remove Charmed/Frightened/Poisoned at end of turn). Disciplined Survivor replaces Diamond Soul (all save prof + FP reroll). Superior Defense (L18, 3 FP for all resistance except Force). Add Uncanny Metabolism (L2, regain all FP + heal on Initiative 1/LR), Deflect Energy (L13, Deflect Attacks works on all damage types), Perfect Focus (L15, regain FP to 4 on Initiative)
- T46 Open Hand -> Warrior of the Open Hand: effects renamed (Addle/Push/Topple). Wholeness of Body changed (BA heal, WIS mod uses/LR). Add Fleet Step (L11). Quivering Palm revised (4 FP, 10d12 Force, half on success — no longer save-or-die)

**T60-T63 Paladin:**
- T61: Paladin's Smite feature (always prepared Divine Smite spell + 1 free cast/LR). Document spell mechanics here. Radiant Strikes (L11, replaces Improved Divine Smite) = +1d8 Radiant on melee hit
- T62 Paladin Passives: add Faithful Steed (L5, free Find Steed 1/LR), Abjure Foes (L9, Channel Divinity frighten CHA mod targets within 60ft), Restoring Touch (L14, spend 5 LoH HP to remove Blinded/Charmed/Deafened/Frightened/Paralyzed/Stunned). Aura Expansion now separate feature at L18 (30ft)
- T63 Oath of Devotion: add Smite of Protection (L15, Half Cover in aura on Divine Smite cast). Sacred Weapon and Holy Nimbus revised

**T70-T71 Ranger:**
- T70: Favored Enemy + Natural Explorer replaced by Deft Explorer (L1), Roving (L6), Tireless (L10). Add Nature's Veil (L14, Invisible as BA), Precise Hunter (L17), Relentless Hunter. Feral Senses and Foe Slayer revised
- T71 Hunter: add Hunter's Lore (new), Superior Hunter's Prey (new). All tier choices (Prey/Tactics/Defense) revised

**T80-T81 Bard:**
- T80: Font of Inspiration revised, Superior Inspiration revised. Add Words of Creation (L20)
- T81 Lore: Cutting Words revised, Peerless Skill revised. Additional Magical Secrets -> Magical Discoveries

**T90-T91 Cleric:**
- T90: subclass at L3 (was L1). Add Divine Order (L1 class feature, replaces subclass Bonus Proficiencies: Protector or Thaumaturge). Add Blessed Strikes (L7 class feature, replaces subclass Divine Strike). Channel Divinity now incorporates Divine Sense. Add Sear Undead, Improved Blessed Strikes, Greater Divine Intervention
- T91 Life Domain: Disciple of Life, Preserve Life, Supreme Healing revised. Add Land's Aid (new)

**T100-T101 Druid:**
- T100: subclass at L3 (was L2). Add Primal Order (L1 class feature: Magician or Warden). Add Elemental Fury (L7 class feature: Potent Spellcasting or Primal Strike). Add Wild Companion, Wild Resurgence, Improved Elemental Fury (L15). Wild Shape revised
- T101 Circle of the Land: Natural Recovery, Nature's Ward, Nature's Sanctuary revised. Add Land's Aid (new)

**T110-T112 Sorcerer:**
- T110: subclass at L3 (was L1). Add Innate Sorcery, Sorcery Incarnate, Arcane Apotheosis. Sorcerous Restoration revised
- T111 Metamagic: 6 revised options + 2 new (Seeking Spell, Transmuted Spell)
- T112: Draconic Bloodline -> Draconic Sorcery. Resilience/Elemental Affinity/Dragon Wings revised. Add Draconic Spells (new), Dragon Companion (new task T112b)

**T120-T122 Warlock:**
- T120: subclass at L3 (was L1). **Pact Boon eliminated as class feature** — Blade/Chain/Tome are now invocation options from L1. Add Magical Cunning (L2, regain half pact slots 1/LR), Contact Patron (L9). Eldritch Master revised (regain ALL slots via Magical Cunning at L20)
- T121 Invocations: 7 new (Devouring Blade, Eldritch Mind, Eldritch Smite, Gift of the Depths, Gift of the Protectors, Investment of the Chain Master, Lessons of the First Ones). 18 revised
- T122: The Fiend -> Fiend Patron. Dark One's Blessing triggers on ally kills within 10ft too. Dark One's Own Luck uses=CHA mod (was 1/SR). Hurl Through Hell revised (8d10 Psychic + Incapacitated, CHA save, 1/LR or expend pact slot)

**T130-T131 Wizard:**
- T130: subclass at L3 (was L1). Add Scholar, Memorize Spell
- T131: Evocation -> Evoker. Sculpt Spells, Potent Cantrip, Overchannel revised

### M3.2 Type/enum renames in non-core

| Old | New | Affected tasks |
|-----|-----|----------------|
| `Ki` / `kiPoints` | `Focus` / `focusPoints` | T40-T46 |
| `DivineSmite` | `PaladinsSmite` | T61 |
| `FightingStyle` (class feature) | Fighting Style Feat | T05, T23 |
| `Feeblemind` | `Befuddlement` | T153 |
| `BrandingSmite` | `ShiningSmite` | T156 |
| `DraconicBloodline` | `DraconicSorcery` | T112 |
| `TheFiend` | `FiendPatron` | T122 |
| `Evocation` | `Evoker` | T131 |
| `WayOfTheOpenHand` | `WarriorOfTheOpenHand` | T46 |
| `race` / `subrace` | `species` (no subraces) | T01, T140, T141 |
| `DeflectMissiles` | `DeflectAttacks` | T45 |
| `DiamondSoul` | `DisciplinedSurvivor` | T44 |
| `StillnessOfMind` + `PurityOfBody` | `SelfRestoration` | T44 |
| `ImprovedDivineSmite` | `RadiantStrikes` | T62 |
| `AdditionalMagicalSecrets` | `MagicalDiscoveries` | T81 |

### M3.3 Species (was Races)

Full rewrite of T140/T141:
- **Removed species:** Half-Orc, Half-Elf (no longer exist in SRD 5.2.1)
- **Removed traits:** Savage Attacks (entirely gone), Fey Ancestry (verify against Elf lineages)
- **New species:** Orc (Relentless Endurance kept + Adrenaline Rush: BA Dash + temp HP, prof-bonus uses/SR), Goliath (Giant Ancestry — 6 combat options, TODO: enumerate)
- **Structural:** ability scores from Background not species; subraces eliminated; Elf has lineage options (Drow, High Elf, Wood Elf)
- All 7 existing species traits revised against 5.2.1 text
- Scope: model combat-relevant traits only, TODO for full catalog

### M3.4 Spell changes

- **Renames:** Feeblemind -> Befuddlement, Branding Smite -> Shining Smite
- **20 new spells** (add to T150-T161 as TODO entries): Aura of Life, Charm Monster, Chromatic Orb, Dissonant Whispers, Divine Smite, Dragon's Breath, Elementalism, Ensnaring Strike, Hex, Ice Knife, Mind Spike, Phantasmal Force, Power Word Heal, Ray of Sickness, Searing Smite, Sorcerous Burst, Starry Wisp, Summon Dragon, Tsunami, Vitriolic Sphere
- One Spell with Spell Slot per Turn: already handled in core
- Spell lists per class revised
- Divine Smite spell: referenced from T61 (Paladin's Smite feature)

### M3.5 Feat system

New section in PLAN_NONCORE.md. Minimal scope — framework + TODO for individual effects.

- **4 categories:** Origin, General, Fighting Style, Epic Boon
- **ASI is now a General Feat** (not class feature)
- **Fighting Style feats:** cross-reference T05. Only 4 in SRD 5.2.1. Prerequisite: "Fighting Style Feature"
- **Epic Boons:** `epicBoon: EpicBoon` in config, generic. Every class gains one at L19. TODO: enumerate individual boon effects from SRD 5.2.1
- **T200 Grappler:** revise per 5.2.1
- TODO: enumerate all SRD 5.2.1 feats per category

### M3.6 Equipment & Weapon Mastery (non-core aspects)

- **Weapon Mastery effects** (TODO, names only): Cleave, Graze, Nick, Push, Sap, Slow, Topple, Vex — per-weapon behavior, TS side
- **New weapons:** Musket, Pistol
- **Net:** moved from weapons to adventuring gear
- **Potion of Healing:** now Bonus Action (not just Action)
- **Removed from SRD:** Dueling, Protection fighting styles

---

## Phase 4 — XState Machine Migration ✅ MOSTLY DONE

Done incrementally during PLAN.md implementation and bug fixes. No standalone migration phase needed.

- **M4.1 types.ts:** Done. Action types (Magic, Utilize, Study, Influence) in place. Weapon Mastery/feat/species enums depend on M3.
- **M4.2 machine logic:** Done. Save-based grapple/shove, 5.2.1 exhaustion, surprise removed, new action types, bonus-action spell rule. Residual gaps (Concentration DC cap at 30, Grappled attack-disadv vs non-grappler) tracked in PLAN.md "5.2.1 Revision Needed."
- **M4.3 states/queries:** Done. No surprised sub-state, outOfCombat→acting→waitingForTurn hierarchy.
- **M4.4 machine-types:** Done. `hitDiceRemaining` not renamed to `hitPointDiceRemaining` (MBT bridge compensates); cosmetic, tracked in PLAN.md.
- **M4.5 MBT bridge:** Done. Points at `dnd.qnt`, all enum maps updated, 50×30 configured.
- **M4.6 machine.test.ts:** Done for migrated mechanics. Tests for residual gaps will come with their implementation.

---

## Phase 5 — Docs & References

### M5.1 Update `UBIQUITOUS_LANGUAGE.md`
- Race -> Species
- Ki -> Monk's Focus
- Hit Dice -> Hit Point Dice
- Armor proficiency -> Armor training
- Cast a Spell -> Magic action
- Use an Object -> Utilize
- Add: D20 Test, Heroic Inspiration, Bloodied, Weapon Mastery, etc.

### M5.2 Update `CLAUDE.md`
- Reference new SRD location
- Update parity rules for new spec

### M5.3 Update `README.md`
- Note SRD version (5.2.1)
- Link to conversion guide
- Mention 5.1 archived artifacts

---

## Phase 6 — QA Pipeline Rebuild for 2024

### M6.1 Regenerate 2024 assertions
- Run `generate_assertions.py --edition 2024` against new `dnd.qnt`
- Only 239 SE entries tagged `dnd-5e-2024` — thin corpus initially

### M6.2 Validate 2014 assertions still work
- `quint test qa_generated_2014.qnt --main qa_generated_2014` against `dnd2014.qnt`
- Should pass unchanged (regression guard)

### M6.3 Cross-version triage
- Some 2014 Q&A is version-agnostic (basic d20 math, HP overflow, etc.)
- Classifier could tag these as `ambiguous` -> usable for both versions
- Low priority; manual curation later

---

## Dependency Order

```
M0 (archive) ──────────────────────────────────────────┐
  M0.1 archive qnt                                     |
  M0.2 archive PLANs                                   |
  M0.3 branch machine                                  |
  M0.4 git tag                                         |
                                                       |
M1 (QA pipeline) ✅ SUPERSEDED ─────────────────────────|
                                                       |
M2 (migrate PLAN.md core) ✅ DONE ──────────────────────|
                                                       |
M3 (migrate PLAN_NONCORE.md) ✅ DONE ───────────────────|
                                                       |
M4 (XState + TS) ✅ MOSTLY DONE ────────────────────────|
                                                       |
M5 (docs) -- needs M2 ────────────────────────────────-|
                                                       |
M6 (QA rebuild) -- needs M2.5 ──────────────────────────┘
```

M0–M4 complete. Remaining: M5 (docs), M6 (QA pipeline rebuild). Both are unblocked.

### Cross-plan sequencing

M3 (doc rewrite) and TA3+TA4 (core code) were the two blockers for PLAN_NONCORE.md implementation. Both are now complete. PLAN_NONCORE.md implementation is **fully unblocked**.

---

## Risk / Open Questions

### Resolved

1. ~~**Magic-Items A-P may be missing**~~ — `Magic-Items/` only has `Items-Q-Z.md` + `Overview.md`. Low priority, magic items not in current modeling scope.
2. ~~**Weapon Mastery scope**~~ — minimal: document effect names (Cleave, Graze, Nick, Push, Sap, Slow, Topple, Vex) as TODOs in M3.6. Core framework in PLAN.md, individual effects in PLAN_NONCORE.md.
3. ~~**Feat system scope**~~ — minimal: document framework + categories (Origin, General, Fighting Style, Epic Boon) with TODOs. Enumerate individual feats later.
4. ~~**Epic Boons**~~ — generic config (`epicBoon: EpicBoon`). Not per-class — Epic Boons are feats in a shared category, any class picks one at L19.
5. ~~**Subclass level shift**~~ — 5 classes (Cleric, Druid, Sorcerer, Warlock, Wizard) now L3. Mostly character-building concern. Cleric/Druid had features move to class level (Divine Order, Primal Order, Blessed Strikes, Elemental Fury). Documented in M3.1.
6. ~~**Berserker Frenzy**~~ — no longer causes exhaustion. Documented in M3.1 T13.
7. ~~**Divine Smite modeling**~~ — stays in T61 (Paladin features). SRD 5.2.1 makes it a spell, but the Paladin's Smite class feature + spell mechanics are documented together in T61.
8. ~~**Half-Orc/Half-Elf removal**~~ — both removed as species. Orc (new) gets Relentless Endurance + Adrenaline Rush. Savage Attacks removed entirely. Documented in M3.3.
9. ~~**Fighting Style delivery**~~ — now feats with "Fighting Style Feature" prerequisite. Classes still grant at specific levels (Fighter L1, Paladin L2, Ranger L2). Only 4 feats in SRD 5.2.1 (Archery, Defense, Great Weapon Fighting, Two-Weapon Fighting). Dueling/Protection removed — strict SRD parity. Documented in M3.1 T05.

### Open

1. **Keep both specs runnable long-term?** — or archive 2014 and move on?
2. **Thin 2024 QA corpus** — only 239 SE entries. May need manual test cases.
3. **UI components** — `app/src/components/*.tsx` reference machine types. Need updating in M4.
4. **`@firfi/quint-connect` compatibility** — MBT bridge. Any version issues?
5. **Dragon Companion (T112b)** — Draconic Sorcery new feature. Complex enough for own task. Scope TBD.
6. **Goliath Giant Ancestry** — 6 combat options to enumerate from SRD 5.2.1. TODO in M3.3.
7. **Elf lineage traits** — Drow/High Elf/Wood Elf lineage options replace subraces. Need to verify which 5.1 Elf traits (Fey Ancestry, Trance, etc.) survived.
