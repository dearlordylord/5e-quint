{ challengeRating = 4
, id = "stat_block_ettin"
, kind = "statBlock"
, name = "Ettin"
, provenance = { kind = "srd-5.2.1", section = "monsters-A-Z.md:5976-6048" }
, statBlock =
  { abilityScores = { cha = 8, con = 17, dex = 8, int = 6, str = 21, wis = 10 }
  , ac.value = { kind = "literal", value = 12 }
  , actions =
    [ { description = Some
          "The ettin makes one Battleaxe attack and one Morningstar attack."
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
                      Optional
                        { expr :
                            { dice : Natural
                            , dieSize : Natural
                            , flat : Natural
                            }
                        , kind : Text
                        , static : Natural
                        }
                  , condition : Optional Text
                  , damageType : Optional Text
                  , kind : Text
                  , maxCreatureSize : Optional Text
                  }
            , reachFeet : Natural
            }
      , procedureOrdinal = 1
      , reason = Some "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { attackAbility = "str"
        , attackBonus = { kind = "literal", value = 7 }
        , attackType = "melee"
        , kind = "attack_roll"
        , name = "Battleaxe"
        , onHit =
          [ { amount = Some
              { expr = { dice = 2, dieSize = 8, flat = 5 }
              , kind = "fixed"
              , static = 14
              }
            , condition = None Text
            , damageType = Some "slashing"
            , kind = "damage"
            , maxCreatureSize = None Text
            }
          , { amount =
                None
                  { expr : { dice : Natural, dieSize : Natural, flat : Natural }
                  , kind : Text
                  , static : Natural
                  }
            , condition = Some "prone"
            , damageType = None Text
            , kind = "apply_condition_if_target_size_at_most"
            , maxCreatureSize = Some "large"
            }
          ]
        , reachFeet = 5
        }
      , procedureOrdinal = 2
      , reason = None Text
      , resourceRefs.kind = "none"
      }
    , { description = Some
          "Melee Attack Roll: +7, reach 5 ft. Hit: 14 (2d8 + 5) Piercing damage, and the target has Disadvantage on the next attack roll it makes before the end of its next turn."
      , kind = "textOnly"
      , name = Some "Morningstar"
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
                      Optional
                        { expr :
                            { dice : Natural
                            , dieSize : Natural
                            , flat : Natural
                            }
                        , kind : Text
                        , static : Natural
                        }
                  , condition : Optional Text
                  , damageType : Optional Text
                  , kind : Text
                  , maxCreatureSize : Optional Text
                  }
            , reachFeet : Natural
            }
      , procedureOrdinal = 3
      , reason = Some "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = { morality = "evil", order = "chaotic" }
  , communication =
    { kind = "spoken_and_understood"
    , languages = { kind = "named", languages = [ "Giant" ] }
    }
  , creatureType = "giant"
  , gear = [ { item = "Battleaxe" }, { item = "Morningstar" } ]
  , hp = { kind = "literal", value = 85 }
  , immunities.conditions
    =
    [ "blinded", "charmed", "deafened", "frightened", "stunned", "unconscious" ]
  , initiative = { modifier = -1, score = 9 }
  , passivePerception = 14
  , savingThrowModifiers =
    [ { ability = "str", modifier = +5 }
    , { ability = "dex", modifier = -1 }
    , { ability = "con", modifier = +3 }
    , { ability = "int", modifier = -2 }
    , { ability = "wis", modifier = +0 }
    , { ability = "cha", modifier = -1 }
    ]
  , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
  , size = "large"
  , skillModifiers = [ { modifier = 4, skill = "perception" } ]
  , speeds = [ { feet = { kind = "literal", value = 40 }, kind = "walk" } ]
  }
}
