// -*- mode: Bluespec; -*-

// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-mirror-image-hit-interception
// UNIT-PROFILE-COVERAGE: qnt-owner spell.creature-type-protection-and-charm spell.find-familiar-lifecycle spell.invocation-after-hit-damage spell.invocation-after-hit-damage-illumination spell.invocation-after-hit-restraint-turn-start-damage spell.invocation-after-hit-timed-damage-save spell.invocation-attack-roll-advantage-save spell.invocation-blur-attack-roll-defense spell.invocation-chained-attack-damage spell.invocation-command-approach-route spell.invocation-command-drop-held-object spell.invocation-command-flee-route spell.invocation-command-halt-grovel spell.invocation-condition-immunity-turn-start-temporary-hit-points spell.invocation-condition-removal-protection spell.invocation-condition-save spell.invocation-damage-reduction spell.invocation-dancing-lights-movable-dim-light spell.invocation-expeditious-retreat-dash spell.invocation-feather-fall-mitigation spell.invocation-flaming-sphere-hazard-ram spell.invocation-fog-cloud-obscurement spell.invocation-forced-reaction-movement spell.invocation-grease-ground-hazard spell.invocation-held-light-emitter spell.invocation-hideous-laughter-repeat-save-lifecycle spell.invocation-independent-attack-sequence spell.invocation-jump-movement-replacement spell.invocation-make-stable spell.invocation-marked-damage-rider spell.invocation-object-light spell.invocation-roll-modifier spell.invocation-sanctuary-targeting-interdiction spell.invocation-self-ability-check-advantage spell.invocation-self-teleport spell.invocation-sleep-repeat-save-lifecycle spell.invocation-sleep-target-admission spell.invocation-spell-hosted-weapon-attack spell.invocation-weapon-attack-override spell.invocation-weapon-damage-rider spell.reaction-counterspell spell.reaction-hellish-rebuke spell.scalar-buff unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.bardic-inspiration-failed-d20-test unit-feature.bardic-inspiration-grant unit-feature.bonus-action-dash-temporary-hit-points unit-feature.martial-arts-attack-projection unit-feature.passive-saving-throw-roll-mode unit-feature.reaction-roll-or-damage-reduction unit-feature.weapon-mastery-cleave unit-feature.weapon-mastery-sap unit-feature.weapon-mastery-topple
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-warding-bond-linked-effect
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-mirror-image-hit-interception
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.scalar-buff
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-roll-modifier
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-self-ability-check-advantage
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-after-hit-restraint-turn-start-damage spell.invocation-after-hit-timed-damage-save spell.invocation-condition-immunity-turn-start-temporary-hit-points
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-chained-attack-damage
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-after-hit-damage spell.invocation-after-hit-damage-illumination spell.invocation-spell-hosted-weapon-attack spell.invocation-weapon-attack-override spell.invocation-weapon-damage-rider
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-marked-damage-rider
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-attack-roll-advantage-save
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-condition-save
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.reaction-counterspell
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-independent-attack-sequence
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-blur-attack-roll-defense
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-damage-reduction
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-sleep-repeat-save-lifecycle
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-sleep-target-admission
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-hideous-laughter-repeat-save-lifecycle
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-grease-ground-hazard
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-fog-cloud-obscurement
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-flaming-sphere-hazard-ram
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-command-halt-grovel
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-command-drop-held-object
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-command-approach-route
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-command-flee-route
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-expeditious-retreat-dash
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-feather-fall-mitigation
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-forced-reaction-movement
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-jump-movement-replacement
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-self-teleport
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-sanctuary-targeting-interdiction
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.creature-type-protection-and-charm
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-condition-removal-protection
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-object-light
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-held-light-emitter spell.invocation-dancing-lights-movable-dim-light
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-make-stable
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.find-familiar-lifecycle
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.reaction-hellish-rebuke spell.invocation-damage-save-or-attack
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.bardic-inspiration-grant unit-feature.bardic-inspiration-failed-d20-test
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.weapon-mastery-sap unit-feature.weapon-mastery-topple unit-feature.weapon-mastery-cleave
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-warding-bond-linked-effect
module battleRuntime {
  import attackDamageComposition.* from "../shared-algebras/proofs/rule-core/attack-damage-composition"
  import hitPointDamage.* from "../shared-algebras/proofs/rule-core/hit-point-damage"
  import hitPointRecovery.* from "../shared-algebras/proofs/rule-core/hit-point-recovery"
  import zeroHitPointLifecycle.* from "../shared-algebras/proofs/rule-core/zero-hit-point-lifecycle"
  import battleRuntimeMovementBridge.* from "./battle-runtime-movement-bridge"
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
  import battleRuntimeSpellInvocation.* from "./battle-runtime-spell-invocation"
  import battleRuntimeSpellAttack.* from "./battle-runtime-spell-attack"
  import battleRuntimeChainedSpellAttack.* from "./battle-runtime-chained-spell-attack"
  import battleRuntimeSaveGatedSpell.* from "./battle-runtime-save-gated-spell"
  import battleRuntimeMarkedRiders.* from "./battle-runtime-marked-riders"
  import battleRuntimeMarkedSpells.* from "./battle-runtime-marked-spells"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"
  import battleRuntimeCombatantSide.* from "./battle-runtime-combatant-side"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeActorCombatants.* from "./battle-runtime-actor-combatants"
  import battleRuntimeSanctuary.* from "./battle-runtime-sanctuary"
  import battleRuntimeFeatherFall.* from "./battle-runtime-feather-fall"
  import battleRuntimeJumpMovement.* from "./battle-runtime-jump-movement"
  import battleRuntimeWeaponHitSpellRiders.* from "./battle-runtime-weapon-hit-spell-riders"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"
  import battleRuntimeTimedEffects.* from "./battle-runtime-timed-effects"
  import battleRuntimeMirrorImage.* from "./battle-runtime-mirror-image"
  import battleRuntimeProtectionFromPoison.* from "./battle-runtime-protection-from-poison"
  import battleRuntimeAttackFacts.* from "./battle-runtime-attack-facts"
  import battleRuntimeHidden.* from "./battle-runtime-hidden"
  import battleRuntimeMovement.* from "./battle-runtime-movement"
  import battleRuntimeRestorationAndBuffs.* from "./battle-runtime-restoration-and-buffs"
  import battleRuntimeSleepHideousLaughter.* from "./battle-runtime-sleep-hideous-laughter"
  import battleRuntimeWardingBond.* from "./battle-runtime-warding-bond"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import battleRuntimeGroundCommand.* from "./battle-runtime-ground-command"
  import battleRuntimeWeaponAttacks.* from "./battle-runtime-weapon-attacks"

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
  // - Spells/Descriptions-M-P.md lines 409-418, Rules-Glossary.md lines
  //   1032-1040, and UBIQUITOUS_LANGUAGE.md: Misty Step is a Bonus Action
  //   instantaneous spell that teleports the caster up to 30 feet to an
  //   unoccupied visible space. Teleportation spends no Movement and does not
  //   provoke Opportunity Attacks; destination visibility and occupancy are
  //   table spatial facts.
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
  //   Spells/Descriptions-E-L.md lines 516-531, Playing-the-Game.md lines
  //   533-551, 684-698, and 704-722, and UBIQUITOUS_LANGUAGE.md entries for
  //   Magic Action, Bonus Action, Spell Slot, Concentration, and Duration:
  //   Flaming Sphere is a level-2 Action spell that creates a 5-foot-diameter
  //   fire sphere for up to 1 minute of Concentration, forces Dexterity Saving
  //   Throws with Fire damage for creatures ending within 5 feet of it, and lets the caster
  //   spend a Bonus Action to move the table-supplied sphere up to 30 feet into
  //   a creature's space for the same save and damage. Barrier, pit, exact
  //   area membership, object ignition, and light-rendering witnesses remain
  //   table/presentation facts outside this promoted hazard/ram subset.
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
  // - Spells/Descriptions-A-D.md lines 436-445, and UBIQUITOUS_LANGUAGE.md:
  //   Barkskin is a level-2 Bonus Action Touch spell that targets a willing
  //   creature and grants a one-hour Armor Class floor of 17 that does not lower
  //   higher Armor Class values.
  // - Spells/Descriptions-M-P.md lines 920-929, Rules-Glossary.md lines
  //   788-790, 828-830, and 854-856, and UBIQUITOUS_LANGUAGE.md: Protection from
  //   Poison is a level-2 Magic Action Touch spell that ends the Poisoned
  //   condition, then grants one-hour Advantage on Saving Throws to avoid or
  //   end Poisoned and Resistance to Poison damage.
  // - Spells/Descriptions-A-D.md lines 85-97 and 692-703,
  //   Spells/Descriptions-A-D.md lines 563-581,
  //   Spells/Descriptions-M-P.md lines 907-918, and
  //   Rules-Glossary.md lines 122-130 and 373-379, and
  //   UBIQUITOUS_LANGUAGE.md: Animal Friendship is a Beast-only Wisdom-save
  //   spell whose failed save grants Charmed for 24 hours, Charm Person is a
  //   Humanoid-only Wisdom-save spell whose failed save grants Charmed for 1
  //   hour with hostile-target save Advantage, Blindness/Deafness is a
  //   level-2 Constitution-save spell whose failed save applies the caster's
  //   chosen Blinded or Deafened condition until a successful end-of-turn
  //   repeat save or duration expiry, and Protection from Evil and Good
  //   applies a Concentration protection whose scoped creature types have
  //   Disadvantage on attack rolls against the target, can't possess the
  //   target, and can't apply Charmed or Frightened to the target.
  //
  // This is the canonical package-local spec for implemented
  // @dnd/battle-runtime behavior. Old root battle.qnt is legacy/Core broad
  // proof and restore source material; it is not the place to add new
  // @dnd/battle-runtime behavior.

  pure def attackTargetAc(state: BattleState): int =
    if (currentActor(state) == Fighter) combatantArmorClass(state.goblin) else combatantArmorClass(state.fighter)

  pure def openHoles(state: BattleState): Set[Hole] =
    if (currentActor(state) == Goblin and not(state.goblinRechargeAvailable))
      Set(StatBlockRechargeRoll)
    else if (currentActorCanAttack(state))
      Set(TargetChoice)
    else Set()

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

  pure def attackReplayHoles(state: BattleState, replay: AttackReplay): Set[Hole] =
    if (not(currentActorCanAttack(state)))
      Set()
    else match replay {
      | AttackNeedsTarget => Set(TargetChoice)
      | AttackNeedsAttackRoll => Set(AttackRoll)
      | AttackRollFilled(roll) =>
          if (not(attackHits(roll.attackTotal, roll.naturalD20, attackTargetAc(state), attackCriticalThreshold(state, currentActor(state)))))
            Set()
          else {
            val attacker = combatantForActor(state, currentActor(state))
            val target = combatantForActor(state, if (currentActor(state) == Fighter) Goblin else Fighter)
            if (mirrorImageRequiresDuplicateRollForAttackRollHit(attacker.activeEffects, target.activeEffects, false))
              Set(MirrorImageDuplicateRoll)
            else
              Set(DamageRoll)
          }
      | AttackReplayComplete => Set()
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

  pure def mistyStepMaxTeleportFeet(): int = 30

  pure def mistyStepDestinationIsLegal(distanceFeet: int, unoccupiedVisibleDestination: bool): bool =
    unoccupiedVisibleDestination and distanceFeet > 0 and distanceFeet <= mistyStepMaxTeleportFeet

  pure def mistyStepTeleportSpendsMovement(): bool = false

  pure def mistyStepTeleportProvokesOpportunityAttacks(): bool = false

  pure def mistyStepTeleportTransportsWornAndCarriedEquipment(): bool = true

  pure def resolveMistyStepSpell(state: BattleState, distanceFeet: int, unoccupiedVisibleDestination: bool): BattleState =
    if (
      currentActor(state) == Fighter and
      state.bonusActionAvailable and
      canExpendSpellSlotThisTurn(state) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state)) and
      mistyStepDestinationIsLegal(distanceFeet, unoccupiedVisibleDestination)
    ) {
      val afterCasterEarlyEnd = battleStateAfterSanctuaryEarlyEndForActor(state, Fighter)
      commitActorSpellSlotUse({ ...afterCasterEarlyEnd, bonusActionAvailable: false }, Fighter)
    } else {
      state
    }

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

  pure def standFighterFromProne(state: BattleState): BattleState = {
    if (combatantHasHideousLaughter(state.fighter))
      state
    else {
      val step = battleRuntimeStandFromProne(movementProjectionForFighter(state, WalkSpeedKind))
      stateWithFighterMovementStep(state, step)
    }
  }

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

  pure def resolveThaumaturgyBoomingVoice(state: BattleState, activeOneMinuteEffectCount: int): BattleState =
    resolveFighterThaumaturgyBoomingVoice(state, currentActor(state), activeOneMinuteEffectCount, fighterHasRage(state))

  pure def rollModifierMaximumTargets(invocation: RollModifierSpell, slotLevel: int): int =
    match invocation {
      | BaneRollModifier => 3 + (if (slotLevel > 1) slotLevel - 1 else 0)
      | BlessRollModifier => 3 + (if (slotLevel > 1) slotLevel - 1 else 0)
      | GuidanceRollModifier => 1
      | PassWithoutTraceRollModifier => Set(Fighter, Goblin).size()
      | EnhanceAbilityRollModifier => 1
    }

  pure def rollModifierActiveEffect(invocation: RollModifierSpell, chosenAbility: Ability): ActiveEffect =
    match invocation {
      | BaneRollModifier => BaneD20RollPenalty
      | BlessRollModifier => BlessD20RollBonus
      | GuidanceRollModifier => GuidanceAbilityCheckBonus
      | PassWithoutTraceRollModifier => PassWithoutTraceStealthBonus
      | EnhanceAbilityRollModifier => EnhanceAbilityCheckAdvantage({ ability: chosenAbility })
    }

  pure def rollModifierRequiresFailedSave(invocation: RollModifierSpell): bool =
    invocation == BaneRollModifier

  pure def rollModifierSpendsLevelOneSlot(invocation: RollModifierSpell): bool =
    invocation != GuidanceRollModifier

  pure def rollModifierSelectedTargetsValid(invocation: RollModifierSpell, selectedTargets: Set[Actor], slotLevel: int): bool = {
    val targetCount = selectedTargets.size()
    targetCount >= 1 and
      targetCount <= rollModifierMaximumTargets(invocation, slotLevel) and
      (invocation != PassWithoutTraceRollModifier or selectedTargets.contains(Fighter))
  }

  pure def rollModifierTargetedState(
    state: BattleState,
    invocation: RollModifierSpell,
    targets: Set[Actor],
    chosenAbility: Ability,
  ): BattleState =
    {
      ...state,
      fighter: if (targets.contains(Fighter)) { ...state.fighter, activeEffects: state.fighter.activeEffects.union(Set(rollModifierActiveEffect(invocation, chosenAbility))) } else state.fighter,
      goblin: if (targets.contains(Goblin)) { ...state.goblin, activeEffects: state.goblin.activeEffects.union(Set(rollModifierActiveEffect(invocation, chosenAbility))) } else state.goblin,
    }

  pure def resolveRollModifierSpell(
    state: BattleState,
    invocation: RollModifierSpell,
    selectedTargets: Set[Actor],
    failedSaveTargets: Set[Actor],
    slotLevel: int,
    chosenAbility: Ability,
  ): BattleState = {
    val affectedTargets =
      if (rollModifierRequiresFailedSave(invocation)) failedSaveTargets else selectedTargets
    if (
      currentActor(state) == Fighter and
      rollModifierSelectedTargetsValid(invocation, selectedTargets, slotLevel) and
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
      val effected = rollModifierTargetedState(concentrationBase, invocation, affectedTargets, chosenAbility)
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


}
