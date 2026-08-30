-- Disguise Self - SRD 5.2.1 Spell, level 1, Illusion.
--
-- RAW (Spells/Descriptions-A-D#Disguise Self): a self illusion lasts 1 hour;
-- Study/Investigation physical-inspection adjudication is deferred.

let disguiseSelf =
      { kind = "spell"
      , id = "disguise_self"
      , name = "Disguise Self"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Disguise Self"
          }
      , mechanics =
          { family = "activation"
          , level = 1
          , school = "illusion"
          , castingTime = { kind = "action" }
          , range = { kind = "self" }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "timed", value = { unit = "hour", amount = 1 } }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects = [ { kind = "none" } ]
                }
              ]
          }
      }

in  disguiseSelf
