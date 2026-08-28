let T = ./_stat_block_types.dhall

in  { challengeRating = 16
    , id = "stat_block_marilith"
    , kind = "statBlock"
    , name = "Marilith"
    , provenance =
      { kind = "srd-5.2.1", section = "Monsters/Monsters-M-O.md:155-199" }
    , statBlock =
      { abilityScores =
        { str = 18, dex = 20, con = 20, int = 18, wis = 16, cha = 20 }
      , ac.value = { kind = "literal", value = 16 }
      , actions =
        [ T.textOnly
            { procedureOrdinal = 1
            , name = "Multiattack"
            , description =
                "The marilith makes six Pact Blade attacks and uses Constrict."
            , reason = "unsupported_action_shape"
            }
        , T.textOnly
            { procedureOrdinal = 2
            , name = "Pact Blade"
            , description =
                "Melee Attack Roll: +10, reach 5 ft. Hit: 10 (1d10 + 5) Slashing damage plus 7 (2d6) Necrotic damage."
            , reason = "unsupported_action_shape"
            }
        , T.textOnly
            { procedureOrdinal = 3
            , name = "Constrict"
            , description =
                "Strength Saving Throw: DC 17, one Medium or smaller creature the marilith can see within 5 feet. Failure: 15 (2d10 + 4) Bludgeoning damage. The target has the Grappled condition (escape DC 14), and it has the Restrained condition until the grapple ends."
            , reason = "unsupported_action_shape"
            }
        ]
      , bonusActions =
        [ T.resourceTextOnly
            { procedureOrdinal = 1
            , name = "Teleport (Recharge 5–6)"
            , description =
                "The marilith teleports up to 120 feet to an unoccupied space it can see."
            , reason = "unsupported_action_shape"
            , resourceOrdinals = { first = 1, rest = [] : List Natural }
            }
        ]
      , reactions =
        [ T.textOnly
            { procedureOrdinal = 1
            , name = "Parry"
            , description =
                "Trigger: The marilith is hit by a melee attack roll while holding a weapon. Response: The marilith adds 5 to its AC against that attack, possibly causing it to miss."
            , reason = "unsupported_action_shape"
            }
        ]
      , traits =
        [ T.trait
            { name = "Demonic Restoration"
            , description =
                "If the marilith dies outside the Abyss, its body dissolves into ichor, and it gains a new body instantly, reviving with all its Hit Points somewhere in the Abyss."
            , effectKind = None Text
            }
        , T.trait
            { name = "Magic Resistance"
            , description =
                "The marilith has Advantage on saving throws against spells and other magical effects."
            , effectKind = None Text
            }
        , T.trait
            { name = "Reactive"
            , description =
                "The marilith can take one Reaction on every turn of combat."
            , effectKind = None Text
            }
        ]
      , alignment = { order = "chaotic", morality = "evil" }
      , communication =
        { kind = "spoken_and_understood"
        , languages = { kind = "named", languages = [ "Abyssal" ] }
        , telepathy = Some
          { rangeFeet = 120
          , response = None Text
          , requiresLanguageUnderstanding =
              None { kind : Text, languages : List Text }
          }
        }
      , creatureType = "fiend"
      , creatureTypeTags = [ "demon" ]
      , hp = { kind = "literal", value = 220 }
      , initiative = { modifier = +10, score = 20 }
      , passivePerception = 18
      , savingThrowModifiers =
        [ { ability = "cha", modifier = +10 }
        , { ability = "con", modifier = +10 }
        , { ability = "dex", modifier = +5 }
        , { ability = "int", modifier = +4 }
        , { ability = "str", modifier = +9 }
        , { ability = "wis", modifier = +8 }
        ]
      , skillModifiers = [ { skill = "perception", modifier = +8 } ]
      , resistances =
        { kind = "fixed", damageTypes = [ "cold", "fire", "lightning" ] }
      , immunities =
        { conditions = Some [ "poisoned" ], damageTypes = Some [ "poison" ] }
      , senses =
        [ { kind = "truesight", rangeFeet = 120, qualifier = None Text } ]
      , size = "large"
      , speeds =
        [ { kind = "walk"
          , feet = { kind = "literal", value = 40 }
          , hover = None Bool
          }
        , { kind = "climb"
          , feet = { kind = "literal", value = 40 }
          , hover = None Bool
          }
        ]
      , resources =
        [ T.resource
            { ordinal = 1
            , ownership = "shared"
            , limit = T.recharge { minimumRoll = 5 }
            }
        ]
      }
    }
