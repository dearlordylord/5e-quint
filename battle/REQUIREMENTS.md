# Battle State — Requirements (SRD-Derived)

Everything in this file is derived from SRD 5.2.1 text. Each requirement
references its source. Accepted design boundaries live in
[`ARCHITECTURE.md`](../ARCHITECTURE.md), not here.

---

## R1: Turn Structure

**Source:** playing-the-game.md, "Combat Step by Step" (lines 483-487)

Combat is strictly sequential and turn-based:

1. Determine initiative (DEX check, ties broken by DM)
2. Each participant takes a turn in initiative order
3. When everyone has had a turn, the round ends
4. Repeat until combat ends

**"On your turn, you can move a distance up to your Speed and take one action."** (line 501)

There is no simultaneous declaration, no "collect actions then resolve." One creature acts at a time.

## R1.1: Initiative Order

**Source:** playing-the-game.md, "Initiative Order" (lines 495-497)

"A combatant's check total is called their Initiative count, or Initiative for short. The GM ranks the combatants, from highest to lowest Initiative. This is the order in which they act during each round. **The Initiative order remains the same from round to round.**"

Initiative is determined once and does not change during combat (with two exceptions below).

### R1.2: Initiative Ties

**Source:** playing-the-game.md, "Ties" (line 497)

"If a tie occurs, the GM decides the order among tied monsters, and the players decide the order among tied characters. The GM decides the order if the tie is between a monster and a player character."

Tie resolution is decided once at combat start, not re-decided each round.

### R1.3: Initiative Exceptions

Two features modify the initiative order. Both are one-time adjustments, not ongoing reordering.

**Alert feat — Initiative Swap**
Source: feats.md (lines 29-31)
"Immediately after you roll Initiative, you can swap your Initiative with the Initiative of one willing ally in the same combat. You can't make this swap if you or the ally has the Incapacitated condition."

**Thief's Reflexes (Rogue L17)**
Source: classes.md (line 193)
"You can take two turns during the first round of any combat. You take your first turn at your normal Initiative and your second turn at your Initiative minus 10."
This adds a second entry to the initiative order for round 1 only. It is not a reordering.

### R1.4: No Delay Mechanic

The SRD has no "delay turn" rule. The only way to act later is the Ready action (R6), which uses your turn to prepare a reaction — it does not change your initiative position.

### R1.5: Initiative-Adjacent Triggers

Several class features trigger "when you roll Initiative" but do not change the order:

| Feature                         | Source               | Effect                            |
| ------------------------------- | -------------------- | --------------------------------- |
| Barbarian Persistent Rage (L15) | classes.md:329       | Regain all expended Rage uses     |
| Bard Superior Inspiration (L20) | classes.md:924       | Regain Bardic Inspiration up to 2 |
| Monk Uncanny Metabolism         | classes.md:5172-5174 | Regain Focus Points + heal (1/LR) |
| Druid Evergreen Wild Shape      | classes.md:3634      | Regain 1 Wild Shape if at 0       |
| Fighter Tactical Master (L9)    | classes.md:4872      | Advantage on Initiative rolls     |
| Barbarian Feral Instinct (L7)   | classes.md:300       | Advantage on Initiative rolls     |

### R1.6: Surprise

**Source:** playing-the-game.md (line 493), rules-glossary.md (lines 1008-1010)

"If a combatant is surprised by combat starting, that combatant has Disadvantage on their Initiative roll."

Surprise does NOT skip a turn or change position — it only applies disadvantage to the initiative roll, which typically results in a lower count.

## R2: Reactions — General Rules

**Source:** playing-the-game.md, "Reactions" (lines 326-332)

Reactions are the sole mechanism for acting outside your turn:

- **One per round:** "you can't take another one until the start of your next turn"
- **Trigger-based:** each reaction specifies its trigger condition
- **Default timing:** "a Reaction takes place immediately after its trigger unless the Reaction's description says otherwise"
- **Resumption:** "If the reaction interrupts another creature's turn, that creature can continue its turn right after the Reaction"

## R3: Reaction Nesting

**Source:** Implicit from R2 — no rule limits nesting depth.

Reactions can trigger other reactions. The only constraint is that each creature can react at most once per round. Therefore:

- Nesting depth is bounded by the number of creatures with unused reactions and a valid reaction for the current trigger
- Example: Mage A casts spell → Mage B Counterspells → Mage C Counterspells B's Counterspell → Mage D Counterspells C's Counterspell. Depth 3, all legal.
- The reaction stack resolves innermost-first (last Counterspell resolves first, then the one it was countering, etc.)

## R4: Simultaneous Effects

**Source:** rules-glossary.md, "Simultaneous Effects" (line 892-894)

"If two or more things happen at the same time on a turn, the person at the game table — player or GM — whose turn it is decides the order in which those things happen."

This applies to multiple effects on the SAME turn, not to creatures acting simultaneously.

## R5: Opportunity Attack

**Source:** playing-the-game.md, "Opportunity Attacks"

- Trigger: "when a creature that you can see leaves your reach"
- Cost: one reaction
- Timing: **"The attack occurs right before it leaves your reach"** — fires BEFORE movement completes (overrides R2 default timing)
- Attack type: one melee attack with weapon or Unarmed Strike

## R6: Ready Action

**Source:** rules-glossary.md, "Ready [Action]" (lines 818-826)

- Uses your action on your turn to prepare a reaction
- You specify: a perceivable trigger + an action (or movement) to take
- "When the trigger occurs, you can either take your Reaction right after the trigger finishes or ignore the trigger"
- Readied spells: cast immediately (slot expended), held via Concentration until trigger or start of next turn. If Concentration breaks, spell dissipates with no effect.

## R7: Legendary Actions

**Source:** rules-glossary.md, "Legendary Actions"

- Only certain monsters have them
- Taken **at the end of another creature's turn**
- Limited number per round (restored at start of monster's turn)
- Not reactions — a separate mechanic. A monster can use a legendary action AND still have its reaction available.

---

## R10: Complete Reaction Catalog (SRD 5.2.1)

Every reaction in the SRD, organized by trigger timing.

### R10.1: Reactions with RETROACTIVE timing

Trigger says "hit" or "succeeds" — but the reaction can turn the hit into a miss or the success into a failure. The roll already happened; the threshold changes.

| Reaction                     | Source              | Trigger                                                                    | Effect                                                 |
| ---------------------------- | ------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------ |
| Shield (spell)               | spells.md:219       | "when you are hit by an attack roll or targeted by Magic Missile"          | +5 AC incl. triggering attack, no Magic Missile damage |
| Cutting Words (Bard/Lore L3) | classes.md:1735     | "creature makes a damage roll or succeeds on ability check or attack roll" | subtract Bardic Inspiration die from roll              |
| Erinyes Parry                | monsters-A-Z.md:119 | "hit by melee attack roll while holding weapon"                            | +4 AC against that attack                              |
| Gladiator Parry              | monsters-A-Z.md:656 | "hit by melee attack roll while holding weapon"                            | +3 AC against that attack                              |
| Knight Parry                 | monsters-A-Z.md:558 | "hit by melee attack roll while holding weapon"                            | +2 AC against that attack                              |
| Marilith Parry               | monsters-A-Z.md:199 | "hit by melee attack roll while holding weapon"                            | +5 AC against that attack                              |
| Shield Guardian Protection   | monsters-A-Z.md:986 | "attack hits amulet wearer within 5ft"                                     | +5 AC incl. triggering attack                          |
| Mummy Whirlwind of Sand      | monsters-A-Z.md:577 | "hit by attack roll"                                                       | +2 AC against attack + teleport 60ft                   |

### R10.2: Reactions with BEFORE timing

Trigger is an action in progress. Reaction fires before it completes, potentially canceling it.

| Reaction                  | Source              | Trigger                                               | Effect                                        |
| ------------------------- | ------------------- | ----------------------------------------------------- | --------------------------------------------- |
| Counterspell (spell)      | spells.md:1189      | "see creature within 60ft casting a spell with V/S/M" | target CON save; fail = spell dissipates      |
| Opportunity Attack (rule) | playing-the-game.md | "creature you can see leaves your reach"              | one melee attack "right before" leaving reach |
| Feather Fall (spell)      | spells.md:287       | "you or creature within 60ft falls"                   | descent slows to 60ft/round, no fall damage   |

### R10.3: Reactions with DAMAGE REDUCTION timing

Attack hit is confirmed. Reaction modifies the incoming damage amount.

| Reaction                               | Source                  | Trigger                                          | Effect                                                                |
| -------------------------------------- | ----------------------- | ------------------------------------------------ | --------------------------------------------------------------------- |
| Uncanny Dodge (Rogue L5)               | classes.md:7087         | "attacker you can see hits you with attack roll" | halve the attack's damage                                             |
| Deflect Attacks (Monk L3)              | classes.md:5178         | "attack roll hits you, damage includes B/P/S"    | reduce by 1d10+DEX+level; if 0, spend 1 FP to redirect                |
| Slow Fall (Monk L4)                    | classes.md:5192         | "when you fall"                                  | reduce fall damage by 5x monk level                                   |
| Superior Hunter's Defense (Ranger L15) | classes.md:6839         | "when you take damage"                           | resistance to that damage type until end of turn                      |
| Storm Giant Deflect Missile            | monsters-A-Z.md, T-Z.md | "hit by ranged attack, B/P/S damage"             | reduce by 1d10+6; if 0, redirect 1d10+6 force to creature within 60ft |
| Warlock Familiar Resistance            | classes.md:9133         | "familiar takes damage"                          | grant familiar resistance to that damage                              |

### R10.4: Reactions with AFTER timing

Trigger fully resolves. Reaction is a separate, independent response.

| Reaction                        | Source              | Trigger                                                        | Effect                                           |
| ------------------------------- | ------------------- | -------------------------------------------------------------- | ------------------------------------------------ |
| Hellish Rebuke (spell)          | spells.md:1157      | "taking damage from creature you can see within 60ft"          | 2d10 fire damage to attacker (DEX save for half) |
| Retaliation (Barbarian L10)     | classes.md:365      | "take damage from creature within 5ft"                         | one melee attack against that creature           |
| Countercharm (Bard L7)          | classes.md:916      | "you or creature within 30ft fails save vs charmed/frightened" | reroll save with advantage                       |
| Nalfeshnee Pursuit              | monsters-A-Z.md:632 | "creature ends move within 120ft"                              | teleport within 10ft of that creature            |
| Rust Monster Reflexive Antennae | monsters-A-Z.md:717 | "attack roll hits rust monster"                                | use Antennae on attacker's metal item            |
| Black Pudding Split             | monsters-A-Z.md:864 | "becomes bloodied or takes lightning/slashing"                 | splits into two smaller puddings                 |
| Ochre Jelly Split               | monsters-A-Z.md:785 | "becomes bloodied or takes lightning/slashing"                 | splits into two smaller jellies                  |

### R10.5: Reactions that grant actions

Reaction triggers an action for self or ally, rather than directly modifying the trigger.

| Reaction                  | Source              | Trigger                                    | Effect                              |
| ------------------------- | ------------------- | ------------------------------------------ | ----------------------------------- |
| Warlock Familiar Attack   | classes.md:9193     | "you take Attack action, forgo one attack" | familiar attacks with its reaction  |
| Lich Protective Magic     | monsters-A-Z.md:747 | spell trigger (Shield or Counterspell)     | cast Shield or Counterspell         |
| Mage Protective Magic     | monsters-A-Z.md:42  | spell trigger (Shield or Counterspell)     | cast Shield or Counterspell (3/day) |
| Archmage Protective Magic | monsters-A-Z.md:90  | spell trigger (Shield or Counterspell)     | cast Shield or Counterspell (3/day) |

### R10.6: Special trigger — turn start

| Reaction               | Source             | Trigger                                              | Effect                                         |
| ---------------------- | ------------------ | ---------------------------------------------------- | ---------------------------------------------- |
| Cambion Unnerving Gaze | monsters-A-Z.md:75 | "creature starts turn within 30ft and can see devil" | WIS save DC 15 or frightened until end of turn |

---

## R20: Attack Resolution Interrupt Points

An attack resolves in phases. Each phase has an interrupt point where reactions can fire.

**Source:** Derived from R10 catalog — these are not stated as "phases" in the SRD, but the reaction triggers define implicit interrupt points in the attack resolution sequence.

```
Phase 1: Roll
  Attacker rolls d20 + modifiers.
  No interrupt point here — no reactions trigger on "an attack is declared."

Phase 2: Hit determination
  Compare roll to target AC.
  ── INTERRUPT POINT A: "when hit" / "when succeeds" ──
  Reactions: Shield, Parry variants, Cutting Words, Shield Guardian, Mummy Whirlwind
  These may change AC or modify the roll → recalculate hit/miss.

Phase 3: Damage roll
  If still a hit: attacker rolls damage.
  ── INTERRUPT POINT B: "when you take damage from an attack" ──
  Reactions: Uncanny Dodge, Deflect Attacks, Superior Hunter's Defense, Storm Giant Deflect
  These reduce or halve the damage amount.

Phase 4: Damage application
  Apply (possibly modified) damage to target.
  ── INTERRUPT POINT C: "after taking damage" ──
  Reactions: Hellish Rebuke, Retaliation, Rust Monster Antennae, Split
  These are independent responses — new events that may themselves trigger reactions.
```

## R21: Spell Cast Interrupt Point

**Source:** Counterspell trigger (spells.md:1189)

```
Phase 1: Declare spell, expend slot/action
  ── INTERRUPT POINT: "see creature casting a spell with V/S/M" ──
  Reactions: Counterspell
  Counterspell is itself a spell → can trigger another Counterspell (see R3: nesting)

Phase 2: Spell resolves (if not countered)
  Effects applied to targets. May trigger target reactions (saves, damage, etc.)
```

## R22: Movement Interrupt Point

**Source:** OA rules (playing-the-game.md)

```
Phase 1: Creature declares movement, spends feet
  ── INTERRUPT POINT: "leaves your reach" ──
  Reactions: Opportunity Attack (fires "right before" leaving reach)
  OA is an attack → feeds into R20 attack resolution with its own interrupt points

  Also: Nalfeshnee Pursuit ("creature ends move within 120ft") — AFTER timing

Phase 2: Movement completes (if not killed/stopped by OA)
```

## R23: Other Trigger Points

| Trigger                | When                            | Source                                 |
| ---------------------- | ------------------------------- | -------------------------------------- |
| Fall                   | creature begins falling         | Feather Fall, Slow Fall triggers       |
| Save failed            | creature fails saving throw     | Countercharm trigger                   |
| Creature turn starts   | start of a creature's turn      | Cambion Unnerving Gaze                 |
| End of creature's turn | after active creature ends turn | Legendary Actions (R7 — not reactions) |

---

## R25: Creature Roster Changes

**Source:** Not explicitly in RAW — see ASSUMPTIONS.md A33.

The SRD defines combat start ("Everyone involved rolls Initiative") and combat end ("one side is defeated, surrendered, or fled"). It does NOT define rules for mid-combat creature entry or removal.

In practice:

- **Reinforcements:** DM introduces new creatures mid-battle (caller provides initiative count)
- **Summons:** Varies by spell — some roll own initiative (Find Familiar), some share caster's (Find Steed, Summon Dragon), some have no independent turn (Conjure spells)
- **Fleeing:** Creature leaves (using movement + Dash), DM decides when to remove from initiative
- **Death:** Monsters die at 0 HP and are implicitly removed. PCs go unconscious, remain in initiative but Incapacitated.

The battle state's creature set and initiative list must support insert and remove operations.

---

## R30: Cross-Creature State Dependencies

Rules where one creature's state affects another creature's state or rolls.

**Source:** Various class features, spells.

| Dependency                      | Source                      | Description                                                                                                                                                 |
| ------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Paladin Aura of Protection      | classes.md                  | Paladin + allies within 10ft (L18: 30ft) add Paladin's CHA mod to saving throws. Requires paladin to not be incapacitated.                                  |
| Paladin Aura of Courage         | classes.md                  | Paladin + allies within 10ft (L18: 30ft) can't be frightened while paladin is conscious.                                                                    |
| Bard Bardic Inspiration         | classes.md                  | Bard gives die to ally within 60ft. Ally adds to one attack/check/save within 10 min. Cross-creature grant.                                                 |
| Pack Tactics (monsters)         | Various monster stat blocks | Advantage on attack if ally within 5ft of target and ally isn't incapacitated.                                                                              |
| Flanking (optional)             | NOT in SRD 5.2.1            | Not modeled.                                                                                                                                                |
| Help action                     | rules-glossary.md           | Give advantage to ally's next attack or check against a target.                                                                                             |
| Dodge action                    | rules-glossary.md           | Attacks against you have disadvantage (attacker's state reads target's state).                                                                              |
| Concentration break propagation | playing-the-game.md         | Creature's concentration breaks (damage/incapacitation/death/new spell) → concentrated spell ends → conditions/effects removed from ALL affected creatures. |
| Healing an unconscious ally     | playing-the-game.md         | Any healing on a creature at 0 HP restores them to consciousness. Cross-creature transaction.                                                               |
| Grapple                         | playing-the-game.md         | Grappler and target are linked — grappler's speed affects target's ability to move. Grapple ends if either is incapacitated or moved out of reach.          |

## R30.1: Multiple Reactors at One Interrupt Point

**Source:** Implicit from R2 — each creature has its own reaction, independently.

At any interrupt point, multiple creatures may be eligible to react — not just the target. Each creature that reacts spends its own reaction. Multiple reactions to the same trigger are legal as long as each reactor has their reaction available.

Examples:

- Attack hits B → B can Shield, AND Paladin P (within 5ft of B) can use Protection, AND Bard (within 60ft) can use Cutting Words. Each spends their own reaction.
- Creature moves away from A and B → both A and B can take Opportunity Attacks (each spending their reaction).

**Who decides order?** Per R4 (Simultaneous Effects): "the person whose turn it is decides the order." So if it's creature A's turn and A's attack triggers reactions from B, C, and D — A's player decides the order in which B, C, D react.

**Interaction with nesting:** If Paladin reacts with Protection (adding AC), that may turn the hit into a miss. If it's still a hit, the target can still react with their own Shield or Uncanny Dodge. Reactions at the same interrupt point are sequential, not simultaneous.

---

## R31: Saving Throw Transactions

**Source:** playing-the-game.md (Spellcasting), rules-glossary.md (Saving Throw), spell entries

Most offensive spells don't use attack rolls — they force saving throws. The caster's spell save DC depends on the caster's stats (8 + proficiency + spellcasting ability modifier). The target rolls against it.

This is a cross-creature transaction distinct from attacks:

```
Caster A casts Hold Person on Target B:
  A: USE_ACTION, EXPEND_SLOT, START_CONCENTRATION
  B: rolls WIS save vs A's spell save DC
     fail → APPLY_CONDITION(paralyzed)
     succeed → no effect
```

Key differences from attack transactions:

- No attack roll — the target rolls (save), not the caster
- The DC comes from the caster's state, not caller-provided AC
- No hit/miss interrupt point — reactions like Shield don't apply to saves
- Save-specific reactions exist: Countercharm (reroll save vs charm/fright), Legendary Resistance (auto-succeed)
- Evasion class feature: DEX save success → no damage (not half)

Interrupt points for save transactions:

```
Phase 1: Caster declares spell
  ── INTERRUPT: SPELL_BEING_CAST (Counterspell) ──
Phase 2: Targets make saving throws
  ── INTERRUPT: SAVE_FAILED (Countercharm, Legendary Resistance) ──
Phase 3: Apply effects (damage, conditions) to failed saves
  ── INTERRUPT: DAMAGE_TAKEN (if spell deals damage — Hellish Rebuke, etc.) ──
```

## R32: Area of Effect (1-to-Many Transactions)

**Source:** playing-the-game.md (Areas of Effect), rules-glossary.md, spell entries

AoE spells affect multiple creatures simultaneously. The caster takes one action; each target is affected independently.

```
Caster A casts Fireball (20ft radius):
  A: USE_ACTION, EXPEND_SLOT
  For each target in area {B, C, D}:
    target: DEX save vs A's spell save DC
    fail → full damage (TAKE_DAMAGE)
    succeed → half damage (TAKE_DAMAGE)
```

AoE shapes (SRD, Rules Glossary "Areas of Effect"):

- **Cone**: origin at caster, width at distance
- **Cube**: origin at a point, extends in all directions
- **Cylinder**: origin at a point, radius + height
- **Emanation**: origin centered on a point (often the caster)
- **Line**: origin at caster, width 5ft
- **Sphere**: origin at a point, radius

Which creatures are "in the area" is a spatial/distance question. Per the
[spatial ownership boundary](../ARCHITECTURE.md#spatial-modeling-frontier),
the battle machine receives the set of affected creatures as input.

Key properties:

- Each target saves/takes damage independently
- Each target's damage may trigger independent reactions
- The caster spends resources once, not per-target
- Friendly fire: AoE can hit allies unless the spell says otherwise (Evocation Wizard's Sculpt Spells exempts allies)

## R33: Concentration Links (Cross-Creature Effect Tracking)

**Source:** playing-the-game.md (Concentration), rules-glossary.md

Many spells create a **link** between caster and one or more targets:

- Caster concentrates on the spell
- Target(s) have an active effect (buff, debuff, condition) from that spell
- When the caster's concentration breaks, ALL linked effects end on ALL targets

Current single-creature spec tracks:

- `concentrationSpellId`: which spell THIS creature concentrates on
- `activeEffects`: which effects are on THIS creature (with spellId and duration)

For multi-creature, the missing information is **who cast the effect**. When caster A's concentration breaks, the battle machine must find all creatures whose `activeEffects` include an effect with `spellId == A's concentrationSpellId` and remove those effects.

Examples of concentration links:
| Spell | Caster Effect | Target Effect | Link |
|-------|---------------|---------------|------|
| Hold Person | concentrationSpellId = "hold_person" | APPLY_CONDITION(paralyzed) + activeEffect | Break conc → remove paralyzed from target |
| Bless | concentrationSpellId = "bless" | +1d4 to attacks/saves (up to 3 targets) | Break conc → all 3 targets lose bonus |
| Haste | concentrationSpellId = "haste" | extra action, +2 AC, adv DEX saves | Break conc → target incapacitated + speed 0 for 1 turn |
| Spirit Guardians | concentrationSpellId = "spirit_guardians" | damage to enemies in aura each turn | Break conc → aura ends |

This implies `ActiveEffect` needs a `casterId` field in multi-creature context, or the battle state needs a separate link registry.

## R34: Help Action as Transaction

**Source:** rules-glossary.md, "Help [Action]"

The Help action is a cross-creature transaction with no resource cost beyond the action itself:

- Helper uses their action
- Ally gains advantage on next attack roll or ability check against a specific target
- Requires: helper can see both the ally and the target, helper within 5ft of target (for attack help)

Already listed in R30 but not described as a transaction shape. It creates a temporary cross-creature link (helper → beneficiary) that expires on the beneficiary's next relevant roll.

---

## R40: Distances and Spatial Rules

**Source:** playing-the-game.md (Combat), rules-glossary.md, weapon/spell entries

All SRD distances are in **feet** (5ft increments on grid, approximate in theatre of mind). There is no zone system in RAW.

| Rule                        | Distance                                                 | Source                   |
| --------------------------- | -------------------------------------------------------- | ------------------------ |
| Melee weapon reach          | 5ft (most), 10ft (glaive, halberd, etc.)                 | Equipment, weapon tables |
| Ranged weapon normal/long   | weapon-specific (e.g., shortbow 80/320, longbow 150/600) | Equipment                |
| Opportunity attack          | "leaves your reach" (5ft or 10ft)                        | playing-the-game.md      |
| Spell range                 | Touch, Self, 30/60/90/120/150/300ft, etc.                | Per-spell entry          |
| Spell area                  | radius, cone, line, cube, sphere — in feet               | Per-spell entry          |
| Paladin auras               | 10ft (L18: 30ft)                                         | classes.md               |
| Spirit Guardians            | 15ft radius                                              | Spells                   |
| Pack Tactics                | ally within 5ft of target                                | Monster stat blocks      |
| Cover                       | DM ruling based on obstacles between attacker and target | playing-the-game.md      |
| Difficult terrain           | each foot costs 2 feet of movement                       | playing-the-game.md      |
| Forced movement (push/pull) | in feet (e.g., shove 5ft)                                | Various features         |

**Theatre of mind:** The SRD does not define an alternative system. TotM is a play style where the DM estimates feet. The rules are the same — only the precision of measurement differs.

---

## R50: Trigger Taxonomy

**Source:** Derived from the R10 reaction catalog. The active executable trigger vocabulary is owned by `packages/battle-runtime/battle-runtime-reaction-kinds.qnt` and `packages/battle-runtime/src/battle-interrupt-triggers.ts`; this catalog does not define a separate runtime trigger union.

| Trigger                  | Game moment                                        | SRD trigger phrases (from R10)                                                                                                                           | Reactions at this point                                                                             |
| ------------------------ | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| ATTACK_HITS              | Attack roll compared to AC, result is a hit        | "when you are hit by an attack roll", "hit by melee attack roll"                                                                                         | Shield, Parry (×4), Shield Guardian, Cutting Words, Mummy Whirlwind                                 |
| ATTACK_DAMAGES           | Hit confirmed, damage about to be applied          | "attacker you can see hits you with attack roll", "attack roll hits you, damage includes B/P/S", "when you take damage"                                  | Uncanny Dodge, Deflect Attacks, Superior Hunter's Defense, Storm Giant Deflect, Familiar Resistance |
| DAMAGE_TAKEN             | Damage fully applied to creature                   | "taking damage from creature", "take damage from creature within 5ft", "becomes bloodied or takes lightning/slashing", "attack roll hits" (Rust Monster) | Hellish Rebuke, Retaliation, Split (×2), Rust Monster Antennae                                      |
| SPELL_BEING_CAST         | Creature is in the process of casting a spell      | "see creature within 60ft casting a spell with V/S/M"                                                                                                    | Counterspell, Lich/Mage/Archmage Protective Magic                                                   |
| LEAVES_REACH             | Creature's movement exits another creature's reach | "creature that you can see leaves your reach"                                                                                                            | Opportunity Attack                                                                                  |
| FALLS                    | Creature begins falling                            | "you or creature within 60ft falls", "when you fall"                                                                                                     | Feather Fall, Slow Fall                                                                             |
| SAVE_FAILED              | Creature fails a saving throw                      | "you or creature within 30ft fails save vs charmed/frightened"                                                                                           | Countercharm                                                                                        |
| TURN_STARTS              | A creature's turn begins                           | "creature starts turn within 30ft and can see"                                                                                                           | Cambion Unnerving Gaze                                                                              |
| TURN_ENDS                | A creature's turn ends                             | (not a reaction trigger — Legendary Actions use this, but LA is a separate mechanic per R7)                                                              | Legendary Actions                                                                                   |
| MOVE_ENDS                | A creature finishes its movement                   | "creature ends move within 120ft"                                                                                                                        | Nalfeshnee Pursuit                                                                                  |
| ALLY_TAKES_ATTACK_ACTION | An ally takes the Attack action                    | "you take Attack action, forgo one attack"                                                                                                               | Warlock Familiar Attack                                                                             |

Caller-owned implication for the battle engine: a movement step must distinguish "leaves reach and can provoke" from "leaves reach but does not provoke" when the mover is displaced without using its movement, action, Bonus Action, or Reaction.

**Note:** ATTACK_HITS, ATTACK_DAMAGES, and DAMAGE_TAKEN are three distinct interrupt points within the same attack resolution (R20). They are sequential, not alternative. A single attack may trigger reactions at all three points.
