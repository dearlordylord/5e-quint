{ challengeRating = 3
, id = "stat_block_green_hag"
, kind = "statBlock"
, name = "Green Hag"
, provenance = { kind = "srd-5.2.1", section = "monsters-A-Z.md:8367-8448" }
, statBlock =
  { abilityScores =
    { cha = 14, con = 16, dex = 12, int = 13, str = 18, wis = 14 }
  , ac.value = { kind = "literal", value = 17 }
  , actions =
    [ { kind = "executable"
      , procedure =
        { ability = None Text
        , attackAbility = None Text
        , attackBonus = None { kind : Text, value : Natural }
        , attackType = None Text
        , components = None { m : Bool, s : Bool, v : Bool }
        , dispatches = Some
          [ { count = { kind = "literal", value = 2 }, procedureOrdinal = 2 } ]
        , groups =
            None
              ( List
                  { kind : Text
                  , resourceRefs : { kind : Text }
                  , spells :
                      List
                        { castAtLevel : Optional Natural
                        , restriction :
                            Optional
                              { authoredExpression : Text
                              , deltas :
                                  List
                                    { duration :
                                        Optional
                                          { amount : Natural, unit : Text }
                                    , kind : Text
                                    , subject : Optional Text
                                    , target : Optional Text
                                    , trace : Optional Text
                                    , whileCondition : Optional Text
                                    }
                              }
                        , spellId : Text
                        }
                  }
              )
        , kind = "multiattack"
        , name = "Multiattack"
        , onHit =
            None
              ( List
                  { amount :
                      { expr :
                          { dice : Natural
                          , dieSize : Natural
                          , flat : Optional Natural
                          }
                      , kind : Text
                      , static : Natural
                      }
                  , damageType : Text
                  , kind : Text
                  }
              )
        , reachFeet = None Natural
        , spellAttackBonus = None { kind : Text, value : Natural }
        , spellSaveDc = None { dc : Natural, kind : Text }
        }
      , procedureOrdinal = 1
      , resourceRefs.kind = "none"
      }
    , { kind = "executable"
      , procedure =
        { ability = None Text
        , attackAbility = Some "str"
        , attackBonus = Some { kind = "literal", value = 6 }
        , attackType = Some "melee"
        , components = None { m : Bool, s : Bool, v : Bool }
        , dispatches =
            None
              ( List
                  { count : { kind : Text, value : Natural }
                  , procedureOrdinal : Natural
                  }
              )
        , groups =
            None
              ( List
                  { kind : Text
                  , resourceRefs : { kind : Text }
                  , spells :
                      List
                        { castAtLevel : Optional Natural
                        , restriction :
                            Optional
                              { authoredExpression : Text
                              , deltas :
                                  List
                                    { duration :
                                        Optional
                                          { amount : Natural, unit : Text }
                                    , kind : Text
                                    , subject : Optional Text
                                    , target : Optional Text
                                    , trace : Optional Text
                                    , whileCondition : Optional Text
                                    }
                              }
                        , spellId : Text
                        }
                  }
              )
        , kind = "attack_roll"
        , name = "Claw"
        , onHit = Some
          [ { amount =
              { expr = { dice = 1, dieSize = 8, flat = Some 4 }
              , kind = "fixed"
              , static = 8
              }
            , damageType = "slashing"
            , kind = "damage"
            }
          , { amount =
              { expr = { dice = 1, dieSize = 6, flat = None Natural }
              , kind = "fixed"
              , static = 3
              }
            , damageType = "poison"
            , kind = "damage"
            }
          ]
        , reachFeet = Some 5
        , spellAttackBonus = None { kind : Text, value : Natural }
        , spellSaveDc = None { dc : Natural, kind : Text }
        }
      , procedureOrdinal = 2
      , resourceRefs.kind = "none"
      }
    , { kind = "executable"
      , procedure =
        { ability = Some "wis"
        , attackAbility = None Text
        , attackBonus = None { kind : Text, value : Natural }
        , attackType = None Text
        , components = Some { m = False, s = True, v = True }
        , dispatches =
            None
              ( List
                  { count : { kind : Text, value : Natural }
                  , procedureOrdinal : Natural
                  }
              )
        , groups = Some
          [ { kind = "at_will"
            , resourceRefs.kind = "none"
            , spells =
              [ { castAtLevel = None Natural
                , restriction =
                    None
                      { authoredExpression : Text
                      , deltas :
                          List
                            { duration :
                                Optional { amount : Natural, unit : Text }
                            , kind : Text
                            , subject : Optional Text
                            , target : Optional Text
                            , trace : Optional Text
                            , whileCondition : Optional Text
                            }
                      }
                , spellId = "dancing_lights"
                }
              , { castAtLevel = None Natural
                , restriction = Some
                  { authoredExpression = "24-hour duration"
                  , deltas =
                    [ { duration = Some { amount = 24, unit = "hour" }
                      , kind = "duration_override"
                      , subject = None Text
                      , target = None Text
                      , trace = None Text
                      , whileCondition = None Text
                      }
                    ]
                  }
                , spellId = "disguise_self"
                }
              , { castAtLevel = None Natural
                , restriction = Some
                  { authoredExpression =
                      "self only, and the hag leaves no tracks while Invisible"
                  , deltas =
                    [ { duration = None { amount : Natural, unit : Text }
                      , kind = "target_limit"
                      , subject = None Text
                      , target = Some "self"
                      , trace = None Text
                      , whileCondition = None Text
                      }
                    , { duration = None { amount : Natural, unit : Text }
                      , kind = "movement_trace_suppression"
                      , subject = Some "invoker"
                      , target = None Text
                      , trace = Some "none"
                      , whileCondition = Some "invisible"
                      }
                    ]
                  }
                , spellId = "invisibility"
                }
              , { castAtLevel = None Natural
                , restriction =
                    None
                      { authoredExpression : Text
                      , deltas :
                          List
                            { duration :
                                Optional { amount : Natural, unit : Text }
                            , kind : Text
                            , subject : Optional Text
                            , target : Optional Text
                            , trace : Optional Text
                            , whileCondition : Optional Text
                            }
                      }
                , spellId = "minor_illusion"
                }
              , { castAtLevel = Some 3
                , restriction =
                    None
                      { authoredExpression : Text
                      , deltas :
                          List
                            { duration :
                                Optional { amount : Natural, unit : Text }
                            , kind : Text
                            , subject : Optional Text
                            , target : Optional Text
                            , trace : Optional Text
                            , whileCondition : Optional Text
                            }
                      }
                , spellId = "ray_of_sickness"
                }
              ]
            }
          ]
        , kind = "spellcasting"
        , name = "Spellcasting"
        , onHit =
            None
              ( List
                  { amount :
                      { expr :
                          { dice : Natural
                          , dieSize : Natural
                          , flat : Optional Natural
                          }
                      , kind : Text
                      , static : Natural
                      }
                  , damageType : Text
                  , kind : Text
                  }
              )
        , reachFeet = None Natural
        , spellAttackBonus = Some { kind = "literal", value = 4 }
        , spellSaveDc = Some { dc = 12, kind = "fixed" }
        }
      , procedureOrdinal = 3
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = { morality = "evil", order = "neutral" }
  , communication =
    { kind = "spoken_and_understood"
    , languages =
      { kind = "named", languages = [ "Common", "Elvish", "Sylvan" ] }
    }
  , creatureType = "fey"
  , hp = { kind = "literal", value = 82 }
  , initiative = { modifier = 1, score = 11 }
  , passivePerception = 14
  , savingThrowModifiers =
    [ { ability = "str", modifier = 4 }
    , { ability = "dex", modifier = 1 }
    , { ability = "con", modifier = 3 }
    , { ability = "int", modifier = 1 }
    , { ability = "wis", modifier = 2 }
    , { ability = "cha", modifier = 2 }
    ]
  , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
  , size = "medium"
  , skillModifiers =
    [ { modifier = 5, skill = "arcana" }
    , { modifier = 4, skill = "deception" }
    , { modifier = 4, skill = "perception" }
    , { modifier = 3, skill = "stealth" }
    ]
  , speeds =
    [ { feet = { kind = "literal", value = 30 }, kind = "walk" }
    , { feet = { kind = "literal", value = 30 }, kind = "swim" }
    ]
  , traits =
    [ { description = "The hag can breathe air and water."
      , name = "Amphibious"
      }
    , { description =
          "While within 30 feet of at least two hag allies, the hag can cast one of the following spells, requiring no Material components, using the spell's normal casting time, and using Intelligence as the spellcasting ability (spell save DC 11): Augury, Find Familiar, Identify, Locate Object, Scrying, or Unseen Servant. The hag must finish a Long Rest before using this trait to cast that spell again."
      , name = "Coven Magic"
      }
    , { description =
          "The hag can mimic animal sounds and humanoid voices. A creature that hears the sounds can tell they are imitations only with a successful DC 14 Wisdom (Insight) check."
      , name = "Mimicry"
      }
    ]
  }
}
