{ challengeRating = 7
, id = "stat_block_oni"
, kind = "statBlock"
, name = "Oni"
, provenance = { kind = "srd-5.2.1", section = "monsters-A-Z.md:12570-12658" }
, statBlock =
  { abilityScores =
    { cha = 15, con = 16, dex = 11, int = 14, str = 19, wis = 12 }
  , ac.value = { kind = "literal", value = 17 }
  , actions =
    [ { description = Some
          "The oni makes two Claw or Nightmare Ray attacks. It can replace one attack with a use of Spellcasting."
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
                      , resourceRefs : { kind : Text, ordinals : List Natural }
                      , spells :
                          List
                            { castAtLevel : Optional Natural, spellId : Text }
                      }
                  )
            , kind : Text
            , name : Text
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
        , attackBonus = Some { kind = "literal", value = 7 }
        , attackType = Some "melee"
        , components = None { m : Bool, s : Bool, v : Bool }
        , groups =
            None
              ( List
                  { kind : Text
                  , resourceRefs : { kind : Text, ordinals : List Natural }
                  , spells :
                      List { castAtLevel : Optional Natural, spellId : Text }
                  }
              )
        , kind = "attack_roll"
        , name = "Claw"
        , onHit = Some
          [ { amount =
              { expr = { dice = 1, dieSize = 12, flat = Some 4 }
              , kind = "fixed"
              , static = 10
              }
            , damageType = "slashing"
            , kind = "damage"
            }
          , { amount =
              { expr = { dice = 2, dieSize = 8, flat = None Natural }
              , kind = "fixed"
              , static = 9
              }
            , damageType = "necrotic"
            , kind = "damage"
            }
          ]
        , reachFeet = Some 10
        , spellSaveDc = None { dc : Natural, kind : Text }
        }
      , procedureOrdinal = 2
      , reason = None Text
      , resourceRefs.kind = "none"
      }
    , { description = Some
          "Ranged Attack Roll: +5, range 60 ft. Hit: 9 (2d6 + 2) Psychic damage, and the target has the Frightened condition until the start of the oni's next turn."
      , kind = "textOnly"
      , name = Some "Nightmare Ray"
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
                      , resourceRefs : { kind : Text, ordinals : List Natural }
                      , spells :
                          List
                            { castAtLevel : Optional Natural, spellId : Text }
                      }
                  )
            , kind : Text
            , name : Text
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
            , reachFeet : Optional Natural
            , spellSaveDc : Optional { dc : Natural, kind : Text }
            }
      , procedureOrdinal = 3
      , reason = Some "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    , { description = Some
          "The oni shape-shifts into a Small or Medium Humanoid or a Large Giant, or it returns to its true form. Other than its size, its game statistics are the same in each form. Any equipment it is wearing or carrying isn't transformed."
      , kind = "textOnly"
      , name = Some "Shape-Shift"
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
                      , resourceRefs : { kind : Text, ordinals : List Natural }
                      , spells :
                          List
                            { castAtLevel : Optional Natural, spellId : Text }
                      }
                  )
            , kind : Text
            , name : Text
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
          [ { kind = "limited"
            , resourceRefs = { kind = "some", ordinals = [ 1 ] }
            , spells =
              [ { castAtLevel = Some 2, spellId = "charm_person" }
              , { castAtLevel = None Natural, spellId = "darkness" }
              , { castAtLevel = None Natural, spellId = "gaseous_form" }
              , { castAtLevel = None Natural, spellId = "sleep" }
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
        , spellSaveDc = Some { dc = 13, kind = "fixed" }
        }
      , procedureOrdinal = 5
      , reason = None Text
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = { morality = "evil", order = "lawful" }
  , bonusActions =
    [ { kind = "executable"
      , procedure =
        { ability = "cha"
        , components = { m = False, s = False, v = False }
        , groups =
          [ { kind = "at_will"
            , resourceRefs.kind = "none"
            , spells =
              [ { restriction =
                  { authoredExpression = "on itself"
                  , deltas = [ { kind = "target_limit", target = "self" } ]
                  }
                , spellId = "invisibility"
                }
              ]
            }
          ]
        , kind = "spellcasting"
        , name = "Invisibility"
        }
      , procedureOrdinal = 1
      , resourceRefs.kind = "none"
      }
    ]
  , communication =
    { kind = "spoken_and_understood"
    , languages = { kind = "named", languages = [ "Common", "Giant" ] }
    }
  , creatureType = "fiend"
  , hp = { kind = "literal", value = 119 }
  , initiative = { modifier = 0, score = 10 }
  , passivePerception = 14
  , resistances = { damageTypes = [ "cold" ], kind = "fixed" }
  , resources =
    [ { limit = { kind = "daily", uses = 1 }, ordinal = 1, ownership = "each" }
    ]
  , savingThrowModifiers =
    [ { ability = "str", modifier = 4 }
    , { ability = "dex", modifier = 3 }
    , { ability = "con", modifier = 6 }
    , { ability = "int", modifier = 2 }
    , { ability = "wis", modifier = 4 }
    , { ability = "cha", modifier = 5 }
    ]
  , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
  , size = "large"
  , skillModifiers =
    [ { modifier = 5, skill = "arcana" }
    , { modifier = 8, skill = "deception" }
    , { modifier = 4, skill = "perception" }
    ]
  , speeds =
    [ { feet = { kind = "literal", value = 30 }
      , hover = None Bool
      , kind = "walk"
      }
    , { feet = { kind = "literal", value = 30 }
      , hover = Some True
      , kind = "fly"
      }
    ]
  , traits =
    [ { description =
          "The oni regains 10 Hit Points at the start of each of its turns if it has at least 1 Hit Point."
      , name = "Regeneration"
      }
    ]
  }
}
