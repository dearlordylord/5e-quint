let T = ./_stat_block_types.dhall

in  { challengeRating = 6
    , id = "stat_block_mage"
    , kind = "statBlock"
    , name = "Mage"
    , provenance =
      { kind = "srd-5.2.1", section = "Monsters/Monsters-M-O.md:3-42" }
    , statBlock =
      { abilityScores =
        { str = 9, dex = 14, con = 11, int = 17, wis = 12, cha = 11 }
      , ac.value = { kind = "literal", value = 15 }
      , actions =
        [ T.textOnly
            { procedureOrdinal = 1
            , name = "Multiattack"
            , description = "The mage makes three Arcane Burst attacks."
            , reason = "unsupported_action_shape"
            }
        , T.textOnly
            { procedureOrdinal = 2
            , name = "Arcane Burst"
            , description =
                "Melee or Ranged Attack Roll: +6, reach 5 ft. or range 120 ft. Hit: 16 (3d8 + 3) Force damage."
            , reason = "unsupported_action_shape"
            }
        , T.executable
            { procedureOrdinal = 3
            , procedure =
                T.spellcasting
                  { name = "Spellcasting"
                  , ability = "int"
                  , spellSaveDc = Some { kind = "fixed", dc = 14 }
                  , spellAttackBonus = None { kind : Text, value : Integer }
                  , components = T.spellDefinitionComponents
                  , groups =
                    { first =
                        T.atWill
                          { spells =
                            { first =
                                T.spellRef
                                  { spellId = "detect_magic"
                                  , count = None Natural
                                  , castAtLevel = None Natural
                                  , restriction = None Text
                                  }
                            , rest =
                                  [ T.spellRef
                                      { spellId = "light"
                                      , count = None Natural
                                      , castAtLevel = None Natural
                                      , restriction = None Text
                                      }
                                  , T.spellRef
                                      { spellId = "mage_armor"
                                      , count = None Natural
                                      , castAtLevel = None Natural
                                      , restriction = Some "included in AC"
                                      }
                                  , T.spellRef
                                      { spellId = "mage_hand"
                                      , count = None Natural
                                      , castAtLevel = None Natural
                                      , restriction = None Text
                                      }
                                  , T.spellRef
                                      { spellId = "prestidigitation"
                                      , count = None Natural
                                      , castAtLevel = None Natural
                                      , restriction = None Text
                                      }
                                  ]
                                : List T.SpellRef
                            }
                          }
                    , rest =
                          [ T.limited
                              { resourceOrdinals =
                                { first = 1, rest = [] : List Natural }
                              , spells =
                                { first =
                                    T.spellRef
                                      { spellId = "fireball"
                                      , count = None Natural
                                      , castAtLevel = Some 4
                                      , restriction = None Text
                                      }
                                , rest =
                                      [ T.spellRef
                                          { spellId = "invisibility"
                                          , count = None Natural
                                          , castAtLevel = None Natural
                                          , restriction = None Text
                                          }
                                      ]
                                    : List T.SpellRef
                                }
                              }
                          , T.limited
                              { resourceOrdinals =
                                { first = 2, rest = [] : List Natural }
                              , spells =
                                { first =
                                    T.spellRef
                                      { spellId = "cone_of_cold"
                                      , count = None Natural
                                      , castAtLevel = None Natural
                                      , restriction = None Text
                                      }
                                , rest =
                                      [ T.spellRef
                                          { spellId = "fly"
                                          , count = None Natural
                                          , castAtLevel = None Natural
                                          , restriction = None Text
                                          }
                                      ]
                                    : List T.SpellRef
                                }
                              }
                          ]
                        : List T.Group
                    }
                  }
            }
        ]
      , bonusActions =
        [ T.executable
            { procedureOrdinal = 1
            , procedure =
                T.spellcasting
                  { name = "Misty Step (3/Day)"
                  , ability = "int"
                  , spellSaveDc = None { kind : Text, dc : Natural }
                  , spellAttackBonus = None { kind : Text, value : Integer }
                  , components = T.spellDefinitionComponents
                  , groups =
                    { first =
                        T.limited
                          { resourceOrdinals =
                            { first = 3, rest = [] : List Natural }
                          , spells =
                            { first =
                                T.spellRef
                                  { spellId = "misty_step"
                                  , count = None Natural
                                  , castAtLevel = None Natural
                                  , restriction = None Text
                                  }
                            , rest = [] : List T.SpellRef
                            }
                          }
                    , rest = [] : List T.Group
                    }
                  }
            }
        ]
      , reactions =
        [ T.resourceTextOnly
            { procedureOrdinal = 1
            , name = "Protective Magic (3/Day)"
            , description =
                "The mage casts Counterspell or Shield in response to the spell's trigger, using the same spellcasting ability as Spellcasting."
            , reason = "unsupported_action_shape"
            , resourceOrdinals = { first = 4, rest = [] : List Natural }
            }
        ]
      , alignment = { order = "neutral", morality = "neutral" }
      , communication =
        { kind = "spoken_and_understood"
        , languages =
          { kind = "named_plus_other_languages"
          , languages = [ "Common" ]
          , additionalLanguages = 3
          }
        }
      , creatureType = "humanoid"
      , creatureTypeTags = [ "wizard" ]
      , gear = [ { item = "Wand", quantity = None Natural } ]
      , hp = { kind = "literal", value = 81 }
      , initiative = { modifier = +2, score = 12 }
      , passivePerception = 14
      , savingThrowModifiers =
        [ { ability = "cha", modifier = +0 }
        , { ability = "con", modifier = +0 }
        , { ability = "dex", modifier = +2 }
        , { ability = "int", modifier = +6 }
        , { ability = "str", modifier = -1 }
        , { ability = "wis", modifier = +4 }
        ]
      , skillModifiers =
        [ { skill = "arcana", modifier = +6 }
        , { skill = "history", modifier = +6 }
        , { skill = "perception", modifier = +4 }
        ]
      , size = { kind = "alternatives", options = [ "medium", "small" ] }
      , speeds =
        [ { kind = "walk"
          , feet = { kind = "literal", value = 30 }
          , hover = None Bool
          }
        ]
      , resources =
        [ T.resource
            { ordinal = 1, ownership = "each", limit = T.daily { uses = 2 } }
        , T.resource
            { ordinal = 2, ownership = "each", limit = T.daily { uses = 1 } }
        , T.resource
            { ordinal = 3, ownership = "shared", limit = T.daily { uses = 3 } }
        , T.resource
            { ordinal = 4, ownership = "shared", limit = T.daily { uses = 3 } }
        ]
      }
    }
