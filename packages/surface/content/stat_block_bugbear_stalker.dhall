let T = ./_stat_block_types.dhall
in  { challengeRating = 3
    , id = "stat_block_bugbear_stalker"
    , kind = "statBlock"
    , name = "Bugbear Stalker"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:1456-1491" }
    , statBlock =
        { abilityScores = { str = 17, dex = 14, con = 14, int = 11, wis = 12, cha = 11 }
        , ac = { value = { kind = "literal", value = 15 } }
        , actions =
            [ T.textOnly { procedureOrdinal = 1, name = "Multiattack", description = "The bugbear makes two Javelin or Morningstar attacks.", reason = "unsupported_action_shape" }
            , T.textOnly { procedureOrdinal = 2, name = "Javelin", description = "Melee or Ranged Attack Roll: +5, reach 10 ft. or range 30/120 ft. Hit: 13 (3d6 + 3) Piercing damage.", reason = "unsupported_action_shape" }
            , T.textOnly { procedureOrdinal = 3, name = "Morningstar", description = "Melee Attack Roll: +5 (with Advantage if the target is Grappled by the bugbear), reach 10 ft. Hit: 12 (2d8 + 3) Piercing damage.", reason = "unsupported_action_shape" }
            ]
        , bonusActions =
            [ T.textOnly { procedureOrdinal = 1, name = "Quick Grapple", description = "Dexterity Saving Throw: DC 13, one Medium or smaller creature the bugbear can see within 10 feet. Failure: The target has the Grappled condition (escape DC 13).", reason = "unsupported_action_shape" } ]
        , traits = [ T.trait { name = "Abduct", description = "The bugbear needn't spend extra movement to move a creature it is grappling.", effectKind = None Text } ]
        , alignment = { order = "chaotic", morality = "evil" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Common", "Goblin" ] } }
        , creatureType = "fey"
        , creatureTypeTags = [ "goblinoid" ]
        , gear = [ { item = "Chain Shirt", quantity = None Natural }, { item = "Javelins", quantity = Some 6 }, { item = "Morningstar", quantity = None Natural } ]
        , hp = { kind = "literal", value = 65 }
        , initiative = { modifier = +2, score = 12 }
        , passivePerception = 11
        , savingThrowModifiers = [ { ability = "str", modifier = +3 }, { ability = "dex", modifier = +2 }, { ability = "con", modifier = +4 }, { ability = "int", modifier = +0 }, { ability = "wis", modifier = +3 }, { ability = "cha", modifier = +0 } ]
        , senses = [ { kind = "darkvision", rangeFeet = 60, qualifier = None Text } ]
        , skillModifiers = [ { skill = "stealth", modifier = 6 }, { skill = "survival", modifier = 3 } ]
        , size = "medium"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 30 }, hover = None Bool } ]
        }
    }
