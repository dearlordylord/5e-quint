let evoker =
      { className = "wizard"

      , featureGrants =
        [ { level = 3, unitId = "wizard_evocation_savant" }
        , { level = 3, unitId = "wizard_potent_cantrip" }
        , { level = 10, unitId = "wizard_empowered_evocation" }
        ]
          : List { level : Natural, unitId : Text }
      , id = "subclass_wizard_evoker"
      , kind = "subclass"
      , name = "Evoker"
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Wizard.md:108-110,405-429" }
      }

in  evoker
