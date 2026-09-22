let orc =
      { creatureType = "humanoid"

      , id = "species_orc"
      , kind = "species"
      , name = "Orc"
      , provenance =
        { kind = "srd-5.2.1"
        , section = "character-creation.md:183-187; character-origins.md:309-323"
        }
      , size = { kind = "fixed", size = "medium" }
      , species = "orc"
      , speed.walkFeet = 30
      , traits =
        { adrenalineRush = "orc_adrenaline_rush"
        , darkvision = "orc_darkvision"
        , relentlessEndurance = "orc_relentless_endurance"
        }
      }

in  orc
