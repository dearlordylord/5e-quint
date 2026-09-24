{ challengeRating = 0.5
, id = "stat_block_magma_mephit"
, kind = "statBlock"
, name = "Magma Mephit"
, provenance = { kind = "srd-5.2.1", section = "monsters-A-Z.md:11407-11483" }
, statBlock =
  { abilityScores = { cha = 10, con = 12, dex = 12, int = 7, str = 8, wis = 10 }
  , ac.value = { kind = "literal", value = 11 }
  , actions =
    [ { kind = "executable"
      , procedure =
        { ability = None Text
        , area = None { kind : Text, lengthFeet : Natural }
        , attackAbility = Some "dex"
        , attackBonus = Some { kind = "literal", value = 3 }
        , attackType = Some "melee"
        , dc = None { dc : Natural, kind : Text }
        , kind = "attack_roll"
        , name = "Claw"
        , onFail =
            None
              { amount :
                  { expr : { dice : Natural, dieSize : Natural }
                  , kind : Text
                  , static : Natural
                  }
              , damageType : Text
              , kind : Text
              }
        , onHit = Some
          [ { amount =
              { expr = { dice = 1, dieSize = 4, flat = Some 1 }
              , kind = "fixed"
              , static = 3
              }
            , damageType = "slashing"
            , kind = "damage"
            }
          , { amount =
              { expr = { dice = 1, dieSize = 6, flat = None Natural }
              , kind = "fixed"
              , static = 3
              }
            , damageType = "fire"
            , kind = "damage"
            }
          ]
        , onSuccess = None { kind : Text }
        , reachFeet = Some 5
        }
      , procedureOrdinal = 1
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    , { kind = "executable"
      , procedure =
        { ability = Some "dex"
        , area = Some { kind = "cone", lengthFeet = 15 }
        , attackAbility = None Text
        , attackBonus = None { kind : Text, value : Natural }
        , attackType = None Text
        , dc = Some { dc = 11, kind = "fixed" }
        , kind = "save"
        , name = "Fire Breath (Recharge 6)"
        , onFail = Some
          { amount =
            { expr = { dice = 2, dieSize = 6 }, kind = "fixed", static = 7 }
          , damageType = "fire"
          , kind = "damage"
          }
        , onHit =
            None
              ( List
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
                  }
              )
        , onSuccess = Some { kind = "half_damage" }
        , reachFeet = None Natural
        }
      , procedureOrdinal = 2
      , resourceRefs = { kind = "some", ordinals = Some [ 1 ] }
      }
    ]
  , alignment = { morality = "evil", order = "neutral" }
  , communication =
    { kind = "spoken_and_understood"
    , languages =
      { kind = "named", languages = [ "Primordial (Ignan, Terran)" ] }
    }
  , creatureType = "elemental"
  , hp = { kind = "literal", value = 18 }
  , immunities =
    { conditions = [ "exhaustion", "poisoned" ]
    , damageTypes = [ "fire", "poison" ]
    }
  , initiative = { modifier = 1, score = 11 }
  , passivePerception = 10
  , resources =
    [ { limit = { kind = "recharge", minimumRoll = 6 }
      , ordinal = 1
      , ownership = "shared"
      }
    ]
  , savingThrowModifiers =
    [ { ability = "str", modifier = -1 }
    , { ability = "dex", modifier = +1 }
    , { ability = "con", modifier = +1 }
    , { ability = "int", modifier = -2 }
    , { ability = "wis", modifier = +0 }
    , { ability = "cha", modifier = +0 }
    ]
  , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
  , size = "small"
  , skillModifiers = [ { modifier = 3, skill = "stealth" } ]
  , speeds =
    [ { feet = { kind = "literal", value = 30 }, kind = "walk" }
    , { feet = { kind = "literal", value = 30 }, kind = "fly" }
    ]
  , traits =
    [ { description =
          "The mephit explodes when it dies. Dexterity Saving Throw: DC 11, each creature in a 5-foot Emanation originating from the mephit. Failure: 7 (2d6) Fire damage. Success: Half damage."
      , name = "Death Burst"
      }
    ]
  , vulnerabilities = { damageTypes = [ "cold" ], kind = "fixed" }
  }
}
