{ challengeRating = 9
, id = "stat_block_fire_giant"
, kind = "statBlock"
, name = "Fire Giant"
, provenance = { kind = "srd-5.2.1", section = "monsters-A-Z.md:6137-6208" }
, statBlock =
  { abilityScores =
    { cha = 13, con = 23, dex = 9, int = 10, str = 25, wis = 14 }
  , ac.value = { kind = "literal", value = 18 }
  , actions =
    [ { description = Some
          "The giant makes two attacks, using Flame Sword or Hammer Throw in any combination."
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
            , reachFeet : Natural
            }
      , procedureOrdinal = 1
      , reason = Some "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { attackAbility = "str"
        , attackBonus = { kind = "literal", value = 11 }
        , attackType = "melee"
        , kind = "attack_roll"
        , name = "Flame Sword"
        , onHit =
          [ { amount =
              { expr = { dice = 4, dieSize = 6, flat = Some 7 }
              , kind = "fixed"
              , static = 21
              }
            , damageType = "slashing"
            , kind = "damage"
            }
          , { amount =
              { expr = { dice = 3, dieSize = 6, flat = None Natural }
              , kind = "fixed"
              , static = 10
              }
            , damageType = "fire"
            , kind = "damage"
            }
          ]
        , reachFeet = 10
        }
      , procedureOrdinal = 2
      , reason = None Text
      , resourceRefs.kind = "none"
      }
    , { description = Some
          "Ranged Attack Roll: +11, range 60/240 ft. Hit: 23 (3d10 + 7) Bludgeoning damage plus 4 (1d8) Fire damage, and the target is pushed up to 15 feet straight away from the giant and has Disadvantage on the next attack roll it makes before the end of its next turn."
      , kind = "textOnly"
      , name = Some "Hammer Throw"
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
            , reachFeet : Natural
            }
      , procedureOrdinal = 3
      , reason = Some "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = { morality = "evil", order = "lawful" }
  , communication =
    { kind = "spoken_and_understood"
    , languages = { kind = "named", languages = [ "Giant" ] }
    }
  , creatureType = "giant"
  , hp = { kind = "literal", value = 162 }
  , immunities.damageTypes = [ "fire" ]
  , initiative = { modifier = 3, score = 13 }
  , passivePerception = 16
  , savingThrowModifiers =
    [ { ability = "str", modifier = 7 }
    , { ability = "dex", modifier = 3 }
    , { ability = "con", modifier = 10 }
    , { ability = "int", modifier = 0 }
    , { ability = "wis", modifier = 2 }
    , { ability = "cha", modifier = 5 }
    ]
  , size = "huge"
  , skillModifiers =
    [ { modifier = 11, skill = "athletics" }
    , { modifier = 6, skill = "perception" }
    ]
  , speeds = [ { feet = { kind = "literal", value = 30 }, kind = "walk" } ]
  }
}
