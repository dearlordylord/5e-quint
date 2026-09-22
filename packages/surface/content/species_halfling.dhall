let halfling =
      { creatureType = "humanoid"

      , id = "species_halfling"
      , kind = "species"
      , name = "Halfling"
      , provenance =
        { kind = "srd-5.2.1"
        , section = "character-creation.md:183-187; character-origins.md:279-293"
        }
      , size = { kind = "fixed", size = "small" }
      , species = "halfling"
      , speed.walkFeet = 30
      , traits =
        { brave = "species_halfling_brave"
        , halflingNimbleness = "species_halfling_nimbleness"
        , luck = "species_halfling_luck"
        , naturallyStealthy = "species_halfling_naturally_stealthy"
        }
      }

in  halfling
