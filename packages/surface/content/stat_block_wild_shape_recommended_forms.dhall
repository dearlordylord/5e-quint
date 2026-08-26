[ { challengeRating = 0.25
  , id = "stat_block_riding_horse"
  , kind = "statBlock"
  , name = "Riding Horse"
  , provenance = { kind = "srd-5.2.1", section = "Animals.md:2089-2108" }
  , statBlock =
    { abilityScores =
      { cha = 7, con = 12, dex = 13, int = 2, str = 16, wis = 11 }
    , ac.value = { kind = "literal", value = 11 }
    , actions =
      [ { kind = "executable"
        , procedure =
          { attackAbility = "str"
          , attackBonus = { kind = "literal", value = 5 }
          , attackType = "melee"
          , kind = "attack_roll"
          , name = "Hooves"
          , onHit =
            [ { amount = Some
                { expr = { dice = 1, dieSize = 8, flat = 3 }
                , kind = "fixed"
                , static = 7
                }
              , condition = None Text
              , damageType = Some "bludgeoning"
              , kind = "damage"
              , maxCreatureSize = None Text
              }
            ]
          , reachFeet = 5
          }
        , procedureOrdinal = 1
        , resourceRefs.kind = "none"
        }
      ]
    , alignment = "unaligned"
    , communication.kind = "none"
    , creatureType = "beast"
    , hp = { kind = "literal", value = 13 }
    , initiative = { modifier = 1, score = 11 }
    , passivePerception = 10
    , senses = None (List { kind : Text, rangeFeet : Natural })
    , size = "large"
    , skillModifiers = None (List { modifier : Natural, skill : Text })
    , speeds = [ { feet = { kind = "literal", value = 60 }, kind = "walk" } ]
    , traits =
        None
          (List { description : Text, effect : { kind : Text }, name : Text })
    }
  }
, { challengeRating = 0.25
  , id = "stat_block_wolf"
  , kind = "statBlock"
  , name = "Wolf"
  , provenance = { kind = "srd-5.2.1", section = "Animals.md:2587-2611" }
  , statBlock =
    { abilityScores =
      { cha = 6, con = 12, dex = 15, int = 3, str = 14, wis = 12 }
    , ac.value = { kind = "literal", value = 12 }
    , actions =
      [ { kind = "executable"
        , procedure =
          { attackAbility = "str"
          , attackBonus = { kind = "literal", value = 4 }
          , attackType = "melee"
          , kind = "attack_roll"
          , name = "Bite"
          , onHit =
            [ { amount = Some
                { expr = { dice = 1, dieSize = 6, flat = 2 }
                , kind = "fixed"
                , static = 5
                }
              , condition = None Text
              , damageType = Some "piercing"
              , kind = "damage"
              , maxCreatureSize = None Text
              }
            , { amount =
                  None
                    { expr :
                        { dice : Natural, dieSize : Natural, flat : Natural }
                    , kind : Text
                    , static : Natural
                    }
              , condition = Some "prone"
              , damageType = None Text
              , kind = "apply_condition_if_target_size_at_most"
              , maxCreatureSize = Some "medium"
              }
            ]
          , reachFeet = 5
          }
        , procedureOrdinal = 1
        , resourceRefs.kind = "none"
        }
      ]
    , alignment = "unaligned"
    , communication.kind = "none"
    , creatureType = "beast"
    , hp = { kind = "literal", value = 11 }
    , initiative = { modifier = 2, score = 12 }
    , passivePerception = 15
    , senses = Some [ { kind = "darkvision", rangeFeet = 60 } ]
    , size = "medium"
    , skillModifiers = Some
      [ { modifier = 5, skill = "perception" }
      , { modifier = 4, skill = "stealth" }
      ]
    , speeds = [ { feet = { kind = "literal", value = 40 }, kind = "walk" } ]
    , traits = Some
      [ { description =
            "The wolf has Advantage on attack rolls against a creature if at least one of the wolf's allies is within 5 feet of the creature and the ally doesn't have the Incapacitated condition."
        , effect.kind
          =
            "attack_roll_advantage_when_non_incapacitated_ally_within_5_feet_of_target"
        , name = "Pack Tactics"
        }
      ]
    }
  }
]
