let T = ./_stat_block_types.dhall

in  { challengeRating = 6
    , id = "stat_block_medusa"
    , kind = "statBlock"
    , name = "Medusa"
    , provenance =
      { kind = "srd-5.2.1", section = "Monsters/Monsters-M-O.md:203-235" }
    , statBlock =
      { abilityScores =
        { str = 10, dex = 17, con = 16, int = 12, wis = 13, cha = 15 }
      , ac.value = { kind = "literal", value = 15 }
      , actions =
        [ T.textOnly
            { procedureOrdinal = 1
            , name = "Multiattack"
            , description =
                "The medusa makes two Claw attacks and one Snake Hair attack, or it makes three Poison Ray attacks."
            , reason = "unsupported_action_shape"
            }
        , T.executable
            { procedureOrdinal = 2
            , procedure =
                T.meleeAttack
                  { name = "Claw"
                  , attackAbility = "dex"
                  , attackBonus = +6
                  , reachFeet = 5
                  , onHit =
                    { first =
                        T.damage
                          { damageType = "slashing"
                          , dice = 2
                          , dieSize = 6
                          , flat = Some +3
                          , static = 10
                          }
                    , rest = [] : List T.Effect
                    }
                  }
            }
        , T.executable
            { procedureOrdinal = 3
            , procedure =
                T.meleeAttack
                  { name = "Snake Hair"
                  , attackAbility = "dex"
                  , attackBonus = +6
                  , reachFeet = 5
                  , onHit =
                    { first =
                        T.damage
                          { damageType = "piercing"
                          , dice = 1
                          , dieSize = 4
                          , flat = Some +3
                          , static = 5
                          }
                    , rest =
                          [ T.damage
                              { damageType = "poison"
                              , dice = 4
                              , dieSize = 6
                              , flat = None Integer
                              , static = 14
                              }
                          ]
                        : List T.Effect
                    }
                  }
            }
        , T.executable
            { procedureOrdinal = 4
            , procedure =
                T.rangedAttack
                  { name = "Poison Ray"
                  , attackAbility = "cha"
                  , attackBonus = +5
                  , rangeFeet = { normal = 150, long = 150 }
                  , ammunition = None Text
                  , onHit =
                    { first =
                        T.damage
                          { damageType = "poison"
                          , dice = 2
                          , dieSize = 8
                          , flat = Some +2
                          , static = 11
                          }
                    , rest = [] : List T.Effect
                    }
                  }
            }
        ]
      , bonusActions =
        [ T.resourceTextOnly
            { procedureOrdinal = 1
            , name = "Petrifying Gaze (Recharge 5–6)"
            , description =
                "Constitution Saving Throw: DC 13, each creature in a 30-foot Cone. If the medusa sees its reflection in the Cone, the medusa must make this save. First Failure: The target has the Restrained condition and repeats the save at the end of its next turn if it is still Restrained, ending the effect on itself on a success. Second Failure: The target has the Petrified condition instead of the Restrained condition."
            , reason = "unsupported_action_shape"
            , resourceOrdinals = { first = 1, rest = [] : List Natural }
            }
        ]
      , alignment = { order = "lawful", morality = "evil" }
      , communication =
        { kind = "spoken_and_understood"
        , languages =
          { kind = "named_plus_other_languages"
          , languages = [ "Common" ]
          , additionalLanguages = 1
          }
        }
      , creatureType = "monstrosity"
      , hp = { kind = "literal", value = 127 }
      , initiative = { modifier = +6, score = 16 }
      , passivePerception = 14
      , savingThrowModifiers =
        [ { ability = "cha", modifier = +2 }
        , { ability = "con", modifier = +3 }
        , { ability = "dex", modifier = +3 }
        , { ability = "wis", modifier = +4 }
        ]
      , skillModifiers =
        [ { skill = "deception", modifier = +5 }
        , { skill = "perception", modifier = +4 }
        , { skill = "stealth", modifier = +6 }
        ]
      , senses =
        [ { kind = "darkvision", rangeFeet = 150, qualifier = None Text } ]
      , size = "medium"
      , speeds =
        [ { kind = "walk"
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
