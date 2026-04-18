-- Darkvision (Dragonborn) — SRD 5.2.1 species trait.
--
-- RAW (Character-Origins / Dragonborn):
--   "You have Darkvision with a range of 60 feet."
--
-- This fits the existing species_trait + passive family honestly:
-- an always-on `grant_sense` effect with no activation cost,
-- resource, or reset cadence.

let darkvision =
      { kind = "species_trait"
      , id = "species_dragonborn_darkvision"
      , name = "Darkvision (Dragonborn)"
      , species = "dragonborn"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Character-Origins/Dragonborn#Darkvision"
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

in  darkvision
