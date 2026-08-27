let T = ./_stat_block_types.dhall
in  { challengeRating = 0.25
    , id = "stat_block_dretch"
    , kind = "statBlock"
    , name = "Dretch"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-C-D.md:827-850" }
    , statBlock =
        { abilityScores = { str = 12, dex = 11, con = 12, int = 5, wis = 8, cha = 3 }
        , ac = { value = { kind = "literal", value = 11 } }
        , actions =
            [ T.executable { procedureOrdinal = 1, procedure = T.meleeAttack { name = "Rend", attackAbility = "str", attackBonus = +3, reachFeet = 5, onHit = { first = T.damage { damageType = "slashing", dice = 1, dieSize = 6, flat = (Some +1), static = 4 }, rest = [] : List T.Effect } } }
            , T.resourceTextOnly { procedureOrdinal = 2, name = "Fetid Cloud (1/Day)", description = "Constitution Saving Throw: DC 11, each creature in a 10-foot Emanation originating from the dretch. Failure: The target has the Poisoned condition until the end of its next turn. While Poisoned, the creature can take either an action or a Bonus Action on its turn, not both, and it can't take Reactions.", reason = "unsupported_action_shape", resourceOrdinals = { first = 1, rest = [] : List Natural } }
            ]
        , alignment = { order = "chaotic", morality = "evil" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Abyssal" ] }, telepathy = Some { rangeFeet = 60, response = None Text, requiresLanguageUnderstanding = Some { kind = "named", languages = [ "Abyssal" ] } } }
        , creatureType = "fiend"
        , creatureTypeTags = [ "demon" ]
        , hp = { kind = "literal", value = 18 }
        , initiative = { modifier = +0, score = 10 }
        , passivePerception = 9
        , savingThrowModifiers = [ { ability = "str", modifier = +1 }, { ability = "dex", modifier = +0 }, { ability = "con", modifier = +1 }, { ability = "int", modifier = -3 }, { ability = "wis", modifier = -1 }, { ability = "cha", modifier = -4 } ]
        , resistances = { kind = "fixed", damageTypes = [ "cold", "fire", "lightning" ] }
        , immunities = { conditions = Some [ "poisoned" ], damageTypes = Some [ "poison" ] }
        , senses = [ { kind = "darkvision", rangeFeet = 60, qualifier = None Text } ]
        , size = "small"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 20 }, hover = None Bool } ]
        , resources = [ T.resource { ordinal = 1, ownership = "shared", limit = (T.daily { uses = 1 }) } ]
        }
    }
