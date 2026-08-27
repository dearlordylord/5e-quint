{ challengeRating = 2
, id = "stat_block_ankheg"
, kind = "statBlock"
, name = "Ankheg"
, provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:180-207" }
, statBlock =
  { abilityScores = { cha = 6, con = 14, dex = 11, int = 1, str = 17, wis = 13 }
  , ac.value = { kind = "literal", value = 14 }
  , actions =
    [ { kind = "executable"
      , procedure = Some
          { ability = None Text
          , attackAbility = Some "str"
          , attackBonus = Some { kind = "literal", value = +5 }
          , attackType = Some "melee"
          , area = None { kind : Text, lengthFeet : Natural, widthFeet : Natural }
          , components = None { m : Bool, s : Bool, v : Bool }
          , dc = None { dc : Natural, kind : Text }
          , description = Some "The ankheg has Advantage if the target is Grappled by the ankheg. If the target is a Large or smaller creature, it has the Grappled condition (escape DC 13)."
          , dispatches = None (List { count : { kind : Text, value : Natural }, procedureOrdinal : Natural })
          , groups = None (List { kind : Text, resourceRefs : { kind : Text, ordinals : Optional (List Natural) }, spells : List { restriction : Text, spellId : Text } })
          , kind = "attack_roll"
          , name = "Bite"
          , onFail = None { amount : { expr : { abilityModifier : Optional Text, dice : Natural, dieSize : Natural, flat : Optional Integer, spellcastingMod : Optional Bool }, kind : Text, static : Natural }, damageType : Text, kind : Text }
          , onHit = Some
              [ { amount = { expr = { dice = 2, dieSize = 6, flat = Some +3 }, kind = "fixed", static = 10 }, damageType = "slashing", kind = "damage" }
              , { amount = { expr = { dice = 1, dieSize = 6, flat = None Integer }, kind = "fixed", static = 3 }, damageType = "acid", kind = "damage" }
              ]
          , reachFeet = Some 5
          , rangeFeet = None { long : Natural, normal : Natural }
          , onSuccess = None { kind : Text }
          , target = None { kind : Text, rangeFeet : Natural }
          }
      , procedureOrdinal = 1
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    , { kind = "executable"
      , procedure = Some
          { ability = Some "dex"
          , attackAbility = None Text
          , attackBonus = None { kind : Text, value : Integer }
          , attackType = None Text
          , area = Some { kind = "line", lengthFeet = 30, widthFeet = 5 }
          , components = None { m : Bool, s : Bool, v : Bool }
          , description = None Text
          , dc = Some { dc = 12, kind = "fixed" }
          , dispatches = None (List { count : { kind : Text, value : Natural }, procedureOrdinal : Natural })
          , groups = None (List { kind : Text, resourceRefs : { kind : Text, ordinals : Optional (List Natural) }, spells : List { restriction : Text, spellId : Text } })
          , kind = "save"
          , name = "Acid Spray"
          , onFail = Some { amount = { expr = { abilityModifier = None Text, dice = 4, dieSize = 6, flat = None Integer, spellcastingMod = None Bool }, kind = "fixed", static = 14 }, damageType = "acid", kind = "damage" }
          , onHit = None (List { amount : { expr : { dice : Natural, dieSize : Natural, flat : Optional Integer }, kind : Text, static : Natural }, damageType : Text, kind : Text })
          , onSuccess = Some { kind = "half_damage" }
          , reachFeet = None Natural
          , rangeFeet = None { long : Natural, normal : Natural }
          , target = None { kind : Text, rangeFeet : Natural }
          }
      , procedureOrdinal = 2
      , resourceRefs = { kind = "some", ordinals = Some [ 1 ] }
      }
    ]
  , alignment = "unaligned"
  , communication = { kind = "none" }
  , creatureType = "monstrosity"
  , hp = { kind = "literal", value = 45 }
  , initiative = { modifier = 0, score = 10 }
  , passivePerception = 11
  , savingThrowModifiers = [ { ability = "str", modifier = +3 }, { ability = "dex", modifier = +0 }, { ability = "con", modifier = +2 }, { ability = "int", modifier = -5 }, { ability = "wis", modifier = +1 }, { ability = "cha", modifier = -2 } ]
  , senses = [ { kind = "darkvision", rangeFeet = 60 }, { kind = "tremorsense", rangeFeet = 60 } ]
  , size = "large"
  , speeds = [ { feet = { kind = "literal", value = 30 }, kind = "walk" }, { feet = { kind = "literal", value = 10 }, kind = "burrow" } ]
  , resources = [ { limit = { kind = "recharge", minimumRoll = 6 }, ordinal = 1, ownership = "each" } ]
  }
}
