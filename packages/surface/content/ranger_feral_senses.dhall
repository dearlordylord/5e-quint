let feralSenses =
      { kind = "class_feature"
      , id = "ranger_feral_senses"
      , name = "Feral Senses"
      , className = "ranger"
      , acquiredAtLevel = 18
      , provenance =
          { kind = "srd-5.2.1"
          , section = "classes.md#Level 18: Feral Senses"
          }

      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_sense"
                , sense = "blindsight"
                , rangeFeet = 30
                }
              ]
          }
      }

in  feralSenses
