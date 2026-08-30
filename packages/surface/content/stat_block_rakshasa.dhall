{ challengeRating = 13
, id = "stat_block_rakshasa"
, kind = "statBlock"
, name = "Rakshasa"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-P-S.md:394-430" }
, statBlock =
  { abilityScores =
    { cha = 20, con = 18, dex = 17, int = 13, str = 14, wis = 16 }
  , ac.value = { kind = "literal", value = 17 }
  , actions =
    [ { description = Some "The rakshasa makes three Cursed Touch attacks."
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
          "Melee Attack Roll: +10, reach 5 ft. Hit: 12 (2d6 + 5) Slashing damage plus 19 (3d12) Necrotic damage. If the target is a creature, it is cursed. While cursed, the target gains no benefit from finishing a Short or Long Rest."
      , kind = "textOnly"
      , name = Some "Cursed Touch"
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
          "Wisdom Saving Throw: DC 18, each enemy in a 30-foot Emanation originating from the rakshasa. Failure: 28 (8d6) Psychic damage, and the target has the Frightened and Incapacitated conditions until the start of the rakshasa's next turn."
      , kind = "textOnly"
      , name = Some "Baleful Command"
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
        { ability = "cha"
        , components = { m = False, s = True, v = True }
        , groups =
          [ { kind = "at_will"
            , resourceRefs = { kind = "none", ordinals = None (List Natural) }
            , spells =
              [ { spellId = "detect_magic" }
              , { spellId = "detect_thoughts" }
              , { spellId = "disguise_self" }
              , { spellId = "mage_hand" }
              , { spellId = "minor_illusion" }
              ]
            }
          , { kind = "limited"
            , resourceRefs = { kind = "some", ordinals = Some [ 2 ] }
            , spells =
              [ { spellId = "fly" }
              , { spellId = "invisibility" }
              , { spellId = "major_image" }
              , { spellId = "plane_shift" }
              ]
            }
          ]
        , kind = "spellcasting"
        , name = "Spellcasting"
        , spellSaveDc = { dc = 18, kind = "fixed" }
        }
      , procedureOrdinal = 4
      , reason = None Text
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    ]
  , alignment = { morality = "evil", order = "lawful" }
  , communication =
    { kind = "spoken_and_understood"
    , languages = { kind = "named", languages = [ "Common", "Infernal" ] }
    }
  , creatureType = "fiend"
  , hp = { kind = "literal", value = 221 }
  , immunities.conditions = [ "charmed", "frightened" ]
  , initiative = { modifier = 8, score = 18 }
  , passivePerception = 18
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
    [ { ability = "cha", modifier = 5 }
    , { ability = "con", modifier = 4 }
    , { ability = "dex", modifier = 3 }
    , { ability = "int", modifier = 1 }
    , { ability = "str", modifier = 2 }
    , { ability = "wis", modifier = 3 }
    ]
  , senses = [ { kind = "truesight", rangeFeet = 60 } ]
  , size = "medium"
  , skillModifiers =
    [ { modifier = 10, skill = "deception" }
    , { modifier = 8, skill = "insight" }
    , { modifier = 8, skill = "perception" }
    ]
  , speeds = [ { feet = { kind = "literal", value = 40 }, kind = "walk" } ]
  , traits =
    [ { description =
          "The rakshasa automatically succeeds on saving throws against spells and other magical effects, and the attack rolls of spells automatically miss it. Without the rakshasa's permission, no spell can observe the rakshasa remotely or detect its thoughts, creature type, or alignment."
      , name = "Greater Magic Resistance"
      }
    , { description =
          "If the rakshasa dies outside the Nine Hells, its body turns to ichor, and it gains a new body instantly, reviving with all its Hit Points somewhere in the Nine Hells."
      , name = "Fiendish Restoration"
      }
    ]
  , vulnerabilities =
    { damageTypes = [ "piercing" ]
    , kind = "qualified"
    , qualifier =
        "from weapons wielded by creatures under the effect of a *Bless* spell"
    }
  }
}
