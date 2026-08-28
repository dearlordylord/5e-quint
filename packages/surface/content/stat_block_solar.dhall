{ challengeRating = 21
, id = "stat_block_solar"
, kind = "statBlock"
, name = "Solar"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-P-S.md:1229-1280" }
, statBlock =
  { abilityScores =
    { cha = 30, con = 26, dex = 22, int = 25, str = 26, wis = 25 }
  , ac.value = { kind = "literal", value = 21 }
  , actions =
    [ { description = Some
          "The solar makes two Flying Sword attacks. It can replace one attack with a use of Slaying Bow."
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
          "Melee or Ranged Attack Roll: +15, reach 10 ft. or range 120 ft. Hit: 22 (4d6 + 8) Slashing damage plus 22 (4d10) Radiant damage. Hit or Miss: The sword magically returns to the solar's hand or hovers within 5 feet of the solar immediately after a ranged attack."
      , kind = "textOnly"
      , name = Some "Flying Sword"
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
          "Dexterity Saving Throw: DC 21, one creature the solar can see within 600 feet. Failure: If the creature has 100 Hit Points or fewer, it dies. Otherwise it takes 24 (4d8 + 6) Piercing damage plus 36 (8d8) Radiant damage."
      , kind = "textOnly"
      , name = Some "Slaying Bow"
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
              , { spellId = "resurrection" }
              ]
            }
          ]
        , kind = "spellcasting"
        , name = "Spellcasting"
        , spellSaveDc = { dc = 25, kind = "fixed" }
        }
      , procedureOrdinal = 4
      , reason = None Text
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = { morality = "good", order = "lawful" }
  , bonusActions =
    [ { description =
          "The solar casts Cure Wounds (level 2 version), Lesser Restoration, or Remove Curse, using the same spellcasting ability as Spellcasting."
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
  , hp = { kind = "literal", value = 297 }
  , immunities =
    { conditions = [ "charmed", "exhaustion", "frightened", "poisoned" ]
    , damageTypes = [ "poison", "radiant" ]
    }
  , initiative = { modifier = 20, score = 30 }
  , legendaryActions =
    { entries =
      [ { description =
            "Constitution Saving Throw: DC 25, one creature the solar can see within 120 feet. Failure: The target has the Blinded condition for 1 minute. Failure or Success: The solar can't take this action again until the start of its next turn."
        , kind = "textOnly"
        , name = "Blinding Gaze"
        , procedureOrdinal = 1
        , reason = "unsupported_action_shape"
        , resourceRefs.kind = "none"
        }
      , { description =
            "The solar teleports up to 60 feet to an unoccupied space it can see. Dexterity Saving Throw: DC 25, each creature in a 10-foot Emanation originating from the solar at its destination space. Failure: 11 (2d10) Radiant damage. Success: Half damage."
        , kind = "textOnly"
        , name = "Radiant Teleport"
        , procedureOrdinal = 2
        , reason = "unsupported_action_shape"
        , resourceRefs.kind = "none"
        }
      ]
    , uses = { kind = "fixed", uses = 3 }
    }
  , passivePerception = 24
  , resources =
    [ { limit = { kind = "daily", uses = 1 }, ordinal = 1, ownership = "each" }
    , { limit = { kind = "daily", uses = 3 }
      , ordinal = 2
      , ownership = "shared"
      }
    ]
  , savingThrowModifiers =
    [ { ability = "cha", modifier = 10 }
    , { ability = "con", modifier = 8 }
    , { ability = "dex", modifier = 6 }
    , { ability = "int", modifier = 7 }
    , { ability = "str", modifier = 8 }
    , { ability = "wis", modifier = 7 }
    ]
  , senses = [ { kind = "truesight", rangeFeet = 120 } ]
  , size = "large"
  , skillModifiers = [ { modifier = 14, skill = "perception" } ]
  , speeds =
    [ { feet = { kind = "literal", value = 50 }
      , hover = None Bool
      , kind = "walk"
      }
    , { feet = { kind = "literal", value = 150 }
      , hover = Some True
      , kind = "fly"
      }
    ]
  , traits =
    [ { description = "The solar knows if it hears a lie."
      , name = "Divine Awareness"
      }
    , { description =
          "If the solar dies outside Mount Celestia, its body disappears, and it gains a new body instantly, reviving with all its Hit Points somewhere in Mount Celestia."
      , name = "Exalted Restoration"
      }
    , { description =
          "If the solar fails a saving throw, it can choose to succeed instead."
      , name = "Legendary Resistance (4/Day)"
      }
    , { description =
          "The solar has Advantage on saving throws against spells and other magical effects."
      , name = "Magic Resistance"
      }
    ]
  }
}
