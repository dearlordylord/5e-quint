let circleOfTheLand =
      { className = "druid"
      , description =
          "The Circle of the Land Druid subclass choice. Subclass feature Units are modeled separately from the choice boundary."
      , featureGrants =
          [ { level = 3, unitId = "druid_circle_of_the_land_spells" }
          , { level = 3, unitId = "druid_lands_aid" }
          ]
      , id = "subclass_druid_circle_of_the_land"
      , kind = "subclass"
      , name = "Circle of the Land"
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Druid.md:130-132,360-429" }
      }

in  circleOfTheLand
