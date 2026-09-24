{ challengeRating = 10
, id = "stat_block_deva"
, kind = "statBlock"
, name = "Deva"
, provenance = { kind = "srd-5.2.1", section = "monsters-A-Z.md:4939-5027" }
, statBlock =
  { abilityScores =
    { cha = 20, con = 18, dex = 18, int = 17, str = 18, wis = 20 }
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
                  , resourceRefs :
                      { kind : Text, ordinals : Optional (List Natural) }
                  , spells :
                      List
                        { restriction :
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
        , spellSaveDc = None { dc : Natural, kind : Text }
        }
      , procedureOrdinal = 1
      , resourceRefs.kind = "none"
      }
    , { kind = "executable"
      , procedure =
        { ability = None Text
        , attackAbility = Some "str"
        , attackBonus = Some { kind = "literal", value = 8 }
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
                  , resourceRefs :
                      { kind : Text, ordinals : Optional (List Natural) }
                  , spells :
                      List
                        { restriction :
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
        , name = "Holy Mace"
        , onHit = Some
          [ { amount =
              { expr = { dice = 1, dieSize = 6, flat = Some 4 }
              , kind = "fixed"
              , static = 7
              }
            , damageType = "bludgeoning"
            , kind = "damage"
            }
          , { amount =
              { expr = { dice = 4, dieSize = 8, flat = None Natural }
              , kind = "fixed"
              , static = 18
              }
            , damageType = "radiant"
            , kind = "damage"
            }
          ]
        , reachFeet = Some 5
        , spellSaveDc = None { dc : Natural, kind : Text }
        }
      , procedureOrdinal = 2
      , resourceRefs.kind = "none"
      }
    , { kind = "executable"
      , procedure =
        { ability = Some "cha"
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
            , resourceRefs = { kind = "none", ordinals = None (List Natural) }
            , spells =
              [ { restriction =
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
                , spellId = "detect_evil_and_good"
                }
              , { restriction = Some
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
            , resourceRefs = { kind = "some", ordinals = Some [ 1 ] }
            , spells =
              [ { restriction =
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
                , spellId = "commune"
                }
              , { restriction =
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
                , spellId = "raise_dead"
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
        , spellSaveDc = Some { dc = 17, kind = "fixed" }
        }
      , procedureOrdinal = 3
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = { morality = "good", order = "lawful" }
  , bonusActions =
    [ { kind = "executable"
      , procedure =
        { ability = "cha"
        , groups =
          [ { kind = "limited"
            , resourceRefs = { kind = "some", ordinals = [ 2 ] }
            , spells =
              [ { spellId = "cure_wounds" }
              , { spellId = "lesser_restoration" }
              , { spellId = "remove_curse" }
              ]
            }
          ]
        , kind = "spellcasting"
        , name = "Divine Aid (2/Day)"
        }
      , procedureOrdinal = 1
      , resourceRefs.kind = "none"
      }
    ]
  , communication =
    { kind = "spoken_and_understood"
    , languages.kind = "all"
    , telepathy.rangeFeet = 120
    }
  , creatureType = "celestial"
  , creatureTypeTags = [ "angel" ]
  , hp = { kind = "literal", value = 229 }
  , immunities.conditions = [ "charmed", "exhaustion", "frightened" ]
  , initiative = { modifier = 4, score = 14 }
  , passivePerception = 19
  , resistances = { damageTypes = [ "radiant" ], kind = "fixed" }
  , resources =
    [ { limit = { kind = "daily", uses = 1 }, ordinal = 1, ownership = "each" }
    , { limit = { kind = "daily", uses = 2 }
      , ordinal = 2
      , ownership = "shared"
      }
    ]
  , savingThrowModifiers =
    [ { ability = "str", modifier = 4 }
    , { ability = "dex", modifier = 4 }
    , { ability = "con", modifier = 4 }
    , { ability = "int", modifier = 3 }
    , { ability = "wis", modifier = 9 }
    , { ability = "cha", modifier = 9 }
    ]
  , senses = [ { kind = "darkvision", rangeFeet = 120 } ]
  , size = "medium"
  , skillModifiers =
    [ { modifier = 9, skill = "insight" }
    , { modifier = 9, skill = "perception" }
    ]
  , speeds =
    [ { feet = { kind = "literal", value = 30 }
      , hover = None Bool
      , kind = "walk"
      }
    , { feet = { kind = "literal", value = 90 }
      , hover = Some True
      , kind = "fly"
      }
    ]
  , traits =
    [ { description =
          "If the deva dies outside Mount Celestia, its body disappears, and it gains a new body instantly, reviving with all its Hit Points somewhere in Mount Celestia."
      , name = "Exalted Restoration"
      }
    , { description =
          "The deva has Advantage on saving throws against spells and other magical effects."
      , name = "Magic Resistance"
      }
    ]
  }
}
