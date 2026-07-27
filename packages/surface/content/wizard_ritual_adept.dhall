let ritualAdept =
      { kind = "class_feature"
      , id = "wizard_ritual_adept"
      , name = "Ritual Adept"
      , className = "wizard"
      , acquiredAtLevel = 1
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Wizard.md:94-96"
          }

      , mechanics =
          { family = "spellbook_ritual_access"
          , source = "spellbook"
          , preparationRequirement = "not_prepared"
          }
      }

in  ritualAdept
