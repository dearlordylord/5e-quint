{ challengeRating = 9
, id = "stat_block_young_silver_dragon"
, kind = "statBlock"
, name = "Young Silver Dragon"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-P-S.md:1022-1048" }
, statBlock =
  { abilityScores =
    { cha = 19, con = 21, dex = 10, int = 14, str = 23, wis = 11 }
  , ac.value = { kind = "literal", value = 18 }
  , actions =
    [ { description = Some
          "The dragon makes three Rend attacks. It can replace one attack with a use of Paralyzing Breath."
      , kind = "textOnly"
      , name = Some "Multiattack"
      , procedure =
          None
            { ability : Optional Text
            , area : Optional { kind : Text, lengthFeet : Natural }
            , attackAbility : Optional Text
            , attackBonus : Optional { kind : Text, value : Natural }
            , attackType : Optional Text
            , dc : Optional { dc : Natural, kind : Text }
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
                              , flat : Natural
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
        , attackBonus = Some { kind = "literal", value = 10 }
        , attackType = Some "melee"
        , dc = None { dc : Natural, kind : Text }
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
              { expr = { dice = 2, dieSize = 8, flat = 6 }
              , kind = "fixed"
              , static = 15
              }
            , damageType = "slashing"
            , kind = "damage"
            }
          ]
        , onSuccess = None { kind : Text }
        , reachFeet = Some 10
        }
      , procedureOrdinal = 2
      , reason = None Text
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { ability = Some "con"
        , area = Some { kind = "cone", lengthFeet = 30 }
        , attackAbility = None Text
        , attackBonus = None { kind : Text, value : Natural }
        , attackType = None Text
        , dc = Some { dc = 17, kind = "fixed" }
        , kind = "save"
        , name = "Cold Breath"
        , onFail = Some
          { amount =
            { expr = { dice = 11, dieSize = 8 }, kind = "fixed", static = 49 }
          , damageType = "cold"
          , kind = "damage"
          }
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
        , onSuccess = Some { kind = "half_damage" }
        , reachFeet = None Natural
        }
      , procedureOrdinal = 3
      , reason = None Text
      , resourceRefs = { kind = "some", ordinals = Some [ 1 ] }
      }
    , { description = Some
          "Constitution Saving Throw: DC 17, each creature in a 30-foot Cone. First Failure: The target has the Incapacitated condition until the end of its next turn, when it repeats the save. Second Failure: The target has the Paralyzed condition, and it repeats the save at the end of each of its turns, ending the effect on itself on a success. After 1 minute, it succeeds automatically."
      , kind = "textOnly"
      , name = Some "Paralyzing Breath"
      , procedure =
          None
            { ability : Optional Text
            , area : Optional { kind : Text, lengthFeet : Natural }
            , attackAbility : Optional Text
            , attackBonus : Optional { kind : Text, value : Natural }
            , attackType : Optional Text
            , dc : Optional { dc : Natural, kind : Text }
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
                              , flat : Natural
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
            }
      , procedureOrdinal = 4
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
  , hp = { kind = "literal", value = 168 }
  , immunities.damageTypes = [ "cold" ]
  , initiative = { modifier = 4, score = 14 }
  , passivePerception = 18
  , resources =
    [ { limit = { kind = "recharge", minimumRoll = 5 }
      , ordinal = 1
      , ownership = "shared"
      }
    ]
  , savingThrowModifiers =
    [ { ability = "cha", modifier = 4 }
    , { ability = "con", modifier = 5 }
    , { ability = "dex", modifier = 4 }
    , { ability = "int", modifier = 2 }
    , { ability = "str", modifier = 6 }
    , { ability = "wis", modifier = 4 }
    ]
  , senses =
    [ { kind = "blindsight", rangeFeet = 30 }
    , { kind = "darkvision", rangeFeet = 120 }
    ]
  , size = "large"
  , skillModifiers =
    [ { modifier = 6, skill = "history" }
    , { modifier = 8, skill = "perception" }
    , { modifier = 4, skill = "stealth" }
    ]
  , speeds =
    [ { feet = { kind = "literal", value = 40 }, kind = "walk" }
    , { feet = { kind = "literal", value = 80 }, kind = "fly" }
    ]
  }
}
