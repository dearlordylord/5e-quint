{ challengeRating = 5
, id = "stat_block_werebear"
, kind = "statBlock"
, name = "Werebear"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-T-Z.md:726-758" }
, statBlock =
  { abilityScores =
    { cha = 12, con = 17, dex = 10, int = 11, str = 19, wis = 12 }
  , ac.value = { kind = "literal", value = 15 }
  , actions =
    [ { description = Some
          "The werebear makes two attacks, using Handaxe or Rend in any combination. It can replace one attack with a Bite attack."
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
                      { expr :
                          { dice : Natural, dieSize : Natural, flat : Natural }
                      , kind : Text
                      , static : Natural
                      }
                  , damageType : Text
                  , kind : Text
                  }
            , reachFeet : Natural
            }
      , procedureOrdinal = 1
      , reason = Some "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    , { description = Some
          "Melee Attack Roll: +7, reach 5 ft. Hit: 17 (2d12 + 4) Piercing damage. If the target is a Humanoid, it is subjected to the following effect. Constitution Saving Throw: DC 14. Failure: The target is cursed. If the cursed target drops to 0 Hit Points, it instead becomes a Werebear under the GM's control and has 10 Hit Points. Success: The target is immune to this werebear's curse for 24 hours."
      , kind = "textOnly"
      , name = Some "Bite (Bear or Hybrid Form Only)"
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
                      { expr :
                          { dice : Natural, dieSize : Natural, flat : Natural }
                      , kind : Text
                      , static : Natural
                      }
                  , damageType : Text
                  , kind : Text
                  }
            , reachFeet : Natural
            }
      , procedureOrdinal = 2
      , reason = Some "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    , { description = Some
          "Melee or Ranged Attack Roll: +7, reach 5 ft or range 20/60 ft. Hit: 14 (3d6 + 4) Slashing damage."
      , kind = "textOnly"
      , name = Some "Handaxe (Humanoid or Hybrid Form Only)"
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
                      { expr :
                          { dice : Natural, dieSize : Natural, flat : Natural }
                      , kind : Text
                      , static : Natural
                      }
                  , damageType : Text
                  , kind : Text
                  }
            , reachFeet : Natural
            }
      , procedureOrdinal = 3
      , reason = Some "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { attackAbility = "str"
        , attackBonus = { kind = "literal", value = 7 }
        , attackType = "melee"
        , kind = "attack_roll"
        , name = "Rend (Bear or Hybrid Form Only)"
        , onHit =
          [ { amount =
              { expr = { dice = 2, dieSize = 8, flat = 4 }
              , kind = "fixed"
              , static = 13
              }
            , damageType = "slashing"
            , kind = "damage"
            }
          ]
        , reachFeet = 5
        }
      , procedureOrdinal = 4
      , reason = None Text
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = { morality = "good", order = "neutral" }
  , bonusActions =
    [ { description =
          "The werebear shape-shifts into a Large bear-humanoid hybrid or a Large bear, or it returns to its true humanoid form. Its game statistics, other than its size, are the same in each form. Any equipment it is wearing or carrying isn't transformed."
      , kind = "textOnly"
      , name = "Shape-Shift"
      , procedureOrdinal = 1
      , reason = "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    ]
  , communication =
    { kind = "spoken_and_understood"
    , languages =
      { kind = "named", languages = [ "Common (can't speak in bear form)" ] }
    }
  , creatureType = "monstrosity"
  , creatureTypeTags = [ "lycanthrope" ]
  , gear = [ { item = "Handaxe", quantity = 4 } ]
  , hp = { kind = "literal", value = 135 }
  , initiative = { modifier = 3, score = 13 }
  , passivePerception = 17
  , savingThrowModifiers =
    [ { ability = "cha", modifier = 1 }
    , { ability = "con", modifier = 3 }
    , { ability = "dex", modifier = 0 }
    , { ability = "int", modifier = 0 }
    , { ability = "str", modifier = 4 }
    , { ability = "wis", modifier = 1 }
    ]
  , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
  , size = { kind = "alternatives", options = [ "medium", "small" ] }
  , skillModifiers = [ { modifier = 7, skill = "perception" } ]
  , speeds =
    [ { availability = None { forms : List Text, kind : Text }
      , feet = { kind = "literal", value = 30 }
      , kind = "walk"
      }
    , { availability = Some { forms = [ "bear" ], kind = "forms_only" }
      , feet = { kind = "literal", value = 40 }
      , kind = "walk"
      }
    , { availability = Some { forms = [ "bear" ], kind = "forms_only" }
      , feet = { kind = "literal", value = 30 }
      , kind = "climb"
      }
    ]
  }
}
