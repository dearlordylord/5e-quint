# PRD 4: Attack Type Awareness, Advantage Aggregation, and Sneak Attack

## Problem Statement

The battle spec (`battle.qnt`) has three gaps that compound:

1. **No melee/ranged distinction.** Attack actions generate abstract parameters (`damage`, `damageType`, `attackRoll`) with no concept of attack type. This means `meleeDamageBonus` (rage) applies to all attacks (bug D1), Knock Out is offered for ranged attacks (bug in C5), and Sneak Attack eligibility can't be checked (requires "finesse or ranged weapon").

2. **No advantage aggregation in battle.** `creature.qnt` has full advantage infrastructure (`AttackContext`, `pAggregateAttackMods`, `resolveAdvantage`) with 14+ advantage and 14+ disadvantage sources. `battle.qnt` doesn't use any of it. Attack rolls arrive as raw `1.to(20).oneOf()`. The `recklessThisTurn` flag is tracked but never feeds into advantage. The spec cannot prove that condition-based advantage/disadvantage works correctly in multi-creature combat.

3. **No Sneak Attack.** SA is one of the highest-impact class features in combat — a Rogue's primary damage source. It requires advantage awareness, weapon type awareness, spatial awareness (ally adjacency), and once-per-turn tracking. All three gaps must be closed before SA can be modeled.

These are not independent features — they form a pipeline: attack type feeds advantage aggregation (ranged penalties, Prone interaction), advantage aggregation feeds SA eligibility, SA feeds the damage pipeline.

## Solution

Wire the existing `creature.qnt` advantage infrastructure into `battle.qnt`'s attack resolution, add attack type parameters, and implement Sneak Attack as the first consumer that exercises the full pipeline.

1. **Add `isMelee: bool` and `isFinesse: bool`** as per-attack nondeterministic parameters. Gate `meleeDamageBonus` and `knockOut` on `isMelee`. These are caller-provided facts about the weapon and attack context.

2. **Build `AttackContext` at attack time** from the attacker's and target's conditions on `Combatant`, plus caller-provided spatial/positional booleans. Call `pAggregateAttackMods` to compute `FullAttackMods { hasAdvantage, hasDisadvantage, autoCrit, autoMiss }`.

3. **Use `FullAttackMods`** in `resolveAttack`: `hasAdvantage`/`hasDisadvantage` inform SA eligibility and are available for future consumers; `autoCrit` overrides the crit check; `autoMiss` forces a miss. `recklessThisTurn` becomes a functional advantage source instead of dead state.

4. **Add Sneak Attack** as a spec-owned eligibility check + damage modifier. `sneakAttackDice: int` and `sneakAttackUsedThisTurn: bool` on `Combatant`. The spec computes eligibility from advantage, weapon type, and ally adjacency; adds SA damage to the base; enforces once-per-turn.

## User Stories

1. As a Rogue with Advantage on an attack, I want extra Sneak Attack damage added automatically, so that SA triggers per RAW when I have Advantage.
2. As a Rogue without Advantage but with an ally adjacent to my target, I want SA to trigger, so that the ally-adjacency path works per RAW.
3. As a Rogue who already used SA this turn, I want the spec to prevent a second SA, so that the once-per-turn rule is enforced.
4. As a Rogue attacking with a non-finesse melee weapon, I want SA to NOT trigger, so that the weapon restriction is enforced.
5. As a Rogue attacking with a ranged weapon, I want SA to trigger (if eligible), so that ranged SA works per RAW.
6. As a Blinded creature attacking, I want Disadvantage on my attack roll, so that condition-based disadvantage is proven correct in multi-creature combat.
7. As a creature attacking a Prone target within 5 feet, I want Advantage, so that Prone's melee interaction is modeled.
8. As a creature attacking a Prone target beyond 5 feet, I want Disadvantage, so that Prone's ranged interaction is modeled.
9. As a creature attacking a Stunned/Paralyzed/Unconscious target within 5 feet, I want auto-crit on hit, so that condition-based auto-crit works in battle.
10. As a Barbarian with Reckless Attack declared, I want Advantage on my STR-based melee attacks, so that `recklessThisTurn` actually does something.
11. As an enemy of a Reckless Barbarian, I want Advantage on attacks against them, so that the Reckless trade-off is enforced.
12. As a creature making a ranged attack within 5 feet of a hostile, I want Disadvantage, so that close-quarters ranged penalty works.
13. As a creature making a ranged attack at a Dodging target, I want Disadvantage, so that the Dodge action's effect is proven in the attack pipeline.
14. As a Barbarian raging and attacking at range, I want `meleeDamageBonus` to NOT apply, so that rage damage is correctly gated on melee (fixing D1).
15. As a creature making a ranged attack that reduces a target to 0 HP, I want Knock Out to NOT be offered, so that the melee-only restriction is enforced.
16. As an MBT test, I want advantage/disadvantage to be computed identically in Quint and XState from creature conditions, so that the advantage pipeline has parity.
17. As a spec maintainer, I want future advantage sources (e.g., Faerie Fire, Greater Invisibility) to plug into the existing `AttackContext` without restructuring the pipeline.
18. As a spec maintainer, I want future damage modifiers (e.g., Divine Smite, Brutal Strike) to follow the same pattern as SA: eligibility check + damage addition in `resolveAttack`.

## Implementation Decisions

### Per-attack parameters added to attack actions

Three new nondeterministic parameters on every attack action (`bAttack`, `bMovementOAAttack`, `bLegendaryAttack`, `bReadyRelease`):

- `isMelee: bool` — is this a melee attack? Nondeterministic in Quint (tests both paths). TS computed from weapon + context (Thrown weapons can make ranged attacks).
- `isFinesse: bool` — does the weapon have the Finesse property? Nondeterministic in Quint. TS computed from weapon data.
- `hasAllyAdjacentToTarget: bool` — is a non-incapacitated ally of the attacker within 5 feet of the target? Spatial fact, caller-provided. Nondeterministic in Quint.

OA attacks (`bMovementOAAttack`) are always melee per RAW — `isMelee` is hardcoded `true`, not nondeterministic.

### Per-attack spatial/positional parameters for AttackContext

These are nondeterministic in Quint (caller-provided spatial facts):

- `attackerWithin5ft: bool` — is the attacker within 5 feet of the target? Affects Prone advantage, Paralyzed/Unconscious auto-crit. For OA attacks, always `true` (by definition of reach).
- `hostileWithin5ft: bool` — is a hostile creature within 5 feet of the attacker? Affects ranged close-quarters disadvantage.

Not added (out of scope — environmental or not relevant to current combat model):
- `underwater`, `attackerHasSwimSpeed`, `isUnderwaterMeleePiercing`, `isUnderwaterRangedException` — environmental, deferred
- `beyondNormalRange` — range modeling deferred
- `isHeavyWeapon`, `wielderSizeSmallOrTiny` — Heavy Weapon disadvantage already handled separately (C10 fix). Could be folded into AttackContext later but is not broken.
- `attackerGrappled`, `targetIsGrappler` — grapple not in battle yet (F9)

### Building AttackContext from Combatant state

At attack time, construct `AttackContext` from:
- **Attacker conditions** (from `attacker.creature`): `blinded`, `prone`, `restrained`, `poisoned`, `frightened` — read directly from creature state.
- **Target conditions** (from `target.creature`): `blinded`, `paralyzed`, `petrified`, `stunned`, `unconscious`, `restrained`, `prone` — read directly.
- **Target turn state**: `dodging` from `target.turn.dodging`.
- **Attacker turn state**: `recklessThisTurn` from `attacker.recklessThisTurn` — adds advantage on STR-based melee (gated on `isMelee`; STR vs DEX is not modeled, so advantage applies to all melee when reckless).
- **Spatial booleans**: `attackerWithin5ft`, `hostileWithin5ft` — nondeterministic, caller-provided.
- **Visibility**: `targetCanSeeAttacker` and `attackerCanSeeTarget` — nondeterministic, caller-provided. Default to `true` (visible) since visibility model is out of scope; nondeterministic exploration covers the `false` cases.
- **Attack type**: `isRangedAttack = not(isMelee)`.

Fields not available in the current model are set to safe defaults (e.g., `underwater: false`, `beyondNormalRange: false`, `attackerGrappled: false`).

A helper `buildAttackContext(cs, attackerId, targetId, isMelee, attackerWithin5ft, hostileWithin5ft, ...)` constructs the record. This avoids duplicating the 30-field record construction in every attack action.

### Reckless Attack wired into advantage

`recklessThisTurn` on the attacker feeds into AttackContext as an advantage source for melee attacks. Enemies of a Reckless Barbarian get advantage via a separate mechanism: when any creature attacks the Barbarian, `targetIsReckless: bool` (or check `target.recklessThisTurn`) is an advantage source in the defender's `pDefenseModifiers`. This requires adding `recklessThisTurn` as a checked field in `pAggregateAttackMods` or as a post-aggregation override.

Note: RAW says "until the start of your next turn, attack rolls against you have Advantage." This is on the target side, not attacker side. The `recklessThisTurn` flag must be checked on the TARGET when they are being attacked, not just on the attacker when they attack. `pAggregateAttackMods` already supports target-side advantage sources — `recklessThisTurn` becomes one more.

### FullAttackMods consumed in resolveAttack

`resolveAttack` receives `FullAttackMods` (computed upstream by the calling action) and uses:
- `autoCrit`: if `true` and hit, the attack is a critical hit regardless of roll.
- `autoMiss`: if `true`, the attack misses regardless of roll.
- `hasAdvantage` / `hasDisadvantage`: passed through to SA eligibility check. Not used for the roll itself (the roll is still a pre-resolved `attackRoll: int` from the caller — advantage affects which of two d20s the caller picks, which is a caller concern).

### Sneak Attack on Combatant

New fields on `Combatant`:
- `sneakAttackDice: int` — number of d6s for SA damage. Set at init from rogue level (TS computes: `ceil(rogueLevel / 2)`). `0` for non-rogues (all eligibility checks fail naturally).
- `sneakAttackUsedThisTurn: bool` — reset to `false` at `bStartTurn`. Set to `true` when SA is applied.

### Sneak Attack eligibility and damage

In `resolveAttack`, after determining a hit, check SA eligibility:

```
val saEligible = attacker.sneakAttackDice > 0
  and not(attacker.sneakAttackUsedThisTurn)
  and (isFinesse or not(isMelee))
  and (mods.hasAdvantage or hasAllyAdjacentToTarget)
  and not(mods.hasDisadvantage and not(mods.hasAdvantage))
```

The last line encodes RAW: "you don't need Advantage on the attack roll if another enemy of the target is within 5 feet of it" BUT "you can't use this feature if you have Disadvantage on the attack roll." Advantage from ally-adjacency doesn't override Disadvantage — the Disadvantage check is separate from the "needs Advantage" path.

Wait — re-reading RAW more carefully: "Beginning at 1st Level, you know how to strike subtly and exploit a foe's distraction. Once per turn, you can deal an extra 1d6 damage to one creature you hit with an attack roll **if you have Advantage on the roll** and the attack uses a Finesse or a Ranged weapon. You don't need Advantage on the attack roll if another enemy of the target is within 5 feet of it, that enemy isn't Incapacitated, and you don't have Disadvantage on the attack roll."

So eligibility is:
```
(hasAdvantage AND (isFinesse OR NOT isMelee))
OR
(hasAllyAdjacentToTarget AND NOT hasDisadvantage AND (isFinesse OR NOT isMelee))
```

And "hasAdvantage" here means the resolved advantage (after cancellation with disadvantage). Actually no — RAW says "if you have Advantage on the roll." If you have both Advantage and Disadvantage, they cancel, and you have neither. So "have Advantage" means net Advantage after cancellation.

Simplified:
```
val eligibleWeapon = isFinesse or not(isMelee)
val saEligible = attacker.sneakAttackDice > 0
  and not(attacker.sneakAttackUsedThisTurn)
  and eligibleWeapon
  and (mods.hasAdvantage or (hasAllyAdjacentToTarget and not(mods.hasDisadvantage)))
```

Where `mods` is the resolved `FullAttackMods` (after `resolveAdvantage` cancellation).

If eligible: add `sneakAttackDice` d6s worth of damage to the base damage. In Quint, since damage is an abstract `int`, this means adding `nondet saDmg = 1.to(sneakAttackDice * 6).oneOf()` to the damage total. Or more precisely: the SA damage is nondeterministic within the range of Nd6.

Actually, the simplest approach matching the existing pattern: the caller already provides `dmg` as a nondeterministic int. SA adds more nondeterministic damage. In the spec, this would be:
```
nondet saDmg = if (saEligible) sneakAttackDice.to(sneakAttackDice * 6).oneOf() else 0
val totalDmg = dmg + meleeDmgBonus + saDmg
```

Set `sneakAttackUsedThisTurn = true` on the attacker after applying SA.

### Crit interaction with SA

RAW: SA dice are doubled on crit like all damage dice. Since the spec's crit doubling already applies to the total damage (`if (isCritical) damage * 2 else damage`), and SA damage is added to the base before crit doubling, this works correctly without special handling.

### meleeDamageBonus gated on isMelee (D1 fix)

In `resolveAttack`, the existing `meleeDamageBonus` addition is gated: `if (isMelee) attacker.meleeDamageBonus else 0`. This fixes D1.

### knockOut gated on isMelee

The existing `knockOut` parameter is gated: `knockOut and isMelee`. Non-melee attacks pass `knockOut = false` effectively. In practice, the nondeterministic `knockOut` is still generated for all attacks, but the check in `dealDamage` or `resolveAttack` rejects it for ranged.

### Frame conditions

No new top-level state variables. `sneakAttackUsedThisTurn` and `sneakAttackDice` are on `Combatant` inside `bCreatures`. No frame condition changes.

### MBT bridge updates

New Combatant fields (`sneakAttackDice`, `sneakAttackUsedThisTurn`) need ITF-to-TS mapping. New per-attack event fields (`isMelee`, `isFinesse`, `hasAllyAdjacentToTarget`, `attackerWithin5ft`, `hostileWithin5ft`) need mapping in the event dispatch. The `FullAttackMods` are computed inline — not stored in state — so they don't need bridge mapping.

### bInit updates

At least one creature in `bInit` should have `sneakAttackDice > 0` (e.g., creature A is already rogue 5, set `sneakAttackDice = 3`). Nondeterministic spatial booleans ensure SA eligibility is exercised in some traces.

### AttackContext fields not yet on Combatant

Some AttackContext fields reference conditions that are already on `creature.creature` (the nested `CreatureState`). The `buildAttackContext` helper reads them from `Combatant.creature.blinded`, `Combatant.creature.prone`, etc. No new fields needed on Combatant for condition-based advantage — the conditions are already tracked.

`dodging` is on `Combatant.turn.dodging` (TurnState). Already tracked.

`frightSourceInLOS` is spatial — nondeterministic, caller-provided.

## Testing Decisions

### What makes a good test

Tests verify observable outcomes: does SA damage appear when eligible? Does it not appear when ineligible? Does advantage from Prone/Blinded/Reckless produce correct hit/miss results? Tests should NOT verify internal aggregation steps.

### Quint tests (dndTest.qnt)

- SA eligible (advantage + finesse) → extra damage applied
- SA eligible (ally adjacent, no advantage, no disadvantage) → extra damage applied
- SA ineligible (disadvantage, ally adjacent) → no extra damage
- SA ineligible (non-finesse melee, no ranged) → no extra damage
- SA once per turn → second attack in same turn gets no SA
- SA + crit → damage doubled including SA dice
- meleeDamageBonus only on melee → ranged attack gets no bonus
- knockOut only on melee → ranged attack at 0 HP kills normally
- Reckless attacker → advantage on melee, not on ranged
- Reckless target → attacker has advantage

### Battle invariants (battle.qnt)

- `sneakAttackUsedThisTurn` is only true during a turn where SA was applied
- `sneakAttackDice >= 0`
- `meleeDamageBonus` never added to ranged damage (covered by logic, not a separate invariant)
- `autoCrit` only when target is Paralyzed/Unconscious and attacker within 5ft

### MBT parity

Existing 50-trace x 10-step runs will exercise the new fields. The field-by-field comparison catches divergence. New event fields need bridge mapping. The advantage computation must be identical in Quint and TS — the TS side should call the same `pAggregateAttackMods` logic (ported as a TS function or reimplemented with unit tests proving equivalence).

### Prior art

- `dndTest.qnt` invariant tests (`inv_*` pattern) for creature-level tests
- `battle-machine.mbt.test.ts` for MBT bridge mapping
- `features/class-rogue.ts` + `features/class-rogue.test.ts` for SA dice computation
- `creature.qnt` `pAggregateAttackMods` tests (if any in dndTest.qnt)

## Out of Scope

- **Cunning Strike** (Rogue 5+): Forgo SA dice for effects (Poison, Trip, Withdraw). Extends SA with a choice: damage vs effect. Deferred — requires the SA pipeline from this PRD first.
- **Environmental advantage sources** (underwater, range penalties): AttackContext fields exist in creature.qnt but environmental modeling is out of scope. Hardcoded to safe defaults.
- **Grapple/Shove advantage interactions**: Grapple not in battle yet (F9). AttackContext grapple fields hardcoded to defaults.
- **Heavy Weapon in AttackContext**: Already handled by C10 fix. Could be folded into AttackContext later.
- **Advantage affecting the d20 roll**: The spec receives `attackRoll: int` as a pre-resolved number. Advantage means the caller rolled two d20s and picked the higher — that's a caller concern. The spec uses `hasAdvantage` for SA eligibility and future features, not for roll modification.
- **Spatial modeling**: `attackerWithin5ft`, `hostileWithin5ft`, `hasAllyAdjacentToTarget` are abstract booleans. No positions, distances, or grids.
- **Visibility modeling**: `targetCanSeeAttacker`, `attackerCanSeeTarget` are nondeterministic booleans. No line-of-sight computation.

## Further Notes

- This PRD closes the loop on the biggest documented simplification in the battle spec. The advantage infrastructure in creature.qnt was designed for this — the work is wiring, not inventing.
- `recklessThisTurn` transitions from dead state to a functional advantage source. This retroactively validates the PRD 1 decision to track it.
- The `AttackContext` builder helper centralizes the 30-field record construction. Each attack action calls it with action-specific overrides (OA: `isMelee = true`, `attackerWithin5ft = true`).
- Adding `nondet` booleans for spatial facts does expand the state space, but Quint's random sampler picks one value per nondet per step — it doesn't enumerate the Cartesian product. MBT performance impact should be negligible.
- This PRD does NOT change how `attackRoll` works. The roll is still a pre-resolved int. Advantage/disadvantage affect SA eligibility and autoCrit/autoMiss, not the roll value itself. This is a deliberate architectural choice: the spec proves "given advantage, these features activate correctly" without modeling the two-d20-pick-higher mechanic.
- SA as a flow feature (spec-owned eligibility) validates the categorization in PLAN_AUDIT.md F4: features with eligibility logic, per-turn tracking, and multi-condition checks belong in the spec.
