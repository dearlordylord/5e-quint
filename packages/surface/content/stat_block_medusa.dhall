{ challengeRating = 6
, id = "stat_block_medusa"
, kind = "statBlock"
, name = "Medusa"
, provenance = { kind = "srd-5.2.1", section = "monsters-A-Z.md:11169-11243" }
, statBlock =
  { abilityScores =
    { cha = 15, con = 16, dex = 17, int = 12, str = 10, wis = 13 }
  , ac.value = { kind = "literal", value = 15 }
  , actions =
    [ { description = Some
          "The medusa makes two Claw attacks and one Snake Hair attack, or it makes three Poison Ray attacks."
      , kind = "textOnly"
      , name = Some "Multiattack"
      , procedure =
          None
            { attackAbility : Text
            , attackBonus : { kind : Text, value : Natural }
            , attackType : Text
            , kind : Text
            , name : Text
            , onHit :
                List
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
            , rangeFeet : Optional { long : Natural, normal : Natural }
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
        { attackAbility = "dex"
        , attackBonus = { kind = "literal", value = 6 }
        , attackType = "melee"
        , kind = "attack_roll"
        , name = "Claw"
        , onHit =
          [ { amount =
              { expr = { dice = 2, dieSize = 6, flat = Some 3 }
              , kind = "fixed"
              , static = 10
              }
            , damageType = "slashing"
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
        { attackAbility = "dex"
        , attackBonus = { kind = "literal", value = 6 }
        , attackType = "melee"
        , kind = "attack_roll"
        , name = "Snake Hair"
        , onHit =
          [ { amount =
              { expr = { dice = 1, dieSize = 4, flat = Some 3 }
              , kind = "fixed"
              , static = 5
              }
            , damageType = "piercing"
            , kind = "damage"
            }
          , { amount =
              { expr = { dice = 4, dieSize = 6, flat = None Natural }
              , kind = "fixed"
              , static = 14
              }
            , damageType = "poison"
            , kind = "damage"
            }
          ]
        , rangeFeet = None { long : Natural, normal : Natural }
        , reachFeet = Some 5
        }
      , procedureOrdinal = 3
      , reason = None Text
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { attackAbility = "cha"
        , attackBonus = { kind = "literal", value = 5 }
        , attackType = "ranged"
        , kind = "attack_roll"
        , name = "Poison Ray"
        , onHit =
          [ { amount =
              { expr = { dice = 2, dieSize = 8, flat = Some 2 }
              , kind = "fixed"
              , static = 11
              }
            , damageType = "poison"
            , kind = "damage"
            }
          ]
        , rangeFeet = Some { long = 150, normal = 150 }
        , reachFeet = None Natural
        }
      , procedureOrdinal = 4
      , reason = None Text
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    , { description = Some
          "Constitution Saving Throw: DC 13, each creature in a 30-foot Cone. If the medusa sees its reflection in the Cone, the medusa must make this save. First Failure: The target has the Restrained condition and repeats the save at the end of its next turn if it is still Restrained, ending the effect on itself on a success. Second Failure: The target has the Petrified condition instead of the Restrained condition."
      , kind = "textOnly"
      , name = Some "Petrifying Gaze"
      , procedure =
          None
            { attackAbility : Text
            , attackBonus : { kind : Text, value : Natural }
            , attackType : Text
            , kind : Text
            , name : Text
            , onHit :
                List
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
            , rangeFeet : Optional { long : Natural, normal : Natural }
            , reachFeet : Optional Natural
            }
      , procedureOrdinal = 5
      , reason = Some "unsupported_action_shape"
      , resourceRefs = { kind = "some", ordinals = Some [ 1 ] }
      }
    ]
  , alignment = { morality = "evil", order = "lawful" }
  , communication =
    { kind = "spoken_and_understood"
    , languages =
      { additionalLanguages = 1
      , kind = "named_plus_other_languages"
      , languages = [ "Common" ]
      }
    }
  , creatureType = "monstrosity"
  , hp = { kind = "literal", value = 127 }
  , initiative = { modifier = 6, score = 16 }
  , passivePerception = 14
  , resources =
    [ { limit = { kind = "recharge", minimumRoll = 5 }
      , ordinal = 1
      , ownership = "shared"
      }
    ]
  , savingThrowModifiers =
    [ { ability = "str", modifier = 0 }
    , { ability = "dex", modifier = 3 }
    , { ability = "con", modifier = 3 }
    , { ability = "int", modifier = 1 }
    , { ability = "wis", modifier = 4 }
    , { ability = "cha", modifier = 2 }
    ]
  , senses = [ { kind = "darkvision", rangeFeet = 150 } ]
  , size = "medium"
  , skillModifiers =
    [ { modifier = 5, skill = "deception" }
    , { modifier = 4, skill = "perception" }
    , { modifier = 6, skill = "stealth" }
    ]
  , speeds = [ { feet = { kind = "literal", value = 30 }, kind = "walk" } ]
  }
}
