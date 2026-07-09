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
          "You are immune to the Poisoned condition, and you have Resistance to a damage type associated with your current land choice in the Circle Spells feature. Arid grants Fire resistance, Polar grants Cold resistance, Temperate grants Lightning resistance, and Tropical grants Poison resistance. Surface owner need: Character Sheet already owns the current Circle Spells land choice; DamageTypeRef must support a closed table projection from that existing land choice instead of storing a duplicate resistance choice."
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
