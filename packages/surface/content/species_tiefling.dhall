let tiefling =
      { creatureType = "humanoid"

      , id = "species_tiefling"
      , kind = "species"
      , name = "Tiefling"
      , provenance =
        { kind = "srd-5.2.1"
        , section = "character-creation.md:183-187; character-origins.md:325-366"
        }
      , size = { kind = "choice", options = [ "medium", "small" ] }
      , species = "tiefling"
      , speed.walkFeet = 30
      , traits = { darkvision = "species_tiefling_darkvision" }
      }

in  tiefling
