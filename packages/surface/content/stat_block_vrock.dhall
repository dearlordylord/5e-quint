{ challengeRating = 6
, id = "stat_block_vrock"
, kind = "statBlock"
, name = "Vrock"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-T-Z.md:587-621" }
, statBlock =
  { abilityScores = { cha = 8, con = 18, dex = 15, int = 8, str = 17, wis = 13 }
  , ac.value = { kind = "literal", value = 15 }
  , actions =
    [ { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { attackAbility = None Text
        , attackBonus = None { kind : Text, value : Natural }
        , attackType = None Text
        , dispatches = Some
          [ { count = { kind = "literal", value = 2 }, procedureOrdinal = 2 } ]
        , kind = "multiattack"
        , name = "Multiattack"
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
        }
      , procedureOrdinal = 1
      , reason = None Text
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { attackAbility = Some "str"
        , attackBonus = Some { kind = "literal", value = 6 }
        , attackType = Some "melee"
        , dispatches =
            None
              ( List
                  { count : { kind : Text, value : Natural }
                  , procedureOrdinal : Natural
                  }
              )
        , kind = "attack_roll"
        , name = "Shred"
        , onHit = Some
          [ { amount =
              { expr = { dice = 2, dieSize = 6, flat = Some 3 }
              , kind = "fixed"
              , static = 10
              }
            , damageType = "piercing"
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
        , reachFeet = Some 5
        }
      , procedureOrdinal = 2
      , reason = None Text
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    , { description = Some
          "Constitution Saving Throw: DC 15, each creature in a 20-foot Emanation originating from the vrock. Failure: The target has the Poisoned condition and repeats the save at the end of each of its turns, ending the effect on itself on a success. While Poisoned, the target takes 5 (1d10) Poison damage at the start of each of its turns. Emptying a flask of Holy Water on the target ends the effect early."
      , kind = "textOnly"
      , name = Some "Spores"
      , procedure =
          None
            { attackAbility : Optional Text
            , attackBonus : Optional { kind : Text, value : Natural }
            , attackType : Optional Text
            , dispatches :
                Optional
                  ( List
                      { count : { kind : Text, value : Natural }
                      , procedureOrdinal : Natural
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
            }
      , procedureOrdinal = 3
      , reason = Some "unsupported_action_shape"
      , resourceRefs = { kind = "some", ordinals = Some [ 1 ] }
      }
    , { description = Some
          "Constitution Saving Throw: DC 15, each creature in a 20-foot Emanation originating from the vrock (demons succeed automatically). Failure: 10 (3d6) Thunder damage, and the target has the Stunned condition until the end of the vrock's next turn."
      , kind = "textOnly"
      , name = Some "Stunning Screech"
      , procedure =
          None
            { attackAbility : Optional Text
            , attackBonus : Optional { kind : Text, value : Natural }
            , attackType : Optional Text
            , dispatches :
                Optional
                  ( List
                      { count : { kind : Text, value : Natural }
                      , procedureOrdinal : Natural
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
            }
      , procedureOrdinal = 4
      , reason = Some "unsupported_action_shape"
      , resourceRefs = { kind = "some", ordinals = Some [ 2 ] }
      }
    ]
  , alignment = { morality = "evil", order = "chaotic" }
  , communication =
    { kind = "spoken_and_understood"
    , languages = { kind = "named", languages = [ "Abyssal" ] }
    , telepathy.rangeFeet = 120
    }
  , creatureType = "fiend"
  , creatureTypeTags = [ "demon" ]
  , hp = { kind = "literal", value = 152 }
  , immunities = { conditions = [ "poisoned" ], damageTypes = [ "poison" ] }
  , initiative = { modifier = 2, score = 12 }
  , passivePerception = 11
  , resistances =
    { damageTypes = [ "cold", "fire", "lightning" ], kind = "fixed" }
  , resources =
    [ { limit = { kind = "recharge", minimumRoll = Some 6, uses = None Natural }
      , ordinal = 1
      , ownership = "shared"
      }
    , { limit = { kind = "daily", minimumRoll = None Natural, uses = Some 1 }
      , ordinal = 2
      , ownership = "shared"
      }
    ]
  , savingThrowModifiers =
    [ { ability = "cha", modifier = +2 }
    , { ability = "con", modifier = +4 }
    , { ability = "dex", modifier = +5 }
    , { ability = "int", modifier = -1 }
    , { ability = "str", modifier = +3 }
    , { ability = "wis", modifier = +4 }
    ]
  , senses = [ { kind = "darkvision", rangeFeet = 120 } ]
  , size = "large"
  , speeds =
    [ { feet = { kind = "literal", value = 40 }, kind = "walk" }
    , { feet = { kind = "literal", value = 60 }, kind = "fly" }
    ]
  , traits =
    [ { description =
          "If the vrock dies outside the Abyss, its body dissolves into ichor, and it gains a new body instantly, reviving with all its Hit Points somewhere in the Abyss."
      , name = "Demonic Restoration"
      }
    , { description =
          "The vrock has Advantage on saving throws against spells and other magical effects."
      , name = "Magic Resistance"
      }
    ]
  }
}
