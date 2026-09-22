let dwarf =
      { creatureType = "humanoid"

      , id = "species_dwarf"
      , kind = "species"
      , name = "Dwarf"
      , provenance =
        { kind = "srd-5.2.1"
        , section = "character-creation.md:183-187; character-origins.md:162-178"
        }
      , size = { kind = "fixed", size = "medium" }
      , species = "dwarf"
      , speed.walkFeet = 30
      , traits =
        { darkvision = "dwarf_darkvision"
        , dwarvenResilience = "dwarf_dwarven_resilience"
        , dwarvenToughness = "dwarf_dwarven_toughness"
        }
      }

in  dwarf
