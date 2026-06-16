let darkvision =
      { description = "You have Darkvision with a range of 60 feet."
      , id = "species_gnome_darkvision"
      , kind = "species_trait"
      , mechanics =
        { family = "passive"
        , grants =
          [ { kind = "grant_sense"
            , sense = "darkvision"
            , rangeFeet = 60
            }
          ]
        }
      , name = "Darkvision (Gnome)"
      , provenance =
        { kind = "srd-5.2.1"
        , section = "Character-Origins/Gnome#Darkvision"
        }
      , species = "gnome"
      }

in  darkvision
