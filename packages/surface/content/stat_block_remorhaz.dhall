{ challengeRating = 11
, id = "stat_block_remorhaz"
, kind = "statBlock"
, name = "Remorhaz"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-P-S.md:586-615" }
, statBlock =
  { abilityScores = { cha = 5, con = 21, dex = 13, int = 4, str = 24, wis = 10 }
  , ac.value = { kind = "literal", value = 17 }
  , actions =
    [ { description =
          "Melee Attack Roll: +11, reach 10 ft. Hit: 18 (2d10 + 7) Piercing damage plus 14 (4d6) Fire damage. If the target is a Large or smaller creature, it has the Grappled condition (escape DC 17), and it has the Restrained condition until the grapple ends."
      , kind = "textOnly"
      , name = "Bite"
      , procedureOrdinal = 1
      , reason = "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = "unaligned"
  , bonusActions =
    [ { description =
          "Strength Saving Throw: DC 19, one Large or smaller creature Grappled by the remorhaz (it can have up to two creatures swallowed at a time). Failure: The target is swallowed by the remorhaz, and the Grappled condition ends. A swallowed creature has the Blinded and Restrained conditions, has Total Cover against attacks and other effects outside the remorhaz, and it takes 10 (3d6) Acid damage plus 10 (3d6) Fire damage at the start of each of the remorhaz's turns. If the remorhaz takes 30 damage or more on a single turn from a creature inside it, the remorhaz must succeed on a DC 15 Constitution saving throw at the end of that turn or regurgitate all swallowed creatures, each of which falls in a space within 5 feet of the remorhaz and has the Prone condition. If the remorhaz dies, any swallowed creature no longer has the Restrained condition and can escape from the corpse by using 15 feet of movement, exiting Prone."
      , kind = "textOnly"
      , name = "Swallow"
      , procedureOrdinal = 1
      , reason = "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    ]
  , communication.kind = "none"
  , creatureType = "monstrosity"
  , hp = { kind = "literal", value = 195 }
  , immunities.damageTypes = [ "cold", "fire" ]
  , initiative = { modifier = 5, score = 15 }
  , passivePerception = 10
  , savingThrowModifiers =
    [ { ability = "cha", modifier = -3 }
    , { ability = "con", modifier = +5 }
    , { ability = "dex", modifier = +1 }
    , { ability = "int", modifier = -3 }
    , { ability = "str", modifier = +7 }
    , { ability = "wis", modifier = +0 }
    ]
  , senses =
    [ { kind = "darkvision", rangeFeet = 60 }
    , { kind = "tremorsense", rangeFeet = 60 }
    ]
  , size = "huge"
  , speeds =
    [ { feet = { kind = "literal", value = 40 }, kind = "walk" }
    , { feet = { kind = "literal", value = 30 }, kind = "burrow" }
    ]
  , traits =
    [ { description =
          "At the end of each of the remorhaz's turns, each creature in a 5-foot Emanation originating from the remorhaz takes 16 (3d10) Fire damage."
      , name = "Heat Aura"
      }
    ]
  }
}
