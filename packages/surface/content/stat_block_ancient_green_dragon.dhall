{ challengeRating = 22
, id = "stat_block_ancient_green_dragon"
, kind = "statBlock"
, name = "Ancient Green Dragon"
, provenance = { kind = "srd-5.2.1", section = "monsters-A-Z.md:8268-8363" }
, statBlock =
  { abilityScores =
    { cha = 22, con = 25, dex = 12, int = 20, str = 27, wis = 17 }
  , ac.value = { kind = "literal", value = 21 }
  , actions =
    [ { description = Some
          "The dragon makes three Rend attacks. It can replace one attack with a use of Spellcasting to cast Mind Spike (level 5 version)."
      , kind = "textOnly"
      , name = Some "Multiattack"
      , procedure =
          None
            { ability : Optional Text
            , area : Optional { kind : Text, lengthFeet : Natural }
            , attackAbility : Optional Text
            , attackBonus : Optional { kind : Text, value : Natural }
            , attackType : Optional Text
            , components : Optional { m : Bool, s : Bool, v : Bool }
            , dc : Optional { dc : Natural, kind : Text }
            , groups :
                Optional
                  ( List
                      { kind : Text
                      , resourceRefs :
                          { kind : Text, ordinals : Optional (List Natural) }
                      , spells :
                          List
                            { castAtLevel : Optional Natural, spellId : Text }
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
            , onHit :
                Optional
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
            , onSuccess : Optional { kind : Text }
            , reachFeet : Optional Natural
            , spellSaveDc : Optional { dc : Natural, kind : Text }
            }
      , procedureOrdinal = 1
      , reason = Some "unsupported_action_shape"
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { ability = None Text
        , area = None { kind : Text, lengthFeet : Natural }
        , attackAbility = Some "str"
        , attackBonus = Some { kind = "literal", value = 15 }
        , attackType = Some "melee"
        , components = None { m : Bool, s : Bool, v : Bool }
        , dc = None { dc : Natural, kind : Text }
        , groups =
            None
              ( List
                  { kind : Text
                  , resourceRefs :
                      { kind : Text, ordinals : Optional (List Natural) }
                  , spells :
                      List { castAtLevel : Optional Natural, spellId : Text }
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
              { expr = { dice = 2, dieSize = 8, flat = Some 8 }
              , kind = "fixed"
              , static = 17
              }
            , damageType = "slashing"
            , kind = "damage"
            }
          , { amount =
              { expr = { dice = 3, dieSize = 6, flat = None Natural }
              , kind = "fixed"
              , static = 10
              }
            , damageType = "poison"
            , kind = "damage"
            }
          ]
        , onSuccess = None { kind : Text }
        , reachFeet = Some 15
        , spellSaveDc = None { dc : Natural, kind : Text }
        }
      , procedureOrdinal = 2
      , reason = None Text
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { ability = Some "con"
        , area = Some { kind = "cone", lengthFeet = 90 }
        , attackAbility = None Text
        , attackBonus = None { kind : Text, value : Natural }
        , attackType = None Text
        , components = None { m : Bool, s : Bool, v : Bool }
        , dc = Some { dc = 22, kind = "fixed" }
        , groups =
            None
              ( List
                  { kind : Text
                  , resourceRefs :
                      { kind : Text, ordinals : Optional (List Natural) }
                  , spells :
                      List { castAtLevel : Optional Natural, spellId : Text }
                  }
              )
        , kind = "save"
        , name = "Poison Breath (Recharge 5–6)"
        , onFail = Some
          { amount =
            { expr = { dice = 22, dieSize = 6 }, kind = "fixed", static = 77 }
          , damageType = "poison"
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
        , spellSaveDc = None { dc : Natural, kind : Text }
        }
      , procedureOrdinal = 3
      , reason = None Text
      , resourceRefs = { kind = "some", ordinals = Some [ 1 ] }
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { ability = Some "cha"
        , area = None { kind : Text, lengthFeet : Natural }
        , attackAbility = None Text
        , attackBonus = None { kind : Text, value : Natural }
        , attackType = None Text
        , components = Some { m = False, s = True, v = True }
        , dc = None { dc : Natural, kind : Text }
        , groups = Some
          [ { kind = "at_will"
            , resourceRefs = { kind = "none", ordinals = None (List Natural) }
            , spells =
              [ { castAtLevel = None Natural, spellId = "detect_magic" }
              , { castAtLevel = Some 5, spellId = "mind_spike" }
              ]
            }
          , { kind = "limited"
            , resourceRefs = { kind = "some", ordinals = Some [ 2 ] }
            , spells =
              [ { castAtLevel = None Natural, spellId = "geas" }
              , { castAtLevel = None Natural, spellId = "modify_memory" }
              ]
            }
          ]
        , kind = "spellcasting"
        , name = "Spellcasting"
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
        , spellSaveDc = Some { dc = 21, kind = "fixed" }
        }
      , procedureOrdinal = 4
      , reason = None Text
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    ]
  , alignment = { morality = "evil", order = "lawful" }
  , communication =
    { kind = "spoken_and_understood"
    , languages = { kind = "named", languages = [ "Common", "Draconic" ] }
    }
  , creatureType = "dragon"
  , creatureTypeTags = [ "chromatic" ]
  , hp = { kind = "literal", value = 402 }
  , immunities = { conditions = [ "poisoned" ], damageTypes = [ "poison" ] }
  , initiative = { modifier = 15, score = 25 }
  , legendaryActions =
    { entries =
      [ { description =
            "The dragon uses Spellcasting to cast Mind Spike (level 5 version)."
        , kind = "textOnly"
        , name = "Mind Invasion"
        , procedureOrdinal = 1
        , reason = "unsupported_action_shape"
        , resourceRefs.kind = "none"
        }
      , { description =
            "Constitution Saving Throw: DC 21, each creature in a 30-foot-radius Sphere centered on a point the dragon can see within 90 feet. Failure: 17 (5d6) Poison damage, and the target takes a −2 penalty to AC until the end of its next turn. Failure or Success: The dragon can't take this action again until the start of its next turn."
        , kind = "textOnly"
        , name = "Noxious Miasma"
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
  , passivePerception = 27
  , resources =
    [ { limit = { kind = "recharge", minimumRoll = Some 5, uses = None Natural }
      , ordinal = 1
      , ownership = "shared"
      }
    , { limit = { kind = "daily", minimumRoll = None Natural, uses = Some 1 }
      , ordinal = 2
      , ownership = "each"
      }
    ]
  , savingThrowModifiers =
    [ { ability = "str", modifier = 8 }
    , { ability = "dex", modifier = 8 }
    , { ability = "con", modifier = 7 }
    , { ability = "int", modifier = 5 }
    , { ability = "wis", modifier = 10 }
    , { ability = "cha", modifier = 6 }
    ]
  , senses =
    [ { kind = "blindsight", rangeFeet = 60 }
    , { kind = "darkvision", rangeFeet = 120 }
    ]
  , size = "gargantuan"
  , skillModifiers =
    [ { modifier = 13, skill = "deception" }
    , { modifier = 17, skill = "perception" }
    , { modifier = 13, skill = "persuasion" }
    , { modifier = 8, skill = "stealth" }
    ]
  , speeds =
    [ { feet = { kind = "literal", value = 40 }, kind = "walk" }
    , { feet = { kind = "literal", value = 80 }, kind = "fly" }
    , { feet = { kind = "literal", value = 40 }, kind = "swim" }
    ]
  , traits =
    [ { description = "The dragon can breathe air and water."
      , name = "Amphibious"
      }
    , { description =
          "If the dragon fails a saving throw, it can choose to succeed instead."
      , name = "Legendary Resistance (4/Day, or 5/Day in Lair)"
      }
    ]
  }
}
