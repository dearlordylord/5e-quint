-- Dominate Person — SRD 5.2.1 Spell, Level 5, Enchantment.
-- Family: activation, save_gate phase with RepeatSaveSpec.cadence =
-- "on_target_takes_damage". §A17-adjacent validation ref for the
-- damage-triggered repeat-save widening on RepeatSaveSpec.
--
-- PARTIAL.
--   • "The target has Advantage on the save if you or your allies
--     are fighting it" — save-roll rider tied to caster/ally
--     allegiance (DM-agenda; no save-side advantage grammar yet).
--     Authored save has no advantage granted; caller must impose if
--     the table rules the fighting-you-or-allies predicate holds.
--   • Telepathic link / command channel is narrative — DM agenda.

let dominatePerson =
      { kind = "spell"
      , id = "dominate_person"
      , name = "Dominate Person"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Dominate Person"
          }
      , description =
          "One Humanoid you can see within range must succeed on a Wisdom saving throw or have the Charmed condition for the duration. The target has Advantage on the save if you or your allies are fighting it. Whenever the target takes damage, it repeats the save, ending the spell on itself on a success. You have a telepathic link with the Charmed target to issue commands (no action required)."
      , mechanics =
          { family = "activation"
          , level = 5
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
                      [ { atSlot = 6, amount = 10 }
                      ]
                  }
              }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "hole"
                    , holeId = "dominate_person_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "one"
                            , typeFilter = [ "humanoid" ]
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
                , repeatSaves =
                    [ { cadence = "on_target_takes_damage"
                      , onSuccess = "ends_on_target"
                      }
                    ]
                }
              ]
          }
      }

in  dominatePerson
