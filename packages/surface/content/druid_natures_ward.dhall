let naturesWard =
      { kind = "class_feature"
      , id = "druid_natures_ward"
      , name = "Nature's Ward"
      , className = "druid"
      , acquiredAtLevel = 10
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Druid#Nature's Ward"
          }
      , description =
          "You are immune to the Poisoned condition, and you have Resistance to a damage type associated with your current land choice in the Circle Spells feature, as shown in the Nature's Ward table: Arid, Fire; Polar, Cold; Temperate, Lightning; Tropical, Poison."
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
