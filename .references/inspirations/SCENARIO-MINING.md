# Scenario Mining Results

Status note:

- This file is the raw mined inventory.
- The current viability audit and next-batch shortlist live in [PLAN.md](./PLAN.md).
- Some items below are now covered or superseded by SRD 5.2.1 alignment work; use `PLAN.md` when deciding what to schedule next.

Consolidated findings from deep-mining the original Tier A corpus plus the newly analyzed engines, especially `avrae`, `DnDSimulator`, and `cmdli/dndsim`. Each item represents a mechanical interaction that our project may not fully model or test.

Items are organized by priority (high/medium/low) and deduplicated across sources.

## Priority Legend

- **high** — fundamental SRD rule missing from our pipeline, or a critical state transition gap
- **medium** — real SRD mechanic we model partially or don't test explicitly
- **low** — future reference, edge case, or out-of-current-scope concern

---

## HIGH PRIORITY

### 1. Ranged attack in melee = disadvantage
- **SRD rule**: When you make a ranged attack while a hostile creature is within 5 feet and can see you, you have disadvantage.
- **Source**: natural_20 (`compute_advantages_and_disadvantages`)
- **Our gap**: Not in `pResolveAdvantage` context or `machine-queries.ts` `attackModifiers`. No advantage/disadvantage source for this.
- **Test type**: Quint + QA

### 2. Unconscious grappler auto-releases grapple
- **SRD rule**: The grapple ends if the grappler is incapacitated (which unconscious implies).
- **Source**: natural_20 (`unconscious!` calls `drop_grapple!`), opencombatengine (condition cascades)
- **Our gap**: `battle.qnt` has `releaseBattleGrappleByGrappler` but need to verify it's automatically called when grappler goes unconscious/incapacitated.
- **Test type**: Quint + MBT

### 3. Two-Weapon Fighting bonus action attack
- **SRD rule**: When you attack with a light melee weapon, you can bonus-action attack with a different light weapon in the other hand. No ability mod to damage (unless negative or unless you have TWF style).
- **Source**: natural_20 (full implementation with `TwoWeaponAttackAction`)
- **Our gap**: `pCanTwoWeaponFighting` and `pTwoWeaponEligible` exist in creature.qnt but `battle.qnt` has no `bTwoWeaponAttack` action. XState has no `TWO_WEAPON_ATTACK` event.
- **Test type**: Quint (add to battle.qnt) + MBT

### 4. Sneak Attack once-per-turn tracking across multiple attacks
- **SRD rule**: Once per turn (not once per round), extra Xd6 damage. Resets at start of YOUR turn. Can fire on OA during someone else's turn.
- **Source**: opencombatengine (`_usedThisTurn` bool, reset on `StartTurn()`)
- **Our gap**: Our SA tracking may not correctly handle: (a) dual-wield main+offhand both in one turn = only first gets SA, (b) OA on enemy turn = SA allowed even if used on own turn.
- **Test type**: TS unit + Quint

### 5. Effect duration type distinction (end-of-turn vs start-of-next-turn vs rounds)
- **SRD rule**: Shield = "until start of your next turn." Some effects = "until end of your turn." Some = "1 round" (= until same initiative count next round).
- **Source**: opencombatengine (3 distinct `DurationType` values)
- **Our gap**: We model `expiryOwnerId` for caster-relative vs target-relative expiry, but the end-of-turn vs start-of-next-turn distinction is a common source of bugs. Need to verify Shield, Dodge, and other timing-sensitive effects use the correct one.
- **Test type**: Quint + MBT

### 6. Same-name magical effect non-stacking
- **SRD rule**: "The effects of the same spell cast multiple times don't combine" (Combining Magical Effects).
- **Source**: opencombatengine (replaces effect with same name instead of stacking), avrae (`IEffect` makes stacking explicit and opt-in)
- **Our gap**: No evidence of same-name effect replacement logic in Quint or TS. Two castings of Bless or Shield of Faith could illegally stack.
- **Test type**: Quint invariant + TS unit

### 7. Physical damage bypass qualifiers (magical/silvered/adamantine)
- **SRD rule**: Many monsters have "resistance to bludgeoning/piercing/slashing from nonmagical attacks."
- **Source**: foundryvtt-dnd5e (`dm.bypasses` SetField, `isPhysical` flag on B/P/S), avrae (`Resistance("foo", only=["magical"])`, silvered/nonmagical qualifiers in initiative tests)
- **Our gap**: Our R/V/I are unqualified booleans. Can't distinguish "resistant to slashing" from "resistant to nonmagical slashing." This is a core monster stat block pattern for most CR 5+ monsters.
- **Test type**: Quint (add bypass qualifier to damage types) + TS

---

## MEDIUM PRIORITY

### 8. Fighting style implementations (4 styles with no behavioral code)
- **SRD rule**: Archery (+2 ranged attack), Dueling (+2 one-hand melee damage), GWF (reroll 1s/2s on two-hand damage), TWF (add mod to off-hand damage)
- **Source**: natural_20 (all four implemented in attack/damage pipeline)
- **Our gap**: `FightingStyleFeat` types exist (`FSArchery`, `FSDueling`, `FSGreatWeaponFighting`, `FSTwoWeaponFighting`) but none are wired into the attack pipeline. Defined but not implemented.
- **Test type**: TS unit + Quint

### 9. Heavy weapon + Small creature = disadvantage
- **SRD rule**: Small creatures have disadvantage on attack rolls with heavy weapons.
- **Source**: natural_20 (`compute_advantages_and_disadvantages`)
- **Our gap**: `Heavy` is a weapon property and `creatureSize` is tracked, but no check in advantage computation.
- **Test type**: Quint + QA

### 10. Help action grants advantage to ally's next attack
- **SRD rule**: Use your action to help an ally attack a creature within 5 feet. Next attack by that ally has advantage.
- **Source**: natural_20 (`help!` sets target effect, advantage computed per attack)
- **Our gap**: No Help action in `battle.qnt` or XState battle machine. No "being helped" advantage source.
- **Test type**: Quint + MBT

### 11. Hide/stealth/unseen attacker advantage chain
- **SRD rule**: Hide → Stealth vs Passive Perception → unseen attacker = advantage. Attacking breaks stealth.
- **Source**: natural_20 (full chain: HideAction → stealth roll → can_see? → advantage → break_stealth!)
- **Our gap**: No Hide action, no stealth rolls, no unseen attacker advantage source in battle model.
- **Test type**: Quint + MBT (significant new state)

### 12. Attacking an unseen/invisible target = disadvantage
- **SRD rule**: When you attack a target you can't see, you have disadvantage.
- **Source**: natural_20 (`disadvantage << :invisible_attacker`)
- **Our gap**: We have `ctx.invisible` for attacker advantage but not target-invisible → attacker disadvantage.
- **Test type**: Quint + QA

### 13. Versatile weapon damage die switching
- **SRD rule**: Versatile weapons use a higher damage die when wielded two-handed.
- **Source**: natural_20 (checks `used_hand_slots <= 1.0` for two-handed die)
- **Our gap**: `Versatile` is a weapon property but no two-die selection logic exists.
- **Test type**: Quint + TS unit

### 14. Standing up from prone costs half movement
- **SRD rule**: Standing up costs movement equal to half your speed. Can't stand if insufficient movement.
- **Source**: natural_20 (`StandAction.can?` checks remaining movement)
- **Our gap**: No `bStand` action in battle.qnt. Prone removal has no movement cost.
- **Test type**: Quint + MBT

### 15. Condition-based speed zero (6 conditions)
- **SRD rule**: Grappled, Restrained, Paralyzed, Petrified, Stunned, Unconscious all set speed to 0.
- **Source**: opencombatengine (centralized check for all 6 in `StandardMovement.Speed`)
- **Our gap**: We handle some of these. Need to verify ALL six are enforced in a single choke point.
- **Test type**: Quint invariant

### 16. Dodge benefits lost when incapacitated or speed=0
- **SRD rule**: "You lose [Dodge] benefits if you have the Incapacitated condition or if your Speed is 0."
- **Source**: dnd_engine (NOT modeled — it's their bug), SRD text
- **Our gap**: Need to verify dodging creature that gets stunned/incapacitated mid-round loses dodge benefits immediately.
- **Test type**: Quint + MBT

### 17. Forced movement doesn't trigger OA
- **SRD rule**: OAs are triggered by voluntary movement only. Push, pull, teleport don't provoke.
- **Source**: dnd_engine (cost-based proxy for voluntary movement)
- **Our gap**: Our OA system likely only fires during `bMove` (voluntary), but should verify explicitly.
- **Test type**: Quint + QA

### 18. Cover bonus applies to DEX saves too
- **SRD rule**: Half cover = +2 to AC AND Dex saves. Three-quarters = +5 to both.
- **Source**: foundryvtt-dnd5e (`common.mjs:154`)
- **Our gap**: We model `coverBonus` for AC but NOT for DEX saving throws.
- **Test type**: Quint + TS

### 19. Temp HP non-stacking (keep higher, don't add)
- **SRD rule**: If you have temp HP and receive more, you choose which to keep. They don't add.
- **Source**: opencombatengine (replaces only if `amount > Temporary`)
- **Our gap**: Need to verify our implementation replaces rather than adds.
- **Test type**: Quint invariant

### 20. Healing at 0 HP resets death save counters
- **SRD rule**: Regaining HP from 0 resets both success and failure counters.
- **Source**: opencombatengine (`Heal()` resets both counters)
- **Our gap**: Likely covered but should verify explicitly.
- **Test type**: QA

### 21. Cantrip damage scaling by character level
- **SRD rule**: Cantrip damage increases at levels 5 (2 dice), 11 (3), 17 (4).
- **Source**: opencombatengine (level-based multiplier)
- **Our gap**: No `cantripScaling` in core code. Our spell features may handle this but should verify.
- **Test type**: TS unit

### 22. Reach weapon extending OA threat range to 10ft
- **SRD rule**: Reach weapons extend threat range to 10 feet.
- **Source**: opencombatengine (reach weapon OA test)
- **Our gap**: No reach-based OA range in our codebase. OA uses fixed 5ft.
- **Test type**: Quint + MBT (when spatial)

### 23. Exhaustion d20 roll penalty (-2 per level)
- **SRD rule**: SRD 5.2.1: exhaustion applies -2 per level to all d20 rolls.
- **Source**: foundryvtt-dnd5e (`reduction: { rolls: 2 }`)
- **Our gap**: We track exhaustion levels and speed penalty. Need to verify the d20 roll penalty is applied to attacks, saves, and checks.
- **Test type**: Quint + TS

### 24. Sneak Attack blocked by disadvantage even when advantage also present
- **SRD rule**: SA requires "you don't have disadvantage" — any disadvantage source blocks SA regardless of advantage.
- **Source**: opencombatengine (early `if (HasDisadvantage) return;`)
- **Our gap**: Our adv/disadv cancellation resolves before features see them. SA might incorrectly fire when both adv and disadv exist.
- **Test type**: Quint + TS unit

### 25. Armor proficiency — disadvantage without proficiency
- **SRD rule**: Wearing non-proficient armor imposes disadvantage on STR/DEX attacks, saves, and checks.
- **Source**: natural_20 (checked in attack pipeline)
- **Our gap**: Not in our advantage/disadvantage computation.
- **Test type**: Quint + QA

### 26. Petrified → poison damage immunity + poisoned condition immunity
- **SRD rule**: Petrified grants immunity to poison damage and the poisoned condition.
- **Source**: foundryvtt-dnd5e (`traits.mjs:107-119`)
- **Our gap**: We model petrified resistance to all damage. Need to verify poison-specific immunities.
- **Test type**: Quint + TS

### 27. Max HP reduction (e.g., certain undead attacks)
- **SRD rule**: Some effects reduce max HP (wraith drain, etc.). Distinct from temp HP.
- **Source**: foundryvtt-dnd5e (`hp.tempmax` field)
- **Our gap**: No max HP modifier field. Only temp HP modeled.
- **Test type**: Quint (add maxHpReduction field)

### 28. Global attack/damage bonuses per attack type
- **SRD rule**: Features like Archery (+2 ranged weapon attack), magic weapons (+1/+2/+3), etc.
- **Source**: foundryvtt-dnd5e (`bonuses.mwak.attack`, `bonuses.rwak.damage`, etc.)
- **Our gap**: No per-attack-type global bonus fields. Needed for fighting styles and magic weapons.
- **Test type**: TS unit + Quint

### 29. Unconscious auto-applies prone
- **SRD rule**: Unconscious: "You have the Incapacitated and Prone conditions."
- **Source**: foundryvtt-dnd5e (unconscious carries `riders: ["prone"]`)
- **Our gap**: We set both `unconscious: true, prone: true` in creature state. Should verify this auto-application in all paths that cause unconsciousness.
- **Test type**: MBT

### 30. Expanded critical threshold (Champion Fighter 19-20 or 18-20)
- **SRD rule**: Champion's Improved Critical: crit on 19-20. Superior Critical: 18-20.
- **Source**: foundryvtt-dnd5e (`weaponCriticalThreshold` field)
- **Our gap**: Our crit is nat-20 only. No expanded threshold.
- **Test type**: TS features + Quint

### 31. Parent/child effect teardown and dependent cleanup
- **SRD rule**: Not a single named SRD rule, but many real spell and feature effects create dependent child state that must be removed when the parent effect ends.
- **Source**: avrae (`IEffect` parent/child links and button-granted interactions), DnDSimulator (token-linked cleanup for Entangle, Hex, Hunter's Mark, summons)
- **Our gap**: We model active effects, but do not yet have an explicit regression inventory for dependent cleanup when a parent effect expires, is removed, or concentration breaks.
- **Test type**: MBT + QA

### 32. Concentration replacement on recast
- **SRD rule**: You can concentrate on only one spell at a time; starting another concentration spell ends the first.
- **Source**: cmdli/dndsim (`Spellcasting.setConcentration()` ends the previous spell before setting the next), avrae concentration initiative-effect flows
- **Our gap**: We track concentration, but should add explicit deterministic regressions for "new concentration replaces old concentration and tears down its rider state immediately."
- **Test type**: Quint + MBT

### 33. One-shot rider consumed by the next qualifying attack
- **SRD rule**: Some effects apply once to the next attack or next hit, then are consumed.
- **Source**: DnDSimulator (`guidingBoltTest()`), avrae button/effect interaction model
- **Our gap**: We have several rider-style effects, but not a dedicated mined regression family for "next qualifying hit consumes the effect exactly once."
- **Test type**: MBT + QA

### 34. Automation-bound resource spend versus dry-run preview
- **SRD rule**: Resource spend is part of action resolution, but tooling often needs a no-spend preview mode.
- **Source**: avrae `UseCounter` tests (`-i` ignore mode preserves counters/slots while normal execution spends them)
- **Our gap**: Not a Quint mechanic gap, but a useful runtime and testing distinction for scripted actions where we may want preview-only execution without mutating slots/resources.
- **Test type**: TS/runtime regression

---

## LOW PRIORITY (Future Reference)

### Equipment & Resources
- Ammunition consumption on ranged attacks
- Thrown weapon inventory transfer
- Attunement slot limit (max 3 magic items)
- Shield (equipment, +2 AC) as separate slot from Shield (spell)
- Medium armor DEX cap (+2 max)
- Free object interaction economy (draw/sheathe weapon)
- Encumbrance reducing speed (variant rule)
- Hit dice spending during short rest
- Pact magic slot recovery on short rest

### Combat Mechanics
- Grapple/shove size limitation (can't exceed +1 size)
- Grapple movement (dragging = halved speed)
- Shove: push 5ft or knock prone (attacker chooses)
- Multiattack economy for NPCs (specific combinations, not Extra Attack)
- Monster recharge abilities (Recharge 5-6)
- Loading weapon property (one shot per action despite Extra Attack)
- Protection fighting style (reaction to impose disadvantage)
- Long range disadvantage
- Squeezed creature mechanics
- Prone creature crawling costs double movement

### Spells
- Magic Missile auto-hit + Shield spell blocking
- Mage Armor dismissed when real armor equipped
- Expeditious Retreat (concentration → bonus-action Dash)
- Chill Touch (prevent healing + undead disadvantage)
- Shocking Grasp advantage vs metallic armor

### Features
- Diamond Soul (Monk L14, proficient in all saves)
- Tavern Brawler feat
- Elven Accuracy (3 dice on advantage for DEX/INT/WIS/CHA)
- HP bonus per level (Tough feat)
- Death save bonus field (Ring of Protection)
- Concentration limit field (default 1)
- Damage threshold (objects/vehicles)
- Lair actions, mythic actions

## Confirmed Correct (Where Competitors Have Bugs)

Our spec is **correct** and competitors are **wrong** on these:

| Rule | Our Implementation | Competitor Bug |
|---|---|---|
| Advantage/disadvantage cancellation | Boolean any/any → cancel | dnd_engine sums numerically (2 adv + 1 disadv = net adv — WRONG) |
| Restrained DEX saves | Disadvantage | dnd_engine auto-fails (WRONG) |
| Incapacitated speed | No speed reduction | dnd_engine zeros speed (WRONG per RAW) |
| Resistance stacking | Boolean (no stack) | dnd_engine sums (R+R=I — WRONG per RAW) |
| Petrified modeled | Yes | dnd_engine missing entirely |

---

## Cross-Reference with Existing SCENARIOS.md

The existing `.references/competitors/SCENARIOS.md` prioritized shortlist has been **partially consumed** by inspiration batches 1-10 in PLAN.md and has now been broadened with `avrae`, `DnDSimulator`, `rpg-toolkit`, and `cmdli/dndsim`. The items above represent the consolidated findings from that expanded mining pass.

Items 1-7 (high priority) should drive the next planning session first. Items 8-34 (medium) feed into future spec/feature work and deterministic runtime regression packs.

## How This Improves Our Product

The expanded mining pass sharpens the product question from "what mechanics are missing?" to "what kinds of correctness and UX regressions do users actually feel?"

### 1. Effect lifecycle correctness

The biggest new signal from `avrae` and `DnDSimulator` is not a brand-new rule. It is **effect lifecycle discipline**:

- parent/child cleanup
- concentration replacement
- summon teardown
- one-shot rider consumption
- start/end-turn expiry

These are exactly the bugs that make a combat product feel unreliable even when the raw math is correct.

### 2. Runtime ergonomics for scripted actions

`avrae` contributes a product-facing distinction we should preserve in our runtime/tooling:

- normal execution spends resources
- preview/dry-run execution does not

That is not a Quint rule, but it matters for MCP tools, scripted play, and debugging UX.

### 3. Regression fences around class and feature growth

`cmdli/dndsim` and `rpg-toolkit` reinforce that we need more **feature-shaped deterministic regressions** as our content layer grows:

- fighting styles
- mastery riders
- crit-threshold features
- resource refresh on rest
- ordered attack/damage modifier composition

The product lesson is that correctness needs both spec-level proof and content-level regression fences.
