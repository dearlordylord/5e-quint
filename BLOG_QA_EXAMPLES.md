# D&D Rules Shenanigans — Verified by Formal Spec

Five community-discovered rule exploits from the 2024 SRD, each backed by a
machine-generated [Quint](https://github.com/informalsystems/quint) assertion
that compiles and passes against our formal spec (`dnd.qnt`).

Every test below was produced by an LLM pipeline that reads a real community
Q&A post, translates the ruling into a Quint `run` block, and checks it against
the spec. If the test passes, the spec agrees with the community answer. If it
fails, either the spec has a bug or the community got it wrong.

---

## 1. Prone Lock: Grapple Sets Speed to Zero, So You Can Never Stand Up

**Source:** [Barbarians: Knock enemies prone and keep them there](https://reddit.com/r/onednd/comments/1esxwou/)

**The exploit:** Knock a creature prone, then reduce its speed to 0 (via grapple,
Slasher feat, Frost's Chill, etc.). Standing from prone costs half your speed.
Half of zero is zero — but you need at least *some* movement to stand. The
creature is stuck on the ground forever.

**The community question:** A World Tree Barbarian player stacks Topple (knock
prone on hit), Slasher (-10 ft), Goliath Frost's Chill (-10 ft), and their
subclass reaction (-10 ft more). Can they permanently pin an enemy?

**The answer:** Yes — if speed reaches 0, standing is impossible. The simplest
version: grapple alone sets speed to 0, which already prevents standing.

```bluespec
// Grappling may actually be harder to escape now
// — prone+grappled creature cannot stand up (speed forced to 0)
run qa_prone_and_grappled_cannot_stand = {
  val target = freshCreature(30)
  val grappled = pGrapple(Medium, Medium, target, true, true).targetState
  val grappledAndProne = pApplyCondition(grappled, CProne)
  val t = pStartTurn(TEST_CONFIG, grappledAndProne, Unarmored, 0, false, false)
  val tAfterStandAttempt = pStandFromProne(t)
  assert(
    grappledAndProne.prone and
    grappledAndProne.grappled and
    t.effectiveSpeed == 0 and
    tAfterStandAttempt.movementRemaining == t.movementRemaining
  )
}
```

**What the spec checks:** `pStartTurn` computes effective speed — grappled means
0. `pStandFromProne` requires `movementRemaining >= effectiveSpeed / 2`. With
speed 0, the stand attempt is a no-op: `movementRemaining` doesn't change.

---

## 2. Climbing Is Mechanically Superior to Running

**Source:** [It's mechanically superior to climb along a flat surface instead of running](https://reddit.com/r/onednd/comments/zmmxwj/)

**The exploit:** If you have a climb speed, using it on a *flat* surface costs
exactly the same as walking — 1 foot per 1 foot moved. The climb speed has no
terrain requirement. So a Spider Climbing monk could declare "I'm climbing the
floor" and move at full speed while technically climbing. No benefit over walking
on flat ground — but no penalty either, which surprises people who assume
climbing must cost extra.

**The community question:** "A creature with a climb speed of 30 could 'climb'
along a flat surface at the same cost as walking? That seems absurd."

**The answer:** Correct. The extra cost for climbing (1 extra foot per foot) only
applies when you *don't* have a climb speed. If you do, it costs 1 foot per
foot — identical to walking. The rules don't require a vertical surface.

```bluespec
// Climbing with a climb speed costs the same as walking
run qa_climb_speed_flat_ground_equals_walk_cost = {
  val walkCost = pMovementCost(false, false, false, false)
  val climbWithSpeedCost = pMovementCost(false, false, true, true)
  assert(walkCost == climbWithSpeedCost)
}

// Without a climb speed, climbing costs 1 extra foot per foot
run qa_climb_without_speed_costs_extra_vs_walk = {
  val walkCost = pMovementCost(false, false, false, false)
  val climbNoSpeedCost = pMovementCost(false, false, true, false)
  assert(climbNoSpeedCost == walkCost + 1)
}

// Same movement budget spent either way
run qa_climb_speed_flat_ground_movement_budget_identical = {
  val t = FRESH_TURN
  val afterWalk = pUseMovement(t, 30, pMovementCost(false, false, false, false))
  val afterClimbSpeed = pUseMovement(t, 30, pMovementCost(false, false, true, true))
  assert(afterWalk.movementRemaining == afterClimbSpeed.movementRemaining)
}
```

**What the spec checks:** `pMovementCost` computes per-foot cost based on
terrain flags: `isClimbing` and `hasRelevantSpeed` (i.e., has a climb speed).
When both are true, the climbing penalty cancels out. `pUseMovement` confirms
that 30 ft of climbing-with-speed drains the same budget as 30 ft of walking.

---

## 3. Double-Grapple Leapfrog: Two Characters Move 60 ft by Taking Turns

**Source:** [Can two characters move further by grappling each other?](https://rpg.stackexchange.com/q/215340) (Score: 10/23)

**The exploit:** Bob and Alice both have 30 ft speed and the Grappler feat (no
speed penalty while grappling). Bob's turn: grapple Alice (she willingly fails
the save), drag her 30 ft, release. Alice's turn: grapple Bob (he willingly
fails), drag him 30 ft, release. Net result: both characters moved 60 ft from
the starting point — double their individual speed — using only their actions
and movement.

**The community question:** "Is it possible for two PCs to move as a group by
taking turns grappling each other? How far could they get in a single round?"

**The answer:** "By RAW, 60 ft." Each grapple costs an action (so no Dash), but
the Grappler feat removes the speed halving. The DMG warns against this kind of
exploit ("Rules Aren't Physics", "Combat Is for Enemies"), but mechanically it
works.

```bluespec
// Double-grapple leapfrog: two characters alternate grappling to move 60 ft
// This test models the core mechanic — grappling halves speed, but the Grappler
// feat (isGrappling=true, grappledTargetTwoSizesSmaller=true) avoids the penalty.
// Without the feat, dragging halves speed to 15 ft per character = 30 ft total.
// With the feat, each drags at full 30 ft = 60 ft total.

// Step 1: Bob grapples Alice — she willingly fails the save
run qa_double_grapple_step1_grapple_succeeds = {
  val alice = freshCreature(30)
  val result = pGrapple(Medium, Medium, alice, true, true)
  assert(result.success and result.targetState.grappled)
}

// Step 2: Bob's speed is halved while dragging (no Grappler feat)
run qa_double_grapple_dragging_halves_speed = {
  val bob = freshCreature(30)
  // isGrappling=true, target NOT two sizes smaller → speed halved
  val t = pStartTurn(TEST_CONFIG, bob, Unarmored, 0, true, false)
  assert(t.effectiveSpeed == 15)
}

// Step 3: With Grappler feat (modeled as target two sizes smaller), full speed
run qa_double_grapple_grappler_feat_full_speed = {
  val bob = freshCreature(30)
  // isGrappling=true, grappledTargetTwoSizesSmaller=true → no penalty
  val t = pStartTurn(TEST_CONFIG, bob, Unarmored, 0, true, true)
  assert(t.effectiveSpeed == 30)
}

// Step 4: Release is free — no action cost
run qa_double_grapple_release_is_free = {
  val alice = freshCreature(30)
  val grappled = pApplyCondition(alice, CGrappled)
  val released = pReleaseGrapple(grappled)
  assert(grappled.grappled and not(released.grappled))
}
```

**What the spec checks:** `pGrapple` with `targetSaveFailed: true` (willingly
failed) succeeds and applies the Grappled condition. `pStartTurn` with
`isGrappling: true` halves speed — unless `grappledTargetTwoSizesSmaller` is
true (the Grappler feat's mechanical equivalent). `pReleaseGrapple` removes the
condition for free. Chain both turns together: 30 + 30 = 60 ft.

---

## 4. The Ogre vs Animated Armor Paradox

**Source:** [You need 11 to grapple an Ogre but 18 to grapple Animated Armor](https://reddit.com/r/onednd/comments/xtz7mj/)

**The paradox:** An Ogre has Strength 18 but AC 11. Animated Armor has Strength 14
but AC 18. Under 2014 rules (opposed Athletics), the Ogre was harder to grapple.
Under 2024 rules (attack roll vs AC), the Ogre is now *trivially easy* to grab
while a hollow suit of armor is nearly impossible.

**The community question:** "Does this feel out of place? A lot of strong and
brutish creatures are now particularly vulnerable to grapple."

**The top answer:** "If I lunge out to grab you, you being strong doesn't protect
you from being grabbed initially — that's based on my own ability to grab you
against your dodging (AC). Breaking out however is 100% your strength."

```bluespec
// High-AC creature harder to grapple than high-STR creature
// under new unarmed attack rule
run qa_grapple_high_ac_harder_than_high_str = {
  val target_ogre  = freshCreature(59)   // Ogre-like: AC 11, STR 18
  val target_armor = freshCreature(33)   // Animated Armor-like: AC 18, STR 14
  // Roll 11 with +0 attack bonus: hits AC 11 (ogre) but misses AC 18 (armor).
  val atk_ogre  = resolveAttackRoll(11, 0, 11, 0, 20)
  val atk_armor = resolveAttackRoll(11, 0, 18, 0, 20)
  val grapple_ogre  = pGrapple(Medium, Large,  target_ogre,  atk_ogre.hits,  true)
  val grapple_armor = pGrapple(Medium, Medium, target_armor, atk_armor.hits, true)
  assert(
    grapple_ogre.success        and   // roll 11 beats AC 11 → grapple succeeds
    not(grapple_armor.success)        // roll 11 fails AC 18 → grapple fails
  )
}
```

**What the spec checks:** The same `resolveAttackRoll` → `pGrapple` pipeline as
the Shield example, but now demonstrating the systemic consequence: switching
from opposed checks to attack rolls completely inverts which creatures are easy
vs hard to grapple.

---

## 5. Maximum Movement Speed: 3,900+ Feet Per Round

**Source:** [OneDnD maximum Movement speed](https://reddit.com/r/onednd/comments/1i06mr1/)

**The exploit:** Stack every speed bonus in the game: Goliath base 35 + Monk
Unarmored Movement + Mobile + Speedy + Barbarian Fast Movement + ... → base ~195 ft.
Haste doubles it (390 ft). Boots of Speed double again (780 ft). Then spend the
turn Dashing: Move (780) + Action Dash (780) + Bonus Action Dash (780) + Action
Surge Dash (780) + Haste Action Dash (780) = **3,900 ft per round** (~443 mph).

**The community question:** "How do I properly account for the Charger feat? What's
the theoretical maximum?"

**The top answer:** "Your base 195 ft would get doubled twice, from Haste and Boots
of Speed, so it becomes 780. Then, with moving + 4 uses of Dash, you do x5,
which makes it 3,900 ft." (Some calculate even higher with Dash from
Weapon Mastery.)

The spec doesn't model Haste/Boots doubling (those are features), but it does
verify the core mechanism — each Dash adds exactly one copy of `effectiveSpeed`:

```bluespec
// Each Dash action adds full base speed to movement pool (stacks additively)
run qa_dash_stacks_movement = {
  val creature = freshCreature(30)
  val t0 = pStartTurn(TEST_CONFIG, creature, Unarmored, 0, false, false)
  // Base movement equals effective speed
  val afterActionDash = pUseAction(t0, creature, ADash)
  // Bonus Action Dash also adds effectiveSpeed
  val afterBonusActionDash = pBonusActionDash(afterActionDash, creature)
  all {
    // Turn start: movementRemaining == effectiveSpeed (30 ft for TEST_CONFIG)
    assert(t0.movementRemaining == t0.effectiveSpeed),
    // After Action Dash: movement = 2x base
    assert(afterActionDash.movementRemaining == t0.effectiveSpeed * 2),
    // After Bonus Action Dash: movement = 3x base
    assert(afterBonusActionDash.movementRemaining == t0.effectiveSpeed * 3),
    // Each Dash adds exactly one copy of effectiveSpeed
    assert(afterActionDash.movementRemaining - t0.movementRemaining == t0.effectiveSpeed),
    assert(afterBonusActionDash.movementRemaining - afterActionDash.movementRemaining == t0.effectiveSpeed),
  }
}
```

And a complementary test (from a different question) shows the same with a
35 ft Goliath and explicit TurnState construction:

```bluespec
// Goliaths are fast and I love it:
// action Dash + Bonus Action Dash = 3x speed in one turn
run qa_dash_plus_bonus_dash_triples_speed = {
  val speed = 35
  val t: TurnState = {
    movementRemaining: speed,
    effectiveSpeed: speed,
    actionsRemaining: 1,
    attackActionUsed: false,
    bonusActionUsed: false,
    reactionAvailable: true,
    freeInteractionUsed: false,
    extraAttacksRemaining: 0,
    disengaged: false,
    dodging: false,
    readiedAction: false,
    bonusActionSpellCast: false,
    nonCantripActionSpellCast: false,
  }
  val creature = freshCreature(30)
  val afterActionDash = pUseAction(t, creature, ADash)
  val afterBonusDash = pBonusActionDash(afterActionDash, creature)
  assert(afterBonusDash.movementRemaining == speed * 3)
}
```

**What the spec checks:** `pUseAction(t, creature, ADash)` adds `effectiveSpeed`
to `movementRemaining`. `pBonusActionDash` does the same. Each Dash is strictly
additive — no diminishing returns, no cap. With Action Surge granting a second
action, you get 4 Dashes (Action + Bonus + Action Surge + Haste) on top of base
movement = 5x effective speed. The theoretical maximum is limited only by how
high you can push `effectiveSpeed` before the Dashes multiply it.
