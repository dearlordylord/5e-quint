{ challengeRating = 2
, id = "stat_block_merrow"
, kind = "statBlock"
, name = "Merrow"
, provenance = { kind = "srd-5.2.1", section = "monsters-A-Z.md:11641-11718" }
, statBlock =
  { abilityScores = { cha = 9, con = 15, dex = 15, int = 8, str = 18, wis = 10 }
  , ac.value = { kind = "literal", value = 13 }
  , actions =
    [ { description = Some
          "The merrow makes two attacks, using Bite, Claw, or Harpoon in any combination."
      , kind = "textOnly"
      , name = Some "Multiattack"
      , procedure =
          None
            { attackAbility : Text
            , attackBonus : { kind : Text, value : Natural }
            , attackType : Text
            , kind : Text
            , name : Text
            , onHit :
                List
                  { amount :
                      Optional
                        { expr :
                            { dice : Natural
                            , dieSize : Natural
                            , flat : Natural
                            }
                        , kind : Text
                        , static : Natural
                        }
                  , condition : Optional Text
                  , damageType : Optional Text
                  , expiresAt : Optional { kind : Text }
                  , kind : Text
                  }
            , reachFeet : Natural
            }
      , procedureOrdinal = 1
      , reason = Some "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { attackAbility = "str"
        , attackBonus = { kind = "literal", value = 6 }
        , attackType = "melee"
        , kind = "attack_roll"
        , name = "Bite"
        , onHit =
          [ { amount = Some
              { expr = { dice = 1, dieSize = 4, flat = 4 }
              , kind = "fixed"
              , static = 6
              }
            , condition = None Text
            , damageType = Some "piercing"
            , expiresAt = None { kind : Text }
            , kind = "damage"
            }
          , { amount =
                None
                  { expr : { dice : Natural, dieSize : Natural, flat : Natural }
                  , kind : Text
                  , static : Natural
                  }
            , condition = Some "poisoned"
            , damageType = None Text
            , expiresAt = Some { kind = "source_next_turn_end" }
            , kind = "apply_condition"
            }
          ]
        , reachFeet = 5
        }
      , procedureOrdinal = 2
      , reason = None Text
      , resourceRefs.kind = "none"
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { attackAbility = "str"
        , attackBonus = { kind = "literal", value = 6 }
        , attackType = "melee"
        , kind = "attack_roll"
        , name = "Claw"
        , onHit =
          [ { amount = Some
              { expr = { dice = 2, dieSize = 4, flat = 4 }
              , kind = "fixed"
              , static = 9
              }
            , condition = None Text
            , damageType = Some "slashing"
            , expiresAt = None { kind : Text }
            , kind = "damage"
            }
          ]
        , reachFeet = 5
        }
      , procedureOrdinal = 3
      , reason = None Text
      , resourceRefs.kind = "none"
      }
    , { description = Some
          "Melee or Ranged Attack Roll: +6, reach 5 ft. or range 20/60 ft. Hit: 11 (2d6 + 4) Piercing damage. If the target is a Large or smaller creature, the merrow pulls the target up to 15 feet straight toward itself."
      , kind = "textOnly"
      , name = Some "Harpoon"
      , procedure =
          None
            { attackAbility : Text
            , attackBonus : { kind : Text, value : Natural }
            , attackType : Text
            , kind : Text
            , name : Text
            , onHit :
                List
                  { amount :
                      Optional
                        { expr :
                            { dice : Natural
                            , dieSize : Natural
                            , flat : Natural
                            }
                        , kind : Text
                        , static : Natural
                        }
                  , condition : Optional Text
                  , damageType : Optional Text
                  , expiresAt : Optional { kind : Text }
                  , kind : Text
                  }
            , reachFeet : Natural
            }
      , procedureOrdinal = 4
      , reason = Some "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = { morality = "evil", order = "chaotic" }
  , communication =
    { kind = "spoken_and_understood"
    , languages =
      { kind = "named", languages = [ "Abyssal", "Primordial (Aquan)" ] }
    }
  , creatureType = "monstrosity"
  , hp = { kind = "literal", value = 45 }
  , initiative = { modifier = 2, score = 12 }
  , passivePerception = 10
  , savingThrowModifiers =
    [ { ability = "str", modifier = +4 }
    , { ability = "dex", modifier = +2 }
    , { ability = "con", modifier = +2 }
    , { ability = "int", modifier = -1 }
    , { ability = "wis", modifier = +0 }
    , { ability = "cha", modifier = -1 }
    ]
  , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
  , size = "large"
  , speeds =
    [ { feet = { kind = "literal", value = 10 }, kind = "walk" }
    , { feet = { kind = "literal", value = 40 }, kind = "swim" }
    ]
  , traits =
    [ { description = "The merrow can breathe air and water."
      , name = "Amphibious"
      }
    ]
  }
}
