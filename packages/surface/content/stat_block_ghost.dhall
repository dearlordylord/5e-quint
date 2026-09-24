{ challengeRating = 4
, id = "stat_block_ghost"
, kind = "statBlock"
, name = "Ghost"
, provenance = { kind = "srd-5.2.1", section = "monsters-A-Z.md:6760-6845" }
, statBlock =
  { abilityScores =
    { cha = 17, con = 10, dex = 13, int = 10, str = 7, wis = 12 }
  , ac.value = { kind = "literal", value = 11 }
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
                          { dice : Natural, dieSize : Natural, flat : Natural }
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
        { attackAbility = Some "cha"
        , attackBonus = Some { kind = "literal", value = 5 }
        , attackType = Some "melee"
        , dispatches =
            None
              ( List
                  { count : { kind : Text, value : Natural }
                  , procedureOrdinal : Natural
                  }
              )
        , kind = "attack_roll"
        , name = "Withering Touch"
        , onHit = Some
          [ { amount =
              { expr = { dice = 3, dieSize = 10, flat = 3 }
              , kind = "fixed"
              , static = 19
              }
            , damageType = "necrotic"
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
          "The ghost casts the Etherealness spell, requiring no spell components and using Charisma as the spellcasting ability. The ghost is visible on the Material Plane while on the Border Ethereal and vice versa, but it can't affect or be affected by anything on the other plane."
      , kind = "textOnly"
      , name = Some "Etherealness"
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
                              , flat : Natural
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
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    , { description = Some
          "Wisdom Saving Throw: DC 13, each creature in a 60-foot Cone that can see the ghost and isn't an Undead. Failure: 10 (2d6 + 3) Psychic damage, and the target has the Frightened condition until the start of the ghost's next turn. Success: The target is immune to this ghost's Horrific Visage for 24 hours."
      , kind = "textOnly"
      , name = Some "Horrific Visage"
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
                              , flat : Natural
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
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    , { description = Some
          "Charisma Saving Throw: DC 13, one Humanoid the ghost can see within 5 feet. Failure: The target is possessed by the ghost; the ghost disappears, and the target has the Incapacitated condition and loses control of its body. The ghost now controls the body, but the target retains awareness. The ghost can't be targeted by any attack, spell, or other effect, except ones that specifically target Undead. The ghost's game statistics are the same, except it uses the possessed target's Speed, as well as the target's Strength, Dexterity, and Constitution modifiers. The possession lasts until the body drops to 0 Hit Points or the ghost leaves as a Bonus Action. When the possession ends, the ghost appears in an unoccupied space within 5 feet of the target, and the target is immune to this ghost's Possession for 24 hours. Success: The target is immune to this ghost's Possession for 24 hours."
      , kind = "textOnly"
      , name = Some "Possession (Recharge 6)"
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
                              , flat : Natural
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
      , procedureOrdinal = 5
      , reason = Some "unsupported_action_shape"
      , resourceRefs = { kind = "some", ordinals = Some [ 1 ] }
      }
    ]
  , alignment = { morality = "neutral", order = "neutral" }
  , communication =
    { kind = "spoken_and_understood"
    , languages =
      { additionalLanguages = 1
      , kind = "named_plus_other_languages"
      , languages = [ "Common" ]
      }
    }
  , creatureType = "undead"
  , hp = { kind = "literal", value = 45 }
  , immunities =
    { conditions =
      [ "charmed"
      , "exhaustion"
      , "frightened"
      , "grappled"
      , "paralyzed"
      , "petrified"
      , "poisoned"
      , "prone"
      , "restrained"
      ]
    , damageTypes = [ "necrotic", "poison" ]
    }
  , initiative = { modifier = 1, score = 11 }
  , passivePerception = 11
  , resistances =
    { damageTypes =
      [ "acid"
      , "bludgeoning"
      , "cold"
      , "fire"
      , "lightning"
      , "piercing"
      , "slashing"
      , "thunder"
      ]
    , kind = "fixed"
    }
  , resources =
    [ { limit = { kind = "recharge", minimumRoll = 6 }
      , ordinal = 1
      , ownership = "shared"
      }
    ]
  , savingThrowModifiers =
    [ { ability = "str", modifier = -2 }
    , { ability = "dex", modifier = +1 }
    , { ability = "con", modifier = +0 }
    , { ability = "int", modifier = +0 }
    , { ability = "wis", modifier = +1 }
    , { ability = "cha", modifier = +3 }
    ]
  , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
  , size = "medium"
  , speeds =
    [ { feet = { kind = "literal", value = 5 }
      , hover = None Bool
      , kind = "walk"
      }
    , { feet = { kind = "literal", value = 40 }
      , hover = Some True
      , kind = "fly"
      }
    ]
  , traits =
    [ { description =
          "The ghost can see 60 feet into the Ethereal Plane when it is on the Material Plane."
      , name = "Ethereal Sight"
      }
    , { description =
          "The ghost can move through other creatures and objects as if they were Difficult Terrain. It takes 5 (1d10) Force damage if it ends its turn inside an object."
      , name = "Incorporeal Movement"
      }
    ]
  }
}
