let dwarf =
      { creatureType = "humanoid"
      , description = "As a Dwarf, you have these special traits."
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
        }
      }

in  dwarf
