{ challengeRating = 1
, id = "stat_block_ghoul"
, kind = "statBlock"
, name = "Ghoul"
, provenance = { kind = "srd-5.2.1", section = "monsters-A-Z.md:6849-6919" }
, statBlock =
  { abilityScores = { cha = 6, con = 10, dex = 15, int = 7, str = 13, wis = 10 }
  , ac.value = { kind = "literal", value = 12 }
  , actions =
    [ { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { attackAbility = None Text
        , attackBonus = None { kind : Text, value : Natural }
        , attackType = None Text
        , dispatches = Some
          [ { count = { kind = "literal", value = 2 }, procedureOrdinal = 2 } ]
        , kind = "multiattack"
        , name = "Multiattack"
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
        , reachFeet = None Natural
        }
      , procedureOrdinal = 1
      , reason = None Text
      , resourceRefs.kind = "none"
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { attackAbility = Some "dex"
        , attackBonus = Some { kind = "literal", value = 4 }
        , attackType = Some "melee"
        , dispatches =
            None
              ( List
                  { count : { kind : Text, value : Natural }
                  , procedureOrdinal : Natural
                  }
              )
        , kind = "attack_roll"
        , name = "Bite"
        , onHit = Some
          [ { amount =
              { expr = { dice = 1, dieSize = 6, flat = Some 2 }
              , kind = "fixed"
              , static = 5
              }
            , damageType = "piercing"
            , kind = "damage"
            }
          , { amount =
              { expr = { dice = 1, dieSize = 6, flat = None Natural }
              , kind = "fixed"
              , static = 3
              }
            , damageType = "necrotic"
            , kind = "damage"
            }
          ]
        , reachFeet = Some 5
        }
      , procedureOrdinal = 2
      , reason = None Text
      , resourceRefs.kind = "none"
      }
    , { description = Some
          "Melee Attack Roll: +4, reach 5 ft. Hit: 4 (1d4 + 2) Slashing damage. If the target is a creature that isn't an Undead or elf, it is subjected to the following effect. Constitution Saving Throw: DC 10. Failure: The target has the Paralyzed condition until the end of its next turn."
      , kind = "textOnly"
      , name = Some "Claw"
      , procedure =
          None
            { attackAbility : Optional Text
            , attackBonus : Optional { kind : Text, value : Natural }
            , attackType : Optional Text
            , dispatches :
                Optional
                  ( List
                      { count : { kind : Text, value : Natural }
                      , procedureOrdinal : Natural
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
            , reachFeet : Optional Natural
            }
      , procedureOrdinal = 3
      , reason = Some "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = { morality = "evil", order = "chaotic" }
  , communication =
    { kind = "spoken_and_understood"
    , languages = { kind = "named", languages = [ "Common" ] }
    }
  , creatureType = "undead"
  , hp = { kind = "literal", value = 22 }
  , immunities =
    { conditions = [ "charmed", "exhaustion", "poisoned" ]
    , damageTypes = [ "poison" ]
    }
  , initiative = { modifier = 2, score = 12 }
  , passivePerception = 10
  , savingThrowModifiers =
    [ { ability = "str", modifier = +1 }
    , { ability = "dex", modifier = +2 }
    , { ability = "con", modifier = +0 }
    , { ability = "int", modifier = -2 }
    , { ability = "wis", modifier = +0 }
    , { ability = "cha", modifier = -2 }
    ]
  , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
  , size = "medium"
  , speeds = [ { feet = { kind = "literal", value = 30 }, kind = "walk" } ]
  }
}
