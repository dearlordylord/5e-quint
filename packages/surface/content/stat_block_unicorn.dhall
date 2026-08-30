{ challengeRating = 5
, id = "stat_block_unicorn"
, kind = "statBlock"
, name = "Unicorn"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-T-Z.md:385-433" }
, statBlock =
  { abilityScores =
    { cha = 16, con = 15, dex = 14, int = 11, str = 18, wis = 17 }
  , ac.value = { kind = "literal", value = 12 }
  , actions =
    [ { description = Some
          "The unicorn makes one Hooves attack and one Radiant Horn attack."
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
        { attackAbility = "str"
        , attackBonus = { kind = "literal", value = 7 }
        , attackType = "melee"
        , kind = "attack_roll"
        , name = "Hooves"
        , onHit =
          [ { amount =
              { expr = { dice = 2, dieSize = 6, flat = 4 }
              , kind = "fixed"
              , static = 11
              }
            , damageType = "bludgeoning"
            , kind = "damage"
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
        , attackBonus = { kind = "literal", value = 7 }
        , attackType = "melee"
        , kind = "attack_roll"
        , name = "Radiant Horn"
        , onHit =
          [ { amount =
              { expr = { dice = 1, dieSize = 10, flat = 4 }
              , kind = "fixed"
              , static = 9
              }
            , damageType = "radiant"
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
          "The unicorn casts one of the following spells, requiring no spell components and using Charisma as the spellcasting ability (spell save DC 14): At Will: Detect Evil and Good, Druidcraft 1/Day Each: Calm Emotions, Dispel Evil and Good, Entangle, Pass without Trace, Word of Recall"
      , kind = "textOnly"
      , name = Some "Spellcasting"
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
  , alignment = { morality = "good", order = "lawful" }
  , bonusActions =
    [ { description =
          "The unicorn touches another creature with its horn and casts Cure Wounds or Lesser Restoration on that creature, using the same spellcasting ability as Spellcasting."
      , kind = "textOnly"
      , name = "Unicorn's Blessing"
      , procedureOrdinal = 1
      , reason = "unsupported_procedure_family"
      , resourceRefs = { kind = "some", ordinals = [ 1 ] }
      }
    ]
  , communication =
    { kind = "spoken_and_understood"
    , languages =
      { kind = "named", languages = [ "Celestial", "Elvish", "Sylvan" ] }
    , telepathy.rangeFeet = 120
    }
  , creatureType = "celestial"
  , hp = { kind = "literal", value = 97 }
  , immunities =
    { conditions = [ "charmed", "paralyzed", "poisoned" ]
    , damageTypes = [ "poison" ]
    }
  , initiative = { modifier = 8, score = 18 }
  , legendaryActions =
    { entries =
      [ { description =
            "The unicorn moves up to half its Speed without provoking Opportunity Attacks, and it makes one Radiant Horn attack."
        , kind = "textOnly"
        , name = "Charging Horn"
        , procedureOrdinal = 1
        , reason = "unsupported_action_shape"
        , resourceRefs.kind = "none"
        }
      , { description =
            "The unicorn targets itself or one creature it can see within 60 feet of itself. The target gains 10 (3d6) Temporary Hit Points, and its AC increases by 2 until the end of the unicorn's next turn. The unicorn can't take this action again until the start of its next turn."
        , kind = "textOnly"
        , name = "Shimmering Shield"
        , procedureOrdinal = 2
        , reason = "unsupported_action_shape"
        , resourceRefs.kind = "none"
        }
      ]
    , uses = { kind = "fixed", uses = 3 }
    }
  , passivePerception = 13
  , resources =
    [ { limit = { kind = "daily", uses = 3 }
      , ordinal = 1
      , ownership = "shared"
      }
    ]
  , savingThrowModifiers =
    [ { ability = "cha", modifier = 3 }
    , { ability = "con", modifier = 2 }
    , { ability = "dex", modifier = 2 }
    , { ability = "int", modifier = 0 }
    , { ability = "str", modifier = 4 }
    , { ability = "wis", modifier = 3 }
    ]
  , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
  , size = "large"
  , speeds = [ { feet = { kind = "literal", value = 50 }, kind = "walk" } ]
  , traits =
    [ { description =
          "If the unicorn fails a saving throw, it can choose to succeed instead."
      , name = "Legendary Resistance (3/Day)"
      }
    , { description =
          "The unicorn has Advantage on saving throws against spells and other magical effects."
      , name = "Magic Resistance"
      }
    ]
  }
}
