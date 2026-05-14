-- Hold Person — SRD 5.2.1 Spell, level 2, Enchantment.
--
-- RAW (Spells / Descriptions E-L / Hold Person):
--   "Choose a Humanoid that you can see within range. The target must
--    succeed on a Wisdom saving throw or have the Paralyzed condition
--    for the duration. At the end of each of its turns, the target
--    repeats the save, ending the spell on itself on a success."
--   "Using a Higher-Level Spell Slot. You can target one additional
--    Humanoid for each spell slot level above 2."
--
-- Consolidated validation reference for:
--   • save_gate.repeatSaves { cadence = end_of_target_turn,
--                            onSuccess = ends_on_target }
--     (recurring save-to-end attached to the initial save_gate phase;
--      reuses ability + DC from the parent)
--   • TargetSelection.choose_up_to with SlotScaling (base 1, +1/slot)
--   • TargetSelection.typeFilter = [ "humanoid" ] (the Humanoid-only
--     target restriction; same enum shared with attacker-side filter
--     on modify_roll_advantage used by Protection from Evil and Good)
--   • Duration.concentration up to 1 minute

let hold_person =
      { kind = "spell"
      , id = "hold_person"
      , name = "Hold Person"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Hold Person"
          }
      , description =
          "Choose a Humanoid that you can see within range. The target must succeed on a Wisdom saving throw or have the Paralyzed condition for the duration. At the end of each of its turns, the target repeats the save, ending the spell on itself on a success. Using a Higher-Level Spell Slot. You can target one additional Humanoid for each spell slot level above 2."
      , mechanics =
          { family = "activation"
          , level = 2
          , school = "enchantment"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
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
                    , holeId = "hold_person_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "choose_up_to"
                            , count =
                                { kind = "linear"
                                , base = 1
                                , perSlotAboveBase = 1
                                , baseLevel = 2
                                }
                            , typeFilter = [ "humanoid" ]
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

in  hold_person
