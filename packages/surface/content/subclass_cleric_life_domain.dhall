let lifeDomain =
      { className = "cleric"
      , description =
          "The Life Domain Cleric subclass choice. Subclass feature Units are modeled separately from the choice boundary."
      , featureGrants =
          [ { level = 3, unitId = "cleric_life_domain_spells" } ]
      , id = "subclass_cleric_life_domain"
      , kind = "subclass"
      , name = "Life Domain"
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Cleric.md:102-104,305-338" }
      }

in  lifeDomain
