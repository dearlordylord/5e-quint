let halfling =
      { creatureType = "humanoid"
      , description = "Halfling species source facts for Surface catalog admission."
      , id = "species_halfling"
      , kind = "species"
      , name = "Halfling"
      , provenance =
        { kind = "srd-5.2.1"
        , section = "Character-Creation.md:87-91; Character-Origins.md:215-229"
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
