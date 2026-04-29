-- Darkvision (Elf) — SRD 5.2.1 species trait.
-- Reference encoding for SpeciesTraitRecord with a PassiveMechanics
-- family. Canonical "always-on grant" shape: one EffectAtom in `grants`.
--
-- RAW: "You have Darkvision with a range of 60 feet."

let darkvision =
      { kind = "species_trait"
      , id = "elf_darkvision"
      , name = "Darkvision"
      , species = "elf"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Species/Elf#Darkvision"
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
