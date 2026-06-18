-- Sending - SRD 5.2.1 Spell, level 3, Divination.
--
-- RAW (Spells/Descriptions-S-Z#Sending):
--   "You send a short message of 25 words or fewer to a creature you have met
--    or a creature described to you by someone who has met it."
--   "The target hears the message in its mind, recognizes you as the sender if
--    it knows you, and can answer in a like manner immediately."
--   "The spell enables targets to understand the meaning of your message."
--   "You can send the message across any distance and even to other planes of
--    existence, but if the target is on a different plane than you, there is a
--    5 percent chance that the message doesn't arrive. You know if the delivery
--    fails."
--   "Upon receiving your message, a creature can block your ability to reach it
--    again with this spell for 8 hours."
--
-- Message contents, recipient identity matching, planar location, delivery
-- failure, immediate response contents, and block/retry adjudication are table
-- communication facts. This Spell Definition preserves those SRD source facts
-- without promoting a battle-runtime communication owner.

let sending =
      { kind = "spell"
      , id = "sending"
      , name = "Sending"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Sending"
          }
      , description =
          "You send a short message of 25 words or fewer to a creature you have met or a creature described to you by someone who has met it. The target hears the message in its mind, recognizes you as the sender if it knows you, and can answer in a like manner immediately. The spell enables targets to understand the meaning of your message. You can send the message across any distance and even to other planes of existence, but if the target is on a different plane than you, there is a 5 percent chance that the message doesn't arrive. You know if the delivery fails. Upon receiving your message, a creature can block your ability to reach it again with this spell for 8 hours. If you try to send another message during that time, you learn that you are blocked, and the spell fails."
      , mechanics =
          { family = "activation"
          , level = 3
          , school = "divination"
          , castingTime = { kind = "action" }
          , range = { kind = "unlimited" }
          , components =
              { v = True
              , s = True
              , m = Some "a copper wire"
              }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "sending_recipient"
                    , label = "met or described creature"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "one", targetKinds = [ "creature" ] }
                        }
                    }
                , effects =
                    [ { kind = "deliver_mental_message"
                      , recipient =
                          "met_by_caster_or_described_by_someone_who_met_it"
                      , message =
                          { maxWords = 25
                          , delivery = "target_hears_in_mind"
                          , understanding = "meaning_enabled"
                          }
                      , senderRecognition = "if_target_knows_sender"
                      , response =
                          { manner = "like_message"
                          , timing = "immediate"
                          }
                      , planarDelivery =
                          { reach = "any_distance_and_other_planes"
                          , failureChance =
                              { kind = "percent_if_different_plane"
                              , percent = 5
                              , result = "message_does_not_arrive"
                              , casterKnowsFailure = True
                              }
                          }
                      , recipientBlock =
                          { duration = { unit = "hour", amount = 8 }
                          , retryResult =
                              "caster_learns_blocked_and_spell_fails"
                          }
                      }
                    ]
                }
              ]
          }
      }

in  sending
