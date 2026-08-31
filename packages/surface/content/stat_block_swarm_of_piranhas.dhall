let S = ./_stat_block_types.dhall

in  { challengeRating = 1
    , id = "stat_block_swarm_of_piranhas"
    , kind = "statBlock"
    , name = "Swarm of Piranhas"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:2287-2314" }
    , statBlock =
      { abilityScores =
        { cha = 2, con = 9, dex = 16, int = 1, str = 13, wis = 7 }
      , ac.value = { kind = "literal", value = 13 }
      , actions =
        [ S.textOnly
            { procedureOrdinal = 1
            , name = "Bites"
            , description =
                "*Melee Attack Roll:* +5 (with Advantage if the target doesn't have all its Hit Points), reach 5 ft. *Hit:* 8 (2d4 + 3) Piercing damage, or 5 (1d4 + 3) Piercing damage if the swarm is Bloodied."
            , reason = "unsupported_action_shape"
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , swarm = { constituentSize = "tiny" }
      , hp = { kind = "literal", value = 28 }
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
      , initiative = { modifier = +3, score = 13 }
      , passivePerception = 8
      , resistances =
        { damageTypes = [ "bludgeoning", "piercing", "slashing" ]
        , kind = "fixed"
        }
      , savingThrowModifiers =
        [ { ability = "str", modifier = +1 }
        , { ability = "dex", modifier = +3 }
        , { ability = "con", modifier = -1 }
        , { ability = "int", modifier = -5 }
        , { ability = "wis", modifier = -2 }
        , { ability = "cha", modifier = -4 }
        ]
      , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
      , size = "medium"
      , speeds =
        [ { feet = { kind = "literal", value = 5 }, kind = "walk" }
        , { feet = { kind = "literal", value = 40 }, kind = "swim" }
        ]
      , traits =
        [ S.trait
            { name = "Swarm"
            , description =
                "The swarm can occupy another creature's space and vice versa, and the swarm can move through any opening large enough for a Tiny piranha. The swarm can't regain Hit Points or gain Temporary Hit Points."
            , effectKind = None Text
            }
        , S.trait
            { name = "Water Breathing"
            , description = "The swarm can breathe only underwater."
            , effectKind = None Text
            }
        ]
      }
    }
