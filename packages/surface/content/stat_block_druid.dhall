{ challengeRating = 2
, id = "stat_block_druid"
, kind = "statBlock"
, name = "Druid"
, provenance =
  { kind = "srd-5.2.1"
  , section = "monsters-A-Z.md:5451-5527"
  }
, statBlock =
  { abilityScores =
    { cha = 11, con = 13, dex = 12, int = 12, str = 10, wis = 16 }
  , ac.value = { kind = "literal", value = 13 }
  , actions =
    [ { description = Some
          "The druid makes two attacks, using Vine Staff or Verdant Wisp in any combination."
      , kind = "textOnly"
      , name = Some "Multiattack"
      , procedure =
          None
            { ability : Optional Text
            , attackAbility : Optional Text
            , attackBonus : Optional { kind : Text, value : Natural }
            , attackType : Optional Text
            , groups :
                Optional
                  ( List
                      { kind : Text
                      , resourceRefs :
                          { kind : Text, ordinals : Optional (List Natural) }
                      , spells : List { spellId : Text }
                      }
                  )
            , kind : Text
            , name : Text
            , onHit :
                Optional
                  ( List
                      { amount :
                          { expr :
                              { dice : Natural
                              , dieSize : Natural
                              , flat : Optional Natural
                              }
                          , kind : Text
                          , static : Natural
                          }
                      , damageType : Text
                      , kind : Text
                      }
                  )
            , rangeFeet : Optional { long : Natural, normal : Natural }
            , reachFeet : Optional Natural
            , spellSaveDc : Optional { dc : Natural, kind : Text }
            }
      , procedureOrdinal = 1
      , reason = Some "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { ability = None Text
        , attackAbility = Some "wis"
        , attackBonus = Some { kind = "literal", value = 5 }
        , attackType = Some "melee"
        , groups =
            None
              ( List
                  { kind : Text
                  , resourceRefs :
                      { kind : Text, ordinals : Optional (List Natural) }
                  , spells : List { spellId : Text }
                  }
              )
        , kind = "attack_roll"
        , name = "Vine Staff"
        , onHit = Some
          [ { amount =
              { expr = { dice = 1, dieSize = 8, flat = Some 3 }
              , kind = "fixed"
              , static = 7
              }
            , damageType = "bludgeoning"
            , kind = "damage"
            }
          , { amount =
              { expr = { dice = 1, dieSize = 4, flat = None Natural }
              , kind = "fixed"
              , static = 2
              }
            , damageType = "poison"
            , kind = "damage"
            }
          ]
        , rangeFeet = None { long : Natural, normal : Natural }
        , reachFeet = Some 5
        , spellSaveDc = None { dc : Natural, kind : Text }
        }
      , procedureOrdinal = 2
      , reason = None Text
      , resourceRefs.kind = "none"
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { ability = None Text
        , attackAbility = Some "wis"
        , attackBonus = Some { kind = "literal", value = 5 }
        , attackType = Some "ranged"
        , groups =
            None
              ( List
                  { kind : Text
                  , resourceRefs :
                      { kind : Text, ordinals : Optional (List Natural) }
                  , spells : List { spellId : Text }
                  }
              )
        , kind = "attack_roll"
        , name = "Verdant Wisp"
        , onHit = Some
          [ { amount =
              { expr = { dice = 3, dieSize = 6, flat = None Natural }
              , kind = "fixed"
              , static = 10
              }
            , damageType = "radiant"
            , kind = "damage"
            }
          ]
        , rangeFeet = Some { long = 90, normal = 90 }
        , reachFeet = None Natural
        , spellSaveDc = None { dc : Natural, kind : Text }
        }
      , procedureOrdinal = 3
      , reason = None Text
      , resourceRefs.kind = "none"
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { ability = Some "wis"
        , attackAbility = None Text
        , attackBonus = None { kind : Text, value : Natural }
        , attackType = None Text
        , groups = Some
          [ { kind = "at_will"
            , resourceRefs = { kind = "none", ordinals = None (List Natural) }
            , spells =
              [ { spellId = "druidcraft" }, { spellId = "speak_with_animals" } ]
            }
          , { kind = "limited"
            , resourceRefs = { kind = "some", ordinals = Some [ 1 ] }
            , spells = [ { spellId = "entangle" }, { spellId = "thunderwave" } ]
            }
          , { kind = "limited"
            , resourceRefs = { kind = "some", ordinals = Some [ 2 ] }
            , spells =
              [ { spellId = "animal_messenger" }
              , { spellId = "longstrider" }
              , { spellId = "moonbeam" }
              ]
            }
          ]
        , kind = "spellcasting"
        , name = "Spellcasting"
        , onHit =
            None
              ( List
                  { amount :
                      { expr :
                          { dice : Natural
                          , dieSize : Natural
                          , flat : Optional Natural
                          }
                      , kind : Text
                      , static : Natural
                      }
                  , damageType : Text
                  , kind : Text
                  }
              )
        , rangeFeet = None { long : Natural, normal : Natural }
        , reachFeet = None Natural
        , spellSaveDc = Some { dc = 13, kind = "fixed" }
        }
      , procedureOrdinal = 4
      , reason = None Text
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = { morality = "neutral", order = "neutral" }
  , communication =
    { kind = "spoken_and_understood"
    , languages =
      { kind = "named", languages = [ "Common", "Druidic", "Sylvan" ] }
    }
  , creatureType = "humanoid"
  , creatureTypeTags = [ "druid" ]
  , gear = [ { item = "Studded Leather Armor" } ]
  , hp = { kind = "literal", value = 44 }
  , initiative = { modifier = 1, score = 11 }
  , passivePerception = 15
  , resources =
    [ { limit = { kind = "daily", uses = 2 }, ordinal = 1, ownership = "each" }
    , { limit = { kind = "daily", uses = 1 }, ordinal = 2, ownership = "each" }
    ]
  , savingThrowModifiers =
    [ { ability = "str", modifier = 0 }
    , { ability = "dex", modifier = 1 }
    , { ability = "con", modifier = 1 }
    , { ability = "int", modifier = 1 }
    , { ability = "wis", modifier = 3 }
    , { ability = "cha", modifier = 0 }
    ]
  , size = { kind = "alternatives", options = [ "medium", "small" ] }
  , skillModifiers =
    [ { modifier = 5, skill = "medicine" }
    , { modifier = 3, skill = "nature" }
    , { modifier = 5, skill = "perception" }
    ]
  , speeds = [ { feet = { kind = "literal", value = 30 }, kind = "walk" } ]
  }
}
