// -*- mode: Bluespec; -*-

// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.bardic-inspiration-grant unit-feature.bardic-inspiration-failed-d20-test unit-feature.bonus-action-dash-temporary-hit-points unit-feature.martial-arts-attack-projection unit-feature.passive-saving-throw-roll-mode unit-feature.reaction-roll-or-damage-reduction unit-feature.weapon-mastery-sap unit-feature.weapon-mastery-topple unit-feature.weapon-mastery-cleave spell.creature-type-protection-and-charm spell.find-familiar-lifecycle spell.invocation-after-hit-damage spell.invocation-after-hit-restraint-turn-start-damage spell.invocation-after-hit-timed-damage-save spell.invocation-attack-roll-advantage-save spell.invocation-beam-sequence spell.invocation-chained-attack-damage spell.invocation-command-approach-route spell.invocation-command-drop-held-object spell.invocation-command-flee-route spell.invocation-command-halt-grovel spell.invocation-condition-immunity-turn-start-temporary-hit-points spell.invocation-condition-save spell.invocation-damage-reduction spell.invocation-dancing-lights-movable-dim-light spell.invocation-expeditious-retreat-dash spell.invocation-feather-fall-mitigation spell.invocation-fog-cloud-obscurement spell.invocation-forced-reaction-movement spell.invocation-grease-ground-hazard spell.invocation-held-light-emitter spell.invocation-hideous-laughter-repeat-save-lifecycle spell.invocation-jump-movement-replacement spell.invocation-make-stable spell.invocation-marked-damage-rider spell.invocation-object-light spell.invocation-roll-modifier spell.invocation-sanctuary-targeting-interdiction spell.invocation-self-ability-check-advantage spell.invocation-sleep-repeat-save-lifecycle spell.invocation-sleep-target-admission spell.invocation-spell-hosted-weapon-attack spell.invocation-weapon-attack-override spell.invocation-weapon-damage-rider spell.reaction-counterspell spell.reaction-hellish-rebuke spell.scalar-buff
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.scalar-buff
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-roll-modifier
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-self-ability-check-advantage
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-after-hit-restraint-turn-start-damage spell.invocation-after-hit-timed-damage-save spell.invocation-condition-immunity-turn-start-temporary-hit-points
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-chained-attack-damage
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-after-hit-damage spell.invocation-spell-hosted-weapon-attack spell.invocation-weapon-attack-override spell.invocation-weapon-damage-rider
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-marked-damage-rider
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-attack-roll-advantage-save
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-condition-save
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.reaction-counterspell
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-beam-sequence
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-damage-reduction
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-sleep-repeat-save-lifecycle
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-sleep-target-admission
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-hideous-laughter-repeat-save-lifecycle
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-grease-ground-hazard
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-fog-cloud-obscurement
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-command-halt-grovel
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-command-drop-held-object
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-command-approach-route
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-command-flee-route
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-expeditious-retreat-dash
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-feather-fall-mitigation
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-forced-reaction-movement
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-jump-movement-replacement
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-sanctuary-targeting-interdiction
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.creature-type-protection-and-charm
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-object-light
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-held-light-emitter spell.invocation-dancing-lights-movable-dim-light
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-make-stable
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.find-familiar-lifecycle
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.reaction-hellish-rebuke spell.invocation-damage-save-or-attack
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.bardic-inspiration-grant unit-feature.bardic-inspiration-failed-d20-test
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.weapon-mastery-sap unit-feature.weapon-mastery-topple unit-feature.weapon-mastery-cleave
module battleRuntime {
  import attackDamageComposition.* from "../shared-algebras/proofs/rule-core/attack-damage-composition"
  import hitPointDamage.* from "../shared-algebras/proofs/rule-core/hit-point-damage"
  import hitPointRecovery.* from "../shared-algebras/proofs/rule-core/hit-point-recovery"
  import zeroHitPointLifecycle.* from "../shared-algebras/proofs/rule-core/zero-hit-point-lifecycle"
  import battleRuntimeMovementBridge.* from "./battle-runtime-movement-bridge"
  import battleRuntimeConcentrationBridge.* from "./battle-runtime-concentration-bridge"
  import battleRuntimeInterruptBridge.* from "./battle-runtime-interrupt-bridge"
  import battleRuntimeStatBlockBridge.* from "./battle-runtime-stat-block-bridge"
  import battleRuntimeFeatureBridge.* from "./battle-runtime-feature-bridge"
  import battleRuntimeSpellBridge.* from "./battle-runtime-spell-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeFindFamiliar.* from "./battle-runtime-find-familiar"
  import battleRuntimeLight.* from "./battle-runtime-light"
  import battleRuntimeCreatureTypeProtection.* from "./battle-runtime-creature-type-protection"
  import battleRuntimeArmorClass.* from "./battle-runtime-armor-class"
  import battleRuntimeThaumaturgy.* from "./battle-runtime-thaumaturgy"
  import battleRuntimeBardicInspiration.* from "./battle-runtime-bardic-inspiration"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeDamageAdjustments.* from "./battle-runtime-damage-adjustments"

  // SRD traceability for this canonical battle runtime spec:
  // - Playing-the-Game.md lines 479-495: combat proceeds in rounds and turns
  //   by Initiative order, and the Initiative order remains fixed round to round.
  // - Playing-the-Game.md lines 501-513: a turn can include one action, and
  //   doing nothing is a legal turn choice. ASSUMPTIONS.md A2 records the repo
  //   modeling choice that End Turn is a runtime transition, not a rules Action.
  // - Playing-the-Game.md lines 582-589 and 700-703: an Attack chooses a
  //   target, resolves an attack roll, rolls damage on a hit, and rolls the
  //   attack's damage dice twice on a Critical Hit.
  // - Classes/Fighter.md lines 136-138: the Champion Improved Critical
  //   feature lets weapon and Unarmed Strike attack rolls score a Critical Hit
  //   on a d20 roll of 19 or 20.
  // - Playing-the-Game.md lines 684-698 and 788-808: damage subtracts from HP,
  //   HP cannot go below 0, weapon damage adds the attack ability modifier, and
  //   Temporary Hit Points absorb damage before HP.
  // - Playing-the-Game.md lines 748-780 and ASSUMPTIONS.md A12: Stat Block
  //   monsters use Monster Death at 0 HP; Character Build combatants use the
  //   Death Saving Throw lifecycle, including instant death from massive
  //   damage. This spec covers the immediate HP-mutation boundary: drop to
  //   0 HP, damage at 0 HP, Critical Hit damage at 0 HP, Massive Damage, and
  //   start-turn Death Saving Throw rolls through Stable/dead/natural-20
  //   outcomes. Stable 1d4-hour recovery and post-battle character closeout
  //   are represented in TypeScript session state, not in this battle spec.
  // - Classes/Fighter.md lines 76-80: Action Surge grants one additional action
  //   except Magic, spends one use per Short or Long Rest, and is limited to
  //   once per turn.
  // - Classes/Fighter.md lines 64-68, Playing-the-Game.md lines 318-324 and
  //   740-746: Second Wind spends a Bonus Action and one Short/Long Rest
  //   feature use to restore 1d10 + Fighter level HP, clamped by maximum HP.
  // - Classes/Rogue.md lines 63-69 and Playing-the-Game.md lines 700-703:
  //   Sneak Attack is an optional once-per-turn on-hit damage rider for an
  //   eligible Finesse/Ranged attack, and its extra damage dice are doubled on
  //   Critical Hits.
  // - Spells/Descriptions-A-D.md lines 1588-1597, Playing-the-Game.md lines
  //   694-703, and Rules-Glossary.md lines 297-325: Divine Favor is a
  //   self-hosted Bonus Action spell whose timed effect adds extra Radiant
  //   damage dice to the caster's weapon attacks on a hit; the rider is a
  //   mandatory weapon-hit damage-roll component while active.
  // - Spells/Descriptions-A-D.md lines 1599-1609, Playing-the-Game.md lines
  //   694-703, Spells/Gaining-and-Casting.md lines 33-65, and
  //   UBIQUITOUS_LANGUAGE.md: Divine Smite is a Bonus Action spell cast
  //   immediately after a melee weapon or Unarmed Strike hit. Ordinary casting
  //   spends a Spell Slot, adds Radiant damage to that already-hit attack,
  //   scales by slot level, and adds one die against Fiends or Undead.
  //   Classes/Paladin.md lines 95-99 grants Paladin's Smite slotless Long Rest
  //   casts of Divine Smite as a class resource, not as Spell Slot state.
  // - Spells/Descriptions-E-L.md lines 1275-1288, Playing-the-Game.md lines
  //   582-589 and 694-703, Rules-Glossary.md lines 138-140 and 239-247,
  //   and UBIQUITOUS_LANGUAGE.md: Hunter's Mark is a Bonus Action
  //   Concentration spell that marks one target, adds Force damage when the
  //   caster hits that target with an Attack Roll, and can be moved with a
  //   Bonus Action after the marked target drops to 0 HP. Classes/Ranger.md
  //   lines 76-80 grants Favored Enemy slotless Long Rest casts as a class
  //   resource, not as Spell Slot state.
  // - Spells/Descriptions-E-L.md lines 168-177, Playing-the-Game.md lines
  //   318-324 and 533-551, Spells/Gaining-and-Casting.md lines 92-96,
  //   Rules-Glossary.md lines 239-247, 361-365, and 904-910, and
  //   UBIQUITOUS_LANGUAGE.md: Expeditious Retreat is a self-targeted Bonus
  //   Action Concentration spell that immediately grants Dash and stores only
  //   the permission to take Dash again as a Bonus Action while the spell
  //   lasts; Speed and Movement budget updates stay owned by Dash.
  // - Classes/Monk.md lines 102-106, Classes/Rogue.md lines 109-111,
  //   Classes/Bard.md lines 332-334, and Playing-the-Game.md lines 326-332:
  //   Deflect Attacks, Uncanny Dodge, and Cutting Words are Reactions that
  //   modify an attack roll or attack damage at the relevant interrupt point.
  // - Classes/Bard.md lines 57-67 and Rules-Glossary.md lines 138-140:
  //   Bardic Inspiration is a Bonus Action grant to another creature within
  //   60 feet who can see or hear the Bard. The target can hold only one die,
  //   the die lasts for the next hour, and the Bard's use pool is Charisma
  //   modifier with a minimum of one. The Bardic Inspiration die scales by
  //   Bard level.
  // - Classes/Monk.md lines 56-74 and Rules-Glossary.md lines 1066-1076:
  //   Martial Arts applies while unarmored, unshielded, and unarmed or wielding
  //   only Monk weapons. This battle projection covers the Bonus Action
  //   Unarmed Strike, Monk-level d6/d8/d10/d12 damage replacement, Dexterity
  //   attack/damage choice, and Dexterity Grapple/Shove save DC projection for
  //   the promoted Unarmed Strike Grapple and Shove action paths.
  // - Equipment.md lines 82-107 and UBIQUITOUS_LANGUAGE.md: Sap is a Weapon
  //   Mastery property usable only for an unlocked weapon kind; on a hit with
  //   that weapon, the target has Disadvantage on its next attack roll before
  //   the start of the attacker's next turn.
  // - Classes/Rogue.md lines 113-115, Classes/Monk.md lines 132-134, and
  //   Playing-the-Game.md lines 704-714: Evasion-style replacement riders
  //   apply only to Dexterity Saving Throw damage procedures whose successful
  //   save outcome is half damage; success becomes no damage and failure
  //   becomes half damage.
  // - Classes/Barbarian.md lines 90-92, Playing-the-Game.md lines 116-124
  //   and 185-199, and Rules-Glossary.md lines 594-604: Danger Sense gives
  //   Advantage on Dexterity Saving Throws unless the Barbarian has the
  //   Incapacitated condition.
  // - Spells/Gaining-and-Casting.md lines 3-65 and 92-96, Rules-Glossary.md
  //   lines 698-702, and Classes/Wizard.md lines 56-82: prepared level-1
  //   Wizard spells spend Spell Slots; cantrips do not.
  // - Spells/Gaining-and-Casting.md lines 176-182 and Playing-the-Game.md
  //   lines 219-222: spell attacks add Proficiency Bonus.
  // - Spells/Descriptions-E-L.md lines 1121-1132,
  //   Spells/Descriptions-M-P.md lines 85-96, and
  //   Spells/Descriptions-A-D.md lines 232-242,
  //   Spells/Descriptions-E-L.md lines 1121-1132, and
  //   Spells/Descriptions-M-P.md lines 479-490: Cure Wounds, Healing Word,
  //   and Mass Healing Word directly restore Hit Points with explicit Action
  //   or Bonus Action cost, target count, minimum slot level, and dice scaling.
  //   Spells/Descriptions-M-P.md lines 85-96 and Spells/Descriptions-Q-R.md
  //   lines 41-52: Magic Missile can allocate darts to one creature or
  //   several and gains one dart per slot level above 1; Ray of Frost reduces
  //   Speed until the start of the caster's next turn.
  // - Spells/Descriptions-A-D.md lines 709-716 and Rules-Glossary.md lines
  //   520-562: Chill Touch prevents the hit target from regaining Hit Points
  //   until the end of the caster's next turn.
  // - Spells/Descriptions-S-Z.md lines 215-224, Playing-the-Game.md lines
  //   326-332 and 582-589, and Rules-Glossary.md lines 112 and 918: Shield is
  //   a Reaction spell when hit by an attack roll, including a spell attack
  //   roll, or targeted by Magic Missile; it grants +5 AC against the
  //   triggering attack until the start of the caster's next turn and negates
  //   Magic Missile damage to that target.
  // - Spells/Descriptions-S-Z.md lines 281-291, Playing-the-Game.md lines
  //   582-589 and 694-703, Rules-Glossary.md lines 297-325 and 1028-1032,
  //   and UBIQUITOUS_LANGUAGE.md: Shillelagh is a Bonus Action cantrip cast on
  //   a held Club or Quarterstaff; attacks with that weapon can use the
  //   caster's spellcasting ability for attack and damage, use a level-scaled
  //   damage die, and choose Force or the weapon's normal damage type. The
  //   effect ends on recast or when the caster lets go of the weapon.
  // - Spells/Descriptions-E-L.md lines 1153-1169, Playing-the-Game.md lines
  //   326-332, Rules-Glossary.md lines 319-325 and 814-816, and
  //   UBIQUITOUS_LANGUAGE.md: Hellish Rebuke is a Reaction spell taken in
  //   response to taking damage from a visible creature within 60 feet. This
  //   spec models the after-damage Reaction discovery window and continuation
  //   facts plus the Dexterity save, Fire damage, half damage on success, and
  //   slotted resource spend.
  // - Spells/Descriptions-A-D.md lines 1185-1197, Playing-the-Game.md lines
  //   326-332, and Rules-Glossary.md lines 814-816: Counterspell is a
  //   slotted Reaction spell against a visible creature casting a spell with
  //   components within 60 feet. The target makes a Constitution save unless
  //   the Counterspell slot level is sufficient; an ended spell has no effect,
  //   wastes its casting action/Bonus Action/Reaction, and does not expend its
  //   slot.
  // - Spells/Descriptions-M-P.md lines 5-15 and
  //   Spells/Gaining-and-Casting.md lines 142-149: Mage Armor is a timed
  //   ongoing spell effect whose target's base AC becomes 13 + Dexterity
  //   modifier until the spell ends, with typed early end when the target dons
  //   armor.
  // - Spells/Descriptions-A-D.md lines 13-23, Spells/Gaining-and-Casting.md
  //   lines 187-220, Playing-the-Game.md lines 704-714, and Rules-Glossary.md
  //   lines 854-856: Acid Splash is an Action cantrip that creates a
  //   5-foot-radius Sphere at a point within 60 feet; each creature in the
  //   Sphere makes a Dexterity Saving Throw and takes Acid damage only on a
  //   failed save.
  // - Spells/Descriptions-E-L.md lines 427-431 and Rules-Glossary.md lines
  //   854-856: Fireball is an Action spell that creates a 20-foot-radius
  //   Sphere at a point within 150 feet; each creature in the Sphere makes a
  //   Dexterity Saving Throw and takes Fire damage, half on success. Flammable
  //   objects in the area that aren't worn or carried start burning.
  // - Spells/Gaining-and-Casting.md lines 36-38 and Rules-Glossary.md lines
  //   98-100: lacking training for worn armor prevents spellcasting while
  //   preserving Spell Slot state.
  // - Monsters/Monsters-P-S.md lines 1152-1175 and UBIQUITOUS_LANGUAGE.md:
  //   Skeleton has Bludgeoning vulnerability and Poison damage immunity.
  // - Playing-the-Game.md lines 326-332 and
  //   Spells/Gaining-and-Casting.md lines 92-100: a Reaction is an instant
  //   response to a trigger, can interrupt another creature's turn, is usable
  //   once until the start of the reactor's next turn, and reaction spells use
  //   spell-authored triggers. The battle runtime models the reusable
  //   interrupt window/continuation protocol here; individual reaction
  //   features and spells are restored by later width tasks.
  // - Playing-the-Game.md lines 533-551, Rules-Glossary.md lines 395-397,
  //   738-740, 904-910, and UBIQUITOUS_LANGUAGE.md: Movement spends a
  //   per-turn movement budget derived from Speed; Difficult Terrain and
  //   other spatial costs are caller-authored Movement costs at this runtime
  //   boundary; table-supplied reach-exit facts open an Opportunity Attack
  //   Reaction window before Movement is committed.
  // - Monsters/Overview.md lines 253-265 and ASSUMPTIONS.md A21-A24: Stat
  //   Block monster controls own Legendary Action uses and limited-use
  //   resources. This spec models the Stat Block resource boundary with a
  //   representative Goblin recharge part and Legendary Action use pool;
  //   TypeScript carries the authored StatBlockRecord catalog breadth.
  // - Monsters/Overview.md lines 229-245, Playing-the-Game.md lines
  //   318-324 and 501-503, Rules-Glossary.md line 108, and ASSUMPTIONS.md
  //   A44: Stat Block Multiattack is part of a monster's single Attack
  //   action; pending dispatches are a named-attack continuation in this
  //   runtime, Movement can interleave between dispatch attacks, and dispatches
  //   close when spent or when the turn ends. Stat Block Bonus Action options
  //   spend the one per-turn Bonus Action.
  // - Classes/Fighter.md lines 94-96, Classes/Paladin.md lines 126-128,
  //   Classes/Ranger.md lines 110-112, Playing-the-Game.md lines 501-503,
  //   Rules-Glossary.md lines 102-108, and UBIQUITOUS_LANGUAGE.md:
  //   level-5 Extra Attack changes the
  //   Attack action to produce one additional ordinary attack slot. It spends
  //   the Action once, permits Movement between the attacks, and any unspent
  //   class-feature attack slot closes when the turn ends.
  // - Rules-Glossary.md lines 102-106, 496-514, and 1074 plus
  //   Equipment.md lines 54-56 and ASSUMPTIONS.md A8/A37: the battle-owned
  //   held/wielded hand state, Light-property Off-Hand Attack damage modifier
  //   behavior, Grapple links, release, Escape Grapple, Grappled attack-roll
  //   disadvantage, and Grappled movement-cost facts are battle-owned state.
  // - Rules-Glossary.md lines 542-548 and 858-866 plus
  //   Playing-the-Game.md lines 590-600: Hide records the check total as the
  //   Search DC, grants Invisible while hidden, Search can find the hidden
  //   creature, and making an attack roll or casting a Verbal spell reveals the
  //   hidden creature.
  // - Playing-the-Game.md lines 295-305, 326-332, 499-513, and
  //   Rules-Glossary.md lines 361-365, 420-428, 528-535, 802-806, and
  //   818-826: Dash, Disengage, Dodge, Help, Ready, and standing from Prone
  //   are battle-owned turn/action or movement procedures.
  // - Spells/Descriptions-A-D.md lines 722-737, Playing-the-Game.md lines
  //   145-181 and 582-703, Rules-Glossary.md, and UBIQUITOUS_LANGUAGE.md:
  //   Chromatic Orb is a chained Spell Invocation with one cast-local
  //   damage-type choice, ordered target/Attack Roll/Damage Roll steps,
  //   duplicate d8 face detection, unique targets across the casting,
  //   previous-target 30-foot leap facts, and a leap cap equal to Cast Level.
  // - Spells/Descriptions-M-P.md lines 643-654, Descriptions-S-Z.md lines
  //   7-18, Descriptions-E-L.md lines 1417-1428, and
  //   Descriptions-A-D.md lines 707-720: Poison Spray, Sacred Flame, Inflict
  //   Wounds, Burning Hands, Color Spray, Entangle, and Chill Touch are
  //   action-time spells with creature or table-supplied area targets,
  //   cantrip/slot scaling, and the listed attack/save outcomes.
  //   Spells/Descriptions-E-L.md lines 30-41: Eldritch Blast creates ranged
  //   spell attack beams that can target creatures or objects, deal Force
  //   damage on a hit, scale to two/three/four beams at character levels
  //   5/11/17, and use a separate attack roll for each beam.
  //   Spells/Descriptions-S-Z.md lines 529-540: Starry Wisp targets one
  //   creature or object within range, makes a ranged spell attack, deals
  //   Radiant damage on a hit, and makes the hit target emit Dim Light in a
  //   10-foot radius until the end of the caster's next turn. This object-
  //   target slice models caller-supplied object identity, range legality,
  //   Armor Class, damage disposition, source-owned light emitter projection,
  //   and combatant-target Invisible-benefit denial.
  //   Spells/Descriptions-E-L.md lines 1307-1318: Ice Knife is a level-1
  //   Action spell with a primary ranged spell attack, hit-only Piercing
  //   damage, and an unconditional primary-target-anchored burst Dexterity
  //   Saving Throw that deals Cold damage only on a failed save.
  //   Spells/Descriptions-E-L.md lines 886-897, Rules-Glossary.md lines
  //   395-397 and 802-806, Playing-the-Game.md lines 543-547, and
  //   UBIQUITOUS_LANGUAGE.md: Grease is a level-1 Action spell that covers
  //   the ground in a 10-foot square, makes that area Difficult Terrain for 1
  //   minute, and forces Dexterity Saving Throws when the grease appears, when
  //   a creature enters the area, and when a creature ends its turn there; a
  //   failed save gives the Prone condition.
  //   Spells/Descriptions-E-L.md lines 584-595, Rules-Glossary.md lines
  //   239-247, 524-526, and 924-928, and UBIQUITOUS_LANGUAGE.md: Fog Cloud is a
  //   level-1 Action spell that creates a caller-supplied 20-foot-radius
  //   Sphere of fog, makes that area Heavily Obscured while Concentration
  //   lasts up to 1 hour, increases the radius by 20 feet per slot above 1,
  //   and ends early when the table supplies the strong-wind dispersal fact.
  //   Spells/Descriptions-A-D.md lines 820-835, Playing-the-Game.md lines
  //   533-551 and 634-640, Rules-Glossary.md lines 738-740 and 904-910,
  //   and UBIQUITOUS_LANGUAGE.md: Command is a level-1 Action spell whose
  //   failed Wisdom save makes the target follow the chosen command on its
  //   next turn. The Flee option spends the target's turn moving away by the
  //   fastest available means. This spec consumes caller-supplied route facts,
  //   spends the target's current Movement budget, and opens Opportunity
  //   Attack windows only from actual movement.
  //   Spells/Descriptions-S-Z.md lines 1024-1035: True Strike is an Action
  //   cantrip whose material component is a proficient weapon worth at least
  //   1 CP, immediately makes one attack with that weapon, uses the
  //   spellcasting ability for attack and damage rolls instead of Strength or
  //   Dexterity, lets the weapon damage type be Radiant or normal, and adds
  //   Radiant cantrip-scaling damage at levels 5, 11, and 17.
  // - Spells/Descriptions-E-L.md lines 435-446, Rules-Glossary.md lines
  //   110-112, 142-176, 331-350, and 730-732, and
  //   UBIQUITOUS_LANGUAGE.md: Fire Bolt is an Action cantrip with a ranged
  //   spell attack against a creature or object within 120 feet. On a hit it
  //   deals Fire damage with character-level cantrip scaling, and a flammable
  //   object starts burning if it is not worn or carried.
  // - Spells/Descriptions-S-Z.md lines 401-412, Rules-Glossary.md lines
  //   369-381, 930-932, and UBIQUITOUS_LANGUAGE.md: Spare the Dying is an
  //   Action cantrip that targets a creature at 0 HP that is not dead and
  //   makes it Stable. Its range scales by character level to 30/60/120 feet
  //   at levels 5/11/17.
  // - Character-Origins.md lines 253-255, Playing-the-Game.md lines 788-806,
  //   Rules-Glossary.md lines 361-365, and UBIQUITOUS_LANGUAGE.md:
  //   Orc Adrenaline Rush spends a limited-use Bonus Action Dash, grants
  //   Proficiency Bonus Temporary Hit Points that do not stack, and refreshes
  //   its use pool outside the battle turn reducer on Short or Long Rest.
  // - Spells/Descriptions-E-L.md lines 1183-1194, Playing-the-Game.md
  //   lines 736-738 and 788-808, and UBIQUITOUS_LANGUAGE.md:
  //   Heroism targets willing touched creatures, grants Frightened immunity
  //   until Concentration ends, and grants non-stacking Temporary Hit Points
  //   equal to the caster's spellcasting ability modifier at the start of each
  //   affected target's turns. The current runtime model only has a
  //   table-executable known-willing fact for self targets.
  // - Spells/Descriptions-A-D.md lines 85-97 and 692-703,
  //   Spells/Descriptions-M-P.md lines 907-918, and
  //   UBIQUITOUS_LANGUAGE.md: Animal Friendship is a Beast-only Wisdom-save
  //   spell whose failed save grants Charmed for 24 hours, Charm Person is a
  //   Humanoid-only Wisdom-save spell whose failed save grants Charmed for 1
  //   hour with hostile-target save Advantage, and Protection from Evil and
  //   Good applies a Concentration protection whose scoped creature types have
  //   Disadvantage on attack rolls against the target, can't possess the
  //   target, and can't apply Charmed or Frightened to the target.
  //
  // This is the canonical package-local spec for implemented
  // @dnd/battle-runtime behavior. Old root battle.qnt is legacy/Core broad
  // proof and restore source material; it is not the place to add new
  // @dnd/battle-runtime behavior.

  pure def fighterRageOccurrence(state: BattleState): ActiveOngoingFeatureOccurrence =
    state.fighter.activeOngoingFeatureOccurrences.get(FIGHTER_RAGE_SOURCE_KEY)

  pure def fighterRecklessAttackOccurrence(state: BattleState): ActiveOngoingFeatureOccurrence =
    state.fighter.activeOngoingFeatureOccurrences.get(FIGHTER_RECKLESS_ATTACK_SOURCE_KEY)

  pure def fighterHasRage(state: BattleState): bool =
    fighterRageOccurrence(state) != NoActiveOngoingFeatureOccurrence

  pure def fighterHasRoundExtendedRage(state: BattleState): bool =
    match fighterRageOccurrence(state) {
      | ActiveRoundExtendedOngoingFeature(_) => true
      | _ => false
    }

  pure def fighterHasRecklessAttack(state: BattleState): bool =
    fighterRecklessAttackOccurrence(state) == ActiveStartOfTurnOngoingFeature

  pure def fighterRageResistances(state: BattleState): Set[DamageType] =
    {
      val projection = battleRuntimeRageResistanceProjection(fighterHasRage(state))
      Set()
        .union(if (projection.bludgeoning) Set(Bludgeoning) else Set())
        .union(if (projection.piercing) Set(Piercing) else Set())
        .union(if (projection.slashing) Set(Slashing) else Set())
    }

  pure def removeFighterBonusActionOngoingFeature(state: BattleState): BattleState =
    {
      ...state,
      fighter: {
        ...state.fighter,
        activeOngoingFeatureOccurrences: state.fighter.activeOngoingFeatureOccurrences
          .set(FIGHTER_RAGE_SOURCE_KEY, NoActiveOngoingFeatureOccurrence),
      },
    }

  pure def removeFighterFirstAttackRollOngoingFeature(state: BattleState): BattleState =
    {
      ...state,
      fighter: {
        ...state.fighter,
        activeOngoingFeatureOccurrences: state.fighter.activeOngoingFeatureOccurrences
          .set(FIGHTER_RECKLESS_ATTACK_SOURCE_KEY, NoActiveOngoingFeatureOccurrence),
      },
    }

  pure def expireFighterEndOfTurnOngoingFeatures(state: BattleState): BattleState =
    if (currentActor(state) != Fighter)
      state
    else {
      val afterRoundExtended = match fighterRageOccurrence(state) {
        | ActiveRoundExtendedOngoingFeature(data) =>
            if (data.expiresAtEndOfFighterTurnRound == state.initiative.round)
              removeFighterBonusActionOngoingFeature(state)
            else
              state
        | _ => state
      }
      match fighterRageOccurrence(afterRoundExtended) {
        | ActiveFixedDurationOngoingFeature(data) =>
            if (data.expiresAtEndOfFighterTurnRound == state.initiative.round)
              removeFighterBonusActionOngoingFeature(afterRoundExtended)
            else
              afterRoundExtended
        | _ => afterRoundExtended
      }
    }

  pure def activeEffectsWithoutExpiredEndOfTurnRiders(
    effects: Set[ActiveEffect],
    actor: Actor,
    round: int
  ): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | ChillTouchHitPointRegainPrevented(data) => data.source != actor or data.expiresAtRound != round
      | StarryWispInvisibleBenefitDenied(data) => data.source != actor or data.expiresAtRound != round
      | ColorSprayBlinded(data) => data.source != actor or data.expiresAtRound != round
      | _ => true
    })

  pure def activeEffectsWithoutExpiredSapStartOfTurnRiders(
    effects: Set[ActiveEffect],
    actor: Actor,
  ): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | WeaponMasterySapNextAttackDisadvantage(data) => data.source != actor
      | _ => true
    })

  pure def expireEndOfTurnSpellEffects(state: BattleState): BattleState = {
    val actor = currentActor(state)
    val round = state.initiative.round
    {
      ...state,
      lightEmitters: lightEmittersWithoutExpiredEndOfTurnEmitters(state.lightEmitters, actor, round),
      fighter: {
        ...state.fighter,
        activeEffects: activeEffectsWithoutExpiredEndOfTurnRiders(state.fighter.activeEffects, actor, round),
      },
      goblin: {
        ...state.goblin,
        activeEffects: activeEffectsWithoutExpiredEndOfTurnRiders(state.goblin.activeEffects, actor, round),
      },
    }
  }

  pure def expireFighterStartOfTurnOngoingFeatures(state: BattleState, nextActor: Actor): BattleState =
    if (nextActor == Fighter)
      removeFighterFirstAttackRollOngoingFeature(state)
    else
      state

  pure def expireStartOfTurnEffectsForActiveActor(effects: Set[ActiveEffect]): Set[ActiveEffect] = {
    val resetEffects = resetResistanceDamageReductions(effects)
    if (battleRuntimeOneRoundShieldArmorClassBonusExpiresAtStartOfNextTurn)
      resetEffects.exclude(Set(ShieldArmorClassBonus))
    else
      resetEffects
  }

  pure def expireStartOfTurnEffectsForNonActiveActor(effects: Set[ActiveEffect], actor: Actor): Set[ActiveEffect] =
    activeEffectsWithoutExpiredSapStartOfTurnRiders(effects, actor)

  pure def expireStartOfTurnSpellEffects(state: BattleState, nextActor: Actor): BattleState =
    match nextActor {
      | Fighter => {
          ...state,
          fighter: {
            ...state.fighter,
            activeEffects: activeEffectsWithoutExpiredSapStartOfTurnRiders(
              expireStartOfTurnEffectsForActiveActor(state.fighter.activeEffects),
              Fighter
            ),
          },
          goblin: {
            ...state.goblin,
            activeEffects: expireStartOfTurnEffectsForNonActiveActor(state.goblin.activeEffects, Fighter),
          },
        }
      | Goblin => {
          ...state,
          fighter: {
            ...state.fighter,
            activeEffects: expireStartOfTurnEffectsForNonActiveActor(state.fighter.activeEffects, Goblin),
          },
          goblin: {
            ...state.goblin,
            activeEffects: activeEffectsWithoutExpiredSapStartOfTurnRiders(
              expireStartOfTurnEffectsForActiveActor(state.goblin.activeEffects),
              Goblin
            ),
          },
        }
    }

  pure def resetResistanceDamageReductions(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.map(effect => match effect {
      | ResistanceDamageReduction(data) => ResistanceDamageReduction({
          ...data,
          usedThisTurn: battleRuntimeOncePerTurnSpellEffectUsedAtTurnStart,
        })
      | JumpMovementReplacement(data) => JumpMovementReplacement({
          ...data,
          usedThisTurn: battleRuntimeOncePerTurnSpellEffectUsedAtTurnStart,
        })
      | _ => effect
    })

  pure def applyStartOfTurnSpellEffects(state: BattleState, nextActor: Actor): BattleState =
    match nextActor {
      | Fighter => {
          val heroismTempHp = state.fighter.activeEffects
            .map(effect => match effect {
              | HeroismTurnStartTemporaryHitPoints(data) => data.amount
              | _ => 0
            })
            .fold(0, (highest, amount) => if (highest > amount) highest else amount)
          {
            ...state,
            fighter: {
              ...state.fighter,
              tempHp: battleRuntimeTurnStartTemporaryHitPoints(state.fighter.tempHp, heroismTempHp),
            },
          }
        }
      | Goblin => {
          val heroismTempHp = state.goblin.activeEffects
            .map(effect => match effect {
              | HeroismTurnStartTemporaryHitPoints(data) => data.amount
              | _ => 0
            })
            .fold(0, (highest, amount) => if (highest > amount) highest else amount)
          {
            ...state,
            goblin: {
              ...state.goblin,
              tempHp: battleRuntimeTurnStartTemporaryHitPoints(state.goblin.tempHp, heroismTempHp),
            },
          }
        }
    }

  pure def tickDurationActiveEffects(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects
      .map(effect => match effect {
        | MageArmor(data) => MageArmor({
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | DivineFavorWeaponDamageRider(data) => DivineFavorWeaponDamageRider({
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | HuntersMarkDamageRider(data) => HuntersMarkDamageRider({
            target: data.target,
            transfer: data.transfer,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | HexDamageRider(data) => HexDamageRider({
            target: data.target,
            ability: data.ability,
            transfer: data.transfer,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | ThaumaturgyBoomingVoice(data) => ThaumaturgyBoomingVoice({
            source: data.source,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | SearingSmiteBurning(data) => SearingSmiteBurning({
            damageDice: data.damageDice,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | AnimalFriendshipCharmed(data) => AnimalFriendshipCharmed({
            source: data.source,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | CharmPersonCharmed(data) => CharmPersonCharmed({
            source: data.source,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | DancingLightsEffect(data) => DancingLightsEffect({
            combined: data.combined,
            lightCount: data.lightCount,
            light1Position: data.light1Position,
            light2Position: data.light2Position,
            light3Position: data.light3Position,
            light4Position: data.light4Position,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | ProduceFlameHeldLight(data) => ProduceFlameHeldLight({
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | ShillelaghWeaponAttackOverride(data) => ShillelaghWeaponAttackOverride({
            weapon: data.weapon,
            damageDice: data.damageDice,
            damageDieSize: data.damageDieSize,
            spellcastingAbilityModifier: data.spellcastingAbilityModifier,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | JumpMovementReplacement(data) => JumpMovementReplacement({
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
            usedThisTurn: data.usedThisTurn,
          })
        | FeatherFallMitigation(data) => FeatherFallMitigation({
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | SanctuaryWard(data) => SanctuaryWard({
            source: data.source,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | HideousLaughterEffect(data) => HideousLaughterEffect({
            source: data.source,
            target: data.target,
            hadProne: data.hadProne,
            hadIncapacitated: data.hadIncapacitated,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | GreaseGroundHazard(data) => GreaseGroundHazard({
            areaId: data.areaId,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | FogCloudObscurement(data) => FogCloudObscurement({
            areaId: data.areaId,
            radiusFeet: data.radiusFeet,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | BardicInspirationDie(data) => BardicInspirationDie({
            source: data.source,
            dieSize: data.dieSize,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | _ => effect
      })
      .filter(effect => match effect {
        | MageArmor(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | DivineFavorWeaponDamageRider(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | HuntersMarkDamageRider(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | HexDamageRider(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | ThaumaturgyBoomingVoice(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | SearingSmiteBurning(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | AnimalFriendshipCharmed(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | CharmPersonCharmed(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | DancingLightsEffect(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | ProduceFlameHeldLight(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | ShillelaghWeaponAttackOverride(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | JumpMovementReplacement(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | FeatherFallMitigation(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | SanctuaryWard(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | HideousLaughterEffect(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | GreaseGroundHazard(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | FogCloudObscurement(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | BardicInspirationDie(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | _ => true
      })

  pure def activeEffectsContainHideousLaughterFrom(effects: Set[ActiveEffect], source: Actor): bool =
    effects.exists(effect => match effect {
      | HideousLaughterEffect(data) => data.source == source
      | _ => false
    })

  pure def hideousLaughterEffectsExpiringAfterRoundTick(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | HideousLaughterEffect(data) =>
          not(battleRuntimeTimedSpellEffectRemainsActive(battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks)))
      | _ => false
    })

  pure def combatantAfterHideousLaughterDurationTick(target: Combatant, tickedEffects: Set[ActiveEffect]): Combatant = {
    val expiring = hideousLaughterEffectsExpiringAfterRoundTick(target.activeEffects)
    val hasExpiring = expiring.size() > 0
    val remainingHideous = tickedEffects.exists(effect => match effect {
      | HideousLaughterEffect(_) => true
      | _ => false
    })
    val expiringHadProne = expiring.exists(effect => match effect {
      | HideousLaughterEffect(data) => data.hadProne
      | _ => false
    })
    val expiringHadIncapacitated = expiring.exists(effect => match effect {
      | HideousLaughterEffect(data) => data.hadIncapacitated
      | _ => false
    })
    {
      ...target,
      prone: if (hasExpiring and not(remainingHideous)) expiringHadProne else target.prone,
      incapacitated: if (hasExpiring and not(remainingHideous)) expiringHadIncapacitated else target.incapacitated,
      activeEffects: tickedEffects,
    }
  }

  pure def tickRoundDurationSpellEffects(state: BattleState): BattleState = {
    val fighterEffects = tickDurationActiveEffects(state.fighter.activeEffects)
    val goblinEffects = tickDurationActiveEffects(state.goblin.activeEffects)
    val fighterTimedConcentrationBefore =
      activeEffectsContainTimedConcentrationSpellEffect(state.fighter.activeEffects)
        or activeEffectsContainHideousLaughterFrom(state.fighter.activeEffects, Fighter)
        or activeEffectsContainHideousLaughterFrom(state.goblin.activeEffects, Fighter)
    val fighterTimedConcentrationAfter =
      activeEffectsContainTimedConcentrationSpellEffect(fighterEffects)
        or activeEffectsContainHideousLaughterFrom(fighterEffects, Fighter)
        or activeEffectsContainHideousLaughterFrom(goblinEffects, Fighter)
    val goblinTimedConcentrationBefore =
      activeEffectsContainTimedConcentrationSpellEffect(state.goblin.activeEffects)
        or activeEffectsContainHideousLaughterFrom(state.fighter.activeEffects, Goblin)
        or activeEffectsContainHideousLaughterFrom(state.goblin.activeEffects, Goblin)
    val goblinTimedConcentrationAfter =
      activeEffectsContainTimedConcentrationSpellEffect(goblinEffects)
        or activeEffectsContainHideousLaughterFrom(fighterEffects, Goblin)
        or activeEffectsContainHideousLaughterFrom(goblinEffects, Goblin)
    {
      ...state,
      lightEmitters: tickDurationLightEmitters(state.lightEmitters),
      fighter: {
        ...combatantAfterHideousLaughterDurationTick(state.fighter, fighterEffects),
        concentrating: state.fighter.concentrating
          and (not(fighterTimedConcentrationBefore) or fighterTimedConcentrationAfter),
      },
      goblin: {
        ...combatantAfterHideousLaughterDurationTick(state.goblin, goblinEffects),
        concentrating: state.goblin.concentrating
          and (not(goblinTimedConcentrationBefore) or goblinTimedConcentrationAfter),
      },
    }
  }

  pure def normalizeFighterEarlyEndedOngoingFeatures(state: BattleState): BattleState =
    if (state.fighter.wearingHeavyArmor)
      removeFighterBonusActionOngoingFeature(state)
    else if (state.fighter.incapacitated or state.fighter.unconscious)
      {
        ...state,
        fighter: {
        ...state.fighter,
          activeOngoingFeatureOccurrences: state.fighter.activeOngoingFeatureOccurrences
            .set(FIGHTER_RAGE_SOURCE_KEY, if (state.fighter.unconscious)
              NoActiveOngoingFeatureOccurrence
            else
              match fighterRageOccurrence(state) {
                | ActiveRoundExtendedOngoingFeature(_) => NoActiveOngoingFeatureOccurrence
                | _ => fighterRageOccurrence(state)
              }),
        },
      }
    else
      state

  pure def fighterRoundExtendedOngoingFeatureMaxExpiresRound(state: BattleState): int =
    match fighterRageOccurrence(state) {
      | ActiveRoundExtendedOngoingFeature(data) => data.maxExpiresRound
      | _ => state.initiative.round + 100
    }

  pure def setFighterRoundExtendedOngoingFeatureExpiry(state: BattleState, round: int): BattleState = {
    val maxRound = fighterRoundExtendedOngoingFeatureMaxExpiresRound(state)
    {
      ...state,
      fighter: {
        ...state.fighter,
        activeOngoingFeatureOccurrences: state.fighter.activeOngoingFeatureOccurrences
          .set(FIGHTER_RAGE_SOURCE_KEY, ActiveRoundExtendedOngoingFeature({
            expiresAtEndOfFighterTurnRound: if (round > maxRound) maxRound else round,
            maxExpiresRound: maxRound,
          })),
      },
    }
  }

  pure def attackTargetAc(state: BattleState): int =
    if (currentActor(state) == Fighter) combatantArmorClass(state.goblin) else combatantArmorClass(state.fighter)

  pure def openHoles(state: BattleState): Set[Hole] =
    if (currentActor(state) == Goblin and not(state.goblinRechargeAvailable))
      Set(StatBlockRechargeRoll)
    else if (currentActorCanAttack(state))
      Set(TargetChoice)
    else Set()

  pure def hideHoles(state: BattleState): Set[Hole] =
    if (
      currentActor(state) == Fighter and
      state.actionAvailable and
      not(state.fighter.unconscious) and
      state.fighterHidePrerequisite
    )
      Set(AbilityCheck)
    else Set()

  pure def hiddenDiscoveryDcValue(hidden: HiddenDiscoveryDc): int =
    match hidden {
      | HiddenDc15 => 15
      | HiddenDc16 => 16
      | HiddenDc17 => 17
      | HiddenDc18 => 18
      | HiddenDc19 => 19
      | HiddenDc20 => 20
    }

  pure def totalToHiddenState(total: int): HiddenState =
    if (total < 15) NotHidden
    else if (total == 15) HiddenByDc(HiddenDc15)
    else if (total == 16) HiddenByDc(HiddenDc16)
    else if (total == 17) HiddenByDc(HiddenDc17)
    else if (total == 18) HiddenByDc(HiddenDc18)
    else if (total == 19) HiddenByDc(HiddenDc19)
    else HiddenByDc(HiddenDc20)

  pure def fighterIsHidden(state: BattleState): bool =
    match state.fighter.hidden {
      | NotHidden => false
      | HiddenByDc(_) => true
    }

  pure def hideFighter(state: BattleState, stealthTotal: int): BattleState =
    {
      val step = battleRuntimeHide(movementProjectionForFighter(state, WalkSpeedKind), state.fighterHidePrerequisite, stealthTotal, 15)
      val advanced = stateWithFighterMovementStep(state, step)
      if (step.hidden)
      {
        ...advanced,
        fighter: { ...advanced.fighter, hidden: totalToHiddenState(stealthTotal) },
      }
      else
        { ...advanced, fighter: { ...advanced.fighter, hidden: NotHidden } }
    }

  pure def searchGoblinForFighter(state: BattleState, perceptionTotal: int): BattleState =
    match state.fighter.hidden {
      | NotHidden => {
          val step = battleRuntimeSearch(movementProjectionForGrappledGoblin(state), false, perceptionTotal, 0)
          { ...state, actionAvailable: step.actionAvailable, bonusActionAvailable: step.bonusActionAvailable }
        }
      | HiddenByDc(dc) => {
          val step = battleRuntimeSearch(
            movementProjectionForGrappledGoblin(state).with("hidden", true),
            true,
            perceptionTotal,
            hiddenDiscoveryDcValue(dc),
          )
          {
            ...state,
            actionAvailable: step.actionAvailable,
            bonusActionAvailable: step.bonusActionAvailable,
        fighter: {
          ...state.fighter,
              hidden: if (step.hidden) state.fighter.hidden else NotHidden,
        },
      }
        }
    }

  pure def revealFighterHidden(state: BattleState): BattleState =
    { ...state, fighter: { ...state.fighter, hidden: NotHidden } }

  pure def attackReplayHoles(state: BattleState, replay: AttackReplay): Set[Hole] =
    if (not(currentActorCanAttack(state)))
      Set()
    else match replay {
      | AttackNeedsTarget => Set(TargetChoice)
      | AttackNeedsAttackRoll => Set(AttackRoll)
      | AttackRollFilled(roll) =>
          if (attackHits(roll.attackTotal, roll.naturalD20, attackTargetAc(state), attackCriticalThreshold(state, currentActor(state))))
            Set(DamageRoll)
          else
            Set()
      | AttackReplayComplete => Set()
    }

  pure def endTurn(state: BattleState): BattleState = {
    val featureChecked = normalizeFighterEarlyEndedOngoingFeatures(expireFighterEndOfTurnOngoingFeatures(expireEndOfTurnSpellEffects(state)))
    val advancedInitiative = nextInitiative(featureChecked.initiative)
    val nextActor = advancedInitiative.stillToAct[0]
    val featureAdvanced = applyStartOfTurnSpellEffects(expireStartOfTurnSpellEffects(expireFighterStartOfTurnOngoingFeatures(featureChecked, nextActor), nextActor), nextActor)
    val spellDurationAdvanced = if (advancedInitiative.round > featureChecked.initiative.round)
      tickRoundDurationSpellEffects(featureAdvanced)
    else
      featureAdvanced
    val turnAdvanced = { ...spellDurationAdvanced, initiative: advancedInitiative }
    val nextActorStep =
      if (nextActor == Fighter)
        battleRuntimeStartTurn(movementProjectionForFighter(turnAdvanced, WalkSpeedKind))
      else
        battleRuntimeStartTurn(movementProjectionForGrappledGoblin(turnAdvanced))
    {
      ...spellDurationAdvanced,
      initiative: advancedInitiative,
      actionAvailable: nextActorStep.actionAvailable,
      bonusActionAvailable: nextActorStep.bonusActionAvailable,
      spellSlotUsesThisTurn: Set(),
      attackRollMadeThisTurn: false,
      dashMovementBonus: nextActorStep.dashMovementBonus,
      disengaged: nextActorStep.disengaged,
      lightWeaponAttackMade: false,
      fighterReadiedSpellHeld: if (spellDurationAdvanced.fighterReadiedSpellHeld and nextActor == Fighter) false else spellDurationAdvanced.fighterReadiedSpellHeld,
      fighterReadiedMovementHeld: if (nextActor == Fighter) nextActorStep.readiedMovementHeld else spellDurationAdvanced.fighterReadiedMovementHeld,
      fighterHelpAttackGoblinForGoblin: if (nextActor == Fighter) nextActorStep.helpAttackHeld else spellDurationAdvanced.fighterHelpAttackGoblinForGoblin,
      fighter: if (nextActor == Fighter)
        { ...spellDurationAdvanced.fighter, reactionAvailable: nextActorStep.reactionAvailable, movementSpent: nextActorStep.movementSpentFeet, dodging: nextActorStep.dodging }
      else
        spellDurationAdvanced.fighter,
      goblin: if (nextActor == Goblin)
        { ...spellDurationAdvanced.goblin, reactionAvailable: nextActorStep.reactionAvailable, movementSpent: nextActorStep.movementSpentFeet, dodging: nextActorStep.dodging }
      else
        spellDurationAdvanced.goblin,
      goblinLegendaryUsesRemaining: if (nextActor == Goblin) 2 else spellDurationAdvanced.goblinLegendaryUsesRemaining,
      goblinMultiattackDispatchesRemaining: 0,
      lastTurnActor: if (currentActor(featureChecked) == Fighter) LastTurnFighter else LastTurnGoblin,
      legendaryActionWindowConsumed: false,
      fighterSneakAttackUsedThisTurn: false,
      fighterExtraAttackSlotsRemaining: battleRuntimeExtraAttackSlotsAfterEndTurn(spellDurationAdvanced.fighterExtraAttackSlotsRemaining),
      fighterCleaveExtraAttackUsedThisTurn: false,
    }
  }

  pure def endTurnWithGoblinRechargeRoll(state: BattleState, roll: int): BattleState = {
    val advanced = endTurn(state)
    if (currentActor(advanced) == Goblin and not(advanced.goblinRechargeAvailable))
      { ...advanced, goblinRechargeAvailable: battleRuntimeRechargeAvailableAfterRoll(advanced.goblinRechargeAvailable, 5, roll) }
    else
      advanced
  }

  pure def goblinLegendaryActionWindowOpen(state: BattleState): bool =
    state.lastTurnActor == LastTurnFighter and currentActor(state) != Goblin and not(state.legendaryActionWindowConsumed)

  pure def goblinCanUseLegendaryAction(state: BattleState): bool =
    battleRuntimeCanUseLegendaryAction(
      state.goblin.hp > 0,
      goblinLegendaryActionWindowOpen(state),
      state.legendaryActionWindowConsumed,
      state.goblinLegendaryUsesRemaining,
      2,
    )

  pure def useGoblinLegendaryAction(state: BattleState): BattleState =
    if (goblinCanUseLegendaryAction(state))
      {
        ...state,
        goblinLegendaryUsesRemaining: battleRuntimeLegendaryUsesAfterUse(
          state.goblinLegendaryUsesRemaining,
          2,
          goblinLegendaryActionWindowOpen(state),
          state.goblin.incapacitated,
        ),
        legendaryActionWindowConsumed: true,
      }
    else
      state

  pure def battleTurnSpellSlotUseActor(slotUse: BattleTurnSpellSlotUse): Actor =
    match slotUse {
      | BattlePendingSpellSlotUse(actor) => actor
      | BattleCommittedSpellSlotUse(actor) => actor
    }

  pure def battleActorHasSpellSlotUse(state: BattleState, actor: Actor): bool =
    state.spellSlotUsesThisTurn.exists(slotUse => battleTurnSpellSlotUseActor(slotUse) == actor)

  pure def battleActorHasCommittedSpellSlotUse(state: BattleState, actor: Actor): bool =
    state.spellSlotUsesThisTurn.contains(BattleCommittedSpellSlotUse(actor))

  pure def canActorExpendSpellSlotThisTurn(state: BattleState, actor: Actor): bool =
    not(battleActorHasSpellSlotUse(state, actor))

  pure def claimPendingActorSpellSlotUse(state: BattleState, actor: Actor): BattleState =
    if (battleActorHasSpellSlotUse(state, actor))
      state
    else
      { ...state, spellSlotUsesThisTurn: state.spellSlotUsesThisTurn.union(Set(BattlePendingSpellSlotUse(actor))) }

  pure def releasePendingActorSpellSlotUse(state: BattleState, actor: Actor): BattleState =
    { ...state, spellSlotUsesThisTurn: state.spellSlotUsesThisTurn.filter(slotUse => slotUse != BattlePendingSpellSlotUse(actor)) }

  pure def commitActorSpellSlotUse(state: BattleState, actor: Actor): BattleState =
    if (battleActorHasCommittedSpellSlotUse(state, actor))
      state
    else {
      val released = releasePendingActorSpellSlotUse(state, actor)
      {
        ...released,
        spellSlotUsesThisTurn: released.spellSlotUsesThisTurn.union(Set(BattleCommittedSpellSlotUse(actor))),
      }
    }

  pure def counterspellFrameClaimsTriggeringSlot(frame: PendingReactionFrame): bool =
    match frame.procedure {
      | CounterspellReactionProcedure(counterspell) =>
          frame.trigger == SpellCast and counterspell.triggeringSpellUsesSlot
      | _ => false
    }

  pure def reactionWindowCanOpen(state: BattleState, frame: PendingReactionFrame): bool =
    reactionProcedureMatchesTrigger(frame.trigger, frame.procedure) and
      match frame.procedure {
        | CounterspellReactionProcedure(counterspell) =>
            not(counterspellFrameClaimsTriggeringSlot(frame)) or
              canActorExpendSpellSlotThisTurn(state, counterspell.triggeringCaster)
        | _ => true
      }

  pure def stateAfterOpeningReactionWindow(state: BattleState, frame: PendingReactionFrame): BattleState =
    match frame.procedure {
      | CounterspellReactionProcedure(counterspell) =>
          if (counterspellFrameClaimsTriggeringSlot(frame))
            claimPendingActorSpellSlotUse(state, counterspell.triggeringCaster)
          else
            state
      | _ => state
    }

  pure def reactionProcedureMatchesTrigger(
    trigger: ReactionTrigger,
    procedure: PendingReactionProcedure
  ): bool =
    match procedure {
      | ShieldReactionProcedure => trigger == AttackHit or trigger == SpellCast
      | CounterspellReactionProcedure(_) => trigger == SpellCast
      | OpportunityAttackReactionProcedure => trigger == OpportunityAttack
      | ReadiedSpellReleaseReactionProcedure => trigger == AttackHit
      | DamageInterruptionReactionProcedure =>
          trigger == AttackDamage or trigger == SaveFailed or trigger == AfterDamage
    }

  pure def openReactionWindow(state: BattleState, frame: PendingReactionFrame): BattleState =
    if (reactionWindowCanOpen(state, frame)) {
      val openingState = stateAfterOpeningReactionWindow(state, frame)
      { ...openingState, interruptStack: openingState.interruptStack.append(PendingReaction(frame)) }
    }
    else
      state

  pure def reactionFrameComplete(frame: PendingReactionFrame): bool =
    frame.eligibleReactors == frame.offeredReactors

  pure def reactionFrameCompleteAfterOffering(frame: PendingReactionFrame, reactor: Actor): bool =
    reactionFrameComplete({ ...frame, offeredReactors: frame.offeredReactors.union(Set(reactor)) })

  pure def reactorCanReact(state: BattleState, reactor: Actor): bool =
    match reactor {
      | Fighter => state.fighter.reactionAvailable
      | Goblin => state.goblin.reactionAvailable
    }

  pure def hellishRebukeAfterDamageReactionEligible(
    triggerFacts: HellishRebukeAfterDamageTrigger,
    availability: HellishRebukeAfterDamageAvailability,
  ): bool =
    match triggerFacts {
      | HellishRebukeDamageFromVisibleCreatureWithin60Feet =>
          availability.hellishRebukeAvailable and
            availability.reactionAvailable and
            availability.spellSlotAvailable
      | _ => false
    }

  pure def openHellishRebukeAfterDamageReactionWindow(
    state: BattleState,
    damager: Actor,
    damaged: Actor,
    triggerFacts: HellishRebukeAfterDamageTrigger,
    hellishRebukeAvailable: bool,
    slotLevel: int,
  ): BattleState =
    if (hellishRebukeAfterDamageReactionEligible(
      triggerFacts,
      {
        hellishRebukeAvailable: hellishRebukeAvailable,
        reactionAvailable: reactorCanReact(state, damaged),
        spellSlotAvailable: canActorExpendSpellSlotThisTurn(state, damaged),
      },
    ))
      openReactionWindow(state, {
        trigger: AfterDamage,
        procedure: DamageInterruptionReactionProcedure,
        eligibleReactors: Set(damaged),
        offeredReactors: Set(),
        continuation: ResumeHellishRebukeAfterDamage({
          damager: damager,
          damaged: damaged,
          slotLevel: slotLevel,
        }),
      })
    else
      state

  pure def spendReaction(state: BattleState, reactor: Actor): BattleState =
    match reactor {
      | Fighter => { ...state, fighter: { ...state.fighter, reactionAvailable: false } }
      | Goblin => { ...state, goblin: { ...state.goblin, reactionAvailable: false } }
    }

  pure def openDissonantWhispersAfterDamageSequence(state: BattleState): BattleState =
    openReactionWindow(state, {
      trigger: AfterDamage,
      procedure: DamageInterruptionReactionProcedure,
      eligibleReactors: Set(Fighter),
      offeredReactors: Set(),
      continuation: ResumeAfterDamage,
    })

  pure def applyShieldReactionSpell(state: BattleState, reactor: Actor): BattleState =
    match reactor {
      | Fighter => {
          ...state,
          fighter: { ...state.fighter, activeEffects: state.fighter.activeEffects.union(Set(ShieldArmorClassBonus)) },
        }
      | Goblin => {
          ...state,
          goblin: { ...state.goblin, activeEffects: state.goblin.activeEffects.union(Set(ShieldArmorClassBonus)) },
        }
    }

  pure def castShieldReactionSpell(state: BattleState, reactor: Actor): BattleState =
    if (canActorExpendSpellSlotThisTurn(state, reactor))
      commitActorSpellSlotUse(applyShieldReactionSpell(state, reactor), reactor)
    else
      state

  pure def pendingCounterspellEndsTriggeringSpell(counterspell: PendingCounterspellReaction): bool =
    counterspell.counterspellSlotLevel >= counterspell.triggeringSpellLevel or
      not(counterspell.triggeringCasterConSaveSucceeded)

  pure def counterspellSpellCastReactionEndsCounterspell(
    firstCounterspellSlotLevel: int,
    reaction: PendingCounterspellSpellCastReaction,
  ): bool =
    match reaction {
      | CounterspellSpellCastNotCountered => false
      | CounterspellSpellCastCounteredByReaction(counterspell) =>
          counterspell.counterspellSlotLevel >= firstCounterspellSlotLevel or
            not(counterspell.counterspellCasterConSaveSucceeded)
    }

  pure def pendingCounterspellTakesEffect(counterspell: PendingCounterspellReaction): bool =
    not(counterspellSpellCastReactionEndsCounterspell(
      counterspell.counterspellSlotLevel,
      counterspell.counterspellSpellCastReaction,
    ))

  pure def counterspellNestedReactionCanCast(
    state: BattleState,
    reactor: Actor,
    counterspell: PendingCounterspellReaction,
  ): bool = {
    val afterCounterspellPending = claimPendingActorSpellSlotUse(state, reactor)
    match counterspell.counterspellSpellCastReaction {
      | CounterspellSpellCastNotCountered => false
      | CounterspellSpellCastCounteredByReaction(nested) =>
          reactorCanReact(afterCounterspellPending, nested.reactor) and
            canActorExpendSpellSlotThisTurn(afterCounterspellPending, nested.reactor)
    }
  }

  pure def pendingCounterspellTakesEffectInState(
    state: BattleState,
    reactor: Actor,
    counterspell: PendingCounterspellReaction,
  ): bool =
    not(counterspellNestedReactionCanCast(state, reactor, counterspell) and
      counterspellSpellCastReactionEndsCounterspell(
        counterspell.counterspellSlotLevel,
        counterspell.counterspellSpellCastReaction,
      ))

  pure def wasteCounteredSpellCastingResource(
    state: BattleState,
    caster: Actor,
    resource: CounterspellCastingResource,
  ): BattleState =
    match resource {
      | CounterspellMagicAction => { ...state, actionAvailable: false }
      | CounterspellBonusAction => { ...state, bonusActionAvailable: false }
      | CounterspellReaction => spendReaction(state, caster)
    }

  pure def castCounterspellReactionSpell(
    state: BattleState,
    reactor: Actor,
    frame: PendingReactionFrame,
  ): BattleState =
    match frame.procedure {
      | CounterspellReactionProcedure(counterspell) => {
          val afterCounterspellPending = claimPendingActorSpellSlotUse(state, reactor)
	          val nestedCounterspellCanCast = counterspellNestedReactionCanCast(state, reactor, counterspell)
          val afterNestedCounterspell =
            match counterspell.counterspellSpellCastReaction {
              | CounterspellSpellCastNotCountered => afterCounterspellPending
              | CounterspellSpellCastCounteredByReaction(nested) =>
                  if (nestedCounterspellCanCast)
                    spendReaction(
                      commitActorSpellSlotUse(afterCounterspellPending, nested.reactor),
                      nested.reactor,
                    )
                  else
                    afterCounterspellPending
            }
          if (
            nestedCounterspellCanCast and
              counterspellSpellCastReactionEndsCounterspell(
              counterspell.counterspellSlotLevel,
              counterspell.counterspellSpellCastReaction,
            )
          )
            releasePendingActorSpellSlotUse(afterNestedCounterspell, reactor)
          else {
            val afterCounterspellSlot = commitActorSpellSlotUse(afterNestedCounterspell, reactor)
            if (pendingCounterspellEndsTriggeringSpell(counterspell)) {
              val afterReleasedTriggeringSlot =
                if (counterspell.triggeringSpellUsesSlot)
                  releasePendingActorSpellSlotUse(afterCounterspellSlot, counterspell.triggeringCaster)
                else
                  afterCounterspellSlot
              wasteCounteredSpellCastingResource(
                afterReleasedTriggeringSlot,
              counterspell.triggeringCaster,
              counterspell.triggeringCastingResource,
            )
            } else {
              afterCounterspellSlot
            }
          }
        }
      | _ => state
    }

  pure def reactionProcedureRequiresSpellSlot(procedure: PendingReactionProcedure): bool =
    match procedure {
      | ShieldReactionProcedure => true
      | CounterspellReactionProcedure(_) => true
      | _ => false
    }

  pure def reactionProcedureEndsSpellCastInState(
    state: BattleState,
    reactor: Actor,
    procedure: PendingReactionProcedure,
  ): bool =
    match procedure {
      | CounterspellReactionProcedure(counterspell) =>
          pendingCounterspellTakesEffectInState(state, reactor, counterspell) and
            pendingCounterspellEndsTriggeringSpell(counterspell)
      | _ => false
    }

  pure def hellishRebukeDamageDice(slotLevel: int): int =
    if (slotLevel < 1) 0 else 2 + (slotLevel - 1)

  pure def resolveHellishRebukeAfterDamageReaction(
    state: BattleState,
    continuation: HellishRebukeAfterDamageContinuation,
    savingThrowSucceeded: bool,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (
      continuation.damaged == continuation.damager or
      continuation.slotLevel < 1 or
      not(reactorCanReact(state, continuation.damaged)) or
      not(canActorExpendSpellSlotThisTurn(state, continuation.damaged))
    )
      state
    else {
      val afterReactionSpend = spendReaction(state, continuation.damaged)
      val damagedTarget = match continuation.damager {
        | Fighter => {
            ...afterReactionSpend,
            fighter: saveGatedDamageTarget(
              HellishRebukeSaveGate,
              afterReactionSpend.fighter,
              savingThrowSucceeded,
              damageRoll,
              concentrationSaveSucceeded,
              continuation.damaged,
            ),
          }
        | Goblin => {
            ...afterReactionSpend,
            goblin: saveGatedDamageTarget(
              HellishRebukeSaveGate,
              afterReactionSpend.goblin,
              savingThrowSucceeded,
              damageRoll,
              concentrationSaveSucceeded,
              continuation.damaged,
            ),
          }
      }
      commitActorSpellSlotUse(damagedTarget, continuation.damaged)
    }

  pure def declineReaction(state: BattleState, reactor: Actor): BattleState = {
    if (state.interruptStack.length() == 0)
      state
    else {
      val top = state.interruptStack[state.interruptStack.length() - 1]
      match top {
        | PendingReaction(frame) => {
            val updatedFrame = { ...frame, offeredReactors: frame.offeredReactors.union(Set(reactor)) }
            val decision = battleRuntimeDeclineReactionDecision(
              frame.eligibleReactors.contains(reactor),
              frame.offeredReactors.contains(reactor),
              reactionFrameComplete(updatedFrame),
            )
            match (decision) {
              | BattleRuntimeDeclinedReaction(result) => {
                  val rest = state.interruptStack.slice(0, state.interruptStack.length() - 1)
                  if (result.frameComplete)
                    { ...state, interruptStack: rest }
                  else
                    { ...state, interruptStack: rest.append(PendingReaction(updatedFrame)) }
                }
              | _ => state
            }
          }
        | _ => state
      }
    }
  }

  pure def declineReactionAndResume(state: BattleState, reactor: Actor): BattleState =
    if (state.interruptStack.length() == 0)
      state
    else {
      val top = state.interruptStack[state.interruptStack.length() - 1]
      match top {
        | PendingReaction(frame) => {
            val afterDecision = declineReaction(state, reactor)
            if (afterDecision.interruptStack.length() < state.interruptStack.length())
              resumeReactionContinuation(afterDecision, frame.continuation)
            else
              afterDecision
          }
        | _ => state
      }
    }

  pure def stateAfterResumingSpellCastReaction(
    state: BattleState,
    frame: PendingReactionFrame,
  ): BattleState =
    match frame.procedure {
      | CounterspellReactionProcedure(counterspell) =>
          if (
            frame.trigger == SpellCast and
              counterspell.triggeringSpellUsesSlot and
              (not(pendingCounterspellTakesEffect(counterspell)) or
                not(pendingCounterspellEndsTriggeringSpell(counterspell)))
          )
            commitActorSpellSlotUse(state, counterspell.triggeringCaster)
          else
            state
      | _ => state
    }

  pure def resolveReaction(state: BattleState, reactor: Actor): BattleState =
    if (state.interruptStack.length() == 0)
      state
    else {
      match (state.interruptStack[state.interruptStack.length() - 1]) {
        | PendingReaction(frame) => {
            val decision = battleRuntimeTakeReactionDecision(
              battleRuntimeReactionTrigger(frame.trigger),
              battleRuntimeReactionProcedure(frame.procedure),
              frame.eligibleReactors.contains(reactor),
              frame.offeredReactors.contains(reactor),
              reactorCanReact(state, reactor),
              not(reactionProcedureRequiresSpellSlot(frame.procedure)) or
                canActorExpendSpellSlotThisTurn(state, reactor),
              reactionFrameCompleteAfterOffering(frame, reactor),
            )
            match (decision) {
              | BattleRuntimeTookReaction(_) => {
                  val afterReactionSpend = spendReaction(state, reactor)
                  val afterReactionProcedure =
                    match frame.trigger {
                      | OpportunityAttack => resolveGoblinOpportunityAttack(afterReactionSpend, 20, 18, 4, true)
                      | AttackHit => if (frame.procedure == ReadiedSpellReleaseReactionProcedure) releaseReadiedSpell(afterReactionSpend) else castShieldReactionSpell(afterReactionSpend, reactor)
	                      | SpellCast =>
	                          match frame.procedure {
	                            | ShieldReactionProcedure => castShieldReactionSpell(afterReactionSpend, reactor)
	                            | CounterspellReactionProcedure(_) => castCounterspellReactionSpell(afterReactionSpend, reactor, frame)
	                            | _ => afterReactionSpend
	                          }
                      | _ => releaseReadiedSpell(afterReactionSpend)
	                    }
	                  val spellCastEnded =
	                    reactionProcedureEndsSpellCastInState(afterReactionSpend, reactor, frame.procedure)
	                  val closedStack = afterReactionProcedure.interruptStack.slice(0, afterReactionProcedure.interruptStack.length() - 1)
	                  val afterDecision =
	                    if (spellCastEnded)
	                      { ...afterReactionProcedure, interruptStack: closedStack }
	                    else
	                      declineReaction(afterReactionProcedure, reactor)
		                  if (
		                    afterDecision.interruptStack.length() < state.interruptStack.length()
		                      and not(spellCastEnded)
		                  ) {
	                    val resumed = resumeReactionContinuation(afterDecision, frame.continuation)
	                    stateAfterResumingSpellCastReaction(resumed, frame)
	                  }
	                  else
	                    afterDecision
                }
              | _ => state
            }
          }
        | _ => state
      }
    }

  pure def pendingReactionFrame(frame: InterruptFrame): PendingReactionFrameOption =
    match frame {
      | PendingReaction(pending) => HasPendingReactionFrame(pending)
      | PendingAttackDamageConcentration(_) => NoPendingReactionFrame
    }

  pure def openAttackDamageConcentration(state: BattleState, continuation: AttackDamageConcentrationContinuation, damage: int): BattleState =
    { ...state, interruptStack: state.interruptStack.append(PendingAttackDamageConcentration({ continuation: continuation, damage: damage })) }

  pure def resolveAttackDamageConcentration(state: BattleState, concentrationSaveSucceeded: bool): BattleState =
    if (state.interruptStack.length() == 0)
      state
    else {
      val top = state.interruptStack[state.interruptStack.length() - 1]
      match top {
        | PendingAttackDamageConcentration(frame) => {
            val rest = { ...state, interruptStack: state.interruptStack.slice(0, state.interruptStack.length() - 1) }
            match frame.continuation {
              | ResumeAttackDamageToGoblin => { ...rest, goblin: applyDamageFromSource(rest.goblin, frame.damage, 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter), actionAvailable: false }
            }
          }
        | _ => state
      }
    }

  pure def resumeReactionContinuation(state: BattleState, continuation: ReactionContinuation): BattleState =
    match continuation {
      | ResumeAttack(attack) =>
          if (state.goblin.concentrating and attack.damage > 0)
            openAttackDamageConcentration(state, ResumeAttackDamageToGoblin, attack.damage)
          else
            { ...state, goblin: applyDamageFromSource(state.goblin, attack.damage, 1, true, OrdinaryDamage, Fighter), actionAvailable: false }
      | ResumeRayOfFrost => resolveRayOfFrost(state, 15, 10, 4, true)
      | ResumePoisonSpray => resolvePoisonSpray(state, 15, 10, 7, true)
      | ResumeChillTouch => resolveChillTouch(state, 15, 10, 6, true)
      | ResumeTrueStrikeWeaponAttack => resolveTrueStrikeWeaponAttack(state, 15, 10, 4, 5, 3, 5, Radiant, Slashing, true)
      | ResumeProduceFlameHurl => resolveProduceFlameHurl(state, 15, 10, 5, true)
      | ResumeIceKnife => resolveIceKnife(state, 15, 10, 4, false, true, false, 6, true, true)
      | ResumeSaveGateDamage => resolveAcidSplash(state, false, true, 4, true, true)
      | ResumeAfterDamage => state
      | ResumeHellishRebukeAfterDamage(_) => state
      | ResumeMovement(movement) => applyFighterMovementWithSpeedKind(state, movement.speedKind, movement.movementCost)
      | ResumeCommandFleeMovement(movement) => followCommandFlee(state, movement.speedKind, movement.movementCost, false)
      | ResumeDissonantWhispersMovementThenAfterDamage(_) => openDissonantWhispersAfterDamageSequence(state)
    }

  pure def endTurnWithDeathSave(state: BattleState, deathSaveRoll: int): BattleState = {
    val advanced = endTurn(state)

    if (currentActor(advanced) == Fighter)
      { ...advanced, fighter: applyStartTurnDeathSave(advanced.fighter, deathSaveRoll) }
    else
      advanced
  }

  pure def attackHits(total: int, naturalD20: int, armorClass: int, criticalThreshold: int): bool =
    resolveAttackRoll({
      naturalD20: naturalD20,
      total: total,
      armorClass: armorClass,
      criticalThreshold: criticalThreshold,
    }).hits

  pure def attackIsCritical(naturalD20: int, criticalThreshold: int): bool =
    naturalD20MeetsCriticalThreshold(naturalD20, criticalThreshold)

  pure def fighterCriticalThreshold(state: BattleState): int =
    battleRuntimeChampionCriticalThreshold(state.fighterCriticalRange == ImprovedCriticalRange19)

  pure def attackCriticalThreshold(state: BattleState, attacker: Actor): int =
    if (attacker == Fighter) fighterCriticalThreshold(state) else 20

  pure def withFighterImprovedCriticalRange19(state: BattleState): BattleState =
    { ...state, fighterCriticalRange: ImprovedCriticalRange19 }

  pure def withFighterSneakAttack(state: BattleState): BattleState =
    { ...state, fighterSneakAttackSupported: true }

  pure def withFighterExtraAttack(state: BattleState): BattleState =
    { ...state, fighterExtraAttackSupported: true }

  pure def spendFighterAttackActionOrExtraAttackSlot(state: BattleState): BattleState =
    if (state.fighterExtraAttackSlotsRemaining > 0)
      {
        ...state,
        fighterExtraAttackSlotsRemaining: battleRuntimeExtraAttackSlotsAfterExtraAttack(state.fighterExtraAttackSlotsRemaining),
      }
    else {
      val spent = stateWithFighterMovementStep(
        state,
        battleRuntimeSpendAttackAction(movementProjectionForFighter(state, WalkSpeedKind)),
      )
      if (spent != state)
      {
        ...spent,
        fighterExtraAttackSlotsRemaining: battleRuntimeExtraAttackSlotsAfterAttackAction(
          state.actionAvailable,
          state.fighterExtraAttackSupported,
        ),
      }
      else
        state
    }

  pure def withGoblinHp(state: BattleState, hp: int, tempHp: int): BattleState =
    { ...state, goblin: { ...state.goblin, hp: hp, tempHp: tempHp } }

  pure def withFighterHp(state: BattleState, hp: int, tempHp: int): BattleState =
    { ...state, fighter: { ...state.fighter, hp: hp, tempHp: tempHp } }

  pure def fighterWeaponAttackDamageRoll(weaponDamageRoll: int): FighterWeaponAttackDamageRoll =
    { weaponDamageRoll: weaponDamageRoll, divineFavorDamageRoll: 0, divineSmiteDamageRoll: 0, huntersMarkDamageRoll: 0 }

  pure def fighterWeaponAttackDamageRollWithDivineFavor(
    weaponDamageRoll: int,
    divineFavorDamageRoll: int,
  ): FighterWeaponAttackDamageRoll =
    { weaponDamageRoll: weaponDamageRoll, divineFavorDamageRoll: divineFavorDamageRoll, divineSmiteDamageRoll: 0, huntersMarkDamageRoll: 0 }

  pure def fighterWeaponAttackDamageRollWithDivineSmite(
    weaponDamageRoll: int,
    divineSmiteDamageRoll: int,
  ): FighterWeaponAttackDamageRoll =
    { weaponDamageRoll: weaponDamageRoll, divineFavorDamageRoll: 0, divineSmiteDamageRoll: divineSmiteDamageRoll, huntersMarkDamageRoll: 0 }

  pure def fighterWeaponAttackDamageRollWithHuntersMark(
    weaponDamageRoll: int,
    huntersMarkDamageRoll: int,
  ): FighterWeaponAttackDamageRoll =
    { weaponDamageRoll: weaponDamageRoll, divineFavorDamageRoll: 0, divineSmiteDamageRoll: 0, huntersMarkDamageRoll: huntersMarkDamageRoll }

  pure def fighterSpellAttackDamageRoll(spellDamageRoll: int): FighterSpellAttackDamageRoll =
    { spellDamageRoll: spellDamageRoll, huntersMarkDamageRoll: 0 }

  pure def fighterSpellAttackDamageRollWithHuntersMark(
    spellDamageRoll: int,
    huntersMarkDamageRoll: int,
  ): FighterSpellAttackDamageRoll =
    { spellDamageRoll: spellDamageRoll, huntersMarkDamageRoll: huntersMarkDamageRoll }

  pure def resolveAttack(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: FighterWeaponAttackDamageRoll,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    resolveAttackAtBarbarianLevel(state, attackTotal, naturalD20, damageRoll, concentrationSaveSucceeded, 1)

  pure def resolveAttackWithToppleChoice(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: FighterWeaponAttackDamageRoll,
    concentrationSaveSucceeded: bool,
    forceToppleSave: bool,
    toppleSaveSucceeded: bool,
  ): BattleState =
    resolveAttackAtBarbarianLevelWithToppleChoice(state, attackTotal, naturalD20, damageRoll, concentrationSaveSucceeded, 1, OrdinaryDamage, forceToppleSave, toppleSaveSucceeded)

  pure def cleaveSecondHitDamage(weaponDamageRoll: int, attackAbilityModifier: int): int =
    weaponDamageRoll + (if (attackAbilityModifier < 0) attackAbilityModifier else 0)

  pure def resolveAttackWithCleaveChoice(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: FighterWeaponAttackDamageRoll,
    concentrationSaveSucceeded: bool,
    useCleave: bool,
    cleaveSecondTargetEligible: bool,
    cleaveAttackTotal: int,
    cleaveNaturalD20: int,
    cleaveDamageRoll: int,
    attackAbilityModifier: int,
  ): BattleState = {
    val primary = resolveAttack(state, attackTotal, naturalD20, damageRoll, concentrationSaveSucceeded)
    val cleaveAvailable =
      state.fighterGreataxeCleaveMastery and
      not(state.fighterCleaveExtraAttackUsedThisTurn) and
      attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), fighterCriticalThreshold(state))
    if (
      cleaveAvailable and
      useCleave and
      cleaveSecondTargetEligible and
      attackHits(cleaveAttackTotal, cleaveNaturalD20, combatantArmorClass(state.goblin), fighterCriticalThreshold(state))
    )
      { ...primary, goblin: applyDamageFromSource(primary.goblin, cleaveSecondHitDamage(cleaveDamageRoll, attackAbilityModifier), if (attackIsCritical(cleaveNaturalD20, fighterCriticalThreshold(state))) 2 else 1, true, OrdinaryDamage, Fighter), fighterCleaveExtraAttackUsedThisTurn: true }
    else if (cleaveAvailable and useCleave and cleaveSecondTargetEligible)
      { ...primary, fighterCleaveExtraAttackUsedThisTurn: true }
    else
      primary
  }

  pure def resolveAttackKnockOut(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: FighterWeaponAttackDamageRoll,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    resolveAttackWithDisposition(state, attackTotal, naturalD20, damageRoll, concentrationSaveSucceeded, KnockOut)

  pure def resolveAttackWithDisposition(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: FighterWeaponAttackDamageRoll,
    concentrationSaveSucceeded: bool,
    damageDisposition: DamageDisposition,
  ): BattleState =
    resolveAttackAtBarbarianLevelWithDisposition(state, attackTotal, naturalD20, damageRoll, concentrationSaveSucceeded, 1, damageDisposition)

  pure def resolveAttackAtBarbarianLevel(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: FighterWeaponAttackDamageRoll,
    concentrationSaveSucceeded: bool,
    barbarianLevel: int,
  ): BattleState =
    resolveAttackAtBarbarianLevelWithDisposition(state, attackTotal, naturalD20, damageRoll, concentrationSaveSucceeded, barbarianLevel, OrdinaryDamage)

  pure def resolveAttackAtBarbarianLevelWithDisposition(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: FighterWeaponAttackDamageRoll,
    concentrationSaveSucceeded: bool,
    barbarianLevel: int,
    damageDisposition: DamageDisposition,
  ): BattleState =
    resolveAttackAtBarbarianLevelWithToppleChoice(state, attackTotal, naturalD20, damageRoll, concentrationSaveSucceeded, barbarianLevel, damageDisposition, false, true)

  pure def weaponMasteryToppleSaveDc(attackAbilityModifier: int, proficiencyBonus: int): int =
    8 + attackAbilityModifier + proficiencyBonus

  pure def resolveAttackAtBarbarianLevelWithToppleChoice(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: FighterWeaponAttackDamageRoll,
    concentrationSaveSucceeded: bool,
    barbarianLevel: int,
    damageDisposition: DamageDisposition,
    forceToppleSave: bool,
    toppleSaveSucceeded: bool,
  ): BattleState =
    if (not(currentActorCanAttack(state)) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated)
      state
    else {
      val revealed = recordFighterAttackRoll(revealFighterHidden(state))
      val spent = spendFighterAttackActionOrExtraAttackSlot(revealed)
      val rageDamage = if (fighterHasRage(revealed)) fighterRageDamageBonus(barbarianLevel) else 0
      val divineFavorDamage = fighterDivineFavorDamage(damageRoll.divineFavorDamageRoll, revealed.fighter.activeEffects)
      val divineSmiteDamage = damageRoll.divineSmiteDamageRoll
      val huntersMarkDamage = fighterHuntersMarkDamage(damageRoll.huntersMarkDamageRoll, revealed.fighter.activeEffects, Goblin)
      if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), fighterCriticalThreshold(state))))
        { ...spent, lightWeaponAttackMade: true }
      else {
        val damaged = applyDamageFromSource(state.goblin, damageRoll.weaponDamageRoll + 3 + rageDamage + divineFavorDamage + divineSmiteDamage + huntersMarkDamage, if (attackIsCritical(naturalD20, fighterCriticalThreshold(state))) 2 else 1, concentrationSaveSucceeded, damageDisposition, Fighter)
        val sapEffects = if (state.fighterLongswordSapMastery) Set(WeaponMasterySapNextAttackDisadvantage({ source: Fighter })) else Set()
        val toppled = state.fighterQuarterstaffToppleMastery and forceToppleSave and not(toppleSaveSucceeded)
        { ...spent, goblin: { ...damaged, prone: damaged.prone or toppled, activeEffects: damaged.activeEffects.union(sapEffects) }, lightWeaponAttackMade: true }
      }
    }

  pure def trueStrikeBonusDamageDice(characterLevel: int): int =
    if (characterLevel >= 17) 3
    else if (characterLevel >= 11) 2
    else if (characterLevel >= 5) 1
    else 0

  pure def trueStrikeDamageTypeChoiceIsLegal(selectedDamageType: DamageType, weaponDamageType: DamageType): bool =
    selectedDamageType == Radiant or selectedDamageType == weaponDamageType

  pure def pactBladeDamageTypeChoiceIsLegal(selectedDamageType: DamageType, weaponDamageType: DamageType): bool =
    selectedDamageType == weaponDamageType or selectedDamageType == Necrotic or selectedDamageType == Psychic or selectedDamageType == Radiant

  pure def pactBladeAbilityModifierChoiceIsLegal(selectedAbilityModifier: int, baseAbilityModifier: int, charismaModifier: int): bool =
    selectedAbilityModifier == baseAbilityModifier or selectedAbilityModifier == charismaModifier

  pure def pactBladeAttackModifier(selectedAbilityModifier: int, proficiencyBonus: int): int =
    selectedAbilityModifier + proficiencyBonus

  pure def trueStrikeWeaponAttackModifier(spellcastingAbilityModifier: int, proficiencyBonus: int): int =
    spellcastingAbilityModifier + proficiencyBonus

  pure def trueStrikeBonusDamage(bonusDamageRoll: int, characterLevel: int): int =
    if (trueStrikeBonusDamageDice(characterLevel) > 0) bonusDamageRoll else 0

  pure def trueStrikeDamageAfterAdjustments(
    weaponDamageRoll: int,
    bonusDamageRoll: int,
    spellcastingAbilityModifier: int,
    characterLevel: int,
    selectedDamageType: DamageType,
  ): int =
    damageAfterAdjustments(
      weaponDamageRoll + spellcastingAbilityModifier,
      selectedDamageType,
      Set(),
      Set(),
      Set(),
    ) +
    damageAfterAdjustments(
      trueStrikeBonusDamage(bonusDamageRoll, characterLevel),
      Radiant,
      Set(),
      Set(),
      Set(),
    )

  pure def resolveTrueStrikeWeaponAttack(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    weaponDamageRoll: int,
    bonusDamageRoll: int,
    spellcastingAbilityModifier: int,
    characterLevel: int,
    selectedDamageType: DamageType,
    weaponDamageType: DamageType,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (
      not(state.actionAvailable) or
      currentActor(state) != Fighter or
      state.fighter.unconscious or
      state.fighter.incapacitated or
      fighterHasRage(state) or
      not(trueStrikeDamageTypeChoiceIsLegal(selectedDamageType, weaponDamageType))
    )
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), fighterCriticalThreshold(state)))) {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      { ...rolled, actionAvailable: false }
    }
    else if (state.goblin.reactionAvailable and not(state.goblin.activeEffects.contains(ShieldArmorClassBonus))) {
      openReactionWindow(recordFighterAttackRoll(revealFighterHidden(state)), {
        trigger: AttackHit,
        procedure: ShieldReactionProcedure,
        eligibleReactors: Set(Goblin),
        offeredReactors: Set(),
        continuation: ResumeTrueStrikeWeaponAttack,
      })
    }
    else {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      val damage = trueStrikeDamageAfterAdjustments(
        weaponDamageRoll,
        bonusDamageRoll,
        spellcastingAbilityModifier,
        characterLevel,
        selectedDamageType,
      )
      { ...rolled, goblin: applyDamageFromSource(state.goblin, damage, if (attackIsCritical(naturalD20, fighterCriticalThreshold(state))) 2 else 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter), actionAvailable: false }
    }

  pure def fighterSneakAttackEligible(
    state: BattleState,
    rollHasAdvantage: bool,
    allyAdjacent: bool,
    rollHasDisadvantage: bool,
  ): bool =
    state.fighterSneakAttackSupported and
    not(state.fighterSneakAttackUsedThisTurn) and
    (rollHasAdvantage or (allyAdjacent and not(rollHasDisadvantage)))

  pure def resolveAttackWithOptionalSneakAttack(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    weaponDamageRoll: int,
    sneakAttackDamageRoll: int,
    selectedSneakAttack: bool,
    rollHasAdvantage: bool,
    allyAdjacent: bool,
    rollHasDisadvantage: bool,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (not(currentActorCanAttack(state)) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated)
      state
    else {
      val revealed = recordFighterAttackRoll(revealFighterHidden(state))
      val spent = spendFighterAttackActionOrExtraAttackSlot(revealed)
      if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), fighterCriticalThreshold(state))))
        { ...spent, lightWeaponAttackMade: true }
      else {
        val sneakSelectedAndEligible =
          selectedSneakAttack and
          fighterSneakAttackEligible(revealed, rollHasAdvantage, allyAdjacent, rollHasDisadvantage)
        val damage = weaponDamageRoll + 3 + (if (sneakSelectedAndEligible) sneakAttackDamageRoll else 0)
        {
          ...spent,
          goblin: applyDamageFromSource(state.goblin, damage, if (attackIsCritical(naturalD20, fighterCriticalThreshold(state))) 2 else 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter),
          lightWeaponAttackMade: true,
          fighterSneakAttackUsedThisTurn: sneakSelectedAndEligible or revealed.fighterSneakAttackUsedThisTurn,
        }
    }
    }

  pure def uncannyDodgeDamage(damage: int): int =
    battleRuntimeUncannyDodgeDamage(damage)

  pure def deflectAttacksDamage(damage: int, deflectRoll: int, dexMod: int, monkLevel: int): int =
    battleRuntimeDeflectAttacksDamage(damage, deflectRoll, dexMod, monkLevel)

  pure def deflectAttacksRedirectTargetEligible(
    targetSeen: bool,
    attackWasMelee: bool,
    targetWithinFiveFeet: bool,
    targetWithinSixtyFeet: bool,
    targetBehindTotalCover: bool,
  ): bool =
    battleRuntimeDeflectAttacksRedirectTargetEligible(
      targetSeen,
      attackWasMelee,
      targetWithinFiveFeet,
      targetWithinSixtyFeet,
      targetBehindTotalCover,
    )

  pure def deflectAttacksRedirectDamage(
    reducedDamage: int,
    focusUsesRemaining: int,
    targetEligible: bool,
    savingThrowSucceeded: bool,
    firstMartialArtsRoll: int,
    secondMartialArtsRoll: int,
    dexMod: int,
  ): int =
    battleRuntimeDeflectAttacksRedirectDamage(
      reducedDamage,
      focusUsesRemaining,
      targetEligible,
      savingThrowSucceeded,
      firstMartialArtsRoll,
      secondMartialArtsRoll,
      dexMod,
    )

  pure def deflectAttacksRedirectFocusRemaining(
    reducedDamage: int,
    focusUsesRemaining: int,
    targetEligible: bool,
  ): int =
    battleRuntimeDeflectAttacksRedirectFocusRemaining(reducedDamage, focusUsesRemaining, targetEligible)

  pure def resolveAttackRecklessly(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: FighterWeaponAttackDamageRoll,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    resolveAttack(activateRecklessAttackOnFirstAttackRoll(state), attackTotal, naturalD20, damageRoll, concentrationSaveSucceeded)

  pure def resolveGoblinAttack(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Goblin or state.goblin.hp == 0)
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.fighter), 20)))
      { ...state, actionAvailable: false }
    else {
      val adjustedDamage = damageAfterAdjustments(damageRoll + 2, Slashing, fighterRageResistances(state), Set(), Set())
      {
        ...stateWithFighterDamage(state, applyDamageFromSource(state.fighter, adjustedDamage, if (attackIsCritical(naturalD20, 20)) 2 else 1, concentrationSaveSucceeded, OrdinaryDamage, Goblin)),
        actionAvailable: false,
      }
    }

  pure def resolveGoblinMultiattack(state: BattleState): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Goblin or state.goblin.hp == 0)
      state
    else
      { ...state, actionAvailable: false, goblinMultiattackDispatchesRemaining: battleRuntimeGoblinMultiattackDispatchesAfterFirstAttack }

  pure def goblinMultiattackDispatchContinuationOpen(state: BattleState): bool =
    currentActor(state) == Goblin and state.goblinMultiattackDispatchesRemaining > 0

  pure def resolveGoblinMultiattackDispatch(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (state.goblinMultiattackDispatchesRemaining <= 0 or currentActor(state) != Goblin or state.goblin.hp == 0)
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.fighter), 20)))
      { ...state, goblinMultiattackDispatchesRemaining: battleRuntimeGoblinMultiattackDispatchesAfterDispatch(state.goblinMultiattackDispatchesRemaining) }
    else {
      val adjustedDamage = damageAfterAdjustments(damageRoll + 2, Slashing, fighterRageResistances(state), Set(), Set())
      {
        ...stateWithFighterDamage(state, applyDamageFromSource(state.fighter, adjustedDamage, if (attackIsCritical(naturalD20, 20)) 2 else 1, concentrationSaveSucceeded, OrdinaryDamage, Goblin)),
        goblinMultiattackDispatchesRemaining: battleRuntimeGoblinMultiattackDispatchesAfterDispatch(state.goblinMultiattackDispatchesRemaining),
      }
    }

  pure def resolveGoblinOpportunityAttack(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    resolveGoblinOpportunityAttackWithDisposition(state, attackTotal, naturalD20, damageRoll, concentrationSaveSucceeded, OrdinaryDamage)

  pure def resolveGoblinOpportunityAttackWithDisposition(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
    damageDisposition: DamageDisposition,
  ): BattleState =
    if (state.goblin.hp == 0)
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.fighter), 20)))
      state
    else {
      val adjustedDamage = damageAfterAdjustments(damageRoll + 2, Slashing, fighterRageResistances(state), Set(), Set())
      stateWithFighterDamage(state, applyDamageFromSource(state.fighter, adjustedDamage, if (attackIsCritical(naturalD20, 20)) 2 else 1, concentrationSaveSucceeded, damageDisposition, Goblin))
    }

  pure def resolveGoblinOpportunityAttackWithUncannyDodge(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (state.goblin.hp == 0)
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.fighter), 20)))
      state
    else {
      val adjustedDamage = damageAfterAdjustments(uncannyDodgeDamage(damageRoll + 2), Slashing, fighterRageResistances(state), Set(), Set())
      stateWithFighterDamage(state, applyDamageFromSource(state.fighter, adjustedDamage, if (attackIsCritical(naturalD20, 20)) 2 else 1, concentrationSaveSucceeded, OrdinaryDamage, Goblin))
    }

  pure def resolveRayOfFrost(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    resolveRayOfFrostWithDamageRoll(state, attackTotal, naturalD20, fighterSpellAttackDamageRoll(damageRoll), concentrationSaveSucceeded)

  pure def resolveRayOfFrostWithDamageRoll(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: FighterSpellAttackDamageRoll,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state))
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), 20))) {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      { ...rolled, actionAvailable: false }
    }
    else if (state.goblin.reactionAvailable and not(state.goblin.activeEffects.contains(ShieldArmorClassBonus))) {
      openReactionWindow(recordFighterAttackRoll(revealFighterHidden(state)), {
        trigger: AttackHit,
        procedure: ShieldReactionProcedure,
        eligibleReactors: Set(Goblin),
        offeredReactors: Set(),
        continuation: ResumeRayOfFrost,
      })
    }
    else {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      val huntersMarkDamage = fighterHuntersMarkDamage(damageRoll.huntersMarkDamageRoll, rolled.fighter.activeEffects, Goblin)
      val damaged = applyDamageFromSource(state.goblin, damageRoll.spellDamageRoll + huntersMarkDamage, if (attackIsCritical(naturalD20, 20)) 2 else 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter)
      { ...rolled, goblin: { ...damaged, activeEffects: damaged.activeEffects.union(Set(RayOfFrostSpeedDelta)) }, actionAvailable: false }
    }

  pure def resolvePoisonSpray(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state))
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), 20))) {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      { ...rolled, actionAvailable: false }
    }
    else if (state.goblin.reactionAvailable and not(state.goblin.activeEffects.contains(ShieldArmorClassBonus))) {
      openReactionWindow(recordFighterAttackRoll(revealFighterHidden(state)), {
        trigger: AttackHit,
        procedure: ShieldReactionProcedure,
        eligibleReactors: Set(Goblin),
        offeredReactors: Set(),
        continuation: ResumePoisonSpray,
      })
    }
    else {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      val adjustedDamage = damageAfterAdjustments(damageRoll, Poison, Set(), Set(), Set())
      val damaged = applyDamageFromSource(state.goblin, adjustedDamage, if (attackIsCritical(naturalD20, 20)) 2 else 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter)
      { ...rolled, goblin: damaged, actionAvailable: false }
    }

  pure def resolveChillTouch(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state))
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), 20))) {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      { ...rolled, actionAvailable: false }
    }
    else if (state.goblin.reactionAvailable and not(state.goblin.activeEffects.contains(ShieldArmorClassBonus))) {
      openReactionWindow(recordFighterAttackRoll(revealFighterHidden(state)), {
        trigger: AttackHit,
        procedure: ShieldReactionProcedure,
        eligibleReactors: Set(Goblin),
        offeredReactors: Set(),
        continuation: ResumeChillTouch,
      })
    }
    else {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      val adjustedDamage = damageAfterAdjustments(damageRoll, Necrotic, Set(), Set(), Set())
      val damaged = applyDamageFromSource(state.goblin, adjustedDamage, if (attackIsCritical(naturalD20, 20)) 2 else 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter)
      { ...rolled, goblin: applyChillTouchHitPointRegainPrevention(state, damaged, Fighter), actionAvailable: false }
    }

  pure def starryWispDimLightEmitter(
    state: BattleState,
    source: Actor,
    attachment: LightEmitterAttachment,
  ): LightEmitter =
    match attachment {
      | CombatantLightEmitter(_) => SpellLightEmitter({
          source: source,
          sourceSpell: StarryWisp,
          attachment: attachment,
          emission: DimLightEmission({ radiusFeet: 10 }),
          opaqueCoverInteraction: LightEmitterDoesNotBlockOpaqueCover,
          expiresAt: EndOfTurnLightEmitterExpiration({
            actor: source,
            round: endOfCasterNextTurnExpiresAtRound(state, source),
          }),
        })
      | ObjectLightEmitter(data) => ObjectInvisibleRevealLightEmitter({
          source: source,
          sourceSpell: StarryWisp,
          object: data.object,
          dimLightRadiusFeet: 10,
          expiresAtActor: source,
          expiresAtRound: endOfCasterNextTurnExpiresAtRound(state, source),
        })
      | DancingLightEmitter(_) => SpellLightEmitter({
          source: source,
          sourceSpell: DancingLightsSpell,
          attachment: attachment,
          emission: DimLightEmission({ radiusFeet: 10 }),
          opaqueCoverInteraction: LightEmitterDoesNotBlockOpaqueCover,
          expiresAt: ConcentrationLightEmitterExpiration({ actor: source }),
        })
    }

  pure def applyStarryWispDimLightEmitter(
    state: BattleState,
    source: Actor,
    attachment: LightEmitterAttachment,
  ): BattleState = {
    val emitter = starryWispDimLightEmitter(state, source, attachment)
    { ...state,
      lightEmitters: state.lightEmitters
        .filter(candidate => match candidate {
          | SpellLightEmitter(data) =>
              data.source != source
                or data.sourceSpell != StarryWisp
                or data.attachment != attachment
          | ObjectInvisibleRevealLightEmitter(data) =>
              data.source != source
                or data.sourceSpell != StarryWisp
                or match attachment {
                  | CombatantLightEmitter(_) => true
                  | ObjectLightEmitter(objectAttachment) => data.object != objectAttachment.object
                  | DancingLightEmitter(_) => true
                }
        })
        .union(Set(emitter)),
    }
  }

  pure def applyChillTouchHitPointRegainPrevention(state: BattleState, target: Combatant, source: Actor): Combatant =
    { ...target,
      activeEffects: target.activeEffects
        .filter(effect => match effect {
          | ChillTouchHitPointRegainPrevented(data) => data.source != source
          | _ => true
        })
        .union(Set(ChillTouchHitPointRegainPrevented({
          source: source,
          expiresAtRound: endOfCasterNextTurnExpiresAtRound(state, source),
        }))),
    }

  pure def applyStarryWispInvisibleBenefitDenied(state: BattleState, target: Combatant, source: Actor): Combatant =
    { ...target,
      activeEffects: target.activeEffects
        .filter(effect => match effect {
          | StarryWispInvisibleBenefitDenied(data) => data.source != source
          | _ => true
        })
        .union(Set(StarryWispInvisibleBenefitDenied({
          source: source,
          expiresAtRound: endOfCasterNextTurnExpiresAtRound(state, source),
        }))),
    }

  pure def resolveEldritchBlastBeamAgainstGoblin(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), 20)))
      recordFighterAttackRoll(state)
    else {
      val adjustedDamage = damageAfterAdjustments(damageRoll, Force, Set(), Set(), Set())
      val damaged = applyDamageFromSource(state.goblin, adjustedDamage, if (attackIsCritical(naturalD20, 20)) 2 else 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter)
      { ...recordFighterAttackRoll(state), goblin: damaged }
    }

  pure def resolveEldritchBlastTwoBeams(
    state: BattleState,
    firstAttackTotal: int,
    firstNaturalD20: int,
    firstDamageRoll: int,
    firstConcentrationSaveSucceeded: bool,
    secondAttackTotal: int,
    secondNaturalD20: int,
    secondDamageRoll: int,
    secondConcentrationSaveSucceeded: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state))
      state
    else {
      val firstResolved = resolveEldritchBlastBeamAgainstGoblin(revealFighterHidden(state), firstAttackTotal, firstNaturalD20, firstDamageRoll, firstConcentrationSaveSucceeded)
      val secondResolved = resolveEldritchBlastBeamAgainstGoblin(firstResolved, secondAttackTotal, secondNaturalD20, secondDamageRoll, secondConcentrationSaveSucceeded)
      { ...secondResolved, actionAvailable: false }
    }

  pure def concentrationSavingThrowDc(damage: int): int = {
    battleRuntimeConcentrationSavingThrowDc(damage)
  }

  pure def eldritchMindConcentrationSavingThrowMode(hasEldritchMind: bool): SavingThrowRollMode =
    if (hasEldritchMind)
      AdvantageSavingThrow
    else
      NormalSavingThrow

  pure def dangerSenseSavingThrowMode(ability: Ability, incapacitated: bool): SavingThrowRollMode =
    if (ability == DexAbility and not(incapacitated))
      AdvantageSavingThrow
    else
      NormalSavingThrow

  pure def spellEffectConcentrationActiveEffects(): Set[ActiveEffect] =
    Set(ShieldOfFaithArmorClassBonus, HeroismFrightenedImmunity, BaneD20RollPenalty, BlessD20RollBonus, GuidanceAbilityCheckBonus, EntangleRestrained, FaerieFireOutline, ProtectionFromEvilAndGoodCreatureTypeProtection, ExpeditiousRetreatDashBonusAction)

  pure def activeEffectsWithoutSpellEffectConcentration(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects
      .exclude(spellEffectConcentrationActiveEffects)
      .filter(effect => match effect {
        | HeroismTurnStartTemporaryHitPoints(_) => false
        | EnsnaringStrikeRestrained(_) => false
        | SearingSmiteBurning(_) => false
        | FogCloudObscurement(_) => false
        | ResistanceDamageReduction(_) => false
        | SleepPendingRepeatSave(_) => false
        | SleepUnconscious(_) => false
        | HideousLaughterEffect(_) => false
        | DancingLightsEffect(_) => false
        | _ => true
      })

  pure def activeEffectsWithoutSleepEffects(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | SleepPendingRepeatSave(_) => false
      | SleepUnconscious(_) => false
      | _ => true
    })

  pure def combatantWithSleepEffectsRemoved(target: Combatant, activeEffects: Set[ActiveEffect]): Combatant = {
    val hadSleepPending = target.activeEffects.exists(effect => match effect {
      | SleepPendingRepeatSave(_) => true
      | _ => false
    })
    val hadSleepUnconscious = target.activeEffects.exists(effect => match effect {
      | SleepUnconscious(_) => true
      | _ => false
    })
    val sleepPendingHadIncapacitated = target.activeEffects.exists(effect => match effect {
      | SleepPendingRepeatSave(data) => data.hadIncapacitated
      | _ => false
    })
    val sleepUnconsciousHadIncapacitated = target.activeEffects.exists(effect => match effect {
      | SleepUnconscious(data) => data.hadIncapacitated
      | _ => false
    })
    val sleepUnconsciousHadUnconscious = target.activeEffects.exists(effect => match effect {
      | SleepUnconscious(data) => data.hadUnconscious
      | _ => false
    })
    {
      ...target,
      activeEffects: activeEffects,
      incapacitated:
        if (hadSleepUnconscious) sleepUnconsciousHadIncapacitated
        else if (hadSleepPending) sleepPendingHadIncapacitated
        else target.incapacitated,
      unconscious: if (hadSleepUnconscious) sleepUnconsciousHadUnconscious else target.unconscious,
      prone: if (hadSleepUnconscious and not(sleepUnconsciousHadUnconscious)) true else target.prone,
    }
  }

  pure def combatantWithoutSpellEffectConcentrationEffects(target: Combatant): Combatant =
    combatantWithSleepEffectsRemoved(target, activeEffectsWithoutSpellEffectConcentration(target.activeEffects))

  pure def breakConcentration(target: Combatant): Combatant = {
    val withoutSpellEffectConcentration = combatantWithoutSpellEffectConcentrationEffects(target)
    {
      ...withoutSpellEffectConcentration,
      concentrating: false,
      activeEffects: activeEffectsWithoutMarkedDamageRider(withoutSpellEffectConcentration.activeEffects),
    }
  }

  pure def sleepEffectFromOtherSource(effect: ActiveEffect, targetActor: Actor): bool =
    match effect {
      | SleepPendingRepeatSave(data) => data.source != targetActor
      | SleepUnconscious(data) => data.source != targetActor
      | _ => false
    }

  pure def breakConcentrationFromSleepAppliedIncapacitated(target: Combatant, targetActor: Actor): Combatant =
    if (not(target.concentrating))
      target
    else {
      val sleepEffectsFromOtherSources = target.activeEffects.filter(effect => sleepEffectFromOtherSource(effect, targetActor))
      val effectsSubjectToBreak = target.activeEffects.filter(effect => not(sleepEffectFromOtherSource(effect, targetActor)))
      val broken = breakConcentration({ ...target, activeEffects: effectsSubjectToBreak })
      { ...broken, activeEffects: broken.activeEffects.union(sleepEffectsFromOtherSources) }
    }

  pure def stateWithFighterDamage(state: BattleState, damagedFighter: Combatant): BattleState =
    if (state.fighter.concentrating and not(damagedFighter.concentrating))
      {
        ...state,
        fighter: damagedFighter,
        goblin: { ...state.goblin, activeEffects: activeEffectsWithoutSpellEffectConcentration(state.goblin.activeEffects) },
      }
    else
      { ...state, fighter: damagedFighter }

  pure def applyDamage(target: Combatant, damage: int, deathFailuresAtZeroHp: int, concentrationSaveSucceeded: bool): Combatant =
    applyDamageWithDisposition(target, damage, deathFailuresAtZeroHp, concentrationSaveSucceeded, OrdinaryDamage)

  pure def activeEffectsAfterTargetDamagedByCasterOrAlly(effects: Set[ActiveEffect], damageSource: DamageSourceActor): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | AnimalFriendshipCharmed(data) => not(damageSourceIsCasterOrAlly(data.source, damageSource))
      | CharmPersonCharmed(data) => not(damageSourceIsCasterOrAlly(data.source, damageSource))
      | _ => true
    })

  pure def combatantWithoutSleepEffects(target: Combatant): Combatant =
    combatantWithSleepEffectsRemoved(target, activeEffectsWithoutSleepEffects(target.activeEffects))


  pure def applyDamageFromSource(
    target: Combatant,
    damage: int,
    deathFailuresAtZeroHp: int,
    concentrationSaveSucceeded: bool,
    damageDisposition: DamageDisposition,
    damageSource: Actor,
  ): Combatant = {
    val damaged = applyDamageWithDisposition(target, damage, deathFailuresAtZeroHp, concentrationSaveSucceeded, damageDisposition)
    if (damage > 0 and battleRuntimeSleepEffectEndsOnDamage)
      combatantWithoutSleepEffects({
        ...damaged,
        activeEffects: activeEffectsAfterTargetDamagedByCasterOrAlly(damaged.activeEffects, actorDamageSource(damageSource)),
      })
    else
      damaged
  }

  pure def applyDamageWithDisposition(target: Combatant, damage: int, deathFailuresAtZeroHp: int, concentrationSaveSucceeded: bool, damageDisposition: DamageDisposition): Combatant = {
    val effectiveDamage = nonnegative(damage)
    val afterDamage =
      if (effectiveDamage <= 0)
        target
      else if (target.hp <= 0) {
        val result = applyDamageToZeroHitPointCreature(
          combatantVitals(target),
          combatantDeathSavingThrows(target),
          effectiveDamage,
          deathFailuresAtZeroHp >= 2,
        )
        combatantWithZeroHitPointLifecycleResult(target, result)
      } else {
        val result = applyResolvedDamageToPositiveHitPoints(combatantVitals(target), effectiveDamage)
        val recovery =
          if (damageDisposition == KnockOut) {
            applyKnockOutDisposition(result)
          } else {
            {
              vitals: result.vitals,
              deathSavingThrows:
                deathSavingThrowLifecycleAfterPositiveHitPointDamage(combatantDeathSavingThrows(target), result),
              positiveHitPointUnconsciousRecovery: NoPositiveHitPointUnconsciousRecovery,
              hitPointsRegained: 0,
            }
        }
        combatantWithHitPointRecoveryResult(target, recovery)
      }
    val afterIncapacitatingDamage =
      if (target.concentrating and not(target.unconscious) and afterDamage.unconscious)
        breakConcentration(afterDamage)
      else
        afterDamage

    if (target.concentrating and effectiveDamage > 0 and not(concentrationSaveSucceeded))
      breakConcentration(afterIncapacitatingDamage)
    else
      afterIncapacitatingDamage
  }

  pure def applyKnockOut(target: Combatant): Combatant =
    { ...breakConcentration(target), hp: 1, unconscious: true, knockedOut: true }

  pure def applyMageArmor(target: Combatant): Combatant =
    {
      ...target,
      activeEffects: activeEffectsWithoutMageArmor(target.activeEffects).union(Set(mageArmorActiveEffect(mageArmorDurationTicks))),
    }

  pure def resolveArmorOfShadowsMageArmor(state: BattleState): BattleState =
    if (
      not(state.actionAvailable) or
      currentActor(state) != Fighter or
      state.fighter.unconscious or
      state.fighter.incapacitated or
      fighterHasRage(state) or
      state.fighter.wearingHeavyArmor
    )
      state
    else
      { ...state, fighter: applyMageArmor(state.fighter), actionAvailable: false }

  pure def targetDonsArmor(target: Combatant): Combatant =
    { ...target, activeEffects: activeEffectsWithoutMageArmor(target.activeEffects) }

  pure def readySpell(state: BattleState): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or state.fighterReadiedSpellHeld)
      state
    else
      { ...state, fighter: { ...state.fighter, concentrating: true }, actionAvailable: false, fighterReadiedSpellHeld: true }

  pure def releaseReadiedSpell(state: BattleState): BattleState =
    if (state.fighterReadiedSpellHeld and not(fighterHasRage(state)))
      { ...state, fighter: { ...state.fighter, concentrating: false }, fighterReadiedSpellHeld: false }
    else
      state

  pure def dashFighter(state: BattleState): BattleState =
    dashFighterWithSpeedKind(state, WalkSpeedKind)

  pure def movementProjectionForFighter(state: BattleState, speedKind: MovementSpeedKind): BattleRuntimeMovementProjection = {
    currentActorOwnsTurn:
      currentActor(state) == Fighter
        and not(state.fighter.unconscious)
        and not(state.fighter.incapacitated),
    actionAvailable: state.actionAvailable,
    bonusActionAvailable: state.bonusActionAvailable,
    reactionAvailable: state.fighter.reactionAvailable,
    dashMovementBonus: state.dashMovementBonus,
    disengaged: state.disengaged,
    dodging: state.fighter.dodging,
    hidden: fighterIsHidden(state),
    helpAttackHeld: state.fighterHelpAttackGoblinForGoblin,
    readiedMovementHeld: state.fighterReadiedMovementHeld,
    speedFeet: movementSpeed(state.fighter, speedKind),
    movementSpentFeet: state.fighter.movementSpent,
    prone: state.fighter.prone,
    grappleEscapeDc: 0,
  }

  pure def movementProjectionForGoblin(state: BattleState, speedKind: MovementSpeedKind): BattleRuntimeMovementProjection = {
    currentActorOwnsTurn:
      currentActor(state) == Goblin
        and not(state.goblin.unconscious)
        and not(state.goblin.incapacitated),
    actionAvailable: state.actionAvailable,
    bonusActionAvailable: state.bonusActionAvailable,
    reactionAvailable: state.goblin.reactionAvailable,
    dashMovementBonus: state.dashMovementBonus,
    disengaged: state.disengaged,
    dodging: state.goblin.dodging,
    hidden: false,
    helpAttackHeld: false,
    readiedMovementHeld: false,
    speedFeet: movementSpeed(state.goblin, speedKind),
    movementSpentFeet: state.goblin.movementSpent,
    prone: state.goblin.prone,
    grappleEscapeDc: 0,
  }

  pure def movementProjectionForGrappledGoblin(state: BattleState): BattleRuntimeMovementProjection =
    match state.grapple {
      | NoGrapple => {
          currentActorOwnsTurn:
            currentActor(state) == Goblin
              and not(state.goblin.unconscious)
              and not(state.goblin.incapacitated),
          actionAvailable: state.actionAvailable,
          bonusActionAvailable: state.bonusActionAvailable,
          reactionAvailable: state.goblin.reactionAvailable,
          dashMovementBonus: state.dashMovementBonus,
          disengaged: state.disengaged,
          dodging: state.goblin.dodging,
          hidden: false,
          helpAttackHeld: false,
          readiedMovementHeld: false,
          speedFeet: movementSpeed(state.goblin, WalkSpeedKind),
          movementSpentFeet: state.goblin.movementSpent,
          prone: state.goblin.prone,
          grappleEscapeDc: 0,
        }
      | FighterGrapplesGoblin(link) => {
          currentActorOwnsTurn:
            currentActor(state) == Goblin
              and not(state.goblin.unconscious)
              and not(state.goblin.incapacitated),
          actionAvailable: state.actionAvailable,
          bonusActionAvailable: state.bonusActionAvailable,
          reactionAvailable: state.goblin.reactionAvailable,
          dashMovementBonus: state.dashMovementBonus,
          disengaged: state.disengaged,
          dodging: state.goblin.dodging,
          hidden: false,
          helpAttackHeld: false,
          readiedMovementHeld: false,
          speedFeet: movementSpeed(state.goblin, WalkSpeedKind),
          movementSpentFeet: state.goblin.movementSpent,
          prone: state.goblin.prone,
          grappleEscapeDc: link.escapeDc,
        }
    }

  pure def dissonantWhispersGoblinGrappleEscapeDc(state: BattleState): int =
    match state.grapple {
      | NoGrapple => 0
      | FighterGrapplesGoblin(link) => link.escapeDc
    }

  pure def dissonantWhispersGoblinMovementProjection(state: BattleState, speedKind: MovementSpeedKind): BattleRuntimeMovementProjection = {
    currentActorOwnsTurn:
      state.goblin.hp > 0
        and not(state.goblin.unconscious)
        and not(state.goblin.incapacitated),
    actionAvailable: true,
    bonusActionAvailable: true,
    reactionAvailable: state.goblin.reactionAvailable,
    dashMovementBonus: 0,
    disengaged: false,
    dodging: state.goblin.dodging,
    hidden: false,
    helpAttackHeld: false,
    readiedMovementHeld: false,
    speedFeet: movementSpeed(state.goblin, speedKind),
    movementSpentFeet: 0,
    prone: state.goblin.prone,
    grappleEscapeDc: dissonantWhispersGoblinGrappleEscapeDc(state),
  }

  pure def dissonantWhispersGoblinCanTakeReaction(state: BattleState): bool =
    state.goblin.reactionAvailable
      and state.goblin.hp > 0
      and not(state.goblin.unconscious)
      and not(state.goblin.incapacitated)

  pure def dissonantWhispersGoblinCanMoveWithSpeedKind(
    state: BattleState,
    speedKind: MovementSpeedKind,
    movementCost: int,
  ): bool =
    battleRuntimeCanSpendMovement(
      dissonantWhispersGoblinMovementProjection(state, speedKind),
      movementCost,
    )

  pure def dissonantWhispersGoblinHasMovementAvailable(state: BattleState): bool =
    dissonantWhispersGoblinCanMoveWithSpeedKind(state, WalkSpeedKind, 1)
      or dissonantWhispersGoblinCanMoveWithSpeedKind(state, ClimbSpeedKind, 1)
      or dissonantWhispersGoblinCanMoveWithSpeedKind(state, SwimSpeedKind, 1)

  pure def resolveDissonantWhispersGoblinForcedReactionMovement(
    state: BattleState,
    replay: DissonantWhispersForcedMovementReplay
  ): DissonantWhispersForcedMovementResult =
    if (not(dissonantWhispersGoblinCanTakeReaction(state))) {
      match replay {
        | DissonantWhispersMovementMissing =>
            DissonantWhispersResolvedAfterDamage(openDissonantWhispersAfterDamageSequence(state))
        | DissonantWhispersMovementFilled(_) => DissonantWhispersInvalidMovementFill
      }
    } else if (not(dissonantWhispersGoblinHasMovementAvailable(state))) {
      match replay {
        | DissonantWhispersMovementMissing =>
            DissonantWhispersResolvedAfterDamage(
              openDissonantWhispersAfterDamageSequence(spendReaction(state, Goblin))
            )
        | DissonantWhispersMovementFilled(_) => DissonantWhispersInvalidMovementFill
      }
    } else {
      match replay {
        | DissonantWhispersMovementMissing => DissonantWhispersNeedsMovementFill
        | DissonantWhispersMovementFilled(fill) =>
            if (not(dissonantWhispersGoblinCanMoveWithSpeedKind(state, fill.speedKind, fill.movementCost)))
              DissonantWhispersInvalidMovementFill
            else {
              val afterReactionSpend = spendReaction(state, Goblin)
              if (fill.provokesOpportunityAttack)
                DissonantWhispersOpportunityAttackWindow(
                  openReactionWindow(afterReactionSpend, {
                    trigger: OpportunityAttack,
                    procedure: OpportunityAttackReactionProcedure,
                    eligibleReactors: Set(Fighter),
                    offeredReactors: Set(),
                    continuation: ResumeDissonantWhispersMovementThenAfterDamage({
                      speedKind: fill.speedKind,
                      movementCost: fill.movementCost,
                    }),
                  })
                )
              else
                DissonantWhispersResolvedAfterDamage(
                  openDissonantWhispersAfterDamageSequence(afterReactionSpend)
                )
            }
      }
    }

  pure def stateWithFighterMovementStep(state: BattleState, step: BattleRuntimeMovementStep): BattleState =
    {
      ...state,
      actionAvailable: step.actionAvailable,
      bonusActionAvailable: step.bonusActionAvailable,
      dashMovementBonus: step.dashMovementBonus,
      disengaged: step.disengaged,
      fighterHelpAttackGoblinForGoblin: step.helpAttackHeld,
      fighterReadiedMovementHeld: step.readiedMovementHeld,
      fighter: {
        ...state.fighter,
        reactionAvailable: step.reactionAvailable,
        movementSpent: step.movementSpentFeet,
        prone: step.prone,
        dodging: step.dodging,
      },
    }

  pure def stateWithGoblinMovementStep(state: BattleState, step: BattleRuntimeMovementStep): BattleState =
    {
      ...state,
      actionAvailable: step.actionAvailable,
      bonusActionAvailable: step.bonusActionAvailable,
      dashMovementBonus: step.dashMovementBonus,
      disengaged: step.disengaged,
      goblin: {
        ...state.goblin,
        reactionAvailable: step.reactionAvailable,
        movementSpent: step.movementSpentFeet,
        prone: step.prone,
        dodging: step.dodging,
      },
    }

  pure def dashFighterWithSpeedKind(state: BattleState, speedKind: MovementSpeedKind): BattleState = {
    val step = battleRuntimeDash(movementProjectionForFighter(state, speedKind), movementSpeed(state.fighter, speedKind))
    stateWithFighterMovementStep(state, step)
  }

  pure def applyFighterTemporaryHitPoints(state: BattleState, temporaryHitPoints: int): BattleState =
    { ...state, fighter: { ...state.fighter, tempHp: if (state.fighter.tempHp > temporaryHitPoints) state.fighter.tempHp else temporaryHitPoints } }

  pure def bonusActionDashTemporaryHitPointsFighter(
    state: BattleState,
    usesRemaining: int,
    proficiencyBonus: int,
    speedKind: MovementSpeedKind
  ): BonusActionDashTemporaryHitPointsResult =
    if (currentActor(state) == Fighter
      and state.bonusActionAvailable
      and usesRemaining > 0
      and proficiencyBonus >= 2
      and proficiencyBonus <= 6
      and not(state.fighter.unconscious)
      and not(state.fighter.incapacitated)) {
      val dashed = stateWithFighterMovementStep(
        state,
        battleRuntimeBonusActionDash(movementProjectionForFighter(state, speedKind), movementSpeed(state.fighter, speedKind)),
      )
      {
        state: applyFighterTemporaryHitPoints(dashed, proficiencyBonus),
        usesRemaining: usesRemaining - 1,
      }
    } else {
      { state: state, usesRemaining: usesRemaining }
    }

  pure def activeEffectsContainExpeditiousRetreatDashBonusAction(effects: Set[ActiveEffect]): bool =
    effects.contains(ExpeditiousRetreatDashBonusAction)

  pure def jumpMovementReplacementMaxTargets(slotLevel: int): int =
    if (slotLevel < 1) 0 else slotLevel

  pure def jumpMovementReplacementActiveEffect(): ActiveEffect =
    JumpMovementReplacement({ durationTicks: 10, usedThisTurn: false })

  pure def featherFallMitigationActiveEffect(): ActiveEffect =
    FeatherFallMitigation({ durationTicks: 10 })

  pure def sanctuaryWardActiveEffect(source: Actor): ActiveEffect =
    SanctuaryWard({ source: source, durationTicks: 10 })

  pure def activeEffectsWithoutSanctuaryWard(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | SanctuaryWard(_) => false
      | _ => true
    })

  pure def activeEffectsContainSanctuaryWard(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | SanctuaryWard(_) => true
      | _ => false
    })

  pure def activeEffectsSanctuaryWardDurationTicks(effects: Set[ActiveEffect]): int =
    effects.map(effect => match effect {
      | SanctuaryWard(data) => data.durationTicks
      | _ => 0
    }).fold(0, (highest, ticks) => if (highest > ticks) highest else ticks)

  pure def combatantWithSanctuaryWard(target: Combatant, source: Actor): Combatant =
    {
      ...target,
      activeEffects: activeEffectsWithoutSanctuaryWard(target.activeEffects).union(Set(sanctuaryWardActiveEffect(source))),
    }

  pure def stateWithActorCombatant(state: BattleState, actor: Actor, combatant: Combatant): BattleState =
    match actor {
      | Fighter => { ...state, fighter: combatant }
      | Goblin => { ...state, goblin: combatant }
    }

  pure def combatantForActor(state: BattleState, actor: Actor): Combatant =
    match actor {
      | Fighter => state.fighter
      | Goblin => state.goblin
    }

  pure def battleStateAfterSanctuaryEarlyEndForActor(state: BattleState, actor: Actor): BattleState = {
    val combatant = combatantForActor(state, actor)
    stateWithActorCombatant(state, actor, {
      ...combatant,
      activeEffects: activeEffectsWithoutSanctuaryWard(combatant.activeEffects),
    })
  }

  pure def resolveSanctuarySpell(state: BattleState, target: Actor): BattleState =
    if (
      currentActor(state) != Fighter or
      not(state.bonusActionAvailable) or
      state.fighter.unconscious or
      state.fighter.incapacitated or
      fighterHasRage(state) or
      not(canExpendSpellSlotThisTurn(state))
    )
      state
    else {
      val afterCasterEarlyEnd = battleStateAfterSanctuaryEarlyEndForActor(state, Fighter)
      val targetCombatant = combatantForActor(afterCasterEarlyEnd, target)
      stateWithActorCombatant(
        commitActorSpellSlotUse({ ...afterCasterEarlyEnd, bonusActionAvailable: false }, Fighter),
        target,
        combatantWithSanctuaryWard(targetCombatant, Fighter),
      )
    }

  pure def wardTargetingInterdictionApplies(
    trigger: SanctuaryTargetingTrigger,
  ): bool =
    match trigger {
      | SanctuaryAttackRollTargeting => true
      | SanctuaryDamagingSpellTargeting => true
      | SanctuaryAreaOfEffectTargeting => false
    }

  pure def wardInterdictionLosesAttackOrSpell(
    outcome: SanctuaryInterdictionOutcome,
  ): bool =
    match outcome {
      | SanctuarySaveSucceeded => false
      | SanctuaryLoseAttackOrSpell => true
      | SanctuaryChooseNewTarget(_) => false
    }

  pure def wardInterdictionTarget(
    warded: Actor,
    outcome: SanctuaryInterdictionOutcome,
  ): Actor =
    match outcome {
      | SanctuarySaveSucceeded => warded
      | SanctuaryLoseAttackOrSpell => warded
      | SanctuaryChooseNewTarget(data) => data.target
    }

  pure def sanctuaryTargetingInterdictionOutcomeApplies(
    state: BattleState,
    warded: Actor,
    trigger: SanctuaryTargetingTrigger,
    outcome: SanctuaryInterdictionOutcome,
  ): bool =
    activeEffectsContainSanctuaryWard(combatantForActor(state, warded).activeEffects) and
    wardTargetingInterdictionApplies(trigger) and
    not(wardInterdictionLosesAttackOrSpell(outcome))

  pure def sanctuaryTargetingInterdictionResolvedTarget(
    state: BattleState,
    warded: Actor,
    trigger: SanctuaryTargetingTrigger,
    outcome: SanctuaryInterdictionOutcome,
  ): Actor =
    if (
      activeEffectsContainSanctuaryWard(combatantForActor(state, warded).activeEffects) and
      wardTargetingInterdictionApplies(trigger)
    )
      wardInterdictionTarget(warded, outcome)
    else
      warded

  pure def activeFeatherFallDescentRateCapFeetPerRound(effects: Set[ActiveEffect]): int =
    if (effects.exists(effect => match effect {
      | FeatherFallMitigation(_) => true
      | _ => false
    })) 60 else 0

  pure def activeEffectsWithoutFeatherFallMitigation(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | FeatherFallMitigation(_) => false
      | _ => true
    })

  pure def activeEffectsContainFeatherFallMitigation(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | FeatherFallMitigation(_) => true
      | _ => false
    })

  pure def featherFallLandingState(result: FeatherFallLandingResult): BattleState =
    match result {
      | FeatherFallLandingMitigated(data) => data.state
      | FeatherFallLandingUnmitigated(data) => data.state
    }

  pure def featherFallLandingFallDamagePrevented(result: FeatherFallLandingResult): bool =
    match result {
      | FeatherFallLandingMitigated(_) => true
      | FeatherFallLandingUnmitigated(_) => false
    }

  pure def featherFallLandingFallingPronePrevented(result: FeatherFallLandingResult): bool =
    match result {
      | FeatherFallLandingMitigated(_) => true
      | FeatherFallLandingUnmitigated(_) => false
    }

  pure def resolveFeatherFallSpell(
    state: BattleState,
    reactor: Actor,
    targets: Set[Actor],
    fallingTargets: Set[Actor],
    targetCount: int,
  ): BattleState =
    if (
      reactorCanReact(state, reactor) and
      canActorExpendSpellSlotThisTurn(state, reactor) and
      targets.size() >= 1 and
      targetCount == targets.size() and
      targetCount <= 5 and
      targets.forall(target => fallingTargets.contains(target))
    ) {
      val spentReaction = spendReaction(state, reactor)
      val effect = featherFallMitigationActiveEffect
	      commitActorSpellSlotUse({
	        ...spentReaction,
	        fighter: if (targets.contains(Fighter))
	          { ...spentReaction.fighter, activeEffects: spentReaction.fighter.activeEffects.union(Set(effect)) }
	        else
	          spentReaction.fighter,
	        goblin: if (targets.contains(Goblin))
	          { ...spentReaction.goblin, activeEffects: spentReaction.goblin.activeEffects.union(Set(effect)) }
	        else
	          spentReaction.goblin,
	      }, reactor)
    } else {
      state
    }

  pure def resolveFeatherFallLanding(state: BattleState, target: Actor): FeatherFallLandingResult =
    val targetEffects = match target {
      | Fighter => state.fighter.activeEffects
      | Goblin => state.goblin.activeEffects
    }
    val mitigated = activeEffectsContainFeatherFallMitigation(targetEffects)
    val nextState = if (mitigated) {
      match target {
        | Fighter => {
            ...state,
            fighter: {
              ...state.fighter,
              activeEffects: activeEffectsWithoutFeatherFallMitigation(state.fighter.activeEffects),
            },
          }
        | Goblin => {
            ...state,
            goblin: {
              ...state.goblin,
              activeEffects: activeEffectsWithoutFeatherFallMitigation(state.goblin.activeEffects),
            },
          }
      }
    } else {
      state
    }
    if (mitigated)
      FeatherFallLandingMitigated({ state: nextState })
    else
      FeatherFallLandingUnmitigated({ state: nextState })

  pure def jumpMovementReplacementLandingIsLegal(landing: JumpMovementLandingFact): bool =
    landing != JumpIllegalLanding

  pure def jumpMovementReplacementLandingAppliesProne(landing: JumpMovementLandingFact): bool =
    landing == JumpLegalLandingAcrobaticsFailed

  pure def resolveJumpMovementReplacementSpell(state: BattleState, targets: Set[Actor], willingTargets: Set[Actor], slotLevel: int): BattleState =
    if (
      currentActor(state) == Fighter and
      state.bonusActionAvailable and
      canExpendSpellSlotThisTurn(state) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state)) and
      targets.size() >= 1 and
      targets.forall(target => willingTargets.contains(target)) and
      targets.size() <= jumpMovementReplacementMaxTargets(slotLevel)
    ) {
      val effect = jumpMovementReplacementActiveEffect
      commitActorSpellSlotUse({
        ...state,
        fighter: if (targets.contains(Fighter))
          { ...state.fighter, activeEffects: state.fighter.activeEffects.union(Set(effect)) }
        else
          state.fighter,
        goblin: if (targets.contains(Goblin))
          { ...state.goblin, activeEffects: state.goblin.activeEffects.union(Set(effect)) }
        else
          state.goblin,
        bonusActionAvailable: false,
      }, Fighter)
    } else {
      state
    }

  pure def activeEffectsContainAvailableJumpMovementReplacement(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | JumpMovementReplacement(data) => not(data.usedThisTurn)
      | _ => false
    })

  pure def activeEffectsAfterJumpMovementReplacementUse(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.map(effect => match effect {
      | JumpMovementReplacement(data) => JumpMovementReplacement({ ...data, usedThisTurn: true })
      | _ => effect
    })

  pure def jumpMovementReplacementFighter(
    state: BattleState,
    movementCost: int,
    jumpDistance: int,
    landing: JumpMovementLandingFact
  ): BattleState =
    if (
      currentActor(state) == Fighter and
      movementCost == 10 and
      jumpDistance > 0 and
      jumpDistance <= 30 and
      jumpMovementReplacementLandingIsLegal(landing) and
      activeEffectsContainAvailableJumpMovementReplacement(state.fighter.activeEffects) and
      fighterCanMoveWithSpeedKind(state, WalkSpeedKind, movementCost)
    ) {
      val moved = applyFighterMovementWithSpeedKind(state, WalkSpeedKind, movementCost)
      {
        ...moved,
        fighter: {
          ...moved.fighter,
          activeEffects: activeEffectsAfterJumpMovementReplacementUse(moved.fighter.activeEffects),
          prone: moved.fighter.prone or jumpMovementReplacementLandingAppliesProne(landing),
        },
      }
    } else {
      state
    }

  pure def resolveExpeditiousRetreatDash(state: BattleState, speedKind: MovementSpeedKind): BattleState =
    if (
      currentActor(state) == Fighter and
      state.bonusActionAvailable and
      canExpendSpellSlotThisTurn(state) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    ) {
      val concentrationBase = {
        ...state,
        fighter: breakConcentration(state.fighter),
        goblin: { ...state.goblin, activeEffects: activeEffectsWithoutSpellEffectConcentration(state.goblin.activeEffects) },
      }
      val dashed = stateWithFighterMovementStep(
        concentrationBase,
        battleRuntimeBonusActionDash(
          movementProjectionForFighter(concentrationBase, speedKind),
          movementSpeed(concentrationBase.fighter, speedKind),
        ),
      )
      commitActorSpellSlotUse({
        ...dashed,
        fighter: {
          ...dashed.fighter,
          concentrating: true,
          activeEffects: dashed.fighter.activeEffects.union(Set(ExpeditiousRetreatDashBonusAction)),
        },
      }, Fighter)
    } else {
      state
    }

  pure def expeditiousRetreatBonusActionDashFighter(state: BattleState, speedKind: MovementSpeedKind): BattleState =
    if (
      currentActor(state) == Fighter and
      state.bonusActionAvailable and
      activeEffectsContainExpeditiousRetreatDashBonusAction(state.fighter.activeEffects) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated)
    )
      stateWithFighterMovementStep(
        state,
        battleRuntimeBonusActionDash(
          movementProjectionForFighter(state, speedKind),
          movementSpeed(state.fighter, speedKind),
        ),
      )
    else
      state

  pure def disengageFighter(state: BattleState): BattleState =
    stateWithFighterMovementStep(state, battleRuntimeDisengage(movementProjectionForFighter(state, WalkSpeedKind)))

  pure def dodgeFighter(state: BattleState): BattleState =
    stateWithFighterMovementStep(state, battleRuntimeDodge(movementProjectionForFighter(state, WalkSpeedKind)))

  pure def readyFighter(state: BattleState): BattleState =
    stateWithFighterMovementStep(state, battleRuntimeReadyMovement(movementProjectionForFighter(state, WalkSpeedKind), true))

  pure def helpFighterAttack(state: BattleState): BattleState =
    stateWithFighterMovementStep(state, battleRuntimeHelpAttack(movementProjectionForFighter(state, WalkSpeedKind), true))

  pure def standFighterFromProne(state: BattleState): BattleState = {
    if (combatantHasHideousLaughter(state.fighter))
      state
    else {
      val step = battleRuntimeStandFromProne(movementProjectionForFighter(state, WalkSpeedKind))
      stateWithFighterMovementStep(state, step)
    }
  }

  pure def movementRemainingForFighter(state: BattleState): int = {
    movementRemainingForFighterWithSpeedKind(state, WalkSpeedKind)
  }

  pure def movementRemainingForFighterWithSpeedKind(state: BattleState, speedKind: MovementSpeedKind): int =
    battleRuntimeMovementRemaining(movementProjectionForFighter(state, speedKind))

  pure def movementRemaining(combatant: Combatant): int =
    battleRuntimeMovementRemaining({
      currentActorOwnsTurn: true,
      actionAvailable: true,
      bonusActionAvailable: true,
      reactionAvailable: true,
      dashMovementBonus: 0,
      disengaged: false,
      dodging: false,
      hidden: false,
      helpAttackHeld: false,
      readiedMovementHeld: false,
      speedFeet: combatant.speed,
      movementSpentFeet: combatant.movementSpent,
      prone: combatant.prone,
      grappleEscapeDc: 0,
    })

  pure def movementSpeed(combatant: Combatant, speedKind: MovementSpeedKind): int = {
    val walkSpeed = combatant.speed + (if (combatant.activeEffects.contains(LongstriderSpeedDelta)) 10 else 0)
    match speedKind {
      | WalkSpeedKind => walkSpeed
      | ClimbSpeedKind => if (combatant.hasRovingSpeedKindGrants) walkSpeed else 0
      | SwimSpeedKind => if (combatant.hasRovingSpeedKindGrants) walkSpeed else 0
    }
  }

  pure def fighterGoblinGrappleExists(state: BattleState): bool =
    match state.grapple {
      | NoGrapple => false
      | FighterGrapplesGoblin(_) => true
    }

  pure def fighterGoblinGrappleTargetDragCostExempt(state: BattleState): bool =
    match state.grapple {
      | NoGrapple => false
      | FighterGrapplesGoblin(link) => link.targetDragCostExempt
    }

  pure def fighterCanMove(state: BattleState, movementCost: int): bool =
    fighterCanMoveWithSpeedKind(state, WalkSpeedKind, movementCost)

  pure def fighterCanMoveWithSpeedKind(state: BattleState, speedKind: MovementSpeedKind, movementCost: int): bool =
    battleRuntimeCanSpendMovement(movementProjectionForFighter(state, speedKind), movementCost)

  pure def fighterCanGrappleGoblin(state: BattleState): bool =
    battleRuntimeCanAttemptGrappleBySizeRank(
      creatureSizeRank(state.fighter.creatureSize),
      creatureSizeRank(state.goblin.creatureSize),
      state.fighter.leftHandUse == HFree,
      FIGHTER_GRAPPLE_ESCAPE_DC,
    )
      and currentActor(state) == Fighter
      and state.actionAvailable
      and not(state.fighter.unconscious)
      and not(state.fighter.incapacitated)
      and not(fighterGoblinGrappleExists(state))

  pure val FIGHTER_GRAPPLE_ESCAPE_DC = 13

  pure def grappleFighterGoblin(state: BattleState, targetSaveTotal: int): BattleState =
    if (not(fighterCanGrappleGoblin(state)))
      state
    else if (battleRuntimeGrappleAttemptSucceedsBySizeRank(
      creatureSizeRank(state.fighter.creatureSize),
      creatureSizeRank(state.goblin.creatureSize),
      state.fighter.leftHandUse == HFree,
      targetSaveTotal,
      FIGHTER_GRAPPLE_ESCAPE_DC,
    )) {
      val extended = extendRageWithEnemySavingThrow(state, Goblin)
      {
        ...extended,
        actionAvailable: false,
        fighter: { ...extended.fighter, leftHandUse: HGrapple },
        grapple: FighterGrapplesGoblin({ escapeDc: FIGHTER_GRAPPLE_ESCAPE_DC, targetDragCostExempt: false }),
      }
    }
    else {
      val extended = extendRageWithEnemySavingThrow(state, Goblin)
      { ...extended, actionAvailable: false }
    }

  pure def releaseFighterGrapple(state: BattleState): BattleState =
    if (fighterGoblinGrappleExists(state))
      {
        ...state,
        fighter: { ...state.fighter, leftHandUse: HFree },
        grapple: NoGrapple,
      }
    else
      state

  pure def escapeFighterGrapple(state: BattleState, escapeCheckTotal: int): BattleState =
    if (not(fighterGoblinGrappleExists(state)))
      state
    else {
      val step = battleRuntimeEscapeGrapple(movementProjectionForGrappledGoblin(state), escapeCheckTotal)
      if (step.grappleActive)
        { ...state, actionAvailable: step.actionAvailable, bonusActionAvailable: step.bonusActionAvailable }
      else
        { ...releaseFighterGrapple(state), actionAvailable: step.actionAvailable, bonusActionAvailable: step.bonusActionAvailable }
    }

  pure def goblinAttackRequiresDisadvantage(state: BattleState, targetIsFighter: bool): bool =
    battleRuntimeGrappledAttackRollHasDisadvantage(fighterGoblinGrappleExists(state), targetIsFighter)

  pure def fighterCanLightPropertyExtraAttack(state: BattleState): bool =
    currentActor(state) == Fighter and
      battleRuntimeLightPropertyExtraAttackAdmitted(
        movementProjectionForFighter(state, WalkSpeedKind),
        state.lightWeaponAttackMade,
        true,
      )

  pure def spendFighterLightPropertyExtraAttackBonusAction(state: BattleState): BattleState =
    stateWithFighterMovementStep(
      state,
      battleRuntimeLightPropertyExtraAttack(
        movementProjectionForFighter(state, WalkSpeedKind),
        state.lightWeaponAttackMade,
        true,
      ),
    )

  pure def offHandAttackFighter(state: BattleState, attackTotal: int, naturalD20: int, damageRoll: int): BattleState =
    offHandAttackFighterWithAbilityModifier(state, attackTotal, naturalD20, damageRoll, 3)

  pure def offHandAttackFighterWithAbilityModifier(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    abilityModifier: int
  ): BattleState =
    if (fighterCanLightPropertyExtraAttack(state))
      if (attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), fighterCriticalThreshold(state)))
        {
          ...spendFighterLightPropertyExtraAttackBonusAction(state),
          goblin: applyDamageFromSource(state.goblin, battleRuntimeLightPropertyExtraAttackDamageAmount(damageRoll, abilityModifier), if (attackIsCritical(naturalD20, fighterCriticalThreshold(state))) 2 else 1, false, OrdinaryDamage, Fighter),
        }
      else
        spendFighterLightPropertyExtraAttackBonusAction(state)
    else
      state

  pure def offHandAttackFighterWithDamageReduction(state: BattleState, attackTotal: int, naturalD20: int, damageRoll: int, reduction: int): BattleState =
    offHandAttackFighterWithDamageReductionAndAbilityModifier(state, attackTotal, naturalD20, damageRoll, reduction, 3)

  pure def offHandAttackFighterWithDamageReductionAndAbilityModifier(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    reduction: int,
    abilityModifier: int
  ): BattleState =
    if (fighterCanLightPropertyExtraAttack(state))
      if (attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), fighterCriticalThreshold(state))) {
        val baseDamage = battleRuntimeLightPropertyExtraAttackDamageAmount(damageRoll, abilityModifier)
        val reducedDamage = if (baseDamage - reduction < 0) 0 else baseDamage - reduction
        {
          ...spendFighterLightPropertyExtraAttackBonusAction(state),
          goblin: applyDamageFromSource(state.goblin, reducedDamage, if (attackIsCritical(naturalD20, fighterCriticalThreshold(state))) 2 else 1, false, OrdinaryDamage, Fighter),
        }
      }
      else
        spendFighterLightPropertyExtraAttackBonusAction(state)
    else
      state

  pure def goblinCanOpportunityAttack(state: BattleState, provokedByTable: bool): bool =
    state.goblin.hp > 0 and
    state.goblin.reactionAvailable and
    battleRuntimeOpportunityAttackTriggered(
      movementProjectionForFighter(state, WalkSpeedKind),
      true,
      true,
      provokedByTable,
      true,
    )

  pure def applyFighterMovement(state: BattleState, movementCost: int): BattleState =
    applyFighterMovementWithSpeedKind(state, WalkSpeedKind, movementCost)

  pure def applyFighterMovementWithSpeedKind(state: BattleState, speedKind: MovementSpeedKind, movementCost: int): BattleState = {
    val step = battleRuntimeSpendMovement(movementProjectionForFighter(state, speedKind), movementCost)
    stateWithFighterMovementStep(state, step)
  }

  pure def moveFighter(state: BattleState, movementCost: int, provokedByTable: bool): BattleState =
    moveFighterWithSpeedKind(state, WalkSpeedKind, movementCost, provokedByTable)

  pure def moveFighterWithSpeedKind(state: BattleState, speedKind: MovementSpeedKind, movementCost: int, provokedByTable: bool): BattleState =
    if (not(fighterCanMoveWithSpeedKind(state, speedKind, movementCost)))
      state
    else if (goblinCanOpportunityAttack(state, provokedByTable))
      openReactionWindow(state, {
        trigger: OpportunityAttack,
        procedure: OpportunityAttackReactionProcedure,
        eligibleReactors: Set(Goblin),
        offeredReactors: Set(),
        continuation: ResumeMovement({ speedKind: speedKind, movementCost: movementCost }),
      })
    else
      applyFighterMovementWithSpeedKind(state, speedKind, movementCost)

  pure def spendFighterSpellActionCost(state: BattleState, actionCost: SpellActionCost): BattleState =
    stateWithFighterMovementStep(
      state,
      if (actionCost == SpellBonusAction)
        battleRuntimeSpendBonusAction(movementProjectionForFighter(state, WalkSpeedKind))
      else
        battleRuntimeSpendMagicAction(movementProjectionForFighter(state, WalkSpeedKind)),
    )

  pure def canSpendFighterSpellActionCost(state: BattleState, actionCost: SpellActionCost): bool =
    spendFighterSpellActionCost(state, actionCost) != state

  pure def battleRuntimeDirectRestorationProfile(
    invocation: DirectHitPointRestorationSpell
  ): BattleRuntimeDirectHitPointRestorationProfile =
    match invocation {
      | HealingWordRestoration => BattleRuntimeHealingWordRestoration
      | CureWoundsRestoration => BattleRuntimeCureWoundsRestoration
      | MassHealingWordRestoration => BattleRuntimeMassHealingWordRestoration
    }

  pure def directHitPointRestorationActionCost(invocation: DirectHitPointRestorationSpell): SpellActionCost =
    if (battleRuntimeDirectHitPointRestorationUsesBonusAction(battleRuntimeDirectRestorationProfile(invocation)))
      SpellBonusAction
    else
      SpellMagicAction

  pure def directHitPointRestorationMaximumTargets(invocation: DirectHitPointRestorationSpell): int =
    battleRuntimeDirectHitPointRestorationMaximumTargets(battleRuntimeDirectRestorationProfile(invocation), 3)

  pure def directHitPointRestorationHealing(
    healingRoll: int,
    spellcastingAbilityModifier: int
  ): int =
    battleRuntimeDirectHitPointRestorationHealing(healingRoll, spellcastingAbilityModifier)

  pure def resolveDirectHitPointRestoration(
    state: BattleState,
    invocation: DirectHitPointRestorationSpell,
    targetCount: int,
    healingRoll: int,
    spellcastingAbilityModifier: int,
  ): BattleState = {
    val actionCost = directHitPointRestorationActionCost(invocation)
    val validTargetCount = targetCount >= 1 and targetCount <= directHitPointRestorationMaximumTargets(invocation)
    val canSpendActionCost = canSpendFighterSpellActionCost(state, actionCost)
    if (
      currentActor(state) == Fighter and
      validTargetCount and
      canSpendActionCost and
      canExpendSpellSlotThisTurn(state) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    ) {
      val healed = applyHealing(
        state.fighter,
        directHitPointRestorationHealing(healingRoll, spellcastingAbilityModifier)
      )
	      commitActorSpellSlotUse({
	        ...spendFighterSpellActionCost(state, actionCost),
	        fighter: healed,
	      }, Fighter)
    } else {
      state
    }
  }

  pure def scalarBuffActionCost(invocation: ScalarBuffSpell): SpellActionCost =
    if (battleRuntimeScalarBuffUsesBonusAction(battleRuntimeScalarBuffProfileForInvocation(invocation))) SpellBonusAction
    else SpellMagicAction

  pure def scalarBuffMaximumTargets(invocation: ScalarBuffSpell, slotLevel: int): int =
    battleRuntimeScalarBuffMaximumTargets(battleRuntimeScalarBuffProfileForInvocation(invocation), slotLevel)

  pure def scalarBuffTemporaryHitPoints(invocation: ScalarBuffSpell, slotLevel: int, rolledDice: int): int =
    battleRuntimeScalarBuffTemporaryHitPoints(battleRuntimeScalarBuffProfileForInvocation(invocation), slotLevel, rolledDice)

  pure def scalarBuffActiveEffects(invocation: ScalarBuffSpell): Set[ActiveEffect] =
    battleRuntimeScalarBuffEffects(battleRuntimeScalarBuffProfileForInvocation(invocation), 0)
      .map(scalarBuffActiveEffect)

  pure def scalarBuffActiveEffect(effect: BattleRuntimeScalarBuffEffect): ActiveEffect =
    match effect {
      | BattleRuntimeLongstriderSpeedIncreaseEffect => LongstriderSpeedDelta
      | BattleRuntimeShieldOfFaithArmorClassBonusEffect => ShieldOfFaithArmorClassBonus
      | BattleRuntimeHeroismFrightenedImmunityEffect => HeroismFrightenedImmunity
      | BattleRuntimeHeroismTurnStartTemporaryHitPointsEffect(data) => HeroismTurnStartTemporaryHitPoints(data)
    }

  pure def scalarBuffCombatant(
    combatant: Combatant,
    invocation: ScalarBuffSpell,
    slotLevel: int,
    rolledDice: int,
  ): Combatant =
    if (invocation == FalseLifeScalarBuff)
      { ...combatant, tempHp: if (combatant.tempHp > scalarBuffTemporaryHitPoints(invocation, slotLevel, rolledDice)) combatant.tempHp else scalarBuffTemporaryHitPoints(invocation, slotLevel, rolledDice) }
    else
      { ...combatant, activeEffects: combatant.activeEffects.union(scalarBuffActiveEffects(invocation)) }

  pure def scalarBuffTargetedState(
    state: BattleState,
    invocation: ScalarBuffSpell,
    targets: Set[Actor],
    slotLevel: int,
    rolledDice: int,
  ): BattleState =
    {
      ...state,
      fighter: if (targets.contains(Fighter)) scalarBuffCombatant(state.fighter, invocation, slotLevel, rolledDice) else state.fighter,
      goblin: if (targets.contains(Goblin)) scalarBuffCombatant(state.goblin, invocation, slotLevel, rolledDice) else state.goblin,
    }

  pure def resolveScalarBuffSpell(
    state: BattleState,
    invocation: ScalarBuffSpell,
    targets: Set[Actor],
    slotLevel: int,
    rolledDice: int,
  ): BattleState = {
    val actionCost = scalarBuffActionCost(invocation)
    val targetCount = targets.size()
    val validTargetCount = targetCount >= 1 and targetCount <= scalarBuffMaximumTargets(invocation, slotLevel)
    val canSpendActionCost = canSpendFighterSpellActionCost(state, actionCost)
    if (
      currentActor(state) == Fighter and
      validTargetCount and
      canSpendActionCost and
      canExpendSpellSlotThisTurn(state) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    ) {
      val concentrationBase =
        if (battleRuntimeScalarBuffRequiresConcentration(battleRuntimeScalarBuffProfileForInvocation(invocation)))
          {
            ...state,
            fighter: breakConcentration(state.fighter),
            goblin: { ...state.goblin, activeEffects: activeEffectsWithoutSpellEffectConcentration(state.goblin.activeEffects) },
          }
        else
          state
      val effected = scalarBuffTargetedState(concentrationBase, invocation, targets, slotLevel, rolledDice)
      val spent = spendFighterSpellActionCost(effected, actionCost)
	      commitActorSpellSlotUse({
	        ...spent,
	        fighter: { ...spent.fighter, concentrating: if (battleRuntimeScalarBuffRequiresConcentration(battleRuntimeScalarBuffProfileForInvocation(invocation))) true else spent.fighter.concentrating },
	      }, Fighter)
    } else {
      state
    }
  }

  pure def resolveHeroismSpell(
    state: BattleState,
    targets: Set[Actor],
    slotLevel: int,
    spellcastingAbilityModifier: int,
  ): BattleState = {
    val targetCount = targets.size()
    val validTargetCount = targetCount >= 1 and targetCount <= slotLevel
    val knownWillingTargets = targets == Set(Fighter)
    if (
      currentActor(state) == Fighter and
      validTargetCount and
      knownWillingTargets and
      canSpendFighterSpellActionCost(state, SpellMagicAction) and
      canExpendSpellSlotThisTurn(state) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    ) {
      val concentrationBase = {
        ...state,
        fighter: breakConcentration(state.fighter),
        goblin: { ...state.goblin, activeEffects: activeEffectsWithoutSpellEffectConcentration(state.goblin.activeEffects) },
      }
      val heroismEffects = battleRuntimeScalarBuffEffects(BattleRuntimeHeroismScalarBuff, spellcastingAbilityModifier)
        .map(scalarBuffActiveEffect)
      val spent = spendFighterSpellActionCost(concentrationBase, SpellMagicAction)
	      commitActorSpellSlotUse({
	        ...spent,
	        fighter: if (targets.contains(Fighter)) { ...spent.fighter, concentrating: true, activeEffects: spent.fighter.activeEffects.union(heroismEffects) } else { ...spent.fighter, concentrating: true },
	        goblin: if (targets.contains(Goblin)) { ...spent.goblin, activeEffects: spent.goblin.activeEffects.union(heroismEffects) } else spent.goblin,
	      }, Fighter)
    } else {
      state
    }
  }

  pure def resolveDivineFavor(state: BattleState): BattleState =
    if (
      currentActor(state) == Fighter and
      state.bonusActionAvailable and
      canExpendSpellSlotThisTurn(state) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    )
	      commitActorSpellSlotUse({
	        ...state,
	        fighter: {
	          ...state.fighter,
	          activeEffects: activeEffectsWithoutDivineFavor(state.fighter.activeEffects)
	            .union(Set(DivineFavorWeaponDamageRider({ durationTicks: favorWeaponDamageRiderDurationTicks }))),
	        },
	        bonusActionAvailable: false,
	      }, Fighter)
    else
      state

  pure def favorWeaponDamageRiderDurationTicks: int =
    battleRuntimeDivineFavorDurationTicks

  pure def activeEffectsWithoutDivineFavor(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | DivineFavorWeaponDamageRider(_) => false
      | _ => true
    })

  pure def activeEffectsContainDivineFavor(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | DivineFavorWeaponDamageRider(_) => true
      | _ => false
    })

  pure def fighterDivineFavorDamage(divineFavorDamageRoll: int, effects: Set[ActiveEffect]): int =
    if (activeEffectsContainDivineFavor(effects)) divineFavorDamageRoll else 0

  pure def divineSmiteDamageDice(slotLevel: int, targetCreatureType: RuntimeCreatureType): int =
    battleRuntimeDivineSmiteDamageDice(
      slotLevel,
      targetCreatureType == FiendCreature or targetCreatureType == UndeadCreature,
    )

  pure def resolveDivineSmiteAfterMeleeHit(
    state: BattleState,
    slotLevel: int,
    smiteDamageRoll: int,
    targetCreatureType: RuntimeCreatureType,
    attackCritical: bool,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (
      currentActor(state) == Fighter and
      slotLevel >= 1 and
      state.bonusActionAvailable and
      canExpendSpellSlotThisTurn(state) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    )
      commitActorSpellSlotUse({
        ...state,
        bonusActionAvailable: false,
        goblin: applyDamageFromSource(state.goblin, smiteDamageRoll * (if (attackCritical) 2 else 1), 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter),
      }, Fighter)
    else
      state

  pure def resolvePaladinsSmiteAfterMeleeHit(
    state: BattleState,
    paladinsSmiteUsesRemaining: int,
    smiteDamageRoll: int,
    targetCreatureType: RuntimeCreatureType,
    attackCritical: bool,
    concentrationSaveSucceeded: bool,
  ): { state: BattleState, paladinsSmiteUsesRemaining: int } =
    if (
      currentActor(state) == Fighter and
      paladinsSmiteUsesRemaining > 0 and
      state.bonusActionAvailable and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    )
      {
        state: {
          ...state,
          bonusActionAvailable: false,
          goblin: applyDamageFromSource(state.goblin, smiteDamageRoll * (if (attackCritical) 2 else 1), 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter),
        },
        paladinsSmiteUsesRemaining: paladinsSmiteUsesRemaining - 1,
      }
    else
      { state: state, paladinsSmiteUsesRemaining: paladinsSmiteUsesRemaining }

  pure def activeEffectsWithoutEnsnaringStrike(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | EnsnaringStrikeRestrained(_) => false
      | _ => true
    })

  pure def activeEffectsContainEnsnaringStrike(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | EnsnaringStrikeRestrained(_) => true
      | _ => false
    })

  pure def ensnaringStrikeDamageDiceForSlot(slotLevel: int): int =
    battleRuntimeEnsnaringStrikeDamageDice(slotLevel)

  pure def ensnaringStrikeTargetHasSaveAdvantage(targetSize: CreatureSize): bool =
    battleRuntimeEnsnaringStrikeTargetHasSaveAdvantage(
      targetSize == Large or targetSize == Huge or targetSize == Gargantuan
    )

  pure def ensnaringStrikeDamageDice(effects: Set[ActiveEffect]): int =
    effects
      .map(effect => match effect {
        | EnsnaringStrikeRestrained(data) => data.damageDice
        | _ => 0
      })
      .fold(0, (highest, dice) => if (highest > dice) highest else dice)

  pure def resolveEnsnaringStrikeAfterWeaponHit(
    state: BattleState,
    slotLevel: int,
    goblinSavingThrowSucceeded: bool,
  ): BattleState =
    if (
      currentActor(state) == Fighter and
      slotLevel >= 1 and
      state.bonusActionAvailable and
      canExpendSpellSlotThisTurn(state) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    )
	      {
	      val withoutPrior = breakConcentrationSpellEffects(state, Fighter)
	      commitActorSpellSlotUse({
	        ...withoutPrior,
	        fighter: { ...withoutPrior.fighter, concentrating: not(goblinSavingThrowSucceeded) },
	        goblin: if (goblinSavingThrowSucceeded)
          withoutPrior.goblin
        else
          {
            ...withoutPrior.goblin,
            activeEffects: activeEffectsWithoutEnsnaringStrike(withoutPrior.goblin.activeEffects)
              .union(Set(EnsnaringStrikeRestrained({ damageDice: ensnaringStrikeDamageDiceForSlot(slotLevel) }))),
	          },
	        bonusActionAvailable: false,
	      }, Fighter)
	    }
    else
      state

  pure def endTurnWithEnsnaringStrikeDamage(
    state: BattleState,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState = {
    val advanced = endTurn(state)
    val damageDice = ensnaringStrikeDamageDice(advanced.goblin.activeEffects)
    if (currentActor(advanced) == Goblin and damageDice > 0)
      { ...advanced, goblin: applyDamageFromSource(advanced.goblin, damageRoll, 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter) }
    else
      advanced
  }

  pure def searingSmiteDamageDiceForSlot(slotLevel: int): int =
    battleRuntimeSearingSmiteDamageDice(slotLevel)

  pure def searingSmiteDurationTicks: int =
    battleRuntimeSearingSmiteDurationTicks

  pure def activeEffectsWithoutSearingSmite(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | SearingSmiteBurning(_) => false
      | _ => true
    })

  pure def activeEffectsContainSearingSmite(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | SearingSmiteBurning(_) => true
      | _ => false
    })

  pure def searingSmiteDamageDice(effects: Set[ActiveEffect]): int =
    effects
      .map(effect => match effect {
        | SearingSmiteBurning(data) => data.damageDice
        | _ => 0
      })
      .fold(0, (highest, dice) => if (highest > dice) highest else dice)

  pure def resolveSearingSmiteAfterMeleeHit(
    state: BattleState,
    slotLevel: int,
    smiteDamageRoll: int,
    attackCritical: bool,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (
      currentActor(state) == Fighter and
      slotLevel >= 1 and
      state.bonusActionAvailable and
      canExpendSpellSlotThisTurn(state) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    )
	      commitActorSpellSlotUse({
	        ...state,
	        goblin: {
	          ...applyDamageFromSource(state.goblin, smiteDamageRoll * (if (attackCritical) 2 else 1), 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter),
          activeEffects: activeEffectsWithoutSearingSmite(state.goblin.activeEffects)
            .union(Set(SearingSmiteBurning({
              damageDice: searingSmiteDamageDiceForSlot(slotLevel),
              durationTicks: searingSmiteDurationTicks,
            }))),
	        },
	        bonusActionAvailable: false,
	      }, Fighter)
    else
      state

  pure def endTurnWithSearingSmiteDamageAndSave(
    state: BattleState,
    damageRoll: int,
    saveSucceeded: bool,
    concentrationSaveSucceeded: bool,
  ): BattleState = {
    val advanced = endTurn(state)
    val damageDice = searingSmiteDamageDice(advanced.goblin.activeEffects)
    if (currentActor(advanced) == Goblin and damageDice > 0)
      {
        val damagedGoblin = applyDamageFromSource(advanced.goblin, damageRoll, 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter)
        {
          ...advanced,
          goblin: if (saveSucceeded)
            { ...damagedGoblin, activeEffects: activeEffectsWithoutSearingSmite(damagedGoblin.activeEffects) }
          else
            damagedGoblin,
        }
      }
    else
      advanced
  }

  pure def escapeEnsnaringStrike(
    state: BattleState,
    checkSucceeded: bool,
    actorWithinRestrainedTargetReach: bool,
  ): BattleState =
    if (
      not(state.actionAvailable)
        or not(activeEffectsContainEnsnaringStrike(state.goblin.activeEffects))
        or (currentActor(state) != Goblin and not(actorWithinRestrainedTargetReach))
    )
      state
    else
      {
        ...state,
        fighter: if (checkSucceeded) { ...state.fighter, concentrating: false } else state.fighter,
        goblin: if (checkSucceeded) { ...state.goblin, activeEffects: activeEffectsWithoutEnsnaringStrike(state.goblin.activeEffects) } else state.goblin,
        actionAvailable: false,
      }

  pure def huntersMarkDurationTicks(slotLevel: int): int =
    if (slotLevel >= 5) 24 * 60 * 10
    else if (slotLevel >= 3) 8 * 60 * 10
    else 60 * 10

  pure def resolveHuntersMark(state: BattleState, target: Actor, slotLevel: int): BattleState =
    if (
      currentActor(state) == Fighter and
      target == Goblin and
      slotLevel >= 1 and
      state.bonusActionAvailable and
      canExpendSpellSlotThisTurn(state) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    )
	      commitActorSpellSlotUse({
	        ...state,
	        fighter: {
	          ...state.fighter,
          concentrating: true,
            activeEffects: activeEffectsWithoutHuntersMark(state.fighter.activeEffects)
            .union(Set(HuntersMarkDamageRider({
              target: target,
              transfer: AwaitingTargetDrop,
              durationTicks: huntersMarkDurationTicks(slotLevel),
            }))),
	        },
	        bonusActionAvailable: false,
	      }, Fighter)
    else
      state

  pure def resolveFavoredEnemyHuntersMark(
    state: BattleState,
    target: Actor,
    favoredEnemyUsesRemaining: int,
  ): { state: BattleState, favoredEnemyUsesRemaining: int } =
    if (
      currentActor(state) == Fighter and
      target == Goblin and
      favoredEnemyUsesRemaining > 0 and
      state.bonusActionAvailable and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    )
      {
        state: {
          ...state,
          fighter: {
            ...state.fighter,
            concentrating: true,
              activeEffects: activeEffectsWithoutHuntersMark(state.fighter.activeEffects)
              .union(Set(HuntersMarkDamageRider({
                target: target,
                transfer: AwaitingTargetDrop,
                durationTicks: huntersMarkDurationTicks(1),
              }))),
          },
          bonusActionAvailable: false,
        },
        favoredEnemyUsesRemaining: favoredEnemyUsesRemaining - 1,
      }
    else
      { state: state, favoredEnemyUsesRemaining: favoredEnemyUsesRemaining }

  pure def transferHuntersMark(state: BattleState, target: Actor): BattleState =
    if (
      currentActor(state) == Fighter and
      target == Goblin and
      state.bonusActionAvailable and
      activeEffectsContainTransferableHuntersMark(state, state.fighter.activeEffects) and
      state.fighter.concentrating
    )
      {
        ...state,
        fighter: {
          ...state.fighter,
          activeEffects: activeEffectsWithoutHuntersMark(state.fighter.activeEffects)
            .union(Set(HuntersMarkDamageRider({
              target: target,
              transfer: AwaitingTargetDrop,
              durationTicks: activeEffectsHuntersMarkDurationTicks(state.fighter.activeEffects),
            }))),
        },
        bonusActionAvailable: false,
      }
    else
      state

  pure def hexDurationTicks(slotLevel: int): int =
    if (slotLevel >= 5) 60 * 60 * 24
    else if (slotLevel >= 3) 60 * 60 * 8
    else if (slotLevel >= 2) 60 * 60 * 4
    else 60 * 60

  pure def resolveHex(state: BattleState, target: Actor, ability: Ability, slotLevel: int): BattleState =
    if (
      currentActor(state) == Fighter and
      target == Goblin and
      slotLevel >= 1 and
      state.bonusActionAvailable and
      canExpendSpellSlotThisTurn(state) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    )
      commitActorSpellSlotUse({
        ...state,
        fighter: {
          ...state.fighter,
          concentrating: true,
          activeEffects: activeEffectsWithoutHex(state.fighter.activeEffects)
            .union(Set(HexDamageRider({
              target: target,
              ability: ability,
              transfer: AwaitingTargetDrop,
              durationTicks: hexDurationTicks(slotLevel),
            }))),
        },
        bonusActionAvailable: false,
      }, Fighter)
    else
      state

  pure def transferHex(state: BattleState, target: Actor): BattleState =
    if (
      currentActor(state) == Fighter and
      target == Goblin and
      state.bonusActionAvailable and
      activeEffectsContainTransferableHex(state, state.fighter.activeEffects) and
      state.fighter.concentrating
    )
      {
        ...state,
        fighter: {
          ...state.fighter,
          activeEffects: activeEffectsWithoutHex(state.fighter.activeEffects)
            .union(Set(HexDamageRider({
              target: target,
              ability: activeEffectsHexAbility(state.fighter.activeEffects),
              transfer: AwaitingTargetDrop,
              durationTicks: activeEffectsHexDurationTicks(state.fighter.activeEffects),
            }))),
        },
        bonusActionAvailable: false,
      }
    else
      state

  pure def activeEffectsWithoutHuntersMark(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | HuntersMarkDamageRider(_) => false
      | _ => true
    })

  pure def activeEffectsWithoutHex(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | HexDamageRider(_) => false
      | _ => true
    })

  pure def activeEffectsWithoutMarkedDamageRider(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    activeEffectsWithoutHex(activeEffectsWithoutHuntersMark(effects))

  pure def activeEffectsContainMarkedDamageRider(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | HuntersMarkDamageRider(_) => true
      | HexDamageRider(_) => true
      | _ => false
    })

  pure def activeEffectsContainTimedConcentrationSpellEffect(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | HuntersMarkDamageRider(_) => true
      | HexDamageRider(_) => true
      | FogCloudObscurement(_) => true
      | DancingLightsEffect(_) => true
      | _ => false
    })

  pure def activeEffectsContainHuntersMark(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | HuntersMarkDamageRider(_) => true
      | _ => false
    })

  pure def activeEffectsHuntersMarkDurationTicks(effects: Set[ActiveEffect]): int =
    effects.map(effect => match effect {
      | HuntersMarkDamageRider(data) => data.durationTicks
      | _ => 0
    }).fold(0, (highest, ticks) => if (highest > ticks) highest else ticks)

  pure def activeEffectsHexDurationTicks(effects: Set[ActiveEffect]): int =
    effects.map(effect => match effect {
      | HexDamageRider(data) => data.durationTicks
      | _ => 0
    }).fold(0, (highest, ticks) => if (highest > ticks) highest else ticks)

  pure def activeEffectsHexAbility(effects: Set[ActiveEffect]): Ability =
    effects.map(effect => match effect {
      | HexDamageRider(data) => data.ability
      | _ => StrAbility
    }).fold(StrAbility, (selected, ability) => if (selected == StrAbility) ability else selected)

  pure def markedDamageRiderTransferIsAvailable(state: BattleState, transfer: MarkedDamageRiderTransfer): bool =
    match transfer {
      | AwaitingTargetDrop => false
      | TransferAvailable => true
      | TransferAvailableAfterTurn(data) => data.actor != currentActor(state) or data.round != state.initiative.round
    }

  pure def activeEffectsContainTransferableHuntersMark(state: BattleState, effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | HuntersMarkDamageRider(data) => markedDamageRiderTransferIsAvailable(state, data.transfer)
      | _ => false
    })

  pure def activeEffectsContainTransferableHex(state: BattleState, effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | HexDamageRider(data) => markedDamageRiderTransferIsAvailable(state, data.transfer)
      | _ => false
    })

  pure def fighterHuntersMarkDamage(huntersMarkDamageRoll: int, effects: Set[ActiveEffect], target: Actor): int =
    if (effects.exists(effect => match effect {
      | HuntersMarkDamageRider(data) => data.target == target
      | _ => false
    })) huntersMarkDamageRoll else 0

  pure def fighterHexDamage(hexDamageRoll: int, effects: Set[ActiveEffect], target: Actor): int =
    if (effects.exists(effect => match effect {
      | HexDamageRider(data) => data.target == target
      | _ => false
    })) hexDamageRoll else 0

  pure def hexAbilityCheckRollMode(effects: Set[ActiveEffect], actor: Actor, ability: Ability): AbilityCheckRollMode =
    if (effects.exists(effect => match effect {
      | HexDamageRider(data) => data.target == actor and data.ability == ability
      | _ => false
    })) DisadvantageAbilityCheck else NormalAbilityCheck

  pure def huntersMarkFindingAbilityCheckRollMode(effects: Set[ActiveEffect], target: Actor, ability: Ability, skill: AbilityCheckSkill): AbilityCheckRollMode =
    if (
      ability == WisAbility and
      (skill == PerceptionSkill or skill == SurvivalSkill) and
      effects.exists(effect => match effect {
        | HuntersMarkDamageRider(data) => data.target == target
        | _ => false
      })
    ) AdvantageAbilityCheck else NormalAbilityCheck

  pure def requiredAbilityCheckRollMode(
    disadvantageMode: AbilityCheckRollMode,
    advantageMode: AbilityCheckRollMode,
  ): AbilityCheckRollMode =
    if (
      disadvantageMode == DisadvantageAbilityCheck and
      advantageMode == AdvantageAbilityCheck
    ) NormalAbilityCheck else if (disadvantageMode == DisadvantageAbilityCheck)
      DisadvantageAbilityCheck
    else if (advantageMode == AdvantageAbilityCheck)
      AdvantageAbilityCheck
    else
      NormalAbilityCheck

  pure def resolveThaumaturgyBoomingVoice(state: BattleState, activeOneMinuteEffectCount: int): BattleState =
    resolveFighterThaumaturgyBoomingVoice(state, currentActor(state), activeOneMinuteEffectCount, fighterHasRage(state))

  pure def rollModifierMaximumTargets(invocation: RollModifierSpell, slotLevel: int): int =
    match invocation {
      | BaneRollModifier => 3 + (if (slotLevel > 1) slotLevel - 1 else 0)
      | BlessRollModifier => 3 + (if (slotLevel > 1) slotLevel - 1 else 0)
      | GuidanceRollModifier => 1
    }

  pure def rollModifierActiveEffect(invocation: RollModifierSpell): ActiveEffect =
    match invocation {
      | BaneRollModifier => BaneD20RollPenalty
      | BlessRollModifier => BlessD20RollBonus
      | GuidanceRollModifier => GuidanceAbilityCheckBonus
    }

  pure def rollModifierRequiresFailedSave(invocation: RollModifierSpell): bool =
    invocation == BaneRollModifier

  pure def rollModifierSpendsLevelOneSlot(invocation: RollModifierSpell): bool =
    invocation != GuidanceRollModifier

  pure def rollModifierTargetedState(
    state: BattleState,
    invocation: RollModifierSpell,
    targets: Set[Actor],
  ): BattleState =
    {
      ...state,
      fighter: if (targets.contains(Fighter)) { ...state.fighter, activeEffects: state.fighter.activeEffects.union(Set(rollModifierActiveEffect(invocation))) } else state.fighter,
      goblin: if (targets.contains(Goblin)) { ...state.goblin, activeEffects: state.goblin.activeEffects.union(Set(rollModifierActiveEffect(invocation))) } else state.goblin,
    }

  pure def resolveRollModifierSpell(
    state: BattleState,
    invocation: RollModifierSpell,
    selectedTargets: Set[Actor],
    failedSaveTargets: Set[Actor],
    slotLevel: int,
  ): BattleState = {
    val targetCount = selectedTargets.size()
    val validTargetCount = targetCount >= 1 and targetCount <= rollModifierMaximumTargets(invocation, slotLevel)
    val affectedTargets =
      if (rollModifierRequiresFailedSave(invocation)) failedSaveTargets else selectedTargets
    if (
      currentActor(state) == Fighter and
      validTargetCount and
      failedSaveTargets.forall(target => selectedTargets.contains(target)) and
      state.actionAvailable and
      (not(rollModifierSpendsLevelOneSlot(invocation)) or canExpendSpellSlotThisTurn(state)) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    ) {
      val concentrationBase = {
        ...state,
        fighter: breakConcentration(state.fighter),
        goblin: { ...state.goblin, activeEffects: activeEffectsWithoutSpellEffectConcentration(state.goblin.activeEffects) },
      }
      val effected = rollModifierTargetedState(concentrationBase, invocation, affectedTargets)
      val resolved = {
        ...effected,
        fighter: { ...effected.fighter, concentrating: true },
        actionAvailable: false,
      }
      if (rollModifierSpendsLevelOneSlot(invocation))
        commitActorSpellSlotUse(resolved, Fighter)
      else
        resolved
    } else {
      state
    }
  }

  pure def resolveDancingLightsSeparateCast(
    state: BattleState,
    lightCount: int,
    distanceFromCasterFeet: int,
    nearestSiblingDistanceFeet: int,
  ): BattleState =
    if (
      currentActor(state) == Fighter and
      state.actionAvailable and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state)) and
      dancingLightsCastPlacementAllowed(lightCount, distanceFromCasterFeet, nearestSiblingDistanceFeet)
    ) {
      val withoutPrior = breakConcentrationSpellEffects(state, Fighter)
      {
        ...withoutPrior,
        fighter: {
          ...withoutPrior.fighter,
          concentrating: true,
          activeEffects: activeEffectsWithoutDancingLights(withoutPrior.fighter.activeEffects)
            .union(Set(dancingLightsActiveEffect(false, lightCount, 1, 2, 3, 4, dancingLightsDurationTicks))),
        },
        actionAvailable: false,
      }
    } else {
      state
    }

  pure def resolveDancingLightsCombinedCast(state: BattleState, distanceFromCasterFeet: int): BattleState =
    if (
      currentActor(state) == Fighter and
      state.actionAvailable and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state)) and
      distanceFromCasterFeet <= dancingLightsRangeFeet
    ) {
      val withoutPrior = breakConcentrationSpellEffects(state, Fighter)
      {
        ...withoutPrior,
        fighter: {
          ...withoutPrior.fighter,
          concentrating: true,
          activeEffects: activeEffectsWithoutDancingLights(withoutPrior.fighter.activeEffects)
            .union(Set(dancingLightsActiveEffect(true, 1, 1, 0, 0, 0, dancingLightsDurationTicks))),
        },
        actionAvailable: false,
      }
    } else {
      state
    }

  pure def resolveDancingLightsReposition(
    state: BattleState,
    combined: bool,
    lightCount: int,
    moveDistanceFeet: int,
    nearestSiblingDistanceFeet: int,
    distanceFromCasterFeet: int,
  ): BattleState =
    if (
      currentActor(state) == Fighter and
      state.bonusActionAvailable and
      activeEffectsContainDancingLights(state.fighter.activeEffects) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state)) and
      dancingLightsRepositionAllowed(moveDistanceFeet, nearestSiblingDistanceFeet, lightCount)
    ) {
      val remainingLightCount = if (dancingLightSurvivesRange(distanceFromCasterFeet)) lightCount else 0
      val remainingDurationTicks = dancingLightsRemainingDurationTicks(state.fighter.activeEffects)
      val nextEffects =
        if (remainingLightCount == 0)
          activeEffectsWithoutDancingLights(state.fighter.activeEffects)
        else
          activeEffectsWithoutDancingLights(state.fighter.activeEffects)
            .union(Set(dancingLightsActiveEffect(combined, remainingLightCount, 11, 12, 13, 14, remainingDurationTicks)))
      {
        ...state,
        fighter: {
          ...state.fighter,
          activeEffects: nextEffects,
        },
        bonusActionAvailable: false,
      }
    } else {
      state
    }

  pure def resolveLightObject(
    state: BattleState,
    objectTarget: ObjectTarget,
    objectSize: ObjectSize,
    wornOrCarried: ObjectWearCarry,
  ): BattleState =
    if (
      currentActor(state) == Fighter and
      state.actionAvailable and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state)) and
      lightObjectTargetAllowed(objectSize, wornOrCarried)
    ) {
      {
        ...state,
        lightEmitters: lightEmittersWithoutLightFromSource(state.lightEmitters, Fighter)
          .union(Set(lightObjectEmitter(objectTarget))),
        actionAvailable: false,
      }
    } else {
      state
    }

  pure def resolveProduceFlameHeldLight(state: BattleState): BattleState =
    if (
      currentActor(state) == Fighter and
      state.bonusActionAvailable and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    ) {
      {
        ...state,
        fighter: {
          ...state.fighter,
          activeEffects: activeEffectsWithoutProduceFlameHeldLight(state.fighter.activeEffects)
            .union(Set(ProduceFlameHeldLight({ durationTicks: produceFlameDurationTicks }))),
        },
        bonusActionAvailable: false,
      }
    } else {
      state
    }

  pure def shillelaghDurationTicks: int = 10

  pure def shillelaghDamageDice(characterLevel: int): int =
    if (characterLevel >= 17) 2 else 1

  pure def shillelaghDamageDieSize(characterLevel: int): int =
    if (characterLevel >= 17) 6
    else if (characterLevel >= 11) 12
    else if (characterLevel >= 5) 10
    else 8

  pure def heldWeaponForShillelaghEffect(heldWeapon: HeldWeaponForShillelagh): Set[ShillelaghWeapon] =
    match heldWeapon {
      | HeldClub => Set(ShillelaghClub)
      | HeldQuarterstaff => Set(ShillelaghQuarterstaff)
      | HeldOtherWeapon => Set()
      | HeldNoWeapon => Set()
    }

  pure def shillelaghHeldWeaponIsEligible(heldWeapon: HeldWeaponForShillelagh): bool =
    heldWeaponForShillelaghEffect(heldWeapon).size() == 1

  pure def shillelaghDamageTypeChoiceIsLegal(selected: DamageType, weaponNormal: DamageType): bool =
    selected == Force or selected == weaponNormal

  pure def shillelaghAttackModifier(
    spellcastingAbilityModifier: int,
    proficiencyBonus: int,
  ): int =
    spellcastingAbilityModifier + proficiencyBonus

  pure def activeEffectsWithoutShillelagh(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | ShillelaghWeaponAttackOverride(_) => false
      | _ => true
    })

  pure def shillelaghEffect(
    weapon: ShillelaghWeapon,
    spellcastingAbilityModifier: int,
    characterLevel: int,
  ): ActiveEffect =
    ShillelaghWeaponAttackOverride({
      weapon: weapon,
      damageDice: shillelaghDamageDice(characterLevel),
      damageDieSize: shillelaghDamageDieSize(characterLevel),
      spellcastingAbilityModifier: spellcastingAbilityModifier,
      durationTicks: shillelaghDurationTicks,
    })

  pure def resolveShillelagh(
    state: BattleState,
    heldWeapon: HeldWeaponForShillelagh,
    spellcastingAbilityModifier: int,
    characterLevel: int,
  ): BattleState =
    if (
      currentActor(state) == Fighter and
      state.bonusActionAvailable and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state)) and
      shillelaghHeldWeaponIsEligible(heldWeapon)
    ) {
      val weapons = heldWeaponForShillelaghEffect(heldWeapon)
      val effect = weapons.map(weapon => shillelaghEffect(weapon, spellcastingAbilityModifier, characterLevel))
      {
        ...state,
        fighter: {
          ...state.fighter,
          activeEffects: activeEffectsWithoutShillelagh(state.fighter.activeEffects)
            .union(effect),
        },
        bonusActionAvailable: false,
      }
    } else {
      state
    }

  pure def shillelaghEffectsMatchingHeldWeapon(
    effects: Set[ActiveEffect],
    heldWeapon: HeldWeaponForShillelagh,
  ): Set[ActiveEffect] = {
    val heldWeapons = heldWeaponForShillelaghEffect(heldWeapon)
    effects.filter(effect => match effect {
      | ShillelaghWeaponAttackOverride(data) => heldWeapons.contains(data.weapon)
      | _ => true
    })
  }

  pure def produceFlameHurlDamageDice(characterLevel: int): int =
    if (characterLevel >= 17) 4
    else if (characterLevel >= 11) 3
    else if (characterLevel >= 5) 2
    else 1

  pure def resolveProduceFlameHurl(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (
      not(state.actionAvailable) or
      currentActor(state) != Fighter or
      state.fighter.unconscious or
      state.fighter.incapacitated or
      fighterHasRage(state) or
      not(activeEffectsContainProduceFlameHeldLight(state.fighter.activeEffects))
    )
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), 20))) {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      { ...rolled, fighter: fighterWithoutProduceFlameHeldLight(rolled), actionAvailable: false }
    }
    else if (state.goblin.reactionAvailable and not(state.goblin.activeEffects.contains(ShieldArmorClassBonus))) {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      openReactionWindow({ ...rolled, fighter: fighterWithoutProduceFlameHeldLight(rolled) }, {
        trigger: AttackHit,
        procedure: ShieldReactionProcedure,
        eligibleReactors: Set(Goblin),
        offeredReactors: Set(),
        continuation: ResumeProduceFlameHurl,
      })
    }
    else {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      val adjustedDamage = damageAfterAdjustments(damageRoll, Fire, Set(), Set(), Set())
      val damaged = applyDamageFromSource(state.goblin, adjustedDamage, if (attackIsCritical(naturalD20, 20)) 2 else 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter)
      { ...rolled, fighter: fighterWithoutProduceFlameHeldLight(rolled), goblin: damaged, actionAvailable: false }
    }

  pure def grantActionSurge(
    state: BattleState,
    usesRemaining: int,
    usedThisTurn: bool,
  ): ActionSurgeResult =
    if (currentActor(state) == Fighter and usesRemaining > 0 and not(usedThisTurn))
      {
        state: { ...state, actionAvailable: true },
        usesRemaining: usesRemaining - 1,
        usedThisTurn: true,
      }
    else
      { state: state, usesRemaining: usesRemaining, usedThisTurn: usedThisTurn }

  pure def resolveSecondWind(
    state: BattleState,
    usesRemaining: int,
    healingRoll: int,
    fighterLevel: int,
  ): SecondWindResult =
    if (
      currentActor(state) == Fighter and
      state.bonusActionAvailable and
      usesRemaining > 0 and
      not(state.fighter.unconscious)
    )
      {
        state: {
          ...state,
          fighter: applyHealing(state.fighter, healingRoll + fighterLevel),
          bonusActionAvailable: false,
        },
        usesRemaining: usesRemaining - 1,
      }
    else
      { state: state, usesRemaining: usesRemaining }

  pure def startRage(state: BattleState, usesRemaining: int): SecondWindResult =
    if (
      currentActor(state) == Fighter and
      state.bonusActionAvailable and
      usesRemaining > 0 and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(state.fighter.wearingHeavyArmor) and
      not(fighterHasRage(state))
    )
      {
        state: {
          ...setFighterRoundExtendedOngoingFeatureExpiry({ ...state, fighter: breakConcentration(state.fighter) }, state.initiative.round + 1),
          bonusActionAvailable: false,
          fighterReadiedSpellHeld: false,
        },
        usesRemaining: usesRemaining - 1,
      }
    else
      { state: state, usesRemaining: usesRemaining }

  pure def startPersistentRage(state: BattleState, usesRemaining: int): SecondWindResult =
    if (
      currentActor(state) == Fighter and
      state.bonusActionAvailable and
      usesRemaining > 0 and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(state.fighter.wearingHeavyArmor) and
      not(fighterHasRage(state))
    )
      {
        state: {
          ...state,
          fighter: {
            ...breakConcentration(state.fighter),
            activeOngoingFeatureOccurrences: state.fighter.activeOngoingFeatureOccurrences
              .set(FIGHTER_RAGE_SOURCE_KEY, ActiveFixedDurationOngoingFeature({
                expiresAtEndOfFighterTurnRound: state.initiative.round + 100,
              })),
          },
          bonusActionAvailable: false,
          fighterReadiedSpellHeld: false,
        },
        usesRemaining: usesRemaining - 1,
      }
    else
      { state: state, usesRemaining: usesRemaining }

  pure def extendRageWithBonusAction(state: BattleState, usesRemaining: int): SecondWindResult =
    if (
      currentActor(state) == Fighter and
      state.bonusActionAvailable and
      fighterHasRage(state) and
      fighterHasRoundExtendedRage(state) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(state.fighter.wearingHeavyArmor)
    )
      {
        state: {
          ...setFighterRoundExtendedOngoingFeatureExpiry(state, state.initiative.round + 1),
          bonusActionAvailable: false,
        },
        usesRemaining: usesRemaining,
      }
    else
      { state: state, usesRemaining: usesRemaining }

  pure def actorSide(actor: Actor): CombatantSide =
    match actor {
      | Fighter => PartySide
      | Goblin => OppositionSide
    }

  pure def actorDamageSource(actor: Actor): DamageSourceActor =
    match actor {
      | Fighter => FighterDamageSource
      | Goblin => GoblinDamageSource
    }

  pure def damageSourceSide(damageSource: DamageSourceActor): CombatantSide =
    match damageSource {
      | FighterDamageSource => PartySide
      | FighterAllyDamageSource => PartySide
      | GoblinDamageSource => OppositionSide
    }

  pure def damageSourceIsCasterOrAlly(caster: Actor, damageSource: DamageSourceActor): bool =
    actorSide(caster) == damageSourceSide(damageSource)

  pure def actorsAreEnemies(attacker: Actor, target: Actor): bool =
    actorSide(attacker) != actorSide(target)

  pure def extendRageWithAttackRoll(state: BattleState, target: Actor): BattleState =
    if (currentActor(state) == Fighter and actorsAreEnemies(Fighter, target) and fighterHasRoundExtendedRage(state))
      setFighterRoundExtendedOngoingFeatureExpiry(state, state.initiative.round + 1)
    else
      state

  pure def recordFighterAttackRoll(state: BattleState): BattleState =
    { ...battleStateAfterSanctuaryEarlyEndForActor(extendRageWithAttackRoll(state, Goblin), Fighter), attackRollMadeThisTurn: true }

  pure def extendRageWithEnemySavingThrow(state: BattleState, target: Actor): BattleState =
    if (currentActor(state) == Fighter and actorsAreEnemies(Fighter, target) and fighterHasRoundExtendedRage(state))
      setFighterRoundExtendedOngoingFeatureExpiry(state, state.initiative.round + 1)
    else
      state

  pure def activateRecklessAttackOnFirstAttackRoll(state: BattleState): BattleState =
    if (
      currentActor(state) == Fighter and
      battleRuntimeRecklessAttackActivates(
        fighterHasRecklessAttack(state),
        state.attackRollMadeThisTurn,
        true,
        true,
      )
    )
      {
        ...state,
        fighter: {
          ...state.fighter,
          activeOngoingFeatureOccurrences: state.fighter.activeOngoingFeatureOccurrences
            .set(FIGHTER_RECKLESS_ATTACK_SOURCE_KEY, ActiveStartOfTurnOngoingFeature),
        },
      }
    else
      state

  pure def goblinAttackAgainstFighterHasAdvantage(state: BattleState): bool =
    battleRuntimeRecklessAttackGrantsIncomingAttackAdvantage(fighterHasRecklessAttack(state))

  pure def applyResistanceSpellReductionToFighter(state: BattleState, damageType: DamageType, damage: int, reductionRoll: int): BattleState = {
    val reducedDamage = damageAfterResistanceSpellReduction(damage, damageType, state.fighter.activeEffects, reductionRoll)
    val updatedEffects = activeEffectsAfterResistanceSpellReduction(state.fighter.activeEffects, damageType)
    {
      ...state,
      fighter: applyDamage({ ...state.fighter, activeEffects: updatedEffects }, reducedDamage, 1, true),
    }
  }

  pure def expendedSlotsAfterInvocation(
    invocation: SpellInvocation,
    expendedSpellSlots: int,
  ): int =
    if (spellInvocationSpendsSpellSlot(invocation))
      expendedSpellSlots + 1
    else
      expendedSpellSlots

  pure def spellInvocationSpendsSpellSlot(invocation: SpellInvocation): bool =
    match invocation {
      | MagicMissile => true
      | RayOfFrost => false
      | AcidSplash => false
      | PoisonSpray => false
      | ChillTouch => false
      | StarryWisp => false
      | FireBolt => false
      | EldritchBlast => false
      | SacredFlame => false
      | InflictWounds => true
      | BurningHands => true
      | Fireball => true
      | ColorSpray => true
      | Entangle => true
      | EnsnaringStrike => true
      | SearingSmite => true
      | FaerieFire => true
      | AnimalFriendship => true
      | CharmPerson => true
      | ProtectionFromEvilAndGood => true
      | IceKnife => true
      | HealingWord => true
      | CureWounds => true
      | MassHealingWord => true
      | Shield => true
      | Counterspell => true
      | FalseLife => true
      | Longstrider => true
      | ShieldOfFaith => true
      | Heroism => true
      | Bane => true
      | Bless => true
      | Guidance => false
      | Thaumaturgy => false
      | DivineFavor => true
      | DivineSmite => true
      | HuntersMark => true
      | Hex => true
      | ShockingGrasp => false
      | GuidingBolt => true
      | RayOfSickness => true
      | ViciousMockery => false
      | ProduceFlame => false
      | DancingLightsSpell => false
      | Light => false
      | TrueStrike => false
      | Grease => true
      | FogCloud => true
      | Command => true
      | DissonantWhispers => true
      | FeatherFall => true
      | HellishRebuke => true
      | SorcerousBurst => false
      | SpareTheDying => false
      | HideousLaughter => true
    }

  pure def canExpendSpellSlotThisTurn(state: BattleState): bool =
    canActorExpendSpellSlotThisTurn(state, currentActor(state))

  pure def canDiscoverSpellActs(canCastSpells: bool, raging: bool): bool =
    canCastSpells and not(battleRuntimeRagePreventsSpellcasting(raging))

  pure def fighterRageDamageBonus(barbarianLevel: int): int =
    battleRuntimeRageDamageBonus(barbarianLevel)

  pure def spellAttackModifier(
    spellcastingAbilityModifier: int,
    proficiencyBonus: int,
  ): int =
    spellcastingAbilityModifier + proficiencyBonus

  pure def innateSorceryAppliesToSpell(
    innateSorceryActive: bool,
    spellSourceClass: SpellSourceClass,
  ): bool =
    innateSorceryActive and spellSourceClass == SorcererSpellSource

  pure def sorcererSpellSaveDcWithInnateSorcery(
    baseDc: int,
    innateSorceryActive: bool,
    spellSourceClass: SpellSourceClass,
  ): int =
    baseDc + (if (innateSorceryAppliesToSpell(innateSorceryActive, spellSourceClass)) 1 else 0)

  pure def sorcererSpellAttackRollModeWithInnateSorcery(
    baseline: SpellAttackRollMode,
    innateSorceryActive: bool,
    spellSourceClass: SpellSourceClass,
  ): SpellAttackRollMode =
    if (innateSorceryAppliesToSpell(innateSorceryActive, spellSourceClass) and baseline == DisadvantageSpellAttackRoll)
      NormalSpellAttackRoll
    else if (innateSorceryAppliesToSpell(innateSorceryActive, spellSourceClass) and baseline == NormalSpellAttackRoll)
      AdvantageSpellAttackRoll
    else
      baseline

  pure def battleRuntimeSpellAttackDamageProfileForInvocation(
    invocation: FixedSpellAttackDamageInvocation
  ): BattleRuntimeSpellAttackDamageProfile =
    match invocation {
      | RayOfFrostFixedSpellAttack => BattleRuntimeRayOfFrostSpellAttack
      | PoisonSprayFixedSpellAttack => BattleRuntimePoisonSpraySpellAttack
      | ChillTouchFixedSpellAttack => BattleRuntimeChillTouchSpellAttack
      | StarryWispFixedSpellAttack => BattleRuntimeStarryWispSpellAttack
      | FireBoltFixedSpellAttack => BattleRuntimeFireBoltSpellAttack
      | ShockingGraspFixedSpellAttack => BattleRuntimeShockingGraspSpellAttack
      | GuidingBoltFixedSpellAttack => BattleRuntimeGuidingBoltSpellAttack
      | RayOfSicknessFixedSpellAttack => BattleRuntimeRayOfSicknessSpellAttack
      | ProduceFlameHurlFixedSpellAttack => BattleRuntimeProduceFlameHurlSpellAttack
    }

  pure def battleRuntimeSaveGatedDamageProfileForInvocation(
    invocation: SaveGatedDamageInvocation
  ): BattleRuntimeSaveGatedDamageProfile =
    match invocation {
      | AcidSplashSaveGate => BattleRuntimeAcidSplashSaveDamage
      | SacredFlameSaveGate => BattleRuntimeSacredFlameSaveDamage
      | InflictWoundsSaveGate => BattleRuntimeInflictWoundsSaveDamage
      | BurningHandsSaveGate => BattleRuntimeBurningHandsSaveDamage
      | FireballSaveGate => BattleRuntimeFireballSaveDamage
      | ViciousMockerySaveGate => BattleRuntimeViciousMockerySaveDamage
      | DissonantWhispersSaveGate => BattleRuntimeDissonantWhispersSaveDamage
      | HellishRebukeSaveGate => BattleRuntimeHellishRebukeSaveDamage
    }

  pure def battleRuntimeSaveGatedConditionProfileForInvocation(
    invocation: SaveGatedConditionInvocation
  ): BattleRuntimeSaveGatedConditionProfile =
    match invocation {
      | ColorSpraySaveGate => BattleRuntimeColorSpraySaveCondition
      | EntangleSaveGate => BattleRuntimeEntangleSaveCondition
      | AnimalFriendshipSaveGate => BattleRuntimeAnimalFriendshipSaveCondition
      | CharmPersonSaveGate => BattleRuntimeCharmPersonSaveCondition
    }

  pure def battleRuntimeScalarBuffProfileForInvocation(invocation: ScalarBuffSpell): BattleRuntimeScalarBuffProfile =
    match invocation {
      | FalseLifeScalarBuff => BattleRuntimeFalseLifeScalarBuff
      | LongstriderScalarBuff => BattleRuntimeLongstriderScalarBuff
      | ShieldOfFaithScalarBuff => BattleRuntimeShieldOfFaithScalarBuff
    }

  pure def battleRuntimeChainedSpellAttackDamageProfileForInvocation(
    invocation: ChainedSpellAttackDamageInvocation
  ): BattleRuntimeChainedSpellAttackDamageProfile =
    match invocation {
      | ChromaticOrbChainedSpellAttack => BattleRuntimeChromaticOrbChainedSpellAttack
    }

  pure def battleRuntimeAttackBurstSaveDamageProfileForInvocation(
    invocation: AttackBurstSaveDamageInvocation
  ): BattleRuntimeAttackBurstSaveDamageProfile =
    match invocation {
      | IceKnifeAttackBurstSaveDamage => BattleRuntimeIceKnifeAttackBurstSaveDamage
    }

  pure def battleRuntimeChainedSpellAttackDamageChoiceForChromaticOrb(choice: ChromaticOrbDamageTypeChoice): BattleRuntimeChainedSpellAttackDamageTypeChoice =
    match choice {
      | ChromaticOrbAcid => BattleRuntimeChainedSpellAttackAcidDamage
      | ChromaticOrbCold => BattleRuntimeChainedSpellAttackColdDamage
      | ChromaticOrbFire => BattleRuntimeChainedSpellAttackFireDamage
      | ChromaticOrbLightning => BattleRuntimeChainedSpellAttackLightningDamage
      | ChromaticOrbPoison => BattleRuntimeChainedSpellAttackPoisonDamage
      | ChromaticOrbThunder => BattleRuntimeChainedSpellAttackThunderDamage
    }

  pure def chromaticOrbDamageTypeChoiceFromBridge(
    choice: BattleRuntimeChainedSpellAttackDamageTypeChoice
  ): ChromaticOrbDamageTypeChoice =
    match choice {
      | BattleRuntimeChainedSpellAttackAcidDamage => ChromaticOrbAcid
      | BattleRuntimeChainedSpellAttackColdDamage => ChromaticOrbCold
      | BattleRuntimeChainedSpellAttackFireDamage => ChromaticOrbFire
      | BattleRuntimeChainedSpellAttackLightningDamage => ChromaticOrbLightning
      | BattleRuntimeChainedSpellAttackPoisonDamage => ChromaticOrbPoison
      | BattleRuntimeChainedSpellAttackThunderDamage => ChromaticOrbThunder
    }

  pure def magicMissileDartCount(slotLevel: int): int =
    3 + (slotLevel - 1)

  pure def magicMissileAllocatedDamage(
    dieTotal: int,
    dartCount: int,
    flatPerDart: int,
  ): int =
    dieTotal + (dartCount * flatPerDart)

  pure def magicMissileTargetDamage(
    target: Combatant,
    dieTotal: int,
    dartCount: int,
    flatPerDart: int,
  ): int =
    if (target.activeEffects.contains(ShieldArmorClassBonus))
      0
    else
      magicMissileAllocatedDamage(dieTotal, dartCount, flatPerDart)

  pure def spellAttackDamageType(invocation: SpellAttackDamageInvocation): DamageType =
    match invocation {
      | RayOfFrostSpellAttack => Cold
      | PoisonSpraySpellAttack => Poison
      | ChillTouchSpellAttack => Necrotic
      | StarryWispSpellAttack => Radiant
      | FireBoltSpellAttack => Fire
      | ShockingGraspSpellAttack => Lightning
      | GuidingBoltSpellAttack => Radiant
      | RayOfSicknessSpellAttack => Poison
      | ProduceFlameHurlSpellAttack => Fire
      | SorcerousBurstSpellAttack(fill) =>
          damageTypeFromRuleDamageType(
            battleRuntimeSorcerousBurstDamageType(fill.damageTypeChoice)
          )
    }

  pure def spellAttackDamageActiveEffectForHitEffect(
    effect: BattleRuntimeSpellAttackDamageHitEffect
  ): ActiveEffect =
    match effect {
      | BattleRuntimeRayOfFrostSpeedReductionHitEffect => RayOfFrostSpeedDelta
      | BattleRuntimeChillTouchHitPointRegainPreventionHitEffect => ChillTouchHitPointRegainPrevented({ source: Fighter, expiresAtRound: 0 })
      | BattleRuntimeStarryWispInvisibleBenefitDeniedHitEffect => StarryWispInvisibleBenefitDenied({ source: Fighter, expiresAtRound: 0 })
      | BattleRuntimeShockingGraspOpportunityAttackDeniedHitEffect => ShockingGraspOpportunityAttackDenied
      | BattleRuntimeGuidingBoltNextAttackAdvantageHitEffect => GuidingBoltNextAttackAdvantage
      | BattleRuntimeRayOfSicknessPoisonedHitEffect => RayOfSicknessPoisoned
    }

  pure def spellAttackDamageActiveEffects(invocation: SpellAttackDamageInvocation): Set[ActiveEffect] =
    match invocation {
      | RayOfFrostSpellAttack => Set(RayOfFrostSpeedDelta)
      | PoisonSpraySpellAttack => Set()
      | ChillTouchSpellAttack => Set(ChillTouchHitPointRegainPrevented({ source: Fighter, expiresAtRound: 0 }))
      | StarryWispSpellAttack => Set(StarryWispInvisibleBenefitDenied({ source: Fighter, expiresAtRound: 0 }))
      | FireBoltSpellAttack => Set()
      | ShockingGraspSpellAttack => Set(ShockingGraspOpportunityAttackDenied)
      | GuidingBoltSpellAttack => Set(GuidingBoltNextAttackAdvantage)
      | RayOfSicknessSpellAttack => Set(RayOfSicknessPoisoned)
      | ProduceFlameHurlSpellAttack => Set()
      | SorcerousBurstSpellAttack(_) => Set()
    }

  pure def spellAttackDamageSupportsObjectTarget(invocation: SpellAttackDamageInvocation): bool =
    match invocation {
      | RayOfFrostSpellAttack => false
      | PoisonSpraySpellAttack => false
      | ChillTouchSpellAttack => true
      | StarryWispSpellAttack => true
      | FireBoltSpellAttack => true
      | ShockingGraspSpellAttack => false
      | GuidingBoltSpellAttack => false
      | RayOfSicknessSpellAttack => false
      | ProduceFlameHurlSpellAttack => true
      | SorcerousBurstSpellAttack(_) => true
    }

  pure def battleRuntimeSpellAttackBeamSequenceProfileForInvocation(
    invocation: SpellAttackBeamSequenceInvocation
  ): BattleRuntimeSpellAttackBeamSequenceProfile =
    match invocation {
      | EldritchBlastBeamSequence => BattleRuntimeEldritchBlastBeamSequence
    }

  pure def spellAttackBeamSequenceDamageType(invocation: SpellAttackBeamSequenceInvocation): DamageType =
    damageTypeFromRuleDamageType(
      battleRuntimeSpellAttackBeamSequenceDamageType(
        battleRuntimeSpellAttackBeamSequenceProfileForInvocation(invocation),
      )
    )

  pure def eldritchBlastBeamCount(characterLevel: int): int =
    battleRuntimeSpellAttackBeamSequenceBeamCount(
      BattleRuntimeEldritchBlastBeamSequence,
      characterLevel,
    )

  pure def spellAttackBeamSequenceReplayHoles(
    invocation: SpellAttackBeamSequenceInvocation,
    canCastSpells: bool,
    beamCount: int,
    beamTargetsFilled: int,
    beamAttackRollsFilled: int,
    beamHits: int,
    beamDamageRollsFilled: int,
  ): Set[Hole] =
    match battleRuntimeSpellAttackBeamSequenceNextStep(
      battleRuntimeSpellAttackBeamSequenceProfileForInvocation(invocation),
      canCastSpells,
      beamCount,
      beamTargetsFilled,
      beamAttackRollsFilled,
      beamHits,
      beamDamageRollsFilled,
    ) {
      | BattleRuntimeBeamSequenceNeedsTargets => Set(TargetChoice, ObjectTargetChoice)
      | BattleRuntimeBeamSequenceNeedsAttackRoll => Set(AttackRoll)
      | BattleRuntimeBeamSequenceNeedsDamageRoll => Set(SpellDamageRoll)
      | _ => Set()
    }

  pure def objectHitPointDamageOutcome(
    object: ObjectTarget,
    damageType: DamageType,
    rolledDamage: int,
    priorHitPoints: int,
    damageThreshold: int,
  ): ObjectDamageOutcome = {
    val result = battleRuntimeObjectHitPointDamageResult(
      ruleDamageType(damageType),
      rolledDamage,
      priorHitPoints,
      damageThreshold,
    )

    ObjectHitPointDamage({
      object: object,
      damageType: damageType,
      rolledDamage: rolledDamage,
      effectiveDamage: result.effectiveDamage,
      priorHitPoints: result.priorHitPoints,
      nextHitPoints: result.nextHitPoints,
      destroyed: result.destroyed,
    })
  }

  pure def spellObjectDamageOutcome(
    invocation: SpellAttackDamageInvocation,
    object: ObjectTarget,
    damageRoll: int,
    disposition: ObjectDamageDisposition,
  ): ObjectDamageOutcome =
    match disposition {
      | ObjectTableResolved =>
          ObjectTableResolvedDamage({
            object: object,
            damageType: spellAttackDamageType(invocation),
            rolledDamage: damageRoll,
          })
      | ObjectHitPoints(fill) =>
          objectHitPointDamageOutcome(
            object,
            spellAttackDamageType(invocation),
            damageRoll,
            fill.hitPoints,
            0,
          )
      | ObjectHitPointsWithDamageThreshold(fill) =>
          objectHitPointDamageOutcome(
            object,
            spellAttackDamageType(invocation),
            damageRoll,
            fill.hitPoints,
            fill.damageThreshold,
          )
    }

  pure def spellAttackDamageSpellInvocation(invocation: SpellAttackDamageInvocation): SpellInvocation =
    match invocation {
      | RayOfFrostSpellAttack => RayOfFrost
      | PoisonSpraySpellAttack => PoisonSpray
      | ChillTouchSpellAttack => ChillTouch
      | StarryWispSpellAttack => StarryWisp
      | FireBoltSpellAttack => FireBolt
      | ShockingGraspSpellAttack => ShockingGrasp
      | GuidingBoltSpellAttack => GuidingBolt
      | RayOfSicknessSpellAttack => RayOfSickness
      | ProduceFlameHurlSpellAttack => ProduceFlame
      | SorcerousBurstSpellAttack(_) => SorcerousBurst
    }

  pure def spellObjectIgnitionOutcomes(
    invocation: SpellAttackDamageInvocation,
    object: ObjectTarget,
    source: Actor,
    disposition: ObjectIgnitionDisposition,
  ): Set[ObjectIgnitionOutcome] =
    if (invocation == FireBoltSpellAttack and disposition == ObjectFlammableUnattended)
      Set(ObjectStartsBurning({
        object: object,
        source: source,
        sourceSpell: spellAttackDamageSpellInvocation(invocation),
      }))
    else
      Set()

  pure def saveGatedAreaObjectIgnitionOutcomes(
    invocation: SaveGatedDamageInvocation,
    object: ObjectTarget,
    source: Actor,
    disposition: ObjectIgnitionDisposition,
  ): Set[ObjectIgnitionOutcome] =
    if (invocation == FireballSaveGate and disposition == ObjectFlammableUnattended)
      Set(ObjectStartsBurning({
        object: object,
        source: source,
        sourceSpell: Fireball,
      }))
    else
      Set()

  pure def spellAttackBeamSequenceObjectDamageOutcome(
    invocation: SpellAttackBeamSequenceInvocation,
    object: ObjectTarget,
    damageRoll: int,
    disposition: ObjectDamageDisposition,
  ): ObjectDamageOutcome =
    match disposition {
      | ObjectTableResolved =>
          ObjectTableResolvedDamage({
            object: object,
            damageType: spellAttackBeamSequenceDamageType(invocation),
            rolledDamage: damageRoll,
          })
      | ObjectHitPoints(fill) =>
          objectHitPointDamageOutcome(
            object,
            spellAttackBeamSequenceDamageType(invocation),
            damageRoll,
            fill.hitPoints,
            0,
          )
      | ObjectHitPointsWithDamageThreshold(fill) =>
          objectHitPointDamageOutcome(
            object,
            spellAttackBeamSequenceDamageType(invocation),
            damageRoll,
            fill.hitPoints,
            fill.damageThreshold,
          )
    }

  pure def spellAttackDamageObjectReplayHoles(
    invocation: SpellAttackDamageInvocation,
    canCastSpells: bool,
    objectTargetFilled: bool,
    attackRollFilled: bool,
    attackHitsObject: bool,
    damageRollFilled: bool,
  ): Set[Hole] =
    if (not(canCastSpells) or not(spellAttackDamageSupportsObjectTarget(invocation)))
      Set()
    else if (not(objectTargetFilled))
      Set(ObjectTargetChoice)
    else if (not(attackRollFilled))
      Set(AttackRoll)
    else if (attackHitsObject and not(damageRollFilled))
      Set(SpellDamageRoll)
    else
      Set()

  pure def chromaticOrbDamageTypeChoice(choice: ChromaticOrbDamageTypeChoice): DamageType =
    damageTypeFromRuleDamageType(
      battleRuntimeChainedSpellAttackDamageType(
        battleRuntimeChainedSpellAttackDamageChoiceForChromaticOrb(choice)
      )
    )

  pure def chainedSpellAttackDamageChoices(invocation: ChainedSpellAttackDamageInvocation): Set[ChromaticOrbDamageTypeChoice] =
    battleRuntimeChainedSpellAttackDamageChoices(
      battleRuntimeChainedSpellAttackDamageProfileForInvocation(invocation)
    ).map(chromaticOrbDamageTypeChoiceFromBridge)

  pure def chainedSpellAttackDamageBaseSpellLevel(invocation: ChainedSpellAttackDamageInvocation): int =
    battleRuntimeChainedSpellAttackDamageBaseSpellLevel(
      battleRuntimeChainedSpellAttackDamageProfileForInvocation(invocation)
    )

  pure def chainedSpellAttackDamageDieSize(invocation: ChainedSpellAttackDamageInvocation): int =
    battleRuntimeChainedSpellAttackDamageDieSize(
      battleRuntimeChainedSpellAttackDamageProfileForInvocation(invocation)
    )

  pure def chainedSpellAttackDamageSlotLevelIsLegal(invocation: ChainedSpellAttackDamageInvocation, slotLevel: int): bool =
    battleRuntimeChainedSpellAttackDamageSlotLevelIsLegal(
      battleRuntimeChainedSpellAttackDamageProfileForInvocation(invocation),
      slotLevel,
    )

  pure def chainedSpellAttackDamageLeapCountIsLegal(
    invocation: ChainedSpellAttackDamageInvocation,
    slotLevel: int,
    leapsUsed: int,
  ): bool =
    battleRuntimeChainedSpellAttackDamageLeapCountIsLegal(
      battleRuntimeChainedSpellAttackDamageProfileForInvocation(invocation),
      slotLevel,
      leapsUsed,
    )

  pure def chainedSpellAttackDamageDice(invocation: ChainedSpellAttackDamageInvocation, slotLevel: int): int =
    battleRuntimeChainedSpellAttackDamageDice(
      battleRuntimeChainedSpellAttackDamageProfileForInvocation(invocation),
      slotLevel,
    )

  pure def chainedSpellAttackDamageRolledD8Count(
    invocation: ChainedSpellAttackDamageInvocation,
    slotLevel: int,
    criticalHit: bool,
  ): int =
    battleRuntimeChainedSpellAttackDamageRolledD8Count(
      battleRuntimeChainedSpellAttackDamageProfileForInvocation(invocation),
      slotLevel,
      criticalHit,
    )

  pure def d8FaceCountTotal(counts: D8FaceCounts): int =
    battleRuntimeD8FaceCountTotal(counts)

  pure def d8FaceCountsAreNonNegative(counts: D8FaceCounts): bool =
    battleRuntimeD8FaceCountsAreNonNegative(counts)

  pure def d8FaceCountsMatchRolledDice(
    invocation: ChainedSpellAttackDamageInvocation,
    slotLevel: int,
    criticalHit: bool,
    counts: D8FaceCounts,
  ): bool =
    battleRuntimeD8FaceCountsMatchRolledDice(
      battleRuntimeChainedSpellAttackDamageProfileForInvocation(invocation),
      slotLevel,
      criticalHit,
      counts,
    )

  pure def damageRollHasDuplicateD8Face(counts: D8FaceCounts): bool =
    battleRuntimeDamageRollHasDuplicateD8Face(counts)

  pure def chainedSpellAttackDamageCanLeap(
    invocation: ChainedSpellAttackDamageInvocation,
    slotLevel: int,
    leapsUsed: int,
    criticalHit: bool,
    counts: D8FaceCounts,
  ): bool =
    battleRuntimeChainedSpellAttackDamageCanLeap(
      battleRuntimeChainedSpellAttackDamageProfileForInvocation(invocation),
      slotLevel,
      leapsUsed,
      criticalHit,
      counts,
    )

  pure def chainedSpellAttackDamageStepDamageType(
    invocation: ChainedSpellAttackDamageInvocation,
    selectedDamageType: ChromaticOrbDamageTypeChoice,
    stepIndex: int,
  ): DamageType =
    chromaticOrbDamageTypeChoice(selectedDamageType)

  pure def chainedSpellAttackDamageTargetedHistoryIsCoherent(
    invocation: ChainedSpellAttackDamageInvocation,
    slotLevel: int,
    targeted: Set[Actor],
    leapsUsed: int,
  ): bool =
    chainedSpellAttackDamageLeapCountIsLegal(invocation, slotLevel, leapsUsed) and
    targeted.size() == leapsUsed + 1

  pure def chainedSpellAttackDamageLeapTargetHistoryIsCoherent(
    invocation: ChainedSpellAttackDamageInvocation,
    slotLevel: int,
    previousTarget: Actor,
    targeted: Set[Actor],
    leapsUsed: int,
  ): bool =
    chainedSpellAttackDamageTargetedHistoryIsCoherent(invocation, slotLevel, targeted, leapsUsed) and
    leapsUsed < slotLevel and
    targeted.contains(previousTarget)

  pure def chainedSpellAttackDamageStepHistoryIsCoherent(
    invocation: ChainedSpellAttackDamageInvocation,
    slotLevel: int,
    stepIndex: int,
    target: Actor,
    targeted: Set[Actor],
    leapsUsed: int,
  ): bool =
    chainedSpellAttackDamageTargetedHistoryIsCoherent(invocation, slotLevel, targeted, leapsUsed) and
    stepIndex == leapsUsed and
    targeted.contains(target)

  pure def chainedSpellAttackDamageReplayHoles(
    invocation: ChainedSpellAttackDamageInvocation,
    canCastSpells: bool,
    replay: ChainedSpellAttackDamageReplay,
  ): Set[ChainedSpellAttackDamageHole] =
    if (not(canCastSpells))
      Set()
    else match replay {
      | ChainedNeedsDamageType => Set(ChainedSpellDamageTypeChoice)
      | ChainedNeedsInitialTarget(fill) =>
          if (
            chainedSpellAttackDamageSlotLevelIsLegal(invocation, fill.slotLevel)
          )
            Set(ChainedStepTargetChoice({ stepIndex: 0 }))
          else
            Set()
      | ChainedNeedsLeapTarget(fill) =>
          if (
            chainedSpellAttackDamageLeapTargetHistoryIsCoherent(
              invocation,
              fill.slotLevel,
              fill.previousTarget,
              fill.targeted,
              fill.leapsUsed,
            )
          )
            Set(ChainedStepTargetChoice({ stepIndex: fill.leapsUsed + 1 }))
          else
            Set()
      | ChainedNeedsAttackRoll(fill) =>
          if (
            chainedSpellAttackDamageStepHistoryIsCoherent(
              invocation,
              fill.slotLevel,
              fill.stepIndex,
              fill.target,
              fill.targeted,
              fill.leapsUsed,
            )
          )
            Set(ChainedStepAttackRoll({ stepIndex: fill.stepIndex }))
          else
            Set()
      | ChainedNeedsDamageRoll(fill) =>
          if (
            chainedSpellAttackDamageStepHistoryIsCoherent(
              invocation,
              fill.slotLevel,
              fill.stepIndex,
              fill.target,
              fill.targeted,
              fill.leapsUsed,
            )
          )
            Set(ChainedStepDamageRoll({ stepIndex: fill.stepIndex }))
          else
            Set()
      | ChainedComplete => Set()
    }

  pure def chainedSpellAttackDamageTargetAllowed(
    invocation: ChainedSpellAttackDamageInvocation,
    replay: ChainedSpellAttackDamageReplay,
    candidate: Actor,
    candidateWithinPreviousTarget30Feet: bool,
  ): bool =
    match replay {
      | ChainedNeedsInitialTarget(fill) => chainedSpellAttackDamageSlotLevelIsLegal(invocation, fill.slotLevel)
      | ChainedNeedsLeapTarget(fill) =>
          candidateWithinPreviousTarget30Feet and
          not(fill.targeted.contains(candidate)) and
          chainedSpellAttackDamageLeapTargetHistoryIsCoherent(
            invocation,
            fill.slotLevel,
            fill.previousTarget,
            fill.targeted,
            fill.leapsUsed,
          )
      | _ => false
    }

  pure def saveGatedDamageFailedSaveActiveEffects(invocation: SaveGatedDamageInvocation): Set[ActiveEffect] =
    match invocation {
      | AcidSplashSaveGate => Set()
      | SacredFlameSaveGate => Set()
      | InflictWoundsSaveGate => Set()
      | BurningHandsSaveGate => Set()
      | FireballSaveGate => Set()
      | DissonantWhispersSaveGate => Set()
      | HellishRebukeSaveGate => Set()
      | ViciousMockerySaveGate => Set(ViciousMockeryNextAttackDisadvantage)
    }

  pure def spellAttackRollModeFromActiveEffects(
    attackerEffects: Set[ActiveEffect],
    targetEffects: Set[ActiveEffect],
    attackerCanSeeTarget: bool,
  ): SpellAttackRollMode =
    if ((attackerEffects.contains(ViciousMockeryNextAttackDisadvantage) or attackerEffects.exists(effect => match effect { | WeaponMasterySapNextAttackDisadvantage(_) => true | _ => false })) and (targetEffects.contains(GuidingBoltNextAttackAdvantage) or (attackerCanSeeTarget and targetEffects.contains(FaerieFireOutline))))
      NormalSpellAttackRoll
    else if (targetEffects.contains(GuidingBoltNextAttackAdvantage) or (attackerCanSeeTarget and targetEffects.contains(FaerieFireOutline)))
      AdvantageSpellAttackRoll
    else if (attackerEffects.contains(ViciousMockeryNextAttackDisadvantage) or attackerEffects.exists(effect => match effect { | WeaponMasterySapNextAttackDisadvantage(_) => true | _ => false }))
      DisadvantageSpellAttackRoll
    else
      NormalSpellAttackRoll

  pure def objectOutlinesGrantAttackRollAdvantage(
    outlines: Set[ObjectOutline],
    objectTarget: ObjectTarget,
    attackerCanSeeObject: bool,
  ): bool =
    attackerCanSeeObject and outlines.exists(outline => match outline {
      | FaerieFireObjectOutline(data) => data.object == objectTarget
    })

  pure def spellObjectAttackRollModeFromActiveEffects(
    attackerEffects: Set[ActiveEffect],
    objectOutlines: Set[ObjectOutline],
    objectTarget: ObjectTarget,
    attackerCanSeeObject: bool,
  ): SpellAttackRollMode =
    if ((attackerEffects.contains(ViciousMockeryNextAttackDisadvantage) or attackerEffects.exists(effect => match effect { | WeaponMasterySapNextAttackDisadvantage(_) => true | _ => false })) and objectOutlinesGrantAttackRollAdvantage(objectOutlines, objectTarget, attackerCanSeeObject))
      NormalSpellAttackRoll
    else if (objectOutlinesGrantAttackRollAdvantage(objectOutlines, objectTarget, attackerCanSeeObject))
      AdvantageSpellAttackRoll
    else if (attackerEffects.contains(ViciousMockeryNextAttackDisadvantage) or attackerEffects.exists(effect => match effect { | WeaponMasterySapNextAttackDisadvantage(_) => true | _ => false }))
      DisadvantageSpellAttackRoll
    else
      NormalSpellAttackRoll

  pure def activeEffectsDenyInvisibleBenefit(effects: Set[ActiveEffect]): bool =
    effects.contains(FaerieFireOutline) or effects.exists(effect => match effect {
      | StarryWispInvisibleBenefitDenied(_) => true
      | _ => false
    })

  pure def objectOutlinesDenyInvisibleBenefit(outlines: Set[ObjectOutline], objectTarget: ObjectTarget): bool =
    outlines.exists(outline => match outline {
      | FaerieFireObjectOutline(data) => data.object == objectTarget
    })

  pure def objectLightEmitterDeniesInvisibleBenefit(emitter: LightEmitter, objectTarget: ObjectTarget): bool =
    match emitter {
      | SpellLightEmitter(_) => false
      | ObjectInvisibleRevealLightEmitter(data) => data.object == objectTarget
    }

  pure def objectInvisibleBenefitDenied(state: BattleState, objectTarget: ObjectTarget): bool =
    objectOutlinesDenyInvisibleBenefit(state.objectOutlines, objectTarget)
    or state.lightEmitters.exists(emitter =>
      objectLightEmitterDeniesInvisibleBenefit(emitter, objectTarget)
    )

  pure def rayOfFrostSpeedEffectActive(
    hit: bool,
    currentActor: Actor,
    caster: Actor,
  ): bool =
    hit and currentActor != caster

  pure def saveGatedTargeting(invocation: SaveGatedDamageInvocation): SaveGatedTargeting =
    saveGatedTargetingFromBridge(
      battleRuntimeSaveGatedDamageTargeting(
        battleRuntimeSaveGatedDamageProfileForInvocation(invocation)
      )
    )

  pure def saveGatedTargetingFromBridge(targeting: BattleRuntimeSaveGatedTargeting): SaveGatedTargeting =
    match targeting {
      | BattleRuntimeSingleSaveTarget => SingleSaveTarget
      | BattleRuntimeAreaSaveTargets => AreaSaveTargets
      | BattleRuntimeTargetListSaveTargets(data) => TargetListSaveTargets(data)
    }

  pure def saveGatedDamageSuccess(invocation: SaveGatedDamageInvocation): SaveGatedDamageSuccess =
    match battleRuntimeSaveGatedDamageSuccess(
      battleRuntimeSaveGatedDamageProfileForInvocation(invocation)
    ) {
      | BattleRuntimeNoDamageOnSaveSuccess => NoDamageOnSaveSuccess
      | BattleRuntimeHalfDamageOnSaveSuccess => HalfDamageOnSaveSuccess
    }

  pure def saveGatedDamageType(invocation: SaveGatedDamageInvocation): DamageType =
    damageTypeFromRuleDamageType(
      battleRuntimeSaveGatedDamageType(
        battleRuntimeSaveGatedDamageProfileForInvocation(invocation)
      )
    )

  pure def saveGatedDamageSpendsLevelOneSlot(invocation: SaveGatedDamageInvocation): bool =
    battleRuntimeSaveGatedDamageRequiresSlot(
      battleRuntimeSaveGatedDamageProfileForInvocation(invocation)
    )

  pure def attackBurstSaveDamageSpendsLevelOneSlot(invocation: AttackBurstSaveDamageInvocation): bool =
    battleRuntimeAttackBurstSaveDamageRequiresSlot(
      battleRuntimeAttackBurstSaveDamageProfileForInvocation(invocation)
    )

  pure def attackBurstSaveDamageAttackType(invocation: AttackBurstSaveDamageInvocation): DamageType =
    damageTypeFromRuleDamageType(
      battleRuntimeAttackBurstSaveDamageAttackType(
        battleRuntimeAttackBurstSaveDamageProfileForInvocation(invocation)
      )
    )

  pure def attackBurstSaveDamageBurstType(invocation: AttackBurstSaveDamageInvocation): DamageType =
    damageTypeFromRuleDamageType(
      battleRuntimeAttackBurstSaveDamageBurstType(
        battleRuntimeAttackBurstSaveDamageProfileForInvocation(invocation)
      )
    )

  pure def attackBurstSaveDamageReplayHoles(
    invocation: AttackBurstSaveDamageInvocation,
    canCastSpells: bool,
    targetFilled: bool,
    attackRollFilled: bool,
    attackHitsTarget: bool,
    attackDamageFilled: bool,
    savingThrowOutcomesFilled: bool,
    anyBurstTargetFailsSavingThrow: bool,
  ): Set[Hole] =
    if (not(canCastSpells))
      Set()
    else if (not(targetFilled))
      Set(TargetChoice)
    else if (not(attackRollFilled))
      Set(AttackRoll)
    else if (attackHitsTarget and not(attackDamageFilled))
      Set(DamageRoll)
    else if (not(savingThrowOutcomesFilled))
      Set(SavingThrowOutcome)
    else if (anyBurstTargetFailsSavingThrow)
      Set(SpellDamageRoll)
    else
      Set()

  pure def saveGatedConditionTargeting(invocation: SaveGatedConditionInvocation): SaveGatedTargeting =
    saveGatedTargetingFromBridge(
      battleRuntimeSaveGatedConditionTargeting(
        battleRuntimeSaveGatedConditionProfileForInvocation(invocation)
      )
    )

  pure def saveGatedConditionSavingThrowAbility(invocation: SaveGatedConditionInvocation): Ability =
    match battleRuntimeSaveGatedConditionSavingThrowAbility(
      battleRuntimeSaveGatedConditionProfileForInvocation(invocation)
    ) {
      | BattleRuntimeStrengthSavingThrow => StrAbility
      | BattleRuntimeDexteritySavingThrow => DexAbility
      | BattleRuntimeConstitutionSavingThrow => ConAbility
      | BattleRuntimeWisdomSavingThrow => WisAbility
    }

  pure def saveGatedTargetMaxTargets(targeting: SaveGatedTargeting, slotLevel: int): int =
    battleRuntimeSaveGatedTargetMaxTargets(saveGatedTargetingToBridge(targeting), slotLevel)

  pure def saveGatedTargetingToBridge(targeting: SaveGatedTargeting): BattleRuntimeSaveGatedTargeting =
    match targeting {
      | SingleSaveTarget => BattleRuntimeSingleSaveTarget
      | AreaSaveTargets => BattleRuntimeAreaSaveTargets
      | TargetListSaveTargets(data) => BattleRuntimeTargetListSaveTargets(data)
    }

  pure def saveGatedConditionFailedSaveActiveEffects(
    invocation: SaveGatedConditionInvocation,
    state: BattleState,
    source: Actor,
  ): Set[ActiveEffect] =
    match invocation {
      | ColorSpraySaveGate => Set(ColorSprayBlinded({
          source: source,
          expiresAtRound: endOfCasterNextTurnExpiresAtRound(state, source),
        }))
      | EntangleSaveGate => Set(EntangleRestrained)
      | AnimalFriendshipSaveGate => Set(AnimalFriendshipCharmed({ source: source, durationTicks: 24 * 60 }))
      | CharmPersonSaveGate => Set(CharmPersonCharmed({ source: source, durationTicks: charmPersonCharmedDurationTicks }))
    }

  pure def activeEffectsWithoutColorSprayFrom(effects: Set[ActiveEffect], source: Actor): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | ColorSprayBlinded(data) => data.source != source
      | _ => true
    })

  pure def charmPersonCharmedDurationTicks: int = 60 * 10

  pure def saveGatedConditionTargetCreatureTypeIsLegal(
    invocation: SaveGatedConditionInvocation,
    targetCreatureType: RuntimeCreatureType,
  ): bool =
    battleRuntimeSaveGatedConditionTargetCreatureTypeIsLegal(
      battleRuntimeSaveGatedConditionProfileForInvocation(invocation),
      targetCreatureType == BeastCreature,
      targetCreatureType == HumanoidCreature,
    )

  pure def saveGatedConditionSavingThrowHasAdvantage(
    invocation: SaveGatedConditionInvocation,
    targetIsHostile: bool,
  ): bool =
    battleRuntimeSaveGatedConditionSavingThrowHasAdvantage(
      battleRuntimeSaveGatedConditionProfileForInvocation(invocation),
      targetIsHostile,
    )

  pure def saveGatedConditionReplayHoles(
    invocation: SaveGatedConditionInvocation,
    canCastSpells: bool,
    targetFilled: bool,
    savingThrowOutcomesFilled: bool,
  ): Set[Hole] =
    if (not(canCastSpells))
      Set()
    else if (saveGatedConditionTargeting(invocation) == SingleSaveTarget and not(targetFilled))
      Set(TargetChoice)
    else if (match saveGatedConditionTargeting(invocation) { | TargetListSaveTargets(_) => true | _ => false } and not(targetFilled))
      Set(SpellTargetList)
    else if (not(savingThrowOutcomesFilled))
      Set(SavingThrowOutcome)
    else
      Set()

  pure def saveGatedAttackRollAdvantageTargeting(invocation: SaveGatedAttackRollAdvantageInvocation): SaveGatedTargeting =
    match invocation {
      | FaerieFireSaveGate => saveGatedTargetingFromBridge(
          battleRuntimeSaveGatedConditionTargeting(BattleRuntimeFaerieFireSaveAttackRollAdvantage)
        )
    }

  pure def saveGatedAttackRollAdvantageFailedSaveActiveEffects(invocation: SaveGatedAttackRollAdvantageInvocation): Set[ActiveEffect] =
    match invocation {
      | FaerieFireSaveGate => Set(FaerieFireOutline)
    }

  pure def saveGatedAttackRollAdvantageReplayHoles(
    invocation: SaveGatedAttackRollAdvantageInvocation,
    canCastSpells: bool,
    savingThrowOutcomesFilled: bool,
  ): Set[Hole] =
    if (not(canCastSpells))
      Set()
    else if (not(savingThrowOutcomesFilled))
      Set(SavingThrowOutcome)
    else
      Set()

  pure def saveGatedDamageReplayHoles(
    invocation: SaveGatedDamageInvocation,
    canCastSpells: bool,
    targetFilled: bool,
    savingThrowOutcomesFilled: bool,
    anyTargetTakesDamage: bool,
  ): Set[Hole] =
    if (not(canCastSpells))
      Set()
    else if (saveGatedTargeting(invocation) == SingleSaveTarget and not(targetFilled))
      Set(TargetChoice)
    else if (not(savingThrowOutcomesFilled))
      Set(SavingThrowOutcome)
    else if (anyTargetTakesDamage)
      Set(DamageRoll)
    else
      Set()

  pure def acidSplashReplayHoles(
    canCastSpells: bool,
    savingThrowOutcomesFilled: bool,
    anyFailedSavingThrow: bool,
  ): Set[Hole] =
    saveGatedDamageReplayHoles(AcidSplashSaveGate, canCastSpells, true, savingThrowOutcomesFilled, anyFailedSavingThrow)

  pure def saveGatedDamageAmount(
    invocation: SaveGatedDamageInvocation,
    damageRoll: int,
    savingThrowSucceeded: bool,
  ): int =
    if (not(savingThrowSucceeded))
      damageRoll
    else if (saveGatedDamageSuccess(invocation) == HalfDamageOnSaveSuccess)
      damageRoll / 2
    else
      0

  pure def saveGatedDamageTarget(
    invocation: SaveGatedDamageInvocation,
    target: Combatant,
    savingThrowSucceeded: bool,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
    damageSource: Actor,
  ): Combatant =
    if (saveGatedDamageAmount(invocation, damageRoll, savingThrowSucceeded) == 0)
      target
    else
      applyDamageFromSource(
        target,
        damageAfterAdjustments(
          saveGatedDamageAmount(invocation, damageRoll, savingThrowSucceeded),
          saveGatedDamageType(invocation),
          Set(),
          Set(),
          Set()
        ),
        1,
        concentrationSaveSucceeded,
        OrdinaryDamage,
        damageSource,
      )

  pure def acidSplashDamageTarget(
    target: Combatant,
    failedSavingThrow: bool,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): Combatant =
    saveGatedDamageTarget(AcidSplashSaveGate, target, not(failedSavingThrow), damageRoll, concentrationSaveSucceeded, Fighter)

  pure def dexHalfSaveDamageAfterReplacement(
    damageRoll: int,
    saveSucceeded: bool,
    replacementApplies: bool,
  ): int =
    if (replacementApplies and saveSucceeded) 0
    else if (replacementApplies or saveSucceeded) damageRoll / 2
    else damageRoll

  pure def resolveAcidSplash(
    state: BattleState,
    fighterFailedSavingThrow: bool,
    goblinFailedSavingThrow: bool,
    damageRoll: int,
    fighterConcentrationSaveSucceeded: bool,
    goblinConcentrationSaveSucceeded: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state))
      state
    else
      {
        ...state,
        fighter: acidSplashDamageTarget(state.fighter, fighterFailedSavingThrow, damageRoll, fighterConcentrationSaveSucceeded),
        goblin: acidSplashDamageTarget(state.goblin, goblinFailedSavingThrow, damageRoll, goblinConcentrationSaveSucceeded),
        actionAvailable: false,
      }

  pure def resolveBurningHands(
    state: BattleState,
    fighterSavingThrowSucceeded: bool,
    goblinSavingThrowSucceeded: bool,
    damageRoll: int,
    fighterConcentrationSaveSucceeded: bool,
    goblinConcentrationSaveSucceeded: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)))
      state
    else
      commitActorSpellSlotUse({
        ...state,
        fighter: saveGatedDamageTarget(BurningHandsSaveGate, state.fighter, fighterSavingThrowSucceeded, damageRoll, fighterConcentrationSaveSucceeded, Fighter),
        goblin: saveGatedDamageTarget(BurningHandsSaveGate, state.goblin, goblinSavingThrowSucceeded, damageRoll, goblinConcentrationSaveSucceeded, Fighter),
        actionAvailable: false,
      }, Fighter)

  pure def resolveBurningHandsEmptyArea(state: BattleState): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)))
      state
    else
      commitActorSpellSlotUse({
        ...state,
        actionAvailable: false,
      }, Fighter)

  pure def resolveFireball(
    state: BattleState,
    fighterSavingThrowSucceeded: bool,
    goblinSavingThrowSucceeded: bool,
    damageRoll: int,
    fighterConcentrationSaveSucceeded: bool,
    goblinConcentrationSaveSucceeded: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)))
      state
    else
      commitActorSpellSlotUse({
        ...state,
        fighter: saveGatedDamageTarget(FireballSaveGate, state.fighter, fighterSavingThrowSucceeded, damageRoll, fighterConcentrationSaveSucceeded, Fighter),
        goblin: saveGatedDamageTarget(FireballSaveGate, state.goblin, goblinSavingThrowSucceeded, damageRoll, goblinConcentrationSaveSucceeded, Fighter),
        actionAvailable: false,
      }, Fighter)

  pure def resolveFireballEmptyArea(state: BattleState): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)))
      state
    else
      commitActorSpellSlotUse({
        ...state,
        actionAvailable: false,
      }, Fighter)

  pure def saveGatedConditionTarget(
    invocation: SaveGatedConditionInvocation,
    state: BattleState,
    target: Combatant,
    savingThrowSucceeded: bool,
    source: Actor,
    sourceCreatureType: RuntimeCreatureType,
  ): Combatant =
    if (savingThrowSucceeded or saveGatedConditionPreventedByCreatureTypeProtection(invocation, sourceCreatureType, target.activeEffects))
      target
    else
      {
        val baseEffects = if (invocation == ColorSpraySaveGate)
          activeEffectsWithoutColorSprayFrom(target.activeEffects, source)
        else
          target.activeEffects
        { ...target, activeEffects: baseEffects.union(saveGatedConditionFailedSaveActiveEffects(invocation, state, source)) }
      }

  pure def actorHasTurnLaterThisRound(state: BattleState, actor: Actor): bool =
    actor != currentActor(state) and state.initiative.stillToAct.length() > 1

  pure def sleepRepeatAtRound(state: BattleState, target: Actor): int =
    if (actorHasTurnLaterThisRound(state, target))
      state.initiative.round
    else
      state.initiative.round + 1

  pure def sleepPendingRepeatSaveEffect(
    state: BattleState,
    target: Actor,
    source: Actor,
    hadIncapacitated: bool,
  ): ActiveEffect =
    SleepPendingRepeatSave({
      source: source,
      repeatAtActor: target,
      repeatAtRound: sleepRepeatAtRound(state, target),
      hadIncapacitated: hadIncapacitated,
    })

  pure def sleepInitialSaveTarget(
    state: BattleState,
    target: Combatant,
    targetActor: Actor,
    savingThrowSucceeded: bool,
    targetDoesNotSleep: bool,
    targetHasExhaustionImmunity: bool,
    source: Actor,
  ): Combatant = {
    val automaticallySucceeded = battleRuntimeSleepSavingThrowAutomaticallySucceeds(
      targetDoesNotSleep,
      targetHasExhaustionImmunity,
    )
    match battleRuntimeSleepInitialSaveLifecycle(savingThrowSucceeded or automaticallySucceeded, target.incapacitated) {
      | BattleRuntimeNoSleepRepeatSaveLifecycle => target
      | BattleRuntimePendingSleepRepeatSaveLifecycle(data) => {
          val slept = {
            ...target,
            incapacitated: true,
            activeEffects: target.activeEffects
              .filter(effect => match effect {
                | SleepPendingRepeatSave(existing) => existing.source != source
                | SleepUnconscious(existing) => existing.source != source
                | _ => true
              })
              .union(Set(sleepPendingRepeatSaveEffect(state, targetActor, source, data.hadIncapacitated))),
          }
          breakConcentrationFromSleepAppliedIncapacitated(slept, targetActor)
        }
      | BattleRuntimeUnconsciousSleepRepeatSaveLifecycle(_) => target
    }
  }

  pure def resolveSleepTargetAdmission(
    state: BattleState,
    goblinSavingThrowSucceeded: bool,
    goblinDoesNotSleep: bool,
    goblinHasExhaustionImmunity: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)))
      state
    else {
      val withoutPrior = breakConcentrationSpellEffects(state, Fighter)
      commitActorSpellSlotUse({
        ...withoutPrior,
        fighter: { ...withoutPrior.fighter, concentrating: true },
        goblin: sleepInitialSaveTarget(
          withoutPrior,
          withoutPrior.goblin,
          Goblin,
          goblinSavingThrowSucceeded,
          goblinDoesNotSleep,
          goblinHasExhaustionImmunity,
          Fighter,
        ),
        actionAvailable: false,
      }, Fighter)
    }

  pure def sleepRepeatSaveDue(effects: Set[ActiveEffect], actor: Actor, round: int): bool =
    effects.exists(effect => match effect {
      | SleepPendingRepeatSave(data) => data.repeatAtActor == actor and data.repeatAtRound == round
      | _ => false
    })

  pure def sleepPendingHadIncapacitated(effects: Set[ActiveEffect], actor: Actor, round: int): bool =
    effects.exists(effect => match effect {
      | SleepPendingRepeatSave(data) => data.repeatAtActor == actor and data.repeatAtRound == round and data.hadIncapacitated
      | _ => false
    })

  pure def activeEffectsWithoutSleepPendingRepeatSave(effects: Set[ActiveEffect], actor: Actor, round: int): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | SleepPendingRepeatSave(data) => not(data.repeatAtActor == actor and data.repeatAtRound == round)
      | _ => true
    })

  pure def sleepRepeatSaveHoles(state: BattleState): Set[Hole] =
    match currentActor(state) {
      | Fighter =>
        if (sleepRepeatSaveDue(state.fighter.activeEffects, Fighter, state.initiative.round))
          Set(SavingThrowOutcome)
        else
          Set()
      | Goblin =>
        if (sleepRepeatSaveDue(state.goblin.activeEffects, Goblin, state.initiative.round))
          Set(SavingThrowOutcome)
        else
          Set()
    }

  pure def sleepRepeatSaveTarget(
    target: Combatant,
    targetActor: Actor,
    round: int,
    savingThrowSucceeded: bool,
  ): Combatant = {
    val activeEffectsWithoutPending = activeEffectsWithoutSleepPendingRepeatSave(target.activeEffects, targetActor, round)
    val hadIncapacitated = sleepPendingHadIncapacitated(target.activeEffects, targetActor, round)
    val lifecycle = battleRuntimeSleepRepeatSaveLifecycleAfterSave(
      BattleRuntimePendingSleepRepeatSaveLifecycle({ hadIncapacitated: hadIncapacitated }),
      savingThrowSucceeded,
      target.unconscious,
    )
    match lifecycle {
      | BattleRuntimeNoSleepRepeatSaveLifecycle =>
          { ...target, incapacitated: hadIncapacitated, activeEffects: activeEffectsWithoutPending }
      | BattleRuntimeUnconsciousSleepRepeatSaveLifecycle(data) => {
          val slept = {
            ...target,
            incapacitated: data.hadIncapacitated,
            unconscious: true,
            prone: true,
            activeEffects: activeEffectsWithoutPending.union(Set(SleepUnconscious({
              source: Fighter,
              hadUnconscious: data.hadUnconscious,
              hadIncapacitated: data.hadIncapacitated,
            }))),
          }
          breakConcentrationFromSleepAppliedIncapacitated(slept, targetActor)
        }
      | BattleRuntimePendingSleepRepeatSaveLifecycle(_) => target
    }
  }

  pure def endTurnWithSleepRepeatSave(state: BattleState, savingThrowSucceeded: bool): BattleState =
    match currentActor(state) {
      | Fighter =>
        if (sleepRepeatSaveDue(state.fighter.activeEffects, Fighter, state.initiative.round))
          endTurn({ ...state, fighter: sleepRepeatSaveTarget(state.fighter, Fighter, state.initiative.round, savingThrowSucceeded) })
        else
          endTurn(state)
      | Goblin =>
        if (sleepRepeatSaveDue(state.goblin.activeEffects, Goblin, state.initiative.round))
          endTurn({ ...state, goblin: sleepRepeatSaveTarget(state.goblin, Goblin, state.initiative.round, savingThrowSucceeded) })
        else
          endTurn(state)
    }

  pure def combatantHasSleepEffect(target: Combatant): bool =
    target.activeEffects.exists(effect => match effect {
      | SleepPendingRepeatSave(_) => true
      | SleepUnconscious(_) => true
      | _ => false
    })

  pure def shakeAwakeFromSleep(state: BattleState, targetActor: Actor, actorWithin5Feet: bool): BattleState =
    if (not(battleRuntimeSleepEffectEndsOnAdjacentShakeAwakeAction) or not(state.actionAvailable) or not(actorWithin5Feet) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated)
      state
    else {
      match targetActor {
        | Fighter =>
          if (combatantHasSleepEffect(state.fighter))
            { ...state, fighter: combatantWithoutSleepEffects(state.fighter), actionAvailable: false }
          else
            state
        | Goblin =>
          if (combatantHasSleepEffect(state.goblin))
            { ...state, goblin: combatantWithoutSleepEffects(state.goblin), actionAvailable: false }
          else
            state
      }
    }

  pure def hideousLaughterMaxTargets(slotLevel: int): int =
    if (slotLevel <= 1) 1 else slotLevel

  pure def hideousLaughterDurationTicks: int = 10

  pure def activeEffectsWithoutHideousLaughter(effects: Set[ActiveEffect], source: Actor, targetActor: Actor): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | HideousLaughterEffect(data) => not(data.source == source and data.target == targetActor)
      | _ => true
    })

  pure def hideousLaughterEffect(source: Actor, targetActor: Actor, target: Combatant): ActiveEffect =
    HideousLaughterEffect({
      source: source,
      target: targetActor,
      hadProne: target.prone,
      hadIncapacitated: target.incapacitated,
      durationTicks: hideousLaughterDurationTicks,
    })

  pure def combatantWithoutHideousLaughter(target: Combatant, source: Actor, targetActor: Actor): Combatant = {
    val hadHideousLaughter = target.activeEffects.exists(effect => match effect {
      | HideousLaughterEffect(data) => data.source == source and data.target == targetActor
      | _ => false
    })
    val hadProne = target.activeEffects.exists(effect => match effect {
      | HideousLaughterEffect(data) => data.source == source and data.target == targetActor and data.hadProne
      | _ => false
    })
    val hadIncapacitated = target.activeEffects.exists(effect => match effect {
      | HideousLaughterEffect(data) => data.source == source and data.target == targetActor and data.hadIncapacitated
      | _ => false
    })
    {
      ...target,
      prone: if (hadHideousLaughter) hadProne else target.prone,
      incapacitated: if (hadHideousLaughter) hadIncapacitated else target.incapacitated,
      activeEffects: activeEffectsWithoutHideousLaughter(target.activeEffects, source, targetActor),
    }
  }

  pure def hideousLaughterTarget(
    target: Combatant,
    targetActor: Actor,
    savingThrowSucceeded: bool,
    source: Actor,
  ): Combatant =
    if (savingThrowSucceeded)
      target
    else {
      val withoutPrior = combatantWithoutHideousLaughter(target, source, targetActor)
      val laughed = {
        ...withoutPrior,
        prone: true,
        incapacitated: true,
        activeEffects: withoutPrior.activeEffects.union(Set(hideousLaughterEffect(source, targetActor, withoutPrior))),
      }
      breakConcentrationFromSleepAppliedIncapacitated(laughed, targetActor)
    }

  pure def resolveHideousLaughter(
    state: BattleState,
    goblinSavingThrowSucceeded: bool,
    slotLevel: int,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)) or hideousLaughterMaxTargets(slotLevel) < 1)
      state
    else {
      val withoutPrior = breakConcentrationSpellEffects(state, Fighter)
      commitActorSpellSlotUse({
        ...withoutPrior,
        fighter: { ...withoutPrior.fighter, concentrating: true },
        goblin: hideousLaughterTarget(withoutPrior.goblin, Goblin, goblinSavingThrowSucceeded, Fighter),
        actionAvailable: false,
      }, Fighter)
    }

  pure def hideousLaughterRepeatSaveDue(effects: Set[ActiveEffect], actor: Actor): bool =
    effects.exists(effect => match effect {
      | HideousLaughterEffect(data) => data.target == actor
      | _ => false
    })

  pure def hideousLaughterRepeatSaveHoles(state: BattleState): Set[Hole] =
    match currentActor(state) {
      | Fighter => if (hideousLaughterRepeatSaveDue(state.fighter.activeEffects, Fighter)) Set(SavingThrowOutcome) else Set()
      | Goblin => if (hideousLaughterRepeatSaveDue(state.goblin.activeEffects, Goblin)) Set(SavingThrowOutcome) else Set()
    }

  pure def endTurnWithHideousLaughterRepeatSave(state: BattleState, savingThrowSucceeded: bool): BattleState =
    match currentActor(state) {
      | Fighter =>
        if (hideousLaughterRepeatSaveDue(state.fighter.activeEffects, Fighter) and savingThrowSucceeded)
          endTurn({ ...state, fighter: combatantWithoutHideousLaughter(state.fighter, Goblin, Fighter) })
        else
          endTurn(state)
      | Goblin =>
        if (hideousLaughterRepeatSaveDue(state.goblin.activeEffects, Goblin) and savingThrowSucceeded)
          endTurn({ ...state, goblin: combatantWithoutHideousLaughter(state.goblin, Fighter, Goblin) })
        else
          endTurn(state)
    }

  pure def hideousLaughterDamageRepeatSaveRollMode(target: Combatant): SavingThrowRollMode =
    if (target.activeEffects.exists(effect => match effect { | HideousLaughterEffect(_) => true | _ => false }))
      AdvantageSavingThrow
    else
      NormalSavingThrow

  pure def combatantAfterHideousLaughterDamageRepeatSave(target: Combatant, source: Actor, targetActor: Actor, damage: int, savingThrowSucceeded: bool): Combatant =
    if (damage > 0 and savingThrowSucceeded)
      combatantWithoutHideousLaughter(target, source, targetActor)
    else
      target

  pure def combatantHasHideousLaughter(target: Combatant): bool =
    target.activeEffects.exists(effect => match effect {
      | HideousLaughterEffect(_) => true
      | _ => false
    })

  pure val greaseDurationTicks = 10
  pure val greaseAreaId = 1
  pure val fogCloudDurationTicks = 600
  pure val fogCloudAreaId = 2
  pure val fogCloudBaseRadiusFeet = 20
  pure val fogCloudRadiusFeetPerSlotAboveFirst = 20

  pure def activeEffectsWithoutGreaseGroundHazard(effects: Set[ActiveEffect], areaId: int): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | GreaseGroundHazard(data) => data.areaId != areaId
      | _ => true
    })

  pure def combatantAfterGreaseSave(target: Combatant, savingThrowSucceeded: bool): Combatant =
    if (savingThrowSucceeded)
      target
    else
      { ...target, prone: true }

  pure def resolveGrease(
    state: BattleState,
    goblinIncludedInArea: bool,
    goblinSavingThrowSucceeded: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)))
      state
    else
      commitActorSpellSlotUse({
        ...state,
        fighter: {
          ...state.fighter,
          activeEffects: activeEffectsWithoutGreaseGroundHazard(state.fighter.activeEffects, greaseAreaId)
            .union(Set(GreaseGroundHazard({ areaId: greaseAreaId, durationTicks: greaseDurationTicks }))),
        },
        goblin: if (goblinIncludedInArea) combatantAfterGreaseSave(state.goblin, goblinSavingThrowSucceeded) else state.goblin,
        actionAvailable: false,
      }, Fighter)

  pure def greaseGroundHazardActive(state: BattleState, areaId: int): bool =
    state.fighter.activeEffects.exists(effect => match effect {
      | GreaseGroundHazard(data) => data.areaId == areaId
      | _ => false
    })

  pure def greaseGroundDifficultTerrainMovementCost(state: BattleState, areaId: int, totalDistanceFeet: int, greaseDistanceFeet: int): int =
    if (greaseGroundHazardActive(state, areaId) and totalDistanceFeet > 0 and greaseDistanceFeet > 0 and greaseDistanceFeet <= totalDistanceFeet)
      totalDistanceFeet + greaseDistanceFeet
    else
      0

  pure def moveFighterThroughGreaseGroundDifficultTerrain(state: BattleState, areaId: int, totalDistanceFeet: int, greaseDistanceFeet: int, provokedByTable: bool): BattleState = {
    val movementCost = greaseGroundDifficultTerrainMovementCost(state, areaId, totalDistanceFeet, greaseDistanceFeet)
    if (movementCost == 0)
      state
    else
      moveFighter(state, movementCost, provokedByTable)
  }

  pure def resolveGreaseGroundHazardSave(
    state: BattleState,
    targetActor: Actor,
    areaId: int,
    savingThrowSucceeded: bool,
  ): BattleState =
    if (not(greaseGroundHazardActive(state, areaId)))
      state
    else {
      match targetActor {
        | Fighter => { ...state, fighter: combatantAfterGreaseSave(state.fighter, savingThrowSucceeded) }
        | Goblin => { ...state, goblin: combatantAfterGreaseSave(state.goblin, savingThrowSucceeded) }
      }
    }

  pure def endTurnWithGreaseGroundHazardSave(
    state: BattleState,
    targetActor: Actor,
    areaId: int,
    savingThrowSucceeded: bool,
  ): BattleState =
    endTurn(resolveGreaseGroundHazardSave(state, targetActor, areaId, savingThrowSucceeded))

  pure def fogCloudRadiusFeet(slotLevel: int): int =
    fogCloudBaseRadiusFeet + ((slotLevel - 1) * fogCloudRadiusFeetPerSlotAboveFirst)

  pure def activeEffectsWithoutFogCloudObscurement(effects: Set[ActiveEffect], areaId: int): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | FogCloudObscurement(data) => data.areaId != areaId
      | _ => true
    })

  pure def resolveFogCloud(
    state: BattleState,
    areaId: int,
    slotLevel: int,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)) or slotLevel < 1)
      state
    else {
      val withoutPrior = breakConcentrationSpellEffects(state, Fighter)
      commitActorSpellSlotUse({
        ...withoutPrior,
        fighter: {
          ...withoutPrior.fighter,
          concentrating: true,
          activeEffects: activeEffectsWithoutFogCloudObscurement(withoutPrior.fighter.activeEffects, areaId)
            .union(Set(FogCloudObscurement({
              areaId: areaId,
              radiusFeet: fogCloudRadiusFeet(slotLevel),
              durationTicks: fogCloudDurationTicks,
            }))),
        },
        actionAvailable: false,
      }, Fighter)
    }

  pure def fogCloudObscurementActive(state: BattleState, areaId: int): bool =
    state.fighter.activeEffects.exists(effect => match effect {
      | FogCloudObscurement(data) => data.areaId == areaId
      | _ => false
    })

  pure def disperseFogCloudByStrongWind(state: BattleState, areaId: int): BattleState =
    if (fogCloudObscurementActive(state, areaId))
      breakConcentrationSpellEffects(state, Fighter)
    else
      state

  pure def commandMaxTargets(slotLevel: int): int =
    slotLevel

  pure def commandPendingEffectFor(state: BattleState, targetActor: Actor, option: CommandOption): ActiveEffect =
    CommandPending({
      source: Fighter,
      option: option,
      expiresAtActor: targetActor,
      expiresAtRound: if (currentActor(state) == targetActor) state.initiative.round + 1 else state.initiative.round,
    })

  pure def activeEffectsWithoutCommandPending(effects: Set[ActiveEffect], source: Actor): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | CommandPending(data) => data.source != source
      | _ => true
    })

  pure def resolveCommand(
    state: BattleState,
    targets: Set[Actor],
    failedTargets: Set[Actor],
    slotLevel: int,
    option: CommandOption,
  ): BattleState =
    if (
      not(state.actionAvailable) or
      currentActor(state) != Fighter or
      state.fighter.unconscious or
      state.fighter.incapacitated or
      fighterHasRage(state) or
      not(canExpendSpellSlotThisTurn(state)) or
      targets.size() < 1 or
      targets.size() > commandMaxTargets(slotLevel) or
      not(failedTargets.forall(target => targets.contains(target)))
    )
      state
    else
      commitActorSpellSlotUse({
        ...state,
        fighter: if (failedTargets.contains(Fighter)) {
          ...state.fighter,
          activeEffects: activeEffectsWithoutCommandPending(state.fighter.activeEffects, Fighter)
            .union(Set(commandPendingEffectFor(state, Fighter, option))),
        } else state.fighter,
        goblin: if (failedTargets.contains(Goblin)) {
          ...state.goblin,
          activeEffects: activeEffectsWithoutCommandPending(state.goblin.activeEffects, Fighter)
            .union(Set(commandPendingEffectFor(state, Goblin, option))),
        } else state.goblin,
        actionAvailable: false,
      }, Fighter)

  pure def commandPendingEffectsForActor(state: BattleState, actor: Actor, option: CommandOption): Set[ActiveEffect] =
    match actor {
      | Fighter => state.fighter.activeEffects
      | Goblin => state.goblin.activeEffects
    }
      .filter(effect => match effect {
        | CommandPending(data) =>
            data.option == option and data.expiresAtActor == actor and data.expiresAtRound == state.initiative.round
        | _ => false
      })

  pure def followCommandGrovel(state: BattleState): BattleState =
    if (commandPendingEffectsForActor(state, currentActor(state), CommandGrovelOption).size() > 0)
      match currentActor(state) {
        | Fighter => endTurn({
            ...state,
            fighter: {
              ...state.fighter,
              prone: true,
              activeEffects: state.fighter.activeEffects.exclude(commandPendingEffectsForActor(state, Fighter, CommandGrovelOption)),
            },
          })
        | Goblin => endTurn({
            ...state,
            goblin: {
              ...state.goblin,
              prone: true,
              activeEffects: state.goblin.activeEffects.exclude(commandPendingEffectsForActor(state, Goblin, CommandGrovelOption)),
            },
          })
      }
    else
      state

  pure def commandDropOutcomeCount(state: BattleState, heldObjectCount: int): int =
    if (
      heldObjectCount >= 0 and
      commandPendingEffectsForActor(state, currentActor(state), CommandDropOption).size() > 0
    )
      heldObjectCount
    else
      0

  pure def followCommandDrop(state: BattleState, heldObjectCount: int): BattleState =
    if (
      heldObjectCount >= 0 and
      commandPendingEffectsForActor(state, currentActor(state), CommandDropOption).size() > 0
    )
      match currentActor(state) {
        | Fighter => endTurn({
            ...state,
            fighter: {
              ...state.fighter,
              activeEffects: state.fighter.activeEffects.exclude(commandPendingEffectsForActor(state, Fighter, CommandDropOption)),
            },
          })
        | Goblin => endTurn({
            ...state,
            goblin: {
              ...state.goblin,
              activeEffects: state.goblin.activeEffects.exclude(commandPendingEffectsForActor(state, Goblin, CommandDropOption)),
            },
          })
      }
    else
      state

  pure def commandApproachFighterHasMovementAvailable(state: BattleState): bool =
    battleRuntimeCanSpendMovement(movementProjectionForFighter(state, WalkSpeedKind), 1)
      or battleRuntimeCanSpendMovement(movementProjectionForFighter(state, ClimbSpeedKind), 1)
      or battleRuntimeCanSpendMovement(movementProjectionForFighter(state, SwimSpeedKind), 1)

  pure def commandApproachGoblinHasMovementAvailable(state: BattleState): bool =
    battleRuntimeCanSpendMovement(movementProjectionForGoblin(state, WalkSpeedKind), 1)
      or battleRuntimeCanSpendMovement(movementProjectionForGoblin(state, ClimbSpeedKind), 1)
      or battleRuntimeCanSpendMovement(movementProjectionForGoblin(state, SwimSpeedKind), 1)

  pure def followCommandApproach(
    state: BattleState,
    speedKind: MovementSpeedKind,
    movementCost: int,
    movedWithinFiveFeetOfCaster: bool,
  ): BattleState =
    if (commandPendingEffectsForActor(state, currentActor(state), CommandApproachOption).size() > 0)
      match currentActor(state) {
        | Fighter => {
            val withoutPending = {
              ...state,
              fighter: {
                ...state.fighter,
                activeEffects: state.fighter.activeEffects.exclude(commandPendingEffectsForActor(state, Fighter, CommandApproachOption)),
              },
            }
            if (not(commandApproachFighterHasMovementAvailable(state)))
              withoutPending
            else if (not(battleRuntimeCanSpendMovement(movementProjectionForFighter(state, speedKind), movementCost)))
              state
            else {
              val moved = stateWithFighterMovementStep(
                withoutPending,
                battleRuntimeSpendMovement(movementProjectionForFighter(state, speedKind), movementCost),
              )
              if (movedWithinFiveFeetOfCaster) endTurn(moved) else moved
            }
          }
        | Goblin => {
            val withoutPending = {
              ...state,
              goblin: {
                ...state.goblin,
                activeEffects: state.goblin.activeEffects.exclude(commandPendingEffectsForActor(state, Goblin, CommandApproachOption)),
              },
            }
            if (not(commandApproachGoblinHasMovementAvailable(state)))
              withoutPending
            else if (not(battleRuntimeCanSpendMovement(movementProjectionForGoblin(state, speedKind), movementCost)))
              state
            else {
              val moved = stateWithGoblinMovementStep(
                withoutPending,
                battleRuntimeSpendMovement(movementProjectionForGoblin(state, speedKind), movementCost),
              )
              if (movedWithinFiveFeetOfCaster) endTurn(moved) else moved
            }
          }
      }
    else
      state

  pure def commandFleeMovementRemaining(state: BattleState, actor: Actor, speedKind: MovementSpeedKind): int =
    match actor {
      | Fighter => battleRuntimeMovementRemaining(movementProjectionForFighter(state, speedKind))
      | Goblin => battleRuntimeMovementRemaining(movementProjectionForGoblin(state, speedKind))
    }

  pure def commandFleeCanSpendMovement(
    state: BattleState,
    actor: Actor,
    speedKind: MovementSpeedKind,
    movementCost: int,
  ): bool =
    match actor {
      | Fighter => battleRuntimeCanSpendMovement(movementProjectionForFighter(state, speedKind), movementCost)
      | Goblin => battleRuntimeCanSpendMovement(movementProjectionForGoblin(state, speedKind), movementCost)
    }

  pure def commandFleeActorHasMovementAvailable(state: BattleState, actor: Actor): bool =
    commandFleeCanSpendMovement(state, actor, WalkSpeedKind, 1)
      or commandFleeCanSpendMovement(state, actor, ClimbSpeedKind, 1)
      or commandFleeCanSpendMovement(state, actor, SwimSpeedKind, 1)

  pure def stateWithoutCommandFleePending(state: BattleState, actor: Actor): BattleState =
    match actor {
      | Fighter => {
          ...state,
          fighter: {
            ...state.fighter,
            activeEffects: state.fighter.activeEffects.exclude(commandPendingEffectsForActor(state, Fighter, CommandFleeOption)),
          },
        }
      | Goblin => {
          ...state,
          goblin: {
            ...state.goblin,
            activeEffects: state.goblin.activeEffects.exclude(commandPendingEffectsForActor(state, Goblin, CommandFleeOption)),
          },
        }
    }

  pure def stateWithCommandFleeMovement(state: BattleState, actor: Actor, speedKind: MovementSpeedKind, movementCost: int): BattleState =
    match actor {
      | Fighter =>
          stateWithFighterMovementStep(
            state,
            battleRuntimeSpendMovement(movementProjectionForFighter(state, speedKind), movementCost),
          )
      | Goblin =>
          stateWithGoblinMovementStep(
            state,
            battleRuntimeSpendMovement(movementProjectionForGoblin(state, speedKind), movementCost),
          )
    }

  pure def followCommandFlee(
    state: BattleState,
    speedKind: MovementSpeedKind,
    movementCost: int,
    provokesOpportunityAttack: bool,
  ): BattleState =
    if (commandPendingEffectsForActor(state, currentActor(state), CommandFleeOption).size() > 0) {
      val actor = currentActor(state)
      val withoutPending = stateWithoutCommandFleePending(state, actor)
      if (not(commandFleeActorHasMovementAvailable(state, actor)))
        endTurn(withoutPending)
      else if (
        movementCost != commandFleeMovementRemaining(state, actor, speedKind)
          or not(commandFleeCanSpendMovement(state, actor, speedKind, movementCost))
      )
        state
      else if (provokesOpportunityAttack)
        openReactionWindow(state, {
          trigger: OpportunityAttack,
          procedure: OpportunityAttackReactionProcedure,
          eligibleReactors: if (actor == Fighter) Set(Goblin) else Set(Fighter),
          offeredReactors: Set(),
          continuation: ResumeCommandFleeMovement({
            speedKind: speedKind,
            movementCost: movementCost,
          }),
        })
      else
        endTurn(stateWithCommandFleeMovement(withoutPending, actor, speedKind, movementCost))
    } else {
      state
    }

  pure def followCommandHalt(state: BattleState): BattleState =
    if (commandPendingEffectsForActor(state, currentActor(state), CommandHaltOption).size() > 0)
      match currentActor(state) {
        | Fighter => {
            ...state,
            actionAvailable: false,
            bonusActionAvailable: false,
            fighter: { ...state.fighter, movementSpent: state.fighter.speed },
          }
        | Goblin => {
            ...state,
            actionAvailable: false,
            bonusActionAvailable: false,
            goblin: { ...state.goblin, movementSpent: state.goblin.speed },
          }
      }
    else
      state

  pure def endCommandHaltTurn(state: BattleState): BattleState =
    match currentActor(state) {
      | Fighter => endTurn({
          ...state,
          fighter: {
            ...state.fighter,
            activeEffects: state.fighter.activeEffects.exclude(commandPendingEffectsForActor(state, Fighter, CommandHaltOption)),
          },
        })
      | Goblin => endTurn({
          ...state,
          goblin: {
            ...state.goblin,
            activeEffects: state.goblin.activeEffects.exclude(commandPendingEffectsForActor(state, Goblin, CommandHaltOption)),
          },
        })
    }

  pure def selectedTargetCount(fighterTargeted: bool, goblinTargeted: bool): int =
    (if (fighterTargeted) 1 else 0) + (if (goblinTargeted) 1 else 0)

  pure def saveGatedConditionTargetCountIsLegal(
    invocation: SaveGatedConditionInvocation,
    slotLevel: int,
    fighterTargeted: bool,
    goblinTargeted: bool,
  ): bool = {
    val count = selectedTargetCount(fighterTargeted, goblinTargeted)
    val targeting = saveGatedConditionTargeting(invocation)
    val minTargets = match targeting {
      | TargetListSaveTargets(data) => data.minTargets
      | _ => 1
    }
    count >= 1 and
      count >= minTargets and
      count <= saveGatedTargetMaxTargets(targeting, slotLevel)
  }

  pure def resolveTargetListSaveGatedCondition(
    state: BattleState,
    invocation: SaveGatedConditionInvocation,
    slotLevel: int,
    fighterTargeted: bool,
    fighterCreatureType: RuntimeCreatureType,
    fighterSavingThrowSucceeded: bool,
    goblinTargeted: bool,
    goblinCreatureType: RuntimeCreatureType,
    goblinSavingThrowSucceeded: bool,
  ): BattleState =
    if (
      not(state.actionAvailable) or
      currentActor(state) != Fighter or
      state.fighter.unconscious or
      state.fighter.incapacitated or
      fighterHasRage(state) or
      not(canExpendSpellSlotThisTurn(state)) or
      not(match saveGatedConditionTargeting(invocation) { | TargetListSaveTargets(_) => true | _ => false }) or
      not(saveGatedConditionTargetCountIsLegal(invocation, slotLevel, fighterTargeted, goblinTargeted)) or
      (fighterTargeted and not(saveGatedConditionTargetCreatureTypeIsLegal(invocation, fighterCreatureType))) or
      (goblinTargeted and not(saveGatedConditionTargetCreatureTypeIsLegal(invocation, goblinCreatureType)))
    )
      state
    else
      commitActorSpellSlotUse({
        ...state,
        fighter: if (fighterTargeted) saveGatedConditionTarget(invocation, state, state.fighter, fighterSavingThrowSucceeded, Fighter, HumanoidCreature) else state.fighter,
        goblin: if (goblinTargeted) saveGatedConditionTarget(invocation, state, state.goblin, goblinSavingThrowSucceeded, Fighter, HumanoidCreature) else state.goblin,
        actionAvailable: false,
      }, Fighter)

  pure def resolveColorSpray(
    state: BattleState,
    fighterSavingThrowSucceeded: bool,
    goblinSavingThrowSucceeded: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)))
      state
    else
      commitActorSpellSlotUse({
        ...state,
        fighter: saveGatedConditionTarget(ColorSpraySaveGate, state, state.fighter, fighterSavingThrowSucceeded, Fighter, HumanoidCreature),
        goblin: saveGatedConditionTarget(ColorSpraySaveGate, state, state.goblin, goblinSavingThrowSucceeded, Fighter, HumanoidCreature),
        actionAvailable: false,
      }, Fighter)

  pure def resolveColorSprayEmptyArea(state: BattleState): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)))
      state
    else
      commitActorSpellSlotUse({
        ...state,
        actionAvailable: false,
      }, Fighter)

  pure def saveGatedAttackRollAdvantageTarget(
    invocation: SaveGatedAttackRollAdvantageInvocation,
    target: Combatant,
    savingThrowSucceeded: bool,
  ): Combatant =
    if (savingThrowSucceeded)
      target
    else
      { ...target, activeEffects: target.activeEffects.union(saveGatedAttackRollAdvantageFailedSaveActiveEffects(invocation)) }

  pure def breakConcentrationSpellEffects(state: BattleState, caster: Actor): BattleState =
    match caster {
      | Fighter =>
        {
          ...state,
          fighter: breakConcentration(state.fighter),
          goblin: combatantWithoutSpellEffectConcentrationEffects(state.goblin),
          objectOutlines: state.objectOutlines.filter(outline => match outline {
            | FaerieFireObjectOutline(data) => data.source != Fighter
          }),
        }
      | Goblin =>
        {
          ...state,
          goblin: breakConcentration(state.goblin),
          fighter: combatantWithoutSpellEffectConcentrationEffects(state.fighter),
          objectOutlines: state.objectOutlines.filter(outline => match outline {
            | FaerieFireObjectOutline(data) => data.source != Goblin
          }),
        }
    }

  pure def resolveFaerieFireWithObjects(
    state: BattleState,
    fighterSavingThrowSucceeded: bool,
    goblinSavingThrowSucceeded: bool,
    objectTargets: Set[ObjectTarget],
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)))
      state
    else {
      val withoutPrior = breakConcentrationSpellEffects(state, Fighter)
      commitActorSpellSlotUse({
        ...withoutPrior,
        fighter: { ...saveGatedAttackRollAdvantageTarget(FaerieFireSaveGate, withoutPrior.fighter, fighterSavingThrowSucceeded), concentrating: true },
        goblin: saveGatedAttackRollAdvantageTarget(FaerieFireSaveGate, withoutPrior.goblin, goblinSavingThrowSucceeded),
        objectOutlines: withoutPrior.objectOutlines.union(
          objectTargets.map(objectTarget => FaerieFireObjectOutline({ source: Fighter, object: objectTarget }))
        ),
        actionAvailable: false,
      }, Fighter)
    }

  pure def resolveFaerieFire(
    state: BattleState,
    fighterSavingThrowSucceeded: bool,
    goblinSavingThrowSucceeded: bool,
  ): BattleState =
    resolveFaerieFireWithObjects(state, fighterSavingThrowSucceeded, goblinSavingThrowSucceeded, Set())

  pure def resolveEntangle(
    state: BattleState,
    fighterIncludedInArea: bool,
    goblinSavingThrowSucceeded: bool,
  ): BattleState =
    if (fighterIncludedInArea or not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)))
      state
    else {
      val withoutPrior = breakConcentrationSpellEffects(state, Fighter)
      commitActorSpellSlotUse({
        ...withoutPrior,
        fighter: { ...withoutPrior.fighter, concentrating: true },
        goblin: saveGatedConditionTarget(EntangleSaveGate, withoutPrior, withoutPrior.goblin, goblinSavingThrowSucceeded, Fighter, HumanoidCreature),
        actionAvailable: false,
      }, Fighter)
    }

  pure def escapeEntangle(state: BattleState, checkSucceeded: bool): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Goblin or not(state.goblin.activeEffects.contains(EntangleRestrained)))
      state
    else
      {
        ...state,
        goblin: if (checkSucceeded) { ...state.goblin, activeEffects: state.goblin.activeEffects.exclude(Set(EntangleRestrained)) } else state.goblin,
        actionAvailable: false,
      }

  pure def resolveSingleTargetSaveGatedDamage(
    state: BattleState,
    invocation: SaveGatedDamageInvocation,
    savingThrowSucceeded: bool,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (
      not(state.actionAvailable) or
      currentActor(state) != Fighter or
      state.fighter.unconscious or
      state.fighter.incapacitated or
      fighterHasRage(state) or
      saveGatedTargeting(invocation) != SingleSaveTarget or
      (saveGatedDamageSpendsLevelOneSlot(invocation) and not(canExpendSpellSlotThisTurn(state)))
    )
      state
    else {
      val damaged = saveGatedDamageTarget(invocation, state.goblin, savingThrowSucceeded, damageRoll, concentrationSaveSucceeded, Fighter)
      val resolved = {
        ...state,
        goblin: damaged,
        actionAvailable: false,
      }
      if (saveGatedDamageSpendsLevelOneSlot(invocation))
        commitActorSpellSlotUse(resolved, Fighter)
      else
        resolved
    }

  pure def resolveSacredFlame(
    state: BattleState,
    savingThrowSucceeded: bool,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    resolveSingleTargetSaveGatedDamage(state, SacredFlameSaveGate, savingThrowSucceeded, damageRoll, concentrationSaveSucceeded)

  pure def resolveInflictWounds(
    state: BattleState,
    savingThrowSucceeded: bool,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    resolveSingleTargetSaveGatedDamage(state, InflictWoundsSaveGate, savingThrowSucceeded, damageRoll, concentrationSaveSucceeded)

  pure def adjustedAttackBurstSaveDamage(
    damage: int,
    damageType: DamageType,
  ): int =
    damageAfterAdjustments(damage, damageType, Set(), Set(), Set())

  pure def applyIceKnifeDamageWithSingleConcentrationCheck(
    target: Combatant,
    attackDamage: int,
    burstDamage: int,
    concentrationSaveSucceeded: bool,
  ): Combatant = {
    val totalDamage = attackDamage + burstDamage
    val afterAttack = applyDamageFromSource(target, attackDamage, 1, true, OrdinaryDamage, Fighter)
    val afterBurst = applyDamageFromSource(afterAttack, burstDamage, 1, true, OrdinaryDamage, Fighter)
    if (target.concentrating and totalDamage > 0 and not(concentrationSaveSucceeded))
      breakConcentration(afterBurst)
    else
      afterBurst
  }

  pure def iceKnifeBurstTarget(
    target: Combatant,
    savingThrowSucceeded: bool,
    burstDamageRoll: int,
    concentrationSaveSucceeded: bool,
  ): Combatant = {
    val burstDamage = adjustedAttackBurstSaveDamage(
      battleRuntimeAttackBurstSaveDamageBurstAmount(burstDamageRoll, savingThrowSucceeded),
      attackBurstSaveDamageBurstType(IceKnifeAttackBurstSaveDamage),
    )
    applyIceKnifeDamageWithSingleConcentrationCheck(target, 0, burstDamage, concentrationSaveSucceeded)
  }

  pure def resolveIceKnife(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    attackDamageRoll: int,
    goblinSavingThrowSucceeded: bool,
    fighterIncludedInBurst: bool,
    fighterSavingThrowSucceeded: bool,
    burstDamageRoll: int,
    goblinConcentrationSaveSucceeded: bool,
    fighterConcentrationSaveSucceeded: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)))
      state
    else {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      val hit = attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), 20)
      if (hit and state.goblin.reactionAvailable and not(state.goblin.activeEffects.contains(ShieldArmorClassBonus))) {
        openReactionWindow(rolled, {
          trigger: AttackHit,
          procedure: ShieldReactionProcedure,
          eligibleReactors: Set(Goblin),
          offeredReactors: Set(),
          continuation: ResumeIceKnife,
        })
      } else {
        val attackDamage =
          if (hit)
            adjustedAttackBurstSaveDamage(
              attackDamageRoll * (if (attackIsCritical(naturalD20, 20)) 2 else 1),
              attackBurstSaveDamageAttackType(IceKnifeAttackBurstSaveDamage),
            )
          else
            0
        val burstDamage =
          if (goblinSavingThrowSucceeded)
            0
          else
            adjustedAttackBurstSaveDamage(burstDamageRoll, attackBurstSaveDamageBurstType(IceKnifeAttackBurstSaveDamage))
        val damagedGoblin = applyIceKnifeDamageWithSingleConcentrationCheck(
          rolled.goblin,
          attackDamage,
          burstDamage,
          goblinConcentrationSaveSucceeded,
        )
        val damagedFighter =
          if (fighterIncludedInBurst)
            iceKnifeBurstTarget(rolled.fighter, fighterSavingThrowSucceeded, burstDamageRoll, fighterConcentrationSaveSucceeded)
          else
            rolled.fighter
        commitActorSpellSlotUse({
          ...rolled,
          fighter: damagedFighter,
          goblin: damagedGoblin,
          actionAvailable: false,
        }, Fighter)
      }
    }

  pure def applyDropToZeroHp(target: Combatant): Combatant = {
    val damageResult = applyResolvedDamageToPositiveHitPoints(combatantVitals(target), target.hp)
    combatantWithHitPointRecoveryResult(
      breakConcentration(target),
      {
        vitals: damageResult.vitals,
        deathSavingThrows:
          deathSavingThrowLifecycleAfterPositiveHitPointDamage(
            combatantDeathSavingThrows(target),
            damageResult,
          ),
        positiveHitPointUnconsciousRecovery: NoPositiveHitPointUnconsciousRecovery,
        hitPointsRegained: 0,
      }
    )
  }

  run test_initial_holes_cover_attack_target = {
    assert(openHoles(initialState).contains(TargetChoice))
  }

  run test_find_familiar_cast_and_recast_keeps_one_owner_record = {
    val cat = castFindFamiliarLifecycle(
      NoFindFamiliar,
      Set(Fighter),
      Fighter,
      Goblin,
      FindFamiliarCat,
      FindFamiliarFey,
      18
    )
    val rat = castFindFamiliarLifecycle(
      cat,
      Set(Fighter),
      Fighter,
      Fighter,
      FindFamiliarRat,
      FindFamiliarCelestial,
      12
    )

    all {
      assert(cat == PresentFindFamiliar({
        owner: Fighter,
        familiar: Goblin,
        form: FindFamiliarCat,
        creatureTypeOverride: FindFamiliarFey,
        initiative: 18,
        placement: FindFamiliarUnoccupiedSpaceWithinSpellRange,
      })),
      assert(findFamiliarCombatants(cat) == Set(Goblin)),
      assert(battleCombatantsWithFindFamiliar(Set(Fighter), cat) == Set(Fighter, Goblin)),
      assert(rat == PresentFindFamiliar({
        owner: Fighter,
        familiar: Goblin,
        form: FindFamiliarRat,
        creatureTypeOverride: FindFamiliarCelestial,
        initiative: 12,
        placement: FindFamiliarUnoccupiedSpaceWithinSpellRange,
      })),
    }
  }

  run test_find_familiar_turn_resources_and_no_attack_gate = {
    val present = castFindFamiliarLifecycle(
      NoFindFamiliar,
      Set(Fighter),
      Fighter,
      Goblin,
      FindFamiliarCat,
      FindFamiliarFey,
      11
    )

    all {
      assert(actorIsPresentFindFamiliar(present, Goblin)),
      assert(not(actorIsPresentFindFamiliar(present, Fighter))),
      assert(findFamiliarNonAttackActionAvailable(present, Goblin, true)),
      assert(not(findFamiliarNonAttackActionAvailable(present, Goblin, false))),
      assert(not(ordinaryAttackActionAvailableForActor(present, Goblin, true))),
      assert(ordinaryAttackActionAvailableForActor(present, Fighter, true)),
      assert(not(opportunityAttackAvailableForActor(present, Goblin, true))),
      assert(opportunityAttackAvailableForActor(present, Fighter, true)),
    }
  }

  run test_find_familiar_cast_rejects_ordinary_combatant_identity = {
    val ownerCollision = castFindFamiliarLifecycle(
      NoFindFamiliar,
      Set(Fighter),
      Fighter,
      Fighter,
      FindFamiliarCat,
      FindFamiliarFey,
      18
    )
    val ordinaryCombatantCollision = castFindFamiliarLifecycle(
      NoFindFamiliar,
      Set(Fighter, Goblin),
      Fighter,
      Goblin,
      FindFamiliarCat,
      FindFamiliarFey,
      18
    )

    all {
      assert(ownerCollision == NoFindFamiliar),
      assert(ordinaryCombatantCollision == NoFindFamiliar),
    }
  }

  run test_find_familiar_dismiss_reappear_and_drop_events = {
    val present = castFindFamiliarLifecycle(
      NoFindFamiliar,
      Set(Fighter),
      Fighter,
      Goblin,
      FindFamiliarBat,
      FindFamiliarFiend,
      16
    )
    val dismissed = temporarilyDismissFindFamiliarLifecycle(present, true, Set(1))
    val blockedReappearance = reappearFindFamiliarLifecycle(
      dismissed.lifecycle,
      Set(Fighter),
      Goblin,
      15,
      false
    )
    val blockedIdentityReappearance = reappearFindFamiliarLifecycle(
      dismissed.lifecycle,
      Set(Fighter, Goblin),
      Goblin,
      15,
      true
    )
    val reappeared = reappearFindFamiliarLifecycle(
      dismissed.lifecycle,
      Set(Fighter),
      Goblin,
      15,
      true
    )
    val forever = permanentlyDismissFindFamiliarLifecycle(reappeared.lifecycle)

    all {
      assert(dismissed.lifecycle == TemporarilyDismissedFindFamiliar({
        owner: Fighter,
        form: FindFamiliarBat,
        creatureTypeOverride: FindFamiliarFiend,
      })),
      assert(dismissed.itemDropBoundaryEvents == Set({
        owner: Fighter,
        familiar: Goblin,
        objectId: 1,
      })),
      assert(dismissed.magicActionSpent),
      assert(blockedReappearance.lifecycle == dismissed.lifecycle),
      assert(not(blockedReappearance.magicActionSpent)),
      assert(blockedIdentityReappearance.lifecycle == dismissed.lifecycle),
      assert(not(blockedIdentityReappearance.magicActionSpent)),
      assert(reappeared.lifecycle == PresentFindFamiliar({
        owner: Fighter,
        familiar: Goblin,
        form: FindFamiliarBat,
        creatureTypeOverride: FindFamiliarFiend,
        initiative: 15,
        placement: FindFamiliarUnoccupiedSpaceWithin30Feet,
      })),
      assert(reappeared.magicActionSpent),
      assert(forever.lifecycle == NoFindFamiliar),
      assert(not(forever.magicActionSpent)),
      assert(forever.itemDropBoundaryEvents == Set()),
    }
  }

  run test_find_familiar_zero_hit_points_disappears_until_recast = {
    val present = castFindFamiliarLifecycle(
      NoFindFamiliar,
      Set(Fighter),
      Fighter,
      Goblin,
      FindFamiliarCat,
      FindFamiliarFey,
      18
    )
    val disappeared = zeroHitPointDisappearFindFamiliarLifecycle(present, Set(3))
    val recast = castFindFamiliarLifecycle(
      disappeared.lifecycle,
      Set(Fighter),
      Fighter,
      Goblin,
      FindFamiliarRat,
      FindFamiliarFey,
      17
    )

    all {
      assert(disappeared.lifecycle == DisappearedAtZeroHitPointsFindFamiliar({
        owner: Fighter,
        form: FindFamiliarCat,
        creatureTypeOverride: FindFamiliarFey,
      })),
      assert(disappeared.itemDropBoundaryEvents == Set({
        owner: Fighter,
        familiar: Goblin,
        objectId: 3,
      })),
      assert(not(disappeared.magicActionSpent)),
      assert(recast == PresentFindFamiliar({
        owner: Fighter,
        familiar: Goblin,
        form: FindFamiliarRat,
        creatureTypeOverride: FindFamiliarFey,
        initiative: 17,
        placement: FindFamiliarUnoccupiedSpaceWithinSpellRange,
      })),
    }
  }

  run test_find_familiar_telepathy_shared_senses_and_touch_delivery = {
    val present = castFindFamiliarLifecycle(
      NoFindFamiliar,
      Set(Fighter),
      Fighter,
      Goblin,
      FindFamiliarBat,
      FindFamiliarFey,
      18
    )
    val connection = findFamiliarTelepathicConnection(present, Fighter, true)
    val outOfRangeConnection = findFamiliarTelepathicConnection(present, Fighter, false)
    val sharedSenses = shareFindFamiliarSenses(present, Fighter, true, true)
    val noBonusActionSharedSenses = shareFindFamiliarSenses(present, Fighter, true, false)
    val delivered = findFamiliarTouchSpellDelivery(present, Fighter, true, true, true)
    val nonTouch = findFamiliarTouchSpellDelivery(present, Fighter, false, true, true)
    val noReaction = findFamiliarTouchSpellDelivery(present, Fighter, true, true, false)

    all {
      assert(connection == Set({
        owner: Fighter,
        familiar: Goblin,
        rangeFeet: 100,
        sharedLanguageRequired: false,
      })),
      assert(outOfRangeConnection == Set()),
      assert(sharedSenses == Set({
        owner: Fighter,
        familiar: Goblin,
        expiresAtStartOfOwnerNextTurn: true,
        gainsSight: true,
        gainsHearing: true,
        gainsSpecialSenses: true,
      })),
      assert(noBonusActionSharedSenses == Set()),
      assert(delivered == { spellCast: true, familiarReactionSpent: true }),
      assert(nonTouch == { spellCast: false, familiarReactionSpent: false }),
      assert(noReaction == { spellCast: false, familiarReactionSpent: false }),
    }
  }

  run test_pact_of_the_chain_familiar_reaction_attack_requires_pact_owner_attack_and_reaction = {
    val present = castFindFamiliarLifecycle(
      NoFindFamiliar,
      Set(Fighter),
      Fighter,
      Goblin,
      FindFamiliarCat,
      FindFamiliarFey,
      11
    )
    val resolved = pactOfTheChainFamiliarReactionAttack(present, Fighter, true, true, true, true)
    val nonPact = pactOfTheChainFamiliarReactionAttack(present, Fighter, false, true, true, true)
    val noOwnerAttack = pactOfTheChainFamiliarReactionAttack(present, Fighter, true, false, true, true)
    val noReaction = pactOfTheChainFamiliarReactionAttack(present, Fighter, true, true, false, true)
    val unsupportedAttack = pactOfTheChainFamiliarReactionAttack(present, Fighter, true, true, true, false)
    val wrongOwner = pactOfTheChainFamiliarReactionAttack(present, Goblin, true, true, true, true)

    all {
      assert(resolved == PactFamiliarReactionAttackResolved),
      assert(nonPact == PactFamiliarReactionAttackRejected),
      assert(noOwnerAttack == PactFamiliarReactionAttackRejected),
      assert(noReaction == PactFamiliarReactionAttackRejected),
      assert(unsupportedAttack == PactFamiliarReactionAttackRejected),
      assert(wrongOwner == PactFamiliarReactionAttackRejected),
    }
  }

  run test_hide_records_discovery_dc = {
    val canHide = { ...initialState, fighterHidePrerequisite: true }
    all {
      assert(hideHoles(initialState) == Set()),
      assert(hideHoles(canHide) == Set(AbilityCheck)),
      assert(hideFighter(initialState, 20).fighter.hidden == NotHidden),
      assert(fighterIsHidden(hideFighter(canHide, 15))),
      assert(hideFighter(canHide, 14).fighter.hidden == NotHidden),
    }
  }

  run test_search_finds_hidden_fighter = {
    val hidden = endTurn(hideFighter({ ...initialState, fighterHidePrerequisite: true }, 18))
    all {
      assert(searchGoblinForFighter(hidden, 17).fighter.hidden == HiddenByDc(HiddenDc18)),
      assert(searchGoblinForFighter(hidden, 18).fighter.hidden == NotHidden),
    }
  }

  run test_attack_reveals_hidden_fighter = {
    val hidden = hideFighter({ ...initialState, fighterHidePrerequisite: true }, 18)
    assert(resolveAttack({ ...hidden, actionAvailable: true }, 1, 1, fighterWeaponAttackDamageRoll(4), true).fighter.hidden == NotHidden)
  }

  run test_attack_replay_asks_for_attack_roll_after_target = {
    assert(attackReplayHoles(initialState, AttackNeedsAttackRoll) == Set(AttackRoll))
  }

  run test_attack_replay_asks_for_damage_roll_after_hit = {
    assert(attackReplayHoles(initialState, AttackRollFilled({ attackTotal: 15, naturalD20: 10 })) == Set(DamageRoll))
  }

  run test_goblin_turn_opens_stat_block_attack_target_hole = {
    assert(openHoles(endTurn(initialState)).contains(TargetChoice))
  }

  run test_goblin_turn_opens_stat_block_recharge_hole_before_attack = {
    val spentRecharge = { ...initialState, goblinRechargeAvailable: false }
    assert(openHoles(endTurn(spentRecharge)) == Set(StatBlockRechargeRoll))
  }

  run test_goblin_recharge_roll_restores_available_part_on_success = {
    val spentRecharge = { ...initialState, goblinRechargeAvailable: false }
    val failed = endTurnWithGoblinRechargeRoll(spentRecharge, 4)
    val succeeded = endTurnWithGoblinRechargeRoll(spentRecharge, 5)
    all {
      assert(not(failed.goblinRechargeAvailable)),
      assert(succeeded.goblinRechargeAvailable),
    }
  }

  run test_legendary_action_window_excludes_initial_and_own_turn = {
    val goblinTurn = endTurn(initialState)
    all {
      assert(not(goblinCanUseLegendaryAction(initialState))),
      assert(not(goblinCanUseLegendaryAction(goblinTurn))),
    }
  }

  run test_legendary_action_window_after_another_non_current_turn = {
    val afterFighterTurnWithThirdActor = endTurn({
      ...initialState,
      initiative: { round: 1, alreadyActed: [], stillToAct: [Fighter, Fighter, Goblin] },
    })
    val spent = useGoblinLegendaryAction(afterFighterTurnWithThirdActor)
    all {
      assert(goblinCanUseLegendaryAction(afterFighterTurnWithThirdActor)),
      assert(spent.goblinLegendaryUsesRemaining == 1),
      assert(not(goblinCanUseLegendaryAction(spent))),
    }
  }

  run test_caller_ordered_initiative_tie_selects_first_supplied_actor = {
    all {
      assert(currentActor(callerOrderedTieInitialState) == Goblin),
      assert(
        endTurn(endTurn(callerOrderedTieInitialState)).initiative.stillToAct == [Goblin, Fighter]
      ),
    }
  }

  run test_goblin_attack_replay_uses_fighter_armor_class = {
    assert(attackReplayHoles(endTurn(initialState), AttackRollFilled({ attackTotal: 19, naturalD20: 10 })) == Set(DamageRoll))
  }

  run test_stat_block_multiattack_spends_one_attack_action_and_grants_dispatches = {
    val goblinTurn = endTurn(initialState)
    val multiattack = resolveGoblinMultiattack(goblinTurn)
    val recursive = resolveGoblinMultiattack(multiattack)
    val firstDispatch = resolveGoblinMultiattackDispatch(multiattack, 1, 1, 0, true)
    val secondDispatch = resolveGoblinMultiattackDispatch(firstDispatch, 1, 1, 0, true)
    val ended = endTurn(multiattack)
    all {
      assert(not(multiattack.actionAvailable)),
      assert(multiattack.goblinMultiattackDispatchesRemaining == 2),
      assert(goblinMultiattackDispatchContinuationOpen(multiattack)),
      assert(recursive.goblinMultiattackDispatchesRemaining == 2),
      assert(firstDispatch.goblinMultiattackDispatchesRemaining == 1),
      assert(secondDispatch.goblinMultiattackDispatchesRemaining == 0),
      assert(not(goblinMultiattackDispatchContinuationOpen(secondDispatch))),
      assert(ended.goblinMultiattackDispatchesRemaining == 0),
    }
  }

  run test_class_feature_extra_attack_spends_one_action_and_grants_one_slot = {
    val first = resolveAttack(withFighterExtraAttack(initialState), 1, 1, fighterWeaponAttackDamageRoll(0), true)
    val second = resolveAttack(first, 1, 1, fighterWeaponAttackDamageRoll(0), true)
    val third = resolveAttack(second, 1, 1, fighterWeaponAttackDamageRoll(0), true)
    all {
      assert(not(first.actionAvailable)),
      assert(first.fighterExtraAttackSlotsRemaining == 1),
      assert(second.fighterExtraAttackSlotsRemaining == 0),
      assert(third == second),
    }
  }

  run test_class_feature_extra_attack_allows_movement_between_slots = {
    val first = resolveAttack(withFighterExtraAttack(initialState), 1, 1, fighterWeaponAttackDamageRoll(0), true)
    val moved = moveFighter(first, 5, false)
    val second = resolveAttack(moved, 1, 1, fighterWeaponAttackDamageRoll(0), true)
    all {
      assert(moved.fighterExtraAttackSlotsRemaining == 1),
      assert(moved.fighter.movementSpent == 5),
      assert(second.fighterExtraAttackSlotsRemaining == 0),
    }
  }

  run test_class_feature_extra_attack_end_turn_closes_unspent_slot = {
    val first = resolveAttack(withFighterExtraAttack(initialState), 1, 1, fighterWeaponAttackDamageRoll(0), true)
    val ended = endTurn(first)
    all {
      assert(first.fighterExtraAttackSlotsRemaining == 1),
      assert(ended.fighterExtraAttackSlotsRemaining == 0),
    }
  }

  run test_attack_miss_spends_action_without_damage = {
    val result = resolveAttack(initialState, 14, 9, fighterWeaponAttackDamageRoll(0), true)
    all {
      assert(result.actionAvailable == false),
      assert(result.goblin.hp == 10),
      assert(result.goblin.tempHp == 0),
    }
  }

  run test_attack_hit_applies_damage_and_spends_action = {
    val result = resolveAttack(initialState, 15, 10, fighterWeaponAttackDamageRoll(4), true)
    all {
      assert(result.actionAvailable == false),
      assert(result.goblin.hp == 3),
    }
  }

  run test_sneak_attack_optional_rider_applies_once_per_turn = {
    val result = resolveAttackWithOptionalSneakAttack(withFighterSneakAttack(initialState), 15, 10, 4, 6, true, true, false, false, true)
    all {
      assert(result.actionAvailable == false),
      assert(result.goblin.hp == 0),
      assert(result.fighterSneakAttackUsedThisTurn),
    }
  }

  run test_sneak_attack_adjacent_ally_branch_requires_no_disadvantage = {
    val eligible = resolveAttackWithOptionalSneakAttack(withFighterSneakAttack(initialState), 15, 10, 4, 6, true, false, true, false, true)
    val disadvantaged = resolveAttackWithOptionalSneakAttack(withFighterSneakAttack(initialState), 15, 10, 4, 6, true, false, true, true, true)
    all {
      assert(eligible.goblin.hp == 0),
      assert(eligible.fighterSneakAttackUsedThisTurn),
      assert(disadvantaged.goblin.hp == 3),
      assert(not(disadvantaged.fighterSneakAttackUsedThisTurn)),
    }
  }

  run test_sneak_attack_critical_uses_doubled_rider_dice_total = {
    val result = resolveAttackWithOptionalSneakAttack(withFighterSneakAttack(initialState), 20, 20, 2, 9, true, true, false, false, true)
    all {
      assert(result.goblin.hp == 0),
      assert(result.fighterSneakAttackUsedThisTurn),
    }
  }

  run test_sneak_attack_usage_resets_on_next_turn = {
    val used = resolveAttackWithOptionalSneakAttack(withFighterSneakAttack(initialState), 15, 10, 4, 6, true, true, false, false, true)
    assert(not(endTurn(used).fighterSneakAttackUsedThisTurn))
  }

  run test_reaction_roll_or_damage_reductions = {
    all {
      assert(not(attackHits(cuttingWordsAttackRollTotal(12, 3), 10, 10, 20))),
      assert(not(abilityCheckSucceeds(cuttingWordsAbilityCheckTotal(15, 3), 14))),
      assert(uncannyDodgeDamage(9) == 4),
      assert(deflectAttacksDamage(8, 2, 3, 3) == 0),
    }
  }

  run test_deflect_attacks_zero_damage_redirect = {
    val reduced = deflectAttacksDamage(8, 5, 0, 3)
    val meleeTarget = deflectAttacksRedirectTargetEligible(true, true, true, false, true)
    val rangedBehindTotalCover = deflectAttacksRedirectTargetEligible(true, false, false, true, true)
    all {
      assert(reduced == 0),
      assert(meleeTarget),
      assert(not(rangedBehindTotalCover)),
      assert(deflectAttacksRedirectDamage(reduced, 3, meleeTarget, false, 5, 5, 0) == 10),
      assert(deflectAttacksRedirectFocusRemaining(reduced, 3, meleeTarget) == 2),
      assert(deflectAttacksRedirectDamage(1, 3, meleeTarget, false, 5, 5, 0) == 0),
    }
  }

  run test_off_hand_attack_host_accepts_damage_reduction = {
    val afterAttack = { ...initialState, lightWeaponAttackMade: true }
    val result = offHandAttackFighterWithDamageReduction(afterAttack, 15, 10, 6, 3)
    all {
      assert(result.bonusActionAvailable == false),
      assert(result.goblin.hp == 7),
    }
  }

  run test_off_hand_light_property_damage_omits_positive_modifier_and_keeps_negative = {
    val afterAttack = { ...initialState, lightWeaponAttackMade: true }
    val positive = offHandAttackFighterWithAbilityModifier(afterAttack, 15, 10, 4, 3)
    val negative = offHandAttackFighterWithAbilityModifier(afterAttack, 15, 10, 4, -1)
    all {
      assert(positive.goblin.hp == 6),
      assert(negative.goblin.hp == 7),
      assert(not(negative.bonusActionAvailable)),
    }
  }

  run test_opportunity_attack_host_accepts_hit_damage_reduction = {
    val result = resolveGoblinOpportunityAttackWithUncannyDodge(initialState, 20, 18, 6, true)
    all {
      assert(result.fighter.hp == 8),
      assert(result.fighter.movementSpent == 0),
    }
  }

  run test_attack_damage_concentration_interrupt_resolves_before_damage = {
    val concentratingGoblin = { ...initialState, goblin: { ...initialState.goblin, concentrating: true, activeEffects: Set(GuidanceAbilityCheckBonus) } }
    val pending = resumeReactionContinuation(concentratingGoblin, ResumeAttack({ damage: 4 }))
    val resolved = resolveAttackDamageConcentration(pending, false)
    all {
      assert(pending.interruptStack.length() == 1),
      assert(pendingReactionFrame(pending.interruptStack[0]) == NoPendingReactionFrame),
      assert(pending.goblin.hp == 10),
      assert(resolved.interruptStack == []),
      assert(resolved.goblin.hp == 6),
      assert(not(resolved.goblin.concentrating)),
    }
  }

  run test_zero_damage_reaction_attack_continuation_does_not_open_concentration_interrupt = {
    val concentratingGoblin = { ...initialState, goblin: { ...initialState.goblin, concentrating: true, activeEffects: Set(GuidanceAbilityCheckBonus) } }
    val resolved = resumeReactionContinuation(concentratingGoblin, ResumeAttack({ damage: 0 }))
    all {
      assert(resolved.interruptStack == []),
      assert(resolved.goblin.hp == 10),
      assert(resolved.goblin.concentrating),
    }
  }

  run test_goblin_attack_hit_applies_stat_block_damage_to_fighter = {
    val result = resolveGoblinAttack(endTurn(initialState), 20, 18, 5, true)
    all {
      assert(result.actionAvailable == false),
      assert(result.fighter.hp == 5),
    }
  }

  run test_skeleton_damage_adjustments_apply_vulnerability_and_immunity = {
    all {
      assert(
        damageAfterAdjustments(5, Bludgeoning, Set(), Set(Bludgeoning), Set(Poison)) == 10
      ),
      assert(damageAfterAdjustments(5, Poison, Set(), Set(Bludgeoning), Set(Poison)) == 0),
    }
  }

  run test_same_type_damage_adjustments_apply_resistance_after_combining_parts = {
    assert(
      sameTypeDamageAfterAdjustments([3, 1], Slashing, Set(Slashing), Set(), Set()) == 2
    )
  }

  run test_resistance_spell_reduces_matching_damage_once_per_turn = {
    val protected = { ...initialState, fighter: { ...initialState.fighter, activeEffects: Set(ResistanceDamageReduction({ damageType: Slashing, usedThisTurn: false })) } }
    val reduced = applyResistanceSpellReductionToFighter(protected, Slashing, 4, 3)
    val second = applyResistanceSpellReductionToFighter(reduced, Slashing, 4, 3)
    all {
      assert(reduced.fighter.hp == 11),
      assert(reduced.fighter.activeEffects.contains(ResistanceDamageReduction({ damageType: Slashing, usedThisTurn: true }))),
      assert(second.fighter.hp == 7),
    }
  }

  run test_resistance_spell_ignores_nonmatching_damage_and_resets_next_turn = {
    val protected = { ...initialState, fighter: { ...initialState.fighter, activeEffects: Set(ResistanceDamageReduction({ damageType: Piercing, usedThisTurn: true })) } }
    val nonmatching = applyResistanceSpellReductionToFighter(protected, Slashing, 4, 3)
    val reset = endTurn(endTurn(nonmatching))
    all {
      assert(nonmatching.fighter.hp == 8),
      assert(reset.fighter.activeEffects.contains(ResistanceDamageReduction({ damageType: Piercing, usedThisTurn: false }))),
    }
  }

  run test_action_surge_grants_one_extra_action_and_spends_use = {
    val result = grantActionSurge({ ...initialState, actionAvailable: false }, 1, false)
    all {
      assert(result.state.actionAvailable),
      assert(result.usesRemaining == 0),
      assert(result.usedThisTurn),
      assert(grantActionSurge(result.state, result.usesRemaining, result.usedThisTurn) == result),
    }
  }

  run test_second_wind_spends_bonus_action_use_and_heals = {
    val wounded = { ...initialState, fighter: { ...initialState.fighter, hp: 4 } }
    val result = resolveSecondWind(wounded, 2, 6, 2)
    all {
      assert(result.state.fighter.hp == 12),
      assert(not(result.state.bonusActionAvailable)),
      assert(result.usesRemaining == 1),
    }
  }

  run test_rage_ongoing_feature_spends_bonus_action_applies_damage_and_resistance = {
    val raging = startRage(initialState, 2)
    val hit = resolveAttack({ ...raging.state, actionAvailable: true }, 15, 10, fighterWeaponAttackDamageRoll(4), true)
    val levelNineHit = resolveAttackAtBarbarianLevel({ ...raging.state, actionAvailable: true }, 15, 10, fighterWeaponAttackDamageRoll(4), true, 9)
    val goblinTurn = endTurn(raging.state)
    val resisted = resolveGoblinAttack(goblinTurn, 15, 10, 4, true)
    all {
      assert(raging.usesRemaining == 1),
      assert(not(raging.state.bonusActionAvailable)),
      assert(fighterHasRage(raging.state)),
      assert(hit.goblin.hp == 1),
      assert(levelNineHit.goblin.hp == 0),
      assert(resisted.fighter.hp == 9),
    }
  }

  run test_rage_heavy_armor_and_incapacitated_end = {
    val armored = { ...initialState, fighter: { ...initialState.fighter, wearingHeavyArmor: true } }
    val cannotStart = startRage(armored, 2)
    val raging = startRage(initialState, 2).state
    val incapacitated = { ...raging, fighter: { ...raging.fighter, incapacitated: true } }
    all {
      assert(not(fighterHasRage(cannotStart.state))),
      assert(not(fighterHasRage(endTurn(incapacitated)))),
    }
  }

  run test_rage_bonus_action_extension_preserves_uses = {
    val raging = startRage(initialState, 2)
    val nextFighterTurn = endTurn(endTurn(raging.state))
    val extended = extendRageWithBonusAction(nextFighterTurn, raging.usesRemaining)
    all {
      assert(fighterHasRage(extended.state)),
      assert(not(extended.state.bonusActionAvailable)),
      assert(extended.usesRemaining == 1),
    }
  }

  run test_persistent_rage_survives_incapacitated_but_not_unconscious = {
    val raging = startPersistentRage(initialState, 2).state
    val incapacitated = { ...raging, fighter: { ...raging.fighter, incapacitated: true } }
    val unconscious = { ...raging, fighter: { ...raging.fighter, unconscious: true } }
    all {
      assert(fighterHasRage(endTurn(incapacitated))),
      assert(not(fighterHasRage(endTurn(unconscious)))),
    }
  }

  run test_rage_extends_when_grapple_forces_enemy_save = {
    val raging = startRage(initialState, 2).state
    val nextFighterTurn = endTurn(endTurn(raging))
    val grappled = grappleFighterGoblin(nextFighterTurn, 12)
    val extendedToNextTurn = match fighterRageOccurrence(grappled) {
      | ActiveRoundExtendedOngoingFeature(data) =>
          data.expiresAtEndOfFighterTurnRound == nextFighterTurn.initiative.round + 1
      | _ => false
    }
    all {
      assert(fighterHasRage(grappled)),
      assert(extendedToNextTurn),
    }
  }

  run test_rage_breaks_concentration_and_blocks_spells = {
    val concentrating = { ...initialState, fighter: { ...initialState.fighter, concentrating: true, activeEffects: Set(GuidanceAbilityCheckBonus) } }
    val raging = startRage(concentrating, 2).state
    all {
      assert(not(raging.fighter.concentrating)),
      assert(not(canDiscoverSpellActs(true, fighterHasRage(raging)))),
      assert(resolveRayOfFrost(raging, 15, 10, 4, true) == raging),
    }
  }

  run test_rage_breaks_readied_spell_hold = {
    val readied = readySpell(initialState)
    val raging = startRage(readied, 2).state
    all {
      assert(not(raging.fighter.concentrating)),
      assert(not(raging.fighterReadiedSpellHeld)),
      assert(releaseReadiedSpell(raging) == raging),
    }
  }

  run test_spell_attack_roll_counts_for_first_attack_roll = {
    val afterSpellAttack = resolveRayOfFrost(initialState, 1, 1, 4, true)
    val recklessAfterSpell = activateRecklessAttackOnFirstAttackRoll(afterSpellAttack)
    all {
      assert(afterSpellAttack.attackRollMadeThisTurn),
      assert(not(fighterHasRecklessAttack(recklessAfterSpell))),
    }
  }

  run test_shield_reaction_spell_interrupts_spell_attack_hit = {
    val awaiting = resolveRayOfFrost(initialState, 15, 10, 4, true)
    val resolved = resolveReaction(awaiting, Goblin)
    all {
      assert(pendingReactionFrame(awaiting.interruptStack[0]) == HasPendingReactionFrame({
        trigger: AttackHit,
        procedure: ShieldReactionProcedure,
        eligibleReactors: Set(Goblin),
        offeredReactors: Set(),
        continuation: ResumeRayOfFrost,
      })),
      assert(resolved.goblin.activeEffects.contains(ShieldArmorClassBonus)),
      assert(not(resolved.goblin.reactionAvailable)),
      assert(resolved.goblin.hp == 10),
      assert(not(resolved.actionAvailable)),
    }
  }

  run test_shield_reaction_spell_negates_magic_missile_damage_to_target = {
    val shielded = applyShieldReactionSpell(initialState, Fighter)
    all {
      assert(magicMissileTargetDamage(initialState.fighter, 3, 3, 1) == 6),
      assert(magicMissileTargetDamage(shielded.fighter, 3, 3, 1) == 0),
      assert(expendedSlotsAfterInvocation(Shield, 0) == 1),
    }
  }

  run test_shield_reaction_spell_spends_turn_spell_slot = {
    val awaiting = openReactionWindow(initialState, {
      trigger: SpellCast,
      procedure: ShieldReactionProcedure,
      eligibleReactors: Set(Fighter),
      offeredReactors: Set(),
      continuation: ResumeRayOfFrost,
    })
    val resolved = resolveReaction(awaiting, Fighter)
    all {
      assert(resolved.fighter.activeEffects.contains(ShieldArmorClassBonus)),
      assert(not(resolved.fighter.reactionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Fighter)),
    }
  }

  run test_shield_reaction_spell_rejects_second_slot_spell_in_same_turn = {
    val awaiting = openReactionWindow({ ...initialState, spellSlotUsesThisTurn: Set(BattleCommittedSpellSlotUse(Fighter)) }, {
      trigger: SpellCast,
      procedure: ShieldReactionProcedure,
      eligibleReactors: Set(Fighter),
      offeredReactors: Set(),
      continuation: ResumeRayOfFrost,
    })
    assert(resolveReaction(awaiting, Fighter) == awaiting)
  }

  run test_counterspell_reaction_spell_ends_spell_cast_window_and_wastes_casting_action = {
    val awaiting = openReactionWindow(initialState, {
      trigger: SpellCast,
      procedure: CounterspellReactionProcedure({
        triggeringCaster: Fighter,
        triggeringCastingResource: CounterspellMagicAction,
        triggeringSpellLevel: 1,
        triggeringSpellUsesSlot: true,
        counterspellSlotLevel: 3,
        triggeringCasterConSaveSucceeded: true,
        counterspellSpellCastReaction: CounterspellSpellCastNotCountered,
      }),
      eligibleReactors: Set(Goblin),
      offeredReactors: Set(),
      continuation: ResumeRayOfFrost,
    })
    val resolved = resolveReaction(awaiting, Goblin)
    all {
      assert(resolved.interruptStack == []),
      assert(not(resolved.goblin.reactionAvailable)),
      assert(not(battleActorHasSpellSlotUse(resolved, Fighter))),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Goblin)),
      assert(not(resolved.actionAvailable)),
      assert(resolved.goblin.hp == 10),
    }
  }

  run test_counterspell_reaction_spell_failed_save_gate_resumes_triggering_spell = {
    val awaiting = openReactionWindow(initialState, {
      trigger: SpellCast,
      procedure: CounterspellReactionProcedure({
        triggeringCaster: Fighter,
        triggeringCastingResource: CounterspellMagicAction,
        triggeringSpellLevel: 4,
        triggeringSpellUsesSlot: true,
        counterspellSlotLevel: 3,
        triggeringCasterConSaveSucceeded: true,
        counterspellSpellCastReaction: CounterspellSpellCastNotCountered,
      }),
      eligibleReactors: Set(Goblin),
      offeredReactors: Set(),
      continuation: ResumeRayOfFrost,
    })
    val resolved = resolveReaction(awaiting, Goblin)
    all {
      assert(resolved.interruptStack == []),
      assert(not(resolved.goblin.reactionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Fighter)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Goblin)),
      assert(not(resolved.actionAvailable)),
      assert(resolved.goblin.hp == 6),
    }
  }

  run test_counterspell_reaction_spell_can_be_counterspelled_before_slot_commit = {
    val awaiting = openReactionWindow(initialState, {
      trigger: SpellCast,
      procedure: CounterspellReactionProcedure({
        triggeringCaster: Fighter,
        triggeringCastingResource: CounterspellMagicAction,
        triggeringSpellLevel: 1,
        triggeringSpellUsesSlot: false,
        counterspellSlotLevel: 3,
        triggeringCasterConSaveSucceeded: true,
        counterspellSpellCastReaction: CounterspellSpellCastCounteredByReaction({
          reactor: Fighter,
          counterspellSlotLevel: 3,
          counterspellCasterConSaveSucceeded: true,
        }),
      }),
      eligibleReactors: Set(Goblin),
      offeredReactors: Set(),
      continuation: ResumeRayOfFrost,
    })
    val resolved = resolveReaction(awaiting, Goblin)
    all {
      assert(resolved.interruptStack == []),
      assert(not(resolved.fighter.reactionAvailable)),
      assert(not(resolved.goblin.reactionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Fighter)),
      assert(not(battleActorHasSpellSlotUse(resolved, Goblin))),
      assert(not(resolved.actionAvailable)),
      assert(resolved.goblin.hp == 6),
    }
  }

  run test_counterspell_nested_reaction_requires_reaction_availability = {
    val reactionSpellState = {
      ...initialState,
      fighter: { ...initialState.fighter, reactionAvailable: false },
    }
    val awaiting = openReactionWindow(reactionSpellState, {
      trigger: SpellCast,
      procedure: CounterspellReactionProcedure({
        triggeringCaster: Fighter,
        triggeringCastingResource: CounterspellReaction,
        triggeringSpellLevel: 3,
        triggeringSpellUsesSlot: true,
        counterspellSlotLevel: 3,
        triggeringCasterConSaveSucceeded: true,
        counterspellSpellCastReaction: CounterspellSpellCastCounteredByReaction({
          reactor: Fighter,
          counterspellSlotLevel: 3,
          counterspellCasterConSaveSucceeded: true,
        }),
      }),
      eligibleReactors: Set(Goblin),
      offeredReactors: Set(),
      continuation: ResumeRayOfFrost,
    })
    val resolved = resolveReaction(awaiting, Goblin)
    all {
      assert(resolved.interruptStack == []),
      assert(not(resolved.fighter.reactionAvailable)),
      assert(not(resolved.goblin.reactionAvailable)),
      assert(not(battleActorHasSpellSlotUse(resolved, Fighter))),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Goblin)),
    }
  }

  run test_normal_rage_ends_when_drop_to_zero_sets_unconscious = {
    val raging = startRage(initialState, 2).state
    val dropped = { ...raging, fighter: applyDropToZeroHp(raging.fighter) }
    assert(not(fighterHasRage(endTurn(dropped))))
  }

  run test_reckless_attack_activates_on_first_attack_roll_boundary = {
    val reckless = resolveAttackRecklessly(initialState, 15, 10, fighterWeaponAttackDamageRoll(4), true)
    val goblinTurn = endTurn(reckless)
    val fighterTurn = endTurn(goblinTurn)
    all {
      assert(fighterHasRecklessAttack(reckless)),
      assert(goblinAttackAgainstFighterHasAdvantage(goblinTurn)),
      assert(not(fighterHasRecklessAttack(fighterTurn))),
    }
  }

  run test_spell_invocation_slot_spend_distinguishes_prepared_spell_from_cantrip = {
    all {
      assert(expendedSlotsAfterInvocation(MagicMissile, 0) == 1),
      assert(expendedSlotsAfterInvocation(RayOfFrost, 0) == 0),
      assert(expendedSlotsAfterInvocation(AcidSplash, 0) == 0),
      assert(expendedSlotsAfterInvocation(PoisonSpray, 0) == 0),
      assert(expendedSlotsAfterInvocation(ChillTouch, 0) == 0),
      assert(expendedSlotsAfterInvocation(StarryWisp, 0) == 0),
      assert(expendedSlotsAfterInvocation(SacredFlame, 0) == 0),
      assert(expendedSlotsAfterInvocation(InflictWounds, 0) == 1),
      assert(expendedSlotsAfterInvocation(BurningHands, 0) == 1),
      assert(expendedSlotsAfterInvocation(Fireball, 0) == 1),
      assert(expendedSlotsAfterInvocation(ColorSpray, 0) == 1),
      assert(expendedSlotsAfterInvocation(Entangle, 0) == 1),
      assert(expendedSlotsAfterInvocation(HealingWord, 0) == 1),
      assert(expendedSlotsAfterInvocation(CureWounds, 0) == 1),
      assert(expendedSlotsAfterInvocation(MassHealingWord, 0) == 1),
      assert(expendedSlotsAfterInvocation(Heroism, 0) == 1),
      assert(expendedSlotsAfterInvocation(Bane, 0) == 1),
      assert(expendedSlotsAfterInvocation(Bless, 0) == 1),
      assert(expendedSlotsAfterInvocation(Guidance, 0) == 0),
      assert(expendedSlotsAfterInvocation(Grease, 0) == 1),
      assert(expendedSlotsAfterInvocation(FogCloud, 0) == 1),
      assert(expendedSlotsAfterInvocation(Command, 0) == 1),
    }
  }

  run test_grease_records_ground_hazard_and_prones_failed_appearance_save = {
    val resolved = resolveGrease(initialState, true, false)
    all {
      assert(resolved.fighter.activeEffects.contains(GreaseGroundHazard({ areaId: greaseAreaId, durationTicks: greaseDurationTicks }))),
      assert(resolved.goblin.prone),
      assert(not(resolved.actionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Fighter)),
    }
  }

  run test_grease_empty_area_records_hazard_without_target_membership_state = {
    val resolved = resolveGrease(initialState, false, true)
    all {
      assert(resolved.fighter.activeEffects.contains(GreaseGroundHazard({ areaId: greaseAreaId, durationTicks: greaseDurationTicks }))),
      assert(not(resolved.goblin.prone)),
    }
  }

  run test_grease_ground_hazard_entry_save_applies_prone = {
    val resolved = resolveGrease(initialState, false, true)
    val entryFailed = resolveGreaseGroundHazardSave(resolved, Goblin, greaseAreaId, false)
    all {
      assert(entryFailed.goblin.prone),
      assert(currentActor(entryFailed) == Fighter),
    }
  }

  run test_grease_difficult_terrain_movement_cost_adds_extra_grease_distance = {
    val resolved = resolveGrease(initialState, false, true)
    val moved = moveFighterThroughGreaseGroundDifficultTerrain(resolved, greaseAreaId, 10, 5, false)
    val expired = { ...resolved, fighter: { ...resolved.fighter, activeEffects: Set() } }
    all {
      assert(greaseGroundDifficultTerrainMovementCost(resolved, greaseAreaId, 10, 5) == 15),
      assert(moved.fighter.movementSpent == 15),
      assert(greaseGroundDifficultTerrainMovementCost(expired, greaseAreaId, 10, 5) == 0),
    }
  }

  run test_grease_ground_hazard_end_turn_save_advances_turn = {
    val resolved = resolveGrease(initialState, false, true)
    val goblinTurn = endTurn(resolved)
    val endTurnFailed = endTurnWithGreaseGroundHazardSave(goblinTurn, Goblin, greaseAreaId, false)
    all {
      assert(endTurnFailed.goblin.prone),
      assert(currentActor(endTurnFailed) == Fighter),
    }
  }

  run test_fog_cloud_records_heavily_obscured_area_and_concentration = {
    val resolved = resolveFogCloud(initialState, fogCloudAreaId, 1)
    all {
      assert(resolved.fighter.activeEffects.contains(FogCloudObscurement({
        areaId: fogCloudAreaId,
        radiusFeet: 20,
        durationTicks: fogCloudDurationTicks,
      }))),
      assert(resolved.fighter.concentrating),
      assert(not(resolved.actionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Fighter)),
    }
  }

  run test_fog_cloud_slot_scaling_increases_radius_by_twenty_feet = {
    val resolved = resolveFogCloud(initialState, fogCloudAreaId, 3)
    all {
      assert(fogCloudRadiusFeet(1) == 20),
      assert(fogCloudRadiusFeet(3) == 60),
      assert(resolved.fighter.activeEffects.contains(FogCloudObscurement({
        areaId: fogCloudAreaId,
        radiusFeet: 60,
        durationTicks: fogCloudDurationTicks,
      }))),
    }
  }

  run test_fog_cloud_concentration_break_removes_obscurement = {
    val resolved = resolveFogCloud(initialState, fogCloudAreaId, 1)
    val broken = breakConcentrationSpellEffects(resolved, Fighter)
    all {
      assert(not(fogCloudObscurementActive(broken, fogCloudAreaId))),
      assert(not(broken.fighter.concentrating)),
    }
  }

  run test_fog_cloud_strong_wind_dispersal_removes_obscurement = {
    val resolved = resolveFogCloud(initialState, fogCloudAreaId, 1)
    val dispersed = disperseFogCloudByStrongWind(resolved, fogCloudAreaId)
    all {
      assert(not(fogCloudObscurementActive(dispersed, fogCloudAreaId))),
      assert(not(dispersed.fighter.concentrating)),
    }
  }

  run test_command_grovel_records_next_turn_pending_effect_on_failed_save = {
    val resolved = resolveCommand(initialState, Set(Goblin), Set(Goblin), 1, CommandGrovelOption)
    all {
      assert(battleActorHasCommittedSpellSlotUse(resolved, Fighter)),
      assert(not(resolved.actionAvailable)),
      assert(resolved.goblin.activeEffects.contains(CommandPending({
        source: Fighter,
        option: CommandGrovelOption,
        expiresAtActor: Goblin,
        expiresAtRound: 1,
      }))),
      assert(not(resolved.goblin.prone)),
    }
  }

  run test_command_grovel_target_turn_applies_prone_and_ends_turn = {
    val resolved = resolveCommand(initialState, Set(Goblin), Set(Goblin), 1, CommandGrovelOption)
    val goblinTurn = endTurn(resolved)
    val followed = followCommandGrovel(goblinTurn)
    all {
      assert(followed.goblin.prone),
      assert(currentActor(followed) == Fighter),
      assert(not(followed.goblin.activeEffects.contains(CommandPending({
        source: Fighter,
        option: CommandGrovelOption,
        expiresAtActor: Goblin,
        expiresAtRound: 1,
      })))),
    }
  }

  run test_command_halt_target_turn_suppresses_action_bonus_action_and_movement = {
    val resolved = resolveCommand(initialState, Set(Goblin), Set(Goblin), 1, CommandHaltOption)
    val goblinTurn = endTurn(resolved)
    val halted = followCommandHalt(goblinTurn)
    val ended = endCommandHaltTurn(halted)
    all {
      assert(resolved.goblin.activeEffects.contains(CommandPending({
        source: Fighter,
        option: CommandHaltOption,
        expiresAtActor: Goblin,
        expiresAtRound: 1,
      }))),
      assert(not(halted.actionAvailable)),
      assert(not(halted.bonusActionAvailable)),
      assert(halted.goblin.movementSpent == halted.goblin.speed),
      assert(not(ended.goblin.activeEffects.contains(CommandPending({
        source: Fighter,
        option: CommandHaltOption,
        expiresAtActor: Goblin,
        expiresAtRound: 1,
      })))),
    }
  }

  run test_command_drop_target_turn_emits_held_object_outcomes_and_ends_turn = {
    val resolved = resolveCommand(initialState, Set(Goblin), Set(Goblin), 1, CommandDropOption)
    val goblinTurn = endTurn(resolved)
    val followed = followCommandDrop(goblinTurn, 2)
    all {
      assert(commandDropOutcomeCount(goblinTurn, 2) == 2),
      assert(currentActor(followed) == Fighter),
      assert(not(followed.goblin.activeEffects.contains(CommandPending({
        source: Fighter,
        option: CommandDropOption,
        expiresAtActor: Goblin,
        expiresAtRound: 1,
      })))),
    }
  }

  run test_command_drop_known_empty_held_objects_still_ends_turn = {
    val resolved = resolveCommand(initialState, Set(Goblin), Set(Goblin), 1, CommandDropOption)
    val goblinTurn = endTurn(resolved)
    val followed = followCommandDrop(goblinTurn, 0)
    all {
      assert(commandDropOutcomeCount(goblinTurn, 0) == 0),
      assert(currentActor(followed) == Fighter),
    }
  }

  run test_command_approach_spends_supplied_movement_and_continues_when_not_within_five_feet = {
    val resolved = resolveCommand(initialState, Set(Goblin), Set(Goblin), 1, CommandApproachOption)
    val goblinTurn = endTurn(resolved)
    val followed = followCommandApproach(goblinTurn, WalkSpeedKind, 10, false)
    all {
      assert(currentActor(followed) == Goblin),
      assert(followed.goblin.movementSpent == 10),
      assert(not(followed.goblin.activeEffects.contains(CommandPending({
        source: Fighter,
        option: CommandApproachOption,
        expiresAtActor: Goblin,
        expiresAtRound: 1,
      })))),
    }
  }

  run test_command_approach_ends_turn_when_supplied_proximity_reached = {
    val resolved = resolveCommand(initialState, Set(Goblin), Set(Goblin), 1, CommandApproachOption)
    val goblinTurn = endTurn(resolved)
    val followed = followCommandApproach(goblinTurn, WalkSpeedKind, 10, true)
    all {
      assert(currentActor(followed) == Fighter),
      assert(followed.goblin.movementSpent == 10),
      assert(not(followed.goblin.activeEffects.contains(CommandPending({
        source: Fighter,
        option: CommandApproachOption,
        expiresAtActor: Goblin,
        expiresAtRound: 1,
      })))),
    }
  }

  run test_command_approach_no_movement_clears_pending_and_continues_turn = {
    val resolved = resolveCommand(initialState, Set(Goblin), Set(Goblin), 1, CommandApproachOption)
    val goblinTurn = endTurn(resolved)
    val immobile = { ...goblinTurn, goblin: { ...goblinTurn.goblin, speed: 0 } }
    val followed = followCommandApproach(immobile, WalkSpeedKind, 10, false)
    all {
      assert(currentActor(followed) == Goblin),
      assert(followed.goblin.movementSpent == 0),
      assert(not(followed.goblin.activeEffects.contains(CommandPending({
        source: Fighter,
        option: CommandApproachOption,
        expiresAtActor: Goblin,
        expiresAtRound: 1,
      })))),
    }
  }

  run test_command_flee_spends_full_supplied_movement_and_ends_turn = {
    val resolved = resolveCommand(initialState, Set(Goblin), Set(Goblin), 1, CommandFleeOption)
    val goblinTurn = endTurn(resolved)
    val followed = followCommandFlee(goblinTurn, WalkSpeedKind, 30, false)
    all {
      assert(currentActor(followed) == Fighter),
      assert(followed.goblin.movementSpent == 30),
      assert(not(followed.goblin.activeEffects.contains(CommandPending({
        source: Fighter,
        option: CommandFleeOption,
        expiresAtActor: Goblin,
        expiresAtRound: 1,
      })))),
    }
  }

  run test_command_flee_rejects_partial_movement_budget = {
    val resolved = resolveCommand(initialState, Set(Goblin), Set(Goblin), 1, CommandFleeOption)
    val goblinTurn = endTurn(resolved)
    val followed = followCommandFlee(goblinTurn, WalkSpeedKind, 10, false)
    all {
      assert(currentActor(followed) == Goblin),
      assert(followed.goblin.movementSpent == 0),
      assert(followed.goblin.activeEffects.contains(CommandPending({
        source: Fighter,
        option: CommandFleeOption,
        expiresAtActor: Goblin,
        expiresAtRound: 1,
      }))),
    }
  }

  run test_command_flee_no_movement_clears_pending_and_ends_turn = {
    val resolved = resolveCommand(initialState, Set(Goblin), Set(Goblin), 1, CommandFleeOption)
    val goblinTurn = endTurn(resolved)
    val immobile = { ...goblinTurn, goblin: { ...goblinTurn.goblin, speed: 0 } }
    val followed = followCommandFlee(immobile, WalkSpeedKind, 30, false)
    all {
      assert(currentActor(followed) == Fighter),
      assert(followed.goblin.movementSpent == 0),
      assert(not(followed.goblin.activeEffects.contains(CommandPending({
        source: Fighter,
        option: CommandFleeOption,
        expiresAtActor: Goblin,
        expiresAtRound: 1,
      })))),
    }
  }

  run test_command_flee_movement_threat_opens_opportunity_attack_window = {
    val resolved = resolveCommand(initialState, Set(Goblin), Set(Goblin), 1, CommandFleeOption)
    val goblinTurn = endTurn(resolved)
    val followed = followCommandFlee(goblinTurn, WalkSpeedKind, 30, true)
    all {
      assert(currentActor(followed) == Goblin),
      assert(followed.interruptStack.length() == 1),
      assert(pendingReactionFrame(followed.interruptStack[0]) == HasPendingReactionFrame({
        trigger: OpportunityAttack,
        procedure: OpportunityAttackReactionProcedure,
        eligibleReactors: Set(Fighter),
        offeredReactors: Set(),
        continuation: ResumeCommandFleeMovement({
          speedKind: WalkSpeedKind,
          movementCost: 30,
        }),
      })),
    }
  }

  run test_direct_hit_point_restoration_spends_action_cost_slot_and_heals = {
    val wounded = { ...initialState, fighter: { ...initialState.fighter, hp: 4 } }
    val cure = resolveDirectHitPointRestoration(wounded, CureWoundsRestoration, 1, 7, 3)
    val massWord = resolveDirectHitPointRestoration(wounded, MassHealingWordRestoration, 6, 7, 3)
    all {
      assert(cure.fighter.hp == 12),
      assert(not(cure.actionAvailable)),
      assert(cure.bonusActionAvailable),
      assert(battleActorHasCommittedSpellSlotUse(cure, Fighter)),
      assert(massWord.fighter.hp == 12),
      assert(massWord.actionAvailable),
      assert(not(massWord.bonusActionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(massWord, Fighter)),
    }
  }

  run test_direct_hit_point_restoration_rejects_second_slot_spell_in_same_turn = {
    val wounded = commitActorSpellSlotUse({ ...initialState, fighter: { ...initialState.fighter, hp: 4 } }, Fighter)
    assert(resolveDirectHitPointRestoration(wounded, CureWoundsRestoration, 1, 7, 3) == wounded)
  }

  run test_mass_healing_word_rejects_adjacent_invalid_target_counts = {
    val wounded = { ...initialState, fighter: { ...initialState.fighter, hp: 4 } }
    all {
      assert(resolveDirectHitPointRestoration(wounded, MassHealingWordRestoration, 0, 7, 3) == wounded),
      assert(resolveDirectHitPointRestoration(wounded, MassHealingWordRestoration, 7, 7, 3) == wounded),
    }
  }

  run test_spell_act_discovery_respects_spellcasting_gate = {
    all {
      assert(canDiscoverSpellActs(true, false)),
      assert(not(canDiscoverSpellActs(false, false))),
      assert(not(canDiscoverSpellActs(true, true))),
    }
  }

  run test_spell_invocation_executable_spell_facts = {
    val animalFriendshipCharmed = AnimalFriendshipCharmed({ source: Fighter, durationTicks: 24 * 60 })
    all {
      assert(rollModifierMaximumTargets(BlessRollModifier, 2) == 4),
      assert(rollModifierMaximumTargets(BaneRollModifier, 3) == 5),
      assert(rollModifierMaximumTargets(GuidanceRollModifier, 0) == 1),
      assert(rollModifierRequiresFailedSave(BaneRollModifier)),
      assert(not(rollModifierRequiresFailedSave(BlessRollModifier))),
      assert(rollModifierActiveEffect(BaneRollModifier) == BaneD20RollPenalty),
      assert(rollModifierActiveEffect(BlessRollModifier) == BlessD20RollBonus),
      assert(rollModifierActiveEffect(GuidanceRollModifier) == GuidanceAbilityCheckBonus),
      assert(spellAttackModifier(3, 2) == 5),
      assert(sorcererSpellSaveDcWithInnateSorcery(13, true, SorcererSpellSource) == 14),
      assert(sorcererSpellSaveDcWithInnateSorcery(13, false, SorcererSpellSource) == 13),
      assert(sorcererSpellSaveDcWithInnateSorcery(13, true, NonSorcererSpellSource) == 13),
      assert(sorcererSpellAttackRollModeWithInnateSorcery(NormalSpellAttackRoll, true, SorcererSpellSource) == AdvantageSpellAttackRoll),
      assert(sorcererSpellAttackRollModeWithInnateSorcery(DisadvantageSpellAttackRoll, true, SorcererSpellSource) == NormalSpellAttackRoll),
      assert(sorcererSpellAttackRollModeWithInnateSorcery(NormalSpellAttackRoll, true, NonSorcererSpellSource) == NormalSpellAttackRoll),
      assert(magicMissileDartCount(1) == 3),
      assert(magicMissileDartCount(2) == 4),
      assert(magicMissileAllocatedDamage(3, 3, 1) == 6),
      assert(magicMissileAllocatedDamage(4, 1, 1) == 5),
      assert(jumpMovementReplacementMaxTargets(1) == 1),
      assert(jumpMovementReplacementMaxTargets(2) == 2),
      assert(jumpMovementReplacementActiveEffect == JumpMovementReplacement({ durationTicks: 10, usedThisTurn: false })),
      assert(featherFallMitigationActiveEffect == FeatherFallMitigation({ durationTicks: 10 })),
      assert(activeFeatherFallDescentRateCapFeetPerRound(Set(FeatherFallMitigation({ durationTicks: 10 }))) == 60),
      assert(rayOfFrostSpeedEffectActive(true, Goblin, Fighter)),
      assert(not(rayOfFrostSpeedEffectActive(true, Fighter, Fighter))),
      assert(spellAttackDamageType(PoisonSpraySpellAttack) == Poison),
      assert(spellAttackDamageType(ChillTouchSpellAttack) == Necrotic),
      assert(spellAttackDamageType(StarryWispSpellAttack) == Radiant),
      assert(spellAttackDamageType(FireBoltSpellAttack) == Fire),
      assert(spellAttackDamageType(ShockingGraspSpellAttack) == Lightning),
      assert(spellAttackDamageType(GuidingBoltSpellAttack) == Radiant),
      assert(spellAttackDamageType(RayOfSicknessSpellAttack) == Poison),
      assert(spellAttackDamageType(SorcerousBurstSpellAttack({ damageTypeChoice: BattleRuntimeSorcerousBurstThunderDamage, spellcastingAbilityModifier: 3, characterLevel: 5 })) == Thunder),
      assert(battleRuntimeSorcerousBurstBaseDamageDice(5) == 2),
      assert(battleRuntimeSorcerousBurstCanRollAdditionalD8(1, 3, 0)),
      assert(not(battleRuntimeSorcerousBurstCanRollAdditionalD8(1, 3, 1))),
      assert(spellAttackDamageActiveEffects(RayOfSicknessSpellAttack) == Set(RayOfSicknessPoisoned)),
      assert(spellAttackDamageActiveEffects(ChillTouchSpellAttack) == Set(ChillTouchHitPointRegainPrevented({ source: Fighter, expiresAtRound: 0 }))),
      assert(spellAttackDamageActiveEffects(StarryWispSpellAttack) == Set(StarryWispInvisibleBenefitDenied({ source: Fighter, expiresAtRound: 0 }))),
      assert(starryWispDimLightEmitter(initialState, Fighter, CombatantLightEmitter({ actor: Goblin })) == SpellLightEmitter({
        source: Fighter,
        sourceSpell: StarryWisp,
        attachment: CombatantLightEmitter({ actor: Goblin }),
        emission: DimLightEmission({ radiusFeet: 10 }),
        opaqueCoverInteraction: LightEmitterDoesNotBlockOpaqueCover,
        expiresAt: EndOfTurnLightEmitterExpiration({ actor: Fighter, round: 2 }),
      })),
      assert(spellAttackDamageSupportsObjectTarget(StarryWispSpellAttack)),
      assert(spellAttackDamageSupportsObjectTarget(ChillTouchSpellAttack)),
      assert(spellAttackDamageSupportsObjectTarget(FireBoltSpellAttack)),
      assert(spellAttackDamageSupportsObjectTarget(ProduceFlameHurlSpellAttack)),
      assert(spellAttackDamageSupportsObjectTarget(SorcerousBurstSpellAttack({ damageTypeChoice: BattleRuntimeSorcerousBurstPsychicDamage, spellcastingAbilityModifier: 3, characterLevel: 5 }))),
      assert(spellAttackBeamSequenceDamageType(EldritchBlastBeamSequence) == Force),
      assert(eldritchBlastBeamCount(1) == 1),
      assert(eldritchBlastBeamCount(5) == 2),
      assert(eldritchBlastBeamCount(11) == 3),
      assert(eldritchBlastBeamCount(17) == 4),
      assert(spellAttackBeamSequenceReplayHoles(EldritchBlastBeamSequence, true, 2, 0, 0, 0, 0) == Set(TargetChoice, ObjectTargetChoice)),
      assert(spellAttackBeamSequenceReplayHoles(EldritchBlastBeamSequence, true, 2, 2, 1, 0, 0) == Set(AttackRoll)),
      assert(spellAttackBeamSequenceReplayHoles(EldritchBlastBeamSequence, true, 2, 2, 2, 2, 1) == Set(SpellDamageRoll)),
      assert(spellAttackBeamSequenceReplayHoles(EldritchBlastBeamSequence, true, 2, 2, 2, 1, 1) == Set()),
      assert(spellAttackDamageObjectReplayHoles(StarryWispSpellAttack, true, false, false, false, false) == Set(ObjectTargetChoice)),
      assert(spellAttackDamageObjectReplayHoles(StarryWispSpellAttack, true, true, false, false, false) == Set(AttackRoll)),
      assert(spellAttackDamageObjectReplayHoles(StarryWispSpellAttack, true, true, true, true, false) == Set(SpellDamageRoll)),
      assert(spellAttackDamageObjectReplayHoles(StarryWispSpellAttack, true, true, true, false, false) == Set()),
      assert(spellAttackDamageObjectReplayHoles(ChillTouchSpellAttack, true, false, false, false, false) == Set(ObjectTargetChoice)),
      assert(spellAttackDamageObjectReplayHoles(ChillTouchSpellAttack, true, true, false, false, false) == Set(AttackRoll)),
      assert(spellAttackDamageObjectReplayHoles(ChillTouchSpellAttack, true, true, true, true, false) == Set(SpellDamageRoll)),
      assert(spellAttackDamageObjectReplayHoles(ChillTouchSpellAttack, true, true, true, false, false) == Set()),
      assert(spellAttackDamageObjectReplayHoles(FireBoltSpellAttack, true, false, false, false, false) == Set(ObjectTargetChoice)),
      assert(spellAttackDamageObjectReplayHoles(FireBoltSpellAttack, true, true, false, false, false) == Set(AttackRoll)),
      assert(spellAttackDamageObjectReplayHoles(FireBoltSpellAttack, true, true, true, true, false) == Set(SpellDamageRoll)),
      assert(spellAttackDamageObjectReplayHoles(FireBoltSpellAttack, true, true, true, false, false) == Set()),
      assert(spellAttackDamageObjectReplayHoles(ProduceFlameHurlSpellAttack, true, false, false, false, false) == Set(ObjectTargetChoice)),
      assert(spellAttackDamageObjectReplayHoles(ProduceFlameHurlSpellAttack, true, true, false, false, false) == Set(AttackRoll)),
      assert(spellAttackDamageObjectReplayHoles(ProduceFlameHurlSpellAttack, true, true, true, true, false) == Set(SpellDamageRoll)),
      assert(spellAttackDamageObjectReplayHoles(SorcerousBurstSpellAttack({ damageTypeChoice: BattleRuntimeSorcerousBurstThunderDamage, spellcastingAbilityModifier: 3, characterLevel: 5 }), true, false, false, false, false) == Set(ObjectTargetChoice)),
      assert(spellObjectDamageOutcome(StarryWispSpellAttack, StarryWispObjectTarget, 6, ObjectHitPoints({ hitPoints: 5 })) == ObjectHitPointDamage({
        object: StarryWispObjectTarget,
        damageType: Radiant,
        rolledDamage: 6,
        effectiveDamage: 6,
        priorHitPoints: 5,
        nextHitPoints: 0,
        destroyed: true,
      })),
      assert(spellObjectDamageOutcome(ChillTouchSpellAttack, ChillTouchObjectTarget, 6, ObjectHitPoints({ hitPoints: 10 })) == ObjectHitPointDamage({
        object: ChillTouchObjectTarget,
        damageType: Necrotic,
        rolledDamage: 6,
        effectiveDamage: 6,
        priorHitPoints: 10,
        nextHitPoints: 4,
        destroyed: false,
      })),
      assert(spellObjectDamageOutcome(SorcerousBurstSpellAttack({ damageTypeChoice: BattleRuntimeSorcerousBurstPsychicDamage, spellcastingAbilityModifier: 3, characterLevel: 5 }), FireBoltObjectTarget, 9, ObjectHitPoints({ hitPoints: 8 })) == ObjectHitPointDamage({
        object: FireBoltObjectTarget,
        damageType: Psychic,
        rolledDamage: 9,
        effectiveDamage: 0,
        priorHitPoints: 8,
        nextHitPoints: 8,
        destroyed: false,
      })),
      assert(spellObjectDamageOutcome(StarryWispSpellAttack, StarryWispObjectTarget, 6, ObjectHitPointsWithDamageThreshold({ hitPoints: 10, damageThreshold: 10 })) == ObjectHitPointDamage({
        object: StarryWispObjectTarget,
        damageType: Radiant,
        rolledDamage: 6,
        effectiveDamage: 0,
        priorHitPoints: 10,
        nextHitPoints: 10,
        destroyed: false,
      })),
      assert(spellObjectDamageOutcome(FireBoltSpellAttack, FireBoltObjectTarget, 9, ObjectHitPoints({ hitPoints: 8 })) == ObjectHitPointDamage({
        object: FireBoltObjectTarget,
        damageType: Fire,
        rolledDamage: 9,
        effectiveDamage: 9,
        priorHitPoints: 8,
        nextHitPoints: 0,
        destroyed: true,
      })),
      assert(spellObjectIgnitionOutcomes(FireBoltSpellAttack, FireBoltObjectTarget, Fighter, ObjectFlammableUnattended) == Set(ObjectStartsBurning({
        object: FireBoltObjectTarget,
        source: Fighter,
        sourceSpell: FireBolt,
      }))),
      assert(spellObjectIgnitionOutcomes(FireBoltSpellAttack, FireBoltObjectTarget, Fighter, ObjectWornOrCarried) == Set()),
      assert(spellObjectIgnitionOutcomes(StarryWispSpellAttack, StarryWispObjectTarget, Fighter, ObjectFlammableUnattended) == Set()),
      assert(saveGatedAreaObjectIgnitionOutcomes(FireballSaveGate, FireballObjectTarget, Fighter, ObjectFlammableUnattended) == Set(ObjectStartsBurning({
        object: FireballObjectTarget,
        source: Fighter,
        sourceSpell: Fireball,
      }))),
      assert(saveGatedAreaObjectIgnitionOutcomes(FireballSaveGate, FireballObjectTarget, Fighter, ObjectWornOrCarried) == Set()),
      assert(spellObjectDamageOutcome(ProduceFlameHurlSpellAttack, ProduceFlameObjectTarget, 6, ObjectHitPoints({ hitPoints: 5 })) == ObjectHitPointDamage({
        object: ProduceFlameObjectTarget,
        damageType: Fire,
        rolledDamage: 6,
        effectiveDamage: 6,
        priorHitPoints: 5,
        nextHitPoints: 0,
        destroyed: true,
      })),
      assert(spellAttackBeamSequenceObjectDamageOutcome(EldritchBlastBeamSequence, EldritchBlastObjectTarget, 6, ObjectHitPoints({ hitPoints: 10 })) == ObjectHitPointDamage({
        object: EldritchBlastObjectTarget,
        damageType: Force,
        rolledDamage: 6,
        effectiveDamage: 6,
        priorHitPoints: 10,
        nextHitPoints: 4,
        destroyed: false,
      })),
      assert(spellAttackDamageActiveEffects(ShockingGraspSpellAttack) == Set(ShockingGraspOpportunityAttackDenied)),
      assert(spellAttackDamageActiveEffects(GuidingBoltSpellAttack) == Set(GuidingBoltNextAttackAdvantage)),
      assert(chainedSpellAttackDamageChoices(ChromaticOrbChainedSpellAttack) == Set(ChromaticOrbAcid, ChromaticOrbCold, ChromaticOrbFire, ChromaticOrbLightning, ChromaticOrbPoison, ChromaticOrbThunder)),
      assert(chainedSpellAttackDamageBaseSpellLevel(ChromaticOrbChainedSpellAttack) == 1),
      assert(chainedSpellAttackDamageDieSize(ChromaticOrbChainedSpellAttack) == 8),
      assert(chainedSpellAttackDamageDice(ChromaticOrbChainedSpellAttack, 1) == 3),
      assert(chainedSpellAttackDamageDice(ChromaticOrbChainedSpellAttack, 3) == 5),
      assert(saveGatedDamageFailedSaveActiveEffects(ViciousMockerySaveGate) == Set(ViciousMockeryNextAttackDisadvantage)),
      assert(saveGatedDamageFailedSaveActiveEffects(DissonantWhispersSaveGate) == Set()),
      assert(saveGatedDamageFailedSaveActiveEffects(FireballSaveGate) == Set()),
      assert(saveGatedConditionTargeting(ColorSpraySaveGate) == AreaSaveTargets),
      assert(saveGatedConditionSavingThrowAbility(ColorSpraySaveGate) == ConAbility),
      assert(saveGatedConditionFailedSaveActiveEffects(ColorSpraySaveGate, initialState, Fighter) == Set(ColorSprayBlinded({ source: Fighter, expiresAtRound: 2 }))),
      assert(saveGatedConditionTargeting(EntangleSaveGate) == AreaSaveTargets),
      assert(saveGatedConditionSavingThrowAbility(EntangleSaveGate) == StrAbility),
      assert(saveGatedConditionFailedSaveActiveEffects(EntangleSaveGate, initialState, Fighter) == Set(EntangleRestrained)),
      assert(saveGatedAttackRollAdvantageTargeting(FaerieFireSaveGate) == AreaSaveTargets),
      assert(saveGatedAttackRollAdvantageFailedSaveActiveEffects(FaerieFireSaveGate) == Set(FaerieFireOutline)),
      assert(activeEffectsDenyInvisibleBenefit(Set(FaerieFireOutline))),
      assert(activeEffectsDenyInvisibleBenefit(Set(StarryWispInvisibleBenefitDenied({ source: Fighter, expiresAtRound: 2 })))),
      assert(not(activeEffectsDenyInvisibleBenefit(Set(GuidingBoltNextAttackAdvantage)))),
      assert(saveGatedConditionTargeting(AnimalFriendshipSaveGate) == TargetListSaveTargets({ minTargets: 1, baseSlotLevel: 1, baseTargets: 1, additionalTargetsPerSlotLevel: 1 })),
      assert(saveGatedTargetMaxTargets(saveGatedConditionTargeting(AnimalFriendshipSaveGate), 1) == 1),
      assert(saveGatedTargetMaxTargets(saveGatedConditionTargeting(AnimalFriendshipSaveGate), 2) == 2),
      assert(saveGatedConditionTargetCreatureTypeIsLegal(AnimalFriendshipSaveGate, BeastCreature)),
      assert(not(saveGatedConditionTargetCreatureTypeIsLegal(AnimalFriendshipSaveGate, HumanoidCreature))),
      assert(saveGatedConditionFailedSaveActiveEffects(AnimalFriendshipSaveGate, initialState, Fighter) == Set(animalFriendshipCharmed)),
      assert(actorDamageSource(Fighter) == FighterDamageSource),
      assert(damageSourceSide(FighterAllyDamageSource) == PartySide),
      assert(damageSourceIsCasterOrAlly(Fighter, FighterDamageSource)),
      assert(damageSourceIsCasterOrAlly(Fighter, FighterAllyDamageSource)),
      assert(not(damageSourceIsCasterOrAlly(Fighter, GoblinDamageSource))),
      assert(activeEffectsAfterTargetDamagedByCasterOrAlly(Set(animalFriendshipCharmed), FighterDamageSource) == Set()),
      assert(activeEffectsAfterTargetDamagedByCasterOrAlly(Set(animalFriendshipCharmed), FighterAllyDamageSource) == Set()),
      assert(activeEffectsAfterTargetDamagedByCasterOrAlly(Set(animalFriendshipCharmed), GoblinDamageSource) == Set(animalFriendshipCharmed)),
      assert(saveGatedConditionTargeting(CharmPersonSaveGate) == TargetListSaveTargets({ minTargets: 1, baseSlotLevel: 1, baseTargets: 1, additionalTargetsPerSlotLevel: 1 })),
      assert(saveGatedTargetMaxTargets(saveGatedConditionTargeting(CharmPersonSaveGate), 1) == 1),
      assert(saveGatedTargetMaxTargets(saveGatedConditionTargeting(CharmPersonSaveGate), 2) == 2),
      assert(saveGatedConditionTargetCreatureTypeIsLegal(CharmPersonSaveGate, HumanoidCreature)),
      assert(not(saveGatedConditionTargetCreatureTypeIsLegal(CharmPersonSaveGate, BeastCreature))),
      assert(saveGatedConditionFailedSaveActiveEffects(CharmPersonSaveGate, initialState, Fighter) == Set(CharmPersonCharmed({ source: Fighter, durationTicks: charmPersonCharmedDurationTicks }))),
      assert(saveGatedConditionSavingThrowHasAdvantage(CharmPersonSaveGate, true)),
      assert(not(saveGatedConditionSavingThrowHasAdvantage(CharmPersonSaveGate, false))),
      assert(spellAttackRollModeFromActiveEffects(Set(), Set(GuidingBoltNextAttackAdvantage), false) == AdvantageSpellAttackRoll),
      assert(spellAttackRollModeFromActiveEffects(Set(), Set(FaerieFireOutline), true) == AdvantageSpellAttackRoll),
      assert(spellAttackRollModeFromActiveEffects(Set(), Set(FaerieFireOutline), false) == NormalSpellAttackRoll),
      assert(spellAttackRollModeFromActiveEffects(Set(ViciousMockeryNextAttackDisadvantage), Set(), true) == DisadvantageSpellAttackRoll),
      assert(spellAttackRollModeFromActiveEffects(Set(ViciousMockeryNextAttackDisadvantage), Set(GuidingBoltNextAttackAdvantage), true) == NormalSpellAttackRoll),
      assert(spellAttackRollModeFromActiveEffects(Set(ViciousMockeryNextAttackDisadvantage), Set(FaerieFireOutline), true) == NormalSpellAttackRoll),
      assert(spellAttackRollModeFromCreatureTypeScopedActiveEffects(UndeadCreature, Set(), Set(ProtectionFromEvilAndGoodCreatureTypeProtection), true) == DisadvantageSpellAttackRoll),
      assert(spellAttackRollModeFromCreatureTypeScopedActiveEffects(UndeadCreature, Set(), Set(GuidingBoltNextAttackAdvantage, ProtectionFromEvilAndGoodCreatureTypeProtection), false) == NormalSpellAttackRoll),
      assert(spellAttackRollModeFromCreatureTypeScopedActiveEffects(UndeadCreature, Set(), Set(FaerieFireOutline, ProtectionFromEvilAndGoodCreatureTypeProtection), true) == NormalSpellAttackRoll),
      assert(spellAttackRollModeFromCreatureTypeScopedActiveEffects(UndeadCreature, Set(), Set(FaerieFireOutline, ProtectionFromEvilAndGoodCreatureTypeProtection), false) == DisadvantageSpellAttackRoll),
      assert(spellAttackRollModeFromCreatureTypeScopedActiveEffects(HumanoidCreature, Set(), Set(ProtectionFromEvilAndGoodCreatureTypeProtection), true) == NormalSpellAttackRoll),
      assert(protectionFromEvilAndGoodPreventsConditionFromCreatureType(UndeadCreature, Set(ProtectionFromEvilAndGoodCreatureTypeProtection), PreventedCharmed)),
      assert(protectionFromEvilAndGoodPreventsConditionFromCreatureType(FeyCreature, Set(ProtectionFromEvilAndGoodCreatureTypeProtection), PreventedFrightened)),
      assert(not(protectionFromEvilAndGoodPreventsConditionFromCreatureType(HumanoidCreature, Set(ProtectionFromEvilAndGoodCreatureTypeProtection), PreventedCharmed))),
      assert(not(protectionFromEvilAndGoodPreventsConditionFromCreatureType(UndeadCreature, Set(), PreventedFrightened))),
      assert(protectionFromEvilAndGoodPreventsPossessionFromCreatureType(UndeadCreature, Set(ProtectionFromEvilAndGoodCreatureTypeProtection))),
      assert(not(protectionFromEvilAndGoodPreventsPossessionFromCreatureType(HumanoidCreature, Set(ProtectionFromEvilAndGoodCreatureTypeProtection)))),
      assert(not(protectionFromEvilAndGoodPreventsPossessionFromCreatureType(FeyCreature, Set()))),
      assert(possessionAttemptDispositionFromCreatureTypeProtection(FeyCreature, Set(ProtectionFromEvilAndGoodCreatureTypeProtection)) == PossessionPreventedByCreatureTypeProtection),
      assert(possessionAttemptDispositionFromCreatureTypeProtection(HumanoidCreature, Set(ProtectionFromEvilAndGoodCreatureTypeProtection)) == PossessionUnprevented),
      assert(protectionFromEvilAndGoodRelevantEffectSaveRollMode(FeyCreature, Set(ProtectionFromEvilAndGoodCreatureTypeProtection, ProtectionRelevantCharmed({ source: Fighter, durationTicks: 10 })), ProtectionRelevantCharmed({ source: Fighter, durationTicks: 10 })) == AdvantageSavingThrow),
      assert(protectionFromEvilAndGoodRelevantEffectSaveRollMode(FeyCreature, Set(ProtectionFromEvilAndGoodCreatureTypeProtection, ProtectionRelevantFrightened({ source: Fighter, durationTicks: 10 })), ProtectionRelevantFrightened({ source: Fighter, durationTicks: 10 })) == AdvantageSavingThrow),
      assert(protectionFromEvilAndGoodRelevantEffectSaveRollMode(FeyCreature, Set(ProtectionFromEvilAndGoodCreatureTypeProtection, ProtectionRelevantPossession({ source: Fighter, durationTicks: 10 })), ProtectionRelevantPossession({ source: Fighter, durationTicks: 10 })) == AdvantageSavingThrow),
      assert(protectionFromEvilAndGoodRelevantEffectSaveRollMode(HumanoidCreature, Set(ProtectionFromEvilAndGoodCreatureTypeProtection, ProtectionRelevantCharmed({ source: Fighter, durationTicks: 10 })), ProtectionRelevantCharmed({ source: Fighter, durationTicks: 10 })) == NormalSavingThrow),
      assert(protectionFromEvilAndGoodRelevantEffectSaveRollMode(FeyCreature, Set(ProtectionFromEvilAndGoodCreatureTypeProtection), CharmPersonCharmed({ source: Fighter, durationTicks: charmPersonCharmedDurationTicks })) == NormalSavingThrow),
      assert(protectionFromEvilAndGoodRelevantEffectSaveRollMode(FeyCreature, Set(ProtectionFromEvilAndGoodCreatureTypeProtection, CharmPersonCharmed({ source: Fighter, durationTicks: charmPersonCharmedDurationTicks })), CharmPersonCharmed({ source: Fighter, durationTicks: charmPersonCharmedDurationTicks })) == NormalSavingThrow),
      assert(saveGatedConditionTarget(CharmPersonSaveGate, initialState, { ...initialState.goblin, activeEffects: Set(ProtectionFromEvilAndGoodCreatureTypeProtection) }, false, Fighter, FeyCreature).activeEffects == Set(ProtectionFromEvilAndGoodCreatureTypeProtection)),
      assert(saveGatedConditionTarget(CharmPersonSaveGate, initialState, { ...initialState.goblin, activeEffects: Set(ProtectionFromEvilAndGoodCreatureTypeProtection) }, false, Fighter, HumanoidCreature).activeEffects == Set(ProtectionFromEvilAndGoodCreatureTypeProtection, CharmPersonCharmed({ source: Fighter, durationTicks: charmPersonCharmedDurationTicks }))),
      assert(saveGatedTargeting(SacredFlameSaveGate) == SingleSaveTarget),
      assert(saveGatedDamageSuccess(SacredFlameSaveGate) == NoDamageOnSaveSuccess),
      assert(saveGatedDamageType(SacredFlameSaveGate) == Radiant),
      assert(saveGatedTargeting(InflictWoundsSaveGate) == SingleSaveTarget),
      assert(saveGatedDamageSuccess(InflictWoundsSaveGate) == HalfDamageOnSaveSuccess),
      assert(saveGatedDamageType(InflictWoundsSaveGate) == Necrotic),
      assert(saveGatedTargeting(BurningHandsSaveGate) == AreaSaveTargets),
      assert(saveGatedDamageSuccess(BurningHandsSaveGate) == HalfDamageOnSaveSuccess),
      assert(saveGatedDamageType(BurningHandsSaveGate) == Fire),
      assert(saveGatedTargeting(FireballSaveGate) == AreaSaveTargets),
      assert(saveGatedDamageSuccess(FireballSaveGate) == HalfDamageOnSaveSuccess),
      assert(saveGatedDamageType(FireballSaveGate) == Fire),
      assert(saveGatedTargeting(ViciousMockerySaveGate) == SingleSaveTarget),
      assert(saveGatedDamageSuccess(ViciousMockerySaveGate) == NoDamageOnSaveSuccess),
      assert(saveGatedDamageType(ViciousMockerySaveGate) == Psychic),
      assert(saveGatedTargeting(DissonantWhispersSaveGate) == SingleSaveTarget),
      assert(saveGatedDamageSuccess(DissonantWhispersSaveGate) == HalfDamageOnSaveSuccess),
      assert(saveGatedDamageType(DissonantWhispersSaveGate) == Psychic),
      assert(saveGatedTargeting(HellishRebukeSaveGate) == SingleSaveTarget),
      assert(saveGatedDamageSuccess(HellishRebukeSaveGate) == HalfDamageOnSaveSuccess),
      assert(saveGatedDamageType(HellishRebukeSaveGate) == Fire),
      assert(spellInvocationSpendsSpellSlot(DissonantWhispers)),
      assert(spellInvocationSpendsSpellSlot(Fireball)),
      assert(spellInvocationSpendsSpellSlot(HellishRebuke)),
      assert(spellInvocationSpendsSpellSlot(IceKnife)),
      assert(spellInvocationSpendsSpellSlot(AnimalFriendship)),
      assert(spellInvocationSpendsSpellSlot(CharmPerson)),
      assert(spellInvocationSpendsSpellSlot(ProtectionFromEvilAndGood)),
      assert(spellInvocationSpendsSpellSlot(DivineFavor)),
      assert(spellInvocationSpendsSpellSlot(DivineSmite)),
      assert(spellInvocationSpendsSpellSlot(HuntersMark)),
      assert(spellInvocationSpendsSpellSlot(Hex)),
      assert(spellInvocationSpendsSpellSlot(FogCloud)),
      assert(fighterDivineFavorDamage(3, Set(DivineFavorWeaponDamageRider({ durationTicks: 1 }))) == 3),
      assert(fighterDivineFavorDamage(3, Set()) == 0),
      assert(divineSmiteDamageDice(1, HumanoidCreature) == 2),
      assert(divineSmiteDamageDice(1, UndeadCreature) == 3),
      assert(divineSmiteDamageDice(3, FiendCreature) == 5),
      assert(huntersMarkDurationTicks(1) == 600),
      assert(huntersMarkDurationTicks(2) == 600),
      assert(huntersMarkDurationTicks(3) == 4800),
      assert(huntersMarkDurationTicks(4) == 4800),
      assert(huntersMarkDurationTicks(5) == 14400),
      assert(resolveFavoredEnemyHuntersMark(initialState, Goblin, 2).favoredEnemyUsesRemaining == 1),
      assert(not(battleActorHasSpellSlotUse(resolveFavoredEnemyHuntersMark(initialState, Goblin, 2).state, Fighter))),
      assert(activeEffectsContainHuntersMark(resolveFavoredEnemyHuntersMark(initialState, Goblin, 2).state.fighter.activeEffects)),
      assert(resolveFavoredEnemyHuntersMark(initialState, Goblin, 0).state == initialState),
      assert(fighterHuntersMarkDamage(4, Set(HuntersMarkDamageRider({ target: Goblin, transfer: AwaitingTargetDrop, durationTicks: 600 })), Goblin) == 4),
      assert(fighterHuntersMarkDamage(4, Set(HuntersMarkDamageRider({ target: Fighter, transfer: AwaitingTargetDrop, durationTicks: 600 })), Goblin) == 0),
      assert(huntersMarkFindingAbilityCheckRollMode(Set(HuntersMarkDamageRider({ target: Goblin, transfer: AwaitingTargetDrop, durationTicks: 600 })), Goblin, WisAbility, PerceptionSkill) == AdvantageAbilityCheck),
      assert(huntersMarkFindingAbilityCheckRollMode(Set(HuntersMarkDamageRider({ target: Goblin, transfer: AwaitingTargetDrop, durationTicks: 600 })), Goblin, WisAbility, SurvivalSkill) == AdvantageAbilityCheck),
      assert(huntersMarkFindingAbilityCheckRollMode(Set(HuntersMarkDamageRider({ target: Goblin, transfer: AwaitingTargetDrop, durationTicks: 600 })), Goblin, WisAbility, AthleticsSkill) == NormalAbilityCheck),
      assert(huntersMarkFindingAbilityCheckRollMode(Set(HuntersMarkDamageRider({ target: Goblin, transfer: AwaitingTargetDrop, durationTicks: 600 })), Fighter, WisAbility, PerceptionSkill) == NormalAbilityCheck),
      assert(huntersMarkFindingAbilityCheckRollMode(Set(HuntersMarkDamageRider({ target: Goblin, transfer: AwaitingTargetDrop, durationTicks: 600 })), Goblin, StrAbility, PerceptionSkill) == NormalAbilityCheck),
      assert(fighterHexDamage(4, Set(HexDamageRider({ target: Goblin, ability: WisAbility, transfer: AwaitingTargetDrop, durationTicks: 600 })), Goblin) == 4),
      assert(fighterHexDamage(4, Set(HexDamageRider({ target: Fighter, ability: WisAbility, transfer: AwaitingTargetDrop, durationTicks: 600 })), Goblin) == 0),
      assert(hexAbilityCheckRollMode(Set(HexDamageRider({ target: Goblin, ability: WisAbility, transfer: AwaitingTargetDrop, durationTicks: 600 })), Goblin, WisAbility) == DisadvantageAbilityCheck),
      assert(hexAbilityCheckRollMode(Set(HexDamageRider({ target: Goblin, ability: WisAbility, transfer: AwaitingTargetDrop, durationTicks: 600 })), Goblin, StrAbility) == NormalAbilityCheck),
      assert(thaumaturgyBoomingVoiceDurationTicks == 10),
      assert(thaumaturgyMaxActiveOneMinuteEffects == 3),
      assert(not(spellInvocationSpendsSpellSlot(Thaumaturgy))),
      assert(thaumaturgyBoomingVoiceAbilityCheckRollMode(Set(thaumaturgyBoomingVoiceActiveEffect(Fighter)), Fighter, ChaAbility, IntimidationSkill) == AdvantageAbilityCheck),
      assert(thaumaturgyBoomingVoiceAbilityCheckRollMode(Set(thaumaturgyBoomingVoiceActiveEffect(Fighter)), Fighter, WisAbility, IntimidationSkill) == NormalAbilityCheck),
      assert(thaumaturgyBoomingVoiceAbilityCheckRollMode(Set(thaumaturgyBoomingVoiceActiveEffect(Fighter)), Fighter, ChaAbility, PerceptionSkill) == NormalAbilityCheck),
      assert(requiredAbilityCheckRollMode(DisadvantageAbilityCheck, AdvantageAbilityCheck) == NormalAbilityCheck),
      assert(resolveThaumaturgyBoomingVoice(initialState, 2).fighter.activeEffects.contains(thaumaturgyBoomingVoiceActiveEffect(Fighter))),
      assert(not(resolveThaumaturgyBoomingVoice(initialState, 3).fighter.activeEffects.contains(thaumaturgyBoomingVoiceActiveEffect(Fighter)))),
      assert(resolveThaumaturgyBoomingVoice({ ...initialState, fighter: { ...initialState.fighter, activeEffects: Set(thaumaturgyBoomingVoiceActiveEffect(Fighter)) } }, 3).fighter.activeEffects.contains(thaumaturgyBoomingVoiceActiveEffect(Fighter))),
      assert(resolveThaumaturgyBoomingVoice({ ...initialState, fighter: { ...initialState.fighter, activeEffects: Set(thaumaturgyBoomingVoiceActiveEffect(Fighter)) } }, 0).actionAvailable),
      assert(hexDurationTicks(1) == 3600),
      assert(hexDurationTicks(2) == 14400),
      assert(hexDurationTicks(3) == 28800),
      assert(hexDurationTicks(4) == 28800),
      assert(hexDurationTicks(5) == 86400),
      assert(activeEffectsContainTransferableHex(
        { ...initialState, initiative: { ...initialState.initiative, round: 1, stillToAct: List(Fighter, Goblin), alreadyActed: List() } },
        Set(HexDamageRider({ target: Goblin, ability: WisAbility, transfer: TransferAvailableAfterTurn({ actor: Fighter, round: 1 }), durationTicks: 600 }))
      ) == false),
      assert(activeEffectsContainTransferableHex(
        { ...initialState, initiative: { ...initialState.initiative, round: 1, stillToAct: List(Goblin), alreadyActed: List(Fighter) } },
        Set(HexDamageRider({ target: Goblin, ability: WisAbility, transfer: TransferAvailableAfterTurn({ actor: Fighter, round: 1 }), durationTicks: 600 }))
      )),
      assert(resolveRayOfFrostWithDamageRoll({ ...initialState, fighter: { ...initialState.fighter, activeEffects: Set(HuntersMarkDamageRider({ target: Goblin, transfer: AwaitingTargetDrop, durationTicks: 600 })) }, goblin: { ...initialState.goblin, reactionAvailable: false } }, 15, 10, fighterSpellAttackDamageRollWithHuntersMark(4, 6), true).goblin.hp == 0),
      assert(attackBurstSaveDamageSpendsLevelOneSlot(IceKnifeAttackBurstSaveDamage)),
      assert(attackBurstSaveDamageAttackType(IceKnifeAttackBurstSaveDamage) == Piercing),
      assert(attackBurstSaveDamageBurstType(IceKnifeAttackBurstSaveDamage) == Cold),
    }
  }

  run test_roll_modifier_concentration_effects_end_when_caster_concentration_breaks = {
    val concentrating = {
      ...endTurn(initialState),
      fighter: {
        ...initialState.fighter,
        concentrating: true,
        activeEffects: Set(BaneD20RollPenalty, BlessD20RollBonus, GuidanceAbilityCheckBonus),
      },
      goblin: {
        ...initialState.goblin,
        activeEffects: Set(BaneD20RollPenalty, BlessD20RollBonus, GuidanceAbilityCheckBonus),
      },
    }
    val result = resolveGoblinAttack(concentrating, 20, 18, 5, false)
    all {
      assert(not(result.fighter.concentrating)),
      assert(not(result.fighter.activeEffects.contains(BaneD20RollPenalty))),
      assert(not(result.fighter.activeEffects.contains(BlessD20RollBonus))),
      assert(not(result.fighter.activeEffects.contains(GuidanceAbilityCheckBonus))),
      assert(not(result.goblin.activeEffects.contains(BaneD20RollPenalty))),
      assert(not(result.goblin.activeEffects.contains(BlessD20RollBonus))),
      assert(not(result.goblin.activeEffects.contains(GuidanceAbilityCheckBonus))),
    }
  }

  run test_roll_modifier_concentration_replacement_removes_prior_effects_before_new_effect = {
    val prior = {
      ...initialState,
      fighter: {
        ...initialState.fighter,
        concentrating: true,
        activeEffects: Set(BaneD20RollPenalty, GuidanceAbilityCheckBonus),
      },
      goblin: {
        ...initialState.goblin,
        activeEffects: Set(BaneD20RollPenalty, GuidanceAbilityCheckBonus),
      },
    }
    val result = resolveRollModifierSpell(prior, BlessRollModifier, Set(Goblin), Set(), 1)
    all {
      assert(result.fighter.concentrating),
      assert(not(result.fighter.activeEffects.contains(BaneD20RollPenalty))),
      assert(not(result.fighter.activeEffects.contains(GuidanceAbilityCheckBonus))),
      assert(not(result.fighter.activeEffects.contains(BlessD20RollBonus))),
      assert(not(result.goblin.activeEffects.contains(BaneD20RollPenalty))),
      assert(not(result.goblin.activeEffects.contains(GuidanceAbilityCheckBonus))),
      assert(result.goblin.activeEffects.contains(BlessD20RollBonus)),
    }
  }

  run test_guidance_preserves_existing_turn_spell_slot_guard = {
    val alreadySpent = commitActorSpellSlotUse(initialState, Fighter)
    val result = resolveRollModifierSpell(alreadySpent, GuidanceRollModifier, Set(Fighter), Set(), 0)
    all {
      assert(result.fighter.concentrating),
      assert(result.fighter.activeEffects.contains(GuidanceAbilityCheckBonus)),
      assert(battleActorHasCommittedSpellSlotUse(result, Fighter)),
    }
  }

  run test_chromatic_orb_chained_replay_facts = {
    val noDuplicateFaces = {
      face1: 1,
      face2: 1,
      face3: 1,
      face4: 0,
      face5: 0,
      face6: 0,
      face7: 0,
      face8: 0,
    }
    val duplicateFaces = {
      face1: 2,
      face2: 0,
      face3: 1,
      face4: 0,
      face5: 0,
      face6: 0,
      face7: 0,
      face8: 0,
    }
    val criticalDuplicateFaces = {
      face1: 2,
      face2: 1,
      face3: 1,
      face4: 1,
      face5: 1,
      face6: 0,
      face7: 0,
      face8: 0,
    }
    val level3DuplicateFaces = {
      face1: 2,
      face2: 1,
      face3: 1,
      face4: 1,
      face5: 0,
      face6: 0,
      face7: 0,
      face8: 0,
    }
    val negativeFaceCount = {
      face1: -1,
      face2: 2,
      face3: 2,
      face4: 0,
      face5: 0,
      face6: 0,
      face7: 0,
      face8: 0,
    }

    all {
      assert(d8FaceCountsMatchRolledDice(ChromaticOrbChainedSpellAttack, 1, false, noDuplicateFaces)),
      assert(d8FaceCountsMatchRolledDice(ChromaticOrbChainedSpellAttack, 1, true, criticalDuplicateFaces)),
      assert(not(d8FaceCountsMatchRolledDice(ChromaticOrbChainedSpellAttack, 0, false, noDuplicateFaces))),
      assert(not(d8FaceCountsMatchRolledDice(ChromaticOrbChainedSpellAttack, 1, false, negativeFaceCount))),
      assert(not(damageRollHasDuplicateD8Face(noDuplicateFaces))),
      assert(damageRollHasDuplicateD8Face(duplicateFaces)),
      assert(chainedSpellAttackDamageCanLeap(ChromaticOrbChainedSpellAttack, 1, 0, false, duplicateFaces)),
      assert(chainedSpellAttackDamageCanLeap(ChromaticOrbChainedSpellAttack, 1, 0, true, criticalDuplicateFaces)),
      assert(not(chainedSpellAttackDamageCanLeap(ChromaticOrbChainedSpellAttack, 1, 1, false, duplicateFaces))),
      assert(not(chainedSpellAttackDamageCanLeap(ChromaticOrbChainedSpellAttack, 1, -1, false, duplicateFaces))),
      assert(chainedSpellAttackDamageCanLeap(ChromaticOrbChainedSpellAttack, 3, 2, false, level3DuplicateFaces)),
      assert(not(chainedSpellAttackDamageCanLeap(ChromaticOrbChainedSpellAttack, 3, 2, false, duplicateFaces))),
      assert(not(chainedSpellAttackDamageCanLeap(ChromaticOrbChainedSpellAttack, 3, 3, false, level3DuplicateFaces))),
      assert(not(chainedSpellAttackDamageCanLeap(ChromaticOrbChainedSpellAttack, 3, 0, false, noDuplicateFaces))),
      assert(not(chainedSpellAttackDamageCanLeap(ChromaticOrbChainedSpellAttack, 3, 0, false, negativeFaceCount))),
      assert(chromaticOrbDamageTypeChoice(ChromaticOrbAcid) == Acid),
      assert(chromaticOrbDamageTypeChoice(ChromaticOrbCold) == Cold),
      assert(chromaticOrbDamageTypeChoice(ChromaticOrbFire) == Fire),
      assert(chromaticOrbDamageTypeChoice(ChromaticOrbLightning) == Lightning),
      assert(chromaticOrbDamageTypeChoice(ChromaticOrbPoison) == Poison),
      assert(chromaticOrbDamageTypeChoice(ChromaticOrbThunder) == Thunder),
      assert(chainedSpellAttackDamageStepDamageType(ChromaticOrbChainedSpellAttack, ChromaticOrbFire, 0) == Fire),
      assert(chainedSpellAttackDamageStepDamageType(ChromaticOrbChainedSpellAttack, ChromaticOrbFire, 2) == Fire),
    }
  }

  run test_chromatic_orb_chained_replay_holes_are_ordered = {
    all {
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsDamageType) == Set(ChainedSpellDamageTypeChoice)),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsInitialTarget({ slotLevel: 1, selectedDamageType: ChromaticOrbLightning })) == Set(ChainedStepTargetChoice({ stepIndex: 0 }))),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsInitialTarget({ slotLevel: 0, selectedDamageType: ChromaticOrbLightning })) == Set()),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsAttackRoll({
        slotLevel: 1,
        selectedDamageType: ChromaticOrbLightning,
        stepIndex: 0,
        target: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 0,
      })) == Set(ChainedStepAttackRoll({ stepIndex: 0 }))),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsAttackRoll({
        slotLevel: 1,
        selectedDamageType: ChromaticOrbLightning,
        stepIndex: 1,
        target: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 0,
      })) == Set()),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsAttackRoll({
        slotLevel: 1,
        selectedDamageType: ChromaticOrbLightning,
        stepIndex: 0,
        target: Fighter,
        targeted: Set(Goblin),
        leapsUsed: 0,
      })) == Set()),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsDamageRoll({
        slotLevel: 1,
        selectedDamageType: ChromaticOrbLightning,
        stepIndex: 0,
        target: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 0,
        criticalHit: false,
      })) == Set(ChainedStepDamageRoll({ stepIndex: 0 }))),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsDamageRoll({
        slotLevel: 1,
        selectedDamageType: ChromaticOrbLightning,
        stepIndex: 0,
        target: Goblin,
        targeted: Set(Goblin),
        leapsUsed: -1,
        criticalHit: false,
      })) == Set()),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsDamageRoll({
        slotLevel: 2,
        selectedDamageType: ChromaticOrbLightning,
        stepIndex: 1,
        target: Goblin,
        targeted: Set(),
        leapsUsed: 1,
        criticalHit: false,
      })) == Set()),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsLeapTarget({
        slotLevel: 1,
        selectedDamageType: ChromaticOrbLightning,
        previousTarget: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 0,
      })) == Set(ChainedStepTargetChoice({ stepIndex: 1 }))),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsLeapTarget({
        slotLevel: 1,
        selectedDamageType: ChromaticOrbLightning,
        previousTarget: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 1,
      })) == Set()),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsLeapTarget({
        slotLevel: 2,
        selectedDamageType: ChromaticOrbLightning,
        previousTarget: Fighter,
        targeted: Set(Goblin),
        leapsUsed: 0,
      })) == Set()),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsLeapTarget({
        slotLevel: 2,
        selectedDamageType: ChromaticOrbLightning,
        previousTarget: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 1,
      })) == Set()),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedComplete) == Set()),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, false, ChainedNeedsDamageType) == Set()),
    }
  }

  run test_chromatic_orb_leap_target_invariants = {
    all {
      assert(chainedSpellAttackDamageTargetAllowed(ChromaticOrbChainedSpellAttack, ChainedNeedsInitialTarget({ slotLevel: 1, selectedDamageType: ChromaticOrbAcid }), Goblin, false)),
      assert(not(chainedSpellAttackDamageTargetAllowed(ChromaticOrbChainedSpellAttack, ChainedNeedsInitialTarget({ slotLevel: 0, selectedDamageType: ChromaticOrbAcid }), Goblin, false))),
      assert(chainedSpellAttackDamageTargetAllowed(ChromaticOrbChainedSpellAttack, ChainedNeedsLeapTarget({
        slotLevel: 2,
        selectedDamageType: ChromaticOrbAcid,
        previousTarget: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 0,
      }), Fighter, true)),
      assert(not(chainedSpellAttackDamageTargetAllowed(ChromaticOrbChainedSpellAttack, ChainedNeedsLeapTarget({
        slotLevel: 2,
        selectedDamageType: ChromaticOrbAcid,
        previousTarget: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 0,
      }), Goblin, true))),
      assert(not(chainedSpellAttackDamageTargetAllowed(ChromaticOrbChainedSpellAttack, ChainedNeedsLeapTarget({
        slotLevel: 2,
        selectedDamageType: ChromaticOrbAcid,
        previousTarget: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 0,
      }), Fighter, false))),
      assert(not(chainedSpellAttackDamageTargetAllowed(ChromaticOrbChainedSpellAttack, ChainedNeedsLeapTarget({
        slotLevel: 1,
        selectedDamageType: ChromaticOrbAcid,
        previousTarget: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 1,
      }), Fighter, true))),
      assert(not(chainedSpellAttackDamageTargetAllowed(ChromaticOrbChainedSpellAttack, ChainedNeedsLeapTarget({
        slotLevel: 2,
        selectedDamageType: ChromaticOrbAcid,
        previousTarget: Goblin,
        targeted: Set(Goblin),
        leapsUsed: -1,
      }), Fighter, true))),
      assert(not(chainedSpellAttackDamageTargetAllowed(ChromaticOrbChainedSpellAttack, ChainedNeedsLeapTarget({
        slotLevel: 2,
        selectedDamageType: ChromaticOrbAcid,
        previousTarget: Fighter,
        targeted: Set(Goblin),
        leapsUsed: 0,
      }), Fighter, true))),
      assert(not(chainedSpellAttackDamageTargetAllowed(ChromaticOrbChainedSpellAttack, ChainedNeedsLeapTarget({
        slotLevel: 2,
        selectedDamageType: ChromaticOrbAcid,
        previousTarget: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 1,
      }), Fighter, true))),
    }
  }

  run test_acid_splash_replay_asks_for_saving_throw_outcomes_then_damage_on_failure = {
    all {
      assert(acidSplashReplayHoles(true, false, false) == Set(SavingThrowOutcome)),
      assert(acidSplashReplayHoles(true, true, true) == Set(DamageRoll)),
      assert(acidSplashReplayHoles(true, true, false) == Set()),
      assert(acidSplashReplayHoles(false, false, false) == Set()),
    }
  }

  run test_single_target_save_damage_replay_asks_for_target_then_saving_throw_then_damage = {
    all {
      assert(saveGatedDamageReplayHoles(SacredFlameSaveGate, true, false, false, false) == Set(TargetChoice)),
      assert(saveGatedDamageReplayHoles(SacredFlameSaveGate, true, true, false, false) == Set(SavingThrowOutcome)),
      assert(saveGatedDamageReplayHoles(SacredFlameSaveGate, true, true, true, true) == Set(DamageRoll)),
      assert(saveGatedDamageReplayHoles(SacredFlameSaveGate, true, true, true, false) == Set()),
      assert(saveGatedDamageReplayHoles(InflictWoundsSaveGate, true, true, true, true) == Set(DamageRoll)),
      assert(saveGatedDamageReplayHoles(BurningHandsSaveGate, true, true, false, false) == Set(SavingThrowOutcome)),
      assert(saveGatedDamageReplayHoles(BurningHandsSaveGate, true, true, true, true) == Set(DamageRoll)),
      assert(saveGatedDamageReplayHoles(FireballSaveGate, true, true, false, false) == Set(SavingThrowOutcome)),
      assert(saveGatedDamageReplayHoles(FireballSaveGate, true, true, true, true) == Set(DamageRoll)),
      assert(saveGatedConditionReplayHoles(ColorSpraySaveGate, true, true, false) == Set(SavingThrowOutcome)),
      assert(saveGatedConditionReplayHoles(ColorSpraySaveGate, true, true, true) == Set()),
      assert(saveGatedConditionReplayHoles(ColorSpraySaveGate, true, false, true) == Set()),
      assert(saveGatedConditionReplayHoles(EntangleSaveGate, true, true, false) == Set(SavingThrowOutcome)),
      assert(saveGatedConditionReplayHoles(EntangleSaveGate, true, true, true) == Set()),
      assert(saveGatedConditionReplayHoles(CharmPersonSaveGate, true, false, false) == Set(SpellTargetList)),
      assert(saveGatedConditionReplayHoles(CharmPersonSaveGate, true, true, false) == Set(SavingThrowOutcome)),
      assert(saveGatedConditionReplayHoles(CharmPersonSaveGate, true, true, true) == Set()),
      assert(saveGatedAttackRollAdvantageReplayHoles(FaerieFireSaveGate, true, false) == Set(SavingThrowOutcome)),
      assert(saveGatedAttackRollAdvantageReplayHoles(FaerieFireSaveGate, true, true) == Set()),
    }
  }

  run test_ice_knife_replay_asks_for_attack_damage_then_mandatory_burst = {
    all {
      assert(attackBurstSaveDamageReplayHoles(IceKnifeAttackBurstSaveDamage, true, false, false, false, false, false, false) == Set(TargetChoice)),
      assert(attackBurstSaveDamageReplayHoles(IceKnifeAttackBurstSaveDamage, true, true, false, false, false, false, false) == Set(AttackRoll)),
      assert(attackBurstSaveDamageReplayHoles(IceKnifeAttackBurstSaveDamage, true, true, true, true, false, false, false) == Set(DamageRoll)),
      assert(attackBurstSaveDamageReplayHoles(IceKnifeAttackBurstSaveDamage, true, true, true, false, false, false, false) == Set(SavingThrowOutcome)),
      assert(attackBurstSaveDamageReplayHoles(IceKnifeAttackBurstSaveDamage, true, true, true, true, true, false, false) == Set(SavingThrowOutcome)),
      assert(attackBurstSaveDamageReplayHoles(IceKnifeAttackBurstSaveDamage, true, true, true, false, false, true, true) == Set(SpellDamageRoll)),
      assert(attackBurstSaveDamageReplayHoles(IceKnifeAttackBurstSaveDamage, false, false, false, false, false, false, false) == Set()),
    }
  }

  run test_acid_splash_damage_applies_only_to_failed_saving_throw_targets = {
    val result = resolveAcidSplash(initialState, false, true, 4, true, true)
    all {
      assert(result.actionAvailable == false),
      assert(result.fighter.hp == 12),
      assert(result.goblin.hp == 6),
    }
  }

  run test_burning_hands_area_save_damage_halves_success_and_spends_slot = {
    val result = resolveBurningHands(initialState, false, true, 6, true, true)
    all {
      assert(result.actionAvailable == false),
      assert(battleActorHasCommittedSpellSlotUse(result, Fighter)),
      assert(result.fighter.hp == 6),
      assert(result.goblin.hp == 7),
    }
  }

  run test_burning_hands_empty_area_spends_slot_without_damage = {
    val result = resolveBurningHandsEmptyArea(initialState)
    all {
      assert(result.actionAvailable == false),
      assert(battleActorHasCommittedSpellSlotUse(result, Fighter)),
      assert(result.fighter.hp == 12),
      assert(result.goblin.hp == 10),
    }
  }

  run test_fireball_area_save_damage_halves_success_and_spends_slot = {
    val result = resolveFireball(initialState, false, true, 8, true, true)
    all {
      assert(result.actionAvailable == false),
      assert(battleActorHasCommittedSpellSlotUse(result, Fighter)),
      assert(result.fighter.hp == 4),
      assert(result.goblin.hp == 6),
    }
  }

  run test_fireball_empty_area_spends_slot_without_damage = {
    val result = resolveFireballEmptyArea(initialState)
    all {
      assert(result.actionAvailable == false),
      assert(battleActorHasCommittedSpellSlotUse(result, Fighter)),
      assert(result.fighter.hp == 12),
      assert(result.goblin.hp == 10),
    }
  }

  run test_ice_knife_critical_doubles_only_primary_piercing_attack_damage = {
    val noReaction = { ...initialState, goblin: { ...initialState.goblin, reactionAvailable: false } }
    val result = resolveIceKnife(noReaction, 20, 20, 5, false, false, false, 6, true, true)
    all {
      assert(result.actionAvailable == false),
      assert(battleActorHasCommittedSpellSlotUse(result, Fighter)),
      assert(result.attackRollMadeThisTurn),
      assert(result.goblin.hp == 0),
      assert(result.fighter.hp == 12),
    }
  }

  run test_ice_knife_miss_still_resolves_primary_target_burst_save = {
    val failed = resolveIceKnife(initialState, 1, 1, 5, false, false, false, 6, true, true)
    val succeeded = resolveIceKnife(initialState, 1, 1, 5, true, false, false, 6, true, true)
    all {
      assert(failed.actionAvailable == false),
      assert(battleActorHasCommittedSpellSlotUse(failed, Fighter)),
      assert(failed.goblin.hp == 4),
      assert(succeeded.actionAvailable == false),
      assert(battleActorHasCommittedSpellSlotUse(succeeded, Fighter)),
      assert(succeeded.goblin.hp == 10),
    }
  }

  run test_ice_knife_burst_can_include_caster_but_primary_target_is_always_included = {
    val result = resolveIceKnife(initialState, 1, 1, 5, false, true, false, 6, true, true)
    val casterSucceeded = resolveIceKnife(initialState, 1, 1, 5, false, true, true, 6, true, true)
    all {
      assert(result.goblin.hp == 4),
      assert(result.fighter.hp == 6),
      assert(casterSucceeded.goblin.hp == 4),
      assert(casterSucceeded.fighter.hp == 12),
    }
  }

  run test_ice_knife_combines_attack_and_burst_damage_for_concentration = {
    val concentratingGoblin = { ...initialState, goblin: { ...initialState.goblin, concentrating: true, reactionAvailable: false, activeEffects: Set(GuidanceAbilityCheckBonus) } }
    val result = resolveIceKnife(concentratingGoblin, 15, 10, 4, false, false, false, 6, false, true)
    all {
      assert(result.goblin.hp == 0),
      assert(not(result.goblin.concentrating)),
      assert(not(result.goblin.activeEffects.contains(GuidanceAbilityCheckBonus))),
    }
  }

  run test_ice_knife_spell_attack_hit_opens_shield_reaction_before_damage = {
    val awaiting = resolveIceKnife(initialState, 15, 10, 4, false, false, false, 6, true, true)
    all {
      assert(pendingReactionFrame(awaiting.interruptStack[0]) == HasPendingReactionFrame({
        trigger: AttackHit,
        procedure: ShieldReactionProcedure,
        eligibleReactors: Set(Goblin),
        offeredReactors: Set(),
        continuation: ResumeIceKnife,
      })),
      assert(awaiting.goblin.hp == 10),
      assert(awaiting.actionAvailable),
      assert(not(battleActorHasSpellSlotUse(awaiting, Fighter))),
    }
  }

  run test_color_spray_area_save_applies_blinded_and_spends_slot = {
    val result = resolveColorSpray(initialState, false, true)
    val blinded = ColorSprayBlinded({ source: Fighter, expiresAtRound: 2 })
    all {
      assert(result.actionAvailable == false),
      assert(battleActorHasCommittedSpellSlotUse(result, Fighter)),
      assert(result.fighter.activeEffects.contains(blinded)),
      assert(not(result.goblin.activeEffects.contains(blinded))),
    }
  }

  run test_color_spray_blinded_expires_at_end_of_caster_next_turn = {
    val hit = resolveColorSpray(initialState, true, false)
    val afterFighterTurn = endTurn(hit)
    val afterGoblinTurn = endTurn(afterFighterTurn)
    val afterFighterNextTurn = endTurn(afterGoblinTurn)
    val blinded = ColorSprayBlinded({ source: Fighter, expiresAtRound: 2 })
    all {
      assert(hit.goblin.activeEffects.contains(blinded)),
      assert(afterFighterTurn.goblin.activeEffects.contains(blinded)),
      assert(afterGoblinTurn.goblin.activeEffects.contains(blinded)),
      assert(not(afterFighterNextTurn.goblin.activeEffects.contains(blinded))),
    }
  }

  run test_color_spray_empty_area_spends_slot_without_effect = {
    val result = resolveColorSprayEmptyArea(initialState)
    all {
      assert(result.actionAvailable == false),
      assert(battleActorHasCommittedSpellSlotUse(result, Fighter)),
      assert(not(result.fighter.activeEffects.exists(effect => match effect {
        | ColorSprayBlinded(_) => true
        | _ => false
      }))),
      assert(not(result.goblin.activeEffects.exists(effect => match effect {
        | ColorSprayBlinded(_) => true
        | _ => false
      }))),
    }
  }

  run test_faerie_fire_applies_outline_until_concentration_break = {
    val lit = resolveFaerieFire(initialState, true, false)
    val broken = breakConcentrationSpellEffects(lit, Fighter)
    all {
      assert(lit.actionAvailable == false),
      assert(battleActorHasCommittedSpellSlotUse(lit, Fighter)),
      assert(lit.fighter.concentrating),
      assert(not(lit.fighter.activeEffects.contains(FaerieFireOutline))),
      assert(lit.goblin.activeEffects.contains(FaerieFireOutline)),
      assert(faerieFireDimLightRadiusFeet == 10),
      assert(battleRuntimeLightEmitters(lit).contains(SpellLightEmitter({
        source: Fighter,
        sourceSpell: FaerieFire,
        attachment: CombatantLightEmitter({ actor: Goblin }),
        emission: DimLightEmission({ radiusFeet: faerieFireDimLightRadiusFeet }),
        opaqueCoverInteraction: LightEmitterDoesNotBlockOpaqueCover,
        expiresAt: ConcentrationLightEmitterExpiration({ actor: Fighter }),
      }))),
      assert(activeEffectsDenyInvisibleBenefit(lit.goblin.activeEffects)),
      assert(spellAttackRollModeFromActiveEffects(Set(), lit.goblin.activeEffects, true) == AdvantageSpellAttackRoll),
      assert(spellAttackRollModeFromActiveEffects(Set(), lit.goblin.activeEffects, false) == NormalSpellAttackRoll),
      assert(not(broken.goblin.activeEffects.contains(FaerieFireOutline))),
      assert(not(battleRuntimeLightEmitters(broken).contains(SpellLightEmitter({
        source: Fighter,
        sourceSpell: FaerieFire,
        attachment: CombatantLightEmitter({ actor: Goblin }),
        emission: DimLightEmission({ radiusFeet: faerieFireDimLightRadiusFeet }),
        opaqueCoverInteraction: LightEmitterDoesNotBlockOpaqueCover,
        expiresAt: ConcentrationLightEmitterExpiration({ actor: Fighter }),
      })))),
      assert(not(activeEffectsDenyInvisibleBenefit(broken.goblin.activeEffects))),
    }
  }

  run test_faerie_fire_object_outline_until_concentration_break = {
    val lit = resolveFaerieFireWithObjects(initialState, true, true, Set(FaerieFireObjectTarget))
    val broken = breakConcentrationSpellEffects(lit, Fighter)
    all {
      assert(lit.objectOutlines.contains(FaerieFireObjectOutline({ source: Fighter, object: FaerieFireObjectTarget }))),
      assert(battleRuntimeLightEmitters(lit).contains(SpellLightEmitter({
        source: Fighter,
        sourceSpell: FaerieFire,
        attachment: ObjectLightEmitter({ object: FaerieFireObjectTarget }),
        emission: DimLightEmission({ radiusFeet: faerieFireDimLightRadiusFeet }),
        opaqueCoverInteraction: LightEmitterDoesNotBlockOpaqueCover,
        expiresAt: ConcentrationLightEmitterExpiration({ actor: Fighter }),
      }))),
      assert(objectOutlinesDenyInvisibleBenefit(lit.objectOutlines, FaerieFireObjectTarget)),
      assert(battleIlluminationFromLightEmitters(
        battleRuntimeLightEmitters(lit),
        Set(ObjectLightEmitterProjectionFact({
          object: FaerieFireObjectTarget,
          distanceFeet: 10,
          opaqueCover: true,
        }))
      ) == DimLightIllumination),
      assert(spellObjectAttackRollModeFromActiveEffects(Set(), lit.objectOutlines, FaerieFireObjectTarget, true) == AdvantageSpellAttackRoll),
      assert(spellObjectAttackRollModeFromActiveEffects(Set(), lit.objectOutlines, FaerieFireObjectTarget, false) == NormalSpellAttackRoll),
      assert(spellObjectAttackRollModeFromActiveEffects(Set(ViciousMockeryNextAttackDisadvantage), lit.objectOutlines, FaerieFireObjectTarget, true) == NormalSpellAttackRoll),
      assert(not(broken.objectOutlines.contains(FaerieFireObjectOutline({ source: Fighter, object: FaerieFireObjectTarget })))),
      assert(not(battleRuntimeLightEmitters(broken).contains(SpellLightEmitter({
        source: Fighter,
        sourceSpell: FaerieFire,
        attachment: ObjectLightEmitter({ object: FaerieFireObjectTarget }),
        emission: DimLightEmission({ radiusFeet: faerieFireDimLightRadiusFeet }),
        opaqueCoverInteraction: LightEmitterDoesNotBlockOpaqueCover,
        expiresAt: ConcentrationLightEmitterExpiration({ actor: Fighter }),
      })))),
      assert(not(objectOutlinesDenyInvisibleBenefit(broken.objectOutlines, FaerieFireObjectTarget))),
    }
  }

  run test_entangle_excludes_caster_and_applies_restrained_until_concentration_or_escape = {
    val rejectedCasterArea = resolveEntangle(initialState, true, false)
    val entangled = resolveEntangle(initialState, false, false)
    val broken = breakConcentrationSpellEffects(entangled, Fighter)
    val escaped = escapeEntangle({ ...entangled, initiative: { round: 1, alreadyActed: List(Fighter), stillToAct: List(Goblin) }, actionAvailable: true }, true)
    all {
      assert(not(rejectedCasterArea.goblin.activeEffects.contains(EntangleRestrained))),
      assert(entangled.fighter.concentrating),
      assert(entangled.goblin.activeEffects.contains(EntangleRestrained)),
      assert(not(broken.goblin.activeEffects.contains(EntangleRestrained))),
      assert(not(escaped.goblin.activeEffects.contains(EntangleRestrained))),
    }
  }

  run test_charm_person_target_list_slot_scaling_and_damage_break = {
    val failed = resolveTargetListSaveGatedCondition(
      initialState,
      CharmPersonSaveGate,
      1,
      false,
      HumanoidCreature,
      true,
      true,
      HumanoidCreature,
      false,
    )
    val damaged = resolveAttack({ ...failed, actionAvailable: true }, 15, 10, fighterWeaponAttackDamageRoll(1), true)
    val twoTargets = resolveTargetListSaveGatedCondition(
      initialState,
      CharmPersonSaveGate,
      2,
      true,
      HumanoidCreature,
      false,
      true,
      HumanoidCreature,
      false,
    )
    val illegalTwoTargets = resolveTargetListSaveGatedCondition(
      initialState,
      CharmPersonSaveGate,
      1,
      true,
      HumanoidCreature,
      false,
      true,
      HumanoidCreature,
      false,
    )
    all {
      assert(failed.goblin.activeEffects.contains(CharmPersonCharmed({ source: Fighter, durationTicks: charmPersonCharmedDurationTicks }))),
      assert(not(damaged.goblin.activeEffects.contains(CharmPersonCharmed({ source: Fighter, durationTicks: charmPersonCharmedDurationTicks })))),
      assert(twoTargets.fighter.activeEffects.contains(CharmPersonCharmed({ source: Fighter, durationTicks: charmPersonCharmedDurationTicks }))),
      assert(twoTargets.goblin.activeEffects.contains(CharmPersonCharmed({ source: Fighter, durationTicks: charmPersonCharmedDurationTicks }))),
      assert(illegalTwoTargets == initialState),
    }
  }

  run test_sleep_failed_initial_save_adds_pending_repeat_save_until_concentration = {
    val slept = resolveSleepTargetAdmission(initialState, false, false, false)
    val broken = breakConcentrationSpellEffects(slept, Fighter)
    all {
      assert(not(slept.actionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(slept, Fighter)),
      assert(slept.fighter.concentrating),
      assert(slept.goblin.incapacitated),
      assert(slept.goblin.activeEffects.contains(SleepPendingRepeatSave({
        source: Fighter,
        repeatAtActor: Goblin,
        repeatAtRound: 1,
        hadIncapacitated: false,
      }))),
      assert(not(broken.fighter.concentrating)),
      assert(not(broken.goblin.incapacitated)),
      assert(not(sleepRepeatSaveDue(broken.goblin.activeEffects, Goblin, 1))),
    }
  }

  run test_sleep_non_sleeper_and_exhaustion_immunity_auto_success = {
    val nonSleeper = resolveSleepTargetAdmission(initialState, false, true, false)
    val exhaustionImmune = resolveSleepTargetAdmission(initialState, false, false, true)
    all {
      assert(not(nonSleeper.actionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(nonSleeper, Fighter)),
      assert(nonSleeper.fighter.concentrating),
      assert(not(nonSleeper.goblin.incapacitated)),
      assert(not(combatantHasSleepEffect(nonSleeper.goblin))),
      assert(not(exhaustionImmune.actionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(exhaustionImmune, Fighter)),
      assert(exhaustionImmune.fighter.concentrating),
      assert(not(exhaustionImmune.goblin.incapacitated)),
      assert(not(combatantHasSleepEffect(exhaustionImmune.goblin))),
    }
  }

  run test_sleep_repeat_save_success_removes_pending_effect = {
    val slept = resolveSleepTargetAdmission(initialState, false, false, false)
    val goblinTurn = endTurn(slept)
    val repeated = endTurnWithSleepRepeatSave(goblinTurn, true)
    all {
      assert(sleepRepeatSaveHoles(goblinTurn) == Set(SavingThrowOutcome)),
      assert(not(repeated.goblin.incapacitated)),
      assert(not(sleepRepeatSaveDue(repeated.goblin.activeEffects, Goblin, 1))),
    }
  }

  run test_sleep_failed_initial_save_breaks_target_concentration = {
    val concentratingGoblin = {
      ...initialState,
      goblin: { ...initialState.goblin, concentrating: true, activeEffects: Set(GuidanceAbilityCheckBonus) },
    }
    val slept = resolveSleepTargetAdmission(concentratingGoblin, false, false, false)
    all {
      assert(not(slept.goblin.concentrating)),
      assert(not(slept.goblin.activeEffects.contains(GuidanceAbilityCheckBonus))),
      assert(slept.goblin.activeEffects.contains(SleepPendingRepeatSave({
        source: Fighter,
        repeatAtActor: Goblin,
        repeatAtRound: 1,
        hadIncapacitated: false,
      }))),
    }
  }

  run test_sleep_repeat_save_failure_escalates_to_unconscious_until_concentration = {
    val slept = resolveSleepTargetAdmission(initialState, false, false, false)
    val goblinTurn = endTurn(slept)
    val repeated = endTurnWithSleepRepeatSave(goblinTurn, false)
    val broken = breakConcentrationSpellEffects(repeated, Fighter)
    all {
      assert(repeated.goblin.unconscious),
      assert(repeated.goblin.prone),
      assert(not(repeated.goblin.incapacitated)),
      assert(repeated.goblin.activeEffects.contains(SleepUnconscious({
        source: Fighter,
        hadUnconscious: false,
        hadIncapacitated: false,
      }))),
      assert(not(broken.goblin.unconscious)),
      assert(broken.goblin.prone),
      assert(not(broken.goblin.activeEffects.contains(SleepUnconscious({
        source: Fighter,
        hadUnconscious: false,
        hadIncapacitated: false,
      })))),
    }
  }

  run test_sleep_repeat_save_failure_breaks_target_concentration = {
    val slept = resolveSleepTargetAdmission(initialState, false, false, false)
    val goblinTurn = endTurn(slept)
    val concentratingGoblinTurn = {
      ...goblinTurn,
      goblin: { ...goblinTurn.goblin, concentrating: true, activeEffects: goblinTurn.goblin.activeEffects.union(Set(GuidanceAbilityCheckBonus)) },
    }
    val repeated = endTurnWithSleepRepeatSave(concentratingGoblinTurn, false)
    all {
      assert(not(repeated.goblin.concentrating)),
      assert(not(repeated.goblin.activeEffects.contains(GuidanceAbilityCheckBonus))),
      assert(repeated.goblin.activeEffects.contains(SleepUnconscious({
        source: Fighter,
        hadUnconscious: false,
        hadIncapacitated: false,
      }))),
    }
  }

  run test_sleep_damage_ends_pending_sleep_on_target = {
    val slept = resolveSleepTargetAdmission(initialState, false, false, false)
    val damaged = { ...slept, goblin: applyDamageFromSource(slept.goblin, 1, 1, true, OrdinaryDamage, Goblin) }
    all {
      assert(not(damaged.goblin.incapacitated)),
      assert(not(combatantHasSleepEffect(damaged.goblin))),
    }
  }

  run test_sleep_damage_ends_unconscious_sleep_and_leaves_prone = {
    val slept = resolveSleepTargetAdmission(initialState, false, false, false)
    val goblinTurn = endTurn(slept)
    val repeated = endTurnWithSleepRepeatSave(goblinTurn, false)
    val damaged = { ...repeated, goblin: applyDamageFromSource(repeated.goblin, 1, 1, true, OrdinaryDamage, Goblin) }
    all {
      assert(not(damaged.goblin.unconscious)),
      assert(damaged.goblin.prone),
      assert(not(combatantHasSleepEffect(damaged.goblin))),
    }
  }

  run test_hideous_laughter_failed_save_applies_conditions_and_concentration = {
    val laughed = resolveHideousLaughter(initialState, false, 1)
    all {
      assert(laughed.goblin.prone),
      assert(laughed.goblin.incapacitated),
      assert(laughed.fighter.concentrating),
      assert(laughed.goblin.activeEffects.contains(HideousLaughterEffect({
        source: Fighter,
        target: Goblin,
        hadProne: false,
        hadIncapacitated: false,
        durationTicks: hideousLaughterDurationTicks,
      }))),
      assert(hideousLaughterMaxTargets(1) == 1),
      assert(hideousLaughterMaxTargets(2) == 2),
      assert(hideousLaughterDurationTicks == 10),
    }
  }

  run test_hideous_laughter_expires_after_one_minute_duration = {
    val expiring = {
      ...initialState,
      fighter: { ...initialState.fighter, concentrating: true },
      goblin: {
        ...initialState.goblin,
        prone: true,
        incapacitated: true,
        activeEffects: Set(HideousLaughterEffect({
          source: Fighter,
          target: Goblin,
          hadProne: false,
          hadIncapacitated: false,
          durationTicks: 1,
        })),
      },
    }
    val expired = tickRoundDurationSpellEffects(expiring)
    all {
      assert(not(expired.fighter.concentrating)),
      assert(not(expired.goblin.prone)),
      assert(not(expired.goblin.incapacitated)),
      assert(not(combatantHasHideousLaughter(expired.goblin))),
    }
  }

  run test_hideous_laughter_repeat_and_damage_saves_end_effect = {
    val laughed = resolveHideousLaughter(initialState, false, 1)
    val goblinTurn = endTurn(laughed)
    val repeated = endTurnWithHideousLaughterRepeatSave(goblinTurn, true)
    val damaged = combatantAfterHideousLaughterDamageRepeatSave(laughed.goblin, Fighter, Goblin, 1, true)
    all {
      assert(hideousLaughterRepeatSaveHoles(goblinTurn) == Set(SavingThrowOutcome)),
      assert(not(repeated.goblin.prone)),
      assert(not(repeated.goblin.incapacitated)),
      assert(not(combatantHasHideousLaughter(repeated.goblin))),
      assert(hideousLaughterDamageRepeatSaveRollMode(laughed.goblin) == AdvantageSavingThrow),
      assert(not(damaged.prone)),
      assert(not(damaged.incapacitated)),
      assert(not(combatantHasHideousLaughter(damaged))),
    }
  }

  run test_hideous_laughter_suppresses_standing_from_prone = {
    val laughedAtFighter = {
      ...initialState,
      fighter: hideousLaughterTarget(initialState.fighter, Fighter, false, Goblin),
    }
    val stood = standFighterFromProne(laughedAtFighter)
    assert(stood == laughedAtFighter)
  }

  run test_sleep_adjacent_action_shakes_target_awake = {
    val slept = resolveSleepTargetAdmission(initialState, false, false, false)
    val nextRoundFighterTurn = {
      ...slept,
      initiative: { round: 2, alreadyActed: List(), stillToAct: List(Fighter, Goblin) },
      actionAvailable: true,
    }
    val shaken = shakeAwakeFromSleep(nextRoundFighterTurn, Goblin, true)
    val notAdjacent = shakeAwakeFromSleep(nextRoundFighterTurn, Goblin, false)
    all {
      assert(not(shaken.actionAvailable)),
      assert(not(shaken.goblin.incapacitated)),
      assert(not(combatantHasSleepEffect(shaken.goblin))),
      assert(notAdjacent == nextRoundFighterTurn),
    }
  }

  run test_poison_spray_applies_poison_spell_attack_damage = {
    val noReaction = { ...initialState, goblin: { ...initialState.goblin, reactionAvailable: false } }
    val result = resolvePoisonSpray(noReaction, 15, 10, 7, true)
    all {
      assert(result.actionAvailable == false),
      assert(result.goblin.hp == 3),
      assert(not(battleActorHasSpellSlotUse(result, Fighter))),
    }
  }

  run test_chill_touch_applies_necrotic_spell_attack_damage = {
    val noReaction = { ...initialState, goblin: { ...initialState.goblin, reactionAvailable: false } }
    val result = resolveChillTouch(noReaction, 15, 10, 6, true)
    all {
      assert(result.actionAvailable == false),
      assert(result.goblin.hp == 4),
      assert(result.goblin.activeEffects.contains(ChillTouchHitPointRegainPrevented({ source: Fighter, expiresAtRound: 2 }))),
      assert(not(battleActorHasSpellSlotUse(result, Fighter))),
    }
  }

  run test_chill_touch_prevents_hit_point_regain_until_end_of_caster_next_turn = {
    val noReaction = { ...initialState, goblin: { ...initialState.goblin, hp: 6, reactionAvailable: false } }
    val hit = resolveChillTouch(noReaction, 15, 10, 3, true)
    val blockedHealing = applyHealing(hit.goblin, 5)
    val afterGoblinTurn = endTurn(endTurn(hit))
    val afterFighterNextTurn = endTurn(afterGoblinTurn)
    all {
      assert(hit.goblin.hp == 3),
      assert(blockedHealing.hp == 3),
      assert(afterGoblinTurn.goblin.activeEffects.contains(ChillTouchHitPointRegainPrevented({ source: Fighter, expiresAtRound: 2 }))),
      assert(not(afterFighterNextTurn.goblin.activeEffects.exists(effect => match effect {
        | ChillTouchHitPointRegainPrevented(_) => true
        | _ => false
      }))),
      assert(applyHealing(afterFighterNextTurn.goblin, 5).hp == 8),
    }
  }

  run test_starry_wisp_dim_light_emitter_expires_at_end_of_caster_next_turn = {
    val hit = applyStarryWispDimLightEmitter(initialState, Fighter, CombatantLightEmitter({ actor: Goblin }))
    val afterFighterTurn = endTurn(hit)
    val afterGoblinTurn = endTurn(afterFighterTurn)
    val afterFighterNextTurn = endTurn(afterGoblinTurn)
    val emitter = starryWispDimLightEmitter(initialState, Fighter, CombatantLightEmitter({ actor: Goblin }))
    all {
      assert(hit.lightEmitters.contains(emitter)),
      assert(afterFighterTurn.lightEmitters.contains(emitter)),
      assert(afterGoblinTurn.lightEmitters.contains(emitter)),
      assert(not(afterFighterNextTurn.lightEmitters.contains(emitter))),
    }
  }

  run test_starry_wisp_invisible_benefit_denial_expires_at_end_of_caster_next_turn = {
    val hitGoblin = applyStarryWispInvisibleBenefitDenied(initialState, initialState.goblin, Fighter)
    val hit = { ...initialState, goblin: hitGoblin }
    val afterFighterTurn = endTurn(hit)
    val afterGoblinTurn = endTurn(afterFighterTurn)
    val afterFighterNextTurn = endTurn(afterGoblinTurn)
    val effect = StarryWispInvisibleBenefitDenied({ source: Fighter, expiresAtRound: 2 })
    all {
      assert(hit.goblin.activeEffects.contains(effect)),
      assert(activeEffectsDenyInvisibleBenefit(hit.goblin.activeEffects)),
      assert(afterFighterTurn.goblin.activeEffects.contains(effect)),
      assert(afterGoblinTurn.goblin.activeEffects.contains(effect)),
      assert(not(afterFighterNextTurn.goblin.activeEffects.contains(effect))),
      assert(not(activeEffectsDenyInvisibleBenefit(afterFighterNextTurn.goblin.activeEffects))),
    }
  }

  run test_starry_wisp_object_invisible_benefit_denial_projects_from_light_emitter = {
    val hit = applyStarryWispDimLightEmitter(initialState, Fighter, ObjectLightEmitter({ object: StarryWispObjectTarget }))
    val miss = initialState
    val afterFighterTurn = endTurn(hit)
    val afterGoblinTurn = endTurn(afterFighterTurn)
    val afterFighterNextTurn = endTurn(afterGoblinTurn)
    all {
      assert(objectInvisibleBenefitDenied(hit, StarryWispObjectTarget)),
      assert(not(objectInvisibleBenefitDenied(miss, StarryWispObjectTarget))),
      assert(objectInvisibleBenefitDenied(afterFighterTurn, StarryWispObjectTarget)),
      assert(objectInvisibleBenefitDenied(afterGoblinTurn, StarryWispObjectTarget)),
      assert(not(objectInvisibleBenefitDenied(afterFighterNextTurn, StarryWispObjectTarget))),
      assert(hit.objectOutlines == Set()),
    }
  }

  run test_eldritch_blast_resolves_two_independent_force_beams = {
    val result = resolveEldritchBlastTwoBeams(initialState, 15, 10, 4, true, 1, 1, 6, true)
    val twoHits = resolveEldritchBlastTwoBeams(initialState, 15, 10, 4, true, 16, 11, 6, true)
    all {
      assert(result.actionAvailable == false),
      assert(result.goblin.hp == 6),
      assert(not(battleActorHasSpellSlotUse(result, Fighter))),
      assert(twoHits.actionAvailable == false),
      assert(twoHits.goblin.hp == 0),
      assert(not(battleActorHasSpellSlotUse(twoHits, Fighter))),
    }
  }

  run test_sacred_flame_applies_radiant_damage_only_on_failed_saving_throw = {
    val failed = resolveSacredFlame(initialState, false, 7, true)
    val succeeded = resolveSacredFlame(initialState, true, 7, true)
    all {
      assert(failed.actionAvailable == false),
      assert(failed.goblin.hp == 3),
      assert(not(battleActorHasSpellSlotUse(failed, Fighter))),
      assert(succeeded.actionAvailable == false),
      assert(succeeded.goblin.hp == 10),
      assert(not(battleActorHasSpellSlotUse(succeeded, Fighter))),
    }
  }

  run test_inflict_wounds_spends_slot_and_halves_damage_on_successful_saving_throw = {
    val failed = resolveInflictWounds(initialState, false, 10, true)
    val succeeded = resolveInflictWounds(initialState, true, 10, true)
    val alreadySpent = commitActorSpellSlotUse(initialState, Fighter)
    all {
      assert(failed.actionAvailable == false),
      assert(failed.goblin.hp == 0),
      assert(battleActorHasCommittedSpellSlotUse(failed, Fighter)),
      assert(succeeded.actionAvailable == false),
      assert(succeeded.goblin.hp == 5),
      assert(battleActorHasCommittedSpellSlotUse(succeeded, Fighter)),
      assert(resolveInflictWounds(alreadySpent, false, 10, true) == alreadySpent),
    }
  }

  run test_evasion_style_save_damage_replacement = {
    all {
      assert(dexHalfSaveDamageAfterReplacement(6, true, true) == 0),
      assert(dexHalfSaveDamageAfterReplacement(6, false, true) == 3),
      assert(dexHalfSaveDamageAfterReplacement(6, true, false) == 3),
      assert(dexHalfSaveDamageAfterReplacement(6, false, false) == 6),
    }
  }

  run test_critical_hit_applies_doubled_damage_dice = {
    val result = resolveAttack(initialState, 20, 20, fighterWeaponAttackDamageRoll(9), true)
    all {
      assert(result.actionAvailable == false),
      assert(result.goblin.hp == 0),
    }
  }

  run test_authored_critical_range_19_weapon_attack_crits_on_natural_19 = {
    val result = resolveAttack(withFighterImprovedCriticalRange19(initialState), 1, 19, fighterWeaponAttackDamageRoll(1), true)
    all {
      assert(result.actionAvailable == false),
      assert(result.goblin.hp == 6),
    }
  }

  run test_default_critical_range_20_weapon_attack_does_not_crit_on_natural_19 = {
    val result = resolveAttack(initialState, 1, 19, fighterWeaponAttackDamageRoll(9), true)
    all {
      assert(result.actionAvailable == false),
      assert(result.goblin.hp == 10),
    }
  }

  run test_authored_critical_range_keeps_natural_1_auto_miss = {
    val result = resolveAttack(withFighterImprovedCriticalRange19(initialState), 99, 1, fighterWeaponAttackDamageRoll(9), true)
    all {
      assert(result.actionAvailable == false),
      assert(result.goblin.hp == 10),
    }
  }

  run test_weapon_mastery_sap_applies_next_attack_disadvantage_on_selected_sap_weapon_hit = {
    val mastered = { ...initialState, fighterLongswordSapMastery: true }
    val hit = resolveAttack(mastered, 15, 10, fighterWeaponAttackDamageRoll(1), true)
    val goblinTurn = endTurn(hit)
    val fighterNextTurn = endTurn(goblinTurn)
    all {
      assert(hit.goblin.activeEffects.contains(WeaponMasterySapNextAttackDisadvantage({ source: Fighter }))),
      assert(spellAttackRollModeFromActiveEffects(hit.goblin.activeEffects, Set(), true) == DisadvantageSpellAttackRoll),
      assert(goblinTurn.goblin.activeEffects.contains(WeaponMasterySapNextAttackDisadvantage({ source: Fighter }))),
      assert(not(fighterNextTurn.goblin.activeEffects.contains(WeaponMasterySapNextAttackDisadvantage({ source: Fighter })))),
    }
  }

  run test_weapon_mastery_sap_start_turn_expiry_preserves_non_active_combatant_effects = {
    val goblinTurn = endTurn(initialState)
    val primed = {
      ...goblinTurn,
      goblin: {
        ...goblinTurn.goblin,
        activeEffects: Set(
          ShieldArmorClassBonus,
          ResistanceDamageReduction({ damageType: Piercing, usedThisTurn: true }),
          JumpMovementReplacement({ durationTicks: 10, usedThisTurn: true }),
          WeaponMasterySapNextAttackDisadvantage({ source: Fighter })
        ),
      },
    }
    val fighterNextTurn = endTurn(primed)
    all {
      assert(not(fighterNextTurn.goblin.activeEffects.contains(WeaponMasterySapNextAttackDisadvantage({ source: Fighter })))),
      assert(fighterNextTurn.goblin.activeEffects.contains(ShieldArmorClassBonus)),
      assert(fighterNextTurn.goblin.activeEffects.contains(ResistanceDamageReduction({ damageType: Piercing, usedThisTurn: true }))),
      assert(fighterNextTurn.goblin.activeEffects.exists(effect => match effect {
        | JumpMovementReplacement(data) => data.usedThisTurn
        | _ => false
      })),
    }
  }

  run test_weapon_mastery_sap_is_gated_by_hit_and_selected_weapon_mastery = {
    val notMasteredHit = resolveAttack(initialState, 15, 10, fighterWeaponAttackDamageRoll(1), true)
    val masteredMiss = resolveAttack({ ...initialState, fighterLongswordSapMastery: true }, 1, 1, fighterWeaponAttackDamageRoll(1), true)
    all {
      assert(not(notMasteredHit.goblin.activeEffects.exists(effect => match effect {
        | WeaponMasterySapNextAttackDisadvantage(_) => true
        | _ => false
      }))),
      assert(not(masteredMiss.goblin.activeEffects.exists(effect => match effect {
        | WeaponMasterySapNextAttackDisadvantage(_) => true
        | _ => false
      }))),
    }
  }

  run test_weapon_mastery_topple_save_dc_uses_attack_ability_modifier_and_proficiency_bonus = {
    assert(weaponMasteryToppleSaveDc(3, 2) == 13)
  }

  run test_weapon_mastery_topple_applies_prone_on_selected_topple_weapon_failed_save = {
    val mastered = { ...initialState, fighterQuarterstaffToppleMastery: true }
    val failed = resolveAttackWithToppleChoice(mastered, 15, 10, fighterWeaponAttackDamageRoll(1), true, true, false)
    val succeeded = resolveAttackWithToppleChoice(mastered, 15, 10, fighterWeaponAttackDamageRoll(1), true, true, true)
    val declined = resolveAttackWithToppleChoice(mastered, 15, 10, fighterWeaponAttackDamageRoll(1), true, false, false)
    all {
      assert(failed.goblin.prone),
      assert(not(succeeded.goblin.prone)),
      assert(not(declined.goblin.prone)),
    }
  }

  run test_weapon_mastery_topple_is_gated_by_hit_and_selected_weapon_mastery = {
    val notMasteredHit = resolveAttackWithToppleChoice(initialState, 15, 10, fighterWeaponAttackDamageRoll(1), true, true, false)
    val masteredMiss = resolveAttackWithToppleChoice({ ...initialState, fighterQuarterstaffToppleMastery: true }, 1, 1, fighterWeaponAttackDamageRoll(1), true, true, false)
    all {
      assert(not(notMasteredHit.goblin.prone)),
      assert(not(masteredMiss.goblin.prone)),
    }
  }

  run test_weapon_mastery_cleave_applies_second_hit_weapon_damage_without_positive_ability_modifier = {
    val mastered = { ...initialState, fighterGreataxeCleaveMastery: true }
    val result = resolveAttackWithCleaveChoice(mastered, 15, 10, fighterWeaponAttackDamageRoll(1), true, true, true, 15, 10, 4, 3)
    all {
      assert(result.goblin.hp == 2),
      assert(result.fighterCleaveExtraAttackUsedThisTurn),
    }
  }

  run test_weapon_mastery_cleave_preserves_negative_ability_modifier = {
    val mastered = { ...initialState, fighterGreataxeCleaveMastery: true }
    val result = resolveAttackWithCleaveChoice(mastered, 15, 10, fighterWeaponAttackDamageRoll(4), true, true, true, 15, 10, 4, -1)
    assert(result.goblin.hp == 0)
  }

  run test_weapon_mastery_cleave_is_gated_by_hit_eligibility_and_once_per_turn = {
    val mastered = { ...initialState, fighterGreataxeCleaveMastery: true }
    val notMastered = resolveAttackWithCleaveChoice(initialState, 15, 10, fighterWeaponAttackDamageRoll(1), true, true, true, 15, 10, 4, 3)
    val primaryMiss = resolveAttackWithCleaveChoice(mastered, 1, 1, fighterWeaponAttackDamageRoll(1), true, true, true, 15, 10, 4, 3)
    val ineligibleSecondTarget = resolveAttackWithCleaveChoice(mastered, 15, 10, fighterWeaponAttackDamageRoll(1), true, true, false, 15, 10, 4, 3)
    val alreadyUsed = resolveAttackWithCleaveChoice({ ...mastered, fighterCleaveExtraAttackUsedThisTurn: true }, 15, 10, fighterWeaponAttackDamageRoll(1), true, true, true, 15, 10, 4, 3)
    all {
      assert(notMastered.goblin.hp == 6),
      assert(primaryMiss.goblin.hp == 10),
      assert(ineligibleSecondTarget.goblin.hp == 6),
      assert(alreadyUsed.goblin.hp == 6),
    }
  }

  run test_temporary_hp_absorbs_damage_before_hp = {
    val result = resolveAttack(withGoblinHp(initialState, 10, 5), 15, 10, fighterWeaponAttackDamageRoll(4), true)
    all {
      assert(result.goblin.tempHp == 0),
      assert(result.goblin.hp == 8),
    }
  }

  run test_hp_clamps_to_zero_and_monster_dies = {
    val result = resolveAttack(withGoblinHp(initialState, 3, 0), 15, 10, fighterWeaponAttackDamageRoll(8), true)
    all {
      assert(result.goblin.hp == 0),
      assert(result.goblin.lifecycle == DiesAtZeroHp),
    }
  }

  run test_character_drop_to_zero_uses_death_saving_throw_lifecycle = {
    val result = applyDamage(withFighterHp(initialState, 3, 0).fighter, 11, 1, true)
    all {
      assert(result.hp == 0),
      assert(result.unconscious),
      assert(result.deathFailures == 0),
      assert(result.lifecycle == UsesDeathSavingThrows),
    }
  }

  run test_melee_knock_out_leaves_stat_block_at_one_hp_unconscious = {
    val result = resolveAttackKnockOut(withGoblinHp(initialState, 3, 0), 15, 10, fighterWeaponAttackDamageRoll(8), true)
    all {
      assert(result.goblin.hp == 1),
      assert(result.goblin.unconscious),
      assert(result.goblin.knockedOut),
      assert(result.goblin.lifecycle == DiesAtZeroHp),
    }
  }

  run test_melee_knock_out_leaves_character_at_one_hp_unconscious = {
    val result = applyDamageWithDisposition(withFighterHp(initialState, 3, 0).fighter, 8, 1, true, KnockOut)
    all {
      assert(result.hp == 1),
      assert(result.unconscious),
      assert(result.knockedOut),
      assert(result.lifecycle == UsesDeathSavingThrows),
      assert(result.deathFailures == 0),
    }
  }

  run test_healing_knock_out_recovery_ends_unconscious = {
    val knockedOut = applyDamageWithDisposition(withFighterHp(initialState, 3, 0).fighter, 8, 1, true, KnockOut)
    val result = applyHealing(knockedOut, 4)
    all {
      assert(result.hp == 5),
      assert(not(result.unconscious)),
      assert(not(result.knockedOut)),
    }
  }

  run test_massive_damage_kills_character_on_drop_to_zero = {
    val result = applyDamage(withFighterHp(initialState, 3, 0).fighter, 19, 2, true)
    all {
      assert(result.hp == 0),
      assert(result.unconscious),
      assert(result.deathFailures == 3),
    }
  }

  run test_character_damage_at_zero_adds_one_death_failure = {
    val result = applyDamage(withFighterHp(initialState, 0, 0).fighter, 7, 1, true)
    all {
      assert(result.hp == 0),
      assert(result.unconscious),
      assert(result.deathFailures == 1),
    }
  }

  run test_character_critical_damage_at_zero_adds_two_death_failures = {
    val result = applyDamage(withFighterHp(initialState, 0, 0).fighter, 7, 2, true)
    all {
      assert(result.hp == 0),
      assert(result.unconscious),
      assert(result.deathFailures == 2),
    }
  }

  run test_character_temporary_hp_at_zero_absorbs_damage_before_death_failures = {
    val absorbed = applyDamage(withFighterHp(initialState, 0, 5).fighter, 4, 2, true)
    val overflow = applyDamage(withFighterHp(initialState, 0, 5).fighter, 7, 2, true)
    all {
      assert(absorbed.hp == 0),
      assert(absorbed.tempHp == 1),
      assert(absorbed.deathFailures == 0),
      assert(absorbed.unconscious),
      assert(overflow.hp == 0),
      assert(overflow.tempHp == 0),
      assert(overflow.deathFailures == 2),
      assert(overflow.unconscious),
    }
  }

  run test_massive_damage_at_zero_kills_character = {
    val result = applyDamage(withFighterHp(initialState, 0, 0).fighter, 13, 2, true)
    all {
      assert(result.hp == 0),
      assert(result.unconscious),
      assert(result.deathFailures == 3),
    }
  }

  run test_start_turn_death_save_failure_adds_one_failure = {
    val result = endTurnWithDeathSave(withFighterHp(endTurn(initialState), 0, 0), 5)
    all {
      assert(currentActor(result) == Fighter),
      assert(result.fighter.hp == 0),
      assert(result.fighter.unconscious),
      assert(result.fighter.deathFailures == 1),
    }
  }

  run test_start_turn_death_save_success_three_stabilizes = {
    val fighter = { ...withFighterHp(initialState, 0, 0).fighter, unconscious: true, deathSuccesses: 2, deathFailures: 1 }
    val result = endTurnWithDeathSave({ ...endTurn(initialState), fighter: fighter }, 10)
    all {
      assert(result.fighter.hp == 0),
      assert(result.fighter.unconscious),
      assert(result.fighter.stable),
      assert(result.fighter.deathSuccesses == 0),
      assert(result.fighter.deathFailures == 0),
    }
  }

  run test_start_turn_death_save_natural_twenty_restores_one_hp = {
    val fighter = { ...withFighterHp(initialState, 0, 0).fighter, deathSuccesses: 1, deathFailures: 2 }
    val result = endTurnWithDeathSave({ ...endTurn(initialState), fighter: fighter }, 20)
    all {
      assert(result.fighter.hp == 1),
      assert(not(result.fighter.unconscious)),
      assert(not(result.fighter.stable)),
      assert(result.fighter.deathSuccesses == 0),
      assert(result.fighter.deathFailures == 0),
    }
  }

  run test_spare_the_dying_makes_zero_hp_non_dead_character_stable = {
    val fighter = { ...withFighterHp(initialState, 0, 0).fighter, unconscious: true, deathSuccesses: 2, deathFailures: 1 }
    val result = applySpareTheDying(fighter)
    all {
      assert(result.hp == 0),
      assert(result.unconscious),
      assert(result.stable),
      assert(result.deathSuccesses == 0),
      assert(result.deathFailures == 0),
      assert(spellInvocationSpendsSpellSlot(SpareTheDying) == false),
    }
  }

  run test_spare_the_dying_rejects_dead_and_nonzero_targets = {
    val dead = { ...withFighterHp(initialState, 0, 0).fighter, deathFailures: 3 }
    all {
      assert(not(spareTheDyingTargetAdmitted(withFighterHp(initialState, 5, 0).fighter))),
      assert(not(spareTheDyingTargetAdmitted(dead))),
      assert(not(spareTheDyingTargetAdmitted(withGoblinHp(initialState, 0, 0).goblin))),
      assert(applySpareTheDying(dead) == dead),
    }
  }

  run test_spare_the_dying_range_scales_by_character_level = {
    all {
      assert(spareTheDyingRangeFeet(1) == 15),
      assert(spareTheDyingRangeFeet(5) == 30),
      assert(spareTheDyingRangeFeet(11) == 60),
      assert(spareTheDyingRangeFeet(17) == 120),
    }
  }

  run test_end_turn_advances_current_actor_and_resets_resources = {
    val result = endTurn({
      ...initialState,
      actionAvailable: false,
      bonusActionAvailable: false,
      dashMovementBonus: 30,
      disengaged: true,
      goblin: {
        ...initialState.goblin,
        reactionAvailable: false,
        movementSpent: 20,
        dodging: true,
      },
    })
    all {
      assert(currentActor(result) == Goblin),
      assert(result.initiative.round == 1),
      assert(result.actionAvailable),
      assert(result.bonusActionAvailable),
      assert(result.goblin.reactionAvailable),
      assert(result.goblin.movementSpent == 0),
      assert(not(result.goblin.dodging)),
      assert(result.dashMovementBonus == 0),
      assert(not(result.disengaged)),
    }
  }

  run test_end_turn_wraps_to_next_round = {
    val result = endTurn(endTurn(initialState))
    all {
      assert(currentActor(result) == Fighter),
      assert(result.initiative.round == 2),
      assert(result.initiative.alreadyActed == []),
      assert(result.initiative.stillToAct == [Fighter, Goblin]),
    }
  }

  run test_mage_armor_sets_base_ac_plus_dex = {
    all {
      assert(activeEffectArmorClass(10, 2, Set(mageArmorActiveEffect(mageArmorDurationTicks))) == 15),
      assert(activeEffectArmorClass(10, 2, Set(RayOfFrostSpeedDelta)) == 10),
    }
  }

  run test_armor_of_shadows_mage_armor_spends_action_not_spell_slot = {
    val result = resolveArmorOfShadowsMageArmor(initialState)
    all {
      assert(result.fighter.activeEffects.contains(mageArmorActiveEffect(mageArmorDurationTicks))),
      assert(not(result.actionAvailable)),
      assert(not(battleActorHasSpellSlotUse(result, Fighter))),
    }
  }

  run test_armor_of_shadows_mage_armor_rejects_heavy_armored_self = {
    val armored = { ...initialState, fighter: { ...initialState.fighter, wearingHeavyArmor: true } }
    val result = resolveArmorOfShadowsMageArmor(armored)
    all {
      assert(not(activeEffectsContainMageArmor(result.fighter.activeEffects))),
      assert(result.actionAvailable),
      assert(not(battleActorHasSpellSlotUse(result, Fighter))),
    }
  }

  run test_armor_of_shadows_mage_armor_replaces_existing_effect_duration = {
    val protected = { ...initialState, fighter: { ...initialState.fighter, activeEffects: Set(mageArmorActiveEffect(1)) } }
    val result = resolveArmorOfShadowsMageArmor(protected)
    all {
      assert(result.fighter.activeEffects == Set(mageArmorActiveEffect(mageArmorDurationTicks))),
      assert(not(result.actionAvailable)),
      assert(not(battleActorHasSpellSlotUse(result, Fighter))),
    }
  }

  run test_mage_armor_expires_after_duration_tick = {
    val nearlyExpired = {
      ...resolveArmorOfShadowsMageArmor(initialState),
      fighter: {
        ...initialState.fighter,
        activeEffects: Set(mageArmorActiveEffect(1)),
      },
    }
    val stillSameRound = endTurn(nearlyExpired)
    val nextRound = endTurn(stillSameRound)
    all {
      assert(activeEffectsContainMageArmor(stillSameRound.fighter.activeEffects)),
      assert(activeEffectsMageArmorDurationTicks(stillSameRound.fighter.activeEffects) == 1),
      assert(not(activeEffectsContainMageArmor(nextRound.fighter.activeEffects))),
      assert(combatantArmorClass(stillSameRound.fighter) == 13),
      assert(combatantArmorClass(nextRound.fighter) == 10),
    }
  }

  run test_scalar_buff_longstrider_targets_selected_creature = {
    val result = resolveScalarBuffSpell(initialState, LongstriderScalarBuff, Set(Goblin), 1, 0)
    all {
      assert(not(result.fighter.activeEffects.contains(LongstriderSpeedDelta))),
      assert(result.goblin.activeEffects.contains(LongstriderSpeedDelta)),
      assert(movementSpeed(result.goblin, WalkSpeedKind) == 40),
    }
  }

  run test_scalar_buff_shield_of_faith_targets_selected_creature_and_uses_concentration = {
    val result = resolveScalarBuffSpell(initialState, ShieldOfFaithScalarBuff, Set(Goblin), 1, 0)
    all {
      assert(result.fighter.concentrating),
      assert(not(result.fighter.activeEffects.contains(ShieldOfFaithArmorClassBonus))),
      assert(result.goblin.activeEffects.contains(ShieldOfFaithArmorClassBonus)),
      assert(combatantArmorClass(result.goblin) == 17),
    }
  }

  run test_heroism_stores_distinct_immunity_and_turn_start_temporary_hit_points = {
    val result = resolveHeroismSpell(initialState, Set(Fighter), 1, 3)
    all {
      assert(result.fighter.concentrating),
      assert(result.fighter.activeEffects.contains(HeroismFrightenedImmunity)),
      assert(result.fighter.activeEffects.contains(HeroismTurnStartTemporaryHitPoints({ amount: 3 }))),
      assert(result.fighter.tempHp == 0),
      assert(endTurn(endTurn(result)).fighter.tempHp == 3),
    }
  }

  run test_heroism_slot_level_controls_target_count_and_concentration_cleanup = {
    val hostile = resolveHeroismSpell(initialState, Set(Goblin), 1, 3)
    val invalidCount = resolveHeroismSpell(initialState, Set(Fighter, Goblin), 1, 3)
    val invalidWilling = resolveHeroismSpell(initialState, Set(Fighter, Goblin), 2, 3)
    val valid = resolveHeroismSpell(initialState, Set(Fighter), 1, 3)
    val broken = breakConcentration({ ...valid.fighter, activeEffects: valid.fighter.activeEffects.union(Set(HeroismTurnStartTemporaryHitPoints({ amount: 5 }))) })
    all {
      assert(hostile == initialState),
      assert(invalidCount == initialState),
      assert(invalidWilling == initialState),
      assert(valid.fighter.activeEffects.contains(HeroismFrightenedImmunity)),
      assert(valid.fighter.activeEffects.contains(HeroismTurnStartTemporaryHitPoints({ amount: 3 }))),
      assert(not(broken.activeEffects.contains(HeroismFrightenedImmunity))),
      assert(not(broken.activeEffects.exists(effect => match effect {
        | HeroismTurnStartTemporaryHitPoints(_) => true
        | _ => false
      }))),
    }
  }

  run test_expeditious_retreat_immediate_dash_spends_bonus_action_and_slot = {
    val result = resolveExpeditiousRetreatDash(initialState, WalkSpeedKind)
    all {
      assert(result.actionAvailable),
      assert(not(result.bonusActionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(result, Fighter)),
      assert(result.dashMovementBonus == 30),
      assert(movementRemainingForFighterWithSpeedKind(result, WalkSpeedKind) == 60),
      assert(result.fighter.concentrating),
      assert(result.fighter.activeEffects.contains(ExpeditiousRetreatDashBonusAction)),
    }
  }

  run test_expeditious_retreat_later_bonus_action_dash_uses_existing_dash_budget = {
    val cast = resolveExpeditiousRetreatDash(initialState, WalkSpeedKind)
    val nextFighterTurn = endTurn(endTurn(cast))
    val dashed = expeditiousRetreatBonusActionDashFighter(nextFighterTurn, WalkSpeedKind)
    all {
      assert(dashed.actionAvailable),
      assert(not(dashed.bonusActionAvailable)),
      assert(dashed.dashMovementBonus == 30),
      assert(movementRemainingForFighterWithSpeedKind(dashed, WalkSpeedKind) == 60),
      assert(dashed.fighter.activeEffects.contains(ExpeditiousRetreatDashBonusAction)),
    }
  }

  run test_expeditious_retreat_concentration_cleanup_removes_bonus_action_dash_permission = {
    val cast = resolveExpeditiousRetreatDash(initialState, WalkSpeedKind)
    val broken = { ...cast, fighter: breakConcentration(cast.fighter) }
    val nextFighterTurn = endTurn(endTurn(broken))
    val attempted = expeditiousRetreatBonusActionDashFighter(nextFighterTurn, WalkSpeedKind)
    all {
      assert(not(broken.fighter.concentrating)),
      assert(not(broken.fighter.activeEffects.contains(ExpeditiousRetreatDashBonusAction))),
      assert(attempted == nextFighterTurn),
    }
  }

  run test_jump_movement_replacement_cast_targets_and_slot_scaling = {
    val firstSlot = resolveJumpMovementReplacementSpell(initialState, Set(Fighter), Set(Fighter), 1)
    val secondSlot = resolveJumpMovementReplacementSpell(initialState, Set(Fighter, Goblin), Set(Fighter, Goblin), 2)
    val unwillingTarget = resolveJumpMovementReplacementSpell(initialState, Set(Fighter, Goblin), Set(Fighter), 2)
    val tooMany = resolveJumpMovementReplacementSpell(initialState, Set(Fighter, Goblin), Set(Fighter, Goblin), 1)
    all {
      assert(not(firstSlot.bonusActionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(firstSlot, Fighter)),
      assert(firstSlot.fighter.activeEffects.contains(JumpMovementReplacement({ durationTicks: 10, usedThisTurn: false }))),
      assert(secondSlot.fighter.activeEffects.contains(JumpMovementReplacement({ durationTicks: 10, usedThisTurn: false }))),
      assert(secondSlot.goblin.activeEffects.contains(JumpMovementReplacement({ durationTicks: 10, usedThisTurn: false }))),
      assert(unwillingTarget == initialState),
      assert(tooMany == initialState),
    }
  }

  run test_feather_fall_reaction_targets_slot_and_descent_cap = {
    val resolved = resolveFeatherFallSpell(initialState, Fighter, Set(Fighter, Goblin), Set(Fighter, Goblin), 2)
    val noReaction = resolveFeatherFallSpell({ ...initialState, fighter: { ...initialState.fighter, reactionAvailable: false } }, Fighter, Set(Fighter), Set(Fighter), 1)
    val nonFallingTarget = resolveFeatherFallSpell(initialState, Fighter, Set(Fighter, Goblin), Set(Fighter), 2)
    val tooMany = resolveFeatherFallSpell(initialState, Fighter, Set(Fighter, Goblin), Set(Fighter, Goblin), 6)
    val goblinTurnSpentSlot = commitActorSpellSlotUse(endTurn(initialState), Goblin)
    val offTurnResolved = resolveFeatherFallSpell(goblinTurnSpentSlot, Fighter, Set(Fighter), Set(Fighter), 1)
    all {
      assert(not(resolved.fighter.reactionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Fighter)),
      assert(resolved.fighter.activeEffects.contains(FeatherFallMitigation({ durationTicks: 10 }))),
      assert(resolved.goblin.activeEffects.contains(FeatherFallMitigation({ durationTicks: 10 }))),
      assert(activeFeatherFallDescentRateCapFeetPerRound(resolved.fighter.activeEffects) == 60),
      assert(noReaction == { ...initialState, fighter: { ...initialState.fighter, reactionAvailable: false } }),
      assert(nonFallingTarget == initialState),
      assert(tooMany == initialState),
      assert(battleActorHasCommittedSpellSlotUse(offTurnResolved, Goblin)),
      assert(battleActorHasCommittedSpellSlotUse(offTurnResolved, Fighter)),
    }
  }

  run test_feather_fall_landing_cleanup_prevents_falling_outcomes = {
    val resolved = resolveFeatherFallSpell(initialState, Fighter, Set(Fighter, Goblin), Set(Fighter, Goblin), 2)
    val fighterLanding = resolveFeatherFallLanding(resolved, Fighter)
    val fighterLandingState = featherFallLandingState(fighterLanding)
    val staleLanding = resolveFeatherFallLanding(fighterLandingState, Fighter)
    val staleLandingState = featherFallLandingState(staleLanding)
    val unaffectedLanding = resolveFeatherFallLanding(initialState, Goblin)
    val unaffectedLandingState = featherFallLandingState(unaffectedLanding)
    all {
      assert(featherFallLandingFallDamagePrevented(fighterLanding)),
      assert(featherFallLandingFallingPronePrevented(fighterLanding)),
      assert(not(fighterLandingState.fighter.activeEffects.contains(FeatherFallMitigation({ durationTicks: 10 })))),
      assert(fighterLandingState.goblin.activeEffects.contains(FeatherFallMitigation({ durationTicks: 10 }))),
      assert(not(fighterLandingState.fighter.prone)),
      assert(not(featherFallLandingFallDamagePrevented(staleLanding))),
      assert(not(featherFallLandingFallingPronePrevented(staleLanding))),
      assert(staleLandingState == fighterLandingState),
      assert(not(featherFallLandingFallDamagePrevented(unaffectedLanding))),
      assert(not(featherFallLandingFallingPronePrevented(unaffectedLanding))),
      assert(unaffectedLandingState == initialState),
    }
  }

  run test_jump_movement_replacement_spends_ten_movement_once_per_target_turn = {
    val cast = resolveJumpMovementReplacementSpell(initialState, Set(Fighter), Set(Fighter), 1)
    val jumped = jumpMovementReplacementFighter(cast, 10, 30, JumpLegalLandingNoCheck)
    val secondSameTurn = jumpMovementReplacementFighter(jumped, 10, 30, JumpLegalLandingNoCheck)
    val nextFighterTurn = endTurn(endTurn(jumped))
    val nextTurnJumped = jumpMovementReplacementFighter(nextFighterTurn, 10, 30, JumpLegalLandingNoCheck)
    all {
      assert(jumped.fighter.movementSpent == 10),
      assert(jumped.fighter.activeEffects.contains(JumpMovementReplacement({ durationTicks: 10, usedThisTurn: true }))),
      assert(secondSameTurn == jumped),
      assert(nextFighterTurn.fighter.activeEffects.contains(JumpMovementReplacement({ durationTicks: 9, usedThisTurn: false }))),
      assert(nextTurnJumped.fighter.movementSpent == 10),
      assert(nextTurnJumped.fighter.activeEffects.contains(JumpMovementReplacement({ durationTicks: 9, usedThisTurn: true }))),
    }
  }

  run test_jump_movement_replacement_rejects_invalid_distance_cost_and_landing = {
    val cast = resolveJumpMovementReplacementSpell(initialState, Set(Fighter), Set(Fighter), 1)
    val tooCheap = jumpMovementReplacementFighter(cast, 5, 30, JumpLegalLandingAcrobaticsPassed)
    val tooFar = jumpMovementReplacementFighter(cast, 10, 35, JumpLegalLandingAcrobaticsPassed)
    val illegalLanding = jumpMovementReplacementFighter(cast, 10, 30, JumpIllegalLanding)
    val failedLanding = jumpMovementReplacementFighter(cast, 10, 30, JumpLegalLandingAcrobaticsFailed)
    all {
      assert(tooCheap == cast),
      assert(tooFar == cast),
      assert(illegalLanding == cast),
      assert(failedLanding.fighter.prone),
    }
  }

  run test_divine_favor_adds_radiant_damage_to_fighter_weapon_hits = {
    val favored = resolveDivineFavor(initialState)
    val hit = resolveAttack(favored, 15, 10, fighterWeaponAttackDamageRollWithDivineFavor(4, 3), true)
    all {
      assert(favored.fighter.activeEffects.contains(DivineFavorWeaponDamageRider({ durationTicks: favorWeaponDamageRiderDurationTicks }))),
      assert(not(favored.bonusActionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(favored, Fighter)),
      assert(hit.goblin.hp == 0),
    }
  }

  run test_divine_favor_weapon_damage_rider_expires_after_one_minute = {
    val favored = resolveDivineFavor(initialState)
    val round1 = endTurn(endTurn(favored))
    val round2 = endTurn(endTurn(round1))
    val round3 = endTurn(endTurn(round2))
    val round4 = endTurn(endTurn(round3))
    val round5 = endTurn(endTurn(round4))
    val round6 = endTurn(endTurn(round5))
    val round7 = endTurn(endTurn(round6))
    val round8 = endTurn(endTurn(round7))
    val round9 = endTurn(endTurn(round8))
    val round10 = endTurn(endTurn(round9))
    val hit = resolveAttack(round10, 15, 10, fighterWeaponAttackDamageRollWithDivineFavor(4, 3), true)
    all {
      assert(activeEffectsContainDivineFavor(round9.fighter.activeEffects)),
      assert(not(activeEffectsContainDivineFavor(round10.fighter.activeEffects))),
      assert(hit.goblin.hp == 3),
    }
  }

  run test_divine_smite_after_hit_spends_bonus_action_and_slot_without_base_attack_replay = {
    val smote = resolveDivineSmiteAfterMeleeHit(initialState, 1, 5, HumanoidCreature, false, true)
    val alreadySpent = resolveDivineSmiteAfterMeleeHit(commitActorSpellSlotUse(initialState, Fighter), 1, 5, HumanoidCreature, false, true)
    val critical = resolveDivineSmiteAfterMeleeHit(initialState, 1, 5, HumanoidCreature, true, true)
    val freeSmote = resolvePaladinsSmiteAfterMeleeHit(initialState, 1, 5, HumanoidCreature, false, true)
    val freeAfterSlot = resolvePaladinsSmiteAfterMeleeHit(commitActorSpellSlotUse(initialState, Fighter), 1, 5, HumanoidCreature, false, true)
    val freeExhausted = resolvePaladinsSmiteAfterMeleeHit(initialState, 0, 5, HumanoidCreature, false, true)
    all {
      assert(smote.goblin.hp == 5),
      assert(not(smote.bonusActionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(smote, Fighter)),
      assert(alreadySpent.goblin.hp == initialState.goblin.hp),
      assert(critical.goblin.hp == 0),
      assert(freeSmote.state.goblin.hp == 5),
      assert(freeSmote.paladinsSmiteUsesRemaining == 0),
      assert(not(freeSmote.state.bonusActionAvailable)),
      assert(not(battleActorHasSpellSlotUse(freeSmote.state, Fighter))),
      assert(freeAfterSlot.state.goblin.hp == 5),
      assert(freeExhausted.state == initialState),
    }
  }

  run test_ensnaring_strike_after_weapon_hit_restrains_damages_and_escapes = {
    val ensnared = resolveEnsnaringStrikeAfterWeaponHit(initialState, 1, false)
    val damaged = endTurnWithEnsnaringStrikeDamage(ensnared, 4, true)
    val escaped = escapeEnsnaringStrike(damaged, true, false)
    val helperTurn = endTurn(damaged)
    val helperWithoutReach = escapeEnsnaringStrike(helperTurn, true, false)
    val helperEscaped = escapeEnsnaringStrike(helperTurn, true, true)
    val saveSucceeded = resolveEnsnaringStrikeAfterWeaponHit(initialState, 1, true)
    all {
      assert(ensnared.goblin.activeEffects.contains(EnsnaringStrikeRestrained({ damageDice: 1 }))),
      assert(ensnared.fighter.concentrating),
      assert(not(ensnared.bonusActionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(ensnared, Fighter)),
      assert(damaged.goblin.hp == initialState.goblin.hp - 4),
      assert(not(escaped.goblin.activeEffects.contains(EnsnaringStrikeRestrained({ damageDice: 1 })))),
      assert(not(escaped.fighter.concentrating)),
      assert(helperWithoutReach.goblin.activeEffects.contains(EnsnaringStrikeRestrained({ damageDice: 1 }))),
      assert(not(helperEscaped.goblin.activeEffects.contains(EnsnaringStrikeRestrained({ damageDice: 1 })))),
      assert(not(helperEscaped.fighter.concentrating)),
      assert(not(saveSucceeded.fighter.concentrating)),
      assert(not(activeEffectsContainEnsnaringStrike(saveSucceeded.goblin.activeEffects))),
      assert(ensnaringStrikeTargetHasSaveAdvantage(Large)),
      assert(not(ensnaringStrikeTargetHasSaveAdvantage(Medium))),
      assert(ensnaringStrikeDamageDiceForSlot(3) == 3),
    }
  }

  run test_searing_smite_after_hit_burns_and_constitution_save_ends = {
    val seared = resolveSearingSmiteAfterMeleeHit(initialState, 3, 6, false, true)
    val stillBurning = endTurnWithSearingSmiteDamageAndSave(seared, 9, false, true)
    val ended = endTurnWithSearingSmiteDamageAndSave(seared, 9, true, true)
    all {
      assert(seared.goblin.hp == initialState.goblin.hp - 6),
      assert(seared.goblin.activeEffects.contains(SearingSmiteBurning({ damageDice: 3, durationTicks: searingSmiteDurationTicks }))),
      assert(not(seared.bonusActionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(seared, Fighter)),
      assert(stillBurning.goblin.hp == 0),
      assert(activeEffectsContainSearingSmite(stillBurning.goblin.activeEffects)),
      assert(ended.goblin.hp == 0),
      assert(not(activeEffectsContainSearingSmite(ended.goblin.activeEffects))),
      assert(searingSmiteDamageDiceForSlot(3) == 3),
    }
  }

  run test_searing_smite_burn_expires_after_duration_tick = {
    val burning = {
      ...initialState,
      goblin: {
        ...initialState.goblin,
        activeEffects: Set(SearingSmiteBurning({ damageDice: 1, durationTicks: 1 })),
      },
    }
    val stillSameRound = endTurn(burning)
    val nextRound = endTurn(stillSameRound)
    all {
      assert(activeEffectsContainSearingSmite(stillSameRound.goblin.activeEffects)),
      assert(not(activeEffectsContainSearingSmite(nextRound.goblin.activeEffects))),
    }
  }

  run test_true_strike_weapon_attack_uses_spellcasting_ability_and_cantrip_scaling = {
    val hit = resolveTrueStrikeWeaponAttack(
      { ...initialState, goblin: { ...initialState.goblin, reactionAvailable: false } },
      15,
      10,
      4,
      5,
      3,
      5,
      Radiant,
      Slashing,
      true,
    )
    all {
      assert(hit.goblin.hp == 0),
      assert(not(hit.actionAvailable)),
      assert(not(battleActorHasSpellSlotUse(hit, Fighter))),
      assert(spellInvocationSpendsSpellSlot(TrueStrike) == false),
      assert(trueStrikeWeaponAttackModifier(3, 3) == 6),
      assert(trueStrikeDamageAfterAdjustments(4, 5, 3, 5, Radiant) == 12),
    }
  }

  run test_true_strike_damage_choice_and_bonus_dice_are_level_gated = {
    all {
      assert(trueStrikeDamageTypeChoiceIsLegal(Radiant, Slashing)),
      assert(trueStrikeDamageTypeChoiceIsLegal(Slashing, Slashing)),
      assert(not(trueStrikeDamageTypeChoiceIsLegal(Fire, Slashing))),
      assert(trueStrikeBonusDamageDice(1) == 0),
      assert(trueStrikeBonusDamageDice(5) == 1),
      assert(trueStrikeBonusDamageDice(11) == 2),
      assert(trueStrikeBonusDamageDice(17) == 3),
    }
  }

  run test_shillelagh_requires_held_club_or_quarterstaff_and_spends_bonus_action = {
    val club = resolveShillelagh(initialState, HeldClub, 3, 1)
    val quarterstaff = resolveShillelagh(initialState, HeldQuarterstaff, 3, 1)
    all {
      assert(club.fighter.activeEffects.contains(shillelaghEffect(ShillelaghClub, 3, 1))),
      assert(not(club.bonusActionAvailable)),
      assert(not(battleActorHasSpellSlotUse(club, Fighter))),
      assert(quarterstaff.fighter.activeEffects.contains(shillelaghEffect(ShillelaghQuarterstaff, 3, 1))),
      assert(resolveShillelagh(initialState, HeldOtherWeapon, 3, 1) == initialState),
      assert(resolveShillelagh(initialState, HeldNoWeapon, 3, 1) == initialState),
    }
  }

  run test_shillelagh_projects_spellcasting_attack_damage_type_choice_and_scaling = {
    all {
      assert(shillelaghAttackModifier(3, 2) == 5),
      assert(shillelaghDamageTypeChoiceIsLegal(Force, Bludgeoning)),
      assert(shillelaghDamageTypeChoiceIsLegal(Bludgeoning, Bludgeoning)),
      assert(not(shillelaghDamageTypeChoiceIsLegal(Fire, Bludgeoning))),
      assert(shillelaghDamageDice(1) == 1),
      assert(shillelaghDamageDieSize(1) == 8),
      assert(shillelaghDamageDice(5) == 1),
      assert(shillelaghDamageDieSize(5) == 10),
      assert(shillelaghDamageDice(11) == 1),
      assert(shillelaghDamageDieSize(11) == 12),
      assert(shillelaghDamageDice(17) == 2),
      assert(shillelaghDamageDieSize(17) == 6),
    }
  }

  run test_shillelagh_recast_replaces_prior_effect_and_lets_go_ends_projection = {
    val once = resolveShillelagh(initialState, HeldClub, 1, 1)
    val nextTurn = { ...once, bonusActionAvailable: true }
    val recast = resolveShillelagh(nextTurn, HeldQuarterstaff, 3, 17)
    val letGo = {
      ...recast,
      fighter: {
        ...recast.fighter,
        activeEffects: shillelaghEffectsMatchingHeldWeapon(recast.fighter.activeEffects, HeldNoWeapon),
      },
    }
    all {
      assert(recast.fighter.activeEffects == Set(shillelaghEffect(ShillelaghQuarterstaff, 3, 17))),
      assert(letGo.fighter.activeEffects == Set()),
    }
  }

  run test_pact_blade_damage_choice_and_charisma_option_projection = {
    all {
      assert(pactBladeDamageTypeChoiceIsLegal(Slashing, Slashing)),
      assert(pactBladeDamageTypeChoiceIsLegal(Necrotic, Slashing)),
      assert(pactBladeDamageTypeChoiceIsLegal(Psychic, Slashing)),
      assert(pactBladeDamageTypeChoiceIsLegal(Radiant, Slashing)),
      assert(not(pactBladeDamageTypeChoiceIsLegal(Fire, Slashing))),
      assert(pactBladeAbilityModifierChoiceIsLegal(4, 4, 3)),
      assert(pactBladeAbilityModifierChoiceIsLegal(3, 4, 3)),
      assert(not(pactBladeAbilityModifierChoiceIsLegal(2, 4, 3))),
      assert(pactBladeAttackModifier(3, 2) == 5),
      assert(pactBladeAttackModifier(4, 2) == 6),
    }
  }

  run test_produce_flame_held_light_spends_bonus_action_and_records_light = {
    val result = resolveProduceFlameHeldLight(initialState)
    all {
      assert(result.fighter.activeEffects.contains(ProduceFlameHeldLight({ durationTicks: produceFlameDurationTicks }))),
      assert(not(result.bonusActionAvailable)),
      assert(result.actionAvailable),
      assert(not(battleActorHasSpellSlotUse(result, Fighter))),
      assert(produceFlameBrightLightRadiusFeet == 20),
      assert(produceFlameDimLightAdditionalFeet == 20),
      assert(battleRuntimeLightEmitters(result).contains(produceFlameHeldLightEmitter(produceFlameDurationTicks))),
    }
  }

  run test_produce_flame_held_light_recast_keeps_one_flame = {
    val once = resolveProduceFlameHeldLight(initialState)
    val nextTurn = { ...once, bonusActionAvailable: true }
    val recast = resolveProduceFlameHeldLight(nextTurn)
    all {
      assert(recast.fighter.activeEffects.contains(ProduceFlameHeldLight({ durationTicks: produceFlameDurationTicks }))),
      assert(recast.fighter.activeEffects.size() == 1),
      assert(battleRuntimeLightEmitters(recast) == Set(produceFlameHeldLightEmitter(produceFlameDurationTicks))),
    }
  }

  run test_produce_flame_held_light_expires_after_duration_tick = {
    val nearlyExpired = {
      ...resolveProduceFlameHeldLight(initialState),
      fighter: {
        ...initialState.fighter,
        activeEffects: Set(ProduceFlameHeldLight({ durationTicks: 1 })),
      },
    }
    val stillSameRound = endTurn(nearlyExpired)
    val nextRound = endTurn(stillSameRound)
    all {
      assert(activeEffectsContainProduceFlameHeldLight(stillSameRound.fighter.activeEffects)),
      assert(not(activeEffectsContainProduceFlameHeldLight(nextRound.fighter.activeEffects))),
      assert(battleRuntimeLightEmitters(stillSameRound).contains(produceFlameHeldLightEmitter(1))),
      assert(not(battleRuntimeLightEmitters(nextRound).contains(produceFlameHeldLightEmitter(1)))),
    }
  }

  run test_dancing_lights_projects_dim_emitters_and_srd_bounds = {
    val cast = resolveDancingLightsSeparateCast(initialState, 3, 60, 20)
    val recast = resolveDancingLightsCombinedCast({ ...cast, actionAvailable: true }, 40)
    val moved = resolveDancingLightsReposition(cast, false, 3, 60, 20, 70)
    val partiallyElapsed = {
      ...cast,
      fighter: {
        ...cast.fighter,
        activeEffects: Set(dancingLightsActiveEffect(false, 3, 1, 2, 3, 4, 37)),
      },
    }
    val movedAfterElapsed = resolveDancingLightsReposition(partiallyElapsed, false, 3, 60, 20, 70)
    val vanished = resolveDancingLightsReposition(cast, false, 3, 60, 20, 121)
    val broken = breakConcentrationSpellEffects(cast, Fighter)
    val nearlyExpired = {
      ...cast,
      fighter: {
        ...cast.fighter,
        activeEffects: Set(dancingLightsActiveEffect(false, 3, 1, 2, 3, 4, 1)),
      },
    }
    val stillSameRound = endTurn(nearlyExpired)
    val nextRound = endTurn(stillSameRound)
    all {
      assert(dancingLightsDimLightRadiusFeet == 10),
      assert(dancingLightsDurationTicks == 600),
      assert(dancingLightsCastPlacementAllowed(1, 120, 99)),
      assert(dancingLightsCastPlacementAllowed(3, 60, 20)),
      assert(not(dancingLightsCastPlacementAllowed(0, 60, 20))),
      assert(not(dancingLightsCastPlacementAllowed(5, 60, 20))),
      assert(not(dancingLightsCastPlacementAllowed(2, 121, 20))),
      assert(not(dancingLightsCastPlacementAllowed(2, 60, 21))),
      assert(dancingLightsRepositionAllowed(60, 20, 2)),
      assert(not(dancingLightsRepositionAllowed(61, 20, 2))),
      assert(dancingLightSurvivesRange(120)),
      assert(not(dancingLightSurvivesRange(121))),
      assert(dancingLightsEmitters(false, 1).size() == 1),
      assert(dancingLightsEmitters(false, 3).size() == 3),
      assert(dancingLightsEmitters(true, 1) == Set(dancingLightsEmitter(1, 1, true))),
      assert(cast.fighter.activeEffects.contains(dancingLightsActiveEffect(false, 3, 1, 2, 3, 4, dancingLightsDurationTicks))),
      assert(cast.fighter.concentrating),
      assert(not(cast.actionAvailable)),
      assert(battleRuntimeLightEmitters(cast) == dancingLightsEmitters(false, 3)),
      assert(recast.fighter.activeEffects == Set(dancingLightsActiveEffect(true, 1, 1, 0, 0, 0, dancingLightsDurationTicks))),
      assert(battleRuntimeLightEmitters(recast) == dancingLightsEmitters(true, 1)),
      assert(moved.fighter.activeEffects.contains(dancingLightsActiveEffect(false, 3, 11, 12, 13, 14, dancingLightsDurationTicks))),
      assert(movedAfterElapsed.fighter.activeEffects.contains(dancingLightsActiveEffect(false, 3, 11, 12, 13, 14, 37))),
      assert(not(moved.bonusActionAvailable)),
      assert(battleRuntimeLightEmitters(moved).contains(dancingLightsEmitter(1, 11, false))),
      assert(not(activeEffectsContainDancingLights(vanished.fighter.activeEffects))),
      assert(battleRuntimeLightEmitters(vanished) == Set()),
      assert(not(activeEffectsContainDancingLights(broken.fighter.activeEffects))),
      assert(battleRuntimeLightEmitters(broken) == Set()),
      assert(activeEffectsContainDancingLights(stillSameRound.fighter.activeEffects)),
      assert(not(activeEffectsContainDancingLights(nextRound.fighter.activeEffects))),
    }
  }

  run test_light_object_records_bright_and_dim_object_emitter = {
    val result = resolveLightObject(initialState, LightObjectTarget, ObjectLarge, ObjectNotWornOrCarriedBySomeoneElse)
    all {
      assert(result.lightEmitters.contains(lightObjectEmitter(LightObjectTarget))),
      assert(not(result.actionAvailable)),
      assert(result.bonusActionAvailable),
      assert(not(battleActorHasSpellSlotUse(result, Fighter))),
      assert(result.fighter.activeEffects == Set()),
      assert(result.goblin.activeEffects == Set()),
      assert(lightBrightLightRadiusFeet == 20),
      assert(lightDimLightAdditionalFeet == 20),
      assert(lightDurationTicks == 600),
    }
  }

  run test_light_visibility_projection = {
    val lit = resolveLightObject(initialState, LightObjectTarget, ObjectLarge, ObjectNotWornOrCarriedBySomeoneElse)
    val brightFact = ObjectLightEmitterProjectionFact({
      object: LightObjectTarget,
      distanceFeet: 20,
      opaqueCover: false,
    })
    val dimFact = ObjectLightEmitterProjectionFact({
      object: LightObjectTarget,
      distanceFeet: 40,
      opaqueCover: false,
    })
    val coveredFact = ObjectLightEmitterProjectionFact({
      object: LightObjectTarget,
      distanceFeet: 20,
      opaqueCover: true,
    })
    all {
      assert(battleIlluminationFromLightEmitters(lit.lightEmitters, Set(brightFact)) == BrightLightIllumination),
      assert(battleIlluminationFromLightEmitters(lit.lightEmitters, Set(dimFact)) == DimLightIllumination),
      assert(battleIlluminationFromLightEmitters(lit.lightEmitters, Set(coveredFact)) == DarknessIllumination),
      assert(sightObscurement(BrightLightIllumination, OrdinarySight) == UnobscuredSight),
      assert(sightObscurement(DimLightIllumination, OrdinarySight) == LightlyObscuredSight),
      assert(sightObscurement(DarknessIllumination, OrdinarySight) == HeavilyObscuredSight),
      assert(sightObscurement(DimLightIllumination, DarkvisionSight({ rangeFeet: 60, distanceFeet: 60 })) == UnobscuredSight),
      assert(sightObscurement(DarknessIllumination, DarkvisionSight({ rangeFeet: 60, distanceFeet: 60 })) == LightlyObscuredSight),
      assert(sightObscurement(DimLightIllumination, DarkvisionSight({ rangeFeet: 60, distanceFeet: 65 })) == LightlyObscuredSight),
    }
  }

  run test_light_object_rejects_too_large_or_worn_carried_by_someone_else = {
    all {
      assert(resolveLightObject(initialState, LightObjectTarget, ObjectHuge, ObjectNotWornOrCarriedBySomeoneElse) == initialState),
      assert(resolveLightObject(initialState, LightObjectTarget, ObjectMedium, ObjectWornBySomeoneElse) == initialState),
      assert(resolveLightObject(initialState, LightObjectTarget, ObjectMedium, ObjectCarriedBySomeoneElse) == initialState),
      assert(lightObjectTargetAllowed(ObjectTiny, ObjectWornOrCarriedByCaster)),
      assert(not(lightObjectTargetAllowed(ObjectGargantuan, ObjectWornOrCarriedByCaster))),
    }
  }

  run test_light_object_recast_replaces_prior_light_from_same_source = {
    val prior = {
      ...initialState,
      lightEmitters: Set(lightObjectEmitter(PriorLightObjectTarget)),
    }
    val recast = resolveLightObject(prior, LightObjectTarget, ObjectMedium, ObjectWornOrCarriedByCaster)
    all {
      assert(recast.lightEmitters == Set(lightObjectEmitter(LightObjectTarget))),
      assert(not(recast.lightEmitters.contains(lightObjectEmitter(PriorLightObjectTarget)))),
    }
  }

  run test_light_object_emitter_expires_after_duration_tick = {
    val nearlyExpired = {
      ...initialState,
      lightEmitters: Set(SpellLightEmitter({
        source: Fighter,
        sourceSpell: Light,
        attachment: ObjectLightEmitter({ object: LightObjectTarget }),
        emission: BrightAndDimLightEmission({
          brightRadiusFeet: lightBrightLightRadiusFeet,
          dimAdditionalFeet: lightDimLightAdditionalFeet,
        }),
        opaqueCoverInteraction: LightEmitterBlocksOpaqueCover,
        expiresAt: DurationLightEmitterExpiration({ durationTicks: 1 }),
      })),
    }
    val stillSameRound = endTurn(nearlyExpired)
    val nextRound = endTurn(stillSameRound)
    all {
      assert(stillSameRound.lightEmitters.size() == 1),
      assert(nextRound.lightEmitters == Set()),
    }
  }

  run test_produce_flame_hurl_requires_held_light_and_deals_fire_damage = {
    val unlit = resolveProduceFlameHurl(initialState, 15, 10, 5, true)
    val lit = resolveProduceFlameHeldLight(initialState)
    val nextTurn = {
      ...lit,
      actionAvailable: true,
      bonusActionAvailable: true,
      goblin: { ...lit.goblin, reactionAvailable: false },
    }
    val hit = resolveProduceFlameHurl(nextTurn, 15, 10, 5, true)
    all {
      assert(unlit == initialState),
      assert(hit.goblin.hp == 5),
      assert(not(hit.actionAvailable)),
      assert(not(activeEffectsContainProduceFlameHeldLight(hit.fighter.activeEffects))),
      assert(not(battleRuntimeLightEmitters(hit).contains(produceFlameHeldLightEmitter(produceFlameDurationTicks)))),
      assert(spellAttackDamageType(ProduceFlameHurlSpellAttack) == Fire),
      assert(spellAttackDamageActiveEffects(ProduceFlameHurlSpellAttack) == Set()),
    }
  }

  run test_produce_flame_hurl_attack_hit_reaction_window_ends_held_light = {
    val lit = resolveProduceFlameHeldLight(initialState)
    val nextTurn = {
      ...lit,
      actionAvailable: true,
      bonusActionAvailable: true,
    }
    val awaiting = resolveProduceFlameHurl(nextTurn, 15, 10, 5, true)
    all {
      assert(awaiting.interruptStack.length() == 1),
      assert(pendingReactionFrame(awaiting.interruptStack[0]) == HasPendingReactionFrame({
        trigger: AttackHit,
        procedure: ShieldReactionProcedure,
        eligibleReactors: Set(Goblin),
        offeredReactors: Set(),
        continuation: ResumeProduceFlameHurl,
      })),
      assert(not(activeEffectsContainProduceFlameHeldLight(awaiting.fighter.activeEffects))),
      assert(not(battleRuntimeLightEmitters(awaiting).contains(produceFlameHeldLightEmitter(produceFlameDurationTicks)))),
    }
  }

  run test_produce_flame_hurl_cantrip_damage_dice_scale_by_character_level = {
    all {
      assert(produceFlameHurlDamageDice(1) == 1),
      assert(produceFlameHurlDamageDice(5) == 2),
      assert(produceFlameHurlDamageDice(11) == 3),
      assert(produceFlameHurlDamageDice(17) == 4),
    }
  }

  run test_scalar_buff_shield_of_faith_ends_when_caster_concentration_breaks = {
    val concentrating = {
      ...endTurn(initialState),
      fighter: { ...initialState.fighter, concentrating: true },
      goblin: { ...initialState.goblin, activeEffects: Set(ShieldOfFaithArmorClassBonus) },
    }
    val result = resolveGoblinAttack(concentrating, 20, 18, 5, false)
    all {
      assert(not(result.fighter.concentrating)),
      assert(not(result.goblin.activeEffects.contains(ShieldOfFaithArmorClassBonus))),
    }
  }

  run test_concentration_damage_dc_is_capped = {
    all {
      assert(concentrationSavingThrowDc(24) == 12),
      assert(concentrationSavingThrowDc(80) == 30),
    }
  }

  run test_eldritch_mind_only_changes_concentration_saving_throw_mode = {
    all {
      assert(eldritchMindConcentrationSavingThrowMode(true) == AdvantageSavingThrow),
      assert(eldritchMindConcentrationSavingThrowMode(false) == NormalSavingThrow),
    }
  }

  run test_danger_sense_changes_dexterity_saving_throw_mode_until_incapacitated = {
    all {
      assert(dangerSenseSavingThrowMode(DexAbility, false) == AdvantageSavingThrow),
      assert(dangerSenseSavingThrowMode(DexAbility, true) == NormalSavingThrow),
      assert(dangerSenseSavingThrowMode(ConAbility, false) == NormalSavingThrow),
    }
  }

  run test_concentration_breaks_on_failed_damage_save = {
    val concentrating = { ...initialState.fighter, concentrating: true, activeEffects: Set(GuidanceAbilityCheckBonus) }
    val result = applyDamage(concentrating, 5, 1, false)
    all {
      assert(not(result.concentrating)),
      assert(result.activeEffects == Set()),
    }
  }

  run test_attack_action_can_break_target_concentration = {
    val concentratingGoblin = { ...initialState, goblin: { ...initialState.goblin, concentrating: true, activeEffects: Set(GuidanceAbilityCheckBonus) } }
    val result = resolveAttack(concentratingGoblin, 15, 10, fighterWeaponAttackDamageRoll(4), false)
    all {
      assert(result.goblin.hp == 3),
      assert(not(result.goblin.concentrating)),
      assert(result.goblin.activeEffects == Set()),
    }
  }

  run test_goblin_attack_action_can_break_target_concentration = {
    val concentratingFighter = { ...endTurn(initialState), fighter: { ...initialState.fighter, concentrating: true, activeEffects: Set(GuidanceAbilityCheckBonus) } }
    val result = resolveGoblinAttack(concentratingFighter, 20, 18, 5, false)
    all {
      assert(result.fighter.hp == 5),
      assert(not(result.fighter.concentrating)),
      assert(result.fighter.activeEffects == Set()),
    }
  }

  run test_acid_splash_damage_can_break_target_concentration = {
    val concentratingGoblin = { ...initialState, goblin: { ...initialState.goblin, concentrating: true, activeEffects: Set(GuidanceAbilityCheckBonus) } }
    val result = resolveAcidSplash(concentratingGoblin, false, true, 4, true, false)
    all {
      assert(result.goblin.hp == 6),
      assert(not(result.goblin.concentrating)),
      assert(result.goblin.activeEffects == Set()),
    }
  }

  run test_readied_spell_uses_concentration_until_release_or_next_turn = {
    val readied = readySpell(initialState)
    val released = releaseReadiedSpell(readied)
    val expired = endTurn(endTurn(readied))
    all {
      assert(readied.fighter.concentrating),
      assert(readied.fighterReadiedSpellHeld),
      assert(not(released.fighter.concentrating)),
      assert(not(released.fighterReadiedSpellHeld)),
      assert(not(expired.fighterReadiedSpellHeld)),
    }
  }

  run test_movement_spends_budget = {
    val moved = moveFighter(initialState, 10, 4 > 5)
    all {
      assert(moved.fighter.movementSpent == 10),
      assert(movementRemaining(moved.fighter) == 20),
    }
  }

  run test_roving_speed_kind_movement_and_dash_use_chosen_speed = {
    val roving = {
      ...initialState,
      fighter: {
        ...initialState.fighter,
        speed: 40,
        hasRovingSpeedKindGrants: true,
      },
    }
    val climbed = moveFighterWithSpeedKind(roving, ClimbSpeedKind, 15, false)
    val swam = moveFighterWithSpeedKind(climbed, SwimSpeedKind, 25, false)
    val dashed = dashFighterWithSpeedKind(roving, SwimSpeedKind)
    val unsupportedClimb = moveFighterWithSpeedKind(initialState, ClimbSpeedKind, 1, false)
    all {
      assert(movementSpeed(roving.fighter, ClimbSpeedKind) == 40),
      assert(climbed.fighter.movementSpent == 15),
      assert(movementRemainingForFighterWithSpeedKind(climbed, SwimSpeedKind) == 25),
      assert(swam.fighter.movementSpent == 40),
      assert(dashed.dashMovementBonus == 40),
      assert(unsupportedClimb == initialState),
    }
  }

  run test_generic_combat_actions_update_turn_state = {
    val dashed = dashFighter(initialState)
    val disengaged = disengageFighter(initialState)
    val dodged = dodgeFighter(initialState)
    val readied = readyFighter(initialState)
    val helped = helpFighterAttack(initialState)
    all {
      assert(not(dashed.actionAvailable)),
      assert(dashed.dashMovementBonus == 30),
      assert(movementRemainingForFighter(dashed) == 60),
      assert(disengaged.disengaged),
      assert(dodged.fighter.dodging),
      assert(readied.fighterReadiedMovementHeld),
      assert(helped.fighterHelpAttackGoblinForGoblin),
    }
  }

  run test_adrenaline_rush_bonus_action_dash_grants_temporary_hit_points_and_spends_use = {
    val result = bonusActionDashTemporaryHitPointsFighter(
      { ...initialState, fighter: { ...initialState.fighter, tempHp: 1 } },
      3,
      3,
      WalkSpeedKind
    )
    val higherExisting = bonusActionDashTemporaryHitPointsFighter(
      { ...initialState, fighter: { ...initialState.fighter, tempHp: 5 } },
      3,
      3,
      WalkSpeedKind
    )
    val noUses = bonusActionDashTemporaryHitPointsFighter(initialState, 0, 3, WalkSpeedKind)
    all {
      assert(not(result.state.bonusActionAvailable)),
      assert(result.state.dashMovementBonus == 30),
      assert(result.state.fighter.tempHp == 3),
      assert(result.usesRemaining == 2),
      assert(higherExisting.state.fighter.tempHp == 5),
      assert(noUses.state == initialState),
      assert(noUses.usesRemaining == 0),
    }
  }

  run test_stand_from_prone_spends_half_speed_movement = {
    val prone = { ...initialState, fighter: { ...initialState.fighter, prone: true } }
    val stood = standFighterFromProne(prone)
    all {
      assert(stood.fighter.movementSpent == 15),
      assert(not(stood.fighter.prone)),
      assert(movementRemainingForFighter(stood) == 15),
    }
  }

  run test_disengage_suppresses_opportunity_attack_window = {
    val disengaged = disengageFighter({ ...initialState, actionAvailable: true })
    val moved = moveFighter(disengaged, 5, 10 > 5)
    all {
      assert(moved.interruptStack == []),
      assert(moved.fighter.movementSpent == 5),
    }
  }

  run test_movement_over_budget_is_rejected = {
    assert(moveFighter(initialState, 35, 40 > 5) == initialState)
  }

  run test_grapple_release_and_escape_update_link_state = {
    val grappled = grappleFighterGoblin(initialState, 12)
    val released = releaseFighterGrapple(grappled)
    val escaped = escapeFighterGrapple(endTurn(grappled), 13)
    all {
      assert(fighterGoblinGrappleExists(grappled)),
      assert(grappled.fighter.leftHandUse == HGrapple),
      assert(not(fighterGoblinGrappleExists(released))),
      assert(not(fighterGoblinGrappleExists(escaped))),
    }
  }

  run test_off_hand_requires_prior_light_attack_and_spends_bonus_action = {
    val rejected = offHandAttackFighter(initialState, 15, 10, 4)
    val afterAttack = resolveAttack(initialState, 1, 1, fighterWeaponAttackDamageRoll(4), false)
    val offHand = offHandAttackFighter(afterAttack, 15, 10, 4)
    all {
      assert(rejected == initialState),
      assert(afterAttack.lightWeaponAttackMade),
      assert(not(offHand.bonusActionAvailable)),
      assert(offHand.goblin.hp == 6),
    }
  }

  run test_grappled_attack_disadvantage_excludes_the_grappler = {
    val grappled = endTurn(grappleFighterGoblin(initialState, 12))
    all {
      assert(not(goblinAttackRequiresDisadvantage(grappled, true))),
      assert(goblinAttackRequiresDisadvantage(grappled, false)),
    }
  }

  run test_grapple_drag_cost_is_table_supplied = {
    val grappled = grappleFighterGoblin(initialState, 12)
    val oneFootCost = moveFighter(grappled, 1, false)
    val tenFootCost = moveFighter(grappled, 10, false)
    all {
      assert(oneFootCost.fighter.movementSpent == 1),
      assert(tenFootCost.fighter.movementSpent == 10),
    }
  }

  run test_movement_leaving_reach_opens_opportunity_attack_window_before_position_commit = {
    val awaiting = moveFighter(initialState, 5, 10 > 5)
    all {
      assert(awaiting.fighter.movementSpent == 0),
      assert(awaiting.interruptStack.length() == 1),
      assert(pendingReactionFrame(awaiting.interruptStack[0]) == HasPendingReactionFrame({
        trigger: OpportunityAttack,
        procedure: OpportunityAttackReactionProcedure,
        eligibleReactors: Set(Goblin),
        offeredReactors: Set(),
        continuation: ResumeMovement({ speedKind: WalkSpeedKind, movementCost: 5 }),
      })),
    }
  }

  run test_reaction_continuations_have_battle_runtime_contract_kinds = {
    all {
      assert(reactionContinuationKind(ResumeAttack({ damage: 7 })) == BattleRuntimeAttackDamageContinuation),
      assert(reactionContinuationKind(ResumeRayOfFrost) == BattleRuntimeSpellAttackContinuation),
      assert(reactionContinuationKind(ResumePoisonSpray) == BattleRuntimeSpellAttackContinuation),
      assert(reactionContinuationKind(ResumeChillTouch) == BattleRuntimeSpellAttackContinuation),
      assert(reactionContinuationKind(ResumeTrueStrikeWeaponAttack) == BattleRuntimeSpellAttackContinuation),
      assert(reactionContinuationKind(ResumeProduceFlameHurl) == BattleRuntimeSpellAttackContinuation),
      assert(reactionContinuationKind(ResumeIceKnife) == BattleRuntimeSpellAttackContinuation),
      assert(reactionContinuationKind(ResumeSaveGateDamage) == BattleRuntimeSaveGateContinuation),
      assert(reactionContinuationKind(ResumeAfterDamage) == BattleRuntimeAfterDamageContinuation),
      assert(reactionContinuationKind(ResumeHellishRebukeAfterDamage({ damager: Goblin, damaged: Fighter, slotLevel: 1 })) == BattleRuntimeAfterDamageContinuation),
      assert(reactionContinuationKind(ResumeMovement({ speedKind: WalkSpeedKind, movementCost: 5 })) == BattleRuntimeMovementContinuation),
      assert(reactionContinuationKind(ResumeDissonantWhispersMovementThenAfterDamage({ speedKind: WalkSpeedKind, movementCost: 5 })) == BattleRuntimeMovementContinuation),
    }
  }

  run test_hellish_rebuke_after_damage_reaction_opens_srd_window_with_continuation_facts = {
    val awaiting = openHellishRebukeAfterDamageReactionWindow(
      initialState,
      Goblin,
      Fighter,
      HellishRebukeDamageFromVisibleCreatureWithin60Feet,
      true,
      1,
    )
    all {
      assert(awaiting.interruptStack.length() == 1),
      assert(pendingReactionFrame(awaiting.interruptStack[0]) == HasPendingReactionFrame({
        trigger: AfterDamage,
        procedure: DamageInterruptionReactionProcedure,
        eligibleReactors: Set(Fighter),
        offeredReactors: Set(),
        continuation: ResumeHellishRebukeAfterDamage({
          damager: Goblin,
          damaged: Fighter,
          slotLevel: 1,
        }),
      })),
    }
  }

  run test_hellish_rebuke_after_damage_reaction_requires_srd_trigger_and_availability_facts = {
    val noReaction = {
      ...initialState,
      fighter: { ...initialState.fighter, reactionAvailable: false },
    }
    val noSlot = commitActorSpellSlotUse(initialState, Fighter)
    val goblinTurnSpentSlot = commitActorSpellSlotUse(endTurn(initialState), Goblin)
    val offTurnWindow = openHellishRebukeAfterDamageReactionWindow(
      goblinTurnSpentSlot,
      Goblin,
      Fighter,
      HellishRebukeDamageFromVisibleCreatureWithin60Feet,
      true,
      1,
    )
    val available = {
      hellishRebukeAvailable: true,
      reactionAvailable: true,
      spellSlotAvailable: true,
    }
    all {
      assert(hellishRebukeAfterDamageReactionEligible(HellishRebukeDamageFromVisibleCreatureWithin60Feet, available)),
      assert(not(hellishRebukeAfterDamageReactionEligible(HellishRebukeNoDamageTaken, available))),
      assert(not(hellishRebukeAfterDamageReactionEligible(HellishRebukeDamageNotFromCreature, available))),
      assert(not(hellishRebukeAfterDamageReactionEligible(HellishRebukeDamagerNotVisible, available))),
      assert(not(hellishRebukeAfterDamageReactionEligible(HellishRebukeDamagerOutside60Feet, available))),
      assert(not(hellishRebukeAfterDamageReactionEligible(HellishRebukeDamageFromVisibleCreatureWithin60Feet, { ...available, hellishRebukeAvailable: false }))),
      assert(not(hellishRebukeAfterDamageReactionEligible(HellishRebukeDamageFromVisibleCreatureWithin60Feet, { ...available, reactionAvailable: false }))),
      assert(not(hellishRebukeAfterDamageReactionEligible(HellishRebukeDamageFromVisibleCreatureWithin60Feet, { ...available, spellSlotAvailable: false }))),
      assert(openHellishRebukeAfterDamageReactionWindow(initialState, Goblin, Fighter, HellishRebukeNoDamageTaken, true, 1) == initialState),
      assert(openHellishRebukeAfterDamageReactionWindow(noReaction, Goblin, Fighter, HellishRebukeDamageFromVisibleCreatureWithin60Feet, true, 1) == noReaction),
      assert(openHellishRebukeAfterDamageReactionWindow(noSlot, Goblin, Fighter, HellishRebukeDamageFromVisibleCreatureWithin60Feet, true, 1) == noSlot),
      assert(openHellishRebukeAfterDamageReactionWindow(initialState, Goblin, Fighter, HellishRebukeDamageFromVisibleCreatureWithin60Feet, false, 1) == initialState),
      assert(offTurnWindow.interruptStack.length() == 1),
    }
  }

  run test_hellish_rebuke_after_damage_reaction_resolves_save_damage_and_spend = {
    val continuation = { damager: Goblin, damaged: Fighter, slotLevel: 2 }
    val failedSave = resolveHellishRebukeAfterDamageReaction(initialState, continuation, false, 3, true)
    val successfulSave = resolveHellishRebukeAfterDamageReaction(initialState, continuation, true, 5, true)
    val goblinTurnSpentSlot = commitActorSpellSlotUse(endTurn(initialState), Goblin)
    val offTurnResolved = resolveHellishRebukeAfterDamageReaction(goblinTurnSpentSlot, continuation, false, 3, true)
    all {
      assert(hellishRebukeDamageDice(1) == 2),
      assert(hellishRebukeDamageDice(2) == 3),
      assert(failedSave.goblin.hp == 7),
      assert(failedSave.fighter.reactionAvailable == false),
      assert(battleActorHasCommittedSpellSlotUse(failedSave, Fighter)),
      assert(successfulSave.goblin.hp == 8),
      assert(successfulSave.fighter.reactionAvailable == false),
      assert(battleActorHasCommittedSpellSlotUse(successfulSave, Fighter)),
      assert(battleActorHasCommittedSpellSlotUse(offTurnResolved, Goblin)),
      assert(battleActorHasCommittedSpellSlotUse(offTurnResolved, Fighter)),
    }
  }

  run test_hellish_rebuke_after_damage_reaction_rejects_invalid_continuation = {
    val noReaction = {
      ...initialState,
      fighter: { ...initialState.fighter, reactionAvailable: false },
    }
    val noSlot = commitActorSpellSlotUse(initialState, Fighter)
    val continuation = { damager: Goblin, damaged: Fighter, slotLevel: 1 }
    all {
      assert(resolveHellishRebukeAfterDamageReaction(noReaction, continuation, false, 3, true) == noReaction),
      assert(resolveHellishRebukeAfterDamageReaction(noSlot, continuation, false, 3, true) == noSlot),
      assert(resolveHellishRebukeAfterDamageReaction(initialState, { damager: Fighter, damaged: Fighter, slotLevel: 1 }, false, 3, true) == initialState),
      assert(resolveHellishRebukeAfterDamageReaction(initialState, { damager: Goblin, damaged: Fighter, slotLevel: 0 }, false, 3, true) == initialState),
    }
  }

  run test_dissonant_whispers_forced_reaction_requires_movement_fill_when_available = {
    assert(
      resolveDissonantWhispersGoblinForcedReactionMovement(initialState, DissonantWhispersMovementMissing)
        == DissonantWhispersNeedsMovementFill
    )
  }

  run test_dissonant_whispers_forced_reaction_no_reaction_opens_after_damage = {
    val noReaction = {
      ...initialState,
      goblin: { ...initialState.goblin, reactionAvailable: false },
    }
    match resolveDissonantWhispersGoblinForcedReactionMovement(noReaction, DissonantWhispersMovementMissing) {
      | DissonantWhispersResolvedAfterDamage(result) =>
          all {
            assert(not(result.goblin.reactionAvailable)),
            assert(result.interruptStack.length() == 1),
            assert(pendingReactionFrame(result.interruptStack[0]) == HasPendingReactionFrame({
              trigger: AfterDamage,
              procedure: DamageInterruptionReactionProcedure,
              eligibleReactors: Set(Fighter),
              offeredReactors: Set(),
              continuation: ResumeAfterDamage,
            })),
          }
      | _ => assert(false)
    }
  }

  run test_dissonant_whispers_forced_reaction_no_movement_spends_reaction_and_opens_after_damage = {
    val grappled = grappleFighterGoblin(initialState, 12)
    match resolveDissonantWhispersGoblinForcedReactionMovement(grappled, DissonantWhispersMovementMissing) {
      | DissonantWhispersResolvedAfterDamage(result) =>
          all {
            assert(not(result.goblin.reactionAvailable)),
            assert(result.interruptStack.length() == 1),
            assert(pendingReactionFrame(result.interruptStack[0]) == HasPendingReactionFrame({
              trigger: AfterDamage,
              procedure: DamageInterruptionReactionProcedure,
              eligibleReactors: Set(Fighter),
              offeredReactors: Set(),
              continuation: ResumeAfterDamage,
            })),
          }
      | _ => assert(false)
    }
  }

  run test_dissonant_whispers_forced_reaction_rejects_movement_when_unavailable = {
    val grappled = grappleFighterGoblin(initialState, 12)
    assert(
      resolveDissonantWhispersGoblinForcedReactionMovement(
        grappled,
        DissonantWhispersMovementFilled({
          speedKind: WalkSpeedKind,
          movementCost: 5,
          provokesOpportunityAttack: false,
        })
      ) == DissonantWhispersInvalidMovementFill
    )
  }

  run test_dissonant_whispers_forced_reaction_movement_without_threat_spends_reaction_then_after_damage = {
    match resolveDissonantWhispersGoblinForcedReactionMovement(
      initialState,
      DissonantWhispersMovementFilled({
        speedKind: WalkSpeedKind,
        movementCost: 10,
        provokesOpportunityAttack: false,
      })
    ) {
      | DissonantWhispersResolvedAfterDamage(result) =>
          all {
            assert(not(result.goblin.reactionAvailable)),
            assert(result.goblin.movementSpent == 0),
            assert(result.interruptStack.length() == 1),
            assert(pendingReactionFrame(result.interruptStack[0]) == HasPendingReactionFrame({
              trigger: AfterDamage,
              procedure: DamageInterruptionReactionProcedure,
              eligibleReactors: Set(Fighter),
              offeredReactors: Set(),
              continuation: ResumeAfterDamage,
            })),
          }
      | _ => assert(false)
    }
  }

  run test_dissonant_whispers_forced_reaction_movement_with_threat_opens_opportunity_attack_first = {
    match resolveDissonantWhispersGoblinForcedReactionMovement(
      initialState,
      DissonantWhispersMovementFilled({
        speedKind: WalkSpeedKind,
        movementCost: 10,
        provokesOpportunityAttack: true,
      })
    ) {
      | DissonantWhispersOpportunityAttackWindow(result) =>
          all {
            assert(not(result.goblin.reactionAvailable)),
            assert(result.interruptStack.length() == 1),
            assert(pendingReactionFrame(result.interruptStack[0]) == HasPendingReactionFrame({
              trigger: OpportunityAttack,
              procedure: OpportunityAttackReactionProcedure,
              eligibleReactors: Set(Fighter),
              offeredReactors: Set(),
              continuation: ResumeDissonantWhispersMovementThenAfterDamage({
                speedKind: WalkSpeedKind,
                movementCost: 10,
              }),
            })),
          }
      | _ => assert(false)
    }
  }

  run test_dissonant_whispers_declined_opportunity_attack_resumes_after_damage_sequence = {
    match resolveDissonantWhispersGoblinForcedReactionMovement(
      initialState,
      DissonantWhispersMovementFilled({
        speedKind: WalkSpeedKind,
        movementCost: 10,
        provokesOpportunityAttack: true,
      })
    ) {
      | DissonantWhispersOpportunityAttackWindow(awaiting) => {
          val resumed = declineReactionAndResume(awaiting, Fighter)
          all {
            assert(resumed.fighter.reactionAvailable),
            assert(not(resumed.goblin.reactionAvailable)),
            assert(resumed.interruptStack.length() == 1),
            assert(pendingReactionFrame(resumed.interruptStack[0]) == HasPendingReactionFrame({
              trigger: AfterDamage,
              procedure: DamageInterruptionReactionProcedure,
              eligibleReactors: Set(Fighter),
              offeredReactors: Set(),
              continuation: ResumeAfterDamage,
            })),
          }
        }
      | _ => assert(false)
    }
  }

  run test_reaction_decision_contract_rejects_unavailable_reaction = {
    val awaiting = moveFighter({ ...initialState, goblin: { ...initialState.goblin, reactionAvailable: false } }, 5, 10 > 5)
    all {
      assert(resolveReaction(awaiting, Goblin) == awaiting),
      assert(declineReactionAndResume(awaiting, Goblin).fighter.movementSpent == 5),
    }
  }

  run test_after_damage_reaction_resolves_through_damage_interruption_contract = {
    val awaitingReaction = openReactionWindow(initialState, {
      trigger: AfterDamage,
      procedure: DamageInterruptionReactionProcedure,
      eligibleReactors: Set(Fighter),
      offeredReactors: Set(),
      continuation: ResumeAfterDamage,
    })
    val resolved = resolveReaction(awaitingReaction, Fighter)
    all {
      assert(resolved.interruptStack == []),
      assert(not(resolved.fighter.reactionAvailable)),
    }
  }

  run test_declined_opportunity_attack_resumes_movement = {
    val awaiting = moveFighter(initialState, 5, 10 > 5)
    val resumed = declineReactionAndResume(awaiting, Goblin)
    all {
      assert(resumed.interruptStack == []),
      assert(resumed.fighter.movementSpent == 5),
      assert(resumed.goblin.reactionAvailable),
    }
  }

  run test_resolved_opportunity_attack_spends_reaction_damages_then_resumes_movement = {
    val awaiting = moveFighter(initialState, 5, 10 > 5)
    val resolved = resolveReaction(awaiting, Goblin)
    all {
      assert(resolved.interruptStack == []),
      assert(resolved.goblin.reactionAvailable == false),
      assert(resolved.fighter.hp == 6),
      assert(resolved.fighter.movementSpent == 5),
    }
  }

  run test_goblin_opportunity_attack_can_knock_out = {
    val result = resolveGoblinOpportunityAttackWithDisposition(withFighterHp(initialState, 3, 0), 20, 18, 1, true, KnockOut)
    all {
      assert(result.fighter.hp == 1),
      assert(result.fighter.unconscious),
    }
  }

  run test_resolved_reaction_releases_readied_spell_and_resumes_attack_continuation = {
    val readied = { ...readySpell(initialState), actionAvailable: true }
    val awaitingReaction = openReactionWindow(readied, {
      trigger: AttackHit,
      procedure: ReadiedSpellReleaseReactionProcedure,
      eligibleReactors: Set(Fighter),
      offeredReactors: Set(),
      continuation: ResumeAttack({ damage: 7 }),
    })
    val resolved = resolveReaction(awaitingReaction, Fighter)
    all {
      assert(not(resolved.fighterReadiedSpellHeld)),
      assert(not(resolved.fighter.concentrating)),
      assert(not(resolved.fighter.reactionAvailable)),
      assert(resolved.goblin.hp == 3),
      assert(not(resolved.actionAvailable)),
      assert(resolved.interruptStack == []),
    }
  }

  run test_sanctuary_targeting_interdiction_trigger_scope = {
    val warded = resolveSanctuarySpell(initialState, Goblin)
    all {
      assert(activeEffectsContainSanctuaryWard(warded.goblin.activeEffects)),
      assert(activeEffectsSanctuaryWardDurationTicks(warded.goblin.activeEffects) == 10),
      assert(activeEffectsSanctuaryWardDurationTicks(tickDurationActiveEffects(warded.goblin.activeEffects)) == 9),
      assert(wardTargetingInterdictionApplies(SanctuaryAttackRollTargeting)),
      assert(wardTargetingInterdictionApplies(SanctuaryDamagingSpellTargeting)),
      assert(not(wardTargetingInterdictionApplies(SanctuaryAreaOfEffectTargeting))),
      assert(sanctuaryTargetingInterdictionOutcomeApplies(
        warded,
        Goblin,
        SanctuaryAttackRollTargeting,
        SanctuarySaveSucceeded,
      )),
      assert(not(sanctuaryTargetingInterdictionOutcomeApplies(
        warded,
        Goblin,
        SanctuaryAreaOfEffectTargeting,
        SanctuarySaveSucceeded,
      ))),
    }
  }

  run test_sanctuary_targeting_interdiction_outcomes = {
    val warded = resolveSanctuarySpell(initialState, Goblin)
    all {
      assert(wardInterdictionLosesAttackOrSpell(SanctuaryLoseAttackOrSpell)),
      assert(not(wardInterdictionLosesAttackOrSpell(SanctuarySaveSucceeded))),
      assert(not(sanctuaryTargetingInterdictionOutcomeApplies(
        warded,
        Goblin,
        SanctuaryAttackRollTargeting,
        SanctuaryLoseAttackOrSpell,
      ))),
      assert(sanctuaryTargetingInterdictionResolvedTarget(
        warded,
        Goblin,
        SanctuaryAttackRollTargeting,
        SanctuarySaveSucceeded,
      ) == Goblin),
      assert(sanctuaryTargetingInterdictionResolvedTarget(
        warded,
        Goblin,
        SanctuaryDamagingSpellTargeting,
        SanctuaryChooseNewTarget({ target: Fighter }),
      ) == Fighter),
    }
  }

  run test_sanctuary_early_end_lifecycle = {
    val fighterWarded = resolveSanctuarySpell(initialState, Fighter)
    val afterAttackRoll = recordFighterAttackRoll(fighterWarded)
    val afterSpellCast = resolveSanctuarySpell({ ...fighterWarded, bonusActionAvailable: true, spellSlotUsesThisTurn: Set() }, Goblin)
    val afterDamage = battleStateAfterSanctuaryEarlyEndForActor(fighterWarded, Fighter)
    all {
      assert(activeEffectsContainSanctuaryWard(fighterWarded.fighter.activeEffects)),
      assert(not(activeEffectsContainSanctuaryWard(afterAttackRoll.fighter.activeEffects))),
      assert(not(activeEffectsContainSanctuaryWard(afterSpellCast.fighter.activeEffects))),
      assert(activeEffectsContainSanctuaryWard(afterSpellCast.goblin.activeEffects)),
      assert(not(activeEffectsContainSanctuaryWard(afterDamage.fighter.activeEffects))),
    }
  }
}
