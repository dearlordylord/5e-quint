# Tautology Index

Assertions that are trivially true by construction, not by exercising model logic.

Legend:
- **MANUAL_CONSTRUCTION** — `.with("field", val)` then asserting `.field == val` without model function touching it
- **NO_OP** — `val x = y` (no model call) then asserting properties of x
- **IDENTITY_OP** — model function called with trivial/identity input (e.g., `pHeal(x, 0)`)
- **CLAIM_MISMATCH** — comments claim to test mechanic X but code never exercises X
- **FOREGONE** — test setup directly ensures the outcome; assertion cannot fail
- **PARTIAL** — some `run` blocks are tautological, others genuinely test the model

## Fully tautological

| File | Type | Reason |
|------|------|--------|
| `0d139062c5795b80` | MANUAL_CONSTRUCTION | entire test reads fields directly set via `.with()`; `warlockConfig.hasSpellcasting` was set to false, asserted false |
| `2ff22a7c40ad72a9` | MANUAL_CONSTRUCTION | blade flourish modeled by manually adding +10 to movementRemaining/effectiveSpeed via `.with()`, then asserting those values; no model function exercises the speed increase |
| `4f264bb5d9ca0e63` | NO_OP | entire test is a set membership check on a manually constructed set; no model function called |
| `48e196da23a2bf85` | MANUAL_CONSTRUCTION | `stackedAC = baseAC + 1 + 2` then asserts `stackedAC == baseAC + 3`; pure arithmetic, stacking behavior encoded manually not via model |

## Partially tautological

| File | Type | Tautological part |
|------|------|-------------------|
| `0353b0ac91cfbac8` | PARTIAL | runs 2-3 assert `remainingDamage` values determined by pure arithmetic before any model call |
| `14f3cf87d42341e3` | CLAIM_MISMATCH | Elemental Adept mechanic implemented inline with raw if-expression; assertion only checks `normalDamage(2,1)==3` |
| `18c185f9d2e34e87` | PARTIAL | `wailed.tempHp == wardHp` and `wailed.hp == 0` guaranteed by `.with()` calls; `pApplyCondition(CUnconscious)` doesn't touch those fields |
| `1931335c913e570d` | PARTIAL | embeds trivially true arithmetic sub-assertions (`65 < 225`, `65 < 150`) |
| `1f9f88b2a43a2dbd` | PARTIAL | runs 1-3 use `if (saveFailed) pApplyCondition(...)` then assert the condition; guaranteed whenever saveFailed is true |
| `20dda7fcf3b6f1b0` | PARTIAL | `normalDamage(14, 0) == 14` is identity-op (zero modifier) |
| `23768542e1947e0c` | NO_OP | `alchemistCheck == astronomerCheck` where both are identical `checkSucceeds(...)` calls with identical inputs |
| `2fe492dcaaf32ec7` | PARTIAL | asserts `t0.actionsRemaining == 1` reading FRESH_TURN constant field |
| `36b7d68342043709` | PARTIAL | `alertTurn.surprised == false` reads FRESH_TURN field directly |
| `370803b572db291c` | PARTIAL | `afterFailedStabilize = dying` (no-op); asserting its fields is foregone |
| `371dfdcb0ca3e5ca` | PARTIAL | `afterSourceDies = charmedTarget` (no-op); "source dies has no effect" proven by not calling anything |
| `3839f4cfee591266` | PARTIAL | asserts `corpse.dead` after `.with("dead", true)` |
| `38b739486af06e14` | PARTIAL | `firstUse == secondUse` trivially true — identical `saveSucceeds` calls with identical args |
| `3c7711c15fc05377` | CLAIM_MISMATCH | Elemental Affinity type-matching encoded as inline if/else, not via model function |
| `44572b3d5a705d27` | PARTIAL | asserts `enemyTurnBefore.movementRemaining == 20` and `actionsRemaining > 0` on manually-set FRESH_TURN values |
| `44c94dac87cb7f0f` | PARTIAL | run 3: `val ssOutField = ssInField` (no-op assignment), asserts `ssOutField == ss` |
| `452f2ffef5e9d3b5` | PARTIAL | asserts `not(turn.actionsRemaining)`, `not(turn.bonusActionUsed)`, `turn.movementRemaining > 0` on unmodified FRESH_TURN |
| `45a6d0713ce69187` | PARTIAL | `upcastBypassesImmunity = 7 > 6` is pure arithmetic; immunity bypass never exercised via model function |
| `4c94074275dc128f` | PARTIAL | run 1 asserts `not(isConcentrating(FRESH_SPELL_SLOTS))` with no model call; run 4 is no-op assignment |
| `506ac698c413d4db` | PARTIAL | run 1 asserts `s.restrained == true` where s was `.with("restrained", true)` |
| `5710b7d2f4e60f7f` | PARTIAL | `coverVsForceAttack == coverVsFireAttack` where both are `coverBonus(HalfCover)` — same call, trivially equal |
| `58c0f41e6751f413` | PARTIAL | `afterMICast = slots` (no model call), asserts slot count unchanged |
| `61dae540207a38a7` | PARTIAL | `ss1 = ss0; ss2 = ss1` (no-ops); asserts `not(isConcentrating(ss2))` trivially true of FRESH_SPELL_SLOTS |
| `67d6eb245eb4c322` | PARTIAL | `drowSkillProficiencies` manually set to `Set(Perception)`; if-check on it is foregone |
| `69c529d8faef0a06` | PARTIAL | `sneakAttackEligible` computed inline from manually-set weapon fields (`isMelee=false`); no model function |
| `74513bb426301f30` | PARTIAL | `afterScrollCast = slots` (no model call); asserts slot values unchanged |
| `74a87912b98b416b` | PARTIAL | asserts `impState.hp == impHp` etc. where `impState = freshCreature(impHp)` never modified |
| `76d6ddef117e6a83` | PARTIAL | asserts `invisibleCreature.invisible` where set via `.with("invisible", true)` |
| `7d373ed5b7a997d2` | PARTIAL | `aoaTriggersAtHit = creature.tempHp > 0` checks `10 > 0` on manually constructed creature |
| `8770660ccc522684` | PARTIAL | asserts `allSpentTurn.actionsRemaining == 0` etc. on manually `.with()`-constructed TurnState |
| `8913e1a3c701f6f4` | PARTIAL | `resolveAdvantage({hasAdvantage: false, hasDisadvantage: true})` then asserts those same fields back |
| `895e526a27294d41` | PARTIAL | `afterGainHd` constructed via `.with("maxHp", ...).with("hp", ...)`; asserts those manually set values |
| `8f193751aba9266a` | MANUAL_CONSTRUCTION | `ss.concentrationSpellId == "hunters_mark"` asserts field set via `.with()` on FRESH_SPELL_SLOTS; no model function touches `ss` |
| `91d63b944aed5a27` | PARTIAL | `ss_wild = ss0` (no-op) then asserts concentration field; `ss_after = ss_empty` with no function call |
| `95ab503cf25d9be3` | PARTIAL | `movementRemaining = 0` manually set via `.with()` to encode spell effect; model function doesn't derive the restriction |
| `97abd0a56af79361` | PARTIAL | `casterA_slots == pStartConcentration(FRESH_SPELL_SLOTS, "detect_magic")` compares value to exact expression that produced it |
| `a9dc6cae88dc39c5` | FOREGONE | passes empty feature set then asserts `extraAttacksFromConfig == 0`; setup directly ensures the outcome |
| `be14e255e587f03c` | PARTIAL | `17 >= 12`, `1 >= 12` are literal integer comparisons, not model function calls |
| `c1f0456029a494a3` | PARTIAL | third run asserts `creature.restrained == false` and `creature.hp == maxHp` on `freshCreature(20)` no model function touches |
| `c33238884c597c27` | PARTIAL | `pHeal(ally, 0)` then asserts hp unchanged — identity operation on zero healing |
| `c763e390f79d69b5` | PARTIAL | third run: save succeeds so `afterSpell == target == freshCreature(15)`; asserting `not(restrained)` is foregone |
| `ca74ed95871d7e8f` | PARTIAL | `pTakeDamage(wizard, 0, Fire, ...)` then asserts hp unchanged — identity operation on zero damage |
| `d248f75dfc0d9cdc` | PARTIAL | `acNormal == acMagicGaunt` where both computed by identical expression; trivially equal |
| `d52aec74c16c02ed` | PARTIAL | `ss0.concentrationSpellId == ""` and `not(isConcentrating(ss0))` assert properties of unmodified FRESH_SPELL_SLOTS |
| `d84f8e5fabe6aede` | PARTIAL | run 2: never calls pTakeDamage; asserts `druidInWildShape.hp == 30` which is just the initial `freshCreature(30)` value |
| `dbaf7f7b63839ff5` | PARTIAL | `creature.hp == 20` asserts `freshCreature(20)` never modified |
| `e2889cb3a81e70c0` | PARTIAL | equality chain `s1.hp == s2.hp == ... == s5.hp` trivially true — all identical inputs to `pTakeDamage` |
| `e2aaa1a1b605c107` | PARTIAL | run 1: pure arithmetic on literal constants (`5 * 7920 == 39600 and 39600 <= 40000`); no model function |
| `e2d0fdf3e35d60e4` | PARTIAL | `not(creatureAfterTurn1.restrained)` trivially true — `freshCreature(20)` never had restrained applied |
| `e30dd2e3fb07e8b3` | PARTIAL | `pHeal(x, 0).hp == x.hp` is identity operation; "no chaining" proven by not calling the chain |
| `eab6fc33cc4564c6` | CLAIM_MISMATCH | `ssActive` (calm_emotions concentration) never connected to creature state; suppression manually applied via `pRemoveCondition` |
| `f096ed19655ff1d8` | PARTIAL | `not(captain.charmed)` asserted on `freshCreature(20)` with no condition ever applied — foregone |
| `f496a2a6dc591c5d` | PARTIAL | `totalSkills = baseWolfSkills.union(gainedSkills)` is manual set arithmetic; no model function |
| `f5aa5f07c7f5f82a` | PARTIAL | `creature.hp == 30` asserted on `freshCreature(30)` after passing save with no damage function called |
| `f5dba97917303179` | PARTIAL | asserts properties of fresh unmodified `s0` and `t0` values with no model function called |
| `fc2c88103b531cf8` | PARTIAL | core ruling assertion is plain integer comparisons (`2 < 3`, `not(2 < 2)`) on local variables |
| `ffb59f4a5464c115` | FOREGONE | `afterShapeChange = afterDamage` (identity alias); shape-change assertion trivially true |
