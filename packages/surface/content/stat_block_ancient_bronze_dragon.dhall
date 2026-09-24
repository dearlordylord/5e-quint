{ challengeRating = 22
, id = "stat_block_ancient_bronze_dragon"
, kind = "statBlock"
, name = "Ancient Bronze Dragon"
, provenance = { kind = "srd-5.2.1", section = "monsters-A-Z.md:3044-3141" }
, statBlock =
  { abilityScores =
    { cha = 25, con = 27, dex = 10, int = 18, str = 29, wis = 17 }
  , ac.value = { kind = "literal", value = 22 }
  , actions =
    [ { description = Some
          "The dragon makes three Rend attacks. It can replace one attack with a use of (A) Repulsion Breath or (B) Spellcasting to cast Guiding Bolt (level 2 version)."
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
            , spellAttackBonus : Optional { kind : Text, value : Natural }
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
        , attackBonus = Some { kind = "literal", value = 16 }
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
              { expr = { dice = 2, dieSize = 8, flat = Some 9 }
              , kind = "fixed"
              , static = 18
              }
            , damageType = "slashing"
            , kind = "damage"
            }
          , { amount =
              { expr = { dice = 2, dieSize = 8, flat = None Natural }
              , kind = "fixed"
              , static = 9
              }
            , damageType = "lightning"
            , kind = "damage"
            }
          ]
        , onSuccess = None { kind : Text }
        , reachFeet = Some 15
        , spellAttackBonus = None { kind : Text, value : Natural }
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
        , area = Some { kind = "line", lengthFeet = 120, widthFeet = 10 }
        , attackAbility = None Text
        , attackBonus = None { kind : Text, value : Natural }
        , attackType = None Text
        , components = None { m : Bool, s : Bool, v : Bool }
        , dc = Some { dc = 23, kind = "fixed" }
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
        , name = "Lightning Breath"
        , onFail = Some
          { amount =
            { expr = { dice = 15, dieSize = 10 }, kind = "fixed", static = 82 }
          , damageType = "lightning"
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
        , spellAttackBonus = None { kind : Text, value : Natural }
        , spellSaveDc = None { dc : Natural, kind : Text }
        }
      , procedureOrdinal = 3
      , reason = None Text
      , resourceRefs = { kind = "some", ordinals = Some [ 1 ] }
      }
    , { description = Some
          "Strength Saving Throw: DC 23, each creature in a 30-foot Cone. Failure: The target is pushed up to 60 feet straight away from the dragon and has the Prone condition."
      , kind = "textOnly"
      , name = Some "Repulsion Breath"
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
            , spellAttackBonus : Optional { kind : Text, value : Natural }
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
              , { castAtLevel = Some 2
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
                , spellId = "guiding_bolt"
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
                , spellId = "thaumaturgy"
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
                , spellId = "detect_thoughts"
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
                , spellId = "control_water"
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
                , spellId = "scrying"
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
                , spellId = "water_breathing"
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
        , spellAttackBonus = Some { kind = "literal", value = 14 }
        , spellSaveDc = Some { dc = 22, kind = "fixed" }
        }
      , procedureOrdinal = 5
      , reason = None Text
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    ]
  , alignment = { morality = "good", order = "lawful" }
  , communication =
    { kind = "spoken_and_understood"
    , languages = { kind = "named", languages = [ "Common", "Draconic" ] }
    }
  , creatureType = "dragon"
  , creatureTypeTags = [ "metallic" ]
  , hp = { kind = "literal", value = 444 }
  , immunities.damageTypes = [ "lightning" ]
  , initiative = { modifier = 14, score = 24 }
  , legendaryActions =
    { entries =
      [ { description =
            "The dragon uses Spellcasting to cast Guiding Bolt (level 2 version)."
        , kind = "textOnly"
        , name = "Guiding Light"
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
            "Constitution Saving Throw: DC 22, each creature in a 20-foot-radius Sphere centered on a point the dragon can see within 120 feet. Failure: 13 (3d8) Thunder damage, and the target has the Deafened condition until the end of its next turn."
        , kind = "textOnly"
        , name = "Thunderclap"
        , procedureOrdinal = 3
        , reason = "unsupported_action_shape"
        , resourceRefs.kind = "none"
        }
      ]
    , uses =
      { additionalUsesInLair = 1, kind = "lair_bonus", usesOutsideLair = 3 }
    }
  , passivePerception = 27
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
    [ { ability = "str", modifier = 9 }
    , { ability = "dex", modifier = 7 }
    , { ability = "con", modifier = 8 }
    , { ability = "int", modifier = 4 }
    , { ability = "wis", modifier = 10 }
    , { ability = "cha", modifier = 7 }
    ]
  , senses =
    [ { kind = "blindsight", rangeFeet = 60 }
    , { kind = "darkvision", rangeFeet = 120 }
    ]
  , size = "gargantuan"
  , skillModifiers =
    [ { modifier = 10, skill = "insight" }
    , { modifier = 17, skill = "perception" }
    , { modifier = 7, skill = "stealth" }
    ]
  , speeds =
    [ { feet = { kind = "literal", value = 40 }, kind = "walk" }
    , { feet = { kind = "literal", value = 80 }, kind = "fly" }
    , { feet = { kind = "literal", value = 40 }, kind = "swim" }
    ]
  , traits =
    [ { description = "The dragon can breathe air and water."
      , name = "Amphibious"
      }
    , { description =
          "If the dragon fails a saving throw, it can choose to succeed instead."
      , name = "Legendary Resistance (4/Day, or 5/Day in Lair)"
      }
    ]
  }
}
