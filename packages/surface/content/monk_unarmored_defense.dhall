-- Unarmored Defense — SRD 5.2.1 Monk level 1.

let SimplePredicate = { kind : Text }

let unarmoredDefense =
      { kind = "class_feature"
      , id = "monk_unarmored_defense"
      , name = "Unarmored Defense"
      , className = "monk"
      , acquiredAtLevel = 1
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Monk#Unarmored Defense"
          }

      , mechanics =
          { family = "passive"
          , condition =
              { kind = "all_of"
              , predicates =
                  [ { kind = "unarmored" }
                  , { kind = "not_wielding_shield" }
                  ] : List SimplePredicate
              }
          , grants =
              [ { kind = "modify_ac_set_base"
                , formula =
                    { kind = "base_plus_dex_wis"
                    , base = 10
                    }
                }
              ]
          }
      }

in  unarmoredDefense
