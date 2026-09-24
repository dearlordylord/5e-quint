{ challengeRating = 17
, id = "stat_block_adult_gold_dragon"
, kind = "statBlock"
, name = "Adult Gold Dragon"
, provenance = { kind = "srd-5.2.1", section = "monsters-A-Z.md:7653-7750" }
, statBlock =
  { abilityScores =
    { cha = 24, con = 25, dex = 14, int = 16, str = 27, wis = 15 }
  , ac.value = { kind = "literal", value = 19 }
  , actions =
    [ { description = Some
          "The dragon makes three Rend attacks. It can replace one attack with a use of (A) Spellcasting to cast Guiding Bolt (level 2 version) or (B) Weakening Breath."
      , kind = "textOnly"
      , name = Some "Multiattack"
      , procedure =
          None
            { ability : Optional Text
            , area : Optional { kind : Text, lengthFeet : Natural }
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
        , area = None { kind : Text, lengthFeet : Natural }
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
              { expr = { dice = 2, dieSize = 8, flat = Some 8 }
              , kind = "fixed"
              , static = 17
              }
            , damageType = "slashing"
            , kind = "damage"
            }
          , { amount =
              { expr = { dice = 1, dieSize = 8, flat = None Natural }
              , kind = "fixed"
              , static = 4
              }
            , damageType = "fire"
            , kind = "damage"
            }
          ]
        , onSuccess = None { kind : Text }
        , reachFeet = Some 10
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
        , area = Some { kind = "cone", lengthFeet = 60 }
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
        , name = "Fire Breath (Recharge 5–6)"
        , onFail = Some
          { amount =
            { expr = { dice = 12, dieSize = 10 }, kind = "fixed", static = 66 }
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
        , spellAttackBonus = None { kind : Text, value : Natural }
        , spellSaveDc = None { dc : Natural, kind : Text }
        }
      , procedureOrdinal = 3
      , reason = None Text
      , resourceRefs = { kind = "some", ordinals = Some [ 1 ] }
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { ability = Some "cha"
        , area = None { kind : Text, lengthFeet : Natural }
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
                , spellId = "flame_strike"
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
                , spellId = "zone_of_truth"
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
        , spellAttackBonus = Some { kind = "literal", value = 13 }
        , spellSaveDc = Some { dc = 21, kind = "fixed" }
        }
      , procedureOrdinal = 4
      , reason = None Text
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    , { description = Some
          "Strength Saving Throw: DC 21, each creature that isn't currently affected by this breath in a 60-foot Cone. Failure: The target has Disadvantage on Strength-based D20 Tests and subtracts 3 (1d6) from its damage rolls. It repeats the save at the end of each of its turns, ending the effect on itself on a success. After 1 minute, it succeeds automatically."
      , kind = "textOnly"
      , name = Some "Weakening Breath"
      , procedure =
          None
            { ability : Optional Text
            , area : Optional { kind : Text, lengthFeet : Natural }
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
      , procedureOrdinal = 5
      , reason = Some "unsupported_action_shape"
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
  , hp = { kind = "literal", value = 243 }
  , immunities.damageTypes = [ "fire" ]
  , initiative = { modifier = 14, score = 24 }
  , legendaryActions =
    { entries =
      [ { description =
            "Charisma Saving Throw: DC 21, one creature the dragon can see within 120 feet. Failure: 10 (3d6) Force damage, and the target has the Incapacitated condition and is transported to a harmless demiplane until the start of the dragon's next turn, at which point it reappears in an unoccupied space of the dragon's choice within 120 feet of the dragon. Failure or Success: The dragon can't take this action again until the start of its next turn."
        , kind = "textOnly"
        , name = "Banish"
        , procedureOrdinal = 1
        , reason = "unsupported_action_shape"
        , resourceRefs.kind = "none"
        }
      , { description =
            "The dragon uses Spellcasting to cast Guiding Bolt (level 2 version)."
        , kind = "textOnly"
        , name = "Guiding Light"
        , procedureOrdinal = 2
        , reason = "unsupported_action_shape"
        , resourceRefs.kind = "none"
        }
      , { description =
            "The dragon moves up to half its Speed, and it makes one Rend attack."
        , kind = "textOnly"
        , name = "Pounce"
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
    , { ability = "dex", modifier = 8 }
    , { ability = "con", modifier = 7 }
    , { ability = "int", modifier = 3 }
    , { ability = "wis", modifier = 8 }
    , { ability = "cha", modifier = 7 }
    ]
  , senses =
    [ { kind = "blindsight", rangeFeet = 60 }
    , { kind = "darkvision", rangeFeet = 120 }
    ]
  , size = "huge"
  , skillModifiers =
    [ { modifier = 8, skill = "insight" }
    , { modifier = 14, skill = "perception" }
    , { modifier = 13, skill = "persuasion" }
    , { modifier = 8, skill = "stealth" }
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
      , name = "Legendary Resistance (3/Day, or 4/Day in Lair)"
      }
    ]
  }
}
