{ challengeRating = 1
, id = "stat_block_animated_armor"
, kind = "statBlock"
, name = "Animated Armor"
, provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:98-123" }
, statBlock =
  { abilityScores = { cha = 1, con = 13, dex = 11, int = 1, str = 14, wis = 3 }
  , ac.value = { kind = "literal", value = 18 }
  , actions =
    [ { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some { ability = None Text, attackAbility = None Text, attackBonus = None { kind : Text, value : Integer }, attackType = None Text, components = None { m : Bool, s : Bool, v : Bool }, description = None Text, dispatches = Some [ { count = { kind = "literal", value = 2 }, procedureOrdinal = 2 } ], groups = None (List { kind : Text, resourceRefs : { kind : Text, ordinals : Optional (List Natural) }, spells : List { restriction : Text, spellId : Text } }), kind = "multiattack", name = "Multiattack", onHit = None (List { amount : { expr : Optional { abilityModifier : Optional Text, dice : Natural, dieSize : Natural, flat : Optional Integer, spellcastingMod : Optional Bool }, kind : Text, static : Natural }, damageType : Text, kind : Text }), reachFeet = None Natural }
      , procedureOrdinal = 1
      , reason = None Text
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some { ability = None Text, attackAbility = Some "str", attackBonus = Some { kind = "literal", value = +4 }, attackType = Some "melee", components = None { m : Bool, s : Bool, v : Bool }, description = None Text, dispatches = None (List { count : { kind : Text, value : Natural }, procedureOrdinal : Natural }), groups = None (List { kind : Text, resourceRefs : { kind : Text, ordinals : Optional (List Natural) }, spells : List { restriction : Text, spellId : Text } }), kind = "attack_roll", name = "Slam", onHit = Some [ { amount = { expr = Some { abilityModifier = None Text, dice = 1, dieSize = 6, flat = Some +2, spellcastingMod = None Bool }, kind = "fixed", static = 5 }, damageType = "bludgeoning", kind = "damage" } ], reachFeet = Some 5 }
      , procedureOrdinal = 2
      , reason = None Text
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    ]
  , alignment = "unaligned"
  , communication = { kind = "none" }
  , creatureType = "construct"
  , hp = { kind = "literal", value = 33 }
  , immunities = { conditions = [ "charmed", "deafened", "exhaustion", "frightened", "paralyzed", "petrified", "poisoned" ], damageTypes = [ "poison", "psychic" ] }
  , initiative = { modifier = 2, score = 12 }
  , passivePerception = 6
  , savingThrowModifiers = [ { ability = "str", modifier = +2 }, { ability = "dex", modifier = +0 }, { ability = "con", modifier = +1 }, { ability = "int", modifier = -5 }, { ability = "wis", modifier = -4 }, { ability = "cha", modifier = -5 } ]
  , senses = [ { kind = "blindsight", rangeFeet = 60 } ]
  , size = "medium"
  , speeds = [ { feet = { kind = "literal", value = 25 }, kind = "walk" } ]
  }
}
