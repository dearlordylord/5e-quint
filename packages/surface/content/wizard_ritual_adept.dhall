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
      , description =
          "You can cast any spell as a Ritual if that spell has the Ritual tag and the spell is in your spellbook. You needn't have the spell prepared, but you must read from the book to cast a spell in this way."
      , mechanics =
          { family = "spellbook_ritual_access"
          , source = "spellbook"
          , preparationRequirement = "not_prepared"
          }
      }

in  ritualAdept
