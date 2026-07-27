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
