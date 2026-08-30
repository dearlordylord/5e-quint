let S = ./_stat_block_types.dhall

in  { challengeRating = 0
    , id = "stat_block_baboon"
    , kind = "statBlock"
    , name = "Baboon"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:112-135" }
    , statBlock =
      { abilityScores =
        { cha = 6, con = 11, dex = 14, int = 4, str = 8, wis = 12 }
      , ac.value = { kind = "literal", value = 12 }
      , actions =
        [ S.executable
            { procedureOrdinal = 1
            , procedure =
                S.meleeAttack
                  { name = "Bite"
                  , attackAbility = "str"
                  , attackBonus = +1
                  , reachFeet = 5
                  , onHit =
                    { first =
                        S.damage
                          { damageType = "piercing"
                          , dice = 1
                          , dieSize = 4
                          , flat = Some -1
                          , static = 1
                          }
                    , rest = [] : List S.Effect
                    }
                  }
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 3 }
      , initiative = { modifier = +2, score = 12 }
      , passivePerception = 11
      , savingThrowModifiers =
        [ { ability = "str", modifier = -1 }
        , { ability = "dex", modifier = +2 }
        , { ability = "con", modifier = +0 }
        , { ability = "int", modifier = -3 }
        , { ability = "wis", modifier = +1 }
        , { ability = "cha", modifier = -2 }
        ]
      , size = "small"
      , speeds =
        [ { feet = { kind = "literal", value = 30 }, kind = "walk" }
        , { feet = { kind = "literal", value = 30 }, kind = "climb" }
        ]
      , traits =
        [ S.trait
            { name = "Pack Tactics"
            , description =
                "The baboon has Advantage on an attack roll against a creature if at least one of the baboon's allies is within 5 feet of the creature and the ally doesn't have the Incapacitated condition."
            , effectKind = Some
                "attack_roll_advantage_when_non_incapacitated_ally_within_5_feet_of_target"
            }
        ]
      }
    }
