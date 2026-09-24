let fighterFightingStyleL1 =
      { kind = "class_feature"
      , id = "fighter_fighting_style"
      , name = "Fighting Style"
      , className = "fighter"
      , acquiredAtLevel = 1
      , provenance =
          { kind = "srd-5.2.1"
          , section = "classes.md#Level 2: Fighting Style"
          }

      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_feat", category = "fighting_style" } ]
          }
      }

in  fighterFightingStyleL1
