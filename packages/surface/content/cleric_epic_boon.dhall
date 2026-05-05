let clericEpicBoonL19 =
      { kind = "class_feature"
      , id = "cleric_epic_boon"
      , name = "Epic Boon"
      , className = "cleric"
      , acquiredAtLevel = 19
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Cleric#Epic Boon"
          }
      , description =
          "You gain an Epic Boon feat (see \"Feats\") or another feat of your choice for which you qualify. Boon of Fate is recommended."
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

in  clericEpicBoonL19
