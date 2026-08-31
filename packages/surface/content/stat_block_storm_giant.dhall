{ challengeRating = 13
, id = "stat_block_storm_giant"
, kind = "statBlock"
, name = "Storm Giant"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-P-S.md:1635-1671" }
, statBlock =
  { abilityScores =
    { cha = 18, con = 20, dex = 14, int = 16, str = 29, wis = 20 }
  , ac.value = { kind = "literal", value = 16 }
  , actions =
    [ { description = Some
          "The giant makes two attacks, using Storm Sword or Thunderbolt in any combination."
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
                      , spells : List { spellId : Text }
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
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { ability = None Text
        , attackAbility = Some "str"
        , attackBonus = Some { kind = "literal", value = 14 }
        , attackType = Some "melee"
        , components = None { m : Bool, s : Bool, v : Bool }
        , groups =
            None
              ( List
                  { kind : Text
                  , resourceRefs :
                      { kind : Text, ordinals : Optional (List Natural) }
                  , spells : List { spellId : Text }
                  }
              )
        , kind = "attack_roll"
        , name = "Storm Sword"
        , onHit = Some
          [ { amount =
              { expr = { dice = 4, dieSize = 6, flat = Some 9 }
              , kind = "fixed"
              , static = 23
              }
            , damageType = "slashing"
            , kind = "damage"
            }
          , { amount =
              { expr = { dice = 3, dieSize = 8, flat = None Natural }
              , kind = "fixed"
              , static = 13
              }
            , damageType = "lightning"
            , kind = "damage"
            }
          ]
        , reachFeet = Some 10
        , spellSaveDc = None { dc : Natural, kind : Text }
        }
      , procedureOrdinal = 2
      , reason = None Text
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    , { description = Some
          "Ranged Attack Roll: +14, range 500 ft. Hit: 22 (2d12 + 9) Lightning damage, and the target has the Blinded and Deafened conditions until the start of the giant's next turn."
      , kind = "textOnly"
      , name = Some "Thunderbolt"
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
                      , spells : List { spellId : Text }
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
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    , { description = Some
          "Dexterity Saving Throw: DC 18, each creature in a 10-foot-radius, 40-foot-high Cylinder originating from a point the giant can see within 500 feet. Failure: 55 (10d10) Lightning damage. Success: Half damage."
      , kind = "textOnly"
      , name = Some "Lightning Storm"
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
                      , spells : List { spellId : Text }
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
      , resourceRefs = { kind = "some", ordinals = Some [ 1 ] }
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { ability = Some "wis"
        , attackAbility = None Text
        , attackBonus = None { kind : Text, value : Natural }
        , attackType = None Text
        , components = Some { m = False, s = True, v = True }
        , groups = Some
          [ { kind = "at_will"
            , resourceRefs = { kind = "none", ordinals = None (List Natural) }
            , spells = [ { spellId = "detect_magic" }, { spellId = "light" } ]
            }
          , { kind = "limited"
            , resourceRefs = { kind = "some", ordinals = Some [ 2 ] }
            , spells = [ { spellId = "control_weather" } ]
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
        , spellSaveDc = Some { dc = 18, kind = "fixed" }
        }
      , procedureOrdinal = 5
      , reason = None Text
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    ]
  , alignment = { morality = "good", order = "chaotic" }
  , communication =
    { kind = "spoken_and_understood"
    , languages = { kind = "named", languages = [ "Common", "Giant" ] }
    }
  , creatureType = "giant"
  , hp = { kind = "literal", value = 230 }
  , immunities.damageTypes = [ "lightning", "thunder" ]
  , initiative = { modifier = 7, score = 17 }
  , passivePerception = 20
  , resistances = { damageTypes = [ "cold" ], kind = "fixed" }
  , resources =
    [ { limit = { kind = "recharge", minimumRoll = Some 5, uses = None Natural }
      , ordinal = 1
      , ownership = "shared"
      }
    , { limit = { kind = "daily", minimumRoll = None Natural, uses = Some 1 }
      , ordinal = 2
      , ownership = "shared"
      }
    ]
  , savingThrowModifiers =
    [ { ability = "cha", modifier = 9 }
    , { ability = "con", modifier = 10 }
    , { ability = "dex", modifier = 2 }
    , { ability = "int", modifier = 3 }
    , { ability = "str", modifier = 14 }
    , { ability = "wis", modifier = 10 }
    ]
  , senses =
    [ { kind = "darkvision", rangeFeet = 120 }
    , { kind = "truesight", rangeFeet = 30 }
    ]
  , size = "huge"
  , skillModifiers =
    [ { modifier = 8, skill = "arcana" }
    , { modifier = 14, skill = "athletics" }
    , { modifier = 8, skill = "history" }
    , { modifier = 10, skill = "perception" }
    ]
  , speeds =
    [ { feet = { kind = "literal", value = 50 }
      , hover = None Bool
      , kind = "walk"
      }
    , { feet = { kind = "literal", value = 25 }
      , hover = Some True
      , kind = "fly"
      }
    , { feet = { kind = "literal", value = 50 }
      , hover = None Bool
      , kind = "swim"
      }
    ]
  , traits =
    [ { description = "The giant can breathe air and water."
      , name = "Amphibious"
      }
    ]
  }
}
