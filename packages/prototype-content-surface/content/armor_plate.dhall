-- Plate Armor — SRD 5.2.1 equipment.
let armor =
      { kind = "armor"
      , id = "armor_plate"
      , name = "Plate Armor"
      , category = "heavy"
      , provenance = { kind = "srd-5.2.1", section = "Equipment#Armor" }
      , description = "Plate Armor from the SRD armor table."
      , acFormula = { kind = "heavy_fixed", ac = 18 }
      , strengthRequirement = 15
      , stealthDisadvantage = True
      , weightPounds = 65
      , costGp = 1500
      , donDoff = { donMinutes = 10, doffMinutes = 5 }
      }

in  armor
