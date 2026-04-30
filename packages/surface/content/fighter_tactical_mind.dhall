let tacticalMind =
      { kind = "class_feature"
      , id = "fighter_tactical_mind"
      , name = "Tactical Mind"
      , className = "fighter"
      , acquiredAtLevel = 2
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Fighter.md:82-84"
          }
      , description =
          "When you fail an ability check, you can expend a use of Second Wind to roll 1d10 and add the number rolled to the ability check, potentially turning it into a success. If the check still fails, this use of Second Wind isn't expended."
      , mechanics =
          { family = "failed_ability_check_second_wind_boost"
          , trigger = { kind = "failed_ability_check" }
          , spends = { resourceUnitId = "fighter_second_wind" }
          , bonus = { kind = "dice", expr = { dice = 1, dieSize = 10 } }
          , refundSpendOnStillFailed = True
          }
      }

in  tacticalMind
