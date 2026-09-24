{ challengeRating = 10
, id = "stat_block_guardian_naga"
, kind = "statBlock"
, name = "Guardian Naga"
, provenance = { kind = "srd-5.2.1", section = "monsters-A-Z.md:8668-8749" }
, statBlock =
  { abilityScores =
    { cha = 18, con = 16, dex = 18, int = 16, str = 19, wis = 19 }
  , ac.value = { kind = "literal", value = 18 }
  , actions =
    [ { description = Some
          "The naga makes two Bite attacks. It can replace any attack with a use of Poisonous Spittle."
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
                  , spells :
                      List { castAtLevel : Optional Natural, spellId : Text }
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
          "Melee Attack Roll: +8, reach 10 ft. Hit: 17 (2d12 + 4) Piercing damage plus 22 (4d10) Poison damage."
      , kind = "textOnly"
      , name = Some "Bite"
      , procedure =
          None
            { ability : Text
            , components : { m : Bool, s : Bool, v : Bool }
            , groups :
                List
                  { kind : Text
                  , resourceRefs :
                      { kind : Text, ordinals : Optional (List Natural) }
                  , spells :
                      List { castAtLevel : Optional Natural, spellId : Text }
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
          "Constitution Saving Throw: DC 16, one creature the naga can see within 60 feet. Failure: 31 (7d8) Poison damage, and the target has the Blinded condition until the start of the naga's next turn. Success: Half damage only."
      , kind = "textOnly"
      , name = Some "Poisonous Spittle"
      , procedure =
          None
            { ability : Text
            , components : { m : Bool, s : Bool, v : Bool }
            , groups :
                List
                  { kind : Text
                  , resourceRefs :
                      { kind : Text, ordinals : Optional (List Natural) }
                  , spells :
                      List { castAtLevel : Optional Natural, spellId : Text }
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
        , components = { m = False, s = False, v = True }
        , groups =
          [ { kind = "at_will"
            , resourceRefs = { kind = "none", ordinals = None (List Natural) }
            , spells =
              [ { castAtLevel = None Natural, spellId = "thaumaturgy" } ]
            }
          , { kind = "limited"
            , resourceRefs = { kind = "some", ordinals = Some [ 1 ] }
            , spells =
              [ { castAtLevel = None Natural, spellId = "clairvoyance" }
              , { castAtLevel = Some 6, spellId = "cure_wounds" }
              , { castAtLevel = Some 6, spellId = "flame_strike" }
              , { castAtLevel = None Natural, spellId = "geas" }
              , { castAtLevel = None Natural, spellId = "true_seeing" }
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
  , alignment = { morality = "good", order = "lawful" }
  , communication =
    { kind = "spoken_and_understood"
    , languages = { kind = "named", languages = [ "Celestial", "Common" ] }
    }
  , creatureType = "celestial"
  , hp = { kind = "literal", value = 136 }
  , immunities =
    { conditions = [ "charmed", "paralyzed", "poisoned", "restrained" ]
    , damageTypes = [ "poison" ]
    }
  , initiative = { modifier = 4, score = 14 }
  , passivePerception = 14
  , resources =
    [ { limit = { kind = "daily", uses = 1 }, ordinal = 1, ownership = "each" }
    ]
  , savingThrowModifiers =
    [ { ability = "str", modifier = 4 }
    , { ability = "dex", modifier = 8 }
    , { ability = "con", modifier = 7 }
    , { ability = "int", modifier = 7 }
    , { ability = "wis", modifier = 8 }
    , { ability = "cha", modifier = 8 }
    ]
  , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
  , size = "large"
  , skillModifiers =
    [ { modifier = 11, skill = "arcana" }
    , { modifier = 11, skill = "history" }
    , { modifier = 11, skill = "religion" }
    ]
  , speeds =
    [ { feet = { kind = "literal", value = 40 }, kind = "walk" }
    , { feet = { kind = "literal", value = 40 }, kind = "climb" }
    , { feet = { kind = "literal", value = 40 }, kind = "swim" }
    ]
  , traits =
    [ { description =
          "If the naga dies, it returns to life in 1d6 days and regains all its Hit Points unless Dispel Evil and Good is cast on its remains."
      , name = "Celestial Restoration"
      }
    ]
  }
}
