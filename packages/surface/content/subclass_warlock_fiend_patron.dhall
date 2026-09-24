let fiendPatron =
      { className = "warlock"

      , featureGrants =
          [ { level = 3, unitId = "warlock_fiend_spells" }
          , { level = 3, unitId = "warlock_dark_ones_blessing" }
          , { level = 10, unitId = "warlock_fiendish_resilience" }
          ]
      , id = "subclass_warlock_fiend_patron"
      , kind = "subclass"
      , name = "Fiend Patron"
      , provenance =
          { kind = "srd-5.2.1", section = "classes.md#Warlock Subclass: Fiend Patron" }
      }

in  fiendPatron
