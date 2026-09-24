{ challengeRating = 9
, id = "stat_block_glabrezu"
, kind = "statBlock"
, name = "Glabrezu"
, provenance = { kind = "srd-5.2.1", section = "monsters-A-Z.md:7006-7090" }
, statBlock =
  { abilityScores =
    { cha = 16, con = 21, dex = 15, int = 19, str = 20, wis = 17 }
  , ac.value = { kind = "literal", value = 17 }
  , actions =
    [ { description = Some
          "The glabrezu makes two Pincer attacks and uses Pummel or Spellcasting."
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
          "Melee Attack Roll: +9, reach 10 ft. Hit: 16 (2d10 + 5) Slashing damage. If the target is a Medium or smaller creature, it has the Grappled condition (escape DC 15) from one of two pincers."
      , kind = "textOnly"
      , name = Some "Pincer"
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
          "Dexterity Saving Throw: DC 17, one creature Grappled by the glabrezu. Failure: 15 (3d6 + 5) Bludgeoning damage. Success: Half damage."
      , kind = "textOnly"
      , name = Some "Pummel"
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
        { ability = "int"
        , components = { m = False, s = True, v = True }
        , groups =
          [ { kind = "at_will"
            , resourceRefs = { kind = "none", ordinals = None (List Natural) }
            , spells =
              [ { spellId = "darkness" }
              , { spellId = "detect_magic" }
              , { spellId = "dispel_magic" }
              ]
            }
          , { kind = "limited"
            , resourceRefs = { kind = "some", ordinals = Some [ 1 ] }
            , spells =
              [ { spellId = "confusion" }
              , { spellId = "fly" }
              , { spellId = "power_word_stun" }
              ]
            }
          ]
        , kind = "spellcasting"
        , name = "Spellcasting"
        , spellSaveDc = { dc = 16, kind = "fixed" }
        }
      , procedureOrdinal = 4
      , reason = None Text
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = { morality = "evil", order = "chaotic" }
  , communication =
    { kind = "spoken_and_understood"
    , languages = { kind = "named", languages = [ "Abyssal" ] }
    , telepathy.rangeFeet = 120
    }
  , creatureType = "fiend"
  , creatureTypeTags = [ "demon" ]
  , hp = { kind = "literal", value = 189 }
  , immunities = { conditions = [ "poisoned" ], damageTypes = [ "poison" ] }
  , initiative = { modifier = 6, score = 16 }
  , passivePerception = 17
  , resistances =
    { damageTypes = [ "cold", "fire", "lightning" ], kind = "fixed" }
  , resources =
    [ { limit = { kind = "daily", uses = 1 }, ordinal = 1, ownership = "each" }
    ]
  , savingThrowModifiers =
    [ { ability = "str", modifier = 9 }
    , { ability = "dex", modifier = 2 }
    , { ability = "con", modifier = 9 }
    , { ability = "int", modifier = 4 }
    , { ability = "wis", modifier = 7 }
    , { ability = "cha", modifier = 7 }
    ]
  , senses = [ { kind = "truesight", rangeFeet = 120 } ]
  , size = "large"
  , skillModifiers =
    [ { modifier = 7, skill = "deception" }
    , { modifier = 7, skill = "perception" }
    ]
  , speeds = [ { feet = { kind = "literal", value = 40 }, kind = "walk" } ]
  , traits =
    [ { description =
          "If the glabrezu dies outside the Abyss, its body dissolves into ichor, and it gains a new body instantly, reviving with all its Hit Points somewhere in the Abyss."
      , name = "Demonic Restoration"
      }
    , { description =
          "The glabrezu has Advantage on saving throws against spells and other magical effects."
      , name = "Magic Resistance"
      }
    ]
  }
}
