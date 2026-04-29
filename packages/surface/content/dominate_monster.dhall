-- Dominate Monster — SRD 5.2.1 Spell, Level 8, Enchantment.
-- Sibling of Dominate Person. No creature-type filter (any
-- creature). Base duration 1 hour, upcast at level 9 → 8 hours.

let dominateMonster =
      { kind = "spell"
      , id = "dominate_monster"
      , name = "Dominate Monster"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Dominate Monster"
          }
      , description =
          "One creature you can see within range must succeed on a Wisdom saving throw or have the Charmed condition for the duration. The target has Advantage on the save if you or your allies are fighting it. Whenever the target takes damage, it repeats the save, ending the spell on itself on a success."
      , mechanics =
          { family = "activation"
          , level = 8
          , school = "enchantment"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "concentration"
              , upTo =
                  { unit = "hour"
                  , amount = 1
                  , upcastTiers =
                      [ { atSlot = 9, amount = 8 }
                      ]
                  }
              }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "hole"
                    , holeId = "dominate_monster_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection = { mode = "one" }
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

in  dominateMonster
