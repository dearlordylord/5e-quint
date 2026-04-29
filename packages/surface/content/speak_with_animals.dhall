-- Speak with Animals — SRD 5.2.1 spell.
--
-- RAW (Spells/Descriptions-S-Z#SpeakWithAnimals):
--   "For the duration, you can comprehend and verbally communicate with
--    Beasts, and you can use any of the Influence action's skill options
--    with them."
--
-- The descriptive minimum information clause is retained in description;
-- the executable surface fact is the temporary Beast communication plus
-- Influence-action access.

let speakWithAnimals =
      { kind = "spell"
      , id = "speak_with_animals"
      , name = "Speak with Animals"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Speak with Animals"
          }
      , description =
          "For the duration, you can comprehend and verbally communicate with Beasts, and you can use any of the Influence action's skill options with them. Most Beasts have little to say about topics that don't pertain to survival or companionship, but at minimum, a Beast can give you information about nearby locations and monsters, including whatever it has perceived within the past day."
      , mechanics =
          { family = "activation"
          , level = 1
          , school = "divination"
          , castingTime = { kind = "action", ritual = True }
          , range = { kind = "self" }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "timed"
              , value = { unit = "minute", amount = 10 }
              }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects =
                    [ { kind = "grant_creature_communication"
                      , creatureType = "beast"
                      , includesInfluenceActionOptions = True
                      }
                    ]
                }
              ]
          }
      }

in  speakWithAnimals
