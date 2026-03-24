# M2.5 Revision Research: SRD 5.1 vs 5.2.1 Deltas

Research for the 12 revision items listed in PLAN.md "5.2.1 Revision Needed for Completed Features." Each item compares SRD 5.1, SRD 5.2.1, and current `dnd.qnt` to determine what (if anything) needs changing.

---

## 1. Exhaustion

**SRD 5.1:** 6 tiers with specific per-tier effects (disadvantage ability checks, speed halved, disadvantage attacks/saves, HP max halved, speed 0, death).

**SRD 5.2.1** (Rules-Glossary.md "Exhaustion [Condition]"): Cumulative levels, death at 6. D20 Tests reduced by 2 x level. Speed reduced by 5 x level ft. Long Rest removes 1 level.

**dnd.qnt:** Already uses -2 x level penalty (`exhaustionPenalty`), -5 x level speed, death at 6. Core mechanic is 5.2.1 compliant.

**Delta: Core exhaustion — none.** Already migrated.

**Delta: Food & Water hazards — yes.**
- `pApplyDehydration`: current has CON save + "2 levels if already exhausted" (5.1). SRD 5.2.1: "drinks less than half required water -> 1 Exhaustion level." No save, no escalation.
- `pStarvationThreshold`: current uses `3 + CON mod` (5.1). SRD 5.2.1 "Malnutrition": eats less than half -> DC 10 CON save or 1 level; eats nothing for 5 days -> auto 1 level per day. Threshold is flat 5 days, no CON mod.

---

## 2. Stunned

**SRD 5.1:** Incapacitated, **can't move**, can speak only falteringly, auto-fail STR/DEX saves, advantage on attacks against.

**SRD 5.2.1** (Rules-Glossary.md "Stunned [Condition]"): Incapacitated, auto-fail STR/DEX saves, advantage on attacks against. **No speed/movement restriction, no speech restriction.**

**dnd.qnt:** Models Incapacitated + auto-fail STR/DEX + attacker advantage. Does not model speed 0 (movement not tracked per-condition). Does not model speech.

**Delta: None.** The spec never implemented the 5.1 "can't move" bullet, and 5.2.1 dropped it. Already aligned.

---

## 3. Grappled

**SRD 5.1:** Speed 0, can't benefit from speed bonuses. No attack penalty.

**SRD 5.2.1** (Rules-Glossary.md "Grappled [Condition]"): Speed 0, can't increase. **Disadvantage on attack rolls against any target other than the grappler.** Dragging costs 1 extra foot per foot (not "speed halved" on dragger).

**dnd.qnt:** Models speed 0, disadvantage vs non-grappler (`disadv_grappled`), drag cost via `grappledTargetTwoSizesSmaller`. Already 5.2.1.

**Delta: None.** Already migrated.

---

## 4. Grapple/Shove Mechanics

**SRD 5.1:** Special melee attacks (not Unarmed Strike). Contested Strength (Athletics) check vs target's Athletics or Acrobatics.

**SRD 5.2.1** (Rules-Glossary.md "Unarmed Strike"): Options within Unarmed Strike. Target makes STR or DEX save (target's choice) vs DC 8 + attacker STR mod + PB. Escape: flat DC check (same formula), not contested.

**dnd.qnt:** Uses save-DC model (`pGrappleShoveDC = 8 + strMod + profBonus`), target save, flat escape DC. Already 5.2.1.

**Delta: None.** Already migrated. Minor note: spec doesn't explicitly model grapple/shove as Unarmed Strike options (structural), but the mechanical logic is correct.

---

## 5. Surprise

**SRD 5.1:** Surprised creatures can't move, take actions, or take reactions on first combat turn. Not a named condition.

**SRD 5.2.1** (Rules-Glossary.md "Surprise", Playing-the-Game.md "Initiative"): Surprised = Disadvantage on Initiative roll. No turn restriction. Not a named condition.

**dnd.qnt:** Surprise is completely absent from the spec.

**Delta: None needed in spec.** Initiative is pre-combat and caller-provided. The spec models a single creature's turn; initiative order is external. Surprise = disadvantage on initiative is resolved before the state machine starts. PLAN.md TA3 already notes: "No surprised sub-state; no END_SURPRISE_TURN transition."

---

## 6. Knock Out

**SRD 5.1:** Reduce to 0 HP, creature is unconscious and stable.

**SRD 5.2.1** (Rules-Glossary.md "Knocking Out a Creature"): Reduce to **1 HP**, creature is Unconscious, starts a Short Rest. Unconscious ends when: Short Rest completes, creature regains HP, or DC 10 Medicine check (first aid).

**dnd.qnt:** `pKnockOut` sets HP to 1 and applies Unconscious. Comment notes Short Rest is caller responsibility.

**Delta: None in spec.** Core mechanic (1 HP + Unconscious) is correct. Recovery paths (Short Rest ending condition, first aid DC 10) are caller-side concerns.

---

## 7. Concentration DC

**SRD 5.1:** DC = max(10, floor(damage/2)). No cap.

**SRD 5.2.1** (Rules-Glossary.md "Concentration"): DC = max(10, floor(damage/2)), **capped at 30**.

**dnd.qnt:** `pConcentrationDC` returns `intMin(intMax(half, 10), 30)`. Cap at 30 present.

**Delta: None.** Already migrated.

---

## 8. Two-Weapon Fighting (Light property)

**SRD 5.1:** Separate combat rule. Both weapons must be light melee. Bonus attack doesn't add ability modifier to damage unless negative.

**SRD 5.2.1** (Equipment.md "Light" property): Rule moved into Light property definition. Text says "a different Light weapon" — **silent on melee-only requirement**. Still no ability mod to damage unless negative.

**dnd.qnt:** `pCanTWFWithWeapons` requires both weapons be Light AND melee. Damage modifier logic defers to caller.

**Delta: Ambiguous.** The melee-only constraint matches 5.1 explicitly but 5.2.1 is silent on it. Worth documenting in ASSUMPTIONS.md whether to keep or drop the melee requirement. Nick mastery (bonus attack as part of Attack action) is not modeled — that's a Weapon Mastery system feature, out of current scope.

---

## 9. Underwater Melee

**SRD 5.1:** Disadvantage unless weapon is dagger, javelin, shortsword, spear, or trident (named whitelist).

**SRD 5.2.1** (Playing-the-Game.md "Impeded Weapons"): Disadvantage unless weapon deals **Piercing damage** (damage-type filter).

**dnd.qnt:** Uses `isUnderwaterMeleePiercing` flag — damage-type approach.

**Delta: None.** Already migrated.

---

## 10. Squeezing

**SRD 5.1:** +1 ft movement cost, disadvantage on attack rolls, disadvantage on DEX saves, advantage on attacks against squeezed creature.

**SRD 5.2.1:** **Absent.** Rule does not exist.

**dnd.qnt:** Partially modeled — `AttackContext.squeezing` (attacker disadvantage), `isSqueezing` in `pMovementCost` (+1 ft cost). Missing: DEX save disadvantage, incoming attack advantage.

**Delta: Remove squeezing.** The entire mechanic has no SRD 5.2.1 basis. Remove `squeezing` from `AttackContext`, `disadv_squeezing`, and `isSqueezing` from `pMovementCost`.

---

## 11. Type Renames

**SRD 5.1 -> 5.2.1 renames:**
- Cast a Spell -> Magic [Action]
- Use an Object -> Utilize [Action]
- Hit Dice -> Hit Point Dice
- New actions: Study, Influence

**dnd.qnt:** Already uses `AMagic`, `AUtilize`, `AStudy`, `AInfluence`, `hitPointDiceRemaining`.

**Delta: None.** Already migrated.

---

## Summary

| # | Item | Delta? | Notes |
|---|------|--------|-------|
| 1 | Exhaustion (core) | None | Already -2x/-5x/death@6 |
| 1b | Dehydration/Malnutrition | **Yes** | Simplify dehydration, rewrite starvation threshold |
| 2 | Stunned | None | Already aligned |
| 3 | Grappled | None | Already has disadv vs non-grappler |
| 4 | Grapple/Shove | None | Already save-DC model |
| 5 | Surprise | None | Caller-side (pre-combat initiative) |
| 6 | Knock Out | None | Already 1 HP + Unconscious |
| 7 | Concentration DC | None | Already capped at 30 |
| 8 | TWF melee requirement | **Ambiguous** | 5.2.1 silent on melee-only; document in ASSUMPTIONS.md |
| 9 | Underwater melee | None | Already Piercing-based |
| 10 | Squeezing | **Remove** | Absent from 5.2.1 |
| 11 | Type renames | None | Already migrated |

**Action items for implementer:**
1. Rewrite `pApplyDehydration` — remove CON save and escalation, just +1 exhaustion
2. Rewrite `pStarvationThreshold` and `pApplyStarvation` — flat 5-day threshold, DC 10 CON save for partial food
3. Remove squeezing code (`AttackContext.squeezing`, `disadv_squeezing`, `isSqueezing` in `pMovementCost`)
4. Add ASSUMPTIONS.md entry for TWF melee-only decision
