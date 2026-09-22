let tacticalMind =
      { kind = "class_feature"
      , id = "fighter_tactical_mind"
      , name = "Tactical Mind"
      , className = "fighter"
      , acquiredAtLevel = 2
      , provenance =
          { kind = "srd-5.2.1"
          , section = "classes.md:4814-4816"
          }

      , mechanics =
          { family = "failed_ability_check_resource_boost"
          , trigger = { kind = "failed_ability_check" }
          -- Required SRD cross-record reference: classes.md:4814-4816
          -- names Second Wind as the resource Tactical Mind expends.
          , spends = { resourceUnitId = "fighter_second_wind" }
          , bonus = { kind = "dice", expr = { dice = 1, dieSize = 10 } }
          , refundSpendOnStillFailed = True
          }
      }

in  tacticalMind
