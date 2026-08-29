-- Etherealness - SRD 5.2.1 Spell, level 7, Conjuration.
--
-- RAW (Spells/Descriptions-E-L#Etherealness): the caster enters the Border
-- Ethereal for up to 8 hours. Planar travel/perception and return placement
-- remain outside this partial definition.

let etherealness =
      { kind = "spell"
      , id = "etherealness"
      , name = "Etherealness"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Etherealness"
          }
      , mechanics =
          { family = "activation"
          , level = 7
          , school = "conjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "self" }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "timed", value = { unit = "hour", amount = 8 } }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects = [ { kind = "none" } ]
                }
              ]
          }
      }

in  etherealness
