{ challengeRating = 4
, id = "stat_block_tough_boss"
, kind = "statBlock"
, name = "Tough Boss"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-T-Z.md:249-278" }
, statBlock =
  { abilityScores =
    { cha = 11, con = 16, dex = 14, int = 11, str = 17, wis = 10 }
  , ac.value = { kind = "literal", value = 16 }
  , actions =
    [ { description = Some
          "The tough makes two attacks, using Warhammer or Heavy Crossbow in any combination."
      , kind = "textOnly"
      , name = Some "Multiattack"
      , procedure =
          None
            { ammunition : Text
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
            , rangeFeet : { long : Natural, normal : Natural }
            }
      , procedureOrdinal = 1
      , reason = Some "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    , { description = Some
          "Melee Attack Roll: +5, reach 5 ft. Hit: 12 (2d8 + 3) Bludgeoning damage. If the target is a Large or smaller creature, the tough pushes the target up to 10 feet straight away from itself."
      , kind = "textOnly"
      , name = Some "Warhammer"
      , procedure =
          None
            { ammunition : Text
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
            , rangeFeet : { long : Natural, normal : Natural }
            }
      , procedureOrdinal = 2
      , reason = Some "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { ammunition = "bolt"
        , attackAbility = "dex"
        , attackBonus = { kind = "literal", value = 4 }
        , attackType = "ranged"
        , kind = "attack_roll"
        , name = "Heavy Crossbow"
        , onHit =
          [ { amount =
              { expr = { dice = 2, dieSize = 10, flat = 2 }
              , kind = "fixed"
              , static = 13
              }
            , damageType = "piercing"
            , kind = "damage"
            }
          ]
        , rangeFeet = { long = 400, normal = 100 }
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
    [ { item = "Chain Mail", quantity = 1 }
    , { item = "Heavy Crossbow", quantity = 1 }
    , { item = "Warhammer", quantity = 1 }
    ]
  , hp = { kind = "literal", value = 82 }
  , initiative = { modifier = 2, score = 12 }
  , passivePerception = 10
  , savingThrowModifiers =
    [ { ability = "cha", modifier = 2 }
    , { ability = "con", modifier = 5 }
    , { ability = "dex", modifier = 2 }
    , { ability = "int", modifier = 0 }
    , { ability = "str", modifier = 5 }
    , { ability = "wis", modifier = 0 }
    ]
  , size = { kind = "alternatives", options = [ "medium", "small" ] }
  , speeds = [ { feet = { kind = "literal", value = 30 }, kind = "walk" } ]
  , traits =
    [ { description =
          "The tough has Advantage on an attack roll against a creature if at least one of the tough's allies is within 5 feet of the creature and the ally doesn't have the Incapacitated condition."
      , name = "Pack Tactics"
      , effect.kind =
          "attack_roll_advantage_when_non_incapacitated_ally_within_5_feet_of_target"
      }
    ]
  }
}
