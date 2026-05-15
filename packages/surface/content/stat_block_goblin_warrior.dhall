let DiceExpr
    : Type
    = { dice : Natural, dieSize : Natural, flat : Optional Natural }

let DamageAmount
    : Type
    = { expr : DiceExpr, kind : Text }

let AdvantageCondition
    : Type
    = { kind : Text }

let HitEffect
    : Type
    = { amount : DamageAmount
      , damageType : Text
      , kind : Text
      , when : Optional AdvantageCondition
      }

let AttackRange
    : Type
    = { long : Natural, normal : Natural }

let Attack
    : Type
    = { attackBonus : { kind : Text, value : Integer }
      , attackType : Text
      , name : Text
      , onHit : List HitEffect
      , rangeFeet : Optional AttackRange
      , reachFeet : Optional Natural
      }

let scimitar : Attack =
      { attackBonus = { kind = "literal", value = +4 }
      , attackType = "melee"
      , name = "Scimitar"
      , onHit =
        [ { amount =
            { expr = { dice = 1, dieSize = 6, flat = Some 2 }
            , kind = "fixed"
            }
          , damageType = "slashing"
          , kind = "damage"
          , when = None AdvantageCondition
          }
        , { amount =
            { expr = { dice = 1, dieSize = 4, flat = None Natural }
            , kind = "fixed"
            }
          , damageType = "slashing"
          , kind = "conditional_bonus_damage"
          , when = Some { kind = "attack_roll_had_advantage" }
          }
        ]
      , rangeFeet = None AttackRange
      , reachFeet = Some 5
      }

let shortbow : Attack =
      { attackBonus = { kind = "literal", value = +4 }
      , attackType = "ranged"
      , name = "Shortbow"
      , onHit =
        [ { amount =
            { expr = { dice = 1, dieSize = 6, flat = Some 2 }
            , kind = "fixed"
            }
          , damageType = "piercing"
          , kind = "damage"
          , when = None AdvantageCondition
          }
        , { amount =
            { expr = { dice = 1, dieSize = 4, flat = None Natural }
            , kind = "fixed"
            }
          , damageType = "piercing"
          , kind = "conditional_bonus_damage"
          , when = Some { kind = "attack_roll_had_advantage" }
          }
        ]
      , rangeFeet = Some { long = 320, normal = 80 }
      , reachFeet = None Natural
      }

in  { id = "stat_block_goblin_warrior"
, kind = "statBlock"
, name = "Goblin Warrior"
, challengeRating = 0.25
, provenance =
  { kind = "srd-5.2.1"
  , section = "Monsters/Monsters-E-G.md:721-748"
  }
, statBlock =
  { abilityScores =
    { cha = 8
    , con = 10
    , dex = 15
    , int = 10
    , str = 8
    , wis = 8
    }
  , ac = { kind = "literal", value = +15 }
  , actions =
    { attacks =
      [ scimitar, shortbow ]
    }
  , bonusActions =
    { actionOptions =
      [ { name = "Nimble Escape", options = [ "disengage", "hide" ] } ]
    }
  , creatureType = "fey"
  , displayName = "Goblin Warrior"
  , hp = { kind = "literal", value = +10 }
  , initiativeModifier = +2
  , languages = [ "Common", "Goblin" ]
  , savingThrowModifiers = [ { ability = "dex", modifier = +2 } ]
  , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
  , size = "small"
  , speeds = [ { feet = { kind = "literal", value = 30 }, kind = "walk" } ]
  }
}
