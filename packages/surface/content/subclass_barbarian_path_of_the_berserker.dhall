let pathOfTheBerserker =
      { className = "barbarian"
      , description =
          "The Path of the Berserker Barbarian subclass choice. Subclass feature Units are modeled separately from the choice boundary."
      , featureGrants = [ { level = 3, unitId = "barbarian_frenzy" } ]
      , id = "subclass_barbarian_path_of_the_berserker"
      , kind = "subclass"
      , name = "Path of the Berserker"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Barbarian.md:98-100,172-190"
          }
      }

in  pathOfTheBerserker
