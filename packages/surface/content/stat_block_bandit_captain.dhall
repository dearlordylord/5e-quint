{ challengeRating = 2
, id = "stat_block_bandit_captain"
, kind = "statBlock"
, name = "Bandit Captain"
, provenance = { kind = "srd-5.2.1", section = "monsters-A-Z.md:1014-1091" }
, statBlock =
  { abilityScores =
    { cha = 14, con = 14, dex = 16, int = 14, str = 15, wis = 11 }
  , ac.value = { kind = "literal", value = 15 }
  , actions =
    [ { description = Some
          "The bandit makes two attacks, using Scimitar and Pistol in any combination."
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
        , attackBonus = { kind = "literal", value = 5 }
        , attackType = "melee"
        , kind = "attack_roll"
        , name = "Scimitar"
        , onHit =
          [ { amount =
              { expr = { dice = 1, dieSize = 6, flat = 3 }
              , kind = "fixed"
              , static = 6
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
      , resourceRefs.kind = "none"
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { ammunition = Some "bullet"
        , attackAbility = "dex"
        , attackBonus = { kind = "literal", value = 5 }
        , attackType = "ranged"
        , kind = "attack_roll"
        , name = "Pistol"
        , onHit =
          [ { amount =
              { expr = { dice = 1, dieSize = 10, flat = 3 }
              , kind = "fixed"
              , static = 8
              }
            , damageType = "piercing"
            , kind = "damage"
            }
          ]
        , rangeFeet = Some { long = 90, normal = 30 }
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
    , languages = { kind = "named", languages = [ "Common", "Thieves' Cant" ] }
    }
  , creatureType = "humanoid"
  , gear =
    [ { item = "Pistol" }
    , { item = "Scimitar" }
    , { item = "Studded Leather Armor" }
    ]
  , hp = { kind = "literal", value = 52 }
  , initiative = { modifier = 3, score = 13 }
  , passivePerception = 10
  , reactions =
    [ { description =
          "Trigger: The bandit is hit by a melee attack roll while holding a weapon. Response: The bandit adds 2 to its AC against that attack, possibly causing it to miss."
      , kind = "textOnly"
      , name = "Parry"
      , procedureOrdinal = 1
      , reason = "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    ]
  , savingThrowModifiers =
    [ { ability = "str", modifier = 4 }
    , { ability = "dex", modifier = 5 }
    , { ability = "con", modifier = 2 }
    , { ability = "int", modifier = 2 }
    , { ability = "wis", modifier = 2 }
    , { ability = "cha", modifier = 2 }
    ]
  , size = { kind = "alternatives", options = [ "medium", "small" ] }
  , skillModifiers =
    [ { modifier = 4, skill = "athletics" }
    , { modifier = 4, skill = "deception" }
    ]
  , speeds = [ { feet = { kind = "literal", value = 30 }, kind = "walk" } ]
  }
}
