let human =
      { creatureType = "humanoid"
      , description = "Human species source facts for Surface catalog admission."
      , id = "species_human"
      , kind = "species"
      , name = "Human"
      , provenance =
        { kind = "srd-5.2.1"
        , section = "Character-Creation.md:87-91; Character-Origins.md:231-243"
        }
      , size = { kind = "choice", options = [ "medium", "small" ] }
      , species = "human"
      , speed.walkFeet = 30
      , traits =
        { resourceful = "species_human_resourceful"
        , skillful = "species_human_skillful"
        , versatile = "species_human_versatile"
        }
      }

in  human
