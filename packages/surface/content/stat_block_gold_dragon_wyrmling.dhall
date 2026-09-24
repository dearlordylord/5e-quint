{ challengeRating = 3
, id = "stat_block_gold_dragon_wyrmling"
, kind = "statBlock"
, name = "Gold Dragon Wyrmling"
, provenance = { kind = "srd-5.2.1", section = "monsters-A-Z.md:7491-7570" }
, statBlock =
  { abilityScores =
    { cha = 16, con = 17, dex = 14, int = 14, str = 19, wis = 11 }
  , ac.value = { kind = "literal", value = 17 }
  , actions =
    [ { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { ability = None Text
        , area = None { kind : Text, lengthFeet : Natural }
        , attackAbility = None Text
        , attackBonus = None { kind : Text, value : Natural }
        , attackType = None Text
        , dc = None { dc : Natural, kind : Text }
        , dispatches = Some
          [ { count = { kind = "literal", value = 2 }, procedureOrdinal = 2 } ]
        , kind = "multiattack"
        , name = "Multiattack"
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
                          { dice : Natural, dieSize : Natural, flat : Natural }
                      , kind : Text
                      , static : Natural
                      }
                  , damageType : Text
                  , kind : Text
                  }
              )
        , onSuccess = None { kind : Text }
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
        { ability = None Text
        , area = None { kind : Text, lengthFeet : Natural }
        , attackAbility = Some "str"
        , attackBonus = Some { kind = "literal", value = 6 }
        , attackType = Some "melee"
        , dc = None { dc : Natural, kind : Text }
        , dispatches =
            None
              ( List
                  { count : { kind : Text, value : Natural }
                  , procedureOrdinal : Natural
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
              { expr = { dice = 1, dieSize = 10, flat = 4 }
              , kind = "fixed"
              , static = 9
              }
            , damageType = "slashing"
            , kind = "damage"
            }
          ]
        , onSuccess = None { kind : Text }
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
        { ability = Some "dex"
        , area = Some { kind = "cone", lengthFeet = 15 }
        , attackAbility = None Text
        , attackBonus = None { kind : Text, value : Natural }
        , attackType = None Text
        , dc = Some { dc = 13, kind = "fixed" }
        , dispatches =
            None
              ( List
                  { count : { kind : Text, value : Natural }
                  , procedureOrdinal : Natural
                  }
              )
        , kind = "save"
        , name = "Fire Breath (Recharge 5–6)"
        , onFail = Some
          { amount =
            { expr = { dice = 4, dieSize = 10 }, kind = "fixed", static = 22 }
          , damageType = "fire"
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
          "Strength Saving Throw: DC 13, each creature that isn't currently affected by this breath in a 15-foot Cone. Failure: The target has Disadvantage on Strength-based D20 Tests and subtracts 2 (1d4) from its damage rolls. It repeats the save at the end of each of its turns, ending the effect on itself on a success. After 1 minute, it succeeds automatically."
      , kind = "textOnly"
      , name = Some "Weakening Breath"
      , procedure =
          None
            { ability : Optional Text
            , area : Optional { kind : Text, lengthFeet : Natural }
            , attackAbility : Optional Text
            , attackBonus : Optional { kind : Text, value : Natural }
            , attackType : Optional Text
            , dc : Optional { dc : Natural, kind : Text }
            , dispatches :
                Optional
                  ( List
                      { count : { kind : Text, value : Natural }
                      , procedureOrdinal : Natural
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
    , languages = { kind = "named", languages = [ "Draconic" ] }
    }
  , creatureType = "dragon"
  , creatureTypeTags = [ "metallic" ]
  , hp = { kind = "literal", value = 60 }
  , immunities.damageTypes = [ "fire" ]
  , initiative = { modifier = 4, score = 14 }
  , passivePerception = 14
  , resources =
    [ { limit = { kind = "recharge", minimumRoll = 5 }
      , ordinal = 1
      , ownership = "shared"
      }
    ]
  , savingThrowModifiers =
    [ { ability = "str", modifier = 4 }
    , { ability = "dex", modifier = 4 }
    , { ability = "con", modifier = 3 }
    , { ability = "int", modifier = 2 }
    , { ability = "wis", modifier = 2 }
    , { ability = "cha", modifier = 3 }
    ]
  , senses =
    [ { kind = "blindsight", rangeFeet = 10 }
    , { kind = "darkvision", rangeFeet = 60 }
    ]
  , size = "medium"
  , skillModifiers =
    [ { modifier = 4, skill = "perception" }
    , { modifier = 4, skill = "stealth" }
    ]
  , speeds =
    [ { feet = { kind = "literal", value = 30 }, kind = "walk" }
    , { feet = { kind = "literal", value = 60 }, kind = "fly" }
    , { feet = { kind = "literal", value = 30 }, kind = "swim" }
    ]
  , traits =
    [ { description = "The dragon can breathe air and water."
      , name = "Amphibious"
      }
    ]
  }
}
