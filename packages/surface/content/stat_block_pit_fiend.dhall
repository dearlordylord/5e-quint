{ challengeRating = 20
, id = "stat_block_pit_fiend"
, kind = "statBlock"
, name = "Pit Fiend"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-P-S.md:130-169" }
, statBlock =
  { abilityScores =
    { cha = 24, con = 24, dex = 14, int = 22, str = 26, wis = 18 }
  , ac.value = { kind = "literal", value = 21 }
  , actions =
    [ { description = Some
          "The pit fiend makes one Bite attack, two Devilish Claw attacks, and one Fiery Mace attack."
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
            , reachFeet : Natural
            }
      , procedureOrdinal = 1
      , reason = Some "unsupported_action_shape"
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    , { description = Some
          "Melee Attack Roll: +14, reach 10 ft. Hit: 18 (3d6 + 8) Piercing damage. If the target is a creature, it must make the following saving throw. Constitution Saving Throw: DC 21. Failure: The target has the Poisoned condition. While Poisoned, the target can't regain Hit Points and takes 21 (6d6) Poison damage at the start of each of its turns, and it repeats the save at the end of each of its turns, ending the effect on itself on a success. After 1 minute, it succeeds automatically."
      , kind = "textOnly"
      , name = Some "Bite"
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
            , reachFeet : Natural
            }
      , procedureOrdinal = 2
      , reason = Some "unsupported_action_shape"
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { attackAbility = "str"
        , attackBonus = { kind = "literal", value = 14 }
        , attackType = "melee"
        , kind = "attack_roll"
        , name = "Devilish Claw"
        , onHit =
          [ { amount =
              { expr = { dice = 4, dieSize = 8, flat = Some 8 }
              , kind = "fixed"
              , static = 26
              }
            , damageType = "necrotic"
            , kind = "damage"
            }
          ]
        , reachFeet = 10
        }
      , procedureOrdinal = 3
      , reason = None Text
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { attackAbility = "str"
        , attackBonus = { kind = "literal", value = 14 }
        , attackType = "melee"
        , kind = "attack_roll"
        , name = "Fiery Mace"
        , onHit =
          [ { amount =
              { expr = { dice = 4, dieSize = 6, flat = Some 8 }
              , kind = "fixed"
              , static = 22
              }
            , damageType = "force"
            , kind = "damage"
            }
          , { amount =
              { expr = { dice = 6, dieSize = 6, flat = None Natural }
              , kind = "fixed"
              , static = 21
              }
            , damageType = "fire"
            , kind = "damage"
            }
          ]
        , reachFeet = 10
        }
      , procedureOrdinal = 4
      , reason = None Text
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    , { description = Some
          "The pit fiend casts Fireball (level 5 version) twice, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 21). It can replace one Fireball with Hold Monster (level 7 version) or Wall of Fire."
      , kind = "textOnly"
      , name = Some "Hellfire Spellcasting"
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
            , reachFeet : Natural
            }
      , procedureOrdinal = 5
      , reason = Some "unsupported_procedure_family"
      , resourceRefs = { kind = "some", ordinals = Some [ 1 ] }
      }
    ]
  , alignment = { morality = "evil", order = "lawful" }
  , communication =
    { kind = "spoken_and_understood"
    , languages = { kind = "named", languages = [ "Infernal" ] }
    , telepathy.rangeFeet = 120
    }
  , creatureType = "fiend"
  , creatureTypeTags = [ "devil" ]
  , hp = { kind = "literal", value = 337 }
  , immunities =
    { conditions = [ "poisoned" ], damageTypes = [ "fire", "poison" ] }
  , initiative = { modifier = 14, score = 24 }
  , passivePerception = 20
  , resistances = { damageTypes = [ "cold" ], kind = "fixed" }
  , resources =
    [ { limit = { kind = "recharge", minimumRoll = 4 }
      , ordinal = 1
      , ownership = "shared"
      }
    ]
  , savingThrowModifiers =
    [ { ability = "cha", modifier = 7 }
    , { ability = "con", modifier = 7 }
    , { ability = "dex", modifier = 8 }
    , { ability = "int", modifier = 6 }
    , { ability = "str", modifier = 8 }
    , { ability = "wis", modifier = 10 }
    ]
  , senses = [ { kind = "truesight", rangeFeet = 120 } ]
  , size = "large"
  , skillModifiers =
    [ { modifier = 10, skill = "perception" }
    , { modifier = 19, skill = "persuasion" }
    ]
  , speeds =
    [ { feet = { kind = "literal", value = 30 }, kind = "walk" }
    , { feet = { kind = "literal", value = 60 }, kind = "fly" }
    ]
  , traits =
    [ { description =
          "If the pit fiend dies outside the Nine Hells, its body disappears in sulfurous smoke, and it gains a new body instantly, reviving with all its Hit Points somewhere in the Nine Hells."
      , name = "Diabolical Restoration"
      }
    , { description =
          "The pit fiend emanates an aura in a 20-foot Emanation while it doesn't have the Incapacitated condition. Wisdom Saving Throw: DC 21, any enemy that starts its turn in the aura. Failure: The target has the Frightened condition until the start of its next turn. Success: The target is immune to this pit fiend's aura for 24 hours."
      , name = "Fear Aura"
      }
    , { description =
          "If the pit fiend fails a saving throw, it can choose to succeed instead."
      , name = "Legendary Resistance (4/Day)"
      }
    , { description =
          "The pit fiend has Advantage on saving throws against spells and other magical effects."
      , name = "Magic Resistance"
      }
    ]
  }
}
