let T = ./_stat_block_types.dhall
in  { challengeRating = 0.5
    , id = "stat_block_darkmantle"
    , kind = "statBlock"
    , name = "Darkmantle"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-C-D.md:612-638" }
    , statBlock =
        { abilityScores = { str = 16, dex = 12, con = 13, int = 2, wis = 10, cha = 5 }
        , ac = { value = { kind = "literal", value = 11 } }
        , actions =
            [ T.text 1 "Crush" "Melee Attack Roll: +5, reach 5 ft. Hit: 6 (1d6 + 3) Bludgeoning damage, and the darkmantle attaches to the target. If the target is a Medium or smaller creature and the darkmantle had Advantage on the attack roll, it covers the target, which has the Blinded condition and is suffocating while the darkmantle is attached in this way. While attached to a target, the darkmantle can attack only the target but has Advantage on its attack rolls. Its Speed becomes 0, it can't benefit from any bonus to its Speed, and it moves with the target. A creature can take an action to try to detach the darkmantle from itself, doing so with a successful DC 13 Strength (Athletics) check. On its turn, the darkmantle can detach itself by using 5 feet of movement." "unsupported_action_shape"
            , T.textSome 2 "Darkness Aura (1/Day)" "Magical Darkness fills a 15-foot Emanation originating from the darkmantle. This effect lasts while the darkmantle maintains Concentration on it, up to 10 minutes. Darkvision can't penetrate this area, and no light can illuminate it." "unsupported_action_shape" [ 1 ]
            ]
        , alignment = "unaligned"
        , communication = { kind = "none" }
        , creatureType = "aberration"
        , hp = { kind = "literal", value = 22 }
        , initiative = { modifier = +3, score = 13 }
        , passivePerception = 10
        , savingThrowModifiers = [ { ability = "str", modifier = +3 }, { ability = "dex", modifier = +1 }, { ability = "con", modifier = +1 }, { ability = "int", modifier = -4 }, { ability = "wis", modifier = +0 }, { ability = "cha", modifier = -3 } ]
        , senses = [ { kind = "blindsight", rangeFeet = 60, qualifier = None Text } ]
        , skillModifiers = [ { skill = "stealth", modifier = 3 } ]
        , size = "small"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 10 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 30 }, hover = None Bool } ]
        , resources = [ T.resource 1 "shared" (T.daily 1) ]
        }
    }
