-- Healing Word — SRD 5.2.1 Spell, level 1, Abjuration.
--
-- RAW (Spells / Descriptions E-L / Healing Word):
--   "A creature of your choice that you can see within range regains
--    Hit Points equal to 2d4 plus your spellcasting ability modifier."
--   "Using a Higher-Level Spell Slot. The healing increases by 2d4
--    for each spell slot level above 1."
--
-- ZERO-WIDENING VALIDATION REFERENCE. Second instance of
-- DiceExpr.spellcastingMod after Cure Wounds — confirms the shape
-- generalizes. Bonus-action casting + 60 ft range distinguish it
-- from Cure Wounds (Action + Touch).

let healingWord =
      { kind = "spell"
      , id = "healing_word"
      , name = "Healing Word"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Healing Word"
          }
      , description =
          "A creature of your choice that you can see within range regains Hit Points equal to 2d4 plus your spellcasting ability modifier. Using a Higher-Level Spell Slot. The healing increases by 2d4 for each spell slot level above 1."
      , mechanics =
          { family = "activation"
          , level = 1
          , school = "abjuration"
          , castingTime = { kind = "bonus_action" }
          , range = { kind = "point", feet = 60 }
          , components = { v = True, s = False, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "healing_word_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection = { mode = "one" }
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
                          , perLevel = { dice = 2 }
                          , startingAtLevel = 1
                          }
                      , target = "target_creature"
                      }
                    ]
                }
              ]
          }
      }

in  healingWord
