{ challengeRating = 8
, id = "stat_block_spirit_naga"
, kind = "statBlock"
, name = "Spirit Naga"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-P-S.md:1448-1480" }
, statBlock =
  { abilityScores =
    { cha = 16, con = 14, dex = 17, int = 16, str = 18, wis = 15 }
  , ac.value = { kind = "literal", value = 17 }
  , actions =
    [ { description = Some
          "The naga makes three attacks, using Bite or Necrotic Ray in any combination."
      , kind = "textOnly"
      , name = Some "Multiattack"
      , procedure =
          None
            { ability : Optional Text
            , attackAbility : Optional Text
            , attackBonus : Optional { kind : Text, value : Natural }
            , attackType : Optional Text
            , components : Optional { m : Bool, s : Bool, v : Bool }
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
            , reachFeet : Optional Natural
            , spellSaveDc : Optional { dc : Natural, kind : Text }
            }
      , procedureOrdinal = 1
      , reason = Some "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { ability = None Text
        , attackAbility = Some "str"
        , attackBonus = Some { kind = "literal", value = 7 }
        , attackType = Some "melee"
        , components = None { m : Bool, s : Bool, v : Bool }
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
        , name = "Bite"
        , onHit = Some
          [ { amount =
              { expr = { dice = 1, dieSize = 6, flat = Some 4 }
              , kind = "fixed"
              , static = 7
              }
            , damageType = "piercing"
            , kind = "damage"
            }
          , { amount =
              { expr = { dice = 4, dieSize = 6, flat = None Natural }
              , kind = "fixed"
              , static = 14
              }
            , damageType = "poison"
            , kind = "damage"
            }
          ]
        , reachFeet = Some 10
        , spellSaveDc = None { dc : Natural, kind : Text }
        }
      , procedureOrdinal = 2
      , reason = None Text
      , resourceRefs.kind = "none"
      }
    , { description = Some
          "Ranged Attack Roll: +6, range 60 ft. Hit: 21 (6d6) Necrotic damage."
      , kind = "textOnly"
      , name = Some "Necrotic Ray"
      , procedure =
          None
            { ability : Optional Text
            , attackAbility : Optional Text
            , attackBonus : Optional { kind : Text, value : Natural }
            , attackType : Optional Text
            , components : Optional { m : Bool, s : Bool, v : Bool }
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
            , reachFeet : Optional Natural
            , spellSaveDc : Optional { dc : Natural, kind : Text }
            }
      , procedureOrdinal = 3
      , reason = Some "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { ability = Some "int"
        , attackAbility = None Text
        , attackBonus = None { kind : Text, value : Natural }
        , attackType = None Text
        , components = Some { m = False, s = False, v = True }
        , groups = Some
          [ { kind = "at_will"
            , resourceRefs = { kind = "none", ordinals = None (List Natural) }
            , spells =
              [ { castAtLevel = None Natural, spellId = "detect_magic" }
              , { castAtLevel = None Natural, spellId = "mage_hand" }
              , { castAtLevel = None Natural, spellId = "minor_illusion" }
              , { castAtLevel = None Natural, spellId = "water_breathing" }
              ]
            }
          , { kind = "limited"
            , resourceRefs = { kind = "some", ordinals = Some [ 1 ] }
            , spells =
              [ { castAtLevel = None Natural, spellId = "detect_thoughts" }
              , { castAtLevel = None Natural, spellId = "dimension_door" }
              , { castAtLevel = Some 3, spellId = "hold_person" }
              , { castAtLevel = Some 4, spellId = "lightning_bolt" }
              ]
            }
          ]
        , kind = "spellcasting"
        , name = "Spellcasting"
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
        , reachFeet = None Natural
        , spellSaveDc = Some { dc = 14, kind = "fixed" }
        }
      , procedureOrdinal = 4
      , reason = None Text
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = { morality = "evil", order = "chaotic" }
  , communication =
    { kind = "spoken_and_understood"
    , languages = { kind = "named", languages = [ "Abyssal", "Common" ] }
    }
  , creatureType = "fiend"
  , hp = { kind = "literal", value = 135 }
  , immunities =
    { conditions = [ "charmed", "poisoned" ], damageTypes = [ "poison" ] }
  , initiative = { modifier = 3, score = 13 }
  , passivePerception = 12
  , resources =
    [ { limit = { kind = "daily", uses = 2 }, ordinal = 1, ownership = "each" }
    ]
  , savingThrowModifiers =
    [ { ability = "cha", modifier = 6 }
    , { ability = "con", modifier = 5 }
    , { ability = "dex", modifier = 6 }
    , { ability = "int", modifier = 3 }
    , { ability = "str", modifier = 4 }
    , { ability = "wis", modifier = 5 }
    ]
  , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
  , size = "large"
  , speeds = [ { feet = { kind = "literal", value = 40 }, kind = "walk" } ]
  , traits =
    [ { description =
          "If it dies, the naga returns to life in 1d6 days and regains all its Hit Points. Only a Wish spell can prevent this trait from functioning."
      , name = "Fiendish Restoration"
      }
    ]
  }
}
