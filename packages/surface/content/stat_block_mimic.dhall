let T = ./_stat_block_types.dhall

in  { challengeRating = 2
    , id = "stat_block_mimic"
    , kind = "statBlock"
    , name = "Mimic"
    , provenance =
      { kind = "srd-5.2.1", section = "Monsters/Monsters-M-O.md:436-467" }
    , statBlock =
      { abilityScores =
        { str = 17, dex = 12, con = 15, int = 5, wis = 13, cha = 8 }
      , ac.value = { kind = "literal", value = 12 }
      , actions =
        [ T.textOnly
            { procedureOrdinal = 1
            , name = "Bite"
            , description =
                "Melee Attack Roll: +5 (with Advantage if the target is Grappled by the mimic), reach 5 ft. Hit: 7 (1d8 + 3) Piercing damage—or 12 (2d8 + 3) Piercing damage if the target is Grappled by the mimic—plus 4 (1d8) Acid damage."
            , reason = "unsupported_action_shape"
            }
        , T.textOnly
            { procedureOrdinal = 2
            , name = "Pseudopod"
            , description =
                "Melee Attack Roll: +5, reach 5 ft. Hit: 7 (1d8 + 3) Bludgeoning damage plus 4 (1d8) Acid damage. If the target is a Large or smaller creature, it has the Grappled condition (escape DC 13). Ability checks made to escape this grapple have Disadvantage."
            , reason = "unsupported_action_shape"
            }
        ]
      , bonusActions =
        [ T.textOnly
            { procedureOrdinal = 1
            , name = "Shape-Shift"
            , description =
                "The mimic shape-shifts to resemble a Medium or Small object while retaining its game statistics, or it returns to its true blob form. Any equipment it is wearing or carrying isn't transformed."
            , reason = "unsupported_action_shape"
            }
        ]
      , traits =
        [ T.trait
            { name = "Adhesive (Object Form Only)"
            , description =
                "The mimic adheres to anything that touches it. A Huge or smaller creature adhered to the mimic has the Grappled condition (escape DC 13). Ability checks made to escape this grapple have Disadvantage."
            , effectKind = None Text
            }
        ]
      , alignment = { order = "neutral", morality = "neutral" }
      , communication.kind = "none"
      , creatureType = "monstrosity"
      , hp = { kind = "literal", value = 58 }
      , initiative = { modifier = +3, score = 13 }
      , passivePerception = 11
      , skillModifiers = [ { skill = "stealth", modifier = +5 } ]
      , immunities =
        { conditions = Some [ "prone" ], damageTypes = Some [ "acid" ] }
      , senses =
        [ { kind = "darkvision", rangeFeet = 60, qualifier = None Text } ]
      , size = "medium"
      , speeds =
        [ { kind = "walk"
          , feet = { kind = "literal", value = 20 }
          , hover = None Bool
          }
        ]
      }
    }
