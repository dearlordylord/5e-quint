-- Message — SRD 5.2.1 Transmutation Cantrip.
--
-- RAW (Spells/Descriptions-M-P#Message):
--   The caster points toward one creature within 120 feet and whispers a
--   message only that target hears. The target can reply in a whisper only
--   the caster hears. Familiarity and knowledge of the target's location
--   permit transmission through solid objects, subject to the listed
--   magical-silence and material barriers.
--
-- Message contents, familiarity, target location beyond a barrier, and the
-- target's reply are table communication facts. This record preserves those
-- SRD facts without assigning them to battle execution.

let message =
      { kind = "spell"
      , id = "message"
      , name = "Message"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P.md#Message"
          }
      , mechanics =
          { family = "activation"
          , level = 0
          , school = "transmutation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 120 }
          , components = { v = False, s = True, m = Some "a copper wire" }
          , duration =
              { kind = "timed", value = { unit = "round", amount = 1 } }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "message_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "one", targetKinds = [ "creature" ] }
                        }
                    }
                , effects =
                    [ { kind = "deliver_whispered_message"
                      , delivery =
                          { message = "caster_whisper_to_target"
                          , targetPerception = "target_alone_hears"
                          , reply = "target_whisper_to_caster_alone"
                          }
                      , solidObjectPassage =
                          "if_familiar_with_target_and_know_target_beyond_barrier"
                      , blockedBy =
                          { magicalSilence = True
                          , stoneFeet = 1
                          , metalFeet = 1
                          , woodFeet = 1
                          , thinLead = True
                          }
                      }
                    ]
                }
              ]
          }
      }

in  message
