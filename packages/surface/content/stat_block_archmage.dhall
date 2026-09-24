{ challengeRating = 12
, id = "stat_block_archmage"
, kind = "statBlock"
, name = "Archmage"
, provenance = { kind = "srd-5.2.1", section = "monsters-A-Z.md:10819-10912" }
, statBlock =
  { abilityScores =
    { cha = 16, con = 12, dex = 14, int = 20, str = 10, wis = 15 }
  , ac.value = { kind = "literal", value = 17 }
  , actions =
    [ { description = Some "The archmage makes four Arcane Burst attacks."
      , kind = "textOnly"
      , name = Some "Multiattack"
      , procedure =
          None
            { ability : Text
            , groups :
                List
                  { kind : Text
                  , resourceRefs :
                      { kind : Text, ordinals : Optional (List Natural) }
                  , spells :
                      List
                        { castAtLevel : Optional Natural
                        , restriction :
                            Optional
                              { authoredExpression : Text
                              , deltas :
                                  List
                                    { kind : Text
                                    , projection : Optional Text
                                    , timing : Optional Text
                                    }
                              }
                        , spellId : Text
                        }
                  }
            , kind : Text
            , name : Text
            , spellSaveDc : { dc : Natural, kind : Text }
            }
      , procedureOrdinal = 1
      , reason = Some "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    , { description = Some
          "Melee or Ranged Attack Roll: +9, reach 5 ft. or range 150 ft. Hit: 27 (4d10 + 5) Force damage."
      , kind = "textOnly"
      , name = Some "Arcane Burst"
      , procedure =
          None
            { ability : Text
            , groups :
                List
                  { kind : Text
                  , resourceRefs :
                      { kind : Text, ordinals : Optional (List Natural) }
                  , spells :
                      List
                        { castAtLevel : Optional Natural
                        , restriction :
                            Optional
                              { authoredExpression : Text
                              , deltas :
                                  List
                                    { kind : Text
                                    , projection : Optional Text
                                    , timing : Optional Text
                                    }
                              }
                        , spellId : Text
                        }
                  }
            , kind : Text
            , name : Text
            , spellSaveDc : { dc : Natural, kind : Text }
            }
      , procedureOrdinal = 2
      , reason = Some "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { ability = "int"
        , groups =
          [ { kind = "at_will"
            , resourceRefs = { kind = "none", ordinals = None (List Natural) }
            , spells =
              [ { castAtLevel = None Natural
                , restriction =
                    None
                      { authoredExpression : Text
                      , deltas :
                          List
                            { kind : Text
                            , projection : Optional Text
                            , timing : Optional Text
                            }
                      }
                , spellId = "detect_magic"
                }
              , { castAtLevel = None Natural
                , restriction =
                    None
                      { authoredExpression : Text
                      , deltas :
                          List
                            { kind : Text
                            , projection : Optional Text
                            , timing : Optional Text
                            }
                      }
                , spellId = "detect_thoughts"
                }
              , { castAtLevel = None Natural
                , restriction =
                    None
                      { authoredExpression : Text
                      , deltas :
                          List
                            { kind : Text
                            , projection : Optional Text
                            , timing : Optional Text
                            }
                      }
                , spellId = "disguise_self"
                }
              , { castAtLevel = None Natural
                , restriction =
                    None
                      { authoredExpression : Text
                      , deltas :
                          List
                            { kind : Text
                            , projection : Optional Text
                            , timing : Optional Text
                            }
                      }
                , spellId = "invisibility"
                }
              , { castAtLevel = None Natural
                , restriction =
                    None
                      { authoredExpression : Text
                      , deltas :
                          List
                            { kind : Text
                            , projection : Optional Text
                            , timing : Optional Text
                            }
                      }
                , spellId = "light"
                }
              , { castAtLevel = None Natural
                , restriction = Some
                  { authoredExpression = "included in AC"
                  , deltas =
                    [ { kind = "armor_class_already_includes_effect"
                      , projection = Some "already_included"
                      , timing = None Text
                      }
                    ]
                  }
                , spellId = "mage_armor"
                }
              , { castAtLevel = None Natural
                , restriction =
                    None
                      { authoredExpression : Text
                      , deltas :
                          List
                            { kind : Text
                            , projection : Optional Text
                            , timing : Optional Text
                            }
                      }
                , spellId = "mage_hand"
                }
              , { castAtLevel = None Natural
                , restriction =
                    None
                      { authoredExpression : Text
                      , deltas :
                          List
                            { kind : Text
                            , projection : Optional Text
                            , timing : Optional Text
                            }
                      }
                , spellId = "prestidigitation"
                }
              ]
            }
          , { kind = "limited"
            , resourceRefs = { kind = "some", ordinals = Some [ 1 ] }
            , spells =
              [ { castAtLevel = None Natural
                , restriction =
                    None
                      { authoredExpression : Text
                      , deltas :
                          List
                            { kind : Text
                            , projection : Optional Text
                            , timing : Optional Text
                            }
                      }
                , spellId = "fly"
                }
              , { castAtLevel = Some 7
                , restriction =
                    None
                      { authoredExpression : Text
                      , deltas :
                          List
                            { kind : Text
                            , projection : Optional Text
                            , timing : Optional Text
                            }
                      }
                , spellId = "lightning_bolt"
                }
              ]
            }
          , { kind = "limited"
            , resourceRefs = { kind = "some", ordinals = Some [ 2 ] }
            , spells =
              [ { castAtLevel = Some 9
                , restriction =
                    None
                      { authoredExpression : Text
                      , deltas :
                          List
                            { kind : Text
                            , projection : Optional Text
                            , timing : Optional Text
                            }
                      }
                , spellId = "cone_of_cold"
                }
              , { castAtLevel = None Natural
                , restriction = Some
                  { authoredExpression = "cast before combat"
                  , deltas =
                    [ { kind = "application_timing"
                      , projection = None Text
                      , timing = Some "before_combat"
                      }
                    ]
                  }
                , spellId = "mind_blank"
                }
              , { castAtLevel = None Natural
                , restriction =
                    None
                      { authoredExpression : Text
                      , deltas :
                          List
                            { kind : Text
                            , projection : Optional Text
                            , timing : Optional Text
                            }
                      }
                , spellId = "scrying"
                }
              , { castAtLevel = None Natural
                , restriction =
                    None
                      { authoredExpression : Text
                      , deltas :
                          List
                            { kind : Text
                            , projection : Optional Text
                            , timing : Optional Text
                            }
                      }
                , spellId = "teleport"
                }
              ]
            }
          ]
        , kind = "spellcasting"
        , name = "Spellcasting"
        , spellSaveDc = { dc = 17, kind = "fixed" }
        }
      , procedureOrdinal = 3
      , reason = None Text
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = { morality = "neutral", order = "neutral" }
  , bonusActions =
    [ { kind = "executable"
      , procedure =
        { ability = "int"
        , groups =
          [ { kind = "limited"
            , resourceRefs = { kind = "some", ordinals = [ 3 ] }
            , spells = [ { spellId = "misty_step" } ]
            }
          ]
        , kind = "spellcasting"
        , name = "Misty Step (3/Day)"
        }
      , procedureOrdinal = 1
      , resourceRefs.kind = "none"
      }
    ]
  , communication =
    { kind = "spoken_and_understood"
    , languages =
      { additionalLanguages = 5
      , kind = "named_plus_other_languages"
      , languages = [ "Common" ]
      }
    }
  , creatureType = "humanoid"
  , creatureTypeTags = [ "wizard" ]
  , gear = [ { item = "Wand" } ]
  , hp = { kind = "literal", value = 170 }
  , immunities =
    { damageTypes = [ "psychic" ]
    , qualifiedConditions =
      [ { condition = "charmed", qualifier = "with _Mind Blank_" } ]
    }
  , initiative = { modifier = 7, score = 17 }
  , passivePerception = 16
  , reactions =
    [ { description =
          "The archmage casts Counterspell or Shield in response to the spell's trigger, using the same spellcasting ability as Spellcasting."
      , kind = "textOnly"
      , name = "Protective Magic (3/Day)"
      , procedureOrdinal = 1
      , reason = "unsupported_action_shape"
      , resourceRefs = { kind = "some", ordinals = [ 4 ] }
      }
    ]
  , resources =
    [ { limit = { kind = "daily", uses = 2 }, ordinal = 1, ownership = "each" }
    , { limit = { kind = "daily", uses = 1 }, ordinal = 2, ownership = "each" }
    , { limit = { kind = "daily", uses = 3 }
      , ordinal = 3
      , ownership = "shared"
      }
    , { limit = { kind = "daily", uses = 3 }
      , ordinal = 4
      , ownership = "shared"
      }
    ]
  , savingThrowModifiers =
    [ { ability = "str", modifier = 0 }
    , { ability = "dex", modifier = 2 }
    , { ability = "con", modifier = 1 }
    , { ability = "int", modifier = 9 }
    , { ability = "wis", modifier = 6 }
    , { ability = "cha", modifier = 3 }
    ]
  , size = { kind = "alternatives", options = [ "medium", "small" ] }
  , skillModifiers =
    [ { modifier = 13, skill = "arcana" }
    , { modifier = 9, skill = "history" }
    , { modifier = 6, skill = "perception" }
    ]
  , speeds = [ { feet = { kind = "literal", value = 30 }, kind = "walk" } ]
  , traits =
    [ { description =
          "The archmage has Advantage on saving throws against spells and other magical effects."
      , name = "Magic Resistance"
      }
    ]
  }
}
