let DiceExpr
    : Type
    = { dice : Natural, dieSize : Natural, flat : Optional Integer }

let DamageAmount
    : Type
    = { expr : DiceExpr, kind : Text }

let HitEffect
    : Type
    = { amount : DamageAmount, damageType : Text, kind : Text }

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

let shortsword : Attack =
      { attackBonus = { kind = "literal", value = +5 }
      , attackType = "melee"
      , name = "Shortsword"
      , onHit =
        [ { amount =
            { expr = { dice = 1, dieSize = 6, flat = Some +3 }
            , kind = "fixed"
            }
          , damageType = "piercing"
          , kind = "damage"
          }
        ]
      , rangeFeet = None AttackRange
      , reachFeet = Some 5
      }

let shortbow : Attack =
      { attackBonus = { kind = "literal", value = +5 }
      , attackType = "ranged"
      , name = "Shortbow"
      , onHit =
        [ { amount =
            { expr = { dice = 1, dieSize = 6, flat = Some +3 }
            , kind = "fixed"
            }
          , damageType = "piercing"
          , kind = "damage"
          }
        ]
      , rangeFeet = Some { long = 320, normal = 80 }
      , reachFeet = None Natural
      }

in  { id = "stat_block_skeleton"
    , kind = "statBlock"
    , name = "Skeleton"
    , provenance =
      { kind = "srd-5.2.1"
      , section = "Monsters/Monsters-P-S.md:1152-1175"
      }
    , statBlock =
      { abilityScores =
        { cha = 5
        , con = 15
        , dex = 16
        , int = 6
        , str = 10
        , wis = 8
        }
      , ac = { kind = "literal", value = +14 }
      , actions = { attacks = [ shortsword, shortbow ] }
      , creatureType = "undead"
      , displayName = "Skeleton"
      , hp = { kind = "literal", value = +13 }
      , immunities =
        { damageTypes = [ "poison" ]
        , conditions = [ "exhaustion", "poisoned" ]
        }
      , initiativeModifier = +3
      , languages =
        [ "Understands Common plus one other language but can't speak" ]
      , savingThrowModifiers =
        [ { ability = "str", modifier = +0 }
        , { ability = "dex", modifier = +3 }
        , { ability = "con", modifier = +2 }
        , { ability = "int", modifier = -2 }
        , { ability = "wis", modifier = -1 }
        , { ability = "cha", modifier = -3 }
        ]
      , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
      , size = "medium"
      , speeds = [ { feet = { kind = "literal", value = 30 }, kind = "walk" } ]
      , vulnerabilities =
        { kind = "fixed", damageTypes = [ "bludgeoning" ] }
      }
    }
