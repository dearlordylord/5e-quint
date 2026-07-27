-- Passwall - SRD 5.2.1 Spell, level 5, Transmutation.

let passwall =
      { kind = "spell"
      , id = "passwall"
      , name = "Passwall"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P#Passwall"
          }

      , mechanics =
          { family = "activation"
          , level = 5
          , school = "transmutation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 30 }
          , components =
              { v = True, s = True, m = "a pinch of sesame seeds" }
          , duration = { kind = "timed", value = { unit = "hour", amount = 1 } }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "location"
                    , description =
                        "point that you can see on a wooden, plaster, or stone surface within range"
                    }
                , effects = [ { kind = "none" } ]
                }
              ]
          }
      }

in  passwall
