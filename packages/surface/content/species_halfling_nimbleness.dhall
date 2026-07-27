let halflingNimbleness =
      {  id = "species_halfling_nimbleness"
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
        , section = "Character-Origins.md:1,67,97,215,225-226"
        }
      , species = "halfling"
      }

in  halflingNimbleness
