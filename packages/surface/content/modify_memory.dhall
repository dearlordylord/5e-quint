-- Modify Memory - SRD 5.2.1 Spell, level 5, Enchantment.

let modifyMemory =
      { kind = "spell"
      , id = "modify_memory"
      , name = "Modify Memory"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P#Modify Memory"
          }

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
