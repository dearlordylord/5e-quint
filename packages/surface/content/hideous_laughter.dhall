-- Hideous Laughter — SRD 5.2.1 Spell, level 1, Enchantment.
--
-- RAW (Spells / Descriptions E-L / Hideous Laughter):
--   "One creature of your choice that you can see within range makes
--    a Wisdom saving throw. On a failed save, it has the Prone and
--    Incapacitated conditions for the duration... it can't end the
--    Prone condition on itself."
--   "At the end of each of its turns and each time it takes damage,
--    it makes another Wisdom saving throw. The target has Advantage
--    on the save if the save is triggered by damage. On a successful
--    save, the spell ends."
--   "Using a Higher-Level Spell Slot. You can target one additional
--    creature for each spell slot level above 1."

let Effect : Type = { kind : Text, condition : Text }

let RepeatSave : Type =
      { cadence : Text, rollMode : Optional Text, onSuccess : Text }

let prone : Effect = { kind = "apply_condition", condition = "prone" }

let incapacitated : Effect =
      { kind = "apply_condition", condition = "incapacitated" }

let cannotEndProne : Effect =
      { kind = "suppress_condition_self_end", condition = "prone" }

let endTurnSave : RepeatSave =
      { cadence = "end_of_target_turn"
      , rollMode = None Text
      , onSuccess = "ends_on_target"
      }

let damageTriggeredSave : RepeatSave =
      { cadence = "on_target_takes_damage"
      , rollMode = Some "advantage"
      , onSuccess = "ends_on_target"
      }

let hideousLaughter =
      { kind = "spell"
      , id = "hideous_laughter"
      , name = "Hideous Laughter"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Hideous Laughter"
          }
      , description =
          "One creature of your choice that you can see within range makes a Wisdom saving throw. On a failed save, it has the Prone and Incapacitated conditions for the duration. During that time, it laughs uncontrollably if it's capable of laughter, and it can't end the Prone condition on itself. At the end of each of its turns and each time it takes damage, it makes another Wisdom saving throw. The target has Advantage on the save if the save is triggered by damage. On a successful save, the spell ends. Using a Higher-Level Spell Slot. You can target one additional creature for each spell slot level above 1."
      , mechanics =
          { family = "activation"
          , level = 1
          , school = "enchantment"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 30 }
          , components =
              { v = True
              , s = True
              , m = Some "a tart and a feather"
              }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "hole"
                    , holeId = "hideous_laughter_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "choose_up_to"
                            , count =
                                { kind = "linear"
                                , base = 1
                                , perSlotAboveBase = 1
                                , baseLevel = 1
                                }
                            , targetKinds = [ "creature" ]
                            }
                        }
                    }
                , ability = "wis"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail =
                    { kind = "composite"
                    , effects = [ prone, incapacitated, cannotEndProne ]
                    }
                , onSuccess = { kind = "none" }
                , repeatSaves = [ endTurnSave, damageTriggeredSave ]
                }
              ]
          }
      }

in  hideousLaughter
