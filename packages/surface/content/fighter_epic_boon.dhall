let fighterEpicBoonL19 =
      { kind = "class_feature"
      , id = "fighter_epic_boon"
      , name = "Epic Boon"
      , className = "fighter"
      , acquiredAtLevel = 19
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Fighter#Epic Boon"
          }
      , description =
          "You gain an Epic Boon feat (see \"Feats\") or another feat of your choice for which you qualify. Boon of Combat Prowess is recommended."
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

in  fighterEpicBoonL19
