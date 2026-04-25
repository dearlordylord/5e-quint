-- Sleep — SRD 5.2.1 Spell, Level 1, Enchantment.
-- §C2 validation ref — two-stage escalating save chain via
-- RepeatSaveSpec.onFailAgain.
--
-- PARTIAL.
--   • Non-sleeper / Exhaustion-immune auto-success predicate is
--     deferred (needs a per-target save-ability-filter, sibling
--     widening).
--   • "someone within 5 ft uses an action to shake it out" is a
--     caller-initiated action, narrative — DM agenda.

let sleep =
      { kind = "spell"
      , id = "sleep"
      , name = "Sleep"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Sleep"
          }
      , description =
          "Each creature of your choice in a 5-foot-radius Sphere centered on a point within range must succeed on a Wisdom saving throw or have the Incapacitated condition until the end of its next turn, at which point it must repeat the save. If the target fails the second save, the target has the Unconscious condition for the duration. The spell ends on a target if it takes damage or someone within 5 feet of it takes an action to shake it out."
      , mechanics =
          { family = "activation"
          , level = 1
          , school = "enchantment"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components =
              { v = True, s = True, m = Some "a pinch of sand or rose petals" }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              , earlyEnd =
                  [ { kind = "target_takes_damage" }
                  ]
              }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "hole"
                    , holeId = "sleep_point"
                    , label = "spell origin point"
                    , value =
                        { kind = "area"
                        , shape = { kind = "sphere", radiusFeet = 5 }
                        , origin = { kind = "point_within_range" }
                        }
                    }
                , ability = "wis"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail =
                    { kind = "apply_condition"
                    , condition = "incapacitated"
                    }
                , onSuccess = { kind = "none" }
                , repeatSave =
                    { cadence = "end_of_target_turn"
                    , onSuccess = "ends_on_target"
                    , onFailAgain =
                        { kind = "apply_condition"
                        , condition = "unconscious"
                        }
                    }
                }
              ]
          }
      }

in  sleep
