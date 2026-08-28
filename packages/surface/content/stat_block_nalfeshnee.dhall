let T = ./_stat_block_types.dhall

in  { challengeRating = 13
    , id = "stat_block_nalfeshnee"
    , kind = "statBlock"
    , name = "Nalfeshnee"
    , provenance =
      { kind = "srd-5.2.1", section = "Monsters/Monsters-M-O.md:591-632" }
    , statBlock =
      { abilityScores =
        { str = 21, dex = 10, con = 22, int = 19, wis = 12, cha = 15 }
      , ac.value = { kind = "literal", value = 18 }
      , actions =
        [ T.executable
            { procedureOrdinal = 1
            , procedure =
                T.multiattack
                  { name = "Multiattack"
                  , dispatches =
                    { first =
                      { procedureOrdinal = 2
                      , count = { kind = "literal", value = +3 }
                      }
                    , rest = [] : List T.Dispatch
                    }
                  }
            }
        , T.executable
            { procedureOrdinal = 2
            , procedure =
                T.meleeAttack
                  { name = "Rend"
                  , attackAbility = "str"
                  , attackBonus = +10
                  , reachFeet = 10
                  , onHit =
                    { first =
                        T.damage
                          { damageType = "slashing"
                          , dice = 2
                          , dieSize = 10
                          , flat = Some +5
                          , static = 16
                          }
                    , rest =
                          [ T.damage
                              { damageType = "force"
                              , dice = 2
                              , dieSize = 10
                              , flat = None Integer
                              , static = 11
                              }
                          ]
                        : List T.Effect
                    }
                  }
            }
        , T.textOnly
            { procedureOrdinal = 3
            , name = "Teleport"
            , description =
                "The nalfeshnee teleports up to 120 feet to an unoccupied space it can see."
            , reason = "unsupported_action_shape"
            }
        ]
      , bonusActions =
        [ T.resourceTextOnly
            { procedureOrdinal = 1
            , name = "Horror Nimbus (Recharge 5–6)"
            , description =
                "Wisdom Saving Throw: DC 15, each creature in a 15-foot Emanation originating from the nalfeshnee. Failure: 28 (8d6) Psychic damage, and the target has the Frightened condition for 1 minute, until it takes damage, or until it ends its turn with the nalfeshnee out of line of sight. Success: The target is immune to this nalfeshnee's Horror Nimbus for 24 hours."
            , reason = "unsupported_action_shape"
            , resourceOrdinals = { first = 1, rest = [] : List Natural }
            }
        ]
      , reactions =
        [ T.textOnly
            { procedureOrdinal = 1
            , name = "Pursuit"
            , description =
                "Trigger: Another creature the nalfeshnee can see ends its move within 120 feet of the nalfeshnee. Response: The nalfeshnee uses Teleport, but its destination space must be within 10 feet of the triggering creature."
            , reason = "unsupported_action_shape"
            }
        ]
      , traits =
        [ T.trait
            { name = "Demonic Restoration"
            , description =
                "If the nalfeshnee dies outside the Abyss, its body dissolves into ichor, and it gains a new body instantly, reviving with all its Hit Points somewhere in the Abyss."
            , effectKind = None Text
            }
        , T.trait
            { name = "Magic Resistance"
            , description =
                "The nalfeshnee has Advantage on saving throws against spells and other magical effects."
            , effectKind = None Text
            }
        ]
      , alignment = { order = "chaotic", morality = "evil" }
      , communication =
        { kind = "spoken_and_understood"
        , languages = { kind = "named", languages = [ "Abyssal" ] }
        , telepathy = Some
          { rangeFeet = 120
          , response = None Text
          , requiresLanguageUnderstanding =
              None { kind : Text, languages : List Text }
          }
        }
      , creatureType = "fiend"
      , creatureTypeTags = [ "demon" ]
      , hp = { kind = "literal", value = 184 }
      , initiative = { modifier = +5, score = 15 }
      , passivePerception = 11
      , savingThrowModifiers =
        [ { ability = "cha", modifier = +7 }
        , { ability = "con", modifier = +11 }
        , { ability = "dex", modifier = +0 }
        , { ability = "int", modifier = +9 }
        , { ability = "str", modifier = +5 }
        , { ability = "wis", modifier = +6 }
        ]
      , resistances =
        { kind = "fixed", damageTypes = [ "cold", "fire", "lightning" ] }
      , immunities =
        { conditions = Some [ "frightened", "poisoned" ]
        , damageTypes = Some [ "poison" ]
        }
      , senses =
        [ { kind = "truesight", rangeFeet = 120, qualifier = None Text } ]
      , size = "large"
      , speeds =
        [ { kind = "walk"
          , feet = { kind = "literal", value = 20 }
          , hover = None Bool
          }
        , { kind = "fly"
          , feet = { kind = "literal", value = 30 }
          , hover = None Bool
          }
        ]
      , resources =
        [ T.resource
            { ordinal = 1
            , ownership = "shared"
            , limit = T.recharge { minimumRoll = 5 }
            }
        ]
      }
    }
