let S = ./_stat_block_types.dhall

in  { challengeRating = 0.5
    , id = "stat_block_reef_shark"
    , kind = "statBlock"
    , name = "Reef Shark"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:2036-2062" }
    , statBlock =
      { abilityScores =
        { cha = 4, con = 13, dex = 15, int = 1, str = 14, wis = 10 }
      , ac.value = { kind = "literal", value = 12 }
      , actions =
        [ S.executable
            { procedureOrdinal = 1
            , procedure =
                S.meleeAttack
                  { name = "Bite"
                  , attackAbility = "str"
                  , attackBonus = +4
                  , reachFeet = 5
                  , onHit =
                    { first =
                        S.damage
                          { damageType = "piercing"
                          , dice = 2
                          , dieSize = 4
                          , flat = Some +2
                          , static = 7
                          }
                    , rest = [] : List S.Effect
                    }
                  }
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 22 }
      , initiative = { modifier = +2, score = 12 }
      , passivePerception = 12
      , savingThrowModifiers =
        [ { ability = "str", modifier = +2 }
        , { ability = "dex", modifier = +2 }
        , { ability = "con", modifier = +1 }
        , { ability = "int", modifier = -5 }
        , { ability = "wis", modifier = +0 }
        , { ability = "cha", modifier = -3 }
        ]
      , senses = [ { kind = "blindsight", rangeFeet = 30 } ]
      , size = "medium"
      , skillModifiers = [ { modifier = +2, skill = "perception" } ]
      , speeds =
        [ { feet = { kind = "literal", value = 5 }, kind = "walk" }
        , { feet = { kind = "literal", value = 30 }, kind = "swim" }
        ]
      , traits =
        [ S.trait
            { name = "Pack Tactics"
            , description =
                "The shark has Advantage on an attack roll against a creature if at least one of the shark's allies is within 5 feet of the creature and the ally doesn't have the Incapacitated condition."
            , effectKind = Some
                "attack_roll_advantage_when_non_incapacitated_ally_within_5_feet_of_target"
            }
        , S.trait
            { name = "Water Breathing"
            , description = "The shark can breathe only underwater."
            , effectKind = None Text
            }
        ]
      }
    }
