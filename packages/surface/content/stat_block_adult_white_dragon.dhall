{ challengeRating = 13
, id = "stat_block_adult_white_dragon"
, kind = "statBlock"
, name = "Adult White Dragon"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-T-Z.md:982-1024" }
, statBlock =
  { abilityScores =
    { cha = 12, con = 22, dex = 10, int = 8, str = 22, wis = 12 }
  , ac.value = { kind = "literal", value = 18 }
  , actions =
    [ { kind = "executable"
      , procedure =
        { ability = None Text
        , area = None { kind : Text, lengthFeet : Natural }
        , attackAbility = None Text
        , attackBonus = None { kind : Text, value : Natural }
        , attackType = None Text
        , dc = None { dc : Natural, kind : Text }
        , dispatches = Some
          [ { count = { kind = "literal", value = 3 }, procedureOrdinal = 2 } ]
        , kind = "multiattack"
        , name = "Multiattack"
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
        , onSuccess = None { kind : Text }
        , reachFeet = None Natural
        }
      , procedureOrdinal = 1
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    , { kind = "executable"
      , procedure =
        { ability = None Text
        , area = None { kind : Text, lengthFeet : Natural }
        , attackAbility = Some "str"
        , attackBonus = Some { kind = "literal", value = 11 }
        , attackType = Some "melee"
        , dc = None { dc : Natural, kind : Text }
        , dispatches =
            None
              ( List
                  { count : { kind : Text, value : Natural }
                  , procedureOrdinal : Natural
                  }
              )
        , kind = "attack_roll"
        , name = "Rend"
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
              { expr = { dice = 2, dieSize = 6, flat = Some 6 }
              , kind = "fixed"
              , static = 13
              }
            , damageType = "slashing"
            , kind = "damage"
            }
          , { amount =
              { expr = { dice = 1, dieSize = 8, flat = None Natural }
              , kind = "fixed"
              , static = 4
              }
            , damageType = "cold"
            , kind = "damage"
            }
          ]
        , onSuccess = None { kind : Text }
        , reachFeet = Some 10
        }
      , procedureOrdinal = 2
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    , { kind = "executable"
      , procedure =
        { ability = Some "con"
        , area = Some { kind = "cone", lengthFeet = 60 }
        , attackAbility = None Text
        , attackBonus = None { kind : Text, value : Natural }
        , attackType = None Text
        , dc = Some { dc = 19, kind = "fixed" }
        , dispatches =
            None
              ( List
                  { count : { kind : Text, value : Natural }
                  , procedureOrdinal : Natural
                  }
              )
        , kind = "save"
        , name = "Cold Breath"
        , onFail = Some
          { amount =
            { expr = { dice = 12, dieSize = 8 }, kind = "fixed", static = 54 }
          , damageType = "cold"
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
      , procedureOrdinal = 3
      , resourceRefs = { kind = "some", ordinals = Some [ 1 ] }
      }
    ]
  , alignment = { morality = "evil", order = "chaotic" }
  , communication =
    { kind = "spoken_and_understood"
    , languages = { kind = "named", languages = [ "Common", "Draconic" ] }
    }
  , creatureType = "dragon"
  , creatureTypeTags = [ "chromatic" ]
  , hp = { kind = "literal", value = 200 }
  , immunities = { conditions = [] : List <>, damageTypes = [ "cold" ] }
  , initiative = { modifier = 10, score = 20 }
  , legendaryActions =
    { entries =
      [ { description =
            "Constitution Saving Throw: DC 14, each creature in a 30-foot-radius Sphere centered on a point the dragon can see within 120 feet. Failure: 7 (2d6) Cold damage, and the target's Speed is 0 until the end of the target's next turn. Failure or Success: The dragon can't take this action again until the start of its next turn."
        , kind = "textOnly"
        , name = "Freezing Burst"
        , procedureOrdinal = 1
        , reason = "unsupported_action_shape"
        , resourceRefs.kind = "none"
        }
      , { description =
            "The dragon casts Fear, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 14). The dragon can't take this action again until the start of its next turn."
        , kind = "textOnly"
        , name = "Frightful Presence"
        , procedureOrdinal = 2
        , reason = "unsupported_action_shape"
        , resourceRefs.kind = "none"
        }
      , { description =
            "The dragon moves up to half its Speed, and it makes one Rend attack."
        , kind = "textOnly"
        , name = "Pounce"
        , procedureOrdinal = 3
        , reason = "unsupported_action_shape"
        , resourceRefs.kind = "none"
        }
      ]
    , uses =
      { additionalUsesInLair = 1, kind = "lair_bonus", usesOutsideLair = 3 }
    }
  , passivePerception = 21
  , resources =
    [ { limit = { kind = "recharge", minimumRoll = 5 }
      , ordinal = 1
      , ownership = "shared"
      }
    ]
  , savingThrowModifiers =
    [ { ability = "cha", modifier = +1 }
    , { ability = "con", modifier = +6 }
    , { ability = "dex", modifier = +5 }
    , { ability = "int", modifier = -1 }
    , { ability = "str", modifier = +6 }
    , { ability = "wis", modifier = +6 }
    ]
  , senses =
    [ { kind = "blindsight", rangeFeet = 60 }
    , { kind = "darkvision", rangeFeet = 120 }
    ]
  , size = "huge"
  , skillModifiers =
    [ { modifier = 11, skill = "perception" }
    , { modifier = 5, skill = "stealth" }
    ]
  , speeds =
    [ { feet = { kind = "literal", value = 40 }, kind = "walk" }
    , { feet = { kind = "literal", value = 30 }, kind = "burrow" }
    , { feet = { kind = "literal", value = 80 }, kind = "fly" }
    , { feet = { kind = "literal", value = 40 }, kind = "swim" }
    ]
  , traits =
    [ { description =
          "The dragon can move across and climb icy surfaces without needing to make an ability check. Additionally, Difficult Terrain composed of ice or snow doesn't cost it extra movement."
      , name = "Ice Walk"
      }
    , { description =
          "If the dragon fails a saving throw, it can choose to succeed instead."
      , name = "Legendary Resistance (3/Day, or 4/Day in Lair)"
      }
    ]
  }
}
