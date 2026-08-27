let T = ./_stat_block_types.dhall
in  { challengeRating = 4
    , id = "stat_block_black_pudding"
    , kind = "statBlock"
    , name = "Black Pudding"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:828-866" }
    , statBlock =
        { abilityScores = { str = 16, dex = 5, con = 16, int = 1, wis = 6, cha = 1 }
        , ac = { value = { kind = "literal", value = 7 } }
        , actions =
            [ T.textOnly { procedureOrdinal = 1, name = "Dissolving Pseudopod", description = "Melee Attack Roll: +5, reach 10 ft. Hit: 17 (4d6 + 3) Acid damage. Nonmagical armor worn by the target takes a −1 penalty to the AC it offers. The armor is destroyed if the penalty reduces its AC to 10. The penalty can be removed by casting the Mending spell on the armor.", reason = "unsupported_action_shape" }
            ]
        , reactions =
            [ T.textOnly { procedureOrdinal = 1, name = "Split", description = "Trigger: While the pudding is Large or Medium and has 10+ Hit Points, it becomes Bloodied or is subjected to Lightning or Slashing damage. Response: The pudding splits into two new Black Puddings. Each new pudding is one size smaller than the original pudding and acts on its Initiative. The original pudding's Hit Points are divided evenly between the new puddings (round down).", reason = "unsupported_action_shape" }
            ]
        , traits =
            [ T.trait { name = "Amorphous", description = "The pudding can move through a space as narrow as 1 inch without expending extra movement to do so.", effectKind = None Text }
            , T.trait { name = "Corrosive Form", description = "A creature that hits the pudding with a melee attack roll takes 4 (1d8) Acid damage. Nonmagical ammunition is destroyed immediately after hitting the pudding and dealing any damage. Any nonmagical weapon takes a cumulative −1 penalty to attack rolls immediately after dealing damage to the pudding and coming into contact with it. The weapon is destroyed if the penalty reaches −5. The penalty can be removed by casting the Mending spell on the weapon. In 1 minute, the pudding can eat through 2 feet of nonmagical wood or metal.", effectKind = None Text }
            , T.trait { name = "Spider Climb", description = "The pudding can climb difficult surfaces, including along ceilings, without needing to make an ability check.", effectKind = None Text }
            ]
        , alignment = "unaligned"
        , communication = { kind = "none" }
        , creatureType = "ooze"
        , hp = { kind = "literal", value = 68 }
        , immunities = { conditions = Some [ "charmed", "deafened", "exhaustion", "frightened", "grappled", "prone", "restrained" ], damageTypes = Some [ "acid", "cold", "lightning", "slashing" ] }
        , initiative = { modifier = -3, score = 7 }
        , passivePerception = 8
        , savingThrowModifiers = [ { ability = "str", modifier = +3 }, { ability = "dex", modifier = -3 }, { ability = "con", modifier = +3 }, { ability = "int", modifier = -5 }, { ability = "wis", modifier = -2 }, { ability = "cha", modifier = -5 } ]
        , senses = [ { kind = "blindsight", rangeFeet = 60, qualifier = None Text } ]
        , size = "large"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 20 }, hover = None Bool }, { kind = "climb", feet = { kind = "literal", value = 20 }, hover = None Bool } ]
        }
    }
