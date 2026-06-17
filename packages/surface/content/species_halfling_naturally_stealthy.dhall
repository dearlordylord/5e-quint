let naturallyStealthy =
      { description =
          "You can take the Hide action even when you are obscured only by a creature that is at least one size larger than you."
      , id = "species_halfling_naturally_stealthy"
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
        , section = "Character-Origins/Halfling#Naturally Stealthy"
        }
      , species = "halfling"
      }

in  naturallyStealthy
