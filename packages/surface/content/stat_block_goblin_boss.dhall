{ challengeRating = 1
, id = "stat_block_goblin_boss"
, kind = "statBlock"
, name = "Goblin Boss"
, provenance = { kind = "srd-5.2.1", section = "monsters-A-Z.md:7404-7487" }
, statBlock =
  { abilityScores =
    { cha = 10, con = 10, dex = 15, int = 10, str = 10, wis = 8 }
  , ac.value = { kind = "literal", value = 17 }
  , actions =
    [ { description = Some
          "The goblin makes two attacks, using Scimitar or Shortbow in any combination."
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
                          { dice : Natural
                          , dieSize : Natural
                          , flat : Optional Natural
                          }
                      , kind : Text
                      , static : Natural
                      }
                  , damageType : Text
                  , kind : Text
                  , when : Optional { kind : Text }
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
        , name = "Scimitar"
        , onHit =
          [ { amount =
              { expr = { dice = 1, dieSize = 6, flat = Some 2 }
              , kind = "fixed"
              , static = 5
              }
            , damageType = "slashing"
            , kind = "damage"
            , when = None { kind : Text }
            }
          , { amount =
              { expr = { dice = 1, dieSize = 4, flat = None Natural }
              , kind = "fixed"
              , static = 2
              }
            , damageType = "slashing"
            , kind = "conditional_bonus_damage"
            , when = Some { kind = "attack_roll_had_advantage" }
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
        , name = "Shortbow"
        , onHit =
          [ { amount =
              { expr = { dice = 1, dieSize = 6, flat = Some 2 }
              , kind = "fixed"
              , static = 5
              }
            , damageType = "piercing"
            , kind = "damage"
            , when = None { kind : Text }
            }
          , { amount =
              { expr = { dice = 1, dieSize = 4, flat = None Natural }
              , kind = "fixed"
              , static = 2
              }
            , damageType = "piercing"
            , kind = "conditional_bonus_damage"
            , when = Some { kind = "attack_roll_had_advantage" }
            }
          ]
        , rangeFeet = Some { long = 320, normal = 80 }
        , reachFeet = None Natural
        }
      , procedureOrdinal = 3
      , reason = None Text
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = { morality = "neutral", order = "chaotic" }
  , bonusActions =
    [ { kind = "executable"
      , procedure =
        { kind = "action_option"
        , name = "Nimble Escape"
        , options = [ "disengage", "hide" ]
        }
      , procedureOrdinal = 1
      , resourceRefs.kind = "none"
      }
    ]
  , communication =
    { kind = "spoken_and_understood"
    , languages = { kind = "named", languages = [ "Common", "Goblin" ] }
    }
  , creatureType = "fey"
  , creatureTypeTags = [ "goblinoid" ]
  , gear =
    [ { item = "Chain Shirt" }
    , { item = "Scimitar" }
    , { item = "Shield" }
    , { item = "Shortbow" }
    ]
  , hp = { kind = "literal", value = 21 }
  , initiative = { modifier = 2, score = 12 }
  , passivePerception = 9
  , reactions =
    [ { description =
          "Trigger: A creature the goblin can see makes an attack roll against it. Response: The goblin chooses a Small or Medium ally within 5 feet of itself. The goblin and that ally swap places, and the ally becomes the target of the attack instead."
      , kind = "textOnly"
      , name = "Redirect Attack"
      , procedureOrdinal = 1
      , reason = "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    ]
  , savingThrowModifiers =
    [ { ability = "str", modifier = +0 }
    , { ability = "dex", modifier = +2 }
    , { ability = "con", modifier = +0 }
    , { ability = "int", modifier = +0 }
    , { ability = "wis", modifier = -1 }
    , { ability = "cha", modifier = +0 }
    ]
  , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
  , size = "small"
  , skillModifiers = [ { modifier = 6, skill = "stealth" } ]
  , speeds = [ { feet = { kind = "literal", value = 30 }, kind = "walk" } ]
  }
}
