let resourceful =
      {  id = "species_human_resourceful"
      , kind = "species_trait"
      , mechanics =
        { family = "rest_triggered_heroic_inspiration"
        , trigger = { kind = "finish_rest", rest = "long" }
        , grant = { kind = "heroic_inspiration" }
        }
      , name = "Resourceful"
      , provenance =
        { kind = "srd-5.2.1"
        , section = "Character-Origins.md:1,67,97,231,239-240"
        }
      , species = "human"
      }

in  resourceful
