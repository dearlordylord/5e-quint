let S = ./_stat_block_types.dhall

in  { challengeRating = 0.25
    , id = "stat_block_swarm_of_bats"
    , kind = "statBlock"
    , name = "Swarm of Bats"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:2227-2252" }
    , statBlock =
      { abilityScores =
        { cha = 4, con = 10, dex = 15, int = 2, str = 5, wis = 12 }
      , ac.value = { kind = "literal", value = 12 }
      , actions =
        [ S.textOnly
            { procedureOrdinal = 1
            , name = "Bites"
            , description =
                "*Melee Attack Roll:* +4, reach 5 ft. *Hit:* 5 (2d4) Piercing damage, or 2 (1d4) Piercing damage if the swarm is Bloodied."
            , reason = "unsupported_action_shape"
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , swarm = { constituentSize = "tiny" }
      , hp = { kind = "literal", value = 11 }
      , immunities.conditions
        =
        [ "charmed"
        , "frightened"
        , "grappled"
        , "paralyzed"
        , "petrified"
        , "prone"
        , "restrained"
        , "stunned"
        ]
      , initiative = { modifier = +2, score = 12 }
      , passivePerception = 11
      , resistances =
        { damageTypes = [ "bludgeoning", "piercing", "slashing" ]
        , kind = "fixed"
        }
      , savingThrowModifiers =
        [ { ability = "str", modifier = -3 }
        , { ability = "dex", modifier = +2 }
        , { ability = "con", modifier = +0 }
        , { ability = "int", modifier = -4 }
        , { ability = "wis", modifier = +1 }
        , { ability = "cha", modifier = -3 }
        ]
      , senses = [ { kind = "blindsight", rangeFeet = 60 } ]
      , size = "large"
      , speeds =
        [ { feet = { kind = "literal", value = 5 }, kind = "walk" }
        , { feet = { kind = "literal", value = 30 }, kind = "fly" }
        ]
      , traits =
        [ S.trait
            { name = "Swarm"
            , description =
                "The swarm can occupy another creature's space and vice versa, and the swarm can move through any opening large enough for a Tiny bat. The swarm can't regain Hit Points or gain Temporary Hit Points."
            , effectKind = None Text
            }
        ]
      }
    }
