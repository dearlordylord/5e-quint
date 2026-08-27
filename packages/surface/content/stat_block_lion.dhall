let S = ./_stat_block_types.dhall

in  { challengeRating = 1
    , id = "stat_block_lion"
    , kind = "statBlock"
    , name = "Lion"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:1616-1646" }
    , statBlock =
      { abilityScores =
        { cha = 8, con = 11, dex = 15, int = 3, str = 17, wis = 12 }
      , ac.value = { kind = "literal", value = 12 }
      , actions =
        [ S.textOnly
            { procedureOrdinal = 1
            , name = "Multiattack"
            , description =
                "The lion makes two Rend attacks. It can replace one attack with a use of Roar."
            , reason = "unsupported_procedure_family"
            }
        , S.executable
            { procedureOrdinal = 2
            , procedure =
                S.meleeAttack
                  { name = "Rend"
                  , attackAbility = "str"
                  , attackBonus = +5
                  , reachFeet = 5
                  , onHit =
                    [ S.damage
                        { damageType = "slashing"
                        , dice = 1
                        , dieSize = 8
                        , flat = Some +3
                        , static = 7
                        }
                    ]
                  }
            }
        , S.textOnly
            { procedureOrdinal = 3
            , name = "Roar"
            , description =
                "*Wisdom Saving Throw:* DC 11, one creature within 15 feet. *Failure:* The target has the Frightened condition until the start of the lion's next turn."
            , reason = "unsupported_procedure_family"
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 22 }
      , initiative = { modifier = +2, score = 12 }
      , passivePerception = 13
      , savingThrowModifiers =
        [ { ability = "str", modifier = +3 }
        , { ability = "dex", modifier = +2 }
        , { ability = "con", modifier = +0 }
        , { ability = "int", modifier = -4 }
        , { ability = "wis", modifier = +1 }
        , { ability = "cha", modifier = -1 }
        ]
      , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
      , size = "large"
      , skillModifiers =
        [ { modifier = +3, skill = "perception" }
        , { modifier = +4, skill = "stealth" }
        ]
      , speeds = [ { feet = { kind = "literal", value = 50 }, kind = "walk" } ]
      , traits =
        [ S.trait
            { name = "Pack Tactics"
            , description =
                "The lion has Advantage on an attack roll against a creature if at least one of the lion's allies is within 5 feet of the creature and the ally doesn't have the Incapacitated condition."
            , effectKind = Some
                "attack_roll_advantage_when_non_incapacitated_ally_within_5_feet_of_target"
            }
        , S.trait
            { name = "Running Leap"
            , description =
                "With a 10-foot running start, the lion can Long Jump up to 25 feet."
            , effectKind = None Text
            }
        ]
      }
    }
