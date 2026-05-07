let arcaneRecovery =
      { kind = "class_feature"
      , id = "wizard_arcane_recovery"
      , name = "Arcane Recovery"
      , className = "wizard"
      , acquiredAtLevel = 1
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Wizard.md:98-102"
          }
      , description =
          "When you finish a Short Rest, you can choose expended spell slots to recover. The spell slots can have a combined level equal to no more than half your Wizard level, rounded up, and none of the slots can be level 6 or higher. Once you use this feature, you can't do so again until you finish a Long Rest."
      , mechanics =
          { family = "rest_spell_slot_recovery"
          , recoveryTrigger = "short_rest"
          , resetCadence = { kind = "long_rest" }
          , recoveredSlotLevelCap =
              { kind = "half_class_level_rounded_up"
              , maximumSlotLevelExclusive = 6
              }
          }
      }

in  arcaneRecovery
