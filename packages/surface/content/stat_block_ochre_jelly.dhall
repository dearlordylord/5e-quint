let T = ./_stat_block_types.dhall

in  { challengeRating = 2
    , id = "stat_block_ochre_jelly"
    , kind = "statBlock"
    , name = "Ochre Jelly"
    , provenance =
      { kind = "srd-5.2.1", section = "Monsters/Monsters-M-O.md:754-785" }
    , statBlock =
      { abilityScores =
        { str = 15, dex = 6, con = 14, int = 2, wis = 6, cha = 1 }
      , ac.value = { kind = "literal", value = 8 }
      , actions =
        [ T.executable
            { procedureOrdinal = 1
            , procedure =
                T.meleeAttack
                  { name = "Pseudopod"
                  , attackAbility = "str"
                  , attackBonus = +4
                  , reachFeet = 5
                  , onHit =
                    { first =
                        T.damage
                          { damageType = "acid"
                          , dice = 3
                          , dieSize = 6
                          , flat = Some +2
                          , static = 12
                          }
                    , rest = [] : List T.Effect
                    }
                  }
            }
        ]
      , reactions =
        [ T.textOnly
            { procedureOrdinal = 1
            , name = "Split"
            , description =
                "Trigger: While the jelly is Large or Medium and has 10+ Hit Points, it becomes Bloodied or is subjected to Lightning or Slashing damage. Response: The jelly splits into two new Ochre Jellies. Each new jelly is one size smaller than the original jelly and acts on its Initiative. The original jelly's Hit Points are divided evenly between the new jellies (round down)."
            , reason = "unsupported_action_shape"
            }
        ]
      , traits =
        [ T.trait
            { name = "Amorphous"
            , description =
                "The jelly can move through a space as narrow as 1 inch without expending extra movement to do so."
            , effectKind = None Text
            }
        , T.trait
            { name = "Spider Climb"
            , description =
                "The jelly can climb difficult surfaces, including along ceilings, without needing to make an ability check."
            , effectKind = None Text
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "ooze"
      , hp = { kind = "literal", value = 52 }
      , initiative = { modifier = -2, score = 8 }
      , passivePerception = 8
      , resistances = { kind = "fixed", damageTypes = [ "acid" ] }
      , immunities =
        { conditions = Some
          [ "charmed"
          , "deafened"
          , "exhaustion"
          , "frightened"
          , "grappled"
          , "prone"
          , "restrained"
          ]
        , damageTypes = Some [ "lightning", "slashing" ]
        }
      , senses =
        [ { kind = "blindsight", rangeFeet = 60, qualifier = None Text } ]
      , size = "large"
      , speeds =
        [ { kind = "walk"
          , feet = { kind = "literal", value = 20 }
          , hover = None Bool
          }
        , { kind = "climb"
          , feet = { kind = "literal", value = 20 }
          , hover = None Bool
          }
        ]
      }
    }
