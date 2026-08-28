{ challengeRating = 5
, id = "stat_block_roper"
, kind = "statBlock"
, name = "Roper"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-P-S.md:650-681" }
, statBlock =
  { abilityScores = { cha = 6, con = 17, dex = 8, int = 7, str = 18, wis = 16 }
  , ac.value = { kind = "literal", value = 20 }
  , actions =
    [ { description = Some
          "The roper makes two Tentacle attacks, uses Reel, and makes two Bite attacks."
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
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { attackAbility = "str"
        , attackBonus = { kind = "literal", value = 7 }
        , attackType = "melee"
        , kind = "attack_roll"
        , name = "Bite"
        , onHit =
          [ { amount =
              { expr = { dice = 3, dieSize = 8, flat = 4 }
              , kind = "fixed"
              , static = 17
              }
            , damageType = "piercing"
            , kind = "damage"
            }
          ]
        , reachFeet = 5
        }
      , procedureOrdinal = 2
      , reason = None Text
      , resourceRefs.kind = "none"
      }
    , { description = Some
          "Melee Attack Roll: +7, reach 60 ft. Hit: The target has the Grappled condition (escape DC 14) from one of six tentacles, and the target has the Poisoned condition until the grapple ends. The tentacle can be damaged, freeing a creature it has Grappled when destroyed (AC 20, HP 10, Immunity to Poison and Psychic damage). Damaging the tentacle deals no damage to the roper, and a destroyed tentacle regrows at the start of the roper's next turn."
      , kind = "textOnly"
      , name = Some "Tentacle"
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
      , procedureOrdinal = 3
      , reason = Some "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    , { description = Some
          "The roper pulls each creature Grappled by it up to 30 feet straight toward it."
      , kind = "textOnly"
      , name = Some "Reel"
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
      , procedureOrdinal = 4
      , reason = Some "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = { morality = "evil", order = "neutral" }
  , communication.kind = "none"
  , creatureType = "aberration"
  , hp = { kind = "literal", value = 93 }
  , initiative = { modifier = 5, score = 15 }
  , passivePerception = 16
  , savingThrowModifiers =
    [ { ability = "cha", modifier = -2 }
    , { ability = "con", modifier = +3 }
    , { ability = "dex", modifier = -1 }
    , { ability = "int", modifier = -2 }
    , { ability = "str", modifier = +4 }
    , { ability = "wis", modifier = +3 }
    ]
  , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
  , size = "large"
  , skillModifiers =
    [ { modifier = 6, skill = "perception" }
    , { modifier = 5, skill = "stealth" }
    ]
  , speeds =
    [ { feet = { kind = "literal", value = 10 }, kind = "walk" }
    , { feet = { kind = "literal", value = 20 }, kind = "climb" }
    ]
  , traits =
    [ { description =
          "The roper can climb difficult surfaces, including along ceilings, without needing to make an ability check."
      , name = "Spider Climb"
      }
    ]
  }
}
