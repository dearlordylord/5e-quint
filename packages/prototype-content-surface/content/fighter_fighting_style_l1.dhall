let fighterFightingStyleL1 =
      { kind = "class_feature"
      , id = "fighter_fighting_style_l1"
      , name = "Fighting Style"
      , className = "fighter"
      , acquiredAtLevel = 1
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Fighter#Fighting Style"
          }
      , description =
          "You have honed your martial prowess and gain a Fighting Style feat of your choice (see \"Feats\"). Defense is recommended. Whenever you gain a Fighter level, you can replace the feat you chose with a different Fighting Style feat."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_feat", category = "fighting_style" } ]
          }
      }

in  fighterFightingStyleL1
