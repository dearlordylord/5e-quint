let S = ./_stat_block_types.dhall

in  { challengeRating = 1
    , id = "stat_block_giant_vulture"
    , kind = "statBlock"
    , name = "Giant Vulture"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:1322-1347" }
    , statBlock =
      { abilityScores =
        { cha = 7, con = 16, dex = 10, int = 6, str = 15, wis = 12 }
      , ac.value = { kind = "literal", value = 10 }
      , actions =
        [ S.executable
            { procedureOrdinal = 1
            , procedure =
                S.meleeAttack
                  { name = "Gouge"
                  , attackAbility = "str"
                  , attackBonus = +4
                  , reachFeet = 5
                  , onHit =
                    { first =
                        S.damage
                          { damageType = "piercing"
                          , dice = 2
                          , dieSize = 6
                          , flat = Some +2
                          , static = 9
                          }
                    , rest =
                      [ S.applyCondition
                          { condition = "poisoned"
                          , duration = "end_of_next_turn"
                          }
                      ]
                    }
                  }
            }
        ]
      , alignment = { morality = "evil", order = "neutral" }
      , communication =
        { kind = "understood_but_cannot_speak"
        , languages = { kind = "named", languages = [ "Common" ] }
        }
      , creatureType = "monstrosity"
      , hp = { kind = "literal", value = 25 }
      , initiative = { modifier = +0, score = 10 }
      , passivePerception = 13
      , resistances = { damageTypes = [ "necrotic" ], kind = "fixed" }
      , savingThrowModifiers =
        [ { ability = "str", modifier = +2 }
        , { ability = "dex", modifier = +0 }
        , { ability = "con", modifier = +3 }
        , { ability = "int", modifier = -2 }
        , { ability = "wis", modifier = +1 }
        , { ability = "cha", modifier = -2 }
        ]
      , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
      , size = "large"
      , skillModifiers = [ { modifier = +3, skill = "perception" } ]
      , speeds =
        [ { feet = { kind = "literal", value = 10 }, kind = "walk" }
        , { feet = { kind = "literal", value = 60 }, kind = "fly" }
        ]
      , traits =
        [ S.trait
            { name = "Pack Tactics"
            , description =
                "The vulture has Advantage on an attack roll against a creature if at least one of the vulture's allies is within 5 feet of the creature and the ally doesn't have the Incapacitated condition."
            , effectKind = Some
                "attack_roll_advantage_when_non_incapacitated_ally_within_5_feet_of_target"
            }
        ]
      }
    }
