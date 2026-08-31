{ challengeRating = 4
, id = "stat_block_wereboar"
, kind = "statBlock"
, name = "Wereboar"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-T-Z.md:762-794" }
, statBlock =
  { abilityScores =
    { cha = 8, con = 15, dex = 10, int = 10, str = 17, wis = 11 }
  , ac.value = { kind = "literal", value = 15 }
  , actions =
    [ { description =
          "The wereboar makes two attacks, using Javelin or Tusk in any combination. It can replace one attack with a Gore attack."
      , kind = "textOnly"
      , name = "Multiattack"
      , procedureOrdinal = 1
      , reason = "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    , { description =
          "Melee Attack Roll: +5, reach 5 ft. Hit: 12 (2d8 + 3) Piercing damage. If the target is a Humanoid, it is subjected to the following effect. Constitution Saving Throw: DC 12. Failure: The target is cursed. If the cursed target drops to 0 Hit Points, it instead becomes a Wereboar under the GM's control and has 10 Hit Points. Success: The target is immune to this wereboar's curse for 24 hours."
      , kind = "textOnly"
      , name = "Gore (Boar or Hybrid Form Only)"
      , procedureOrdinal = 2
      , reason = "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    , { description =
          "Melee or Ranged Attack Roll: +5, reach 5 ft. or range 30/120 ft. Hit: 13 (3d6 + 3) Piercing damage."
      , kind = "textOnly"
      , name = "Javelin (Humanoid or Hybrid Form Only)"
      , procedureOrdinal = 3
      , reason = "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    , { description =
          "Melee Attack Roll: +5, reach 5 ft. Hit: 10 (2d6 + 3) Piercing damage. If the target is a Medium or smaller creature and the wereboar moved 20+ feet straight toward it immediately before the hit, the target takes an extra 7 (2d6) Piercing damage and has the Prone condition."
      , kind = "textOnly"
      , name = "Tusk (Boar or Hybrid Form Only)"
      , procedureOrdinal = 4
      , reason = "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = { morality = "evil", order = "neutral" }
  , bonusActions =
    [ { description =
          "The wereboar shape-shifts into a Medium boar-humanoid hybrid or a Small boar, or it returns to its true humanoid form. Its game statistics, other than its size, are the same in each form. Any equipment it is wearing or carrying isn't transformed."
      , kind = "textOnly"
      , name = "Shape-Shift"
      , procedureOrdinal = 1
      , reason = "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    ]
  , communication =
    { kind = "spoken_and_understood"
    , languages =
      { kind = "named", languages = [ "Common (can't speak in boar form)" ] }
    }
  , creatureType = "monstrosity"
  , creatureTypeTags = [ "lycanthrope" ]
  , gear = [ { item = "Javelin", quantity = 6 } ]
  , hp = { kind = "literal", value = 97 }
  , initiative = { modifier = 2, score = 12 }
  , passivePerception = 12
  , savingThrowModifiers =
    [ { ability = "cha", modifier = -1 }
    , { ability = "con", modifier = +2 }
    , { ability = "dex", modifier = +0 }
    , { ability = "int", modifier = +0 }
    , { ability = "str", modifier = +3 }
    , { ability = "wis", modifier = +0 }
    ]
  , size = { kind = "alternatives", options = [ "medium", "small" ] }
  , skillModifiers = [ { modifier = 2, skill = "perception" } ]
  , speeds =
    [ { availability = None { forms : List Text, kind : Text }
      , feet = { kind = "literal", value = 30 }
      , kind = "walk"
      }
    , { availability = Some { forms = [ "boar" ], kind = "forms_only" }
      , feet = { kind = "literal", value = 40 }
      , kind = "walk"
      }
    ]
  }
}
