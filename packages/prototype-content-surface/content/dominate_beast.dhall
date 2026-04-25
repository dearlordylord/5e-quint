-- Dominate Beast — SRD 5.2.1 Spell, Level 4, Enchantment.
-- Sibling of Dominate Person. Same PARTIAL notes apply.

let dominateBeast =
      { kind = "spell"
      , id = "dominate_beast"
      , name = "Dominate Beast"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Dominate Beast"
          }
      , description =
          "One Beast you can see within range must succeed on a Wisdom saving throw or have the Charmed condition for the duration. The target has Advantage on the save if you or your allies are fighting it. Whenever the target takes damage, it repeats the save, ending the spell on itself on a success."
      , mechanics =
          { family = "activation"
          , level = 4
          , school = "enchantment"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "concentration"
              , upTo =
                  { unit = "minute"
                  , amount = 1
                  , upcastTiers =
                      [ { atSlot = 5, amount = 10 }
                      ]
                  }
              }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "hole"
                    , holeId = "dominate_beast_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "one"
                            , typeFilter = [ "beast" ]
                            }
                        }
                    }
                , ability = "wis"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail =
                    { kind = "apply_condition"
                    , condition = "charmed"
                    }
                , onSuccess = { kind = "none" }
                , repeatSave =
                    { cadence = "on_target_takes_damage"
                    , onSuccess = "ends_on_target"
                    }
                }
              ]
          }
      }

in  dominateBeast
