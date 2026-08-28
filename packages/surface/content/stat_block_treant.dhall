{ challengeRating = 9
, id = "stat_block_treant"
, kind = "statBlock"
, name = "Treant"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-T-Z.md:282-314" }
, statBlock =
  { abilityScores =
    { cha = 12, con = 21, dex = 8, int = 12, str = 23, wis = 16 }
  , ac.value = { kind = "literal", value = 16 }
  , actions =
    [ { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { attackAbility = None Text
        , attackBonus = None { kind : Text, value : Natural }
        , attackType = None Text
        , dispatches = Some
          [ { count = { kind = "literal", value = 2 }, procedureOrdinal = 2 } ]
        , kind = "multiattack"
        , name = "Multiattack"
        , onHit =
            None
              ( List
                  { amount :
                      { expr :
                          { dice : Natural, dieSize : Natural, flat : Natural }
                      , kind : Text
                      , static : Natural
                      }
                  , damageType : Text
                  , kind : Text
                  }
              )
        , rangeFeet = None { long : Natural, normal : Natural }
        , reachFeet = None Natural
        }
      , procedureOrdinal = 1
      , reason = None Text
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { attackAbility = Some "str"
        , attackBonus = Some { kind = "literal", value = 10 }
        , attackType = Some "melee"
        , dispatches =
            None
              ( List
                  { count : { kind : Text, value : Natural }
                  , procedureOrdinal : Natural
                  }
              )
        , kind = "attack_roll"
        , name = "Slam"
        , onHit = Some
          [ { amount =
              { expr = { dice = 3, dieSize = 6, flat = 6 }
              , kind = "fixed"
              , static = 16
              }
            , damageType = "bludgeoning"
            , kind = "damage"
            }
          ]
        , rangeFeet = None { long : Natural, normal : Natural }
        , reachFeet = Some 5
        }
      , procedureOrdinal = 2
      , reason = None Text
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { attackAbility = Some "str"
        , attackBonus = Some { kind = "literal", value = 10 }
        , attackType = Some "ranged"
        , dispatches =
            None
              ( List
                  { count : { kind : Text, value : Natural }
                  , procedureOrdinal : Natural
                  }
              )
        , kind = "attack_roll"
        , name = "Hail of Bark"
        , onHit = Some
          [ { amount =
              { expr = { dice = 4, dieSize = 10, flat = 6 }
              , kind = "fixed"
              , static = 28
              }
            , damageType = "piercing"
            , kind = "damage"
            }
          ]
        , rangeFeet = Some { long = 180, normal = 180 }
        , reachFeet = None Natural
        }
      , procedureOrdinal = 3
      , reason = None Text
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    , { description = Some
          "The treant magically animates up to two trees it can see within 60 feet of itself. Each tree uses the Treant stat block, except it has Intelligence and Charisma scores of 1, it can't speak, and it lacks this action. The tree takes its action immediately after the treant on the same Initiative count, and it obeys the treant. A tree remains animate for 1 day or until it dies, the treant dies, or it is more than 120 feet from the treant. The tree then takes root if possible."
      , kind = "textOnly"
      , name = Some "Animate Trees"
      , procedure =
          None
            { attackAbility : Optional Text
            , attackBonus : Optional { kind : Text, value : Natural }
            , attackType : Optional Text
            , dispatches :
                Optional
                  ( List
                      { count : { kind : Text, value : Natural }
                      , procedureOrdinal : Natural
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
                              , flat : Natural
                              }
                          , kind : Text
                          , static : Natural
                          }
                      , damageType : Text
                      , kind : Text
                      }
                  )
            , rangeFeet : Optional { long : Natural, normal : Natural }
            , reachFeet : Optional Natural
            }
      , procedureOrdinal = 4
      , reason = Some "unsupported_action_shape"
      , resourceRefs = { kind = "some", ordinals = Some [ 1 ] }
      }
    ]
  , alignment = { morality = "good", order = "chaotic" }
  , communication =
    { kind = "spoken_and_understood"
    , languages =
      { kind = "named"
      , languages = [ "Common", "Druidic", "Elvish", "Sylvan" ]
      }
    }
  , creatureType = "plant"
  , hp = { kind = "literal", value = 138 }
  , initiative = { modifier = 3, score = 13 }
  , passivePerception = 13
  , resistances =
    { damageTypes = [ "bludgeoning", "piercing" ], kind = "fixed" }
  , resources =
    [ { limit = { kind = "daily", uses = 1 }
      , ordinal = 1
      , ownership = "shared"
      }
    ]
  , savingThrowModifiers =
    [ { ability = "cha", modifier = +1 }
    , { ability = "con", modifier = +5 }
    , { ability = "dex", modifier = -1 }
    , { ability = "int", modifier = +1 }
    , { ability = "str", modifier = +6 }
    , { ability = "wis", modifier = +3 }
    ]
  , size = "huge"
  , speeds = [ { feet = { kind = "literal", value = 30 }, kind = "walk" } ]
  , traits =
    [ { description =
          "The treant deals double damage to objects and structures."
      , name = "Siege Monster"
      }
    ]
  , vulnerabilities = { damageTypes = [ "fire" ], kind = "fixed" }
  }
}
