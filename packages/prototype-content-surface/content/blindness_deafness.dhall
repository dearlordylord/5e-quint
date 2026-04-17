-- Blindness / Deafness — SRD 5.2.1 Spell, level 2, Transmutation.
--
-- RAW (Spells / Descriptions A-D / Blindness / Deafness):
--   "One creature that you can see within range must succeed on a
--    Constitution saving throw, or it has the Blinded or Deafened
--    condition (your choice) for the duration. At the end of each of
--    its turns, the target repeats the save, ending the spell on
--    itself on a success."
--   "Using a Higher-Level Spell Slot. You can target one additional
--    creature for each spell slot level above 2."
--
-- Consolidated validation reference for:
--   • EffectAtom.apply_condition.condition with an ARRAY payload —
--     caster picks one of the listed conditions at cast time. First
--     unit with this shape; future Suggestion / Command / Compulsion
--     candidates may reuse it.
--   • save_gate.repeatSave (already in place from Hold Person).
--   • TargetSelection.choose_up_to with SlotScaling.
--
-- Sub-agent originally proposed 4 widenings for this unit; 3 were
-- already resolved by prior session work (apply_condition atom, full
-- CONDITIONS enum including blinded/deafened, RepeatSaveSpec). Only
-- the caster-choice-of-condition shape was new — authored this tick.

let blindnessDeafness =
      { kind = "spell"
      , id = "blindness_deafness"
      , name = "Blindness/Deafness"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Blindness/Deafness"
          }
      , description =
          "One creature that you can see within range must succeed on a Constitution saving throw, or it has the Blinded or Deafened condition (your choice) for the duration. At the end of each of its turns, the target repeats the save, ending the spell on itself on a success. Using a Higher-Level Spell Slot. You can target one additional creature for each spell slot level above 2."
      , mechanics =
          { family = "activation"
          , level = 2
          , school = "transmutation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 120 }
          , components = { v = True, s = False, m = False }
          , duration =
              { kind = "timed"
              , value = { unit = "minute", amount = 1 }
              }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "target"
                    , selection =
                        { mode = "choose_up_to"
                        , count =
                            { kind = "linear"
                            , base = 1
                            , perSlotAboveBase = 1
                            , baseLevel = 2
                            }
                        }
                    }
                , ability = "con"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail =
                    { kind = "apply_condition"
                    , condition =
                        { kind = "choose"
                        , from = [ "blinded", "deafened" ]
                        }
                    }
                , onSuccess = { kind = "none" }
                , repeatSave =
                    { cadence = "end_of_target_turn"
                    , onSuccess = "ends_on_target"
                    }
                }
              ]
          }
      }

in  blindnessDeafness
