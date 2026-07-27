-- Dream - SRD 5.2.1 Spell, level 5, Illusion.

let dream =
      { kind = "spell"
      , id = "dream"
      , name = "Dream"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Dream"
          }

      , mechanics =
          { family = "activation"
          , level = 5
          , school = "illusion"
          , castingTime = { kind = "minutes", amount = 1, ritual = False }
          , range = { kind = "unlimited" }
          , components = { v = True, s = True, m = "a handful of sand" }
          , duration = { kind = "timed", value = { unit = "hour", amount = 8 } }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects = [ { kind = "none" } ]
                }
              ]
          }
      }

in  dream
