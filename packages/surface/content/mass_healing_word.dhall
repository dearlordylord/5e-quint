-- Mass Healing Word — SRD 5.2.1 Spell, level 3, Abjuration.
--
-- RAW (Spells / Descriptions M-P / Mass Healing Word):
--   "Up to six creatures of your choice that you can see within
--    range regain Hit Points equal to 2d4 plus your spellcasting
--    ability modifier."
--   "Using a Higher-Level Spell Slot. The healing increases by 1d4
--    for each spell slot level above 3."
--
-- ZERO-WIDENING VALIDATION REFERENCE. Multi-target heal exercising
-- spellcastingMod + slot scaling on heal_hp. Fixed count of 6 (no
-- upcast on target count) using the bare-number count landed for
-- Aid.

let massHealingWord =
      { kind = "spell"
      , id = "mass_healing_word"
      , name = "Mass Healing Word"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P#Mass Healing Word"
          }
      , description =
          "Up to six creatures of your choice that you can see within range regain Hit Points equal to 2d4 plus your spellcasting ability modifier. Using a Higher-Level Spell Slot. The healing increases by 1d4 for each spell slot level above 3."
      , mechanics =
          { family = "activation"
          , level = 3
          , school = "abjuration"
          , castingTime = { kind = "bonus_action" }
          , range = { kind = "point", feet = 60 }
          , components = { v = True, s = False, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "mass_healing_word_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "choose_up_to"
                            , count = 6
                            }
                        }
                    }
                , effects =
                    [ { kind = "heal_hp"
                      , amount =
                          { kind = "linear_per_level"
                          , axis = "slot"
                          , base =
                              { dice = 2
                              , dieSize = 4
                              , spellcastingMod = True
                              }
                          , perLevel = { dice = 1 }
                          , startingAtLevel = 3
                          }
                      , target = "target_creature"
                      }
                    ]
                }
              ]
          }
      }

in  massHealingWord
