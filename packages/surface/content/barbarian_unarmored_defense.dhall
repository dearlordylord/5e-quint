-- Unarmored Defense — SRD 5.2.1 Barbarian level 1.

let unarmoredDefense =
      { kind = "class_feature"
      , id = "barbarian_unarmored_defense"
      , name = "Unarmored Defense"
      , className = "barbarian"
      , acquiredAtLevel = 1
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Barbarian#Unarmored Defense"
          }
      , description =
          "While you aren't wearing any armor, your base Armor Class equals 10 plus your Dexterity and Constitution modifiers. You can use a Shield and still gain this benefit."
      , mechanics =
          { family = "passive"
          , condition = { kind = "unarmored" }
          , grants =
              [ { kind = "modify_ac_set_base"
                , formula =
                    { kind = "base_plus_dex_con"
                    , base = 10
                    }
                }
              ]
          }
      }

in  unarmoredDefense
