{ challengeRating = 2
, id = "stat_block_priest"
, kind = "statBlock"
, name = "Priest"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-P-S.md:255-288" }
, statBlock =
  { abilityScores =
    { cha = 13, con = 12, dex = 10, int = 13, str = 16, wis = 16 }
  , ac.value = { kind = "literal", value = 13 }
  , actions =
    [ { description = Some
          "The priest makes two attacks, using Mace or Radiant Flame in any combination."
      , kind = "textOnly"
      , name = Some "Multiattack"
      , procedure =
          None
            { ability : Text
            , groups :
                List
                  { kind : Text
                  , resourceRefs :
                      { kind : Text, ordinals : Optional (List Natural) }
                  , spells : List { spellId : Text }
                  }
            , kind : Text
            , name : Text
            , spellSaveDc : { dc : Natural, kind : Text }
            }
      , procedureOrdinal = 1
      , reason = Some "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    , { description = Some
          "Melee Attack Roll: +5, reach 5 ft. Hit: 6 (1d6 + 3) Bludgeoning damage plus 5 (2d4) Radiant damage."
      , kind = "textOnly"
      , name = Some "Mace"
      , procedure =
          None
            { ability : Text
            , groups :
                List
                  { kind : Text
                  , resourceRefs :
                      { kind : Text, ordinals : Optional (List Natural) }
                  , spells : List { spellId : Text }
                  }
            , kind : Text
            , name : Text
            , spellSaveDc : { dc : Natural, kind : Text }
            }
      , procedureOrdinal = 2
      , reason = Some "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    , { description = Some
          "Ranged Attack Roll: +5, range 60 ft. Hit: 11 (2d10) Radiant damage."
      , kind = "textOnly"
      , name = Some "Radiant Flame"
      , procedure =
          None
            { ability : Text
            , groups :
                List
                  { kind : Text
                  , resourceRefs :
                      { kind : Text, ordinals : Optional (List Natural) }
                  , spells : List { spellId : Text }
                  }
            , kind : Text
            , name : Text
            , spellSaveDc : { dc : Natural, kind : Text }
            }
      , procedureOrdinal = 3
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
            , resourceRefs = { kind = "none", ordinals = None (List Natural) }
            , spells = [ { spellId = "light" }, { spellId = "thaumaturgy" } ]
            }
          , { kind = "limited"
            , resourceRefs = { kind = "some", ordinals = Some [ 1 ] }
            , spells = [ { spellId = "spirit_guardians" } ]
            }
          ]
        , kind = "spellcasting"
        , name = "Spellcasting"
        , spellSaveDc = { dc = 13, kind = "fixed" }
        }
      , procedureOrdinal = 4
      , reason = None Text
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = { morality = "neutral", order = "neutral" }
  , bonusActions =
    [ { description =
          "The priest casts Bless, Dispel Magic, Healing Word, or Lesser Restoration, using the same spellcasting ability as Spellcasting."
      , kind = "textOnly"
      , name = "Divine Aid"
      , procedureOrdinal = 1
      , reason = "unsupported_procedure_family"
      , resourceRefs = { kind = "some", ordinals = [ 2 ] }
      }
    ]
  , communication =
    { kind = "spoken_and_understood"
    , languages =
      { additionalLanguages = 1
      , kind = "named_plus_other_languages"
      , languages = [ "Common" ]
      }
    }
  , creatureType = "humanoid"
  , creatureTypeTags = [ "cleric" ]
  , gear =
    [ { item = "Chain Shirt", quantity = 1 }
    , { item = "Holy Symbol", quantity = 1 }
    , { item = "Mace", quantity = 1 }
    ]
  , hp = { kind = "literal", value = 38 }
  , initiative = { modifier = 0, score = 10 }
  , passivePerception = 15
  , resources =
    [ { limit = { kind = "daily", uses = 1 }
      , ordinal = 1
      , ownership = "shared"
      }
    , { limit = { kind = "daily", uses = 3 }
      , ordinal = 2
      , ownership = "shared"
      }
    ]
  , savingThrowModifiers =
    [ { ability = "cha", modifier = 1 }
    , { ability = "con", modifier = 1 }
    , { ability = "dex", modifier = 0 }
    , { ability = "int", modifier = 1 }
    , { ability = "str", modifier = 3 }
    , { ability = "wis", modifier = 3 }
    ]
  , size = { kind = "alternatives", options = [ "medium", "small" ] }
  , skillModifiers =
    [ { modifier = 7, skill = "medicine" }
    , { modifier = 5, skill = "perception" }
    , { modifier = 5, skill = "religion" }
    ]
  , speeds = [ { feet = { kind = "literal", value = 30 }, kind = "walk" } ]
  }
}
