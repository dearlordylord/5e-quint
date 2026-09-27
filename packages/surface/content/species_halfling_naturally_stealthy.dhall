let naturallyStealthy =
      {  id = "species_halfling_naturally_stealthy"
      , kind = "species_trait"
      , mechanics =
        { family = "hide_action_obscurement_permission"
        , action = "hide"
        , allowedObscurement =
          { kind = "obscured_only_by_creature"
          , creatureSizeRelationToSelf = "at_least_one_size_larger"
          }
        }
      , name = "Naturally Stealthy"
      , provenance =
        { kind = "srd-5.2.1"
        , section = "character-origins.md#Halfling"
        }
      , species = "halfling"
      }

in  naturallyStealthy
