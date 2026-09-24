{ challengeRating = 2
, id = "stat_block_gargoyle"
, kind = "statBlock"
, name = "Gargoyle"
, provenance = { kind = "srd-5.2.1", section = "monsters-A-Z.md:6520-6595" }
, statBlock =
  { abilityScores = { cha = 7, con = 16, dex = 11, int = 6, str = 15, wis = 11 }
  , ac.value = { kind = "literal", value = 15 }
  , actions =
    [ { kind = "executable"
      , procedure =
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
                          { dice : Natural, dieSize : Natural, flat : Natural }
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
      , resourceRefs.kind = "none"
      }
    , { kind = "executable"
      , procedure =
        { attackAbility = Some "str"
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
        , name = "Claw"
        , onHit = Some
          [ { amount =
              { expr = { dice = 2, dieSize = 4, flat = 2 }
              , kind = "fixed"
              , static = 7
              }
            , damageType = "slashing"
            , kind = "damage"
            }
          ]
        , reachFeet = Some 5
        }
      , procedureOrdinal = 2
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = { morality = "evil", order = "chaotic" }
  , communication =
    { kind = "spoken_and_understood"
    , languages = { kind = "named", languages = [ "Primordial (Terran)" ] }
    }
  , creatureType = "elemental"
  , hp = { kind = "literal", value = 67 }
  , immunities =
    { conditions = [ "exhaustion", "petrified", "poisoned" ]
    , damageTypes = [ "poison" ]
    }
  , initiative = { modifier = 2, score = 12 }
  , passivePerception = 10
  , savingThrowModifiers =
    [ { ability = "str", modifier = +2 }
    , { ability = "dex", modifier = +0 }
    , { ability = "con", modifier = +3 }
    , { ability = "int", modifier = -2 }
    , { ability = "wis", modifier = +0 }
    , { ability = "cha", modifier = -2 }
    ]
  , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
  , size = "medium"
  , skillModifiers = [ { modifier = 4, skill = "stealth" } ]
  , speeds =
    [ { feet = { kind = "literal", value = 30 }, kind = "walk" }
    , { feet = { kind = "literal", value = 60 }, kind = "fly" }
    ]
  , traits =
    [ { description =
          "The gargoyle doesn't provoke an Opportunity Attack when it flies out of an enemy's reach."
      , name = "Flyby"
      }
    ]
  }
}
