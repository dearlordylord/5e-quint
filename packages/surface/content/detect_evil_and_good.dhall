-- Detect Evil and Good - SRD 5.2.1 Spell, level 1, Divination.
--
-- RAW (Spells / Descriptions A-D / Detect Evil and Good):
--   "For the duration, you sense the location of any Aberration,
--    Celestial, Elemental, Fey, Fiend, or Undead within 30 feet of
--    yourself. You also sense whether the Hallow spell is active
--    there and, if so, where."
--   "The spell is blocked by 1 foot of stone, dirt, or wood; 1 inch
--    of metal; or a thin sheet of lead."
--
-- This record reuses the Detect Magic activation, concentration, and
-- direct self detect atom shape with the existing evil_and_good
-- detection property. Detection search, occlusion, and Hallow discovery
-- remain session/exploration runtime ownership and are not promoted by
-- this Spell Definition record.
let detectEvilAndGood =
      { kind = "spell"
      , id = "detect_evil_and_good"
      , name = "Detect Evil and Good"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Detect Evil and Good"
          }
      , description =
          "For the duration, you sense the location of any Aberration, Celestial, Elemental, Fey, Fiend, or Undead within 30 feet of yourself. You also sense whether the Hallow spell is active there and, if so, where."
      , mechanics =
          { family = "activation"
          , level = 1
          , school = "divination"
          , castingTime = { kind = "action" }
          , range = { kind = "self" }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 10 }
              }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects =
                    [ { kind = "detect"
                      , property = "evil_and_good"
                      , radiusFeet = 30
                      }
                    ]
                }
              ]
          }
      }

in  detectEvilAndGood
