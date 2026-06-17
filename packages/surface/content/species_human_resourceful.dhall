let resourceful =
      { description =
          "You gain Heroic Inspiration whenever you finish a Long Rest."
      , id = "species_human_resourceful"
      , kind = "species_trait"
      , mechanics =
        { family = "rest_triggered_heroic_inspiration"
        , trigger = { kind = "finish_rest", rest = "long" }
        , grant = { kind = "heroic_inspiration" }
        }
      , name = "Resourceful"
      , provenance =
        { kind = "srd-5.2.1"
        , section = "Character-Origins/Human#Resourceful"
        }
      , species = "human"
      }

in  resourceful
