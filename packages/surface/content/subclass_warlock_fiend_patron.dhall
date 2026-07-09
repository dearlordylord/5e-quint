let fiendPatron =
      { className = "warlock"
      , description =
          "The Fiend Patron Warlock subclass choice. Subclass feature Units are modeled separately from the choice boundary."
      , featureGrants =
          [ { level = 3, unitId = "warlock_fiend_spells" }
          , { level = 3, unitId = "warlock_dark_ones_blessing" }
          , { level = 10, unitId = "warlock_fiendish_resilience" }
          ]
      , id = "subclass_warlock_fiend_patron"
      , kind = "subclass"
      , name = "Fiend Patron"
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Warlock.md:96-98,454-487" }
      }

in  fiendPatron
