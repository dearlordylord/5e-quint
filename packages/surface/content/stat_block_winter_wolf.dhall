{ challengeRating = 3
, id = "stat_block_winter_wolf"
, kind = "statBlock"
, name = "Winter Wolf"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-T-Z.md:1154-1182" }
, statBlock =
  { abilityScores = { cha = 8, con = 14, dex = 13, int = 7, str = 18, wis = 12 }
  , ac.value = { kind = "literal", value = 13 }
  , actions =
    [ { kind = "executable"
      , procedure =
        { ability = None Text
        , area = None { kind : Text, lengthFeet : Natural }
        , attackAbility = Some "str"
        , attackBonus = Some { kind = "literal", value = 6 }
        , attackType = Some "melee"
        , dc = None { dc : Natural, kind : Text }
        , kind = "attack_roll"
        , name = "Bite"
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
          [ { amount = Some
              { expr = { dice = 2, dieSize = 6, flat = 4 }
              , kind = "fixed"
              , static = 11
              }
            , condition = None Text
            , damageType = Some "piercing"
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
        , onSuccess = None { kind : Text }
        , reachFeet = Some 5
        }
      , procedureOrdinal = 1
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    , { kind = "executable"
      , procedure =
        { ability = Some "con"
        , area = Some { kind = "cone", lengthFeet = 15 }
        , attackAbility = None Text
        , attackBonus = None { kind : Text, value : Natural }
        , attackType = None Text
        , dc = Some { dc = 12, kind = "fixed" }
        , kind = "save"
        , name = "Cold Breath"
        , onFail = Some
          { amount =
            { expr = { dice = 4, dieSize = 8 }, kind = "fixed", static = 18 }
          , damageType = "cold"
          , kind = "damage"
          }
        , onHit =
            None
              ( List
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
              )
        , onSuccess = Some { kind = "half_damage" }
        , reachFeet = None Natural
        }
      , procedureOrdinal = 2
      , resourceRefs = { kind = "some", ordinals = Some [ 1 ] }
      }
    ]
  , alignment = { morality = "evil", order = "neutral" }
  , communication =
    { kind = "spoken_and_understood"
    , languages = { kind = "named", languages = [ "Common", "Giant" ] }
    }
  , creatureType = "monstrosity"
  , hp = { kind = "literal", value = 75 }
  , immunities = { conditions = [] : List <>, damageTypes = [ "cold" ] }
  , initiative = { modifier = 1, score = 11 }
  , passivePerception = 15
  , resources =
    [ { limit = { kind = "recharge", minimumRoll = 5 }
      , ordinal = 1
      , ownership = "shared"
      }
    ]
  , savingThrowModifiers =
    [ { ability = "cha", modifier = -1 }
    , { ability = "con", modifier = +2 }
    , { ability = "dex", modifier = +1 }
    , { ability = "int", modifier = -2 }
    , { ability = "str", modifier = +4 }
    , { ability = "wis", modifier = +1 }
    ]
  , size = "large"
  , skillModifiers =
    [ { modifier = 5, skill = "perception" }
    , { modifier = 5, skill = "stealth" }
    ]
  , speeds = [ { feet = { kind = "literal", value = 50 }, kind = "walk" } ]
  , traits =
    [ { description =
          "The wolf has Advantage on an attack roll against a creature if at least one of the wolf's allies is within 5 feet of the creature and the ally doesn't have the Incapacitated condition."
      , name = "Pack Tactics"
      }
    ]
  }
}
