let S = ./_stat_block_types.dhall

in  { challengeRating = 0.25
    , id = "stat_block_swarm_of_ravens"
    , kind = "statBlock"
    , name = "Swarm of Ravens"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:2347-2375" }
    , statBlock =
      { abilityScores =
        { cha = 6, con = 12, dex = 14, int = 5, str = 6, wis = 12 }
      , ac.value = { kind = "literal", value = 12 }
      , actions =
        [ S.textOnly
            { procedureOrdinal = 1
            , name = "Beaks"
            , description =
                "*Melee Attack Roll:* +4, reach 5 ft. *Hit:* 5 (1d6 + 2) Piercing damage, or 2 (1d4) Piercing damage if the swarm is Bloodied."
            , reason = "unsupported_action_shape"
            }
        , S.resourceTextOnly
            { procedureOrdinal = 2
            , name = "Cacophony"
            , description =
                "*Wisdom Saving Throw:* DC 10, one creature in the swarm's space. *Failure:* The target has the Deafened condition until the start of the swarm's next turn. While Deafened, the target also has Disadvantage on ability checks and attack rolls."
            , reason = "unsupported_procedure_family"
            , resourceOrdinals = { first = 1, rest = [] : List Natural }
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
      , passivePerception = 15
      , resistances =
        { damageTypes = [ "bludgeoning", "piercing", "slashing" ]
        , kind = "fixed"
        }
      , savingThrowModifiers =
        [ { ability = "str", modifier = -2 }
        , { ability = "dex", modifier = +2 }
        , { ability = "con", modifier = +1 }
        , { ability = "int", modifier = -3 }
        , { ability = "wis", modifier = +1 }
        , { ability = "cha", modifier = -2 }
        ]
      , size = "medium"
      , skillModifiers = [ { modifier = +5, skill = "perception" } ]
      , speeds =
        [ { feet = { kind = "literal", value = 10 }, kind = "walk" }
        , { feet = { kind = "literal", value = 50 }, kind = "fly" }
        ]
      , traits =
        [ S.trait
            { name = "Swarm"
            , description =
                "The swarm can occupy another creature's space and vice versa, and the swarm can move through any opening large enough for a Tiny raven. The swarm can't regain Hit Points or gain Temporary Hit Points."
            , effectKind = None Text
            }
        ]
      , resources =
        [ S.resource
            { ordinal = 1
            , ownership = "shared"
            , limit = S.recharge { minimumRoll = 6 }
            }
        ]
      }
    }
