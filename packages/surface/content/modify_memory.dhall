-- Modify Memory - SRD 5.2.1 Spell, level 5, Enchantment.

let modifyMemory =
      { kind = "spell"
      , id = "modify_memory"
      , name = "Modify Memory"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P#Modify Memory"
          }
      , description =
          "One creature you can see within range makes a Wisdom saving throw, with Advantage if you are fighting it. On a failed save, it has the Charmed condition for the duration, is Incapacitated, and is unaware of its surroundings though it can hear you. If it takes damage or is targeted by another spell, this spell ends and no memories are modified. While the charm lasts, you can affect the target's memory of an event within the last 24 hours that lasted no more than 10 minutes, permanently eliminating, clarifying, changing, or creating a memory. The target must understand your spoken description. Remove Curse or Greater Restoration restores the true memory. Higher-level slots widen the memory window to 7 days, 30 days, 365 days, or any time in the past."
      , mechanics =
          { family = "activation"
          , level = 5
          , school = "enchantment"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 30 }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              , earlyEnd = [ { kind = "target_takes_damage" } ]
              }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "hole"
                    , holeId = "modify_memory_target"
                    , label = "target creature"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "one"
                            , targetKinds = [ "creature" ]
                            , visibility = "caster_can_see"
                            }
                        }
                    }
                , ability = "wis"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail =
                    { kind = "apply_condition"
                    , condition = [ "charmed", "incapacitated" ]
                    }
                , onSuccess = { kind = "none" }
                }
              ]
          }
      }

in  modifyMemory
