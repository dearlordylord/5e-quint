-- Damage Resistance (Dragonborn) — SRD 5.2.1 species trait.
--
-- RAW (Character-Origins / Dragonborn):
--   "You have Resistance to the damage type determined by your
--    Draconic Ancestry trait."
--
-- The damage type is chosen at character creation from the Draconic
-- Ancestors table on the Dragonborn species record and referenced here
-- through the same Draconic Ancestry source fact used by Breath Weapon.
--
-- Mechanics: passive grant of grant_resistance — always-on while the
-- species trait is in effect (i.e., always). No activation cost, no
-- resource, no reset cadence.

let damageResistance =
      { kind = "species_trait"
      , id = "species_dragonborn_damage_resistance"
      , name = "Damage Resistance (Dragonborn)"
      , species = "dragonborn"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Character-Origins/Dragonborn#Damage Resistance"
          }
      , description =
          "You have Resistance to the damage type determined by your Draconic Ancestry trait."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_resistance"
                , damageType =
                    { kind = "same_choice_as"
                    , holeId = "species_dragonborn_draconic_ancestry_damage_type"
                    }
                }
              ]
          }
      }

in  damageResistance
