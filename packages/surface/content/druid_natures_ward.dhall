let naturesWard =
      { kind = "class_feature"
      , id = "druid_natures_ward"
      , name = "Nature's Ward"
      , className = "druid"
      , acquiredAtLevel = 10
      , provenance =
          { kind = "srd-5.2.1"
          , section = "classes.md#Level 10: Nature's Ward"
          }

      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_condition_immunity"
                , condition = "poisoned"
                }
              ]
          }
      }

in  naturesWard
