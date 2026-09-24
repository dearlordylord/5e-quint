{ challengeRating = 20
, id = "stat_block_ancient_brass_dragon"
, kind = "statBlock"
, name = "Ancient Brass Dragon"
, provenance = { kind = "srd-5.2.1", section = "monsters-A-Z.md:2683-2778" }
, statBlock =
  { abilityScores =
    { cha = 22, con = 25, dex = 10, int = 16, str = 27, wis = 15 }
  , ac.value = { kind = "literal", value = 20 }
  , actions =
    [ { description = Some
          "The dragon makes three Rend attacks. It can replace one attack with a use of (A) Sleep Breath or (B) Spellcasting to cast Scorching Ray (level 3 version)."
      , kind = "textOnly"
      , name = Some "Multiattack"
      , procedure =
          None
            { ability : Optional Text
            , area :
                Optional
                  { kind : Text, lengthFeet : Natural, widthFeet : Natural }
            , attackAbility : Optional Text
            , attackBonus : Optional { kind : Text, value : Natural }
            , attackType : Optional Text
            , components : Optional { m : Bool, s : Bool, v : Bool }
            , dc : Optional { dc : Natural, kind : Text }
            , groups :
                Optional
                  ( List
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
                                        { creatureTypes : Optional (List Text)
                                        , kind : Text
                                        , maintenanceRequirement : Optional Text
                                        , requirement : Optional Text
                                        , spellGrant : Optional Text
                                        }
                                  }
                            , spellId : Text
                            }
                      }
                  )
            , kind : Text
            , name : Text
            , onFail :
                Optional
                  { amount :
                      { expr : { dice : Natural, dieSize : Natural }
                      , kind : Text
                      , static : Natural
                      }
                  , damageType : Text
                  , kind : Text
                  }
            , onHit :
                Optional
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
            , onSuccess : Optional { kind : Text }
            , reachFeet : Optional Natural
            , spellSaveDc : Optional { dc : Natural, kind : Text }
            }
      , procedureOrdinal = 1
      , reason = Some "unsupported_action_shape"
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { ability = None Text
        , area = None { kind : Text, lengthFeet : Natural, widthFeet : Natural }
        , attackAbility = Some "str"
        , attackBonus = Some { kind = "literal", value = 14 }
        , attackType = Some "melee"
        , components = None { m : Bool, s : Bool, v : Bool }
        , dc = None { dc : Natural, kind : Text }
        , groups =
            None
              ( List
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
                                    { creatureTypes : Optional (List Text)
                                    , kind : Text
                                    , maintenanceRequirement : Optional Text
                                    , requirement : Optional Text
                                    , spellGrant : Optional Text
                                    }
                              }
                        , spellId : Text
                        }
                  }
              )
        , kind = "attack_roll"
        , name = "Rend"
        , onFail =
            None
              { amount :
                  { expr : { dice : Natural, dieSize : Natural }
                  , kind : Text
                  , static : Natural
                  }
              , damageType : Text
              , kind : Text
              }
        , onHit = Some
          [ { amount =
              { expr = { dice = 2, dieSize = 10, flat = Some 8 }
              , kind = "fixed"
              , static = 19
              }
            , damageType = "slashing"
            , kind = "damage"
            }
          , { amount =
              { expr = { dice = 2, dieSize = 6, flat = None Natural }
              , kind = "fixed"
              , static = 7
              }
            , damageType = "fire"
            , kind = "damage"
            }
          ]
        , onSuccess = None { kind : Text }
        , reachFeet = Some 15
        , spellSaveDc = None { dc : Natural, kind : Text }
        }
      , procedureOrdinal = 2
      , reason = None Text
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { ability = Some "dex"
        , area = Some { kind = "line", lengthFeet = 90, widthFeet = 5 }
        , attackAbility = None Text
        , attackBonus = None { kind : Text, value : Natural }
        , attackType = None Text
        , components = None { m : Bool, s : Bool, v : Bool }
        , dc = Some { dc = 21, kind = "fixed" }
        , groups =
            None
              ( List
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
                                    { creatureTypes : Optional (List Text)
                                    , kind : Text
                                    , maintenanceRequirement : Optional Text
                                    , requirement : Optional Text
                                    , spellGrant : Optional Text
                                    }
                              }
                        , spellId : Text
                        }
                  }
              )
        , kind = "save"
        , name = "Fire Breath"
        , onFail = Some
          { amount =
            { expr = { dice = 13, dieSize = 8 }, kind = "fixed", static = 58 }
          , damageType = "fire"
          , kind = "damage"
          }
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
        , onSuccess = Some { kind = "half_damage" }
        , reachFeet = None Natural
        , spellSaveDc = None { dc : Natural, kind : Text }
        }
      , procedureOrdinal = 3
      , reason = None Text
      , resourceRefs = { kind = "some", ordinals = Some [ 1 ] }
      }
    , { description = Some
          "Constitution Saving Throw: DC 21, each creature in a 90-foot Cone. Failure: The target has the Incapacitated condition until the end of its next turn, at which point it repeats the save. Second Failure: The target has the Unconscious condition for 10 minutes. This effect ends for the target if it takes damage or a creature within 5 feet of it takes an action to wake it."
      , kind = "textOnly"
      , name = Some "Sleep Breath"
      , procedure =
          None
            { ability : Optional Text
            , area :
                Optional
                  { kind : Text, lengthFeet : Natural, widthFeet : Natural }
            , attackAbility : Optional Text
            , attackBonus : Optional { kind : Text, value : Natural }
            , attackType : Optional Text
            , components : Optional { m : Bool, s : Bool, v : Bool }
            , dc : Optional { dc : Natural, kind : Text }
            , groups :
                Optional
                  ( List
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
                                        { creatureTypes : Optional (List Text)
                                        , kind : Text
                                        , maintenanceRequirement : Optional Text
                                        , requirement : Optional Text
                                        , spellGrant : Optional Text
                                        }
                                  }
                            , spellId : Text
                            }
                      }
                  )
            , kind : Text
            , name : Text
            , onFail :
                Optional
                  { amount :
                      { expr : { dice : Natural, dieSize : Natural }
                      , kind : Text
                      , static : Natural
                      }
                  , damageType : Text
                  , kind : Text
                  }
            , onHit :
                Optional
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
            , onSuccess : Optional { kind : Text }
            , reachFeet : Optional Natural
            , spellSaveDc : Optional { dc : Natural, kind : Text }
            }
      , procedureOrdinal = 4
      , reason = Some "unsupported_action_shape"
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { ability = Some "cha"
        , area = None { kind : Text, lengthFeet : Natural, widthFeet : Natural }
        , attackAbility = None Text
        , attackBonus = None { kind : Text, value : Natural }
        , attackType = None Text
        , components = Some { m = False, s = True, v = True }
        , dc = None { dc : Natural, kind : Text }
        , groups = Some
          [ { kind = "at_will"
            , resourceRefs = { kind = "none", ordinals = None (List Natural) }
            , spells =
              [ { castAtLevel = None Natural
                , restriction =
                    None
                      { authoredExpression : Text
                      , deltas :
                          List
                            { creatureTypes : Optional (List Text)
                            , kind : Text
                            , maintenanceRequirement : Optional Text
                            , requirement : Optional Text
                            , spellGrant : Optional Text
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
                            { creatureTypes : Optional (List Text)
                            , kind : Text
                            , maintenanceRequirement : Optional Text
                            , requirement : Optional Text
                            , spellGrant : Optional Text
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
                            { creatureTypes : Optional (List Text)
                            , kind : Text
                            , maintenanceRequirement : Optional Text
                            , requirement : Optional Text
                            , spellGrant : Optional Text
                            }
                      }
                , spellId = "scorching_ray"
                }
              , { castAtLevel = None Natural
                , restriction = Some
                  { authoredExpression =
                      "Beast or Humanoid form only, no Temporary Hit Points gained from the spell, and no Concentration or Temporary Hit Points required to maintain the spell"
                  , deltas =
                    [ { creatureTypes = Some [ "beast", "humanoid" ]
                      , kind = "transformation_form_creature_type_limit"
                      , maintenanceRequirement = None Text
                      , requirement = None Text
                      , spellGrant = None Text
                      }
                    , { creatureTypes = None (List Text)
                      , kind = "temporary_hit_points"
                      , maintenanceRequirement = Some "not_required"
                      , requirement = None Text
                      , spellGrant = Some "none"
                      }
                    , { creatureTypes = None (List Text)
                      , kind = "concentration_requirement"
                      , maintenanceRequirement = None Text
                      , requirement = Some "not_required"
                      , spellGrant = None Text
                      }
                    ]
                  }
                , spellId = "shapechange"
                }
              , { castAtLevel = None Natural
                , restriction =
                    None
                      { authoredExpression : Text
                      , deltas :
                          List
                            { creatureTypes : Optional (List Text)
                            , kind : Text
                            , maintenanceRequirement : Optional Text
                            , requirement : Optional Text
                            , spellGrant : Optional Text
                            }
                      }
                , spellId = "speak_with_animals"
                }
              ]
            }
          , { kind = "limited"
            , resourceRefs = { kind = "some", ordinals = Some [ 2 ] }
            , spells =
              [ { castAtLevel = None Natural
                , restriction =
                    None
                      { authoredExpression : Text
                      , deltas :
                          List
                            { creatureTypes : Optional (List Text)
                            , kind : Text
                            , maintenanceRequirement : Optional Text
                            , requirement : Optional Text
                            , spellGrant : Optional Text
                            }
                      }
                , spellId = "control_weather"
                }
              , { castAtLevel = None Natural
                , restriction =
                    None
                      { authoredExpression : Text
                      , deltas :
                          List
                            { creatureTypes : Optional (List Text)
                            , kind : Text
                            , maintenanceRequirement : Optional Text
                            , requirement : Optional Text
                            , spellGrant : Optional Text
                            }
                      }
                , spellId = "detect_thoughts"
                }
              ]
            }
          ]
        , kind = "spellcasting"
        , name = "Spellcasting"
        , onFail =
            None
              { amount :
                  { expr : { dice : Natural, dieSize : Natural }
                  , kind : Text
                  , static : Natural
                  }
              , damageType : Text
              , kind : Text
              }
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
        , onSuccess = None { kind : Text }
        , reachFeet = None Natural
        , spellSaveDc = Some { dc = 20, kind = "fixed" }
        }
      , procedureOrdinal = 5
      , reason = None Text
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    ]
  , alignment = { morality = "good", order = "chaotic" }
  , communication =
    { kind = "spoken_and_understood"
    , languages = { kind = "named", languages = [ "Common", "Draconic" ] }
    }
  , creatureType = "dragon"
  , creatureTypeTags = [ "metallic" ]
  , hp = { kind = "literal", value = 332 }
  , immunities.damageTypes = [ "fire" ]
  , initiative = { modifier = 12, score = 22 }
  , legendaryActions =
    { entries =
      [ { description =
            "The dragon uses Spellcasting to cast Scorching Ray (level 3 version)."
        , kind = "textOnly"
        , name = "Blazing Light"
        , procedureOrdinal = 1
        , reason = "unsupported_action_shape"
        , resourceRefs.kind = "none"
        }
      , { description =
            "The dragon moves up to half its Speed, and it makes one Rend attack."
        , kind = "textOnly"
        , name = "Pounce"
        , procedureOrdinal = 2
        , reason = "unsupported_action_shape"
        , resourceRefs.kind = "none"
        }
      , { description =
            "Dexterity Saving Throw: DC 20, one creature the dragon can see within 120 feet. Failure: 36 (8d8) Fire damage, and the target's Speed is halved until the end of its next turn. Failure or Success: The dragon can't take this action again until the start of its next turn."
        , kind = "textOnly"
        , name = "Scorching Sands"
        , procedureOrdinal = 3
        , reason = "unsupported_action_shape"
        , resourceRefs.kind = "none"
        }
      ]
    , uses =
      { additionalUsesInLair = 1, kind = "lair_bonus", usesOutsideLair = 3 }
    }
  , passivePerception = 24
  , resources =
    [ { limit = { kind = "recharge", minimumRoll = Some 5, uses = None Natural }
      , ordinal = 1
      , ownership = "shared"
      }
    , { limit = { kind = "daily", minimumRoll = None Natural, uses = Some 1 }
      , ordinal = 2
      , ownership = "each"
      }
    ]
  , savingThrowModifiers =
    [ { ability = "str", modifier = 8 }
    , { ability = "dex", modifier = 6 }
    , { ability = "con", modifier = 7 }
    , { ability = "int", modifier = 3 }
    , { ability = "wis", modifier = 8 }
    , { ability = "cha", modifier = 6 }
    ]
  , senses =
    [ { kind = "blindsight", rangeFeet = 60 }
    , { kind = "darkvision", rangeFeet = 120 }
    ]
  , size = "gargantuan"
  , skillModifiers =
    [ { modifier = 9, skill = "history" }
    , { modifier = 14, skill = "perception" }
    , { modifier = 12, skill = "persuasion" }
    , { modifier = 6, skill = "stealth" }
    ]
  , speeds =
    [ { feet = { kind = "literal", value = 40 }, kind = "walk" }
    , { feet = { kind = "literal", value = 40 }, kind = "burrow" }
    , { feet = { kind = "literal", value = 80 }, kind = "fly" }
    ]
  , traits =
    [ { description =
          "If the dragon fails a saving throw, it can choose to succeed instead."
      , name = "Legendary Resistance (4/Day, or 5/Day in Lair)"
      }
    ]
  }
}
