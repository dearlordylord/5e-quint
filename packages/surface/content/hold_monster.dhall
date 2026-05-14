-- Hold Monster — SRD 5.2.1 Spell, level 5, Enchantment.
--
-- RAW (Spells / Descriptions E-L / Hold Monster):
--   "Choose a creature that you can see within range. The target must
--    succeed on a Wisdom saving throw or have the Paralyzed condition
--    for the duration. At the end of each of its turns, the target
--    repeats the save, ending the spell on itself on a success."
--   "Using a Higher-Level Spell Slot. You can target one additional
--    creature for each spell slot level above 5."
--
-- ZERO-WIDENING VALIDATION REFERENCE. Structurally parallel to Hold
-- Person minus the Humanoid-only target filter (Hold Monster works
-- on any creature). Exercises the RepeatSaveSpec landed for Hold
-- Person.

let holdMonster =
      { kind = "spell"
      , id = "hold_monster"
      , name = "Hold Monster"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Hold Monster"
          }
      , description =
          "Choose a creature that you can see within range. The target must succeed on a Wisdom saving throw or have the Paralyzed condition for the duration. At the end of each of its turns, the target repeats the save, ending the spell on itself on a success. Using a Higher-Level Spell Slot. You can target one additional creature for each spell slot level above 5."
      , mechanics =
          { family = "activation"
          , level = 5
          , school = "enchantment"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 90 }
          , components =
              { v = True
              , s = True
              , m = Some "a straight piece of iron"
              }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "hole"
                    , holeId = "hold_monster_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "choose_up_to"
                            , count =
                                { kind = "linear"
                                , base = 1
                                , perSlotAboveBase = 1
                                , baseLevel = 5
                                }
                            }
                        }
                    }
                , ability = "wis"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail =
                    { kind = "apply_condition"
                    , condition = "paralyzed"
                    }
                , onSuccess = { kind = "none" }
                , repeatSaves =
                    [ { cadence = "end_of_target_turn"
                      , onSuccess = "ends_on_target"
                      }
                    ]
                }
              ]
          }
      }

in  holdMonster
