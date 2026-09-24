{ challengeRating = 4
, id = "stat_block_guard_captain"
, kind = "statBlock"
, name = "Guard Captain"
, provenance = { kind = "srd-5.2.1", section = "monsters-A-Z.md:8822-8893" }
, statBlock =
  { abilityScores =
    { cha = 13, con = 16, dex = 14, int = 12, str = 18, wis = 14 }
  , ac.value = { kind = "literal", value = 18 }
  , actions =
    [ { description = Some
          "The guard makes two attacks, using Javelin or Longsword in any combination."
      , kind = "textOnly"
      , name = Some "Multiattack"
      , procedure =
          None
            { attackAbility : Text
            , attackBonus : { kind : Text, value : Natural }
            , attackType : Text
            , kind : Text
            , name : Text
            , onHit :
                List
                  { amount :
                      { expr :
                          { dice : Natural, dieSize : Natural, flat : Natural }
                      , kind : Text
                      , static : Natural
                      }
                  , damageType : Text
                  , kind : Text
                  }
            , reachFeet : Natural
            }
      , procedureOrdinal = 1
      , reason = Some "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    , { description = Some
          "Melee or Ranged Attack Roll: +6, reach 5 ft. or range 30/120 ft. Hit: 14 (3d6 + 4) Piercing damage."
      , kind = "textOnly"
      , name = Some "Javelin"
      , procedure =
          None
            { attackAbility : Text
            , attackBonus : { kind : Text, value : Natural }
            , attackType : Text
            , kind : Text
            , name : Text
            , onHit :
                List
                  { amount :
                      { expr :
                          { dice : Natural, dieSize : Natural, flat : Natural }
                      , kind : Text
                      , static : Natural
                      }
                  , damageType : Text
                  , kind : Text
                  }
            , reachFeet : Natural
            }
      , procedureOrdinal = 2
      , reason = Some "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { attackAbility = "str"
        , attackBonus = { kind = "literal", value = 6 }
        , attackType = "melee"
        , kind = "attack_roll"
        , name = "Longsword"
        , onHit =
          [ { amount =
              { expr = { dice = 2, dieSize = 10, flat = 4 }
              , kind = "fixed"
              , static = 15
              }
            , damageType = "slashing"
            , kind = "damage"
            }
          ]
        , reachFeet = 5
        }
      , procedureOrdinal = 3
      , reason = None Text
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = { morality = "neutral", order = "neutral" }
  , communication =
    { kind = "spoken_and_understood"
    , languages = { kind = "named", languages = [ "Common" ] }
    }
  , creatureType = "humanoid"
  , gear =
    [ { item = "Breastplate", quantity = None Natural }
    , { item = "Javelin", quantity = Some 6 }
    , { item = "Longsword", quantity = None Natural }
    , { item = "Shield", quantity = None Natural }
    ]
  , hp = { kind = "literal", value = 75 }
  , initiative = { modifier = 4, score = 14 }
  , passivePerception = 14
  , savingThrowModifiers =
    [ { ability = "str", modifier = 4 }
    , { ability = "dex", modifier = 2 }
    , { ability = "con", modifier = 3 }
    , { ability = "int", modifier = 1 }
    , { ability = "wis", modifier = 2 }
    , { ability = "cha", modifier = 1 }
    ]
  , size = { kind = "alternatives", options = [ "medium", "small" ] }
  , skillModifiers =
    [ { modifier = 6, skill = "athletics" }
    , { modifier = 4, skill = "perception" }
    ]
  , speeds = [ { feet = { kind = "literal", value = 30 }, kind = "walk" } ]
  }
}
