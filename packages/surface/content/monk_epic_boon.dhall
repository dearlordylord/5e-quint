let monkEpicBoonL19 =
      { kind = "class_feature"
      , id = "monk_epic_boon"
      , name = "Epic Boon"
      , className = "monk"
      , acquiredAtLevel = 19
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Monk#Epic Boon"
          }

      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_feat"
                , categories =
                    [ "epic_boon"
                    , "general"
                    , "fighting_style"
                    , "origin"
                    ]
                }
              ]
          }
      }

in  monkEpicBoonL19
