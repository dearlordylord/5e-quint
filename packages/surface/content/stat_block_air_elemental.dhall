{ challengeRating = 5
, id = "stat_block_air_elemental"
, kind = "statBlock"
, name = "Air Elemental"
, provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:61-92" }
, statBlock =
  { abilityScores = { cha = 6, con = 14, dex = 20, int = 6, str = 14, wis = 10 }
  , ac.value = { kind = "literal", value = 15 }
  , actions =
    [ { description = None Text, kind = "executable", name = None Text, procedure = Some { ability = None Text, attackAbility = None Text, attackBonus = None { kind : Text, value : Integer }, attackType = None Text, components = None { m : Bool, s : Bool, v : Bool }, description = None Text, dispatches = Some [ { count = { kind = "literal", value = 2 }, procedureOrdinal = 2 } ], groups = None (List { kind : Text, resourceRefs : { kind : Text, ordinals : Optional (List Natural) }, spells : List { restriction : Text, spellId : Text } }), kind = "multiattack", name = "Multiattack", onHit = None (List { amount : { expr : Optional { abilityModifier : Optional Text, dice : Natural, dieSize : Natural, flat : Optional Integer, spellcastingMod : Optional Bool }, kind : Text, static : Natural }, damageType : Text, kind : Text }), reachFeet = None Natural }, procedureOrdinal = 1, reason = None Text, resourceRefs = { kind = "none", ordinals = None (List Natural) } }
    , { description = None Text, kind = "executable", name = None Text, procedure = Some { ability = None Text, attackAbility = Some "dex", attackBonus = Some { kind = "literal", value = +8 }, attackType = Some "melee", components = None { m : Bool, s : Bool, v : Bool }, description = None Text, dispatches = None (List { count : { kind : Text, value : Natural }, procedureOrdinal : Natural }), groups = None (List { kind : Text, resourceRefs : { kind : Text, ordinals : Optional (List Natural) }, spells : List { restriction : Text, spellId : Text } }), kind = "attack_roll", name = "Thunderous Slam", onHit = Some [ { amount = { expr = Some { abilityModifier = None Text, dice = 2, dieSize = 8, flat = Some +5, spellcastingMod = None Bool }, kind = "fixed", static = 14 }, damageType = "thunder", kind = "damage" } ], reachFeet = Some 10 }, procedureOrdinal = 2, reason = None Text, resourceRefs = { kind = "none", ordinals = None (List Natural) } }
    , { description = Some "Whirlwind (Recharge 4–6). Strength Saving Throw: DC 13, one Medium or smaller creature in the elemental's space. Failure: 24 (4d10 + 2) Thunder damage, and the target is pushed up to 20 feet straight away from the elemental and has the Prone condition. Success: Half damage only.", kind = "textOnly", name = Some "Whirlwind", procedure = None { ability : Optional Text, attackAbility : Optional Text, attackBonus : Optional { kind : Text, value : Integer }, attackType : Optional Text, components : Optional { m : Bool, s : Bool, v : Bool }, description : Optional Text, dispatches : Optional (List { count : { kind : Text, value : Natural }, procedureOrdinal : Natural }), groups : Optional (List { kind : Text, resourceRefs : { kind : Text, ordinals : Optional (List Natural) }, spells : List { restriction : Text, spellId : Text } }), kind : Text, name : Text, onHit : Optional (List { amount : { expr : Optional { abilityModifier : Optional Text, dice : Natural, dieSize : Natural, flat : Optional Integer, spellcastingMod : Optional Bool }, kind : Text, static : Natural }, damageType : Text, kind : Text }), reachFeet : Optional Natural }, procedureOrdinal = 3, reason = Some "unsupported_action_shape", resourceRefs = { kind = "some", ordinals = Some [ 1 ] } }
    ]
  , alignment = { morality = "neutral", order = "neutral" }
  , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Primordial (Auran)" ] } }
  , creatureType = "elemental"
  , hp = { kind = "literal", value = 90 }
  , immunities = { conditions = [ "exhaustion", "grappled", "paralyzed", "petrified", "poisoned", "prone", "restrained", "unconscious" ], damageTypes = [ "poison", "thunder" ] }
  , initiative = { modifier = 5, score = 15 }
  , passivePerception = 10
  , resistances = { damageTypes = [ "bludgeoning", "lightning", "piercing", "slashing" ], kind = "fixed" }
  , savingThrowModifiers = [ { ability = "str", modifier = +2 }, { ability = "dex", modifier = +5 }, { ability = "con", modifier = +2 }, { ability = "int", modifier = -2 }, { ability = "wis", modifier = +0 }, { ability = "cha", modifier = -2 } ]
  , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
  , size = "large"
  , speeds = [ { feet = { kind = "literal", value = 10 }, hover = None Bool, kind = "walk" }, { feet = { kind = "literal", value = 90 }, hover = Some True, kind = "fly" } ]
  , resources = [ { limit = { kind = "recharge", minimumRoll = 4 }, ordinal = 1, ownership = "each" } ]
  }
}
