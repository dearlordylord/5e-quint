{ challengeRating = 16
, id = "stat_block_planetar"
, kind = "statBlock"
, name = "Planetar"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-P-S.md:173-215" }
, statBlock =
  { abilityScores =
    { cha = 25, con = 24, dex = 20, int = 19, str = 24, wis = 22 }
  , ac.value = { kind = "literal", value = 19 }
  , actions =
    [ { description = Some
          "The planetar makes three Radiant Sword attacks or uses Holy Burst twice."
      , kind = "textOnly"
      , name = Some "Multiattack"
      , procedure =
          None
            { ability : Text
            , components : { m : Bool, s : Bool, v : Bool }
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
          "Melee Attack Roll: +12, reach 10 ft. Hit: 14 (2d6 + 7) Slashing damage plus 18 (4d8) Radiant damage."
      , kind = "textOnly"
      , name = Some "Radiant Sword"
      , procedure =
          None
            { ability : Text
            , components : { m : Bool, s : Bool, v : Bool }
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
          "Dexterity Saving Throw: DC 20, each enemy in a 20-foot-radius Sphere centered on a point the planetar can see within 120 feet. Failure: 24 (7d6) Radiant damage. Success: Half damage."
      , kind = "textOnly"
      , name = Some "Holy Burst"
      , procedure =
          None
            { ability : Text
            , components : { m : Bool, s : Bool, v : Bool }
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
        { ability = "cha"
        , components = { m = False, s = True, v = True }
        , groups =
          [ { kind = "at_will"
            , resourceRefs = { kind = "none", ordinals = None (List Natural) }
            , spells = [ { spellId = "detect_evil_and_good" } ]
            }
          , { kind = "limited"
            , resourceRefs = { kind = "some", ordinals = Some [ 1 ] }
            , spells =
              [ { spellId = "commune" }
              , { spellId = "control_weather" }
              , { spellId = "dispel_evil_and_good" }
              , { spellId = "raise_dead" }
              ]
            }
          ]
        , kind = "spellcasting"
        , name = "Spellcasting"
        , spellSaveDc = { dc = 20, kind = "fixed" }
        }
      , procedureOrdinal = 4
      , reason = None Text
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = { morality = "good", order = "lawful" }
  , bonusActions =
    [ { description =
          "The planetar casts Cure Wounds, Invisibility, Lesser Restoration, or Remove Curse, using the same spellcasting ability as Spellcasting."
      , kind = "textOnly"
      , name = "Divine Aid"
      , procedureOrdinal = 1
      , reason = "unsupported_procedure_family"
      , resourceRefs = { kind = "some", ordinals = [ 2 ] }
      }
    ]
  , communication =
    { kind = "spoken_and_understood"
    , languages.kind = "all"
    , telepathy.rangeFeet = 120
    }
  , creatureType = "celestial"
  , creatureTypeTags = [ "angel" ]
  , hp = { kind = "literal", value = 262 }
  , immunities.conditions = [ "charmed", "exhaustion", "frightened" ]
  , initiative = { modifier = 10, score = 20 }
  , passivePerception = 21
  , resistances = { damageTypes = [ "radiant" ], kind = "fixed" }
  , resources =
    [ { limit = { kind = "daily", uses = 1 }, ordinal = 1, ownership = "each" }
    , { limit = { kind = "daily", uses = 2 }
      , ordinal = 2
      , ownership = "shared"
      }
    ]
  , savingThrowModifiers =
    [ { ability = "cha", modifier = 12 }
    , { ability = "con", modifier = 12 }
    , { ability = "dex", modifier = 5 }
    , { ability = "int", modifier = 4 }
    , { ability = "str", modifier = 12 }
    , { ability = "wis", modifier = 11 }
    ]
  , senses = [ { kind = "truesight", rangeFeet = 120 } ]
  , size = "large"
  , skillModifiers = [ { modifier = 11, skill = "perception" } ]
  , speeds =
    [ { feet = { kind = "literal", value = 40 }
      , hover = None Bool
      , kind = "walk"
      }
    , { feet = { kind = "literal", value = 120 }
      , hover = Some True
      , kind = "fly"
      }
    ]
  , traits =
    [ { description = "The planetar knows if it hears a lie."
      , name = "Divine Awareness"
      }
    , { description =
          "If the planetar dies outside Mount Celestia, its body disappears, and it gains a new body instantly, reviving with all its Hit Points somewhere in Mount Celestia."
      , name = "Exalted Restoration"
      }
    , { description =
          "The planetar has Advantage on saving throws against spells and other magical effects."
      , name = "Magic Resistance"
      }
    ]
  }
}
