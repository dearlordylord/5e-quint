-- Comprehend Languages — SRD 5.2.1 spell.
--
-- RAW (Spells/Descriptions-A-D#ComprehendLanguages):
--   "For the duration, you understand the literal meaning of any
--    language that you hear or see signed. You also understand any
--    written language that you see, but you must be touching the surface
--    on which the words are written. It takes about 1 minute to read
--    one page of text. This spell doesn't decode symbols or secret
--    messages."

let comprehendLanguages =
      { kind = "spell"
      , id = "comprehend_languages"
      , name = "Comprehend Languages"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Comprehend Languages"
          }
      , description =
          "For the duration, you understand the literal meaning of any language that you hear or see signed. You also understand any written language that you see, but you must be touching the surface on which the words are written. It takes about 1 minute to read one page of text. This spell doesn't decode symbols or secret messages."
      , mechanics =
          { family = "activation"
          , level = 1
          , school = "divination"
          , castingTime = { kind = "action", ritual = True }
          , range = { kind = "self" }
          , components =
              { v = True
              , s = True
              , m = Some "a pinch of soot and salt"
              }
          , duration =
              { kind = "timed"
              , value = { unit = "hour", amount = 1 }
              }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects =
                    [ { kind = "grant_language_understanding"
                      , scope = "spoken_signed_written_literal"
                      , intelligibleToAnyLanguageKnower = False
                      , writtenRequiresTouch = True
                      , excludesCodesAndSecretMessages = True
                      }
                    ]
                }
              ]
          }
      }

in  comprehendLanguages
