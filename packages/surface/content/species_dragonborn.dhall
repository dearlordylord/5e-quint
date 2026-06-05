let dragonborn =
      { creatureType = "humanoid"
      , description = "Dragonborn species source facts for character creation admission."
      , draconicAncestry =
        { damageType =
          { kind = "choice_table"
          , holeId = "species_dragonborn_draconic_ancestry_damage_type"
          , label = "draconic ancestry"
          , options =
            [ { id = "black", displayName = "Black", damageType = "acid" }
            , { id = "blue", displayName = "Blue", damageType = "lightning" }
            , { id = "brass", displayName = "Brass", damageType = "fire" }
            , { id = "bronze", displayName = "Bronze", damageType = "lightning" }
            , { id = "copper", displayName = "Copper", damageType = "acid" }
            , { id = "gold", displayName = "Gold", damageType = "fire" }
            , { id = "green", displayName = "Green", damageType = "poison" }
            , { id = "red", displayName = "Red", damageType = "fire" }
            , { id = "silver", displayName = "Silver", damageType = "cold" }
            , { id = "white", displayName = "White", damageType = "cold" }
            ]
          }
        }
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
