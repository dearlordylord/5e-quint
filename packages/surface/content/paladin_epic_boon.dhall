let paladinEpicBoonL19 =
      { kind = "class_feature"
      , id = "paladin_epic_boon"
      , name = "Epic Boon"
      , className = "paladin"
      , acquiredAtLevel = 19
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Paladin#Epic Boon"
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

in  paladinEpicBoonL19
