let darkvision =
      { kind = "species_trait"
      , id = "orc_darkvision"
      , name = "Darkvision"
      , species = "orc"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Character-Origins.md:1,67,97,245,257-258"
          }

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
