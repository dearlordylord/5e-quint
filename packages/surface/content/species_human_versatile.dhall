let versatile =
      { description =
          "You gain an Origin feat of your choice. Skilled is recommended."
      , id = "species_human_versatile"
      , kind = "species_trait"
      , mechanics =
        { family = "passive"
        , grants = [ { kind = "grant_feat", category = "origin" } ]
        }
      , name = "Versatile"
      , provenance =
        { kind = "srd-5.2.1"
        , section = "Character-Origins/Human#Versatile"
        }
      , species = "human"
      }

in  versatile
