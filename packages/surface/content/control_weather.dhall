-- Control Weather - SRD 5.2.1 Spell, level 8, Transmutation.
--
-- RAW (Spells/Descriptions-A-D#Control Weather): outdoor weather within 5
-- miles changes over a Concentration duration of up to 8 hours. GM-owned
-- weather stages and the outdoor/indoors termination gate remain deferred.

let controlWeather =
      { kind = "spell"
      , id = "control_weather"
      , name = "Control Weather"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Control Weather"
          }
      , mechanics =
          { family = "activation"
          , level = 8
          , school = "transmutation"
          , castingTime = { kind = "minutes", amount = 10, ritual = False }
          , range = { kind = "self" }
          , components = { v = True, s = True, m = "burning incense" }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "hour", amount = 8 }
              }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects = [ { kind = "none" } ]
                }
              ]
          }
      }

in  controlWeather
