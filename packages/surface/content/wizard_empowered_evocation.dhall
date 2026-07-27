let empoweredEvocation =
      { kind = "class_feature"
      , id = "wizard_empowered_evocation"
      , name = "Empowered Evocation"
      , className = "wizard"
      , acquiredAtLevel = 10
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Wizard.md:425-427" }
      , description =
          "Whenever you cast a Wizard spell from the Evocation school, you can add your Intelligence modifier to one damage roll of that spell."
      , mechanics =
          { family = "spell_damage_roll_ability_modifier"
          , spellSourceClassName = "wizard"
          , school = "evocation"
          , ability = "int"
          , damageRollCount = 1
          }
      }

in  empoweredEvocation
