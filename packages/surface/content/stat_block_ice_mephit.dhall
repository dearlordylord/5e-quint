{ challengeRating = 0.5
, id = "stat_block_ice_mephit"
, kind = "statBlock"
, name = "Ice Mephit"
, provenance = { kind = "srd-5.2.1", section = "monsters-A-Z.md:11327-11405" }
, statBlock =
  { abilityScores = { cha = 12, con = 10, dex = 13, int = 9, str = 7, wis = 11 }
  , ac.value = { kind = "literal", value = 11 }
  , actions =
    [ { description = Some
          "Melee Attack Roll: +3, reach 5 ft. Hit: 3 (1d4 + 1) Slashing damage plus 2 (1d4) Cold damage."
      , kind = "textOnly"
      , name = Some "Claw"
      , procedure =
          None
            { ability : Text
            , area : Optional { kind : Text, lengthFeet : Natural }
            , components : Optional { m : Bool, s : Bool, v : Bool }
            , dc : Optional { dc : Natural, kind : Text }
            , groups :
                Optional
                  ( List
                      { kind : Text
                      , resourceRefs : { kind : Text, ordinals : List Natural }
                      , spells : List { spellId : Text }
                      }
                  )
            , kind : Text
            , name : Text
            , onFail :
                Optional
                  { amount :
                      { expr : { dice : Natural, dieSize : Natural }
                      , kind : Text
                      , static : Natural
                      }
                  , damageType : Text
                  , kind : Text
                  }
            , onSuccess : Optional { kind : Text }
            }
      , procedureOrdinal = 1
      , reason = Some "unsupported_action_shape"
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { ability = "cha"
        , area = None { kind : Text, lengthFeet : Natural }
        , components = Some { m = False, s = False, v = False }
        , dc = None { dc : Natural, kind : Text }
        , groups = Some
          [ { kind = "limited"
            , resourceRefs = { kind = "some", ordinals = [ 1 ] }
            , spells = [ { spellId = "fog_cloud" } ]
            }
          ]
        , kind = "spellcasting"
        , name = "Fog Cloud (1/Day)"
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
        , onSuccess = None { kind : Text }
        }
      , procedureOrdinal = 2
      , reason = None Text
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { ability = "con"
        , area = Some { kind = "cone", lengthFeet = 15 }
        , components = None { m : Bool, s : Bool, v : Bool }
        , dc = Some { dc = 10, kind = "fixed" }
        , groups =
            None
              ( List
                  { kind : Text
                  , resourceRefs : { kind : Text, ordinals : List Natural }
                  , spells : List { spellId : Text }
                  }
              )
        , kind = "save"
        , name = "Frost Breath (Recharge 6)"
        , onFail = Some
          { amount =
            { expr = { dice = 3, dieSize = 4 }, kind = "fixed", static = 7 }
          , damageType = "cold"
          , kind = "damage"
          }
        , onSuccess = Some { kind = "half_damage" }
        }
      , procedureOrdinal = 3
      , reason = None Text
      , resourceRefs = { kind = "some", ordinals = Some [ 2 ] }
      }
    ]
  , alignment = { morality = "evil", order = "neutral" }
  , communication =
    { kind = "spoken_and_understood"
    , languages =
      { kind = "named", languages = [ "Primordial (Aquan, Auran)" ] }
    }
  , creatureType = "elemental"
  , hp = { kind = "literal", value = 21 }
  , immunities =
    { conditions = [ "exhaustion", "poisoned" ]
    , damageTypes = [ "cold", "poison" ]
    }
  , initiative = { modifier = 1, score = 11 }
  , passivePerception = 12
  , resources =
    [ { limit = { kind = "daily", minimumRoll = None Natural, uses = Some 1 }
      , ordinal = 1
      , ownership = "shared"
      }
    , { limit = { kind = "recharge", minimumRoll = Some 6, uses = None Natural }
      , ordinal = 2
      , ownership = "shared"
      }
    ]
  , savingThrowModifiers =
    [ { ability = "str", modifier = -2 }
    , { ability = "dex", modifier = +1 }
    , { ability = "con", modifier = +0 }
    , { ability = "int", modifier = -1 }
    , { ability = "wis", modifier = +0 }
    , { ability = "cha", modifier = +1 }
    ]
  , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
  , size = "small"
  , skillModifiers =
    [ { modifier = 2, skill = "perception" }
    , { modifier = 3, skill = "stealth" }
    ]
  , speeds =
    [ { feet = { kind = "literal", value = 30 }, kind = "walk" }
    , { feet = { kind = "literal", value = 30 }, kind = "fly" }
    ]
  , traits =
    [ { description =
          "The mephit explodes when it dies. Constitution Saving Throw: DC 10, each creature in a 5-foot Emanation originating from the mephit. Failure: 5 (2d4) Cold damage. Success: Half damage."
      , name = "Death Burst"
      }
    ]
  , vulnerabilities = { damageTypes = [ "fire" ], kind = "fixed" }
  }
}
