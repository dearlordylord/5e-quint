-- Passwall - SRD 5.2.1 Spell, level 5, Transmutation.

let passwall =
      { kind = "spell"
      , id = "passwall"
      , name = "Passwall"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P#Passwall"
          }
      , description =
          "A passage appears at a point that you can see on a wooden, plaster, or stone surface such as a wall, ceiling, or floor within range and lasts for the duration. You choose dimensions up to 5 feet wide, 8 feet tall, and 20 feet deep. The passage creates no instability. When the opening disappears, creatures or objects still in the passage are safely ejected to an unoccupied space nearest to the surface on which you cast the spell."
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
