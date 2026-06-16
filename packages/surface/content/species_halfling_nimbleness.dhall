let halflingNimbleness =
      { description =
          "You can move through the space of any creature that is of a size larger than you, but you cannot stop there."
      , id = "species_halfling_nimbleness"
      , kind = "species_trait"
      , mechanics =
        { family = "creature_space_movement_permission"
        , moveThrough =
          { kind = "occupied_creature_space"
          , creatureSizeRelationToSelf = "larger"
          }
        , canStopInOccupiedSpace = False
        }
      , name = "Halfling Nimbleness"
      , provenance =
        { kind = "srd-5.2.1"
        , section = "Character-Origins/Halfling#Halfling Nimbleness"
        }
      , species = "halfling"
      }

in  halflingNimbleness
