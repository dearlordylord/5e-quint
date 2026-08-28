{ challengeRating = 4
, id = "stat_block_succubus"
, kind = "statBlock"
, name = "Succubus"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-P-S.md:1675-1709" }
, statBlock =
  { abilityScores =
    { cha = 20, con = 13, dex = 17, int = 15, str = 8, wis = 12 }
  , ac.value = { kind = "literal", value = 15 }
  , actions =
    [ { description = Some
          "The succubus makes one Fiendish Touch attack and uses Charm or Draining Kiss."
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
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { attackAbility = "cha"
        , attackBonus = { kind = "literal", value = 7 }
        , attackType = "melee"
        , kind = "attack_roll"
        , name = "Fiendish Touch"
        , onHit =
          [ { amount =
              { expr = { dice = 2, dieSize = 10, flat = 5 }
              , kind = "fixed"
              , static = 16
              }
            , damageType = "psychic"
            , kind = "damage"
            }
          ]
        , reachFeet = 5
        }
      , procedureOrdinal = 2
      , reason = None Text
      , resourceRefs.kind = "none"
      }
    , { description = Some
          "The succubus casts Dominate Person (level 8 version), requiring no spell components and using Charisma as the spellcasting ability (spell save DC 15)."
      , kind = "textOnly"
      , name = Some "Charm"
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
      , reason = Some "unsupported_procedure_family"
      , resourceRefs.kind = "none"
      }
    , { description = Some
          "Constitution Saving Throw: DC 15, one creature Charmed by the succubus within 5 feet. Failure: 13 (3d8) Psychic damage. Success: Half damage. Failure or Success: The target's Hit Point maximum decreases by an amount equal to the damage taken."
      , kind = "textOnly"
      , name = Some "Draining Kiss"
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
      , procedureOrdinal = 4
      , reason = Some "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = { morality = "evil", order = "neutral" }
  , bonusActions =
    [ { description =
          "The succubus shape-shifts into a Medium or Small Humanoid, or it returns to its true form. Its game statistics are the same in each form, except its Fly Speed is available only in its true form. Any equipment it is wearing or carrying isn't transformed."
      , kind = "textOnly"
      , name = "Shape-Shift"
      , procedureOrdinal = 1
      , reason = "unsupported_procedure_family"
      , resourceRefs.kind = "none"
      }
    ]
  , communication =
    { kind = "spoken_and_understood"
    , languages =
      { kind = "named", languages = [ "Abyssal", "Common", "Infernal" ] }
    , telepathy.rangeFeet = 60
    }
  , creatureType = "fiend"
  , hp = { kind = "literal", value = 71 }
  , initiative = { modifier = 3, score = 13 }
  , passivePerception = 15
  , resistances =
    { damageTypes = [ "cold", "fire", "poison", "psychic" ], kind = "fixed" }
  , savingThrowModifiers =
    [ { ability = "cha", modifier = +5 }
    , { ability = "con", modifier = +1 }
    , { ability = "dex", modifier = +3 }
    , { ability = "int", modifier = +2 }
    , { ability = "str", modifier = -1 }
    , { ability = "wis", modifier = +1 }
    ]
  , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
  , size = "medium"
  , skillModifiers =
    [ { modifier = 9, skill = "deception" }
    , { modifier = 5, skill = "insight" }
    , { modifier = 5, skill = "perception" }
    , { modifier = 9, skill = "persuasion" }
    , { modifier = 7, skill = "stealth" }
    ]
  , speeds =
    [ { feet = { kind = "literal", value = 30 }, kind = "walk" }
    , { feet = { kind = "literal", value = 60 }, kind = "fly" }
    ]
  , traits =
    [ { description =
          "When the succubus finishes a Long Rest, it can shape-shift into an Incubus, using that stat block instead of this one."
      , name = "Incubus Form"
      }
    ]
  }
}
