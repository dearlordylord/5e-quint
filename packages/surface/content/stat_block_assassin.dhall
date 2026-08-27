let Effect : Type = { amount : { expr : Optional { abilityModifier : Optional Text, dice : Natural, dieSize : Natural, flat : Optional Integer, spellcastingMod : Optional Bool }, kind : Text, static : Natural }, damageType : Text, kind : Text }
let Procedure : Type = { ability : Optional Text, attackAbility : Optional Text, attackBonus : Optional { kind : Text, value : Integer }, attackType : Optional Text, components : Optional { m : Bool, s : Bool, v : Bool }, description : Optional Text, dispatches : Optional (List { count : { kind : Text, value : Integer }, procedureOrdinal : Natural }), groups : Optional (List { kind : Text, resourceRefs : { kind : Text, ordinals : Optional (List Natural) }, spells : List { restriction : Text, spellId : Text } }), kind : Text, name : Text, onHit : Optional (List Effect), rangeFeet : Optional { long : Natural, normal : Natural }, reachFeet : Optional Natural }
let defaultProcedure : Procedure = { ability = None Text, attackAbility = None Text, attackBonus = None { kind : Text, value : Integer }, attackType = None Text, components = None { m : Bool, s : Bool, v : Bool }, description = None Text, dispatches = None (List { count : { kind : Text, value : Integer }, procedureOrdinal : Natural }), groups = None (List { kind : Text, resourceRefs : { kind : Text, ordinals : Optional (List Natural) }, spells : List { restriction : Text, spellId : Text } }), kind = "", name = "", onHit = None (List Effect), rangeFeet = None { long : Natural, normal : Natural }, reachFeet = None Natural }
let Action : Type = { description : Optional Text, kind : Text, name : Optional Text, procedure : Optional Procedure, procedureOrdinal : Natural, reason : Optional Text, resourceRefs : { kind : Text, ordinals : Optional (List Natural) } }
let defaultAction : Action = { description = None Text, kind = "", name = None Text, procedure = None Procedure, procedureOrdinal = 0, reason = None Text, resourceRefs = { kind = "none", ordinals = None (List Natural) } }
let defaultEffect : Effect = { amount = { expr = None { abilityModifier : Optional Text, dice : Natural, dieSize : Natural, flat : Optional Integer, spellcastingMod : Optional Bool }, kind = "fixed", static = 1 }, damageType = "bludgeoning", kind = "damage" }
in { challengeRating = 8
, id = "stat_block_assassin"
, kind = "statBlock"
, name = "Assassin"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:211-247" }
, statBlock =
  { abilityScores =
    { cha = 10, con = 14, dex = 18, int = 16, str = 11, wis = 11 }
  , ac.value = { kind = "literal", value = 16 }
  , actions = [ defaultAction // { kind = "textOnly", procedureOrdinal = 1, description = Some "The assassin makes three attacks, using Shortsword or Light Crossbow in any combination.", name = Some "Multiattack", reason = Some "unsupported_action_shape" },
defaultAction // { kind = "executable", procedureOrdinal = 2, procedure = Some (defaultProcedure // { kind = "attack_roll", name = "Shortsword", attackAbility = Some "dex", attackBonus = Some { kind = "literal", value = +7 }, attackType = Some "melee", reachFeet = Some 5, onHit = Some [ defaultEffect // { amount = { expr = Some { abilityModifier = None Text, dice = 1, dieSize = 6, flat = Some +4, spellcastingMod = None Bool }, kind = "fixed", static = 7 }, damageType = "piercing", kind = "damage" }, defaultEffect // { amount = { expr = Some { abilityModifier = None Text, dice = 5, dieSize = 6, flat = None Integer, spellcastingMod = None Bool }, kind = "fixed", static = 17 }, damageType = "poison", kind = "damage" } ], description = Some "Melee Attack Roll: +7, reach 5 ft. Hit: 7 (1d6 + 4) Piercing damage plus 17 (5d6) Poison damage, and the target has the Poisoned condition until the start of the assassin's next turn." }) },
defaultAction // { kind = "executable", procedureOrdinal = 3, procedure = Some (defaultProcedure // { kind = "attack_roll", name = "Light Crossbow", attackAbility = Some "dex", attackBonus = Some { kind = "literal", value = +7 }, attackType = Some "ranged", rangeFeet = Some { normal = 80, long = 320 }, onHit = Some [ defaultEffect // { amount = { expr = Some { abilityModifier = None Text, dice = 1, dieSize = 8, flat = Some +4, spellcastingMod = None Bool }, kind = "fixed", static = 8 }, damageType = "piercing", kind = "damage" }, defaultEffect // { amount = { expr = Some { abilityModifier = None Text, dice = 6, dieSize = 6, flat = None Integer, spellcastingMod = None Bool }, kind = "fixed", static = 21 }, damageType = "poison", kind = "damage" } ], description = Some "Ranged Attack Roll: +7, range 80/320 ft. Hit: 8 (1d8 + 4) Piercing damage plus 21 (6d6) Poison damage.)" }) } ]
  , alignment = { morality = "neutral", order = "neutral" }
  , bonusActions =
    [ { kind = "executable"
      , procedure =
        { kind = "action_option"
        , name = "Cunning Action"
        , options = [ "dash", "disengage", "hide" ]
        }
      , procedureOrdinal = 1
      , resourceRefs.kind = "none"
      }
    ]
  , communication =
    { kind = "spoken_and_understood"
    , languages = { kind = "named", languages = [ "Common", "Thieves' Cant" ] }
    }
  , creatureType = "humanoid"
  , gear =
    [ { item = "Light Crossbow" }
    , { item = "Shortsword" }
    , { item = "Studded Leather Armor" }
    ]
  , hp = { kind = "literal", value = 97 }
  , initiative = { modifier = 10, score = 20 }
  , passivePerception = 16
  , resistances = { damageTypes = [ "poison" ], kind = "fixed" }
  , savingThrowModifiers =
    [ { ability = "str", modifier = 0 }
    , { ability = "dex", modifier = 7 }
    , { ability = "con", modifier = 2 }
    , { ability = "int", modifier = 6 }
    , { ability = "wis", modifier = 0 }
    , { ability = "cha", modifier = 0 }
    ]
  , size = { kind = "alternatives", options = [ "medium", "small" ] }
  , skillModifiers =
    [ { modifier = 7, skill = "acrobatics" }
    , { modifier = 6, skill = "perception" }
    , { modifier = 10, skill = "stealth" }
    ]
  , speeds = [ { feet = { kind = "literal", value = 30 }, kind = "walk" } ]
  }
}
