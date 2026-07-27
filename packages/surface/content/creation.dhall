-- Creation - SRD 5.2.1 Spell, level 5, Illusion.

let creation =
      { kind = "spell"
      , id = "creation"
      , name = "Creation"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Creation"
          }

      , mechanics =
          { family = "activation"
          , level = 5
          , school = "illusion"
          , castingTime = { kind = "minutes", amount = 1, ritual = False }
          , range = { kind = "point", feet = 30 }
          , components = { v = True, s = True, m = "a paintbrush" }
          , duration =
              { kind = "timed", value = { unit = "hour", amount = 24 } }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "location", description = "within range" }
                , effects =
                    [ { kind = "create_object"
                      , maxSize = "medium"
                      , shape = { kind = "cube", sideFeet = 5 }
                      }
                    ]
                }
              ]
          }
      }

in  creation
