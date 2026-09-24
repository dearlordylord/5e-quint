{ challengeRating = 8
, id = "stat_block_young_green_dragon"
, kind = "statBlock"
, name = "Young Green Dragon"
, provenance = { kind = "srd-5.2.1", section = "monsters-A-Z.md:8092-8169" }
, statBlock =
  { abilityScores =
    { cha = 15, con = 17, dex = 12, int = 16, str = 19, wis = 13 }
  , ac.value = { kind = "literal", value = 18 }
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
              { expr = { dice = 2, dieSize = 6, flat = Some 4 }
              , kind = "fixed"
              , static = 11
              }
            , damageType = "slashing"
            , kind = "damage"
            }
          , { amount =
              { expr = { dice = 2, dieSize = 6, flat = None Natural }
              , kind = "fixed"
              , static = 7
              }
            , damageType = "poison"
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
        , dc = Some { dc = 14, kind = "fixed" }
        , dispatches =
            None
              ( List
                  { count : { kind : Text, value : Natural }
                  , procedureOrdinal : Natural
                  }
              )
        , kind = "save"
        , name = "Poison Breath (Recharge 5–6)"
        , onFail = Some
          { amount =
            { expr = { dice = 12, dieSize = 6 }, kind = "fixed", static = 42 }
          , damageType = "poison"
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
  , alignment = { morality = "evil", order = "lawful" }
  , communication =
    { kind = "spoken_and_understood"
    , languages = { kind = "named", languages = [ "Common", "Draconic" ] }
    }
  , creatureType = "dragon"
  , creatureTypeTags = [ "chromatic" ]
  , hp = { kind = "literal", value = 136 }
  , immunities = { conditions = [ "poisoned" ], damageTypes = [ "poison" ] }
  , initiative = { modifier = 4, score = 14 }
  , passivePerception = 17
  , resources =
    [ { limit = { kind = "recharge", minimumRoll = 5 }
      , ordinal = 1
      , ownership = "shared"
      }
    ]
  , savingThrowModifiers =
    [ { ability = "str", modifier = 4 }
    , { ability = "dex", modifier = 4 }
    , { ability = "con", modifier = 3 }
    , { ability = "int", modifier = 3 }
    , { ability = "wis", modifier = 4 }
    , { ability = "cha", modifier = 2 }
    ]
  , senses =
    [ { kind = "blindsight", rangeFeet = 30 }
    , { kind = "darkvision", rangeFeet = 120 }
    ]
  , size = "large"
  , skillModifiers =
    [ { modifier = 5, skill = "deception" }
    , { modifier = 7, skill = "perception" }
    , { modifier = 4, skill = "stealth" }
    ]
  , speeds =
    [ { feet = { kind = "literal", value = 40 }, kind = "walk" }
    , { feet = { kind = "literal", value = 80 }, kind = "fly" }
    , { feet = { kind = "literal", value = 40 }, kind = "swim" }
    ]
  , traits =
    [ { description = "The dragon can breathe air and water."
      , name = "Amphibious"
      }
    ]
  }
}
