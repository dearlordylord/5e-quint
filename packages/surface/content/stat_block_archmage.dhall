let T = ./_stat_block_types.dhall

in  { challengeRating = 12
    , id = "stat_block_archmage"
    , kind = "statBlock"
    , name = "Archmage"
    , provenance =
      { kind = "srd-5.2.1", section = "Monsters/Monsters-M-O.md:46-90" }
    , statBlock =
      { abilityScores =
        { str = 10, dex = 14, con = 12, int = 20, wis = 15, cha = 16 }
      , ac.value = { kind = "literal", value = 17 }
      , actions =
        [ T.textOnly
            { procedureOrdinal = 1
            , name = "Multiattack"
            , description = "The archmage makes four Arcane Burst attacks."
            , reason = "unsupported_action_shape"
            }
        , T.textOnly
            { procedureOrdinal = 2
            , name = "Arcane Burst"
            , description =
                "Melee or Ranged Attack Roll: +9, reach 5 ft. or range 150 ft. Hit: 27 (4d10 + 5) Force damage."
            , reason = "unsupported_action_shape"
            }
        , T.executable
            { procedureOrdinal = 3
            , procedure =
                T.spellcasting
                  { name = "Spellcasting"
                  , ability = "int"
                  , spellSaveDc = Some { kind = "fixed", dc = 17 }
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

                                  }
                            , rest =
                                  [ T.spellRef
                                      { spellId = "detect_thoughts"
                                      , count = None Natural
                                      , castAtLevel = None Natural

                                      }
                                  , T.spellRef
                                      { spellId = "disguise_self"
                                      , count = None Natural
                                      , castAtLevel = None Natural

                                      }
                                  , T.spellRef
                                      { spellId = "invisibility"
                                      , count = None Natural
                                      , castAtLevel = None Natural

                                      }
                                  , T.spellRef
                                      { spellId = "light"
                                      , count = None Natural
                                      , castAtLevel = None Natural

                                      }
                                  , T.restrictedSpellRef { spellId = "mage_armor"
                                      , count = None Natural
                                      , castAtLevel = None Natural
                                      , restriction = { authoredExpression = "included in AC", deltas = { first = T.spellEffectAlreadyIncludedInArmorClass, rest = [] : List T.InvocationDelta } }
                                      }
                                  , T.spellRef
                                      { spellId = "mage_hand"
                                      , count = None Natural
                                      , castAtLevel = None Natural

                                      }
                                  , T.spellRef
                                      { spellId = "prestidigitation"
                                      , count = None Natural
                                      , castAtLevel = None Natural

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
                                      { spellId = "fly"
                                      , count = None Natural
                                      , castAtLevel = None Natural

                                      }
                                , rest =
                                      [ T.spellRef
                                          { spellId = "lightning_bolt"
                                          , count = None Natural
                                          , castAtLevel = Some 7

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
                                      , castAtLevel = Some 9

                                      }
                                , rest =
                                      [ T.restrictedSpellRef { spellId = "mind_blank"
                                          , count = None Natural
                                          , castAtLevel = None Natural
                                          , restriction = { authoredExpression = "cast before combat", deltas = { first = T.appliedBeforeCombat, rest = [] : List T.InvocationDelta } }
                                          }
                                      , T.spellRef
                                          { spellId = "scrying"
                                          , count = None Natural
                                          , castAtLevel = None Natural

                                          }
                                      , T.spellRef
                                          { spellId = "teleport"
                                          , count = None Natural
                                          , castAtLevel = None Natural

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
                "The archmage casts Counterspell or Shield in response to the spell's trigger, using the same spellcasting ability as Spellcasting."
            , reason = "unsupported_action_shape"
            , resourceOrdinals = { first = 4, rest = [] : List Natural }
            }
        ]
      , traits =
        [ T.trait
            { name = "Magic Resistance"
            , description =
                "The archmage has Advantage on saving throws against spells and other magical effects."
            , effectKind = None Text
            }
        ]
      , alignment = { order = "neutral", morality = "neutral" }
      , communication =
        { kind = "spoken_and_understood"
        , languages =
          { kind = "named_plus_other_languages"
          , languages = [ "Common" ]
          , additionalLanguages = 5
          }
        }
      , creatureType = "humanoid"
      , creatureTypeTags = [ "wizard" ]
      , gear = [ { item = "Wand", quantity = None Natural } ]
      , hp = { kind = "literal", value = 170 }
      , initiative = { modifier = +7, score = 17 }
      , passivePerception = 16
      , savingThrowModifiers =
        [ { ability = "cha", modifier = +3 }
        , { ability = "con", modifier = +1 }
        , { ability = "dex", modifier = +2 }
        , { ability = "int", modifier = +9 }
        , { ability = "str", modifier = +0 }
        , { ability = "wis", modifier = +6 }
        ]
      , skillModifiers =
        [ { skill = "arcana", modifier = +13 }
        , { skill = "history", modifier = +9 }
        , { skill = "perception", modifier = +6 }
        ]
      , immunities =
        { conditions = None (List Text)
        , damageTypes = Some [ "psychic" ]
        , qualifiedConditions = Some
          [ { condition = "charmed", qualifier = "with *Mind Blank*" } ]
        }
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
