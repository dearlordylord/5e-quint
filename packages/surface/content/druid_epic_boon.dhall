let druidEpicBoonL19 =
      { kind = "class_feature"
      , id = "druid_epic_boon"
      , name = "Epic Boon"
      , className = "druid"
      , acquiredAtLevel = 19
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Druid#Epic Boon"
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

in  druidEpicBoonL19
