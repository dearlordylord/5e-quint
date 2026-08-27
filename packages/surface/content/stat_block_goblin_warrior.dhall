{ challengeRating = 0.25
, id = "stat_block_goblin_warrior"
, kind = "statBlock"
, name = "Goblin Warrior"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-E-G.md:721-748" }
, statBlock =
  { abilityScores = { cha = 8, con = 10, dex = 15, int = 10, str = 8, wis = 8 }
  , ac.value = { kind = "literal", value = 15 }
  , actions =
    [ { kind = "executable"
      , procedure =
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
      , procedureOrdinal = 1
      , resourceRefs.kind = "none"
      }
    , { kind = "executable"
      , procedure =
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
      , procedureOrdinal = 2
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
    [ { item = "Leather Armor" }
    , { item = "Scimitar" }
    , { item = "Shield" }
    , { item = "Shortbow" }
    ]
  , hp = { kind = "literal", value = 10 }
  , initiative = { modifier = 2, score = 12 }
  , passivePerception = 9
  , savingThrowModifiers = [ { ability = "dex", modifier = 2 } ]
  , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
  , size = "small"
  , skillModifiers = [ { modifier = 6, skill = "stealth" } ]
  , speeds = [ { feet = { kind = "literal", value = 30 }, kind = "walk" } ]
  }
}
