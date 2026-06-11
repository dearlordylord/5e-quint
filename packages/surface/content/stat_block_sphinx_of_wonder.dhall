{ id = "stat_block_sphinx_of_wonder"
, kind = "statBlock"
, name = "Sphinx of Wonder"
, challengeRating = 1.0
, provenance =
  { kind = "srd-5.2.1"
  , section = "Monsters/Monsters-P-S.md:1316-1344"
  }
, statBlock =
  { abilityScores =
    { cha = 11
    , con = 13
    , dex = 17
    , int = 15
    , str = 6
    , wis = 12
    }
  , ac = { kind = "literal", value = +13 }
  , actions =
    { attacks =
      [ { attackBonus = { kind = "literal", value = +5 }
        , attackType = "melee"
        , name = "Rend"
        , onHit =
          [ { amount =
              { expr = { dice = 1, dieSize = 4, flat = Some 3 }
              , kind = "fixed"
              , static = Some 5
              }
            , damageType = "slashing"
            , kind = "damage"
            }
          , { amount =
              { expr = { dice = 2, dieSize = 6, flat = None Natural }
              , kind = "fixed"
              , static = Some 7
              }
            , damageType = "radiant"
            , kind = "damage"
            }
          ]
        , reachFeet = 5
        }
      ]
    }
  , creatureType = "celestial"
  , displayName = "Sphinx of Wonder"
  , hp = { kind = "literal", value = +39 }
  , initiativeModifier = +3
  , languages = [ "Celestial", "Common" ]
  , reactions =
    { specials =
      [ { description =
            "Trigger: The sphinx or another creature within 30 feet makes an ability check or a saving throw. Response: The sphinx adds 2 to the roll."
        , limitedUse = { kind = "daily", uses = 2 }
        , name = "Burst of Ingenuity"
        }
      ]
    }
  , resistances =
    { damageTypes = [ "necrotic", "psychic", "radiant" ], kind = "fixed" }
  , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
  , size = "tiny"
  , skillModifiers =
    [ { modifier = +4, skill = "arcana" }
    , { modifier = +4, skill = "religion" }
    , { modifier = +5, skill = "stealth" }
    ]
  , speeds =
    [ { feet = { kind = "literal", value = 20 }, kind = "walk" }
    , { feet = { kind = "literal", value = 40 }, kind = "fly" }
    ]
  , traits =
    [ { description =
          "The sphinx has Advantage on saving throws against spells and other magical effects."
      , name = "Magic Resistance"
      }
    ]
  }
}
