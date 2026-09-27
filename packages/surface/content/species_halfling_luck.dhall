let luck =
      {  id = "species_halfling_luck"
      , kind = "species_trait"
      , mechanics =
        { family = "d20_test_natural_one_reroll"
        , trigger =
          { kind = "d20_test_roll_is"
          , dieFace = 1
          }
        , reroll =
          { kind = "reroll_triggering_d20"
          , use = "new_roll"
          }
        , optional = True
        }
      , name = "Luck"
      , provenance =
        { kind = "srd-5.2.1"
        , section = "character-origins.md#Halfling"
        }
      , species = "halfling"
      }

in  luck
