let T = ./_stat_block_types.dhall

in  { challengeRating = 7
    , id = "stat_block_oni"
    , kind = "statBlock"
    , name = "Oni"
    , provenance =
      { kind = "srd-5.2.1", section = "Monsters/Monsters-M-O.md:817-858" }
    , statBlock =
      { abilityScores =
        { str = 19, dex = 11, con = 16, int = 14, wis = 12, cha = 15 }
      , ac.value = { kind = "literal", value = 17 }
      , actions =
        [ T.textOnly
            { procedureOrdinal = 1
            , name = "Multiattack"
            , description =
                "The oni makes two Claw or Nightmare Ray attacks. It can replace one attack with a use of Spellcasting."
            , reason = "unsupported_action_shape"
            }
        , T.executable
            { procedureOrdinal = 2
            , procedure =
                T.meleeAttack
                  { name = "Claw"
                  , attackAbility = "str"
                  , attackBonus = +7
                  , reachFeet = 10
                  , onHit =
                    { first =
                        T.damage
                          { damageType = "slashing"
                          , dice = 1
                          , dieSize = 12
                          , flat = Some +4
                          , static = 10
                          }
                    , rest =
                          [ T.damage
                              { damageType = "necrotic"
                              , dice = 2
                              , dieSize = 8
                              , flat = None Integer
                              , static = 9
                              }
                          ]
                        : List T.Effect
                    }
                  }
            }
        , T.textOnly
            { procedureOrdinal = 3
            , name = "Nightmare Ray"
            , description =
                "Ranged Attack Roll: +5, range 60 ft. Hit: 9 (2d6 + 2) Psychic damage, and the target has the Frightened condition until the start of the oni's next turn."
            , reason = "unsupported_action_shape"
            }
        , T.textOnly
            { procedureOrdinal = 4
            , name = "Shape-Shift"
            , description =
                "The oni shape-shifts into a Small or Medium Humanoid or a Large Giant, or it returns to its true form. Other than its size, its game statistics are the same in each form. Any equipment it is wearing or carrying isn't transformed."
            , reason = "unsupported_action_shape"
            }
        , T.executable
            { procedureOrdinal = 5
            , procedure =
                T.spellcasting
                  { name = "Spellcasting"
                  , ability = "cha"
                  , spellSaveDc = Some { kind = "fixed", dc = 13 }
                  , spellAttackBonus = None { kind : Text, value : Integer }
                  , components = Some { v = True, s = True, m = False }
                  , groups =
                    { first =
                        T.limited
                          { resourceOrdinals =
                            { first = 1, rest = [] : List Natural }
                          , spells =
                            { first =
                                T.spellRef
                                  { spellId = "charm_person"
                                  , count = None Natural
                                  , castAtLevel = Some 2

                                  }
                            , rest =
                                  [ T.spellRef
                                      { spellId = "darkness"
                                      , count = None Natural
                                      , castAtLevel = None Natural

                                      }
                                  , T.spellRef
                                      { spellId = "gaseous_form"
                                      , count = None Natural
                                      , castAtLevel = None Natural

                                      }
                                  , T.spellRef
                                      { spellId = "sleep"
                                      , count = None Natural
                                      , castAtLevel = None Natural

                                      }
                                  ]
                                : List T.SpellRef
                            }
                          }
                    , rest = [] : List T.Group
                    }
                  }
            }
        ]
      , bonusActions =
        [ T.executable
            { procedureOrdinal = 1
            , procedure =
                T.spellcasting
                  { name = "Invisibility"
                  , ability = "cha"
                  , spellSaveDc = None { kind : Text, dc : Natural }
                  , spellAttackBonus = None { kind : Text, value : Integer }
                  , components = T.noComponents
                  , groups =
                    { first =
                        T.atWill
                          { spells =
                            { first =
                                T.restrictedSpellRef { spellId = "invisibility"
                                  , count = None Natural
                                  , castAtLevel = None Natural
                                  , restriction = { authoredExpression = "on itself", deltas = { first = T.selfTargetLimit, rest = [] : List T.InvocationDelta } }
                                  }
                            , rest = [] : List T.SpellRef
                            }
                          }
                    , rest = [] : List T.Group
                    }
                  }
            }
        ]
      , traits =
        [ T.trait
            { name = "Regeneration"
            , description =
                "The oni regains 10 Hit Points at the start of each of its turns if it has at least 1 Hit Point."
            , effectKind = None Text
            }
        ]
      , alignment = { order = "lawful", morality = "evil" }
      , communication =
        { kind = "spoken_and_understood"
        , languages = { kind = "named", languages = [ "Common", "Giant" ] }
        }
      , creatureType = "fiend"
      , hp = { kind = "literal", value = 119 }
      , initiative = { modifier = +0, score = 10 }
      , passivePerception = 14
      , savingThrowModifiers =
        [ { ability = "cha", modifier = +5 }
        , { ability = "con", modifier = +6 }
        , { ability = "dex", modifier = +0 }
        , { ability = "int", modifier = +2 }
        , { ability = "str", modifier = +4 }
        , { ability = "wis", modifier = +4 }
        ]
      , skillModifiers =
        [ { skill = "arcana", modifier = +5 }
        , { skill = "deception", modifier = +8 }
        , { skill = "perception", modifier = +4 }
        ]
      , resistances = { kind = "fixed", damageTypes = [ "cold" ] }
      , senses =
        [ { kind = "darkvision", rangeFeet = 60, qualifier = None Text } ]
      , size = "large"
      , speeds =
        [ { kind = "walk"
          , feet = { kind = "literal", value = 30 }
          , hover = None Bool
          }
        , { kind = "fly"
          , feet = { kind = "literal", value = 30 }
          , hover = Some True
          }
        ]
      , resources =
        [ T.resource
            { ordinal = 1, ownership = "each", limit = T.daily { uses = 1 } }
        ]
      }
    }
