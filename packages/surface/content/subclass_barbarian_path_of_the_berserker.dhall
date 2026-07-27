let pathOfTheBerserker =
      { className = "barbarian"
      , description =
          "The Path of the Berserker subclass is detailed after this class's description."
      , featureGrants =
          [ { level = 3, unitId = "barbarian_frenzy" }
          , { level = 10, unitId = "barbarian_retaliation" }
          ]
      , id = "subclass_barbarian_path_of_the_berserker"
      , kind = "subclass"
      , name = "Path of the Berserker"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Barbarian.md:98-100,172-190"
          }
      }

in  pathOfTheBerserker
