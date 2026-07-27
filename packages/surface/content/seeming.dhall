-- Seeming - SRD 5.2.1 Spell, level 5, Illusion.

let seeming =
      { kind = "spell"
      , id = "seeming"
      , name = "Seeming"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Seeming"
          }
      , description =
          "You give an illusory appearance to each creature of your choice that you can see within range. An unwilling target can make a Charisma saving throw, and if it succeeds, it is unaffected. You can give the same or different appearances, changing bodies and equipment, making a target seem 1 foot shorter or taller and heavier or lighter. The new appearance must have the same basic arrangement of limbs. The changes fail physical inspection. A creature that takes the Study action can make an Intelligence (Investigation) check against your spell save DC; if it succeeds, it becomes aware the target is disguised."
      , mechanics =
          { family = "activation"
          , level = 5
          , school = "illusion"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 30 }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "timed", value = { unit = "hour", amount = 8 } }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "hole"
                    , holeId = "seeming_targets"
                    , label = "chosen visible creatures"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "any_number"
                            , targetKinds = [ "creature" ]
                            }
                        }
                    }
                , ability = "cha"
                , dc = { kind = "caster_spell_save_dc" }
                , saveAppliesIf = "unwilling_target"
                , onFail =
                    { kind = "create_illusion"
                    , maxSize = "medium"
                    , channels = [ "visual" ]
                    }
                , onSuccess = { kind = "none" }
                }
              ]
          }
      }

in  seeming
