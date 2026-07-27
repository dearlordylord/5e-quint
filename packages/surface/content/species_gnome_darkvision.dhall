let darkvision =
      {  id = "species_gnome_darkvision"
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
        , section = "Character-Origins.md:1,67,97,177,185-186"
        }
      , species = "gnome"
      }

in  darkvision
