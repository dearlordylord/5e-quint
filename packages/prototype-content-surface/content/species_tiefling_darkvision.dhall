-- Tiefling Darkvision — SRD 5.2.1 species trait.
--
-- RAW (Character-Origins / Tiefling / Darkvision):
--   "You have Darkvision with a range of 60 feet."
--
-- Validation reference for the species_trait kind + passive family +
-- grant_sense effect atom, all of which were already present when this
-- unit was surveyed (the survey's proposed widenings are stale).

let tieflingDarkvision =
      { kind = "species_trait"
      , id = "species_tiefling_darkvision"
      , name = "Darkvision"
      , species = "tiefling"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Character-Origins#Tiefling"
          }
      , description =
          "You have Darkvision with a range of 60 feet."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_sense"
                , sense = "darkvision"
                , rangeFeet = 60
                }
              ]
          }
      }

in  tieflingDarkvision
