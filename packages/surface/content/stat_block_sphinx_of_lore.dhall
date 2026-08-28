{ challengeRating = 11
, id = "stat_block_sphinx_of_lore"
, kind = "statBlock"
, name = "Sphinx of Lore"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-P-S.md:1348-1392" }
, statBlock =
  { abilityScores =
    { cha = 18, con = 16, dex = 15, int = 18, str = 18, wis = 18 }
  , ac.value = { kind = "literal", value = 17 }
  , actions =
    [ { description = Some "The sphinx makes three Claw attacks."
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
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    , { description = Some
          "Melee Attack Roll: +8, reach 5 ft. Hit: 14 (3d6 + 4) Slashing damage."
      , kind = "textOnly"
      , name = Some "Claw"
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
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    , { description = Some
          "Wisdom Saving Throw: DC 16, each enemy in a 300-foot Emanation originating from the sphinx. Failure: 35 (10d6) Psychic damage, and the target has the Incapacitated condition until the start of the sphinx's next turn."
      , kind = "textOnly"
      , name = Some "Mind-Rending Roar"
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
      , resourceRefs = { kind = "some", ordinals = Some [ 1 ] }
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
              [ { spellId = "detect_magic" }
              , { spellId = "identify" }
              , { spellId = "mage_hand" }
              , { spellId = "minor_illusion" }
              , { spellId = "prestidigitation" }
              ]
            }
          , { kind = "limited"
            , resourceRefs = { kind = "some", ordinals = Some [ 2 ] }
            , spells =
              [ { spellId = "dispel_magic" }
              , { spellId = "legend_lore" }
              , { spellId = "locate_object" }
              , { spellId = "plane_shift" }
              , { spellId = "remove_curse" }
              , { spellId = "tongues" }
              ]
            }
          ]
        , kind = "spellcasting"
        , name = "Spellcasting"
        , spellSaveDc = { dc = 16, kind = "fixed" }
        }
      , procedureOrdinal = 4
      , reason = None Text
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    ]
  , alignment = { morality = "neutral", order = "lawful" }
  , communication =
    { kind = "spoken_and_understood"
    , languages = { kind = "named", languages = [ "Celestial", "Common" ] }
    }
  , creatureType = "celestial"
  , hp = { kind = "literal", value = 170 }
  , immunities =
    { conditions = [ "charmed", "frightened" ], damageTypes = [ "psychic" ] }
  , initiative = { modifier = 10, score = 20 }
  , legendaryActions =
    { entries =
      [ { description =
            "The sphinx can teleport up to 30 feet to an unoccupied space it can see, and it makes one Claw attack."
        , kind = "textOnly"
        , name = "Arcane Prowl"
        , procedureOrdinal = 1
        , reason = "unsupported_action_shape"
        , resourceRefs.kind = "none"
        }
      , { description =
            "Constitution Saving Throw: DC 16, one creature the sphinx can see within 120 feet. Failure: The target gains 1 Exhaustion level. While the target has any Exhaustion levels, it appears 3d10 years older. Failure or Success: The sphinx can't take this action again until the start of its next turn."
        , kind = "textOnly"
        , name = "Weight of Years"
        , procedureOrdinal = 2
        , reason = "unsupported_action_shape"
        , resourceRefs.kind = "none"
        }
      ]
    , uses =
      { additionalUsesInLair = 1, kind = "lair_bonus", usesOutsideLair = 3 }
    }
  , passivePerception = 18
  , resistances = { damageTypes = [ "necrotic", "radiant" ], kind = "fixed" }
  , resources =
    [ { limit = { kind = "recharge", minimumRoll = Some 5, uses = None Natural }
      , ordinal = 1
      , ownership = "shared"
      }
    , { limit = { kind = "daily", minimumRoll = None Natural, uses = Some 1 }
      , ordinal = 2
      , ownership = "each"
      }
    ]
  , savingThrowModifiers =
    [ { ability = "cha", modifier = 4 }
    , { ability = "con", modifier = 3 }
    , { ability = "dex", modifier = 2 }
    , { ability = "int", modifier = 4 }
    , { ability = "str", modifier = 4 }
    , { ability = "wis", modifier = 4 }
    ]
  , senses = [ { kind = "truesight", rangeFeet = 120 } ]
  , size = "large"
  , skillModifiers =
    [ { modifier = 12, skill = "arcana" }
    , { modifier = 12, skill = "history" }
    , { modifier = 8, skill = "perception" }
    , { modifier = 12, skill = "religion" }
    ]
  , speeds =
    [ { feet = { kind = "literal", value = 40 }, kind = "walk" }
    , { feet = { kind = "literal", value = 60 }, kind = "fly" }
    ]
  , traits =
    [ { description =
          "No magic can observe the sphinx remotely or detect its thoughts without its permission. Wisdom (Insight) checks made to ascertain its intentions or sincerity are made with Disadvantage."
      , name = "Inscrutable"
      }
    , { description =
          "If the sphinx fails a saving throw, it can choose to succeed instead."
      , name = "Legendary Resistance (3/Day, or 4/Day in Lair)"
      }
    ]
  }
}
