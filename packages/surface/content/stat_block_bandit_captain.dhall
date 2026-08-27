let Effect : Type = { amount : { expr : Optional { abilityModifier : Optional Text, dice : Natural, dieSize : Natural, flat : Optional Integer, spellcastingMod : Optional Bool }, kind : Text, static : Natural }, damageType : Text, kind : Text }
let Procedure : Type = { ability : Optional Text, attackAbility : Optional Text, attackBonus : Optional { kind : Text, value : Integer }, attackType : Optional Text, components : Optional { m : Bool, s : Bool, v : Bool }, description : Optional Text, dispatches : Optional (List { count : { kind : Text, value : Integer }, procedureOrdinal : Natural }), groups : Optional (List { kind : Text, resourceRefs : { kind : Text, ordinals : Optional (List Natural) }, spells : List { restriction : Text, spellId : Text } }), kind : Text, name : Text, onHit : Optional (List Effect), rangeFeet : Optional { long : Natural, normal : Natural }, reachFeet : Optional Natural }
let defaultProcedure : Procedure = { ability = None Text, attackAbility = None Text, attackBonus = None { kind : Text, value : Integer }, attackType = None Text, components = None { m : Bool, s : Bool, v : Bool }, description = None Text, dispatches = None (List { count : { kind : Text, value : Integer }, procedureOrdinal : Natural }), groups = None (List { kind : Text, resourceRefs : { kind : Text, ordinals : Optional (List Natural) }, spells : List { restriction : Text, spellId : Text } }), kind = "", name = "", onHit = None (List Effect), rangeFeet = None { long : Natural, normal : Natural }, reachFeet = None Natural }
let Action : Type = { description : Optional Text, kind : Text, name : Optional Text, procedure : Optional Procedure, procedureOrdinal : Natural, reason : Optional Text, resourceRefs : { kind : Text, ordinals : Optional (List Natural) } }
let defaultAction : Action = { description = None Text, kind = "", name = None Text, procedure = None Procedure, procedureOrdinal = 0, reason = None Text, resourceRefs = { kind = "none", ordinals = None (List Natural) } }
let defaultEffect : Effect = { amount = { expr = None { abilityModifier : Optional Text, dice : Natural, dieSize : Natural, flat : Optional Integer, spellcastingMod : Optional Bool }, kind = "fixed", static = 1 }, damageType = "bludgeoning", kind = "damage" }
in { challengeRating = 2
, id = "stat_block_bandit_captain"
, kind = "statBlock"
, name = "Bandit Captain"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:442-473" }
, statBlock =
  { abilityScores =
    { cha = 14, con = 14, dex = 16, int = 14, str = 15, wis = 11 }
  , ac.value = { kind = "literal", value = 15 }
  , actions = [ defaultAction // { kind = "textOnly", procedureOrdinal = 1, description = Some "The bandit makes two attacks, using Scimitar and Pistol in any combination.", name = Some "Multiattack", reason = Some "unsupported_action_shape" },
defaultAction // { kind = "executable", procedureOrdinal = 2, procedure = Some (defaultProcedure // { kind = "attack_roll", name = "Scimitar", attackAbility = Some "str", attackBonus = Some { kind = "literal", value = +5 }, attackType = Some "melee", reachFeet = Some 5, onHit = Some [ defaultEffect // { amount = { expr = Some { abilityModifier = None Text, dice = 1, dieSize = 6, flat = Some +3, spellcastingMod = None Bool }, kind = "fixed", static = 6 }, damageType = "slashing", kind = "damage" } ], description = Some "Melee Attack Roll: +5, reach 5 ft. Hit: 6 (1d6 + 3) Slashing damage." }) },
defaultAction // { kind = "executable", procedureOrdinal = 3, procedure = Some (defaultProcedure // { kind = "attack_roll", name = "Pistol", attackAbility = Some "dex", attackBonus = Some { kind = "literal", value = +5 }, attackType = Some "ranged", rangeFeet = Some { normal = 30, long = 90 }, onHit = Some [ defaultEffect // { amount = { expr = Some { abilityModifier = None Text, dice = 1, dieSize = 10, flat = Some +3, spellcastingMod = None Bool }, kind = "fixed", static = 8 }, damageType = "piercing", kind = "damage" } ], description = Some "Ranged Attack Roll: +5, range 30/90 ft. Hit: 8 (1d10 + 3) Piercing damage." }) } ]
  , alignment = { morality = "neutral", order = "neutral" }
  , communication =
    { kind = "spoken_and_understood"
    , languages = { kind = "named", languages = [ "Common", "Thieves' Cant" ] }
    }
  , creatureType = "humanoid"
  , gear =
    [ { item = "Pistol" }
    , { item = "Scimitar" }
    , { item = "Studded Leather Armor" }
    ]
  , hp = { kind = "literal", value = 52 }
  , initiative = { modifier = 3, score = 13 }
  , passivePerception = 10
  , reactions =
    [ { description =
          "Trigger: The bandit is hit by a melee attack roll while holding a weapon. Response: The bandit adds 2 to its AC against that attack, possibly causing it to miss."
      , kind = "textOnly"
      , name = "Parry"
      , procedureOrdinal = 1
      , reason = "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    ]
  , savingThrowModifiers =
    [ { ability = "str", modifier = 4 }
    , { ability = "dex", modifier = 3 }
    , { ability = "con", modifier = 2 }
    , { ability = "int", modifier = 2 }
    , { ability = "wis", modifier = 0 }
    , { ability = "cha", modifier = 2 }
    ]
  , size = { kind = "alternatives", options = [ "medium", "small" ] }
  , skillModifiers =
    [ { modifier = 4, skill = "athletics" }
    , { modifier = 4, skill = "deception" }
    ]
  , speeds = [ { feet = { kind = "literal", value = 30 }, kind = "walk" } ]
  }
}
