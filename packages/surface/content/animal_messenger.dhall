-- Animal Messenger - SRD 5.2.1 Spell, level 2, Enchantment.
--
-- RAW (Spells/Descriptions-A-D#Animal Messenger):
--   "A Tiny Beast of your choice that you can see within range must succeed
--    on a Charisma saving throw, or it attempts to deliver a message for you
--    (if the target's Challenge Rating isn't 0, it automatically succeeds)."
--   "You specify a location you have visited and a recipient who matches a
--    general description..."
--   "You also communicate a message of up to twenty-five words."
--   "The Beast travels for the duration toward the specified location,
--    covering about 25 miles per 24 hours or 50 miles if the Beast can fly."
--   "If the Beast doesn't reach its destination before the spell ends, the
--    message is lost, and the Beast returns to where you cast the spell."
--
-- Beast route choice, recipient matching, travel progress, delivery success,
-- message playback, message loss, and return travel are table/exploration
-- adjudication. This Spell Definition preserves the SRD source facts without
-- promoting a battle-runtime Beast routing or message-delivery owner.

let animalMessenger =
      { kind = "spell"
      , id = "animal_messenger"
      , name = "Animal Messenger"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Animal Messenger"
          }
      , description =
          "A Tiny Beast of your choice that you can see within range must succeed on a Charisma saving throw, or it attempts to deliver a message for you; if the target's Challenge Rating isn't 0, it automatically succeeds. You specify a location you have visited and a recipient who matches a general description. You also communicate a message of up to twenty-five words. The Beast travels for the duration toward the specified location, covering about 25 miles per 24 hours or 50 miles if the Beast can fly. When the Beast arrives, it delivers your message to the creature that you described, mimicking your communication. If the Beast doesn't reach its destination before the spell ends, the message is lost, and the Beast returns to where you cast the spell. Using a Higher-Level Spell Slot. The spell's duration increases by 48 hours for each spell slot level above 2."
      , mechanics =
          { family = "activation"
          , level = 2
          , school = "enchantment"
          , castingTime = { kind = "action", ritual = True }
          , range = { kind = "point", feet = 30 }
          , components =
              { v = True
              , s = True
              , m = Some "a morsel of food"
              }
          , duration =
              { kind = "timed"
              , value =
                  { unit = "hour"
                  , amount = 24
                  , upcastTiers =
                      [ { atSlot = 3, amount = 72 }
                      , { atSlot = 4, amount = 120 }
                      , { atSlot = 5, amount = 168 }
                      , { atSlot = 6, amount = 216 }
                      , { atSlot = 7, amount = 264 }
                      , { atSlot = 8, amount = 312 }
                      , { atSlot = 9, amount = 360 }
                      ]
                  }
              }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "hole"
                    , holeId = "animal_messenger_target"
                    , label = "target Tiny Beast"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "one"
                            , targetKinds = [ "creature" ]
                            , typeFilter = [ "beast" ]
                            , creatureSizeFilter =
                                { kind = "exact", creatureSize = "tiny" }
                            }
                        }
                    }
                , ability = "cha"
                , dc = { kind = "caster_spell_save_dc" }
                , autoSuccessIfTarget =
                    { kind = "challenge_rating_not_equal"
                    , challengeRating = 0
                    }
                , onFail =
                    { kind = "assign_courier_task"
                    , messenger = "target_beast"
                    , destination = "caster_specified_visited_location"
                    , recipient = "caster_specified_general_description"
                    , message =
                        { maxWords = 25
                        , delivery = "mimic_caster_communication"
                        }
                    , travel =
                        { direction = "toward_destination_for_duration"
                        , groundMilesPer24Hours = 25
                        , flyingMilesPer24Hours = 50
                        }
                    , onArrival = "deliver_to_described_creature"
                    , onExpiryBeforeArrival =
                        "message_lost_and_beast_returns_to_casting_location"
                    }
                , onSuccess = { kind = "none" }
                }
              ]
          }
      }

in  animalMessenger
