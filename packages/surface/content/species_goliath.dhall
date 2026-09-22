let goliath =
      { creatureType = "humanoid"

      , id = "species_goliath"
      , kind = "species"
      , name = "Goliath"
      , provenance =
        { kind = "srd-5.2.1"
        , section = "character-creation.md:183-187; character-origins.md:253-277"
        }
      , size = { kind = "fixed", size = "medium" }
      , species = "goliath"
      , speed.walkFeet = 35
      , traits = { powerfulBuild = "species_goliath_powerful_build" }
      }

in  goliath
