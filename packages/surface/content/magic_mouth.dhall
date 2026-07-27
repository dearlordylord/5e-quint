-- Magic Mouth - SRD 5.2.1 Spell, level 2, Illusion.
--
-- RAW (Spells/Descriptions-M-P#Magic Mouth):
--   "Choose an object that you can see and that isn't being worn or
--    carried by another creature."
--   "Then speak the message, which must be 25 words or fewer, though it
--    can be delivered over as long as 10 minutes."
--   "The trigger ... must be based on visual or audible conditions that
--    occur within 30 feet of the object."
--
-- Durable object attachment, arbitrary visual/audible trigger adjudication,
-- message playback, mouth placement, volume presentation, and repeat/end
-- scheduling are object/presentation facts outside promoted battle runtime.

let magicMouth =
      { kind = "spell"
      , id = "magic_mouth"
      , name = "Magic Mouth"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P#Magic Mouth"
          }

      , mechanics =
          { family = "anchored_trigger"
          , level = 2
          , school = "illusion"
          , castingTime =
              { kind = "minutes"
              , amount = 1
              , ritual = True
              }
          , range =
              { kind = "point"
              , feet = 30
              }
          , components =
              { v = True
              , s = True
              , m = Some "jade dust worth 10+ GP, which the spell consumes"
              , materialCostGp = Some 10
              , materialConsumed = Some True
              }
          , duration =
              { kind = "permanent"
              , endsOn = [ "dispel" ]
              }
          , anchor =
              { kind = "object"
              , visibility = "caster_can_see"
              , wornOrCarried = "not_worn_or_carried_by_another_creature"
              }
          , events =
              [ { kind = "caster_defined_visual_or_audible_condition"
                , maxDistanceFeet = 30
                }
              ]
          , filters = [] : List { kind : Text, chosenAtCast : Bool }
          , signals =
              [ { kind = "spoken_message"
                , voice = "caster_voice"
                , volume = "same_as_spoken"
                , maxWords = 25
                , maxDeliveryMinutes = 10
                , mouthPlacement = "object_mouth_if_present"
                , repetition = "caster_choice_once_or_repeating"
                }
              ]
          }
      }

in  magicMouth
