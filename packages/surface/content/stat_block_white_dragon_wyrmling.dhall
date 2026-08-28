{ challengeRating = 2
, id = "stat_block_white_dragon_wyrmling"
, kind = "statBlock"
, name = "White Dragon Wyrmling"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-T-Z.md:914-944" }
, statBlock =
  { abilityScores =
    { cha = 11, con = 14, dex = 10, int = 5, str = 14, wis = 10 }
  , ac.value = { kind = "literal", value = 16 }
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
          [ { count = { kind = "literal", value = 2 }, procedureOrdinal = 2 } ]
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
        , attackBonus = Some { kind = "literal", value = 4 }
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
              { expr = { dice = 1, dieSize = 8, flat = Some 2 }
              , kind = "fixed"
              , static = 6
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
        , reachFeet = Some 5
        }
      , procedureOrdinal = 2
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    , { kind = "executable"
      , procedure =
        { ability = Some "con"
        , area = Some { kind = "cone", lengthFeet = 15 }
        , attackAbility = None Text
        , attackBonus = None { kind : Text, value : Natural }
        , attackType = None Text
        , dc = Some { dc = 12, kind = "fixed" }
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
            { expr = { dice = 5, dieSize = 8 }, kind = "fixed", static = 22 }
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
    , languages = { kind = "named", languages = [ "Draconic" ] }
    }
  , creatureType = "dragon"
  , creatureTypeTags = [ "chromatic" ]
  , hp = { kind = "literal", value = 32 }
  , immunities = { conditions = [] : List <>, damageTypes = [ "cold" ] }
  , initiative = { modifier = 2, score = 12 }
  , passivePerception = 14
  , resources =
    [ { limit = { kind = "recharge", minimumRoll = 5 }
      , ordinal = 1
      , ownership = "shared"
      }
    ]
  , savingThrowModifiers =
    [ { ability = "cha", modifier = +0 }
    , { ability = "con", modifier = +2 }
    , { ability = "dex", modifier = +2 }
    , { ability = "int", modifier = -3 }
    , { ability = "str", modifier = +2 }
    , { ability = "wis", modifier = +2 }
    ]
  , senses =
    [ { kind = "blindsight", rangeFeet = 10 }
    , { kind = "darkvision", rangeFeet = 60 }
    ]
  , size = "medium"
  , skillModifiers =
    [ { modifier = 4, skill = "perception" }
    , { modifier = 2, skill = "stealth" }
    ]
  , speeds =
    [ { feet = { kind = "literal", value = 30 }, kind = "walk" }
    , { feet = { kind = "literal", value = 15 }, kind = "burrow" }
    , { feet = { kind = "literal", value = 60 }, kind = "fly" }
    , { feet = { kind = "literal", value = 30 }, kind = "swim" }
    ]
  , traits =
    [ { description =
          "The dragon can move across and climb icy surfaces without needing to make an ability check. Additionally, Difficult Terrain composed of ice or snow doesn't cost it extra movement."
      , name = "Ice Walk"
      }
    ]
  }
}
