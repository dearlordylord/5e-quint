{ challengeRating = 4
, id = "stat_block_weretiger"
, kind = "statBlock"
, name = "Weretiger"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-T-Z.md:834-868" }
, statBlock =
  { abilityScores =
    { cha = 11, con = 16, dex = 15, int = 10, str = 17, wis = 13 }
  , ac.value = { kind = "literal", value = 12 }
  , actions =
    [ { description = Some
          "The weretiger makes two attacks, using Scratch or Longbow in any combination. It can replace one attack with a Bite attack."
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
            , rangeFeet : Optional { long : Natural, normal : Natural }
            , reachFeet : Optional Natural
            }
      , procedureOrdinal = 1
      , reason = Some "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    , { description = Some
          "Melee Attack Roll: +5, reach 5 ft. Hit: 12 (2d8 + 3) Piercing damage. If the target is a Humanoid, it is subjected to the following effect. Constitution Saving Throw: DC 13. Failure: The target is cursed. If the cursed target drops to 0 Hit Points, it instead becomes a Weretiger under the GM's control and has 10 Hit Points. Success: The target is immune to this weretiger's curse for 24 hours."
      , kind = "textOnly"
      , name = Some "Bite (Tiger or Hybrid Form Only)"
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
            , rangeFeet : Optional { long : Natural, normal : Natural }
            , reachFeet : Optional Natural
            }
      , procedureOrdinal = 2
      , reason = Some "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { attackAbility = "str"
        , attackBonus = { kind = "literal", value = 5 }
        , attackType = "melee"
        , kind = "attack_roll"
        , name = "Scratch"
        , onHit =
          [ { amount =
              { expr = { dice = 2, dieSize = 6, flat = 3 }
              , kind = "fixed"
              , static = 10
              }
            , damageType = "slashing"
            , kind = "damage"
            }
          ]
        , rangeFeet = None { long : Natural, normal : Natural }
        , reachFeet = Some 5
        }
      , procedureOrdinal = 3
      , reason = None Text
      , resourceRefs.kind = "none"
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { attackAbility = "dex"
        , attackBonus = { kind = "literal", value = 4 }
        , attackType = "ranged"
        , kind = "attack_roll"
        , name = "Longbow (Humanoid or Hybrid Form Only)"
        , onHit =
          [ { amount =
              { expr = { dice = 2, dieSize = 8, flat = 2 }
              , kind = "fixed"
              , static = 11
              }
            , damageType = "piercing"
            , kind = "damage"
            }
          ]
        , rangeFeet = Some { long = 600, normal = 150 }
        , reachFeet = None Natural
        }
      , procedureOrdinal = 4
      , reason = None Text
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = { morality = "neutral", order = "neutral" }
  , bonusActions =
    [ { description =
          "The weretiger moves up to its Speed without provoking Opportunity Attacks. At the end of this movement, the weretiger can take the Hide action."
      , kind = "textOnly"
      , name = "Prowl (Tiger or Hybrid Form Only)"
      , procedureOrdinal = 1
      , reason = "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    , { description =
          "The weretiger shape-shifts into a Large tiger-humanoid hybrid or a Large tiger, or it returns to its true humanoid form. Its game statistics, other than its size, are the same in each form. Any equipment it is wearing or carrying isn't transformed."
      , kind = "textOnly"
      , name = "Shape-Shift"
      , procedureOrdinal = 2
      , reason = "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    ]
  , communication =
    { kind = "spoken_and_understood"
    , languages =
      { kind = "named", languages = [ "Common (can't speak in tiger form)" ] }
    }
  , creatureType = "monstrosity"
  , creatureTypeTags = [ "lycanthrope" ]
  , gear = [ { item = "Longbow", quantity = 1 } ]
  , hp = { kind = "literal", value = 120 }
  , initiative = { modifier = 2, score = 12 }
  , passivePerception = 15
  , savingThrowModifiers =
    [ { ability = "cha", modifier = 0 }
    , { ability = "con", modifier = 3 }
    , { ability = "dex", modifier = 2 }
    , { ability = "int", modifier = 0 }
    , { ability = "str", modifier = 3 }
    , { ability = "wis", modifier = 1 }
    ]
  , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
  , size = { kind = "alternatives", options = [ "medium", "small" ] }
  , skillModifiers =
    [ { modifier = 5, skill = "perception" }
    , { modifier = 4, skill = "stealth" }
    ]
  , speeds =
    [ { availability = None { forms : List Text, kind : Text }
      , feet = { kind = "literal", value = 30 }
      , kind = "walk"
      }
    , { availability = Some { forms = [ "tiger" ], kind = "forms_only" }
      , feet = { kind = "literal", value = 40 }
      , kind = "walk"
      }
    ]
  }
}
