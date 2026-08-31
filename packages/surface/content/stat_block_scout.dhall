{ challengeRating = 0.5
, id = "stat_block_scout"
, kind = "statBlock"
, name = "Scout"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-P-S.md:822-846" }
, statBlock =
  { abilityScores =
    { cha = 11, con = 12, dex = 14, int = 11, str = 11, wis = 13 }
  , ac.value = { kind = "literal", value = 13 }
  , actions =
    [ { description = Some
          "The scout makes two attacks, using Shortsword and Longbow in any combination."
      , kind = "textOnly"
      , name = Some "Multiattack"
      , procedure =
          None
            { ammunition : Optional Text
            , attackAbility : Text
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
        { ammunition = None Text
        , attackAbility = "dex"
        , attackBonus = { kind = "literal", value = 4 }
        , attackType = "melee"
        , kind = "attack_roll"
        , name = "Shortsword"
        , onHit =
          [ { amount =
              { expr = { dice = 1, dieSize = 6, flat = 2 }
              , kind = "fixed"
              , static = 5
              }
            , damageType = "piercing"
            , kind = "damage"
            }
          ]
        , rangeFeet = None { long : Natural, normal : Natural }
        , reachFeet = Some 5
        }
      , procedureOrdinal = 2
      , reason = None Text
      , resourceRefs.kind = "none"
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { ammunition = Some "arrow"
        , attackAbility = "dex"
        , attackBonus = { kind = "literal", value = 4 }
        , attackType = "ranged"
        , kind = "attack_roll"
        , name = "Longbow"
        , onHit =
          [ { amount =
              { expr = { dice = 1, dieSize = 8, flat = 2 }
              , kind = "fixed"
              , static = 6
              }
            , damageType = "piercing"
            , kind = "damage"
            }
          ]
        , rangeFeet = Some { long = 600, normal = 150 }
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
    , languages =
      { additionalLanguages = 1
      , kind = "named_plus_other_languages"
      , languages = [ "Common" ]
      }
    }
  , creatureType = "humanoid"
  , gear =
    [ { item = "Leather Armor", quantity = 1 }
    , { item = "Longbow", quantity = 1 }
    , { item = "Shortsword", quantity = 1 }
    ]
  , hp = { kind = "literal", value = 16 }
  , initiative = { modifier = 2, score = 12 }
  , passivePerception = 15
  , savingThrowModifiers =
    [ { ability = "cha", modifier = 0 }
    , { ability = "con", modifier = 1 }
    , { ability = "dex", modifier = 2 }
    , { ability = "int", modifier = 0 }
    , { ability = "str", modifier = 0 }
    , { ability = "wis", modifier = 1 }
    ]
  , size = { kind = "alternatives", options = [ "medium", "small" ] }
  , skillModifiers =
    [ { modifier = 4, skill = "nature" }
    , { modifier = 5, skill = "perception" }
    , { modifier = 6, skill = "stealth" }
    , { modifier = 5, skill = "survival" }
    ]
  , speeds = [ { feet = { kind = "literal", value = 30 }, kind = "walk" } ]
  }
}
