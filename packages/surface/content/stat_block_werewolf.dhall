{ challengeRating = 3
, id = "stat_block_werewolf"
, kind = "statBlock"
, name = "Werewolf"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-T-Z.md:872-908" }
, statBlock =
  { abilityScores =
    { cha = 10, con = 14, dex = 14, int = 10, str = 16, wis = 11 }
  , ac.value = { kind = "literal", value = 15 }
  , actions =
    [ { description = Some
          "The werewolf makes two attacks, using Scratch or Longbow in any combination. It can replace one attack with a Bite attack."
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
          "Melee Attack Roll: +5, reach 5 ft. Hit: 12 (2d8 + 3) Piercing damage. If the target is a Humanoid, it is subjected to the following effect. Constitution Saving Throw: DC 12. Failure: The target is cursed. If the cursed target drops to 0 Hit Points, it instead becomes a Werewolf under the GM's control and has 10 Hit Points. Success: The target is immune to this werewolf's curse for 24 hours."
      , kind = "textOnly"
      , name = Some "Bite (Wolf or Hybrid Form Only)"
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
  , alignment = { morality = "evil", order = "chaotic" }
  , bonusActions =
    [ { description =
          "The werewolf shape-shifts into a Large wolf-humanoid hybrid or a Medium wolf, or it returns to its true humanoid form. Its game statistics, other than its size, are the same in each form. Any equipment it is wearing or carrying isn't transformed."
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
      { kind = "named", languages = [ "Common (can't speak in wolf form)" ] }
    }
  , creatureType = "monstrosity"
  , creatureTypeTags = [ "lycanthrope" ]
  , gear = [ { item = "Longbow", quantity = 1 } ]
  , hp = { kind = "literal", value = 71 }
  , initiative = { modifier = 4, score = 14 }
  , passivePerception = 14
  , savingThrowModifiers =
    [ { ability = "cha", modifier = 0 }
    , { ability = "con", modifier = 2 }
    , { ability = "dex", modifier = 2 }
    , { ability = "int", modifier = 0 }
    , { ability = "str", modifier = 3 }
    , { ability = "wis", modifier = 0 }
    ]
  , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
  , size = { kind = "alternatives", options = [ "medium", "small" ] }
  , skillModifiers =
    [ { modifier = 4, skill = "perception" }
    , { modifier = 4, skill = "stealth" }
    ]
  , speeds =
    [ { availability = None { forms : List Text, kind : Text }
      , feet = { kind = "literal", value = 30 }
      , kind = "walk"
      }
    , { availability = Some { forms = [ "wolf" ], kind = "forms_only" }
      , feet = { kind = "literal", value = 40 }
      , kind = "walk"
      }
    ]
  , traits =
    [ { description =
          "The werewolf has Advantage on an attack roll against a creature if at least one of the werewolf's allies is within 5 feet of the creature and the ally doesn't have the Incapacitated condition."
      , name = "Pack Tactics"
      }
    ]
  }
}
