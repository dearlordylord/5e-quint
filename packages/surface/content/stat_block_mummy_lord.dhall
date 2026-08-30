let T = ./_stat_block_types.dhall

in  { challengeRating = 15
    , id = "stat_block_mummy_lord"
    , kind = "statBlock"
    , name = "Mummy Lord"
    , provenance =
      { kind = "srd-5.2.1", section = "Monsters/Monsters-M-O.md:530-587" }
    , statBlock =
      { abilityScores =
        { str = 18, dex = 10, con = 17, int = 11, wis = 19, cha = 16 }
      , ac.value = { kind = "literal", value = 17 }
      , actions =
        [ T.textOnly
            { procedureOrdinal = 1
            , name = "Multiattack"
            , description =
                "The mummy makes one Rotting Fist or Channel Negative Energy attack, and it uses Dreadful Glare."
            , reason = "unsupported_action_shape"
            }
        , T.textOnly
            { procedureOrdinal = 2
            , name = "Rotting Fist"
            , description =
                "Melee Attack Roll: +9, reach 5 ft. Hit: 15 (2d10 + 4) Bludgeoning damage plus 10 (3d6) Necrotic damage. If the target is a creature, it is cursed. While cursed, the target can't regain Hit Points, it gains no benefit from finishing a Long Rest, and its Hit Point maximum decreases by 10 (3d6) every 24 hours that elapse. A creature dies and turns to dust if reduced to 0 Hit Points by this attack."
            , reason = "unsupported_action_shape"
            }
        , T.textOnly
            { procedureOrdinal = 3
            , name = "Channel Negative Energy"
            , description =
                "Ranged Attack Roll: +9, range 60 ft. Hit: 25 (6d6 + 4) Necrotic damage."
            , reason = "unsupported_action_shape"
            }
        , T.textOnly
            { procedureOrdinal = 4
            , name = "Dreadful Glare"
            , description =
                "Wisdom Saving Throw: DC 17, one creature the mummy can see within 60 feet. Failure: 25 (6d6 + 4) Psychic damage, and the target has the Paralyzed condition until the end of the mummy's next turn."
            , reason = "unsupported_action_shape"
            }
        , T.executable
            { procedureOrdinal = 5
            , procedure =
                T.spellcasting
                  { name = "Spellcasting"
                  , ability = "wis"
                  , spellSaveDc = Some { kind = "fixed", dc = 17 }
                  , spellAttackBonus = Some { kind = "literal", value = +9 }
                  , components = Some { v = True, s = True, m = False }
                  , groups =
                    { first =
                        T.atWill
                          { spells =
                            { first =
                                T.spellRef
                                  { spellId = "dispel_magic"
                                  , count = None Natural
                                  , castAtLevel = None Natural

                                  }
                            , rest =
                                  [ T.spellRef
                                      { spellId = "thaumaturgy"
                                      , count = None Natural
                                      , castAtLevel = None Natural

                                      }
                                  ]
                                : List T.SpellRef
                            }
                          }
                    , rest =
                          [ T.limited
                              { resourceOrdinals =
                                { first = 1, rest = [] : List Natural }
                              , spells =
                                { first =
                                    T.spellRef
                                      { spellId = "animate_dead"
                                      , count = None Natural
                                      , castAtLevel = None Natural

                                      }
                                , rest =
                                      [ T.spellRef
                                          { spellId = "harm"
                                          , count = None Natural
                                          , castAtLevel = None Natural

                                          }
                                      , T.spellRef
                                          { spellId = "insect_plague"
                                          , count = None Natural
                                          , castAtLevel = Some 7

                                          }
                                      ]
                                    : List T.SpellRef
                                }
                              }
                          ]
                        : List T.Group
                    }
                  }
            }
        ]
      , reactions =
        [ T.textOnly
            { procedureOrdinal = 1
            , name = "Whirlwind of Sand"
            , description =
                "Trigger: The mummy is hit by an attack roll. Response: The mummy adds 2 to its AC against the attack, possibly causing the attack to miss, and the mummy teleports up to 60 feet to an unoccupied space it can see. Each creature of its choice that it can see within 5 feet of its destination space has the Blinded condition until the end of the mummy's next turn."
            , reason = "unsupported_action_shape"
            }
        ]
      , legendaryActions =
        { uses =
          { kind = "lair_bonus", usesOutsideLair = 3, additionalUsesInLair = 1 }
        , entries =
          [ T.textOnly
              { procedureOrdinal = 1
              , name = "Dread Command"
              , description =
                  "The mummy casts Command (level 2 version), using the same spellcasting ability as Spellcasting. The mummy can't take this action again until the start of its next turn."
              , reason = "unsupported_action_shape"
              }
          , T.textOnly
              { procedureOrdinal = 2
              , name = "Glare"
              , description =
                  "The mummy uses Dreadful Glare. The mummy can't take this action again until the start of its next turn."
              , reason = "unsupported_action_shape"
              }
          , T.textOnly
              { procedureOrdinal = 3
              , name = "Necrotic Strike"
              , description =
                  "The mummy makes one Rotting Fist or Channel Negative Energy attack."
              , reason = "unsupported_action_shape"
              }
          ]
        }
      , traits =
        [ T.trait
            { name = "Legendary Resistance (3/Day, or 4/Day in Lair)"
            , description =
                "If the mummy fails a saving throw, it can choose to succeed instead."
            , effectKind = None Text
            }
        , T.trait
            { name = "Magic Resistance"
            , description =
                "The mummy has Advantage on saving throws against spells and other magical effects."
            , effectKind = None Text
            }
        , T.trait
            { name = "Undead Restoration"
            , description =
                "If destroyed, the mummy gains a new body in 24 hours if its heart is intact, reviving with all its Hit Points. The new body appears in an unoccupied space within the mummy's lair. The heart is a Tiny object that has AC 17, HP 10, and Immunity to all damage except Fire."
            , effectKind = None Text
            }
        ]
      , alignment = { order = "lawful", morality = "evil" }
      , communication =
        { kind = "spoken_and_understood"
        , languages =
          { kind = "named_plus_other_languages"
          , languages = [ "Common" ]
          , additionalLanguages = 3
          }
        }
      , creatureType = "undead"
      , creatureTypeTags = [ "cleric" ]
      , hp = { kind = "literal", value = 187 }
      , initiative = { modifier = +10, score = 20 }
      , passivePerception = 19
      , savingThrowModifiers =
        [ { ability = "cha", modifier = +3 }
        , { ability = "con", modifier = +3 }
        , { ability = "dex", modifier = +0 }
        , { ability = "int", modifier = +5 }
        , { ability = "str", modifier = +4 }
        , { ability = "wis", modifier = +9 }
        ]
      , skillModifiers =
        [ { skill = "history", modifier = +5 }
        , { skill = "perception", modifier = +9 }
        , { skill = "religion", modifier = +5 }
        ]
      , vulnerabilities = { kind = "fixed", damageTypes = [ "fire" ] }
      , immunities =
        { conditions = Some
          [ "charmed", "exhaustion", "frightened", "paralyzed", "poisoned" ]
        , damageTypes = Some [ "necrotic", "poison" ]
        }
      , senses =
        [ { kind = "truesight", rangeFeet = 60, qualifier = None Text } ]
      , size = { kind = "alternatives", options = [ "medium", "small" ] }
      , speeds =
        [ { kind = "walk"
          , feet = { kind = "literal", value = 30 }
          , hover = None Bool
          }
        ]
      , resources =
        [ T.resource
            { ordinal = 1, ownership = "each", limit = T.daily { uses = 1 } }
        ]
      }
    }
