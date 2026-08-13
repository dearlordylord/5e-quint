let dwarf =
      { creatureType = "humanoid"

      , id = "species_dwarf"
      , kind = "species"
      , name = "Dwarf"
      , provenance =
        { kind = "srd-5.2.1"
        , section = "Character-Creation.md:87-91; Character-Origins.md:129-145"
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
