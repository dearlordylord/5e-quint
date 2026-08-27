let Effect : Type = { amount : { expr : Optional { abilityModifier : Optional Text, dice : Natural, dieSize : Natural, flat : Optional Integer, spellcastingMod : Optional Bool }, kind : Text, static : Natural }, damageType : Text, kind : Text }
let Procedure : Type = { ability : Optional Text, attackAbility : Optional Text, attackBonus : Optional { kind : Text, value : Integer }, attackType : Optional Text, components : Optional { m : Bool, s : Bool, v : Bool }, description : Optional Text, dispatches : Optional (List { count : { kind : Text, value : Integer }, procedureOrdinal : Natural }), groups : Optional (List { kind : Text, resourceRefs : { kind : Text, ordinals : Optional (List Natural) }, spells : List { restriction : Text, spellId : Text } }), kind : Text, name : Text, onHit : Optional (List Effect), rangeFeet : Optional { long : Natural, normal : Natural }, reachFeet : Optional Natural }
let defaultProcedure : Procedure = { ability = None Text, attackAbility = None Text, attackBonus = None { kind : Text, value : Integer }, attackType = None Text, components = None { m : Bool, s : Bool, v : Bool }, description = None Text, dispatches = None (List { count : { kind : Text, value : Integer }, procedureOrdinal : Natural }), groups = None (List { kind : Text, resourceRefs : { kind : Text, ordinals : Optional (List Natural) }, spells : List { restriction : Text, spellId : Text } }), kind = "", name = "", onHit = None (List Effect), rangeFeet = None { long : Natural, normal : Natural }, reachFeet = None Natural }
let Action : Type = { description : Optional Text, kind : Text, name : Optional Text, procedure : Optional Procedure, procedureOrdinal : Natural, reason : Optional Text, resourceRefs : { kind : Text, ordinals : Optional (List Natural) } }
let defaultAction : Action = { description = None Text, kind = "", name = None Text, procedure = None Procedure, procedureOrdinal = 0, reason = None Text, resourceRefs = { kind = "none", ordinals = None (List Natural) } }
let defaultEffect : Effect = { amount = { expr = None { abilityModifier : Optional Text, dice : Natural, dieSize : Natural, flat : Optional Integer, spellcastingMod : Optional Bool }, kind = "fixed", static = 1 }, damageType = "bludgeoning", kind = "damage" }
in { challengeRating = 19
, id = "stat_block_balor"
, kind = "statBlock"
, name = "Balor"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:366-408" }
, statBlock =
  { abilityScores =
    { cha = 22, con = 22, dex = 15, int = 20, str = 26, wis = 16 }
  , ac.value = { kind = "literal", value = 19 }
  , actions = [ defaultAction // { kind = "executable", procedureOrdinal = 1, procedure = Some (defaultProcedure // { kind = "multiattack", name = "Multiattack", dispatches = Some [ { count = { kind = "literal", value = +1 }, procedureOrdinal = 2 }, { count = { kind = "literal", value = +1 }, procedureOrdinal = 3 } ] }) },
defaultAction // { kind = "executable", procedureOrdinal = 2, procedure = Some (defaultProcedure // { kind = "attack_roll", name = "Flame Whip", attackAbility = Some "str", attackBonus = Some { kind = "literal", value = +14 }, attackType = Some "melee", reachFeet = Some 30, onHit = Some [ defaultEffect // { amount = { expr = Some { abilityModifier = None Text, dice = 3, dieSize = 6, flat = Some +8, spellcastingMod = None Bool }, kind = "fixed", static = 18 }, damageType = "force", kind = "damage" }, defaultEffect // { amount = { expr = Some { abilityModifier = None Text, dice = 5, dieSize = 6, flat = None Integer, spellcastingMod = None Bool }, kind = "fixed", static = 17 }, damageType = "fire", kind = "damage" } ], description = Some "Melee Attack Roll: +14, reach 30 ft. Hit: 18 (3d6 + 8) Force damage plus 17 (5d6) Fire damage. If the target is a Huge or smaller creature, the balor pulls the target up to 25 feet straight toward itself, and the target has the Prone condition." }) },
defaultAction // { kind = "executable", procedureOrdinal = 3, procedure = Some (defaultProcedure // { kind = "attack_roll", name = "Lightning Blade", attackAbility = Some "str", attackBonus = Some { kind = "literal", value = +14 }, attackType = Some "melee", reachFeet = Some 10, onHit = Some [ defaultEffect // { amount = { expr = Some { abilityModifier = None Text, dice = 3, dieSize = 8, flat = Some +8, spellcastingMod = None Bool }, kind = "fixed", static = 21 }, damageType = "force", kind = "damage" }, defaultEffect // { amount = { expr = Some { abilityModifier = None Text, dice = 4, dieSize = 10, flat = None Integer, spellcastingMod = None Bool }, kind = "fixed", static = 22 }, damageType = "lightning", kind = "damage" } ], description = Some "Melee Attack Roll: +14, reach 10 ft. Hit: 21 (3d8 + 8) Force damage plus 22 (4d10) Lightning damage, and the target can't take Reactions until the start of the balor's next turn." }) } ]
  , alignment = { morality = "evil", order = "chaotic" }
  , bonusActions =
    [ { description =
          "The balor teleports itself or a willing demon within 10 feet of itself up to 60 feet to an unoccupied space the balor can see."
      , kind = "textOnly"
      , name = "Teleport"
      , procedureOrdinal = 1
      , reason = "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    ]
  , communication =
    { kind = "spoken_and_understood"
    , languages = { kind = "named", languages = [ "Abyssal" ] }
    , telepathy.rangeFeet = 120
    }
  , creatureType = "fiend"
  , creatureTypeTags = [ "demon" ]
  , hp = { kind = "literal", value = 287 }
  , immunities =
    { conditions = [ "charmed", "frightened", "poisoned" ]
    , damageTypes = [ "fire", "poison" ]
    }
  , initiative = { modifier = 14, score = 24 }
  , passivePerception = 19
  , resistances = { damageTypes = [ "cold", "lightning" ], kind = "fixed" }
  , savingThrowModifiers =
    [ { ability = "str", modifier = 8 }
    , { ability = "dex", modifier = 2 }
    , { ability = "con", modifier = 12 }
    , { ability = "int", modifier = 5 }
    , { ability = "wis", modifier = 9 }
    , { ability = "cha", modifier = 6 }
    ]
  , senses = [ { kind = "truesight", rangeFeet = 120 } ]
  , size = "huge"
  , speeds =
    [ { feet = { kind = "literal", value = 40 }, kind = "walk" }
    , { feet = { kind = "literal", value = 80 }, kind = "fly" }
    ]
  }
}
