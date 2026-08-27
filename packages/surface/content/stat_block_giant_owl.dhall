let S = ./_stat_block_types.dhall

in  { challengeRating = 0.25
    , id = "stat_block_giant_owl"
    , kind = "statBlock"
    , name = "Giant Owl"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:1085-1115" }
    , statBlock =
      { abilityScores =
        { cha = 10, con = 12, dex = 15, int = 10, str = 13, wis = 14 }
      , ac.value = { kind = "literal", value = 12 }
      , actions =
        [ S.executable
            { procedureOrdinal = 1
            , procedure =
                S.meleeAttack
                  { name = "Talons"
                  , attackAbility = "dex"
                  , attackBonus = +4
                  , reachFeet = 5
                  , onHit =
                    [ S.damage
                        { damageType = "slashing"
                        , dice = 1
                        , dieSize = 10
                        , flat = Some +2
                        , static = 7
                        }
                    ]
                  }
            }
        , S.resourceTextOnly
            { procedureOrdinal = 2
            , name = "Spellcasting"
            , description =
                ''
                The owl casts one of the following spells, requiring no spell components and using Wisdom as the spellcasting ability:

                At Will: *Detect Evil and Good*, *Detect Magic*
                1/Day: *Clairvoyance*''
            , reason = "unsupported_procedure_family"
            , resourceOrdinals = [ 1 ]
            }
        ]
      , alignment = { morality = "neutral", order = "neutral" }
      , communication =
        { kind = "understood_but_cannot_speak"
        , languages =
          { kind = "named"
          , languages = [ "Celestial", "Common", "Elvish", "Sylvan" ]
          }
        }
      , creatureType = "celestial"
      , hp = { kind = "literal", value = 19 }
      , initiative = { modifier = +2, score = 12 }
      , passivePerception = 16
      , resistances =
        { damageTypes = [ "necrotic", "radiant" ], kind = "fixed" }
      , savingThrowModifiers =
        [ { ability = "str", modifier = +1 }
        , { ability = "dex", modifier = +2 }
        , { ability = "con", modifier = +1 }
        , { ability = "int", modifier = +0 }
        , { ability = "wis", modifier = +4 }
        , { ability = "cha", modifier = +0 }
        ]
      , senses = [ { kind = "darkvision", rangeFeet = 120 } ]
      , size = "large"
      , skillModifiers =
        [ { modifier = +6, skill = "perception" }
        , { modifier = +6, skill = "stealth" }
        ]
      , speeds =
        [ { feet = { kind = "literal", value = 5 }, kind = "walk" }
        , { feet = { kind = "literal", value = 60 }, kind = "fly" }
        ]
      , traits =
        [ S.trait
            { name = "Flyby"
            , description =
                "The owl doesn't provoke an Opportunity Attack when it flies out of an enemy's reach."
            , effectKind = None Text
            }
        ]
      , resources =
        [ S.resource
            { ordinal = 1, ownership = "shared", limit = S.daily { uses = 1 } }
        ]
      }
    }
