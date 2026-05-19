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
      , description =
          "You implant a spoken message within an object in range. Choose an object that you can see and that isn't being worn or carried by another creature. The message must be 25 words or fewer and can be delivered over as long as 10 minutes. You determine the trigger, which must be based on visual or audible conditions within 30 feet of the object. When the trigger occurs, a magical mouth appears on the object and recites the message in your voice and at the same volume. If the object has a mouth or mouthlike feature, the magical mouth appears there. You choose when you cast the spell whether it ends after delivering the message or remains and repeats whenever the trigger occurs."
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
