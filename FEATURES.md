# D&D 5E SRD 5.2.1 — Feature Coverage

Three implementation layers: **Spec** (`creature.qnt`/`battle.qnt`), **Engine** (XState machines), **Content** (`features/*.ts`). "Done" means mechanically modeled and MBT-tested unless noted.

---

## Combat Core

| Feature | Layer | Status | Notes |
|---------|-------|--------|-------|
| Initiative & turn order | Battle | Done | d20 + DEX, surprise as disadvantage (5.2.1) |
| Action economy (Action / BA / Reaction / Free) | Spec + Battle | Done | Per-turn tracking, gates on incapacitation |
| Movement (Walk / Fly / Swim / Climb / Burrow) | Spec | Done | 5 types, armor penalty, exhaustion penalty |
| Difficult terrain | Spec | Done | 2x movement cost multiplier |
| Opportunity attacks | Battle | Done | Movement-triggered, full attack chain, reaction cost |
| Grapple & Shove | Spec | Done | Contested checks, size limits, prone/push |
| Two-Weapon Fighting | Spec | Done | Off-hand rules, Fighting Style modifier |
| Mounted combat | Spec | Done | Modeled in spec |
| Cover (Half / Three-Quarters / Total) | Spec | Done | AC & DEX save bonuses; spatial assignment is caller input |
| Readied actions (attack) | Battle | Done | Hold + release on reaction, full attack resolution |
| Readied spells with Concentration | Battle | Done | Slot spent on ready, conc starts, Counterspell window on release |
| Surprise (5.2.1: disadvantage, not lost turn) | Battle | Done | 5.2.1 revision |
| Knock Out (melee, 0 HP choice) | Battle | Done | 5.2.1 non-lethal mechanic |
| Dodge action | Battle | Done | Attackers have disadvantage |
| Dash (action + BA) | Battle | Done | Doubles remaining movement |
| Disengage | Battle | Done | Prevents OAs |
| Action Surge | Battle | Done | Fighter extra action, blocks Magic action |

## Attack & Damage

| Feature | Layer | Status | Notes |
|---------|-------|--------|-------|
| Attack rolls (melee / ranged) | Spec + Battle | Done | STR/DEX + proficiency + modifiers |
| Advantage / Disadvantage | Spec + Battle | Done | All sources tracked, any+any cancels |
| Critical hits | Spec + Battle | Done | Configurable crit range (Champion 19/18) |
| Damage types (13) | Spec | Done | Slashing, Piercing, Bludgeoning, Fire, Cold, Lightning, Thunder, Poison, Acid, Necrotic, Radiant, Force, Psychic |
| Resistance / Vulnerability / Immunity | Spec | Done | Per damage type, SRD ordering of application |
| Temp HP absorption | Spec | Done | Separate non-stacking pool, absorbed before HP |
| Extra Attack (1 / 2 / 3) | Spec + Battle | Done | Fighter progression + Warlock Thirsting/Devouring Blade |
| Finesse weapons | Spec + Battle | Done | Higher of STR/DEX |
| Heavy weapon penalty | Spec | Done | 5.2.1: STR 13 threshold (not size check) |
| Weapon Mastery (8 properties) | Content | Done | Cleave, Graze, Nick, Push, Sap, Slow, Topple, Vex |
| 33 weapons with mastery mappings | Content | Done | Simple + martial, melee + ranged |

## Conditions (14/14 + Exhaustion)

| Condition | Mechanical Effects | Status |
|-----------|-------------------|--------|
| Blinded | Disadv own attacks; attackers have adv | Done |
| Charmed | State flag (behavioral effects are caller/DM) | Done |
| Deafened | State flag (communication effects are caller/DM) | Done |
| Frightened | Disadv on attacks if source in LOS | Done |
| Grappled | Speed 0; tracked | Done |
| Incapacitated | Blocks actions/BA/reactions; 5 sources tracked | Done |
| Invisible | Adv own attacks; disadv against (ranged) | Done |
| Paralyzed | Incapacitated + attackers adv + auto-crit within 5ft | Done |
| Petrified | Incapacitated + resistance all damage + blocks poison | Done |
| Poisoned | Disadv attacks (blocked if petrified) | Done |
| Prone | Melee within 5ft adv; ranged/distant disadv; stand costs half speed | Done |
| Restrained | Disadv attacks; attackers adv; speed 0 | Done |
| Stunned | Incapacitated + attackers adv | Done |
| Unconscious | Incapacitated + prone + auto-crit within 5ft | Done |
| Exhaustion (6 levels) | 5.2.1: -2 per level to all d20 tests; L6 = death | Done |

## Health & Survival

| Feature | Layer | Status | Notes |
|---------|-------|--------|-------|
| HP tracking | Spec | Done | Current / max / effective max |
| Temporary HP | Spec | Done | Non-stacking, separate pool |
| Death saves (PC) | Spec + Battle | Done | 3 success/fail, nat 1 = 2 failures, nat 20 = revive at 1 HP |
| Stabilization | Spec | Done | Stable state + recovery |
| Monster instant death at 0 HP | Spec | Done | CreatureKind discriminator (PC vs Monster) |
| Massive damage instant death | Spec | Done | Remaining damage >= max HP |
| Healing | Spec + Battle | Done | Capped at effective max HP |
| Hit Dice (multi-class) | Spec | Done | Per-class die, spent on short rest |

## Spellcasting

| Feature | Layer | Status | Notes |
|---------|-------|--------|-------|
| Spell slots (levels 1-9) | Spec | Done | Per-class progression |
| Multiclass caster level calculation | Spec | Done | Full/half/third caster formula |
| Warlock Pact Magic | Spec | Done | Separate slots, short-rest recharge, level scaling |
| Concentration (start / break / save) | Spec + Battle | Done | DC = max(10, dmg/2), single spell, break on incapacitation |
| Concentration propagation on break | Battle | Done | Active effect removal chained |
| Counterspell | Battle | Done | Stack-based chaining (depth 2 cap), slot refund on counter |
| Save spells (single-target) | Battle | Done | Save DC, Evasion, Legendary Resistance interrupt |
| AoE spells (multi-target) | Battle | Done | Per-target save, sequential resolution |
| Bonus action spells | Battle | Done | One-slot-per-turn rule enforced (5.2.1) |
| Concentration spells (cast) | Battle | Done | Mandatory Counterspell window |
| Spell components (V/S/M) | Spec | Done | Grapple blocks somatic, silence blocks verbal |
| Ritual casting | Spec | Done | Caller skips slot expenditure (A10) |
| Spell save DC | Spec | Done | 8 + prof + ability mod |
| Spell attack bonus | Spec | Done | Prof + ability mod |
| 339 SRD spells (metadata) | Content | Done | Name, level, school, components, concentration, ritual, classes |
| Spell identity / prepared lists | — | Not done | Slots modeled; individual spell tracking deferred (TODO_FEATURES) |

## Reactions & Interrupts

| Reaction | Trigger | Layer | Status |
|----------|---------|-------|--------|
| Shield (+5 AC) | Attack hits | Battle | Done |
| Parry (+2-5 AC) | Attack hits | Battle | Done |
| Cutting Words (-Nd12 from roll) | Attack hits | Battle | Done |
| Uncanny Dodge (halve damage) | Attack damages | Battle | Done |
| Deflect Attacks (flat reduction) | Attack damages | Battle | Done |
| Hellish Rebuke (save-for-half) | Damage taken | Battle | Planned (PIAfterDamage facility done, reaction variant not wired) |
| Fire Shield (retaliation) | Damage taken | Battle | Planned (PIAfterDamage facility done, reaction variant not wired) |
| Retaliation attack | Damage taken | Battle | Planned (PIAfterDamage facility done, reaction variant not wired) |
| Counterspell (chain) | Spell being cast | Battle | Done |
| Legendary Resistance (flip save) | Save failed | Battle | Done |
| Opportunity Attack | Leaves reach | Battle | Done |
| Absorb Elements | — | — | Planned (F1) |
| Sentinel | — | — | Planned (F1) |
| War Caster | — | — | Planned (F1) |
| Silvery Barbs | — | — | Planned (F1) |

## Class Features (12 Classes)

### Fighter
| Feature | Layer | Status |
|---------|-------|--------|
| Second Wind (1d10 + level, scaling uses) | Spec + Battle | Done |
| Tactical Shift (L5: half-speed on Second Wind) | Spec | Done |
| Tactical Mind (L2: 1d10 to failed check) | Spec | Done |
| Action Surge (extra action, scaling uses) | Spec + Battle | Done |
| Indomitable (reroll save + fighter level bonus) | Spec | Done |
| Extra Attack (1/2/3 by level) | Spec + Battle | Done |
| 4 Fighting Styles | Content | Done |
| Champion: Improved/Superior Critical (19/18) | Content | Done |
| Champion: Remarkable Athlete, Heroic Warrior, Survivor | Content | Done |

### Barbarian
| Feature | Layer | Status |
|---------|-------|--------|
| Rage (BA enter, B/P/S resistance, scaling bonus) | Spec + Battle | Done |
| Rage maintenance (must attack/take damage) | Spec | Done |
| Persistent Rage (L15: no maintenance) | Spec | Done |
| Reckless Attack (adv attacks, adv against you) | Spec + Battle | Done |
| Brutal Strike (4 effects: forceful/hamstring/staggering/sundering) | Spec + Content | Done |
| Relentless Rage (CON save, escalating DC) | Spec | Done |
| Danger Sense (DEX save advantage) | Content | Deferred (F13) |
| Fast Movement (+10 ft) | Content | Done |
| Feral Instinct (initiative advantage) | Content | Done |
| Berserker subclass (Frenzy, Mindless Rage, Retaliation, Intimidating Presence) | Content | Done |

### Monk
| Feature | Layer | Status |
|---------|-------|--------|
| Focus Points (= level, restore on rest) | Spec | Done |
| Martial Arts (scaling d6-d12) | Spec + Content | Done |
| Flurry of Blows (1 FP, 2-3 strikes) | Spec | Done |
| Patient Defense (free disengage / 1 FP dodge + temp HP) | Spec | Done |
| Step of the Wind (free dash / 1 FP dash + disengage) | Spec | Done |
| Stunning Strike (1 FP, CON save or stunned) | Spec | Done |
| Wholeness of Body (heal from FP) | Spec | Done |
| Uncanny Metabolism (regain FP + heal on initiative) | Spec + Content | Done |
| Perfect Focus (L15: regain to 4 FP) | Spec + Content | Done |
| Evasion (DEX save: success = 0, fail = half) | Spec + Battle | Done |

### Paladin
| Feature | Layer | Status |
|---------|-------|--------|
| Lay on Hands (pool = 5 x level) | Spec | Done |
| Restoring Touch (L14: cure conditions from pool) | Content | Done |
| Divine Smite (2d8 + 1d8/slot, bonus vs Fiend/Undead) | Spec + Content | Done |
| Free Divine Smite (1/LR at L5+) | Spec | Done |
| Channel Divinity (scaling uses) | Spec | Done |
| Radiant Strikes (L11: +1d8 radiant) | Content | Done |
| Aura of Protection (L6: +CHA mod to saves) | Spec + Battle | Done |
| Aura of Courage (L10: frightened immunity in aura) | Content | Done (data); Deferred (battle wiring, F7) |
| Faithful Steed (L5: Find Steed 1/LR) | Content | Done |
| Oath of Devotion subclass | Content | Done |

### Rogue
| Feature | Layer | Status |
|---------|-------|--------|
| Sneak Attack (scaling d6, once/turn) | Spec + Battle | Done |
| Cunning Action (BA dash/disengage/hide) | Spec | Done |
| Steady Aim (BA, adv next attack, speed 0) | Spec | Done |
| Uncanny Dodge (reaction, halve damage) | Spec + Battle | Done |
| Cunning Strike (6 effects: poison/trip/withdraw/daze/knockOut/obscure) | Content | Done |
| Evasion | Spec + Battle | Done |
| Reliable Talent (L7: min 10 on proficient checks) | Content | Done |
| Slippery Mind (L15: WIS/CHA save proficiency) | Content | Done |
| Elusive (L18: no adv against you) | Content | Done (data); Deferred (battle wiring, F14) |
| Thief subclass | Content | Done |

### Cleric
| Feature | Layer | Status |
|---------|-------|--------|
| Channel Divinity (scaling uses) | Spec | Done |
| Turn Undead (action, WIS save) | Spec | Done (guard/charge); caller resolves effect |
| Divine Spark (scaling d8 heal/damage) | Content | Done |
| Blessed Strikes (Divine Strike / Potent Spellcasting) | Content | Done |
| Life Domain subclass (Disciple of Life, Preserve Life, Supreme Healing) | Content | Done |

### Druid
| Feature | Layer | Status |
|---------|-------|--------|
| Wild Shape (BA enter/exit, scaling charges) | Spec | Done |
| Wild Shape temp HP (= druid level, 5.2.1) | Spec | Done |
| Wild Resurgence (slot -> charge, charge -> slot) | Spec | Done |
| CR cap by level | Content | Done |
| Elemental Fury (Potent Spellcasting / Primal Strike) | Content | Done |
| Beast Spells (L18) | Content | Done |
| Archdruid (L20: Evergreen WS, Nature Magician) | Content | Done |
| Circle of the Land subclass | Content | Done |

### Sorcerer
| Feature | Layer | Status |
|---------|-------|--------|
| Sorcery Points (= level) | Spec | Done |
| Flexible Casting (SP <-> slots) | Spec | Done |
| Innate Sorcery (BA, +1 DC, adv spell attacks) | Spec + Content | Done |
| Sorcerous Restoration (L5: regain SP on SR) | Content | Done |
| Metamagic (10 options) | Spec (framework) + Content | Done |
| Arcane Apotheosis (L20: free metamagic/turn) | Content | Done |
| Draconic Sorcery subclass (Resilience, Affinity, Wings, Companion) | Content | Done |

### Warlock
| Feature | Layer | Status |
|---------|-------|--------|
| Pact Magic (short-rest slots, level scaling) | Spec | Done |
| Magical Cunning (L2: regain slots on SR) | Spec + Content | Done |
| Mystic Arcanum (L11-17: once/LR per spell level 6-9) | Spec | Done |
| Eldritch Smite (L5: pact slot force damage) | Spec + Content | Done |
| Eldritch Master (L20: regain all slots) | Content | Done |
| 10+ combat invocations | Content | Done |
| Fiend patron subclass | Content | Done |

### Wizard
| Feature | Layer | Status |
|---------|-------|--------|
| Arcane Recovery (SR: regain slots) | Spec | Done |
| Overchannel (L14: max spell damage) | Spec + Content | Done |
| Spell Mastery (L18: at-will L1+L2) | Content | Done |
| Signature Spells (L20: free L3 1/SR) | Content | Done |
| Evoker subclass (Sculpt Spells, Empowered Evocation, Potent Cantrip) | Content | Done |

### Ranger
| Feature | Layer | Status |
|---------|-------|--------|
| Favored Enemy (free Hunter's Mark uses, scaling) | Spec + Content | Done |
| Roving (L6: +10 ft, climb/swim = walk) | Content | Done |
| Tireless (L10: temp HP from uses) | Spec + Content | Done |
| Nature's Veil (L14: BA invisible) | Content | Done |
| Relentless Hunter (L13: unbreakable HM concentration) | Content | Done |
| Precise Hunter (L17: adv vs HM target) | Content | Done |
| Feral Senses (L18: blindsight 30ft) | Content | Done |
| Foe Slayer (L20: HM die d6 -> d10) | Content | Done |
| Hunter subclass (Lore, Prey, Tactics, Defense) | Content | Done |

### Bard
| Feature | Layer | Status |
|---------|-------|--------|
| Bardic Inspiration (scaling die, CHA mod uses) | Spec + Content | Done |
| Cutting Words (reaction, subtract die) | Spec + Battle | Done |
| Jack of All Trades (L2: +half prof non-proficient) | Content | Done |
| Font of Inspiration (L5: regain on SR) | Content | Done |
| Countercharm (L7: reroll Charmed/Frightened save) | Content | Done |
| Superior Inspiration (L18: regain 2 on initiative) | Content | Done |
| Peerless Skill (L14: inspiration die on own check) | Content | Done |
| College of Lore subclass | Content | Done |

## Monster / NPC Resources

| Feature | Layer | Status | Notes |
|---------|-------|--------|-------|
| Legendary Actions | Spec + Battle | Done | Per-turn resource, EOT window, cost tracking |
| Legendary Resistance | Spec + Battle | Done | Auto-succeed failed save, 1/turn, spends charge (C1 fix) |
| Recharge Abilities | Spec | Done | d6-based, roll at turn start |
| Daily Abilities | Spec | Done | Max/current uses |
| Multiattack | Spec | Done | Ordered slot list |
| Mid-combat roster changes (summons, reinforcements) | Battle | Done | Mutable creature set, caller-provided initiative (A33) |

## Armor & Equipment

| Feature | Layer | Status |
|---------|-------|--------|
| Light / Medium / Heavy armor | Spec | Done |
| DEX cap by armor weight | Spec | Done |
| Shield (+2 AC) | Spec | Done |
| Unarmored Defense (Monk: 10+DEX+WIS, Barbarian: 10+DEX+CON) | Spec | Done |
| Mage Armor (13+DEX) | Spec | Done |
| STR requirement (heavy armor speed penalty) | Spec | Done |
| Stealth disadvantage by armor | Spec | Done |
| Donning / Doffing | Spec | Done |

## Saving Throws & Ability Checks

| Feature | Layer | Status |
|---------|-------|--------|
| 6 ability saves with proficiency | Spec | Done |
| Advantage / disadvantage on saves | Spec | Done |
| Exhaustion penalty on saves | Spec | Done |
| Evasion (Rogue 7 / Monk 7) | Spec + Battle | Done |
| Aura of Protection (Paladin: +CHA to saves) | Spec + Battle | Done |
| 18 skills with ability mappings | Spec | Done |
| Proficiency levels (None / Half / Proficient / Expertise) | Spec | Done |
| Passive checks | Spec | Done |

## Environmental Rules

| Feature | Layer | Status | Notes |
|---------|-------|--------|-------|
| Falling (1d6/10ft, max 20d6, prone) | Spec | Done | `doApplyFall` action |
| Suffocation (breath duration, CON-based survival) | Spec | Done | Pure functions |
| Vision & Light (Bright/Dim/Dark -> obscurement) | Spec | Done | Darkvision negation, heavily obscured = blinded |
| Food & Water (starvation/dehydration exhaustion) | Spec | Done | Day-threshold tracking |
| Travel & Forced March (pace/DC) | Spec | Done | Fast/Normal/Slow + DC 10 + hours |
| Underwater combat (fire resistance, melee modifiers) | Spec | Done | AttackContext fields |
| Lava, weather, traps, etc. | — | Not modeled | DM agenda (A35) |

## Species Traits

| Feature | Layer | Status |
|---------|-------|--------|
| Dragonborn Breath Weapon (scaling d10) | Content | Done |
| Dragonborn Draconic Flight (L5+) | Content | Done |
| Orc Adrenaline Rush (temp HP) | Content | Done |
| Orc Relentless Endurance (drop to 1 HP) | Content | Done |
| Goliath Stone's Endurance (reduce damage) | Content | Done |
| Giant Ancestry (6 types) | Content | Done |
| Tiefling Legacy (3 types) | Content | Done |

## Rest Mechanics

| Feature | Layer | Status | Notes |
|---------|-------|--------|-------|
| Short Rest (Hit Dice, class resources) | Spec | Done | Fighter/Barbarian/Monk/Cleric/Druid/Paladin/Ranger/Warlock |
| Long Rest (full HP, -1 exhaustion, all slots, class resources) | Spec | Done | All 12 classes have LR handlers |

## Not Yet Implemented

| Feature | Status | Reference | Notes |
|---------|--------|-----------|-------|
| Remaining ~18 reaction types | Planned | F1 in PLAN_AUDIT | Absorb Elements, Sentinel, War Caster, Silvery Barbs, etc. |
| Grapple/Shove/TWF in battle flow | Planned | F9 | Modeled in creature spec; not wired into battle actions |
| Spell identity & prepared lists | Planned | TODO_FEATURES | Slots modeled; individual spell tracking deferred |
| Danger Sense (battle wiring) | Deferred | F13 | Data in content; not wired to save advantage in battle |
| Elusive (battle wiring) | Deferred | F14 | Data in content; not wired to attack advantage in battle |
| Aura of Courage (battle wiring) | Deferred | F7 | Data in content; not wired to condition immunity in battle |
| Cover in battle | Not planned | F8 | Requires spatial model; spec accepts cover as caller input |
| Subclass features in battle | Planned | F4 | Stunning Strike, Cunning Strike, Brutal Strike battle wiring |
| Time beyond turn economy | Out of scope | TODO_FEATURES | Separate orchestration module (A10) |
| Summoned creature stat blocks | Content layer | A36 | Roster mechanics done (A33); specific stat blocks are content |
| Environmental hazards (lava, traps, weather) | Not modeled | A35 | DM agenda — consequences modeled as caller inputs |

---

## Counts

| Metric | Value |
|--------|-------|
| Quint spec lines | ~6,000 (creature) + ~2,700 (battle) |
| Quint unit test lines | ~7,100 |
| Conditions | 14 + exhaustion |
| Damage types | 13 |
| SRD spells (metadata) | 339 |
| Classes (full level 1-20 progression) | 12 |
| SRD subclasses | 12 (one per class) |
| Weapons with mastery | 38 |
| Weapon mastery properties | 8 |
| Metamagic options | 10 |
| Battle actions | 36 |
| Creature actions | 108 |
| Spec pure functions | 238+ |
| Reaction types modeled in battle | 7 (3 more have facility, variant not wired) |
| Safety invariants | 49 (creature) + 13 (battle) |
| Species traits | 7+ (Dragonborn, Orc, Goliath, Tiefling) |
| Fighting Styles | 4 |
| QA corpus entries | ~12,700 |
