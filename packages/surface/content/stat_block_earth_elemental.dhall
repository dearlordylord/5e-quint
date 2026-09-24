{ challengeRating = 5
, id = "stat_block_earth_elemental"
, kind = "statBlock"
, name = "Earth Elemental"
, provenance = { kind = "srd-5.2.1", section = "monsters-A-Z.md:5623-5702" }
, statBlock =
  { abilityScores = { cha = 5, con = 20, dex = 8, int = 5, str = 20, wis = 10 }
  , ac.value = { kind = "literal", value = 17 }
  , actions =
    [ { description = Some
          "The elemental makes two attacks, using Slam or Rock Launch in any combination."
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
            , rangeFeet : Optional { long : Natural, normal : Natural }
            , reachFeet : Optional Natural
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
        , attackBonus = { kind = "literal", value = 8 }
        , attackType = "melee"
        , kind = "attack_roll"
        , name = "Slam"
        , onHit =
          [ { amount = Some
              { expr = { dice = 2, dieSize = 8, flat = 5 }
              , kind = "fixed"
              , static = 14
              }
            , condition = None Text
            , damageType = Some "bludgeoning"
            , kind = "damage"
            , maxCreatureSize = None Text
            }
          ]
        , rangeFeet = None { long : Natural, normal : Natural }
        , reachFeet = Some 10
        }
      , procedureOrdinal = 2
      , reason = None Text
      , resourceRefs.kind = "none"
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { attackAbility = "str"
        , attackBonus = { kind = "literal", value = 8 }
        , attackType = "ranged"
        , kind = "attack_roll"
        , name = "Rock Launch"
        , onHit =
          [ { amount = Some
              { expr = { dice = 1, dieSize = 6, flat = 5 }
              , kind = "fixed"
              , static = 8
              }
            , condition = None Text
            , damageType = Some "bludgeoning"
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
        , rangeFeet = Some { long = 60, normal = 60 }
        , reachFeet = None Natural
        }
      , procedureOrdinal = 3
      , reason = None Text
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = { morality = "neutral", order = "neutral" }
  , communication =
    { kind = "spoken_and_understood"
    , languages = { kind = "named", languages = [ "Primordial (Terran)" ] }
    }
  , creatureType = "elemental"
  , hp = { kind = "literal", value = 147 }
  , immunities =
    { conditions =
      [ "exhaustion", "paralyzed", "petrified", "poisoned", "unconscious" ]
    , damageTypes = [ "poison" ]
    }
  , initiative = { modifier = -1, score = 9 }
  , passivePerception = 10
  , savingThrowModifiers =
    [ { ability = "str", modifier = +5 }
    , { ability = "dex", modifier = -1 }
    , { ability = "con", modifier = +5 }
    , { ability = "int", modifier = -3 }
    , { ability = "wis", modifier = +0 }
    , { ability = "cha", modifier = -3 }
    ]
  , senses =
    [ { kind = "darkvision", rangeFeet = 60 }
    , { kind = "tremorsense", rangeFeet = 60 }
    ]
  , size = "large"
  , speeds =
    [ { feet = { kind = "literal", value = 30 }, kind = "walk" }
    , { feet = { kind = "literal", value = 30 }, kind = "burrow" }
    ]
  , traits =
    [ { description =
          "The elemental can burrow through nonmagical, unworked earth and stone. While doing so, the elemental doesn't disturb the material it moves through."
      , name = "Earth Glide"
      }
    , { description =
          "The elemental deals double damage to objects and structures."
      , name = "Siege Monster"
      }
    ]
  , vulnerabilities = { damageTypes = [ "thunder" ], kind = "fixed" }
  }
}
