let empoweredEvocation =
      { kind = "class_feature"
      , id = "wizard_empowered_evocation"
      , name = "Empowered Evocation"
      , className = "wizard"
      , acquiredAtLevel = 10
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Wizard.md:425-427" }

      , mechanics =
          { family = "spell_damage_roll_ability_modifier"
          , spellSourceClassName = "wizard"
          , school = "evocation"
          , ability = "int"
          , damageRollCount = 1
          }
      }

in  empoweredEvocation
