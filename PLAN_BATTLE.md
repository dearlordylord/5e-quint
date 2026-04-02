# D&D 5e SRD 5.2.1 — Battle Layer Plan

**Edition: SRD 5.2.1 (2024).**

Multi-creature battle state. Composes on top of the single-creature spec (`creature.qnt`) and its TS implementation. Requirements, domain language, and architecture options live in `battle/`.

**SRD parity:** same rule as the core spec — every modeled rule must trace to a specific SRD passage. No homebrew. Modeling decisions documented in `ASSUMPTIONS.md`.

> **NOTE — Suggestive, not prescriptive.** Same convention as other plans — task descriptions communicate intent and scope, implementer decides actual Quint design.

## Reference

| Doc | Contents |
|-----|----------|
| `battle/REQUIREMENTS.md` | SRD-derived facts with source references |
| `battle/DOMAIN.md` | Battle-layer terminology and transaction shapes |
| `battle/OPTIONS.md` | Architecture options (layered arch, interrupt model, MBT strategy) |
| `battle.qnt` | Battle spec (Quint) — iterating from spike |
| `creature.qnt` | Single-creature spec (Quint) — used as library |

## Architecture (agreed direction)

```
DISTANCE CONCERN (future / optional)
  └── caller-provided feet (O2)

BATTLE MACHINE (battle.qnt + TS battle machine)
  └── creatures: Map[CreatureId, Combatant]
  └── initiative, turn cycling, round counting
  └── cross-creature transactions with interrupt points
  └── BattlePhase state machine: BPActiveTurn ↔ BPAwaitingReaction

CREATURE MACHINES (creature.qnt + existing TS machine)
  └── single-creature state, composed via pure functions
```

## Completed

```
[B0] Spike — battle.qnt                                           ✓ done
[B1] Multi-reactor interrupt (P1)                                  ✓ done
[B2] Save transactions (P1)                                        ✓ done
[B3] AoE / 1-to-many (P1)                                          ✓ done
  New BPResolvingAoE phase processes targets one by one.
  Per-target save rolls (nondeterministic at resolution time).
  Per-target LR interrupt via PISaveFailedAoE with AoE continuation.
  Counterspell interrupt at cast time (reuses PISpellCast + PCEAoE).
  mkSaveFailedCtx helper deduplicates SaveFailedCtx construction.
  Removed tautological offeredAreValid invariant.
[B4] Concentration links (P1)                                      ✓ done
  ActiveEffect gained casterId field in creature.qnt.
  breakConcentrationAndPropagate removes effects from all creatures.
  bCastConcentrationSpell + bConcentrationCheck actions.
[B5] Counterspell chain (P2)                                        ✓ done
  Stack-based chain: bSpellStack tracks interrupted spell contexts.
  PCECounterspell(CounterspellEffect) — flat type, no recursive cycle.
  eligibleForCounterspell gates on level 3+ spell slot.
  Slot expenditure on Counterspell cast (nondet level 3–9).
  returnToCSWindow recomputes eligible after chain (reactions spent).
  resolveSpellEntry helper for terminal spell resolution.
[B6] Retroactive reactions (P2)                                     ✓ done
  RParry(int) covers +2/+3/+4/+5 AC variants (R10.1).
  RCuttingWords(int) subtracts from attack roll (Bardic Inspiration die).
  Unified retroactive pattern: compute modified atk, flag isRetroactive, single branch.
[B7] Damage reduction reactions (P2)                                ✓ done
  RDamageReduction(int) covers Deflect Attacks, Storm Giant Deflect (R10.3).
  Unified damage-reduction pattern alongside RUncannyDodge.
[B8] After-damage reactions (P2)                                    ✓ done
  New TDamageTaken trigger, PIAfterDamage(AfterDamageCtx) interrupt.
  AfterDamageReturn type breaks BattlePhase↔PendingInterrupt cycle.
  dealDamageWithAfterReactions helper at attack + AoE damage sites.
  RHellishRebuke(HellishRebukeCtx) — fire damage back, DEX save for half.
  RRetaliation(RetaliationCtx) — melee attack back at damage source.
  Chain: Hellish Rebuke damage can trigger Retaliation (bounded by reactions).
[B9] Movement reactions / OA (P2)                                   ✓ done
  New bMove action with caller-provided threatenedBy set (O2).
  BPResolvingMovement(MovementCtx) processes OAs one by one.
  ROpportunityAttack(OACtx) enters full R20 attack chain.
  atkReturnTo field in AttackHitCtx/AttackDamageCtx threads return context.
  Disengage check skips OA entirely.
[B10] Legendary Actions (P2)                                        ✓ done
  MonsterResourceState added to Combatant type.
  mkMonster helper creates monster with LA + LR counts.
  BPAwaitingLegendaryAction(LAWindowCtx) phase at end of turn.
  bEndTurn checks for LA-eligible monsters before advancing.
  bStartTurn refreshes LA for monsters.
  LAAttack deals damage (simplified — no interrupt chain for LA attacks).
[B11] Class levels in Combatant (P3)                                  ✓ done
  Flat rogueLevel/monkLevel fields on Combatant (not full ClassStateMap).
  eligibleForUncannyDodge (rogue 5+), eligibleForDeflect (monk 3+).
  Reactions gated on class level in bResolveDmgReaction.
[B12] StatBlock in Combatant (P3)                                     ✓ done
  StatBlock wired into Combatant, mkMonster takes StatBlock param.
  bStartTurn reads real LA uses + inLair from stat block.
  Recharge rolls via pProcessRechargeRolls for unavailable abilities.
  EMPTY_STAT_BLOCK + TEST_MONSTER_STAT_BLOCK constants.
[B13] Full start/end turn (P3)                                        ✓ done
  bStartTurn: decrement durations, clear AtStartOfTurn, process effects
    via pProcessStartOfTurn, propagate concentration breaks.
  bEndTurn: end-of-turn saves/damage via pEndTurn orchestrator,
    propagate concentration breaks, then check LA window.
  applyFailEffects returns {creatures, phase} — save damage triggers
    after-damage reactions via dealDamageWithAfterReactions.
  resolveSave threaded with returnTo: AfterDamageReturn.
  propagateIfConcBroken helper deduplicates conc break pattern.
```

**[B0] Spike** *(done)*
2 creatures, attack with Shield/Uncanny Dodge reaction interrupts, heal, initiative cycling. 4 invariants verified. Composes `creature.qnt` pure functions. See comment block at top of `battle.qnt` for documented simplifications.

---

## Task DAG

### Phase 1: Core Transaction Model

Flesh out the battle spec to handle all major transaction shapes. Each task is a diff on `battle.qnt`.

```
[B1] Multi-reactor interrupt (P1) -> deps: [B0]          ✓ done
[B2] Save transactions (P1) -> deps: [B0]                ✓ done
[B3] AoE / 1-to-many (P1) -> deps: [B2]                  ✓ done
[B4] Concentration links (P1) -> deps: [B0]               ✓ done
[B5] Counterspell chain (P2) -> deps: [B2]                ✓ done
```

**[B1] Multi-reactor interrupt**
Current spike only checks the target for reactions. Full version: at each interrupt point, build an `eligible: Set[CreatureId]` of all creatures who can react to this trigger (target, bystander Paladin, Bard with Cutting Words, etc.). Iterate through eligible set — each creature reacts or passes. Active player decides order (R4). After all have decided, apply result and advance.
- Ref: R30.1 (multiple reactors at one interrupt point)
- Change: add `eligible` and `offered` fields to `AwaitCtx`. `bResolveHitReaction` loops until all eligible have been offered.
- Test: 3-creature battle — A attacks B, Paladin C uses Protection reaction on B's behalf.

**[B2] Save transactions**
New transaction shape: caster forces save on target. Caster's spell save DC is caller-provided (like AC). Target rolls save (pre-resolved). Fail → effect applied. Save-specific interrupt points: Counterspell on cast, Countercharm / Legendary Resistance on failed save.
- Ref: R31 (saving throw transactions)
- New types: `PISaveFailed(SaveCtx)`, `bCastSaveSpell` action
- Test: A casts Hold Person on B. B fails WIS save → paralyzed. B succeeds → no effect.

**[B3] AoE / 1-to-many transactions**
Caster takes one action, multiple targets each save and take damage independently. The set of affected creatures is caller-provided (spatial concern). Each target's damage may trigger independent reactions.
- Ref: R32 (area of effect)
- Deps: B2 (save transaction mechanics needed for AoE saves)
- New: `bCastAoE` action that takes `targets: Set[CreatureId]` and applies per-target.
- Test: A casts Fireball hitting B, C. B fails DEX save (full damage), C succeeds (half). B reacts with Absorb Elements.

**[B4] Concentration links**
Track which creature cast an effect on which target(s). When caster's concentration breaks, propagate: remove effects from all targets. Requires `casterId` field on `ActiveEffect` (or a separate link registry in battle state).
- Ref: R33 (concentration links)
- Change to `creature.qnt`: add `casterId: str` to `ActiveEffect` type (default "" for self-effects)
- New battle action: `bBreakConcentration(casterId)` → finds all creatures with effects from that caster → removes them
- Test: A concentrates on Bless targeting B and C. A takes damage, fails CON save → concentration breaks → Bless removed from both B and C.

**[B5] Counterspell chain**
When a creature casts a spell (including Counterspell), others can Counterspell it. This creates a recursive reaction stack bounded by the number of creatures with unused reactions and Counterspell prepared.
- Ref: R3 (reaction nesting), R10.2 (Counterspell), R21 (spell cast interrupt point)
- Deps: B2 (save transactions — Counterspell forces a CON save in 5.2.1)
- New: `PISpellCast(SpellCastCtx)` interrupt variant. Counterspell response is itself a spell cast → re-enters the interrupt with remaining eligible reactors.
- Test: A casts Fireball. B Counterspells. C Counterspells B's Counterspell. Fireball resolves (B's Counterspell was countered).

### Phase 2: Reaction Catalog

Expand the reaction set from 2 to full SRD catalog.

```
[B6] Retroactive reactions (P2) -> deps: [B1]          ✓ done
[B7] Damage reduction reactions (P2) -> deps: [B1]     ✓ done
[B8] After-damage reactions (P2) -> deps: [B1]         ✓ done
[B9] Movement reactions / OA (P2) -> deps: [B0]        ✓ done
[B10] Legendary Actions (P2) -> deps: [B0]             ✓ done
```

**[B6] Retroactive reactions** — Parry (×4 monsters), Cutting Words, Shield Guardian Protection, Mummy Whirlwind. All use the same `PIAttackHit` interrupt point, just different AC modifiers. Ref: R10.1.

**[B7] Damage reduction reactions** — Deflect Attacks (Monk), Superior Hunter's Defense (Ranger), Storm Giant Deflect Missile, Familiar Resistance. All use `PIAttackDamage` interrupt. Ref: R10.3.

**[B8] After-damage reactions** — Hellish Rebuke, Retaliation, Split. These trigger AFTER damage is applied (new interrupt point `PIAfterDamage`). Hellish Rebuke deals damage back → may trigger more reactions. Ref: R10.4.

**[B9] Movement reactions / OA** — Opportunity Attack triggers on `LEAVES_REACH`. OA is itself an attack → feeds into the full attack interrupt chain. New `bMove` action with per-creature OA checks. Ref: R5, R22.

**[B10] Legendary Actions** — Monster acts at end of another creature's turn. Not a reaction (separate resource). New interrupt point at end of each non-monster turn. Ref: R7.

### Phase 3: Full Combatant

```
[B11] Class levels in Combatant (P3) -> deps: [B1]       ✓ done
[B12] StatBlock in Combatant (P3) -> deps: [B10]         ✓ done
[B13] Full start/end turn (P3) -> deps: [B4, B10]        ✓ done
```

**[B11] Class levels in Combatant** — Flat per-class level fields (rogueLevel, monkLevel) on Combatant. Reactions gated on class level: Uncanny Dodge requires rogue 5+, Deflect Attacks requires monk 3+. Eligibility helpers: `eligibleForUncannyDodge`, `eligibleForDeflect`.

**[B12] StatBlock in Combatant** — `StatBlock` wired into Combatant. `mkMonster` takes StatBlock param. `bStartTurn` reads real `legendaryActionUses`, `inLair` from stat block. Recharge rolls via `pProcessRechargeRolls`.

**[B13] Full start/end turn** — `bStartTurn`: duration decrement, `AtStartOfTurn` expiry, start-of-turn effects via `pProcessStartOfTurn`, concentration break propagation. `bEndTurn`: end-of-turn saves/damage via `pEndTurn` orchestrator, `AtEndOfTurn` expiry, concentration break propagation. `applyFailEffects` threaded through `dealDamageWithAfterReactions` so save-spell damage triggers after-damage reactions.

### Phase 4: MBT Bridge

```
[B14] Per-creature projection MBT (P2) -> deps: [B13]
[B15] Battle-level XState machine (P3) -> deps: [B14]
```

**[B14] Per-creature projection MBT** — Project battle traces per-creature, replay against existing creature XState machines. Validates that the battle spec's per-creature effects match existing creature machine behavior. Ref: O4.1.B.

**[B15] Battle-level XState machine** — Full battle XState machine (possibly using XState actor model). Battle-level MBT parity with `battle.qnt`. Ref: O4.1.A.
