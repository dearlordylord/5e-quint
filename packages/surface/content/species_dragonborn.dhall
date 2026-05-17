let dragonborn =
      { creatureType = "humanoid"
      , description = "Dragonborn species source facts for character creation admission."
      , id = "species_dragonborn"
      , kind = "species"
      , name = "Dragonborn"
      , provenance =
        { kind = "srd-5.2.1"
        , section = "Character-Creation.md:87-91; Character-Origins.md:99-127"
        }
      , size = { kind = "fixed", size = "medium" }
      , species = "dragonborn"
      , speed.walkFeet = 30
      , traits =
        { breathWeapon = "species_dragonborn_breath_weapon"
        , damageResistance = "species_dragonborn_damage_resistance"
        , darkvision = "species_dragonborn_darkvision"
        }
      }

in  dragonborn
