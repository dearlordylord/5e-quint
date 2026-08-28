{ challengeRating = 7
, id = "stat_block_stone_giant"
, kind = "statBlock"
, name = "Stone Giant"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-P-S.md:1567-1594" }
, statBlock =
  { abilityScores =
    { cha = 9, con = 20, dex = 15, int = 10, str = 23, wis = 12 }
  , ac.value = { kind = "literal", value = 17 }
  , actions =
    [ { description = Some
          "The giant makes two attacks, using Stone Club or Boulder in any combination."
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
        , attackBonus = { kind = "literal", value = 9 }
        , attackType = "melee"
        , kind = "attack_roll"
        , name = "Stone Club"
        , onHit =
          [ { amount = Some
              { expr = { dice = 3, dieSize = 10, flat = 6 }
              , kind = "fixed"
              , static = 22
              }
            , condition = None Text
            , damageType = Some "bludgeoning"
            , kind = "damage"
            , maxCreatureSize = None Text
            }
          ]
        , rangeFeet = None { long : Natural, normal : Natural }
        , reachFeet = Some 15
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
        , attackBonus = { kind = "literal", value = 9 }
        , attackType = "ranged"
        , kind = "attack_roll"
        , name = "Boulder"
        , onHit =
          [ { amount = Some
              { expr = { dice = 2, dieSize = 8, flat = 6 }
              , kind = "fixed"
              , static = 15
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
        , rangeFeet = Some { long = 240, normal = 60 }
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
    , languages = { kind = "named", languages = [ "Giant" ] }
    }
  , creatureType = "giant"
  , hp = { kind = "literal", value = 126 }
  , initiative = { modifier = 5, score = 15 }
  , passivePerception = 14
  , reactions =
    [ { description =
          "Trigger: The giant is hit by a ranged attack roll and takes Bludgeoning, Piercing, or Slashing damage from it. Response: The giant reduces the damage it takes from the attack by 11 (1d10 + 6), and if that damage is reduced to 0, the giant can redirect some of the attack's force. Dexterity Saving Throw: DC 17, one creature the giant can see within 60 feet. Failure: 11 (1d10 + 6) Force damage."
      , kind = "textOnly"
      , name = "Deflect Missile"
      , procedureOrdinal = 1
      , reason = "unsupported_procedure_family"
      , resourceRefs = { kind = "some", ordinals = [ 1 ] }
      }
    ]
  , resources =
    [ { limit = { kind = "recharge", minimumRoll = 5 }
      , ordinal = 1
      , ownership = "shared"
      }
    ]
  , savingThrowModifiers =
    [ { ability = "cha", modifier = -1 }
    , { ability = "con", modifier = +8 }
    , { ability = "dex", modifier = +2 }
    , { ability = "int", modifier = +0 }
    , { ability = "str", modifier = +6 }
    , { ability = "wis", modifier = +4 }
    ]
  , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
  , size = "huge"
  , skillModifiers =
    [ { modifier = 12, skill = "athletics" }
    , { modifier = 4, skill = "perception" }
    , { modifier = 5, skill = "stealth" }
    ]
  , speeds = [ { feet = { kind = "literal", value = 40 }, kind = "walk" } ]
  }
}
