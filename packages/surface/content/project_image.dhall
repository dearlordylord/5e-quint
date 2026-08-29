-- Project Image - SRD 5.2.1 Spell, level 7, Illusion.
--
-- RAW (Spells/Descriptions-M-P#Project Image): an intangible copy can be
-- placed within 500 miles for up to 1 day of Concentration. Remote senses,
-- movement, and damage termination remain deferred.

let projectImage =
      { kind = "spell"
      , id = "project_image"
      , name = "Project Image"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P#Project Image"
          }
      , mechanics =
          { family = "activation"
          , level = 7
          , school = "illusion"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 2640000 }
          , components =
              { v = True, s = True, m = "a statuette of yourself worth 5+ GP" }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "day", amount = 1 }
              }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "location"
                    , description = "a location you have seen before within range"
                    }
                , effects = [ { kind = "none" } ]
                }
              ]
          }
      }

in  projectImage
