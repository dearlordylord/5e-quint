let additionalFightingStyle =
      { kind = "class_feature"
      , id = "fighter_additional_fighting_style"
      , name = "Additional Fighting Style"
      , className = "fighter"
      , acquiredAtLevel = 7
      , provenance =
          { kind = "srd-5.2.1"
          , section = "classes.md:4876-4878"
          }

      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_feat", category = "fighting_style" } ]
          }
      }

in  additionalFightingStyle
