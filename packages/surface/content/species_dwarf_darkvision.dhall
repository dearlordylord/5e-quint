-- Darkvision (Dwarf) — SRD 5.2.1 species trait.
-- Reference encoding for SpeciesTraitRecord with a PassiveMechanics
-- family. Canonical "always-on grant" shape: one EffectAtom in `grants`.
--
-- RAW: "You have Darkvision with a range of 120 feet."

let darkvision =
      { kind = "species_trait"
      , id = "dwarf_darkvision"
      , name = "Darkvision"
      , species = "dwarf"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Character-Origins/Dwarf#Darkvision"
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
