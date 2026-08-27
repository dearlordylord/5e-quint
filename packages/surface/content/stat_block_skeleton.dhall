{ challengeRating = 0.25
, id = "stat_block_skeleton"
, kind = "statBlock"
, name = "Skeleton"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-P-S.md:1152-1175" }
, statBlock =
  { abilityScores = { cha = 5, con = 15, dex = 16, int = 6, str = 10, wis = 8 }
  , ac.value = { kind = "literal", value = 14 }
  , actions =
    [ { kind = "executable"
      , procedure =
        { ammunition = None Text
        , attackAbility = "dex"
        , attackBonus = { kind = "literal", value = 5 }
        , attackType = "melee"
        , kind = "attack_roll"
        , name = "Shortsword"
        , onHit =
          [ { amount =
              { expr = { dice = 1, dieSize = 6, flat = 3 }
              , kind = "fixed"
              , static = 6
              }
            , damageType = "piercing"
            , kind = "damage"
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
        , attackBonus = { kind = "literal", value = 5 }
        , attackType = "ranged"
        , kind = "attack_roll"
        , name = "Shortbow"
        , onHit =
          [ { amount =
              { expr = { dice = 1, dieSize = 6, flat = 3 }
              , kind = "fixed"
              , static = 6
              }
            , damageType = "piercing"
            , kind = "damage"
            }
          ]
        , rangeFeet = Some { long = 320, normal = 80 }
        , reachFeet = None Natural
        }
      , procedureOrdinal = 2
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = { morality = "evil", order = "lawful" }
  , communication =
    { kind = "understood_but_cannot_speak"
    , languages =
      { additionalLanguages = 1
      , kind = "named_plus_other_languages"
      , languages = [ "Common" ]
      }
    }
  , creatureType = "undead"
  , gear = [ { item = "Shortbow" }, { item = "Shortsword" } ]
  , hp = { kind = "literal", value = 13 }
  , immunities =
    { conditions = [ "exhaustion", "poisoned" ], damageTypes = [ "poison" ] }
  , initiative = { modifier = 3, score = 13 }
  , passivePerception = 9
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
  , vulnerabilities = { damageTypes = [ "bludgeoning" ], kind = "fixed" }
  }
}
