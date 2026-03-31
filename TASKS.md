# D&D 5e SRD 5.2.1 — Task Tracker

Master task list across all plan files. Each task has: status, dependencies, and origin plan.

**Legend:** TS = TypeScript pure functions only. Quint = Quint spec + MBT parity. Both = TS done, Quint done.

---

## Priority 1: Deepen Existing Quint Classes (combat features)

TS pure functions exist. Need Quint spec + MBT wiring to complete formal verification.

| Task | Description | Status | Deps | Origin |
|------|-------------|--------|------|--------|
| Divine Smite → Quint | Paladin smite: expend spell slot (BA cost), free 1/LR smite. | **done** | T61 (TS done) | [PLAN_NONCORE.md](PLAN_NONCORE.md#paladin) T61 |
| Cunning Action → Quint | Rogue BA: Dash/Disengage/Hide. Uses existing `pBonusActionDash`. | **done** | T31 (TS done), T06 | [PLAN_NONCORE.md](PLAN_NONCORE.md#rogue) T31 |
| Metamagic → Quint | 10 SP-consuming spell modifiers. High complexity (10 variants). | not done | T111 (TS done), T110 | [PLAN_NONCORE.md](PLAN_NONCORE.md#sorcerer) T111 |
| Rage damage/resistance → Quint | `rageDamageBonus`, `RAGE_RESISTANCE_TYPES`, `rageResistances` pure fns. | **done** | T10 (TS done, partial Quint) | [PLAN_NONCORE.md](PLAN_NONCORE.md#barbarian) T10 |
| Pact Magic SR recovery | Warlock pact slots recover on Short Rest. `pRestorePactSlots` in Quint `doShortRest`, `computeShortRest` in TS. | **done** | T120 (TS done) | [PLAN_NONCORE.md](PLAN_NONCORE.md#warlock) T120 |
| Wild Shape temp HP | SRD 5.2.1: NO separate beast HP pool — druid retains HP, gains temp HP = druid level on enter. 1-line fix: `pGrantTempHp(state, druidLevel, false)` in `doEnterWildShape` + TS parity. TS `class-druid.ts` has orphaned 5.1-style beast HP functions (never wired to DndContext). | not done | T100 (TS done) | [PLAN_NONCORE.md](PLAN_NONCORE.md#druid) T100 |
| Sorcerous Restoration → Quint | L5+ SR: regain floor(level/2) SP. Once per LR. Integrated into `pSorcererShortRest`. | **done** | T110 (TS done) | [PLAN_NONCORE.md](PLAN_NONCORE.md#sorcerer) T110 |
| Innate Sorcery → Quint | L1 BA toggle, 10-round duration, 2/LR + Sorcery Incarnate L7+ SP cost. | **done** | T110 (TS done) | [PLAN_NONCORE.md](PLAN_NONCORE.md#sorcerer) T110 |

## Priority 2: Widen Class Coverage (Quint actions for existing TS features)

Lower combat frequency but fill MBT gaps.

| Task | Description | Status | Deps | Origin |
|------|-------------|--------|------|--------|
| Uncanny Dodge → Quint | Rogue reaction: consume reaction (halving caller-managed). First reaction pattern. | **done** | T32 (TS done) | [PLAN_NONCORE.md](PLAN_NONCORE.md#rogue) T32 |
| Cunning Strike → Quint | L5+ mark action, int count (max 1 at L5, 2 at L11+). Effect details caller-managed. | **done** | T30 (TS done) | [PLAN_NONCORE.md](PLAN_NONCORE.md#rogue) T30 |
| Wild Resurgence → Quint | Druid L5+: slot→charge + charge→L1 slot (1/LR). Two actions. | **done** | T100 (TS done) | [PLAN_NONCORE.md](PLAN_NONCORE.md#druid) T100 |
| Turn Undead / Divine Spark → Quint | Both use existing CD charge action. Effects caller-managed. | **done** | T90 (TS done) | [PLAN_NONCORE.md](PLAN_NONCORE.md#cleric) T90 |
| Abjure Foes / Sacred Weapon → Quint | Paladin CD options. | not done | T63 (TS done) | [PLAN_NONCORE.md](PLAN_NONCORE.md#paladin) T63 |
| Overchannel → Quint | Wizard L14+: uses counter, LR reset. Damage caller-managed. | **done** | T131 (TS done) | [PLAN_NONCORE.md](PLAN_NONCORE.md#wizard) T131 |
| Eldritch Smite → Quint | Warlock L5+: pact slot expenditure + once/turn flag. | **done** | T121 (TS done) | [PLAN_NONCORE.md](PLAN_NONCORE.md#warlock) T121 |
| Brutal Strike → Quint | Barbarian L9+: once/turn flag, reckless gated. | **done** | T11 (TS done) | [PLAN_NONCORE.md](PLAN_NONCORE.md#barbarian) T11 |
| Relentless Rage → Quint | Barbarian L11+: CON save → HP=2×level. DC 10+5n, SR/LR reset. | **done** | T12 (TS done) | [PLAN_NONCORE.md](PLAN_NONCORE.md#barbarian) T12 |

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
| Reaction pattern validation | Uncanny Dodge established the pattern (`pUseReaction` + `reactionAvailable` gate). | **done** | none | [PLAN_CLEANUP.md](PLAN_CLEANUP.md) P1 |
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
| Barbarian | Rage, Reckless Attack, Intimidating Presence, Rage damage/resistance, Brutal Strike, Relentless Rage | machine-barbarian.ts |
| Monk | Focus Pool, Flurry/Patient Defense/Step of Wind, Stunning Strike, Wholeness of Body, Uncanny Metabolism | machine-monk.ts |
| Wizard | Arcane Recovery, Overchannel | machine-wizard.ts |
| Rogue | Sneak Attack, Steady Aim, Cunning Action, Uncanny Dodge, Cunning Strike | machine-rogue.ts |
| Cleric | Channel Divinity (Turn Undead / Divine Spark via CD charge) | machine-cleric.ts |
| Paladin | Lay on Hands, Channel Divinity, Divine Smite (slot + free 1/LR, BA cost) | machine-paladin.ts |
| Warlock | Magical Cunning, Mystic Arcanum, Eldritch Smite | machine-warlock.ts |
| Sorcerer | Font of Magic, Innate Sorcery (10-round duration, 2/LR + Incarnate), Sorcerous Restoration (L5+ SR) | machine-sorcerer.ts |
| Druid | Wild Shape enter/exit, Wild Resurgence (slot↔charge) | machine-druid.ts |

### TS Feature Files (all classes + shared)
All 12 SRD classes have complete TS pure function implementations in `app/src/features/class-*.ts`. Species traits, weapon mastery, feats, and ~200 spells also implemented.
