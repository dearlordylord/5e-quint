let champion =
      { className = "fighter"
      , description =
          "The Champion Fighter subclass choice. Subclass feature Units are promoted separately from the choice boundary."
      , featureGrants =
          [ { level = 3, unitId = "fighter_improved_critical" } ]
      , id = "subclass_fighter_champion"
      , kind = "subclass"
      , name = "Champion"
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Fighter.md:86-88,130-152" }
      }

in  champion
