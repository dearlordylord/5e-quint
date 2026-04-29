-- Tongues — SRD 5.2.1 spell.
--
-- RAW (Spells/Descriptions-S-Z#Tongues):
--   "This spell grants the creature you touch the ability to understand
--    any spoken or signed language that it hears or sees. Moreover,
--    when the target communicates by speaking or signing, any creature
--    that knows at least one language can understand it if that creature
--    can hear the speech or see the signing."

let tongues =
      { kind = "spell"
      , id = "tongues"
      , name = "Tongues"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Tongues"
          }
      , description =
          "This spell grants the creature you touch the ability to understand any spoken or signed language that it hears or sees. Moreover, when the target communicates by speaking or signing, any creature that knows at least one language can understand it if that creature can hear the speech or see the signing."
      , mechanics =
          { family = "activation"
          , level = 3
          , school = "divination"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components =
              { v = True
              , s = False
              , m = Some "a miniature ziggurat"
              }
          , duration =
              { kind = "timed"
              , value = { unit = "hour", amount = 1 }
              }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "tongues_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection = { mode = "one" }
                        }
                    }
                , effects =
                    [ { kind = "grant_language_understanding"
                      , scope = "spoken_or_signed"
                      , intelligibleToAnyLanguageKnower = True
                      }
                    ]
                }
              ]
          }
      }

in  tongues
