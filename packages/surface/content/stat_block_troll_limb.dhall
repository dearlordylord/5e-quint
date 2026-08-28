{ challengeRating = 0.5
, id = "stat_block_troll_limb"
, kind = "statBlock"
, name = "Troll Limb"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-T-Z.md:355-381" }
, statBlock =
  { abilityScores = { cha = 1, con = 10, dex = 12, int = 1, str = 18, wis = 9 }
  , ac.value = { kind = "literal", value = 13 }
  , actions =
    [ { kind = "executable"
      , procedure =
        { attackAbility = "str"
        , attackBonus = { kind = "literal", value = 6 }
        , attackType = "melee"
        , kind = "attack_roll"
        , name = "Rend"
        , onHit =
          [ { amount =
              { expr = { dice = 2, dieSize = 4, flat = 4 }
              , kind = "fixed"
              , static = 9
              }
            , damageType = "slashing"
            , kind = "damage"
            }
          ]
        , reachFeet = 5
        }
      , procedureOrdinal = 1
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = { morality = "evil", order = "chaotic" }
  , communication.kind = "none"
  , creatureType = "giant"
  , hp = { kind = "literal", value = 14 }
  , initiative = { modifier = 1, score = 11 }
  , passivePerception = 9
  , savingThrowModifiers =
    [ { ability = "cha", modifier = -5 }
    , { ability = "con", modifier = +0 }
    , { ability = "dex", modifier = +1 }
    , { ability = "int", modifier = -5 }
    , { ability = "str", modifier = +4 }
    , { ability = "wis", modifier = -1 }
    ]
  , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
  , size = "small"
  , speeds = [ { feet = { kind = "literal", value = 20 }, kind = "walk" } ]
  , traits =
    [ { description =
          "The limb regains 5 Hit Points at the start of each of its turns. If the limb takes Acid or Fire damage, this trait doesn't function on the limb's next turn. The limb dies only if it starts its turn with 0 Hit Points and doesn't regenerate."
      , name = "Regeneration"
      }
    , { description =
          "The limb uncannily has the same senses as a whole troll. If the limb isn't destroyed within 24 hours, roll 1d12. On a 12, the limb turns into a Troll. Otherwise, the limb withers away."
      , name = "Troll Spawn"
      }
    ]
  }
}
