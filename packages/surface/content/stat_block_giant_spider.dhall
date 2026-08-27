let S = ./_stat_block_types.dhall

in  { challengeRating = 1
    , id = "stat_block_giant_spider"
    , kind = "statBlock"
    , name = "Giant Spider"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:1235-1263" }
    , statBlock =
      { abilityScores =
        { cha = 4, con = 12, dex = 16, int = 2, str = 14, wis = 11 }
      , ac.value = { kind = "literal", value = 14 }
      , actions =
        [ S.executable
            { procedureOrdinal = 1
            , procedure =
                S.meleeAttack
                  { name = "Bite"
                  , attackAbility = "dex"
                  , attackBonus = +5
                  , reachFeet = 5
                  , onHit =
                    [ S.damage
                        { damageType = "piercing"
                        , dice = 1
                        , dieSize = 8
                        , flat = Some +3
                        , static = 7
                        }
                    , S.damage
                        { damageType = "poison"
                        , dice = 2
                        , dieSize = 6
                        , flat = None Integer
                        , static = 7
                        }
                    ]
                  }
            }
        , S.resourceTextOnly
            { procedureOrdinal = 2
            , name = "Web"
            , description =
                "*Dexterity Saving Throw:* DC 13, one creature the spider can see within 60 feet. *Failure:* The target has the Restrained condition until the web is destroyed (AC 10; HP 5; Vulnerability to Fire damage; Immunity to Poison and Psychic damage)."
            , reason = "unsupported_procedure_family"
            , resourceOrdinals = [ 1 ]
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 26 }
      , initiative = { modifier = +3, score = 13 }
      , passivePerception = 14
      , savingThrowModifiers =
        [ { ability = "str", modifier = +2 }
        , { ability = "dex", modifier = +3 }
        , { ability = "con", modifier = +1 }
        , { ability = "int", modifier = -4 }
        , { ability = "wis", modifier = +0 }
        , { ability = "cha", modifier = -3 }
        ]
      , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
      , size = "large"
      , skillModifiers =
        [ { modifier = +4, skill = "perception" }
        , { modifier = +7, skill = "stealth" }
        ]
      , speeds =
        [ { feet = { kind = "literal", value = 30 }, kind = "walk" }
        , { feet = { kind = "literal", value = 30 }, kind = "climb" }
        ]
      , traits =
        [ S.trait
            { name = "Spider Climb"
            , description =
                "The spider can climb difficult surfaces, including along ceilings, without needing to make an ability check."
            , effectKind = None Text
            }
        , S.trait
            { name = "Web Walker"
            , description =
                "The spider ignores movement restrictions caused by webs, and it knows the location of any other creature in contact with the same web."
            , effectKind = None Text
            }
        ]
      , resources =
        [ S.resource
            { ordinal = 1
            , ownership = "shared"
            , limit = S.recharge { minimumRoll = 5 }
            }
        ]
      }
    }
