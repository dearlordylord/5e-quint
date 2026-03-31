# D&D 5e SRD 5.2.1 — Task Tracker

Master task list across all plan files. Each task has: status, dependencies, and origin plan.

**Legend:** TS = TypeScript pure functions only. Quint = Quint spec + MBT parity. Both = TS done, Quint done.

---

## Priority 1: Deepen Existing Quint Classes (combat features)

TS pure functions exist. Need Quint spec + MBT wiring to complete formal verification.

| Task | Description | Status | Deps | Origin |
|------|-------------|--------|------|--------|
| Divine Smite → Quint | Paladin smite: expend spell slot + extra Radiant damage. Most common damage modifier. | not done | T61 (TS done) | [PLAN_NONCORE.md](PLAN_NONCORE.md#paladin) T61 |
| Cunning Action → Quint | Rogue BA: Dash/Disengage/Hide. Uses existing `pBonusActionDash`. | not done | T31 (TS done), T06 | [PLAN_NONCORE.md](PLAN_NONCORE.md#rogue) T31 |
| Metamagic → Quint | 10 SP-consuming spell modifiers. High complexity (10 variants). | not done | T111 (TS done), T110 | [PLAN_NONCORE.md](PLAN_NONCORE.md#sorcerer) T111 |
| Rage damage/resistance → Quint | Rage toggle modeled but bonus damage + B/P/S resistance not in Quint. | not done | T10 (TS done, partial Quint) | [PLAN_NONCORE.md](PLAN_NONCORE.md#barbarian) T10 |
| Pact Magic SR recovery | Warlock pact slots recover on Short Rest. Structural — pact slots in shared `SpellSlotState`. | not done | T120 (TS done) | [PLAN_NONCORE.md](PLAN_NONCORE.md#warlock) T120 |
| Wild Shape temp HP | Beast form HP pool. Touches `CreatureState.tempHp`. | not done | T100 (TS done) | [PLAN_NONCORE.md](PLAN_NONCORE.md#druid) T100 |
| Sorcerous Restoration → Quint | L5+ SR: regain floor(level/2) SP. Once per LR. | not done | T110 (TS done) | [PLAN_NONCORE.md](PLAN_NONCORE.md#sorcerer) T110 |
| Innate Sorcery → Quint | L1 BA toggle: +1 spell DC, advantage on concentration checks. 2 uses/LR. | not done | T110 (TS done) | [PLAN_NONCORE.md](PLAN_NONCORE.md#sorcerer) T110 |

## Priority 2: Widen Class Coverage (Quint actions for existing TS features)

Lower combat frequency but fill MBT gaps.

| Task | Description | Status | Deps | Origin |
|------|-------------|--------|------|--------|
| Uncanny Dodge → Quint | Rogue reaction: halve attack damage. First reaction pattern in Quint. | not done | T32 (TS done) | [PLAN_NONCORE.md](PLAN_NONCORE.md#rogue) T32 |
| Cunning Strike effects → Quint | Poison/Trip/Withdraw on SA hit (L5+). Forfeits SA dice. | not done | T30 (TS done) | [PLAN_NONCORE.md](PLAN_NONCORE.md#rogue) T30 |
| Wild Resurgence → Quint | Druid L5+: slot for WS charge, or WS charge for slot. | not done | T100 (TS done) | [PLAN_NONCORE.md](PLAN_NONCORE.md#druid) T100 |
| Turn Undead / Divine Spark → Quint | Cleric CD options. | not done | T90 (TS done) | [PLAN_NONCORE.md](PLAN_NONCORE.md#cleric) T90 |
| Abjure Foes / Sacred Weapon → Quint | Paladin CD options. | not done | T63 (TS done) | [PLAN_NONCORE.md](PLAN_NONCORE.md#paladin) T63 |
| Overchannel → Quint | Wizard L14+: max damage, escalating necrotic self-damage. | not done | T131 (TS done) | [PLAN_NONCORE.md](PLAN_NONCORE.md#wizard) T131 |
| Eldritch Smite → Quint | Warlock invocation: pact weapon hit + pact slot → Force damage. | not done | T121 (TS done) | [PLAN_NONCORE.md](PLAN_NONCORE.md#warlock) T121 |
| Brutal Strike → Quint | Barbarian L9+: forgo Reckless advantage for +1d10 + effect. | not done | T11 (TS done) | [PLAN_NONCORE.md](PLAN_NONCORE.md#barbarian) T11 |
| Relentless Rage → Quint | Barbarian: CON save to stay at 1 HP. Escalating DC. | not done | T12 (TS done) | [PLAN_NONCORE.md](PLAN_NONCORE.md#barbarian) T12 |

## Priority 3: Prep + Integrate Ranger & Bard

Need full prep first (Quint type, state var, frame conditions on ~70 actions, lifecycle, MBT schema).

| Task | Description | Status | Deps | Origin |
|------|-------------|--------|------|--------|
| Ranger Quint prep | Add RangerState type, state var, frame conditions, lifecycle, MBT schema. | not done | none | [PLAN_CLEANUP.md](PLAN_CLEANUP.md) H |
| Ranger: Favored Enemy / Hunter's Prey → Quint | Hunter's Mark free casts + Hunter's Prey options. | not done | Ranger prep, T70-T71 (TS done) | [PLAN_NONCORE.md](PLAN_NONCORE.md#ranger) T70-T71 |
| Bard Quint prep | Add BardState type, state var, frame conditions, lifecycle, MBT schema. | not done | none | [PLAN_CLEANUP.md](PLAN_CLEANUP.md) H |
| Bard: Bardic Inspiration → Quint | Inspiration die pool. CHA mod charges, d6/d8/d10/d12 scaling. | not done | Bard prep, T80 (TS done) | [PLAN_NONCORE.md](PLAN_NONCORE.md#bard) T80 |

## Priority 4: Cross-Cutting & Infrastructure

| Task | Description | Status | Deps | Origin |
|------|-------------|--------|------|--------|
| Reaction pattern validation | No reaction is in Quint yet. Uncanny Dodge would be first. | not done | none | [PLAN_CLEANUP.md](PLAN_CLEANUP.md) P1 |
| Integration bug: smiteFreeUsed reset | Paladin feature-store missing START_TURN reset. | not done | none | [PLAN_NONCORE.md](PLAN_NONCORE.md#known-integration-layer-issues) #1 |
| Integration bug: intimidatingPresenceDC | Hardcoded to 0. Needs real strMod/profBonus. | not done | none | [PLAN_NONCORE.md](PLAN_NONCORE.md#known-integration-layer-issues) #4 |
| Integration bug: rogueLevel unused param | `canExecuteSneakAttack` accepts but doesn't use rogueLevel. | not done | none | [PLAN_NONCORE.md](PLAN_NONCORE.md#known-integration-layer-issues) #2 |
| Integration bug: NOTIFY_START_TURN sentinel | Fragile no-op dispatch pattern in bridge files. | not done | none | [PLAN_NONCORE.md](PLAN_NONCORE.md#known-integration-layer-issues) #3 |
| Integration bug: useFeatures.test.tsx jsdom | Test file fails with ERR_MODULE_NOT_FOUND. | not done | none | [PLAN_NONCORE.md](PLAN_NONCORE.md#known-integration-layer-issues) #5 |

## Priority 5: Species Traits → Quint

TS done. Could add to Quint for MBT verification if species state is tracked.

| Task | Description | Status | Deps | Origin |
|------|-------------|--------|------|--------|
| T140: Combat Species Traits | Orc Relentless Endurance, Dragonborn Breath, Goliath Giant Ancestry. | done (TS) | T01 | [PLAN_NONCORE.md](PLAN_NONCORE.md#species-traits) T140 |
| T141: Species Save/Resistance Modifiers | Dwarven Resilience, Gnome Cunning, Halfling Brave, etc. | done (TS) | T01 | [PLAN_NONCORE.md](PLAN_NONCORE.md#species-traits) T141 |

## Priority 6: Spells

All TS done. Spells compose core primitives caller-side — Quint modeling optional.

| Task | Description | Status | Deps | Origin |
|------|-------------|--------|------|--------|
| T150-T161 | All spell effect categories (~200 spells modeled). | done (TS) | T08 | [PLAN_NONCORE.md](PLAN_NONCORE.md#spell-effects) |
| T165: Non-Combat Spells | ~160 utility/summon spells. | not done | T150 | [PLAN_NONCORE.md](PLAN_NONCORE.md#non-combat-spells-future) T165 |

---

## Completed (reference)

### Core Mechanics (PLAN.md) — ALL DONE
d20 resolution, conditions, exhaustion, action economy, damage/healing/temp HP, death saves, spell slots, concentration, active effects, turn lifecycle, grapple, shove, environmental hazards, movement, bonus movement, monsters (legendary actions/resistance, recharge, X/day).

### Quint + MBT Class Integration (all 10 classes)
| Class | Quint Features | machine-*.ts |
|-------|---------------|--------------|
| Fighter | Second Wind, Action Surge, Indomitable, Tactical Mind, Score Critical Hit | machine-fighter (inline in machine.ts) |
| Barbarian | Rage, Reckless Attack, Intimidating Presence | machine-barbarian.ts |
| Monk | Focus Pool, Flurry/Patient Defense/Step of Wind, Stunning Strike, Wholeness of Body, Uncanny Metabolism | machine-monk.ts |
| Wizard | Arcane Recovery | machine-wizard.ts |
| Rogue | Sneak Attack, Steady Aim (with movement guard) | machine-rogue.ts |
| Cleric | Channel Divinity (L2/L6/L18 scaling, SR+1) | machine-cleric.ts |
| Paladin | Lay on Hands, Channel Divinity (L3/L11 scaling, SR+1) | machine-paladin.ts |
| Warlock | Magical Cunning (LR only), Mystic Arcanum (L11+) | machine-warlock.ts |
| Sorcerer | Font of Magic (slot→points, points→slot) | machine-sorcerer.ts |
| Druid | Wild Shape enter/exit (L2/L6/L17 scaling, SR+1) | machine-druid.ts |

### TS Feature Files (all classes + shared)
All 12 SRD classes have complete TS pure function implementations in `app/src/features/class-*.ts`. Species traits, weapon mastery, feats, and ~200 spells also implemented.
