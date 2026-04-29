-- Leather Armor — SRD 5.2.1 equipment.
let armor =
      { kind = "armor"
      , id = "armor_leather"
      , name = "Leather Armor"
      , category = "light"
      , provenance = { kind = "srd-5.2.1", section = "Equipment#Armor" }
      , description = "Leather Armor from the SRD armor table."
      , acFormula = { kind = "light_dex", base = 11 }
      , weightPounds = 10
      , costGp = 10
      , donDoff = { donMinutes = 1, doffMinutes = 1 }
      }

in  armor
