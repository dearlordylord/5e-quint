{ challengeRating = 11
, id = "stat_block_djinni"
, kind = "statBlock"
, name = "Djinni"
, provenance = { kind = "srd-5.2.1", section = "monsters-A-Z.md:5031-5119" }
, statBlock =
  { abilityScores =
    { cha = 20, con = 22, dex = 15, int = 15, str = 21, wis = 16 }
  , ac.value = { kind = "literal", value = 17 }
  , actions =
    [ { description = Some
          "The djinni makes three attacks, using Storm Blade or Storm Bolt in any combination."
      , kind = "textOnly"
      , name = Some "Multiattack"
      , procedure =
          None
            { ability : Optional Text
            , attackAbility : Optional Text
            , attackBonus : Optional { kind : Text, value : Natural }
            , attackType : Optional Text
            , components : Optional { m : Bool, s : Bool, v : Bool }
            , groups :
                Optional
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
                                        { kind : Text
                                        , replaces : Text
                                        , substitute : Text
                                        }
                                  }
                            , spellId : Text
                            }
                      }
                  )
            , kind : Text
            , name : Text
            , onHit :
                Optional
                  ( List
                      { amount :
                          Optional
                            { expr :
                                { dice : Natural
                                , dieSize : Natural
                                , flat : Optional Natural
                                }
                            , kind : Text
                            , static : Natural
                            }
                      , condition : Optional Text
                      , damageType : Optional Text
                      , kind : Text
                      , maxCreatureSize : Optional Text
                      }
                  )
            , rangeFeet : Optional { long : Natural, normal : Natural }
            , reachFeet : Optional Natural
            , spellSaveDc : Optional { dc : Natural, kind : Text }
            }
      , procedureOrdinal = 1
      , reason = Some "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { ability = None Text
        , attackAbility = Some "str"
        , attackBonus = Some { kind = "literal", value = 9 }
        , attackType = Some "melee"
        , components = None { m : Bool, s : Bool, v : Bool }
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
                                    { kind : Text
                                    , replaces : Text
                                    , substitute : Text
                                    }
                              }
                        , spellId : Text
                        }
                  }
              )
        , kind = "attack_roll"
        , name = "Storm Blade"
        , onHit = Some
          [ { amount = Some
              { expr = { dice = 2, dieSize = 6, flat = Some 5 }
              , kind = "fixed"
              , static = 12
              }
            , condition = None Text
            , damageType = Some "slashing"
            , kind = "damage"
            , maxCreatureSize = None Text
            }
          , { amount = Some
              { expr = { dice = 2, dieSize = 6, flat = None Natural }
              , kind = "fixed"
              , static = 7
              }
            , condition = None Text
            , damageType = Some "lightning"
            , kind = "damage"
            , maxCreatureSize = None Text
            }
          ]
        , rangeFeet = None { long : Natural, normal : Natural }
        , reachFeet = Some 5
        , spellSaveDc = None { dc : Natural, kind : Text }
        }
      , procedureOrdinal = 2
      , reason = None Text
      , resourceRefs.kind = "none"
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { ability = None Text
        , attackAbility = Some "str"
        , attackBonus = Some { kind = "literal", value = 9 }
        , attackType = Some "ranged"
        , components = None { m : Bool, s : Bool, v : Bool }
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
                                    { kind : Text
                                    , replaces : Text
                                    , substitute : Text
                                    }
                              }
                        , spellId : Text
                        }
                  }
              )
        , kind = "attack_roll"
        , name = "Storm Bolt"
        , onHit = Some
          [ { amount = Some
              { expr = { dice = 3, dieSize = 8, flat = None Natural }
              , kind = "fixed"
              , static = 13
              }
            , condition = None Text
            , damageType = Some "thunder"
            , kind = "damage"
            , maxCreatureSize = None Text
            }
          , { amount =
                None
                  { expr :
                      { dice : Natural
                      , dieSize : Natural
                      , flat : Optional Natural
                      }
                  , kind : Text
                  , static : Natural
                  }
            , condition = Some "prone"
            , damageType = None Text
            , kind = "apply_condition_if_target_size_at_most"
            , maxCreatureSize = Some "large"
            }
          ]
        , rangeFeet = Some { long = 120, normal = 120 }
        , reachFeet = None Natural
        , spellSaveDc = None { dc : Natural, kind : Text }
        }
      , procedureOrdinal = 3
      , reason = None Text
      , resourceRefs.kind = "none"
      }
    , { description = Some
          "The djinni conjures a whirlwind at a point it can see within 120 feet. The whirlwind fills a 20-foot-radius, 60-foot-high Cylinder centered on that point. The whirlwind lasts until the djinni's Concentration on it ends. The djinni can move the whirlwind up to 20 feet at the start of each of its turns. Whenever the whirlwind enters a creature's space or a creature enters the whirlwind, that creature is subjected to the following effect. Strength Saving Throw: DC 17 (a creature makes this save only once per turn, and the djinni is unaffected). Failure: While in the whirlwind, the target has the Restrained condition and moves with the whirlwind. At the start of each of its turns, the Restrained target takes 21 (6d6) Thunder damage. At the end of each of its turns, the target repeats the save, ending the effect on itself on a success."
      , kind = "textOnly"
      , name = Some "Create Whirlwind"
      , procedure =
          None
            { ability : Optional Text
            , attackAbility : Optional Text
            , attackBonus : Optional { kind : Text, value : Natural }
            , attackType : Optional Text
            , components : Optional { m : Bool, s : Bool, v : Bool }
            , groups :
                Optional
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
                                        { kind : Text
                                        , replaces : Text
                                        , substitute : Text
                                        }
                                  }
                            , spellId : Text
                            }
                      }
                  )
            , kind : Text
            , name : Text
            , onHit :
                Optional
                  ( List
                      { amount :
                          Optional
                            { expr :
                                { dice : Natural
                                , dieSize : Natural
                                , flat : Optional Natural
                                }
                            , kind : Text
                            , static : Natural
                            }
                      , condition : Optional Text
                      , damageType : Optional Text
                      , kind : Text
                      , maxCreatureSize : Optional Text
                      }
                  )
            , rangeFeet : Optional { long : Natural, normal : Natural }
            , reachFeet : Optional Natural
            , spellSaveDc : Optional { dc : Natural, kind : Text }
            }
      , procedureOrdinal = 4
      , reason = Some "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { ability = Some "cha"
        , attackAbility = None Text
        , attackBonus = None { kind : Text, value : Natural }
        , attackType = None Text
        , components = Some { m = False, s = True, v = True }
        , groups = Some
          [ { kind = "at_will"
            , resourceRefs = { kind = "none", ordinals = None (List Natural) }
            , spells =
              [ { restriction =
                    None
                      { authoredExpression : Text
                      , deltas :
                          List
                            { kind : Text, replaces : Text, substitute : Text }
                      }
                , spellId = "detect_evil_and_good"
                }
              , { restriction =
                    None
                      { authoredExpression : Text
                      , deltas :
                          List
                            { kind : Text, replaces : Text, substitute : Text }
                      }
                , spellId = "detect_magic"
                }
              ]
            }
          , { kind = "limited"
            , resourceRefs = { kind = "some", ordinals = Some [ 1 ] }
            , spells =
              [ { restriction = Some
                  { authoredExpression = "can create wine instead of water"
                  , deltas =
                    [ { kind = "created_substance_substitution"
                      , replaces = "water"
                      , substitute = "wine"
                      }
                    ]
                  }
                , spellId = "create_food_and_water"
                }
              , { restriction =
                    None
                      { authoredExpression : Text
                      , deltas :
                          List
                            { kind : Text, replaces : Text, substitute : Text }
                      }
                , spellId = "tongues"
                }
              , { restriction =
                    None
                      { authoredExpression : Text
                      , deltas :
                          List
                            { kind : Text, replaces : Text, substitute : Text }
                      }
                , spellId = "wind_walk"
                }
              ]
            }
          , { kind = "limited"
            , resourceRefs = { kind = "some", ordinals = Some [ 2 ] }
            , spells =
              [ { restriction =
                    None
                      { authoredExpression : Text
                      , deltas :
                          List
                            { kind : Text, replaces : Text, substitute : Text }
                      }
                , spellId = "creation"
                }
              , { restriction =
                    None
                      { authoredExpression : Text
                      , deltas :
                          List
                            { kind : Text, replaces : Text, substitute : Text }
                      }
                , spellId = "gaseous_form"
                }
              , { restriction =
                    None
                      { authoredExpression : Text
                      , deltas :
                          List
                            { kind : Text, replaces : Text, substitute : Text }
                      }
                , spellId = "invisibility"
                }
              , { restriction =
                    None
                      { authoredExpression : Text
                      , deltas :
                          List
                            { kind : Text, replaces : Text, substitute : Text }
                      }
                , spellId = "major_image"
                }
              , { restriction =
                    None
                      { authoredExpression : Text
                      , deltas :
                          List
                            { kind : Text, replaces : Text, substitute : Text }
                      }
                , spellId = "plane_shift"
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
                      Optional
                        { expr :
                            { dice : Natural
                            , dieSize : Natural
                            , flat : Optional Natural
                            }
                        , kind : Text
                        , static : Natural
                        }
                  , condition : Optional Text
                  , damageType : Optional Text
                  , kind : Text
                  , maxCreatureSize : Optional Text
                  }
              )
        , rangeFeet = None { long : Natural, normal : Natural }
        , reachFeet = None Natural
        , spellSaveDc = Some { dc = 17, kind = "fixed" }
        }
      , procedureOrdinal = 5
      , reason = None Text
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = { morality = "neutral", order = "neutral" }
  , communication =
    { kind = "spoken_and_understood"
    , languages = { kind = "named", languages = [ "Primordial (Auran)" ] }
    }
  , creatureType = "elemental"
  , creatureTypeTags = [ "genie" ]
  , hp = { kind = "literal", value = 218 }
  , immunities.damageTypes = [ "lightning", "thunder" ]
  , initiative = { modifier = 2, score = 12 }
  , passivePerception = 13
  , resources =
    [ { limit = { kind = "daily", uses = 2 }, ordinal = 1, ownership = "each" }
    , { limit = { kind = "daily", uses = 1 }, ordinal = 2, ownership = "each" }
    ]
  , savingThrowModifiers =
    [ { ability = "str", modifier = 5 }
    , { ability = "dex", modifier = 6 }
    , { ability = "con", modifier = 6 }
    , { ability = "int", modifier = 2 }
    , { ability = "wis", modifier = 7 }
    , { ability = "cha", modifier = 5 }
    ]
  , senses = [ { kind = "darkvision", rangeFeet = 120 } ]
  , size = "large"
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
          "If the djinni dies outside the Elemental Plane of Air, its body dissolves into mist, and it gains a new body in 1d4 days, reviving with all its Hit Points somewhere on the Plane of Air."
      , name = "Elemental Restoration"
      }
    , { description =
          "The djinni has Advantage on saving throws against spells and other magical effects."
      , name = "Magic Resistance"
      }
    , { description =
          "The djinni has a 30 percent chance of knowing the Wish spell. If the djinni knows it, the djinni can cast it only on behalf of a non-genie creature who communicates a wish in a way the djinni can understand. If the djinni casts the spell for the creature, the djinni suffers none of the spell's stress. Once the djinni has cast it three times, the djinni can't do so again for 365 days."
      , name = "Wishes"
      }
    ]
  }
}
