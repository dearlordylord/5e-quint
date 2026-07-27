let bardEpicBoonL19 =
      { kind = "class_feature"
      , id = "bard_epic_boon"
      , name = "Epic Boon"
      , className = "bard"
      , acquiredAtLevel = 19
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Bard#Epic Boon"
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

in  bardEpicBoonL19
