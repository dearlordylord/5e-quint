let T = ./_stat_block_types.dhall
in { challengeRating = 2
, id = "stat_block_ankheg"
, kind = "statBlock"
, name = "Ankheg"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:180-207" }
, statBlock =
  { abilityScores = { cha = 6, con = 14, dex = 11, int = 1, str = 17, wis = 13 }
  , ac.value = { kind = "literal", value = 14 }
  , actions =
    [ T.textOnly { procedureOrdinal = 1, name = "Bite", description = "Melee Attack Roll: +5 (with Advantage if the target is Grappled by the ankheg), reach 5 ft. Hit: 10 (2d6 + 3) Slashing damage plus 3 (1d6) Acid damage. If the target is a Large or smaller creature, it has the Grappled condition (escape DC 13).", reason = "unsupported_action_shape" }
    , T.resourceExecutable { procedureOrdinal = 2, procedure = T.NonSpellProcedure.saveArea { name = "Acid Spray", ability = "dex", dc = 12, area = T.line { lengthFeet = 30, widthFeet = 5 }, onFail = T.damage { damageType = "acid", dice = 4, dieSize = 6, flat = None Integer, static = 14 }, onSuccess = { kind = "half_damage" } }, resourceOrdinals = { first = 1, rest = [] : List Natural } }
    ]
  , traits =
    [ T.trait { name = "Tunneler", description = "The ankheg can burrow through solid rock at half its Burrow Speed and leaves a 10-foot-diameter tunnel in its wake.", effectKind = None Text }
    ]
  , alignment = "unaligned"
  , communication.kind = "none"
  , creatureType = "monstrosity"
  , hp = { kind = "literal", value = 45 }
  , initiative = { modifier = 0, score = 10 }
  , passivePerception = 11
  , savingThrowModifiers =
    [ { ability = "str", modifier = +3 }
    , { ability = "dex", modifier = +0 }
    , { ability = "con", modifier = +2 }
    , { ability = "int", modifier = -5 }
    , { ability = "wis", modifier = +1 }
    , { ability = "cha", modifier = -2 }
    ]
  , senses =
    [ { kind = "darkvision", rangeFeet = 60 }
    , { kind = "tremorsense", rangeFeet = 60 }
    ]
  , size = "large"
  , speeds =
    [ { feet = { kind = "literal", value = 30 }, kind = "walk" }
    , { feet = { kind = "literal", value = 10 }, kind = "burrow" }
    ]
  , resources =
    [ { limit = { kind = "recharge", minimumRoll = 6 }
      , ordinal = 1
      , ownership = "shared"
      }
    ]
  }
}
