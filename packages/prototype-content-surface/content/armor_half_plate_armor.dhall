-- Half Plate Armor — SRD 5.2.1 equipment.
let armor =
      { kind = "armor"
      , id = "armor_half_plate_armor"
      , name = "Half Plate Armor"
      , category = "medium"
      , provenance = { kind = "srd-5.2.1", section = "Equipment#Armor" }
      , description = "Half Plate Armor from the SRD armor table."
      , acFormula = { kind = "medium_dex_max_2", base = 15 }
      , stealthDisadvantage = True
      , weightPounds = 40
      , costGp = 750
      , donDoff = { donMinutes = 5, doffMinutes = 1 }
      }

in  armor
