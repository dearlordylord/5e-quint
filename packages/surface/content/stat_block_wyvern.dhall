{ challengeRating = 6
, id = "stat_block_wyvern"
, kind = "statBlock"
, name = "Wyvern"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-T-Z.md:1245-1270" }
, statBlock =
  { abilityScores = { cha = 6, con = 16, dex = 10, int = 5, str = 19, wis = 12 }
  , ac.value = { kind = "literal", value = 14 }
  , actions =
    [ { description = Some
          "The wyvern makes one Bite attack and one Sting attack."
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
                          { dice : Natural, dieSize : Natural, flat : Natural }
                      , kind : Text
                      , static : Natural
                      }
                  , damageType : Text
                  , kind : Text
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
        , name = "Bite"
        , onHit =
          [ { amount =
              { expr = { dice = 2, dieSize = 8, flat = 4 }
              , kind = "fixed"
              , static = 13
              }
            , damageType = "piercing"
            , kind = "damage"
            }
          ]
        , reachFeet = 10
        }
      , procedureOrdinal = 2
      , reason = None Text
      , resourceRefs.kind = "none"
      }
    , { description = Some
          "Melee Attack Roll: +7, reach 10 ft. Hit: 11 (2d6 + 4) Piercing damage plus 24 (7d6) Poison damage, and the target has the Poisoned condition until the start of the wyvern's next turn."
      , kind = "textOnly"
      , name = Some "Sting"
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
                          { dice : Natural, dieSize : Natural, flat : Natural }
                      , kind : Text
                      , static : Natural
                      }
                  , damageType : Text
                  , kind : Text
                  }
            , reachFeet : Natural
            }
      , procedureOrdinal = 3
      , reason = Some "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = "unaligned"
  , communication.kind = "none"
  , creatureType = "dragon"
  , hp = { kind = "literal", value = 127 }
  , initiative = { modifier = 0, score = 10 }
  , passivePerception = 14
  , savingThrowModifiers =
    [ { ability = "cha", modifier = -2 }
    , { ability = "con", modifier = +3 }
    , { ability = "dex", modifier = +0 }
    , { ability = "int", modifier = -3 }
    , { ability = "str", modifier = +4 }
    , { ability = "wis", modifier = +1 }
    ]
  , senses = [ { kind = "darkvision", rangeFeet = 120 } ]
  , size = "large"
  , skillModifiers = [ { modifier = 4, skill = "perception" } ]
  , speeds =
    [ { feet = { kind = "literal", value = 30 }, kind = "walk" }
    , { feet = { kind = "literal", value = 80 }, kind = "fly" }
    ]
  }
}
