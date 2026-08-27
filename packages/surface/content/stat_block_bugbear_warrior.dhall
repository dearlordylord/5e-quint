let T = ./_stat_block_types.dhall
in  { challengeRating = 1
    , id = "stat_block_bugbear_warrior"
    , kind = "statBlock"
    , name = "Bugbear Warrior"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:1495-1526" }
    , statBlock =
        { abilityScores = { str = 15, dex = 14, con = 13, int = 8, wis = 11, cha = 9 }
        , ac = { value = { kind = "literal", value = 14 } }
        , actions =
            [ T.textOnly { procedureOrdinal = 1, name = "Grab", description = "Melee Attack Roll: +4, reach 10 ft. Hit: 9 (2d6 + 2) Bludgeoning damage. If the target is a Medium or smaller creature, it has the Grappled condition (escape DC 12).", reason = "unsupported_action_shape" }
            , T.textOnly { procedureOrdinal = 2, name = "Light Hammer", description = "Melee or Ranged Attack Roll: +4 (with Advantage if the target is Grappled by the bugbear), reach 10 ft. or range 20/60 ft. Hit: 9 (3d4 + 2) Bludgeoning damage.", reason = "unsupported_action_shape" }
            ]
        , traits = [ T.trait { name = "Abduct", description = "The bugbear needn't spend extra movement to move a creature it is grappling.", effectKind = None Text } ]
        , alignment = { order = "chaotic", morality = "evil" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Common", "Goblin" ] } }
        , creatureType = "fey"
        , creatureTypeTags = [ "goblinoid" ]
        , gear = [ { item = "Hide Armor", quantity = None Natural }, { item = "Light Hammers", quantity = Some 3 } ]
        , hp = { kind = "literal", value = 33 }
        , initiative = { modifier = +2, score = 12 }
        , passivePerception = 10
        , savingThrowModifiers = [ { ability = "str", modifier = +2 }, { ability = "dex", modifier = +2 }, { ability = "con", modifier = +1 }, { ability = "int", modifier = -1 }, { ability = "wis", modifier = +0 }, { ability = "cha", modifier = -1 } ]
        , senses = [ { kind = "darkvision", rangeFeet = 60, qualifier = None Text } ]
        , skillModifiers = [ { skill = "stealth", modifier = 6 }, { skill = "survival", modifier = 2 } ]
        , size = "medium"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 30 }, hover = None Bool } ]
        }
    }
