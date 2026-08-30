{ challengeRating = 6
, id = "stat_block_young_white_dragon"
, kind = "statBlock"
, name = "Young White Dragon"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-T-Z.md:948-978" }
, statBlock =
  { abilityScores =
    { cha = 12, con = 18, dex = 10, int = 6, str = 18, wis = 11 }
  , ac.value = { kind = "literal", value = 17 }
  , actions =
    [ { kind = "executable"
      , procedure =
        { ability = None Text
        , area = None { kind : Text, lengthFeet : Natural }
        , attackAbility = None Text
        , attackBonus = None { kind : Text, value : Natural }
        , attackType = None Text
        , dc = None { dc : Natural, kind : Text }
        , dispatches = Some
          [ { count = { kind = "literal", value = 3 }, procedureOrdinal = 2 } ]
        , kind = "multiattack"
        , name = "Multiattack"
        , onFail =
            None
              { amount :
                  { expr : { dice : Natural, dieSize : Natural }
                  , kind : Text
                  , static : Natural
                  }
              , damageType : Text
              , kind : Text
              }
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
        , onSuccess = None { kind : Text }
        , reachFeet = None Natural
        }
      , procedureOrdinal = 1
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    , { kind = "executable"
      , procedure =
        { ability = None Text
        , area = None { kind : Text, lengthFeet : Natural }
        , attackAbility = Some "str"
        , attackBonus = Some { kind = "literal", value = 7 }
        , attackType = Some "melee"
        , dc = None { dc : Natural, kind : Text }
        , dispatches =
            None
              ( List
                  { count : { kind : Text, value : Natural }
                  , procedureOrdinal : Natural
                  }
              )
        , kind = "attack_roll"
        , name = "Rend"
        , onFail =
            None
              { amount :
                  { expr : { dice : Natural, dieSize : Natural }
                  , kind : Text
                  , static : Natural
                  }
              , damageType : Text
              , kind : Text
              }
        , onHit = Some
          [ { amount =
              { expr = { dice = 2, dieSize = 4, flat = Some 4 }
              , kind = "fixed"
              , static = 9
              }
            , damageType = "slashing"
            , kind = "damage"
            }
          , { amount =
              { expr = { dice = 1, dieSize = 4, flat = None Natural }
              , kind = "fixed"
              , static = 2
              }
            , damageType = "cold"
            , kind = "damage"
            }
          ]
        , onSuccess = None { kind : Text }
        , reachFeet = Some 10
        }
      , procedureOrdinal = 2
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    , { kind = "executable"
      , procedure =
        { ability = Some "con"
        , area = Some { kind = "cone", lengthFeet = 30 }
        , attackAbility = None Text
        , attackBonus = None { kind : Text, value : Natural }
        , attackType = None Text
        , dc = Some { dc = 15, kind = "fixed" }
        , dispatches =
            None
              ( List
                  { count : { kind : Text, value : Natural }
                  , procedureOrdinal : Natural
                  }
              )
        , kind = "save"
        , name = "Cold Breath"
        , onFail = Some
          { amount =
            { expr = { dice = 9, dieSize = 8 }, kind = "fixed", static = 40 }
          , damageType = "cold"
          , kind = "damage"
          }
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
        , onSuccess = Some { kind = "half_damage" }
        , reachFeet = None Natural
        }
      , procedureOrdinal = 3
      , resourceRefs = { kind = "some", ordinals = Some [ 1 ] }
      }
    ]
  , alignment = { morality = "evil", order = "chaotic" }
  , communication =
    { kind = "spoken_and_understood"
    , languages = { kind = "named", languages = [ "Common", "Draconic" ] }
    }
  , creatureType = "dragon"
  , creatureTypeTags = [ "chromatic" ]
  , hp = { kind = "literal", value = 123 }
  , immunities = { conditions = [] : List <>, damageTypes = [ "cold" ] }
  , initiative = { modifier = 3, score = 13 }
  , passivePerception = 16
  , resources =
    [ { limit = { kind = "recharge", minimumRoll = 5 }
      , ordinal = 1
      , ownership = "shared"
      }
    ]
  , savingThrowModifiers =
    [ { ability = "cha", modifier = 1 }
    , { ability = "con", modifier = 4 }
    , { ability = "dex", modifier = 3 }
    , { ability = "int", modifier = 2 }
    , { ability = "str", modifier = 4 }
    , { ability = "wis", modifier = 3 }
    ]
  , senses =
    [ { kind = "blindsight", rangeFeet = 30 }
    , { kind = "darkvision", rangeFeet = 120 }
    ]
  , size = "large"
  , skillModifiers =
    [ { modifier = 6, skill = "perception" }
    , { modifier = 3, skill = "stealth" }
    ]
  , speeds =
    [ { feet = { kind = "literal", value = 40 }, kind = "walk" }
    , { feet = { kind = "literal", value = 20 }, kind = "burrow" }
    , { feet = { kind = "literal", value = 80 }, kind = "fly" }
    , { feet = { kind = "literal", value = 40 }, kind = "swim" }
    ]
  , traits =
    [ { description =
          "The dragon can move across and climb icy surfaces without needing to make an ability check. Additionally, Difficult Terrain composed of ice or snow doesn't cost it extra movement."
      , name = "Ice Walk"
      }
    ]
  }
}
