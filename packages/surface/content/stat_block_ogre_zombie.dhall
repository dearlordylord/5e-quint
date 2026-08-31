{ challengeRating = 2
, id = "stat_block_ogre_zombie"
, kind = "statBlock"
, name = "Ogre Zombie"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-T-Z.md:1345-1370" }
, statBlock =
  { abilityScores = { cha = 5, con = 18, dex = 6, int = 3, str = 19, wis = 6 }
  , ac.value = { kind = "literal", value = 8 }
  , actions =
    [ { kind = "executable"
      , procedure =
        { attackAbility = "str"
        , attackBonus = { kind = "literal", value = 6 }
        , attackType = "melee"
        , kind = "attack_roll"
        , name = "Slam"
        , onHit =
          [ { amount =
              { expr = { dice = 2, dieSize = 8, flat = 4 }
              , kind = "fixed"
              , static = 13
              }
            , damageType = "bludgeoning"
            , kind = "damage"
            }
          ]
        , reachFeet = 5
        }
      , procedureOrdinal = 1
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = { morality = "evil", order = "neutral" }
  , communication =
    { kind = "understood_but_cannot_speak"
    , languages = { kind = "named", languages = [ "Common", "Giant" ] }
    }
  , creatureType = "undead"
  , hp = { kind = "literal", value = 85 }
  , immunities =
    { conditions = [ "exhaustion", "poisoned" ], damageTypes = [ "poison" ] }
  , initiative = { modifier = -2, score = 8 }
  , passivePerception = 8
  , savingThrowModifiers =
    [ { ability = "cha", modifier = -3 }
    , { ability = "con", modifier = +4 }
    , { ability = "dex", modifier = -2 }
    , { ability = "int", modifier = -4 }
    , { ability = "str", modifier = +4 }
    , { ability = "wis", modifier = +0 }
    ]
  , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
  , size = "large"
  , speeds = [ { feet = { kind = "literal", value = 30 }, kind = "walk" } ]
  , traits =
    [ { description =
          "If damage reduces the zombie to 0 Hit Points, it makes a Constitution saving throw (DC 5 plus the damage taken) unless the damage is Radiant or from a Critical Hit. On a successful save, the zombie drops to 1 Hit Point instead."
      , name = "Undead Fortitude"
      }
    ]
  }
}
