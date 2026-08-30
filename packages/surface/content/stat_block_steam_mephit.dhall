let T = ./_stat_block_types.dhall

in  { challengeRating = 0.25
    , id = "stat_block_steam_mephit"
    , kind = "statBlock"
    , name = "Steam Mephit"
    , provenance =
      { kind = "srd-5.2.1", section = "Monsters/Monsters-M-O.md:341-370" }
    , statBlock =
      { abilityScores =
        { str = 5, dex = 11, con = 10, int = 11, wis = 10, cha = 12 }
      , ac.value = { kind = "literal", value = 10 }
      , actions =
        [ T.textOnly
            { procedureOrdinal = 1
            , name = "Claw"
            , description =
                "Melee Attack Roll: +2, reach 5 ft. Hit: 2 (1d4) Slashing damage plus 2 (1d4) Fire damage."
            , reason = "unsupported_action_shape"
            }
        , T.resourceTextOnly
            { procedureOrdinal = 2
            , name = "Steam Breath (Recharge 6)"
            , description =
                "Constitution Saving Throw: DC 10, each creature in a 15-foot Cone. Failure: 5 (2d4) Fire damage, and the target's Speed decreases by 10 feet until the end of the mephit's next turn. Success: Half damage only. Failure or Success: Being underwater doesn't grant Resistance to this Fire damage."
            , reason = "unsupported_action_shape"
            , resourceOrdinals = { first = 1, rest = [] : List Natural }
            }
        ]
      , traits =
        [ T.trait
            { name = "Blurred Form"
            , description =
                "Attack rolls against the mephit are made with Disadvantage unless the mephit has the Incapacitated condition."
            , effectKind = None Text
            }
        , T.trait
            { name = "Death Burst"
            , description =
                "The mephit explodes when it dies. Dexterity Saving Throw: DC 10, each creature in a 5-foot Emanation originating from the mephit. Failure: 5 (2d4) Fire damage. Success: Half damage."
            , effectKind = None Text
            }
        ]
      , alignment = { order = "neutral", morality = "evil" }
      , communication =
        { kind = "spoken_and_understood"
        , languages =
          { kind = "named", languages = [ "Primordial (Aquan, Ignan)" ] }
        }
      , creatureType = "elemental"
      , hp = { kind = "literal", value = 17 }
      , initiative = { modifier = +0, score = 10 }
      , passivePerception = 10
      , skillModifiers = [ { skill = "stealth", modifier = +2 } ]
      , immunities =
        { conditions = Some [ "exhaustion", "poisoned" ]
        , damageTypes = Some [ "fire", "poison" ]
        }
      , senses =
        [ { kind = "darkvision", rangeFeet = 60, qualifier = None Text } ]
      , size = "small"
      , speeds =
        [ { kind = "walk"
          , feet = { kind = "literal", value = 30 }
          , hover = None Bool
          }
        , { kind = "fly"
          , feet = { kind = "literal", value = 30 }
          , hover = None Bool
          }
        ]
      , resources =
        [ T.resource
            { ordinal = 1
            , ownership = "shared"
            , limit = T.recharge { minimumRoll = 6 }
            }
        ]
      }
    }
