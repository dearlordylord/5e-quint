-- Power Word Stun — SRD 5.2.1 Spell, level 8, Enchantment.
--
-- RAW (Spells/Descriptions-M-P#Power Word Stun):
--   "If the target has 150 Hit Points or fewer, it has the Stunned
--    condition. Otherwise, its Speed is 0 until the start of your next
--    turn."
--   "The Stunned target makes a Constitution saving throw at the end
--    of each of its turns, ending the condition on itself on a success."
--
-- PARTIAL. The fallback Speed 0 timing ("until the start of your next
-- turn") is preserved in the description; `set_speed` does not yet
-- carry a short expiry.

let ChildEffect : Type =
      { kind : Text
      , condition : Optional Text
      , ability : Optional Text
      , dc : Optional { kind : Text }
      , cadence : Optional Text
      , onSuccess : Optional Text
      }

let stunned : ChildEffect =
      { kind = "apply_condition"
      , condition = Some "stunned"
      , ability = None Text
      , dc = None { kind : Text }
      , cadence = None Text
      , onSuccess = None Text
      }

let repeatSave : ChildEffect =
      { kind = "repeat_save_for_condition"
      , condition = Some "stunned"
      , ability = Some "con"
      , dc = Some { kind = "caster_spell_save_dc" }
      , cadence = Some "end_of_target_turn"
      , onSuccess = Some "ends_condition"
      }

let onLowHp =
      { kind = "composite"
      , effects = [ stunned, repeatSave ]
      }

let powerWordStun =
      { kind = "spell"
      , id = "power_word_stun"
      , name = "Power Word Stun"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P#Power Word Stun"
          }
      , description =
          "You overwhelm the mind of one creature you can see within range. If the target has 150 Hit Points or fewer, it has the Stunned condition. Otherwise, its Speed is 0 until the start of your next turn. The Stunned target makes a Constitution saving throw at the end of each of its turns, ending the condition on itself on a success."
      , mechanics =
          { family = "activation"
          , level = 8
          , school = "enchantment"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components = { v = True, s = False, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "power_word_stun_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection = { mode = "one" }
                        }
                    }
                , effects =
                    [ { kind = "conditional_by_current_hp"
                      , threshold = 150
                      , comparison = "lte"
                      , onMatch = onLowHp
                      , otherwise = { kind = "set_speed", feet = 0 }
                      }
                    ]
                }
              ]
          }
      }

in  powerWordStun
