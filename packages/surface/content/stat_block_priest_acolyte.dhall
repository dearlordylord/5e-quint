{ challengeRating = 0.25
, id = "stat_block_priest_acolyte"
, kind = "statBlock"
, name = "Priest Acolyte"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-P-S.md:221-251" }
, statBlock =
  { abilityScores =
    { cha = 11, con = 12, dex = 10, int = 10, str = 14, wis = 14 }
  , ac.value = { kind = "literal", value = 13 }
  , actions =
    [ { description = Some
          "Melee Attack Roll: +4, reach 5 ft. Hit: 5 (1d6 + 2) Bludgeoning damage plus 2 (1d4) Radiant damage."
      , kind = "textOnly"
      , name = Some "Mace"
      , procedure =
          None
            { ability : Text
            , groups :
                List
                  { kind : Text
                  , resourceRefs : { kind : Text }
                  , spells : List { spellId : Text }
                  }
            , kind : Text
            , name : Text
            }
      , procedureOrdinal = 1
      , reason = Some "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    , { description = Some
          "Ranged Attack Roll: +4, range 60 ft. Hit: 7 (2d6) Radiant damage."
      , kind = "textOnly"
      , name = Some "Radiant Flame"
      , procedure =
          None
            { ability : Text
            , groups :
                List
                  { kind : Text
                  , resourceRefs : { kind : Text }
                  , spells : List { spellId : Text }
                  }
            , kind : Text
            , name : Text
            }
      , procedureOrdinal = 2
      , reason = Some "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { ability = "wis"
        , groups =
          [ { kind = "at_will"
            , resourceRefs.kind = "none"
            , spells = [ { spellId = "light" }, { spellId = "thaumaturgy" } ]
            }
          ]
        , kind = "spellcasting"
        , name = "Spellcasting"
        }
      , procedureOrdinal = 3
      , reason = None Text
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = { morality = "neutral", order = "neutral" }
  , bonusActions =
    [ { description =
          "The priest casts Bless, Healing Word, or Sanctuary, using the same spellcasting ability as Spellcasting."
      , kind = "textOnly"
      , name = "Divine Aid"
      , procedureOrdinal = 1
      , reason = "unsupported_procedure_family"
      , resourceRefs = { kind = "some", ordinals = [ 1 ] }
      }
    ]
  , communication =
    { kind = "spoken_and_understood"
    , languages = { kind = "named", languages = [ "Common" ] }
    }
  , creatureType = "humanoid"
  , creatureTypeTags = [ "cleric" ]
  , gear =
    [ { item = "Chain Shirt", quantity = 1 }
    , { item = "Holy Symbol", quantity = 1 }
    , { item = "Mace", quantity = 1 }
    ]
  , hp = { kind = "literal", value = 11 }
  , initiative = { modifier = 0, score = 10 }
  , passivePerception = 12
  , resources =
    [ { limit = { kind = "daily", uses = 1 }
      , ordinal = 1
      , ownership = "shared"
      }
    ]
  , savingThrowModifiers =
    [ { ability = "cha", modifier = 0 }
    , { ability = "con", modifier = 1 }
    , { ability = "dex", modifier = 0 }
    , { ability = "int", modifier = 0 }
    , { ability = "str", modifier = 2 }
    , { ability = "wis", modifier = 2 }
    ]
  , size = { kind = "alternatives", options = [ "medium", "small" ] }
  , skillModifiers =
    [ { modifier = 4, skill = "medicine" }
    , { modifier = 2, skill = "religion" }
    ]
  , speeds = [ { feet = { kind = "literal", value = 30 }, kind = "walk" } ]
  }
}
