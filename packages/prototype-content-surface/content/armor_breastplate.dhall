-- Breastplate — SRD 5.2.1 equipment.
let armor =
      { kind = "armor"
      , id = "armor_breastplate"
      , name = "Breastplate"
      , category = "medium"
      , provenance = { kind = "srd-5.2.1", section = "Equipment#Armor" }
      , description = "Breastplate from the SRD armor table."
      , acFormula = { kind = "medium_dex_max_2", base = 14 }
      , weightPounds = 20
      , costGp = 400
      , donDoff = { donMinutes = 5, doffMinutes = 1 }
      }

in  armor
