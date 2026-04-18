let darkvision =
      { kind = "species_trait"
      , id = "orc_darkvision"
      , name = "Darkvision"
      , species = "orc"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Species/Orc#Darkvision"
          }
      , description =
          "You have Darkvision with a range of 120 feet."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_sense"
                , sense = "darkvision"
                , rangeFeet = 120
                }
              ]
          }
      }

in  darkvision
