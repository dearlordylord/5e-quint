let T = ./_stat_block_types.dhall
in  { challengeRating = 17
    , id = "stat_block_dragon_turtle"
    , kind = "statBlock"
    , name = "Dragon Turtle"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-C-D.md:793-823" }
    , statBlock =
        { abilityScores = { str = 25, dex = 10, con = 20, int = 10, wis = 12, cha = 12 }
        , ac = { value = { kind = "literal", value = 20 } }
        , actions =
            [ T.text 1 "Multiattack" "The dragon makes three Bite attacks. It can replace one attack with a Tail attack." "unsupported_action_shape"
            , T.exec 2 (T.attack "Bite" "melee" "str" +13 (Some 15) (None T.Range) (None Text) [ T.damage "piercing" 3 10 (Some +7) 23, T.damage "fire" 2 6 (None Integer) 7 ] (Some "Being underwater doesn't grant Resistance to this Fire damage."))
            , T.exec 3 (T.attack "Tail" "melee" "str" +13 (Some 15) (None T.Range) (None Text) [ T.damage "bludgeoning" 2 10 (Some +7) 18, T.conditionIfSize "prone" "huge" ] (None Text))
            , T.execSome 4 (T.save "Steam Breath" "con" 19 (T.cone 60) (T.damage "fire" 16 6 (None Integer) 56) { kind = "half_damage" } (Some "Being underwater doesn't grant Resistance to this Fire damage.")) [ 1 ]
            ]
        , traits = [ T.trait "Amphibious" "The dragon can breathe air and water." ]
        , alignment = { order = "neutral", morality = "neutral" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Draconic", "Primordial (Aquan)" ] } }
        , creatureType = "dragon"
        , hp = { kind = "literal", value = 356 }
        , initiative = { modifier = +6, score = 16 }
        , passivePerception = 11
        , savingThrowModifiers = [ { ability = "str", modifier = +7 }, { ability = "dex", modifier = +0 }, { ability = "con", modifier = +11 }, { ability = "int", modifier = +0 }, { ability = "wis", modifier = +7 }, { ability = "cha", modifier = +1 } ]
        , resistances = { kind = "fixed", damageTypes = [ "fire" ] }
        , senses = [ { kind = "darkvision", rangeFeet = 120, qualifier = None Text } ]
        , size = "gargantuan"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 20 }, hover = None Bool }, { kind = "swim", feet = { kind = "literal", value = 50 }, hover = None Bool } ]
        , resources = [ T.resource 1 "shared" (T.recharge 5) ]
        }
    }
