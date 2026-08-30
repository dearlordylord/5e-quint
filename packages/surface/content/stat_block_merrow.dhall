let T = ./_stat_block_types.dhall

in  { challengeRating = 2
    , id = "stat_block_merrow"
    , kind = "statBlock"
    , name = "Merrow"
    , provenance =
      { kind = "srd-5.2.1", section = "Monsters/Monsters-M-O.md:401-432" }
    , statBlock =
      { abilityScores =
        { str = 18, dex = 15, con = 15, int = 8, wis = 10, cha = 9 }
      , ac.value = { kind = "literal", value = 13 }
      , actions =
        [ T.textOnly
            { procedureOrdinal = 1
            , name = "Multiattack"
            , description =
                "The merrow makes two attacks, using Bite, Claw, or Harpoon in any combination."
            , reason = "unsupported_action_shape"
            }
        , T.textOnly
            { procedureOrdinal = 2
            , name = "Bite"
            , description =
                "Melee Attack Roll: +6, reach 5 ft. Hit: 6 (1d4 + 4) Piercing damage plus the target has the Poisoned condition until the end of the merrow's next turn."
            , reason = "unsupported_action_shape"
            }
        , T.executable
            { procedureOrdinal = 3
            , procedure =
                T.meleeAttack
                  { name = "Claw"
                  , attackAbility = "str"
                  , attackBonus = +6
                  , reachFeet = 5
                  , onHit =
                    { first =
                        T.damage
                          { damageType = "slashing"
                          , dice = 2
                          , dieSize = 4
                          , flat = Some +4
                          , static = 9
                          }
                    , rest = [] : List T.Effect
                    }
                  }
            }
        , T.textOnly
            { procedureOrdinal = 4
            , name = "Harpoon"
            , description =
                "Melee or Ranged Attack Roll: +6, reach 5 ft. or range 20/60 ft. Hit: 11 (2d6 + 4) Piercing damage. If the target is a Large or smaller creature, the merrow pulls the target up to 15 feet straight toward itself."
            , reason = "unsupported_action_shape"
            }
        ]
      , traits =
        [ T.trait
            { name = "Amphibious"
            , description = "The merrow can breathe air and water."
            , effectKind = None Text
            }
        ]
      , alignment = { order = "chaotic", morality = "evil" }
      , communication =
        { kind = "spoken_and_understood"
        , languages =
          { kind = "named", languages = [ "Abyssal", "Primordial (Aquan)" ] }
        }
      , creatureType = "monstrosity"
      , hp = { kind = "literal", value = 45 }
      , initiative = { modifier = +2, score = 12 }
      , passivePerception = 10
      , savingThrowModifiers =
        [ { ability = "cha", modifier = -1 }
        , { ability = "con", modifier = +2 }
        , { ability = "dex", modifier = +2 }
        , { ability = "int", modifier = -1 }
        , { ability = "str", modifier = +4 }
        , { ability = "wis", modifier = +0 }
        ]
      , senses =
        [ { kind = "darkvision", rangeFeet = 60, qualifier = None Text } ]
      , size = "large"
      , speeds =
        [ { kind = "walk"
          , feet = { kind = "literal", value = 10 }
          , hover = None Bool
          }
        , { kind = "swim"
          , feet = { kind = "literal", value = 40 }
          , hover = None Bool
          }
        ]
      }
    }
