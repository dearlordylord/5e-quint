let S = ./_stat_block_types.dhall

in  { challengeRating = 2
    , id = "stat_block_allosaurus"
    , kind = "statBlock"
    , name = "Allosaurus"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:3-25" }
    , statBlock =
      { abilityScores =
        { cha = 5, con = 17, dex = 13, int = 2, str = 19, wis = 12 }
      , ac.value = { kind = "literal", value = 13 }
      , actions =
        [ S.executable
            { procedureOrdinal = 1
            , procedure =
                S.meleeAttack
                  { name = "Bite"
                  , attackAbility = "str"
                  , attackBonus = +6
                  , reachFeet = 5
                  , onHit =
                    { first =
                        S.damage
                          { damageType = "piercing"
                          , dice = 2
                          , dieSize = 10
                          , flat = Some +4
                          , static = 15
                          }
                    , rest = [] : List S.Effect
                    }
                  }
            }
        , S.textOnly
            { procedureOrdinal = 2
            , name = "Claws"
            , description =
                "*Melee Attack Roll:* +6, reach 5 ft. *Hit:* 8 (1d8 + 4) Slashing damage. If the target is a Large or smaller creature and the allosaurus moved 30+ feet straight toward it immediately before the hit, the target has the Prone condition, and the allosaurus can make one Bite attack against it."
            , reason = "unsupported_action_shape"
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , creatureTypeTags = [ "dinosaur" ]
      , hp = { kind = "literal", value = 51 }
      , initiative = { modifier = +1, score = 11 }
      , passivePerception = 15
      , savingThrowModifiers =
        [ { ability = "str", modifier = +4 }
        , { ability = "dex", modifier = +1 }
        , { ability = "con", modifier = +3 }
        , { ability = "int", modifier = -4 }
        , { ability = "wis", modifier = +1 }
        , { ability = "cha", modifier = -3 }
        ]
      , size = "large"
      , skillModifiers = [ { modifier = +5, skill = "perception" } ]
      , speeds = [ { feet = { kind = "literal", value = 60 }, kind = "walk" } ]
      }
    }
